import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, items, actorId = 'emp_prod_01', actorName = 'Nguyễn Tiến Dũng' } = body;

    if (!projectId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid import payload' }, { status: 400 });
    }

    const defaultType = await db.productType.findFirst();
    const defaultPlan = await db.paymentPlan.findFirst({ where: { projectId } });

    if (!defaultType || !defaultPlan) {
      return NextResponse.json({ error: 'Missing default project setup' }, { status: 400 });
    }

    const results = {
      total: items.length,
      success: 0,
      errors: [] as Array<{ row: number; code: string; message: string }>
    };

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const rowNum = index + 1;

      try {
        if (!item.productCode || !item.building || !item.floor || !item.area) {
          results.errors.push({ row: rowNum, code: 'MISSING_REQUIRED', message: 'Mã căn, tòa, tầng hoặc diện tích bị thiếu' });
          continue;
        }

        // Check duplicate
        const existing = await db.product.findFirst({
          where: { projectId, productCode: item.productCode }
        });

        if (existing) {
          results.errors.push({ row: rowNum, code: 'DUPLICATE_CODE', message: `Mã căn ${item.productCode} đã tồn tại trong dự án` });
          continue;
        }

        const prod = await db.product.create({
          data: {
            projectId,
            productTypeId: defaultType.id,
            productCode: item.productCode,
            building: item.building,
            floor: parseInt(item.floor, 10),
            area: parseFloat(item.area),
            direction: item.direction || 'Đông Nam',
            handoverPlan: item.handoverPlan || 'Hoàn thiện cao cấp',
            status: 'AVAILABLE'
          }
        });

        const price = item.price ? parseFloat(item.price) : prod.area * 65000000;
        await db.productPrice.create({
          data: {
            productId: prod.id,
            paymentPlanId: defaultPlan.id,
            amount: price,
            depositAmount: 100000000
          }
        });

        results.success++;
      } catch (err: any) {
        results.errors.push({ row: rowNum, code: 'SYSTEM_ERROR', message: err.message });
      }
    }

    await createAuditLog({
      actorId,
      actorName,
      action: 'BULK_IMPORT_PRODUCTS',
      entityType: 'PROJECT',
      entityId: projectId,
      afterJson: { total: results.total, success: results.success, errorCount: results.errors.length }
    });

    return NextResponse.json({ data: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
