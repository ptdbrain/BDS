'use client';

import React, { useState } from 'react';
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
  PlusCircle
} from 'lucide-react';

import { ProjectInfoView } from '@/components/ProjectInfoView';
import { AddProductModal } from '@/components/AddProductModal';

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

  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const isProjectUnreleased = selectedProject?.status === 'UPCOMING';

  // Buildings list
  const buildings = Array.from(new Set(products.map(p => p.building)));

  // Filter products
  const filteredProducts = products.filter(p => {
    if (buildingFilter !== 'ALL' && p.building !== buildingFilter) return false;
    if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.productCode.toLowerCase().includes(q) || p.building.toLowerCase().includes(q);
    }
    return true;
  });

  // Calculate status counts
  const counts = {
    TOTAL: products.length,
    AVAILABLE: products.filter(p => p.status === 'AVAILABLE').length,
    LOCKED: products.filter(p => p.status === 'LOCKED').length,
    DEPOSITED: products.filter(p => p.status === 'DEPOSITED').length,
    SOLD: products.filter(p => p.status === 'SOLD').length,
    UNAVAILABLE: products.filter(p => p.status === 'UNAVAILABLE').length,
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <span className="status-available px-2.5 py-1 rounded-full text-[11px] font-bold">Còn Hàng</span>;
      case 'LOCKED':
        return <span className="status-locked px-2.5 py-1 rounded-full text-[11px] font-bold animate-pulse-glow flex items-center gap-1"><Lock className="w-3 h-3" /> Đang Lock 30m</span>;
      case 'DEPOSITED':
        return <span className="status-deposited px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Đã Cọc</span>;
      case 'SOLD':
        return <span className="status-sold px-2.5 py-1 rounded-full text-[11px] font-bold">Đã Bán</span>;
      default:
        return <span className="status-unavailable px-2.5 py-1 rounded-full text-[11px] font-bold">Tạm Ngưng</span>;
    }
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
                <option value="DEPOSITED">Đã Cọc</option>
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

          {isProjectUnreleased && (
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
            </button>
          )}
        </div>
      </div>

      {/* RENDER PROJECT SUB-TAB VIEWS */}
      {projectSubTab === 'info' ? (
        <ProjectInfoView project={selectedProject} currentRole={currentRole} onRefresh={onRefresh} />
      ) : projectSubTab === 'booking' ? (
        <div className="glass-panel p-8 text-center rounded-2xl border border-slate-800 space-y-3">
          <Sparkles className="w-10 h-10 text-amber-400 mx-auto animate-bounce" />
          <h3 className="text-base font-bold text-white">Bảng Giữ Chỗ / Booking Dự Án Chưa Ra Hàng</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Dự án <strong>{selectedProject?.name}</strong> hiện đang tiếp nhận Booking ưu tiên đợt 1. Quỹ hàng chính thức sẽ mở khóa khi chủ đầu tư công bố ngày mở bán.
          </p>
          <div className="pt-3">
            <span className="px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
              Tiền Booking giữ chỗ: 50.000.000 VND / Suất
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status KPI Summary Chips */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

            <div className="glass-panel p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/10 flex items-center justify-between">
              <div>
                <div className="text-[11px] text-accent-cyan font-semibold uppercase">Đã Cọc</div>
                <div className="text-xl font-black text-accent-cyan mt-0.5">{counts.DEPOSITED}</div>
              </div>
              <CheckCircle className="w-4 h-4 text-accent-cyan" />
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
                            const isAvailable = prod.status === 'AVAILABLE';

                            return (
                              <div
                                key={prod.id}
                                onClick={() => setSelectedProduct(prod)}
                                className={`p-3 rounded-xl border transition cursor-pointer relative group glass-panel-hover ${
                                  prod.status === 'AVAILABLE'
                                    ? 'bg-slate-900/80 border-slate-700/60 hover:border-emerald-500'
                                    : prod.status === 'LOCKED'
                                    ? 'bg-amber-950/20 border-amber-500/40 hover:border-amber-400'
                                    : prod.status === 'DEPOSITED'
                                    ? 'bg-cyan-950/20 border-accent-cyan/40 hover:border-accent-cyan'
                                    : prod.status === 'SOLD'
                                    ? 'bg-purple-950/20 border-purple-500/40'
                                    : 'bg-slate-950/40 border-slate-800 opacity-60'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <span className="text-xs font-black text-white group-hover:text-brand-300 transition">
                                    {prod.productCode}
                                  </span>
                                  {getStatusBadge(prod.status)}
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
                        <td className="p-3.5">{getStatusBadge(prod.status)}</td>
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
                  {getStatusBadge(selectedProduct.status)}
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

            {/* Spec grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <div>
                <span className="text-[11px] text-slate-400 block">Diện tích thông thủy</span>
                <span className="text-sm font-bold text-white">{selectedProduct.area} m²</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Hướng ban công</span>
                <span className="text-sm font-bold text-white">{selectedProduct.direction}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Gói bàn giao</span>
                <span className="text-sm font-bold text-white">{selectedProduct.handoverPlan}</span>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">Tiền cọc niêm yết</span>
                <span className="text-sm font-bold text-brand-400">100.000.000 VND</span>
              </div>
            </div>

            {/* Pricing table */}
            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">Bảng Giá Theo Phương Án Thanh Toán</h4>
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-900 text-slate-400 font-bold">
                    <tr>
                      <th className="p-3">Phương Án Thanh Toán</th>
                      <th className="p-3">Giá Niêm Yết</th>
                      <th className="p-3">Tiền Cọc</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {selectedProduct.prices?.map((pr: any) => (
                      <tr key={pr.id}>
                        <td className="p-3 font-semibold">{pr.paymentPlan?.name || 'Tiến độ chuẩn'}</td>
                        <td className="p-3 font-bold text-brand-400">{Number(pr.amount).toLocaleString('vi-VN')} VND</td>
                        <td className="p-3 font-bold text-emerald-400">{Number(pr.depositAmount).toLocaleString('vi-VN')} VND</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
        onSuccess={onRefresh}
      />
    </div>
  );
}
