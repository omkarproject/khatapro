'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';
import {
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
  ArrowLeft
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, isMounted, login, register, syncWithDatabase, logout } = useApp();

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
  const [role, setRole] = useState<UserRole>('business_owner');

  React.useEffect(() => {
    if (isMounted && currentUser) {
      router.replace('/');
    }
  }, [isMounted, currentUser, router]);

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
        router.replace('/');
      } else {
        if (!name.trim() || !email.trim() || !password) {
          throw new Error('Please fill in your Name, Email, and Password.');
        }
        await register({
          name: name.trim(),
          email: email.trim(),
          password,
          businessName: businessName.trim() || `${name.trim()}'s Business`,
          phone: phone.trim(),
          role,
        });
        router.replace('/');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070B14] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900 dark:text-slate-100 relative overflow-hidden">
      
      {/* Background ambient cyberpunk orbs */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Bar Branding */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between">
        {currentUser ? (
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Dashboard</span>
          </Link>
        ) : (
          <div className="flex items-center gap-2 text-xs font-black tracking-wider uppercase bg-gradient-to-r from-cyan-500 to-indigo-600 bg-clip-text text-transparent">
            SmartKhata Pro
          </div>
        )}
        <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          MongoDB Cloud Connected
        </span>
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#0C1222] rounded-[32px] shadow-2xl border border-slate-200/90 dark:border-indigo-500/30 overflow-hidden relative">
        
        {/* Cyber Glow Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 animate-[pulse_2.5s_ease-in-out_infinite]" />

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/25">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/80 px-2 py-0.5 rounded-md border border-cyan-200 dark:border-cyan-800/60 flex items-center gap-1">
                  <Database className="w-3 h-3" /> MongoDB Atlas Multi-Tenant
                </span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {currentUser ? 'Active Cloud Session' : mode === 'signin' ? 'Sign In to SmartKhata' : 'Create Merchant Account'}
              </h1>
            </div>
          </div>

          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 font-black text-lg flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.name}
                    </h4>
                    <p className="text-xs text-slate-500 truncate font-mono">{currentUser.email}</p>
                    <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mt-0.5">
                      {currentUser.businessName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Link
                  href="/"
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  <span>Go to My Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  type="button"
                  onClick={() => logout()}
                  className="w-full py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Log Out &amp; Switch User</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Switcher */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setErrorMsg(''); }}
                  className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setErrorMsg(''); }}
                  className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. Anant Yadav"
                          className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Business / Enterprise Name
                      </label>
                      <div className="relative">
                        <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="text"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                          placeholder="e.g. Sharma Traders & Enterprise"
                          className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="e.g. 8924024859"
                          className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. anantyadav8924@gmail.com"
                      className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                    Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {mode === 'signup' && (
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Business Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="business_owner">Business Owner (Full Access)</option>
                      <option value="accountant">Accountant (Ledgers & Invoices)</option>
                      <option value="manager">Manager (Inventory & Staff)</option>
                      <option value="staff">Staff (Basic Billing)</option>
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Connecting to MongoDB Atlas...</span>
                    </>
                  ) : (
                    <>
                      <span>{mode === 'signin' ? 'Sign In & Access Cloud Ledger' : 'Create My Cloud Ledger'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>


            </>
          )}

        </div>

      </div>
    </div>
  );
}
