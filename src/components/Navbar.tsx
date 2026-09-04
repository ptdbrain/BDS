'use client';

import React, { useState, useEffect } from 'react';
import { UserRole } from '@/lib/types';
import {
  Building2,
  ShieldCheck,
  UserCheck,
  Clock,
  Bell,
  Zap,
  ChevronDown,
  LogOut,
  User,
  Sparkles,
  Layers
} from 'lucide-react';
import { SSO_ACCOUNTS } from '@/lib/authConfig';

interface NavbarProps {
  currentRole: UserRole;
  currentUser?: any;
  onRoleChange: (role: UserRole) => void;
  onLogout?: () => void;
  onOpenSSOModal?: () => void;
  activeProjectName?: string;
}

export function Navbar({
  currentRole,
  currentUser,
  onRoleChange,
  onLogout,
  onOpenSSOModal,
  activeProjectName
}: NavbarProps) {
  const [time, setTime] = useState<string>('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  useEffect(() => {
    const update = () =>
      setTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const rolesConfig: Record<UserRole, { label: string; name: string; title: string; color: string; icon: any }> = {
    SALES: {
      label: 'Nhân Viên Kinh Doanh',
      name: currentUser?.fullName || 'Nguyễn Minh Khôi (NV001)',
      title: currentUser?.jobTitle || 'Chuyên viên kinh doanh',
      color: 'from-amber-500 to-orange-500',
      icon: UserCheck
    },
    PRODUCT_ADMIN: {
      label: 'Nhân Viên QL Sản Phẩm',
      name: currentUser?.fullName || 'Nguyễn Thùy Dương (NV009)',
      title: currentUser?.jobTitle || 'QL Sản Phẩm & Quỹ Hàng',
      color: 'from-blue-500 to-cyan-500',
      icon: Building2
    },
    SALES_ADMIN: {
      label: 'Sales Admin (Kiểm Duyệt)',
      name: currentUser?.fullName || 'Vũ Mai Phương (NV007)',
      title: currentUser?.jobTitle || 'Sales & Legal Admin',
      color: 'from-purple-500 to-indigo-500',
      icon: ShieldCheck
    },
    MANAGER: {
      label: 'Giám Đốc / Ban Báo Cáo',
      name: currentUser?.fullName || 'Trần Gia Bảo (NV010)',
      title: currentUser?.jobTitle || 'Ban Lãnh Đạo / Quản Lý',
      color: 'from-emerald-500 to-teal-500',
      icon: Zap
    }
  };

  const activeRoleInfo = rolesConfig[currentRole] || rolesConfig.SALES;
  const IconComp = activeRoleInfo.icon;

  const displayName = currentUser?.fullName || activeRoleInfo.name;
  const displayCode = currentUser?.employeeCode ? `[${currentUser.employeeCode}]` : '';

  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left Brand Identity */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-accent-cyan flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wider text-white">AHS REAL ESTATE</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30">
                  ENTERPRISE v2.5
                </span>
              </div>
              <p className="text-xs text-slate-400">Hệ Thống Quản Lý Quỹ Hàng & Phân Quyền Bảo Mật SSO</p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2 pl-6 border-l border-slate-800">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-emerald-400">Realtime Sync Đang Hoạt Động (Cross-Tab Active)</span>
          </div>
        </div>

        {/* Right Info & Role Switcher */}
        <div className="flex items-center space-x-4">
          {/* Server Time Clock */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>{time} UTC+7</span>
          </div>

          {/* Quick SSO Switcher Button */}
          {onOpenSSOModal && (
            <button
              onClick={onOpenSSOModal}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 transition text-xs font-bold shadow-sm"
              title="Chuyển đổi nhanh 5 tài khoản SSO"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Chuyển SSO</span>
            </button>
          )}

          {/* User Profile & Role Context Menu */}
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-brand-500/50 transition group"
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${activeRoleInfo.color} flex items-center justify-center text-white font-black text-xs shadow-md`}>
                {currentUser?.avatarText || displayName.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-100 flex items-center space-x-1">
                  <span className="line-clamp-1">{displayName}</span>
                  <span className="text-[10px] text-brand-400 font-mono">{displayCode}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition flex-shrink-0" />
                </div>
                <div className="text-[10.5px] text-brand-400 font-semibold">{activeRoleInfo.label}</div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 glass-panel rounded-2xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 bg-[#0c1017]">
                {/* User Info Header */}
                <div className="px-4 py-3 border-b border-slate-800">
                  <div className="font-bold text-white text-xs">{displayName}</div>
                  <div className="text-[11px] text-brand-400 font-mono mt-0.5">
                    Mã NV: {currentUser?.employeeCode || 'NV001'} • {currentUser?.email || 'ahs@ahs.com.vn'}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {currentUser?.departmentName || 'Phòng ban AHS'}
                  </div>
                </div>

                {/* Quick SSO Section inside dropdown */}
                <div className="p-2 border-b border-slate-800">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Đổi Tài Khoản Nhanh (SSO)</span>
                    <Sparkles className="w-3 h-3 text-amber-400" />
                  </div>
                  <div className="grid grid-cols-1 gap-1 mt-1">
                    {SSO_ACCOUNTS.map((acc) => {
                      const isCurrent = currentUser?.employeeCode === acc.code;
                      return (
                        <button
                          key={acc.code}
                          onClick={() => {
                            if (onRoleChange) onRoleChange(acc.role);
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs transition ${
                            isCurrent
                              ? 'bg-brand-600/20 text-white font-bold border-l-2 border-brand-500'
                              : 'text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-[11px] text-brand-400 font-bold">{acc.code}</span>
                            <span className="text-[11px]">{acc.fullName}</span>
                          </div>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${acc.badgeColor}`}>
                            {acc.role}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Logout Button */}
                {onLogout && (
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setIsRoleDropdownOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center space-x-2 px-3 py-2 rounded-xl text-left text-xs font-bold text-rose-400 hover:bg-rose-950/30 hover:text-rose-300 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng Xuất Khỏi Hệ Thống</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
