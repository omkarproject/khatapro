'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { BroadcastMessage } from '@/types';
import { Megaphone, AlertTriangle, CheckCircle2, Info, X, Bell, ExternalLink } from 'lucide-react';

export default function BroadcastBanner() {
  const { settings, currentUser } = useApp();
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('khatapro_dismissed_broadcasts');
        if (stored) {
          setDismissedIds(JSON.parse(stored));
        }
      } catch (e) {}
    }
  }, []);

  const handleDismiss = (broadcastId: string) => {
    const updated = [...dismissedIds, broadcastId];
    setDismissedIds(updated);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('khatapro_dismissed_broadcasts', JSON.stringify(updated));
      } catch (e) {}
    }
  };

  if (!mounted) return null;

  const rawBroadcasts: BroadcastMessage[] = settings.broadcasts || [];
  if (!rawBroadcasts || rawBroadcasts.length === 0) return null;

  // Filter broadcasts relevant to this user and not yet dismissed
  const activeBroadcasts = rawBroadcasts.filter((b) => {
    if (!b || !b.id) return false;
    if (dismissedIds.includes(b.id)) return false;

    // Check audience targeting
    if (b.targetType === 'specific_user') {
      const isTarget = currentUser && (currentUser.id === b.targetUserId || currentUser.email === b.targetUserId);
      const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin');
      if (!isTarget && !isAdmin) return false;
    }

    return true;
  });

  if (activeBroadcasts.length === 0) return null;

  const banners = activeBroadcasts.filter(b => b.type === 'banner');
  const popups = activeBroadcasts.filter(b => b.type === 'popup');
  const notifications = activeBroadcasts.filter(b => b.type === 'notification');

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'success':
        return {
          bg: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-emerald-500/20',
          badge: 'bg-emerald-700/60 text-emerald-100 border-emerald-400/40',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />,
        };
      case 'warning':
        return {
          bg: 'bg-gradient-to-r from-amber-500 to-yellow-600 text-slate-950 shadow-amber-500/20 font-bold',
          badge: 'bg-amber-600/60 text-slate-950 border-amber-800/40',
          icon: <AlertTriangle className="w-5 h-5 text-slate-950 shrink-0" />,
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-rose-500/20',
          badge: 'bg-rose-700/60 text-rose-100 border-rose-400/40',
          icon: <AlertTriangle className="w-5 h-5 text-rose-100 shrink-0" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-indigo-500/20',
          badge: 'bg-indigo-700/60 text-indigo-100 border-indigo-400/40',
          icon: <Info className="w-5 h-5 text-indigo-100 shrink-0" />,
        };
    }
  };

  return (
    <>
      {/* 1. TOP BANNERS */}
      {banners.length > 0 && (
        <div className="space-y-2 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {banners.map((b) => {
            const style = getSeverityStyle(b.severity);
            return (
              <div
                key={b.id}
                className={`w-full px-4 py-3 rounded-2xl shadow-md border border-white/20 flex items-center justify-between gap-3 text-xs ${style.bg}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {style.icon}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold uppercase tracking-wide text-xs">
                        {b.title}
                      </span>
                      {b.targetType === 'specific_user' && (
                        <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-white/25 uppercase">
                          Personal Alert
                        </span>
                      )}
                    </div>
                    <div
                      className="mt-0.5 opacity-95 text-xs font-medium leading-relaxed prose prose-sm prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: b.content }}
                    />
                  </div>
                </div>

                {b.isClosable && (
                  <button
                    type="button"
                    onClick={() => handleDismiss(b.id)}
                    className="p-1 rounded-xl bg-black/15 hover:bg-black/30 text-white transition-colors cursor-pointer shrink-0"
                    title="Dismiss Announcement"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. MODAL POPUPS */}
      {popups.map((b) => {
        const style = getSeverityStyle(b.severity);
        return (
          <div
            key={b.id}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
          >
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150 text-slate-900 dark:text-white">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${style.bg}`}>
                    {style.icon}
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      System Announcement
                    </span>
                    <h3 className="text-base sm:text-lg font-black mt-1">
                      {b.title}
                    </h3>
                  </div>
                </div>

                {b.isClosable && (
                  <button
                    type="button"
                    onClick={() => handleDismiss(b.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Popup Content */}
              <div
                className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-h-72 overflow-y-auto pr-1 prose dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: b.content }}
              />

              {/* Footer */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => handleDismiss(b.id)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  I Understand / Dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {/* 3. FLOATING NOTIFICATIONS (Corner Alerts) */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
          {notifications.map((b) => {
            const style = getSeverityStyle(b.severity);
            return (
              <div
                key={b.id}
                className={`pointer-events-auto p-4 rounded-2xl shadow-xl border border-white/20 flex items-start justify-between gap-3 text-xs animate-in slide-in-from-right duration-200 ${style.bg}`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  {style.icon}
                  <div className="min-w-0">
                    <h5 className="font-bold text-xs uppercase tracking-wide">
                      {b.title}
                    </h5>
                    <div
                      className="mt-1 text-[11px] leading-relaxed opacity-95 prose prose-invert"
                      dangerouslySetInnerHTML={{ __html: b.content }}
                    />
                  </div>
                </div>

                {b.isClosable && (
                  <button
                    type="button"
                    onClick={() => handleDismiss(b.id)}
                    className="p-1 rounded-lg bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
