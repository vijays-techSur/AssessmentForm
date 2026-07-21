'use client';
import { useEffect, useRef } from 'react';

interface Props {
  isVisible: boolean;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}

export function OtherTextReveal({ isVisible, value, onChange, maxLength = 500 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus(); // US-2.2: auto-focus on reveal
    }
    if (!isVisible && value) {
      onChange(''); // US-2.2: clear value on hide
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className="mt-2 pl-6" aria-expanded={isVisible}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        placeholder="Please specify your 'Other' answer."
        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Other text input"
      />
      <p className="text-xs text-gray-400 mt-1 text-right">{value.length}/{maxLength}</p>
    </div>
  );
}
