'use client';

import { useEffect } from 'react';
import { Button } from '@/components/shadcn/button';

export default function AdminDashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-900 dark:border-red-900 dark:bg-red-950 dark:text-red-100">
      <h2 className="text-lg font-semibold">Dashboard failed to load</h2>
      <p className="mt-2 text-sm opacity-90">{error.message}</p>
      <Button className="mt-4" variant="outline" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
