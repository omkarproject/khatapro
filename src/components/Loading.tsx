'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';

export type LoadingVariant = 'initializing' | 'verifying' | 'almost' | 'custom';
export type LoadingSize = 'sm' | 'md' | 'lg' | 'xl' | 'inline';

export interface LoadingProps {
  /**
   * Loader Variant:
   * - 'initializing': General Loading (app start, page transitions, data fetching)
   * - 'verifying': Login Verification (after login, account verification, permission check)
   * - 'almost': Uploading / Processing (uploads, file processing, saving data, reports, PDF/Excel export)
   */
  variant?: LoadingVariant;
  /** Primary title (overrides variant default) */
  title?: React.ReactNode;
  /** Secondary subtitle (overrides variant default) */
  subtitle?: React.ReactNode;
  /** Optional tag pill text (e.g. 'GENERAL LOADING', 'LOGIN VERIFICATION', 'UPLOADING / PROCESSING') */
  tag?: string;
  /** Whether to show the tag badge pill under the title */
  showBadge?: boolean;
  /** Specific progress percentage (0 to 100). When provided, locks the arc to this value */
  progress?: number;
  /** Sizing: 'sm' | 'md' | 'lg' | 'xl' | 'inline' */
  size?: LoadingSize;
  /** If true, wraps in a full-screen or viewport-filling flex container */
  fullScreen?: boolean;
  /** Custom min-height class (e.g. 'min-h-[70vh]', 'min-h-[50vh]', 'min-h-screen') */
  minHeight?: string;
  /** Optional custom class name for the outer wrapper */
  className?: string;
  /** Custom logo override */
  logoUrl?: string;
  /** Whether to show card container styling */
  cardMode?: boolean;
}

const VARIANT_CONFIGS = {
  initializing: {
    title: 'Initializing...',
    subtitle: 'Connecting',
    tag: 'GENERAL LOADING',
    tagClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/80',
    arcPercent: 0.32, // ~32%
    dotAngle: 115, // degrees from top
    colorStart: '#06B6D4', // cyan
    colorMid: '#3B82F6',   // blue
    colorEnd: '#6366F1',   // indigo
    dotColor: '#6366F1',
    haloColor: 'rgba(99, 102, 241, 0.45)',
  },
  verifying: {
    title: 'Verifying',
    subtitle: 'Account',
    tag: 'LOGIN VERIFICATION',
    tagClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/80',
    arcPercent: 0.62, // ~62%
    dotAngle: 223,
    colorStart: '#38BDF8', // sky
    colorMid: '#6366F1',   // indigo
    colorEnd: '#A855F7',   // purple
    dotColor: '#A855F7',
    haloColor: 'rgba(168, 85, 247, 0.45)',
  },
  almost: {
    title: 'Almost',
    subtitle: 'Done',
    tag: 'UPLOADING / PROCESSING',
    tagClass: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800/80',
    arcPercent: 0.90, // ~90%
    dotAngle: 324,
    colorStart: '#06B6D4', // cyan
    colorMid: '#3B82F6',   // blue
    colorEnd: '#8B5CF6',   // violet
    dotColor: '#8B5CF6',
    haloColor: 'rgba(139, 92, 246, 0.45)',
  },
  custom: {
    title: 'Loading...',
    subtitle: 'Please wait',
    tag: 'PROCESSING',
    tagClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/80',
    arcPercent: 0.50,
    dotAngle: 180,
    colorStart: '#06B6D4',
    colorMid: '#3B82F6',
    colorEnd: '#A855F7',
    dotColor: '#A855F7',
    haloColor: 'rgba(168, 85, 247, 0.45)',
  },
};

