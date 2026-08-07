import { db } from './db';

export async function createAuditLog({
  actorId,
  actorName,
  action,
  entityType,
  entityId,
  beforeJson,
  afterJson,
  ip = '127.0.0.1',
  requestId
}: {
  actorId: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeJson?: any;
  afterJson?: any;
  ip?: string;
  requestId?: string;
}) {
  try {
    await db.auditLog.create({
      data: {
        actorId,
        actorName,
        action,
        entityType,
        entityId,
        beforeJson: beforeJson ? JSON.stringify(beforeJson) : null,
        afterJson: afterJson ? JSON.stringify(afterJson) : null,
        ip,
        requestId: requestId || `req_${Date.now()}`
      }
    });
  } catch (err) {
    console.error('Failed to log audit entry:', err);
  }
}
