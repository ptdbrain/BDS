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
      salesEmployeeId = 'emp_sales_01',
      salesEmployeeName = 'Trần Văn Nam'
    } = body;

    if (!productId || !customerId || !paymentPlanId) {
      return NextResponse.json({ error: 'Sản phẩm, khách hàng và phương án thanh toán là bắt buộc' }, { status: 400 });
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

    if (product.status === 'SOLD') {
      return NextResponse.json({
        type: 'urn:ahs:problem:product-already-sold',
        title: 'Sản phẩm đã bán',
        status: 400,
        code: 'PRODUCT_ALREADY_SOLD',
        detail: 'Sản phẩm này đã được bán thành công cho khách hàng khác.'
      }, { status: 400 });
    }

    // Resolve accurate agreed price from product price list if not provided
    const resolvedPrice = agreedPrice || product.prices[0]?.amount || 4500000000;

    // Generate formal contract number
    const year = new Date().getFullYear();
    const rand = Math.floor(Math.random() * 8999 + 1000);
    const contractNumber = `HĐMB-AHS-${product.productCode.replace('-', '')}-${year}-${rand}`;

    const snapshot = {
      productCode: product.productCode,
      building: product.building,
      floor: product.floor,
      area: product.area,
      customerName: customer.fullName,
      customerPhone: customer.phone,
      agreedPrice: resolvedPrice,
      createdAt: new Date().toISOString()
    };

    const contract = await db.contract.create({
      data: {
        contractNumber,
        productId,
        customerId,
        lockId,
        salesEmployeeId,
        paymentPlanId,
        agreedPrice: resolvedPrice,
        status: 'PENDING_REVIEW',
        snapshotJson: JSON.stringify(snapshot)
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
