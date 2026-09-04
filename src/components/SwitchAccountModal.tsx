'use client';

import React from 'react';
import {
  X,
  Zap,
  ArrowRight,
  CheckCircle2,
  Building2,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { SSO_ACCOUNTS, SSOAccountConfig } from '@/lib/authConfig';

interface SwitchAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmployeeCode?: string;
  onSwitchAccount: (account: SSOAccountConfig) => void;
}

export function SwitchAccountModal({
  isOpen,
  onClose,
  currentEmployeeCode,
  onSwitchAccount
}: SwitchAccountModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
      <div className="glass-panel w-full max-w-4xl rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 font-bold shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">Chuyển Đổi Tài Khoản Nhanh (SSO Switcher)</h3>
              <p className="text-xs text-slate-400">Chọn tài khoản muốn chuyển đổi quyền hạn làm việc:</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition"
          >
            ✕
          </button>
        </div>

        {/* 5 Accounts List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {SSO_ACCOUNTS.map((account) => {
            const isCurrent = currentEmployeeCode === account.code;

            return (
              <div
                key={account.code}
                className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                  isCurrent
                    ? 'border-brand-500 bg-brand-950/20 shadow-lg shadow-brand-500/10'
                    : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${account.badgeColor}`}>
                      {account.badgeLabel}
                    </span>
                    <span className="font-mono text-xs font-bold text-slate-400">{account.code}</span>
                  </div>

                  <div className="flex items-center space-x-3 mb-2.5">
                    <div className={`w-9 h-9 rounded-lg bg-gradient-to-tr ${account.color} flex items-center justify-center text-white font-black text-xs shadow`}>
                      {account.avatarText}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{account.fullName}</div>
                      <div className="text-[11px] text-slate-400">{account.jobTitle}</div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 mb-3 bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Phòng Ban:</div>
                    <div className="font-medium text-slate-300">{account.departmentName}</div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onSwitchAccount(account);
                    onClose();
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition ${
                    isCurrent
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : `bg-gradient-to-r ${account.color} text-white hover:brightness-110 shadow`
                  }`}
                >
                  {isCurrent ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đang Sử Dụng</span>
                    </>
                  ) : (
                    <>
                      <span>Chuyển Sang Acc Này</span>
                      <ArrowRight className="w-3 h-3" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
