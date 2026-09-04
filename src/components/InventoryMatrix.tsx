'use client';

import React, { useState, useEffect } from 'react';
import { UserRole } from '@/lib/types';
import {
  Grid,
  List,
  Search,
  Filter,
  Lock,
  CheckCircle,
  Building,
  DollarSign,
  Maximize2,
  Compass,
  FileSpreadsheet,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Sparkles,
  PlusCircle,
  Calendar,
  Clock,
  User,
  Phone
} from 'lucide-react';

import { ProjectInfoView } from '@/components/ProjectInfoView';
import { AddProductModal } from '@/components/AddProductModal';
import { broadcastSync } from '@/lib/sync';

interface InventoryMatrixProps {
  products: any[];
  projects: any[];
  currentRole: UserRole;
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onLockProduct: (productId: string) => void;
  onOpenImportModal: () => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export function InventoryMatrix({
  products,
  projects,
  currentRole,
  selectedProjectId,
  onSelectProject,
  onLockProduct,
  onOpenImportModal,
  onRefresh,
  isLoading
}: InventoryMatrixProps) {
  const [projectSubTab, setProjectSubTab] = useState<'inventory' | 'info' | 'booking'>('inventory');
  const [viewMode, setViewMode] = useState<'matrix' | 'table'>('matrix');
  const [buildingFilter, setBuildingFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState<boolean>(false);

  // Booking states (Class Diagram: Booking)
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [bookingFormData, setBookingFormData] = useState({
    customerName: '',
    customerPhone: '',
    depositAmount: '50000000',
    notes: 'Nguyện vọng căn 2PN tầng trung ban công Đông Nam'
  });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isProjectUnreleased = selectedProject?.status === 'UPCOMING';

  const fetchBookings = async () => {
    if (!selectedProjectId) return;
    setIsLoadingBookings(true);
    try {
      const res = await fetch(`/api/v1/bookings?projectId=${selectedProjectId}`);
      if (res.ok) {
        const data = await res.json();
        setBookings(data.data || []);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  useEffect(() => {
    if (projectSubTab === 'booking' || isProjectUnreleased) {
      fetchBookings();
    }
  }, [selectedProjectId, projectSubTab]);

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingFormData.customerName || !bookingFormData.customerPhone) {
      setBookingError('Vui lòng nhập họ tên và số điện thoại khách hàng!');
      return;
    }
    setIsSubmittingBooking(true);
    setBookingError(null);
    try {
      let currentSalesId = 'NV001';
      try {
        const authUser = localStorage.getItem('ahs_auth_user');
        if (authUser) {
          const parsed = JSON.parse(authUser);
          if (parsed.id || parsed.employeeCode) {
            currentSalesId = parsed.id || parsed.employeeCode;
          }
        }
      } catch (e) {}

      const res = await fetch('/api/v1/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: selectedProjectId,
          customerName: bookingFormData.customerName,
          customerPhone: bookingFormData.customerPhone,
          depositAmount: parseFloat(bookingFormData.depositAmount),
          notes: bookingFormData.notes,
          salesEmployeeId: currentSalesId
        })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Đăng ký booking thất bại');
      }
      setIsBookingModalOpen(false);
      setBookingFormData({
        customerName: '',
        customerPhone: '',
        depositAmount: '50000000',
        notes: 'Nguyện vọng căn 2PN tầng trung ban công Đông Nam'
      });
      fetchBookings();
      onRefresh();
      broadcastSync('BOOKING_UPDATED');
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Buildings list
  const buildings = Array.from(new Set(products.map(p => p.building)));

  // Filter products (Đã cọc = Đã bán theo quy định AHS)
  const filteredProducts = products.filter(p => {
    if (buildingFilter !== 'ALL' && p.building !== buildingFilter) return false;
    
    if (statusFilter !== 'ALL') {
      const isSold = p.status === 'SOLD' || p.status === 'DEPOSITED' || p.trangthai === 'Đã bán' || p.trangthai === 'Đã cọc';
      const isLocked = (p.status === 'LOCKED' || p.trangthai === 'Đã khớp') && !isSold;
      const isAvailable = (p.status === 'AVAILABLE' || p.trangthai === 'Còn hàng' || p.trangthai === 'Check Admin') && !isSold && !isLocked;
      const isUnavailable = p.status === 'UNAVAILABLE' || p.trangthai === 'CDT thu căn';

      if (statusFilter === 'SOLD' && !isSold) return false;
      if (statusFilter === 'LOCKED' && !isLocked) return false;
      if (statusFilter === 'AVAILABLE' && !isAvailable) return false;
      if (statusFilter === 'UNAVAILABLE' && !isUnavailable) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.productCode.toLowerCase().includes(q) || p.building.toLowerCase().includes(q);
    }
    return true;
  });

  // Calculate status counts (Đã cọc = Đã bán theo nghiệp vụ)
  const soldUnitsCount = products.filter(
    p => p.status === 'SOLD' || p.status === 'DEPOSITED' || p.trangthai === 'Đã bán' || p.trangthai === 'Đã cọc'
  ).length;

  const lockedUnitsCount = products.filter(
    p => (p.status === 'LOCKED' || p.trangthai === 'Đã khớp') &&
         p.status !== 'SOLD' && p.status !== 'DEPOSITED' && p.trangthai !== 'Đã bán' && p.trangthai !== 'Đã cọc'
  ).length;

  const availableUnitsCount = products.filter(
    p => (p.status === 'AVAILABLE' || p.trangthai === 'Còn hàng' || p.trangthai === 'Check Admin') &&
         p.status !== 'SOLD' && p.status !== 'DEPOSITED' && p.trangthai !== 'Đã bán' && p.trangthai !== 'Đã cọc' && p.trangthai !== 'Đã khớp' && p.status !== 'LOCKED'
  ).length;

  const counts = {
    TOTAL: products.length,
    AVAILABLE: availableUnitsCount,
    LOCKED: lockedUnitsCount,
    SOLD: soldUnitsCount,
    UNAVAILABLE: products.filter(p => p.status === 'UNAVAILABLE' || p.trangthai === 'CDT thu căn').length,
  };

  const getStatusBadge = (status: string, trangthai?: string | null) => {
    if (status === 'SOLD' || status === 'DEPOSITED' || trangthai === 'Đã bán' || trangthai === 'Đã cọc') {
      return <span className="status-sold px-2.5 py-1 rounded-full text-[11px] font-bold">Đã Bán</span>;
    }
    if (status === 'LOCKED' || trangthai === 'Đã khớp') {
      return <span className="status-locked px-2.5 py-1 rounded-full text-[11px] font-bold animate-pulse-glow flex items-center gap-1"><Lock className="w-3 h-3" /> Đang Lock 30m</span>;
    }
    if (trangthai === 'Check Admin') {
      return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40">Check Admin</span>;
    }
    if (status === 'AVAILABLE' || trangthai === 'Còn hàng') {
      return <span className="status-available px-2.5 py-1 rounded-full text-[11px] font-bold">Còn Hàng</span>;
    }
    return <span className="status-unavailable px-2.5 py-1 rounded-full text-[11px] font-bold">Tạm Ngưng</span>;
  };

  // Group products by building and floor for matrix view
  const matrixByBuilding = buildings.map(b => {
    const bProducts = filteredProducts.filter(p => p.building === b);
    const floors = Array.from(new Set(bProducts.map(p => p.floor))).sort((a, b) => b - a);
    return {
      buildingName: b,
      floors: floors.map(f => ({
        floorNum: f,
        units: bProducts.filter(p => p.floor === f).sort((a, b) => a.productCode.localeCompare(b.productCode))
      }))
    };
  });

  return (
    <div className="space-y-6">
      {/* Top Action & Project Bar */}
      <div className="flex flex-col space-y-4 glass-panel p-4 rounded-2xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Project Selector */}
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-brand-400" />
              <select
                value={selectedProjectId}
                onChange={(e) => onSelectProject(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-100 text-sm font-bold rounded-xl px-3 py-2 focus:ring-2 focus:ring-brand-500 outline-none cursor-pointer"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                ))}
              </select>
            </div>

            {/* Building Filter */}
            {projectSubTab === 'inventory' && (
              <select
                value={buildingFilter}
                onChange={(e) => setBuildingFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none"
              >
                <option value="ALL">Tất cả Tòa</option>
                {buildings.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}

            {/* Status Filter */}
            {projectSubTab === 'inventory' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none"
              >
                <option value="ALL">Tất cả Trạng Thái</option>
                <option value="AVAILABLE">Còn Hàng</option>
                <option value="LOCKED">Đang Lock 30m</option>
                <option value="SOLD">Đã Bán</option>
              </select>
            )}

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
              title="Làm mới bảng hàng"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Right tools */}
          <div className="flex items-center space-x-3">
            {projectSubTab === 'inventory' && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Tìm mã căn A-0302..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-900/90 border border-slate-700/80 text-xs text-white pl-9 pr-4 py-2 rounded-xl focus:border-brand-500 outline-none w-48 focus:w-64 transition-all"
                />
              </div>
            )}

            {/* View Toggle */}
            {projectSubTab === 'inventory' && (
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  onClick={() => setViewMode('matrix')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                    viewMode === 'matrix' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                  <span className="hidden sm:inline">Ma Trận Căn</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
                    viewMode === 'table' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">Danh Sách</span>
                </button>
              </div>
            )}

            {/* Product Admin Add Unit & Bulk Import buttons */}
            {(currentRole === 'PRODUCT_ADMIN' || currentRole === 'MANAGER') && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsAddProductModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold shadow-md hover:brightness-110 transition"
                  title="Thêm căn hộ mới vào quỹ hàng (nhập từng trường)"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Thêm Căn Mới (Từng Trường)</span>
                </button>
                <button
                  onClick={onOpenImportModal}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md hover:from-emerald-500 hover:to-teal-500 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Import Excel</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Project Sub-Tabs */}
        <div className="flex items-center space-x-2 border-t border-slate-800 pt-3">
          <button
            onClick={() => setProjectSubTab('info')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              projectSubTab === 'info'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>1. Thông Tin Dự Án</span>
          </button>

          <button
            onClick={() => setProjectSubTab('inventory')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              projectSubTab === 'inventory'
                ? 'bg-brand-600 text-white shadow-md'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>2. Quỹ Hàng (Bảng Hàng)</span>
          </button>

          <button
            onClick={() => setProjectSubTab('booking')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 ${
              projectSubTab === 'booking'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>3. Bảng Booking</span>
            {isProjectUnreleased && (
              <span className="text-[9px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full uppercase font-mono">
                Mới
              </span>
            )}
          </button>
        </div>
      </div>

      {/* RENDER PROJECT SUB-TAB VIEWS */}
      {projectSubTab === 'info' ? (
        <ProjectInfoView project={selectedProject} currentRole={currentRole} onRefresh={onRefresh} />
      ) : projectSubTab === 'booking' ? (
        <div className="space-y-6">
          {/* Header & Controls */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center space-x-2">
                    <span>Bảng Quản Lý Booking & Khớp Căn</span>
                    <span className="text-xs font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                      [Class: Booking]
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Theo dõi số thứ tự Booking (STTBooking), thời gian bắt đầu & kết thúc khớp căn, trạng thái khớp căn theo thời gian thực.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchBookings}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                title="Tải lại dữ liệu booking"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingBookings ? 'animate-spin text-amber-400' : ''}`} />
              </button>
              <button
                onClick={() => setIsBookingModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black uppercase flex items-center space-x-2 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Đăng Ký Lượt Booking</span>
              </button>
            </div>
          </div>

          {/* Booking KPI Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-panel p-4 rounded-xl border border-slate-800">
              <span className="text-[11px] text-slate-400 font-semibold uppercase">Tổng Số Lượt Booking</span>
              <div className="text-2xl font-black text-white mt-1">{bookings.length}</div>
              <span className="text-[10px] text-slate-500">Toàn bộ khách hàng đặt chỗ</span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-amber-500/30 bg-amber-950/10">
              <span className="text-[11px] text-amber-400 font-semibold uppercase">Đang Chờ Khớp Căn</span>
              <div className="text-2xl font-black text-amber-400 mt-1">
                {bookings.filter(b => b.trangthaikhopcan === 'CHO_KHOP' || b.trangthaikhopcan === 'Chưa khớp').length}
              </div>
              <span className="text-[10px] text-amber-400/70">Ưu tiên theo số thứ tự STTBooking</span>
            </div>
            <div className="glass-panel p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10">
              <span className="text-[11px] text-emerald-400 font-semibold uppercase">Đã Khớp Căn Thành Công</span>
              <div className="text-2xl font-black text-emerald-400 mt-1">
                {bookings.filter(b => b.trangthaikhopcan === 'DA_KHOP' || b.trangthaikhopcan === 'Đã khớp').length}
              </div>
              <span className="text-[10px] text-emerald-400/70">Chuyển sang bước cọc / hợp đồng</span>
            </div>
          </div>

          {/* Booking Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center space-x-2">
                <span>Danh Sách Lượt Booking Dự Án</span>
                <span className="text-[11px] text-slate-500 font-normal">({bookings.length} lượt đăng ký)</span>
              </h4>
              <span className="text-[11px] text-amber-400 font-semibold">
                Mức cọc chuẩn: 50.000.000 VND / Booking
              </span>
            </div>

            {isLoadingBookings ? (
              <div className="p-12 text-center text-slate-400 text-xs">Đang tải danh sách Booking...</div>
            ) : bookings.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <Sparkles className="w-8 h-8 text-amber-400/50 mx-auto" />
                <p className="text-sm font-bold text-slate-300">Chưa có lượt Booking nào cho dự án này</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Nhấn nút "+ Đăng Ký Lượt Booking" phía trên để tạo lượt booking giữ chỗ mới cho khách hàng.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800">
                    <tr>
                      <th className="p-3.5">STT [STTBooking]</th>
                      <th className="p-3.5">Mã Booking [MaLuotBooking]</th>
                      <th className="p-3.5">Khách Hàng</th>
                      <th className="p-3.5">Thời Gian Booking [TGBooking]</th>
                      <th className="p-3.5">TG Khớp Căn [TGbatdau - TGketthuc]</th>
                      <th className="p-3.5">Số Tiền Giữ Chỗ</th>
                      <th className="p-3.5">Trạng Thái [Trangthaikhopcan]</th>
                      <th className="p-3.5">Nhân Viên Phụ Trách</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {bookings.map((b: any) => (
                      <tr key={b.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-mono font-black text-amber-400">
                          #{String(b.sttBooking).padStart(3, '0')}
                        </td>
                        <td className="p-3.5 font-mono font-bold text-white">
                          {b.maLuotBooking}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-white">{b.customerName || 'Khách hàng'}</div>
                          <div className="text-[11px] text-slate-400">{b.customerPhone}</div>
                        </td>
                        <td className="p-3.5 text-slate-300 font-mono text-[11px]">
                          {new Date(b.tgBooking).toLocaleDateString('vi-VN')} {new Date(b.tgBooking).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3.5">
                          <div className="text-[11px] text-emerald-400 font-mono">
                            Bắt đầu: {b.tgBatdaukhop ? `${new Date(b.tgBatdaukhop).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${new Date(b.tgBatdaukhop).toLocaleDateString('vi-VN')}` : 'Khi mở bán'}
                          </div>
                          <div className="text-[11px] text-rose-400 font-mono">
                            Kết thúc: {b.tgKetthuckhopcan ? `${new Date(b.tgKetthuckhopcan).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${new Date(b.tgKetthuckhopcan).toLocaleDateString('vi-VN')}` : 'Sau 10 phút'}
                          </div>
                        </td>
                        <td className="p-3.5 font-bold text-brand-400">
                          {Number(b.depositAmount || 50000000).toLocaleString('vi-VN')} đ
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            b.trangthaikhopcan === 'DA_KHOP' || b.trangthaikhopcan === 'Đã khớp'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : b.trangthaikhopcan === 'HUY' || b.trangthaikhopcan === 'Hết thời gian'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}>
                            {b.trangthaikhopcan === 'DA_KHOP' || b.trangthaikhopcan === 'Đã khớp'
                              ? 'Đã Khớp Căn'
                              : b.trangthaikhopcan === 'HUY' || b.trangthaikhopcan === 'Hết thời gian'
                              ? 'Hết Thời Gian'
                              : 'Chờ Khớp Căn'}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-400">
                          {b.salesEmployee?.fullName || 'Nguyễn Văn Nam (Sales)'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status KPI Summary Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Tổng Quỹ Hàng</div>
                <div className="text-xl font-black text-white mt-0.5">{counts.TOTAL}</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-bold">
                100%
              </div>
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-emerald-400 font-semibold uppercase">Còn Hàng</div>
                <div className="text-xl font-black text-emerald-400 mt-0.5">{counts.AVAILABLE}</div>
              </div>
              <div className="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-amber-500/20 bg-amber-950/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-amber-400 font-semibold uppercase">Đang Lock 30m</div>
                <div className="text-xl font-black text-amber-400 mt-0.5">{counts.LOCKED}</div>
              </div>
              <Lock className="w-4 h-4 text-amber-400 animate-bounce" />
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-purple-500/20 bg-purple-950/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-purple-400 font-semibold uppercase">Đã Bán</div>
                <div className="text-xl font-black text-purple-400 mt-0.5">{counts.SOLD}</div>
              </div>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>

            <div className="glass-panel p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-slate-400 font-semibold uppercase">Tạm Ngưng</div>
                <div className="text-xl font-black text-slate-400 mt-0.5">{counts.UNAVAILABLE}</div>
              </div>
            </div>
          </div>

          {/* MATRIX GRID VIEW */}
          {viewMode === 'matrix' ? (
            <div className="space-y-8">
              {matrixByBuilding.map((bGroup) => (
                <div key={bGroup.buildingName} className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <Building className="w-5 h-5 text-brand-400" />
                      <h3 className="text-base font-bold text-white">{bGroup.buildingName}</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                      {bGroup.floors.reduce((acc, f) => acc + f.units.length, 0)} căn hộ
                    </span>
                  </div>

                  {/* Floors Stack */}
                  <div className="space-y-3">
                    {bGroup.floors.map((floor) => (
                      <div key={floor.floorNum} className="flex items-start gap-4 p-2 rounded-xl bg-slate-900/50 border border-slate-800/60">
                        <div className="w-16 shrink-0 text-center py-2 bg-slate-800/80 rounded-lg text-xs font-bold text-slate-300">
                          Tầng {floor.floorNum}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 flex-1">
                          {floor.units.map((prod) => {
                            const priceObj = prod.prices?.[0];
                            const displayPrice = priceObj ? `${(priceObj.amount / 1000000000).toFixed(2)} Tỷ` : 'Liên hệ';
                            const isSold = prod.status === 'SOLD' || prod.status === 'DEPOSITED' || prod.trangthai === 'Đã bán' || prod.trangthai === 'Đã cọc';
                            const isLocked = (prod.status === 'LOCKED' || prod.trangthai === 'Đã khớp') && !isSold;
                            const isAvailable = (prod.status === 'AVAILABLE' || prod.trangthai === 'Còn hàng' || prod.trangthai === 'Check Admin') && !isSold && !isLocked;

                            return (
                              <div
                                key={prod.id}
                                onClick={() => setSelectedProduct(prod)}
                                className={`p-3 rounded-xl border transition cursor-pointer relative group glass-panel-hover ${
                                  isAvailable
                                    ? 'bg-slate-900/80 border-slate-700/60 hover:border-emerald-500'
                                    : isLocked
                                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                                    : isSold
                                    ? 'bg-purple-950/20 border-purple-500/40'
                                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-black text-white group-hover:text-brand-300 transition">
                                    {prod.productCode}
                                  </span>
                                  {getStatusBadge(prod.status, prod.trangthai)}
                                </div>

                                <div className="text-[11px] text-slate-300 font-semibold mb-1">
                                  {displayPrice}
                                </div>

                                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/60 pt-1.5 mt-1.5">
                                  <span>{prod.area} m²</span>
                                  <span>{prod.direction}</span>
                                </div>

                                {/* Quick Lock Button for Sales - Labeled Lock per sửa app.md */}
                                {isAvailable && currentRole === 'SALES' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onLockProduct(prod.id);
                                    }}
                                    className="w-full mt-2 py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] uppercase flex items-center justify-center space-x-1 shadow-md hover:from-amber-400 hover:to-orange-400 transition"
                                  >
                                    <Lock className="w-3.5 h-3.5" />
                                    <span>Lock</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 uppercase tracking-wider">
                    <th className="p-3.5">Mã Căn</th>
                    <th className="p-3.5">Tòa & Tầng</th>
                    <th className="p-3.5">Diện Tích</th>
                    <th className="p-3.5">Hướng</th>
                    <th className="p-3.5">Giá Niêm Yết (VND)</th>
                    <th className="p-3.5">Tiền Cọc (VND)</th>
                    <th className="p-3.5">Trạng Thái</th>
                    <th className="p-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {filteredProducts.map((prod) => {
                    const priceObj = prod.prices?.[0];
                    return (
                      <tr key={prod.id} className="hover:bg-slate-800/40 transition">
                        <td className="p-3.5 font-bold text-white">{prod.productCode}</td>
                        <td className="p-3.5">{prod.building} - Tầng {prod.floor}</td>
                        <td className="p-3.5">{prod.area} m²</td>
                        <td className="p-3.5">{prod.direction}</td>
                        <td className="p-3.5 font-semibold text-brand-400">
                          {priceObj ? Number(priceObj.amount).toLocaleString('vi-VN') : 'N/A'}
                        </td>
                        <td className="p-3.5 text-slate-300">
                          {priceObj ? Number(priceObj.depositAmount).toLocaleString('vi-VN') : '100.000.000'}
                        </td>
                        <td className="p-3.5">{getStatusBadge(prod.status, prod.trangthai)}</td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => setSelectedProduct(prod)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 hover:text-white text-[11px] font-semibold transition"
                          >
                            Chi Tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PRODUCT DETAIL DRAWER / MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-3">
                  <h2 className="text-xl font-black text-white">Căn Hộ {selectedProduct.productCode}</h2>
                  {getStatusBadge(selectedProduct.status, selectedProduct.trangthai)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedProduct.building} | Tầng {selectedProduct.floor} | Dự án AHS Grand Horizon
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Spec grid (Sanpham Class Diagram Fields) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 block">Mã căn [MaCan]</span>
                <span className="text-sm font-bold text-white">{selectedProduct.maCan || selectedProduct.productCode}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Diện tích [Dientich]</span>
                <span className="text-sm font-bold text-white">{selectedProduct.dientich || selectedProduct.area} m²</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Hướng [Huong]</span>
                <span className="text-sm font-bold text-white">{selectedProduct.huong || selectedProduct.direction}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Trạng thái [Trangthai]</span>
                <span className={`text-sm font-bold ${
                  selectedProduct.status === 'SOLD' || selectedProduct.status === 'DEPOSITED' || selectedProduct.trangthai === 'Đã bán' || selectedProduct.trangthai === 'Đã cọc'
                    ? 'text-purple-400'
                    : selectedProduct.trangthai === 'Check Admin'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                }`}>
                  {selectedProduct.status === 'SOLD' || selectedProduct.status === 'DEPOSITED' || selectedProduct.trangthai === 'Đã bán' || selectedProduct.trangthai === 'Đã cọc'
                    ? 'Đã bán'
                    : selectedProduct.trangthai || selectedProduct.status}
                </span>
              </div>
            </div>

            {/* 4 Pricing Tiers as per Class Diagram: Gianiemyet, GiaTTS, GiaTTC, GiaVay */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Bảng Giá Theo 3 Phương Án (Sơ đồ lớp Sản Phẩm)</span>
                <span className="text-[10px] text-brand-400 font-mono">MaCan: {selectedProduct.productCode}</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[11px] text-slate-400 font-medium">1. Giá Niêm Yết</div>
                  <div className="text-sm font-black text-brand-400 mt-1">
                    {Number(selectedProduct.gianiemyet || selectedProduct.prices?.[0]?.amount || 4800000000).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">[Gianiemyet]</div>
                </div>

                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30">
                  <div className="text-[11px] text-amber-400 font-medium">2. Giá TT Sớm (-10%)</div>
                  <div className="text-sm font-black text-amber-300 mt-1">
                    {Number(selectedProduct.giaTTS || ((selectedProduct.gianiemyet || selectedProduct.prices?.[0]?.amount || 4800000000) * 0.90)).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[10px] text-amber-500/70 mt-0.5">[GiaTTS]</div>
                </div>

                <div className="p-3 rounded-xl bg-blue-950/20 border border-blue-500/30">
                  <div className="text-[11px] text-blue-400 font-medium">3. Giá TT Chuẩn</div>
                  <div className="text-sm font-black text-blue-300 mt-1">
                    {Number(selectedProduct.giaTTC || (selectedProduct.gianiemyet || selectedProduct.prices?.[0]?.amount || 4800000000)).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[10px] text-blue-500/70 mt-0.5">[GiaTTC]</div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/30">
                  <div className="text-[11px] text-emerald-400 font-medium">4. Giá Vay Ngân Hàng</div>
                  <div className="text-sm font-black text-emerald-300 mt-1">
                    {Number(selectedProduct.giaVay || ((selectedProduct.gianiemyet || selectedProduct.prices?.[0]?.amount || 4800000000) * 1.02)).toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-[10px] text-emerald-500/70 mt-0.5">[GiaVay]</div>
                </div>
              </div>
            </div>



            {/* Status history timeline */}
            {selectedProduct.history?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Lịch Sử Biến Động Trạng Thái</h4>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-2">
                  {selectedProduct.history.map((h: any) => (
                    <div key={h.id} className="p-2.5 rounded-lg bg-slate-900/40 border border-slate-800 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-white">{h.fromStatus} → {h.toStatus}</span>
                        <p className="text-[11px] text-slate-400">{h.reason}</p>
                      </div>
                      <span className="text-[10px] text-slate-500">{new Date(h.occurredAt).toLocaleString('vi-VN')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setSelectedProduct(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-bold"
              >
                Đóng
              </button>

              {selectedProduct.status === 'AVAILABLE' && currentRole === 'SALES' && (
                <button
                  onClick={() => {
                    const pid = selectedProduct.id;
                    setSelectedProduct(null);
                    onLockProduct(pid);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black uppercase flex items-center space-x-2 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition"
                >
                  <Lock className="w-4 h-4" />
                  <span>Xác Nhận Khóa Căn 30m</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADD PRODUCT MODAL (INDIVIDUAL FIELDS) */}
      <AddProductModal
        projectId={selectedProjectId}
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        onSuccess={() => {
          onRefresh();
          broadcastSync('PRODUCT_UPDATED');
        }}
      />

      {/* REGISTER BOOKING MODAL (CLASS DIAGRAM: BOOKING) */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Đăng Ký Suất Booking Ưu Tiên</h3>
                  <p className="text-xs text-slate-400">Dự án: {selectedProject?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsBookingModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {bookingError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-rose-300 text-xs">
                {bookingError}
              </div>
            )}

            <form onSubmit={handleCreateBooking} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Họ và Tên Khách Hàng (*)</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Tuấn Anh"
                    value={bookingFormData.customerName}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, customerName: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white pl-9 pr-3 py-2.5 rounded-xl outline-none focus:border-amber-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Số Điện Thoại Khách Hàng (*)</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="VD: 0912345678"
                    value={bookingFormData.customerPhone}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, customerPhone: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white pl-9 pr-3 py-2.5 rounded-xl outline-none focus:border-amber-500 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Số Tiền Giữ Chỗ / Booking (VND)</label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    step="1000000"
                    value={bookingFormData.depositAmount}
                    onChange={(e) => setBookingFormData({ ...bookingFormData, depositAmount: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 text-white pl-9 pr-3 py-2.5 rounded-xl outline-none focus:border-amber-500 font-bold text-amber-400"
                  />
                </div>
                <span className="text-[10px] text-slate-400 block mt-1">
                  Mức booking chuẩn theo quy định CĐT: 50.000.000 VND (Hoàn lại 100% nếu không khớp căn)
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Ghi Chú Nguyện Vọng Căn</label>
                <textarea
                  rows={2}
                  placeholder="VD: Ưu tiên căn góc tầng 10 - 20 hướng Đông Nam"
                  value={bookingFormData.notes}
                  onChange={(e) => setBookingFormData({ ...bookingFormData, notes: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingBooking}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black uppercase shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition"
                >
                  {isSubmittingBooking ? 'Đang tạo...' : 'Xác Nhận Booking'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
