import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    const contracts = await db.contract.findMany({
      include: {
        product: { include: { project: true } },
        customer: true,
        salesEmployee: true,
        paymentPlan: true,
        reviews: { orderBy: { createdAt: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: contracts });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    if (!productId) {
      return NextResponse.json({ error: 'Sản phẩm là bắt buộc' }, { status: 400 });
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { project: true, prices: true }
    });

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

    // Resolve accurate agreed price / deal revenue
    const resolvedPrice = dealRevenue || agreedPrice || product.prices[0]?.amount || 4500000000;
    const resolvedCommission = commissionAmount !== undefined ? commissionAmount : (resolvedPrice * 0.03);

    // Check if contract exists for this product
    const existingContract = await db.contract.findFirst({
      where: { productId }
    });

    if (existingContract) {
      // Update existing contract with investor details
      const contractCount = await db.contract.count();
      const updated = await db.contract.update({
        where: { id: existingContract.id },
        data: {
          customerId: resolvedCustomerId,
          lockId: lockId || existingContract.lockId,
          salesEmployeeId: salesEmployeeId || existingContract.salesEmployeeId,
          paymentPlanId: resolvedPlanId,
          agreedPrice: Number(giahopdong || resolvedPrice),
          dealRevenue: Number(doanhso || resolvedPrice),
          signingStatus,
          signedDate: signedDate ? new Date(signedDate) : existingContract.signedDate,
          signedAt: signingStatus === 'DA_KY' ? (signedDate ? new Date(signedDate) : new Date()) : existingContract.signedAt,
          status: requestedStatus || (signingStatus === 'DA_KY' ? 'SIGNED' : 'PENDING_REVIEW'),
          commissionStatus: trangthaiThanhtoan || commissionStatus,
          commissionDueDate: commissionDueDate || existingContract.commissionDueDate,
          commissionAmount: Number(hoahong || resolvedCommission),
          investorContractNo: maHopdong || investorContractNo || existingContract.investorContractNo,
          investorNotes: ghichu || investorNotes || existingContract.investorNotes,

          // Class diagram fields (Hopdong)
          maHopdong: String(maHopdong || existingContract.maHopdong || (202600 + contractCount + 1)),
          maKH: String(maKH || existingContract.maKH || 1001),
          sodienthoaiKH: sodienthoaiKH || customer.phone,
          cccdKH: cccdKH || customer.cccdHash || '001200009999',
          emailKH: emailKH || customer.email || 'khachhang@gmail.com',
          diachiKH: diachiKH || customer.addressCiphertext || 'Hà Nội',
          hotenKH: hotenKH || customer.fullName,
          phuonganthanhtoan: phuonganthanhtoan || 'Thanh toán chuẩn theo tiến độ',
          giahopdong: Number(giahopdong || resolvedPrice),
          thoigiankiHDMB: signedDate ? new Date(signedDate) : existingContract.signedDate,
          trangthaiHDMB: signingStatus,
          doanhso: Number(doanhso || resolvedPrice),
          hoahong: Number(hoahong || resolvedCommission),
          trangthaiThanhtoan: trangthaiThanhtoan || commissionStatus,
          ghichu: ghichu || investorNotes || existingContract.investorNotes || 'Hợp đồng mua bán CĐT'
        },
        include: {
          product: { include: { project: true } },
          customer: true,
          salesEmployee: true,
          paymentPlan: true
        }
      });

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

    const snapshot = {
      productCode: product.productCode,
      building: product.building,
      floor: product.floor,
      area: product.area,
      customerName: hotenKH || customer.fullName,
      customerPhone: sodienthoaiKH || customer.phone,
      agreedPrice: Number(giahopdong || resolvedPrice),
      dealRevenue: Number(doanhso || resolvedPrice),
      commissionAmount: Number(hoahong || resolvedCommission),
      createdAt: new Date().toISOString()
    };

    const contract = await db.contract.create({
      data: {
        contractNumber,
        productId,
        customerId: resolvedCustomerId,
        lockId,
        salesEmployeeId,
        paymentPlanId: resolvedPlanId,
        agreedPrice: Number(giahopdong || resolvedPrice),
        dealRevenue: Number(doanhso || resolvedPrice),
        signingStatus,
        signedDate: signedDate ? new Date(signedDate) : null,
        signedAt: signingStatus === 'DA_KY' ? (signedDate ? new Date(signedDate) : new Date()) : null,
        status: requestedStatus || (signingStatus === 'DA_KY' ? 'SIGNED' : 'PENDING_REVIEW'),
        commissionStatus: trangthaiThanhtoan || commissionStatus,
        commissionDueDate: commissionDueDate || '25/10/2026',
        commissionAmount: Number(hoahong || resolvedCommission),
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
        giahopdong: Number(giahopdong || resolvedPrice),
        thoigiankiHDMB: signedDate ? new Date(signedDate) : null,
        trangthaiHDMB: signingStatus,
        doanhso: Number(doanhso || resolvedPrice),
        hoahong: Number(hoahong || resolvedCommission),
        trangthaiThanhtoan: trangthaiThanhtoan || commissionStatus,
        ghichu: ghichu || investorNotes || 'Hợp đồng mua bán chính thức CĐT'
      },
      include: {
        product: { include: { project: true } },
        customer: true,
        salesEmployee: true,
        paymentPlan: true
      }
    });

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
