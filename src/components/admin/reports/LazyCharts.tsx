'use client';

import dynamic from 'next/dynamic';
import { ChartSkeleton } from './Skeletons';

export { ChartLegend } from './ChartLegend';

export const TrendChart = dynamic(() => import('./charts').then((m) => ({ default: m.TrendChart })), {
  ssr: false,
  loading: () => <ChartSkeleton height={280} />,
});

export const AreaTrendChart = dynamic(
  () => import('./charts').then((m) => ({ default: m.AreaTrendChart })),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> },
);

export const BarTrendChart = dynamic(
  () => import('./charts').then((m) => ({ default: m.BarTrendChart })),
  { ssr: false, loading: () => <ChartSkeleton height={280} /> },
);

export const ComposedTrendChart = dynamic(
  () => import('./charts').then((m) => ({ default: m.ComposedTrendChart })),
  { ssr: false, loading: () => <ChartSkeleton height={300} /> },
);

export const DonutChart = dynamic(() => import('./charts').then((m) => ({ default: m.DonutChart })), {
  ssr: false,
  loading: () => <ChartSkeleton height={260} />,
});
