'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export function useReportData<T>(
  fetcher: (from: string, to: string) => Promise<T>,
  range: { from: string; to: string },
  rangeKey: string
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef<string | null>(null);
  const cacheRef = useRef<{ key: string; data: T } | null>(null);

  const load = useCallback(() => {
    const thisKey = rangeKey;
    if (cacheRef.current && cacheRef.current.key === thisKey) {
      setData(cacheRef.current.data);
      setLoading(false);
      setError(null);
      return;
    }
    if (inFlightRef.current === thisKey) return;
    inFlightRef.current = thisKey;
    setLoading(true);
    setError(null);
    fetcher(range.from, range.to)
      .then((res) => {
        cacheRef.current = { key: thisKey, data: res };
        setData(res);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message || 'Failed to load report data');
        setLoading(false);
      })
      .finally(() => {
        if (inFlightRef.current === thisKey) inFlightRef.current = null;
      });
  }, [fetcher, range.from, range.to, rangeKey]);

  useEffect(() => {
    load();
  }, [load]);

  const reload = useCallback(() => {
    cacheRef.current = null;
    inFlightRef.current = null;
    load();
  }, [load]);

  return { data, loading, error, reload };
}
