import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

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
      notes = 'Nhân viên kinh doanh xác nhận khách hàng đã chuyển khoản cọc VietQR 100.000.000 VNĐ'
    } = body;

    const lock = await db.productLock.findUnique({
      where: { id: lockId },
      include: { product: true, salesEmployee: true }
    });

    if (!lock) {
      return NextResponse.json({ error: 'Không tìm thấy lượt lock' }, { status: 404 });
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
