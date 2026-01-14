// src/app/components/RatingBadge.tsx
'use client';

import { memo } from 'react';
import Image from 'next/image';

const RATING_TEXTS: Record<number, string> = {
  1: 'Хуже некуда',
  2: 'Ужасно',
  3: 'Очень плохо',
  4: 'Плохо',
  5: 'Более-менее',
  6: 'Нормально',
  7: 'Хорошо',
  8: 'Отлично',
  9: 'Великолепно',
  10: 'Эпик вин!',
};

interface RatingBadgeProps {
  combinedRating: number;
  userRating?: number | null;
  showRatingBadge?: boolean;
  status?: 'want' | 'watched' | 'dropped' | 'rewatched' | null;
  onReratingClick?: () => void;
}

const RatingBadge = memo(({
  combinedRating,
  userRating,
  showRatingBadge = false,
  status,
  onReratingClick
}: RatingBadgeProps) => {
  // Плашка с оценкой пользователя (только для просмотренных/брошенных)
  if (showRatingBadge && (status === 'watched' || status === 'dropped' || status === 'rewatched')) {
    return (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onReratingClick?.();
        }}
        className={`mt-0 px-2 py-1.5 rounded-b-lg text-xs font-semibold w-full text-center cursor-pointer ${userRating ? 'bg-blue-900/80' : 'bg-gray-800/80'} flex items-center hover:bg-blue-800/80 transition-colors`}
      >
        {userRating ? (
          <>
            <div className="flex-1 text-center">
              <span className="text-white font-medium">
                {RATING_TEXTS[userRating]}
              </span>
            </div>
            
            <div className="relative w-8 h-8 ml-2 flex-shrink-0">
              <svg 
                width="32" 
                height="32" 
                viewBox="0 0 32 32" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="absolute inset-0 w-full h-full"
              >
                <path 
                  d="M16 2L21 10L29 12L24 18L24 27L16 24L8 27L8 18L3 12L11 10L16 2Z" 
                  stroke="#FFD700" 
                  strokeWidth="1.5" 
                  fill="none"
                />
              </svg>
              
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold z-10" style={{ transform: 'translateY(0.5px)' }}>
                {userRating}
              </span>
            </div>
          </>
        ) : (
          <span className="text-gray-400 w-full">поставить оценку</span>
        )}
      </button>
    );
  }

  return null;
});

RatingBadge.displayName = 'RatingBadge';

export default RatingBadge;