import { db } from './db';

let isSeeding = false;

export async function ensureDatabaseSeeded() {
  try {
    let productCount = 0;
    try {
      productCount = await db.product.count();
    } catch (tableErr: any) {
      console.warn('[SeedHelper] Database table missing or uninitialized:', tableErr?.message || tableErr);
      return;
    }

    if (productCount > 0) {
      return;
    }

    if (isSeeding) return;
    isSeeding = true;

    console.log('[SeedHelper] Database empty on serverless environment. Auto-seeding initial dataset...');

    // 1. Departments & Employees
    const deptSales = await db.department.create({
      data: { code: 'DEPT-SALES', name: 'Phòng Kinh Doanh Bất Động Sản' }
    });
    const deptProduct = await db.department.create({
      data: { code: 'DEPT-PROD', name: 'Phòng Quản Lý Quỹ Hàng & Sản Phẩm' }
    });
    const deptAdmin = await db.department.create({
      data: { code: 'DEPT-ADMIN', name: 'Phòng Sales Admin & Duyệt Hợp Đồng' }
    });
    const deptMgmt = await db.department.create({
      data: { code: 'DEPT-MGMT', name: 'Ban Giám Đốc & Báo Cáo' }
    });

    const empSales1 = await db.employee.create({
      data: {
        employeeCode: 'NV-SALE-01',
        fullName: 'Trần Văn Nam',
        phone: '0987654321',
        email: 'nam.tran@ahs.com.vn',
        departmentId: deptSales.id,
        jobTitle: 'Nhân Viên Kinh Doanh (Sales)'
      }
    });

    const empProdAdmin = await db.employee.create({
      data: {
        employeeCode: 'NV-PROD-01',
        fullName: 'Nguyễn Tiến Dũng',
        phone: '0912345678',
        email: 'dung.nguyen@ahs.com.vn',
        departmentId: deptProduct.id,
        jobTitle: 'Nhân Viên Quản Lý Sản Phẩm'
      }
    });

    // 2. Investors (From CSDL AHS)
    const invSJGroup = await db.investor.create({
      data: { code: 'CDT001', name: 'SJ Group (Kiến tạo ngôi nhà Việt)', contactInfo: 'Trung tâm Hội nghị Quốc tế VICC, An Khánh, Hà Nội | Hotline: 0988 888 888' }
    });
    const invMasterise = await db.investor.create({
      data: { code: 'CDT002', name: 'Masterise Homes (Masterise Group)', contactInfo: 'Tòa nhà Masterise, TP. Hồ Chí Minh & Hà Nội | Hotline: (028) 39 159 159' }
    });
    const invParkCity = await db.investor.create({
      data: { code: 'CDT003', name: 'ParkCity Hà Nội (by AHS Property)', contactInfo: 'Khu đô thị ParkCity Hanoi, Đường Lê Trọng Tấn, Hà Đông, Hà Nội | Hotline: 1900 6868' }
    });

    // 3. Projects (The Vista Văn La, Le Parc Place, LUMIÈRE Seasons Garden, Masteri Grand Coast)
    const projVista = await db.project.create({
      data: {
        investorId: invSJGroup.id,
        code: 'SJG-VISTA',
        name: 'The Vista Văn La (215 Oasis Villas)',
        location: 'Khu đô thị Văn La, Phường Phú La, Quận Hà Đông, Hà Nội',
        status: 'SELLING',
        lockDurationMinutes: 30,
        imagesJson: JSON.stringify([
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
        ])
      }
    });

    await db.project.create({
      data: {
        investorId: invParkCity.id,
        code: 'PCH-LEPARC',
        name: 'Le Parc Place - ParkCity Hanoi',
        location: 'KĐT ParkCity Hanoi, Đường Lê Trọng Tấn, Hà Đông, Hà Nội',
        status: 'SELLING',
        lockDurationMinutes: 30,
        imagesJson: JSON.stringify([
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
        ])
      }
    });

    await db.project.create({
      data: {
        investorId: invMasterise.id,
        code: 'MH-SEASONS',
        name: 'LUMIÈRE Hanoi Seasons Garden',
        location: 'Đại đô thị Smart City, Nam Từ Liêm, Hà Nội',
        status: 'UPCOMING',
        lockDurationMinutes: 30,
        imagesJson: JSON.stringify([
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
        ])
      }
    });

    await db.project.create({
      data: {
        investorId: invMasterise.id,
        code: 'MH-MGC',
        name: 'Masteri Grand Coast (MGC Ocean City)',
        location: 'Ocean City (Vinhomes Ocean Park 2 & 3), Hưng Yên - Hà Nội',
        status: 'SELLING',
        lockDurationMinutes: 30,
        imagesJson: JSON.stringify([
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
        ])
      }
    });

    // 4. Product Types
    const typeApartment = await db.productType.create({
      data: { code: 'TYPE-APT', name: 'Căn Hộ Cao Cấp' }
    });

    // 5. Payment Plans
    const planStandard1 = await db.paymentPlan.create({
      data: { projectId: projVista.id, code: 'STD-01', name: 'Thanh toán tiến độ chuẩn (12 đợt)' }
    });

    // 6. Products Generation (144 Units)
    const buildings = ['Phân Khu Oasis Villas A', 'Phân Khu Shophouse Văn La'];
    const directions = ['Đông Nam', 'Tây Bắc', 'Đông Bắc', 'Tây Nam'];
    const handovers = ['Hoàn thiện cao cấp', 'Bàn giao thô'];

    const createdProducts = [];

    for (const b of buildings) {
      const buildingPrefix = b.includes('Oasis Villas') ? 'OV' : 'SH';
      for (let floor = 1; floor <= 12; floor++) {
        for (let unit = 1; unit <= 6; unit++) {
          const unitNum = unit < 10 ? `0${unit}` : `${unit}`;
          const floorNum = floor < 10 ? `0${floor}` : `${floor}`;
          const productCode = `${buildingPrefix}-${floorNum}${unitNum}`;
          const area = 55 + (unit * 15) + (floor % 3) * 5;
          const basePrice = area * 65000000;
          const depositAmount = 100000000;

          let status = 'AVAILABLE';
          if (floor === 3 && unit === 2) status = 'LOCKED';
          if (floor === 5 && unit === 1) status = 'DEPOSITED';
          if (floor === 8 && unit === 4) status = 'SOLD';
          if (floor === 10 && unit === 6) status = 'UNAVAILABLE';

          const prod = await db.product.create({
            data: {
              projectId: projVista.id,
              productTypeId: typeApartment.id,
              productCode,
              building: b,
              floor,
              area,
              direction: directions[(floor + unit) % 4],
              handoverPlan: handovers[floor % 2],
              status
            }
          });

          createdProducts.push(prod);

          await db.productPrice.create({
            data: {
              productId: prod.id,
              paymentPlanId: planStandard1.id,
              amount: basePrice,
              depositAmount
            }
          });
        }
      }
    }

    // Seed test lock
    const lockedProd = createdProducts.find(p => p.productCode === 'A-0302');
    if (lockedProd) {
      const expiresAt = new Date(Date.now() + 25 * 60 * 1000);
      const lock = await db.productLock.create({
        data: {
          productId: lockedProd.id,
          salesEmployeeId: empSales1.id,
          status: 'ACTIVE',
          startedAt: new Date(),
          expiresAt,
          idempotencyKey: 'lock-seed-A-0302'
        }
      });

      await db.paymentTransaction.create({
        data: {
          lockId: lock.id,
          provider: 'VIETQR_AHS',
          providerReference: `AHS-A0302-83910`,
          amount: 100000000,
          status: 'PENDING',
          expiresAt,
          qrPayload: `00020101021238580010A000000727012800069704230114AHS0302DEPOSIT52045311530370454091000000005802VN5917AHS REAL ESTATE6006HA NOI6304`
        }
      });
    }

    // Seed deposited & contract
    const depositedProd = createdProducts.find(p => p.productCode === 'A-0501');
    if (depositedProd) {
      const lock = await db.productLock.create({
        data: {
          productId: depositedProd.id,
          salesEmployeeId: empSales1.id,
          status: 'DEPOSIT_CONFIRMED',
          startedAt: new Date(Date.now() - 3600 * 1000),
          expiresAt: new Date(Date.now() + 1800 * 1000),
          depositConfirmedAt: new Date(Date.now() - 1800 * 1000)
        }
      });

      const cust = await db.customer.create({
        data: {
          fullName: 'Nguyễn Văn Hoàng',
          phone: '0912999888',
          email: 'hoang.nguyen@gmail.com',
          cccdCiphertext: '001095012345',
          cccdHash: 'hash_001095012345',
          addressCiphertext: 'Số 18 Lý Thường Kiệt, Hoàn Kiếm, Hà Nội',
          verificationStatus: 'VERIFIED'
        }
      });

      await db.contract.create({
        data: {
          contractNumber: 'HD-AHS-A0501-2026',
          productId: depositedProd.id,
          customerId: cust.id,
          lockId: lock.id,
          salesEmployeeId: empSales1.id,
          paymentPlanId: planStandard1.id,
          agreedPrice: 4550000000,
          status: 'PENDING_REVIEW',
          snapshotJson: JSON.stringify({
            productCode: 'A-0501',
            customerName: 'Nguyễn Văn Hoàng',
            price: 4550000000,
            deposit: 100000000
          })
        }
      });
    }

    console.log(`[SeedHelper] Auto-seeded ${createdProducts.length} real estate units successfully.`);
  } catch (err) {
    console.error('[SeedHelper] Error during auto-seeding:', err);
  } finally {
    isSeeding = false;
  }
}