export default function Loading({
  variant = 'initializing',
  title,
  subtitle,
  tag,
  showBadge = false,
  progress,
  size = 'md',
  fullScreen = false,
  minHeight,
  className = '',
  logoUrl,
  cardMode = false,
}: LoadingProps) {
  // Gracefully attempt to get app logo from context
  let contextLogo: string | undefined;
  try {
    const appContext = useApp();
    if (appContext && appContext.settings) {
      contextLogo = appContext.settings.websiteLogo;
    }
  } catch {
    // If rendered outside AppProvider (e.g. static error boundary), fallback safely
  }

  // Fallback to localStorage or default SmartKhata Pro logo
  const effectiveLogo = useMemo(() => {
    if (logoUrl) return logoUrl;
    if (contextLogo) return contextLogo;
    if (typeof window !== 'undefined') {
      try {
        const localLogo = localStorage.getItem('skp_brand_logo');
        if (localLogo) return localLogo;
      } catch {}
    }
    return '/brand-logo.png';
  }, [logoUrl, contextLogo]);

  const config = VARIANT_CONFIGS[variant] || VARIANT_CONFIGS.initializing;
  const displayTitle = title !== undefined ? title : config.title;
  const displaySubtitle = subtitle !== undefined ? subtitle : config.subtitle;
  const displayTag = tag !== undefined ? tag : config.tag;

  // Geometry configuration
  // SVG ViewBox 0 0 160 160, center = (80, 80), radius = 64
  const radius = 64;
  const circumference = 2 * Math.PI * radius; // 402.12
  const activePercent = progress !== undefined ? Math.max(0.05, Math.min(1, progress / 100)) : config.arcPercent;
  const strokeDash = activePercent * circumference;
  const strokeGap = circumference - strokeDash;

  // Compute tip dot coordinate for static reference
  const angleDeg = progress !== undefined ? activePercent * 360 : config.dotAngle;
  const angleRad = (angleDeg - 90) * (Math.PI / 180);
  const dotX = 80 + radius * Math.cos(angleRad);
  const dotY = 80 + radius * Math.sin(angleRad);

  // Sizing styles
  const sizeMap = {
    inline: {
      box: 'w-10 h-10',
      svg: 40,
      squircle: 'w-6 h-6 rounded-lg p-0.5',
      logo: 'w-4 h-4',
      title: 'text-xs font-bold',
      subtitle: 'text-[10px]',
      gap: 'gap-2.5',
    },
    sm: {
      box: 'w-20 h-20',
      svg: 80,
      squircle: 'w-11 h-11 rounded-xl p-1',
      logo: 'w-7 h-7',
      title: 'text-sm font-bold',
      subtitle: 'text-xs',
      gap: 'gap-3',
    },
    md: {
      box: 'w-32 h-32 sm:w-36 sm:h-36',
      svg: 144,
      squircle: 'w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-2xl sm:rounded-[22px] p-2',
      logo: 'w-12 h-12 sm:w-14 sm:h-14',
      title: 'text-lg sm:text-xl font-bold',
      subtitle: 'text-xs sm:text-sm',
      gap: 'gap-4',
    },
    lg: {
      box: 'w-40 h-40 sm:w-44 sm:h-44',
      svg: 176,
      squircle: 'w-24 h-24 sm:w-28 sm:h-28 rounded-3xl p-2.5',
      logo: 'w-16 h-16 sm:w-20 sm:h-20',
      title: 'text-xl sm:text-2xl font-bold',
      subtitle: 'text-sm sm:text-base',
      gap: 'gap-5',
    },
    xl: {
      box: 'w-48 h-48 sm:w-56 sm:h-56',
      svg: 224,
      squircle: 'w-32 h-32 sm:w-36 sm:h-36 rounded-[28px] p-3',
      logo: 'w-20 h-20 sm:w-24 sm:h-24',
      title: 'text-2xl sm:text-3xl font-black',
      subtitle: 'text-base sm:text-lg',
      gap: 'gap-6',
    },
  };

  const currentSize = sizeMap[size] || sizeMap.md;
  const gradientId = `skp-unified-grad-${variant}`;
  const glowId = `skp-unified-glow-${variant}`;

  // Unique visual loader block
  const loaderCore = (
    <div className={`flex ${size === 'inline' ? 'flex-row items-center' : 'flex-col items-center justify-center text-center'} ${currentSize.gap}`}>
      {/* Circular Progress with Centered Squircle Logo */}
      <div className={`relative ${currentSize.box} flex items-center justify-center shrink-0 select-none`}>
        {/* SVG Circular Track and Progress Arc */}
        <svg
          viewBox="0 0 160 160"
          className="w-full h-full transform -rotate-90 origin-center"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.colorStart} />
              <stop offset="50%" stopColor={config.colorMid} />
              <stop offset="100%" stopColor={config.colorEnd} />
            </linearGradient>
            <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={config.dotColor} floodOpacity="0.8" />
            </filter>
          </defs>

          {/* Background Track Circle */}
          <circle
            cx="80"
            cy="80"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            className="text-slate-200/70 dark:text-slate-800/80"
          />

          {/* Animated Gradient Progress Arc */}
          <g className={progress === undefined ? 'animate-[spin_2.5s_linear_infinite] origin-center' : ''}>
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${strokeGap}`}
              strokeDashoffset="0"
              className="transition-all duration-300 ease-out"
            />

            {/* Outer subtle halo ring around the orb */}
            <circle
              cx={dotX}
              cy={dotY}
              r="9"
              fill="none"
              stroke={config.dotColor}
              strokeWidth="1.5"
              strokeOpacity="0.5"
            />

            {/* Glowing Orb/Dot leading the progress arc */}
            <circle
              cx={dotX}
              cy={dotY}
              r="5.5"
              fill={config.dotColor}
              filter={`url(#${glowId})`}
              className="animate-pulse"
            />

            {/* Inner Core Bright White Dot */}
            <circle
              cx={dotX}
              cy={dotY}
              r="2.5"
              fill="#FFFFFF"
            />
          </g>
        </svg>

        {/* Squircle App Logo Container in Center */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`relative ${currentSize.squircle} bg-gradient-to-b from-[#0e1628] to-[#070b14] border border-indigo-500/30 dark:border-indigo-400/30 shadow-lg shadow-indigo-500/20 flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105`}
          >
            {/* Ambient inner gradient glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-indigo-600/20 to-purple-600/20 pointer-events-none" />

            {/* Logo Image */}
            <img
              src={effectiveLogo}
              alt="Logo"
              className={`${currentSize.logo} object-contain drop-shadow-md select-none relative z-10 transition-transform duration-300`}
              onError={(e) => {
                // Graceful fallback to default logo if custom URL fails
                const target = e.currentTarget as HTMLImageElement;
                if (!target.src.endsWith('/brand-logo.png')) {
                  target.src = '/brand-logo.png';
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Typography: Title & Subtitle */}
      {(displayTitle || displaySubtitle || (showBadge && displayTag)) && (
        <div className={size === 'inline' ? 'text-left min-w-0' : 'space-y-1'}>
          {displayTitle && (
            <h3 className={`${currentSize.title} text-slate-900 dark:text-white tracking-tight leading-tight drop-shadow-xs`}>
              {displayTitle}
            </h3>
          )}
          {displaySubtitle && (
            <p className={`${currentSize.subtitle} text-slate-500 dark:text-slate-400 font-medium tracking-normal`}>
              {displaySubtitle}
            </p>
          )}

          {/* Optional Mode Tag Badge */}
          {showBadge && displayTag && (
            <div className="pt-2">
              <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border shadow-xs ${config.tagClass}`}>
                {displayTag}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // If cardMode is enabled, wrap in the beautiful card container from reference image
  if (cardMode) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={`w-full max-w-sm mx-auto p-8 rounded-[32px] bg-white dark:bg-[#0C1222] border border-slate-200/80 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none transition-all duration-300 ${className}`}
      >
        {loaderCore}
      </div>
    );
  }

  // If fullScreen or custom minHeight, wrap appropriately
  const containerHeightClass = fullScreen
    ? 'min-h-screen'
    : minHeight
    ? minHeight
    : size === 'inline'
    ? ''
    : 'min-h-[50vh]';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center p-4 transition-all duration-300 text-slate-900 dark:text-white ${containerHeightClass} ${className}`}
    >
      {loaderCore}
    </div>
  );
}
