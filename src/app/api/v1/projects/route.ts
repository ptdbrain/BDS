import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';

export async function GET() {
  try {
    await ensureDatabaseSeeded();

    const projects = await db.project.findMany({
      include: {
        investor: true,
        paymentPlans: true,
        _count: {
          select: { products: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      data: projects,
      meta: {
        total: projects.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
