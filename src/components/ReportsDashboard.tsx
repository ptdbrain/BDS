'use client';

import React, { useState } from 'react';
import jsPDF from 'jspdf';
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
  Legend
} from 'recharts';
import {
  BarChart3,
  Download,
  DollarSign,
  TrendingUp,
  Award,
  Calendar,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

interface ReportsDashboardProps {
  reportData: any;
  onRefresh: () => void;
}

export function ReportsDashboard({ reportData, onRefresh }: ReportsDashboardProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [reportType, setReportType] = useState<string>('REVENUE');

  const kpis = reportData?.kpis || {
    totalProducts: 144,
    availableProducts: 100,
    lockedProducts: 5,
    depositedProducts: 15,
    soldProducts: 20,
    totalDepositRevenue: 1500000000,
    totalContractRevenue: 91000000000,
    conversionRate: '24.3'
  };

  const revenueByProject = reportData?.revenueByProject || [];
  const leaderboard = reportData?.leaderboard || [];

  // Pie chart data
  const pieData = [
    { name: 'Còn Hàng', value: kpis.availableProducts, color: '#10b981' },
    { name: 'Đang Lock 30m', value: kpis.lockedProducts, color: '#f59e0b' },
    { name: 'Đã Cọc', value: kpis.depositedProducts, color: '#00d2ff' },
    { name: 'Đã Bán', value: kpis.soldProducts, color: '#8b5cf6' }
  ];

  // PDF Exporter
  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.setTextColor(0, 102, 255);
    doc.text('CONG TY CO PHAN BAT DONG SAN AHS', 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text('BAO CAO DOANH THU & HIEU QUA KINH DOANH DU AN', 20, 32);
    doc.text(`Ngay xuat: ${new Date().toLocaleString('vi-VN')} | Nguoi xuat: Giadoc@ahs.com.vn`, 20, 38);
    doc.line(20, 42, 190, 42);

    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.text('1. TONG QUAN CHIS O KPI KINH DOANH', 20, 52);

    doc.setFontSize(10);
    doc.text(`- Tong So Luong San Pham Quy Hang: ${kpis.totalProducts} can`, 25, 62);
    doc.text(`- So Can Con Hang: ${kpis.availableProducts} can`, 25, 70);
    doc.text(`- So Can Dang Lock 30 Phut: ${kpis.lockedProducts} can`, 25, 78);
    doc.text(`- So Can Da Coc: ${kpis.depositedProducts} can`, 25, 86);
    doc.text(`- So Can Da Ban Hop Dong: ${kpis.soldProducts} can`, 25, 94);
    doc.text(`- Ty Le Chuyen Doi Quy Hang: ${kpis.conversionRate}%`, 25, 102);

    doc.text(`- Tong Doanh Thu Tien Coc VietQR: ${Number(kpis.totalDepositRevenue).toLocaleString('vi-VN')} VND`, 25, 112);
    doc.text(`- Tong Doanh So Hop Dong Giao Dich: ${Number(kpis.totalContractRevenue).toLocaleString('vi-VN')} VND`, 25, 120);

    doc.setFontSize(14);
    doc.text('2. BANG XEP HANG DOANH SO NHAN VIEN (LEADERBOARD)', 20, 135);

    let y = 145;
    leaderboard.slice(0, 5).forEach((emp: any, index: number) => {
      doc.setFontSize(10);
      doc.text(`${index + 1}. ${emp.fullName} (${emp.jobTitle}) - ${emp.contractsCount} HD - Doanh so: ${Number(emp.totalRevenue).toLocaleString('vi-VN')} VND`, 25, y);
      y += 8;
    });

    doc.text('GIAM DOC KINH DOANH AHS', 130, 230);
    doc.text('(Ky va xac nhận)', 135, 237);

    doc.save(`BaoCao_AHS_DoanhThu_${Date.now()}.pdf`);
    setIsExportModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Báo Cáo Doanh Thu & KPI Kinh Doanh</h2>
              <p className="text-xs text-slate-400">Hệ thống phân tích thời gian thực & xuất báo cáo PDF chuẩn pháp lý</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setIsExportModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg hover:brightness-110 transition"
        >
          <Download className="w-4 h-4" />
          <span>Xuất Báo Cáo PDF</span>
        </button>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/30 bg-emerald-950/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Tổng Doanh Số Hợp Đồng</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">
            {(kpis.totalContractRevenue / 1000000000).toFixed(1)} Tỷ VND
          </div>
          <p className="text-[11px] text-slate-400">Được ghi nhận từ hợp đồng cọc & mua bán</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-cyan-500/30 bg-cyan-950/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Doanh Thu Cọc VietQR</span>
            <CheckCircle className="w-4 h-4 text-accent-cyan" />
          </div>
          <div className="text-2xl font-black text-accent-cyan">
            {(kpis.totalDepositRevenue / 1000000000).toFixed(2)} Tỷ VND
          </div>
          <p className="text-[11px] text-slate-400">Xác nhận chuyển khoản VietQR tự động</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-500/30 bg-amber-950/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Tỷ Lệ Chuyển Đổi Quỹ Hàng</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {kpis.conversionRate}%
          </div>
          <p className="text-[11px] text-slate-400">Tỷ lệ căn đã cọc/bán trên tổng quỹ hàng</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-purple-500/30 bg-purple-950/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Lượt Lock Đang Chạy</span>
            <Award className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">
            {kpis.activeLocksCount} Căn
          </div>
          <p className="text-[11px] text-slate-400">Đang giữ căn trong 30 phút</p>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory Status Donut Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Cơ Cấu Trạng Thái Quỹ Hàng</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Project Chart */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 lg:col-span-2">
          <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">Doanh Thu Theo Dự Án (Tỷ VND)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueByProject}>
                <XAxis dataKey="projectName" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                />
                <Bar dataKey="revenue" fill="#0066ff" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SALES LEADERBOARD */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Bảng Xếp Hạng Doanh Số Nhanh (Sales Leaderboard)</span>
          </h3>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-800">
            <tr>
              <th className="p-3.5">Hạng</th>
              <th className="p-3.5">Họ và Tên Sales</th>
              <th className="p-3.5">Chức Danh</th>
              <th className="p-3.5">Lượt Lock</th>
              <th className="p-3.5">Hợp Đồng Ký</th>
              <th className="p-3.5 text-right">Tổng Doanh Số (VND)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {leaderboard.map((emp: any, index: number) => (
              <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                <td className="p-3.5 font-black text-amber-400">#{index + 1}</td>
                <td className="p-3.5 font-bold text-white">{emp.fullName}</td>
                <td className="p-3.5 text-slate-400">{emp.jobTitle}</td>
                <td className="p-3.5">{emp.locksCount}</td>
                <td className="p-3.5 font-bold text-brand-400">{emp.contractsCount}</td>
                <td className="p-3.5 text-right font-black text-emerald-400">
                  {Number(emp.totalRevenue).toLocaleString('vi-VN')} VND
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PDF EXPORT MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <span>Xuất Báo Cáo PDF Chính Thức</span>
              </h3>
              <button onClick={() => setIsExportModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1">Loại Báo Cáo (*)</label>
                <select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="REVENUE">Báo Cáo Doanh Thu & Giao Dịch Cọc</option>
                  <option value="INVENTORY">Báo Cáo Biến Động Quỹ Hàng Dự Án</option>
                  <option value="LEADERBOARD">Báo Cáo Hiệu Quả Doanh Số Nhân Viên</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                onClick={handleExportPDF}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg"
              >
                Tải Xuất PDF Ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
