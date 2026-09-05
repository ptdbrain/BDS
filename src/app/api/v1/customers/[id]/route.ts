import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { encryptPII, hashPII } from '@/lib/security';
import { resolveEmployeeId } from '@/lib/employeeHelper';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      fullName,
      gender,
      dateOfBirth,
      phone,
      email,
      cccd,
      permanentAddress,
      contactAddress,
      actorId = 'emp_sales_01',
      actorName = 'Trần Văn Nam'
    } = body;

    const existing = await db.customer.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Khách hàng không tồn tại' }, { status: 404 });
    }

    const updateData: any = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (phone) updateData.phone = phone.trim();
    if (email !== undefined) updateData.email = email.trim();

    if (cccd) {
      updateData.cccdHash = hashPII(cccd.trim());
      updateData.cccdCiphertext = encryptPII(cccd.trim());
    }

    if (permanentAddress || contactAddress || gender || dateOfBirth) {
      const addressPayload = JSON.stringify({
        gender: gender || 'Nam',
        dateOfBirth: dateOfBirth || '',
        permanentAddress: permanentAddress || 'Hà Nội',
        contactAddress: contactAddress || permanentAddress || 'Hà Nội'
      });
      updateData.addressCiphertext = encryptPII(addressPayload);
    }

    updateData.verificationStatus = 'PENDING_VERIFICATION';

    const validActorId = await resolveEmployeeId(actorId, 'SALES');

    const updated = await db.customer.update({
      where: { id },
      data: updateData
    });

    let verification = await db.customerVerification.findFirst({
      where: { customerId: id, status: 'PENDING' }
    });
    if (!verification) {
      await db.customerVerification.create({
        data: {
          customerId: id,
          submittedById: validActorId,
          status: 'PENDING',
          notes: 'Cập nhật lại thông tin hồ sơ khách hàng'
        }
      }).catch(() => {});
    }

    await createAuditLog({
      actorId: validActorId,
      actorName,
      action: 'UPDATE_CUSTOMER_PII',
      entityType: 'CUSTOMER',
      entityId: id
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const actorId = searchParams.get('actorId') || 'emp_sales_01';
    const actorName = searchParams.get('actorName') || 'Trần Văn Nam';

    // Delete customer verifications & customer
    await db.customerVerification.deleteMany({ where: { customerId: id } });
    await db.customer.delete({ where: { id } });

    await createAuditLog({
      actorId,
      actorName,
      action: 'DELETE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: id
    });

    return NextResponse.json({ success: true, message: 'Đã xóa thông tin khách hàng' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
