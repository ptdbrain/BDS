import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';

function maskCCCD(cccd: string) {
  if (!cccd || cccd.length < 4) return '********';
  return '********' + cccd.slice(-4);
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 4) return '09******';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

export async function GET(request: Request) {
  try {
    await ensureDatabaseSeeded();
    const { searchParams } = new URL(request.url);
    const revealPII = searchParams.get('revealPII') === 'true';
    const actorId = searchParams.get('actorId') || 'UNKNOWN';

    const customers = await db.customer.findMany({
      include: {
        verifications: { orderBy: { createdAt: 'desc' } },
        contracts: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (revealPII && actorId !== 'UNKNOWN') {
      await createAuditLog({
        actorId,
        actorName: 'User requested PII unmasking',
        action: 'VIEW_UNMASKED_CUSTOMER_PII',
        entityType: 'CUSTOMER_LIST',
        entityId: 'ALL'
      });
    }

    const processed = customers.map(c => ({
      ...c,
      cccdDisplay: revealPII ? c.cccdCiphertext : maskCCCD(c.cccdCiphertext),
      phoneDisplay: revealPII ? c.phone : maskPhone(c.phone),
      addressDisplay: revealPII ? c.addressCiphertext : (c.addressCiphertext.split(',').pop()?.trim() || 'Hà Nội')
    }));

    return NextResponse.json({ data: processed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      fullName,
      phone,
      email,
      cccd,
      address,
      lockId,
      actorId = 'emp_sales_01',
      actorName = 'Trần Văn Nam'
    } = body;

    if (!fullName || !phone || !cccd) {
      return NextResponse.json({ error: 'Họ tên, SĐT và CCCD là bắt buộc' }, { status: 400 });
    }

    const cccdHash = `hash_${cccd.trim()}`;

    // Duplicate detection check
    const existing = await db.customer.findFirst({
      where: {
        OR: [{ cccdHash }, { phone: phone.trim() }]
      }
    });

    let customer;

    if (existing) {
      customer = existing;
    } else {
      customer = await db.customer.create({
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email?.trim() || '',
          cccdCiphertext: cccd.trim(),
          cccdHash,
          addressCiphertext: address?.trim() || 'Hà Nội',
          verificationStatus: 'DRAFT'
        }
      });

      await createAuditLog({
        actorId,
        actorName,
        action: 'CREATE_CUSTOMER',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        afterJson: { fullName, phone: maskPhone(phone) }
      });
    }

    // Automatically trigger CustomerVerification creation if linked to a Lock
    const verification = await db.customerVerification.create({
      data: {
        customerId: customer.id,
        submittedById: actorId,
        status: 'PENDING',
        notes: lockId ? `Khách hàng gắn với giao dịch cọc lockId: ${lockId}` : 'Khai báo thông tin mới'
      }
    });

    await db.customer.update({
      where: { id: customer.id },
      data: { verificationStatus: 'PENDING_VERIFICATION' }
    });

    return NextResponse.json({
      data: {
        customer,
        verification,
        isDuplicateFound: !!existing
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
