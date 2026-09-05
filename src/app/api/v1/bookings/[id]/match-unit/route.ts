import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await request.json();
    const { productId, salesEmployeeId, salesEmployeeName = 'Nguyễn Minh Khôi (Sales)' } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId là bắt buộc' }, { status: 400 });
    }

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { project: true, salesEmployee: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Không tìm thấy lượt booking' }, { status: 404 });
    }

    // Kiểm tra căn hộ
    const product = await db.product.findUnique({
      where: { id: productId },
      include: { prices: true, project: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Không tìm thấy căn hộ' }, { status: 404 });
    }

    if (product.status === 'SOLD' || product.status === 'LOCKED') {
      return NextResponse.json({
        error: `Căn hộ ${product.productCode} hiện không khả dụng (đang có trạng thái: ${product.status}).`
      }, { status: 409 });
    }

    const now = new Date();
    const resolvedSalesId = salesEmployeeId || booking.salesEmployeeId;

    // Thực hiện atomic transaction: Đổi trạng thái căn sang ĐÃ BÁN, Booking sang ĐÃ KHỚP, tạo Hợp Đồng nháp
    const result = await db.$transaction(async (tx) => {
      // 1. Cập nhật căn hộ sang ĐÃ BÁN (SOLD) - Không cần QR vì cọc booking 50M đã nộp
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: {
          status: 'SOLD',
          trangthai: 'Đã bán',
          version: { increment: 1 }
        }
      });

      // 2. Cập nhật booking sang ĐÃ KHỚP
      const updatedBooking = await tx.booking.update({
        where: { id: bookingId },
        data: {
          trangthaikhopcan: 'DA_KHOP',
          notes: `${booking.notes || ''} | Đã khớp thành công căn ${product.productCode}`
        }
      });

      // 3. Tạo/Cập nhật Khách Hàng từ thông tin booking
      let customer = await tx.customer.findFirst({
        where: { phone: booking.customerPhone || '0988888888' }
      });

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            fullName: booking.customerName || 'Khách hàng Booking ' + booking.maLuotBooking,
            phone: booking.customerPhone || '0988888888',
            email: 'customer.' + booking.maLuotBooking.toLowerCase() + '@example.com',
            cccdCiphertext: 'ENC_CCCD_' + booking.maLuotBooking,
            cccdHash: 'HASH_' + booking.maLuotBooking,
            addressCiphertext: 'Hà Nội, Việt Nam',
            verificationStatus: 'VERIFIED'
          }
        });
      }

      // 4. Khởi tạo Hợp Đồng Mua Bán (Chứa đầy đủ các trường của Lớp Sản Phẩm + Lớp Hợp Đồng)
      const basePrice = product.gianiemyet || product.giaTTC || product.prices[0]?.amount || 4800000000;
      const commission = Math.round(basePrice * 0.03);
      const contractNumber = `HĐ-${product.productCode.replace(/[\.\-]/g, '')}-2026`;

      const paymentPlan = await tx.paymentPlan.findFirst({
        where: { projectId: product.projectId }
      }) || await tx.paymentPlan.findFirst();

      const contract = await tx.contract.create({
        data: {
          contractNumber,
          productId: product.id,
          customerId: customer.id,
          salesEmployeeId: resolvedSalesId,
          paymentPlanId: paymentPlan?.id || 'default_plan',
          agreedPrice: basePrice,
          dealRevenue: basePrice,
          status: 'DRAFT', // Chờ Sales điền đầy đủ và gửi duyệt
          signingStatus: 'CHUA_KY',
          commissionStatus: 'DU_KIEN_TRA',
          commissionAmount: commission,
          investorContractNo: contractNumber,
          investorNotes: `Hợp đồng khớp căn từ lượt Booking ${booking.maLuotBooking}`,
          // Class diagram fields
          maHopdong: contractNumber,
          maKH: customer.id.slice(0, 8).toUpperCase(),
          sodienthoaiKH: customer.phone,
          cccdKH: '00120000' + Math.floor(1000 + Math.random() * 9000),
          emailKH: customer.email,
          diachiKH: 'Hà Nội',
          hotenKH: customer.fullName,
          phuonganthanhtoan: 'Thanh toán chuẩn',
          giahopdong: basePrice,
          doanhso: basePrice,
          hoahong: commission,
          trangthaiThanhtoan: 'Đã cọc 50M (Booking)',
          ghichu: `Khớp căn trong đợt mở bán từ lượt Booking ${booking.maLuotBooking}`
        },
        include: {
          product: { include: { project: true, prices: true } },
          customer: true,
          salesEmployee: true
        }
      });

      // 5. Ghi nhận lịch sử trạng thái sản phẩm
      await tx.productStatusHistory.create({
        data: {
          productId: product.id,
          fromStatus: product.status,
          toStatus: 'SOLD',
          reason: `Khớp căn thành công từ lượt Booking ${booking.maLuotBooking} bởi Sales: ${salesEmployeeName}. Chuyển trạng thái sang Đã Bán.`,
          actorId: resolvedSalesId
        }
      });

      return { product: updatedProduct, booking: updatedBooking, contract };
    });

    await createAuditLog({
      action: 'BOOKING_MATCH_UNIT',
      entityType: 'Product',
      entityId: product.id,
      actorId: resolvedSalesId,
      actorName: salesEmployeeName,
      afterJson: {
        description: `Sales khớp căn thành công Căn ${product.productCode} từ lượt Booking ${booking.maLuotBooking}. Căn chuyển sang Đã Bán.`,
        bookingId: booking.id,
        maLuotBooking: booking.maLuotBooking,
        productCode: product.productCode,
        contractId: result.contract.id
      }
    });

    return NextResponse.json({
      message: `Khớp căn ${product.productCode} thành công! Căn đã chuyển sang ĐÃ BÁN. Mời nhập thông tin hợp đồng.`,
      data: result
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error matching unit for booking:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
