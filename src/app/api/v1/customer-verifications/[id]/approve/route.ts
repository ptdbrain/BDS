import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { resolveEmployeeId } from '@/lib/employeeHelper';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reviewerId = 'NV007', reviewerName = 'Vũ Mai Phương (Sales Admin)', notes = 'Thông tin CCCD và hợp đồng hợp lệ' } = body;

    const verification = await db.customerVerification.findUnique({
      where: { id: params.id },
      include: { customer: true }
    });

    if (!verification) {
      return NextResponse.json({ error: 'Verification record not found' }, { status: 404 });
    }

    const validReviewerId = await resolveEmployeeId(reviewerId, 'SALES_ADMIN');

    await db.customerVerification.update({
      where: { id: params.id },
      data: {
        status: 'APPROVED',
        reviewedById: validReviewerId,
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
