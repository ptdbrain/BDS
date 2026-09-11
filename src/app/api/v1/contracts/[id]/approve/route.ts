import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { ensureContractExists } from '@/lib/contractHelper';
import { resolveEmployeeId } from '@/lib/employeeHelper';
import { getAuthorizedFinancialFields } from '@/lib/contractFinancialPolicy';
import { canReviewContract } from '@/lib/rolePolicy';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const actorRole = (body.actorRole || request.headers.get('x-user-role') || '').toUpperCase();
    if (!canReviewContract(actorRole)) {
      return NextResponse.json({ error: 'Chỉ Sales Admin được duyệt hợp đồng.' }, { status: 403 });
    }
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
    const financialFields = actorRole === 'SALES_ADMIN'
      ? getAuthorizedFinancialFields(actorRole, contractData || {})
      : {};

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
          dealRevenue: contract.dealRevenue ?? contract.agreedPrice,
          doanhso: contract.doanhso ?? contract.giahopdong ?? contract.agreedPrice,
          ...financialFields,
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

        // Cập nhật tất cả lượt lock đang active / pending sang DEPOSIT_CONFIRMED để giải phóng danh sách lock
        const activeLocks = await tx.productLock.findMany({
          where: {
            productId: contract.productId,
            status: { in: ['ACTIVE', 'PAYMENT_PENDING'] }
          }
        });

        if (activeLocks.length > 0) {
          await tx.productLock.updateMany({
            where: {
              productId: contract.productId,
              status: { in: ['ACTIVE', 'PAYMENT_PENDING'] }
            },
            data: {
              status: 'DEPOSIT_CONFIRMED',
              depositConfirmedAt: now
            }
          });

          const lockIds = activeLocks.map(l => l.id);
          await tx.paymentTransaction.updateMany({
            where: {
              lockId: { in: lockIds }
            },
            data: {
              status: 'SUCCEEDED',
              paidAt: now,
              rawSummary: `Hợp đồng đã được Sales Admin duyệt (${reviewerName}). Căn chính thức Đã Bán.`
            }
          });
        }
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
