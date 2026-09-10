import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { ensureProductExists } from '@/lib/productHelper';
import { ensureBookingExists } from '@/lib/bookingHelper';
import { canSalesActOnBooking } from '@/lib/rolePolicy';
import { resolveEmployeeId } from '@/lib/employeeHelper';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await request.json();
    const {
      productId,
      salesEmployeeId,
      salesEmployeeName = 'Nguyễn Minh Khôi (Sales)',
      productData
    } = body;
    const actorRole = (body.actorRole || request.headers.get('x-user-role') || 'SALES').toUpperCase();

    const effectiveProductId = productId || productData?.id || productData?.productCode;

    if (!effectiveProductId) {
      return NextResponse.json({ error: 'productId là bắt buộc' }, { status: 400 });
    }

    let booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { project: true, salesEmployee: true }
    });

    // Self-healing for Vercel multi-container serverless SQLite
    if (!booking && (body.bookingData || body.maLuotBooking)) {
      booking = await ensureBookingExists({
        id: bookingId,
        ...body.bookingData,
        maLuotBooking: body.maLuotBooking || body.bookingData?.maLuotBooking
      });
    }

    if (!booking) {
      booking = await db.booking.findFirst({
        where: {
          OR: [
            { id: bookingId },
            { maLuotBooking: bookingId },
            ...(body.maLuotBooking ? [{ maLuotBooking: body.maLuotBooking }] : [])
          ]
        },
        include: { project: true, salesEmployee: true }
      });
    }

    if (!booking) {
      return NextResponse.json({ error: 'Không tìm thấy lượt booking' }, { status: 404 });
    }

    const resolvedSalesId = salesEmployeeId
      ? await resolveEmployeeId(salesEmployeeId, 'SALES')
      : '';
    if (!canSalesActOnBooking(actorRole, resolvedSalesId, booking.salesEmployeeId)) {
      return NextResponse.json({
        error: 'Chỉ nhân viên kinh doanh được phân công cho lượt Booking mới được khớp căn.'
      }, { status: 403 });
    }

    if (!booking.depositConfirmedAt) {
      return NextResponse.json({
        error: 'Giao dịch booking chưa được Sales Admin xác nhận. Chưa được phép khớp căn.'
      }, { status: 409 });
    }

    const now = new Date();

    // Kiểm tra quy tắc nghiệp vụ: Tất cả booking phải chờ thời điểm ra hàng của dự án
    // STT 1: từ thời điểm ra hàng (VD: 14h00) đến 14h10, STT 2: 14h10 đến 14h20, ...
    if (booking.tgBatdaukhop && now.getTime() < new Date(booking.tgBatdaukhop).getTime()) {
      const startH = String(new Date(booking.tgBatdaukhop).getHours()).padStart(2, '0');
      const startM = String(new Date(booking.tgBatdaukhop).getMinutes()).padStart(2, '0');
      const dayStr = `${String(new Date(booking.tgBatdaukhop).getDate()).padStart(2, '0')}/${String(new Date(booking.tgBatdaukhop).getMonth() + 1).padStart(2, '0')}`;
      return NextResponse.json({
        error: `Chưa tới thời điểm ra hàng hoặc chưa tới lượt khớp căn của Booking ${booking.maLuotBooking}! Khung giờ khớp căn: ${startH}h${startM} ngày ${dayStr}. Tất cả các lượt booking đều phải chờ đến giờ ra hàng!`
      }, { status: 400 });
    }

    // Kiểm tra căn hộ
    let product = await db.product.findUnique({
      where: { id: effectiveProductId },
      include: { prices: true, project: true }
    });

    // Self-healing for Vercel multi-container serverless SQLite
    if (!product && productData) {
      product = await ensureProductExists({ ...productData, id: effectiveProductId });
    }

    if (!product) {
      product = await db.product.findFirst({
        where: {
          OR: [
            { id: effectiveProductId },
            { productCode: effectiveProductId },
            { maCan: effectiveProductId }
          ]
        },
        include: { prices: true, project: true }
      });
    }

    if (!product) {
      return NextResponse.json({ error: 'Không tìm thấy căn hộ' }, { status: 404 });
    }

    if (product.status === 'SOLD' || product.status === 'LOCKED') {
      return NextResponse.json({
        error: `Căn hộ ${product.productCode} hiện không khả dụng (đang có trạng thái: ${product.status}).`
      }, { status: 409 });
    }

    // Thực hiện atomic transaction: Đổi trạng thái căn sang ĐÃ BÁN, Booking sang ĐÃ KHỚP, tạo Hợp Đồng nháp
    const result = await db.$transaction(async (tx) => {
      // 1. Cập nhật căn hộ sang ĐÃ BÁN (SOLD) - Không cần QR vì cọc booking 50M đã nộp
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
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
            verificationStatus: 'DRAFT'
          }
        });
      }

      // 4. Khởi tạo Hợp Đồng Mua Bán (Chứa đầy đủ các trường của Lớp Sản Phẩm + Lớp Hợp Đồng)
      const basePrice = product.gianiemyet || product.giaTTC || product.prices[0]?.amount || 4800000000;
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
          commissionStatus: null,
          commissionAmount: null,
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
          hoahong: null,
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
