// src/app/search/SearchSkeleton.tsx
'use client';

import MovieCardSkeleton from '../components/MovieCardSkeleton';

export default function SearchSkeleton() {
  return (
    <div className="mt-4">
      {/* Filter placeholder */}
      <div className="h-12 bg-gray-800/50 rounded-lg mb-6 skeleton-shimmer" />

      {/* Results grid skeleton */}
      <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3 md:gap-4">
        {[...Array(12)].map((_, i) => (
          <MovieCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
