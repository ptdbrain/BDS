import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { ensureBookingExists } from '@/lib/bookingHelper';
import { canConfirmBookingTransaction, createFollowUpBookingDraft } from '@/lib/bookingQueue';
import { canApproveBooking } from '@/lib/rolePolicy';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const bookingId = params.id;
    const body = await request.json().catch(() => ({}));
    const {
      actorId = 'emp_sales_admin',
      actorName = 'Vũ Mai Phương (Sales Admin)',
      notes = 'Sales Admin xác nhận đã nhận thanh toán cọc Booking 50.000.000 VNĐ'
    } = body;
    const actorRole = (body.actorRole || request.headers.get('x-user-role') || '').toUpperCase();
    if (!canApproveBooking(actorRole)) {
      return NextResponse.json({ error: 'Chỉ Sales Admin được xác nhận giao dịch Booking.' }, { status: 403 });
    }

    let booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { project: true, salesEmployee: true }
    });

    // Self-healing for Vercel multi-container serverless SQLite
    if (!booking && (body.bookingData || body.maLuotBooking)) {
      booking = await ensureBookingExists({
        id: bookingId,
        ...body.bookingData,
        maLuotBooking: body.maLuotBooking || body.bookingData?.maLuotBooking
      });
    }

    if (!booking) {
      booking = await db.booking.findFirst({
        where: {
          OR: [
            { id: bookingId },
            { maLuotBooking: bookingId },
            ...(body.maLuotBooking ? [{ maLuotBooking: body.maLuotBooking }] : [])
          ]
        },
        include: { project: true, salesEmployee: true }
      });
    }

    if (!booking) {
      return NextResponse.json({ error: 'Không tìm thấy lượt booking' }, { status: 404 });
    }

    if (!canConfirmBookingTransaction(booking.trangthaikhopcan, booking.depositConfirmedAt)) {
      if (booking.depositConfirmedAt && booking.followUpBookingId) {
        const nextBooking = await db.booking.findUnique({
          where: { id: booking.followUpBookingId },
          include: { project: true, salesEmployee: true }
        });
        return NextResponse.json({
          message: 'Booking ' + booking.maLuotBooking + ' đã được xác nhận trước đó.',
          data: { currentBooking: booking, nextBooking, alreadyConfirmed: true }
        });
      }
      return NextResponse.json({
        error: 'Booking ' + booking.maLuotBooking + ' chưa ở trạng thái chờ Sales Admin xác nhận giao dịch.'
      }, { status: 409 });
    }

    const projectLaunchTime = booking.project?.saleOpenAt ? new Date(booking.project.saleOpenAt) : new Date(2026, 8, 11, 14, 0, 0);
    const result = await db.$transaction(async (tx) => {
      const current = await tx.booking.findUnique({ where: { id: booking.id } });
      if (!current) throw new Error('Không tìm thấy lượt booking');

      if (!canConfirmBookingTransaction(current.trangthaikhopcan, current.depositConfirmedAt)) {
        const existingNext = current.followUpBookingId
          ? await tx.booking.findUnique({
              where: { id: current.followUpBookingId },
              include: { project: true, salesEmployee: true }
            })
          : null;
        return { currentBooking: current, nextBooking: existingNext, alreadyConfirmed: true };
      }

      const lastBooking = await tx.booking.findFirst({
        where: { projectId: current.projectId },
        orderBy: { sttBooking: 'desc' }
      });
      const draft = createFollowUpBookingDraft({
        projectId: current.projectId,
        salesEmployeeId: current.salesEmployeeId,
        projectCode: booking.project?.code || 'PRJ',
        nextStt: (lastBooking?.sttBooking || current.sttBooking || 0) + 1,
        previousEnd: current.tgKetthuckhopcan,
        projectLaunchTime
      });
      const nextBooking = await tx.booking.create({
        data: draft,
        include: { project: true, salesEmployee: true }
      });
      const currentBooking = await tx.booking.update({
        where: { id: current.id },
        data: {
          trangthaikhopcan: 'CHO_KHOP',
          depositConfirmedAt: new Date(),
          depositConfirmedById: actorId,
          followUpBookingId: nextBooking.id,
          notes: current.notes ? current.notes + ' | ' + notes : notes
        },
        include: { project: true, salesEmployee: true }
      });
      return { currentBooking, nextBooking, alreadyConfirmed: false };
    });

    await createAuditLog({
      action: 'BOOKING_PAYMENT_CONFIRMED',
      entityType: 'Booking',
      entityId: booking.id,
      actorId,
      actorName,
      afterJson: {
        description: 'Sales Admin xác nhận giao dịch Booking ' + booking.maLuotBooking + '. Đã tạo lượt booking kế tiếp.',
        nextBookingId: result.nextBooking?.id,
        nextSttBooking: result.nextBooking?.sttBooking,
        tgBatdaukhop: result.nextBooking?.tgBatdaukhop,
        tgKetthuckhopcan: result.nextBooking?.tgKetthuckhopcan
      }
    });

    return NextResponse.json({
      message: result.alreadyConfirmed
        ? 'Booking ' + booking.maLuotBooking + ' đã được xác nhận trước đó.'
        : 'Đã xác nhận giao dịch Booking ' + booking.maLuotBooking + '. Đã tạo lượt booking #' + result.nextBooking?.sttBooking + ' nối tiếp.',
      data: result
    });

    /*
    // Tính toán thời gian khớp căn dựa trên lượt cuối cùng đã được lên lịch
    let startMatch = booking.tgBatdaukhop ? new Date(booking.tgBatdaukhop) : null;

    // Nếu chưa có thời gian khớp căn (hoặc thời gian không hợp lệ), lấy thời điểm kết thúc của lượt gần nhất
    if (!startMatch || isNaN(startMatch.getTime())) {
      const lastBooking = await db.booking.findFirst({
        where: {
          projectId: booking.projectId,
          id: { not: bookingId },
          tgKetthuckhopcan: { not: null }
        },
        orderBy: { tgKetthuckhopcan: 'desc' }
      });

      if (lastBooking && lastBooking.tgKetthuckhopcan) {
        startMatch = new Date(lastBooking.tgKetthuckhopcan);
      } else {
        startMatch = projectLaunchTime;
      }
    }

    const endMatch = new Date(startMatch.getTime() + 10 * 60 * 1000);

    const updatedBooking = await db.booking.update({
      where: { id: bookingId },
      data: {
        trangthaikhopcan: 'CHO_KHOP',
        tgBatdaukhop: startMatch,
        tgKetthuckhopcan: endMatch,
        notes: booking.notes ? `${booking.notes} | ${notes}` : notes
      },
      include: {
        project: true,
        salesEmployee: true
      }
    });

    await createAuditLog({
      action: 'BOOKING_PAYMENT_CONFIRMED',
      entityType: 'Booking',
      entityId: booking.id,
      actorId,
      actorName,
      afterJson: {
        description: `Sales Admin xác nhận thanh toán cọc Booking ${booking.maLuotBooking}. Đã xếp lịch khớp căn.`,
        maLuotBooking: booking.maLuotBooking,
        depositAmount: booking.depositAmount,
        tgBatdaukhop: startMatch,
        tgKetthuckhopcan: endMatch
      }
    });

    return NextResponse.json({
      message: `Đã xác nhận thanh toán cọc cho Booking ${booking.maLuotBooking}! Lượt khớp căn đã được xếp lịch từ ${startMatch.toLocaleString()}.`,
      data: updatedBooking
    });
    */
  } catch (error: any) {
    console.error('Error approving booking deposit:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
