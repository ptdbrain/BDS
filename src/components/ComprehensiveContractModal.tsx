'use client';

import React, { useState, useEffect } from 'react';
import { UserRole } from '@/lib/types';
import {
  FileText,
  Building,
  User,
  CheckCircle,
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  Send,
  X,
  RotateCcw,
  Check
} from 'lucide-react';
import { broadcastSync } from '@/lib/sync';
import jsPDF from 'jspdf';

interface ComprehensiveContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: any | null;
  product?: any | null;
  currentRole: UserRole;
  currentUser?: any;
  onSuccess?: () => void;
}

export function ComprehensiveContractModal({
  isOpen,
  onClose,
  contract,
  product,
  currentRole,
  currentUser,
  onSuccess
}: ComprehensiveContractModalProps) {
  const activeProduct = contract?.product || product;

  const [formData, setFormData] = useState({
    // HopDong fields
    maHopdong: '',
    maKH: '',
    hotenKH: '',
    sodienthoaiKH: '',
    cccdKH: '',
    emailKH: '',
    diachiKH: 'Hà Nội',
    phuonganthanhtoan: 'Thanh toán chuẩn',
    giahopdong: 4800000000,
    doanhso: 4800000000,
    hoahong: 144000000,
    trangthaiThanhtoan: 'Đã cọc thành công',
    ghichu: 'Hồ sơ giao dịch bất động sản'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Rejection modal prompt
  const [isRejectPromptOpen, setIsRejectPromptOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (contract) {
      const cust = contract.customer;
      const basePrice = contract.agreedPrice || activeProduct?.gianiemyet || activeProduct?.prices?.[0]?.amount || 4800000000;
      setFormData({
        maHopdong: contract.maHopdong || contract.contractNumber || `HĐ-${activeProduct?.productCode || 'CAN'}-2026`,
        maKH: contract.maKH || cust?.id?.slice(0, 8).toUpperCase() || 'KH' + Math.floor(100 + Math.random() * 900),
        hotenKH: contract.hotenKH || cust?.fullName || '',
        sodienthoaiKH: contract.sodienthoaiKH || cust?.phone || '',
        cccdKH: contract.cccdKH || cust?.cccdCiphertext || '00120000' + Math.floor(1000 + Math.random() * 9000),
        emailKH: contract.emailKH || cust?.email || '',
        diachiKH: contract.diachiKH || cust?.addressCiphertext || 'Hà Nội',
        phuonganthanhtoan: contract.phuonganthanhtoan || 'Thanh toán chuẩn',
        giahopdong: Number(contract.giahopdong || basePrice),
        doanhso: Number(contract.doanhso || basePrice),
        hoahong: Number(contract.hoahong || Math.round(basePrice * 0.03)),
        trangthaiThanhtoan: contract.trangthaiThanhtoan || 'Đã cọc thành công',
        ghichu: contract.ghichu || contract.investorNotes || 'Giao dịch căn hộ chính thức'
      });
    } else if (activeProduct) {
      const basePrice = activeProduct.gianiemyet || activeProduct.giaTTC || activeProduct.prices?.[0]?.amount || 4800000000;
      setFormData({
        maHopdong: `HĐ-${activeProduct.productCode.replace(/[\.\-]/g, '')}-2026`,
        maKH: 'KH' + Math.floor(100 + Math.random() * 900),
        hotenKH: '',
        sodienthoaiKH: '',
        cccdKH: '00120000' + Math.floor(1000 + Math.random() * 9000),
        emailKH: '',
        diachiKH: 'Hà Nội',
        phuonganthanhtoan: 'Thanh toán chuẩn',
        giahopdong: Number(basePrice),
        doanhso: Number(basePrice),
        hoahong: Math.round(Number(basePrice) * 0.03),
        trangthaiThanhtoan: 'Đã cọc thành công',
        ghichu: 'Hồ sơ giao dịch căn hộ ' + activeProduct.productCode
      });
    }
  }, [contract, activeProduct]);

  if (!isOpen) return null;

  // Handle plan change
  const handlePaymentPlanChange = (plan: string) => {
    let newPrice = activeProduct?.gianiemyet || activeProduct?.prices?.[0]?.amount || 4800000000;
    if (plan === 'Thanh toán sớm (-10%)') {
      newPrice = activeProduct?.giaTTS || Math.round(newPrice * 0.90);
    } else if (plan === 'Vay ngân hàng HTLS') {
      newPrice = activeProduct?.giaVay || Math.round(newPrice * 1.02);
    } else {
      newPrice = activeProduct?.giaTTC || newPrice;
    }
    const newComm = Math.round(newPrice * 0.03);
    setFormData((prev) => ({
      ...prev,
      phuonganthanhtoan: plan,
      giahopdong: newPrice,
      doanhso: newPrice,
      hoahong: newComm
    }));
  };

  // Submit contract by Sales
  const handleSalesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.hotenKH || !formData.sodienthoaiKH) {
      setErrorMessage('Vui lòng nhập Họ tên và Số điện thoại khách hàng');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const contractId = contract?.id;
      const res = await fetch(contractId ? `/api/v1/contracts/${contractId}` : '/api/v1/contracts', {
        method: contractId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: activeProduct?.id,
          salesEmployeeId: currentUser?.id || 'NV001',
          ...formData,
          status: 'PENDING_REVIEW' // Chờ Sales Admin duyệt
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi lưu hợp đồng');
      }

      setSuccessMessage('Đã gửi thông tin hợp đồng cho Sales Admin phê duyệt!');
      broadcastSync('CONTRACT_UPDATED');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sales Admin Approve
  const handleApprove = async () => {
    if (!contract?.id) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/contracts/${contract.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId: currentUser?.id || 'NV007',
          reviewerName: currentUser?.fullName || 'Vũ Mai Phương (Sales Admin)',
          reason: 'Thông tin hợp đồng và pháp lý khách hàng đầy đủ, chính xác.'
        })
      });
      if (!res.ok) throw new Error('Duyệt hợp đồng thất bại');

      setSuccessMessage('Đã duyệt và ký hợp đồng thành công! Doanh số và hoa hồng đã được ghi nhận.');
      broadcastSync('CONTRACT_UPDATED');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sales Admin Request Changes
  const handleRequestChanges = async () => {
    if (!contract?.id || !rejectReason.trim()) {
      setErrorMessage('Vui lòng nhập lý do yêu cầu sửa đổi hợp đồng');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/v1/contracts/${contract.id}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewerId: currentUser?.id || 'NV007',
          reviewerName: currentUser?.fullName || 'Vũ Mai Phương (Sales Admin)',
          reason: rejectReason.trim()
        })
      });
      if (!res.ok) throw new Error('Yêu cầu chỉnh sửa thất bại');

      setSuccessMessage('Đã gửi yêu cầu nhập lại thông tin cho Nhân viên kinh doanh.');
      setIsRejectPromptOpen(false);
      broadcastSync('CONTRACT_UPDATED');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Export PDF
  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.setTextColor(30, 58, 138);
    doc.text('HO SO HOP DONG GIAO DICH BAT DONG SAN AHS', 20, 20);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Ma Hop Dong: ${formData.maHopdong}`, 20, 30);
    doc.text(`Ngay xuat: ${new Date().toLocaleDateString('vi-VN')}`, 20, 36);

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text('1. THONG TIN SAN PHAM [SanPham]:', 20, 48);
    doc.setFontSize(10);
    doc.text(`- Ma Can: ${activeProduct?.productCode || activeProduct?.maCan}`, 25, 56);
    doc.text(`- Toa: ${activeProduct?.building} | Tang: ${activeProduct?.floor}`, 25, 63);
    doc.text(`- Dien tich: ${activeProduct?.area || activeProduct?.dientich} m2 | Huong: ${activeProduct?.direction || activeProduct?.huong}`, 25, 70);
    doc.text(`- Gia niem yet: ${Number(activeProduct?.gianiemyet || activeProduct?.prices?.[0]?.amount).toLocaleString('vi-VN')} VND`, 25, 77);

    doc.setFontSize(12);
    doc.text('2. THONG TIN HOP DONG & KHACH HANG [HopDong]:', 20, 90);
    doc.setFontSize(10);
    doc.text(`- Khach hang: ${formData.hotenKH}`, 25, 98);
    doc.text(`- So dien thoai: ${formData.sodienthoaiKH}`, 25, 105);
    doc.text(`- CCCD: ${formData.cccdKH}`, 25, 112);
    doc.text(`- Phuong an thanh toan: ${formData.phuonganthanhtoan}`, 25, 119);
    doc.text(`- Gia hop dong: ${Number(formData.giahopdong).toLocaleString('vi-VN')} VND`, 25, 126);
    doc.text(`- Doanh so: ${Number(formData.doanhso).toLocaleString('vi-VN')} VND`, 25, 133);
    doc.text(`- Hoa hong: ${Number(formData.hoahong).toLocaleString('vi-VN')} VND`, 25, 140);
    doc.text(`- Trang thai hop dong: ${contract?.signingStatus === 'DA_KY' ? 'DA KY' : 'CHO DUYET'}`, 25, 147);

    doc.save(`HopDong_${formData.maHopdong}.pdf`);
  };

  const isSalesAdmin = currentRole === 'SALES_ADMIN' || currentRole === 'MANAGER';
  const isChangeRequested = contract?.status === 'CHANGE_REQUESTED';
  const isApproved = contract?.status === 'SIGNED' || contract?.status === 'APPROVED' || contract?.signingStatus === 'DA_KY';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="glass-panel w-full max-w-3xl rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-black text-white">
                  Hồ Sơ Hợp Đồng Giao Dịch & Thông Tin Sản Phẩm
                </h3>
                {isApproved ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                    ĐÃ PHÊ DUYỆT
                  </span>
                ) : isChangeRequested ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                    YÊU CẦU NHẬP LẠI
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    CHỜ SALES ADMIN DUYỆT
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Toàn bộ các trường theo chuẩn Sơ đồ lớp: <strong>Lớp Sản Phẩm [SanPham]</strong> + <strong>Lớp Hợp Đồng [HopDong]</strong>
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

        {/* Change Request Banner (If Sales Admin requested revisions) */}
        {isChangeRequested && (
          <div className="p-4 bg-rose-950/40 border-b border-rose-500/40 flex items-start space-x-3 text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <div className="font-bold text-rose-300 uppercase tracking-wider">
                Yêu Cầu Nhập Lại Từ Sales Admin:
              </div>
              <p className="font-medium text-white">
                {contract?.investorNotes || 'Vui lòng kiểm tra và nhập lại thông tin khách hàng, số CCCD hoặc phương án thanh toán.'}
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-950/50 border-b border-rose-500/40 text-rose-300 text-xs text-center font-semibold">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-emerald-950/50 border-b border-emerald-500/40 text-emerald-300 text-xs text-center font-semibold">
            {successMessage}
          </div>
        )}

        {/* Modal Body: Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 1. LỚP SẢN PHẨM [SanPham] */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-extrabold text-brand-400 uppercase tracking-wider flex items-center space-x-2">
                <Building className="w-4 h-4" />
                <span>1. Thông Tin Lớp Sản Phẩm [SanPham]</span>
              </h4>
              <span className="text-[11px] font-bold text-purple-400 bg-purple-950/30 px-2 py-0.5 rounded-md border border-purple-500/30">
                Trạng thái: ĐÃ BÁN
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Mã căn [MaCan]</span>
                <span className="font-bold text-white text-sm">{activeProduct?.productCode || activeProduct?.maCan || 'A-0302'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Tòa & Tầng</span>
                <span className="font-bold text-slate-200">{activeProduct?.building} - Tầng {activeProduct?.floor}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Diện tích [DienTich]</span>
                <span className="font-bold text-slate-200">{activeProduct?.area || activeProduct?.dientich} m²</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Hướng [Huong]</span>
                <span className="font-bold text-slate-200">{activeProduct?.direction || activeProduct?.huong}</span>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px]">Giá niêm yết [GiaNiemYet]</span>
                <span className="font-bold text-brand-400">
                  {Number(activeProduct?.gianiemyet || activeProduct?.prices?.[0]?.amount || 4800000000).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Giá TT sớm [GiaTTS] (-10%)</span>
                <span className="font-bold text-amber-300">
                  {Number(activeProduct?.giaTTS || ((activeProduct?.gianiemyet || 4800000000) * 0.90)).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Giá TT chuẩn [GiaTTC]</span>
                <span className="font-bold text-blue-300">
                  {Number(activeProduct?.giaTTC || activeProduct?.gianiemyet || 4800000000).toLocaleString('vi-VN')} đ
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Giá vay [GiaVay]</span>
                <span className="font-bold text-emerald-300">
                  {Number(activeProduct?.giaVay || ((activeProduct?.gianiemyet || 4800000000) * 1.02)).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>
          </div>

          {/* 2. LỚP HỢP ĐỒNG [HopDong] & KHÁCH HÀNG */}
          <form id="contract-form" onSubmit={handleSalesSubmit} className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="font-extrabold text-purple-400 uppercase tracking-wider flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>2. Thông Tin Lớp Hợp Đồng [HopDong] & Khách Hàng</span>
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">MaHopDong: {formData.maHopdong}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Họ tên KH */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Họ và Tên Khách Hàng [HoTenKH] (*)
                </label>
                <input
                  type="text"
                  required
                  value={formData.hotenKH}
                  onChange={(e) => setFormData({ ...formData, hotenKH: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Ví dụ: Nguyễn Văn Hưng"
                />
              </div>

              {/* Số điện thoại KH */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Số Điện Thoại [SoDienThoaiKH] (*)
                </label>
                <input
                  type="text"
                  required
                  value={formData.sodienthoaiKH}
                  onChange={(e) => setFormData({ ...formData, sodienthoaiKH: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Ví dụ: 0912345678"
                />
              </div>

              {/* Số CCCD KH */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Số CCCD / Hộ Chiếu [CCCDKH] (*)
                </label>
                <input
                  type="text"
                  required
                  value={formData.cccdKH}
                  onChange={(e) => setFormData({ ...formData, cccdKH: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Ví dụ: 001200008888"
                />
              </div>

              {/* Email KH */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Email Khách Hàng [EmailKH]
                </label>
                <input
                  type="email"
                  value={formData.emailKH}
                  onChange={(e) => setFormData({ ...formData, emailKH: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="khachhang@example.com"
                />
              </div>

              {/* Địa chỉ KH */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Địa Chỉ Thường Trú [DiaChiKH]
                </label>
                <input
                  type="text"
                  value={formData.diachiKH}
                  onChange={(e) => setFormData({ ...formData, diachiKH: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-purple-500 outline-none"
                  placeholder="Cầu Giấy, Hà Nội"
                />
              </div>

              {/* Phương Án Thanh Toán */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Phương Án Thanh Toán [PhuongAnThanhToan]
                </label>
                <select
                  value={formData.phuonganthanhtoan}
                  onChange={(e) => handlePaymentPlanChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white focus:ring-2 focus:ring-purple-500 outline-none font-bold"
                >
                  <option value="Thanh toán chuẩn">1. Thanh toán chuẩn (100% Giá TTC)</option>
                  <option value="Thanh toán sớm (-10%)">2. Thanh toán sớm (-10% Giá TTS)</option>
                  <option value="Vay ngân hàng HTLS">3. Vay ngân hàng HTLS 0% (Giá Vay)</option>
                </select>
              </div>

              {/* Giá Hợp Đồng */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Giá Trị Hợp Đồng [GiaHopDong] (VND)
                </label>
                <input
                  type="number"
                  value={formData.giahopdong}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setFormData({
                      ...formData,
                      giahopdong: v,
                      doanhso: v,
                      hoahong: Math.round(v * 0.03)
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-brand-400 font-bold outline-none"
                />
              </div>

              {/* Doanh số & Hoa hồng */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">Doanh Số [DoanhSo]</label>
                  <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-bold">
                    {Number(formData.doanhso).toLocaleString('vi-VN')} đ
                  </div>
                </div>
                <div>
                  <label className="block text-slate-400 text-[10px] mb-1">Hoa Hồng (3%) [HoaHong]</label>
                  <div className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-purple-400 font-bold">
                    {Number(formData.hoahong).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>

              {/* Trạng thái thanh toán */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Trạng Thái Thanh Toán [TrangThaiThanhToan]
                </label>
                <select
                  value={formData.trangthaiThanhtoan}
                  onChange={(e) => setFormData({ ...formData, trangthaiThanhtoan: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none"
                >
                  <option value="Đã cọc thành công">Đã cọc thành công</option>
                  <option value="Đã thanh toán đợt 1">Đã thanh toán đợt 1</option>
                  <option value="Hoàn tất">Hoàn tất thanh toán</option>
                </select>
              </div>

              {/* Ghi chú */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Ghi Chú Hợp Đồng [GhiChu]
                </label>
                <input
                  type="text"
                  value={formData.ghichu}
                  onChange={(e) => setFormData({ ...formData, ghichu: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white outline-none"
                  placeholder="Ghi chú hồ sơ hoặc yêu cầu của CĐT"
                />
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất PDF</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
            >
              Đóng
            </button>

            {/* Sales submit button */}
            {!isSalesAdmin && !isApproved && (
              <button
                type="submit"
                form="contract-form"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-600/30 hover:brightness-110 flex items-center space-x-1.5 transition disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Đang gửi...' : 'Gửi Hợp Đồng Cho Sales Admin Duyệt'}</span>
              </button>
            )}

            {/* Sales Admin Actions */}
            {isSalesAdmin && !isApproved && (
              <>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsRejectPromptOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 text-xs font-bold flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Yêu Cầu Nhập Lại</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleApprove}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 hover:brightness-110 flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Đang duyệt...' : 'Xác Nhận Thông Tin (Duyệt HĐ)'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Prompt Modal for Sales Admin to enter rejection reason */}
        {isRejectPromptOpen && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="glass-panel w-full max-w-md p-5 rounded-2xl border border-rose-500/40 space-y-4">
              <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Yêu Cầu Nhân Viên Kinh Doanh Nhập Lại</span>
              </div>
              <p className="text-xs text-slate-300">
                Nhập rõ lý do từ chối để nhân viên kinh doanh biết cần bổ sung hoặc chỉnh sửa trường nào:
              </p>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Khách hàng chưa bổ sung ảnh chụp CCCD mặt sau; sai phương án thanh toán sớm..."
                className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs outline-none focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setIsRejectPromptOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                >
                  Hủy
                </button>
                <button
                  onClick={handleRequestChanges}
                  disabled={!rejectReason.trim()}
                  className="px-4 py-1.5 rounded-lg bg-rose-600 text-white font-bold text-xs hover:bg-rose-500 transition disabled:opacity-50"
                >
                  Gửi Yêu Cầu Sửa
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
