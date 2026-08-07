'use client';

import React, { useState, useEffect } from 'react';
import { UserRole } from '@/lib/types';
import { Building2, ShieldCheck, UserCheck, Clock, Bell, Zap, ChevronDown } from 'lucide-react';

interface NavbarProps {
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  activeProjectName?: string;
}

export function Navbar({ currentRole, onRoleChange, activeProjectName }: NavbarProps) {
  const [time, setTime] = useState<string>('');
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const rolesConfig: Record<UserRole, { label: string; name: string; title: string; color: string; icon: any }> = {
    SALES: {
      label: 'Nhân Viên Kinh Doanh',
      name: 'Trần Văn Nam',
      title: 'Sales Real Estate',
      color: 'from-amber-500 to-orange-500',
      icon: UserCheck
    },
    PRODUCT_ADMIN: {
      label: 'Nhân Viên QL Sản Phẩm',
      name: 'Nguyễn Tiến Dũng',
      title: 'Inventory Manager',
      color: 'from-blue-500 to-cyan-500',
      icon: Building2
    },
    SALES_ADMIN: {
      label: 'Sales Admin (Kiểm Duyệt)',
      name: 'Phạm Thị Mai',
      title: 'Sales & Legal Admin',
      color: 'from-purple-500 to-indigo-500',
      icon: ShieldCheck
    },
    MANAGER: {
      label: 'Giám Đốc / Ban Báo Cáo',
      name: 'Hoàng Quốc Việt',
      title: 'Executive Director',
      color: 'from-emerald-500 to-teal-500',
      icon: Zap
    }
  };

  const activeRoleInfo = rolesConfig[currentRole];
  const IconComp = activeRoleInfo.icon;

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
              <p className="text-xs text-slate-400">Hệ Thống Quản Lý Quỹ Hàng & Giao Dịch Bất Động Sản</p>
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-2 pl-6 border-l border-slate-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs font-semibold text-emerald-400">Socket Realtime Active</span>
          </div>
        </div>

        {/* Right Info & Role Switcher */}
        <div className="flex items-center space-x-5">
          {/* Server Time Clock */}
          <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-brand-400" />
            <span>{time} UTC+7</span>
          </div>

          {/* Notifications Bell */}
          <button className="relative p-2 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 hover:text-white transition">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent-rose"></span>
          </button>

          {/* Role Context Switcher */}
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center space-x-3 px-3.5 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700/80 hover:border-brand-500/50 transition group"
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${activeRoleInfo.color} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
                <IconComp className="w-4 h-4" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-bold text-slate-100 flex items-center space-x-1">
                  <span>{activeRoleInfo.name}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 group-hover:text-white transition" />
                </div>
                <div className="text-[11px] text-brand-400 font-medium">{activeRoleInfo.label}</div>
              </div>
            </button>

            {/* Dropdown Menu */}
            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 glass-panel rounded-xl shadow-2xl border border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-slate-800">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Chuyển Vai Trò Giả Lập</p>
                </div>
                {(Object.keys(rolesConfig) as UserRole[]).map((role) => {
                  const item = rolesConfig[role];
                  const ItemIcon = item.icon;
                  const isSelected = currentRole === role;
                  return (
                    <button
                      key={role}
                      onClick={() => {
                        onRoleChange(role);
                        setIsRoleDropdownOpen(false);
                      }}
                      className={`w-full flex items-center space-x-3 px-4 py-2.5 text-left text-xs transition ${
                        isSelected ? 'bg-brand-600/20 text-white font-bold border-l-2 border-brand-500' : 'text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-md bg-gradient-to-tr ${item.color} flex items-center justify-center text-white`}>
                        <ItemIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold">{item.label}</div>
                        <div className="text-[10px] text-slate-400">{item.name}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
