import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';

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

    const booking = await db.booking.findUnique({
      where: { id: bookingId },
      include: { project: true, salesEmployee: true }
    });

    if (!booking) {
      return NextResponse.json({ error: 'Không tìm thấy lượt booking' }, { status: 404 });
    }

    const now = new Date();
    // Khung giờ khớp căn: 10 phút đếm ngược
    const startMatch = now;
    const endMatch = new Date(now.getTime() + 10 * 60 * 1000);

    const updatedBooking = await db.booking.update({
      where: { id: bookingId },
      data: {
        trangthaikhopcan: 'DANG_KHOP', // Kích hoạt thời gian khớp căn 10 phút
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
        description: `Sales Admin xác nhận thanh toán cọc Booking ${booking.maLuotBooking}. Kích hoạt 10 phút khớp căn.`,
        maLuotBooking: booking.maLuotBooking,
        depositAmount: booking.depositAmount,
        tgBatdaukhop: startMatch,
        tgKetthuckhopcan: endMatch
      }
    });

    return NextResponse.json({
      message: `Đã xác nhận thanh toán cọc cho Booking ${booking.maLuotBooking}! Khung giờ khớp căn (10 phút) đã được kích hoạt.`,
      data: updatedBooking
    });
  } catch (error: any) {
    console.error('Error approving booking deposit:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
