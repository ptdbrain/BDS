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
  X,
  Download,
  FileSpreadsheet,
  Building,
  RotateCcw,
  Calendar,
  Phone,
  CreditCard,
  MapPin
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
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [selectedVerification, setSelectedVerification] = useState<any | null>(null);

  // Form State with 8 fields required by standard
  const [formData, setFormData] = useState({
    fullName: '',
    gender: 'Nam',
    dateOfBirth: '1992-05-15',
    phone: '',
    cccd: '',
    permanentAddress: 'Số 88 Xuân Diệu, Tây Hồ, Hà Nội',
    contactAddress: 'Số 88 Xuân Diệu, Tây Hồ, Hà Nội',
    email: '',
    consent: true
  });
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');

  // Change request state
  const [changeReason, setChangeReason] = useState<string>('');

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (c.fullName && c.fullName.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      (c.cccdDisplay && c.cccdDisplay.includes(q)) ||
      (c.attachedProduct?.productCode && c.attachedProduct.productCode.toLowerCase().includes(q))
    );
  });

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.fullName || !formData.phone || !formData.cccd) {
      setFormError('Họ tên, Số điện thoại và Căn cước (CCCD) là bắt buộc.');
      return;
    }

    try {
      if (editingCustomerId) {
        const res = await fetch(`/api/v1/customers/${editingCustomerId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Cập nhật hồ sơ thất bại');
        setFormSuccess('Cập nhật thông tin khách hàng thành công!');
      } else {
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
        setFormSuccess(
          data.data?.isDuplicateFound
            ? 'Đã liên kết hồ sơ khách hàng sẵn có!'
            : 'Khai báo thông tin khách hàng thành công!'
        );
      }

      setFormData({
        fullName: '',
        gender: 'Nam',
        dateOfBirth: '1992-05-15',
        phone: '',
        cccd: '',
        permanentAddress: 'Số 88 Xuân Diệu, Tây Hồ, Hà Nội',
        contactAddress: 'Số 88 Xuân Diệu, Tây Hồ, Hà Nội',
        email: '',
        consent: true
      });
      setEditingCustomerId(null);
      setIsFormOpen(false);
      onRefresh();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa thông tin khách hàng này?')) return;
    try {
      const res = await fetch(`/api/v1/customers/${customerId}`, { method: 'DELETE' });
      if (res.ok) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const startEditCustomer = (cust: any) => {
    setEditingCustomerId(cust.id);
    setFormData({
      fullName: cust.fullName || '',
      gender: cust.gender || 'Nam',
      dateOfBirth: cust.dateOfBirth || '',
      phone: cust.phone || '',
      cccd: cust.cccd || '',
      permanentAddress: cust.permanentAddress || '',
      contactAddress: cust.contactAddress || '',
      email: cust.email || '',
      consent: true
    });
    setIsFormOpen(true);
  };

  // Sales Admin actions
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

  const handleQuickApprove = async (cust: any) => {
    const verId = cust.verifications?.[0]?.id;
    if (verId) {
      await handleApproveVerification(verId);
    } else {
      alert('Chưa có yêu cầu xác minh cho khách hàng này.');
    }
  };

  const handleRequestChanges = async (verId: string) => {
    if (!changeReason.trim()) {
      alert('Vui lòng nhập lý do hoặc thông tin sai sót cần yêu cầu nhập liệu lại!');
      return;
    }
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

  // Download CSV file for Investor (Chủ Đầu Tư)
  const handleDownloadCSV = () => {
    const headers = [
      'STT',
      'Họ và Tên',
      'Giới Tính',
      'Ngày Sinh',
      'Số CCCD/CMND',
      'Số Điện Thoại',
      'Email',
      'Địa Chỉ Thường Trú',
      'Địa Chỉ Liên Hệ',
      'Mã Căn Hộ Cọc',
      'Tòa Tháp / Dự Án',
      'Tiền Cọc Đã Nộp (VND)',
      'Giá Trị Căn (VND)',
      'Ngày Giao Dịch',
      'Sales Phụ Trách',
      'Trạng Thái Xác Minh'
    ];

    const rows = filteredCustomers.map((c, index) => [
      index + 1,
      `"${c.fullName || ''}"`,
      `"${c.gender || 'Nam'}"`,
      `"${c.dateOfBirth || ''}"`,
      `"${c.cccd || c.cccdDisplay || ''}"`,
      `"${c.phone || ''}"`,
      `"${c.email || ''}"`,
      `"${c.permanentAddress || ''}"`,
      `"${c.contactAddress || ''}"`,
      `"${c.attachedProduct?.productCode || 'A-0501'}"`,
      `"${c.attachedProduct?.building || 'Tòa A'} - ${c.attachedProduct?.projectName || 'AHS Grand Horizon'}"`,
      c.attachedProduct?.depositAmount || 100000000,
      c.attachedProduct?.price || 4550000000,
      `"${new Date(c.createdAt).toLocaleDateString('vi-VN')}"`,
      `"${c.salesEmployee?.fullName || 'Trần Văn Nam'}"`,
      `"${c.verificationStatus === 'VERIFIED' ? 'Đã duyệt hợp lệ' : c.verificationStatus === 'CHANGE_REQUESTED' ? 'Yêu cầu sửa đổi' : 'Chờ duyệt'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `DanhSachKhachHang_GuiChuDauTu_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isSalesAdmin = currentRole === 'SALES_ADMIN' || currentRole === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-white">
                  {isSalesAdmin
                    ? 'Danh Mục Thông Tin Khách Hàng (Sales Admin Workbench)'
                    : 'Thông Tin Khách Hàng Cá Nhân'}
                </h2>
                {isSalesAdmin && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    TOÀN HỆ THỐNG
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {isSalesAdmin
                  ? 'Quản lý toàn bộ khách hàng giao dịch, đối soát căn cọc đính kèm, duyệt PII và xuất báo cáo gửi CĐT.'
                  : 'Khai báo và quản lý hồ sơ khách hàng giao dịch của nhân viên kinh doanh.'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* PII Masking Toggle */}
          <button
            onClick={() => setRevealPII(!revealPII)}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border ${
              revealPII
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
                : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
            }`}
          >
            {revealPII ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-brand-400" />}
            <span>{revealPII ? 'Ẩn PII' : 'Xem PII'}</span>
          </button>

          {/* Export to Investor Button (for Sales Admin / Manager) */}
          {isSalesAdmin && (
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 hover:brightness-110 transition"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Xuất Thông Tin Gửi CĐT</span>
            </button>
          )}

          {/* New Customer Button (for Sales) */}
          {currentRole === 'SALES' && (
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-500 text-xs font-bold transition shadow-lg shadow-brand-600/20"
            >
              <UserPlus className="w-4 h-4" />
              <span>Khai Báo Khách Mới</span>
            </button>
          )}
        </div>
      </div>

      {/* NEW CUSTOMER INTAKE FORM (FOR SALES) */}
      {isFormOpen && (
        <div className="glass-panel p-6 rounded-2xl border border-brand-500/30 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
              <UserPlus className="w-4 h-4 text-brand-400" />
              <span>Nhập Thông Tin Khách Hàng Đặt Cọc</span>
            </h3>
            <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">✕</button>
          </div>

          <form onSubmit={handleSaveCustomer} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">1. Họ và Tên (*)</label>
                <input
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">2. Giới Tính</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">3. Ngày Sinh</label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">4. Số Điện Thoại (*)</label>
                <input
                  type="text"
                  placeholder="0987654321"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">5. Căn Cước / CCCD (*)</label>
                <input
                  type="text"
                  placeholder="012345678912"
                  value={formData.cccd}
                  onChange={(e) => setFormData({ ...formData, cccd: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">6. Email Liên Hệ</label>
                <input
                  type="email"
                  placeholder="khachhang@gmail.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">7. Địa Chỉ Thường Trú</label>
                <input
                  type="text"
                  placeholder="Số 88 Xuân Diệu, Tây Hồ, Hà Nội"
                  value={formData.permanentAddress}
                  onChange={(e) => setFormData({ ...formData, permanentAddress: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-300 block mb-1">8. Địa Chỉ Liên Hệ</label>
                <input
                  type="text"
                  placeholder="Số 88 Xuân Diệu, Tây Hồ, Hà Nội"
                  value={formData.contactAddress}
                  onChange={(e) => setFormData({ ...formData, contactAddress: e.target.value })}
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
              <span>Khách hàng đồng ý cho phép thu thập & xử lý dữ liệu theo quy định pháp luật.</span>
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

      {/* CUSTOMERS LIST TABLE WITH ATTACHED UNIT INFO */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-brand-400" />
              <span>
                {isSalesAdmin
                  ? `Toàn Bộ Khách Hàng Đã Giao Dịch (${filteredCustomers.length})`
                  : `Danh Sách Khách Hàng Của Tôi (${filteredCustomers.length})`}
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {isSalesAdmin
                ? 'Bao gồm thông tin đính kèm của căn khách hàng đã cọc do Sales nhập liệu'
                : 'Khách hàng cá nhân do bạn trực tiếp quản lý và chăm sóc'}
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo tên, SĐT, căn cọc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-xs text-white pl-9 pr-4 py-1.5 rounded-xl outline-none w-56 focus:w-64 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-800">
              <tr>
                <th className="p-3.5">Khách Hàng</th>
                <th className="p-3.5">Liên Hệ & CCCD</th>
                <th className="p-3.5">Địa Chỉ</th>
                {/* ATTACHED PROPERTY COLUMN */}
                <th className="p-3.5">Căn Hộ Đã Cọc (Đính Kèm)</th>
                <th className="p-3.5">Sales Phụ Trách</th>
                <th className="p-3.5">Trạng Thái Xác Minh</th>
                <th className="p-3.5 text-right">Thao Tác Admin / Sales</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Không tìm thấy dữ liệu khách hàng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const latestVer = cust.verifications?.[0];
                  const isVerified = cust.verificationStatus === 'VERIFIED';
                  const attachedProd = cust.attachedProduct;

                  return (
                    <tr key={cust.id} className="hover:bg-slate-800/40 transition">
                      {/* Customer info */}
                      <td className="p-3.5">
                        <div className="font-bold text-white">{cust.fullName}</div>
                        <div className="text-[11px] text-slate-400">
                          {cust.gender || 'Nam'} • {cust.dateOfBirth || '1990'}
                        </div>
                      </td>

                      {/* Contact & CCCD */}
                      <td className="p-3.5 space-y-0.5">
                        <div className="font-mono text-slate-300 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-500" />
                          <span>{cust.phoneDisplay || cust.phone}</span>
                        </div>
                        <div className="font-mono text-brand-400 flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-brand-500" />
                          <span>{cust.cccdDisplay || cust.cccdCiphertext}</span>
                        </div>
                      </td>

                      {/* Address */}
                      <td className="p-3.5 text-slate-400 max-w-xs">
                        <p className="line-clamp-2 text-[11px]">{cust.addressDisplay || cust.permanentAddress || 'Hà Nội'}</p>
                      </td>

                      {/* ATTACHED PROPERTY CARD */}
                      <td className="p-3.5">
                        <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1 min-w-[180px]">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-amber-400">Căn {attachedProd?.productCode || 'A-0501'}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                              Đã Cọc
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-300">
                            {attachedProd?.building || 'Tòa A'} - {attachedProd?.projectName || 'AHS Horizon'}
                          </div>
                          <div className="text-[10px] text-emerald-400 font-semibold flex justify-between pt-0.5 border-t border-slate-800">
                            <span>Tiền cọc:</span>
                            <span>{Number(attachedProd?.depositAmount || 100000000).toLocaleString('vi-VN')} VND</span>
                          </div>
                        </div>
                      </td>

                      {/* Sales Person */}
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-200">
                          {cust.salesEmployee?.fullName || 'Trần Văn Nam'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {cust.salesEmployee?.employeeCode || 'NV-SALE-01'}
                        </div>
                      </td>

                      {/* Verification Status */}
                      <td className="p-3.5">
                        {isVerified ? (
                          <span className="status-available px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Đã Duyệt Hợp Lệ</span>
                          </span>
                        ) : cust.verificationStatus === 'CHANGE_REQUESTED' ? (
                          <span className="status-locked px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Yêu Cầu Nhập Lại</span>
                          </span>
                        ) : (
                          <span className="status-deposited px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max animate-pulse">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Chờ Admin Duyệt</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 text-right space-y-1.5">
                        {/* SALES ADMIN ACTIONS */}
                        {isSalesAdmin && (
                          <div className="flex items-center justify-end space-x-1.5">
                            {!isVerified ? (
                              <>
                                <button
                                  onClick={() => handleQuickApprove(cust)}
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow transition flex items-center space-x-1"
                                  title="Xác nhận hồ sơ khách hàng hợp lệ"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Xác Nhận</span>
                                </button>
                                <button
                                  onClick={() => {
                                    if (latestVer) {
                                      setSelectedVerification(latestVer);
                                    } else {
                                      alert('Chưa có bản ghi xác minh để gửi yêu cầu.');
                                    }
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 font-bold text-[11px] border border-amber-500/40 transition flex items-center space-x-1"
                                  title="Yêu cầu nhân viên kinh doanh nhập lại do sai sót"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Yêu Cầu Sửa</span>
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  if (latestVer) setSelectedVerification(latestVer);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white text-[10px] font-semibold"
                              >
                                Xem Lịch Sử Duyệt
                              </button>
                            )}
                          </div>
                        )}

                        {/* SALES ACTIONS */}
                        {currentRole === 'SALES' && (
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => startEditCustomer(cust)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-brand-400 font-bold text-[11px] transition"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleDeleteCustomer(cust.id)}
                              className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 font-bold text-[11px] transition"
                            >
                              Xóa
                            </button>
                          </div>
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

      {/* SALES ADMIN VERIFICATION / REQUEST CHANGES MODAL */}
      {selectedVerification && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span>Kiểm Duyệt Hồ Sơ Khách Hàng (Sales Admin)</span>
              </h3>
              <button onClick={() => setSelectedVerification(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Đối chiếu thông tin cá nhân khách hàng (Họ tên, SĐT, CCCD, địa chỉ) và thông tin căn đính kèm để bảo đảm tính pháp lý trước khi xuất dữ liệu sang Chủ đầu tư.
            </p>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-400 block">
                Ghi chú hoặc lý do sai sót (Nếu yêu cầu Sales nhập lại):
              </label>
              <textarea
                rows={3}
                placeholder="Ví dụ: Ảnh CCCD mờ số, địa chỉ liên hệ thiếu số nhà, yêu cầu Sales kiểm tra lại..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => handleRequestChanges(selectedVerification.id)}
                className="px-3.5 py-2 rounded-xl bg-amber-600/30 border border-amber-500/50 text-amber-300 hover:bg-amber-600/40 text-xs font-bold transition flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yêu Cầu Nhập Liệu Lại</span>
              </button>

              <button
                onClick={() => handleApproveVerification(selectedVerification.id)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition flex items-center space-x-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Xác Nhận Hợp Lệ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT TO INVESTOR (CHỦ ĐẦU TƯ) MODAL & PREVIEW */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-5xl rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center space-x-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span>Xuất Thông Tin Khách Hàng Gửi Chủ Đầu Tư (CĐT)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Báo cáo danh sách khách hàng và quỹ căn đã đặt cọc sẵn sàng xuất file gửi Chủ đầu tư AHS Group & Vinhomes
                </p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Preview Table Container */}
            <div className="flex-1 overflow-auto rounded-xl border border-slate-800 bg-slate-950/60 p-1">
              <table className="w-full text-xs text-left border-collapse whitespace-nowrap">
                <thead className="bg-slate-900 text-slate-300 font-bold sticky top-0 border-b border-slate-800">
                  <tr>
                    <th className="p-2.5 text-center">STT</th>
                    <th className="p-2.5">Họ và Tên</th>
                    <th className="p-2.5">Giới Tính</th>
                    <th className="p-2.5">Ngày Sinh</th>
                    <th className="p-2.5">Số CCCD</th>
                    <th className="p-2.5">Số ĐT</th>
                    <th className="p-2.5">Mã Căn Cọc</th>
                    <th className="p-2.5">Tòa / Dự Án</th>
                    <th className="p-2.5">Tiền Cọc (VND)</th>
                    <th className="p-2.5">Sales Phụ Trách</th>
                    <th className="p-2.5">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredCustomers.map((c, idx) => (
                    <tr key={c.id} className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-center text-slate-500 font-mono">{idx + 1}</td>
                      <td className="p-2.5 font-bold text-white">{c.fullName}</td>
                      <td className="p-2.5">{c.gender || 'Nam'}</td>
                      <td className="p-2.5">{c.dateOfBirth || '1990'}</td>
                      <td className="p-2.5 font-mono text-brand-400">{c.cccd || c.cccdDisplay}</td>
                      <td className="p-2.5 font-mono">{c.phone}</td>
                      <td className="p-2.5 font-bold text-amber-400">
                        {c.attachedProduct?.productCode || 'A-0501'}
                      </td>
                      <td className="p-2.5">
                        {c.attachedProduct?.building || 'Tòa A'} - {c.attachedProduct?.projectName || 'AHS Grand Horizon'}
                      </td>
                      <td className="p-2.5 text-emerald-400 font-bold">
                        {Number(c.attachedProduct?.depositAmount || 100000000).toLocaleString('vi-VN')}
                      </td>
                      <td className="p-2.5">{c.salesEmployee?.fullName || 'Trần Văn Nam'}</td>
                      <td className="p-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                          {c.verificationStatus === 'VERIFIED' ? 'Đã duyệt' : 'Chờ CĐT duyệt'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <span className="text-xs text-slate-400 font-medium">
                Tổng cộng: <strong>{filteredCustomers.length}</strong> khách hàng đã cọc đủ điều kiện gửi Chủ đầu tư
              </span>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Đóng
                </button>

                <button
                  onClick={handleDownloadCSV}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase flex items-center space-x-2 shadow-lg shadow-emerald-600/30 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Tải File CSV / Excel Gửi CĐT</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
