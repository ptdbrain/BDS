'use client';

import React, { useState } from 'react';
import { UserRole } from '@/lib/types';
import {
  UserCheck,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  FileEdit,
  UserPlus,
  Lock,
  Search,
  Check,
  X
} from 'lucide-react';

interface CustomerManagerProps {
  customers: any[];
  currentRole: UserRole;
  onRefresh: () => void;
}

export function CustomerManager({
  customers,
  currentRole,
  onRefresh
}: CustomerManagerProps) {
  const [revealPII, setRevealPII] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    cccd: '',
    email: '',
    address: 'Số 88 Xuân Diệu, Tây Hồ, Hà Nội',
    consent: true
  });
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  // Change request state
  const [changeReason, setChangeReason] = useState<string>('');

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.fullName.toLowerCase().includes(q) || c.phone.includes(q) || c.cccdDisplay.includes(q);
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.fullName || !formData.phone || !formData.cccd) {
      setFormError('Họ tên, Số điện thoại và CCCD là bắt buộc.');
      return;
    }

    try {
      const res = await fetch('/api/v1/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || 'Tạo hồ sơ thất bại.');
        return;
      }

      setFormSuccess(data.data?.isDuplicateFound ? 'Đã liên kết hồ sơ khách hàng sẵn có!' : 'Tạo hồ sơ khách hàng mới thành công và đã gửi Sales Admin duyệt!');
      setFormData({ fullName: '', phone: '', cccd: '', email: '', address: '', consent: true });
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleApproveVerification = async (verId: string) => {
    try {
      const res = await fetch(`/api/v1/customer-verifications/${verId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId: 'emp_admin_01', reviewerName: 'Phạm Thị Mai' })
      });
      if (res.ok) {
        setSelectedVerification(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRequestChanges = async (verId: string) => {
    if (!changeReason) return;
    try {
      const res = await fetch(`/api/v1/customer-verifications/${verId}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId: 'emp_admin_01',
          reviewerName: 'Phạm Thị Mai',
          notes: changeReason,
          issues: [{ field: 'cccd', code: 'VERIFICATION_REQUIRED', message: changeReason }]
        })
      });
      if (res.ok) {
        setSelectedVerification(null);
        setChangeReason('');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Quản Lý Khách Hàng & Duyệt Hồ Sơ</h2>
              <p className="text-xs text-slate-400">Bảo mật dữ liệu cá nhân PII theo Nghị định 356/2025/NĐ-CP & Luật BVDLCN</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* PII Masking Toggle */}
          <button
            onClick={() => setRevealPII(!revealPII)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition border ${
              revealPII
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            {revealPII ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-brand-400" />}
            <span>{revealPII ? 'Ẩn Dữ Liệu PII' : 'Xem Đầy Đủ PII (Có Audit)'}</span>
          </button>

          {/* New Customer Button */}
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-500 text-xs font-bold transition shadow-lg shadow-brand-600/20"
          >
            <UserPlus className="w-4 h-4" />
            <span>Khai Báo Khách Hàng</span>
          </button>
        </div>
      </div>

      {/* NEW CUSTOMER INTAKE FORM */}
      {isFormOpen && (
        <div className="glass-panel p-6 rounded-2xl border border-brand-500/30 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-brand-400" />
              <span>Nhập Thông Tin Khách Hàng Đặt Cọc</span>
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          <form onSubmit={handleCreateCustomer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Họ và Tên (*)</label>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Số Điện Thoại (*)</label>
                <input
                  type="text"
                  placeholder="0987654321"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Số CCCD / Hộ Chiếu (*)</label>
                <input
                  type="text"
                  placeholder="012345678912"
                  value={formData.cccd}
                  onChange={(e) => setFormData({ ...formData, cccd: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Email Liên Hệ</label>
                <input
                  type="email"
                  placeholder="khachhang@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Địa Chỉ Thường Trú</label>
                <input
                  type="text"
                  placeholder="Số 1, đường Lý Thường Kiệt, Hà Nội"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={formData.consent}
                onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                className="rounded border-slate-700 text-brand-600 focus:ring-brand-500"
              />
              <span>Khách hàng đồng ý cho phép AHS thu thập & xử lý dữ liệu cá nhân theo quy định pháp luật.</span>
            </div>

            {formError && <p className="text-xs text-rose-400 font-bold">{formError}</p>}
            {formSuccess && <p className="text-xs text-emerald-400 font-bold">{formSuccess}</p>}

            <div className="flex justify-end space-x-3 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-lg"
              >
                Lưu & Trình Duyệt Khách Hàng
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CUSTOMERS LIST & VERIFICATION QUEUE TABLE */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white">Danh Sách Khách Hàng & Trạng Thái Xác Minh</h3>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên hoặc SĐT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-xs text-white pl-9 pr-4 py-1.5 rounded-xl outline-none w-48"
            />
          </div>
        </div>

        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-800">
            <tr>
              <th className="p-3.5">Họ và Tên</th>
              <th className="p-3.5">Số Điện Thoại</th>
              <th className="p-3.5">Số CCCD</th>
              <th className="p-3.5">Địa Chỉ</th>
              <th className="p-3.5">Trạng Thái Xác Minh</th>
              <th className="p-3.5 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {filteredCustomers.map((cust) => {
              const latestVer = cust.verifications?.[0];
              const isVerified = cust.verificationStatus === 'VERIFIED';
              return (
                <tr key={cust.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-bold text-white">{cust.fullName}</td>
                  <td className="p-3.5 font-mono text-slate-300">{cust.phoneDisplay || cust.phone}</td>
                  <td className="p-3.5 font-mono text-brand-400">{cust.cccdDisplay || cust.cccdCiphertext}</td>
                  <td className="p-3.5 text-slate-400">{cust.addressDisplay}</td>
                  <td className="p-3.5">
                    {isVerified ? (
                      <span className="status-available px-2.5 py-1 rounded-full text-[11px] font-bold">Đã Duyệt PII</span>
                    ) : cust.verificationStatus === 'CHANGE_REQUESTED' ? (
                      <span className="status-locked px-2.5 py-1 rounded-full text-[11px] font-bold">Cần Chỉnh Sửa</span>
                    ) : (
                      <span className="status-deposited px-2.5 py-1 rounded-full text-[11px] font-bold">Chờ Sales Admin Duyệt</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right">
                    {(currentRole === 'SALES_ADMIN' || currentRole === 'MANAGER') && latestVer && !isVerified && (
                      <button
                        onClick={() => setSelectedVerification(latestVer)}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 text-white hover:bg-purple-500 text-[11px] font-bold transition shadow-md"
                      >
                        Kiểm Duyệt PII
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SALES ADMIN VERIFICATION MODAL */}
      {selectedVerification && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span>Xác Minh Khách Hàng (Sales Admin Workbench)</span>
              </h3>
              <button onClick={() => setSelectedVerification(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300">
              Đối chiếu thông tin cá nhân khách hàng nhằm bảo đảm tính pháp lý hợp đồng.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 block">Ghi chú hoặc lý do yêu cầu sửa:</label>
              <textarea
                rows={3}
                placeholder="Nhập ghi chú hoặc lý do nếu yêu cầu Sales sửa..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleRequestChanges(selectedVerification.id)}
                className="px-3.5 py-2 rounded-xl bg-amber-600/30 border border-amber-500/50 text-amber-300 hover:bg-amber-600/40 text-xs font-bold"
              >
                Yêu Cầu Chỉnh Sửa
              </button>

              <button
                onClick={() => handleApproveVerification(selectedVerification.id)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg"
              >
                Duyệt Hồ Sơ Khách Hàng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
