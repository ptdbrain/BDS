import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sweepExpiredLocks } from '@/lib/locks';
import { ensureDatabaseSeeded } from '@/lib/seedHelper';

export async function GET(request: Request) {
  try {
    await ensureDatabaseSeeded();
    await sweepExpiredLocks();

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const projectIdParam = searchParams.get('projectId');

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
    if (startDateParam || endDateParam) {
      const start = startDateParam ? new Date(startDateParam) : new Date(0);
      const end = endDateParam ? new Date(endDateParam) : new Date(8640000000000000);
      filteredContracts = contracts.filter(c => {
        const d = c.signedDate || c.signedAt || c.createdAt;
        return d && d >= start && d <= end;
      });
    }

    // -------------------------------------------------------------
    // 1. BÁO CÁO 1: BC_DoanhThu (Báo cáo doanh thu theo thời gian)
    // -------------------------------------------------------------
    const totalContractRevenue = filteredContracts.reduce((acc, c) => acc + (c.agreedPrice || c.dealRevenue || 0), 0);
    const totalDepositRevenue = succeededPayments.reduce((acc, p) => acc + p.amount, 0);

    // Group 12 months in 2026
    const monthlyRevenue = [];
    for (let m = 1; m <= 12; m++) {
      const monthStr = `${String(m).padStart(2, '0')}/2026`;
      const monthContracts = filteredContracts.filter(c => {
        const d = c.signedDate || c.signedAt || c.createdAt;
        if (!d) return false;
        const dateObj = new Date(d);
        return dateObj.getFullYear() === 2026 && dateObj.getMonth() + 1 === m;
      });

      const mCount = monthContracts.length;
      const mRevenue = monthContracts.reduce((sum, c) => sum + (c.agreedPrice || c.dealRevenue || 0), 0);
      const mAvg = mCount > 0 ? Math.round(mRevenue / mCount) : 0;
      const mShare = totalContractRevenue > 0 ? (mRevenue / totalContractRevenue) : 0;

      let notes = '';
      if (m === 6) notes = 'Mở bán cao điểm The Vista & LUMIÈRE';
      else if (m === 7) notes = 'Đợt 2 Masteri Grand Coast';
      else if (m === 10) notes = 'Khớp đợt 3 mùa thu';
      else if (m === 12) notes = 'Tổng kết kinh doanh cuối năm';

      monthlyRevenue.push({
        month: monthStr,
        monthNum: m,
        contractsCount: mCount,
        revenue: mRevenue,
        avgContractValue: mAvg,
        revenueShare: mShare,
        notes
      });
    }

    // Summary indicators
    const bcDoanhThuSummary = {
      totalRevenue: totalContractRevenue,
      totalContracts: filteredContracts.length,
      avgContractValue: filteredContracts.length > 0 ? Math.round(totalContractRevenue / filteredContracts.length) : 0,
      companyInfo: {
        name: 'CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN AHS',
        address: 'Tầng 4, Tòa nhà The Legend Tower, số 109 Nguyễn Tuân, Phường Thanh Xuân, Thành phố Hà Nội, Việt Nam',
        phone: '0964960955',
        creator: 'Hoàng Thị Hương Giang',
        createdDate: '03/09/2026',
        period: startDateParam && endDateParam ? `${startDateParam} - ${endDateParam}` : '01/06/2026 - 31/07/2026',
        sourceLink: 'https://ahsproperty.vn/lien-he/'
      }
    };

    // -------------------------------------------------------------
    // 2. BÁO CÁO 2: BC_SanPham_DuAn (Lượng sản phẩm bán theo dự án)
    // -------------------------------------------------------------
    // Ghi chú trong file mẫu Excel: "Sản phẩm có trạng thái 'Đã khớp' được tính vào nhóm đã bán trong báo cáo mẫu"
    const projectSales = projects.map(proj => {
      const prods = proj.products;
      const totalUnits = prods.length;
      const availableUnits = prods.filter(p => p.status === 'AVAILABLE' || p.trangthai === 'Còn hàng').length;
      
      // Sản phẩm đã bán: status 'SOLD' hoặc trạng thái 'Đã khớp' theo ghi chú nghiệp vụ của file mẫu
      const soldUnits = prods.filter(p => p.status === 'SOLD' || p.trangthai === 'Đã khớp' || p.trangthai === 'Đã bán').length;
      const lockedUnits = prods.filter(p => p.status === 'LOCKED' && p.trangthai !== 'Đã khớp').length;
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
    // -------------------------------------------------------------
    const employeePerformance = employees.map(emp => {
      const empContracts = filteredContracts.filter(c => c.salesEmployeeId === emp.id || c.salesEmployee?.employeeCode === emp.employeeCode);
      const eRevenue = empContracts.reduce((sum, c) => sum + (c.agreedPrice || c.dealRevenue || 0), 0);
      const eCommission = empContracts.reduce((sum, c) => sum + (c.commissionAmount || Math.round((c.agreedPrice || 0) * 0.01)), 0);
      const eCount = empContracts.length;
      const eAvg = eCount > 0 ? Math.round(eRevenue / eCount) : 0;

      return {
        employeeId: emp.id,
        maNV: emp.employeeCode || emp.maNV || 'NV',
        fullName: emp.fullName,
        jobTitle: emp.jobTitle,
        departmentName: emp.department?.name || 'Phòng Kinh doanh',
        contractsCount: eCount,
        totalRevenue: eRevenue,
        totalCommission: eCommission,
        avgRevenuePerContract: eAvg
      };
    });

    const bcDoanhSoNVSummary = {
      totalContracts: employeePerformance.reduce((sum, e) => sum + e.contractsCount, 0),
      totalRevenue: employeePerformance.reduce((sum, e) => sum + e.totalRevenue, 0),
      totalCommission: employeePerformance.reduce((sum, e) => sum + e.totalCommission, 0),
      avgRevenuePerContract: employeePerformance.reduce((sum, e) => sum + e.contractsCount, 0) > 0
        ? Math.round(employeePerformance.reduce((sum, e) => sum + e.totalRevenue, 0) / employeePerformance.reduce((sum, e) => sum + e.contractsCount, 0))
        : 0
    };

    // Top Leaderboard sorted by revenue
    const leaderboard = [...employeePerformance]
      .filter(e => e.totalRevenue > 0)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    return NextResponse.json({
      data: {
        kpis: {
          totalProducts,
          availableProducts,
          lockedProducts,
          depositedProducts,
          soldProducts,
          totalDepositRevenue,
          totalContractRevenue,
          activeLocksCount: lockedProducts,
          conversionRate: totalProducts > 0 ? (((depositedProducts + soldProducts) / totalProducts) * 100).toFixed(1) : '0'
        },
        // 3 Mẫu Báo Cáo Chuẩn AHS
        report1_DoanhThu: {
          summary: bcDoanhThuSummary,
          data: monthlyRevenue
        },
        report2_SanPhamDuAn: {
          summary: bcSanPhamDuAnSummary,
          data: projectSales
        },
        report3_DoanhSoNV: {
          summary: bcDoanhSoNVSummary,
          data: employeePerformance
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
