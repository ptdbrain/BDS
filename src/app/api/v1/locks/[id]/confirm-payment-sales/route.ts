import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { ensureProductExists } from '@/lib/productHelper';
import { canSalesConfirmPayment } from '@/lib/rolePolicy';
import { resolveEmployeeId } from '@/lib/employeeHelper';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lockId = params.id;
    const body = await request.json().catch(() => ({}));
    const {
      actorId = 'emp_sales_01',
      actorName = 'Nguyễn Minh Khôi (Sales)',
      notes = 'Nhân viên kinh doanh xác nhận khách hàng đã chuyển khoản cọc VietQR 100.000.000 VNĐ',
      lockData,
      actorRole = request.headers.get('x-user-role') || 'SALES'
    } = body;

    let lock = await db.productLock.findUnique({
      where: { id: lockId },
      include: { product: true, salesEmployee: true }
    });

    // Self-healing for Vercel multi-container serverless SQLite
    if (!lock && lockData) {
      try {
        const prod = await ensureProductExists(lockData.product || { id: lockData.productId });
        if (prod) {
          const defaultEmp = await db.employee.findFirst({ where: { employeeCode: 'NV001' } }) || await db.employee.findFirst();
          const validSalesId = lockData.salesEmployeeId || defaultEmp?.id || 'emp_sales_01';
          const depositAmount = prod.prices?.[0]?.depositAmount || 100000000;

          await db.productLock.create({
            data: {
              id: lockId,
              productId: prod.id,
              salesEmployeeId: validSalesId,
              status: 'ACTIVE',
              startedAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 60000),
              idempotencyKey: `healed-sales-lock-${lockId}`
            }
          });

          await db.paymentTransaction.create({
            data: {
              lockId,
              provider: 'VIETQR_AHS',
              providerReference: `AHS-${prod.productCode.replace('-', '')}-${Date.now().toString().slice(-5)}`,
              amount: depositAmount,
              currency: 'VND',
              status: 'PENDING',
              expiresAt: new Date(Date.now() + 30 * 60000),
              qrPayload: 'VIETQR_PAYLOAD'
            }
          });

          lock = await db.productLock.findUnique({
            where: { id: lockId },
            include: { product: true, salesEmployee: true }
          });
        }
      } catch (healErr) {
        console.error('[confirm-payment-sales] Self-healing lock failed:', healErr);
      }
    }

    if (!lock) {
      return NextResponse.json({ error: 'Không tìm thấy lượt lock' }, { status: 404 });
    }

    const resolvedActorId = await resolveEmployeeId(actorId, 'SALES');
    if (!canSalesConfirmPayment(actorRole, resolvedActorId, lock.salesEmployeeId)) {
      return NextResponse.json({
        error: 'Chỉ Sales phụ trách lượt lock mới được xác nhận khách đã chuyển khoản.'
      }, { status: 403 });
    }

    if (!['ACTIVE', 'PAYMENT_PENDING'].includes(lock.status)) {
      return NextResponse.json({
        error: `Lượt lock hiện ở trạng thái ${lock.status}, không thể xác nhận lại thanh toán.`
      }, { status: 409 });
    }

    const updatedLock = await db.productLock.update({
      where: { id: lockId },
      data: {
        status: 'PAYMENT_PENDING'
      }
    });

    // Update or create pending payment transaction
    await db.paymentTransaction.updateMany({
      where: { lockId },
      data: {
        status: 'REVIEW_REQUIRED',
        rawSummary: `Sales (${actorName}) đã bấm xác nhận khách chuyển khoản. Chờ Sales Admin duyệt tiền về tài khoản.`
      }
    });

    await createAuditLog({
      action: 'SALES_CONFIRMED_PAYMENT',
      entityType: 'ProductLock',
      entityId: lock.id,
      actorId,
      actorName,
      afterJson: {
        description: `Sales xác nhận khách đã nộp cọc cho căn ${lock.product?.productCode}. Chuyển sang chờ Sales Admin duyệt.`,
        lockId,
        productCode: lock.product?.productCode,
        notes
      }
    });

    return NextResponse.json({
      message: `Đã gửi xác nhận thanh toán cọc cho Căn ${lock.product?.productCode}. Đang chờ Sales Admin đối soát và phê duyệt.`,
      data: updatedLock
    });
  } catch (error: any) {
    console.error('Error confirming payment by sales:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
