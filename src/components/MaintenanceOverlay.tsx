'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Flame,
  Zap,
  Wrench,
  Clock,
  ShieldAlert,
  Unlock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  HardHat
} from 'lucide-react';

export default function MaintenanceOverlay() {
  const { settings, updateSettings, addToast } = useApp();
  const maintenance = settings?.maintenanceMode;

  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [isAdminBypassed, setIsAdminBypassed] = useState<boolean>(false);
  const [showBypassPrompt, setShowBypassPrompt] = useState<boolean>(false);
  const [passcode, setPasscode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Check sessionStorage on mount for existing admin bypass
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const bypassed = sessionStorage.getItem('skp_admin_maintenance_bypass');
      if (bypassed === 'true') {
        setIsAdminBypassed(true);
      }
    }
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (!maintenance?.enabled) {
      setTimeLeftMs(0);
      return;
    }

    const calculateRemaining = () => {
      if (!maintenance.endTime) {
        // Fallback default 15 minutes if endTime wasn't stored
        return (maintenance.durationMinutes || 15) * 60 * 1000;
      }
      const end = new Date(maintenance.endTime).getTime();
      const now = Date.now();
      return Math.max(0, end - now);
    };

    setTimeLeftMs(calculateRemaining());

    const interval = setInterval(() => {
      const remaining = calculateRemaining();
      setTimeLeftMs(remaining);

      // Auto turn OFF maintenance mode when timer reaches 0!
      if (remaining <= 0) {
        clearInterval(interval);
        updateSettings({
          maintenanceMode: {
            enabled: false,
            endTime: undefined,
            durationMinutes: maintenance.durationMinutes || 15,
            reason: maintenance.reason,
          },
        });
        addToast(
          'Repairs Finished! ⚡🎉',
          'Transformer fix ho gaya! System auto-restored to live mode.',
          'success'
        );
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [maintenance?.enabled, maintenance?.endTime, maintenance?.durationMinutes, updateSettings, addToast]);

  // If maintenance is OFF or admin bypassed, do not block the screen
  if (!maintenance?.enabled || isAdminBypassed) {
    // Show a small floating admin pill if maintenance is active but bypassed
    if (maintenance?.enabled && isAdminBypassed) {
      return (
        <div className="fixed top-20 right-4 z-50 bg-rose-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 animate-pulse">
          <Flame className="w-3.5 h-3.5" />
          <span>Maintenance Active (Admin Bypass ON)</span>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('skp_admin_maintenance_bypass');
              setIsAdminBypassed(false);
            }}
            className="underline ml-1 cursor-pointer"
          >
            Lock View
          </button>
        </div>
      );
    }
    return null;
  }

  // Time format calculations
  const totalSeconds = Math.floor(timeLeftMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formattedTime = `${hours > 0 ? `${String(hours).padStart(2, '0')}:` : ''}${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleAdminBypassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = passcode.trim().toLowerCase();
    const validCodes = ['admin', '1234', 'owner', 'superadmin', '9999'];
    if (validCodes.includes(cleaned)) {
      sessionStorage.setItem('skp_admin_maintenance_bypass', 'true');
      setIsAdminBypassed(true);
      setShowBypassPrompt(false);
      addToast('Admin Access Granted', 'Maintenance view bypassed for your session.', 'info');
    } else {
      setErrorMsg('Galat Passcode! "admin" ya "1234" enter karein.');
    }
  };

  const handleEmergencyTurnOff = () => {
    updateSettings({
      maintenanceMode: {
        enabled: false,
        endTime: undefined,
        durationMinutes: 15,
      },
    });
    addToast('Maintenance Mode Disabled', 'Website is back online for all users.', 'success');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center p-4 sm:p-6 bg-[#070A12] text-white overflow-y-auto selection:bg-rose-500">
      
      {/* Background Animated Glows & Fire Sparks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-600/25 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-amber-600/20 rounded-full blur-[100px]" />
        <div className="absolute top-1/3 right-10 w-80 h-80 bg-orange-600/20 rounded-full blur-[110px]" />
      </div>

      <div className="relative w-full max-w-2xl bg-slate-900/90 border-2 border-rose-500/40 rounded-3xl p-6 sm:p-10 shadow-[0_0_80px_rgba(244,63,94,0.3)] backdrop-blur-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
        
        {/* Animated Emergency Top Header Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-500/20 border border-rose-500/50 text-rose-300 text-xs font-mono font-black tracking-wider uppercase shadow-inner animate-pulse">
          <Flame className="w-4 h-4 text-rose-400" />
          <span>EMERGENCY SYSTEM OVERHAUL IN PROGRESS</span>
          <Zap className="w-4 h-4 text-amber-400" />
        </div>

        {/* Funny Main Heading & Story */}
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3 text-4xl sm:text-5xl">
            <span className="animate-bounce">⚡</span>
            <span className="animate-pulse">💥</span>
            <span className="animate-bounce delay-100">🔥</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white uppercase drop-shadow-md">
            TRANSFORMER ME AAG LAG GAI!
          </h1>

          <p className="text-sm sm:text-base text-rose-200/90 font-medium max-w-lg mx-auto leading-relaxed">
            {maintenance?.reason || 'Hamare area ke main transformer me dhamaka ho gaya hai! Many engineers aur technicians hatode aur pechkas leke repair kar rahe hain 👨‍🔧🛠️🔌'}
          </p>
        </div>

        {/* The Animated Ticking Bomb Timer */}
        <div className="p-6 rounded-3xl bg-slate-950/80 border-2 border-amber-500/40 shadow-inner flex flex-col items-center space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
            <span className="text-2xl animate-spin">💣</span>
            <span>AUTO-RESTORE COUNTDOWN TIMER</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>

          {/* Big Digital Countdown Clock */}
          <div className="font-mono text-5xl sm:text-6xl font-black tracking-widest text-amber-300 drop-shadow-[0_0_20px_rgba(251,191,36,0.6)] py-1 flex items-center justify-center gap-2">
            <span>{formattedTime}</span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Timer khatam hote hi website automatically open ho jaegi</span>
          </div>
        </div>

        {/* Live Repair Work Progress Ticker (Funny & Stylish) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-slate-300 text-left">
          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2.5">
            <HardHat className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-[11px]">Mistri Pappu Bhai</div>
              <div className="text-[10px] text-slate-400 font-mono">Wire jodne me lage hain</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-[11px]">Aag Bujha Di Gai</div>
              <div className="text-[10px] text-emerald-400 font-mono">Cooling phase 100%</div>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center gap-2.5">
            <Zap className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-[11px]">Grid Voltage Check</div>
              <div className="text-[10px] text-cyan-300 font-mono">220V Stabilizing...</div>
            </div>
          </div>
        </div>

        {/* Footer Actions: Admin Bypass / Immediate Turn Off */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          
          <div className="text-[11px] text-slate-500 font-mono">
            {settings.businessName || 'SmartKhata Pro'} • Protected Operating System
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!showBypassPrompt ? (
              <button
                type="button"
                onClick={() => setShowBypassPrompt(true)}
                className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Bypass</span>
              </button>
            ) : (
              <form onSubmit={handleAdminBypassSubmit} className="flex items-center gap-1.5">
                <input
                  type="password"
                  placeholder="Admin pass (e.g. admin)"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setErrorMsg('');
                  }}
                  className="px-2.5 py-1 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white w-36 focus:border-amber-400"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2.5 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Enter
                </button>
                <button
                  type="button"
                  onClick={() => setShowBypassPrompt(false)}
                  className="px-2 py-1 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={handleEmergencyTurnOff}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-rose-600/30"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Turn OFF Now</span>
            </button>
          </div>
        </div>

        {errorMsg && (
          <p className="text-rose-400 text-xs font-mono font-bold animate-bounce text-right">
            {errorMsg}
          </p>
        )}

      </div>
    </div>
  );
}
