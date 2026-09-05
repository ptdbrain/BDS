import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      actorId = 'emp_admin_01',
      actorName = 'Phạm Thị Mai',
      notes = 'Sales Admin xác nhận đã nhận tiền chuyển khoản cọc thành công'
    } = body;

    const lock = await db.productLock.findUnique({
      where: { id: params.id },
      include: {
        product: { include: { prices: true } },
        payments: true
      }
    });

    if (!lock) {
      return NextResponse.json({
        type: 'urn:ahs:problem:lock-not-found',
        title: 'Không tìm thấy giao dịch giữ căn',
        status: 404,
        code: 'LOCK_NOT_FOUND',
        detail: `Không tìm thấy thông tin lượt lock với ID: ${params.id}`
      }, { status: 404 });
    }

    const now = new Date();

    // Execute atomic transaction to transition Lock -> DEPOSIT_CONFIRMED, Product -> SOLD
    const result = await db.$transaction(async (tx) => {
      // 1. Update Lock to DEPOSIT_CONFIRMED
      const updatedLock = await tx.productLock.update({
        where: { id: lock.id },
        data: {
          status: 'DEPOSIT_CONFIRMED',
          depositConfirmedAt: now
        }
      });

      // 2. Update Payment transaction to SUCCEEDED
      if (lock.payments && lock.payments.length > 0) {
        await tx.paymentTransaction.updateMany({
          where: { lockId: lock.id },
          data: {
            status: 'SUCCEEDED',
            paidAt: now,
            rawSummary: `Xác nhận nhận chuyển khoản thành công bởi Sales Admin: ${actorName}. Ghi chú: ${notes}`
          }
        });
      }

      // 3. Update Product directly from LOCKED to SOLD as required
      const updatedProduct = await tx.product.update({
        where: { id: lock.productId },
        data: {
          status: 'SOLD',
          trangthai: 'Đã bán',
          version: { increment: 1 }
        }
      });

      // 4. Record product status history
      await tx.productStatusHistory.create({
        data: {
          productId: lock.productId,
          fromStatus: lock.product.status,
          toStatus: 'SOLD',
          reason: `Sales Admin (${actorName}) xác nhận đã nhận chuyển khoản cọc. Chuyển trạng thái căn sang Đã Bán.`,
          actorId
        }
      });

      // 5. Automatically create or update Contract so BC_DoanhThu, BC_DoanhSo_NV, and Personal Revenue update in realtime
      const price = lock.product.gianiemyet || lock.product.giaTTC || lock.product.prices[0]?.amount || 4500000000;
      const commission = Math.round(price * 0.03);

      let existingContract = await tx.contract.findFirst({
        where: { productId: lock.productId }
      });

      let savedContract;
      if (existingContract) {
        savedContract = await tx.contract.update({
          where: { id: existingContract.id },
          data: {
            status: 'DRAFT',
            signingStatus: 'CHUA_KY',
            dealRevenue: existingContract.dealRevenue || price,
            agreedPrice: existingContract.agreedPrice || price,
            salesEmployeeId: lock.salesEmployeeId || existingContract.salesEmployeeId,
            commissionStatus: 'DU_KIEN_TRA',
            commissionAmount: existingContract.commissionAmount || commission,
            trangthaiHDMB: 'Chưa ký',
            doanhso: existingContract.dealRevenue || price,
            hoahong: existingContract.commissionAmount || commission,
            investorNotes: `Đã xác nhận tiền cọc. Chờ Nhân viên kinh doanh nhập thông tin khách hàng và hợp đồng.`
          }
        });
      } else {
        let customer = await tx.customer.findFirst();
        if (!customer) {
          customer = await tx.customer.create({
            data: {
              fullName: 'Khách mua căn ' + lock.product.productCode,
              phone: '0912345678',
              email: 'khachhang@example.com',
              cccdCiphertext: 'ENC_001200008888',
              cccdHash: '001200008888',
              addressCiphertext: 'Hà Nội',
              verificationStatus: 'VERIFIED'
            }
          });
        }

        let plan = await tx.paymentPlan.findFirst({
          where: { projectId: lock.product.projectId }
        });
        if (!plan) {
          plan = await tx.paymentPlan.findFirst();
        }
        if (!plan) {
          plan = await tx.paymentPlan.create({
            data: {
              projectId: lock.product.projectId,
              code: 'STD-DEFAULT',
              name: 'Thanh toán chuẩn theo tiến độ'
            }
          });
        }

        const contractCount = await tx.contract.count();
        const rand = Math.floor(Math.random() * 8999 + 1000);
        const contractNumber = `HĐMB-AHS-${lock.product.productCode.replace(/[^a-zA-Z0-9]/g, '')}-${now.getFullYear()}-${rand}`;

        savedContract = await tx.contract.create({
          data: {
            contractNumber,
            productId: lock.productId,
            customerId: customer.id,
            lockId: lock.id,
            salesEmployeeId: lock.salesEmployeeId,
            paymentPlanId: plan.id,
            agreedPrice: price,
            dealRevenue: price,
            status: 'DRAFT',
            signingStatus: 'CHUA_KY',
            commissionStatus: 'DU_KIEN_TRA',
            commissionDueDate: '25/10/2026',
            commissionAmount: commission,
            investorContractNo: contractNumber,
            investorNotes: `Đã xác nhận tiền cọc cho căn ${lock.product.productCode}. Chờ nhân viên kinh doanh nhập thông tin khách hàng theo biểu mẫu hợp đồng.`,
            maHopdong: String(202600 + contractCount + 1),
            maKH: String(1000 + contractCount + 1),
            sodienthoaiKH: customer.phone,
            cccdKH: customer.cccdHash,
            emailKH: customer.email,
            diachiKH: 'Hà Nội',
            hotenKH: customer.fullName,
            phuonganthanhtoan: plan.name,
            giahopdong: price,
            trangthaiHDMB: 'Chưa ký',
            doanhso: price,
            hoahong: commission,
            trangthaiThanhtoan: 'DU_KIEN_TRA',
            ghichu: `Đã cọc 100M qua Sales Admin: ${actorName}. Chờ nhập thông tin hợp đồng.`
          }
        });
      }

      return { lock: updatedLock, product: updatedProduct };
    });

    // 6. Create Audit Log
    await createAuditLog({
      actorId,
      actorName,
      action: 'ADMIN_CONFIRM_BANK_TRANSFER',
      entityType: 'PRODUCT_LOCK',
      entityId: lock.id,
      afterJson: {
        productId: lock.productId,
        productCode: lock.product.productCode,
        status: 'SOLD',
        confirmedAt: now
      }
    });

    return NextResponse.json({
      message: `Đã xác nhận nhận tiền chuyển khoản thành công! Căn ${lock.product.productCode} đã chuyển sang trạng thái ĐÃ BÁN.`,
      data: result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
