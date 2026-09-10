import { db } from './db';
import { ensureProductExists } from './productHelper';
import { resolveEmployeeId } from './employeeHelper';

/**
 * Self-healing helper for Vercel multi-container serverless SQLite environment.
 * Ensures that a contract exists in the local container's SQLite database (/tmp/dev.db)
 * before reviewing, requesting changes, approving, or signing.
 */
export async function ensureContractExists(contractData: any, productData?: any) {
  if (!contractData && !productData) return null;

  const targetId = contractData?.id;
  const targetNumber = contractData?.contractNumber || contractData?.maHopdong;
  const targetProductId = contractData?.productId || productData?.id;

  // 1. Check if contract exists by primary key ID
  if (targetId) {
    const existing = await db.contract.findUnique({
      where: { id: targetId },
      include: { product: true, customer: true }
    });
    if (existing) return existing;
  }

  // 2. Check if contract exists by contractNumber or maHopdong
  if (targetNumber) {
    const existingByNo = await db.contract.findFirst({
      where: {
        OR: [
          { contractNumber: targetNumber },
          { maHopdong: targetNumber },
          { investorContractNo: targetNumber }
        ]
      },
      include: { product: true, customer: true }
    });
    if (existingByNo) return existingByNo;
  }

  // 3. Check if contract exists by productId
  if (targetProductId) {
    const existingByProd = await db.contract.findFirst({
      where: { productId: targetProductId },
      include: { product: true, customer: true }
    });
    if (existingByProd) return existingByProd;
  }

  // 4. Ensure product exists in this container
  let product = null;
  if (productData || contractData?.product || targetProductId) {
    product = await ensureProductExists(productData || contractData?.product || { id: targetProductId });
  }
  if (!product) {
    product = await db.product.findFirst();
  }

  if (!product) {
    console.warn('[ensureContractExists] No product available to attach contract.');
    return null;
  }

  // 5. Ensure customer exists
  const custPhone = contractData?.sodienthoaiKH || contractData?.customer?.phone || '0912345678';
  const custName = contractData?.hotenKH || contractData?.customer?.fullName || 'Khách Mua Căn ' + product.productCode;

  let customer = await db.customer.findFirst({ where: { phone: custPhone } });
  if (!customer) {
    customer = await db.customer.create({
      data: {
        fullName: custName,
        phone: custPhone,
        email: contractData?.emailKH || contractData?.customer?.email || 'khachhang@gmail.com',
        cccdCiphertext: contractData?.cccdKH ? `ENC_${contractData.cccdKH}` : 'ENC_00120000450',
        cccdHash: contractData?.cccdKH ? `HASH_${contractData.cccdKH}` : '00120000450',
        addressCiphertext: contractData?.diachiKH || contractData?.customer?.addressCiphertext || 'Hà Nội',
        verificationStatus: 'VERIFIED'
      }
    });
  }

  // 6. Resolve Sales Employee
  const validSalesId = await resolveEmployeeId(contractData?.salesEmployeeId, 'SALES');

  // 7. Resolve PaymentPlan
  let paymentPlan = await db.paymentPlan.findFirst({
    where: { projectId: product.projectId }
  }) || await db.paymentPlan.findFirst();

  const price = Number(contractData?.giahopdong || contractData?.dealRevenue || contractData?.agreedPrice || product.gianiemyet || (product as any).prices?.[0]?.amount || 4800000000);
  const commission = contractData?.hoahong != null
    ? Number(contractData.hoahong)
    : contractData?.commissionAmount != null
    ? Number(contractData.commissionAmount)
    : null;
  const finalContractNumber = targetNumber || `HD-${product.productCode.replace(/[\.\-]/g, '')}-2026`;

  try {
    const created = await db.contract.create({
      data: {
        ...(targetId ? { id: targetId } : {}),
        contractNumber: finalContractNumber,
        productId: product.id,
        customerId: customer.id,
        salesEmployeeId: validSalesId,
        paymentPlanId: paymentPlan?.id || 'default_plan',
        agreedPrice: price,
        dealRevenue: price,
        status: contractData?.status || 'PENDING_REVIEW',
        signingStatus: contractData?.signingStatus || 'CHUA_KY',
        commissionStatus: contractData?.commissionStatus ?? null,
        commissionAmount: commission,
        investorContractNo: finalContractNumber,
        investorNotes: contractData?.investorNotes || '',
        maHopdong: finalContractNumber,
        maKH: customer.id.slice(0, 8).toUpperCase(),
        sodienthoaiKH: customer.phone,
        cccdKH: contractData?.cccdKH || customer.cccdHash || '00120000450',
        emailKH: customer.email,
        diachiKH: customer.addressCiphertext || 'Hà Nội',
        hotenKH: customer.fullName,
        phuonganthanhtoan: contractData?.phuonganthanhtoan || '3. Vay ngân hàng HTLS 0% (Giá Vay)',
        giahopdong: price,
        doanhso: price,
        hoahong: commission,
        trangthaiHDMB: contractData?.trangthaiHDMB || 'Chưa ký'
      },
      include: { product: true, customer: true }
    });

    return created;
  } catch (e: any) {
    console.error('[ensureContractExists] Failed to create missing contract:', e.message);
    return await db.contract.findFirst({
      where: {
        OR: [
          ...(targetId ? [{ id: targetId }] : []),
          { contractNumber: finalContractNumber }
        ]
      },
      include: { product: true, customer: true }
    });
  }
}
