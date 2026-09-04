'use client';

import React, { useState, useEffect } from 'react';
import { UserRole } from '@/lib/types';
import {
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  Image as ImageIcon,
  Play,
  Pause,
  Layers,
  Sparkles,
  CheckCircle2,
  Upload,
  X
} from 'lucide-react';

interface SlideItem {
  id: string;
  url: string;
  title: string;
  caption?: string;
  category?: string;
}

interface ProjectInfoViewProps {
  project: any;
  currentRole?: UserRole;
  onRefresh?: () => void;
}

const DEFAULT_SLIDES: SlideItem[] = [
  {
    id: 'vl-1',
    url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1600&q=85',
    title: '01. Giới Thiệu Dự Án The Vista Văn La (215 Oasis Villas)',
    caption: 'Kiệt tác quy hoạch Xanh bền vững - Urban Green Oasis, ốc đảo xanh tâm phố Hà Đông.',
    category: '01 TỔNG QUAN DỰ ÁN'
  },
  {
    id: 'vl-2',
    url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1600&q=85',
    title: '02. Vị Trí Vàng Tâm Điểm Hà Đông & Tuyến Metro',
    caption: 'Khu đô thị Văn La, kết nối trực tiếp ga đường sắt trên cao Cát Linh - Hà Đông và đường vành đai.',
    category: '02 LIÊN KẾT VÙNG'
  },
  {
    id: 'vl-3',
    url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1600&q=85',
    title: '03. Hệ Thống Tiện Ích Xanh Ốc Đảo & Clubhouse VICC',
    caption: 'Công viên xanh 5.000m², hồ cảnh quan điều hòa, bể bơi resort và văn phòng VICC An Khánh.',
    category: '03 HỆ THỐNG TIỆN ÍCH'
  },
  {
    id: 'vl-4',
    url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=85',
    title: '04. Bộ Sưu Tập 215 Căn Biệt Thự Oasis Villas & Liền Kề',
    caption: 'Biệt thự đơn lập, song lập và shophouse kinh doanh thiết kế tân cổ điển sang trọng.',
    category: '04 SẢN PHẨM BIỆT THỰ'
  },
  {
    id: 'vl-5',
    url: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1600&q=85',
    title: '05. Định Hướng Danh Mục Bàn Giao Cao Cấp SJ Group',
    caption: 'Hoàn thiện ngoại thất đồng bộ, vật liệu chuẩn quốc tế, kiểm soát an ninh đa lớp 24/7.',
    category: '05 ĐỊNH HƯỚNG BÀN GIAO'
  }
];

