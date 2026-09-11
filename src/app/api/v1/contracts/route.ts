import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';
import { resolveEmployeeId } from '@/lib/employeeHelper';
import { ensureProductExists } from '@/lib/productHelper';
import { getAuthorizedFinancialFields, sanitizeContractForRole } from '@/lib/contractFinancialPolicy';
import { isManagerReadOnly, isSubmittedContractStatus } from '@/lib/rolePolicy';

export async function GET(request: Request) {
  try {
    await ensureDatabaseSeeded();
    const { searchParams } = new URL(request.url);
    const role = (searchParams.get('role') || request.headers.get('x-user-role') || 'SALES').toUpperCase();
    const employeeCode = searchParams.get('employeeCode') || request.headers.get('x-employee-code') || '';

    const isManager = role === 'MANAGER';
    const isSalesAdmin = role === 'SALES_ADMIN';
    const isSales = role === 'SALES';

    if (role === 'PRODUCT_ADMIN') {
      return NextResponse.json({ error: 'Nhân viên quản lý sản phẩm không có quyền xem danh sách hợp đồng.' }, { status: 403 });
    }

    const employeeFilter = isSales
      ? (employeeCode
        ? { salesEmployee: { OR: [{ employeeCode }, { maNV: employeeCode }] } }
        : null)
      : undefined;
    if (isSales && !employeeFilter) {
      return NextResponse.json({ data: [] });
    }

    const contracts = await db.contract.findMany({
      where: employeeFilter || undefined,
      include: {
        product: { include: { project: true } },
        customer: true,
        salesEmployee: true,
        paymentPlan: true,
        reviews: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const sanitized = contracts
      .filter(c => isSales || isSubmittedContractStatus(c.status))
      .map(c => sanitizeContractForRole(c, role, employeeCode));

    return NextResponse.json({ data: sanitized });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const actorRole = (body.actorRole || request.headers.get('x-user-role') || 'SALES').toUpperCase();
    if (isManagerReadOnly(actorRole)) {
      return NextResponse.json({ error: 'Giám đốc chỉ có quyền xem, không được tạo hợp đồng.' }, { status: 403 });
    }
    let financialFields: Record<string, unknown>;
    try {
      financialFields = getAuthorizedFinancialFields(actorRole, body);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    const {
      productId,
      customerId,
      lockId,
      paymentPlanId,
      agreedPrice,
      investorContractNo,
      signedDate,
      signingStatus = 'CHUA_KY',
      dealRevenue,
      commissionStatus = 'DU_KIEN_TRA',
      commissionDueDate,
      commissionAmount,
      investorNotes,
      salesEmployeeId = 'emp_sales_01',
      salesEmployeeName = 'Trần Văn Nam',
      productData,
      // Fields from ComprehensiveContractModal
      maHopdong,
      maKH,
      hotenKH,
      sodienthoaiKH,
      cccdKH,
      emailKH,
      diachiKH,
      phuonganthanhtoan,
      giahopdong,
      doanhso,
      hoahong,
      trangthaiThanhtoan,
      ghichu,
      status: requestedStatus
    } = body;

    const effectiveProductId = productId || productData?.id || productData?.productCode;

    if (!effectiveProductId) {
      return NextResponse.json({ error: 'Sản phẩm là bắt buộc' }, { status: 400 });
    }

    let product = await db.product.findUnique({
      where: { id: effectiveProductId },
      include: { project: true, prices: true }
    });

    // Self-healing for Vercel multi-container serverless SQLite
    if (!product && productData) {
      product = await ensureProductExists({ ...productData, id: effectiveProductId });
    }

    if (!product) {
      product = await db.product.findFirst({
        where: {
          OR: [
            { id: effectiveProductId },
            { productCode: effectiveProductId },
            { maCan: effectiveProductId }
          ]
        },
        include: { project: true, prices: true }
      });
    }

    if (!product) {
      return NextResponse.json({ error: 'Không tìm thấy sản phẩm' }, { status: 400 });
    }

    let resolvedCustomerId = customerId;
    let customer = null;
    if (resolvedCustomerId) {
      customer = await db.customer.findUnique({ where: { id: resolvedCustomerId } });
    }

    if (!customer) {
      const custPhone = sodienthoaiKH || '0912345678';
      const custName = hotenKH || 'Khách Hàng Mới';
      customer = await db.customer.findFirst({ where: { phone: custPhone } });
      if (!customer) {
        customer = await db.customer.create({
          data: {
            fullName: custName,
            phone: custPhone,
            email: emailKH || `${custPhone}@example.com`,
            cccdCiphertext: cccdKH ? `ENC_${cccdKH}` : `ENC_CCCD_${Date.now()}`,
            cccdHash: cccdKH ? `HASH_${cccdKH}` : `HASH_${Date.now()}`,
            addressCiphertext: diachiKH || 'Hà Nội',
            verificationStatus: 'VERIFIED'
          }
        });
      }
      resolvedCustomerId = customer.id;
    }

    // Resolve payment plan if not provided
    let resolvedPlanId = paymentPlanId;
    if (!resolvedPlanId) {
      const plan = await db.paymentPlan.findFirst({
        where: { projectId: product.projectId }
      });
      resolvedPlanId = plan?.id;
    }

    if (!resolvedPlanId) {
      const defaultPlan = await db.paymentPlan.create({
        data: {
          projectId: product.projectId,
          code: 'STD-DEFAULT',
          name: 'Thanh toán chuẩn theo tiến độ'
        }
      });
      resolvedPlanId = defaultPlan.id;
    }

    // Resolve the contract price once. DoanhSo is always derived from GiaHopDong;
    // the client-provided doanhso value is intentionally ignored.
    const resolvedPrice = Number(giahopdong ?? agreedPrice ?? dealRevenue ?? product.prices[0]?.amount ?? 4500000000);
    const validSalesId = await resolveEmployeeId(salesEmployeeId, 'SALES');

    // Check if contract exists for this product
    const existingContract = await db.contract.findFirst({
      where: { productId: product.id }
    });

    if (existingContract) {
      // Update existing contract with investor details
      const contractCount = await db.contract.count();
      const calculatedSales = Number(giahopdong ?? existingContract.giahopdong ?? existingContract.agreedPrice ?? resolvedPrice);
      const updated = await db.contract.update({
        where: { id: existingContract.id },
        data: {
          customerId: resolvedCustomerId,
          lockId: lockId || existingContract.lockId,
          salesEmployeeId: validSalesId,
          paymentPlanId: resolvedPlanId,
          agreedPrice: calculatedSales,
          dealRevenue: calculatedSales,
          signingStatus,
          signedDate: signedDate ? new Date(signedDate) : existingContract.signedDate,
          signedAt: signingStatus === 'DA_KY' ? (signedDate ? new Date(signedDate) : new Date()) : existingContract.signedAt,
          status: requestedStatus || (signingStatus === 'DA_KY' ? 'SIGNED' : 'PENDING_REVIEW'),
          ...financialFields,
          investorContractNo: maHopdong || investorContractNo || existingContract.investorContractNo,
          investorNotes: ghichu || investorNotes || existingContract.investorNotes,

          // Class diagram fields (Hopdong)
          maHopdong: String(maHopdong || existingContract.maHopdong || (202600 + contractCount + 1)),
          maKH: String(maKH || existingContract.maKH || 1001),
          sodienthoaiKH: sodienthoaiKH || customer?.phone,
          cccdKH: cccdKH || customer?.cccdHash || '001200009999',
          emailKH: emailKH || customer?.email || 'khachhang@gmail.com',
          diachiKH: diachiKH || customer?.addressCiphertext || 'Hà Nội',
          hotenKH: hotenKH || customer?.fullName,
          phuonganthanhtoan: phuonganthanhtoan || 'Thanh toán chuẩn theo tiến độ',
          giahopdong: calculatedSales,
          thoigiankiHDMB: signedDate ? new Date(signedDate) : existingContract.signedDate,
          trangthaiHDMB: signingStatus,
          doanhso: calculatedSales,
          ghichu: ghichu || investorNotes || existingContract.investorNotes || 'Hợp đồng mua bán CĐT'
        },
        include: {
          product: { include: { project: true } },
          customer: true,
          salesEmployee: true,
          paymentPlan: true
        }
      });

      // Update customer & trigger pending verification for Sales Admin
      if (resolvedCustomerId) {
        await db.customer.update({
          where: { id: resolvedCustomerId },
          data: {
            fullName: hotenKH || customer?.fullName,
            phone: sodienthoaiKH || customer?.phone,
            email: emailKH || customer?.email,
            cccdHash: cccdKH || customer?.cccdHash,
            cccdCiphertext: cccdKH ? `ENC_${cccdKH}` : customer?.cccdCiphertext,
            addressCiphertext: diachiKH || customer?.addressCiphertext,
            verificationStatus: 'PENDING_VERIFICATION'
          }
        }).catch(() => {});

        const pendingVer = await db.customerVerification.findFirst({
          where: { customerId: resolvedCustomerId, status: 'PENDING' }
        });
        if (!pendingVer) {
          await db.customerVerification.create({
            data: {
              customerId: resolvedCustomerId,
              submittedById: validSalesId,
              status: 'PENDING',
              notes: `Hồ sơ hợp đồng căn ${product.productCode} chờ Sales Admin duyệt thông tin khách hàng`
            }
          }).catch(() => {});
        }
      }

      return NextResponse.json({
        message: 'Cập nhật thông tin hợp đồng CĐT thành công!',
        data: updated
      });
    }

    // Generate formal contract number
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 8999 + 1000);
    const contractNumber = maHopdong || investorContractNo || `HĐMB-AHS-${product.productCode.replace('-', '')}-${year}-${rand}`;
    const contractCount = await db.contract.count();
    const calculatedSales = resolvedPrice;

    const snapshot = {
      productCode: product.productCode,
      building: product.building,
      floor: product.floor,
      area: product.area,
      customerName: hotenKH || customer.fullName,
      customerPhone: sodienthoaiKH || customer.phone,
       agreedPrice: calculatedSales,
       dealRevenue: calculatedSales,
       ...financialFields,
      createdAt: new Date().toISOString()
    };

    const contract = await db.contract.create({
      data: {
        contractNumber,
        productId: product.id,
        customerId: resolvedCustomerId,
        lockId,
        salesEmployeeId: validSalesId,
        paymentPlanId: resolvedPlanId,
         agreedPrice: calculatedSales,
         dealRevenue: calculatedSales,
        signingStatus,
        signedDate: signedDate ? new Date(signedDate) : null,
        signedAt: signingStatus === 'DA_KY' ? (signedDate ? new Date(signedDate) : new Date()) : null,
        status: requestedStatus || (signingStatus === 'DA_KY' ? 'SIGNED' : 'PENDING_REVIEW'),
        commissionStatus: (financialFields.commissionStatus as string | null | undefined) ?? null,
        commissionDueDate: (financialFields.commissionDueDate as string | null | undefined) ?? null,
        commissionAmount: (financialFields.commissionAmount as number | null | undefined) ?? null,
        ...financialFields,
        investorContractNo: maHopdong || investorContractNo || contractNumber,
        investorNotes: ghichu || investorNotes,
        snapshotJson: JSON.stringify(snapshot),

        // Class diagram fields (Hopdong)
        maHopdong: String(maHopdong || (202600 + contractCount + 1)),
        maKH: String(maKH || (1000 + contractCount + 1)),
        sodienthoaiKH: sodienthoaiKH || customer.phone,
        cccdKH: cccdKH || customer.cccdHash || '001200009999',
        emailKH: emailKH || customer.email || 'khachhang@gmail.com',
        diachiKH: diachiKH || customer.addressCiphertext || 'Hà Nội',
        hotenKH: hotenKH || customer.fullName,
        phuonganthanhtoan: phuonganthanhtoan || 'Thanh toán chuẩn theo tiến độ',
         giahopdong: calculatedSales,
        thoigiankiHDMB: signedDate ? new Date(signedDate) : null,
        trangthaiHDMB: signingStatus,
         doanhso: calculatedSales,
       ghichu: ghichu || investorNotes || 'Hợp đồng mua bán chính thức CĐT'
      },
      include: {
        product: { include: { project: true } },
        customer: true,
        salesEmployee: true,
        paymentPlan: true
      }
    });

    // Update customer & trigger pending verification for Sales Admin
    if (resolvedCustomerId) {
      await db.customer.update({
        where: { id: resolvedCustomerId },
        data: {
          fullName: hotenKH || customer?.fullName,
          phone: sodienthoaiKH || customer?.phone,
          email: emailKH || customer?.email,
          cccdHash: cccdKH || customer?.cccdHash,
          cccdCiphertext: cccdKH ? `ENC_${cccdKH}` : customer?.cccdCiphertext,
          addressCiphertext: diachiKH || customer?.addressCiphertext,
          verificationStatus: 'PENDING_VERIFICATION'
        }
      }).catch(() => {});

      const pendingVer = await db.customerVerification.findFirst({
        where: { customerId: resolvedCustomerId, status: 'PENDING' }
      });
      if (!pendingVer) {
        await db.customerVerification.create({
          data: {
            customerId: resolvedCustomerId,
            submittedById: validSalesId,
            status: 'PENDING',
            notes: `Hồ sơ hợp đồng căn ${product.productCode} chờ Sales Admin duyệt thông tin khách hàng`
          }
        }).catch(() => {});
      }
    }

    await createAuditLog({
      actorId: salesEmployeeId,
      actorName: salesEmployeeName,
      action: 'SUBMIT_CONTRACT_FOR_REVIEW',
      entityType: 'CONTRACT',
      entityId: contract.id,
      afterJson: { contractNumber, status: 'PENDING_REVIEW' }
    });

    return NextResponse.json({ data: contract });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
