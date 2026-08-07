import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reviewerId = 'emp_admin_01', reviewerName = 'Phạm Thị Mai', notes = 'Thông tin CCCD và hợp đồng hợp lệ' } = body;

    const verification = await db.customerVerification.findUnique({
      where: { id: params.id },
      include: { customer: true }
    });

    if (!verification) {
      return NextResponse.json({ error: 'Verification record not found' }, { status: 404 });
    }

    await db.customerVerification.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        reviewedById: reviewerId,
        notes
      }
    });

    await db.customer.update({
      where: { id: verification.customerId },
      data: { verificationStatus: 'VERIFIED' }
    });

    await createAuditLog({
      actorId: reviewerId,
      actorName: reviewerName,
      action: 'APPROVE_CUSTOMER_VERIFICATION',
      entityType: 'CUSTOMER_VERIFICATION',
      entityId: params.id,
      afterJson: { status: 'APPROVED', customerId: verification.customerId }
    });

    return NextResponse.json({ success: true, message: 'Đã phê duyệt hồ sơ khách hàng thành công!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
