import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { ensureContractExists } from '@/lib/contractHelper';
import { resolveEmployeeId } from '@/lib/employeeHelper';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      reviewerId = 'NV007',
      reviewerName = 'Vũ Mai Phương (Sales Admin)',
      reason = 'Hồ sơ pháp lý, thông tin khách hàng & tiền cọc đầy đủ hợp lệ',
      contractData,
      productData,
      contractNumber,
      productId
    } = body;

    let contract = await db.contract.findUnique({
      where: { id: params.id },
      include: { product: true }
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
        include: { product: true }
      });
    }

    if (!contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    const validReviewerId = await resolveEmployeeId(reviewerId, 'SALES_ADMIN');

    const now = new Date();

    await db.$transaction(async (tx) => {
      // Cập nhật hợp đồng sang APPROVED & SIGNED (Đã ký)
      await tx.contract.update({
        where: { id: contract.id },
        data: {
          status: 'SIGNED',
          signingStatus: 'DA_KY',
          signedDate: now,
          signedAt: now,
          trangthaiHDMB: 'Đã ký',
          dealRevenue: contract.dealRevenue || contract.agreedPrice,
          doanhso: contract.doanhso || contract.agreedPrice,
          hoahong: contract.hoahong || Math.round((contract.agreedPrice || 4800000000) * 0.03),
          version: { increment: 1 }
        }
      });

      // Đảm bảo căn hộ ở trạng thái SOLD
      if (contract.productId) {
        await tx.product.update({
          where: { id: contract.productId },
          data: {
            status: 'SOLD',
            trangthai: 'Đã bán'
          }
        });
      }

      await tx.contractReview.create({
        data: {
          contractId: contract.id,
          reviewerId: validReviewerId,
          decision: 'APPROVED',
          reason
        }
      });
    });

    await createAuditLog({
      actorId: validReviewerId,
      actorName: reviewerName,
      action: 'APPROVE_CONTRACT',
      entityType: 'CONTRACT',
      entityId: contract.id,
      afterJson: {
        description: `Sales Admin (${reviewerName}) đã duyệt hợp đồng ${contract.contractNumber}. Ghi nhận doanh số và hoa hồng cho Sales.`,
        status: 'SIGNED',
        signingStatus: 'DA_KY'
      }
    });

    return NextResponse.json({ success: true, message: 'Đã phê duyệt và ký hợp đồng thành công!' });
  } catch (error: any) {
    console.error('Error approving contract:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
