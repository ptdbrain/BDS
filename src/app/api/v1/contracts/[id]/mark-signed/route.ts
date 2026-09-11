import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { isManagerReadOnly } from '@/lib/rolePolicy';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json().catch(() => ({}));
    const actorRole = (body.actorRole || request.headers.get('x-user-role') || 'SALES_ADMIN').toUpperCase();
    if (isManagerReadOnly(actorRole)) {
      return NextResponse.json({ error: 'Giám đốc chỉ có quyền xem, không được ký hợp đồng.' }, { status: 403 });
    }
    const { actorId = 'emp_admin_01', actorName = 'Phạm Thị Mai' } = body;

    const contract = await db.contract.findUnique({
      where: { id: params.id },
      include: { product: true }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Strict Business Guard: Contract must be APPROVED before signing & turning product to SOLD
    if (contract.status !== 'APPROVED') {
      return NextResponse.json({
        type: 'urn:ahs:problem:contract-not-approved',
        title: 'Hợp đồng chưa được phê duyệt',
        status: 400,
        code: 'CONTRACT_NOT_APPROVED',
        detail: `Hợp đồng ${contract.contractNumber} hiện ở trạng thái '${contract.status}'. Chỉ hợp đồng ở trạng thái 'APPROVED' mới đủ điều kiện ký kết để chuyển căn thành ĐÃ BÁN.`
      }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      // Mark Contract SIGNED
      await tx.contract.update({
        where: { id: params.id },
        data: {
          status: 'SIGNED',
          signingStatus: 'DA_KY',
          signedDate: new Date(),
          signedAt: new Date(),
          trangthaiHDMB: 'DA_KY',
          version: { increment: 1 }
        }
      });

      // Update Product status to SOLD
      await tx.product.update({
        where: { id: contract.productId },
        data: {
          status: 'SOLD',
          trangthai: 'Đã bán',
          version: { increment: 1 }
        }
      });

      // Status history entry
      await tx.productStatusHistory.create({
        data: {
          productId: contract.productId,
          fromStatus: contract.product.status,
          toStatus: 'SOLD',
          reason: `Hoàn tất ký hợp đồng mua bán số ${contract.contractNumber}`,
          actorId
        }
      });
    });

    await createAuditLog({
      actorId,
      actorName,
      action: 'MARK_CONTRACT_SIGNED',
      entityType: 'CONTRACT',
      entityId: params.id,
      afterJson: { status: 'SIGNED', productId: contract.productId }
    });

    return NextResponse.json({ success: true, message: 'Đã hoàn tất ký hợp đồng! Căn hộ được chuyển sang trạng thái ĐÃ BÁN.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
