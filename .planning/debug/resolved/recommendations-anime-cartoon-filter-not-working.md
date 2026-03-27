# Bug: Фильтры Аниме и Мульт в рекомендациях не работают + Жанры на английском
Дата: 2026-03-25

## Описание
1. На странице /recommendations при выборе типов "Аниме" и/или "Мульт" система возвращает только Фильмы и Сериалы, игнорируя выбранные фильтры.
2. На странице /profile/taste-map и в рекомендациях жанры отображаются на английском, хотя интерфейс русский.

## Шаги воспроизведения (основной баг)
1. Перейти на /recommendations
2. Выбрать только "Аниме" (снять "Фильмы" и "Сериалы")
3. Получить рекомендацию
4. В результате возвращаются элементы с media_type 'movie' или 'tv', а не 'anime'.

Аналогично для "Мульт".

## Ожидаемое поведение
- При выборе 'anime' возвращаются элементы с media_type='anime' или isAnime=true.
- При выборе 'cartoon' возвращаются элементы с media_type='cartoon' или isCartoon=true.
- При выборе обоих типов возвращаются и аниме, и мультфильмы.
- Все жанры отображаются на русском языке.

## Фактическое поведение
- Возвращаются только movie/tv.
- Жанры отображаются на английском.

## Локализация
- `/src/app/api/recommendations/random/route.ts` — определение `mediaFilter` и фильтрация `filteredItems`.
- `/src/app/profile/taste-map/TasteMapClient.tsx` — отображение жанров.
- `/src/app/recommendations/RecommendationInfoModal.tsx` — отображение жанров в модальном окне.
- `/src/lib/tmdb.ts` — `fetchMediaDetails` использует language='en-US'.

## Корневые причины
1. **mediaFilter determination**: `const mediaFilter = types.find(t => t === 'movie' || t === 'tv') ? null : types[0];` При выборе только special types берётся первый, исключая остальные.
2. **Фильтрация не учитывает `item.mediaType`**: Проверяются только `isAnimeItem`/`isCartoonItem`, но не `item.mediaType === 'anime'/'cartoon'`.
3. **Жанры на английском**: TasteMapClient использует константу `TMDB_GENRES` на английском. `fetchMediaDetails` запрашивает TMDB с language='en-US'.

## Spec для RED теста (фильтрация)
Тест должен:
- Отправить GET /api/recommendations/random с `types=anime` (или `cartoon`, или `anime,cartoon`)
- Проверить, что возвращаемые элементы соответствуют типу:
  - Для anime: `media_type === 'anime'` или `isAnime === true`
  - Для cartoon: `media_type === 'cartoon'` или `isCartoon === true`
- Текущий тест падает: возвращаются movie/tv.

## Acceptance критерии
- [ ] При выборе только 'anime' возвращаются только аниме
- [ ] При выборе только 'cartoon' возвращаются только мультфильмы
- [ ] При выборе 'anime,cartoon' возвращаются и аниме, и мультфильмы
- [ ] Все жанры в интерфейсе отображаются на русском
- [ ] Регрессий в существующих тестах нет
