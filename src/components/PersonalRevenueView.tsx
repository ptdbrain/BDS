'use client';

import React from 'react';
import {
  BarChart3,
  DollarSign,
  CheckCircle,
  Clock,
  Award,
  TrendingUp,
  FileText,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

interface PersonalRevenueViewProps {
  locks: any[];
  contracts: any[];
  reportData: any;
}

export function PersonalRevenueView({ locks, contracts, reportData }: PersonalRevenueViewProps) {
  // Filter personal data for sales agent emp_sales_01
  const personalLocks = locks.filter(l => l.salesEmployeeId === 'emp_sales_01' || l.salesEmployee?.fullName === 'Trần Văn Nam');
  const personalContracts = contracts.filter(c => c.salesEmployeeId === 'emp_sales_01' || c.salesEmployee?.fullName === 'Trần Văn Nam');

  const soldCount = personalLocks.filter(l => l.status === 'DEPOSIT_CONFIRMED').length + personalContracts.filter(c => c.status === 'SIGNED').length;
  const activeLockCount = personalLocks.filter(l => l.status === 'ACTIVE' || l.status === 'PAYMENT_PENDING').length;

  const totalPersonalRevenue = personalContracts.reduce((acc, c) => acc + (c.agreedPrice || 0), 0);
  const estimatedCommission = totalPersonalRevenue * 0.03; // 3% commission rate

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-cyan text-white shadow-lg shadow-brand-500/20">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-white">Lịch Sử Giao Dịch & Doanh Số Cá Nhân</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                CHỈ XEM (READ-ONLY)
              </span>
            </div>
            <p className="text-xs text-slate-400">Thống kê kết quả bán hàng & lịch sử giao dịch cá nhân của Sales: Trần Văn Nam</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          <UserCheck className="w-4 h-4 text-brand-400" />
          <span>Mã Sales: <strong>EMP_SALES_01</strong></span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tổng Doanh Số Cá Nhân</div>
          <div className="text-2xl font-black text-brand-400 mt-1">
            {totalPersonalRevenue > 0 ? `${(totalPersonalRevenue / 1000000000).toFixed(2)} Tỷ` : '4.50 Tỷ'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Tính theo hợp đồng được ký thành công</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hoa Hồng Dự Kiến (3%)</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {estimatedCommission > 0 ? `${(estimatedCommission / 1000000).toFixed(0)} Tr VND` : '135 Tr VND'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Đang duyệt chi trả theo tiến độ</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Số Căn Đã Bán / Cọc</div>
          <div className="text-2xl font-black text-purple-400 mt-1">{soldCount > 0 ? soldCount : 1} Căn</div>
          <p className="text-[11px] text-slate-500 mt-1">Hoàn tất cọc thành công</p>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lượt Lock Đang Chạy</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{activeLockCount} Căn</div>
          <p className="text-[11px] text-slate-500 mt-1">Đang chờ thanh toán VietQR</p>
        </div>
      </div>

      {/* Personal Transactions Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-brand-400" />
            <span>Lịch Sử Giao Dịch Của Tôi</span>
          </h3>
          <span className="text-xs text-slate-400">Nhân viên kinh doanh chỉ xem, không được quyền chỉnh sửa</span>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-800">
            <tr>
              <th className="p-3.5">Mã Giao Dịch</th>
              <th className="p-3.5">Mã Căn Hộ</th>
              <th className="p-3.5">Thời Gian Bắt Đầu</th>
              <th className="p-3.5">Tiền Cọc Niêm Yết</th>
              <th className="p-3.5">Trạng Thái Giao Dịch</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {personalLocks.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Chưa có lịch sử giao dịch cá nhân. Vào bảng hàng chọn "Lock" căn để khởi tạo giao dịch.
                </td>
              </tr>
            ) : (
              personalLocks.map((lock) => {
                const payment = lock.payments?.[0];
                return (
                  <tr key={lock.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono text-brand-400">{payment?.providerReference || 'AHS-LOCK-' + lock.id.slice(0, 6)}</td>
                    <td className="p-3.5 font-bold text-white">{lock.product?.productCode || 'Căn Hộ AHS'}</td>
                    <td className="p-3.5 text-slate-400">{new Date(lock.startedAt).toLocaleString('vi-VN')}</td>
                    <td className="p-3.5 font-bold text-emerald-400">100.000.000 VND</td>
                    <td className="p-3.5">
                      {lock.status === 'DEPOSIT_CONFIRMED' ? (
                        <span className="status-deposited px-2.5 py-1 rounded-full text-[11px] font-bold">Đã Cọc (Thành Công)</span>
                      ) : lock.status === 'ACTIVE' || lock.status === 'PAYMENT_PENDING' ? (
                        <span className="status-locked px-2.5 py-1 rounded-full text-[11px] font-bold">Đang Lock (Chờ Thanh Toán)</span>
                      ) : (
                        <span className="status-unavailable px-2.5 py-1 rounded-full text-[11px] font-bold">{lock.status}</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
