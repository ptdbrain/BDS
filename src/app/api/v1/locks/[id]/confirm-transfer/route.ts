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
      include: { product: true, payments: true }
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

      return { lock: updatedLock, product: updatedProduct };
    });

    // 5. Create Audit Log
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
