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
  Sparkles,
  Calendar,
  Clock,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { broadcastSync } from '@/lib/sync';
import { ComprehensiveContractModal } from '@/components/ComprehensiveContractModal';

interface ContractWorkflowProps {
  contracts: any[];
  products: any[];
  customers: any[];
  currentRole: UserRole;
  currentUser?: any;
  onRefresh: () => void;
}

export function ContractWorkflow({
  contracts,
  products,
  customers,
  currentRole,
  currentUser,
  onRefresh
}: ContractWorkflowProps) {
  const [isInvestorModalOpen, setIsInvestorModalOpen] = useState<boolean>(false);
  const [editingContract, setEditingContract] = useState<any | null>(null);
  const [comprehensiveContractData, setComprehensiveContractData] = useState<{
    isOpen: boolean;
    contract: any | null;
    product: any | null;
  }>({
    isOpen: false,
    contract: null,
    product: null
  });

  // Form State for Sales Admin Investor Contract entry
  const [investorFormData, setInvestorFormData] = useState({
    contractId: '',
    productId: '',
    customerId: '',
    salesEmployeeId: 'emp_sales_01',
    investorContractNo: '',
    signedDate: new Date().toISOString().slice(0, 10),
    signingStatus: 'CHUA_KY', // CHUA_KY, DA_KY, CHAM_KY
    dealRevenue: '4800000000',
    commissionStatus: 'DU_KIEN_TRA', // DA_TRA, DU_KIEN_TRA
    commissionDueDate: '25/10/2026',
    commissionAmount: '144000000',
    investorNotes: ''
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Filter products for selection (LOCKED, DEPOSITED, SOLD)
  const availableProducts = products.filter(
    (p) => p.status === 'DEPOSITED' || p.status === 'SOLD' || p.status === 'LOCKED'
  );

  const openCreateModal = () => {
    setEditingContract(null);
    const firstProd = availableProducts[0] || products[0];
    const firstCust = customers[0];

    const estimatedRevenue = firstProd?.prices?.[0]?.amount || 4800000000;
    const estimatedComm = estimatedRevenue * 0.03;

    setInvestorFormData({
      contractId: '',
      productId: firstProd?.id || '',
      customerId: firstCust?.id || '',
      salesEmployeeId: 'emp_sales_01',
      investorContractNo: `HĐMB-CĐT-${firstProd?.productCode || 'A-0501'}-2026`,
      signedDate: new Date().toISOString().slice(0, 10),
      signingStatus: 'CHUA_KY',
      dealRevenue: String(estimatedRevenue),
      commissionStatus: 'DU_KIEN_TRA',
      commissionDueDate: '25/10/2026',
      commissionAmount: String(estimatedComm),
      investorNotes: 'Hợp đồng phát hành từ Chủ đầu tư'
    });
    setFormError(null);
    setIsInvestorModalOpen(true);
  };

  const openEditModal = (ct: any) => {
    setEditingContract(ct);
    setInvestorFormData({
      contractId: ct.id,
      productId: ct.productId,
      customerId: ct.customerId,
      salesEmployeeId: ct.salesEmployeeId || 'emp_sales_01',
      investorContractNo: ct.investorContractNo || ct.contractNumber,
      signedDate: ct.signedDate ? new Date(ct.signedDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      signingStatus: ct.signingStatus || (ct.status === 'SIGNED' ? 'DA_KY' : 'CHUA_KY'),
      dealRevenue: String(ct.dealRevenue || ct.agreedPrice || 4800000000),
      commissionStatus: ct.commissionStatus || 'DU_KIEN_TRA',
      commissionDueDate: ct.commissionDueDate || '25/10/2026',
      commissionAmount: String(ct.commissionAmount || (ct.agreedPrice * 0.03) || 144000000),
      investorNotes: ct.investorNotes || ''
    });
    setFormError(null);
    setIsInvestorModalOpen(true);
  };

  const handleSaveInvestorContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!investorFormData.productId || !investorFormData.customerId || !investorFormData.investorContractNo) {
      setFormError('Vui lòng chọn căn hộ, khách hàng và nhập số hợp đồng CĐT!');
      return;
    }

    setIsSaving(true);
    try {
      if (editingContract) {
        // Update existing contract
        const res = await fetch(`/api/v1/contracts/${editingContract.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            investorContractNo: investorFormData.investorContractNo,
            signedDate: investorFormData.signedDate,
            signingStatus: investorFormData.signingStatus,
            dealRevenue: parseFloat(investorFormData.dealRevenue),
            commissionStatus: investorFormData.commissionStatus,
            commissionDueDate: investorFormData.commissionDueDate,
            commissionAmount: parseFloat(investorFormData.commissionAmount),
            investorNotes: investorFormData.investorNotes,
            actorId: 'emp_admin_01',
            actorName: 'Phạm Thị Mai'
          })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Cập nhật thất bại');
        }
      } else {
        // Create new contract from investor info
        const res = await fetch('/api/v1/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: investorFormData.productId,
            customerId: investorFormData.customerId,
            salesEmployeeId: investorFormData.salesEmployeeId,
            investorContractNo: investorFormData.investorContractNo,
            signedDate: investorFormData.signedDate,
            signingStatus: investorFormData.signingStatus,
            dealRevenue: parseFloat(investorFormData.dealRevenue),
            commissionStatus: investorFormData.commissionStatus,
            commissionDueDate: investorFormData.commissionDueDate,
            commissionAmount: parseFloat(investorFormData.commissionAmount),
            investorNotes: investorFormData.investorNotes,
            actorId: 'emp_admin_01',
            actorName: 'Phạm Thị Mai'
          })
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Tạo hợp đồng thất bại');
        }
      }

      setIsInvestorModalOpen(false);
      onRefresh();
      broadcastSync('ALL_DATA_UPDATED');
    } catch (err: any) {
      setFormError(err.message || 'Lỗi lưu thông tin');
    } finally {
      setIsSaving(false);
    }
  };

  // Export PDF Document
  const handleExportContractPDF = (contract: any) => {
    const doc = new jsPDF();
    const snapshot = contract.snapshotJson ? JSON.parse(contract.snapshotJson) : {};

    doc.setFontSize(20);
    doc.setTextColor(0, 102, 255);
    doc.text('CONG TY CO PHAN BAT DONG SAN AHS', 20, 25);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('AHS REAL ESTATE JSC - QUAN LY HOP DONG MUA BAN CDT', 20, 32);
    doc.line(20, 36, 190, 36);

    doc.setFontSize(15);
    doc.setTextColor(0, 0, 0);
    doc.text('THONG TIN HOP DONG MUA BAN CAN HO TU CHU DAU TU', 40, 50);

    doc.setFontSize(11);
    doc.text(`So Hop Dong CDT: ${contract.investorContractNo || contract.contractNumber}`, 20, 65);
    doc.text(`Thoi Gian Ky: ${contract.signedDate ? new Date(contract.signedDate).toLocaleDateString('vi-VN') : 'Chua ky'}`, 20, 73);
    doc.text(`Trang Thai Ky: ${contract.signingStatus === 'DA_KY' ? 'DA KY' : contract.signingStatus === 'CHAM_KY' ? 'CHAM KY' : 'CHUA KY'}`, 20, 81);
    doc.text(`Doanh So Giao Dich: ${Number(contract.dealRevenue || contract.agreedPrice).toLocaleString('vi-VN')} VND`, 20, 89);
    doc.text(`Trang Thai Hoa Hong: ${contract.commissionStatus === 'DA_TRA' ? 'DA TRA' : `Du kien tra ${contract.commissionDueDate || '25/10'}`}`, 20, 97);
    doc.text(`Hoa Hong Nhan Vien: ${Number(contract.commissionAmount || (contract.agreedPrice * 0.03)).toLocaleString('vi-VN')} VND`, 20, 105);

    doc.setFontSize(13);
    doc.setTextColor(0, 102, 255);
    doc.text('THONG TIN CAN HO & KHACH HANG', 20, 120);
    doc.setFontSize(10);
    doc.setTextColor(50, 50, 50);
    doc.text(`Ma Can: ${contract.product?.productCode}`, 20, 130);
    doc.text(`Toa: ${contract.product?.building}`, 20, 137);
    doc.text(`Khach Hang: ${contract.customer?.fullName}`, 20, 144);
    doc.text(`So Dien Thoai: ${contract.customer?.phone}`, 20, 151);
    doc.text(`Nhan Vien Kinh Doanh: ${contract.salesEmployee?.fullName || 'Tran Van Nam'}`, 20, 158);

    doc.save(`HopDongCDT_${contract.investorContractNo || contract.contractNumber}.pdf`);
  };

  const isSalesAdmin = currentRole === 'SALES_ADMIN' || currentRole === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-white">Danh Mục Hợp Đồng Từ Chủ Đầu Tư</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  CĐT SYNC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sales Admin nhập thông tin hợp đồng từ CĐT, doanh số và hoa hồng → Tự động chuyển về cho Nhân viên kinh doanh
              </p>
            </div>
          </div>
        </div>

        {/* Action button */}
        {isSalesAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-lg shadow-purple-600/20 hover:brightness-110 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nhập Hợp Đồng Từ CĐT</span>
          </button>
        )}
      </div>

      {/* CONTRACTS WORKBENCH TABLE */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Danh Sách Hợp Đồng CĐT Đã Nhập ({contracts.length})</span>
          </h3>
          <span className="text-xs text-slate-400">Dữ liệu hoa hồng & trạng thái ký tự động chuyển về cho Sales</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900 text-slate-400 font-bold uppercase border-b border-slate-800">
              <tr>
                <th className="p-3.5">Số Hợp Đồng CĐT</th>
                <th className="p-3.5">Căn Hộ</th>
                <th className="p-3.5">Khách Hàng</th>
                <th className="p-3.5">Sales Phụ Trách</th>
                <th className="p-3.5">Thời Gian Ký</th>
                <th className="p-3.5">Trạng Thái Ký</th>
                <th className="p-3.5">Doanh Số Giao Dịch</th>
                <th className="p-3.5">Thanh Toán Hoa Hồng</th>
                <th className="p-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {contracts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Chưa có hợp đồng nào được nhập từ Chủ đầu tư. Nhấn "Nhập Hợp Đồng Từ CĐT" để thêm mới.
                  </td>
                </tr>
              ) : (
                contracts.map((ct) => {
                  const signingStatus = ct.signingStatus || (ct.status === 'SIGNED' ? 'DA_KY' : 'CHUA_KY');
                  const commissionStatus = ct.commissionStatus || 'DU_KIEN_TRA';
                  const revenue = ct.dealRevenue || ct.agreedPrice || 4800000000;
                  const commAmount = ct.commissionAmount || revenue * 0.03;

                  return (
                    <tr key={ct.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3.5 font-mono font-black text-brand-400">
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
                      <td className="p-3.5 font-medium text-slate-300">
                        {ct.salesEmployee?.fullName || 'Trần Văn Nam'}
                        <div className="text-[10px] text-slate-500 font-mono">
                          {ct.salesEmployee?.employeeCode || 'NV-SALE-01'}
                        </div>
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
                          <div className="space-y-0.5">
                            <span className="status-available px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
                              <CheckCircle className="w-3 h-3" />
                              <span>Đã Trả</span>
                            </span>
                            <div className="text-[10px] text-emerald-400 font-semibold">
                              {Number(commAmount).toLocaleString('vi-VN')} VND
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="status-deposited px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 w-max">
                              <Clock className="w-3 h-3" />
                              <span>Dự kiến: {ct.commissionDueDate || '25/10'}</span>
                            </span>
                            <div className="text-[10px] text-amber-400 font-semibold">
                              {Number(commAmount).toLocaleString('vi-VN')} VND
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setComprehensiveContractData({ isOpen: true, contract: ct, product: ct.product })}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-accent-cyan text-white hover:brightness-110 text-[11px] font-bold transition shadow-md"
                          title="Mở bảng thông tin toàn bộ hợp đồng (Lớp Sản Phẩm + Lớp Hợp Đồng)"
                        >
                          Hợp Đồng Toàn Bộ
                        </button>

                        <button
                          onClick={() => handleExportContractPDF(ct)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white text-[11px] font-semibold transition"
                          title="Xuất file PDF"
                        >
                          <Download className="w-3.5 h-3.5 inline mr-1" />
                          <span>PDF</span>
                        </button>

                        {isSalesAdmin && (
                          <button
                            onClick={() => openEditModal(ct)}
                            className="px-3 py-1.5 rounded-lg bg-purple-600 text-white hover:bg-purple-500 text-[11px] font-bold transition shadow-md"
                          >
                            Cập Nhật HĐ CĐT
                          </button>
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

      {/* SALES ADMIN: ENTER / EDIT INVESTOR CONTRACT MODAL */}
      {isInvestorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-purple-400" />
                  <span>
                    {editingContract
                      ? `Cập Nhật Hợp Đồng CĐT: ${editingContract.investorContractNo || editingContract.contractNumber}`
                      : 'Nhập Thông Tin Hợp Đồng Từ Chủ Đầu Tư'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Dữ liệu hợp đồng, doanh số và hoa hồng sẽ tự động phản ánh về cho Nhân viên kinh doanh phụ trách
                </p>
              </div>
              <button
                onClick={() => setIsInvestorModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveInvestorContract} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Chọn Căn Hộ */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">1. Căn Hộ Giao Dịch (*)</label>
                  <select
                    value={investorFormData.productId}
                    disabled={!!editingContract}
                    onChange={(e) => {
                      const prodId = e.target.value;
                      const prod = products.find((p) => p.id === prodId);
                      const amount = prod?.prices?.[0]?.amount || 4800000000;
                      setInvestorFormData({
                        ...investorFormData,
                        productId: prodId,
                        dealRevenue: String(amount),
                        commissionAmount: String(amount * 0.03),
                        investorContractNo: `HĐMB-CĐT-${prod?.productCode || 'CAN'}-2026`
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-purple-500"
                    required
                  >
                    <option value="">-- Chọn Căn Hộ Đã Cọc/Bán --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        Căn {p.productCode} - {p.building} ({p.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Chọn Khách Hàng */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">2. Khách Hàng Ký Hợp Đồng (*)</label>
                  <select
                    value={investorFormData.customerId}
                    disabled={!!editingContract}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, customerId: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-purple-500"
                    required
                  >
                    <option value="">-- Chọn Khách Hàng --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.fullName} - {c.phone}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Số Hợp Đồng Từ CĐT */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">3. Số Hợp Đồng Từ CĐT (*)</label>
                  <input
                    type="text"
                    placeholder="VD: HĐMB-AHS-A0501-2026"
                    value={investorFormData.investorContractNo}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, investorContractNo: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-purple-500 font-mono font-bold text-brand-400 uppercase"
                    required
                  />
                </div>

                {/* 4. Thời Gian Ký */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">4. Thời Gian Ký Hợp Đồng (*)</label>
                  <input
                    type="date"
                    value={investorFormData.signedDate}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, signedDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-purple-500"
                    required
                  />
                </div>

                {/* 5. Trạng Thái Ký */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">5. Trạng Thái Ký Hợp Đồng</label>
                  <select
                    value={investorFormData.signingStatus}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, signingStatus: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-purple-500 font-bold"
                  >
                    <option value="CHUA_KY">Chưa Ký (Đang gửi hồ sơ cho khách)</option>
                    <option value="DA_KY">Đã Ký (Hoàn tất ký 2 bên)</option>
                    <option value="CHAM_KY">Chậm Ký (Quá hạn hẹn ký CĐT)</option>
                  </select>
                </div>

                {/* 6. Doanh Số Của Giao Dịch */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">6. Doanh Số Giao Dịch (VND) (*)</label>
                  <input
                    type="number"
                    step="1000000"
                    value={investorFormData.dealRevenue}
                    onChange={(e) => {
                      const val = e.target.value;
                      const num = parseFloat(val) || 0;
                      setInvestorFormData({
                        ...investorFormData,
                        dealRevenue: val,
                        commissionAmount: String(num * 0.03)
                      });
                    }}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-purple-500 font-bold text-emerald-400"
                    required
                  />
                  <div className="text-[10px] text-slate-500 mt-1">
                    {investorFormData.dealRevenue
                      ? `${(parseFloat(investorFormData.dealRevenue) / 1000000000).toFixed(2)} Tỷ VND`
                      : ''}
                  </div>
                </div>

                {/* 7. Trạng Thái Thanh Toán Hoa Hồng */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">7. Trạng Thái Thanh Toán Hoa Hồng</label>
                  <select
                    value={investorFormData.commissionStatus}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, commissionStatus: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="DU_KIEN_TRA">Dự Kiến Trả (Theo ngày hẹn)</option>
                    <option value="DA_TRA">Đã Trả (Đã giải ngân hoa hồng)</option>
                  </select>
                </div>

                {/* 8. Ngày Dự Kiến Trả Hoa Hồng */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">8. Ngày Dự Kiến Trả Hoa Hồng (dd/mm/yyyy)</label>
                  <input
                    type="text"
                    placeholder="VD: 25/10/2026"
                    value={investorFormData.commissionDueDate}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, commissionDueDate: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-purple-500 font-medium"
                  />
                </div>

                {/* 9. Số Tiền Hoa Hồng (3%) */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">9. Tiền Hoa Hồng Sales (VND)</label>
                  <input
                    type="number"
                    step="100000"
                    value={investorFormData.commissionAmount}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, commissionAmount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-purple-500 font-bold text-amber-400"
                  />
                </div>

                {/* 10. Ghi chú CĐT */}
                <div>
                  <label className="block text-slate-300 font-bold mb-1">10. Ghi Chú Từ CĐT</label>
                  <input
                    type="text"
                    placeholder="Ghi chú đợt thanh toán, ngân hàng..."
                    value={investorFormData.investorNotes}
                    onChange={(e) => setInvestorFormData({ ...investorFormData, investorNotes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInvestorModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase shadow-lg shadow-purple-600/30 transition flex items-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{isSaving ? 'Đang lưu...' : 'Lưu & Chuyển Doanh Số Cho Sales'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE CONTRACT MODAL (SẢN PHẨM + HỢP ĐỒNG TOÀN BỘ) */}
      <ComprehensiveContractModal
        isOpen={comprehensiveContractData.isOpen}
        onClose={() => setComprehensiveContractData({ isOpen: false, contract: null, product: null })}
        contract={comprehensiveContractData.contract}
        product={comprehensiveContractData.product}
        currentRole={currentRole}
        currentUser={currentUser}
        onSuccess={() => {
          onRefresh();
        }}
      />
    </div>
  );
}
