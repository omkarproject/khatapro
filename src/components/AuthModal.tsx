'use client';

import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  X,
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  Eye,
  EyeOff,
  Sparkles,
  ShieldCheck,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Zap,
  LogIn,
  UserPlus
} from 'lucide-react';

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    currentUser,
    login,
    register,
    logout,
    addToast,
    cloudSyncStatus,
    syncWithDatabase
  } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      if (mode === 'signin') {
        if (!email.trim() || !password) {
          throw new Error('Please enter both email and password.');
        }
        await login(email.trim(), password);
        closeAuthModal();
      } else {
        if (!name.trim() || !email.trim() || !password) {
          throw new Error('Please fill in your Name, Email, and Password.');
        }
        if (password.length < 4) {
          throw new Error('Password should be at least 4 characters.');
        }
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          businessName: businessName.trim() || `${name.trim()}'s Business`,
          phone: phone.trim(),
          role: 'super_admin',
        });
        closeAuthModal();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-[#0B101D] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-indigo-500/30 overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[94vh]">
        
        {/* Cyber Glow Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 animate-[pulse_2.5s_ease-in-out_infinite]" />

        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 transition-all cursor-pointer active:scale-95 z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800/60 flex items-center gap-1">
                  <Database className="w-3 h-3" /> MongoDB Atlas Cloud
                </span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                {currentUser ? 'User Profile & Account' : mode === 'signin' ? 'Sign In to SmartKhata' : 'Create Merchant Account'}
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {currentUser
              ? 'Manage your active cloud session and isolated multi-tenant records.'
              : mode === 'signin'
              ? 'Access your private ledger, customers, and cloud-synced records.'
              : 'Every user gets an isolated database ledger in MongoDB Atlas.'}
          </p>

          {/* Mode Tabs (Sign In vs Sign Up) */}
          {!currentUser && (
            <div className="grid grid-cols-2 gap-1 p-1 mt-4 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setMode('signin'); setErrorMsg(''); }}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMsg(''); }}
                className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">

          {/* If already logged in, show Current Account summary & Switch User options */}
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-black text-lg flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                        {currentUser.name}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 uppercase">
                        Active User
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate font-mono">{currentUser.email}</p>
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {currentUser.businessName}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px] font-mono">
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/50">
                    <span className="text-slate-400 block text-[10px]">Cloud Database</span>
                    <span className="font-bold text-emerald-500 flex items-center gap-1 mt-0.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> MongoDB Atlas
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-slate-800/50">
                    <span className="text-slate-400 block text-[10px]">Account Status</span>
                    <span className="font-bold text-indigo-400 capitalize mt-0.5 block truncate">
                      Verified
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsLoading(true);
                    await syncWithDatabase();
                    setIsLoading(false);
                  }}
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
                  <span>Sync All Records to MongoDB Atlas Now</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setMode('signin');
                  }}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Log Out &amp; Switch Account</span>
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              
              {/* Error Banner */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Extra Sign Up Fields */}
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Full Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Anant Yadav"
                        className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Business / Shop Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Sharma Traders & Enterprise"
                        className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Phone Number (for SMS & WhatsApp)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 8924024859"
                        className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Official Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. anantyadav8924@gmail.com"
                    className="w-full pl-10 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Connecting to MongoDB Atlas...</span>
                  </>
                ) : (
                  <>
                    <span>{mode === 'signin' ? 'Sign In & Load Cloud Khata' : 'Create My Cloud Ledger'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>



            </form>
          )}

        </div>

      </div>
    </div>
  );
}
