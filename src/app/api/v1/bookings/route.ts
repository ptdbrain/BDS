import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';
import { isManagerReadOnly } from '@/lib/rolePolicy';

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
    const actorRole = (body.actorRole || request.headers.get('x-user-role') || 'SALES').toUpperCase();
    if (isManagerReadOnly(actorRole)) {
      return NextResponse.json({ error: 'Giám đốc chỉ có quyền xem, không được tạo booking.' }, { status: 403 });
    }
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

    // Pre-resolve valid sales employee ID
    let validSalesId = salesEmployeeId;
    let emp = null;

    if (salesEmployeeId && salesEmployeeId !== 'emp_sales_01') {
      emp = await db.employee.findFirst({
        where: {
          OR: [
            { id: salesEmployeeId },
            { employeeCode: salesEmployeeId },
            { maNV: salesEmployeeId }
          ]
        }
      });
    }

    if (!emp) {
      emp = await db.employee.findFirst({
        where: {
          OR: [
            { employeeCode: 'NV001' },
            { maNV: 'NV001' }
          ]
        }
      }) || await db.employee.findFirst();
    }

    if (emp) {
      validSalesId = emp.id;
    }

    // Tìm lượt booking trước đó có STT cao nhất trong cùng dự án
    const lastBooking = await db.booking.findFirst({
      where: { projectId },
      orderBy: { sttBooking: 'desc' }
    });

    let nextStt = (lastBooking?.sttBooking || 0) + 1;
    let bookingCode = `BK-${project.code || 'PRJ'}-${String(nextStt).padStart(4, '0')}`;
    while (await db.booking.findUnique({ where: { maLuotBooking: bookingCode } })) {
      nextStt += 1;
      bookingCode = `BK-${project.code || 'PRJ'}-${String(nextStt).padStart(4, '0')}`;
    }

    const now = new Date();
    // Quy tắc khớp căn tuần tự 10 phút tính từ thời điểm ra hàng của Dự án:
    // Mặc định: 14h00 chiều ngày 11/09/2026
    // Lượt 1: bắt đầu lúc 14h00, kết thúc 14h10
    // Lượt 2: bắt đầu sau khi Lượt 1 kết thúc -> 14h10, kết thúc 14h20
    // Lượt k: bắt đầu lúc Lượt (k-1).tgKetthuckhopcan, kết thúc sau 10 phút
    const projectLaunchTime = project.saleOpenAt ? new Date(project.saleOpenAt) : new Date(2026, 8, 11, 14, 0, 0);

    let defaultStartMatch: Date;
    if (tgBatdaukhop) {
      defaultStartMatch = new Date(tgBatdaukhop);
    } else if (lastBooking?.tgKetthuckhopcan) {
      defaultStartMatch = new Date(lastBooking.tgKetthuckhopcan);
    } else {
      defaultStartMatch = projectLaunchTime;
    }

    const defaultEndMatch = tgKetthuckhopcan
      ? new Date(tgKetthuckhopcan)
      : new Date(defaultStartMatch.getTime() + 10 * 60 * 1000);

    const startH = String(defaultStartMatch.getHours()).padStart(2, '0');
    const startM = String(defaultStartMatch.getMinutes()).padStart(2, '0');
    const endH = String(defaultEndMatch.getHours()).padStart(2, '0');
    const endM = String(defaultEndMatch.getMinutes()).padStart(2, '0');
    const dayStr = `${String(defaultStartMatch.getDate()).padStart(2, '0')}/${String(defaultStartMatch.getMonth() + 1).padStart(2, '0')}`;

    // Nếu thời điểm hiện tại chưa tới lượt, trạng thái không thể là DANG_KHOP
    let computedTrangThai = trangthaikhopcan || 'CHO_KHOP';
    if (now.getTime() < defaultStartMatch.getTime() && computedTrangThai === 'DANG_KHOP') {
      computedTrangThai = 'CHO_KHOP';
    }

    const booking = await db.booking.create({
      data: {
        maLuotBooking: bookingCode,
        projectId,
        salesEmployeeId: validSalesId,
        sttBooking: nextStt,
        tgBooking: now,
        tgBatdaukhop: defaultStartMatch,
        tgKetthuckhopcan: defaultEndMatch,
        trangthaikhopcan: computedTrangThai,
        customerName: customerName || `Khách hàng Ưu tiên #${nextStt}`,
        customerPhone: customerPhone || '0988888888',
        depositAmount: parseFloat(String(depositAmount)),
        notes: notes || `Khớp căn 10 phút: ${startH}h${startM} - ${endH}h${endM} (${dayStr}) (STT #${nextStt})`
      },
      include: {
        project: true,
        salesEmployee: true
      }
    });

    // Auto-register Customer record into Customer table so it appears in Customer Management
    if (customerPhone && customerName) {
      try {
        const existingCust = await db.customer.findFirst({ where: { phone: customerPhone } });
        if (!existingCust) {
          await db.customer.create({
            data: {
              fullName: customerName,
              phone: customerPhone,
              email: body.customerEmail || `${customerPhone}@gmail.com`,
              cccdCiphertext: body.customerCccd ? `ENC_${body.customerCccd}` : 'ENC_00120000450',
              cccdHash: body.customerCccd ? `HASH_${body.customerCccd}` : customerPhone,
              addressCiphertext: body.customerAddress || 'Hà Nội',
              verificationStatus: 'DRAFT'
            }
          });
        }
      } catch (custErr) {
        console.warn('Could not auto-register Customer from booking:', custErr);
      }
    }

    return NextResponse.json({
      message: `Đăng ký Booking ${bookingCode} thành công!`,
      data: booking
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