export function ProjectInfoView({ project, currentRole = 'SALES', onRefresh }: ProjectInfoViewProps) {
  if (!project) return null;

  // Initialize slides from project.imagesJson or fallback
  const [slides, setSlides] = useState<SlideItem[]>(() => {
    if (project.imagesJson) {
      try {
        const parsed = JSON.parse(project.imagesJson);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse project.imagesJson', e);
      }
    }
    return DEFAULT_SLIDES;
  });

  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // New slide form
  const [newSlideUrl, setNewSlideUrl] = useState<string>('');
  const [newSlideTitle, setNewSlideTitle] = useState<string>('');
  const [newSlideCaption, setNewSlideCaption] = useState<string>('');
  const [newSlideCategory, setNewSlideCategory] = useState<string>('Tổng quan dự án');

  // Update slides when project changes
  useEffect(() => {
    if (project.imagesJson) {
      try {
        const parsed = JSON.parse(project.imagesJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSlides(parsed);
          setCurrentSlideIndex(0);
        }
      } catch {}
    }
  }, [project.id, project.imagesJson]);

  // Autoplay slideshow
  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPlaying, slides.length]);

  const handleNextSlide = () => {
    setCurrentSlideIndex((prev) => (prev + 1) % slides.length);
  };

  const handlePrevSlide = () => {
    setCurrentSlideIndex((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Save slides to server
  const saveSlidesToServer = async (updatedSlides: SlideItem[]) => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/v1/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagesJson: JSON.stringify(updatedSlides),
          actorId: 'emp_prod_01',
          actorName: 'Nguyễn Tiến Dũng'
        })
      });
      if (res.ok) {
        setSlides(updatedSlides);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error('Failed to save slides', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSlide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSlideUrl.trim() || !newSlideTitle.trim()) {
      alert('Vui lòng nhập đường dẫn URL ảnh và tiêu đề slide!');
      return;
    }

    const newSlide: SlideItem = {
      id: `slide_${Date.now()}`,
      url: newSlideUrl.trim(),
      title: newSlideTitle.trim(),
      caption: newSlideCaption.trim() || 'Thông tin dự án chính thức từ chủ đầu tư.',
      category: newSlideCategory || 'Tổng quan dự án'
    };

    const updated = [...slides, newSlide];
    await saveSlidesToServer(updated);

    setNewSlideUrl('');
    setNewSlideTitle('');
    setNewSlideCaption('');
  };

  const handleDeleteSlide = async (slideId: string) => {
    if (slides.length <= 1) {
      alert('Dự án cần có ít nhất 1 slide hình ảnh!');
      return;
    }
    const updated = slides.filter((s) => s.id !== slideId);
    await saveSlidesToServer(updated);
    if (currentSlideIndex >= updated.length) {
      setCurrentSlideIndex(0);
    }
  };

  const currentSlide = slides[currentSlideIndex] || slides[0] || DEFAULT_SLIDES[0];
  const canManageSlides = currentRole === 'PRODUCT_ADMIN' || currentRole === 'MANAGER';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 uppercase tracking-wider">
              Slide Giới Thiệu Dự Án
            </span>
            <span className="text-xs text-slate-400">
              Slide <strong>{currentSlideIndex + 1}</strong> / {slides.length}
            </span>
          </div>
          <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-brand-400" />
            <span>{project.name}</span>
          </h2>
          <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
            <MapPin className="w-3.5 h-3.5 text-brand-400" />
            <span>{project.location}</span>
          </p>
        </div>

        {/* Controls Bar */}
        <div className="flex items-center space-x-2">
          {/* Slideshow Play / Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
              isPlaying
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title={isPlaying ? 'Dừng phát tự động' : 'Tự động chạy slide'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span className="hidden md:inline">{isPlaying ? 'Dừng chạy' : 'Phát slide'}</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
            title="Xem toàn màn hình"
          >
            <Maximize2 className="w-4 h-4" />
          </button>

          {/* Product Admin: Add / Manage Slides Button */}
          {canManageSlides && (
            <button
              onClick={() => setIsManageModalOpen(true)}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-cyan text-white text-xs font-bold shadow-lg shadow-brand-500/20 hover:brightness-110 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Quản Lý & Thêm Ảnh Slide</span>
            </button>
          )}
        </div>
      </div>

      {/* MAIN PRESENTATION SLIDE DISPLAY */}
      <div className="relative rounded-3xl overflow-hidden border border-slate-800 shadow-2xl glass-panel group aspect-[16/9] max-h-[580px] bg-black">
        {/* Background Image */}
        <img
          key={currentSlide.id}
          src={currentSlide.url}
          alt={currentSlide.title}
          className="w-full h-full object-cover transition-all duration-700 animate-in fade-in zoom-in-95"
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent pointer-events-none"></div>

        {/* Navigation Arrows */}
        <button
          onClick={handlePrevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-950/60 backdrop-blur-md border border-slate-700/60 text-white flex items-center justify-center hover:bg-brand-600 hover:scale-110 transition shadow-xl opacity-80 group-hover:opacity-100 z-10"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <button
          onClick={handleNextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-slate-950/60 backdrop-blur-md border border-slate-700/60 text-white flex items-center justify-center hover:bg-brand-600 hover:scale-110 transition shadow-xl opacity-80 group-hover:opacity-100 z-10"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Slide Info & Caption Box (Overlaid bottom) */}
        <div className="absolute bottom-6 left-6 right-6 p-5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-slate-700/60 flex flex-col md:flex-row md:items-end justify-between gap-4 z-10">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-brand-500/80 text-white">
                {currentSlide.category || 'Tài liệu dự án'}
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                Slide {currentSlideIndex + 1} / {slides.length}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">{currentSlide.title}</h3>
            {currentSlide.caption && (
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{currentSlide.caption}</p>
            )}
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => setIsFullscreen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-1"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Phóng to slide</span>
            </button>
          </div>
        </div>
      </div>

      {/* THUMBNAIL STRIP */}
      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-2">
          <Layers className="w-3.5 h-3.5 text-brand-400" />
          <span>Danh Sách Slide Giới Thiệu ({slides.length} slide)</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {slides.map((s, idx) => {
            const isActive = idx === currentSlideIndex;
            return (
              <div
                key={s.id || idx}
                onClick={() => setCurrentSlideIndex(idx)}
                className={`relative rounded-xl overflow-hidden border cursor-pointer group transition duration-300 aspect-[16/10] ${
                  isActive
                    ? 'border-brand-500 ring-2 ring-brand-500/50 scale-[1.02]'
                    : 'border-slate-800 opacity-70 hover:opacity-100 hover:border-slate-600'
                }`}
              >
                <img src={s.url} alt={s.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent p-2 flex flex-col justify-between">
                  <span className="text-[9px] font-extrabold bg-slate-900/80 text-brand-400 px-1.5 py-0.5 rounded w-max">
                    #{idx + 1}
                  </span>
                  <p className="text-[10px] font-bold text-white truncate drop-shadow">{s.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FULLSCREEN MODAL */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col justify-between p-6 animate-in fade-in">
          <div className="flex items-center justify-between text-white border-b border-slate-800 pb-3">
            <div>
              <span className="text-xs text-brand-400 font-bold block">{project.name}</span>
              <h2 className="text-lg font-bold">{currentSlide.title}</h2>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              <Minimize2 className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 flex items-center justify-center relative my-4">
            <img
              src={currentSlide.url}
              alt={currentSlide.title}
              className="max-h-[75vh] max-w-full object-contain rounded-2xl shadow-2xl border border-slate-800"
            />
            <button
              onClick={handlePrevSlide}
              className="absolute left-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-slate-900/80 text-white flex items-center justify-center border border-slate-700 hover:bg-brand-600 transition"
            >
              <ChevronLeft className="w-7 h-7" />
            </button>
            <button
              onClick={handleNextSlide}
              className="absolute right-6 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-slate-900/80 text-white flex items-center justify-center border border-slate-700 hover:bg-brand-600 transition"
            >
              <ChevronRight className="w-7 h-7" />
            </button>
          </div>

          <div className="text-center text-slate-300 text-xs py-2">
            <p>{currentSlide.caption}</p>
          </div>
        </div>
      )}

      {/* PRODUCT ADMIN: MANAGE SLIDES MODAL */}
      {isManageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="glass-panel w-full max-w-3xl rounded-2xl border border-slate-700 shadow-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white flex items-center space-x-2">
                  <ImageIcon className="w-5 h-5 text-brand-400" />
                  <span>Quản Lý & Thêm Ảnh Slide Dự Án (Product Admin)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Toàn bộ thông tin dự án được cập nhật trực quan bằng các slide ảnh</p>
              </div>
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Form Add New Slide */}
            <form onSubmit={handleAddSlide} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-4">
              <h4 className="text-xs font-bold text-brand-400 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                <span>Thêm Slide Ảnh Mới</span>
              </h4>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Đường Dẫn URL Ảnh (*)</label>
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/photo-..."
                    value={newSlideUrl}
                    onChange={(e) => setNewSlideUrl(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                    required
                  />
                  {/* Preset quick links */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[10px] text-slate-500">Gợi ý ảnh mẫu:</span>
                    <button
                      type="button"
                      onClick={() => {
                        setNewSlideUrl('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80');
                        setNewSlideTitle('Phối cảnh tổng thể đợt 2');
                        setNewSlideCaption('Phối cảnh kiến trúc mặt đứng và cảnh quan nội khu.');
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-brand-300 hover:bg-slate-700"
                    >
                      + Phối cảnh tòa tháp
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewSlideUrl('https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80');
                        setNewSlideTitle('Mặt bằng căn 2PN thông minh');
                        setNewSlideCaption('Sơ đồ thiết kế căn 2PN diện tích 75m² tối ưu.');
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-brand-300 hover:bg-slate-700"
                    >
                      + Mặt bằng căn 2PN
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewSlideUrl('https://images.unsplash.com/photo-1574362848149-11496d93a7c7?auto=format&fit=crop&w=800&q=80');
                        setNewSlideTitle('Chính sách bán hàng & Bảng giá đợt 1');
                        setNewSlideCaption('Chiết khấu thanh toán sớm 8%, hỗ trợ vay 0% lãi suất trong 24 tháng.');
                      }}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-brand-300 hover:bg-slate-700"
                    >
                      + Chính sách bán hàng
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Tiêu Đề Slide (*)</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Phối Cảnh Hồ Bơi Vô Cực"
                      value={newSlideTitle}
                      onChange={(e) => setNewSlideTitle(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Danh Mục Trình Bày</label>
                    <select
                      value={newSlideCategory}
                      onChange={(e) => setNewSlideCategory(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                    >
                      <option value="Tổng quan dự án">Tổng quan dự án</option>
                      <option value="Mặt bằng kỹ thuật">Mặt bằng kỹ thuật</option>
                      <option value="Căn hộ mẫu">Căn hộ mẫu</option>
                      <option value="Tiện ích nội khu">Tiện ích nội khu</option>
                      <option value="Chính sách & Bảng giá">Chính sách & Bảng giá</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Mô Tả / Chú Thích Slide</label>
                  <textarea
                    rows={2}
                    placeholder="Mô tả nội dung hoặc thông số kỹ thuật thể hiện trên slide ảnh..."
                    value={newSlideCaption}
                    onChange={(e) => setNewSlideCaption(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 text-white p-2.5 rounded-xl outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isSaving ? 'Đang lưu...' : 'Thêm Slide Vào Dự Án'}</span>
                </button>
              </div>
            </form>

            {/* Current Slides List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Các Slide Đang Có Trong Dự Án ({slides.length})
              </h4>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {slides.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      <img src={s.url} alt={s.title} className="w-14 h-10 object-cover rounded-lg border border-slate-700 shrink-0" />
                      <div>
                        <div className="font-bold text-white flex items-center space-x-2">
                          <span>#{idx + 1}. {s.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">{s.category}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{s.caption}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteSlide(s.id)}
                      className="p-2 rounded-lg bg-rose-950/30 text-rose-400 hover:bg-rose-900/50 hover:text-white transition"
                      title="Xóa slide này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsManageModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
              >
                Hoàn Tất
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
