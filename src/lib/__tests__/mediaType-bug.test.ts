import { describe, it, expect } from 'vitest';
import { getMediaTypeDisplay } from '../mediaType';
import type { Media } from '../tmdb';

describe('getMediaTypeDisplay - bug reproduction (media-type-display-mainpage-001)', () => {
  /**
   * Bug: На главной странице отображается "Фильм" для всех типов контента.
   * 
   * Root cause: fetchTrendingMovies/fetchPopularMovies не передают genre_ids и original_language
   * в преобразованные данные, поэтому функция getMediaTypeDisplay не может определить
   * тип контента правильно.
   * 
   * Эти тесты воспроизводят баг: проверяют ожидаемые правильные значения,
   * но получают "Фильм" из-за отсутствия данных genre_ids и original_language.
   */

  it('should return "Аниме" for Japanese animation but returns "Фильм" due to missing genre_ids', () => {
    // Данные как приходят с API (без genre_ids и original_language)
    const media: Media = {
      id: 1,
      media_type: 'movie',
      title: 'Аниме',
      poster_path: null,
      vote_average: 0,
      vote_count: 0,
      overview: '',
      // genre_ids отсутствует - это и есть баг
      // original_language отсутствует - это и есть баг
    };
    
    const result = getMediaTypeDisplay(media);
    
    // Ожидается "Аниме", но получается "Фильм" из-за бага
    expect(result.label).toBe('Аниме');
  });

  it('should return "Мульт" for Western animation but returns "Фильм" due to missing genre_ids', () => {
    // Данные как приходят с API (без genre_ids и original_language)
    const media: Media = {
      id: 2,
      media_type: 'movie',
      title: 'Мульт',
      poster_path: null,
      vote_average: 0,
      vote_count: 0,
      overview: '',
      // genre_ids отсутствует - это и есть баг
    };
    
    const result = getMediaTypeDisplay(media);
    
    // Ожидается "Мульт", но получается "Фильм" из-за бага
    expect(result.label).toBe('Мульт');
  });

  it('should return "Сериал" for TV show but returns "Фильм" due to wrong media_type', () => {
    // Данные как приходят с API - media_type всегда 'movie' даже для TV
    const media: Media = {
      id: 3,
      media_type: 'movie', // Баг: всегда 'movie', даже для TV контента
      name: 'Сериал',
      title: 'Сериал', // required field
      poster_path: null,
      vote_average: 0,
      vote_count: 0,
      overview: '',
    };
    
    const result = getMediaTypeDisplay(media);
    
    // Ожидается "Сериал", но получается "Фильм" из-за того что media_type всегда 'movie'
    expect(result.label).toBe('Сериал');
  });
});
