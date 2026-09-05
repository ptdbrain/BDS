import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const { reviewerId = 'NV007', reviewerName = 'Vũ Mai Phương (Sales Admin)', reason = 'Hồ sơ pháp lý, thông tin khách hàng & tiền cọc đầy đủ hợp lệ' } = body;

    const contract = await db.contract.findUnique({
      where: { id: params.id },
      include: { product: true }
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

    const now = new Date();

    await db.$transaction(async (tx) => {
      // Cập nhật hợp đồng sang APPROVED & SIGNED (Đã ký)
      await tx.contract.update({
        where: { id: params.id },
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
          contractId: params.id,
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
      entityId: params.id,
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
