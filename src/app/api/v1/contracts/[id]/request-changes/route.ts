import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      reviewerId = 'NV007',
      reviewerName = 'Vũ Mai Phương (Sales Admin)',
      reason = 'Cần bổ sung/sửa đổi thông tin khách hàng và điều khoản hợp đồng',
      issues = []
    } = body;

    const contract = await db.contract.findUnique({
      where: { id: params.id }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    let validReviewerId = reviewerId;
    const emp = await db.employee.findFirst({
      where: {
        OR: [
          { id: reviewerId },
          { employeeCode: reviewerId },
          { maNV: reviewerId }
        ]
      }
    }) || await db.employee.findFirst({
      where: {
        OR: [
          { employeeCode: 'NV007' },
          { maNV: 'NV007' }
        ]
      }
    }) || await db.employee.findFirst();

    if (emp) {
      validReviewerId = emp.id;
    }

    await db.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: params.id },
        data: {
          status: 'CHANGE_REQUESTED',
          investorNotes: reason, // Lưu lý do để Sales thấy trực tiếp
          version: { increment: 1 }
        }
      });

      await tx.contractReview.create({
        data: {
          contractId: params.id,
          reviewerId: validReviewerId,
          decision: 'CHANGE_REQUESTED',
          reason,
          fieldIssuesJson: JSON.stringify(issues)
        }
      });
    });

    await createAuditLog({
      actorId: validReviewerId,
      actorName: reviewerName,
      action: 'REQUEST_CONTRACT_CHANGES',
      entityType: 'CONTRACT',
      entityId: params.id,
      afterJson: {
        description: `Sales Admin (${reviewerName}) yêu cầu Sales sửa đổi hợp đồng ${contract.contractNumber}. Lý do: ${reason}`,
        status: 'CHANGE_REQUESTED',
        reason,
        issues
      }
    });

    return NextResponse.json({
      success: true,
      message: `Đã gửi yêu cầu nhập lại thông tin hợp đồng cho Nhân viên kinh doanh. Lý do: ${reason}`
    });
  } catch (error: any) {
    console.error('Error requesting contract changes:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
