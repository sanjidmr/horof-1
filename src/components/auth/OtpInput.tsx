'use client';

import React, { useRef, useState, useEffect } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
}) => {
  const [digits, setDigits] = useState<string[]>(Array(length).fill(''));
  const inputsRef = useRef<HTMLInputElement[]>([]);

  useEffect(() => {
    const newDigits = Array(length).fill('');
    for (let i = 0; i < Math.min(value.length, length); i++) {
      newDigits[i] = value[i];
    }
    setDigits(newDigits);
  }, [value, length]);

  const handleChange = (index: number, val: string) => {
    const cleanVal = val.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      onChange(newDigits.join(''));
      return;
    }

    const lastChar = cleanVal[cleanVal.length - 1];
    const newDigits = [...digits];
    newDigits[index] = lastChar;
    setDigits(newDigits);
    const newVal = newDigits.join('');
    onChange(newVal);

    if (index < length - 1 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (digits[index] === '') {
        if (index > 0 && inputsRef.current[index - 1]) {
          inputsRef.current[index - 1].focus();
          const newDigits = [...digits];
          newDigits[index - 1] = '';
          setDigits(newDigits);
          onChange(newDigits.join(''));
        }
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        setDigits(newDigits);
        onChange(newDigits.join(''));
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/[^0-9]/g, '');
    if (pastedData.length > 0) {
      const newDigits = Array(length).fill('');
      for (let i = 0; i < Math.min(pastedData.length, length); i++) {
        newDigits[i] = pastedData[i];
      }
      setDigits(newDigits);
      const newVal = newDigits.join('');
      onChange(newVal);

      const focusIndex = Math.min(pastedData.length - 1, length - 1);
      if (inputsRef.current[focusIndex]) {
        inputsRef.current[focusIndex].focus();
      }
    }
  };

  return (
    <div className="flex justify-center gap-2 md:gap-3 max-w-[360px] mx-auto">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            if (el) inputsRef.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={digits[idx]}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-12 h-14 text-center text-xl font-bold rounded-xl border border-border-forest bg-bg-card text-text-primary outline-none transition-all focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20 disabled:opacity-50 text-slate-900 shadow-sm"
        />
      ))}
    </div>
  );
};
