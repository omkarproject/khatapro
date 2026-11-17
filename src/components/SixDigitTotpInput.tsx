'use client';

import React, { useRef, useEffect } from 'react';

interface SixDigitTotpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (completeCode: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export default function SixDigitTotpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
}: SixDigitTotpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const cleanDigits = (value || '').replace(/\D/g, '').slice(0, 6);

  useEffect(() => {
    if (autoFocus && !disabled) {
      const targetIndex = cleanDigits.length < 6 ? cleanDigits.length : 0;
      inputRefs.current[targetIndex]?.focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');
    
    // Multiple characters pasted into single box
    if (rawVal.length > 1) {
      const pasted = rawVal.slice(0, 6);
      onChange(pasted);
      if (pasted.length === 6) {
        inputRefs.current[5]?.focus();
        onComplete?.(pasted);
      } else {
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
      }
      return;
    }

    // Single digit input
    const single = rawVal.slice(-1);
    const chars = cleanDigits.padEnd(6, ' ').split('');
    chars[index] = single || ' ';
    const newCombined = chars.join('').replace(/\s+$/, '');
    const cleanFinal = newCombined.replace(/\s/g, '');
    onChange(cleanFinal);

    if (single && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (cleanFinal.length === 6 && !newCombined.includes(' ')) {
      onComplete?.(cleanFinal);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!cleanDigits[index] && index > 0) {
        e.preventDefault();
        const chars = cleanDigits.split('');
        chars[index - 1] = '';
        const newCode = chars.join('');
        onChange(newCode);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedText) {
      onChange(pastedText);
      if (pastedText.length === 6) {
        inputRefs.current[5]?.focus();
        onComplete?.(pastedText);
      } else {
        inputRefs.current[Math.min(pastedText.length, 5)]?.focus();
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3 py-1" onPaste={handlePaste}>
      {[0, 1, 2, 3, 4, 5].map((idx) => {
        const digit = cleanDigits[idx] || '';
        const isFilled = Boolean(digit);
        return (
          <input
            key={idx}
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            disabled={disabled}
            value={digit}
            onChange={(e) => handleChange(idx, e)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center font-mono text-2xl font-black rounded-2xl border-2 transition-all duration-200 outline-none ${
              isFilled
                ? 'border-indigo-500 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-md shadow-indigo-500/10'
                : 'border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/70 text-slate-900 dark:text-white'
            } focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:scale-105 disabled:opacity-50`}
          />
        );
      })}
    </div>
  );
}
