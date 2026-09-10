import { db } from '@/lib/db';
import { resolveEmployeeId } from '@/lib/employeeHelper';

/**
 * Ensures that a booking exists in the local database (supporting Vercel serverless multi-containers).
 * If the booking record is missing, it creates the booking along with customer data and returns it.
 */
export async function ensureBookingExists(bookingData: any, projectData?: any) {
  if (!bookingData) return null;

  const targetId = bookingData.id;
  const targetCode = bookingData.maLuotBooking;

  // 1. Check if booking already exists
  if (targetId) {
    const existing = await db.booking.findUnique({
      where: { id: targetId },
      include: { project: true, salesEmployee: true }
    });
    if (existing) return existing;
  }

  if (targetCode) {
    const existingByCode = await db.booking.findUnique({
      where: { maLuotBooking: targetCode },
      include: { project: true, salesEmployee: true }
    });
    if (existingByCode) return existingByCode;
  }

  // 2. Resolve Project
  let project = null;
  const targetProjectId = bookingData.projectId || projectData?.id;
  if (targetProjectId) {
    project = await db.project.findUnique({ where: { id: targetProjectId } });
    if (!project) {
      project = await db.project.findFirst({
        where: {
          OR: [
            { code: targetProjectId },
            { id: targetProjectId }
          ]
        }
      });
    }
  }

  if (!project && (projectData?.code || projectData?.name)) {
    project = await db.project.findFirst({
      where: {
        OR: [
          ...(projectData.code ? [{ code: projectData.code }] : []),
          ...(projectData.name ? [{ name: projectData.name }] : [])
        ]
      }
    });
  }

  if (!project) {
    project = await db.project.findFirst();
  }

  if (!project) {
    console.warn('[ensureBookingExists] No project found in database.');
    return null;
  }

  // 3. Resolve Sales Employee
  const validSalesId = await resolveEmployeeId(bookingData.salesEmployeeId, 'SALES');

  // 4. Determine STT & Code
  let stt = bookingData.sttBooking;
  if (!stt) {
    const lastBooking = await db.booking.findFirst({
      where: { projectId: project.id },
      orderBy: { sttBooking: 'desc' }
    });
    stt = (lastBooking?.sttBooking || 0) + 1;
  }

  let finalCode = targetCode || `BK-${project.code || 'PRJ'}-${String(stt).padStart(4, '0')}`;
  // Ensure uniqueness
  let collisionCheck = await db.booking.findUnique({ where: { maLuotBooking: finalCode } });
  while (collisionCheck && collisionCheck.id !== targetId) {
    stt += 1;
    finalCode = `BK-${project.code || 'PRJ'}-${String(stt).padStart(4, '0')}`;
    collisionCheck = await db.booking.findUnique({ where: { maLuotBooking: finalCode } });
  }

  // 5. Ensure Customer record exists in Customer table
  const custName = bookingData.customerName || 'Khách Hàng Ưu Tiên';
  const custPhone = bookingData.customerPhone || '0988888888';
  if (custPhone) {
    let customer = await db.customer.findFirst({ where: { phone: custPhone } });
    if (!customer) {
      await db.customer.create({
        data: {
          fullName: custName,
          phone: custPhone,
          email: bookingData.customerEmail || `${custPhone}@gmail.com`,
          cccdCiphertext: bookingData.customerCccd ? `ENC_${bookingData.customerCccd}` : 'ENC_00120000450',
          cccdHash: bookingData.customerCccd ? `HASH_${bookingData.customerCccd}` : custPhone,
          addressCiphertext: bookingData.customerAddress || 'Hà Nội',
          verificationStatus: 'DRAFT'
        }
      }).catch(err => console.warn('[ensureBookingExists] Could not create Customer record:', err));
    }
  }

  // 6. Calculate matching windows
  const now = new Date();
  const projectLaunchTime = project.saleOpenAt ? new Date(project.saleOpenAt) : new Date(2026, 8, 11, 14, 0, 0);
  const startMatch = bookingData.tgBatdaukhop
    ? new Date(bookingData.tgBatdaukhop)
    : new Date(projectLaunchTime.getTime() + (stt - 1) * 10 * 60 * 1000);
  const endMatch = bookingData.tgKetthuckhopcan
    ? new Date(bookingData.tgKetthuckhopcan)
    : new Date(startMatch.getTime() + 10 * 60 * 1000);

  // 7. Create the booking
  try {
    const created = await db.booking.create({
      data: {
        ...(targetId ? { id: targetId } : {}),
        maLuotBooking: finalCode,
        projectId: project.id,
        salesEmployeeId: validSalesId,
        sttBooking: stt,
        tgBooking: bookingData.tgBooking ? new Date(bookingData.tgBooking) : now,
        tgBatdaukhop: startMatch,
        tgKetthuckhopcan: endMatch,
        trangthaikhopcan: bookingData.trangthaikhopcan || 'CHO_KHOP',
        customerName: custName,
        customerPhone: custPhone,
        depositAmount: parseFloat(String(bookingData.depositAmount || 50000000)),
        notes: bookingData.notes || `Khớp căn 10 phút (STT #${stt})`
      },
      include: {
        project: true,
        salesEmployee: true
      }
    });
    return created;
  } catch (err: any) {
    console.error('[ensureBookingExists] Error creating booking:', err);
    return await db.booking.findFirst({
      where: {
        OR: [
          ...(targetId ? [{ id: targetId }] : []),
          { maLuotBooking: finalCode }
        ]
      },
      include: { project: true, salesEmployee: true }
    });
  }
}
