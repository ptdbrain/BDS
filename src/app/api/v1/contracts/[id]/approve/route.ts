import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reviewerId = 'emp_admin_01', reviewerName = 'Phạm Thị Mai', reason = 'Hồ sơ pháp lý & cọc đầy đủ hợp lệ' } = body;

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
          status: 'APPROVED',
          version: { increment: 1 }
        }
      });

      await tx.contractReview.create({
        data: {
          contractId: params.id,
          reviewerId,
          decision: 'APPROVED',
          reason
        }
      });
    });

    await createAuditLog({
      actorId: reviewerId,
      actorName: reviewerName,
      action: 'APPROVE_CONTRACT',
      entityType: 'CONTRACT',
      entityId: params.id,
      afterJson: { status: 'APPROVED' }
    });

    return NextResponse.json({ success: true, message: 'Đã duyệt hợp đồng thành công!' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
