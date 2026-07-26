'use client';

interface CustomScriptsProps {
  position: 'header' | 'footer';
  script: string;
}

export function CustomScripts({ position, script }: CustomScriptsProps) {
  if (!script) return null;

  return (
    <div
      dangerouslySetInnerHTML={{
        __html: script,
      }}
      data-position={position}
      style={{ display: 'contents' }}
    />
  );
}
