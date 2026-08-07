import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { reviewerId = 'emp_admin_01', reviewerName = 'Phạm Thị Mai', reason = 'Cần sửa đổi thông tin hợp đồng', issues = [] } = body;

    const contract = await db.contract.findUnique({
      where: { id: params.id }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: params.id },
        data: {
          status: 'CHANGE_REQUESTED',
          version: { increment: 1 }
        }
      });

      await tx.contractReview.create({
        data: {
          contractId: params.id,
          reviewerId,
          decision: 'CHANGE_REQUESTED',
          reason,
          fieldIssuesJson: JSON.stringify(issues)
        }
      });
    });

    await createAuditLog({
      actorId: reviewerId,
      actorName: reviewerName,
      action: 'REQUEST_CONTRACT_CHANGES',
      entityType: 'CONTRACT',
      entityId: params.id,
      afterJson: { status: 'CHANGE_REQUESTED', reason, issues }
    });

    return NextResponse.json({ success: true, message: 'Đã gửi yêu cầu chỉnh sửa hợp đồng cho Sales' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
