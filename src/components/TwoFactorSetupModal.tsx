'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  ShieldCheck,
  Copy,
  Check,
  X,
  AlertCircle,
  KeyRound,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { generateBase32Secret, buildOtpAuthUri, verifyTotpToken, formatTotpCode } from '@/lib/totp';
import SixDigitTotpInput from '@/components/SixDigitTotpInput';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  existingSecret?: string;
  onSuccess: (secret: string) => void;
}

export function TwoFactorSetupModal({
  isOpen,
  onClose,
  userEmail,
  existingSecret,
  onSuccess,
}: TwoFactorSetupModalProps) {
  const [secret, setSecret] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const activeSecret = existingSecret || generateBase32Secret(16);
      setSecret(activeSecret);
      setVerifyCode('');
      setErrorMsg('');
      setCopied(false);
    }
  }, [isOpen, existingSecret]);

  if (!isOpen) return null;

  const otpAuthUri = buildOtpAuthUri(secret, userEmail || 'Merchant', 'SmartKhata');
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(otpAuthUri)}`;

  const handleCopySecret = () => {
    if (!secret) return;
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVerify = (codeToVerify?: string) => {
    const clean = (codeToVerify !== undefined ? codeToVerify : verifyCode).replace(/\s+/g, '').trim();
    if (clean.length !== 6) {
      setErrorMsg('Please enter all 6 digits from your Authenticator app.');
      return;
    }

    setIsVerifying(true);
    setErrorMsg('');

    // Allow ±1 step (±30s) clock skew
    const isValid = verifyTotpToken(secret, clean, 1);
    if (!isValid) {
      setIsVerifying(false);
      setErrorMsg('Invalid 6-digit code. Please verify the time on your phone and try again.');
      return;
    }

    setIsVerifying(false);
    onSuccess(secret);
    onClose();
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 6);
    setVerifyCode(raw);
    setErrorMsg('');
    if (raw.length === 6) {
      handleVerify(raw);
    }
  };

  const generateNewSecret = () => {
    const newSec = generateBase32Secret(16);
    setSecret(newSec);
    setVerifyCode('');
    setErrorMsg('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Setup Authenticator 2FA
              </h3>
              <p className="text-xs text-slate-400">
                Google Authenticator, Microsoft Authenticator, or Authy
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: QR CODE */}
          <div className="text-center space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20">
              Step 1: Scan QR Code
            </span>
            <p className="text-xs text-slate-300">
              Open your Authenticator app on your mobile phone and scan this QR code:
            </p>

            <div className="flex items-center justify-center pt-2">
              <div className="p-3 bg-white rounded-2xl shadow-xl border-4 border-cyan-500/30 flex items-center justify-center">
                <img
                  src={qrImageUrl}
                  alt="Authenticator QR Code"
                  width={180}
                  height={180}
                  className="rounded-lg select-none"
                />
              </div>
            </div>
          </div>

          {/* STEP 2: MANUAL KEY */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-semibold">Or enter Secret Key manually:</span>
              <button
                type="button"
                onClick={generateNewSecret}
                className="text-[10px] font-medium text-slate-500 hover:text-cyan-400 flex items-center gap-1"
                title="Generate new secret key"
              >
                <RefreshCw className="w-3 h-3" />
                Regenerate
              </button>
            </div>
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs">
              <span className="font-extrabold text-cyan-300 tracking-wider select-all break-all">
                {secret}
              </span>
              <button
                type="button"
                onClick={handleCopySecret}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* STEP 3: VERIFY 6-DIGIT CODE */}
          <div className="space-y-2 pt-1">
            <div className="text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                Step 2: Enter 6-Digit Code
              </span>
              <p className="text-xs text-slate-300 mt-1">
                Enter the current 6-digit code shown in your Authenticator app:
              </p>
            </div>

            <SixDigitTotpInput
              value={verifyCode}
              onChange={(val) => {
                setVerifyCode(val);
                setErrorMsg('');
              }}
              onComplete={(fullCode) => {
                handleVerify(fullCode);
              }}
              disabled={isVerifying}
            />

            {errorMsg && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 text-center font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => handleVerify()}
            disabled={verifyCode.length !== 6 || isVerifying}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            {isVerifying ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Verify &amp; Activate 2FA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
