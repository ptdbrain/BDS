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
  Phone,
  QrCode,
  CheckCircle2,
  Copy,
  Zap,
  ArrowRight
} from 'lucide-react';

import { ProjectInfoView } from '@/components/ProjectInfoView';
import { AddProductModal } from '@/components/AddProductModal';
import { ComprehensiveContractModal } from '@/components/ComprehensiveContractModal';
import { broadcastSync, onSync } from '@/lib/sync';

interface InventoryMatrixProps {
  products: any[];
  projects: any[];
  currentRole: UserRole;
  currentUser?: any;
  contracts?: any[];
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
  currentUser,
  contracts = [],
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

  // Contract Modal state for viewing/editing full SanPham + HopDong
  const [contractModalData, setContractModalData] = useState<{
    isOpen: boolean;
    contract: any | null;
    product: any | null;
  }>({
    isOpen: false,
    contract: null,
    product: null
  });

  // Booking states (Class Diagram: Booking)
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState<boolean>(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState<boolean>(false);
  const [bookingModalStep, setBookingModalStep] = useState<'INPUT' | 'QR'>('INPUT');
  const [bookingFormData, setBookingFormData] = useState({
    customerName: '',
    customerPhone: '',
    depositAmount: '50000000',
    notes: 'Nguyện vọng căn 2PN tầng trung ban công Đông Nam'
  });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [isSubmittingBooking, setIsSubmittingBooking] = useState<boolean>(false);
  const [isApprovingBooking, setIsApprovingBooking] = useState<string | null>(null);
  const [matchingLoadingUnitId, setMatchingLoadingUnitId] = useState<string | null>(null);
  const [nowTime, setNowTime] = useState<number>(Date.now());

  // Realtime clock tick every 5 seconds for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);

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
    fetchBookings();
  }, [selectedProjectId]);

  // Realtime cross-tab sync listener
  useEffect(() => {
    const cleanup = onSync((msg) => {
      const type = msg?.type;
      if (
        !type ||
        type === 'ALL_DATA_UPDATED' ||
        type === 'BOOKING_UPDATED' ||
        type === 'LOCK_UPDATED' ||
        type === 'CONTRACT_UPDATED'
      ) {
        fetchBookings();
      }
    });
    return cleanup;
  }, [selectedProjectId]);

  // Handle Sales step 1 -> proceed to QR code
  const handleProceedToBookingQR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingFormData.customerName.trim() || !bookingFormData.customerPhone.trim()) {
      setBookingError('Vui lòng nhập họ tên và số điện thoại khách hàng!');
      return;
    }
    setBookingError(null);
    setBookingModalStep('QR');
  };

  // Handle Sales confirms payment of 50M -> status becomes CHO_DUYET_COC
  const handleConfirmBookingPayment = async () => {
    setIsSubmittingBooking(true);
    setBookingError(null);
    try {
      let currentSalesId = currentUser?.id || 'NV001';
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
          depositAmount: parseFloat(bookingFormData.depositAmount || '50000000'),
          notes: bookingFormData.notes,
          salesEmployeeId: currentSalesId,
          trangthaikhopcan: 'CHO_DUYET_COC' // Chờ Sales Admin xác nhận thanh toán
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Đăng ký booking thất bại');
      }

      setIsBookingModalOpen(false);
      setBookingModalStep('INPUT');
      setBookingFormData({
        customerName: '',
        customerPhone: '',
        depositAmount: '50000000',
        notes: 'Nguyện vọng căn 2PN tầng trung ban công Đông Nam'
      });
      await fetchBookings();
      onRefresh();
      broadcastSync('BOOKING_UPDATED');
      alert('Đã gửi thông tin chuyển khoản cọc 50.000.000 VNĐ! Lượt booking đang ở trạng thái [Chờ Duyệt Cọc], chờ Sales Admin xác nhận thanh toán.');
    } catch (err: any) {
      setBookingError(err.message);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  // Sales Admin confirms deposit payment -> sets DANG_KHOP & starts 10-minute matching window
  const handleApproveBooking = async (bookingId: string) => {
    setIsApprovingBooking(bookingId);
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: currentUser?.id || 'emp_sales_admin',
          actorName: currentUser?.fullName || 'Vũ Mai Phương (Sales Admin)',
          notes: 'Sales Admin xác nhận đã nhận cọc VietQR 50.000.000 VNĐ hợp lệ'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Duyệt thanh toán cọc thất bại');
        return;
      }

      await fetchBookings();
      onRefresh();
      broadcastSync('BOOKING_UPDATED');
      alert('Xác nhận thanh toán cọc 50M thành công! Đã thêm lượt chính thức vào bảng Booking và kích hoạt 10 PHÚT KHỚP CĂN.');
    } catch (err: any) {
      alert(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setIsApprovingBooking(null);
    }
  };

  // Sales locks unit during 10-min matching window -> NO QR! Converts to SOLD, opens full contract modal
  const handleMatchUnit = async (product: any, bookingId: string) => {
    setMatchingLoadingUnitId(product.id);
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}/match-unit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          salesEmployeeId: currentUser?.id || 'NV001',
          salesEmployeeName: currentUser?.fullName || 'Trần Văn Nam (Sales)'
        })
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Khớp căn thất bại');
        return;
      }

      await fetchBookings();
      onRefresh();
      broadcastSync('ALL_DATA_UPDATED');

      // Open Comprehensive Contract Modal immediately without QR
      setContractModalData({
        isOpen: true,
        contract: data.data.contract,
        product: data.data.product || product
      });
    } catch (err: any) {
      alert(err.message || 'Lỗi khớp căn');
    } finally {
      setMatchingLoadingUnitId(null);
    }
  };

  // Active matching booking (status DANG_KHOP and within 10-minute window)
  const activeMatchingBooking = bookings.find((b) => {
    if (b.trangthaikhopcan !== 'DANG_KHOP') return false;
    if (!b.tgKetthuckhopcan) return false;
    return new Date(b.tgKetthuckhopcan).getTime() > nowTime;
  });

  // Pending booking waiting for deposit confirmation in this project
  const pendingBookingInProject = bookings.find((b) =>
    b.trangthaikhopcan === 'CHO_DUYET_COC' || b.trangthaikhopcan === 'CHO_KHOP'
  );
  const allPendingBookings = bookings.filter((b) =>
    b.trangthaikhopcan === 'CHO_DUYET_COC' || b.trangthaikhopcan === 'CHO_KHOP'
  );

  // Calculate remaining matching minutes
  const matchingMinutesRemaining = activeMatchingBooking?.tgKetthuckhopcan
    ? Math.max(1, Math.ceil((new Date(activeMatchingBooking.tgKetthuckhopcan).getTime() - nowTime) / 60000))
    : 0;

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

          {currentRole === 'SALES' && (
            <button
              onClick={() => setIsBookingModalOpen(true)}
              className="ml-auto px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-xs font-black uppercase flex items-center space-x-2 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>+ Thêm Lượt Booking (50M)</span>
            </button>
          )}
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
                      <th className="p-3.5 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {bookings.map((b: any) => {
                      const isPendingDeposit = b.trangthaikhopcan === 'CHO_DUYET_COC';
                      const isMatching = b.trangthaikhopcan === 'DANG_KHOP';
                      const isMatched = b.trangthaikhopcan === 'DA_KHOP' || b.trangthaikhopcan === 'Đã khớp';
                      const isExpired = b.trangthaikhopcan === 'HUY' || b.trangthaikhopcan === 'Hết thời gian';

                      return (
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
                            {new Date(b.tgBooking).toLocaleDateString('vi-VN')}{' '}
                            {new Date(b.tgBooking).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
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
                            {isPendingDeposit ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse flex items-center gap-1 w-max">
                                <Clock className="w-3 h-3" />
                                <span>Chờ Sales Admin Duyệt Cọc (50M)</span>
                              </span>
                            ) : isMatching ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse flex items-center gap-1 w-max">
                                <Zap className="w-3 h-3 text-emerald-400" />
                                <span>Đang Khớp Căn (10 Phút)</span>
                              </span>
                            ) : isMatched ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-purple-500/20 text-purple-400 border border-purple-500/40 w-max block">
                                Đã Khớp Căn
                              </span>
                            ) : isExpired ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40 w-max block">
                                Hết Thời Gian
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700 w-max block">
                                Chờ Khớp Căn
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-400">
                            {b.salesEmployee?.fullName || 'Nguyễn Văn Nam (Sales)'}
                          </td>
                          <td className="p-3.5 text-right whitespace-nowrap">
                            {(currentRole === 'SALES_ADMIN' || currentRole === 'MANAGER') && (isPendingDeposit || b.trangthaikhopcan === 'CHO_KHOP') ? (
                              <button
                                onClick={() => handleApproveBooking(b.id)}
                                disabled={isApprovingBooking === b.id}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-[11px] uppercase shadow-md flex items-center space-x-1 transition ml-auto"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>{isApprovingBooking === b.id ? 'Đang duyệt...' : 'Xác Nhận Thanh Toán Cọc'}</span>
                              </button>
                            ) : isMatching ? (
                              <button
                                onClick={() => setProjectSubTab('inventory')}
                                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] uppercase flex items-center space-x-1 shadow-md hover:from-amber-400 hover:to-orange-400 transition ml-auto"
                              >
                                <Zap className="w-3.5 h-3.5" />
                                <span>Sang Bảng Hàng Khớp Căn</span>
                              </button>
                            ) : (
                              <span className="text-slate-500 text-[11px]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active 10-Minute Matching Window Banner */}
          {activeMatchingBooking && (
            <div className="glass-panel p-4 rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-r from-emerald-950/70 via-teal-950/50 to-slate-900 shadow-2xl shadow-emerald-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-pulse-glow">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse shrink-0">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-white uppercase tracking-wider">
                      Lượt Khớp Căn Đang Diễn Ra (Mỗi Lượt 10 Phút)
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 uppercase animate-bounce">
                      Đang Khớp
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 mt-1">
                    Booking <strong className="text-amber-300">#{String(activeMatchingBooking.sttBooking).padStart(3, '0')}</strong>: {activeMatchingBooking.customerName} ({activeMatchingBooking.customerPhone}). Sales của lượt booking có quyền nhấn <strong>[Khớp Căn (Lock Căn)]</strong> trên căn còn hàng.
                  </p>
                  <p className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                    ✓ Không hiển thị QR (đã thu cọc 50M) → Căn chuyển trạng thái sang <strong>ĐÃ BÁN</strong> → Mở ngay Bảng Hợp Đồng Toàn Bộ để nhập thông tin!
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 shrink-0 self-end md:self-center">
                <div className="px-4 py-2 rounded-xl bg-slate-900 border border-emerald-500/50 text-center shadow-lg">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Thời Gian Khớp Căn</div>
                  <div className="text-lg font-mono font-black text-emerald-400 flex items-center justify-center space-x-1.5">
                    <Clock className="w-4 h-4 animate-spin-slow" />
                    <span>{matchingMinutesRemaining} phút</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pending Booking Awaiting Approval Banner */}
          {!activeMatchingBooking && pendingBookingInProject && (
            <div className="glass-panel p-4 rounded-2xl border-2 border-amber-500/70 bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-950 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center space-x-3.5">
                <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse shrink-0">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-black text-white uppercase tracking-wider">
                      Lượt Booking Đang Chờ Xác Nhận Cọc 50.000.000 VNĐ
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-slate-950 uppercase">
                      Chờ Duyệt Cọc
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Booking <strong className="text-amber-300">#{String(pendingBookingInProject.sttBooking).padStart(3, '0')} - {pendingBookingInProject.maLuotBooking}</strong> của khách hàng <strong className="text-white">{pendingBookingInProject.customerName}</strong> ({pendingBookingInProject.customerPhone}).
                  </p>
                  <p className="text-[11px] text-amber-400/90 font-medium mt-0.5">
                    {currentRole === 'SALES_ADMIN' || currentRole === 'MANAGER'
                      ? 'Sales Admin nhấn duyệt bên phải để lập tức kích hoạt 10 PHÚT KHỚP CĂN cho Sales.'
                      : 'Đang chờ Sales Admin xác nhận nhận tiền cọc trong mục Giao Dịch để kích hoạt 10 phút khớp căn.'}
                  </p>
                </div>
              </div>

              {(currentRole === 'SALES_ADMIN' || currentRole === 'MANAGER') && (
                <button
                  onClick={() => handleApproveBooking(pendingBookingInProject.id)}
                  disabled={isApprovingBooking === pendingBookingInProject.id}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs uppercase shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition shrink-0"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>{isApprovingBooking === pendingBookingInProject.id ? 'Đang duyệt...' : 'Duyệt Cọc Ngay ➔ Bật 10 Phút'}</span>
                </button>
              )}
            </div>
          )}

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

                                {/* Actions for Sales */}
                                {isAvailable && currentRole === 'SALES' && (
                                  activeMatchingBooking ? (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleMatchUnit(prod, activeMatchingBooking.id);
                                      }}
                                      disabled={matchingLoadingUnitId === prod.id}
                                      className="w-full mt-2 py-1.5 px-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[11px] uppercase flex items-center justify-center space-x-1 shadow-md transition"
                                      title="Khớp căn cho lượt Booking đang diễn ra (Không hiển thị QR - Đã cọc 50M)"
                                    >
                                      <Zap className="w-3.5 h-3.5" />
                                      <span>{matchingLoadingUnitId === prod.id ? 'Đang khớp...' : '⚡ Khớp Căn (Lock Căn)'}</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (allPendingBookings.length > 0) {
                                          const proceed = confirm(
                                            `Đang có ${allPendingBookings.length} lượt Booking chờ Sales Admin xác nhận cọc 50M!\n\n` +
                                            `• Nếu muốn Khớp Căn trực tiếp sang ĐÃ BÁN (không cần QR), vui lòng nhờ Sales Admin duyệt cọc booking.\n` +
                                            `• Nhấn OK nếu bạn vẫn muốn Khóa giữ chỗ 30 phút thông thường (quét VietQR cọc 100M).`
                                          );
                                          if (!proceed) return;
                                        }
                                        onLockProduct(prod.id);
                                      }}
                                      className="w-full mt-2 py-1.5 px-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] uppercase flex items-center justify-center space-x-1 shadow-md hover:from-amber-400 hover:to-orange-400 transition"
                                    >
                                      <Lock className="w-3.5 h-3.5" />
                                      <span>Lock 30m</span>
                                    </button>
                                  )
                                )}

                                {/* If unit is SOLD: show button to open Comprehensive Contract Modal */}
                                {isSold && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const existingContract = contracts.find((c: any) => c.productId === prod.id);
                                      setContractModalData({
                                        isOpen: true,
                                        contract: existingContract || null,
                                        product: prod
                                      });
                                    }}
                                    className="w-full mt-2 py-1.5 px-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[10px] flex items-center justify-center space-x-1 shadow-md transition"
                                  >
                                    <FileSpreadsheet className="w-3 h-3" />
                                    <span>Hợp Đồng Toàn Bộ</span>
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
                    const isSold = prod.status === 'SOLD' || prod.status === 'DEPOSITED' || prod.trangthai === 'Đã bán' || prod.trangthai === 'Đã cọc';
                    const isAvailable = (prod.status === 'AVAILABLE' || prod.trangthai === 'Còn hàng' || prod.trangthai === 'Check Admin') && !isSold && prod.status !== 'LOCKED';

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
                        <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {isAvailable && currentRole === 'SALES' && (
                            activeMatchingBooking ? (
                              <button
                                onClick={() => handleMatchUnit(prod, activeMatchingBooking.id)}
                                disabled={matchingLoadingUnitId === prod.id}
                                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-[11px] uppercase transition shadow-md"
                              >
                                {matchingLoadingUnitId === prod.id ? 'Đang khớp...' : '⚡ Khớp Căn'}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (allPendingBookings.length > 0) {
                                    const proceed = confirm(
                                      `Đang có ${allPendingBookings.length} lượt Booking chờ Sales Admin xác nhận cọc 50M!\n\n` +
                                      `• Nếu muốn Khớp Căn trực tiếp sang ĐÃ BÁN (không cần QR), vui lòng nhờ Sales Admin duyệt cọc booking.\n` +
                                      `• Nhấn OK nếu bạn vẫn muốn Khóa giữ chỗ 30 phút thông thường (quét VietQR cọc 100M).`
                                    );
                                    if (!proceed) return;
                                  }
                                  onLockProduct(prod.id);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black text-[11px] uppercase transition shadow-md hover:from-amber-400 hover:to-orange-400"
                              >
                                Lock 30m
                              </button>
                            )
                          )}

                          {isSold && (
                            <button
                              onClick={() => {
                                const existingContract = contracts.find((c: any) => c.productId === prod.id);
                                setContractModalData({
                                  isOpen: true,
                                  contract: existingContract || null,
                                  product: prod
                                });
                              }}
                              className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition shadow-md"
                            >
                              Hợp Đồng Toàn Bộ
                            </button>
                          )}

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
                activeMatchingBooking ? (
                  <button
                    onClick={() => {
                      const prod = selectedProduct;
                      setSelectedProduct(null);
                      handleMatchUnit(prod, activeMatchingBooking.id);
                    }}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black uppercase flex items-center space-x-2 shadow-lg shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Khớp Căn (Lock Căn) [10m]</span>
                  </button>
                ) : (
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
                )
              )}

              {(selectedProduct.status === 'SOLD' || selectedProduct.status === 'DEPOSITED' || selectedProduct.trangthai === 'Đã bán' || selectedProduct.trangthai === 'Đã cọc') && (
                <button
                  onClick={() => {
                    const prod = selectedProduct;
                    setSelectedProduct(null);
                    const existingContract = contracts.find((c: any) => c.productId === prod.id);
                    setContractModalData({
                      isOpen: true,
                      contract: existingContract || null,
                      product: prod
                    });
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-black uppercase flex items-center space-x-2 shadow-lg shadow-purple-500/20 hover:from-purple-500 hover:to-indigo-500 transition"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Hợp Đồng Toàn Bộ (Sản Phẩm & HĐ)</span>
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

      {/* REGISTER BOOKING MODAL (CLASS DIAGRAM: BOOKING) - 2 STEP FLOW: INPUT -> QR CODE -> CONFIRM */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40">
                  {bookingModalStep === 'QR' ? <QrCode className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {bookingModalStep === 'QR' ? 'Quét Mã VietQR Thanh Toán Cọc Booking' : 'Đăng Ký Suất Booking Ưu Tiên'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {bookingModalStep === 'QR' ? 'Bước 2/2: Quét mã & Xác nhận thanh toán' : `Bước 1/2: Nhập thông tin | Dự án: ${selectedProject?.name}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsBookingModalOpen(false);
                  setBookingModalStep('INPUT');
                }}
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

            {bookingModalStep === 'INPUT' ? (
              /* STEP 1: NHẬP THÔNG TIN BOOKING */
              <form onSubmit={handleProceedToBookingQR} className="space-y-3.5 text-xs">
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
                    onClick={() => {
                      setIsBookingModalOpen(false);
                      setBookingModalStep('INPUT');
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black uppercase shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 transition flex items-center space-x-1.5"
                  >
                    <span>Tiếp Tục & Quét Mã QR Cọc 50M</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            ) : (
              /* STEP 2: HIỂN THỊ VIETQR 50M -> SALES NHẤN XÁC NHẬN THANH TOÁN */
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 text-xs text-amber-300 flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Quét mã VietQR chuyển khoản <strong>50.000.000 VNĐ</strong> để hoàn tất giữ chỗ lượt Booking.
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  {/* VietQR Code Image */}
                  <div className="bg-white p-3 rounded-2xl shadow-xl flex flex-col items-center justify-center border-2 border-amber-500">
                    <img
                      src={`https://img.vietqr.io/image/TCB-19036868689999-compact2.png?amount=50000000&addInfo=${encodeURIComponent(`AHS BOOKING ${bookingFormData.customerPhone}`)}&accountName=${encodeURIComponent('CONG TY CO PHAN BAT DONG SAN AHS')}`}
                      alt="VietQR Booking Deposit"
                      className="w-44 h-44 object-contain"
                    />
                    <div className="text-[10px] text-slate-700 font-bold mt-1 text-center">
                      VietQR • Techcombank 50M
                    </div>
                  </div>

                  {/* Transfer Details */}
                  <div className="space-y-2.5 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Khách Hàng</span>
                      <span className="font-bold text-white block">{bookingFormData.customerName} ({bookingFormData.customerPhone})</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Ngân Hàng Thụ Hưởng</span>
                      <span className="font-bold text-slate-200 block">Techcombank (Hội sở chính)</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Số Tài Khoản</span>
                      <span className="font-mono font-black text-amber-400 text-sm block">19036868689999</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Chủ Tài Khoản</span>
                      <span className="font-bold text-slate-200 block">CTCP BAT DONG SAN AHS</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Số Tiền Cọc Booking</span>
                      <span className="font-mono font-black text-emerald-400 text-sm block">50.000.000 VND</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Nội Dung Chuyển Khoản</span>
                      <span className="font-mono font-bold text-amber-300 block">AHS BOOKING {bookingFormData.customerPhone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setBookingModalStep('INPUT')}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs"
                  >
                    Quay Lại Sửa
                  </button>

                  <button
                    type="button"
                    disabled={isSubmittingBooking}
                    onClick={handleConfirmBookingPayment}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSubmittingBooking ? 'Đang gửi...' : 'Nhân Viên KD Xác Nhận Đã Thanh Toán'}</span>
                  </button>
                </div>
              </div>
            )}
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
          fetchBookings();
        }}
      />
    </div>
  );
}
