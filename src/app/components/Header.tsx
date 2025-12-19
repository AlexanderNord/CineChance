'use client';

import { useState } from 'react';

type HeaderProps = {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
};

export default function Header({ toggleSidebar, isSidebarOpen }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = () => {
    // Здесь будет логика поиска
    console.log('Поиск:', searchQuery);
    // Можно добавить редирект на страницу поиска с query параметром
    // или открыть модальное окно с результатами
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <header className="h-16 bg-black/90 backdrop-blur-md border-b border-gray-800 flex items-center justify-between w-full">
      <div className="flex items-center justify-between w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleSidebar} 
            className="text-white text-2xl hover:text-purple-500 transition"
            aria-label={isSidebarOpen ? "Скрыть меню" : "Показать меню"}
          >
            {isSidebarOpen ? '◀' : '▶'}
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            CineChance
          </h1>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 flex-1 justify-end">
          <div className="relative hidden md:block flex-1 max-w-2xl mr-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Поиск фильмов и сериалов..."
              className="w-full px-5 py-3.5 pr-14 bg-gray-900/80 border border-gray-700 rounded-full text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-all duration-200"
            />
            <button
              onClick={handleSearch}
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 rounded-full hover:bg-gray-800/50 transition-all duration-200 group"
              aria-label="Поиск"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 text-gray-400 group-hover:text-blue-400 transition-colors"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}