'use client';

import { useMemo, useState } from 'react';
import { resolveReportRange, type ReportPreset } from '@/lib/reports/date-ranges';

export interface UseReportRangeResult {
  preset: string;
  setPreset: (p: string) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
  search: string;
  setSearch: (v: string) => void;
  range: { from: string; to: string; label: string };
  key: string;
}

export function useReportRange(defaultPreset: ReportPreset = 'last7'): UseReportRangeResult {
  const [preset, setPresetState] = useState<string>(defaultPreset);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [search, setSearch] = useState('');

  const setPreset = (p: string) => {
    setPresetState(p);
    if (p !== 'custom') {
      setCustomFrom('');
      setCustomTo('');
    }
  };

  const range = useMemo(
    () => resolveReportRange(preset as ReportPreset, customFrom || undefined, customTo || undefined),
    [preset, customFrom, customTo]
  );
  const key = `${range.from}__${range.to}`;

  return { preset, setPreset, customFrom, setCustomFrom, customTo, setCustomTo, search, setSearch, range, key };
}
