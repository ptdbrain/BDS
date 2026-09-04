'use client';

import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  UserCheck,
  Zap,
  Lock,
  ArrowRight,
  Sparkles,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { SSO_ACCOUNTS, SSOAccountConfig } from '@/lib/authConfig';

interface LoginScreenProps {
  onLoginSuccess: (user: any) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [employeeCode, setEmployeeCode] = useState<string>('');
  const [password, setPassword] = useState<string>('ahs@2026');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<SSOAccountConfig | null>(null);

  // One-click SSO Login handler
  const handleSSOLogin = async (account: SSOAccountConfig) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSelectedAccount(account);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssoCode: account.code })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Đăng nhập SSO thất bại');
      }

      onLoginSuccess(data.data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsLoading(false);
    }
  };

  // Standard Form Login handler
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeCode.trim()) {
      setErrorMsg('Vui lòng nhập mã nhân viên hoặc email!');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeCode: employeeCode.trim(),
          password
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Tài khoản hoặc mật khẩu không chính xác');
      }

      onLoginSuccess(data.data.user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Đăng nhập thất bại');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-slate-100 flex flex-col justify-between relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[160px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[30%] w-[700px] h-[500px] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Header */}
      <header className="px-6 py-5 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-slate-800/80 relative z-10">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center shadow-xl shadow-brand-500/20 border border-white/10">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-black text-xl tracking-wider text-white">AHS REAL ESTATE</span>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                ENTERPRISE v2.5
              </span>
            </div>
            <p className="text-xs text-slate-400">Hệ Thống Quản Lý Quỹ Hàng & Phân Quyền Bảo Mật SSO</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-semibold text-emerald-400 hidden sm:inline">Hệ thống phân quyền sẵn sàng</span>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8 w-full relative z-10 flex-1 flex flex-col justify-center">
        {/* Title Banner */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-bold mb-3 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>CỔNG ĐĂNG NHẬP PHÂN QUYỀN & XÁC THỰC SSO TỨC THÌ</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Chọn Tài Khoản Hoặc Đăng Nhập
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-2xl mx-auto">
            Nhấn trực tiếp vào thẻ tài khoản bên dưới để <strong>đăng nhập nhanh SSO 1-Click</strong> theo đúng vai trò, hoặc đăng nhập bằng mã nhân viên và mật khẩu.
          </p>
        </div>

        {errorMsg && (
          <div className="max-w-2xl mx-auto mb-6 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/50 flex items-center space-x-3 text-rose-300 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SECTION 1: 5 QUICK SSO ACCOUNTS */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center space-x-2">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>ĐĂNG NHẬP NHANH SSO (5 TÀI KHOẢN TIÊU CHUẨN)</span>
            </h2>
            <span className="text-[11px] text-brand-400 font-semibold hidden sm:inline">
              1-Click Instant Authorization
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {SSO_ACCOUNTS.map((account) => {
              const isCurrentSelected = selectedAccount?.code === account.code && isLoading;
              return (
                <div
                  key={account.code}
                  className="glass-panel rounded-2xl border border-slate-800/90 hover:border-slate-700 p-4 flex flex-col justify-between relative group transition-all duration-300 hover:shadow-2xl hover:shadow-brand-500/10 hover:-translate-y-1 bg-slate-900/50"
                >
                  {/* Top Role Badge */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider border ${account.badgeColor}`}>
                        {account.badgeLabel}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-400">
                        {account.code}
                      </span>
                    </div>

                    {/* Avatar & Name */}
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${account.color} flex items-center justify-center text-white font-black text-sm shadow-md flex-shrink-0`}>
                        {account.avatarText}
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-white group-hover:text-brand-300 transition line-clamp-1">
                          {account.fullName}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{account.jobTitle}</p>
                      </div>
                    </div>

                    {/* Department */}
                    <div className="text-[11px] text-slate-400 mb-3 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                      <div className="text-slate-500 text-[10px] uppercase font-bold">Phòng Ban:</div>
                      <div className="font-semibold text-slate-200">{account.departmentName}</div>
                    </div>

                    {/* Permission Highlights */}
                    <div className="space-y-1.5 mb-4">
                      <div className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Quyền hạn chính:</div>
                      {account.permissions.slice(0, 3).map((perm, idx) => (
                        <div key={idx} className="flex items-start space-x-1.5 text-[11px] text-slate-300 leading-tight">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{perm}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 1-Click Login Button */}
                  <button
                    onClick={() => handleSSOLogin(account)}
                    disabled={isLoading}
                    className={`w-full py-2.5 px-3 rounded-xl bg-gradient-to-r ${account.color} text-white font-bold text-xs flex items-center justify-center space-x-2 shadow-lg hover:brightness-110 active:scale-95 transition disabled:opacity-50`}
                  >
                    <span>{isCurrentSelected ? 'Đang vào...' : 'Đăng Nhập SSO'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION 2: STANDARD CREDENTIALS LOGIN FORM */}
        <div className="max-w-xl mx-auto w-full glass-panel p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-800">
            <KeyRound className="w-4 h-4 text-brand-400" />
            <h3 className="text-sm font-bold text-white">Hoặc Đăng Nhập Thủ Công Bằng Tài Khoản</h3>
          </div>

          <form onSubmit={handleStandardLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Mã Nhân Viên hoặc Email (*)
              </label>
              <input
                type="text"
                placeholder="VD: NV001, NV002, NV007, NV009, NV010 hoặc nv001@ahs.com.vn"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-brand-500 font-medium"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-300">
                  Mật Khẩu (*)
                </label>
                <span className="text-[11px] text-slate-400">Mặc định: ahs@2026</span>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 text-white px-3.5 py-2.5 rounded-xl text-xs outline-none focus:border-brand-500 font-medium"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-brand-600/20 hover:brightness-110 active:scale-95 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Đang xác thực...' : 'Đăng Nhập Vào Hệ Thống'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 max-w-7xl mx-auto w-full border-t border-slate-800/60 text-center text-xs text-slate-400 relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          © 2026 CÔNG TY CỔ PHẦN BẤT ĐỘNG SẢN AHS • Hệ thống Quản trị & Giao dịch Doanh nghiệp
        </div>
        <div className="flex items-center space-x-4 text-[11px] text-slate-400">
          <span>Chuẩn bảo mật RBAC</span>
          <span>•</span>
          <span>Single Sign-On (SSO)</span>
          <span>•</span>
          <span>Socket Realtime v2.5</span>
        </div>
      </footer>
    </div>
  );
}
