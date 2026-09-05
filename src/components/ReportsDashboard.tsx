'use client';

import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
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
  FileText,
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

  // Realtime date for "Ngày lập"
  const [realtimeDate, setRealtimeDate] = useState<string>(() => {
    return new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  });

  // Calculate formatted period for "Thời gian thống kê"
  const formattedPeriod = useMemo(() => {
    if (!startDate || !endDate) return '01/06/2026 - 31/07/2026';
    try {
      const [sy, sm, sd] = startDate.split('-');
      const [ey, em, ed] = endDate.split('-');
      return `${sd}/${sm}/${sy} - ${ed}/${em}/${ey}`;
    } catch (e) {
      return `${startDate} - ${endDate}`;
    }
  }, [startDate, endDate]);

  const report1 = reportData?.report1_DoanhThu || {
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

  const report2 = reportData?.report2_SanPhamDuAn || {
    summary: {
      totalUnits: 219,
      availableUnits: 79,
      lockedUnits: 0,
      soldUnits: 46,
      totalSoldRate: '21.00%'
    },
    data: []
  };

  const report3 = reportData?.report3_DoanhSoNV || {
    summary: {
      totalContracts: 24,
      totalRevenue: 249474779035,
      totalCommission: 2494747791,
      avgRevenuePerContract: 10394782460
    },
    data: []
  };

  const kpis = reportData?.kpis || {
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
  // EXCEL EXPORTER (.XLSX)
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: BC_DoanhThu
    const r1Rows = [
      ['CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN AHS'],
      ['Địa chỉ: Tầng 4, Tòa nhà The Legend Tower, số 109 Nguyễn Tuân, Phường Thanh Xuân, Thành phố Hà Nội, Việt Nam', '', '', '', '', '', '', 'CHỈ TIÊU', 'GIÁ TRỊ'],
      ['Điện thoại: 0964960955', '', '', '', '', '', '', 'Tổng doanh thu', report1.summary.totalRevenue],
      ['Người tạo', company.creator, '', 'Ngày tạo', company.createdDate, '', '', 'Số hợp đồng', report1.summary.totalContracts],
      ['Thời gian thống kê', company.period, '', '', '', '', '', 'Giá trị HĐ TB', report1.summary.avgContractValue],
      [],
      ['BÁO CÁO DOANH THU THEO THỜI GIAN'],
      ['Tổng hợp doanh thu từ hợp đồng theo tháng'],
      [],
      ['Tháng', 'Số hợp đồng', 'Doanh thu', 'Giá trị HĐ bình quân', 'Tỷ trọng DT', 'Ghi chú']
    ];

    (report1.data || []).forEach((m: any) => {
      r1Rows.push([
        m.month,
        m.contractsCount,
        m.revenue,
        m.avgContractValue,
        m.revenueShare,
        m.notes
      ]);
    });

    r1Rows.push([
      'TỔNG',
      report1.summary.totalContracts,
      report1.summary.totalRevenue,
      report1.summary.avgContractValue,
      1,
      ''
    ]);
    r1Rows.push([]);
    r1Rows.push(['Nguồn thông tin liên hệ doanh nghiệp: https://ahsproperty.vn/lien-he/']);

    const ws1 = XLSX.utils.aoa_to_sheet(r1Rows);
    XLSX.utils.book_append_sheet(wb, ws1, 'BC_DoanhThu');

    // Sheet 2: BC_SanPham_DuAn
    const r2Rows = [
      ['CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN AHS'],
      ['Địa chỉ: Tầng 4, Tòa nhà The Legend Tower, số 109 Nguyễn Tuân, Phường Thanh Xuân, Thành phố Hà Nội, Việt Nam'],
      ['Điện thoại: 0964960955'],
      ['Người tạo', company.creator, '', 'Ngày tạo', company.createdDate],
      ['Thời gian thống kê', 'Tính đến ngày ' + company.createdDate],
      [],
      ['BÁO CÁO LƯỢNG SẢN PHẨM BÁN THEO DỰ ÁN'],
      ['Theo dõi quỹ hàng và tỷ lệ bán của từng dự án'],
      [],
      ['Mã dự án', 'Tên dự án', 'Tổng sản phẩm', 'Còn hàng', 'Đang lock', 'Đã bán', 'Tỷ lệ bán']
    ];

    (report2.data || []).forEach((p: any) => {
      r2Rows.push([
        p.maDA,
        p.tenDA,
        p.totalUnits,
        p.availableUnits,
        p.lockedUnits,
        p.soldUnits,
        p.soldRate
      ]);
    });

    r2Rows.push([
      'TỔNG',
      '',
      report2.summary.totalUnits,
      report2.summary.availableUnits,
      report2.summary.lockedUnits,
      report2.summary.soldUnits,
      report2.summary.totalUnits > 0 ? (report2.summary.soldUnits / report2.summary.totalUnits) : 0
    ]);
    r2Rows.push([]);
    r2Rows.push(['Ghi chú: Dự án chưa có quỹ sản phẩm sẽ hiển thị tổng sản phẩm = 0. Sản phẩm có trạng thái “Đã khớp” được tính vào nhóm đã bán trong báo cáo mẫu.']);
    r2Rows.push(['Nguồn thông tin liên hệ doanh nghiệp: https://ahsproperty.vn/lien-he/']);

    const ws2 = XLSX.utils.aoa_to_sheet(r2Rows);
    XLSX.utils.book_append_sheet(wb, ws2, 'BC_SanPham_DuAn');

    // Sheet 3: BC_DoanhSo_NV
    const r3Rows = [
      ['CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN AHS'],
      ['Địa chỉ: Tầng 4, Tòa nhà The Legend Tower, số 109 Nguyễn Tuân, Phường Thanh Xuân, Thành phố Hà Nội, Việt Nam'],
      ['Điện thoại: 0964960955'],
      ['Người tạo', company.creator, '', 'Ngày tạo', company.createdDate],
      ['Thời gian thống kê', company.period],
      [],
      ['BÁO CÁO DOANH SỐ THEO NHÂN VIÊN'],
      ['Đánh giá kết quả kinh doanh theo nhân viên phụ trách'],
      [],
      ['Mã NV', 'Họ tên nhân viên', 'Chức vụ', 'Số hợp đồng', 'Tổng doanh số', 'Tổng hoa hồng', 'Doanh số/HĐ']
    ];

    (report3.data || []).forEach((e: any) => {
      r3Rows.push([
        e.maNV,
        e.fullName,
        e.jobTitle,
        e.contractsCount,
        e.totalRevenue,
        e.totalCommission,
        e.avgRevenuePerContract
      ]);
    });

    r3Rows.push([
      'TỔNG',
      '',
      '',
      report3.summary.totalContracts,
      report3.summary.totalRevenue,
      report3.summary.totalCommission,
      report3.summary.avgRevenuePerContract
    ]);
    r3Rows.push([]);
    r3Rows.push(['Nguồn thông tin liên hệ doanh nghiệp: https://ahsproperty.vn/lien-he/']);

    const ws3 = XLSX.utils.aoa_to_sheet(r3Rows);
    XLSX.utils.book_append_sheet(wb, ws3, 'BC_DoanhSo_NV');

    XLSX.writeFile(wb, `Mau_3_Bao_Cao_AHS_${Date.now()}.xlsx`);
  };

  // -------------------------------------------------------------
  // PDF EXPORTER (.PDF)
  // -------------------------------------------------------------
  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.setTextColor(14, 165, 233);
    doc.text('CONG TY CO PHAN BAT DONG SAN AHS', 15, 20);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text('Dia chi: Tang 4, The Legend Tower, 109 Nguyen Tuan, Thanh Xuan, Ha Noi | Hotline: 0964960955', 15, 26);
    doc.text(`Nguoi lap: ${company.creator} | Ngay lap: ${company.createdDate} | Ky: ${company.period}`, 15, 32);
    doc.line(15, 36, 195, 36);

    if (activeTab === 'bc_doanhthu') {
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('BAO CAO 1: DOANH THU THEO THOI GIAN (THANG 01/2026 - 12/2026)', 15, 46);

      doc.setFontSize(9);
      doc.text(`Tong doanh thu: ${formatVND(report1.summary.totalRevenue)} | Tong hop dong: ${report1.summary.totalContracts} HD`, 15, 54);
      doc.text(`Gia tri HD binh quan: ${formatVND(report1.summary.avgContractValue)}`, 15, 60);

      let y = 72;
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text('Thang          So HD      Doanh Thu (VND)                   Gia Tri Binh Quan (VND)      Ty Trong', 15, y);
      y += 6;
      doc.line(15, y, 195, y);
      y += 6;

      (report1.data || []).forEach((m: any) => {
        doc.text(`${m.month}        ${String(m.contractsCount).padStart(3, ' ')}        ${Number(m.revenue).toLocaleString('vi-VN').padEnd(25, ' ')}  ${Number(m.avgContractValue).toLocaleString('vi-VN').padEnd(25, ' ')}  ${(m.revenueShare * 100).toFixed(1)}%`, 15, y);
        y += 6;
      });

      doc.line(15, y, 195, y);
      y += 6;
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`TONG CONG:    ${report1.summary.totalContracts} HD       ${Number(report1.summary.totalRevenue).toLocaleString('vi-VN')} VND                                             100%`, 15, y);
    } else if (activeTab === 'bc_sanpham_duan') {
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('BAO CAO 2: LUONG SAN PHAM BAN THEO DU AN', 15, 46);

      let y = 58;
      doc.setFontSize(8);
      doc.text('Ma DA    Ten Du An                                 Tong Can    Con Hang    Dang Lock    Da Ban    Ty Le Ban', 15, y);
      y += 6;
      doc.line(15, y, 195, y);
      y += 6;

      (report2.data || []).forEach((p: any) => {
        const namePart = p.tenDA.padEnd(38, ' ').substring(0, 38);
        doc.text(`${p.maDA}     ${namePart}  ${String(p.totalUnits).padStart(5, ' ')}       ${String(p.availableUnits).padStart(5, ' ')}       ${String(p.lockedUnits).padStart(5, ' ')}       ${String(p.soldUnits).padStart(5, ' ')}     ${p.formattedSoldRate}`, 15, y);
        y += 7;
      });

      doc.line(15, y, 195, y);
      y += 7;
      doc.setFontSize(9);
      doc.text(`TONG CONG:                                         ${report2.summary.totalUnits} can      ${report2.summary.availableUnits} can        0 can      ${report2.summary.soldUnits} can    ${report2.summary.totalSoldRate}`, 15, y);
    } else {
      doc.setFontSize(13);
      doc.setTextColor(15, 23, 42);
      doc.text('BAO CAO 3: DOANH SO THEO TUNG NHAN VIEN', 15, 46);

      let y = 58;
      doc.setFontSize(8);
      doc.text('Ma NV    Ho Ten                      Chuc Vu                    So HD    Tong Doanh So (VND)      Hoa Hong (VND)', 15, y);
      y += 6;
      doc.line(15, y, 195, y);
      y += 6;

      (report3.data || []).forEach((e: any) => {
        const name = e.fullName.padEnd(24, ' ').substring(0, 24);
        const job = e.jobTitle.padEnd(24, ' ').substring(0, 24);
        doc.text(`${e.maNV}    ${name}    ${job}   ${String(e.contractsCount).padStart(3, ' ')}     ${Number(e.totalRevenue).toLocaleString('vi-VN').padEnd(20, ' ')}   ${Number(e.totalCommission).toLocaleString('vi-VN')}`, 15, y);
        y += 7;
      });

      doc.line(15, y, 195, y);
      y += 7;
      doc.setFontSize(9);
      doc.text(`TONG CONG:                                                           ${report3.summary.totalContracts} HD    ${Number(report3.summary.totalRevenue).toLocaleString('vi-VN')} đ   ${Number(report3.summary.totalCommission).toLocaleString('vi-VN')} đ`, 15, y);
    }

    doc.setFontSize(10);
    doc.text('DAI DIEN BAN LANH DAO AHS', 130, 240);
    doc.text('(Ky va dong dau xac nhan)', 132, 247);

    doc.save(`AHS_${activeTab.toUpperCase()}_${Date.now()}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner Doanh Nghiệp AHS Chuẩn */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="px-2.5 py-1 rounded-lg bg-brand-500/20 text-brand-400 font-mono text-xs font-black border border-brand-500/30">
                AHS PROPERTY
              </div>
              <span className="text-xs text-slate-400">Hệ Thống Báo Cáo & Quản Trị Bất Động Sản</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase">
              {company.name}
            </h1>
            <div className="text-xs text-slate-400 space-y-0.5">
              <p>📍 {company.address}</p>
              <p>☎️ Hotline: <span className="text-brand-400 font-semibold">{company.phone}</span> | 🌐 Website: <a href={company.sourceLink} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-brand-400 underline">{company.sourceLink}</a></p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onRefresh}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition"
              title="Làm mới số liệu"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {/* Nút Xuất Excel */}
            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 hover:from-emerald-500 hover:to-teal-500 flex items-center space-x-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Excel (.xlsx)</span>
            </button>

            {/* Nút Xuất PDF */}
            <button
              onClick={handleExportPDF}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs font-bold shadow-lg shadow-blue-600/20 hover:from-blue-500 hover:to-cyan-500 flex items-center space-x-2 transition"
            >
              <FileText className="w-4 h-4" />
              <span>Xuất PDF Chuẩn</span>
            </button>
          </div>
        </div>

        {/* Thông tin lập báo cáo */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-1.5 bg-slate-900/80 border border-slate-800/80 px-3 py-1.5 rounded-xl">
              <span className="text-slate-400">Người lập:</span>
              <span className="font-semibold text-slate-100">{company.creator}</span>
            </div>

            {/* Ngày lập - Realtime Indicator */}
            <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-800/80 px-3 py-1.5 rounded-xl">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400">Ngày lập:</span>
              <span className="font-bold text-slate-100">{realtimeDate}</span>
              <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-wider">
                Realtime
              </span>
            </div>
          </div>

          {/* Thời gian thống kê - Interactive Date Picker (Từ ngày -> Đến ngày) */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-xl shadow-inner">
            <Calendar className="w-3.5 h-3.5 text-brand-400" />
            <span className="text-slate-400 font-medium">Thời gian thống kê:</span>
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 text-[11px] font-medium">Từ</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 hover:border-brand-500/60 rounded-lg px-2.5 py-1 text-xs text-brand-300 font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition cursor-pointer"
                title="Chọn ngày bắt đầu"
              />
              <span className="text-brand-400 font-bold">➔</span>
              <span className="text-slate-500 text-[11px] font-medium">Đến</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700/80 hover:border-brand-500/60 rounded-lg px-2.5 py-1 text-xs text-brand-300 font-semibold focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition cursor-pointer"
                title="Chọn ngày kết thúc"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Navigation Tabs - 3 Mẫu Báo Cáo + KPI Dashboard */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('bc_doanhthu')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'bc_doanhthu'
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>1. Báo Cáo Doanh Thu (BC_DoanhThu)</span>
        </button>

        <button
          onClick={() => setActiveTab('bc_sanpham_duan')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'bc_sanpham_duan'
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2. Sản Phẩm Bán Theo Dự Án (BC_SanPham_DuAn)</span>
        </button>

        <button
          onClick={() => setActiveTab('bc_doanhso_nv')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'bc_doanhso_nv'
              ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>3. Doanh Số Theo Nhân Viên (BC_DoanhSo_NV)</span>
        </button>

        <button
          onClick={() => setActiveTab('kpi_dashboard')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition ${
            activeTab === 'kpi_dashboard'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Tổng Quan KPI & Biểu Đồ</span>
        </button>
      </div>

      {/* ============================================================= */}
      {/* TAB 1: BÁO CÁO DOANH THU THEO THỜI GIAN (BC_DOANHTHU)           */}
      {/* ============================================================= */}
      {activeTab === 'bc_doanhthu' && (
        <div className="space-y-6">
          {/* KPI Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Tổng Doanh Thu Hợp Đồng</span>
              <div className="text-2xl font-black text-emerald-400">
                {formatVND(report1.summary.totalRevenue)}
              </div>
              <p className="text-[11px] text-slate-400">Tương đương ~ {formatBillion(report1.summary.totalRevenue)}</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-blue-500/30 bg-blue-950/10 space-y-1">
              <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">Tổng Số Hợp Đồng Đã Ký</span>
              <div className="text-2xl font-black text-white">
                {report1.summary.totalContracts} <span className="text-sm font-normal text-slate-400">Hợp đồng</span>
              </div>
              <p className="text-[11px] text-slate-400">Khớp chuẩn 100% với các lượt cọc</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-purple-950/10 space-y-1">
              <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Giá Trị HĐ Bình Quân</span>
              <div className="text-2xl font-black text-purple-300">
                {formatVND(report1.summary.avgContractValue)}
              </div>
              <p className="text-[11px] text-slate-400">Mức giá trung bình mỗi giao dịch thành công</p>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase">Tổng Sản Phẩm Toàn Quỹ</span>
              <div className="text-2xl font-black text-white">{report2.summary.totalUnits} <span className="text-xs text-slate-400 font-normal">căn</span></div>
              <p className="text-[10px] text-slate-500">Gồm 6 dự án phân phối</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase">Còn Hàng Mở Bán</span>
              <div className="text-2xl font-black text-emerald-400">{report2.summary.availableUnits} <span className="text-xs text-emerald-400/80 font-normal">căn</span></div>
              <p className="text-[10px] text-slate-500">Sẵn sàng giao dịch</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-purple-950/10 space-y-1">
              <span className="text-[11px] font-bold text-purple-400 uppercase">Đã Bán & Đã Khớp</span>
              <div className="text-2xl font-black text-purple-400">{report2.summary.soldUnits} <span className="text-xs text-purple-400/80 font-normal">căn</span></div>
              <p className="text-[10px] text-slate-500">Đã thanh toán cọc / HĐ</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 space-y-1">
              <span className="text-[11px] font-bold text-accent-cyan uppercase">Tỷ Lệ Bán Toàn Quỹ</span>
              <div className="text-2xl font-black text-accent-cyan">{report2.summary.totalSoldRate}</div>
              <p className="text-[10px] text-slate-500">Tốc độ hấp thụ tổng thể</p>
            </div>
          </div>

          {/* Biểu đồ so sánh sản phẩm theo dự án */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Tỷ Lệ Bán & Cơ Cấu Quỹ Căn Từng Dự Án
            </h3>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: any, name: any) => [val, name === 'sold' ? 'Đã bán / khớp' : name === 'available' ? 'Còn hàng' : 'Tổng số căn']}
                  />
                  <Bar dataKey="total" name="total" fill="#475569" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="sold" name="sold" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="available" name="available" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bảng Dữ Liệu Chuẩn Mẫu BC_SanPham_DuAn */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  BÁO CÁO LƯỢNG SẢN PHẨM BÁN THEO DỰ ÁN (BC_SANPHAM_DUAN)
                </h4>
                <p className="text-[11px] text-slate-400">Theo dõi quỹ hàng và tỷ lệ bán của từng dự án</p>
              </div>
              <span className="text-xs font-mono text-slate-400">6 Dự án phân phối</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Mã Dự Án</th>
                    <th className="p-3.5">Tên Dự Án</th>
                    <th className="p-3.5 text-right">Tổng Sản Phẩm</th>
                    <th className="p-3.5 text-right">Còn Hàng</th>
                    <th className="p-3.5 text-right">Đang Lock</th>
                    <th className="p-3.5 text-right">Đã Bán</th>
                    <th className="p-3.5 text-right">Tỷ Lệ Bán</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {(report2.data || []).map((p: any) => (
                    <tr key={p.maDA} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-bold font-mono text-brand-400">{p.maDA}</td>
                      <td className="p-3.5 font-semibold text-white">
                        <div>{p.tenDA}</div>
                        <div className="text-[10px] text-slate-400">{p.location}</div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-100">
                        {p.totalUnits}
                      </td>
                      <td className="p-3.5 text-right font-mono text-emerald-400 font-semibold">
                        {p.availableUnits}
                      </td>
                      <td className="p-3.5 text-right font-mono text-amber-400">
                        {p.lockedUnits}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-purple-400">
                        {p.soldUnits}
                      </td>
                      <td className="p-3.5 text-right font-mono font-black text-cyan-400">
                        {p.formattedSoldRate}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900/90 font-black border-t-2 border-slate-700 text-white">
                  <tr>
                    <td className="p-4 uppercase text-brand-400" colSpan={2}>TỔNG CỘNG</td>
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
                    <td className="p-4 text-right font-mono text-cyan-400 text-sm">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase">Tổng Doanh Số Nhân Viên</span>
              <div className="text-2xl font-black text-emerald-400">
                {formatVND(report3.summary.totalRevenue)}
              </div>
              <p className="text-[11px] text-slate-400">Đóng góp từ 24 hợp đồng giao dịch</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-950/10 space-y-1">
              <span className="text-[11px] font-bold text-amber-400 uppercase">Tổng Hoa Hồng Kinh Doanh (1%)</span>
              <div className="text-2xl font-black text-amber-400">
                {formatVND(report3.summary.totalCommission)}
              </div>
              <p className="text-[11px] text-slate-400">Quyền lợi chi trả cho chuyên viên kinh doanh</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-purple-950/10 space-y-1">
              <span className="text-[11px] font-bold text-purple-400 uppercase">Doanh Số Bình Quân / HĐ</span>
              <div className="text-2xl font-black text-purple-300">
                {formatVND(report3.summary.avgRevenuePerContract)}
              </div>
              <p className="text-[11px] text-slate-400">Quy mô trung bình mỗi thương vụ</p>
            </div>
          </div>

          {/* Biểu đồ Top Nhân Viên Xuất Sắc */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Top Chiến Thần Doanh Số Nhân Viên Kinh Doanh</span>
            </h3>

            <div className="h-64 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeeChartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                  <XAxis type="number" stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `${val} Tỷ`} />
                  <YAxis type="category" dataKey="name" stroke="#94a3b8" fontSize={11} width={100} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                    formatter={(val: any) => [`${val} Tỷ VND`, 'Tổng doanh số']}
                  />
                  <Bar dataKey="revenueBillion" fill="#38bdf8" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bảng Dữ Liệu Chuẩn Mẫu BC_DoanhSo_NV */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  BÁO CÁO DOANH SỐ THEO NHÂN VIÊN (BC_DOANHSO_NV)
                </h4>
                <p className="text-[11px] text-slate-400">Đánh giá kết quả kinh doanh theo nhân viên phụ trách (15 nhân sự)</p>
              </div>

              {/* Tìm kiếm nhân viên */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm nhân viên NV001, tên..."
                  value={searchEmployee}
                  onChange={(e) => setSearchEmployee(e.target.value)}
                  className="bg-slate-900 border border-slate-700 text-xs text-white pl-9 pr-3 py-1.5 rounded-xl outline-none focus:border-brand-500 w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-900 text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-3.5">Mã NV</th>
                    <th className="p-3.5">Họ Tên Nhân Viên</th>
                    <th className="p-3.5">Chức Vụ & Phòng Ban</th>
                    <th className="p-3.5 text-right">Số Hợp Đồng</th>
                    <th className="p-3.5 text-right">Tổng Doanh Số (VND)</th>
                    <th className="p-3.5 text-right">Tổng Hoa Hồng (VND)</th>
                    <th className="p-3.5 text-right">Doanh Số / HĐ (VND)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-200">
                  {filteredEmployees.map((e: any) => (
                    <tr key={e.employeeId || e.maNV} className={`hover:bg-slate-800/40 transition ${e.contractsCount > 0 ? 'bg-slate-900/30' : ''}`}>
                      <td className="p-3.5 font-bold font-mono text-brand-400">{e.maNV}</td>
                      <td className="p-3.5 font-bold text-white">{e.fullName}</td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-300">{e.jobTitle}</div>
                        <div className="text-[10px] text-slate-500">{e.departmentName}</div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                        {e.contractsCount}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                        {formatVND(e.totalRevenue)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-cyan-400">
                        {formatVND(e.totalCommission)}
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-300">
                        {formatVND(e.avgRevenuePerContract)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900/90 font-black border-t-2 border-slate-700 text-white">
                  <tr>
                    <td className="p-4 uppercase text-brand-400" colSpan={3}>TỔNG CỘNG TOÀN BỘ NHÂN SỰ</td>
                    <td className="p-4 text-right font-mono text-amber-400 text-sm">
                      {report3.summary.totalContracts}
                    </td>
                    <td className="p-4 text-right font-mono text-emerald-400 text-sm">
                      {formatVND(report3.summary.totalRevenue)}
                    </td>
                    <td className="p-4 text-right font-mono text-cyan-400 text-sm">
                      {formatVND(report3.summary.totalCommission)}
                    </td>
                    <td className="p-4 text-right font-mono text-purple-300">
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
            <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Tổng Doanh Số Hợp Đồng</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {formatBillion(kpis.totalContractRevenue)}
              </div>
              <p className="text-[11px] text-slate-400">24 Hợp đồng đã xác nhận ký kết</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Doanh Thu Cọc VietQR</span>
                <CheckCircle className="w-4 h-4 text-accent-cyan" />
              </div>
              <div className="text-2xl font-black text-accent-cyan">
                {formatBillion(kpis.totalDepositRevenue)}
              </div>
              <p className="text-[11px] text-slate-400">24 lượt thanh toán cọc thành công</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-purple-950/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Tỷ Lệ Bán Ra Toàn Quỹ</span>
                <TrendingUp className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black text-purple-400">
                {kpis.conversionRate}%
              </div>
              <p className="text-[11px] text-slate-400">46 căn đã khớp / đã bán trên 219 căn</p>
            </div>

            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase">Số Nhân Sự Kinh Doanh</span>
                <Users className="w-4 h-4 text-brand-400" />
              </div>
              <div className="text-2xl font-black text-white">
                15 <span className="text-xs text-slate-400 font-normal">nhân viên</span>
              </div>
              <p className="text-[11px] text-slate-400">9 chuyên viên ghi nhận doanh số</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart: Status Breakdown */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
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
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Leaderboard Summary */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Award className="w-4 h-4 text-amber-400" />
                <span>Bảng Xếp Hạng Doanh Số Nhân Viên (Top 5)</span>
              </h3>

              <div className="space-y-3">
                {(reportData?.leaderboard || []).slice(0, 5).map((emp: any, idx: number) => (
                  <div key={emp.id || emp.maNV} className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center space-x-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs ${
                        idx === 0 ? 'bg-amber-500 text-slate-950' :
                        idx === 1 ? 'bg-slate-300 text-slate-950' :
                        idx === 2 ? 'bg-amber-700 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{emp.fullName}</div>
                        <div className="text-[10px] text-slate-400">{emp.jobTitle} • {emp.contractsCount} HĐ</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-400 text-xs">{formatBillion(emp.totalRevenue)}</div>
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
  );
}
