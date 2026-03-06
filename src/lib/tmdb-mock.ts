import { logger } from '@/lib/logger';
import { Media } from './tmdb';

// Mock данные для работы приложения при проблемах с TMDB API
const mockMovies: Media[] = [
  {
    id: 1,
    media_type: 'movie',
    title: 'Пример фильма 1',
    name: 'Пример фильма 1',
    poster_path: '/placeholder-poster.svg',
    vote_average: 7.5,
    vote_count: 1000,
    release_date: '2024-01-01',
    first_air_date: '2024-01-01',
    overview: 'Это пример описания фильма для демонстрации работы приложения.',
    genre_ids: [28], // Action genre
    original_language: 'en',
    adult: false,
  },
  {
    id: 2,
    media_type: 'movie',
    title: 'Пример фильма 2',
    name: 'Пример фильма 2',
    poster_path: '/placeholder-poster.svg',
    vote_average: 8.2,
    vote_count: 1500,
    release_date: '2024-02-01',
    first_air_date: '2024-02-01',
    overview: 'Еще один пример фильма для демонстрации функциональности.',
    genre_ids: [16], // Animation genre
    original_language: 'ja', // Japanese - should display as "Аниме"
    adult: false,
  },
  {
    id: 3,
    media_type: 'movie',
    title: 'Пример фильма 3',
    name: 'Пример фильма 3',
    poster_path: '/placeholder-poster.svg',
    vote_average: 6.8,
    vote_count: 800,
    release_date: '2024-03-01',
    first_air_date: '2024-03-01',
    overview: 'Третий пример фильма для тестирования интерфейса.',
    genre_ids: [16], // Animation genre
    original_language: 'en', // Non-Japanese - should display as "Мульт"
    adult: false,
  },
  {
    id: 4,
    media_type: 'tv',
    title: 'Пример сериала 1',
    name: 'Пример сериала 1',
    poster_path: '/placeholder-poster.svg',
    vote_average: 9.0,
    vote_count: 2000,
    release_date: '2024-04-01',
    first_air_date: '2024-04-01',
    overview: 'Это пример сериала для демонстрации работы приложения.',
    genre_ids: [18], // Drama genre
    original_language: 'en',
    adult: false,
  },
  {
    id: 5,
    media_type: 'tv',
    title: 'Пример сериала 2',
    name: 'Пример сериала 2',
    poster_path: '/placeholder-poster.svg',
    vote_average: 8.5,
    vote_count: 1200,
    release_date: '2024-05-01',
    first_air_date: '2024-05-01',
    overview: 'Второй пример сериала для тестирования интерфейса.',
    genre_ids: [10765], // Sci-Fi genre
    original_language: 'en',
    adult: false,
  },
];

export const fetchTrendingMoviesMock = async (_timeWindow: 'day' | 'week' = 'week'): Promise<Media[]> => {
  logger.info('Используем mock данные для trending movies из-за проблем с сетью', { context: 'TMDB_MOCK' });
  return mockMovies;
};

export const fetchPopularMoviesMock = async (_page: number = 1): Promise<Media[]> => {
  logger.info('Используем mock данные для popular movies из-за проблем с сетью', { context: 'TMDB_MOCK' });
  return mockMovies;
};

export const searchMediaMock = async (query: string, _page: number = 1): Promise<Media[]> => {
  logger.info('Используем mock данные для поиска из-за проблем с сетью', { context: 'TMDB_MOCK' });
  if (!query.trim()) return [];
  
  // Имитируем поиск по названию
  const filtered = mockMovies.filter(movie => 
    movie.title.toLowerCase().includes(query.toLowerCase())
  );
  return filtered;
};
