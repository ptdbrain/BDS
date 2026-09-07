'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  QrCode,
  User,
  Phone,
  CreditCard,
  Mail,
  MapPin,
  Building,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Clock
} from 'lucide-react';
import { broadcastSync } from '@/lib/sync';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: any[];
  selectedProjectId?: string;
  currentUser?: any;
  onSuccess: (newBooking: any) => void;
}

export function BookingModal({
  isOpen,
  onClose,
  projects = [],
  selectedProjectId,
  currentUser,
  onSuccess
}: BookingModalProps) {
  const [step, setStep] = useState<'INPUT' | 'QR'>('INPUT');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Clean empty form state for genuine customer input
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerCccd: '',
    customerEmail: '',
    customerAddress: 'Hà Nội',
    projectId: selectedProjectId || projects[0]?.id || '',
    depositAmount: '50000000',
    notes: ''
  });

  useEffect(() => {
    if (selectedProjectId) {
      setFormData(prev => ({ ...prev, projectId: selectedProjectId }));
    } else if (projects.length > 0 && !formData.projectId) {
      setFormData(prev => ({ ...prev, projectId: projects[0].id }));
    }
  }, [selectedProjectId, projects]);

  if (!isOpen) return null;

  const currentProject = projects.find(p => p.id === formData.projectId) || projects[0];

  const handleProceedToQR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName.trim()) {
      setErrorMessage('Vui lòng nhập Họ và Tên khách hàng!');
      return;
    }
    if (!formData.customerPhone.trim()) {
      setErrorMessage('Vui lòng nhập Số điện thoại khách hàng!');
      return;
    }
    if (!formData.projectId) {
      setErrorMessage('Vui lòng chọn Dự án đặt chỗ!');
      return;
    }
    setErrorMessage(null);
    setStep('QR');
  };

  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      let currentSalesId = currentUser?.id || 'NV001';
      try {
        const authUser = localStorage.getItem('ahs_auth_user');
        if (authUser) {
          const parsed = JSON.parse(authUser);
          if (parsed.id || parsed.employeeCode) {
            currentSalesId = parsed.id || parsed.employeeCode;
          }
        }
      } catch (e) {}

      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: formData.projectId,
          customerName: formData.customerName.trim(),
          customerPhone: formData.customerPhone.trim(),
          customerCccd: formData.customerCccd.trim(),
          customerEmail: formData.customerEmail.trim(),
          customerAddress: formData.customerAddress.trim(),
          depositAmount: parseFloat(formData.depositAmount || '50000000'),
          notes: formData.notes.trim() || `Khách hàng đặt chỗ ưu tiên dự án ${currentProject?.name || ''}`,
          salesEmployeeId: currentSalesId,
          trangthaikhopcan: 'CHO_DUYET_COC' // Chờ Sales Admin duyệt
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Đăng ký booking thất bại');
      }

      const resData = await res.json();
      const newBooking = resData.data;

      // Ensure full project & sales details exist on client object
      if (!newBooking.project && currentProject) {
        newBooking.project = currentProject;
      }
      if (!newBooking.salesEmployee && currentUser) {
        newBooking.salesEmployee = currentUser;
      }

      // Persist to localStorage key ahs_custom_bookings for Vercel multi-container persistence
      try {
        const stored = localStorage.getItem('ahs_custom_bookings');
        const customBookings = stored ? JSON.parse(stored) : [];
        const existingIdx = customBookings.findIndex((b: any) => b.id === newBooking.id || b.maLuotBooking === newBooking.maLuotBooking);
        if (existingIdx >= 0) {
          customBookings[existingIdx] = newBooking;
        } else {
          customBookings.unshift(newBooking);
        }
        localStorage.setItem('ahs_custom_bookings', JSON.stringify(customBookings));
      } catch (e) {
        console.warn('Failed to save booking to localStorage:', e);
      }

      // Reset form
      setFormData({
        customerName: '',
        customerPhone: '',
        customerCccd: '',
        customerEmail: '',
        customerAddress: 'Hà Nội',
        projectId: selectedProjectId || projects[0]?.id || '',
        depositAmount: '50000000',
        notes: ''
      });
      setStep('INPUT');

      // Notify parent & cross-tab sync
      onSuccess(newBooking);
      broadcastSync('BOOKING_UPDATED');
      broadcastSync('CUSTOMER_UPDATED');
      broadcastSync('ALL_DATA_UPDATED');

      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tạo booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const cleanPhone = formData.customerPhone.trim() || '0988888888';
  const cleanName = formData.customerName.trim() || 'KHACH HANG';
  const transferContent = `AHS BOOKING ${cleanPhone} ${cleanName}`.toUpperCase();

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="glass-panel w-full max-w-xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-white">
                  {step === 'INPUT' ? '1. Bảng Điền Thông Tin Khách Hàng Booking' : '2. Quét Mã VietQR & Xác Nhận Cọc'}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  {step === 'INPUT' ? 'BƯỚC 1/2' : 'BƯỚC 2/2'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {step === 'INPUT'
                  ? 'Nhân viên kinh doanh nhập chính xác thông tin khách hàng đặt chỗ ưu tiên.'
                  : 'Khách hàng quét mã VietQR nộp cọc 50.000.000 VNĐ để gửi Sales Admin duyệt.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/60 border-b border-rose-500/40 text-xs text-rose-300 px-6 font-semibold flex items-center justify-between">
            <span>{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white font-bold ml-2">✕</button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {step === 'INPUT' ? (
            <form id="booking-form" onSubmit={handleProceedToQR} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 flex items-center space-x-2.5 text-amber-300">
                <User className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Vui lòng điền thông tin khách hàng thực tế. Hệ thống sẽ tự động gán STTBooking và hiển thị lên bảng điều khiển ngay sau khi nộp cọc.
                </span>
              </div>

              {/* Dự án đặt chỗ */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dự Án Đặt Chỗ (*)</span>
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 text-xs font-semibold"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code || 'DA'}) • Chủ đầu tư: {p.developer?.name || 'AHS'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Grid: Tên & SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 flex items-center space-x-1.5">
                    <User className="w-3.5 h-3.5 text-amber-400" />
                    <span>Họ và Tên Khách Hàng (*)</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Hoàng Thị Hương Giang"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 flex items-center space-x-1.5">
                    <Phone className="w-3.5 h-3.5 text-amber-400" />
                    <span>Số Điện Thoại Khách Hàng (*)</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ví dụ: 0912345678"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 font-mono font-bold text-xs"
                  />
                </div>
              </div>

              {/* Grid: CCCD & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 flex items-center space-x-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Số CCCD / Hộ Chiếu</span>
                  </label>
                  <input
                    type="text"
                    placeholder="00120000450"
                    value={formData.customerCccd}
                    onChange={(e) => setFormData({ ...formData, customerCccd: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5 flex items-center space-x-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Email Khách Hàng</span>
                  </label>
                  <input
                    type="email"
                    placeholder="khachhang@gmail.com"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 text-xs"
                  />
                </div>
              </div>

              {/* Địa chỉ */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center space-x-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Địa Chỉ Thường Trú</span>
                </label>
                <input
                  type="text"
                  placeholder="Hà Nội, Việt Nam"
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 text-xs"
                />
              </div>

              {/* Tiền cọc */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Số Tiền Cọc Giữ Chỗ (Mặc định chuẩn 50.000.000 đ)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value="50.000.000 VND"
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900/80 border border-amber-500/40 text-amber-400 font-mono font-black text-sm outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] uppercase font-bold text-amber-400/80 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                    Cố Định
                  </span>
                </div>
              </div>

              {/* Nguyện vọng */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Nhu Cầu & Nguyện Vọng Căn Hộ
                </label>
                <textarea
                  rows={2}
                  placeholder="Ví dụ: Nguyện vọng căn 2PN tầng trung ban công Đông Nam, tòa Park 1..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none focus:border-amber-500 text-xs"
                />
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Customer Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/40 space-y-2 text-xs">
                <div className="font-bold text-amber-400 uppercase tracking-wider border-b border-slate-800 pb-2 flex items-center justify-between">
                  <span>Thông Tin Khách Hàng Đặt Chỗ</span>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                    50.000.000 đ
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Khách hàng:</span>
                    <strong className="text-white text-sm">{formData.customerName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Số điện thoại:</span>
                    <strong className="text-emerald-400 font-mono text-sm">{formData.customerPhone}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Dự án:</span>
                    <span className="text-slate-200 font-medium">{currentProject?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">CCCD:</span>
                    <span className="text-slate-200 font-mono">{formData.customerCccd || 'Chưa cập nhật'}</span>
                  </div>
                </div>

                {formData.notes && (
                  <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 italic">
                    Nguyện vọng: {formData.notes}
                  </div>
                )}
              </div>

              {/* VietQR & Transfer Instructions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* QR Code image */}
                <div className="bg-white p-3.5 rounded-2xl shadow-xl flex flex-col items-center justify-center border-2 border-amber-500">
                  <img
                    src={`https://img.vietqr.io/image/TCB-19036868689999-compact2.png?amount=50000000&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent('CONG TY CO PHAN BAT DONG SAN AHS')}`}
                    alt="VietQR Booking Deposit"
                    className="w-44 h-44 object-contain"
                  />
                  <div className="text-[10px] text-slate-700 font-bold mt-1.5 text-center">
                    VietQR • Techcombank 50M
                  </div>
                </div>

                {/* Transfer text info */}
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Số Tài Khoản Thụ Hưởng</span>
                    <span className="font-mono font-black text-amber-400 text-sm block">19036868689999</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Chủ Tài Khoản</span>
                    <span className="font-bold text-slate-200 block">CTCP BAT DONG SAN AHS</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Ngân Hàng</span>
                    <span className="font-bold text-slate-200 block">Techcombank</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase block">Nội Dung Chuyển Khoản</span>
                    <span className="font-mono font-bold text-amber-300 text-xs block bg-slate-900 p-2 rounded-lg border border-slate-700 break-words">
                      {transferContent}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3">
          {step === 'INPUT' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
              >
                Hủy Bỏ
              </button>

              <button
                type="submit"
                form="booking-form"
                disabled={!formData.customerName.trim() || !formData.customerPhone.trim()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black uppercase flex items-center space-x-1.5 shadow-lg shadow-amber-500/20 transition disabled:opacity-40"
              >
                <span>Tiếp Tục ➔ Quét Mã VietQR 50M</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep('INPUT')}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Quay Lại Sửa Thông Tin</span>
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConfirmPayment}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Đang gửi...' : 'NVKD Xác Nhận Đã Chuyển Khoản ➔ Gửi Admin'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
