'use client';

import React from 'react';
import {
  Building2,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Award,
  Compass,
  DollarSign,
  Maximize2
} from 'lucide-react';

interface ProjectInfoViewProps {
  project: any;
}

export function ProjectInfoView({ project }: ProjectInfoViewProps) {
  if (!project) return null;

  const sampleImages = [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?auto=format&fit=crop&w=800&q=80'
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Project Banner & Hero */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl glass-panel">
        <div className="h-64 sm:h-80 w-full relative">
          <img
            src={sampleImages[0]}
            alt={project.name}
            className="w-full h-full object-cover brightness-75 hover:scale-105 transition-all duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#080b11] via-slate-950/40 to-transparent"></div>

          <div className="absolute bottom-6 left-6 right-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-3 py-1 text-[11px] font-bold rounded-full bg-brand-500/80 text-white backdrop-blur-md">
                  DỰ ÁN CAO CẤP
                </span>
                <span className={`px-3 py-1 text-[11px] font-bold rounded-full backdrop-blur-md ${
                  project.status === 'SELLING' ? 'bg-emerald-500/80 text-white' : 'bg-amber-500/80 text-slate-950'
                }`}>
                  {project.status === 'SELLING' ? 'Đang Mở Bán' : 'Sắp Ra Hàng (Booking)'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{project.name}</h1>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4 text-brand-400 shrink-0" />
                <span>{project.location}</span>
              </p>
            </div>

            <div className="flex items-center space-x-3 bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-slate-700/60 text-xs">
              <div className="text-center px-3 border-r border-slate-800">
                <span className="text-[10px] text-slate-400 block">Thời Gian Giữ Căn</span>
                <span className="font-extrabold text-brand-400">{project.lockDurationMinutes || 30} Phút</span>
              </div>
              <div className="text-center px-3">
                <span className="text-[10px] text-slate-400 block">Tiền Cọc Niêm Yết</span>
                <span className="font-extrabold text-emerald-400">100 Tr VND</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-brand-600/20 text-brand-400 border border-brand-500/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase block">Chủ Đầu Tư</span>
            <span className="text-xs font-black text-white">Tập Đoàn AHS Group</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase block">Quy Mô Khối Căn</span>
            <span className="text-xs font-black text-white">3 Tòa - 144 Căn Hộ</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase block">Bàn Giao Dự Kiến</span>
            <span className="text-xs font-black text-white">Quý IV / 2026</span>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center space-x-3">
          <div className="p-3 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-400 font-semibold uppercase block">Hình Thức Sở Hữu</span>
            <span className="text-xs font-black text-emerald-400">Sổ Hồng Lâu Dài</span>
          </div>
        </div>
      </div>

      {/* Gallery & Specs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Gallery */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>Hình Ảnh & Phối Cảnh Dự Án (Chỉ Xem)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sampleImages.slice(1).map((imgUrl, idx) => (
              <div key={idx} className="h-40 rounded-xl overflow-hidden border border-slate-800 group relative">
                <img
                  src={imgUrl}
                  alt={`Phối cảnh ${idx + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition p-3 flex items-end">
                  <span className="text-[11px] font-bold text-white">Phối cảnh tiện ích 0{idx + 1}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300 leading-relaxed space-y-2">
            <h4 className="font-bold text-white">Mô Tả Tổng Quan Dự Án:</h4>
            <p>
              Dự án <strong>{project.name}</strong> tọa lạc tại vị trí vàng tâm điểm kết nối giao thông.
              Quy hoạch tổng thể đồng bộ với công viên cây xanh, hồ bơi vô cực, phòng gym cao cấp và trung tâm thương mại.
              Các căn hộ được thiết kế tối ưu công năng, đón ánh sáng tự nhiên với góc nhìn panorama ấn tượng.
            </p>
          </div>
        </div>

        {/* Right Col: Amenities list */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center space-x-2 border-b border-slate-800 pb-3">
            <Award className="w-4 h-4 text-amber-400" />
            <span>Tiện Ích Nổi Bật</span>
          </h3>

          <div className="space-y-3">
            {[
              'Hồ bơi tràn bờ tầng thượng panorama',
              'Sảnh đón 5 sao tiêu chuẩn khách sạn',
              'Công viên cảnh quan & đường chạy bộ',
              'Trung tâm thương mại & Shophouse 24/7',
              'Hệ thống an ninh thông minh AI 3 lớp',
              'Bãi đỗ xe thông minh định danh biển số'
            ].map((item, idx) => (
              <div key={idx} className="flex items-center space-x-3 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
