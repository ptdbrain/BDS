import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { isManagerReadOnly } from '@/lib/rolePolicy';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id;
    const body = await request.json();
    const actorRole = (body.actorRole || request.headers.get('x-user-role') || 'PRODUCT_ADMIN').toUpperCase();
    if (isManagerReadOnly(actorRole)) {
      return NextResponse.json({ error: 'Giám đốc chỉ có quyền xem, không được thiết lập lịch ra hàng.' }, { status: 403 });
    }
    const {
      saleOpenAt,
      resetAllBookings = true,
      actorId = 'emp_prod_01',
      actorName = 'Quản lý Sản phẩm'
    } = body;

    let project = await db.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      project = await db.project.findFirst({
        where: {
          OR: [
            { id: projectId },
            { code: projectId },
            { maDA: projectId }
          ]
        }
      });
    }

    if (!project) {
      return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    // Default launch time is 14:00 11/09/2026 if not specified
    const targetLaunchDate = saleOpenAt
      ? new Date(saleOpenAt)
      : new Date(2026, 8, 11, 14, 0, 0);

    if (isNaN(targetLaunchDate.getTime())) {
      return NextResponse.json({ error: 'Thời gian ra hàng không hợp lệ' }, { status: 400 });
    }

    // 1. Update Project saleOpenAt
    const updatedProject = await db.project.update({
      where: { id: project.id },
      data: {
        saleOpenAt: targetLaunchDate
      }
    });

    // 2. Fetch all bookings for this project sorted by STT
    const bookings = await db.booking.findMany({
      where: { projectId: project.id },
      orderBy: { sttBooking: 'asc' }
    });

    const now = new Date();
    let turnStart = new Date(targetLaunchDate.getTime());
    const updatedBookings = [];

    // Format helper for VN time display
    const formatVN = (d: Date) => {
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${h}h${m} (${day}/${month}/${d.getFullYear()})`;
    };

    for (let i = 0; i < bookings.length; i++) {
      const b = bookings[i];
      const startMatch = new Date(turnStart.getTime());
      const endMatch = new Date(startMatch.getTime() + 10 * 60 * 1000);
      turnStart = new Date(endMatch.getTime());

      let newStatus = b.trangthaikhopcan;

      // Keep already matched bookings as DA_KHOP
      if (b.trangthaikhopcan === 'DA_KHOP' || b.trangthaikhopcan === 'Đã khớp') {
        newStatus = 'DA_KHOP';
      } else {
        // Calculate status based on current time vs slot
        if (now.getTime() < startMatch.getTime()) {
          newStatus = 'CHO_KHOP'; // Chờ ra hàng / chờ tới lượt
        } else if (now.getTime() >= startMatch.getTime() && now.getTime() <= endMatch.getTime()) {
          newStatus = 'DANG_KHOP'; // Đang trong lượt 10 phút khớp căn
        } else {
          newStatus = 'HUY'; // Hết thời gian khớp căn
        }
      }

      const updatedB = await db.booking.update({
        where: { id: b.id },
        data: {
          tgBatdaukhop: startMatch,
          tgKetthuckhopcan: endMatch,
          trangthaikhopcan: newStatus,
          notes: `Khớp căn 10 phút: ${formatVN(startMatch)} - ${formatVN(endMatch)} (Dự án ${project.name})`
        }
      });
      updatedBookings.push(updatedB);
    }

    await createAuditLog({
      action: 'SCHEDULE_PROJECT_LAUNCH',
      entityType: 'Project',
      entityId: project.id,
      actorId,
      actorName,
      afterJson: {
        projectId: project.id,
        saleOpenAt: targetLaunchDate,
        totalBookingsRescheduled: updatedBookings.length
      }
    });

    return NextResponse.json({
      message: `Đã thiết lập thời điểm ra hàng dự án lúc ${formatVN(targetLaunchDate)}. Đã sắp xếp lại chuỗi 10 phút cho ${updatedBookings.length} lượt booking!`,
      data: {
        project: updatedProject,
        bookings: updatedBookings,
        saleOpenAt: targetLaunchDate
      }
    });
  } catch (error: any) {
    console.error('[schedule-launch] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
