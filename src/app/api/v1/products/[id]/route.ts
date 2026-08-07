import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sweepExpiredLocks } from '@/lib/locks';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await sweepExpiredLocks();

    const product = await db.product.findUnique({
      where: { id: params.id },
      include: {
        project: { include: { investor: true } },
        productType: true,
        prices: { include: { paymentPlan: true } },
        locks: {
          include: { salesEmployee: true, payments: true },
          orderBy: { createdAt: 'desc' }
        },
        history: {
          orderBy: { occurredAt: 'desc' }
        },
        contracts: {
          include: { customer: true, salesEmployee: true },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    return NextResponse.json({ data: product });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
