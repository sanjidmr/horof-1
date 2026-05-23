'use client';

import { useState } from 'react';

interface StarRatingProps {
  value?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent',
};

const sizeMap = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
};

export function StarRating({
  value = 0,
  onChange,
  readonly = false,
  size = 'md',
  showLabel = false,
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;
  const sizeClass = sizeMap[size];

  return (
    <div className="flex items-center gap-1 select-none">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`
            relative transition-transform duration-150 rounded-sm
            ${!readonly ? 'cursor-pointer hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2D6A4F]' : 'cursor-default'}
          `}
        >
          <svg
            className={`${sizeClass} transition-colors duration-150`}
            viewBox="0 0 24 24"
            fill={star <= active ? '#F59E0B' : 'none'}
            stroke={star <= active ? '#F59E0B' : '#D1D5DB'}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      ))}
      {showLabel && active > 0 && (
        <span className="ml-2 text-sm font-semibold text-[#1B4332] transition-all duration-200">
          {LABELS[active]}
        </span>
      )}
    </div>
  );
}

// Compact display-only version with half-star visual support
export function StarDisplay({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  return <StarRating value={Math.round(rating)} readonly size={size} />;
}
