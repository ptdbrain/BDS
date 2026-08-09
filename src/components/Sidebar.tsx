'use client';

import React from 'react';
import { UserRole } from '@/lib/types';
import {
  Grid,
  Clock,
  UserCheck,
  FileText,
  BarChart3,
  ShieldCheck,
  Building,
  Upload
} from 'lucide-react';

export type TabType =
  | 'inventory'
  | 'customers'
  | 'transactions_revenue'
  | 'locks'
  | 'contracts'
  | 'reports'
  | 'audit';

interface SidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  currentRole?: UserRole;
  activeLocksCount: number;
  pendingVerificationsCount: number;
  pendingContractsCount: number;
}

export function Sidebar({
  activeTab,
  onTabChange,
  currentRole = 'SALES',
  activeLocksCount,
  pendingVerificationsCount,
  pendingContractsCount
}: SidebarProps) {
  // Sales Agent gets strictly 3 items as specified in sửa app.md
  const salesNavItems = [
    {
      id: 'inventory' as TabType,
      label: '1. Dự Án & Bảng Hàng',
      desc: 'Thông tin dự án & Quỹ hàng (Lock)',
      icon: Grid,
      badge: activeLocksCount > 0 ? activeLocksCount : null,
      badgeColor: 'bg-amber-500'
    },
    {
      id: 'customers' as TabType,
      label: '2. Thông Tin Khách Hàng Cá Nhân',
      desc: 'Quản lý khách mình bán (CRUD)',
      icon: UserCheck,
      badge: null,
      badgeColor: 'bg-brand-500'
    },
    {
      id: 'transactions_revenue' as TabType,
      label: '3. Lịch Sử & Doanh Số Cá Nhân',
      desc: 'Báo cáo doanh số cá nhân (Chỉ xem)',
      icon: BarChart3,
      badge: null,
      badgeColor: 'bg-purple-500'
    }
  ];

  // Admin / Management full nav items
  const adminNavItems = [
    {
      id: 'inventory' as TabType,
      label: 'Bảng Hàng & Quỹ Hàng',
      desc: 'Quản lý căn & Bảng matrix',
      icon: Grid,
      badge: null
    },
    {
      id: 'locks' as TabType,
      label: 'Khóa Căn & Thanh Toán',
      desc: 'Giữ căn 30m & QR VietQR',
      icon: Clock,
      badge: activeLocksCount > 0 ? activeLocksCount : null,
      badgeColor: 'bg-amber-500'
    },
    {
      id: 'customers' as TabType,
      label: 'Khách Hàng & Duyệt Hồ Sơ',
      desc: 'Xác minh PII khách hàng',
      icon: UserCheck,
      badge: pendingVerificationsCount > 0 ? pendingVerificationsCount : null,
      badgeColor: 'bg-brand-500'
    },
    {
      id: 'contracts' as TabType,
      label: 'Hợp Đồng & Phê Duyệt',
      desc: 'Quy trình duyệt bán',
      icon: FileText,
      badge: pendingContractsCount > 0 ? pendingContractsCount : null,
      badgeColor: 'bg-purple-500'
    },
    {
      id: 'reports' as TabType,
      label: 'Báo Cáo & KPI',
      desc: 'Doanh thu & Xuất PDF',
      icon: BarChart3,
      badge: null
    },
    {
      id: 'audit' as TabType,
      label: 'Nhật Ký Kiểm Toán',
      desc: 'Audit trail hệ thống',
      icon: ShieldCheck,
      badge: null
    }
  ];

  const navItems = currentRole === 'SALES' ? salesNavItems : adminNavItems;

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 p-4 flex flex-col justify-between shrink-0 h-[calc(100vh-65px)] sticky top-[65px]">
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Menu Quản Lý
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between p-3 rounded-xl text-left transition group ${
                isActive
                  ? 'bg-gradient-to-r from-brand-600 to-brand-700 text-white font-semibold shadow-lg shadow-brand-600/25 border border-brand-400/30'
                  : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={`p-2 rounded-lg ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400 group-hover:text-brand-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold">{item.label}</div>
                  <div className={`text-[10px] ${isActive ? 'text-brand-100' : 'text-slate-500'}`}>
                    {item.desc}
                  </div>
                </div>
              </div>

              {item.badge !== null && (
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full text-white ${
                    item.badgeColor || 'bg-brand-500'
                  } shadow-md`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
        <div className="flex items-center space-x-2 text-slate-300 mb-1">
          <Building className="w-4 h-4 text-brand-400" />
          <span className="font-semibold text-slate-200">AHS Grand Horizon</span>
        </div>
        <p className="text-[11px] text-slate-400">Dự án đang mở bán đợt 1</p>
        <div className="mt-2 text-[10px] text-slate-500 border-t border-slate-800 pt-2 flex justify-between">
          <span>Quy mô: 144 căn</span>
          <span className="text-emerald-400 font-semibold">99.9% SLO</span>
        </div>
      </div>
    </aside>
  );
}
