import type { Media } from './tmdb';

export interface MediaTypeConfig {
  label: string;
  backgroundColor: string;
  isAnime: boolean;
  isAnimated: boolean;
  displayType: 'movie' | 'tv' | 'anime' | 'animated';
}

const ANIME_COLOR = '#9C40FE';
const ANIMATED_COLOR = '#F97316';
const MOVIE_COLOR = '#22c55e';
const TV_COLOR = '#3b82f6';

export function getMediaTypeDisplay(movie: Media): MediaTypeConfig {
  const hasAnimationGenre = movie.genre_ids?.includes(16) || movie.genres?.some(g => g.id === 16);
  const isJapanese = movie.original_language === 'ja';

  if (hasAnimationGenre && isJapanese) {
    return { label: 'Аниме', backgroundColor: ANIME_COLOR, isAnime: true, isAnimated: false, displayType: 'anime' };
  }

  if (hasAnimationGenre && !isJapanese) {
    return { label: 'Мульт', backgroundColor: ANIMATED_COLOR, isAnime: false, isAnimated: true, displayType: 'animated' };
  }

  if (movie.media_type === 'movie') {
    return { label: 'Фильм', backgroundColor: MOVIE_COLOR, isAnime: false, isAnimated: false, displayType: 'movie' };
  }

  return { label: 'Сериал', backgroundColor: TV_COLOR, isAnime: false, isAnimated: false, displayType: 'tv' };
}
