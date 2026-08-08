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

    // 2. Investors
    const invAHS = await db.investor.create({
      data: { code: 'INV-AHS', name: 'Công ty Cổ phần Bất động sản AHS', contactInfo: 'Hotline: 1900 8888 | Head Office: Tây Hồ, Hà Nội' }
    });

    // 3. Projects
    const projHorizon = await db.project.create({
      data: {
        investorId: invAHS.id,
        code: 'AHS-HORIZON',
        name: 'AHS Grand Horizon Tây Hồ',
        location: 'Quận Tây Hồ, Hà Nội',
        status: 'SELLING',
        lockDurationMinutes: 30
      }
    });

    await db.project.create({
      data: {
        investorId: invAHS.id,
        code: 'AHS-OCEAN',
        name: 'AHS Ocean Harbor Đà Nẵng',
        location: 'Đường Võ Nguyên Giáp, Sơn Trà, Đà Nẵng',
        status: 'SELLING',
        lockDurationMinutes: 30
      }
    });

    // 4. Product Types
    const typeApartment = await db.productType.create({
      data: { code: 'TYPE-APT', name: 'Căn Hộ Cao Cấp' }
    });

    // 5. Payment Plans
    const planStandard1 = await db.paymentPlan.create({
      data: { projectId: projHorizon.id, code: 'STD-01', name: 'Thanh toán tiến độ chuẩn (12 đợt)' }
    });

    // 6. Products Generation (144 Units)
    const buildings = ['Tòa A (Horizon Tower)', 'Tòa B (Skyline Tower)'];
    const directions = ['Đông Nam', 'Tây Bắc', 'Đông Bắc', 'Tây Nam'];
    const handovers = ['Hoàn thiện cao cấp', 'Bàn giao thô'];

    const createdProducts = [];

    for (const b of buildings) {
      const buildingPrefix = b.includes('Tòa A') ? 'A' : 'B';
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
              projectId: projHorizon.id,
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
