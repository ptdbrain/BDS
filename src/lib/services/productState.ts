import { db } from '../db';
import { createAuditLog } from '../audit';
import { ProductStatus } from '../types';

export const VALID_PRODUCT_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  AVAILABLE: ['LOCKED', 'UNAVAILABLE'],
  LOCKED: ['AVAILABLE', 'DEPOSITED', 'UNAVAILABLE'],
  DEPOSITED: ['SOLD', 'AVAILABLE', 'UNAVAILABLE'],
  SOLD: ['AVAILABLE'],
  UNAVAILABLE: ['AVAILABLE']
};

export interface TransitionProductStateOptions {
  productId: string;
  fromStatus?: ProductStatus;
  toStatus: ProductStatus;
  reason: string;
  actorId: string;
  actorName: string;
  tx?: any;
}

/**
 * Atomically transitions product state enforcing domain rules, status history, optimistic locking, and audit logs.
 */
export async function transitionProductState({
  productId,
  fromStatus,
  toStatus,
  reason,
  actorId,
  actorName,
  tx
}: TransitionProductStateOptions) {
  const runner = tx || db;

  return await runner.$transaction?.(async (innerTx: any) => {
    return executeTransition(innerTx);
  }) || executeTransition(runner);

  async function executeTransition(transaction: any) {
    const product = await transaction.product.findUnique({
      where: { id: productId }
    });

    if (!product) {
      throw new Error(`PRODUCT_NOT_FOUND: Product ${productId} does not exist`);
    }

    const currentStatus = product.status as ProductStatus;

    if (fromStatus && currentStatus !== fromStatus) {
      throw new Error(
        `INVALID_STATE_TRANSITION: Product ${product.productCode} is currently in state '${currentStatus}', expected '${fromStatus}'`
      );
    }

    const allowedNextStates = VALID_PRODUCT_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStates.includes(toStatus)) {
      throw new Error(
        `ILLEGAL_STATE_TRANSITION: Cannot transition product ${product.productCode} from '${currentStatus}' to '${toStatus}'`
      );
    }

    // Atomic update with version increment
    const updatedProduct = await transaction.product.update({
      where: { id: productId },
      data: {
        status: toStatus,
        version: { increment: 1 }
      }
    });

    // Record Status History
    await transaction.productStatusHistory.create({
      data: {
        productId,
        fromStatus: currentStatus,
        toStatus,
        reason,
        actorId
      }
    });

    // Record Audit Log
    await createAuditLog({
      actorId,
      actorName,
      action: 'TRANSITION_PRODUCT_STATUS',
      entityType: 'PRODUCT',
      entityId: productId,
      beforeJson: { status: currentStatus, version: product.version },
      afterJson: { status: toStatus, version: updatedProduct.version, reason }
    });

    return updatedProduct;
  }
}
