import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
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
