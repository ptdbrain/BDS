import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';
import { encryptPII, decryptPII, hashPII } from '@/lib/security';
import { resolveEmployeeId } from '@/lib/employeeHelper';
import { isManagerReadOnly, isSubmittedCustomerStatus } from '@/lib/rolePolicy';

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
    const role = (searchParams.get('role') || request.headers.get('x-user-role') || 'SALES').toUpperCase();
    const employeeCode = searchParams.get('employeeCode') || request.headers.get('x-employee-code') || '';

    if (role === 'PRODUCT_ADMIN') {
      return NextResponse.json({ error: 'Nhân viên quản lý sản phẩm không có quyền xem thông tin khách hàng.' }, { status: 403 });
    }

    const whereCondition: any = {
      verificationStatus: { not: 'DRAFT' }
    };
    if (role === 'SALES') {
      const actorEmployee = employeeCode || salesEmployeeId;
      if (!actorEmployee) return NextResponse.json({ data: [] });
      const resolvedSalesEmployeeId = await resolveEmployeeId(actorEmployee, 'SALES');
      whereCondition.OR = [
        { verifications: { some: { submittedById: resolvedSalesEmployeeId } } },
        { contracts: { some: { salesEmployeeId: resolvedSalesEmployeeId } } }
      ];
    } else if (salesEmployeeId) {
      whereCondition.verifications = {
        some: { submittedById: salesEmployeeId }
      };
    }

    const customers = await db.customer.findMany({
      where: whereCondition,
      include: {
        verifications: {
          orderBy: { createdAt: 'desc' },
          include: { submittedBy: true, reviewedBy: true }
        },
        contracts: {
          include: {
            product: { include: { project: true } },
            salesEmployee: true,
            lock: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (revealPII && actorId !== 'UNKNOWN' && (role === 'SALES_ADMIN' || role === 'MANAGER')) {
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

      const primaryContract = c.contracts?.[0];
      const attachedProduct = primaryContract?.product;
      const salesEmp = primaryContract?.salesEmployee || c.verifications?.[0]?.submittedBy;

      return {
        id: c.id,
        fullName: c.fullName,
        gender: extra.gender || 'Nam',
        dateOfBirth: extra.dateOfBirth || '1990-01-01',
        phone: c.phone,
        email: c.email,
      cccd: (role === 'SALES_ADMIN' || role === 'MANAGER') ? plainCCCD : undefined,
        permanentAddress: extra.permanentAddress || plainAddress,
        contactAddress: extra.contactAddress || plainAddress,
        verificationStatus: c.verificationStatus,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        verifications: c.verifications,
        contracts: c.contracts,
        attachedProduct: attachedProduct ? {
          id: attachedProduct.id,
          productCode: attachedProduct.productCode,
          building: attachedProduct.building,
          projectName: attachedProduct.project?.name || 'AHS Grand Horizon',
          area: attachedProduct.area,
          price: primaryContract?.agreedPrice || 4550000000,
          depositAmount: 100000000
        } : {
          id: 'prod_default',
          productCode: 'A-0501',
          building: 'Tòa A (Horizon Tower)',
          projectName: 'AHS Grand Horizon Tây Hồ',
          area: 75.5,
          price: 4550000000,
          depositAmount: 100000000
        },
        salesEmployee: {
          id: salesEmp?.id || 'emp_sales_01',
          fullName: salesEmp?.fullName || 'Trần Văn Nam',
          employeeCode: salesEmp?.employeeCode || 'NV-SALE-01'
        },
        cccdDisplay: revealPII && (role === 'SALES_ADMIN' || role === 'MANAGER') ? plainCCCD : maskCCCD(c.cccdCiphertext),
        phoneDisplay: revealPII && (role === 'SALES_ADMIN' || role === 'MANAGER') ? c.phone : maskPhone(c.phone),
        addressDisplay: revealPII && (role === 'SALES_ADMIN' || role === 'MANAGER') ? (extra.permanentAddress || plainAddress) : maskAddress(c.addressCiphertext)
      };
    }).filter(c => isSubmittedCustomerStatus(c.verificationStatus));

    return NextResponse.json({ data: processed });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole || request.headers.get('x-user-role') || 'SALES').toUpperCase();
    if (isManagerReadOnly(actorRole)) {
      return NextResponse.json({ error: 'Giám đốc chỉ có quyền xem, không được tạo hồ sơ khách hàng.' }, { status: 403 });
    }
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
      productId,
      productCode,
      productData,
      actorId = 'emp_sales_01',
      actorName = 'Trần Văn Nam'
    } = body;

    if (!fullName || !phone || !cccd) {
      return NextResponse.json({ error: 'Họ tên, SĐT và CCCD là bắt buộc' }, { status: 400 });
    }

    // Resolve lock or product if provided
    let lock: any = null;
    if (lockId) {
      lock = await db.productLock.findUnique({
        where: { id: lockId },
        include: { product: true }
      });
    }
    if (!lock && productId) {
      lock = await db.productLock.findFirst({
        where: { productId },
        orderBy: { createdAt: 'desc' },
        include: { product: true }
      });
    }

    const effProductId = lock?.productId || productId;
    let targetProduct = lock?.product;
    if (!targetProduct && effProductId) {
      targetProduct = await db.product.findUnique({ where: { id: effProductId } });
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

    const validActorId = await resolveEmployeeId(actorId, 'SALES');

    // Duplicate detection check via hash
    const existing = await db.customer.findFirst({
      where: {
        OR: [{ cccdHash }, { phone: phone.trim() }]
      }
    });

    let customer;

    if (existing) {
      customer = await db.customer.update({
        where: { id: existing.id },
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email?.trim() || existing.email,
          cccdCiphertext,
          cccdHash,
          addressCiphertext,
          verificationStatus: 'PENDING_VERIFICATION'
        }
      });
    } else {
      customer = await db.customer.create({
        data: {
          fullName: fullName.trim(),
          phone: phone.trim(),
          email: email?.trim() || '',
          cccdCiphertext,
          cccdHash,
          addressCiphertext,
          verificationStatus: 'PENDING_VERIFICATION'
        }
      });

      await createAuditLog({
        actorId: validActorId,
        actorName,
        action: 'CREATE_CUSTOMER',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        afterJson: { fullName, phone: maskPhone(phone) }
      });
    }

    // Automatically trigger CustomerVerification creation or update
    let verification = await db.customerVerification.findFirst({
      where: { customerId: customer.id, status: 'PENDING' }
    });

    if (verification) {
      verification = await db.customerVerification.update({
        where: { id: verification.id },
        data: {
          submittedById: validActorId,
          notes: lock ? `Khai báo cập nhật gắn với lockId: ${lock.id}` : 'Khai báo cập nhật thông tin khách hàng'
        }
      });
    } else {
      verification = await db.customerVerification.create({
        data: {
          customerId: customer.id,
          submittedById: validActorId,
          status: 'PENDING',
          notes: lock ? `Khai báo thông tin khách gắn với giao dịch cọc lockId: ${lock.id}` : 'Khai báo thông tin khách mới'
        }
      });
    }

    // Link customer to draft contract if associated with a unit/lock
    if (effProductId && targetProduct) {
      let existingContract = await db.contract.findFirst({
        where: {
          OR: [
            ...(lock ? [{ lockId: lock.id }] : []),
            { productId: effProductId }
          ]
        }
      });

      const agreedPrice = targetProduct.gianiemyet || targetProduct.giaTTC || 4550000000;
      const now = new Date();

      if (existingContract) {
        await db.contract.update({
          where: { id: existingContract.id },
          data: {
            customerId: customer.id,
            salesEmployeeId: validActorId,
            ...(lock ? { lockId: lock.id } : {}),
            hotenKH: customer.fullName,
            sodienthoaiKH: customer.phone,
            cccdKH: cccd.trim(),
            emailKH: customer.email || '',
            diachiKH: contAddr,
            status: existingContract.status === 'SIGNED' ? 'SIGNED' : 'PENDING_REVIEW',
            signingStatus: existingContract.signingStatus === 'DA_KY' ? 'DA_KY' : 'CHUA_KY'
          }
        });
      } else {
        const contractCount = await db.contract.count();
        const rand = Math.floor(Math.random() * 8999 + 1000);
        const contractNumber = `HĐMB-AHS-${(targetProduct.productCode || 'CAN').replace(/[^a-zA-Z0-9]/g, '')}-${now.getFullYear()}-${rand}`;

        let paymentPlan = await db.paymentPlan.findFirst({
          where: { projectId: targetProduct.projectId }
        }) || await db.paymentPlan.findFirst();

        if (!paymentPlan) {
          paymentPlan = await db.paymentPlan.create({
            data: {
              projectId: targetProduct.projectId || 'prj_grand_horizon',
              code: 'STANDARD_PROGRESS',
              name: 'Tiến độ chuẩn 7 đợt (Giá TTC)',
              scheduleJson: JSON.stringify({ description: 'Thanh toán chuẩn theo tiến độ xây dựng' }),
              active: true
            }
          });
        }

        await db.contract.create({
          data: {
            contractNumber,
            productId: effProductId,
            customerId: customer.id,
            salesEmployeeId: validActorId,
            lockId: lock?.id,
            paymentPlanId: paymentPlan.id,
            status: 'PENDING_REVIEW',
            signingStatus: 'CHUA_KY',
            agreedPrice,
            dealRevenue: agreedPrice,
            commissionAmount: null,
            commissionStatus: null,
            investorContractNo: contractNumber,
            investorNotes: `Hồ sơ khách hàng vừa được Sales (${actorName}) nhập liệu sau khi nộp cọc. Chờ Sales Admin duyệt.`,
            maHopdong: String(202600 + contractCount + 1),
            maKH: String(1000 + contractCount + 1),
            sodienthoaiKH: customer.phone,
            cccdKH: cccd.trim(),
            emailKH: customer.email || '',
            diachiKH: contAddr,
            hotenKH: customer.fullName,
            giahopdong: agreedPrice,
            trangthaiHDMB: 'Chưa ký',
            doanhso: agreedPrice,
            hoahong: null,
            ghichu: `Khách hàng: ${customer.fullName} - Cọc căn ${targetProduct.productCode}`
          }
        });
      }
    }

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
