'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import {
  Mail,
  Lock,
  User,
  Building2,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  KeyRound,
  RefreshCw,
  Send,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';
import { GlobalWebsiteBranding } from '@/lib/globalBranding';

// Math CAPTCHA generator
function generateCaptcha() {
  const num1 = Math.floor(Math.random() * 9) + 1; // 1 to 9
  const num2 = Math.floor(Math.random() * 9) + 1; // 1 to 9
  return {
    num1,
    num2,
    answer: num1 + num2,
    question: `${num1} + ${num2}`,
  };
}

interface LoginPageClientProps {
  initialBranding?: GlobalWebsiteBranding | null;
}

export default function LoginPageClient({ initialBranding }: LoginPageClientProps) {
  const router = useRouter();
  const { currentUser, login, applyAuthenticatedUser, logout, settings, profile } = useApp();

  const userLogo =
    currentUser?.avatarUrl ||
    (currentUser as any)?.avatar_url ||
    (currentUser as any)?.businessLogo ||
    profile?.avatarUrl ||
    settings?.businessLogo ||
    (typeof window !== 'undefined' ? localStorage.getItem('khatapro_business_logo') || '' : '');

  // Instant frame-0 branding state from server-passed initialBranding, synced to localStorage
  const [brandState, setBrandState] = useState(() => {
    let name = initialBranding?.websiteName || '';
    let badge = initialBranding?.websiteBadgeText !== undefined ? initialBranding.websiteBadgeText : '';
    let badgeBg = initialBranding?.websiteBadgeBg || 'fintech-gradient-primary';
    let tagline = initialBranding?.websiteTagline !== undefined ? initialBranding.websiteTagline : '';
    let logo = initialBranding?.websiteLogo || '';
    let favicon = initialBranding?.websiteFavicon || '';

    if (typeof window !== 'undefined') {
      try {
        const init = (window as any).__INITIAL_BRANDING__;
        if (init && typeof init === 'object') {
          if (init.websiteName) name = init.websiteName;
          if (init.websiteBadgeText !== undefined && init.websiteBadgeText !== null) badge = init.websiteBadgeText;
          if (init.websiteBadgeBg) badgeBg = init.websiteBadgeBg;
          if (init.websiteTagline !== undefined && init.websiteTagline !== null) tagline = init.websiteTagline;
          if (init.websiteLogo) logo = init.websiteLogo;
          if (init.websiteFavicon) favicon = init.websiteFavicon;
        }

        const raw = localStorage.getItem('skp_global_branding');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.websiteName) name = parsed.websiteName;
          if (parsed.websiteBadgeText !== undefined && parsed.websiteBadgeText !== null) badge = parsed.websiteBadgeText;
          if (parsed.websiteBadgeBg) badgeBg = parsed.websiteBadgeBg;
          if (parsed.websiteTagline !== undefined && parsed.websiteTagline !== null) tagline = parsed.websiteTagline;
          if (parsed.websiteLogo) logo = parsed.websiteLogo;
          if (parsed.websiteFavicon) favicon = parsed.websiteFavicon;
        }
        const storedName = localStorage.getItem('skp_brand_name');
        if (storedName) name = storedName;
        const storedBadge = localStorage.getItem('skp_brand_badge');
        if (storedBadge !== null && storedBadge !== undefined) badge = storedBadge;
        const storedBadgeBg = localStorage.getItem('skp_brand_badge_bg');
        if (storedBadgeBg) badgeBg = storedBadgeBg;
        const storedTagline = localStorage.getItem('skp_brand_tagline');
        if (storedTagline !== null && storedTagline !== undefined) tagline = storedTagline;
        const storedLogo = localStorage.getItem('skp_brand_logo');
        if (storedLogo) logo = storedLogo;
        const storedFav = localStorage.getItem('skp_brand_favicon');
        if (storedFav) favicon = storedFav;

        // Cookie fallback
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
          const c = cookies[i].trim();
          if (c.indexOf('skp_brand_name=') === 0 && !storedName) {
            name = decodeURIComponent(c.substring('skp_brand_name='.length));
          }
          if (c.indexOf('skp_brand_badge=') === 0 && !storedBadge) {
            badge = decodeURIComponent(c.substring('skp_brand_badge='.length));
          }
          if (c.indexOf('skp_brand_badge_bg=') === 0 && !storedBadgeBg) {
            badgeBg = decodeURIComponent(c.substring('skp_brand_badge_bg='.length));
          }
          if (c.indexOf('skp_brand_tagline=') === 0 && !storedTagline) {
            tagline = decodeURIComponent(c.substring('skp_brand_tagline='.length));
          }
          if (c.indexOf('skp_brand_logo=') === 0 && !storedLogo) {
            logo = decodeURIComponent(c.substring('skp_brand_logo='.length));
          }
          if (c.indexOf('skp_brand_favicon=') === 0 && !storedFav) {
            favicon = decodeURIComponent(c.substring('skp_brand_favicon='.length));
          }
        }
      } catch {}
    }
    return {
      name,
      badge,
      badgeBg,
      tagline,
      logo,
      favicon,
    };
  });

  useEffect(() => {
    if (settings.websiteName || settings.websiteBadgeText !== undefined || settings.websiteLogo || settings.websiteTagline !== undefined) {
      setBrandState({
        name: settings.websiteName || '',
        badge: settings.websiteBadgeText !== undefined ? settings.websiteBadgeText : '',
        badgeBg: settings.websiteBadgeBg || 'fintech-gradient-primary',
        tagline: settings.websiteTagline !== undefined ? settings.websiteTagline : '',
        logo: settings.websiteLogo || '',
        favicon: settings.websiteFavicon || '',
      });
    }

    const onBrandChange = (e: any) => {
      if (e.detail) {
        setBrandState({
          name: e.detail.websiteName || '',
          badge: e.detail.websiteBadgeText !== undefined ? e.detail.websiteBadgeText : '',
          badgeBg: e.detail.websiteBadgeBg || 'fintech-gradient-primary',
          tagline: e.detail.websiteTagline !== undefined ? e.detail.websiteTagline : '',
          logo: e.detail.websiteLogo || '',
          favicon: e.detail.websiteFavicon || '',
        });
      }
    };
    window.addEventListener('khatapro_branding_changed', onBrandChange);
    window.addEventListener('skp_branding_updated', onBrandChange);

    // If branding not yet available, query cloud system config immediately
    fetch('/api/system/config')
      .then((res) => res.json())
      .then((json) => {
        if (json?.websiteBranding) {
          const b = json.websiteBranding;
          setBrandState({
            name: b.websiteName || '',
            badge: b.websiteBadgeText !== undefined ? b.websiteBadgeText : '',
            badgeBg: b.websiteBadgeBg || 'fintech-gradient-primary',
            tagline: b.websiteTagline !== undefined ? b.websiteTagline : '',
            logo: b.websiteLogo || '',
            favicon: b.websiteFavicon || '',
          });
        }
      })
      .catch(() => {});

    return () => {
      window.removeEventListener('khatapro_branding_changed', onBrandChange);
      window.removeEventListener('skp_branding_updated', onBrandChange);
    };
  }, [settings.websiteName, settings.websiteBadgeText, settings.websiteBadgeBg, settings.websiteTagline, settings.websiteLogo, settings.websiteFavicon]);

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  const [step, setStep] = useState<'input' | 'otp' | 'reset_direct'>('input');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Captcha State (for Sign In)
  const [captcha, setCaptcha] = useState<{ num1: number; num2: number; answer: number; question: string }>({
    num1: 5,
    num2: 3,
    answer: 8,
    question: '5 + 3',
  });
  const [captchaInput, setCaptchaInput] = useState('');

  // Resend Timer
  const [resendTimer, setResendTimer] = useState<number>(0);

  useEffect(() => {
    setCaptcha(generateCaptcha());

    // Check for password recovery hash / params in URL
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      const search = window.location.search;

      if (hash.includes('error=')) {
        const params = new URLSearchParams(hash.replace(/^#/, ''));
        const desc = params.get('error_description') || 'The reset link is invalid or has expired. Please request a new verification code.';
        setErrorMsg(decodeURIComponent(desc.replace(/\+/g, ' ')));
        setMode('forgot_password');
        setStep('input');
      } else if (hash.includes('type=recovery') || search.includes('type=recovery')) {
        setMode('forgot_password');
        setStep('reset_direct');
        setSuccessMsg('Email verified via recovery link! Enter your new password below.');
      }
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setMode('forgot_password');
          setStep('reset_direct');
          setSuccessMsg('Email verified! Please enter your new password below.');
        }
      });
      return () => {
        authListener?.subscription?.unsubscribe();
      };
    }
  }, []);

  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput('');
  };

  const resetFormState = (newMode: 'signin' | 'signup' | 'forgot_password') => {
    setMode(newMode);
    setStep('input');
    setErrorMsg('');
    setSuccessMsg('');
    setOtpCode('');
    refreshCaptcha();
  };

  // Password Policy Checks (6-10 chars, 1 uppercase, 1 number, 1 special symbol)
  const targetPassword = mode === 'forgot_password' ? newPassword : password;
  const isLengthValid = targetPassword.length >= 6 && targetPassword.length <= 10;
  const hasUppercase = /[A-Z]/.test(targetPassword);
  const hasNumber = /[0-9]/.test(targetPassword);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-+=~/]/.test(targetPassword);
  const isPasswordPolicyMet = isLengthValid && hasUppercase && hasNumber && hasSymbol;

  // Sign In Handler with Captcha (Direct password login, no OTP required)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    // Verify Captcha
    if (parseInt(captchaInput.trim(), 10) !== captcha.answer) {
      setErrorMsg('Incorrect captcha answer. Please solve the math verification.');
      refreshCaptcha();
      return;
    }

    setIsLoading(true);
    try {
      await login(email.trim(), password);
      router.replace('/');
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password.');
      refreshCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up / Forgot Password: Step 1 (Send OTP to Email)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (!isPasswordPolicyMet) {
        setErrorMsg('Password must satisfy all security rules: 6-10 chars, 1 uppercase letter, 1 number, and 1 special symbol.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          purpose: mode,
          password: password,
          name: name.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to send verification code.');
      }

      setSuccessMsg(`A verification code (OTP) has been sent to ${email.trim()}.`);
      setStep('otp');
      setResendTimer(60);
    } catch (err: any) {
      setErrorMsg(err.message || 'Request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up / Forgot Password: Step 2 (Verify OTP & Complete Action)
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!otpCode.trim() || otpCode.trim().length < 6 || otpCode.trim().length > 8) {
      setErrorMsg('Please enter the complete 6 to 8-digit verification code.');
      return;
    }

    if (mode === 'forgot_password') {
      if (!isPasswordPolicyMet) {
        setErrorMsg('New password must satisfy all rules: 6-10 chars, 1 uppercase letter, 1 number, and 1 special symbol.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setErrorMsg('New password and confirmation do not match.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: otpCode.trim(),
          purpose: mode,
          name: name.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
          password: password,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Invalid or expired verification code.');
      }

      if (mode === 'forgot_password') {
        setSuccessMsg('Password has been reset successfully! You can now sign in with your new password.');
        setMode('signin');
        setStep('input');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpCode('');
        refreshCaptcha();
      } else {
        // Sign Up Verified!
        if (data.user) {
          await applyAuthenticatedUser(data.user);
          router.replace('/');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Direct Password Reset (Via verified link from email)
  const handleDirectResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isPasswordPolicyMet) {
      setErrorMsg('Password must satisfy all rules: 6-10 chars, 1 uppercase letter, 1 number, and 1 special symbol.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New password and confirmation do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword.trim() });
        if (error) throw error;
      } else {
        const res = await fetch('/api/auth/update-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), newPassword: newPassword.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'Failed to update password');
      }

      setSuccessMsg('Password updated successfully! Redirecting...');
      setTimeout(() => {
        resetFormState('signin');
        router.replace('/');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update password. Please request a new link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100vh-160px)] flex flex-col justify-center items-center py-10 sm:py-16 px-4 sm:px-6 text-slate-900 dark:text-slate-100 relative overflow-hidden">
      
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Center Animated Glow Branding */}
      <div className="w-full max-w-md mb-6 flex flex-col items-center justify-center text-center">
        <Link href="/" className="group flex flex-col items-center">
          {/* Logo with Ambient Glowing Ring */}
          <div className="relative flex items-center justify-center mb-3">
            {/* Glowing animated halo */}
            <div className="absolute -inset-2.5 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-pink-500 opacity-75 blur-xl group-hover:opacity-100 animate-pulse transition-opacity duration-700" />
            
            {/* Logo container (NO border, smooth floating with glowing backdrop) */}
            {brandState.logo ? (
              <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center overflow-hidden p-1 group-hover:scale-105 transition-all duration-300">
                <img
                  id="login-brand-logo-img"
                  src={brandState.logo}
                  alt={brandState.name || 'Logo'}
                  className="w-full h-full object-contain"
                  style={{ display: 'block' }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
          </div>

          {/* Website Name & Badge underneath Logo */}
          <div className="flex items-center gap-2">
            {brandState.name ? (
              <span id="login-brand-name-display" className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
                {brandState.name}
              </span>
            ) : null}
            {brandState.badge?.trim() ? (
              <span
                id="login-brand-badge-display"
                className={`text-[7px] sm:text-[7.5px] px-1 py-[1px] rounded font-bold uppercase tracking-wider leading-none text-white shadow-xs ${brandState.badgeBg || 'fintech-gradient-primary'} inline-block`}
              >
                {brandState.badge.trim()}
              </span>
            ) : null}
          </div>
          
          {brandState.tagline?.trim() ? (
            <p
              id="login-brand-tagline-display"
              className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase font-mono mt-0.5 block"
            >
              {brandState.tagline.trim()}
            </p>
          ) : null}
        </Link>

        {currentUser && (
          <div className="mt-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
            >
              <span>Go to My Dashboard</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>

      <div className="w-full max-w-md bg-white dark:bg-[#0C1222] rounded-[32px] shadow-2xl border border-slate-200/90 dark:border-indigo-500/30 overflow-hidden relative">
        
        {/* Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 animate-[pulse_2.5s_ease-in-out_infinite]" />

        <div className="p-6 sm:p-8 space-y-6">
          
          {/* Card Title */}
          <div>
            <h1 id="login-card-title" className="text-2xl font-black text-slate-900 dark:text-white">
              {currentUser
                ? 'Active Account Session'
                : mode === 'forgot_password'
                ? 'Reset Password'
                : mode === 'signin'
                ? (brandState.name ? `Sign In to ${brandState.name}` : 'Sign In')
                : (brandState.name ? `Create your ${brandState.name} account` : 'Create Account')}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {mode === 'forgot_password'
                ? 'Verify your email to create a new password'
                : mode === 'signin'
                ? 'Enter your credentials to access your business ledger'
                : 'Enter your business details to register your account'}
            </p>
          </div>

          {/* Mode Switcher Tabs (Sign In / Register) */}
          {!currentUser && mode !== 'forgot_password' && (
            <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => resetFormState('signin')}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => resetFormState('signup')}
                className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
                }`}
              >
                Register
              </button>
            </div>
          )}

          {/* Alerts */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3 text-rose-600 dark:text-rose-400 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMsg}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-3 text-emerald-600 dark:text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMsg}</div>
            </div>
          )}

          {/* If already logged in */}
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-3">
                  {userLogo ? (
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-sm flex items-center justify-center shrink-0">
                      <img
                        src={userLogo}
                        alt="Profile / Business Logo"
                        className="w-full h-full object-contain p-0.5"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md shadow-indigo-600/30">
                      {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      {currentUser.name}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono">
                      {currentUser.email}
                    </p>
                  </div>
                </div>
                {currentUser.businessName && (
                  <div className="text-xs text-slate-600 dark:text-slate-400 font-medium pt-1 border-t border-slate-200 dark:border-slate-800">
                    Business: <span className="font-bold text-slate-900 dark:text-white">{currentUser.businessName}</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await logout();
                    resetFormState('signin');
                  }}
                  className="w-full py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs cursor-pointer transition-all"
                >
                  Log Out
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* MODE 1: SIGN IN (Direct password login + math captcha) */}
              {mode === 'signin' && (
                <form onSubmit={handleSignIn} className="space-y-4">
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
                        placeholder="you@business.com"
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400">
                        Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => resetFormState('forgot_password')}
                        className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Math CAPTCHA Verification */}
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                        Human Verification
                      </span>
                      <button
                        type="button"
                        onClick={refreshCaptcha}
                        className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Refresh</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-900/60 rounded-xl font-mono text-sm font-black text-indigo-600 dark:text-indigo-400 select-none tracking-widest">
                        {captcha.question} = ?
                      </div>
                      <input
                        type="number"
                        required
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        placeholder="Answer"
                        className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Signing In...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* MODE 2: REGISTER (Step 1 Input Details -> Step 2 Verify OTP) */}
              {mode === 'signup' && step === 'input' && (
                <form onSubmit={handleSendOtp} className="space-y-3.5">
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
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Business / Shop Name
                    </label>
                    <div className="relative">
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        placeholder="e.g. Kumar Traders"
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

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
                        placeholder="you@business.com"
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
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
                        placeholder="e.g. 9876543210"
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Create Password * (6 to 10 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        maxLength={10}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="6 to 10 chars, 1 Upper, 1 Digit, 1 Symbol"
                        className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Policy Live Feedback */}
                    <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-1.5 text-[10px]">
                      <div className={`flex items-center gap-1 font-medium ${isLengthValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {isLengthValid ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3" />}
                        <span>6 - 10 Characters</span>
                      </div>
                      <div className={`flex items-center gap-1 font-medium ${hasUppercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {hasUppercase ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3" />}
                        <span>1 Uppercase Letter</span>
                      </div>
                      <div className={`flex items-center gap-1 font-medium ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {hasNumber ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3" />}
                        <span>1 Number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1 font-medium ${hasSymbol ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                        {hasSymbol ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3" />}
                        <span>1 Special Symbol</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !isPasswordPolicyMet}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Verification Code...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Continue &amp; Verify Email</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* MODE 3: FORGOT PASSWORD (Step 1 Input Email) */}
              {mode === 'forgot_password' && step === 'input' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Account Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@business.com"
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending OTP...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Password Reset OTP</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => resetFormState('signin')}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-medium"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}

              {/* STEP 2: VERIFY OTP (For both Signup and Forgot Password) */}
              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs text-indigo-700 dark:text-indigo-300">
                    Enter the 6 to 8-digit verification code sent to <strong>{email}</strong>.
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Enter Verification Code (OTP) *
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="text"
                        required
                        maxLength={8}
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\s+/g, ''))}
                        placeholder="e.g. 123456"
                        className="w-full pl-10 pr-4 py-2.5 text-center tracking-[0.3em] font-mono font-bold text-sm rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* If in Forgot Password Mode, also collect new password */}
                  {mode === 'forgot_password' && (
                    <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                          New Password * (6 to 10 characters)
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            maxLength={10}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                            className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                          Confirm New Password *
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            required
                            maxLength={10}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                            className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Policy Badges */}
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-1.5 text-[10px]">
                        <div className={`flex items-center gap-1 font-medium ${isLengthValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {isLengthValid ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3" />}
                          <span>6 - 10 Characters</span>
                        </div>
                        <div className={`flex items-center gap-1 font-medium ${hasUppercase ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {hasUppercase ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3" />}
                          <span>1 Uppercase Letter</span>
                        </div>
                        <div className={`flex items-center gap-1 font-medium ${hasNumber ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {hasNumber ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3" />}
                          <span>1 Number (0-9)</span>
                        </div>
                        <div className={`flex items-center gap-1 font-medium ${hasSymbol ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                          {hasSymbol ? <Check className="w-3 h-3 text-emerald-500" /> : <X className="w-3 h-3" />}
                          <span>1 Special Symbol</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      type="button"
                      disabled={resendTimer > 0 || isLoading}
                      onClick={handleSendOtp}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium disabled:opacity-50 cursor-pointer"
                    >
                      {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-medium"
                    >
                      Change Details
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || (mode === 'forgot_password' && !isPasswordPolicyMet)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Code...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{mode === 'forgot_password' ? 'Verify & Reset Password' : 'Verify & Create Account'}</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* STEP: DIRECT PASSWORD RESET (When arriving via link) */}
              {step === 'reset_direct' && (
                <form onSubmit={handleDirectResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      New Password * (6 to 10 characters)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        maxLength={10}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password"
                        className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        maxLength={10}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat new password"
                        className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !isPasswordPolicyMet}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating Password...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Save &amp; Update Password</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => resetFormState('signin')}
                      className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer font-medium"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

        </div>

      </div>
    </div>
  );
}
