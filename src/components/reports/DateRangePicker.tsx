'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  value: string;
  onChange: (range: string) => void;
}

const PRESETS = [
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const handlePreset = (preset: string) => {
    const now = new Date();
    let from: Date;
    switch (preset) {
      case '7d': from = new Date(now.getTime() - 7 * 86400000); break;
      case '30d': from = new Date(now.getTime() - 30 * 86400000); break;
      case '90d': from = new Date(now.getTime() - 90 * 86400000); break;
      case 'year': from = new Date(now.getFullYear(), 0, 1); break;
      case 'all': from = new Date(2020, 0, 1); break;
      default: from = new Date(now.getTime() - 30 * 86400000);
    }
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    onChange(`${fmt(from)}..${fmt(now)}`);
    setIsOpen(false);
  };

  const handleCustom = () => {
    if (customFrom && customTo) {
      onChange(`${customFrom}..${customTo}`);
      setIsOpen(false);
    }
  };

  const activeLabel = PRESETS.find((p) => {
    const now = new Date();
    let from: Date;
    switch (p.value) {
      case '7d': from = new Date(now.getTime() - 7 * 86400000); break;
      case '30d': from = new Date(now.getTime() - 30 * 86400000); break;
      case '90d': from = new Date(now.getTime() - 90 * 86400000); break;
      case 'year': from = new Date(now.getFullYear(), 0, 1); break;
      case 'all': from = new Date(2020, 0, 1); break;
      default: return false;
    }
    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return value === `${fmt(from)}..${fmt(now)}`;
  })?.label || 'Custom Range';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-slate-300 transition-all"
      >
        <Calendar className="w-4 h-4 text-slate-400" />
        {activeLabel}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-20 p-3 min-w-[260px]">
            <div className="space-y-1 mb-3">
              {PRESETS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePreset(p.value)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeLabel === p.label ? 'bg-[#1a4731] text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Custom Range</p>
              <div className="flex gap-2">
                <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-[#1a4731] outline-none" />
                <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs focus:border-[#1a4731] outline-none" />
              </div>
              <button onClick={handleCustom}
                className="w-full py-2 bg-[#1a4731] text-white text-xs font-bold rounded-xl hover:bg-[#14402a] transition-all">
                Apply
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
