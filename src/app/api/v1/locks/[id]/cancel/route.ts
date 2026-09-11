import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { isManagerReadOnly } from '@/lib/rolePolicy';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const actorRole = (body.actorRole || request.headers.get('x-user-role') || 'SALES').toUpperCase();
    if (isManagerReadOnly(actorRole)) {
      return NextResponse.json({ error: 'Giám đốc chỉ có quyền xem, không được hủy lock.' }, { status: 403 });
    }
    const { reason = 'Hủy giữ căn theo yêu cầu Sales', actorId = 'emp_sales_01', actorName = 'Trần Văn Nam' } = body;

    const lock = await db.productLock.findUnique({
      where: { id: params.id },
      include: { product: true }
    });

    if (!lock) {
      return NextResponse.json({ error: 'Lock not found' }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.productLock.update({
        where: { id: lock.id },
        data: {
          status: 'CANCELLED',
          cancelReason: reason
        }
      });

      if (lock.product.status === 'LOCKED') {
        await tx.product.update({
          where: { id: lock.productId },
          data: {
            status: 'AVAILABLE',
            version: { increment: 1 }
          }
        });

        await tx.productStatusHistory.create({
          data: {
            productId: lock.productId,
            fromStatus: 'LOCKED',
            toStatus: 'AVAILABLE',
            reason: `Hủy lock bởi ${actorName}: ${reason}`,
            actorId
          }
        });
      }
    });

    await createAuditLog({
      actorId,
      actorName,
      action: 'CANCEL_PRODUCT_LOCK',
      entityType: 'PRODUCT_LOCK',
      entityId: lock.id,
      afterJson: { reason }
    });

    return NextResponse.json({ success: true, message: 'Đã hủy giữ căn thành công' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
