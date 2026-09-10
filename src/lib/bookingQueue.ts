export const BOOKING_TURN_MINUTES = 10;

function validDate(value: Date | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function calculateNextBookingWindow(
  previousEnd: Date | null | undefined,
  projectLaunchTime: Date | null | undefined
): { start: Date; end: Date } {
  const start = validDate(previousEnd) || validDate(projectLaunchTime);
  if (!start) {
    throw new Error('BOOKING_SCHEDULE_MISSING: previous end or project launch time is required');
  }

  const end = new Date(start.getTime() + BOOKING_TURN_MINUTES * 60 * 1000);
  return { start, end };
}

export function canConfirmBookingTransaction(
  status: string | null | undefined,
  depositConfirmedAt: Date | null | undefined
): boolean {
  return status === 'CHO_DUYET_COC' && !depositConfirmedAt;
}

export function createFollowUpBookingDraft({
  projectId,
  salesEmployeeId,
  projectCode,
  nextStt,
  previousEnd,
  projectLaunchTime
}: {
  projectId: string;
  salesEmployeeId: string;
  projectCode: string;
  nextStt: number;
  previousEnd?: Date | null;
  projectLaunchTime?: Date | null;
}) {
  const { start, end } = calculateNextBookingWindow(previousEnd, projectLaunchTime);
  const bookingCode = 'BK-' + projectCode + '-' + String(nextStt).padStart(4, '0');
  return {
    maLuotBooking: bookingCode,
    projectId,
    salesEmployeeId,
    sttBooking: nextStt,
    tgBooking: new Date(),
    tgBatdaukhop: start,
    tgKetthuckhopcan: end,
    trangthaikhopcan: 'CHO_KHOP',
    customerName: null,
    customerPhone: null,
    depositAmount: null,
    notes: 'Lượt khớp căn tiếp theo được tạo sau khi xác nhận giao dịch'
  };
}
