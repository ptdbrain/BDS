import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';
import { encryptPII, decryptPII, hashPII } from '@/lib/security';

function maskCCCD(cccd: string) {
  if (!cccd || cccd.length < 4) return '********';
  const plain = decryptPII(cccd);
  if (!plain || plain.length < 4) return '********';
  return '********' + plain.slice(-4);
}

function maskPhone(phone: string) {
  if (!phone || phone.length < 4) return '09******';
  return phone.slice(0, 3) + '****' + phone.slice(-3);
}

function maskAddress(address: string) {
  if (!address) return 'Hà Nội';
  const plain = decryptPII(address);
  const parts = plain.split(',');
  return parts.pop()?.trim() || 'Hà Nội';
}

export async function GET(request: Request) {
  try {
    await ensureDatabaseSeeded();
    const { searchParams } = new URL(request.url);
    const revealPII = searchParams.get('revealPII') === 'true';
    const actorId = searchParams.get('actorId') || 'UNKNOWN';
    const actorName = searchParams.get('actorName') || 'Nguoi dung he thong';
    const salesEmployeeId = searchParams.get('salesEmployeeId');

    const whereCondition: any = {};
    if (salesEmployeeId) {
      whereCondition.verifications = {
        some: { submittedById: salesEmployeeId }
      };
    }

    const customers = await db.customer.findMany({
      where: whereCondition,
      include: {
        verifications: { orderBy: { createdAt: 'desc' } },
        contracts: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (revealPII && actorId !== 'UNKNOWN') {
      await createAuditLog({
        actorId,
        actorName,
        action: 'VIEW_UNMASKED_CUSTOMER_PII',
        entityType: 'CUSTOMER_LIST',
        entityId: 'ALL'
      });
    }

    const processed = customers.map(c => {
      const plainCCCD = decryptPII(c.cccdCiphertext);
      const plainAddress = decryptPII(c.addressCiphertext);

      let extra: any = {};
      try {
        if (plainAddress.startsWith('{')) {
          extra = JSON.parse(plainAddress);
        } else {
          extra = { permanentAddress: plainAddress, contactAddress: plainAddress };
        }
      } catch {
        extra = { permanentAddress: plainAddress, contactAddress: plainAddress };
      }

      return {
        id: c.id,
        fullName: c.fullName,
        gender: extra.gender || 'Nam',
        dateOfBirth: extra.dateOfBirth || '1990-01-01',
        phone: c.phone,
        email: c.email,
        cccd: plainCCCD,
        permanentAddress: extra.permanentAddress || plainAddress,
        contactAddress: extra.contactAddress || plainAddress,
        verificationStatus: c.verificationStatus,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        verifications: c.verifications,
        contracts: c.contracts,
        cccdDisplay: revealPII ? plainCCCD : maskCCCD(c.cccdCiphertext),
        phoneDisplay: revealPII ? c.phone : maskPhone(c.phone),
        addressDisplay: revealPII ? (extra.permanentAddress || plainAddress) : maskAddress(c.addressCiphertext)
      };
    });

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
      gender = 'Nam',
      dateOfBirth = '',
      phone,
      email,
      cccd,
      permanentAddress,
      contactAddress,
      address,
      lockId,
      actorId = 'emp_sales_01',
      actorName = 'Trần Văn Nam'
    } = body;

    if (!fullName || !phone || !cccd) {
      return NextResponse.json({ error: 'Họ tên, SĐT và CCCD là bắt buộc' }, { status: 400 });
    }

    // Precondition Validation: Customer must be associated with an active lock or deposit transaction
    if (lockId) {
      const lock = await db.productLock.findUnique({
        where: { id: lockId }
      });
      if (!lock) {
        return NextResponse.json({
          type: 'urn:ahs:problem:lock-not-found',
          title: 'Không tìm thấy giao dịch giữ căn',
          status: 400,
          code: 'LOCK_NOT_FOUND',
          detail: 'Thông tin khách hàng phải gắn liền với một giao dịch giữ căn/cọc hợp lệ.'
        }, { status: 400 });
      }
    }

    const cccdHash = hashPII(cccd.trim());
    const cccdCiphertext = encryptPII(cccd.trim());

    const permAddr = permanentAddress || address || 'Hà Nội';
    const contAddr = contactAddress || permAddr;
    const addressPayload = JSON.stringify({
      gender,
      dateOfBirth,
      permanentAddress: permAddr,
      contactAddress: contAddr
    });

    const addressCiphertext = encryptPII(addressPayload);

    // Duplicate detection check via hash
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
          cccdCiphertext,
          cccdHash,
          addressCiphertext,
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

    // Automatically trigger CustomerVerification creation
    const verification = await db.customerVerification.create({
      data: {
        customerId: customer.id,
        submittedById: actorId,
        status: 'PENDING',
        notes: lockId ? `Khai báo thông tin khách gắn với giao dịch cọc lockId: ${lockId}` : 'Khai báo thông tin khách mới'
      }
    });

    await db.customer.update({
      where: { id: customer.id },
      data: { verificationStatus: 'PENDING_VERIFICATION' }
    });

    return NextResponse.json({
      data: {
        customer: {
          ...customer,
          gender,
          dateOfBirth,
          permanentAddress: permAddr,
          contactAddress: contAddr,
          cccdDisplay: maskCCCD(customer.cccdCiphertext),
          phoneDisplay: maskPhone(customer.phone)
        },
        verification,
        isDuplicateFound: !!existing
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
