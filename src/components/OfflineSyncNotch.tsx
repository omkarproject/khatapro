'use client';

import React from 'react';
import { WifiOff, Loader2, CheckCircle2, Cloud } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export default function OfflineSyncNotch() {
  const { isOnline, syncPhase, syncProgress, hasPendingOfflineSync } = useApp();

  const isOfflineState = !isOnline || syncPhase === 'offline';

  if (!isOfflineState && syncPhase === 'idle') {
    return null;
  }

  return (
    <div className="w-full flex justify-center pointer-events-none select-none z-50 bg-transparent">
      {isOfflineState && (
        <div
          className="relative overflow-hidden inline-flex items-center gap-1.5 px-3 py-0.5 rounded-b-xl bg-amber-950/95 dark:bg-amber-950 text-amber-200 border-x border-b border-amber-500/40 shadow-md text-[10.5px] font-semibold tracking-wide"
          title="Internet disconnected — working offline; changes are saved locally and will sync automatically when online."
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <WifiOff className="w-3 h-3 text-amber-400 shrink-0" />
          <span>Offline Work</span>
          {hasPendingOfflineSync && (
            <span className="text-[9.5px] text-amber-300/85 font-medium">
              • Saved Locally
            </span>
          )}
        </div>
      )}

      {!isOfflineState && syncPhase === 'online_syncing' && (
        <div
          className="relative overflow-hidden inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-b-xl bg-slate-900/95 dark:bg-slate-950 text-emerald-300 border-x border-b border-emerald-500/40 shadow-md text-[10.5px] font-semibold tracking-wide"
          title={`Online — Syncing offline updates to cloud (${syncProgress}%)`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <Loader2 className="w-3 h-3 text-emerald-400 animate-spin shrink-0" />
          <span>Online</span>
          <span className="text-slate-400">•</span>
          <span className="font-mono tabular-nums text-white">
            Syncing {Math.max(1, Math.min(100, syncProgress))}%
          </span>
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-150 ease-out"
              style={{ width: `${Math.max(1, Math.min(100, syncProgress))}%` }}
            />
          </div>
        </div>
      )}

      {!isOfflineState && syncPhase === 'synced' && (
        <div
          className="relative overflow-hidden inline-flex items-center gap-1.5 px-3.5 py-0.5 rounded-b-xl bg-emerald-950/95 text-emerald-200 border-x border-b border-emerald-500/45 shadow-md text-[10.5px] font-semibold tracking-wide"
          title="All offline changes synced to cloud (100%)"
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>Online</span>
          <span className="text-emerald-400/70">•</span>
          <Cloud className="w-3 h-3 text-emerald-300 shrink-0" />
          <span className="font-mono tabular-nums text-emerald-100">Synced 100%</span>
        </div>
      )}
    </div>
  );
}
