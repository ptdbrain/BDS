import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const booking = await db.booking.findUnique({
      where: { id: params.id },
      include: {
        project: true,
        salesEmployee: true
      }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Không tìm thấy lượt booking' }, { status: 404 });
    }

    return NextResponse.json({ data: booking });
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
    const {
      customerName,
      customerPhone,
      depositAmount,
      notes,
      salesEmployeeId
    } = body;

    const booking = await db.booking.findUnique({
      where: { id: params.id }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Không tìm thấy lượt booking' }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (customerName !== undefined) dataToUpdate.customerName = customerName;
    if (customerPhone !== undefined) dataToUpdate.customerPhone = customerPhone;
    if (depositAmount !== undefined) dataToUpdate.depositAmount = parseFloat(String(depositAmount));
    if (notes !== undefined) dataToUpdate.notes = notes;
    if (salesEmployeeId !== undefined) dataToUpdate.salesEmployeeId = salesEmployeeId;

    const updated = await db.booking.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: {
        project: true,
        salesEmployee: true
      }
    });

    await createAuditLog({
      action: 'UPDATE_BOOKING_INFO',
      entityType: 'Booking',
      entityId: params.id,
      actorId: salesEmployeeId || 'emp_sales_01',
      actorName: 'Nhân viên kinh doanh',
      afterJson: dataToUpdate
    });

    return NextResponse.json({
      message: 'Cập nhật thông tin lượt Booking thành công!',
      data: updated
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  return PATCH(request, { params });
}
