// src/app/components/MovieCardSkeleton.tsx
'use client';

interface MovieCardSkeletonProps {
  className?: string;
  variant?: 'default' | 'horizontal';
  showRatingBadge?: boolean;
}

export default function MovieCardSkeleton({
  className = '',
  variant = 'default',
  showRatingBadge = false,
}: MovieCardSkeletonProps) {
  // Base shimmer class for all skeleton elements
  const shimmerClass = 'skeleton-shimmer';

  if (variant === 'horizontal') {
    return (
      <div className={`w-48 flex-shrink-0 ${className}`}>
        {/* Type badge placeholder - matches movie type badge styling */}
        <div className="h-6 rounded-t-lg bg-gray-800 skeleton-base skeleton-shimmer" />

        {/* Poster placeholder - matches aspect-[2/3] */}
        <div className="w-full aspect-[2/3] rounded-b-lg bg-gray-800/80 skeleton-base skeleton-shimmer" />

        {/* Content area */}
        <div className="mt-1 space-y-1">
          {/* Title + Year row */}
          <div className="flex items-center justify-between gap-2">
            <div className="h-4 flex-1 rounded bg-gray-800 skeleton-base skeleton-shimmer" />
            <div className="h-3 w-8 rounded bg-gray-800/50 skeleton-base skeleton-shimmer" />
          </div>

          {/* Details + Rating row */}
          <div className="flex items-center justify-between">
            <div className="h-4 w-14 rounded bg-gray-800/50 skeleton-base skeleton-shimmer" />
            <div className="h-5 w-12 rounded bg-gray-800/50 skeleton-base skeleton-shimmer" />
          </div>

          {/* User rating badge placeholder (optional) */}
          {showRatingBadge && (
            <div className="h-7 mt-0 rounded-b-lg bg-gray-800/80 skeleton-base skeleton-shimmer" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Type badge placeholder */}
      <div className="h-6 rounded-t-lg bg-gray-800 skeleton-base skeleton-shimmer" />

      {/* Poster placeholder */}
      <div className="w-full aspect-[2/3] rounded-b-lg bg-gray-800/80 skeleton-base skeleton-shimmer" />

      {/* Content area */}
      <div className="mt-1 space-y-1">
        {/* Title + Year row */}
        <div className="flex items-center justify-between gap-2">
          <div className="h-4 flex-1 rounded bg-gray-800 skeleton-base skeleton-shimmer" />
          <div className="h-3 w-8 rounded bg-gray-800/50 skeleton-base skeleton-shimmer" />
        </div>

        {/* Details + Rating row */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-14 rounded bg-gray-800/50 skeleton-base skeleton-shimmer" />
          <div className="h-5 w-12 rounded bg-gray-800/50 skeleton-base skeleton-shimmer" />
        </div>

        {/* User rating badge placeholder (optional) */}
        {showRatingBadge && (
          <div className="h-7 mt-0 rounded-b-lg bg-gray-800/80 skeleton-base skeleton-shimmer" />
        )}
      </div>
    </div>
  );
}
