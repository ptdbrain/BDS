'use client';

import React, { useState } from 'react';
import { PlusCircle, Building, CheckCircle, AlertCircle, X, DollarSign, Layers } from 'lucide-react';

interface AddProductModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddProductModal({
  projectId,
  isOpen,
  onClose,
  onSuccess
}: AddProductModalProps) {
  const [formData, setFormData] = useState({
    productCode: '',
    building: 'Tòa A (Horizon Tower)',
    floor: '12',
    area: '75.5',
    direction: 'Đông Nam',
    handoverPlan: 'Hoàn thiện cao cấp',
    amount: '4800000000',
    depositAmount: '100000000',
    status: 'AVAILABLE'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!formData.productCode || !formData.building || !formData.floor || !formData.area || !formData.amount) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc (*)!');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          productCode: formData.productCode.trim().toUpperCase(),
          building: formData.building.trim(),
          floor: parseInt(formData.floor, 10),
          area: parseFloat(formData.area),
          direction: formData.direction,
          handoverPlan: formData.handoverPlan,
          amount: parseFloat(formData.amount),
          depositAmount: parseFloat(formData.depositAmount),
          status: formData.status,
          actorId: 'emp_prod_01',
          actorName: 'Nguyễn Tiến Dũng'
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Thêm căn hộ vào quỹ hàng thất bại');
        setIsLoading(false);
        return;
      }

      setSuccessMsg(`Đã thêm thành công căn ${formData.productCode} vào quỹ hàng!`);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 900);
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan text-white shadow-md">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Thêm Căn Hộ Vào Quỹ Hàng (Thêm Từng Trường)</h3>
              <p className="text-xs text-slate-400">Dành riêng cho Nhân viên Quản lý Sản phẩm (Product Admin)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50 text-emerald-300 text-xs flex items-center space-x-2 animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* 1. Mã Căn */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">1. Mã Căn Hộ (*)</label>
              <input
                type="text"
                placeholder="VD: A-1505"
                value={formData.productCode}
                onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500 font-bold uppercase"
                required
              />
            </div>

            {/* 2. Tòa Nhà */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">2. Tòa Tháp (*)</label>
              <select
                value={formData.building}
                onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500 font-medium"
              >
                <option value="Tòa A (Horizon Tower)">Tòa A (Horizon Tower)</option>
                <option value="Tòa B (Skyline Tower)">Tòa B (Skyline Tower)</option>
                <option value="Tòa C (Grand Tower)">Tòa C (Grand Tower)</option>
              </select>
            </div>

            {/* 3. Tầng */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">3. Tầng Số (*)</label>
              <input
                type="number"
                min="1"
                max="50"
                placeholder="VD: 15"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                required
              />
            </div>

            {/* 4. Diện Tích */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">4. Diện Tích Thông Thủy (m²) (*)</label>
              <input
                type="number"
                step="0.1"
                placeholder="VD: 75.5"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500 font-semibold"
                required
              />
            </div>

            {/* 5. Hướng Ban Công */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">5. Hướng Ban Công</label>
              <select
                value={formData.direction}
                onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500 font-medium"
              >
                <option value="Đông Nam">Đông Nam (Mát mẻ)</option>
                <option value="Đông Bắc">Đông Bắc</option>
                <option value="Tây Nam">Tây Nam</option>
                <option value="Tây Bắc">Tây Bắc</option>
                <option value="Chính Nam">Chính Nam</option>
                <option value="Chính Đông">Chính Đông</option>
              </select>
            </div>

            {/* 6. Tiêu Chuẩn Bàn Giao */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">6. Gói Bàn Giao</label>
              <select
                value={formData.handoverPlan}
                onChange={(e) => setFormData({ ...formData, handoverPlan: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500 font-medium"
              >
                <option value="Hoàn thiện cao cấp">Hoàn thiện cao cấp (Full nội thất)</option>
                <option value="Bàn giao thô">Bàn giao thô (Tự do thiết kế)</option>
                <option value="Hoàn thiện cơ bản">Hoàn thiện cơ bản liền tường</option>
              </select>
            </div>

            {/* 7. Giá Niêm Yết */}
            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-bold mb-1">7. Giá Niêm Yết (VND) (*)</label>
              <div className="relative">
                <input
                  type="number"
                  step="1000000"
                  placeholder="VD: 4800000000"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500 font-bold text-brand-400 pl-3 pr-24"
                  required
                />
                <span className="absolute right-3 top-2.5 text-[11px] text-slate-400 font-bold">
                  {formData.amount ? `${(parseFloat(formData.amount) / 1000000000).toFixed(2)} Tỷ` : ''}
                </span>
              </div>
            </div>

            {/* 8. Tiền Cọc */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">8. Tiền Cọc Niêm Yết (VND)</label>
              <input
                type="number"
                step="10000000"
                placeholder="VD: 100000000"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500 font-semibold text-emerald-400"
              />
            </div>

            {/* 9. Trạng Thái Khởi Tạo */}
            <div>
              <label className="block text-slate-300 font-bold mb-1">9. Trạng Thái Khởi Tạo</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500 font-medium"
              >
                <option value="AVAILABLE">Còn Hàng (Mở bán ngay)</option>
                <option value="UNAVAILABLE">Tạm Ngưng (Khóa kỹ thuật)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase shadow-lg shadow-emerald-600/30 transition flex items-center space-x-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{isLoading ? 'Đang lưu...' : 'Thêm Vào Quỹ Hàng'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
