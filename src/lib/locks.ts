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
            trangthai: 'Còn hàng',
            version: { increment: 1 }
          }
        });

        await tx.productStatusHistory.create({
          data: {
            productId: lock.productId,
            fromStatus: 'LOCKED',
            toStatus: 'AVAILABLE',
            reason: 'Lock hết hạn tự động giải phóng bởi Background Sweeper',
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
  // Sweep expired locks first
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

  // Pre-resolve valid sales employee ID outside transaction
  let validSalesId = salesEmployeeId;
  const empExists = await db.employee.findUnique({ where: { id: salesEmployeeId } });
  if (!empExists) {
    const defaultEmp = await db.employee.findFirst({ where: { employeeCode: 'NV001' } }) || await db.employee.findFirst();
    if (defaultEmp) {
      validSalesId = defaultEmp.id;
    }
  }

  // Pre-fetch product price and duration outside transaction
  const product = await db.product.findUnique({
    where: { id: productId },
    include: { project: true, prices: true }
  });

  if (!product) {
    throw new Error('PRODUCT_NOT_FOUND');
  }

  try {
    // Atomically check product status & acquire lock using row-level conditional update
    const result = await db.$transaction(async (tx) => {
      // Atomic conditional update to prevent race condition
      const updatedCount = await tx.product.updateMany({
        where: {
          id: productId,
          status: 'AVAILABLE'
        },
        data: {
          status: 'LOCKED',
          trangthai: 'Đang giữ chỗ',
          version: { increment: 1 }
        }
      });

      if (updatedCount.count === 0) {
        throw new Error('PRODUCT_ALREADY_LOCKED');
      }

      // Dynamic lock duration & deposit amount
      const lockDurationMinutes = product.project?.lockDurationMinutes || 30;
      const depositAmount = product.prices[0]?.depositAmount || 100000000;
      const expiresAt = new Date(Date.now() + lockDurationMinutes * 60 * 1000);

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

      // Record status history
      await tx.productStatusHistory.create({
        data: {
          productId,
          fromStatus: 'AVAILABLE',
          toStatus: 'LOCKED',
          reason: `Khóa giữ căn ${lockDurationMinutes} phút bởi Sales: ${salesEmployeeName}`,
          actorId: validSalesId
        }
      });

      return { lock, payment };
    }, { timeout: 30000 });

    await createAuditLog({
      actorId: validSalesId,
      actorName: salesEmployeeName,
      action: 'LOCK_PRODUCT',
      entityType: 'PRODUCT_LOCK',
      entityId: result.lock.id,
      afterJson: { productId, expiresAt: result.lock.expiresAt }
    });

    return { success: true, lock: result.lock, payment: result.payment, isDuplicate: false };
  } catch (err: any) {
    if (
      err.message === 'PRODUCT_ALREADY_LOCKED' ||
      err.message?.includes('Transaction already closed') ||
      err.message?.includes('database failed to respond') ||
      err.message?.includes('timed out') ||
      err.message?.includes('expired transaction')
    ) {
      throw new Error('PRODUCT_ALREADY_LOCKED');
    }
    throw err;
  }
}
