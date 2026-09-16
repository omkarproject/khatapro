'use client';

import React, { useState, useEffect } from 'react';
import {
  Wrench,
  X,
  Sparkles,
  ShieldCheck,
  Zap,
  Activity,
  ArrowRight,
  CheckCircle2,
  Lock
} from 'lucide-react';

export default function MaintenanceNoticeModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissed = sessionStorage.getItem('skp_beta_notice_dismissed');
      if (!dismissed) {
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleDismiss = () => {
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('skp_beta_notice_dismissed', 'true');
    }
  };

  const handleOpenNotice = () => {
    setIsOpen(true);
  };

  return (
    <>
      {/* Floating Re-open Badge when dismissed */}
      {!isOpen && (
        <button
          type="button"
          onClick={handleOpenNotice}
          className="fixed bottom-4 left-4 z-40 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-indigo-950/90 text-cyan-400 border border-cyan-500/30 text-[11px] font-mono font-bold shadow-lg shadow-cyan-500/10 backdrop-blur-md flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          title="System Testing Mode Status"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="group-hover:underline">BETA TESTING ACTIVE</span>
        </button>
      )}

      {/* Main Futuristic Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-300">
          <div className="relative w-full max-w-lg rounded-3xl bg-[#080D1A]/95 border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.25)] overflow-hidden text-slate-200">
            
            {/* Cyberpunk Top Glowing Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-500 animate-[pulse_2s_ease-in-out_infinite]" />

            {/* Glowing Corner Accents */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

            {/* Close (X) Icon Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 transition-all cursor-pointer active:scale-95 z-10"
              title="Close Notice"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Header with Futuristic Hologram Badge */}
              <div className="flex items-start gap-4">
                <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/30 border border-cyan-500/50 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
                  <Wrench className="w-6 h-6 text-cyan-400 animate-[spin_10s_linear_infinite]" />
                  <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-[#080D1A] flex items-center justify-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-900 animate-pulse" />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest font-extrabold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-800/60">
                      System Notice • v2.4 Beta
                    </span>
                    <span className="text-[10px] text-amber-400 font-mono font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" /> Testing Phase
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Website Under Testing &amp; Maintenance
                  </h3>
                </div>
              </div>

              {/* Stylish Description */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800/80 text-xs sm:text-sm text-slate-300 leading-relaxed space-y-2">
                <p>
                  Welcome to <strong>SmartKhata Pro</strong>. The platform is currently undergoing live feature enhancements, user flow optimizations, and payment gateway verification.
                </p>
                <p className="text-xs text-cyan-300/90 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>All Ledger, Invoicing, and Payment Collection modules are 100% operational for live testing.</span>
                </p>
              </div>

              {/* Futuristic Tech Spec Pills */}
              <div className="grid grid-cols-3 gap-2.5 text-center font-mono">
                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-cyan-500/20">
                  <div className="text-[10px] text-slate-400 uppercase">Gateway</div>
                  <div className="text-xs font-bold text-cyan-400 mt-0.5 flex items-center justify-center gap-1">
                    <Zap className="w-3 h-3" /> Live (Active)
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-indigo-500/20">
                  <div className="text-[10px] text-slate-400 uppercase">Security</div>
                  <div className="text-xs font-bold text-indigo-400 mt-0.5 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" /> 256-Bit SSL
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-900/60 border border-purple-500/20">
                  <div className="text-[10px] text-slate-400 uppercase">Mode</div>
                  <div className="text-xs font-bold text-purple-400 mt-0.5 flex items-center justify-center gap-1">
                    <Activity className="w-3 h-3" /> Production
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold text-xs tracking-wide shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all"
                >
                  <span>Acknowledge &amp; Continue to Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="text-center">
                <span className="text-[10px] text-slate-500 font-mono">
                  You can dismiss this popup or reopen it anytime from the bottom-left corner badge.
                </span>
              </div>

            </div>

          </div>

        </div>
      )}
    </>
  );
}
