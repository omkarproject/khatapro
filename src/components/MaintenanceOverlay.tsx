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
  HardHat,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  X,
  Loader2,
  RefreshCw
} from 'lucide-react';

export default function MaintenanceOverlay() {
  const { settings, updateSettings, addToast, currentUser, applyAuthenticatedUser } = useApp();
  const maintenance = settings?.maintenanceMode;

  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [isAdminBypassed, setIsAdminBypassed] = useState<boolean>(false);
  const [showBypassModal, setShowBypassModal] = useState<boolean>(false);

  // Admin Bypass Form State
  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Pre-fill email if already logged in or default
  useEffect(() => {
    if (currentUser?.email) {
      setAdminEmail(currentUser.email);
    } else if (!adminEmail) {
      setAdminEmail('anantyadav8924@gmail.com');
    }
  }, [currentUser]);

  // Check sessionStorage on mount for existing admin bypass
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const bypassed = sessionStorage.getItem('skp_admin_maintenance_bypass');
      if (bypassed === 'true') {
        setIsAdminBypassed(true);
      }
    }
  }, []);

  // Countdown timer for Resend OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Countdown timer logic for auto-restore
  useEffect(() => {
    if (!maintenance?.enabled) {
      setTimeLeftMs(0);
      return;
    }

    const calculateRemaining = () => {
      if (!maintenance.endTime) {
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

      // Auto turn OFF maintenance mode when timer reaches 0
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
        <div className="fixed top-20 right-4 z-[9999] bg-rose-600 text-white px-3.5 py-1.5 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2 border border-rose-400/50 backdrop-blur-md">
          <Flame className="w-3.5 h-3.5 animate-pulse text-amber-300" />
          <span>Maintenance Active (Admin Bypass ON)</span>
          <button
            type="button"
            onClick={() => {
              sessionStorage.removeItem('skp_admin_maintenance_bypass');
              setIsAdminBypassed(false);
            }}
            className="underline ml-1 cursor-pointer hover:text-amber-200 transition-colors"
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

  // Handle Send OTP (Step 1)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!adminEmail.trim()) {
      setErrorMsg('Kripya apna Admin Email enter karein.');
      return;
    }
    if (!adminPassword) {
      setErrorMsg('Kripya apna Admin Password enter karein.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/maintenance/bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_otp',
          email: adminEmail.trim(),
          password: adminPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Verification code bhejne me samasya aayi.');
      }

      setStep('otp');
      setCountdown(60);
      addToast('OTP Dispatched! ✉️', data.message || `OTP sent to ${adminEmail}`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Admin validation fail ho gaya.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Verify OTP (Step 2)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!otpCode.trim()) {
      setErrorMsg('Kripya email par aaya hua OTP code enter karein.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/maintenance/bypass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          email: adminEmail.trim(),
          code: otpCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'OTP verify nahi ho paya.');
      }

      // Bypass granted for admin session!
      sessionStorage.setItem('skp_admin_maintenance_bypass', 'true');
      if (data.user && applyAuthenticatedUser) {
        await applyAuthenticatedUser(data.user);
      }

      setIsAdminBypassed(true);
      setShowBypassModal(false);
      addToast('Admin Access Granted! 🛡️', 'Dashboard unlocked. Aap Settings me jaake maintenance band ya chaloo rakh sakte hain.', 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid verification OTP.');
    } finally {
      setLoading(false);
    }
  };

  // Quick bypass for already logged in Admin/Super Admin
  const handleQuickBypassIfAdmin = () => {
    const isLoggedAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.email === 'anantyadav8924@gmail.com';
    if (isLoggedAdmin) {
      sessionStorage.setItem('skp_admin_maintenance_bypass', 'true');
      setIsAdminBypassed(true);
      setShowBypassModal(false);
      addToast('Welcome Admin! 🛡️', 'Existing admin session detected. Dashboard unlocked.', 'info');
    }
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

        {/* Footer Actions: Secure Admin Bypass Only (Public Turn OFF Now removed!) */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="text-[11px] text-slate-500 font-mono">
            {settings.businessName || settings.websiteName || ''}{settings.businessName || settings.websiteName ? ' • ' : ''}Protected Operating System
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={() => {
                setErrorMsg('');
                setShowBypassModal(true);
              }}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500/30 hover:to-orange-500/30 text-amber-300 hover:text-white border border-amber-500/40 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-amber-500/10"
            >
              <Unlock className="w-4 h-4 text-amber-400" />
              <span>Admin Bypass Login</span>
            </button>
          </div>
        </div>

      </div>

      {/* SECURE ADMIN BYPASS MODAL (Credentials + Custom SMTP OTP Verification) */}
      {showBypassModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 shadow-2xl text-left space-y-5">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Administrator Bypass</h3>
                  <p className="text-xs text-slate-400">2-Factor Authentication via Custom SMTP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowBypassModal(false);
                  setStep('credentials');
                  setErrorMsg('');
                }}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Bypass Button if already logged in as Admin */}
            {(currentUser?.role === 'admin' || currentUser?.role === 'super_admin' || currentUser?.email === 'anantyadav8924@gmail.com') && (
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <div className="font-bold text-emerald-400">Active Admin Session Found</div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{currentUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickBypassIfAdmin}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Direct Unlock
                </button>
              </div>
            )}

            {/* STEP 1: Admin Credentials */}
            {step === 'credentials' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="text-xs text-slate-300 leading-relaxed">
                  Apna registered <b>Admin Email</b> aur <b>Password</b> dalein. Direct SMTP ke through aapke email par ek secure OTP bheja jayega.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Admin Email Address *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="anantyadav8924@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Admin Password *</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-amber-400 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBypassModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Security OTP</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Custom SMTP OTP Verification */}
            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-xs text-slate-300 leading-relaxed">
                  Ek 6-digit OTP code <b>{adminEmail}</b> par send kiya gaya hai. Kripya niche code enter karein.
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    <span>Enter Verification OTP *</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={8}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    placeholder="123456"
                    className="w-full px-3.5 py-3 rounded-xl bg-slate-950 border border-amber-500/50 text-center text-xl font-mono tracking-widest text-amber-300 focus:outline-none focus:border-amber-400"
                    autoFocus
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <button
                    type="button"
                    onClick={() => setStep('credentials')}
                    className="hover:text-white underline cursor-pointer"
                  >
                    Change Credentials
                  </button>

                  <button
                    type="button"
                    disabled={countdown > 0 || loading}
                    onClick={handleSendOtp}
                    className="text-amber-400 hover:text-amber-300 disabled:opacity-40 disabled:hover:text-amber-400 font-mono cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    <span>{countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}</span>
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowBypassModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-lg shadow-emerald-500/20"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying OTP...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Unlock Dashboard</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
