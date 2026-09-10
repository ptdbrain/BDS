import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sweepExpiredLocks } from '@/lib/locks';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';
import { sumExplicitAmounts } from '@/lib/contractFinancialPolicy';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    await ensureDatabaseSeeded();
    await sweepExpiredLocks();

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const projectIdParam = searchParams.get('projectId');

    // Role and Employee identification for RBAC security
    const role = (searchParams.get('role') || request.headers.get('x-user-role') || 'SALES').toUpperCase();
    const employeeCode = searchParams.get('employeeCode') || request.headers.get('x-employee-code') || '';

    const isManager = role === 'MANAGER';
    const isSales = role === 'SALES';
    const isProductAdmin = role === 'PRODUCT_ADMIN';
    const isSalesAdmin = role === 'SALES_ADMIN';

    // RBAC: Chỉ Ban Lãnh Đạo (MANAGER) được xem Doanh Thu của công ty từ CĐT
    // NVKD và Nhân viên QL Sản phẩm TUYỆT ĐỐI KHÔNG ĐƯỢC XEM doanh thu công ty
    const canViewCompanyRevenue = isManager;

    if (isSalesAdmin) {
      return NextResponse.json({
        error: 'Sales Admin không có quyền truy cập báo cáo tổng hợp doanh thu công ty.'
      }, { status: 403 });
    }

    // Fetch master entities
    const [
      totalProducts,
      availableProducts,
      lockedProducts,
      depositedProducts,
      soldProducts,
      contracts,
      succeededPayments,
      employees,
      projects
    ] = await Promise.all([
      db.product.count(),
      db.product.count({ where: { status: 'AVAILABLE' } }),
      db.product.count({ where: { status: 'LOCKED' } }),
      db.product.count({ where: { status: 'DEPOSITED' } }),
      db.product.count({ where: { status: 'SOLD' } }),
      db.contract.findMany({
        include: {
          product: { include: { project: true } },
          salesEmployee: true,
          customer: true
        },
        orderBy: { signedDate: 'asc' }
      }),
      db.paymentTransaction.findMany({ where: { status: 'SUCCEEDED' } }),
      db.employee.findMany({
        include: {
          department: true,
          _count: { select: { locks: true, contracts: true } }
        },
        orderBy: [{ employeeCode: 'asc' }, { fullName: 'asc' }]
      }),
      db.project.findMany({
        include: {
          products: {
            include: { contracts: true, locks: { include: { payments: true } } }
          }
        },
        orderBy: [{ code: 'asc' }]
      })
    ]);

    // Filter contracts by date if provided
    let filteredContracts = contracts;
    let startDateObj: Date | null = null;
    let endDateObj: Date | null = null;

    if (startDateParam || endDateParam) {
      if (startDateParam) {
        startDateObj = new Date(startDateParam);
        startDateObj.setHours(0, 0, 0, 0);
      }
      if (endDateParam) {
        endDateObj = new Date(endDateParam);
        endDateObj.setHours(23, 59, 59, 999);
      }

      const start = startDateObj || new Date(0);
      const end = endDateObj || new Date(8640000000000000);

      filteredContracts = contracts.filter(c => {
        const d = c.signedDate || c.signedAt || c.thoigiankiHDMB || c.createdAt;
        if (!d) return false;
        const time = new Date(d).getTime();
        return time >= start.getTime() && time <= end.getTime();
      });
    }

    // -------------------------------------------------------------
    // FINANCIAL CALCULATIONS THEO QUY TẮC MỚI:
    // 1. Doanh số = giá trị căn bán được theo hợp đồng (hệ thống tự động ghi nhận)
    // 2. Doanh thu = số tiền AHS thực tế thu được từ CĐT (Sales Admin nhập, chỉ Ban lãnh đạo xem)
    // 3. Hoa hồng = Sales Admin cập nhật, NVKD được xem hoa hồng của chính mình
    // -------------------------------------------------------------
    const totalContractSales = filteredContracts.reduce(
      (acc, c) => acc + (c.doanhso || c.giahopdong || c.agreedPrice || 0),
      0
    );

    const totalCompanyRevenue = sumExplicitAmounts(filteredContracts, 'doanhthu');
    const totalCommission = filteredContracts.reduce(
      (acc, c) => acc + Number(c.hoahong ?? c.commissionAmount ?? 0),
      0
    );

    // Filter payments in date range
    const filteredPayments = succeededPayments.filter(p => {
      if (!startDateObj && !endDateObj) return true;
      const pt = new Date(p.createdAt || p.paidAt || 0).getTime();
      const st = (startDateObj || new Date(0)).getTime();
      const et = (endDateObj || new Date(8640000000000000)).getTime();
      return pt >= st && pt <= et;
    });
    const totalDepositRevenue = filteredPayments.reduce((acc, p) => acc + p.amount, 0);

    // Dữ liệu cá nhân cho NVKD đang đăng nhập
    const myContracts = filteredContracts.filter(
      c => c.salesEmployee?.employeeCode === employeeCode || c.salesEmployeeId === employeeCode
    );
    const mySales = myContracts.reduce((acc, c) => acc + (c.doanhso || c.giahopdong || c.agreedPrice || 0), 0);
    const myCommission = myContracts.reduce((acc, c) => acc + Number(c.hoahong ?? c.commissionAmount ?? 0), 0);

    // -------------------------------------------------------------
    // 1. BÁO CÁO 1: BC_DoanhThu (Báo cáo doanh thu thuần CĐT theo thời gian)
    // CHỈ BAN LÃNH ĐẠO (MANAGER) ĐƯỢC PHÉP TRUY CẬP
    // -------------------------------------------------------------
    const startM = startDateObj ? (startDateObj.getMonth() + 1) : 1;
    const endM = endDateObj ? (endDateObj.getMonth() + 1) : 12;

    const monthlyRevenue = [];
    if (canViewCompanyRevenue) {
      for (let m = startM; m <= endM; m++) {
        const monthStr = `${String(m).padStart(2, '0')}/2026`;
        const monthContracts = filteredContracts.filter(c => {
          const d = c.signedDate || c.signedAt || c.thoigiankiHDMB || c.createdAt;
          if (!d) return false;
          const dateObj = new Date(d);
          return dateObj.getFullYear() === 2026 && dateObj.getMonth() + 1 === m;
        });

        const mCount = monthContracts.length;
        const mSales = monthContracts.reduce((sum, c) => sum + (c.doanhso || c.giahopdong || c.agreedPrice || 0), 0);
        const mRevenue = sumExplicitAmounts(monthContracts, 'doanhthu');
        const mAvg = mCount > 0 ? Math.round(mRevenue / mCount) : 0;
        const mShare = totalCompanyRevenue > 0 ? (mRevenue / totalCompanyRevenue) : 0;

        let notes = '';
        if (m === 6) notes = 'Mở bán cao điểm The Vista & LUMIÈRE - CĐT giải ngân đợt 1';
        else if (m === 7) notes = 'Đợt 2 Masteri Grand Coast - CĐT thanh toán phí dịch vụ';
        else if (m === 10) notes = 'Khớp đợt 3 mùa thu';
        else if (m === 12) notes = 'Tổng kết doanh thu CĐT cuối năm';
        else if (mCount > 0) notes = `Thực hiện ${mCount} hợp đồng, CĐT quyết toán hoa hồng`;

        monthlyRevenue.push({
          month: monthStr,
          monthNum: m,
          contractsCount: mCount,
          sales: mSales, // Doanh số bán hàng (giá trị căn)
          revenue: mRevenue, // Doanh thu thực tế AHS thu từ CĐT
          avgContractValue: mAvg,
          revenueShare: mShare,
          notes
        });
      }
    }

    // Format Period string
    const formatPeriodString = () => {
      if (startDateParam && endDateParam) {
        try {
          const [sy, sm, sd] = startDateParam.split('-');
          const [ey, em, ed] = endDateParam.split('-');
          return `${sd}/${sm}/${sy} - ${ed}/${em}/${ey}`;
        } catch {
          return `${startDateParam} - ${endDateParam}`;
        }
      }
      return '01/06/2026 - 31/07/2026';
    };

    const bcDoanhThuSummary = canViewCompanyRevenue ? {
      totalRevenue: totalCompanyRevenue, // Doanh thu thực tế thu từ CĐT
      totalSales: totalContractSales,    // Doanh số bán hàng theo HĐ
      totalContracts: filteredContracts.length,
      avgContractValue: filteredContracts.length > 0 ? Math.round(totalContractSales / filteredContracts.length) : 0,
      companyInfo: {
        name: 'CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN AHS (AHS PROPERTY)',
        address: 'Tầng 4, Tòa nhà The Legend Tower, số 109 Nguyễn Tuân, Phường Thanh Xuân, Thành phố Hà Nội, Việt Nam',
        phone: '0964960955',
        creator: 'Hoàng Thị Hương Giang',
        createdDate: new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        period: formatPeriodString(),
        sourceLink: 'https://ahsproperty.vn/lien-he/'
      }
    } : null;

    // -------------------------------------------------------------
    // 2. BÁO CÁO 2: BC_SanPham_DuAn (Lượng sản phẩm bán theo dự án)
    // TẤT CẢ CÁC VAI TRÒ ĐỀU ĐƯỢC XEM (KỂ CẢ QL SẢN PHẨM HOÀNG THỊ HƯƠNG GIANG & NVKD)
    // -------------------------------------------------------------
    const isDateFiltered = Boolean(startDateParam || endDateParam);
    const projectSales = projects.map(proj => {
      const prods = proj.products;
      const totalUnits = prods.length;
      
      const projFilteredContracts = filteredContracts.filter(c => 
        c.product?.projectId === proj.id || prods.some(p => p.id === c.productId)
      );

      const soldUnits = isDateFiltered
        ? projFilteredContracts.length
        : prods.filter(p => p.status === 'SOLD' || p.trangthai === 'Đã khớp' || p.trangthai === 'Đã bán').length;
      
      const availableUnits = isDateFiltered
        ? Math.max(0, totalUnits - soldUnits)
        : prods.filter(p => p.status === 'AVAILABLE' || p.trangthai === 'Còn hàng').length;

      const lockedUnits = isDateFiltered ? 0 : prods.filter(p => p.status === 'LOCKED' && p.trangthai !== 'Đã khớp').length;
      const soldRate = totalUnits > 0 ? (soldUnits / totalUnits) : 0;

      return {
        projectId: proj.id,
        maDA: proj.code,
        tenDA: proj.name,
        location: proj.location,
        totalUnits,
        availableUnits,
        lockedUnits,
        soldUnits,
        soldRate,
        formattedSoldRate: (soldRate * 100).toFixed(2) + '%'
      };
    });

    const bcSanPhamDuAnSummary = {
      totalUnits: projectSales.reduce((sum, p) => sum + p.totalUnits, 0),
      availableUnits: projectSales.reduce((sum, p) => sum + p.availableUnits, 0),
      lockedUnits: projectSales.reduce((sum, p) => sum + p.lockedUnits, 0),
      soldUnits: projectSales.reduce((sum, p) => sum + p.soldUnits, 0),
      totalSoldRate: projectSales.reduce((sum, p) => sum + p.totalUnits, 0) > 0
        ? ((projectSales.reduce((sum, p) => sum + p.soldUnits, 0) / projectSales.reduce((sum, p) => sum + p.totalUnits, 0)) * 100).toFixed(2) + '%'
        : '0%'
    };

    // -------------------------------------------------------------
    // 3. BÁO CÁO 3: BC_DoanhSo_NV (Doanh số theo nhân viên)
    // NVKD CHỈ ĐƯỢC XEM HOA HỒNG & DOANH SỐ CỦA CHÍNH MÌNH!
    // -------------------------------------------------------------
    const allEmployeePerformance = employees.map(emp => {
      const empContracts = filteredContracts.filter(c => c.salesEmployeeId === emp.id || c.salesEmployee?.employeeCode === emp.employeeCode);
      const eSales = empContracts.reduce((sum, c) => sum + (c.doanhso || c.giahopdong || c.agreedPrice || 0), 0);
      const eCommission = empContracts.reduce((sum, c) => sum + Number(c.hoahong ?? c.commissionAmount ?? 0), 0);
      const eCount = empContracts.length;
      const eAvg = eCount > 0 ? Math.round(eSales / eCount) : 0;

      return {
        employeeId: emp.id,
        maNV: emp.employeeCode || emp.maNV || 'NV',
        fullName: emp.fullName,
        jobTitle: emp.jobTitle,
        departmentName: emp.department?.name || 'Phòng Kinh doanh',
        contractsCount: eCount,
        totalSales: eSales,
        totalRevenue: eSales, // Alias for backward compatibility
        totalCommission: eCommission,
        avgRevenuePerContract: eAvg
      };
    });

    // Phân quyền dữ liệu theo vai trò
    let displayEmployeePerformance = allEmployeePerformance;
    if (isSales) {
      // NVKD chỉ thấy dòng của chính mình
      displayEmployeePerformance = allEmployeePerformance.filter(
        e => e.maNV === employeeCode || (employeeCode === '' && e.maNV === 'NV001')
      );
      if (displayEmployeePerformance.length === 0) {
        displayEmployeePerformance = allEmployeePerformance.slice(0, 1);
      }
    } else if (isProductAdmin) {
      // QL sản phẩm không quản lý hoa hồng nhân sự
      displayEmployeePerformance = [];
    }

    const bcDoanhSoNVSummary = isProductAdmin ? null : {
      totalContracts: displayEmployeePerformance.reduce((sum, e) => sum + e.contractsCount, 0),
      totalSales: displayEmployeePerformance.reduce((sum, e) => sum + e.totalSales, 0),
      totalRevenue: displayEmployeePerformance.reduce((sum, e) => sum + e.totalSales, 0),
      totalCommission: displayEmployeePerformance.reduce((sum, e) => sum + e.totalCommission, 0),
      avgRevenuePerContract: displayEmployeePerformance.reduce((sum, e) => sum + e.contractsCount, 0) > 0
        ? Math.round(displayEmployeePerformance.reduce((sum, e) => sum + e.totalSales, 0) / displayEmployeePerformance.reduce((sum, e) => sum + e.contractsCount, 0))
        : 0
    };

    // Leaderboard (chỉ hiển thị cho Manager và Sales Admin)
    const leaderboard = (isManager || isSalesAdmin)
      ? [...allEmployeePerformance].filter(e => e.totalSales > 0).sort((a, b) => b.totalSales - a.totalSales)
      : [];

    return NextResponse.json({
      data: {
        userAccess: {
          role,
          employeeCode,
          canViewCompanyRevenue,
          isScopedToSelf: isSales
        },
        kpis: {
          totalProducts,
          availableProducts,
          lockedProducts,
          depositedProducts,
          soldProducts: isDateFiltered ? filteredContracts.length : soldProducts,
          totalDepositRevenue,
          // 1. DOANH SỐ = Giá trị căn bán được theo hợp đồng (Hệ thống tự động ghi nhận)
          totalContractSales: isManager ? totalContractSales : null,
          totalContractRevenue: isManager ? totalContractSales : null, // Alias
          // 2. DOANH THU = Số tiền AHS thực tế thu được từ CĐT (CHỈ Ban Lãnh Đạo xem)
          totalCompanyRevenue: canViewCompanyRevenue ? totalCompanyRevenue : null,
          // 3. HOA HỒNG = Sales Admin cập nhật, NVKD xem hoa hồng của chính mình
          totalCommission: isProductAdmin ? null : (canViewCompanyRevenue || isSalesAdmin ? totalCommission : (isSales ? myCommission : null)),
          // Chỉ số riêng của NVKD
          mySales: isSales ? mySales : null,
          myCommission: isSales ? myCommission : null,
          myContractsCount: isSales ? myContracts.length : null,
          activeLocksCount: lockedProducts,
          conversionRate: totalProducts > 0
            ? ((((isDateFiltered ? 0 : depositedProducts) + (isDateFiltered ? filteredContracts.length : soldProducts)) / totalProducts) * 100).toFixed(1)
            : '0'
        },
        // 3 Mẫu Báo Cáo Chuẩn AHS kèm Phân Quyền
        report1_DoanhThu: canViewCompanyRevenue ? {
          isRestricted: false,
          summary: bcDoanhThuSummary,
          data: monthlyRevenue
        } : {
          isRestricted: true,
          message: 'Báo cáo Doanh thu thực tế của công ty chỉ dành riêng cho Ban Lãnh Đạo (Giám Đốc). Quyền hạn của bạn không được phép xem doanh thu công ty.',
          summary: null,
          data: []
        },
        report2_SanPhamDuAn: {
          isRestricted: false,
          summary: bcSanPhamDuAnSummary,
          data: projectSales
        },
        report3_DoanhSoNV: {
          isRestricted: isProductAdmin,
          isScopedToSelf: isSales,
          message: isProductAdmin ? 'Nhân viên Quản lý Sản phẩm tập trung theo dõi Quỹ căn và Bảng hàng dự án.' : undefined,
          summary: bcDoanhSoNVSummary,
          data: displayEmployeePerformance
        },
        leaderboard,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Error generating reports:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
