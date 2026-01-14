// src/app/components/StatusOverlay.tsx
'use client';

import { forwardRef } from 'react';

type MediaStatus = 'want' | 'watched' | 'dropped' | 'rewatched' | null;

interface StatusOverlayProps {
  status: MediaStatus;
  isBlacklisted: boolean;
  restoreView?: boolean;
  onStatusChange: (newStatus: MediaStatus) => void;
  onBlacklistToggle: () => void;
  onRatingOpen: (isRewatch?: boolean) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

const StatusOverlay = forwardRef<HTMLDivElement, StatusOverlayProps>(({
  status,
  isBlacklisted,
  restoreView = false,
  onStatusChange,
  onBlacklistToggle,
  onRatingOpen,
  onMouseLeave,
  onClick
}, ref) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick?.(e);
  };

  return (
    <div 
      ref={ref}
      className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-2 sm:p-3 z-50 rounded-t-lg"
      onMouseLeave={onMouseLeave}
      onClick={handleClick}
    >
      <div className="w-full max-w-[140px] sm:max-w-[150px] space-y-1">
        {restoreView ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onBlacklistToggle();
            }}
            className="w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer bg-orange-100 text-orange-800 hover:bg-orange-200 hover:text-orange-900"
          >
            <span className="text-base font-bold min-w-[16px] flex justify-center mr-1.5">🔓</span>
            <span className="truncate">Разблокировать</span>
          </button>
        ) : (
          <>
            {isBlacklisted ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onBlacklistToggle();
                }}
                className="w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer bg-orange-100 text-orange-800 hover:bg-orange-200 hover:text-orange-900"
              >
                <span className="text-base font-bold min-w-[16px] flex justify-center mr-1.5">🔓</span>
                <span className="truncate">Разблокировать</span>
              </button>
            ) : (
              <>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange('want');
                  }} 
                  className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer ${status === 'want' ? 'bg-blue-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  <span className="text-base font-bold min-w-[16px] flex justify-center mr-1.5">+</span>
                  <span className="truncate">Хочу посмотреть</span>
                </button>
                
                {(status !== 'watched' && status !== 'rewatched') && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange('watched');
                    }} 
                    className="w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer bg-white/10 text-white hover:bg-white/20"
                  >
                    <span className="text-sm font-bold min-w-[16px] flex justify-center mr-1.5">✓</span>
                    <span className="truncate">Просмотрено</span>
                  </button>
                )}
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onStatusChange('dropped');
                  }} 
                  className={`w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer ${status === 'dropped' ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                >
                  <span className="text-sm font-bold min-w-[16px] flex justify-center mr-1.5">×</span>
                  <span className="truncate">Брошено</span>
                </button>

                {(status === 'watched' || status === 'rewatched') && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onRatingOpen(true);
                    }} 
                    className="w-full py-1.5 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center justify-start text-left cursor-pointer bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                  >
                    <span className="text-sm font-bold min-w-[16px] flex justify-center mr-1.5">↻</span>
                    <span className="truncate">Пересмотрено</span>
                  </button>
                )}

                <div className="h-px bg-gray-700 my-1"></div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onBlacklistToggle();
                  }}
                  className="w-full py-1 px-2 rounded-lg text-[10px] sm:text-xs font-medium bg-gray-800/80 text-gray-400 hover:bg-red-900/50 hover:text-red-300 transition-colors flex items-center justify-start text-left cursor-pointer"
                >
                  <span className="text-sm font-bold min-w-[16px] flex justify-center mr-1.5">🚫</span>
                  <span className="truncate">В черный список</span>
                </button>

                {status && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onStatusChange(null);
                    }}
                    className="w-full py-1 px-2 rounded-lg text-[10px] sm:text-xs font-medium bg-gray-800/50 text-gray-300 hover:bg-gray-800/70 mt-1 flex items-center justify-center cursor-pointer"
                  >
                    Убрать из списков
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
});

StatusOverlay.displayName = 'StatusOverlay';

export default StatusOverlay;