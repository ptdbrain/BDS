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
      salesEmployeeName = 'Trần Văn Nam'
    } = body;

    if (!productId || !customerId) {
      return NextResponse.json({ error: 'Sản phẩm và khách hàng là bắt buộc' }, { status: 400 });
    }

    const product = await db.product.findUnique({
      where: { id: productId },
      include: { project: true, prices: true }
    });

    const customer = await db.customer.findUnique({
      where: { id: customerId }
    });

    if (!product || !customer) {
      return NextResponse.json({ error: 'Không tìm thấy sản phẩm hoặc khách hàng' }, { status: 400 });
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
          customerId,
          lockId: lockId || existingContract.lockId,
          salesEmployeeId: salesEmployeeId || existingContract.salesEmployeeId,
          paymentPlanId: resolvedPlanId,
          agreedPrice: resolvedPrice,
          dealRevenue: resolvedPrice,
          signingStatus,
          signedDate: signedDate ? new Date(signedDate) : existingContract.signedDate,
          signedAt: signingStatus === 'DA_KY' ? (signedDate ? new Date(signedDate) : new Date()) : existingContract.signedAt,
          status: signingStatus === 'DA_KY' ? 'SIGNED' : existingContract.status,
          commissionStatus,
          commissionDueDate: commissionDueDate || existingContract.commissionDueDate,
          commissionAmount: resolvedCommission,
          investorContractNo: investorContractNo || existingContract.investorContractNo,
          investorNotes: investorNotes || existingContract.investorNotes,

          // Class diagram fields (Hopdong)
          maHopdong: String(existingContract.maHopdong || (202600 + contractCount + 1)),
          maKH: String(existingContract.maKH || 1001),
          sodienthoaiKH: customer.phone,
          cccdKH: customer.cccdHash || '001200009999',
          emailKH: customer.email || 'khachhang@gmail.com',
          diachiKH: customer.addressCiphertext || 'Hà Nội',
          hotenKH: customer.fullName,
          phuonganthanhtoan: 'Thanh toán chuẩn theo tiến độ',
          giahopdong: resolvedPrice,
          thoigiankiHDMB: signedDate ? new Date(signedDate) : existingContract.signedDate,
          trangthaiHDMB: signingStatus,
          doanhso: resolvedPrice,
          hoahong: resolvedCommission,
          trangthaiThanhtoan: commissionStatus,
          ghichu: investorNotes || existingContract.investorNotes || 'Hợp đồng mua bán CĐT'
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
    const contractNumber = investorContractNo || `HĐMB-AHS-${product.productCode.replace('-', '')}-${year}-${rand}`;
    const contractCount = await db.contract.count();

    const snapshot = {
      productCode: product.productCode,
      building: product.building,
      floor: product.floor,
      area: product.area,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      agreedPrice: resolvedPrice,
      dealRevenue: resolvedPrice,
      commissionAmount: resolvedCommission,
      createdAt: new Date().toISOString()
    };

    const contract = await db.contract.create({
      data: {
        contractNumber,
        productId,
        customerId,
        lockId,
        salesEmployeeId,
        paymentPlanId: resolvedPlanId,
        agreedPrice: resolvedPrice,
        dealRevenue: resolvedPrice,
        signingStatus,
        signedDate: signedDate ? new Date(signedDate) : null,
        signedAt: signingStatus === 'DA_KY' ? (signedDate ? new Date(signedDate) : new Date()) : null,
        status: signingStatus === 'DA_KY' ? 'SIGNED' : 'PENDING_REVIEW',
        commissionStatus,
        commissionDueDate: commissionDueDate || '25/10/2026',
        commissionAmount: resolvedCommission,
        investorContractNo: investorContractNo || contractNumber,
        investorNotes,
        snapshotJson: JSON.stringify(snapshot),

        // Class diagram fields (Hopdong)
        maHopdong: String(202600 + contractCount + 1),
        maKH: String(1000 + contractCount + 1),
        sodienthoaiKH: customer.phone,
        cccdKH: customer.cccdHash || '001200009999',
        emailKH: customer.email || 'khachhang@gmail.com',
        diachiKH: customer.addressCiphertext || 'Hà Nội',
        hotenKH: customer.fullName,
        phuonganthanhtoan: 'Thanh toán chuẩn theo tiến độ',
        giahopdong: resolvedPrice,
        thoigiankiHDMB: signedDate ? new Date(signedDate) : null,
        trangthaiHDMB: signingStatus,
        doanhso: resolvedPrice,
        hoahong: resolvedCommission,
        trangthaiThanhtoan: commissionStatus,
        ghichu: investorNotes || 'Hợp đồng mua bán chính thức CĐT'
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
