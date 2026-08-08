import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sweepExpiredLocks } from '@/lib/locks';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';

export async function GET(request: Request) {
  try {
    await ensureDatabaseSeeded();
    // Sweep any expired locks before returning results
    await sweepExpiredLocks();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const building = searchParams.get('building');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const direction = searchParams.get('direction');

    const whereClause: any = {};

    if (projectId) whereClause.projectId = projectId;
    if (building) whereClause.building = building;
    if (status) whereClause.status = status;
    if (direction) whereClause.direction = direction;

    if (search) {
      whereClause.OR = [
        { productCode: { contains: search } },
        { building: { contains: search } }
      ];
    }

    const products = await db.product.findMany({
      where: whereClause,
      include: {
        project: true,
        productType: true,
        prices: {
          include: { paymentPlan: true }
        },
        locks: {
          where: { status: { in: ['ACTIVE', 'PAYMENT_PENDING'] } },
          include: { salesEmployee: true, payments: true }
        }
      },
      orderBy: [
        { building: 'asc' },
        { floor: 'desc' },
        { productCode: 'asc' }
      ]
    });

    // Summary counts by status
    const statusSummary = {
      TOTAL: products.length,
      AVAILABLE: products.filter(p => p.status === 'AVAILABLE').length,
      LOCKED: products.filter(p => p.status === 'LOCKED').length,
      DEPOSITED: products.filter(p => p.status === 'DEPOSITED').length,
      SOLD: products.filter(p => p.status === 'SOLD').length,
      UNAVAILABLE: products.filter(p => p.status === 'UNAVAILABLE').length,
    };

    return NextResponse.json({
      data: products,
      summary: statusSummary,
      meta: {
        total: products.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
