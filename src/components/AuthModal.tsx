'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import Loading from './Loading';
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
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogIn,
  UserPlus,
  KeyRound,
  RefreshCw,
  Send,
  ArrowLeft,
  ShieldCheck,
  Check,
  MessageSquare,
  UserX,
  Headphones,
  Smartphone,
  Shield
} from 'lucide-react';
import SixDigitTotpInput from './SixDigitTotpInput';

// Math CAPTCHA generator
function generateCaptcha() {
  const num1 = Math.floor(Math.random() * 9) + 1;
  const num2 = Math.floor(Math.random() * 9) + 1;
  return {
    num1,
    num2,
    answer: num1 + num2,
    question: `${num1} + ${num2}`,
  };
}

export default function AuthModal() {
  const {
    isAuthModalOpen,
    closeAuthModal,
    currentUser,
    login,
    applyAuthenticatedUser,
    logout,
    settings,
  } = useApp();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot_password'>('signin');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [twoFactorType, setTwoFactorType] = useState<'email' | 'authenticator'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showForgotDisabledModal, setShowForgotDisabledModal] = useState(false);
  const [showSignupDisabledModal, setShowSignupDisabledModal] = useState(false);
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
    num1: 6,
    num2: 4,
    answer: 10,
    question: '6 + 4',
  });
  const [captchaInput, setCaptchaInput] = useState('');

  // Resend timer
  const [resendTimer, setResendTimer] = useState<number>(0);

  // Live 10-minute Sign-In Lockout Timer (synced with Supabase across all devices/IPs)
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds > 0]);

  useEffect(() => {
    if (mode !== 'signin') return;
    const candidate = email.trim() || (typeof window !== 'undefined' ? localStorage.getItem('skp_last_login_email') || '' : '');
    if (!candidate) {
      setLockoutSeconds(0);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/login?email=${encodeURIComponent(candidate)}`);
        const data = await res.json();
        if (data?.isLocked && data?.remainingSeconds > 0) {
          setLockoutSeconds(Number(data.remainingSeconds));
        } else {
          setLockoutSeconds(0);
        }
      } catch {}
    }, email.trim() ? 350 : 0);

    return () => clearTimeout(timer);
  }, [mode, email]);

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Live Duplicate Email & Phone Check (Signup)
  const [emailExists, setEmailExists] = useState(false);
  const [phoneExists, setPhoneExists] = useState(false);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  useEffect(() => {
    if (mode !== 'signup') {
      setEmailExists(false);
      setPhoneExists(false);
      setIsCheckingAvailability(false);
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    const digits = phone.replace(/\D/g, '');
    const hasCheckableEmail = cleanEmail.includes('@') && cleanEmail.includes('.');
    const hasCheckablePhone = digits.length >= 10;

    if (!hasCheckableEmail && !hasCheckablePhone) {
      setEmailExists(false);
      setPhoneExists(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingAvailability(true);
      try {
        const res = await fetch('/api/auth/check-availability', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: hasCheckableEmail ? cleanEmail : '',
            phone: hasCheckablePhone ? digits.slice(-10) : '',
          }),
        });
        const data = await res.json();
        if (data?.success) {
          setEmailExists(hasCheckableEmail ? Boolean(data.emailExists) : false);
          setPhoneExists(hasCheckablePhone ? Boolean(data.phoneExists) : false);
        }
      } catch {}
      setIsCheckingAvailability(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [mode, email, phone]);

  useEffect(() => {
    setCaptcha(generateCaptcha());
  }, [isAuthModalOpen]);

  useEffect(() => {
    let interval: any = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);


  const adminPhoneRaw = settings.websiteSupportPhone || settings.businessPhone || '997421467008';
  const adminPhoneDigits = adminPhoneRaw.replace(/\D/g, '');
  const finalWaPhone = adminPhoneDigits.length === 10 ? `91${adminPhoneDigits}` : adminPhoneDigits;
  const adminWhatsAppUrl = `https://wa.me/${finalWaPhone || '91997421467008'}?text=${encodeURIComponent(
    `Hello Admin, I need help resetting my account password on ${settings.websiteName || 'KhataPro'}. My registered email is: ${email || ''}`
  )}`;
  const signupWhatsAppUrl = `https://wa.me/${finalWaPhone || '91997421467008'}?text=${encodeURIComponent(
    `Hello Admin, I would like to create a new merchant account on ${settings.websiteName || 'KhataPro'}. Please grant access or invite me.`
  )}`;

  if (!isAuthModalOpen) return null;

  const refreshCaptcha = () => {
    setCaptcha(generateCaptcha());
    setCaptchaInput('');
  };

  const resetFormState = (newMode: 'signin' | 'signup' | 'forgot_password') => {
    if (newMode === 'signup' && settings.allowNewRegistrations === false) {
      setShowSignupDisabledModal(true);
      return;
    }
    if (newMode === 'forgot_password') {
      const isForgotDisabled = settings.smtpSettings?.enabled === false || settings.smtpSettings?.triggers?.forgotPasswordOtp === false;
      if (isForgotDisabled) {
        setShowForgotDisabledModal(true);
        return;
      }
    }
    setMode(newMode);
    setStep('input');
    setTwoFactorType('email');
    setErrorMsg('');
    setSuccessMsg('');
    setOtpCode('');
    refreshCaptcha();
  };

  // Password Policy Checks
  const targetPassword = mode === 'forgot_password' ? newPassword : password;
  const isLengthValid = targetPassword.length >= 6 && targetPassword.length <= 10;
  const hasUppercase = /[A-Z]/.test(targetPassword);
  const hasNumber = /[0-9]/.test(targetPassword);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>_\-+=~/]/.test(targetPassword);
  const isPasswordPolicyMet = isLengthValid && hasUppercase && hasNumber && hasSymbol;

  // Sign In Handler: Checks Login 2FA Trigger or Direct Login
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (lockoutSeconds > 0) {
      setErrorMsg(`Account login is blocked for 10 minutes. Please wait ${formatCountdown(lockoutSeconds)}.`);
      return;
    }

    try {
      localStorage.setItem('skp_last_login_email', cleanEmail);
    } catch {}

    if (parseInt(captchaInput.trim(), 10) !== captcha.answer) {
      setErrorMsg('Incorrect captcha answer. Please solve the math verification.');
      refreshCaptcha();
      return;
    }

    setIsLoading(true);
    try {
      // Dispatch 2FA check to backend (checks Authenticator 6-digit TOTP, Email OTP, or Direct)
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          purpose: 'login',
          password: cleanPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.isLocked && data.remainingSeconds > 0) {
          setLockoutSeconds(Number(data.remainingSeconds));
        }
        throw new Error(data.message || 'Login verification failed.');
      }

      if (data.require2FA) {
        const type = data.twoFactorType === 'authenticator' ? 'authenticator' : 'email';
        setTwoFactorType(type);
        setStep('otp');
        setOtpCode('');
        if (type === 'authenticator') {
          setSuccessMsg('Enter the 6-digit code from your Authenticator app.');
        } else {
          setSuccessMsg(`2FA Login verification code sent to ${cleanEmail}.`);
          setResendTimer(60);
        }
        return;
      }

      // Direct sign in with password
      await login(cleanEmail, cleanPassword);
      closeAuthModal();
    } catch (err: any) {
      if (err.require2FA || err.message?.includes('Two-Factor Authentication is enabled')) {
        const type = err.twoFactorType === 'email' ? 'email' : 'authenticator';
        setTwoFactorType(type);
        setStep('otp');
        setOtpCode('');
        setSuccessMsg(type === 'authenticator'
          ? 'Enter the 6-digit code from your Authenticator app.'
          : `2FA Login verification code sent to ${cleanEmail}.`);
        return;
      }
      if (err?.isLocked && err?.remainingSeconds > 0) {
        setLockoutSeconds(Number(err.remainingSeconds));
      }
      setErrorMsg(err.message || 'Invalid email or password.');
      refreshCaptcha();
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up / Forgot Password: Step 1 (Send OTP)
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Please enter your email address.');
      return;
    }

    if (mode === 'signup') {
      if (settings.allowNewRegistrations === false) {
        setShowSignupDisabledModal(true);
        return;
      }
      if (!name.trim()) {
        setErrorMsg('Please enter your full name.');
        return;
      }
      if (emailExists) {
        setErrorMsg('Already registered email. Please Sign In or use a different email address.');
        return;
      }
      if (phoneExists) {
        setErrorMsg('Already registered mobile number. Please Sign In or use a different mobile number.');
        return;
      }
      if (!isPasswordPolicyMet) {
        setErrorMsg('Password must be 6-10 digits, with at least 1 capital letter, 1 number, and 1 symbol.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (mode === 'signup' && password) {
        try { sessionStorage.setItem('skp_pending_signup_pwd', password); } catch {}
      }
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          purpose: mode === 'signin' ? 'login' : mode,
          password: password,
          name: name.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.registrationDisabled) {
          setShowSignupDisabledModal(true);
          return;
        }
        if (data.disabled || res.status === 403) {
          setShowForgotDisabledModal(true);
          return;
        }
        throw new Error(data.message || 'Failed to dispatch verification code.');
      }

      if (data.skipped && mode === 'signup') {
        const regRes = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            password: password,
            name: name.trim(),
            businessName: businessName.trim(),
            phone: phone.trim(),
          }),
        });
        const regData = await regRes.json();
        if (!regRes.ok || !regData.success) {
          throw new Error(regData.message || 'Registration failed.');
        }
        if (regData.user) {
          applyAuthenticatedUser(regData.user);
          closeAuthModal();
          return;
        }
      }

      setSuccessMsg(`Verification code sent to ${email.trim()}.`);
      setStep('otp');
      setResendTimer(60);
    } catch (err: any) {
      setErrorMsg(err.message || 'Request failed. Please check your details.');
    } finally {
      setIsLoading(false);
    }
  };

  // Execute OTP or TOTP Verification (auto-submits on 6th digit)
  const executeVerifyOtp = async (codeToVerify?: string) => {
    const clean = (codeToVerify !== undefined ? codeToVerify : otpCode).replace(/\s+/g, '').trim();
    if (!clean || clean.length < 6) {
      setErrorMsg('Please enter the complete 6-digit code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      if (mode === 'signin') {
        const res = await fetch('/api/auth/otp/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            code: clean,
            purpose: 'login',
            password: password.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(
            data.message ||
              (twoFactorType === 'authenticator'
                ? 'Invalid Authenticator code. Please check your app.'
                : 'Invalid verification code.')
          );
        }

        if (data.user) {
          await applyAuthenticatedUser(data.user);
          closeAuthModal();
        } else {
          closeAuthModal();
        }
        return;
      }

      if (mode === 'forgot_password') {
        if (!isPasswordPolicyMet) {
          setErrorMsg('New password must be 6-10 digits, with at least 1 capital letter, 1 number, and 1 symbol.');
          return;
        }
        if (newPassword !== confirmPassword) {
          setErrorMsg('New password and confirmation do not match.');
          return;
        }
      }

      const storedSignupPwd = typeof window !== 'undefined' ? sessionStorage.getItem('skp_pending_signup_pwd') || '' : '';
      const finalPassword = password || storedSignupPwd;
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: clean,
          purpose: mode,
          name: name.trim(),
          businessName: businessName.trim(),
          phone: phone.trim(),
          password: finalPassword,
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Verification failed. Please try again.');
      }

      if (mode === 'forgot_password') {
        setSuccessMsg('Password reset successfully! You can now sign in with your new password.');
        setMode('signin');
        setStep('input');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtpCode('');
        refreshCaptcha();
      } else {
        if (data.user) {
          await applyAuthenticatedUser(data.user);
          closeAuthModal();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Verification failed. Please check the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeVerifyOtp();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAuthModal();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-[#0B101D] rounded-3xl shadow-2xl border border-slate-200/90 dark:border-indigo-500/30 overflow-hidden text-slate-900 dark:text-slate-100 flex flex-col max-h-[94vh]">
        
        {/* Top Accent Line */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 animate-[pulse_2.5s_ease-in-out_infinite]" />

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
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 shrink-0">
              {mode === 'forgot_password' ? <KeyRound className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                {currentUser
                  ? 'User Account'
                  : mode === 'forgot_password'
                  ? 'Reset Password'
                  : mode === 'signin'
                  ? (settings?.websiteName ? `Sign In to ${settings.websiteName}` : 'Sign In')
                  : 'Create Account'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {mode === 'forgot_password'
                  ? 'Verify email to create a new password'
                  : mode === 'signin'
                  ? 'Enter credentials to open your ledger'
                  : 'Sign up and verify your email'}
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          {!currentUser && step === 'input' && mode !== 'forgot_password' && (
            <div className="grid grid-cols-2 gap-1 p-1 mt-3 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs font-bold">
              <button
                type="button"
                onClick={() => resetFormState('signin')}
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
                onClick={() => resetFormState('signup')}
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

          {mode === 'forgot_password' && step === 'input' && (
            <button
              type="button"
              onClick={() => resetFormState('signin')}
              className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 cursor-pointer mt-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          )}
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-4 overflow-y-auto relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/95 dark:bg-[#0C1222]/95 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
              <Loading
                variant="verifying"
                title="Verifying"
                subtitle="Account"
                size="md"
                minHeight="min-h-0"
              />
            </div>
          )}
          {currentUser ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-2">
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

              <button
                type="button"
                onClick={() => {
                  logout();
                  closeAuthModal();
                }}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>Log Out</span>
              </button>
            </div>
          ) : (
            <>
              {errorMsg && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-800/60 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500 mt-0.5" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* 1. SIGN IN (Direct Login + Captcha) */}
              {mode === 'signin' && step === 'input' && (
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

                  {/* Math Captcha */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Security Check: Solve Captcha</span>
                      </label>
                      <button
                        type="button"
                        onClick={refreshCaptcha}
                        className="text-slate-400 hover:text-indigo-600 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 font-mono font-black text-sm text-indigo-700 dark:text-indigo-300 shrink-0">
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

                  {lockoutSeconds > 0 && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                        <div className="text-left">
                          <p className="text-xs font-black text-rose-700 dark:text-rose-300">
                            Login Blocked (3 Wrong Attempts)
                          </p>
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                            10 min ke liye login block hai. Try again after timer.
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl bg-rose-600 text-white font-mono text-xs font-black shrink-0 tabular-nums">
                        {formatCountdown(lockoutSeconds)}
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || lockoutSeconds > 0}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-black text-xs tracking-wider uppercase shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 cursor-pointer active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {lockoutSeconds > 0 ? (
                      <>
                        <Lock className="w-4 h-4" />
                        <span>Blocked ({formatCountdown(lockoutSeconds)})</span>
                      </>
                    ) : isLoading ? (
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

              {/* 1.5 SIGN IN 2FA SECURITY (Authenticator TOTP or Email OTP with Instant 6-digit Auto-Submit) */}
              {mode === 'signin' && step === 'otp' && (
                <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col items-center text-center space-y-2.5">
                    <div className="relative">
                      <div className="absolute -inset-2.5 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-pink-500 opacity-60 blur-xl animate-pulse" />
                      <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shadow-xl shadow-indigo-600/20">
                        {twoFactorType === 'authenticator' ? (
                          <Smartphone className="w-7 h-7 text-indigo-400" />
                        ) : (
                          <Mail className="w-7 h-7 text-indigo-400" />
                        )}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <Shield className="w-3 h-3 text-indigo-400" />
                        <span>{twoFactorType === 'authenticator' ? 'Authenticator 2FA Active' : 'Email 2FA Active'}</span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {twoFactorType === 'authenticator' ? 'Enter 6-Digit Authenticator Code' : 'Enter 6-Digit Email Code'}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                        {twoFactorType === 'authenticator'
                          ? 'Open Google Authenticator, Microsoft Authenticator, or Authy on your phone.'
                          : `Enter the 6-digit code sent to ${email}.`}
                      </p>
                    </div>
                  </div>

                  {/* 6 Digit Input Boxes with auto-submit */}
                  <div className="space-y-1.5">
                    <SixDigitTotpInput
                      value={otpCode}
                      onChange={(val) => {
                        setOtpCode(val);
                        setErrorMsg('');
                      }}
                      onComplete={(fullCode) => {
                        executeVerifyOtp(fullCode);
                      }}
                      disabled={isLoading}
                    />

                    <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1 pt-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Auto-submits on 6th digit &amp; unlocks dashboard</span>
                    </p>
                  </div>

                  {twoFactorType === 'email' && (
                    <div className="text-center">
                      <button
                        type="button"
                        disabled={resendTimer > 0 || isLoading}
                        onClick={(e) => handleSendOtp(e)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold disabled:opacity-50 cursor-pointer"
                      >
                        {resendTimer > 0 ? `Resend Code in ${resendTimer}s` : 'Resend Verification Code'}
                      </button>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setStep('input');
                        setOtpCode('');
                        setErrorMsg('');
                      }}
                      className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium cursor-pointer transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Sign In</span>
                    </button>

                    <button
                      type="button"
                      disabled={isLoading || otpCode.replace(/\D/g, '').length !== 6}
                      onClick={() => executeVerifyOtp(otpCode)}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* 2. SIGN UP / FORGOT PASSWORD - STEP 1 (INPUT) */}
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
                          Business Name
                        </label>
                        <div className="relative">
                          <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type="text"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                            placeholder="e.g. SmartKhata Store"
                            className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                          <span>Phone Number</span>
                          {isCheckingAvailability && phone.replace(/\D/g, '').length >= 10 && (
                            <span className="text-[10px] text-indigo-500 font-semibold normal-case animate-pulse">Checking...</span>
                          )}
                          {!isCheckingAvailability && phoneExists && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold normal-case">
                              Already registered mobile
                            </span>
                          )}
                        </label>
                        <div className="relative">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="e.g. 8924024859"
                            className={`w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border focus:outline-none focus:ring-2 text-slate-900 dark:text-white ${
                              phoneExists
                                ? 'border-rose-500 focus:ring-rose-500'
                                : 'border-slate-300 dark:border-slate-800 focus:ring-indigo-500'
                            }`}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1 flex items-center justify-between">
                      <span>Email Address *</span>
                      {mode === 'signup' && isCheckingAvailability && email.includes('@') && (
                        <span className="text-[10px] text-indigo-500 font-semibold normal-case animate-pulse">Checking...</span>
                      )}
                      {mode === 'signup' && !isCheckingAvailability && emailExists && (
                        <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold normal-case">
                          Already registered email
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. anantyadav8924@gmail.com"
                        className={`w-full pl-10 pr-3 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-900 border focus:outline-none focus:ring-2 text-slate-900 dark:text-white ${
                          mode === 'signup' && emailExists
                            ? 'border-rose-500 focus:ring-rose-500'
                            : 'border-slate-300 dark:border-slate-800 focus:ring-indigo-500'
                        }`}
                      />
                    </div>
                  </div>

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
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password Requirements Checklist */}
                      <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 text-[11px]">
                        <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                          {isLengthValid ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                          <span>Length: 6 to 10 characters ({password.length}/10)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                          {hasUppercase ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                          <span>1 Capital letter (A-Z)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                          {hasNumber ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                          <span>1 Number (0-9)</span>
                        </div>
                        <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                          {hasSymbol ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                          <span>1 Special symbol (!@#$%^&amp;*)</span>
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

              {/* 3. SIGN UP / FORGOT PASSWORD - STEP 2 (OTP VERIFY) */}
              {mode !== 'signin' && step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900/60 text-xs text-indigo-950 dark:text-indigo-200 space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>Verification Code Sent!</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Check your email <strong className="font-mono">{email}</strong> for the verification code (OTP) or click the direct Reset Link in your email.
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

                        {/* Checklist */}
                        <div className="mt-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-1 text-[11px]">
                          <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                            {isLengthValid ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                            <span>Length: 6 to 10 characters ({newPassword.length}/10)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                            {hasUppercase ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                            <span>1 Capital letter (A-Z)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                            {hasNumber ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                            <span>1 Number (0-9)</span>
                          </div>
                          <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                            {hasSymbol ? <Check className="w-3.5 h-3.5" /> : <span>•</span>}
                            <span>1 Special symbol (!@#$%^&amp;*)</span>
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
            </>
          )}
        </div>


        {/* Temporary Disabled New Registration Modal with WhatsApp Support */}
        {showSignupDisabledModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
            <div className="glass-card max-w-sm w-full p-6 text-center space-y-4 border border-amber-500/30 relative shadow-2xl">
              <button
                type="button"
                onClick={() => setShowSignupDisabledModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20 shadow-lg shadow-amber-500/10">
                <UserX className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  New Registration Temporarily Disabled
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  New merchant registrations have been temporarily paused by the administrator. Please contact our support team to request account activation.
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/contact-us"
                  onClick={() => {
                    setShowSignupDisabledModal(false);
                    closeAuthModal();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
                >
                  <Headphones className="w-4 h-4" />
                  <span>Contact Us &amp; Merchant Helpdesk</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowSignupDisabledModal(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Temporary Disabled Password Reset Modal with WhatsApp Support */}
        {showForgotDisabledModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
            <div className="glass-card max-w-sm w-full p-6 text-center space-y-4 border border-rose-500/30 relative shadow-2xl">
              <button
                type="button"
                onClick={() => setShowForgotDisabledModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20 shadow-lg shadow-rose-500/10">
                <Lock className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Password Reset Temporarily Disabled
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Automated password reset via email OTP has been temporarily disabled by the system administrator. Please contact our support team on WhatsApp to reset your password.
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <a
                  href={adminWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Contact Support on WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => setShowForgotDisabledModal(false)}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
