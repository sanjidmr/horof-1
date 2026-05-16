'use client';

export default function AccountError({ error }: { error: Error }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-900">
      {error.message}
    </div>
  );
}
