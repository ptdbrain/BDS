import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== SYNCING CLASS DIAGRAM FIELDS IN DATABASE ===');

  // 1. Chudautu (Investor)
  const investors = await prisma.investor.findMany();
  for (let i = 0; i < investors.length; i++) {
    const inv = investors[i];
    await prisma.investor.update({
      where: { id: inv.id },
      data: {
        maCDT: i + 1,
        tenCDT: inv.name
      }
    });
  }
  console.log(`✓ Synced ${investors.length} Chudautu records`);

  // 2. Duan (Project)
  const projects = await prisma.project.findMany();
  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    await prisma.project.update({
      where: { id: p.id },
      data: {
        maDA: i + 1,
        tenDA: p.name,
        trangthaiDA: p.status,
        diadiem: p.location
      }
    });
  }
  console.log(`✓ Synced ${projects.length} Duan records`);

  // 3. Loaisanpham (ProductType)
  const types = await prisma.productType.findMany();
  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    await prisma.productType.update({
      where: { id: t.id },
      data: {
        maLoaisanpham: i + 1,
        loaiSanpham: t.name
      }
    });
  }
  console.log(`✓ Synced ${types.length} Loaisanpham records`);

  // 4. Phongban (Department)
  const depts = await prisma.department.findMany();
  for (let i = 0; i < depts.length; i++) {
    const d = depts[i];
    await prisma.department.update({
      where: { id: d.id },
      data: {
        maPhongban: i + 1,
        tenphongban: d.name
      }
    });
  }
  console.log(`✓ Synced ${depts.length} Phongban records`);

  // 5. Nhanvien (Employee)
  const employees = await prisma.employee.findMany();
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    await prisma.employee.update({
      where: { id: emp.id },
      data: {
        maNV: 100 + i + 1,
        chucvu: emp.jobTitle,
        sodienthoaiNV: emp.phone,
        hotenNV: emp.fullName
      }
    });
  }
  console.log(`✓ Synced ${employees.length} Nhanvien records`);

  // 6. Sanpham (Product)
  const products = await prisma.product.findMany({
    include: { prices: true }
  });
  for (let i = 0; i < products.length; i++) {
    const prod = products[i];
    const basePrice = prod.prices[0]?.amount || 4800000000;
    const giaTTS = Math.round(basePrice * 0.90);
    const giaTTC = basePrice;
    const giaVay = Math.round(basePrice * 1.02);

    await prisma.product.update({
      where: { id: prod.id },
      data: {
        maCan: prod.productCode,
        dientich: prod.area,
        huong: prod.direction,
        gianiemyet: basePrice,
        giaTTS: giaTTS,
        giaTTC: giaTTC,
        giaVay: giaVay,
        trangthai: prod.status
      }
    });
  }
  console.log(`✓ Synced ${products.length} Sanpham records with 4 pricing tiers`);

  // 7. Hopdong (Contract)
  const contracts = await prisma.contract.findMany({
    include: {
      customer: true,
      product: true,
      paymentPlan: true
    }
  });
  for (let i = 0; i < contracts.length; i++) {
    const ct = contracts[i];
    const revenue = ct.dealRevenue || ct.agreedPrice || 4800000000;
    const commission = ct.commissionAmount || Math.round(revenue * 0.03);

    await prisma.contract.update({
      where: { id: ct.id },
      data: {
        maHopdong: 202600 + i + 1,
        maKH: 1000 + i + 1,
        sodienthoaiKH: ct.customer?.phone || '0988888888',
        cccdKH: ct.customer?.cccdHash || '001200009999',
        emailKH: ct.customer?.email || 'khachhang@gmail.com',
        diachiKH: ct.customer?.addressCiphertext || 'Hà Nội',
        hotenKH: ct.customer?.fullName || 'Nguyễn Văn Khách',
        phuonganthanhtoan: ct.paymentPlan?.name || 'Thanh toán chuẩn theo tiến độ',
        giahopdong: revenue,
        thoigiankiHDMB: ct.signedDate || ct.signedAt || new Date(),
        trangthaiHDMB: ct.signingStatus || (ct.status === 'SIGNED' ? 'DA_KY' : 'CHUA_KY'),
        doanhso: revenue,
        hoahong: commission,
        trangthaiThanhtoan: ct.commissionStatus || 'DU_KIEN_TRA',
        ghichu: ct.investorNotes || 'Hợp đồng mua bán chính thức từ CĐT'
      }
    });
  }
  console.log(`✓ Synced ${contracts.length} Hopdong records`);

  // 8. Booking records
  const existingBookings = await prisma.booking.count();
  if (existingBookings === 0 && projects.length > 0) {
    const defaultEmp = employees[0] || await prisma.employee.findFirst();
    const mockCustomers = [
      { name: 'Hoàng Minh Tuấn', phone: '0912345678', notes: 'Nguyện vọng căn góc 3PN ban công Đông Nam tầng đẹp' },
      { name: 'Lê Thu Hương', phone: '0987654321', notes: 'Nguyện vọng căn 2PN view hồ cảnh quan VICC' },
      { name: 'Vũ Quốc Anh', phone: '0903112233', notes: 'Ưu tiên căn 1PN+ đầu tư cho thuê' },
      { name: 'Đặng Ngọc Mai', phone: '0936778899', notes: 'Căn Shophouse tầng 1 mặt đường lớn' },
      { name: 'Phạm Hải Đăng', phone: '0979888999', notes: 'Suất ngoại giao căn Penthouse tầng 25' }
    ];

    for (const proj of projects) {
      for (let j = 0; j < mockCustomers.length; j++) {
        const mc = mockCustomers[j];
        const stt = j + 1;
        const now = new Date();
        const startMatch = new Date(now.getTime() + (j * 2 + 1) * 24 * 60 * 60 * 1000);
        const endMatch = new Date(startMatch.getTime() + 3 * 24 * 60 * 60 * 1000);
        const status = j === 0 ? 'DA_KHOP' : 'CHO_KHOP';

        await prisma.booking.create({
          data: {
            maLuotBooking: `BK-${proj.code}-${String(stt).padStart(4, '0')}`,
            projectId: proj.id,
            salesEmployeeId: defaultEmp.id,
            sttBooking: stt,
            tgBooking: new Date(now.getTime() - (5 - j) * 3600 * 1000),
            tgBatdaukhop: startMatch,
            tgKetthuckhopcan: endMatch,
            trangthaikhopcan: status,
            customerName: mc.name,
            customerPhone: mc.phone,
            depositAmount: 50000000,
            notes: mc.notes
          }
        });
      }
    }
    console.log(`✓ Seeded sample Bookings for all ${projects.length} projects`);
  }

  console.log('=== SYNC FINISHED SUCCESSFULLY ===');
}

main()
  .catch((e) => {
    console.error('Sync failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
