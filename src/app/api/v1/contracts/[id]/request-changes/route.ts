import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { ensureContractExists } from '@/lib/contractHelper';
import { resolveEmployeeId } from '@/lib/employeeHelper';
import { canRequestContractChanges } from '@/lib/rolePolicy';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const actorRole = (body.actorRole || request.headers.get('x-user-role') || '').toUpperCase();
    if (!canRequestContractChanges(actorRole)) {
      return NextResponse.json({ error: 'Chỉ Sales Admin hoặc Manager được yêu cầu sửa hợp đồng.' }, { status: 403 });
    }
    const {
      reviewerId = 'NV007',
      reviewerName = 'Vũ Mai Phương (Sales Admin)',
      reason = 'Cần bổ sung/sửa đổi thông tin khách hàng và điều khoản hợp đồng',
      issues = [],
      contractData,
      productData,
      contractNumber,
      productId
    } = body;

    let contract = await db.contract.findUnique({
      where: { id: params.id },
      include: { product: true, customer: true }
    });

    // Self-healing for Vercel multi-container serverless SQLite
    if (!contract && (contractData || productData || contractNumber || productId)) {
      contract = await ensureContractExists({
        ...contractData,
        id: params.id,
        contractNumber: contractNumber || contractData?.contractNumber,
        productId: productId || contractData?.productId
      }, productData);
    }

    if (!contract) {
      contract = await db.contract.findFirst({
        where: {
          OR: [
            { id: params.id },
            { contractNumber: params.id },
            { maHopdong: params.id },
            ...(contractNumber ? [{ contractNumber }, { maHopdong: contractNumber }] : [])
          ]
        },
        include: { product: true, customer: true }
      });
    }

    if (!contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    const validReviewerId = await resolveEmployeeId(reviewerId, 'SALES_ADMIN');

    await db.$transaction(async (tx) => {
      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: 'CHANGE_REQUESTED',
          investorNotes: reason, // Lưu lý do để Sales thấy trực tiếp
          version: { increment: 1 }
        }
      });

      await tx.contractReview.create({
        data: {
          contractId: contract.id,
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
