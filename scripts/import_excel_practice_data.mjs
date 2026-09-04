import { PrismaClient } from '@prisma/client';
import XLSX from 'xlsx';
import path from 'path';

const prisma = new PrismaClient();

function parseExcelDate(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') {
    // Excel base date is Dec 30 1899 due to 1900 leap bug
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseBuildingAndFloor(maCan) {
  if (maCan.includes('.')) {
    const parts = maCan.split('.');
    const bldg = 'Tòa ' + parts[0];
    const numPart = parts[1].replace(/[^\d]/g, '');
    let floor = 1;
    if (numPart.length >= 4) {
      floor = parseInt(numPart.slice(0, 2), 10);
    } else if (numPart.length > 0) {
      floor = parseInt(numPart.slice(0, 1), 10);
    }
    return { building: bldg, floor: floor || 1 };
  }
  if (maCan.startsWith('TT')) {
    const parts = maCan.split('-');
    return { building: 'Dãy ' + parts[0], floor: 1 };
  }
  if (maCan.startsWith('HH-')) {
    const parts = maCan.split('-');
    const bldg = 'Tòa ' + parts[0] + '-' + parts[1];
    const floor = parseInt(parts[2], 10) || 1;
    return { building: bldg, floor };
  }
  if (maCan.includes('-')) {
    const parts = maCan.split('-');
    const bldg = 'Tòa ' + parts[0];
    const floor = parseInt(parts[1], 10) || 1;
    return { building: bldg, floor };
  }
  return { building: 'Tòa Tháp A', floor: 1 };
}

// Presentation Slide Decks for Projects
const slidesVistaVanLa = [
  {
    id: 'vl-1',
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85',
    title: '01. Giới Thiệu Dự Án The Vista Văn La (215 Oasis Villas)',
    caption: 'Kiệt tác quy hoạch Xanh bền vững - Urban Green Oasis, ốc đảo xanh tâm phố Hà Đông.',
    category: '01 TỔNG QUAN DỰ ÁN'
  },
  {
    id: 'vl-2',
    url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1600&q=85',
    title: '02. Vị Trí Vàng Tâm Điểm Hà Đông & Tuyến Metro',
    caption: 'Khu đô thị Văn La, kết nối trực tiếp ga đường sắt trên cao Cát Linh - Hà Đông và đường vành đai.',
    category: '02 LIÊN KẾT VÙNG'
  },
  {
    id: 'vl-3',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=85',
    title: '03. Hệ Thống Tiện Ích Xanh Ốc Đảo & Clubhouse VICC',
    caption: 'Công viên xanh 5.000m², hồ cảnh quan điều hòa, bể bơi resort và văn phòng VICC An Khánh.',
    category: '03 HỆ THỐNG TIỆN ÍCH'
  },
  {
    id: 'vl-4',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
    title: '04. Bộ Sưu Tập 215 Căn Biệt Thự Oasis Villas & Liền Kề',
    caption: 'Biệt thự đơn lập, song lập và shophouse kinh doanh thiết kế tân cổ điển sang trọng.',
    category: '04 SẢN PHẨM BIỆT THỰ'
  },
  {
    id: 'vl-5',
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85',
    title: '05. Định Hướng Danh Mục Bàn Giao Cao Cấp SJ Group',
    caption: 'Hoàn thiện ngoại thất đồng bộ, vật liệu chuẩn quốc tế, kiểm soát an ninh đa lớp 24/7.',
    category: '05 ĐỊNH HƯỚNG BÀN GIAO'
  }
];

const slidesLeParcPlace = [
  {
    id: 'lp-1',
    url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=85',
    title: '01. Le Parc Place ParkCity Hanoi - Chạm Ngàn Sắc Xanh',
    caption: 'Định danh vị thế, chạm ngàn sắc xanh - Phân phối & phát triển kinh doanh bởi AHS Property.',
    category: '01 TỔNG QUAN DỰ ÁN'
  },
  {
    id: 'lp-2',
    url: 'https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1600&q=85',
    title: '02. Tọa Độ Kim Cương Mặt Đường Lê Trọng Tấn',
    caption: 'Nằm trọn trong KĐT ParkCity Hanoi đẳng cấp, liên kết đại lộ Tố Hữu và trung tâm thương mại The Linc.',
    category: '02 VỊ TRÍ & KẾT NỐI'
  },
  {
    id: 'lp-3',
    url: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1600&q=85',
    title: '03. Đặc Quyền Tiện Ích Công Viên Sinh Thái & Club House 5 Sao',
    caption: 'Bể bơi vô cực, sân tennis, phòng tiệc VIP và rừng nhiệt đới nội khu quy mô bậc nhất Hà Nội.',
    category: '03 TIỆN ÍCH ĐẲNG CẤP'
  },
  {
    id: 'lp-4',
    url: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1600&q=85',
    title: '04. Căn Hộ Nghỉ Dưỡng Panorama Ngập Tràn Ánh Sáng',
    caption: 'Ban công kính rộng mở 100% hướng công viên, sàn gỗ tự nhiên và gói nội thất cao cấp.',
    category: '04 CĂN HỘ MẪU'
  },
  {
    id: 'lp-5',
    url: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=1600&q=85',
    title: '05. Mặt Bằng Tầng Điển Hình & Tổ Hợp Shophouse',
    caption: 'Mật độ xây dựng thấp 23%, sảnh thang máy thông minh và lối dạo bộ liên tòa.',
    category: '05 MẶT BẰNG & THIẾT KẾ'
  }
];

const slidesHanoiSeasons = [
  {
    id: 'hs-1',
    url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=85',
    title: '01. LUMIÈRE Hanoi Seasons Garden - Giao Cảm Đô Thị',
    caption: 'Kiến tạo bản sắc giao cảm đô thị giữa liên hoàn giá trị sống - Bộ sưu tập Masterise Homes.',
    category: '01 TỔNG QUAN KIẾN TRÚC'
  },
  {
    id: 'hs-2',
    url: 'https://images.unsplash.com/photo-1519999482648-25049ddd37b1?auto=format&fit=crop&w=1600&q=85',
    title: '02. Vị Thế Trọng Điểm Kết Nối Phía Tây Thủ Đô',
    caption: 'Tọa lạc tâm điểm quần thể Smart City, ôm trọn đại lộ Thăng Long và các ga Metro chiến lược.',
    category: '02 VỊ THẾ & LIÊN KẾT'
  },
  {
    id: 'hs-3',
    url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1600&q=85',
    title: '03. Vườn Cảnh Quan Bốn Mùa - Seasons Garden Retreat',
    caption: 'Hệ sinh thái cảnh quan lấy cảm hứng từ 4 mùa thiên nhiên, suối khoáng trị liệu và vườn thiền.',
    category: '03 CẢNH QUAN BỐN MÙA'
  },
  {
    id: 'hs-4',
    url: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1600&q=85',
    title: '04. Căn Hộ Hàng Hiệu Chuẩn Quốc Tế Masterise',
    caption: 'Kính chạm trần Low-E cách âm cách nhiệt, thiết bị vệ sinh Kohler cao cấp và bếp thông minh.',
    category: '04 TIÊU CHUẨN BÀN GIAO'
  },
  {
    id: 'hs-5',
    url: 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?auto=format&fit=crop&w=1600&q=85',
    title: '05. Bảng Giữ Chỗ / Booking Ưu Tiên Dự Án Đợt 1',
    caption: 'Dự án đang trong giai đoạn tiếp nhận Booking ưu tiên đợt 1 với chính sách chiết khấu độc quyền.',
    category: '05 BẢNG BOOKING'
  }
];

const slidesGrandCoast = [
  {
    id: 'mgc-1',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=85',
    title: '01. Masteri Grand Coast - Dấu Ấn Masteri Collection',
    caption: 'Dấu ấn kết tinh hành trình Masteri Collection tại Hồ tạo sóng lớn nhất Ocean City.',
    category: '01 BIỂN HỒ TẠO SÓNG'
  },
  {
    id: 'mgc-2',
    url: 'https://images.unsplash.com/photo-1512915922686-57c11dde9b6b?auto=format&fit=crop&w=1600&q=85',
    title: '02. Tâm Điểm Ocean City - Kinh Đô Ánh Sáng Phồn Hoa',
    caption: 'Tọa độ đắt giá cạnh Grand World, công viên sóng Wave Park và quảng trường Kinh Đô Ánh Sáng.',
    category: '02 TÂM ĐIỂM OCEAN CITY'
  },
  {
    id: 'mgc-3',
    url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=85',
    title: '03. Chuỗi Tiện Ích Biển Nghỉ Dưỡng Nhiệt Đới Độc Bản',
    caption: 'Bể bơi tầng thượng vô cực ngắm hoàng hôn, bãi cát trắng mịn, bể sục Jacuzzi và Sky Lounge.',
    category: '03 TIỆN ÍCH BIỂN NHIỆT ĐỚI'
  },
  {
    id: 'mgc-4',
    url: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=1600&q=85',
    title: '04. Căn Hộ View Biển Hồ Tuyệt Mỹ',
    caption: 'Tầm nhìn bao trọn mặt biển xanh ngắt, thiết kế mở tối ưu ánh sáng và gió biển tự nhiên.',
    category: '04 CĂN HỘ VIEW BIỂN'
  },
  {
    id: 'mgc-5',
    url: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1600&q=85',
    title: '05. Mặt Bằng Tháp Căn Hộ Resort & Tiến Độ Bàn Giao',
    caption: 'Cơ cấu đa dạng từ Studio đến 3PN, pháp lý hoàn chỉnh, tiến độ thi công vượt trội.',
    category: '05 MẶT BẰNG THÁP'
  }
];

const slidesMaisonPrivee = [
  {
    id: 'mp-1',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
    title: '01. Maison Privée Ciputra Tây Hồ - Đẳng Cấp Thượng Lưu',
    caption: 'Dinh thự hàng hiệu giới hạn phát triển bởi CapitaLand Development tại KĐT Ciputra.',
    category: '01 TỔNG QUAN DINH THỰ'
  },
  {
    id: 'mp-2',
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85',
    title: '02. Tọa Độ Độc Tôn Ciputra - Hồ Tây & Sông Hồng',
    caption: 'Vị trí phong thủy vượng khí, kết nối sân bay Nội Bài và trung tâm chính trị Ba Đình.',
    category: '02 TỌA ĐỘ VÀNG'
  },
  {
    id: 'mp-3',
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85',
    title: '03. Đặc Quyền Riêng Tư & An Ninh Đa Tầng 24/7',
    caption: 'Hệ thống hầm xe chuyên dụng, sảnh đón VIP và dịch vụ quản gia quốc tế.',
    category: '03 ĐẶC QUYỀN VIP'
  }
];

function getProjectSlides(maDA) {
  switch (maDA) {
    case 'DA001':
    case 'DA002':
      return JSON.stringify(slidesVistaVanLa);
    case 'DA003':
      return JSON.stringify(slidesHanoiSeasons);
    case 'DA004':
      return JSON.stringify(slidesGrandCoast);
    case 'DA005':
      return JSON.stringify(slidesLeParcPlace);
    case 'DA006':
      return JSON.stringify(slidesMaisonPrivee);
    default:
      return JSON.stringify(slidesVistaVanLa);
  }
}

async function main() {
  console.log('🚀 Bắt đầu nạp toàn diện CSDL thực hành SQL AHS từ file Excel...');
  const excelPath = path.resolve(process.cwd(), 'scripts/Data_CSDL_AHS_SQL_Practice_MaMoi.xlsx');
  const wb = XLSX.readFile(excelPath);

  // 0. Làm sạch DB cũ
  console.log('🧹 1/9 Xóa dữ liệu cũ theo đúng thứ tự khóa ngoại...');
  await prisma.auditLog.deleteMany();
  await prisma.contractReview.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.customerVerification.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.productLock.deleteMany();
  await prisma.productPrice.deleteMany();
  await prisma.productStatusHistory.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.product.deleteMany();
  await prisma.paymentPlan.deleteMany();
  await prisma.project.deleteMany();
  await prisma.investor.deleteMany();
  await prisma.productType.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();

  // 1. ChuDauTu
  console.log('🏢 2/9 Nạp bảng ChuDauTu...');
  const cdtRows = XLSX.utils.sheet_to_json(wb.Sheets['ChuDauTu']);
  const investorMap = new Map();
  for (const row of cdtRows) {
    const inv = await prisma.investor.create({
      data: {
        code: row.MaCDT,
        name: row.TenCDT,
        maCDT: row.MaCDT,
        tenCDT: row.TenCDT,
        contactInfo: `Chủ đầu tư ${row.TenCDT} - Đối tác phát triển AHS Property`
      }
    });
    investorMap.set(row.MaCDT, inv);
  }
  console.log(`✓ Đã nạp ${cdtRows.length} Chủ đầu tư:`, [...investorMap.keys()]);

  // 2. DuAn
  console.log('🏗️ 3/9 Nạp bảng DuAn & Khởi tạo Slide Thuyết Trình...');
  const daRows = XLSX.utils.sheet_to_json(wb.Sheets['DuAn']);
  const projectMap = new Map();
  const paymentPlanMap = new Map();

  for (const row of daRows) {
    const inv = investorMap.get(row.MaCDT);
    if (!inv) throw new Error(`Không tìm thấy MaCDT ${row.MaCDT} cho dự án ${row.MaDA}`);

    const isSelling = row.TrangThaiDA === 'Đang mở bán';
    const proj = await prisma.project.create({
      data: {
        code: row.MaDA,
        name: row.TenDA,
        location: row.DiaDiem,
        investorId: inv.id,
        status: isSelling ? 'SELLING' : 'UPCOMING',
        lockDurationMinutes: 30,
        imagesJson: getProjectSlides(row.MaDA),
        // Class diagram fields
        maDA: row.MaDA,
        tenDA: row.TenDA,
        trangthaiDA: row.TrangThaiDA,
        diadiem: row.DiaDiem
      }
    });
    projectMap.set(row.MaDA, proj);

    // Tạo Phương Án Thanh Toán chuẩn cho dự án
    const plan = await prisma.paymentPlan.create({
      data: {
        projectId: proj.id,
        code: `PLAN-${row.MaDA}-STD`,
        name: 'Thanh toán chuẩn theo tiến độ CĐT'
      }
    });
    paymentPlanMap.set(row.MaDA, plan);
  }
  console.log(`✓ Đã nạp ${daRows.length} Dự án:`, [...projectMap.keys()]);

  // 3. LoaiSanPham
  console.log('🏷️ 4/9 Nạp bảng LoaiSanPham...');
  const lspRows = XLSX.utils.sheet_to_json(wb.Sheets['LoaiSanPham']);
  const productTypeMap = new Map();
  for (const row of lspRows) {
    const pt = await prisma.productType.create({
      data: {
        code: row.MaLoaisanpham,
        name: row.LoaiSanpham,
        maLoaisanpham: row.MaLoaisanpham,
        loaiSanpham: row.LoaiSanpham
      }
    });
    productTypeMap.set(row.MaLoaisanpham, pt);
  }
  console.log(`✓ Đã nạp ${lspRows.length} Loại sản phẩm:`, [...productTypeMap.keys()]);

  // 4. PhongBan
  console.log('🏛️ 5/9 Nạp bảng PhongBan...');
  const pbRows = XLSX.utils.sheet_to_json(wb.Sheets['PhongBan']);
  const departmentMap = new Map();
  for (const row of pbRows) {
    const dept = await prisma.department.create({
      data: {
        code: row.MaPhongban,
        name: row.TenPhongban,
        maPhongban: row.MaPhongban,
        tenphongban: row.TenPhongban
      }
    });
    departmentMap.set(row.MaPhongban, dept);
  }
  console.log(`✓ Đã nạp ${pbRows.length} Phòng ban:`, [...departmentMap.keys()]);

  // 5. NhanVien
  console.log('👥 6/9 Nạp bảng NhanVien...');
  const nvRows = XLSX.utils.sheet_to_json(wb.Sheets['NhanVien']);
  const employeeMap = new Map();
  for (const row of nvRows) {
    const dept = departmentMap.get(row.MaPhongban);
    if (!dept) throw new Error(`Không tìm thấy MaPhongban ${row.MaPhongban} cho nhân viên ${row.MaNV}`);

    const emp = await prisma.employee.create({
      data: {
        employeeCode: row.MaNV,
        fullName: row.HoTenNV,
        phone: row.SoDienThoaiNV,
        email: `${row.MaNV.toLowerCase()}@ahs.com.vn`,
        departmentId: dept.id,
        jobTitle: row.ChucVu,
        // Class diagram fields
        maNV: row.MaNV,
        chucvu: row.ChucVu,
        sodienthoaiNV: row.SoDienThoaiNV,
        hotenNV: row.HoTenNV
      }
    });
    employeeMap.set(row.MaNV, emp);
  }
  console.log(`✓ Đã nạp ${nvRows.length} Nhân viên:`, [...employeeMap.keys()]);

  // 6. SanPham (219 căn)
  console.log('🏠 7/9 Nạp bảng SanPham (219 căn hộ & biệt thự)...');
  const spRows = XLSX.utils.sheet_to_json(wb.Sheets['SanPham']);
  const productMap = new Map();

  for (const row of spRows) {
    const proj = projectMap.get(row.MaDA);
    if (!proj) throw new Error(`Không tìm thấy MaDA ${row.MaDA} cho căn ${row.MaCan}`);
    const pType = productTypeMap.get(row.MaLoaisanpham);
    if (!pType) throw new Error(`Không tìm thấy MaLoaisanpham ${row.MaLoaisanpham} cho căn ${row.MaCan}`);
    const plan = paymentPlanMap.get(row.MaDA);

    const { building, floor } = parseBuildingAndFloor(row.MaCan);

    // Xử lý giá an toàn cho các căn chưa điền đủ các cột trong bảng thực hành
    const basePrice = Number(row.GiaNiemYet) || Number(row.GiaTTC) || (Number(row.GiaTTS) ? Math.round(Number(row.GiaTTS) / 0.88) : 0) || Math.round(Number(row.DienTich || 60) * 75000000);
    const numGiaNiemyet = Number(row.GiaNiemYet) || basePrice;
    const numGiaTTS = Number(row.GiaTTS) || Math.round(basePrice * 0.88);
    const numGiaTTC = Number(row.GiaTTC) || basePrice;
    const numGiaVay = Number(row.GiaVay) || Math.round(basePrice * 1.02);

    // Ánh xạ trạng thái hiển thị (Đã cọc = Đã bán theo nghiệp vụ AHS)
    let systemStatus = 'AVAILABLE';
    let systemTrangThai = row.TrangThai;
    if (row.TrangThai === 'Đã khớp') {
      systemStatus = 'LOCKED';
    } else if (row.TrangThai === 'Đã bán') {
      systemStatus = 'SOLD';
      systemTrangThai = 'Đã bán';
    } else if (row.TrangThai === 'CDT thu căn') {
      systemStatus = 'UNAVAILABLE';
      systemTrangThai = 'CDT thu căn';
    } else if (row.TrangThai === 'Check Admin') {
      systemStatus = 'AVAILABLE';
      systemTrangThai = 'Check Admin';
    } else {
      systemStatus = 'AVAILABLE';
    }

    const prod = await prisma.product.create({
      data: {
        projectId: proj.id,
        productTypeId: pType.id,
        productCode: row.MaCan,
        building,
        floor,
        area: Number(row.DienTich) || 60,
        direction: row.Huong || 'Đông Nam',
        handoverPlan: row.MaDA === 'DA002' ? 'Bàn giao thô hoàn thiện mặt ngoài' : 'Hoàn thiện cao cấp chuẩn quốc tế',
        status: systemStatus,
        // Class diagram fields
        maCan: row.MaCan,
        dientich: Number(row.DienTich) || 60,
        huong: row.Huong || 'Đông Nam',
        gianiemyet: numGiaNiemyet,
        giaTTS: numGiaTTS,
        giaTTC: numGiaTTC,
        giaVay: numGiaVay,
        trangthai: systemTrangThai || 'Còn hàng'
      }
    });
    productMap.set(row.MaCan, prod);

    // Nạp giá sản phẩm
    await prisma.productPrice.create({
      data: {
        productId: prod.id,
        paymentPlanId: plan.id,
        amount: numGiaNiemyet,
        depositAmount: 100000000
      }
    });
  }
  console.log(`✓ Đã nạp thành công ${spRows.length} sản phẩm bất động sản.`);

  // 7. Booking (48 lượt)
  console.log('📑 8/9 Nạp bảng Booking (48 lượt booking giữ chỗ)...');
  const bkRows = XLSX.utils.sheet_to_json(wb.Sheets['Booking']);
  for (const row of bkRows) {
    const proj = projectMap.get(row.MaDA);
    if (!proj) continue;
    const emp = employeeMap.get(row.MaNV) || employeeMap.get('NV001');

    await prisma.booking.create({
      data: {
        maLuotBooking: row.MaLuotBooking,
        projectId: proj.id,
        salesEmployeeId: emp.id,
        sttBooking: Number(row.STTBooking),
        tgBooking: parseExcelDate(row.TGBooking) || new Date(),
        tgBatdaukhop: parseExcelDate(row.TGBatDauKhopCan),
        tgKetthuckhopcan: parseExcelDate(row.TGKetThucKhopCan),
        trangthaikhopcan: row.TrangThaiKhopCan, // 'Đã khớp', 'Chưa khớp', 'Hết thời gian'
        customerName: `Khách hàng Ưu tiên #${row.STTBooking}`,
        customerPhone: `098${String(row.STTBooking).padStart(7, '0')}`,
        depositAmount: 50000000,
        notes: `Lượt Booking đợt 1 dự án ${proj.name} - Mã ${row.MaLuotBooking}`
      }
    });
  }
  console.log(`✓ Đã nạp ${bkRows.length} lượt Booking.`);

  // 8. LuotLock (40 lượt) & HopDong (24 hợp đồng)
  console.log('🔒 & 📜 9/9 Nạp bảng LuotLock (40) & HopDong (24) kèm Giao Dịch & Khách Hàng...');
  const llRows = XLSX.utils.sheet_to_json(wb.Sheets['LuotLock']);
  const lockMap = new Map();

  for (const row of llRows) {
    const prod = productMap.get(row.MaCan);
    if (!prod) continue;
    const emp = employeeMap.get(row.MaNV) || employeeMap.get('NV001');

    const isSuccess = row.TrangThaiGiaoDich === 'Cọc thành công';
    const isCancelled = row.TrangThaiGiaoDich === 'Khách hủy';
    const status = isSuccess ? 'DEPOSIT_CONFIRMED' : (isCancelled ? 'CANCELLED' : 'EXPIRED');

    const startDate = parseExcelDate(row.ThoiGianBatDau) || new Date();
    const endDate = parseExcelDate(row.ThoiGianKetThuc) || new Date(startDate.getTime() + 30 * 60 * 1000);
    const lockDate = parseExcelDate(row.ThoiGianLock);

    const lock = await prisma.productLock.create({
      data: {
        productId: prod.id,
        salesEmployeeId: emp.id,
        status,
        startedAt: startDate,
        expiresAt: endDate,
        depositConfirmedAt: isSuccess ? (lockDate || startDate) : null,
        cancelReason: isCancelled ? 'Khách hàng đổi nhu cầu căn khác' : (status === 'EXPIRED' ? 'Hết hạn nộp cọc 30 phút' : null),
        idempotencyKey: `lock-excel-${row.MaLock}-${row.MaCan}`,
        // Class diagram fields
        maLock: row.MaLock,
        thoigianbatdau: startDate,
        thoigianketthuc: endDate,
        sotiencoc: Number(row.SoTienCoc || 100000000),
        trangthaigiaodich: row.TrangThaiGiaoDich,
        thoigiancoc: lockDate,
        ghichu: row.GhiChu
      }
    });
    lockMap.set(row.MaCan, lock);

    // Ghi nhận Payment Transaction cho Sales Admin & Báo cáo
    await prisma.paymentTransaction.create({
      data: {
        lockId: lock.id,
        provider: 'VIETQR_AHS',
        providerReference: `VIETQR-${row.MaLock}-${row.MaCan.replace(/[\.\-]/g, '')}`,
        amount: Number(row.SoTienCoc || 100000000),
        currency: 'VND',
        status: isSuccess ? 'SUCCEEDED' : 'EXPIRED',
        paidAt: isSuccess ? (lockDate || startDate) : null,
        expiresAt: endDate,
        qrPayload: `00020101021238580010A000000727012800069704230114AHS${row.MaLock}52045311530370454${row.SoTienCoc || 100000000}5802VN5917AHS REAL ESTATE6006HA NOI6304`
      }
    });
  }
  console.log(`✓ Đã nạp ${llRows.length} lượt Lock căn.`);

  // Nạp HopDong (24 hợp đồng)
  const hdRows = XLSX.utils.sheet_to_json(wb.Sheets['HopDong']);
  for (const row of hdRows) {
    const prod = productMap.get(row.MaCan);
    if (!prod) continue;
    const emp = employeeMap.get(row.MaNV) || employeeMap.get('NV001');
    const lock = lockMap.get(row.MaCan);
    const plan = paymentPlanMap.get(prod.projectId) || await prisma.paymentPlan.findFirst({ where: { projectId: prod.projectId } });

    // Tạo khách hàng tương ứng
    const customer = await prisma.customer.create({
      data: {
        fullName: row.HoTenKH,
        phone: row.SoDienThoaiKH,
        email: row.EmailKH,
        cccdCiphertext: row.CCCDKH,
        cccdHash: row.CCCDKH,
        addressCiphertext: row.DiaChiKH,
        verificationStatus: 'VERIFIED'
      }
    });

    const isSigned = row.TrangThaiHDMB === 'Đã ký';
    const kyDate = parseExcelDate(row.ThoiGianKyHDMB) || new Date();

    await prisma.contract.create({
      data: {
        contractNumber: row.MaHopDong,
        productId: prod.id,
        customerId: customer.id,
        lockId: lock?.id || null,
        salesEmployeeId: emp.id,
        paymentPlanId: plan.id,
        agreedPrice: Number(row.GiaHopDong),
        dealRevenue: Number(row.DoanhSo),
        status: isSigned ? 'SIGNED' : 'PENDING_REVIEW',
        signingStatus: isSigned ? 'DA_KY' : 'CHUA_KY',
        signedDate: isSigned ? kyDate : null,
        signedAt: isSigned ? kyDate : null,
        commissionStatus: row.TrangThaiThanhToan === 'Hoàn tất' ? 'DA_TRA' : 'DU_KIEN_TRA',
        commissionDueDate: '30/11/2026',
        commissionAmount: Number(row.HoaHong),
        investorContractNo: row.MaHopDong,
        investorNotes: `Hợp đồng Mua bán chính thức CĐT - Phương án: ${row.PhuongThanhToan}`,
        snapshotJson: JSON.stringify({
          productCode: row.MaCan,
          customerName: row.HoTenKH,
          phone: row.SoDienThoaiKH,
          agreedPrice: row.GiaHopDong,
          doanhSo: row.DoanhSo,
          hoaHong: row.HoaHong,
          signingStatus: row.TrangThaiHDMB,
          paymentStatus: row.TrangThaiThanhToan
        }),
        // Class diagram fields
        maHopdong: row.MaHopDong,
        maKH: row.MaKH,
        sodienthoaiKH: row.SoDienThoaiKH,
        cccdKH: row.CCCDKH,
        emailKH: row.EmailKH,
        diachiKH: row.DiaChiKH,
        hotenKH: row.HoTenKH,
        phuonganthanhtoan: row.PhuongThanhToan,
        giahopdong: Number(row.GiaHopDong),
        thoigiankiHDMB: kyDate,
        trangthaiHDMB: row.TrangThaiHDMB,
        doanhso: Number(row.DoanhSo),
        hoahong: Number(row.HoaHong),
        trangthaiThanhtoan: row.TrangThaiThanhToan,
        ghichu: `Hợp đồng mua bán chính thức CĐT - Mã KH ${row.MaKH}`
      }
    });
  }
  console.log(`✓ Đã nạp ${hdRows.length} Hợp đồng mua bán chính thức.`);

  console.log('🎉 TẤT CẢ DỮ LIỆU CỦA 9 BẢNG EXCEL ĐÃ ĐƯỢC NẠP HOÀN TOÀN VÀO HỆ THỐNG!');
}

main()
  .catch((e) => {
    console.error('Lỗi khi nạp dữ liệu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
