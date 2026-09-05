'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import ExcelJS from 'exceljs';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
  Line,
  ComposedChart
} from 'recharts';
import {
  BarChart3,
  Download,
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  Loader2,
  Building2,
  Users,
  Layers,
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  Building,
  Info,
  ChevronRight
} from 'lucide-react';

interface ReportsDashboardProps {
  reportData: any;
  onRefresh: () => void;
}

export function ReportsDashboard({ reportData, onRefresh }: ReportsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'bc_doanhthu' | 'bc_sanpham_duan' | 'bc_doanhso_nv' | 'kpi_dashboard'>('bc_doanhthu');
  const [startDate, setStartDate] = useState<string>('2026-06-01');
  const [endDate, setEndDate] = useState<string>('2026-07-31');
  const [searchEmployee, setSearchEmployee] = useState<string>('');

  // Internal reactive report data that responds to date filters
  const [currentData, setCurrentData] = useState<any>(reportData);
  const [isLoadingFilter, setIsLoadingFilter] = useState<boolean>(false);

  // Sync when initial prop changes
  useEffect(() => {
    if (reportData) {
      setCurrentData(reportData);
    }
  }, [reportData]);

  // Realtime date for "Ngày lập"
  const [realtimeDate, setRealtimeDate] = useState<string>(() => {
    return new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  });

  // Export loading state
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Fetch report data for given dates
  const fetchFilteredReport = useCallback(async (s?: string, e?: string) => {
    const sDate = s !== undefined ? s : startDate;
    const eDate = e !== undefined ? e : endDate;
    setIsLoadingFilter(true);
    try {
      const params = new URLSearchParams();
      if (sDate) params.append('startDate', sDate);
      if (eDate) params.append('endDate', eDate);
      const res = await fetch(`/api/v1/reports/dashboard?${params.toString()}`);
      const json = await res.json();
      if (json.data) {
        setCurrentData(json.data);
      }
    } catch (err) {
      console.error('Lỗi khi lọc số liệu báo cáo:', err);
    } finally {
      setIsLoadingFilter(false);
    }
  }, [startDate, endDate]);

  // Automatically trigger report refetch whenever startDate or endDate changes
  useEffect(() => {
    fetchFilteredReport(startDate, endDate);
  }, [startDate, endDate, fetchFilteredReport]);

  // Calculate formatted period for "Thời gian thống kê"
  const formattedPeriod = useMemo(() => {
    if (!startDate && !endDate) return 'Tất cả thời gian';
    if (!startDate) return `Đến ${endDate}`;
    if (!endDate) return `Từ ${startDate}`;
    try {
      const [sy, sm, sd] = startDate.split('-');
      const [ey, em, ed] = endDate.split('-');
      return `${sd}/${sm}/${sy} - ${ed}/${em}/${ey}`;
    } catch (e) {
      return `${startDate} - ${endDate}`;
    }
  }, [startDate, endDate]);

  const report1 = currentData?.report1_DoanhThu || {
    summary: {
      totalRevenue: 249474779035,
      totalContracts: 24,
      avgContractValue: 10394782460,
      companyInfo: {
        name: 'CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN AHS',
        address: 'Tầng 4, Tòa nhà The Legend Tower, số 109 Nguyễn Tuân, Phường Thanh Xuân, Thành phố Hà Nội, Việt Nam',
        phone: '0964960955',
        creator: 'Hoàng Thị Hương Giang',
        createdDate: realtimeDate,
        period: formattedPeriod,
        sourceLink: 'https://ahsproperty.vn/lien-he/'
      }
    },
    data: []
  };

  const report2 = currentData?.report2_SanPhamDuAn || {
    summary: {
      totalUnits: 219,
      availableUnits: 79,
      lockedUnits: 0,
      soldUnits: 46,
      totalSoldRate: '21.00%'
    },
    data: []
  };

  const report3 = currentData?.report3_DoanhSoNV || {
    summary: {
      totalContracts: 24,
      totalRevenue: 249474779035,
      totalCommission: 2494747791,
      avgRevenuePerContract: 10394782460
    },
    data: []
  };

  const kpis = currentData?.kpis || {
    totalProducts: 219,
    availableProducts: 79,
    lockedProducts: 0,
    depositedProducts: 8,
    soldProducts: 46,
    totalDepositRevenue: 2400000000,
    totalContractRevenue: 249474779035,
    conversionRate: '21.0'
  };

  const company = report1.summary.companyInfo;

  // Format currency VND
  const formatVND = (amount: number) => {
    return Number(amount || 0).toLocaleString('vi-VN') + ' đ';
  };

  // Format billions VND
  const formatBillion = (amount: number) => {
    return (Number(amount || 0) / 1000000000).toFixed(2) + ' Tỷ';
  };

  // Filtered employees in report 3
  const filteredEmployees = useMemo(() => {
    const list = report3.data || [];
    if (!searchEmployee.trim()) return list;
    const q = searchEmployee.toLowerCase();
    return list.filter((e: any) =>
      e.fullName?.toLowerCase().includes(q) ||
      e.maNV?.toLowerCase().includes(q) ||
      e.jobTitle?.toLowerCase().includes(q)
    );
  }, [report3.data, searchEmployee]);

  // Chart data for Report 1 (Monthly Revenue)
  const monthlyChartData = useMemo(() => {
    return (report1.data || []).map((m: any) => ({
      month: m.month,
      revenueBillion: Number((m.revenue / 1000000000).toFixed(2)),
      contracts: m.contractsCount
    }));
  }, [report1.data]);

  // Chart data for Report 2 (Project Sales)
  const projectChartData = useMemo(() => {
    return (report2.data || [])
      .filter((p: any) => p.totalUnits > 0)
      .map((p: any) => ({
        name: p.maDA,
        fullName: p.tenDA,
        total: p.totalUnits,
        sold: p.soldUnits,
        available: p.availableUnits,
        ratePercent: Number((p.soldRate * 100).toFixed(1))
      }));
  }, [report2.data]);

  // Chart data for Report 3 (Top Employees)
  const employeeChartData = useMemo(() => {
    return (report3.data || [])
      .filter((e: any) => e.totalRevenue > 0)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 8)
      .map((e: any) => ({
        name: e.fullName.split(' ').slice(-2).join(' '),
        fullName: e.fullName,
        revenueBillion: Number((e.totalRevenue / 1000000000).toFixed(2)),
        contracts: e.contractsCount
      }));
  }, [report3.data]);

  // Pie chart data
  const pieData = [
    { name: 'Còn Hàng', value: report2.summary.availableUnits || 79, color: '#10b981' },
    { name: 'Đang Lock 30m', value: report2.summary.lockedUnits || 0, color: '#f59e0b' },
    { name: 'Đã Bán / Khớp', value: report2.summary.soldUnits || 46, color: '#8b5cf6' }
  ];

  // -------------------------------------------------------------
  // EXCEL EXPORTER (.XLSX) WITH BEAUTIFUL CELL FORMATTING & COLORS
  // -------------------------------------------------------------
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const wb = new ExcelJS.Workbook();
      wb.creator = 'CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN AHS';
      wb.lastModifiedBy = company.creator || 'AHS Admin';
      wb.created = new Date();
      wb.modified = new Date();

      // Shared Styling Constants
      const companyTitleFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1E3A8A' } };
      const companySubtitleFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF475569' } };
      const bannerTitleFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
      const bannerSubtitleFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF334155' } };
      const tableHeaderFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
      const dataCellFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, color: { argb: 'FF1E293B' } };
      const dataCellBoldFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      const totalCellFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF92400E' } };
      const footerFont: Partial<ExcelJS.Font> = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF64748B' } };

      const fillNavyHeader: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      const fillTealHeader: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
      const fillBannerNavy: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      const fillBannerTeal: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF115E59' } };
      const fillBannerSub: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      const fillTotalAmber: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      const fillZebraWhite: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
      const fillZebraTint: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };

      const thinBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      const headerBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
        left: { style: 'thin', color: { argb: 'FF93C5FD' } },
        right: { style: 'thin', color: { argb: 'FF93C5FD' } }
      };

      const totalBorder: Partial<ExcelJS.Borders> = {
        top: { style: 'thin', color: { argb: 'FFB45309' } },
        bottom: { style: 'double', color: { argb: 'FFB45309' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      // ==========================================
      // SHEET 1: BC_DoanhThu
      // ==========================================
      const ws1 = wb.addWorksheet('BC_DoanhThu', {
        views: [{ showGridLines: true }]
      });

      ws1.columns = [
        { key: 'c1', width: 16 },
        { key: 'c2', width: 18 },
        { key: 'c3', width: 26 },
        { key: 'c4', width: 26 },
        { key: 'c5', width: 16 },
        { key: 'c6', width: 36 }
      ];

      // Company info
      const r1_1 = ws1.addRow(['CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN AHS']);
      r1_1.font = companyTitleFont;
      r1_1.height = 22;

      const r1_2 = ws1.addRow(['Địa chỉ: Tầng 4, Tòa nhà The Legend Tower, số 109 Nguyễn Tuân, Phường Thanh Xuân, Hà Nội']);
      r1_2.font = companySubtitleFont;
      r1_2.height = 18;

      const r1_3 = ws1.addRow(['Hotline: 0964 960 955  |  Website: https://ahsproperty.vn  |  Phạm vi: Toàn quốc']);
      r1_3.font = companySubtitleFont;
      r1_3.height = 18;

      ws1.addRow([]); // Blank line

      // Report Banner
      const bRow1_5 = ws1.addRow(['BÁO CÁO DOANH THU THEO THỜI GIAN']);
      bRow1_5.height = 30;
      ws1.mergeCells('A5:F5');
      const bannerCell1 = ws1.getCell('A5');
      bannerCell1.fill = fillBannerNavy;
      bannerCell1.font = bannerTitleFont;
      bannerCell1.alignment = { horizontal: 'center', vertical: 'middle' };

      const bRow1_6 = ws1.addRow([`Kỳ thống kê: ${company.period}   |   Người lập: ${company.creator}   |   Ngày lập: ${company.createdDate}`]);
      bRow1_6.height = 22;
      ws1.mergeCells('A6:F6');
      const subBannerCell1 = ws1.getCell('A6');
      subBannerCell1.fill = fillBannerSub;
      subBannerCell1.font = bannerSubtitleFont;
      subBannerCell1.alignment = { horizontal: 'center', vertical: 'middle' };

      ws1.addRow([]); // Blank line

      // Table Header
      const hRow1 = ws1.addRow([
        'Tháng',
        'Số hợp đồng',
        'Doanh thu (VNĐ)',
        'Giá trị HĐ TB (VNĐ)',
        'Tỷ trọng DT',
        'Ghi chú'
      ]);
      hRow1.height = 28;
      hRow1.eachCell((cell) => {
        cell.fill = fillNavyHeader;
        cell.font = tableHeaderFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = headerBorder;
      });

      // Data Rows
      (report1.data || []).forEach((m: any, idx: number) => {
        const row = ws1.addRow([
          m.month,
          Number(m.contractsCount) || 0,
          Number(m.revenue) || 0,
          Number(m.avgContractValue) || 0,
          Number(m.revenueShare) || 0,
          m.notes || ''
        ]);
        row.height = 23;
        const isOdd = idx % 2 === 1;
        const currentFill = isOdd ? fillZebraTint : fillZebraWhite;

        // Cell 1: Month
        const c1 = row.getCell(1);
        c1.alignment = { horizontal: 'center', vertical: 'middle' };
        c1.font = dataCellBoldFont;

        // Cell 2: Contract Count
        const c2 = row.getCell(2);
        c2.alignment = { horizontal: 'right', vertical: 'middle' };
        c2.numFmt = '#,##0';
        c2.font = dataCellFont;

        // Cell 3: Revenue
        const c3 = row.getCell(3);
        c3.alignment = { horizontal: 'right', vertical: 'middle' };
        c3.numFmt = '#,##0 "₫"';
        c3.font = dataCellBoldFont;

        // Cell 4: Avg Contract Value
        const c4 = row.getCell(4);
        c4.alignment = { horizontal: 'right', vertical: 'middle' };
        c4.numFmt = '#,##0 "₫"';
        c4.font = dataCellFont;

        // Cell 5: Revenue Share
        const c5 = row.getCell(5);
        c5.alignment = { horizontal: 'right', vertical: 'middle' };
        c5.numFmt = '0.0%';
        c5.font = dataCellFont;

        // Cell 6: Notes
        const c6 = row.getCell(6);
        c6.alignment = { horizontal: 'left', vertical: 'middle' };
        c6.font = dataCellFont;

        row.eachCell((cell) => {
          cell.fill = currentFill;
          cell.border = thinBorder;
        });
      });

      // Total Row
      const totRow1 = ws1.addRow([
        'TỔNG CỘNG',
        Number(report1.summary.totalContracts) || 0,
        Number(report1.summary.totalRevenue) || 0,
        Number(report1.summary.avgContractValue) || 0,
        1,
        ''
      ]);
      totRow1.height = 26;
      totRow1.eachCell((cell, colNumber) => {
        cell.fill = fillTotalAmber;
        cell.font = totalCellFont;
        cell.border = totalBorder;
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 2) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (colNumber === 3 || colNumber === 4) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0 "₫"';
        } else if (colNumber === 5) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '0.0%';
        } else {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        }
      });

      // Footer
      ws1.addRow([]);
      const f1_1 = ws1.addRow(['* Báo cáo được tạo tự động từ Hệ thống Quản trị & Phân phối Bất động sản AHS.']);
      f1_1.font = footerFont;
      const f1_2 = ws1.addRow(['* Nguồn thông tin liên hệ doanh nghiệp: https://ahsproperty.vn/lien-he/']);
      f1_2.font = footerFont;

      // ==========================================
      // SHEET 2: BC_SanPham_DuAn
      // ==========================================
      const ws2 = wb.addWorksheet('BC_SanPham_DuAn', {
        views: [{ showGridLines: true }]
      });

      ws2.columns = [
        { key: 'c1', width: 16 },
        { key: 'c2', width: 34 },
        { key: 'c3', width: 18 },
        { key: 'c4', width: 16 },
        { key: 'c5', width: 16 },
        { key: 'c6', width: 16 },
        { key: 'c7', width: 16 }
      ];

      // Company info
      const r2_1 = ws2.addRow(['CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN AHS']);
      r2_1.font = companyTitleFont;
      r2_1.height = 22;

      const r2_2 = ws2.addRow(['Địa chỉ: Tầng 4, Tòa nhà The Legend Tower, số 109 Nguyễn Tuân, Phường Thanh Xuân, Hà Nội']);
      r2_2.font = companySubtitleFont;
      r2_2.height = 18;

      const r2_3 = ws2.addRow(['Hotline: 0964 960 955  |  Website: https://ahsproperty.vn  |  Phạm vi: Toàn quốc']);
      r2_3.font = companySubtitleFont;
      r2_3.height = 18;

      ws2.addRow([]); // Blank line

      // Report Banner
      const bRow2_5 = ws2.addRow(['BÁO CÁO LƯỢNG SẢN PHẨM BÁN THEO DỰ ÁN']);
      bRow2_5.height = 30;
      ws2.mergeCells('A5:G5');
      const bannerCell2 = ws2.getCell('A5');
      bannerCell2.fill = fillBannerTeal;
      bannerCell2.font = bannerTitleFont;
      bannerCell2.alignment = { horizontal: 'center', vertical: 'middle' };

      const bRow2_6 = ws2.addRow([`Thời gian thống kê: Tính đến ngày ${company.createdDate}   |   Người lập: ${company.creator}`]);
      bRow2_6.height = 22;
      ws2.mergeCells('A6:G6');
      const subBannerCell2 = ws2.getCell('A6');
      subBannerCell2.fill = fillBannerSub;
      subBannerCell2.font = bannerSubtitleFont;
      subBannerCell2.alignment = { horizontal: 'center', vertical: 'middle' };

      ws2.addRow([]); // Blank line

      // Table Header
      const hRow2 = ws2.addRow([
        'Mã dự án',
        'Tên dự án',
        'Tổng sản phẩm',
        'Còn hàng',
        'Đang lock',
        'Đã bán',
        'Tỷ lệ bán'
      ]);
      hRow2.height = 28;
      hRow2.eachCell((cell) => {
        cell.fill = fillTealHeader;
        cell.font = tableHeaderFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = headerBorder;
      });

      // Data Rows
      (report2.data || []).forEach((p: any, idx: number) => {
        const row = ws2.addRow([
          p.maDA,
          p.tenDA,
          Number(p.totalUnits) || 0,
          Number(p.availableUnits) || 0,
          Number(p.lockedUnits) || 0,
          Number(p.soldUnits) || 0,
          Number(p.soldRate) || 0
        ]);
        row.height = 23;
        const isOdd = idx % 2 === 1;
        const currentFill = isOdd ? fillZebraTint : fillZebraWhite;

        // Cell 1: Project Code
        const c1 = row.getCell(1);
        c1.alignment = { horizontal: 'center', vertical: 'middle' };
        c1.font = dataCellBoldFont;

        // Cell 2: Project Name
        const c2 = row.getCell(2);
        c2.alignment = { horizontal: 'left', vertical: 'middle' };
        c2.font = dataCellFont;

        // Cells 3-6: Numbers
        for (let i = 3; i <= 6; i++) {
          const c = row.getCell(i);
          c.alignment = { horizontal: 'right', vertical: 'middle' };
          c.numFmt = '#,##0';
          c.font = i === 6 ? dataCellBoldFont : dataCellFont;
        }

        // Cell 7: Rate
        const c7 = row.getCell(7);
        c7.alignment = { horizontal: 'right', vertical: 'middle' };
        c7.numFmt = '0.0%';
        c7.font = dataCellBoldFont;

        row.eachCell((cell) => {
          cell.fill = currentFill;
          cell.border = thinBorder;
        });
      });

      // Total Row
      const totSoldRate = report2.summary.totalUnits > 0
        ? (report2.summary.soldUnits / report2.summary.totalUnits)
        : 0;

      const totRow2 = ws2.addRow([
        'TỔNG CỘNG',
        '',
        Number(report2.summary.totalUnits) || 0,
        Number(report2.summary.availableUnits) || 0,
        Number(report2.summary.lockedUnits) || 0,
        Number(report2.summary.soldUnits) || 0,
        totSoldRate
      ]);
      totRow2.height = 26;
      totRow2.eachCell((cell, colNumber) => {
        cell.fill = fillTotalAmber;
        cell.font = totalCellFont;
        cell.border = totalBorder;
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 2) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (colNumber >= 3 && colNumber <= 6) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else if (colNumber === 7) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '0.0%';
        }
      });

      // Footer
      ws2.addRow([]);
      const f2_1 = ws2.addRow(['* Ghi chú: Dự án chưa có quỹ sản phẩm sẽ hiển thị tổng sản phẩm = 0. Sản phẩm có trạng thái “Đã khớp” hoặc “Đã bán” được tính vào nhóm đã bán.']);
      f2_1.font = footerFont;
      const f2_2 = ws2.addRow(['* Nguồn thông tin liên hệ doanh nghiệp: https://ahsproperty.vn/lien-he/']);
      f2_2.font = footerFont;

      // ==========================================
      // SHEET 3: BC_DoanhSo_NV
      // ==========================================
      const ws3 = wb.addWorksheet('BC_DoanhSo_NV', {
        views: [{ showGridLines: true }]
      });

      ws3.columns = [
        { key: 'c1', width: 14 },
        { key: 'c2', width: 28 },
        { key: 'c3', width: 24 },
        { key: 'c4', width: 16 },
        { key: 'c5', width: 26 },
        { key: 'c6', width: 24 },
        { key: 'c7', width: 24 }
      ];

      // Company info
      const r3_1 = ws3.addRow(['CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN AHS']);
      r3_1.font = companyTitleFont;
      r3_1.height = 22;

      const r3_2 = ws3.addRow(['Địa chỉ: Tầng 4, Tòa nhà The Legend Tower, số 109 Nguyễn Tuân, Phường Thanh Xuân, Hà Nội']);
      r3_2.font = companySubtitleFont;
      r3_2.height = 18;

      const r3_3 = ws3.addRow(['Hotline: 0964 960 955  |  Website: https://ahsproperty.vn  |  Phạm vi: Toàn quốc']);
      r3_3.font = companySubtitleFont;
      r3_3.height = 18;

      ws3.addRow([]); // Blank line

      // Report Banner
      const bRow3_5 = ws3.addRow(['BÁO CÁO DOANH SỐ THEO NHÂN VIÊN']);
      bRow3_5.height = 30;
      ws3.mergeCells('A5:G5');
      const bannerCell3 = ws3.getCell('A5');
      bannerCell3.fill = fillBannerNavy;
      bannerCell3.font = bannerTitleFont;
      bannerCell3.alignment = { horizontal: 'center', vertical: 'middle' };

      const bRow3_6 = ws3.addRow([`Kỳ thống kê: ${company.period}   |   Người lập: ${company.creator}   |   Ngày lập: ${company.createdDate}`]);
      bRow3_6.height = 22;
      ws3.mergeCells('A6:G6');
      const subBannerCell3 = ws3.getCell('A6');
      subBannerCell3.fill = fillBannerSub;
      subBannerCell3.font = bannerSubtitleFont;
      subBannerCell3.alignment = { horizontal: 'center', vertical: 'middle' };

      ws3.addRow([]); // Blank line

      // Table Header
      const hRow3 = ws3.addRow([
        'Mã NV',
        'Họ tên nhân viên',
        'Chức vụ',
        'Số hợp đồng',
        'Tổng doanh số (VNĐ)',
        'Tổng hoa hồng (VNĐ)',
        'Doanh số / HĐ (VNĐ)'
      ]);
      hRow3.height = 28;
      hRow3.eachCell((cell) => {
        cell.fill = fillNavyHeader;
        cell.font = tableHeaderFont;
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = headerBorder;
      });

      // Data Rows
      (report3.data || []).forEach((e: any, idx: number) => {
        const row = ws3.addRow([
          e.maNV,
          e.fullName,
          e.jobTitle,
          Number(e.contractsCount) || 0,
          Number(e.totalRevenue) || 0,
          Number(e.totalCommission) || 0,
          Number(e.avgRevenuePerContract) || 0
        ]);
        row.height = 23;
        const isOdd = idx % 2 === 1;
        const currentFill = isOdd ? fillZebraTint : fillZebraWhite;

        // Cell 1: Employee Code
        const c1 = row.getCell(1);
        c1.alignment = { horizontal: 'center', vertical: 'middle' };
        c1.font = dataCellBoldFont;

        // Cell 2: Name
        const c2 = row.getCell(2);
        c2.alignment = { horizontal: 'left', vertical: 'middle' };
        c2.font = dataCellBoldFont;

        // Cell 3: Job Title
        const c3 = row.getCell(3);
        c3.alignment = { horizontal: 'left', vertical: 'middle' };
        c3.font = dataCellFont;

        // Cell 4: Contracts Count
        const c4 = row.getCell(4);
        c4.alignment = { horizontal: 'right', vertical: 'middle' };
        c4.numFmt = '#,##0';
        c4.font = dataCellFont;

        // Cell 5: Total Revenue
        const c5 = row.getCell(5);
        c5.alignment = { horizontal: 'right', vertical: 'middle' };
        c5.numFmt = '#,##0 "₫"';
        c5.font = dataCellBoldFont;

        // Cell 6: Total Commission (Emerald green accent)
        const c6 = row.getCell(6);
        c6.alignment = { horizontal: 'right', vertical: 'middle' };
        c6.numFmt = '#,##0 "₫"';
        c6.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF047857' } };

        // Cell 7: Avg Revenue Per Contract
        const c7 = row.getCell(7);
        c7.alignment = { horizontal: 'right', vertical: 'middle' };
        c7.numFmt = '#,##0 "₫"';
        c7.font = dataCellFont;

        row.eachCell((cell) => {
          cell.fill = currentFill;
          cell.border = thinBorder;
        });
      });

      // Total Row
      const totRow3 = ws3.addRow([
        'TỔNG CỘNG',
        '',
        '',
        Number(report3.summary.totalContracts) || 0,
        Number(report3.summary.totalRevenue) || 0,
        Number(report3.summary.totalCommission) || 0,
        Number(report3.summary.avgRevenuePerContract) || 0
      ]);
      totRow3.height = 26;
      totRow3.eachCell((cell, colNumber) => {
        cell.fill = fillTotalAmber;
        cell.font = totalCellFont;
        cell.border = totalBorder;
        if (colNumber === 1) {
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        } else if (colNumber === 2 || colNumber === 3) {
          cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else if (colNumber === 4) {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0';
        } else {
          cell.alignment = { horizontal: 'right', vertical: 'middle' };
          cell.numFmt = '#,##0 "₫"';
        }
      });

      // Footer
      ws3.addRow([]);
      const f3_1 = ws3.addRow(['* Báo cáo đánh giá năng suất kinh doanh & tỷ lệ chuyển đổi nhân viên phòng kinh doanh AHS.']);
      f3_1.font = footerFont;
      const f3_2 = ws3.addRow(['* Nguồn thông tin liên hệ doanh nghiệp: https://ahsproperty.vn/lien-he/']);
      f3_2.font = footerFont;

      // ==========================================
      // WRITE AND DOWNLOAD FILE
      // ==========================================
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Mau_3_Bao_Cao_AHS_${Date.now()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Lỗi khi xuất file Excel:', error);
      alert('Có lỗi xảy ra khi tạo file Excel. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* 1. Header Banner Doanh Nghiệp AHS Chuẩn */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900/95 via-slate-900/80 to-slate-950 p-6 md:p-8 shadow-2xl backdrop-blur-2xl">
        {/* Ambient Glow Effects */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-brand-500/15 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <div className="px-3 py-1 rounded-xl bg-gradient-to-r from-brand-500/20 to-emerald-500/20 text-brand-400 font-mono text-xs font-black border border-brand-500/40 shadow-sm flex items-center space-x-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-400" />
                <span>AHS PROPERTY</span>
              </div>
              <span className="text-xs font-medium text-slate-400 tracking-wide">Hệ Thống Báo Cáo & Quản Trị Bất Động Sản Chuẩn Doanh Nghiệp</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300 uppercase">
              {company.name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-slate-400">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-300">
                <span>📍</span>
                <span>{company.address}</span>
              </span>
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-300">
                <span>☎️</span>
                <span>Hotline: <strong className="text-brand-400 font-semibold">{company.phone}</strong></span>
              </span>
              <a
                href={company.sourceLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-950/70 border border-slate-800/80 hover:border-brand-500/40 text-slate-300 hover:text-brand-300 transition"
              >
                <span>🌐</span>
                <span>{company.sourceLink}</span>
              </a>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                fetchFilteredReport(startDate, endDate);
                onRefresh();
              }}
              disabled={isLoadingFilter}
              className="p-3 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-slate-300 hover:text-white hover:border-brand-500/50 hover:bg-slate-800 shadow-lg transition active:scale-95 disabled:opacity-60"
              title="Làm mới số liệu"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingFilter ? 'animate-spin text-brand-400' : ''}`} />
            </button>

            <button
              onClick={handleExportExcel}
              disabled={isExporting}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white text-xs font-bold shadow-xl shadow-emerald-600/25 hover:shadow-emerald-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center space-x-2 transition border border-emerald-400/30 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang xuất Excel...</span>
                </>
              ) : (
                <>
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Xuất Excel (.xlsx)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Thông tin lập báo cáo toolbar */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl">
              <span className="text-slate-500">Người lập:</span>
              <span className="font-bold text-slate-100">{company.creator}</span>
            </div>

            {/* Ngày lập - Realtime Indicator */}
            <div className="flex items-center space-x-2.5 bg-slate-950/70 border border-slate-800 px-3.5 py-2 rounded-xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              <span className="text-slate-500">Ngày lập:</span>
              <span className="font-extrabold text-white tracking-wide">{realtimeDate}</span>
              <span className="text-[10px] text-emerald-400 font-black px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/30 uppercase tracking-wider">
                Realtime
              </span>
            </div>
          </div>

          {/* Thời gian thống kê - Interactive Date Picker (Từ ngày -> Đến ngày) */}
          <div className="flex flex-wrap items-center gap-3 bg-slate-950/85 border border-slate-800 px-4 py-2 rounded-2xl shadow-inner">
            <div className="flex items-center space-x-2 text-brand-400 font-bold text-xs">
              <Calendar className="w-4 h-4 text-brand-400" />
              <span>Thời gian thống kê:</span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500 text-[11px] font-medium">Từ</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-900 border border-slate-700/90 hover:border-brand-500/80 rounded-xl px-3 py-1.5 text-xs text-brand-300 font-bold focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition cursor-pointer"
                title="Chọn ngày bắt đầu"
              />
              <span className="text-brand-400 font-black text-sm">➔</span>
              <span className="text-slate-500 text-[11px] font-medium">Đến</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-900 border border-slate-700/90 hover:border-brand-500/80 rounded-xl px-3 py-1.5 text-xs text-brand-300 font-bold focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition cursor-pointer"
                title="Chọn ngày kết thúc"
              />
            </div>

            {/* Quick preset buttons */}
            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <button
                type="button"
                onClick={() => { setStartDate('2026-06-01'); setEndDate('2026-06-30'); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  startDate === '2026-06-01' && endDate === '2026-06-30'
                    ? 'bg-brand-500/25 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                T6/2026
              </button>
              <button
                type="button"
                onClick={() => { setStartDate('2026-07-01'); setEndDate('2026-07-31'); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  startDate === '2026-07-01' && endDate === '2026-07-31'
                    ? 'bg-brand-500/25 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                T7/2026
              </button>
              <button
                type="button"
                onClick={() => { setStartDate('2026-06-01'); setEndDate('2026-07-31'); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  startDate === '2026-06-01' && endDate === '2026-07-31'
                    ? 'bg-brand-500/25 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                T6 - T7
              </button>
              <button
                type="button"
                onClick={() => { setStartDate('2026-01-01'); setEndDate('2026-12-31'); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  startDate === '2026-01-01' && endDate === '2026-12-31'
                    ? 'bg-brand-500/25 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Cả năm
              </button>
              <button
                type="button"
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                  !startDate && !endDate
                    ? 'bg-brand-500/25 text-brand-300 border border-brand-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Tất cả
              </button>
            </div>

            {/* Filter action button */}
            <button
              type="button"
              onClick={() => fetchFilteredReport(startDate, endDate)}
              disabled={isLoadingFilter}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 to-blue-600 hover:from-brand-500 hover:to-blue-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow-md shadow-brand-500/20 transition active:scale-95 disabled:opacity-60"
            >
              {isLoadingFilter ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lọc...</span>
                </>
              ) : (
                <>
                  <Filter className="w-3.5 h-3.5" />
                  <span>Lọc số liệu</span>
                </>
              )}
            </button>

            {/* Indicator badge showing matching contracts */}
            <div className="hidden xl:flex items-center space-x-1.5 text-xs text-slate-400 pl-2 border-l border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Tìm thấy: <strong className="text-white font-bold">{report1.summary.totalContracts}</strong> HĐ ({formatVND(report1.summary.totalRevenue)})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs - 3 Mẫu Báo Cáo + KPI Dashboard */}
      <div className="p-1.5 bg-slate-900/90 border border-slate-800/90 rounded-2xl flex flex-wrap gap-1.5 shadow-xl backdrop-blur-xl">
        <button
          onClick={() => setActiveTab('bc_doanhthu')}
          className={`flex items-center space-x-2.5 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'bc_doanhthu'
              ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-lg shadow-brand-500/25 border border-brand-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>1. Báo Cáo Doanh Thu (BC_DoanhThu)</span>
        </button>

        <button
          onClick={() => setActiveTab('bc_sanpham_duan')}
          className={`flex items-center space-x-2.5 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'bc_sanpham_duan'
              ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-lg shadow-brand-500/25 border border-brand-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2. Sản Phẩm Bán Theo Dự Án (BC_SanPham_DuAn)</span>
        </button>

        <button
          onClick={() => setActiveTab('bc_doanhso_nv')}
          className={`flex items-center space-x-2.5 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'bc_doanhso_nv'
              ? 'bg-gradient-to-r from-brand-600 to-blue-600 text-white shadow-lg shadow-brand-500/25 border border-brand-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. Doanh Số Theo Nhân Viên (BC_DoanhSo_NV)</span>
        </button>

        <button
          onClick={() => setActiveTab('kpi_dashboard')}
          className={`flex items-center space-x-2.5 px-5 py-3 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'kpi_dashboard'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Tổng Quan KPI & Biểu Đồ</span>
        </button>
      </div>

      {/* Content wrapper with loading transition */}
      <div className={`transition-opacity duration-300 ${isLoadingFilter ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
        {/* ============================================================= */}
        {/* TAB 1: BÁO CÁO DOANH THU THEO THỜI GIAN (BC_DOANHTHU)           */}
        {/* ============================================================= */}
        {activeTab === 'bc_doanhthu' && (
          <div className="space-y-6">
          {/* KPI Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900/80 to-slate-900/90 p-6 shadow-xl backdrop-blur-xl group hover:border-emerald-500/50 transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Tổng Doanh Thu Hợp Đồng</span>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-2 tracking-tight">
                {formatVND(report1.summary.totalRevenue)}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                <span>Tương đương:</span>
                <span className="font-bold text-emerald-300 font-mono">~ {formatBillion(report1.summary.totalRevenue)}</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-950/30 via-slate-900/80 to-slate-900/90 p-6 shadow-xl backdrop-blur-xl group hover:border-blue-500/50 transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-400"></div>
              <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest">Tổng Số Hợp Đồng Đã Ký</span>
              <div className="text-3xl font-black text-white font-mono mt-2 tracking-tight flex items-baseline space-x-2">
                <span>{report1.summary.totalContracts}</span>
                <span className="text-sm font-medium text-slate-400">Hợp đồng</span>
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                <span>Tỷ lệ khớp:</span>
                <span className="font-bold text-blue-300">100% khớp căn & cọc</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-slate-900/80 to-slate-900/90 p-6 shadow-xl backdrop-blur-xl group hover:border-purple-500/50 transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-400"></div>
              <span className="text-[11px] font-black text-purple-400 uppercase tracking-widest">Giá Trị HĐ Bình Quân</span>
              <div className="text-3xl font-black text-purple-300 font-mono mt-2 tracking-tight">
                {formatVND(report1.summary.avgContractValue)}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                <span>Mức trung bình:</span>
                <span className="font-bold text-purple-300 font-mono">~ {formatBillion(report1.summary.avgContractValue)} / HĐ</span>
              </div>
            </div>
          </div>

          {/* Biểu đồ Doanh thu & Hợp đồng theo tháng */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Biểu Đồ Doanh Thu & Số Hợp Đồng 12 Tháng Năm 2026
                </h3>
                <p className="text-xs text-slate-400">Phân bổ doanh số thực tế từ Hợp đồng mua bán</p>
              </div>
              <div className="flex items-center space-x-4 text-xs">
                <span className="flex items-center space-x-1 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span>
                  <span>Doanh thu (Tỷ VND)</span>
                </span>
                <span className="flex items-center space-x-1 text-amber-400">
                  <span className="w-3 h-3 rounded-full bg-amber-400"></span>
                  <span>Số hợp đồng</span>
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                  <YAxis yAxisId="left" stroke="#10b981" fontSize={11} tickFormatter={(val) => `${val} Tỷ`} />
                  <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" fontSize={11} tickFormatter={(val) => `${val} HĐ`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: any, name: any) => [name === 'revenueBillion' ? `${val} Tỷ VND` : `${val} HĐ`, name === 'revenueBillion' ? 'Doanh thu' : 'Số HĐ']}
                  />
                  <Bar yAxisId="left" dataKey="revenueBillion" fill="#10b981" radius={[6, 6, 0, 0]} />
                  <Line yAxisId="right" type="monotone" dataKey="contracts" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5, fill: '#f59e0b' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bảng Dữ Liệu Chi Tiết Chuẩn Mẫu BC_DoanhThu */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  BÁO CÁO DOANH THU THEO THÁNG (BC_DOANHTHU)
                </h4>
                <p className="text-[11px] text-slate-400">Tổng hợp doanh thu từ hợp đồng theo tháng</p>
              </div>
              <span className="text-xs font-mono font-bold text-brand-400">Năm 2026</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Tháng</th>
                    <th className="p-3.5 text-right">Số Hợp Đồng</th>
                    <th className="p-3.5 text-right">Doanh Thu (VND)</th>
                    <th className="p-3.5 text-right">Giá Trị HĐ Bình Quân (VND)</th>
                    <th className="p-3.5 text-right">Tỷ Trọng DT (%)</th>
                    <th className="p-3.5">Ghi Chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {(report1.data || []).map((m: any) => (
                    <tr key={m.month} className={`hover:bg-slate-800/40 transition ${m.revenue > 0 ? 'bg-slate-900/30' : ''}`}>
                      <td className="p-3.5 font-bold text-white font-mono">{m.month}</td>
                      <td className="p-3.5 text-right font-mono font-semibold text-slate-200">
                        {m.contractsCount}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                        {formatVND(m.revenue)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-300">
                        {formatVND(m.avgContractValue)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-cyan-400 font-semibold">
                        {(m.revenueShare * 100).toFixed(2)}%
                      </td>
                      <td className="p-3.5 text-slate-400 text-[11px] italic">
                        {m.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900/90 font-black border-t-2 border-slate-700 text-white">
                  <tr>
                    <td className="p-4 uppercase text-brand-400">TỔNG CỘNG</td>
                    <td className="p-4 text-right font-mono text-amber-400 text-sm">
                      {report1.summary.totalContracts}
                    </td>
                    <td className="p-4 text-right font-mono text-emerald-400 text-sm">
                      {formatVND(report1.summary.totalRevenue)}
                    </td>
                    <td className="p-4 text-right font-mono text-purple-300">
                      {formatVND(report1.summary.avgContractValue)}
                    </td>
                    <td className="p-4 text-right font-mono text-cyan-400">
                      100.00%
                    </td>
                    <td className="p-4 text-slate-500 text-[11px]">Toàn hệ thống</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 2: LƯỢNG SẢN PHẨM BÁN THEO DỰ ÁN (BC_SANPHAM_DUAN)         */}
      {/* ============================================================= */}
      {activeTab === 'bc_sanpham_duan' && (
        <div className="space-y-6">
          {/* KPI Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5 shadow-xl backdrop-blur-xl group hover:border-slate-700 transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-500 to-slate-400"></div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Tổng Sản Phẩm Toàn Quỹ</span>
              <div className="text-3xl font-black text-white font-mono mt-2 tracking-tight">
                {report2.summary.totalUnits} <span className="text-xs text-slate-400 font-normal">căn</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-2">Gồm 6 dự án chiến lược</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900/80 to-slate-950 p-5 shadow-xl backdrop-blur-xl group hover:border-emerald-500/50 transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">Còn Hàng Mở Bán</span>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-2 tracking-tight">
                {report2.summary.availableUnits} <span className="text-xs text-emerald-300/70 font-normal">căn</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Sẵn sàng phân phối & cọc</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-slate-900/80 to-slate-950 p-5 shadow-xl backdrop-blur-xl group hover:border-purple-500/50 transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-400"></div>
              <span className="text-[11px] font-black text-purple-400 uppercase tracking-wider">Đã Bán & Đã Khớp</span>
              <div className="text-3xl font-black text-purple-300 font-mono mt-2 tracking-tight">
                {report2.summary.soldUnits} <span className="text-xs text-purple-300/70 font-normal">căn</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Đã thanh toán cọc & ký HĐ</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-slate-900/80 to-slate-950 p-5 shadow-xl backdrop-blur-xl group hover:border-cyan-500/50 transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-400"></div>
              <span className="text-[11px] font-black text-cyan-400 uppercase tracking-wider">Tỷ Lệ Hấp Thụ Quỹ</span>
              <div className="text-3xl font-black text-cyan-300 font-mono mt-2 tracking-tight">
                {report2.summary.totalSoldRate}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">Tốc độ tiêu thụ toàn hệ thống</p>
            </div>
          </div>

          {/* Biểu đồ so sánh sản phẩm theo dự án */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 to-slate-950 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Tỷ Lệ Bán & Cơ Cấu Quỹ Căn Từng Dự Án
                </h3>
                <p className="text-xs text-slate-400">So sánh số lượng căn tổng, đã bán/khớp và căn còn mở bán</p>
              </div>
              <div className="flex items-center space-x-4 text-xs">
                <span className="flex items-center space-x-1.5 text-slate-400">
                  <span className="w-3 h-3 rounded bg-slate-600"></span>
                  <span>Tổng căn</span>
                </span>
                <span className="flex items-center space-x-1.5 text-purple-400">
                  <span className="w-3 h-3 rounded bg-purple-500"></span>
                  <span>Đã bán</span>
                </span>
                <span className="flex items-center space-x-1.5 text-emerald-400">
                  <span className="w-3 h-3 rounded bg-emerald-500"></span>
                  <span>Còn hàng</span>
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '14px', fontSize: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                    formatter={(val: any, name: any) => [val, name === 'sold' ? 'Đã bán / khớp' : name === 'available' ? 'Còn hàng' : 'Tổng số căn']}
                  />
                  <Bar dataKey="total" name="total" fill="#475569" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="sold" name="sold" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="available" name="available" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bảng Dữ Liệu Chuẩn Mẫu BC_SanPham_DuAn */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 to-slate-950 shadow-2xl backdrop-blur-xl">
            <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/60">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  BÁO CÁO LƯỢNG SẢN PHẨM BÁN THEO DỰ ÁN (BC_SANPHAM_DUAN)
                </h4>
                <p className="text-[11px] text-slate-400">Theo dõi quỹ hàng và tỷ lệ bán của từng dự án</p>
              </div>
              <span className="text-xs font-mono font-bold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-2.5 py-1 rounded-lg">
                6 Dự án phân phối
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Mã Dự Án</th>
                    <th className="p-4">Tên Dự Án</th>
                    <th className="p-4 text-right">Tổng Sản Phẩm</th>
                    <th className="p-4 text-right">Còn Hàng</th>
                    <th className="p-4 text-right">Đang Lock</th>
                    <th className="p-4 text-right">Đã Bán</th>
                    <th className="p-4 text-right">Tỷ Lệ Bán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {(report2.data || []).map((p: any) => (
                    <tr key={p.maDA} className="hover:bg-slate-800/40 transition-colors even:bg-slate-900/30">
                      <td className="p-4 font-bold font-mono text-brand-400">
                        <span className="px-2 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/20 font-mono">
                          {p.maDA}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-white">
                        <div className="font-bold text-slate-100">{p.tenDA}</div>
                        <div className="text-[10px] text-slate-400">{p.location}</div>
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-100">
                        {p.totalUnits}
                      </td>
                      <td className="p-4 text-right font-mono text-emerald-400 font-semibold">
                        {p.availableUnits}
                      </td>
                      <td className="p-4 text-right font-mono text-amber-400">
                        {p.lockedUnits}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-purple-400">
                        {p.soldUnits}
                      </td>
                      <td className="p-4 text-right font-mono">
                        <span className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/30 font-black text-cyan-300">
                          {p.formattedSoldRate}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 font-black border-t-2 border-slate-700 text-white shadow-lg">
                  <tr>
                    <td className="p-4 uppercase text-brand-400 font-bold" colSpan={2}>TỔNG CỘNG</td>
                    <td className="p-4 text-right font-mono text-slate-100 text-sm">
                      {report2.summary.totalUnits}
                    </td>
                    <td className="p-4 text-right font-mono text-emerald-400 text-sm">
                      {report2.summary.availableUnits}
                    </td>
                    <td className="p-4 text-right font-mono text-amber-400 text-sm">
                      {report2.summary.lockedUnits}
                    </td>
                    <td className="p-4 text-right font-mono text-purple-400 text-sm">
                      {report2.summary.soldUnits}
                    </td>
                    <td className="p-4 text-right font-mono text-cyan-300 text-sm font-black">
                      {report2.summary.totalSoldRate}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="p-4 bg-slate-950/60 border-t border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2">
              <Info className="w-4 h-4 text-brand-400 shrink-0 mt-0.5" />
              <span>
                <strong>Ghi chú:</strong> Dự án chưa có quỹ sản phẩm sẽ hiển thị tổng sản phẩm = 0. Sản phẩm có trạng thái “Đã khớp” được tính vào nhóm đã bán trong báo cáo mẫu theo quy định bảng thực hành SQL AHS.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 3: DOANH SỐ TỪNG NHÂN VIÊN (BC_DOANHSO_NV)                 */}
      {/* ============================================================= */}
      {activeTab === 'bc_doanhso_nv' && (
        <div className="space-y-6">
          {/* KPI Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900/80 to-slate-950 p-6 shadow-xl backdrop-blur-xl group hover:border-emerald-500/50 transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
              <span className="text-[11px] font-black text-emerald-400 uppercase tracking-widest">Tổng Doanh Số Nhân Viên</span>
              <div className="text-3xl font-black text-emerald-400 font-mono mt-2 tracking-tight">
                {formatVND(report3.summary.totalRevenue)}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                <span>Nguồn hợp đồng:</span>
                <span className="font-bold text-emerald-300 font-mono">24 HĐ giao dịch</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/30 via-slate-900/80 to-slate-950 p-6 shadow-xl backdrop-blur-xl group hover:border-amber-500/50 transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-yellow-400"></div>
              <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest">Tổng Hoa Hồng Kinh Doanh (1%)</span>
              <div className="text-3xl font-black text-amber-400 font-mono mt-2 tracking-tight">
                {formatVND(report3.summary.totalCommission)}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                <span>Chế độ thưởng:</span>
                <span className="font-bold text-amber-300">Chi trả chuyên viên KD</span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-slate-900/80 to-slate-950 p-6 shadow-xl backdrop-blur-xl group hover:border-purple-500/50 transition-all">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-400"></div>
              <span className="text-[11px] font-black text-purple-400 uppercase tracking-widest">Doanh Số Bình Quân / HĐ</span>
              <div className="text-3xl font-black text-purple-300 font-mono mt-2 tracking-tight">
                {formatVND(report3.summary.avgRevenuePerContract)}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-slate-400 pt-2 border-t border-slate-800/60">
                <span>Quy mô thương vụ:</span>
                <span className="font-bold text-purple-300 font-mono">~ {formatBillion(report3.summary.avgRevenuePerContract)} / HĐ</span>
              </div>
            </div>
          </div>

          {/* Biểu đồ Top Nhân Viên Xuất Sắc */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 to-slate-950 p-6 shadow-2xl backdrop-blur-xl space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800/80 pb-3">
              <Award className="w-5 h-5 text-amber-400" />
              <span>Top Chiến Thần Doanh Số Nhân Viên Kinh Doanh</span>
            </h3>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${val} Tỷ`} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '14px', fontSize: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }}
                    formatter={(val: any) => [`${val} Tỷ VND`, 'Tổng doanh số']}
                  />
                  <Bar dataKey="revenueBillion" fill="#38bdf8" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bảng Dữ Liệu Chuẩn Mẫu BC_DoanhSo_NV */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 to-slate-950 shadow-2xl backdrop-blur-xl">
            <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  BÁO CÁO DOANH SỐ THEO NHÂN VIÊN (BC_DOANHSO_NV)
                </h4>
                <p className="text-[11px] text-slate-400">Đánh giá kết quả kinh doanh theo nhân viên phụ trách (15 nhân sự)</p>
              </div>

              {/* Tìm kiếm nhân viên */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Tìm theo mã NV, tên..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="bg-slate-950 border border-slate-700/90 text-xs text-white pl-10 pr-4 py-2 rounded-xl outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 w-64 transition"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-4">Xếp Hạng</th>
                    <th className="p-4">Mã NV</th>
                    <th className="p-4">Họ Tên Nhân Viên</th>
                    <th className="p-4">Chức Vụ & Phòng Ban</th>
                    <th className="p-4 text-right">Số HĐ</th>
                    <th className="p-4 text-right">Tổng Doanh Số (VND)</th>
                    <th className="p-4 text-right">Hoa Hồng 1% (VND)</th>
                    <th className="p-4 text-right">Doanh Số / HĐ (VND)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredEmployees.map((e: any, idx: number) => {
                    const rank = idx + 1;
                    return (
                      <tr key={e.employeeId || e.maNV} className="hover:bg-slate-800/40 transition-colors even:bg-slate-900/30">
                        <td className="p-4">
                          {rank === 1 ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black text-xs">
                              <span>🥇</span>
                              <span>#1</span>
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-slate-300/20 text-slate-200 border border-slate-400/40 font-black text-xs">
                              <span>🥈</span>
                              <span>#2</span>
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-700/20 text-amber-500 border border-amber-600/40 font-black text-xs">
                              <span>🥉</span>
                              <span>#3</span>
                            </span>
                          ) : (
                            <span className="font-mono text-slate-400 font-bold px-2">#{rank}</span>
                          )}
                        </td>
                        <td className="p-4 font-bold font-mono text-brand-400">
                          <span className="px-2 py-0.5 rounded-md bg-brand-500/10 border border-brand-500/20 font-mono">
                            {e.maNV}
                          </span>
                        </td>
                        <td className="p-4 font-bold text-white text-xs">{e.fullName}</td>
                        <td className="p-4">
                          <div className="font-medium text-slate-300">{e.jobTitle}</div>
                          <div className="text-[10px] text-slate-400">{e.departmentName}</div>
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-amber-400">
                          {e.contractsCount}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-emerald-400">
                          {formatVND(e.totalRevenue)}
                        </td>
                        <td className="p-4 text-right font-mono text-cyan-400 font-semibold">
                          {formatVND(e.totalCommission)}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-300">
                          {formatVND(e.avgRevenuePerContract)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 font-black border-t-2 border-slate-700 text-white shadow-lg">
                  <tr>
                    <td className="p-4 uppercase text-brand-400 font-bold" colSpan={4}>TỔNG CỘNG TOÀN BỘ NHÂN SỰ</td>
                    <td className="p-4 text-right font-mono text-amber-400 text-sm">
                      {report3.summary.totalContracts}
                    </td>
                    <td className="p-4 text-right font-mono text-emerald-400 text-sm">
                      {formatVND(report3.summary.totalRevenue)}
                    </td>
                    <td className="p-4 text-right font-mono text-cyan-300 text-sm">
                      {formatVND(report3.summary.totalCommission)}
                    </td>
                    <td className="p-4 text-right font-mono text-purple-300 text-sm">
                      {formatVND(report3.summary.avgRevenuePerContract)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* TAB 4: KPI TOÀN DIỆN & PHÂN TÍCH CHUYỂN ĐỔI                     */}
      {/* ============================================================= */}
      {activeTab === 'kpi_dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/30 via-slate-900/80 to-slate-950 p-5 shadow-xl backdrop-blur-xl group hover:border-emerald-500/50 transition-all space-y-2">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Tổng Doanh Số Hợp Đồng</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400 font-mono">
                {formatBillion(kpis.totalContractRevenue)}
              </div>
              <p className="text-[11px] text-slate-400">24 Hợp đồng đã xác nhận ký kết</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/30 via-slate-900/80 to-slate-950 p-5 shadow-xl backdrop-blur-xl group hover:border-cyan-500/50 transition-all space-y-2">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-400"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Doanh Thu Cọc VietQR</span>
                <CheckCircle className="w-4 h-4 text-accent-cyan" />
              </div>
              <div className="text-2xl font-black text-accent-cyan font-mono">
                {formatBillion(kpis.totalDepositRevenue)}
              </div>
              <p className="text-[11px] text-slate-400">24 lượt thanh toán cọc thành công</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-950/30 via-slate-900/80 to-slate-950 p-5 shadow-xl backdrop-blur-xl group hover:border-purple-500/50 transition-all space-y-2">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-400"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Tỷ Lệ Bán Ra Toàn Quỹ</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-300 font-mono">
                {kpis.conversionRate}%
              </div>
              <p className="text-[11px] text-slate-400">46 căn đã khớp / đã bán trên 219 căn</p>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950 p-5 shadow-xl backdrop-blur-xl group hover:border-slate-700 transition-all space-y-2">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-500 to-slate-400"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Số Nhân Sự Kinh Doanh</span>
                <Users className="w-4 h-4 text-brand-400" />
              </div>
              <div className="text-2xl font-black text-white font-mono">
                15 <span className="text-xs text-slate-400 font-normal">nhân viên</span>
              </div>
              <p className="text-[11px] text-slate-400">9 chuyên viên ghi nhận doanh số</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart: Status Breakdown */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 to-slate-950 p-6 shadow-2xl backdrop-blur-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider border-b border-slate-800/80 pb-3">
                Cơ Cấu Trạng Thái Quỹ Hàng (219 Căn)
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '14px', fontSize: '12px', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leaderboard Summary */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900/90 to-slate-950 p-6 shadow-2xl backdrop-blur-xl space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2 border-b border-slate-800/80 pb-3">
                <Award className="w-5 h-5 text-amber-400" />
                <span>Bảng Xếp Hạng Doanh Số Nhân Viên (Top 5)</span>
              </h3>

              <div className="space-y-3">
                {(currentData?.leaderboard || []).slice(0, 5).map((emp: any, idx: number) => (
                  <div key={emp.id || emp.maNV} className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 hover:border-brand-500/40 transition-colors shadow-sm">
                    <div className="flex items-center space-x-3.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shadow-md ${
                        idx === 0 ? 'bg-amber-500 text-slate-950' :
                        idx === 1 ? 'bg-slate-300 text-slate-950' :
                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-300'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{emp.fullName}</div>
                        <div className="text-[10px] text-slate-400">{emp.jobTitle} • {emp.contractsCount} HĐ</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-400 text-xs font-mono">{formatBillion(emp.totalRevenue)}</div>
                      <div className="text-[10px] text-slate-500">Doanh số</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
