import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { acquireProductLock, sweepExpiredLocks } from '@/lib/locks';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    await sweepExpiredLocks();

    const locks = await db.productLock.findMany({
      include: {
        product: { include: { project: true } },
        salesEmployee: true,
        payments: true,
        contracts: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: locks });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const idempotencyKey = request.headers.get('Idempotency-Key') || undefined;
    const body = await request.json();
    const { productId, salesEmployeeId = 'emp_sales_01', salesEmployeeName = 'Trần Văn Nam' } = body;

    if (!productId) {
      return NextResponse.json({
        type: 'urn:ahs:problem:validation-failed',
        title: 'Dữ liệu không hợp lệ',
        status: 400,
        code: 'VALIDATION_FAILED',
        detail: 'productId là bắt buộc.'
      }, { status: 400 });
    }

    try {
      const lockResult = await acquireProductLock({
        productId,
        salesEmployeeId,
        salesEmployeeName,
        idempotencyKey
      });

      return NextResponse.json({ data: lockResult });
    } catch (err: any) {
      if (err.message === 'PRODUCT_ALREADY_LOCKED') {
        return NextResponse.json({
          type: 'urn:ahs:problem:product-already-locked',
          title: 'Sản phẩm đã được khóa',
          status: 409,
          code: 'PRODUCT_ALREADY_LOCKED',
          detail: 'Sản phẩm này hiện đang trong thời gian giữ căn bởi giao dịch khác hoặc đã được cọc/bán.'
        }, { status: 409 });
      }

      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
