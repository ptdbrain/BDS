import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const project = await db.project.findUnique({
      where: { id: params.id },
      include: {
        investor: true,
        paymentPlans: true,
        _count: {
          select: { products: true }
        }
      }
    });

    if (!project) {
      return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    return NextResponse.json({ data: project });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { imagesJson, name, location, status, lockDurationMinutes, actorId = 'emp_prod_01', actorName = 'Nguyễn Tiến Dũng' } = body;

    const dataToUpdate: any = {};
    if (imagesJson !== undefined) dataToUpdate.imagesJson = typeof imagesJson === 'string' ? imagesJson : JSON.stringify(imagesJson);
    if (name !== undefined) dataToUpdate.name = name;
    if (location !== undefined) dataToUpdate.location = location;
    if (status !== undefined) dataToUpdate.status = status;
    if (lockDurationMinutes !== undefined) dataToUpdate.lockDurationMinutes = parseInt(String(lockDurationMinutes), 10);

    const updated = await db.project.update({
      where: { id: params.id },
      data: dataToUpdate
    });

    await createAuditLog({
      actorId,
      actorName,
      action: 'UPDATE_PROJECT_INFO',
      entityType: 'PROJECT',
      entityId: params.id,
      afterJson: dataToUpdate
    });

    return NextResponse.json({
      message: 'Cập nhật thông tin dự án thành công!',
      data: updated
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
