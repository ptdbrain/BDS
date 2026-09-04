import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';

export async function GET(request: Request) {
  try {
    await ensureDatabaseSeeded();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    const whereClause: any = {};
    if (projectId) {
      whereClause.projectId = projectId;
    }

    const bookings = await db.booking.findMany({
      where: whereClause,
      include: {
        project: true,
        salesEmployee: true
      },
      orderBy: {
        sttBooking: 'asc'
      }
    });

    return NextResponse.json({ data: bookings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectId,
      salesEmployeeId = 'emp_sales_01',
      customerName,
      customerPhone,
      depositAmount = 50000000,
      notes,
      tgBatdaukhop,
      tgKetthuckhopcan,
      trangthaikhopcan = 'CHO_KHOP'
    } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'ProjectId là bắt buộc' }, { status: 400 });
    }

    const project = await db.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    // Find current max STT for this project
    const bookingCount = await db.booking.count({
      where: { projectId }
    });
    const nextStt = bookingCount + 1;
    const bookingCode = `BK-${project.code}-${String(nextStt).padStart(4, '0')}`;

    const now = new Date();
    // Default match window: 3 days after project open
    const defaultStartMatch = tgBatdaukhop ? new Date(tgBatdaukhop) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const defaultEndMatch = tgKetthuckhopcan ? new Date(tgKetthuckhopcan) : new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    const booking = await db.booking.create({
      data: {
        maLuotBooking: bookingCode,
        projectId,
        salesEmployeeId,
        sttBooking: nextStt,
        tgBooking: now,
        tgBatdaukhop: defaultStartMatch,
        tgKetthuckhopcan: defaultEndMatch,
        trangthaikhopcan,
        customerName: customerName || 'Khách hàng ưu tiên đợt 1',
        customerPhone: customerPhone || '0988888888',
        depositAmount: parseFloat(String(depositAmount)),
        notes: notes || 'Đăng ký nguyện vọng căn tầng đẹp view thoáng'
      },
      include: {
        project: true,
        salesEmployee: true
      }
    });

    return NextResponse.json({
      message: `Đăng ký Booking ${bookingCode} thành công!`,
      data: booking
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
