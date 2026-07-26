'use client';

import { useEffect } from 'react';

interface ClarityScriptProps {
  projectId: string;
}

export function ClarityScript({ projectId }: ClarityScriptProps) {
  useEffect(() => {
    if (!projectId || typeof window === 'undefined') return;

    (function(c: any, l: any, a: any, r: any, i: any) {
      c[a] = c[a] || function() { (c[a].q = c[a].q || []).push(arguments); };
      const t = l.createElement(r) as any;
      t.async = 1;
      t.src = 'https://www.clarity.ms/tag/' + i;
      const y = l.getElementsByTagName(r)[0];
      y?.parentNode?.insertBefore(t, y);
    })(window, document, 'clarity', 'script', projectId);
  }, [projectId]);

  return null;
}
