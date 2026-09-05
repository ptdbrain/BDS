import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { resolveEmployeeId } from '@/lib/employeeHelper';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const contract = await db.contract.findUnique({
      where: { id: params.id },
      include: {
        product: { include: { project: true } },
        customer: true,
        salesEmployee: true,
        paymentPlan: true,
        reviews: { orderBy: { createdAt: 'desc' } }
      }
    });

    if (!contract) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    return NextResponse.json({ data: contract });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const {
      // Contract fields
      investorContractNo,
      signedDate,
      signingStatus,
      dealRevenue,
      commissionStatus,
      commissionDueDate,
      commissionAmount,
      investorNotes,
      status,
      // HopDong class diagram fields
      maHopdong,
      maKH,
      hotenKH,
      sodienthoaiKH,
      cccdKH,
      emailKH,
      diachiKH,
      phuonganthanhtoan,
      giahopdong,
      doanhso,
      hoahong,
      trangthaiThanhtoan,
      ghichu,
      salesEmployeeId,
      actorId = 'emp_sales_01',
      actorName = 'Nhân viên kinh doanh'
    } = body;

    const existing = await db.contract.findUnique({
      where: { id: params.id },
      include: { customer: true }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Không tìm thấy hợp đồng' }, { status: 404 });
    }

    const dataToUpdate: any = {};
    if (maHopdong !== undefined) dataToUpdate.maHopdong = maHopdong;
    if (maKH !== undefined) dataToUpdate.maKH = maKH;
    if (hotenKH !== undefined) dataToUpdate.hotenKH = hotenKH;
    if (sodienthoaiKH !== undefined) dataToUpdate.sodienthoaiKH = sodienthoaiKH;
    if (cccdKH !== undefined) dataToUpdate.cccdKH = cccdKH;
    if (emailKH !== undefined) dataToUpdate.emailKH = emailKH;
    if (diachiKH !== undefined) dataToUpdate.diachiKH = diachiKH;
    if (phuonganthanhtoan !== undefined) dataToUpdate.phuonganthanhtoan = phuonganthanhtoan;

    if (giahopdong !== undefined) {
      const numPrice = parseFloat(String(giahopdong));
      dataToUpdate.giahopdong = numPrice;
      dataToUpdate.agreedPrice = numPrice;
      dataToUpdate.dealRevenue = numPrice;
      dataToUpdate.doanhso = numPrice;
    } else if (dealRevenue !== undefined) {
      const numRevenue = parseFloat(String(dealRevenue));
      dataToUpdate.dealRevenue = numRevenue;
      dataToUpdate.giahopdong = numRevenue;
      dataToUpdate.doanhso = numRevenue;
    }

    if (hoahong !== undefined) {
      const numComm = parseFloat(String(hoahong));
      dataToUpdate.hoahong = numComm;
      dataToUpdate.commissionAmount = numComm;
    } else if (commissionAmount !== undefined) {
      const numComm = parseFloat(String(commissionAmount));
      dataToUpdate.commissionAmount = numComm;
      dataToUpdate.hoahong = numComm;
    }

    if (trangthaiThanhtoan !== undefined) {
      dataToUpdate.trangthaiThanhtoan = trangthaiThanhtoan;
      dataToUpdate.commissionStatus = trangthaiThanhtoan;
    } else if (commissionStatus !== undefined) {
      dataToUpdate.commissionStatus = commissionStatus;
      dataToUpdate.trangthaiThanhtoan = commissionStatus;
    }

    if (ghichu !== undefined) {
      dataToUpdate.ghichu = ghichu;
      dataToUpdate.investorNotes = ghichu;
    } else if (investorNotes !== undefined) {
      dataToUpdate.investorNotes = investorNotes;
      dataToUpdate.ghichu = investorNotes;
    }

    if (investorContractNo !== undefined) dataToUpdate.investorContractNo = investorContractNo;
    if (commissionDueDate !== undefined) dataToUpdate.commissionDueDate = commissionDueDate;
    if (salesEmployeeId !== undefined) {
      dataToUpdate.salesEmployeeId = await resolveEmployeeId(salesEmployeeId, 'SALES');
    }

    if (signedDate !== undefined) {
      dataToUpdate.signedDate = signedDate ? new Date(signedDate) : null;
      dataToUpdate.thoigiankiHDMB = signedDate ? new Date(signedDate) : null;
    }

    if (signingStatus !== undefined) {
      dataToUpdate.signingStatus = signingStatus;
      dataToUpdate.trangthaiHDMB = signingStatus;
    }

    if (status !== undefined) {
      dataToUpdate.status = status;
    }

    // If signingStatus is DA_KY, ensure status is SIGNED and signedAt is set
    if (signingStatus === 'DA_KY' || status === 'SIGNED') {
      dataToUpdate.status = 'SIGNED';
      dataToUpdate.signingStatus = 'DA_KY';
      dataToUpdate.trangthaiHDMB = 'Đã ký';
      dataToUpdate.signedAt = signedDate ? new Date(signedDate) : new Date();
    }

    // Update Customer details if provided
    if (existing.customerId && (hotenKH || sodienthoaiKH || cccdKH || emailKH || diachiKH || status === 'PENDING_REVIEW')) {
      const customerUpdateData: any = {
        fullName: hotenKH || existing.customer?.fullName,
        phone: sodienthoaiKH || existing.customer?.phone,
        email: emailKH || existing.customer?.email,
        cccdHash: cccdKH || existing.customer?.cccdHash,
        cccdCiphertext: cccdKH ? `ENC_${cccdKH}` : existing.customer?.cccdCiphertext,
        addressCiphertext: diachiKH || existing.customer?.addressCiphertext
      };
      if (status === 'PENDING_REVIEW') {
        customerUpdateData.verificationStatus = 'PENDING_VERIFICATION';
      }
      await db.customer.update({
        where: { id: existing.customerId },
        data: customerUpdateData
      }).catch(err => console.error('Error updating customer record:', err));

      if (status === 'PENDING_REVIEW') {
        const pendingVer = await db.customerVerification.findFirst({
          where: { customerId: existing.customerId, status: 'PENDING' }
        });
        const submitterId = dataToUpdate.salesEmployeeId || existing.salesEmployeeId;
        if (!pendingVer) {
          await db.customerVerification.create({
            data: {
              customerId: existing.customerId,
              submittedById: submitterId,
              status: 'PENDING',
              notes: `Hồ sơ hợp đồng chờ Sales Admin duyệt`
            }
          }).catch(err => console.error('Error creating CustomerVerification:', err));
        }
      }
    }

    const updated = await db.contract.update({
      where: { id: params.id },
      data: dataToUpdate,
      include: {
        product: { include: { project: true } },
        customer: true,
        salesEmployee: true,
        paymentPlan: true
      }
    });

    // If signed, ensure product is SOLD
    if (updated.status === 'SIGNED' || updated.signingStatus === 'DA_KY') {
      await db.product.update({
        where: { id: updated.productId },
        data: {
          status: 'SOLD',
          trangthai: 'Đã bán'
        }
      });
    }

    await createAuditLog({
      actorId,
      actorName,
      action: 'UPDATE_CONTRACT_INFO',
      entityType: 'CONTRACT',
      entityId: params.id,
      afterJson: dataToUpdate
    });

    return NextResponse.json({
      message: 'Cập nhật thông tin hợp đồng thành công!',
      data: updated
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  return PATCH(request, { params });
}
