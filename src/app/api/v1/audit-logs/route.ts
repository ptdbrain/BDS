import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';

export async function GET() {
  try {
    await ensureDatabaseSeeded();
    const logs = await db.auditLog.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
