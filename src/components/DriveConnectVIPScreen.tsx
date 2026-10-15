'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  ShieldCheck,
  Lock,
  Cloud,
  CheckCircle2,
  ExternalLink,
  LogOut,
  Sparkles,
  Database,
  KeyRound,
  FileText,
  RotateCcw,
  Loader2,
  Info,
} from 'lucide-react';

interface DriveConnectVIPScreenProps {
  onConnected?: () => void;
}

export default function DriveConnectVIPScreen({ onConnected }: DriveConnectVIPScreenProps) {
  const { currentUser, settings } = useApp();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  const websiteName = settings.websiteName || 'SmartKhata Pro';
  const merchantName = currentUser?.name || currentUser?.businessName || 'Merchant';

  const handleConnect = () => {
    setIsRedirecting(true);
    const userId = currentUser?.id || 'guest_user';
    const returnPath = typeof window !== 'undefined' ? window.location.pathname : '/';
    window.location.href = `/api/backup/google-drive/auth?userId=${encodeURIComponent(userId)}&returnUrl=${encodeURIComponent(returnPath)}`;
  };

  const handleVerifyAgain = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch(`/api/backup/google-drive/status?userId=${currentUser?.id || ''}`);
      const json = await res.json();
      if (json.isConnected) {
        try {
          if (currentUser?.id) {
            localStorage.setItem('skp_gdrive_connected_' + currentUser.id, 'true');
          }
        } catch {}
        if (onConnected) {
          onConnected();
        } else {
          window.location.reload();
        }
      } else {
        alert('Google Drive connection status: Not Connected yet. Kripya niche diye gaye "Authorize & Connect Google Drive" button par click karke Google Drive connect karein.');
      }
    } catch (e) {
      console.warn('Status check failed:', e);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleLogout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('skp_auth_user');
      localStorage.removeItem('skp_auth_token');
      document.cookie = 'skp_auth_session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; Max-Age=0;';
      window.location.replace('/login');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070B14] flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden text-slate-100">
      {/* Ambient background glows */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b08_1px,transparent_1px),linear-gradient(to_bottom,#1e293b08_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* Main Glass Modal Card */}
      <div className="w-full max-w-2xl bg-gradient-to-b from-slate-900/90 via-[#0B1120]/95 to-slate-900/90 border border-indigo-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl shadow-indigo-950/50 backdrop-blur-2xl relative z-10 animate-fadeIn">
        {/* Top Floating Pill */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-bold tracking-wide uppercase">
            <Lock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Zero-Knowledge Private Cloud Vault</span>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 text-xs font-semibold border border-slate-700 hover:border-rose-500/30 transition-all cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Logout</span>
          </button>
        </div>

        {/* Header Icon + Title */}
        <div className="text-center space-y-3 mb-8">
          <div className="relative inline-flex items-center justify-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-emerald-500 to-cyan-400 p-0.5 shadow-xl shadow-indigo-600/30">
              <div className="w-full h-full bg-[#0A0F1D] rounded-[22px] flex items-center justify-center">
                {/* Google Drive Logo */}
                <svg className="w-10 h-10" viewBox="0 0 87.3 78" fill="none">
                  <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8H0c0 1.55.4 3.1 1.2 4.5l5.4 9.35z" fill="#0066DA" />
                  <path d="M43.65 25L29.9 1.2c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44C.4 49.9 0 51.45 0 53h27.5l16.15-28z" fill="#00AC47" />
                  <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5H59.8l5.9 10.2 7.85 13.6z" fill="#EA4335" />
                  <path d="M43.65 25L57.4 1.2C56.05.4 54.5 0 52.95 0H34.35c-1.55 0-3.1.4-4.45 1.2L43.65 25z" fill="#00832D" />
                  <path d="M59.8 53H27.5L13.75 76.8c1.35.8 2.9 1.2 4.45 1.2h50.9c1.55 0 3.1-.4 4.45-1.2L59.8 53z" fill="#2684FC" />
                  <path d="M73.4 26.5l-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3L43.65 25 59.8 53h27.5c0-1.55-.4-3.1-1.2-4.5L73.4 26.5z" fill="#FFBA00" />
                </svg>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-2 border-[#0A0F1D] flex items-center justify-center text-white shadow-md">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Connect Your Private Google Drive
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
            Welcome, <strong className="text-white font-semibold">{merchantName}</strong>! {websiteName} is designed with a <strong>Zero-Shared Cloud Architecture</strong>: your customer records, bills, receipts, and images are stored <strong className="text-emerald-400">strictly in your own private Google Drive</strong> — never on any central server or shared admin account.
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
            <span>🔒 अनिवार्य: डेटा सुरक्षा नीति के अनुसार Google Drive कनेक्ट करना अनिवार्य है। इसके बाद ही डैशबोर्ड चालू होगा।</span>
          </div>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 hover:border-indigo-500/40 transition-all space-y-1.5">
            <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">100% Data Sovereignty</h4>
            <p className="text-[11px] text-slate-400 leading-snug">
              Only you possess access. No admin, staff, or platform can view your confidential accounts.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 hover:border-emerald-500/40 transition-all space-y-1.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">Auto Daily Sync</h4>
            <p className="text-[11px] text-slate-400 leading-snug">
              Every day at 07:30 AM, an encrypted snapshot syncs seamlessly into your private Drive.
            </p>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-800/50 border border-slate-700/60 hover:border-cyan-500/40 transition-all space-y-1.5">
            <div className="w-7 h-7 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-white">1-Click Recovery</h4>
            <p className="text-[11px] text-slate-400 leading-snug">
              Switch devices anytime. Restore all your khata, invoices, and files directly from your Drive.
            </p>
          </div>
        </div>

        {/* Privacy Assurance Bar */}
        <div className="p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-800/40 flex items-start gap-3 mb-8 text-xs text-indigo-200/90 leading-relaxed">
          <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
          <span>
            Connecting your Google account takes <strong>10 seconds</strong> and only authorizes {websiteName} to create a private <code className="text-emerald-400 font-mono">SmartKhata Pro/</code> folder in your Drive. We never access your personal emails, photos, or documents.
          </span>
        </div>

        {/* Action Button Hub */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleConnect}
            disabled={isRedirecting}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-indigo-600 to-cyan-500 hover:from-emerald-600 hover:via-indigo-700 hover:to-cyan-600 active:scale-[0.99] text-white font-black text-sm sm:text-base flex items-center justify-center gap-3 shadow-xl shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-60"
          >
            {isRedirecting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Redirecting to Google Secure Authorization...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 10.03 0 12s.45 3.83 1.25 5.42l4.03-3.15z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z" />
                </svg>
                <span>Authorize &amp; Connect Google Drive</span>
                <Sparkles className="w-4 h-4 text-amber-300" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={handleVerifyAgain}
              disabled={isVerifying}
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>Already authorized in another tab? Check status</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
