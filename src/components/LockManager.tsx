import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { UserRole } from '@/lib/types';
import {
  Clock,
  QrCode,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Building,
  RefreshCw,
  Copy,
  Zap,
  ArrowRight,
  ShieldCheck,
  Eye,
  FileText,
  FileSpreadsheet
} from 'lucide-react';
import { broadcastSync } from '@/lib/sync';
import { ComprehensiveContractModal } from '@/components/ComprehensiveContractModal';

interface LockManagerProps {
  locks: any[];
  onRefresh: () => void;
  onCancelLock: (lockId: string) => void;
  onProceedToCustomer: (lock: any) => void;
  currentRole?: UserRole;
  currentUser?: any;
}

export function LockManager({
  locks,
  onRefresh,
  onCancelLock,
  onProceedToCustomer,
  currentRole = 'SALES',
  currentUser
}: LockManagerProps) {
  const [isConfirmingTransfer, setIsConfirmingTransfer] = useState<string | null>(null);
  const [selectedLockForQR, setSelectedLockForQR] = useState<any | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<any | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [contractModalData, setContractModalData] = useState<{
    isOpen: boolean;
    contract: any | null;
    product: any | null;
  }>({
    isOpen: false,
    contract: null,
    product: null
  });

  // Live timer tick
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Generate QR image when lock selected
  useEffect(() => {
    if (selectedLockForQR) {
      const payment = selectedLockForQR.payments?.[0];
      const payload = payment?.qrPayload || `AHS-DEPOSIT-${selectedLockForQR.product?.productCode}`;
      QRCode.toDataURL(payload, { width: 260, margin: 1 })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error(err));
    }
  }, [selectedLockForQR]);

  const activeLocks = locks.filter(l => l.status === 'ACTIVE' || l.status === 'PAYMENT_PENDING');
  const pastLocks = locks.filter(l => l.status !== 'ACTIVE' && l.status !== 'PAYMENT_PENDING');

  const getTimeRemaining = (expiresAtStr: string) => {
    const expireTime = new Date(expiresAtStr).getTime();
    const diffMs = expireTime - now;

    if (diffMs <= 0) return { expired: true, text: 'Hết hạn 30m', seconds: 0 };

    const mins = Math.max(1, Math.ceil(diffMs / 60000));

    return {
      expired: false,
      text: `${mins} phút`,
      isWarning: mins < 5,
      seconds: Math.floor(diffMs / 1000)
    };
  };

  // Simulate Webhook trigger
  const handleSimulateWebhook = async (type: 'SUCCESS' | 'LATE' | 'MISMATCH') => {
    if (!selectedLockForQR) return;
    const payment = selectedLockForQR.payments?.[0];
    if (!payment) return;

    setIsSimulating(true);
    setSimulationResult(null);

    try {
      let payloadAmount = payment.amount;
      let paidAt = new Date().toISOString();

      if (type === 'MISMATCH') {
        payloadAmount = 50000000; // Transfer only 50M
      } else if (type === 'LATE') {
        // Paid 35 minutes later
        paidAt = new Date(Date.now() + 35 * 60 * 1000).toISOString();
      }

      const res = await fetch('/api/v1/payments/webhooks/vietqr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Provider-Signature': 'SIG_VALID_AHS_SECURITY_KEY'
        },
        body: JSON.stringify({
          eventId: `sim_evt_${Date.now()}`,
          providerReference: payment.providerReference,
          amount: payloadAmount,
          paidAt,
          eventType: 'payment.succeeded'
        })
      });

      const data = await res.json();
      setSimulationResult(data);
      onRefresh();
      broadcastSync('ALL_DATA_UPDATED');
    } catch (err: any) {
      setSimulationResult({ error: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Sales Admin confirms transfer received -> converts product status to SOLD directly
  const handleAdminConfirmTransfer = async (lockId: string) => {
    setIsConfirmingTransfer(lockId);
    setActionSuccessMsg(null);
    try {
      const res = await fetch(`/api/v1/locks/${lockId}/confirm-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: 'emp_admin_01',
          actorName: 'Phạm Thị Mai',
          notes: 'Sales Admin xác nhận đã nhận chuyển khoản cọc hợp lệ từ ngân hàng'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || data.error || 'Xác nhận chuyển khoản thất bại');
        return;
      }

      setActionSuccessMsg(data.message || 'Xác nhận thành công! Căn đã chuyển trạng thái sang ĐÃ BÁN.');
      onRefresh();
      broadcastSync('ALL_DATA_UPDATED');
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsConfirmingTransfer(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black text-white">
                  {currentRole === 'PRODUCT_ADMIN'
                    ? 'Danh Mục Giao Dịch (Khóa Căn & Thanh Toán) - Chỉ Xem'
                    : currentRole === 'SALES_ADMIN'
                    ? 'Danh Mục Giao Dịch - Xác Nhận Tiền Chuyển Khoản'
                    : 'Quản Lý Khóa Căn 30 Phút & Thanh Toán Cọc'}
                </h2>
                {currentRole === 'PRODUCT_ADMIN' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-amber-400 border border-amber-500/30">
                    CHỈ XEM (READ-ONLY)
                  </span>
                )}
                {currentRole === 'SALES_ADMIN' && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    SALES ADMIN WORKBENCH
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {currentRole === 'PRODUCT_ADMIN'
                  ? 'Theo dõi thời gian khóa giữ căn 30 phút và tình trạng thanh toán của quỹ hàng (không thao tác xác nhận).'
                  : currentRole === 'SALES_ADMIN'
                  ? 'Kiểm tra tiền về tài khoản, nhấn xác nhận để chuyển căn từ Lock sang Đã Bán.'
                  : 'Tự động đối soát chuyển khoản VietQR & giải phóng căn hết hạn'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onRefresh}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-semibold transition"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Làm Mới Trạng Thái</span>
          </button>
        </div>
      </div>

      {actionSuccessMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-3 text-emerald-300 text-xs font-bold">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-emerald-400 hover:text-white text-xs px-2 py-1 rounded-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* ACTIVE LOCKS SECTION */}
      <div className="space-y-4">
        <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center space-x-2">
          <span>Lượt Khóa Căn Đang Hiệu Lực ({activeLocks.length})</span>
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
        </h3>

        {activeLocks.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-2xl border border-slate-800 space-y-2">
            <Clock className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-sm font-semibold text-slate-400">Không có lượt lock nào đang chạy đếm ngược 30 phút.</p>
            <p className="text-xs text-slate-500">Chuyển sang tab Bảng Hàng và nhấn "Khóa 30 Phút" trên bất kỳ căn hộ nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeLocks.map((lock) => {
              const timer = getTimeRemaining(lock.expiresAt);
              const payment = lock.payments?.[0];

              return (
                <div
                  key={lock.id}
                  className={`glass-panel p-5 rounded-2xl border transition relative space-y-4 ${
                    timer.isWarning
                      ? 'border-rose-500/50 bg-rose-950/10'
                      : 'border-amber-500/30 bg-amber-950/10 hover:border-amber-400/60'
                  }`}
                >
                  {/* Lock Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <div>
                      <span className="text-base font-black text-white">Căn {lock.product?.productCode}</span>
                      <p className="text-[11px] text-slate-400">{lock.product?.project?.name || 'AHS Grand Horizon'}</p>
                    </div>

                    {/* Status & Timer Badge */}
                    <div className="flex items-center space-x-1.5">
                      {lock.status === 'PAYMENT_PENDING' && (
                        <span className="px-2 py-1 rounded-lg text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                          Chờ Admin Duyệt Cọc
                        </span>
                      )}
                      <div
                        className={`px-3 py-1.5 rounded-xl font-mono text-xs font-black flex items-center space-x-1.5 shadow-md ${
                          timer.isWarning
                            ? 'bg-rose-500 text-white animate-pulse'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{timer.text}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lock Details */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sales phụ trách:</span>
                      <span className="font-bold text-slate-200">{lock.salesEmployee?.fullName || 'Trần Văn Nam'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Mã giao dịch:</span>
                      <span className="font-mono text-slate-300">{payment?.providerReference || 'AHS-A0302'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Tiền cọc niêm yết:</span>
                      <span className="font-bold text-brand-400">100.000.000 VND</span>
                    </div>
                  </div>

                  {/* Action Buttons per Role */}
                  {currentRole === 'PRODUCT_ADMIN' ? (
                    // PRODUCT ADMIN: READ-ONLY (No action buttons)
                    <div className="pt-2">
                      <div className="py-2 px-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center text-slate-400 text-[11px] font-semibold flex items-center justify-center space-x-1.5">
                        <Eye className="w-3.5 h-3.5 text-brand-400" />
                        <span>Chế độ chỉ xem (Không có quyền xác nhận cọc)</span>
                      </div>
                    </div>
                  ) : currentRole === 'SALES_ADMIN' ? (
                    // SALES ADMIN: Confirm Transfer Button (Converts to SOLD)
                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => handleAdminConfirmTransfer(lock.id)}
                        disabled={isConfirmingTransfer === lock.id}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black uppercase flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/30 transition"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>{isConfirmingTransfer === lock.id ? 'Đang cập nhật...' : 'Xác Nhận Đã Nhận Chuyển Khoản → Đã Bán'}</span>
                      </button>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setSelectedLockForQR(lock)}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center justify-center space-x-1 transition"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>Xem QR Cọc</span>
                        </button>
                        <button
                          onClick={() => onCancelLock(lock.id)}
                          className="py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-400 text-[11px] font-semibold transition"
                          title="Hủy Lock"
                        >
                          Hủy Lock
                        </button>
                      </div>
                    </div>
                  ) : (
                    // SALES & OTHER: Standard Sales Action Buttons
                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        onClick={() => setSelectedLockForQR(lock)}
                        className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-extrabold uppercase flex items-center justify-center space-x-1.5 shadow-lg hover:brightness-110 transition"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Tạo QR VietQR</span>
                      </button>

                      <button
                        onClick={() => onCancelLock(lock.id)}
                        className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-400 hover:text-rose-400 text-xs font-semibold transition"
                        title="Hủy Lock"
                      >
                        Hủy Lock
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLETED / DEPOSITED LOCKS HISTORY */}
      <div className="space-y-4 pt-4 border-t border-slate-800">
        <h3 className="text-sm font-extrabold text-slate-300 uppercase tracking-wider">
          Lịch Sử Khóa Căn & Xác Nhận Cọc ({pastLocks.length})
        </h3>

        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase">
              <tr>
                <th className="p-3.5">Mã Căn</th>
                <th className="p-3.5">Sales</th>
                <th className="p-3.5">Mã Giao Dịch</th>
                <th className="p-3.5">Thời Gian Lock</th>
                <th className="p-3.5">Trạng Thái Lock</th>
                <th className="p-3.5 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {pastLocks.map((lock) => {
                const payment = lock.payments?.[0];
                const isDeposited = lock.status === 'DEPOSIT_CONFIRMED';
                return (
                  <tr key={lock.id} className="hover:bg-slate-800/40 transition">
                    <td className="p-3.5 font-bold text-white">{lock.product?.productCode}</td>
                    <td className="p-3.5">{lock.salesEmployee?.fullName || 'Trần Văn Nam'}</td>
                    <td className="p-3.5 font-mono text-slate-400">{payment?.providerReference || 'N/A'}</td>
                    <td className="p-3.5 text-slate-400">{new Date(lock.startedAt).toLocaleString('vi-VN')}</td>
                    <td className="p-3.5">
                      {isDeposited ? (
                        <span className="status-deposited px-2.5 py-1 rounded-full text-[11px] font-bold">Đã Cọc Thành Công</span>
                      ) : (
                        <span className="status-unavailable px-2.5 py-1 rounded-full text-[11px] font-bold">{lock.status}</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {isDeposited && (
                        <>
                          <button
                            onClick={() => {
                              setContractModalData({
                                isOpen: true,
                                contract: null,
                                product: lock.product
                              });
                            }}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-[11px] font-bold transition inline-flex items-center space-x-1 shadow-md"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5" />
                            <span>Nhập Hợp Đồng Toàn Bộ</span>
                          </button>

                          <button
                            onClick={() => onProceedToCustomer(lock)}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-[11px] font-bold transition inline-flex items-center space-x-1"
                          >
                            <span>Khách Hàng</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIETQR MODAL & SIMULATOR PANEL */}
      {selectedLockForQR && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-3xl rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-lg font-black text-white flex items-center space-x-2">
                  <QrCode className="w-5 h-5 text-accent-cyan" />
                  <span>Mã QR Thanh Toán Cọc VietQR</span>
                </h2>
                <p className="text-xs text-slate-400">Giữ căn 30 phút cho Căn {selectedLockForQR.product?.productCode}</p>
              </div>
              <button
                onClick={() => {
                  setSelectedLockForQR(null);
                  setSimulationResult(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Render Side */}
              <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white text-slate-900 shadow-xl space-y-3 border-2 border-brand-500">
                <div className="text-center">
                  <span className="font-extrabold text-xs tracking-wider text-slate-800 block uppercase">Chuyển Khoản Nhanh VietQR</span>
                  <span className="text-[11px] font-bold text-brand-600 block">CÔNG TY CP BẤT ĐỘNG SẢN AHS</span>
                </div>

                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="VietQR Code" className="w-56 h-56 rounded-lg border p-1" />
                ) : (
                  <div className="w-56 h-56 rounded-lg bg-slate-100 flex items-center justify-center">
                    <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                  </div>
                )}

                <div className="w-full text-center space-y-1 bg-slate-100 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-xs font-black text-emerald-700">100.000.000 VND</div>
                  <div className="text-[11px] font-mono font-bold text-slate-700">
                    Nội dung: {selectedLockForQR.payments?.[0]?.providerReference || 'AHS-A0302'}
                  </div>
                </div>
              </div>

              {/* SIMULATED BANK WEBHOOK PANEL */}
              <div className="space-y-4 flex flex-col justify-between">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-bold text-amber-400">
                    <Zap className="w-4 h-4" />
                    <span>Giả Lập Webhook Cổng Thanh Toán (Testing Panel)</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Thực hiện kiểm thử các kịch bản webhook nhận tiền từ Ngân hàng / Napas 24/7 đối với lượt lock này:
                  </p>

                  <div className="space-y-2">
                    {/* Option 1: Valid payment */}
                    <button
                      onClick={() => handleSimulateWebhook('SUCCESS')}
                      disabled={isSimulating}
                      className="w-full p-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold text-left transition flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>1. Chuyển Cọc Hợp Lệ (SUCCEEDED)</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/30 px-2 py-0.5 rounded">100M VND</span>
                    </button>

                    {/* Option 2: Late payment */}
                    <button
                      onClick={() => handleSimulateWebhook('LATE')}
                      disabled={isSimulating}
                      className="w-full p-2.5 rounded-xl bg-amber-600/20 border border-amber-500/40 hover:bg-amber-600/30 text-amber-300 text-xs font-bold text-left transition flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                        <span>2. Chuyển Trễ Sau 30m (LATE PAYMENT)</span>
                      </div>
                      <span className="text-[10px] bg-amber-500/30 px-2 py-0.5 rounded">REVIEW_REQ</span>
                    </button>

                    {/* Option 3: Wrong Amount */}
                    <button
                      onClick={() => handleSimulateWebhook('MISMATCH')}
                      disabled={isSimulating}
                      className="w-full p-2.5 rounded-xl bg-rose-600/20 border border-rose-500/40 hover:bg-rose-600/30 text-rose-300 text-xs font-bold text-left transition flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-2">
                        <XCircle className="w-4 h-4 text-rose-400" />
                        <span>3. Chuyển Thiếu Số Tiền (MISMATCH)</span>
                      </div>
                      <span className="text-[10px] bg-rose-500/30 px-2 py-0.5 rounded">50M VND</span>
                    </button>
                  </div>
                </div>

                {/* Result Feedback */}
                {simulationResult && (
                  <div className={`p-3.5 rounded-xl border text-xs space-y-1 animate-in fade-in ${
                    simulationResult.status === 'SUCCEEDED'
                      ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                      : 'bg-amber-950/40 border-amber-500/60 text-amber-200'
                  }`}>
                    <div className="font-bold flex items-center space-x-1.5">
                      <CheckCircle className="w-4 h-4" />
                      <span>Phản Hồi Từ Webhook Handler:</span>
                    </div>
                    <p className="text-[11px]">{simulationResult.message}</p>
                    {simulationResult.status === 'SUCCEEDED' && (
                      <button
                        onClick={() => {
                          const lock = selectedLockForQR;
                          setSelectedLockForQR(null);
                          onProceedToCustomer(lock);
                        }}
                        className="mt-2 w-full py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs uppercase shadow hover:bg-emerald-400 transition"
                      >
                        Tiến Hành Khai Báo Khách Hàng →
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPREHENSIVE CONTRACT MODAL (SẢN PHẨM + HỢP ĐỒNG TOÀN BỘ) */}
      <ComprehensiveContractModal
        isOpen={contractModalData.isOpen}
        onClose={() => setContractModalData({ isOpen: false, contract: null, product: null })}
        contract={contractModalData.contract}
        product={contractModalData.product}
        currentRole={currentRole}
        currentUser={currentUser}
        onSuccess={() => {
          onRefresh();
        }}
      />
    </div>
  );
}
