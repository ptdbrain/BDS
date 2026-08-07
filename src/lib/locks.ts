import { db } from './db';
import { createAuditLog } from './audit';

export async function sweepExpiredLocks() {
  const now = new Date();
  
  // Find locks that have expired and are still ACTIVE or PAYMENT_PENDING
  const expiredLocks = await db.productLock.findMany({
    where: {
      status: { in: ['ACTIVE', 'PAYMENT_PENDING'] },
      expiresAt: { lt: now }
    },
    include: { product: true }
  });

  for (const lock of expiredLocks) {
    await db.$transaction(async (tx) => {
      // Mark lock EXPIRED
      await tx.productLock.update({
        where: { id: lock.id },
        data: { status: 'EXPIRED' }
      });

      // Update product back to AVAILABLE if not DEPOSITED/SOLD
      if (lock.product.status === 'LOCKED') {
        await tx.product.update({
          where: { id: lock.productId },
          data: {
            status: 'AVAILABLE',
            version: { increment: 1 }
          }
        });

        await tx.productStatusHistory.create({
          data: {
            productId: lock.productId,
            fromStatus: 'LOCKED',
            toStatus: 'AVAILABLE',
            reason: 'Lock hết hạn 30 phút tự động giải phóng',
            actorId: 'SYSTEM'
          }
        });
      }
    });

    await createAuditLog({
      actorId: 'SYSTEM',
      actorName: 'System Background Sweeper',
      action: 'EXPIRE_PRODUCT_LOCK',
      entityType: 'PRODUCT_LOCK',
      entityId: lock.id,
      beforeJson: { status: lock.status },
      afterJson: { status: 'EXPIRED', productId: lock.productId }
    });
  }

  return expiredLocks.length;
}

export async function acquireProductLock({
  productId,
  salesEmployeeId,
  salesEmployeeName,
  idempotencyKey
}: {
  productId: string;
  salesEmployeeId: string;
  salesEmployeeName: string;
  idempotencyKey?: string;
}) {
  // First sweep any expired locks
  await sweepExpiredLocks();

  // Check idempotency if key provided
  if (idempotencyKey) {
    const existingLock = await db.productLock.findUnique({
      where: { idempotencyKey }
    });
    if (existingLock) {
      return { success: true, lock: existingLock, isDuplicate: true };
    }
  }

  // Atomically check product status & lock
  const result = await db.$transaction(async (tx) => {
    const product = await tx.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error('PRODUCT_NOT_FOUND');
    }

    if (product.status !== 'AVAILABLE') {
      throw new Error('PRODUCT_ALREADY_LOCKED');
    }

    // Check if active lock exists
    const activeLock = await tx.productLock.findFirst({
      where: {
        productId,
        status: { in: ['ACTIVE', 'PAYMENT_PENDING'] },
        expiresAt: { gt: new Date() }
      }
    });

    if (activeLock) {
      throw new Error('PRODUCT_ALREADY_LOCKED');
    }

    // Lock for 30 minutes
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Ensure valid sales employee ID
    let validSalesId = salesEmployeeId;
    const empExists = await tx.employee.findUnique({ where: { id: salesEmployeeId } });
    if (!empExists) {
      const defaultEmp = await tx.employee.findFirst({ where: { employeeCode: 'NV-SALE-01' } }) || await tx.employee.findFirst();
      if (defaultEmp) {
        validSalesId = defaultEmp.id;
      }
    }

    const lock = await tx.productLock.create({
      data: {
        productId,
        salesEmployeeId: validSalesId,
        status: 'ACTIVE',
        startedAt: new Date(),
        expiresAt,
        idempotencyKey: idempotencyKey || `lock-${validSalesId}-${productId}-${Date.now()}`
      }
    });

    // Generate VietQR payment intent payload
    const depositAmount = 100000000; // 100M VND
    const providerRef = `AHS-${product.productCode.replace('-', '')}-${Math.floor(Math.random() * 89999 + 10000)}`;
    const qrPayload = `00020101021238580010A000000727012800069704230114${providerRef}52045311530370454${depositAmount}5802VN5917AHS REAL ESTATE6006HA NOI6304`;

    const payment = await tx.paymentTransaction.create({
      data: {
        lockId: lock.id,
        provider: 'VIETQR_AHS',
        providerReference: providerRef,
        amount: depositAmount,
        currency: 'VND',
        status: 'PENDING',
        expiresAt,
        qrPayload
      }
    });

    // Update product status to LOCKED
    await tx.product.update({
      where: { id: productId },
      data: {
        status: 'LOCKED',
        version: { increment: 1 }
      }
    });

    // Record status history
    await tx.productStatusHistory.create({
      data: {
        productId,
        fromStatus: 'AVAILABLE',
        toStatus: 'LOCKED',
        reason: `Khóa giữ căn 30 phút bởi Sales: ${salesEmployeeName}`,
        actorId: salesEmployeeId
      }
    });

    return { lock, payment };
  });

  await createAuditLog({
    actorId: salesEmployeeId,
    actorName: salesEmployeeName,
    action: 'LOCK_PRODUCT',
    entityType: 'PRODUCT_LOCK',
    entityId: result.lock.id,
    afterJson: { productId, expiresAt: result.lock.expiresAt }
  });

  return { success: true, lock: result.lock, payment: result.payment, isDuplicate: false };
}
