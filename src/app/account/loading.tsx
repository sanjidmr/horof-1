import { Skeleton } from '@/components/shadcn/skeleton';

export default function AccountLoading() {
  return (
    <div className="space-y-4 py-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
