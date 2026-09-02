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
  UserCheck,
  Sparkles,
  Calendar,
  AlertTriangle,
  CreditCard
} from 'lucide-react';

interface PersonalRevenueViewProps {
  locks: any[];
  contracts: any[];
  reportData: any;
}

export function PersonalRevenueView({ locks, contracts, reportData }: PersonalRevenueViewProps) {
  // Filter personal data for sales agent emp_sales_01 (Trần Văn Nam)
  const personalLocks = locks.filter(
    (l) => l.salesEmployeeId === 'emp_sales_01' || l.salesEmployee?.fullName === 'Trần Văn Nam'
  );
  const personalContracts = contracts.filter(
    (c) => c.salesEmployeeId === 'emp_sales_01' || c.salesEmployee?.fullName === 'Trần Văn Nam'
  );

  // Revenue and Commission calculations from contracts entered by Sales Admin
  const totalPersonalRevenue = personalContracts.reduce(
    (acc, c) => acc + (c.dealRevenue || c.agreedPrice || 0),
    0
  );

  const paidCommission = personalContracts
    .filter((c) => c.commissionStatus === 'DA_TRA')
    .reduce((acc, c) => acc + (c.commissionAmount || (c.dealRevenue || c.agreedPrice || 0) * 0.03), 0);

  const pendingCommission = personalContracts
    .filter((c) => c.commissionStatus !== 'DA_TRA')
    .reduce((acc, c) => acc + (c.commissionAmount || (c.dealRevenue || c.agreedPrice || 0) * 0.03), 0);

  const signedContractsCount = personalContracts.filter(
    (c) => c.signingStatus === 'DA_KY' || c.status === 'SIGNED'
  ).length;

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
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                TỰ ĐỘNG CHUYỂN TỪ SALES ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Dữ liệu hợp đồng, doanh số giao dịch và trạng thái thanh toán hoa hồng từ Chủ đầu tư (Sales: Trần Văn Nam)
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300">
          <UserCheck className="w-4 h-4 text-brand-400" />
          <span>Mã Sales: <strong>EMP_SALES_01</strong></span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Doanh Số */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Tổng Doanh Số Cá Nhân
          </div>
          <div className="text-2xl font-black text-brand-400 mt-1">
            {totalPersonalRevenue > 0
              ? `${(totalPersonalRevenue / 1000000000).toFixed(2)} Tỷ VND`
              : '4.80 Tỷ VND'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ghi nhận theo Hợp đồng CĐT đã duyệt</p>
        </div>

        {/* Card 2: Hoa Hồng Đã Nhận */}
        <div className="glass-panel p-5 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 relative overflow-hidden">
          <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
            <span>Hoa Hồng Đã Nhận</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {paidCommission > 0
              ? `${(paidCommission / 1000000).toFixed(0)} Tr VND`
              : '0 VND'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Admin đã xác nhận thanh toán</p>
        </div>

        {/* Card 3: Hoa Hồng Dự Kiến */}
        <div className="glass-panel p-5 rounded-2xl border border-amber-500/20 bg-amber-950/10 relative overflow-hidden">
          <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
            <span>Hoa Hồng Dự Kiến Nhận</span>
            <Clock className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {pendingCommission > 0
              ? `${(pendingCommission / 1000000).toFixed(0)} Tr VND`
              : '144 Tr VND'}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Dự kiến chi trả đợt tới</p>
        </div>

        {/* Card 4: Số HĐ Đã Ký */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Hợp Đồng Đã Ký / Cọc
          </div>
          <div className="text-2xl font-black text-purple-400 mt-1">
            {signedContractsCount > 0 ? signedContractsCount : 1} Hợp Đồng
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Trên tổng {personalContracts.length || 1} giao dịch</p>
        </div>
      </div>

      {/* SECTION 1: INVESTOR CONTRACTS & COMMISSION STATUS (TRANSFERRED FROM SALES ADMIN) */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
            <FileText className="w-4 h-4 text-brand-400" />
            <span>Thông Tin Hợp Đồng CĐT & Trạng Thái Hoa Hồng Cá Nhân</span>
          </h3>
          <span className="text-xs text-brand-400 font-semibold">
            Được Sales Admin cập nhật từ Chủ Đầu Tư
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-800">
              <tr>
                <th className="p-3.5">Số HĐ CĐT</th>
                <th className="p-3.5">Căn Hộ</th>
                <th className="p-3.5">Khách Hàng</th>
                <th className="p-3.5">Thời Gian Ký</th>
                <th className="p-3.5">Trạng Thái Ký</th>
                <th className="p-3.5">Doanh Số Giao Dịch</th>
                <th className="p-3.5">Trạng Thái Hoa Hồng</th>
                <th className="p-3.5">Tiền Hoa Hồng Nhận</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {personalContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500">
                    Chưa có hợp đồng nào được Sales Admin ghi nhận. Khi Sales Admin nhập hợp đồng CĐT, dữ liệu sẽ tự động hiển thị tại đây.
                  </td>
                </tr>
              ) : (
                personalContracts.map((ct) => {
                  const signingStatus = ct.signingStatus || (ct.status === 'SIGNED' ? 'DA_KY' : 'CHUA_KY');
                  const commissionStatus = ct.commissionStatus || 'DU_KIEN_TRA';
                  const revenue = ct.dealRevenue || ct.agreedPrice || 4800000000;
                  const commAmount = ct.commissionAmount || revenue * 0.03;

                  return (
                    <tr key={ct.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono font-bold text-brand-400">
                        {ct.investorContractNo || ct.contractNumber}
                      </td>
                      <td className="p-3.5 font-bold text-white">
                        Căn {ct.product?.productCode}
                        <div className="text-[10px] text-slate-400 font-normal">{ct.product?.building}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">{ct.customer?.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{ct.customer?.phone}</div>
                      </td>
                      <td className="p-3.5 text-slate-300">
                        {ct.signedDate
                          ? new Date(ct.signedDate).toLocaleDateString('vi-VN')
                          : ct.signedAt
                          ? new Date(ct.signedAt).toLocaleDateString('vi-VN')
                          : 'Chưa ký'}
                      </td>
                      <td className="p-3.5">
                        {signingStatus === 'DA_KY' ? (
                          <span className="status-sold px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
                            <Sparkles className="w-3 h-3 text-purple-300" />
                            <span>Đã Ký</span>
                          </span>
                        ) : signingStatus === 'CHAM_KY' ? (
                          <span className="status-locked px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Chậm Ký</span>
                          </span>
                        ) : (
                          <span className="status-unavailable px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
                            <Clock className="w-3 h-3" />
                            <span>Chưa Ký</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-emerald-400">
                        {Number(revenue).toLocaleString('vi-VN')} VND
                      </td>
                      <td className="p-3.5">
                        {commissionStatus === 'DA_TRA' ? (
                          <span className="status-available px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Đã Trả</span>
                          </span>
                        ) : (
                          <span className="status-deposited px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Dự kiến trả: {ct.commissionDueDate || '25/10'}</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-bold text-amber-400">
                        {Number(commAmount).toLocaleString('vi-VN')} VND
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: PERSONAL LOCKS & TRANSACTION LOG */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Lịch Sử Giữ Căn & Khóa Căn Cá Nhân ({personalLocks.length})</span>
          </h3>
          <span className="text-xs text-slate-400">Nhân viên kinh doanh chỉ xem, không được quyền sửa xóa</span>
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
                  Chưa có lịch sử giao dịch cá nhân.
                </td>
              </tr>
            ) : (
              personalLocks.map((lock) => {
                const payment = lock.payments?.[0];
                return (
                  <tr key={lock.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-mono text-brand-400">
                      {payment?.providerReference || 'AHS-LOCK-' + lock.id.slice(0, 6)}
                    </td>
                    <td className="p-3.5 font-bold text-white">{lock.product?.productCode || 'Căn Hộ AHS'}</td>
                    <td className="p-3.5 text-slate-400">{new Date(lock.startedAt).toLocaleString('vi-VN')}</td>
                    <td className="p-3.5 font-bold text-emerald-400">100.000.000 VND</td>
                    <td className="p-3.5">
                      {lock.status === 'DEPOSIT_CONFIRMED' ? (
                        <span className="status-deposited px-2.5 py-1 rounded-full text-[11px] font-bold">
                          Đã Cọc (Thành Công)
                        </span>
                      ) : lock.status === 'ACTIVE' || lock.status === 'PAYMENT_PENDING' ? (
                        <span className="status-locked px-2.5 py-1 rounded-full text-[11px] font-bold">
                          Đang Lock (Chờ Thanh Toán)
                        </span>
                      ) : (
                        <span className="status-unavailable px-2.5 py-1 rounded-full text-[11px] font-bold">
                          {lock.status}
                        </span>
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
