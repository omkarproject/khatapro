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

export default function LoginPage() {
  const router = useRouter();
  const { currentUser, login, applyAuthenticatedUser, logout, settings } = useApp();

  // Instant frame-0 branding state from localStorage/cookies to prevent any loading flash
  const [brandState, setBrandState] = useState(() => {
    let name = '';
    let badge = '';
    let badgeBg = 'fintech-gradient-primary';
    let tagline = '';
    let logo = '';
    let favicon = '';

    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('skp_global_branding');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.websiteName) name = parsed.websiteName;
          if (parsed.websiteBadgeText !== undefined) badge = parsed.websiteBadgeText;
          if (parsed.websiteBadgeBg) badgeBg = parsed.websiteBadgeBg;
          if (parsed.websiteTagline !== undefined) tagline = parsed.websiteTagline;
          if (parsed.websiteLogo) logo = parsed.websiteLogo;
          if (parsed.websiteFavicon) favicon = parsed.websiteFavicon;
        }
        if (!name) {
          const storedName = localStorage.getItem('skp_brand_name');
          if (storedName) name = storedName;
        }
        const storedBadge = localStorage.getItem('skp_brand_badge');
        if (storedBadge !== null && storedBadge !== undefined) {
          badge = storedBadge;
        }
        const storedBadgeBg = localStorage.getItem('skp_brand_badge_bg');
        if (storedBadgeBg) {
          badgeBg = storedBadgeBg;
        }
        const storedTagline = localStorage.getItem('skp_brand_tagline');
        if (storedTagline !== null && storedTagline !== undefined) {
          tagline = storedTagline;
        }
        const storedLogo = localStorage.getItem('skp_brand_logo');
        if (storedLogo && !logo) logo = storedLogo;
        const storedFav = localStorage.getItem('skp_brand_favicon');
        if (storedFav && !favicon) favicon = storedFav;

        // Cookie fallback
        if (!name || name === 'SmartKhata' || !badge || !logo || !tagline) {
          const cookies = document.cookie.split(';');
          for (let i = 0; i < cookies.length; i++) {
            const c = cookies[i].trim();
            if (c.indexOf('skp_brand_name=') === 0 && (!name || name === 'SmartKhata')) {
              name = decodeURIComponent(c.substring('skp_brand_name='.length));
            }
            if (c.indexOf('skp_brand_badge=') === 0 && !badge) {
              badge = decodeURIComponent(c.substring('skp_brand_badge='.length));
            }
            if (c.indexOf('skp_brand_badge_bg=') === 0 && !storedBadgeBg) {
              badgeBg = decodeURIComponent(c.substring('skp_brand_badge_bg='.length));
            }
            if (c.indexOf('skp_brand_tagline=') === 0 && !tagline) {
              tagline = decodeURIComponent(c.substring('skp_brand_tagline='.length));
            }
            if (c.indexOf('skp_brand_logo=') === 0 && !logo) {
              logo = decodeURIComponent(c.substring('skp_brand_logo='.length));
            }
            if (c.indexOf('skp_brand_favicon=') === 0 && !favicon) {
              favicon = decodeURIComponent(c.substring('skp_brand_favicon='.length));
            }
          }
        }
      } catch {}
    }
    return { name, badge, badgeBg, tagline, logo, favicon };
  });

  useEffect(() => {
    if (settings.websiteName || settings.websiteBadgeText !== undefined || settings.websiteLogo || settings.websiteTagline !== undefined) {
      setBrandState({
        name: settings.websiteName || 'SmartKhata',
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
          name: e.detail.websiteName || 'SmartKhata',
          badge: e.detail.websiteBadgeText !== undefined ? e.detail.websiteBadgeText : '',
          badgeBg: e.detail.websiteBadgeBg || 'fintech-gradient-primary',
          tagline: e.detail.websiteTagline !== undefined ? e.detail.websiteTagline : '',
          logo: e.detail.websiteLogo || '',
          favicon: e.detail.websiteFavicon || '',
        });
      }
    };
    window.addEventListener('khatapro_branding_changed', onBrandChange);
    return () => window.removeEventListener('khatapro_branding_changed', onBrandChange);
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
    <div className="min-h-screen bg-slate-50 dark:bg-[#070B14] flex flex-col justify-center items-center p-4 sm:p-6 text-slate-900 dark:text-slate-100 relative overflow-hidden">
      
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
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center overflow-hidden p-1 group-hover:scale-105 transition-all duration-300">
              <img
                id="login-brand-logo-img"
                src={brandState.logo || ''}
                alt={brandState.name || 'Logo'}
                className="w-full h-full object-contain"
                style={{ display: brandState.logo ? 'block' : 'none' }}
                onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
              />
            </div>
          </div>

          {/* Website Name & Badge underneath Logo */}
          <div className="flex items-center gap-2">
            <span id="login-brand-name-display" className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white drop-shadow-sm">
              {brandState.name || ''}
            </span>
            <span
              id="login-brand-badge-display"
              className={`text-[7px] sm:text-[7.5px] px-1 py-[1px] rounded font-bold uppercase tracking-wider leading-none text-white shadow-xs ${brandState.badgeBg || 'fintech-gradient-primary'} ${
                brandState.badge?.trim() ? 'inline-block' : 'hidden'
              }`}
            >
              {brandState.badge?.trim() || ''}
            </span>
          </div>

          {/* Synchronous Frame-0 Parser Script (Zero Flash Guarantee) */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  try {
                    var raw = localStorage.getItem('skp_global_branding');
                    var p = raw ? JSON.parse(raw) : null;
                    var logo = (p && p.websiteLogo) ? p.websiteLogo : (localStorage.getItem('skp_brand_logo') || '');
                    var name = (p && p.websiteName) ? p.websiteName : (localStorage.getItem('skp_brand_name') || '');
                    var badge = (p && p.websiteBadgeText !== undefined) ? p.websiteBadgeText : (localStorage.getItem('skp_brand_badge') || '');
                    var tagline = (p && p.websiteTagline !== undefined) ? p.websiteTagline : (localStorage.getItem('skp_brand_tagline') || '');

                    if (!logo || !name || !badge || !badgeBg || !tagline) {
                      var cookies = document.cookie.split(';');
                      for (var i = 0; i < cookies.length; i++) {
                        var c = cookies[i].trim();
                        if (c.indexOf('skp_brand_logo=') === 0 && !logo) logo = decodeURIComponent(c.substring('skp_brand_logo='.length));
                        if (c.indexOf('skp_brand_name=') === 0 && !name) name = decodeURIComponent(c.substring('skp_brand_name='.length));
                        if (c.indexOf('skp_brand_badge=') === 0 && !badge) badge = decodeURIComponent(c.substring('skp_brand_badge='.length));
                        if (c.indexOf('skp_brand_badge_bg=') === 0 && !badgeBg) badgeBg = decodeURIComponent(c.substring('skp_brand_badge_bg='.length));
                        if (c.indexOf('skp_brand_tagline=') === 0 && !tagline) tagline = decodeURIComponent(c.substring('skp_brand_tagline='.length));
                      }
                    }

                    if (logo) {
                      var img = document.getElementById('login-brand-logo-img');
                      if (img) { img.src = logo; img.style.display = 'block'; }
                    }
                    if (name) {
                      var n = document.getElementById('login-brand-name-display');
                      if (n) n.textContent = name;
                    }
                    var b = document.getElementById('login-brand-badge-display');
                    if (b) {
                      if (badge && badge.trim()) {
                        b.textContent = badge.trim();
                        b.style.display = 'inline-block';
                        if (badgeBg) {
                          b.className = 'text-[7px] sm:text-[7.5px] px-1 py-[1px] rounded font-bold uppercase tracking-wider leading-none text-white shadow-xs inline-block ' + badgeBg;
                        }
                      } else {
                        b.style.display = 'none';
                      }
                    }
                    var tg = document.getElementById('login-brand-tagline-display');
                    if (tg) {
                      if (tagline && tagline.trim()) {
                        tg.textContent = tagline.trim();
                        tg.style.display = 'block';
                      } else {
                        tg.style.display = 'none';
                      }
                    }
                    if (name) {
                      var fullTitle = name + (badge ? ' ' + badge : '') + (tagline ? ' - ' + tagline : '');
                      document.title = fullTitle;
                      var cardTitle = document.getElementById('login-card-title');
                      if (cardTitle) {
                        var text = cardTitle.innerText;
                        if (text.indexOf('Sign In') !== -1) {
                          cardTitle.innerText = 'Sign In to ' + name;
                        } else if (text.indexOf('Create') !== -1) {
                          cardTitle.innerText = 'Create your ' + name + ' account';
                        }
                      }
                    }
                  } catch(e) {}
                })();
              `,
            }}
          />
          
          <p
            id="login-brand-tagline-display"
            className={`text-[11px] font-semibold text-slate-400 tracking-wider uppercase font-mono mt-0.5 ${
              brandState.tagline?.trim() ? 'block' : 'hidden'
            }`}
          >
            {brandState.tagline?.trim() || ''}
          </p>
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
                : 'Fill in your details and verify your email'}
            </p>
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
                  <span>Log Out &amp; Switch Account</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Switcher (Sign In vs Create Account) */}
              {step === 'input' && mode !== 'forgot_password' && (
                <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => resetFormState('signin')}
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
                    onClick={() => resetFormState('signup')}
                    className={`py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      mode === 'signup'
                        ? 'bg-white dark:bg-indigo-600 text-indigo-600 dark:text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              )}

              {/* Back to Sign In button (when in Forgot Password mode) */}
              {mode === 'forgot_password' && step === 'input' && (
                <button
                  type="button"
                  onClick={() => resetFormState('signin')}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              )}

              {/* Error Message */}
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Success Message */}
              {successMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* ==================================================== */}
              {/* 1. SIGN IN FORM (Direct Login + Anti-Bot Captcha)    */}
              {/* ==================================================== */}
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
                        placeholder="e.g. anantyadav8924@gmail.com"
                        className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
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
                        className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
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
                        placeholder="••••••••"
                        className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Anti-Bot Security CAPTCHA */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Security Check: Solve Math Captcha</span>
                      </label>
                      <button
                        type="button"
                        onClick={refreshCaptcha}
                        className="text-slate-400 hover:text-indigo-600 text-xs flex items-center gap-1 cursor-pointer"
                        title="Reload Captcha"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="px-3.5 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 font-mono font-black text-sm text-indigo-700 dark:text-indigo-300 tracking-wider shrink-0 select-none">
                        {captcha.question} = ?
                      </div>
                      <input
                        type="number"
                        required
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        placeholder="Answer"
                        className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
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

              {/* ==================================================== */}
              {/* 2. SIGN UP / FORGOT PASSWORD - STEP 1 (INPUT)        */}
              {/* ==================================================== */}
              {mode !== 'signin' && step === 'input' && (
                <form onSubmit={handleSendOtp} className="space-y-4">
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
                            placeholder="e.g. Apex Enterprises"
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

                  {/* Password Input for Signup */}
                  {mode === 'signup' && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                        Create Password * (6 to 10 Digits)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          maxLength={10}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="e.g. Admin@123"
                          className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Real-time Password Security Checklist */}
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                        <div className="font-bold text-slate-600 dark:text-slate-300 mb-1">Password Requirements:</div>
                        <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                          {isLengthValid ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 text-center leading-none">•</span>}
                          <span>Length between 6 and 10 digits/characters ({password.length}/10)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                          {hasUppercase ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 text-center leading-none">•</span>}
                          <span>At least 1 Capital letter (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                          {hasNumber ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 text-center leading-none">•</span>}
                          <span>At least 1 Number (0-9)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-400'}`}>
                          {hasSymbol ? <Check className="w-3.5 h-3.5" /> : <span className="w-3.5 h-3.5 text-center leading-none">•</span>}
                          <span>At least 1 Symbol / Special character (!@#$%^&amp;*)</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || (mode === 'signup' && !isPasswordPolicyMet)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending Code...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>
                          {mode === 'forgot_password' ? 'Send Password Reset Code' : 'Send Email Verification Code'}
                        </span>
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* ==================================================== */}
              {/* 3. SIGN UP / FORGOT PASSWORD - STEP 2 (OTP VERIFY)   */}
              {/* ==================================================== */}
              {mode !== 'signin' && step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Verification Code Sent!</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Check your email <strong className="font-mono">{email}</strong> for the verification code (OTP).
                    </p>
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
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                        placeholder="12345678"
                        autoFocus
                        className="w-full pl-10 pr-3 py-3 text-base font-mono tracking-widest text-center font-black rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  {/* New Password Input for Forgot Password */}
                  {mode === 'forgot_password' && (
                    <>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                          New Password * (6 to 10 Digits)
                        </label>
                        <div className="relative">
                          <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            maxLength={10}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="e.g. Admin@123"
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

                        {/* Real-time Checklist for New Password */}
                        <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                          <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                            {isLengthValid ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                            <span>6 to 10 digits/characters ({newPassword.length}/10)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                            {hasUppercase ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                            <span>At least 1 Capital letter (A-Z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                            {hasNumber ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                            <span>At least 1 Number (0-9)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                            {hasSymbol ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                            <span>At least 1 Special symbol (!@#$%^&amp;*)</span>
                          </div>
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
                    </>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || (mode === 'forgot_password' && !isPasswordPolicyMet)}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {mode === 'forgot_password' ? 'Reset & Update Password' : 'Verify & Create Account'}
                        </span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between text-xs pt-2">
                    <button
                      type="button"
                      onClick={() => setStep('input')}
                      className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer flex items-center gap-1 font-medium"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleSendOtp(e)}
                      disabled={resendTimer > 0 || isLoading}
                      className="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer disabled:opacity-50 font-bold flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                      <span>{resendTimer > 0 ? `Resend (${resendTimer}s)` : 'Resend Code'}</span>
                    </button>
                  </div>
                </form>
              )}

              {/* ==================================================== */}
              {/* 4. DIRECT PASSWORD RESET VIA EMAIL LINK               */}
              {/* ==================================================== */}
              {mode === 'forgot_password' && step === 'reset_direct' && (
                <form onSubmit={handleDirectResetPassword} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Email Verified via Link!</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Your identity has been confirmed. Please create a new password below to complete reset.
                    </p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">
                      New Password * (6 to 10 Digits)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        maxLength={10}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="e.g. Admin@123"
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

                    {/* Real-time Checklist for New Password */}
                    <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px]">
                      <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                        {isLengthValid ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                        <span>6 to 10 digits/characters ({newPassword.length}/10)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                        {hasUppercase ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                        <span>At least 1 Capital letter (A-Z)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                        {hasNumber ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                        <span>At least 1 Number (0-9)</span>
                      </div>
                      <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                        {hasSymbol ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                        <span>At least 1 Special symbol (!@#$%^&*)</span>
                      </div>
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

      {/* Bottom Footer Note */}
      <div className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <span>&copy; {new Date().getFullYear()} {brandState.name ? `${brandState.name}${brandState.badge?.trim() ? ` ${brandState.badge.trim()}` : ''}. ` : ''}All rights reserved.</span>
      </div>
    </div>
  );
}
