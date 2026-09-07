import { db } from './db';

/**
 * Self-healing helper for Vercel multi-container serverless SQLite environment.
 * Ensures that a product exists in the local container's SQLite database (/tmp/dev.db)
 * before acquiring locks, matching bookings, or creating contracts.
 */
export async function ensureProductExists(productData: any) {
  if (!productData) return null;

  const targetId = productData.id;
  const targetCode = (productData.productCode || productData.maCan || '').trim().toUpperCase();

  // 1. Check if product already exists by primary key ID
  if (targetId) {
    const existingById = await db.product.findUnique({
      where: { id: targetId },
      include: { project: true, prices: true }
    });
    if (existingById) return existingById;
  }

  // 2. Check if product exists by projectId + productCode
  if (productData.projectId && targetCode) {
    try {
      const existingByComposite = await db.product.findUnique({
        where: {
          projectId_productCode: {
            projectId: productData.projectId,
            productCode: targetCode
          }
        },
        include: { project: true, prices: true }
      });
      if (existingByComposite) return existingByComposite;
    } catch (e) {
      // Ignore composite query error
    }
  }

  // 3. Check by productCode or maCan standalone
  if (targetCode) {
    const existingByCode = await db.product.findFirst({
      where: {
        OR: [
          { productCode: targetCode },
          { maCan: targetCode }
        ]
      },
      include: { project: true, prices: true }
    });
    if (existingByCode) return existingByCode;
  }

  // 4. Resolve valid Project
  let projectId = productData.projectId;
  if (projectId) {
    const proj = await db.project.findUnique({ where: { id: projectId } });
    if (!proj) {
      const defaultProj = await db.project.findFirst();
      projectId = defaultProj?.id || projectId;
    }
  } else {
    const defaultProj = await db.project.findFirst();
    projectId = defaultProj?.id;
  }

  if (!projectId) {
    console.warn('[ensureProductExists] No project found to attach product to.');
    return null;
  }

  // 5. Resolve valid ProductType
  let productTypeId = productData.productTypeId;
  if (productTypeId) {
    const pType = await db.productType.findUnique({ where: { id: productTypeId } });
    if (!pType) {
      const defaultType = await db.productType.findFirst();
      productTypeId = defaultType?.id;
    }
  } else {
    const defaultType = await db.productType.findFirst();
    productTypeId = defaultType?.id;
  }

  if (!productTypeId) {
    const newType = await db.productType.create({
      data: {
        code: 'TYPE-APT',
        name: 'Căn Hộ Cao Cấp',
        loaiSanpham: 'Căn Hộ Cao Cấp'
      }
    });
    productTypeId = newType.id;
  }

  // 6. Resolve PaymentPlan for project
  let paymentPlan = await db.paymentPlan.findFirst({
    where: { projectId }
  });
  if (!paymentPlan) {
    paymentPlan = await db.paymentPlan.findFirst();
  }
  if (!paymentPlan) {
    paymentPlan = await db.paymentPlan.create({
      data: {
        projectId,
        code: 'STD-DEFAULT',
        name: 'Thanh toán chuẩn theo tiến độ'
      }
    });
  }

  // Extract prices and attributes
  const priceObj = productData.prices?.[0] || {};
  const amount = Number(productData.amount || productData.gianiemyet || priceObj.amount || 4800000000);
  const depositAmount = Number(productData.depositAmount || priceObj.depositAmount || 100000000);
  const floor = parseInt(String(productData.floor || 1), 10);
  const area = parseFloat(String(productData.area || productData.dientich || 70));
  const direction = (productData.direction || productData.huong || 'Đông Nam').trim();
  const handoverPlan = (productData.handoverPlan || 'Hoàn thiện cao cấp').trim();
  const building = (productData.building || 'Tòa A').trim();
  const status = productData.status || 'AVAILABLE';
  const trangthai = productData.trangthai || (status === 'AVAILABLE' ? 'Còn hàng' : status);

  // 7. Upsert Product into this container's SQLite database
  try {
    const prod = await db.$transaction(async (tx) => {
      const newProd = await tx.product.create({
        data: {
          ...(targetId ? { id: targetId } : {}),
          projectId,
          productTypeId,
          productCode: targetCode || `APT-${Date.now()}`,
          building,
          floor,
          area,
          direction,
          handoverPlan,
          status,
          maCan: targetCode || `APT-${Date.now()}`,
          dientich: area,
          huong: direction,
          gianiemyet: Number(productData.gianiemyet || amount),
          giaTTS: Number(productData.giaTTS || Math.round(amount * 0.9)),
          giaTTC: Number(productData.giaTTC || amount),
          giaVay: Number(productData.giaVay || Math.round(amount * 1.02)),
          trangthai
        }
      });

      await tx.productPrice.create({
        data: {
          productId: newProd.id,
          paymentPlanId: paymentPlan!.id,
          amount,
          depositAmount
        }
      });

      return newProd;
    });

    return await db.product.findUnique({
      where: { id: prod.id },
      include: { project: true, prices: true }
    });
  } catch (err: any) {
    console.error('[ensureProductExists] Failed to create missing product, fallback to query:', err.message);
    return await db.product.findFirst({
      where: {
        OR: [
          ...(targetId ? [{ id: targetId }] : []),
          ...(targetCode ? [{ productCode: targetCode }, { maCan: targetCode }] : [])
        ]
      },
      include: { project: true, prices: true }
    });
  }
}
