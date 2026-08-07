import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding AHS Real Estate Database...');

  // Clean DB
  await prisma.auditLog.deleteMany();
  await prisma.contractReview.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.customerVerification.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.paymentTransaction.deleteMany();
  await prisma.productLock.deleteMany();
  await prisma.productPrice.deleteMany();
  await prisma.productStatusHistory.deleteMany();
  await prisma.product.deleteMany();
  await prisma.paymentPlan.deleteMany();
  await prisma.project.deleteMany();
  await prisma.investor.deleteMany();
  await prisma.productType.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.department.deleteMany();

  // 1. Departments & Employees
  const deptSales = await prisma.department.create({
    data: { code: 'DEPT-SALES', name: 'Phòng Kinh Doanh Bất Động Sản' }
  });
  const deptProduct = await prisma.department.create({
    data: { code: 'DEPT-PROD', name: 'Phòng Quản Lý Quỹ Hàng & Sản Phẩm' }
  });
  const deptAdmin = await prisma.department.create({
    data: { code: 'DEPT-ADMIN', name: 'Phòng Sales Admin & Duyệt Hợp Đồng' }
  });
  const deptMgmt = await prisma.department.create({
    data: { code: 'DEPT-MGMT', name: 'Ban Giám Đốc & Báo Cáo' }
  });

  const empSales1 = await prisma.employee.create({
    data: {
      employeeCode: 'NV-SALE-01',
      fullName: 'Trần Văn Nam',
      phone: '0987654321',
      email: 'nam.tran@ahs.com.vn',
      departmentId: deptSales.id,
      jobTitle: 'Nhân Viên Kinh Doanh (Sales)'
    }
  });

  const empSales2 = await prisma.employee.create({
    data: {
      employeeCode: 'NV-SALE-02',
      fullName: 'Lê Thị Thu Hà',
      phone: '0978123456',
      email: 'ha.le@ahs.com.vn',
      departmentId: deptSales.id,
      jobTitle: 'Nhân Viên Kinh Doanh (Sales)'
    }
  });

  const empProdAdmin = await prisma.employee.create({
    data: {
      employeeCode: 'NV-PROD-01',
      fullName: 'Nguyễn Tiến Dũng',
      phone: '0912345678',
      email: 'dung.nguyen@ahs.com.vn',
      departmentId: deptProduct.id,
      jobTitle: 'Nhân Viên Quản Lý Sản Phẩm'
    }
  });

  const empSalesAdmin = await prisma.employee.create({
    data: {
      employeeCode: 'NV-ADMIN-01',
      fullName: 'Phạm Thị Mai',
      phone: '0934567890',
      email: 'mai.pham@ahs.com.vn',
      departmentId: deptAdmin.id,
      jobTitle: 'Sales Admin (Kế toán & Pháp lý)'
    }
  });

  const empManager = await prisma.employee.create({
    data: {
      employeeCode: 'NV-MGMT-01',
      fullName: 'Hoàng Quốc Việt',
      phone: '0909090909',
      email: 'viet.hoang@ahs.com.vn',
      departmentId: deptMgmt.id,
      jobTitle: 'Giám Đốc Kinh Doanh (Manager)'
    }
  });

  // 2. Investors
  const invAHS = await prisma.investor.create({
    data: { code: 'INV-AHS', name: 'Công ty Cổ phần Bất động sản AHS', contactInfo: 'Hotline: 1900 8888 | Head Office: Tây Hồ, Hà Nội' }
  });
  const invVinhomes = await prisma.investor.create({
    data: { code: 'INV-VIN', name: 'Tập đoàn Vinhomes (Đối tác AHS)', contactInfo: 'Hotline: 1900 232389 | Hà Nội' }
  });

  // 3. Projects
  const projHorizon = await prisma.project.create({
    data: {
      investorId: invAHS.id,
      code: 'AHS-HORIZON',
      name: 'AHS Grand Horizon Tây Hồ',
      location: 'Quận Tây Hồ, Hà Nội',
      status: 'SELLING',
      lockDurationMinutes: 30
    }
  });

  const projOcean = await prisma.project.create({
    data: {
      investorId: invAHS.id,
      code: 'AHS-OCEAN',
      name: 'AHS Ocean Harbor Đà Nẵng',
      location: 'Đường Võ Nguyên Giáp, Sơn Trà, Đà Nẵng',
      status: 'SELLING',
      lockDurationMinutes: 30
    }
  });

  const projSky = await prisma.project.create({
    data: {
      investorId: invVinhomes.id,
      code: 'AHS-SKY',
      name: 'AHS Sky Oasis Sài Gòn',
      location: 'Quận 1, TP. Hồ Chí Minh',
      status: 'SELLING',
      lockDurationMinutes: 30
    }
  });

  // 4. Product Types
  const typeApartment = await prisma.productType.create({
    data: { code: 'TYPE-APT', name: 'Căn Hộ Cao Cấp' }
  });
  const typeShophouse = await prisma.productType.create({
    data: { code: 'TYPE-SHOP', name: 'Shophouse Thương Mại' }
  });
  const typeVilla = await prisma.productType.create({
    data: { code: 'TYPE-VILLA', name: 'Biệt Thự Đơn Lập' }
  });

  // 5. Payment Plans
  const planStandard1 = await prisma.paymentPlan.create({
    data: { projectId: projHorizon.id, code: 'STD-01', name: 'Thanh toán tiến độ chuẩn (12 đợt)' }
  });
  const planFast1 = await prisma.paymentPlan.create({
    data: { projectId: projHorizon.id, code: 'FAST-95', name: 'Thanh toán sớm 95% (Chiết khấu 8%)' }
  });
  const planBank1 = await prisma.paymentPlan.create({
    data: { projectId: projHorizon.id, code: 'BANK-70', name: 'Hỗ trợ lãi suất 0% cho 70% giá trị' }
  });

  // 6. Products Generation for AHS Grand Horizon
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
        const basePrice = area * 65000000; // 65tr/m2
        const depositAmount = 100000000; // 100M deposit

        // Status distribution: mostly AVAILABLE, some LOCKED, DEPOSITED, SOLD
        let status = 'AVAILABLE';
        if (floor === 3 && unit === 2) status = 'LOCKED';
        if (floor === 5 && unit === 1) status = 'DEPOSITED';
        if (floor === 8 && unit === 4) status = 'SOLD';
        if (floor === 10 && unit === 6) status = 'UNAVAILABLE';

        const prod = await prisma.product.create({
          data: {
            projectId: projHorizon.id,
            productTypeId: typeApartment.id,
            productCode: productCode,
            building: b,
            floor: floor,
            area: area,
            direction: directions[(floor + unit) % 4],
            handoverPlan: handovers[floor % 2],
            status: status
          }
        });

        createdProducts.push(prod);

        // Price entry
        await prisma.productPrice.create({
          data: {
            productId: prod.id,
            paymentPlanId: planStandard1.id,
            amount: basePrice,
            depositAmount: depositAmount
          }
        });

        // Track History
        await prisma.productStatusHistory.create({
          data: {
            productId: prod.id,
            fromStatus: 'UNAVAILABLE',
            toStatus: status,
            reason: 'Mở bán đợt 1',
            actorId: empProdAdmin.id
          }
        });
      }
    }
  }

  // 7. Seed active lock and payment for test unit (floor 3 unit 2)
  const lockedProd = createdProducts.find(p => p.productCode === 'A-0302');
  if (lockedProd) {
    const expiresAt = new Date(Date.now() + 25 * 60 * 1000); // 25 mins remaining
    const lock = await prisma.productLock.create({
      data: {
        productId: lockedProd.id,
        salesEmployeeId: empSales1.id,
        status: 'ACTIVE',
        startedAt: new Date(),
        expiresAt: expiresAt,
        idempotencyKey: 'lock-seed-A-0302'
      }
    });

    await prisma.paymentTransaction.create({
      data: {
        lockId: lock.id,
        provider: 'VIETQR_AHS',
        providerReference: `AHS-A0302-${Math.floor(Math.random()*900000 + 100000)}`,
        amount: 100000000,
        status: 'PENDING',
        expiresAt: expiresAt,
        qrPayload: `00020101021238580010A000000727012800069704230114AHS0302DEPOSIT52045311530370454091000000005802VN5917AHS REAL ESTATE6006HA NOI6304`
      }
    });
  }

  // 8. Seed Deposited & Contract for test unit (floor 5 unit 1)
  const depositedProd = createdProducts.find(p => p.productCode === 'A-0501');
  if (depositedProd) {
    const lock = await prisma.productLock.create({
      data: {
        productId: depositedProd.id,
        salesEmployeeId: empSales1.id,
        status: 'DEPOSIT_CONFIRMED',
        startedAt: new Date(Date.now() - 3600 * 1000),
        expiresAt: new Date(Date.now() + 1800 * 1000),
        depositConfirmedAt: new Date(Date.now() - 1800 * 1000)
      }
    });

    const cust = await prisma.customer.create({
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

    await prisma.contract.create({
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
          deposit: 100000000,
          date: new Date().toISOString()
        })
      }
    });
  }

  // 9. Seed Audit Log
  await prisma.auditLog.create({
    data: {
      actorId: empProdAdmin.id,
      actorName: empProdAdmin.fullName,
      action: 'INITIALIZE_PRODUCT_CATALOG',
      entityType: 'PROJECT',
      entityId: projHorizon.id,
      beforeJson: null,
      afterJson: JSON.stringify({ name: projHorizon.name, unitsCount: createdProducts.length })
    }
  });

  console.log(`Database seeded successfully with ${createdProducts.length} real estate products!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
