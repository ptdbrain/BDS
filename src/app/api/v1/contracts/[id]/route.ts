import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contract = await db.contract.findUnique({
      where: { id: params.id },
      include: {
        product: { include: { project: true } },
        customer: true,
        salesEmployee: true,
        paymentPlan: true,
        reviews: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    return NextResponse.json({ data: contract });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      investorContractNo,
      signedDate,
      signingStatus,
      dealRevenue,
      commissionStatus,
      commissionDueDate,
      commissionAmount,
      investorNotes,
      status,
      actorId = 'emp_admin_01',
      actorName = 'Phạm Thị Mai'
    } = body;

    const dataToUpdate: any = {};
    if (investorContractNo !== undefined) dataToUpdate.investorContractNo = investorContractNo;
    if (signedDate !== undefined) dataToUpdate.signedDate = signedDate ? new Date(signedDate) : null;
    if (signingStatus !== undefined) dataToUpdate.signingStatus = signingStatus;
    if (dealRevenue !== undefined) dataToUpdate.dealRevenue = parseFloat(String(dealRevenue));
    if (commissionStatus !== undefined) dataToUpdate.commissionStatus = commissionStatus;
    if (commissionDueDate !== undefined) dataToUpdate.commissionDueDate = commissionDueDate;
    if (commissionAmount !== undefined) dataToUpdate.commissionAmount = parseFloat(String(commissionAmount));
    if (investorNotes !== undefined) dataToUpdate.investorNotes = investorNotes;
    if (status !== undefined) dataToUpdate.status = status;

    // If signingStatus is DA_KY, ensure status is SIGNED and signedAt is set
    if (signingStatus === 'DA_KY') {
      dataToUpdate.status = 'SIGNED';
      dataToUpdate.signedAt = signedDate ? new Date(signedDate) : new Date();
    }

    const updated = await db.contract.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: {
        product: { include: { project: true } },
        customer: true,
        salesEmployee: true,
        paymentPlan: true
      }
    });

    await createAuditLog({
      actorId,
      actorName,
      action: 'UPDATE_INVESTOR_CONTRACT_INFO',
      entityType: 'CONTRACT',
      entityId: params.id,
      afterJson: dataToUpdate
    });

    return NextResponse.json({
      message: 'Cập nhật thông tin hợp đồng Chủ đầu tư thành công!',
      data: updated
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
