import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { reviewerId = 'emp_admin_01', reviewerName = 'Phạm Thị Mai', issues = [], notes } = body;

    const verification = await db.customerVerification.findUnique({
      where: { id: params.id }
    });

    if (!verification) {
      return NextResponse.json({ error: 'Verification record not found' }, { status: 404 });
    }

    await db.customerVerification.update({
      where: { id: params.id },
      data: {
        status: 'CHANGE_REQUESTED',
        reviewedById: reviewerId,
        fieldIssuesJson: JSON.stringify(issues),
        notes: notes || 'Yêu cầu cập nhật lại thông tin PII khách hàng'
      }
    });

    await db.customer.update({
      where: { id: verification.customerId },
      data: { verificationStatus: 'CHANGE_REQUESTED' }
    });

    await createAuditLog({
      actorId: reviewerId,
      actorName: reviewerName,
      action: 'REQUEST_CUSTOMER_CHANGES',
      entityType: 'CUSTOMER_VERIFICATION',
      entityId: params.id,
      afterJson: { status: 'CHANGE_REQUESTED', issues }
    });

    return NextResponse.json({ success: true, message: 'Đã gửi yêu cầu chỉnh sửa thông tin cho Sales' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
