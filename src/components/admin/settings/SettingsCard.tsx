import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/shadcn/card';

export function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent className="pt-6 space-y-5">{children}</CardContent>
    </Card>
  );
}
