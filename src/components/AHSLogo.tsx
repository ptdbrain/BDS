'use client';

import React, { useState } from 'react';

interface AHSLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'icon-only' | 'horizontal' | 'vertical';
  showBadge?: boolean;
  showSubtitle?: boolean;
  badgeText?: string;
  subtitle?: string;
  credit?: string;
  className?: string;
}

export function AHSLogo({
  size = 'md',
  variant = 'horizontal',
  showBadge = true,
  showSubtitle = true,
  badgeText = 'ENTERPRISE v2.5',
  subtitle = 'WEBSITE QUẢN LÝ SẢN PHẨM VÀ GIAO DỊCH',
  credit = 'Phụ trách xây dựng: Nhân viên quản lý sản phẩm Hoàng Thị Hương Giang',
  className = ''
}: AHSLogoProps) {
  const [imageError, setImageError] = useState(false);

  // Size mapping for logo icon box
  const sizeMap = {
    sm: {
      box: 'w-8 h-8 rounded-lg',
      img: 32,
      title: 'text-sm',
      badge: 'text-[9px] px-1.5 py-0.2',
      subTitle: 'text-[10px]',
      credit: 'text-[9px]'
    },
    md: {
      box: 'w-11 h-11 rounded-xl',
      img: 44,
      title: 'text-base sm:text-lg',
      badge: 'text-[10px] px-2 py-0.5',
      subTitle: 'text-[11px]',
      credit: 'text-[10px]'
    },
    lg: {
      box: 'w-13 h-13 rounded-2xl',
      img: 52,
      title: 'text-lg sm:text-xl',
      badge: 'text-[11px] px-2.5 py-0.5',
      subTitle: 'text-xs',
      credit: 'text-[11px]'
    },
    xl: {
      box: 'w-16 h-16 rounded-2xl',
      img: 64,
      title: 'text-2xl',
      badge: 'text-xs px-3 py-1',
      subTitle: 'text-sm',
      credit: 'text-xs'
    }
  };

  const currentSize = sizeMap[size];

  // SVG Fallback representing AHS Property logo
  const renderSvgFallback = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="18" fill="#1e3a6c" />
      {/* Gold diagonal stroke for left leg of A */}
      <path d="M26 68L44 26H50L32 68H26Z" fill="#CCA546" />
      {/* White right leg of A / Left leg of H */}
      <path d="M46 26H53V68H46V26Z" fill="#FFFFFF" />
      {/* 4 small white squares in center of H */}
      <rect x="58" y="42" width="4" height="4" fill="#FFFFFF" />
      <rect x="64" y="42" width="4" height="4" fill="#FFFFFF" />
      <rect x="58" y="48" width="4" height="4" fill="#FFFFFF" />
      <rect x="64" y="48" width="4" height="4" fill="#FFFFFF" />
      {/* White right leg of H */}
      <path d="M72 26H79V68H72V26Z" fill="#FFFFFF" />
      {/* Text PROPERTY */}
      <text x="50" y="84" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" letterSpacing="2" fontFamily="sans-serif">
        PROPERTY
      </text>
    </svg>
  );

  const logoMark = (
    <div
      className={`relative flex items-center justify-center overflow-hidden bg-[#1a3464] border border-white/15 shadow-lg shadow-blue-950/40 transition-transform duration-200 hover:scale-105 shrink-0 ${currentSize.box}`}
    >
      {!imageError ? (
        <img
          src="/logo.png"
          alt="AHS Property Logo"
          className="w-full h-full object-cover rounded-[inherit]"
          onError={() => setImageError(true)}
        />
      ) : (
        renderSvgFallback()
      )}
    </div>
  );

  if (variant === 'icon-only') {
    return <div className={`inline-flex ${className}`}>{logoMark}</div>;
  }

  if (variant === 'vertical') {
    return (
      <div className={`flex flex-col items-center text-center space-y-2 ${className}`}>
        {logoMark}
        <div>
          <div className="flex items-center justify-center space-x-2">
            <span className={`font-black tracking-wider text-white ${currentSize.title}`}>
              AHS PROPERTY
            </span>
            {showBadge && (
              <span className={`font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 ${currentSize.badge}`}>
                {badgeText}
              </span>
            )}
          </div>
          {showSubtitle && (
            <div className="mt-1.5 flex flex-col items-center space-y-0.5">
              <p className={`font-semibold text-slate-300 tracking-wide uppercase ${currentSize.subTitle}`}>
                {subtitle}
              </p>
              {credit && (
                <p className={`text-slate-400 font-normal ${currentSize.credit}`}>
                  {credit}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Horizontal variant (default)
  return (
    <div className={`flex items-center space-x-3.5 ${className}`}>
      {logoMark}
      <div className="leading-tight">
        <div className="flex items-center space-x-2">
          <span className={`font-black tracking-wider text-white flex items-center gap-1.5 ${currentSize.title}`}>
            <span>AHS PROPERTY</span>
          </span>
          {showBadge && (
            <span className={`font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 ${currentSize.badge}`}>
              {badgeText}
            </span>
          )}
        </div>
        {showSubtitle && (
          <div className="mt-1 flex flex-col space-y-0.5">
            <p className={`font-semibold text-slate-300 tracking-wide uppercase ${currentSize.subTitle}`}>
              {subtitle}
            </p>
            {credit && (
              <p className={`text-slate-400 font-normal ${currentSize.credit}`}>
                {credit}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
