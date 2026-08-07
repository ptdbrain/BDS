'use client';

import React, { useState } from 'react';
import { UserRole } from '@/lib/types';
import jsPDF from 'jspdf';
import {
  FileText,
  ShieldCheck,
  CheckCircle,
  FileEdit,
  Download,
  Building,
  DollarSign,
  User,
  Check,
  X,
  Plus,
  Sparkles
} from 'lucide-react';

interface ContractWorkflowProps {
  contracts: any[];
  products: any[];
  customers: any[];
  currentRole: UserRole;
  onRefresh: () => void;
}

export function ContractWorkflow({
  contracts,
  products,
  customers,
  currentRole,
  onRefresh
}: ContractWorkflowProps) {
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [selectedContract, setSelectedContract] = useState<any | null>(null);
  const [reviewReason, setReviewReason] = useState<string>('');

  // Wizard form state
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [agreedPrice, setAgreedPrice] = useState<string>('4500000000');

  // Filter products ready for contract (DEPOSITED status)
  const depositedProducts = products.filter(p => p.status === 'DEPOSITED');
  const verifiedCustomers = customers.filter(c => c.verificationStatus === 'VERIFIED');

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !selectedCustomerId) return;

    try {
      const prod = products.find(p => p.id === selectedProductId);
      const planId = prod?.prices?.[0]?.paymentPlanId || 'default_plan';

      const res = await fetch('/api/v1/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          customerId: selectedCustomerId,
          paymentPlanId: planId,
          agreedPrice: parseFloat(agreedPrice) || 4500000000
        })
      });

      if (res.ok) {
        setIsWizardOpen(false);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleApproveContract = async (contractId: string) => {
    try {
      const res = await fetch(`/api/v1/contracts/${contractId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewerId: 'emp_admin_01', reviewerName: 'Phạm Thị Mai', reason: reviewReason || 'Hợp đồng hợp lệ' })
      });
      if (res.ok) {
        setSelectedContract(null);
        setReviewReason('');
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkSigned = async (contractId: string) => {
    try {
      const res = await fetch(`/api/v1/contracts/${contractId}/mark-signed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: 'emp_admin_01', actorName: 'Phạm Thị Mai' })
      });
      if (res.ok) {
        setSelectedContract(null);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Export PDF Document
  const handleExportContractPDF = (contract: any) => {
    const doc = new jsPDF();
    const snapshot = contract.snapshotJson ? JSON.parse(contract.snapshotJson) : {};

    // Watermark & Header
    doc.setFontSize(22);
    doc.setTextColor(0, 102, 255);
    doc.text('CONG TY CO PHAN BAT DONG SAN AHS', 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('AHS REAL ESTATE JSC - CONG THONG TIN HDMB CONG NGHE', 20, 32);
    doc.line(20, 36, 190, 36);

    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('HOP DONG MUA BAN CAN HO', 70, 50);

    doc.setFontSize(11);
    doc.text(`So Hop Dong: ${contract.contractNumber}`, 20, 65);
    doc.text(`Ngay Lap: ${new Date(contract.createdAt).toLocaleDateString('vi-VN')}`, 20, 73);
    doc.text(`Trang Thai: ${contract.status}`, 20, 81);

    // Section 1: Parties
    doc.setFontSize(13);
    doc.setTextColor(0, 102, 255);
    doc.text('BEN A: BEN BAN (CUM CHU DAU TU AHS)', 20, 95);
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text('Dai dien: CONG TY CO PHAN BAT DONG SAN AHS', 20, 103);
    doc.text('Dia chi: Tay Ho, Ha Noi - Hotline: 1900 8888', 20, 110);

    doc.setFontSize(13);
    doc.setTextColor(0, 102, 255);
    doc.text('BEN B: BEN MUA (KHACH HANG)', 20, 125);
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Ho va Ten: ${contract.customer?.fullName || snapshot.customerName || 'N/A'}`, 20, 133);
    doc.text(`So Dien Thoai: ${contract.customer?.phone || '0987654321'}`, 20, 140);
    doc.text(`CCCD: ${contract.customer?.cccdCiphertext || '012345678912'}`, 20, 147);

    // Section 2: Property
    doc.setFontSize(13);
    doc.setTextColor(0, 102, 255);
    doc.text('THONG TIN SAN PHAM BAT DONG SAN', 20, 162);
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Ma Can Ho: ${contract.product?.productCode || snapshot.productCode}`, 20, 170);
    doc.text(`Toa / Tang: ${contract.product?.building} - Tang ${contract.product?.floor}`, 20, 177);
    doc.text(`Dien Tich Thong Thuy: ${contract.product?.area} m2`, 20, 184);
    doc.text(`Gia Tri Hop Dong: ${Number(contract.agreedPrice).toLocaleString('vi-VN')} VND`, 20, 191);

    // Signatures
    doc.text('DAI DIEN BEN A (AHS)', 30, 220);
    doc.text('DAI DIEN BEN B (KHACH HANG)', 130, 220);
    doc.text('(Ky va ghi ro ho ten)', 35, 227);
    doc.text('(Ky va ghi ro ho ten)', 135, 227);

    doc.save(`HopDong_${contract.contractNumber}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Quản Lý Hợp Đồng & Phê Duyệt Giao Dịch</h2>
              <p className="text-xs text-slate-400">Quy trình Sales Admin đối chiếu cọc, duyệt hợp đồng & hoàn tất bán hàng</p>
            </div>
          </div>
        </div>

        {currentRole === 'SALES' && (
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg hover:brightness-110 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Lập Hồ Sơ Hợp Đồng</span>
          </button>
        )}
      </div>

      {/* CREATE CONTRACT WIZARD MODAL */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <span>Lập Hồ Sơ Hợp Đồng Mua Bán</span>
              </h3>
              <button onClick={() => setIsWizardOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateContract} className="space-y-4">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Chọn Căn Đã Cọc (*)</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="">-- Chọn Căn Hộ (Trạng Thái Đã Cọc) --</option>
                  {depositedProducts.map(p => (
                    <option key={p.id} value={p.id}>Căn {p.productCode} - {p.building} (Đã Cọc 100M)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Chọn Khách Hàng Đã Được Duyệt PII (*)</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none"
                >
                  <option value="">-- Chọn Khách Hàng (Đã Duyệt) --</option>
                  {verifiedCustomers.map(c => (
                    <option key={c.id} value={c.id}>{c.fullName} - {c.phone}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Giá Trị Hợp Đồng Thỏa Thuận (VND)</label>
                <input
                  type="number"
                  value={agreedPrice}
                  onChange={(e) => setAgreedPrice(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-xs text-white p-2.5 rounded-xl outline-none font-bold text-brand-400"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsWizardOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg"
                >
                  Trình Sales Admin Duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTRACTS WORKBENCH TABLE */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-800">
            <tr>
              <th className="p-3.5">Số Hợp Đồng</th>
              <th className="p-3.5">Căn Hộ</th>
              <th className="p-3.5">Khách Hàng</th>
              <th className="p-3.5">Sales</th>
              <th className="p-3.5">Giá Trị HĐ (VND)</th>
              <th className="p-3.5">Trạng Thái HĐ</th>
              <th className="p-3.5 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {contracts.map((ct) => {
              const isApproved = ct.status === 'APPROVED';
              const isSigned = ct.status === 'SIGNED';

              return (
                <tr key={ct.id} className="hover:bg-slate-800/40 transition">
                  <td className="p-3.5 font-bold font-mono text-brand-400">{ct.contractNumber}</td>
                  <td className="p-3.5 font-bold text-white">Căn {ct.product?.productCode}</td>
                  <td className="p-3.5">{ct.customer?.fullName}</td>
                  <td className="p-3.5 text-slate-400">{ct.salesEmployee?.fullName}</td>
                  <td className="p-3.5 font-semibold text-emerald-400">
                    {Number(ct.agreedPrice).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3.5">
                    {isSigned ? (
                      <span className="status-sold px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
                        <Sparkles className="w-3 h-3" /> Đã Ký Mua Bán
                      </span>
                    ) : isApproved ? (
                      <span className="status-available px-2.5 py-1 rounded-full text-[11px] font-bold w-max block">Sales Admin Đã Duyệt</span>
                    ) : (
                      <span className="status-locked px-2.5 py-1 rounded-full text-[11px] font-bold w-max block">Chờ Duyệt Hợp Đồng</span>
                    )}
                  </td>
                  <td className="p-3.5 text-right space-x-2">
                    <button
                      onClick={() => handleExportContractPDF(ct)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:text-white text-[11px] font-semibold transition"
                      title="Xuất File PDF"
                    >
                      <Download className="w-3.5 h-3.5 inline mr-1" />
                      <span>PDF</span>
                    </button>

                    {(currentRole === 'SALES_ADMIN' || currentRole === 'MANAGER') && !isSigned && (
                      <button
                        onClick={() => setSelectedContract(ct)}
                        className="px-3 py-1 rounded-lg bg-purple-600 text-white hover:bg-purple-500 text-[11px] font-bold transition shadow-md"
                      >
                        Thẩm Định HĐ
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* SALES ADMIN WORKBENCH MODAL */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <span>Thẩm Định Hồ Sơ Hợp Đồng #{selectedContract.contractNumber}</span>
              </h3>
              <button onClick={() => setSelectedContract(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {/* Snapshot Comparison */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900/80 border border-slate-800 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 font-bold block uppercase mb-1">Thông Tin Căn Hộ</span>
                <p className="text-white font-bold">Mã Căn: {selectedContract.product?.productCode}</p>
                <p className="text-slate-300">Tòa: {selectedContract.product?.building}</p>
                <p className="text-slate-300">Diện Tích: {selectedContract.product?.area} m²</p>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-bold block uppercase mb-1">Thông Tin Bên Mua</span>
                <p className="text-white font-bold">{selectedContract.customer?.fullName}</p>
                <p className="text-slate-300">SĐT: {selectedContract.customer?.phone}</p>
                <p className="text-slate-300">CCCD: {selectedContract.customer?.cccdCiphertext}</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-xs flex justify-between items-center">
              <div>
                <span className="text-emerald-400 font-bold">Xác Nhận Đã Chuyển Tiền Cọc 100M VND</span>
                <p className="text-[11px] text-slate-400">VietQR Webhook Confirmed</p>
              </div>
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              <button
                onClick={() => handleApproveContract(selectedContract.id)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg"
              >
                1. Phê Duyệt Hợp Đồng
              </button>

              <button
                onClick={() => handleMarkSigned(selectedContract.id)}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold uppercase shadow-lg shadow-purple-600/30 flex items-center space-x-1.5"
              >
                <Sparkles className="w-4 h-4" />
                <span>2. Xác Nhận Đã Ký Mua Bán</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
