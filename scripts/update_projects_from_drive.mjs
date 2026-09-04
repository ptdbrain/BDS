import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Đang cập nhật danh mục Chủ đầu tư & Dự án theo dữ liệu Google Drive...');

  // 1. Tạo/Cập nhật Chủ đầu tư theo bảng Excel CSDL AHS
  const invSJGroup = await prisma.investor.upsert({
    where: { code: 'CDT001' },
    update: {
      name: 'SJ Group (Kiến tạo ngôi nhà Việt)',
      contactInfo: 'Trung tâm Hội nghị Quốc tế VICC, An Khánh, Hà Nội | Hotline: 0988 888 888'
    },
    create: {
      code: 'CDT001',
      name: 'SJ Group (Kiến tạo ngôi nhà Việt)',
      contactInfo: 'Trung tâm Hội nghị Quốc tế VICC, An Khánh, Hà Nội | Hotline: 0988 888 888'
    }
  });

  const invParkCity = await prisma.investor.upsert({
    where: { code: 'CDT003' },
    update: {
      name: 'ParkCity Hà Nội (by AHS Property)',
      contactInfo: 'Khu đô thị ParkCity Hanoi, Đường Lê Trọng Tấn, Hà Đông, Hà Nội | Hotline: 1900 6868'
    },
    create: {
      code: 'CDT003',
      name: 'ParkCity Hà Nội (by AHS Property)',
      contactInfo: 'Khu đô thị ParkCity Hanoi, Đường Lê Trọng Tấn, Hà Đông, Hà Nội | Hotline: 1900 6868'
    }
  });

  const invMasterise = await prisma.investor.upsert({
    where: { code: 'CDT002' },
    update: {
      name: 'Masterise Homes (Masterise Group)',
      contactInfo: 'Tòa nhà Masterise, TP. Hồ Chí Minh & Hà Nội | Hotline: (028) 39 159 159'
    },
    create: {
      code: 'CDT002',
      name: 'Masterise Homes (Masterise Group)',
      contactInfo: 'Tòa nhà Masterise, TP. Hồ Chí Minh & Hà Nội | Hotline: (028) 39 159 159'
    }
  });

  const invCapitaLand = await prisma.investor.upsert({
    where: { code: 'CDT004' },
    update: {
      name: 'CapitaLand Development',
      contactInfo: 'CapitaLand Tower, Hà Nội & TP. Hồ Chí Minh'
    },
    create: {
      code: 'CDT004',
      name: 'CapitaLand Development',
      contactInfo: 'CapitaLand Tower, Hà Nội & TP. Hồ Chí Minh'
    }
  });

  // 2. Định nghĩa Slide decks cho từng dự án
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

  const slidesMasteriGrandCoast = [
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

  // 3. Cập nhật các dự án hiện có hoặc tạo mới
  const existingProjects = await prisma.project.findMany();

  // Project 1: The Vista Văn La
  let p1 = existingProjects[0];
  if (p1) {
    p1 = await prisma.project.update({
      where: { id: p1.id },
      data: {
        code: 'SJG-VISTA',
        name: 'The Vista Văn La (215 Oasis Villas)',
        location: 'Khu đô thị Văn La, Phường Phú La, Quận Hà Đông, Hà Nội',
        status: 'SELLING',
        investorId: invSJGroup.id,
        imagesJson: JSON.stringify(slidesVistaVanLa)
      }
    });
  } else {
    p1 = await prisma.project.create({
      data: {
        code: 'SJG-VISTA',
        name: 'The Vista Văn La (215 Oasis Villas)',
        location: 'Khu đô thị Văn La, Phường Phú La, Quận Hà Đông, Hà Nội',
        status: 'SELLING',
        investorId: invSJGroup.id,
        imagesJson: JSON.stringify(slidesVistaVanLa)
      }
    });
  }

  // Project 2: Le Parc Place (ParkCity Hanoi)
  let p2 = existingProjects[1];
  if (p2) {
    p2 = await prisma.project.update({
      where: { id: p2.id },
      data: {
        code: 'PCH-LEPARC',
        name: 'Le Parc Place - ParkCity Hanoi',
        location: 'KĐT ParkCity Hanoi, Đường Lê Trọng Tấn, Hà Đông, Hà Nội',
        status: 'SELLING',
        investorId: invParkCity.id,
        imagesJson: JSON.stringify(slidesLeParcPlace)
      }
    });
  } else {
    p2 = await prisma.project.create({
      data: {
        code: 'PCH-LEPARC',
        name: 'Le Parc Place - ParkCity Hanoi',
        location: 'KĐT ParkCity Hanoi, Đường Lê Trọng Tấn, Hà Đông, Hà Nội',
        status: 'SELLING',
        investorId: invParkCity.id,
        imagesJson: JSON.stringify(slidesLeParcPlace)
      }
    });
  }

  // Project 3: LUMIÈRE Hanoi Seasons Garden
  let p3 = existingProjects[2];
  if (p3) {
    p3 = await prisma.project.update({
      where: { id: p3.id },
      data: {
        code: 'MH-SEASONS',
        name: 'LUMIÈRE Hanoi Seasons Garden',
        location: 'Đại đô thị Smart City, Nam Từ Liêm, Hà Nội',
        status: 'UPCOMING',
        investorId: invMasterise.id,
        imagesJson: JSON.stringify(slidesHanoiSeasons)
      }
    });
  } else {
    p3 = await prisma.project.create({
      data: {
        code: 'MH-SEASONS',
        name: 'LUMIÈRE Hanoi Seasons Garden',
        location: 'Đại đô thị Smart City, Nam Từ Liêm, Hà Nội',
        status: 'UPCOMING',
        investorId: invMasterise.id,
        imagesJson: JSON.stringify(slidesHanoiSeasons)
      }
    });
  }

  // Project 4: Masteri Grand Coast
  let p4 = existingProjects.find(p => p.code === 'MH-MGC');
  if (p4) {
    p4 = await prisma.project.update({
      where: { id: p4.id },
      data: {
        code: 'MH-MGC',
        name: 'Masteri Grand Coast (MGC Ocean City)',
        location: 'Ocean City (Vinhomes Ocean Park 2 & 3), Hưng Yên - Hà Nội',
        status: 'SELLING',
        investorId: invMasterise.id,
        imagesJson: JSON.stringify(slidesMasteriGrandCoast)
      }
    });
  } else {
    p4 = await prisma.project.create({
      data: {
        code: 'MH-MGC',
        name: 'Masteri Grand Coast (MGC Ocean City)',
        location: 'Ocean City (Vinhomes Ocean Park 2 & 3), Hưng Yên - Hà Nội',
        status: 'SELLING',
        investorId: invMasterise.id,
        imagesJson: JSON.stringify(slidesMasteriGrandCoast)
      }
    });
  }

  // Cập nhật tên tòa cho các căn thuộc The Vista Văn La & Le Parc Place
  await prisma.product.updateMany({
    where: { projectId: p1.id, building: { contains: 'Tòa A' } },
    data: { building: 'Phân Khu Oasis Villas A' }
  });
  await prisma.product.updateMany({
    where: { projectId: p1.id, building: { contains: 'Tòa B' } },
    data: { building: 'Phân Khu Shophouse Văn La' }
  });

  console.log('✅ Đã cập nhật thành công 4 dự án chuẩn từ Google Drive:');
  console.log(`1. ${p1.name} (Chủ đầu tư: SJ Group) - ${slidesVistaVanLa.length} slides`);
  console.log(`2. ${p2.name} (Chủ đầu tư: ParkCity Hanoi) - ${slidesLeParcPlace.length} slides`);
  console.log(`3. ${p3.name} (Chủ đầu tư: Masterise Homes) - ${slidesHanoiSeasons.length} slides`);
  console.log(`4. ${p4.name} (Chủ đầu tư: Masterise Homes) - ${slidesMasteriGrandCoast.length} slides`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
