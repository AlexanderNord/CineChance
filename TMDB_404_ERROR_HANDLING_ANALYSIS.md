# Анализ обработки ошибок 404 от TMDB в compute.ts

**Дата анализа:** 2026-04-14  
**Файл:** `/workspaces/CineChance/src/lib/taste-map/compute.ts`

---

## 1. Функция `buildWatchListItem` (строки 394-408)

### Код:
```typescript
/**
 * Build complete watch list item with TMDB details
 */
async function buildWatchListItem(
  item: { tmdbId: number; mediaType: string; userRating: number | null; voteAverage: number }
): Promise<WatchListItemFull> {
  const tmdbMediaType = normalizeMediaType(item.mediaType);
  
  // Fetch TMDB details (includes genres)
  const details = await fetchMediaDetails(item.tmdbId, tmdbMediaType);
  
  // Fetch credits separately
  const credits = await fetchMovieCredits(item.tmdbId, tmdbMediaType);
  
  return {
    userId: '', // Not needed for computation
    tmdbId: item.tmdbId,
    mediaType: item.mediaType,
    userRating: item.userRating,
    voteAverage: item.voteAverage,
    genres: details?.genres || [],
    credits: credits || undefined,
  };
}
```

### ❌ Проблемы:

1. **Нет обработки null результата от fetchMediaDetails**
   - `fetchMediaDetails` при ошибке TMDB (404, 500) возвращает `null`
   - Функция не выбрасывает исключение
   - При null `details?.genres` вернёт `undefined`, используется fallback `|| []`
   - **Результат:** Item попадает в список с пустыми genres и неполными данными

2. **Нет явной обработки ошибок**
   - Нет try-catch
   - Нет логирования
   - Если в будущем код изменится и fetchMediaDetails выбросит исключение, произойдёт краш

3. **fetchMovieCredits тоже может вернуть null**
   - Комментарий сам говорит "may not return them"
   - Ошибка TMDB → null → `credits || undefined`
   - Нет логирования какого произошло

---

## 2. Функция `processInBatches` (строки 416-430)

### Код:
```typescript
/**
 * Process items in batches with delays to avoid TMDB rate limiting
 */
async function processInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number = TMDB_BATCH_SIZE,
  delayMs: number = TMDB_BATCH_DELAY_MS
): Promise<R[]> {
  const results: R[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    
    // Delay between batches (but not after the last one)
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}
```

### ❌ Проблемы:

1. **Нет обработки ошибок в Promise.all**
   - `Promise.all(batch.map(fn))` **прерывает весь батч** при первой ошибке
   - Если одна функция в батче выбросит исключение, весь Promise.all упадёт
   - **Результат:** Весь processInBatches упадёт, даже если большинство items успешны

2. **Нет частичной обработки успешных результатов**
   - Невозможно отделить успешно обработанные items от ошибочных
   - Теряются данные о количестве успешных vs неудачных запросов

3. **Рекомендация:** Использовать `Promise.allSettled()` или оборачивать в try-catch

---

## 3. Функция `computeTasteMap` (строки 453-522)

### Полный код (все 70 строк):

```typescript
/**
 * Main function to compute complete TasteMap for a user
 */
export async function computeTasteMap(userId: string): Promise<TasteMap> {
  // Get items from database (watched + rewatched for better coverage)
  const watchedItems = await prisma.watchList.findMany({
    where: {
      userId,
      statusId: { in: COMPLETED_STATUS_IDS },
    },
    select: {
      tmdbId: true,
      mediaType: true,
      userRating: true,
      voteAverage: true,
    },
  });

  if (watchedItems.length === 0) {
    // Return empty taste map for new users
    return {
      userId,
      genreProfile: {},
      genreCounts: {},
      totalWatched: 0,
      ratingDistribution: { high: 0, medium: 0, low: 0 },
      averageRating: 0,
      personProfiles: { actors: {}, directors: {} },
      behaviorProfile: { rewatchRate: 0, dropRate: 0, completionRate: 100 },
      computedMetrics: { positiveIntensity: 0, negativeIntensity: 0, consistency: 0, diversity: 0 },
      updatedAt: new Date(),
    };
  }

  // Build full items with TMDB data (batched to avoid rate limiting)
  const watchListItems = await processInBatches(
    watchedItems,
    buildWatchListItem
  );

  // Compute profiles
  const genreProfile = computeGenreProfile(watchListItems);
  const genreCounts = computeGenreCounts(watchListItems);
  const personProfiles = computePersonProfile(watchListItems);
  const typeProfile = computeTypeProfile(watchListItems);
  const ratingDistribution = computeRatingDistribution(watchListItems);
  const averageRating = computeAverageRating(watchListItems);

  // Fetch all items for behavior profile in a single query
  const allItems = await prisma.watchList.findMany({
    where: { userId },
    select: { statusId: true, watchCount: true },
  });
  const behaviorProfile = await computeBehaviorProfile(userId, allItems);
  const computedMetrics = computeMetrics(genreProfile, ratingDistribution);

  const tasteMap: TasteMap = {
    userId,
    genreProfile,
    genreCounts,
    totalWatched: watchedItems.length,
    ratingDistribution,
    averageRating,
    personProfiles,
    behaviorProfile,
    computedMetrics,
    updatedAt: new Date(),
  };

  return tasteMap;
}
```

### ❌ Критические проблемы:

1. **Нет try-catch вокруг processInBatches (строка 485)**
   - Если хотя бы один item получит 404 от TMDB → buildWatchListItem выбросит exception (в будущем)
   - processInBatches упадёт → computeTasteMap упадёт → сломается весь page или API endpoint

2. **Состояние гонки между NULL и исключениями**
   - Сейчас buildWatchListItem НЕ выбрасывает исключение (return с null genres)
   - Но если refactor'ить код и добавить обработку ошибок → случайно может выброситься exception
   - watchListItems содержит items с пустыми genres → неправильные вычисления

3. **Нет логирования ошибок TMDB на уровне computeTasteMap**
   - Если много items получили 404, это молча пройдёт
   - genreProfile будет неполным/неправильным
   - genreCounts будут заниженными

4. **Использование неполных данных**
   - `totalWatched` использует длину `watchedItems` (из БД)
   - Но `genreProfile` строится из `watchListItems` с пустыми genres
   - **Мисматч:** totalWatched=10, но genreCounts не взяты из этих 10 items

---

## 4. Где вызывается computeTasteMap (без обработки ошибок)

### Найденные места:

1. **`src/app/profile/taste-map/page.tsx:32`** (Server Component)
   ```typescript
   const tasteMap = await computeTasteMap(session.user.id);
   ```
   - ❌ Нет try-catch
   - ❌ При ошибке → краш всей страницы

2. **`src/app/api/user/taste-map-comparison/[userId]/route.ts:90-91`** (API Route)
   ```typescript
   getTasteMap(currentUserId, () => computeTasteMap(currentUserId)),
   getTasteMap(comparedUserId, () => computeTasteMap(comparedUserId)),
   ```
   - Обёрнуто в `getTasteMap(() => ...)` → скорее всего есть обработка там
   - **Требует проверки**

3. **`src/app/api/user/similar-users/debug/route.ts:73, 133`** (Debug API)
   - Также обёрнуто в `getTasteMap(() => ...)`

---

## 5. Анализ fetchMediaDetails в src/lib/tmdb.ts (строки 397-450)

```typescript
export const fetchMediaDetails = async (
  tmdbId: number,
  mediaType: 'movie' | 'tv'
): Promise<MovieDetails | null> => {
  // ... кэш логика ...
  
  try {
    const response = await fetch(url.toString(), { /* ... */ });
    
    if (!response.ok) {
      logger.error('Ошибка TMDB details', { status: response.status, context: 'TMDB' });
      return null;  // ← Возвращает NULL при ошибке
    }
    
    const data = await response.json();
    // ... обработка ...
  }
}
```

### ✅ Правильная обработка в fetchMediaDetails:
- Логирует ошибку: `logger.error(...)`
- Возвращает `null` вместо выброса исключения
- **НО:** Эта обработка теряется в buildWatchListItem

---

## 📊 СПИСОК ПОТЕНЦИАЛЬНЫХ ПРОБЛЕМ

| # | Проблема | Серьезность | Где | Влияние |
|---|----------|-------------|-----|---------|
| 1 | buildWatchListItem не валидирует null от fetchMediaDetails | 🔴 ВЫСОКАЯ | compute.ts:405 | Items с пустыми genres попадают в вычисления |
| 2 | processInBatches использует Promise.all (не allSettled) | 🔴 ВЫСОКАЯ | compute.ts:421 | Один ошибочный item = краш всего батча |
| 3 | computeTasteMap без try-catch вокруг processInBatches | 🔴 КРИТИЧНА | compute.ts:485 | TMDB 404 → краш page/API |
| 4 | Нет валидации watchListItems после processInBatches | 🟡 СРЕДНЯЯ | compute.ts:490 | Могут быть items с null fields |
| 5 | Мисматч между totalWatched и genreCounts | 🟡 СРЕДНЯЯ | compute.ts:508 | Неправильная метрика diversity |
| 6 | Потеря информации об ошибках TMDB | 🟡 СРЕДНЯЯ | compute.ts:485 | Невозможно отследить проблемы |
| 7 | buildWatchListItem имеет пустой userId | 🟢 НИЗКАЯ | compute.ts:404 | Технически не проблема (не нужен) |
| 8 | fetchMovieCredits может вернуть null без логирования | 🟡 СРЕДНЯЯ | compute.ts:407 | Потеря данных об актёрах/режиссёрах |
| 9 | Комментарий в fetchMovieCredits предлагает улучшение | 🟢 НИЗКАЯ | compute.ts:368 | Техдолг: нужно переделать |
| 10 | Нет обработки ошибок в getTasteMap обёртке | ❓ НЕЯСНО | api/**route.ts | Требует проверки getTasteMap |

---

## 🔧 РЕКОМЕНДАЦИИ ПО ИСПРАВЛЕНИЮ

### 1. **buildWatchListItem** - добавить явную обработку
```typescript
async function buildWatchListItem(
  item: { tmdbId: number; mediaType: string; userRating: number | null; voteAverage: number }
): Promise<WatchListItemFull | null> {  // ← Может вернуть null
  const tmdbMediaType = normalizeMediaType(item.mediaType);
  
  try {
    const details = await fetchMediaDetails(item.tmdbId, tmdbMediaType);
    if (!details) {
      logger.warn('Не удалось получить детали', { tmdbId: item.tmdbId, context: 'BuildWatchListItem' });
      return null;  // ← Явно возвращаем null
    }
    
    const credits = await fetchMovieCredits(item.tmdbId, tmdbMediaType);
    
    return { /* ... */ };
  } catch (error) {
    logger.error('Ошибка buildWatchListItem', { 
      error: error instanceof Error ? error.message : String(error),
      tmdbId: item.tmdbId,
      context: 'BuildWatchListItem'
    });
    return null;
  }
}
```

### 2. **processInBatches** - использовать Promise.allSettled
```typescript
async function processInBatches<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  batchSize: number = TMDB_BATCH_SIZE,
  delayMs: number = TMDB_BATCH_DELAY_MS
): Promise<(R | null)[]> {  // ← Может содержать null
  const results: (R | null)[] = [];
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settlements = await Promise.allSettled(batch.map(fn));
    
    for (const settlement of settlements) {
      if (settlement.status === 'fulfilled') {
        results.push(settlement.value);
      } else {
        logger.error('Ошибка в батче', { 
          error: settlement.reason,
          context: 'ProcessInBatches'
        });
        results.push(null);
      }
    }
    
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}
```

### 3. **computeTasteMap** - фильтровать null результаты
```typescript
export async function computeTasteMap(userId: string): Promise<TasteMap> {
  // ... fetch watchedItems ...
  
  try {
    // Build full items with TMDB data (batched to avoid rate limiting)
    const allWatchListItems = await processInBatches(
      watchedItems,
      buildWatchListItem
    );
    
    // ← НОВОЕ: Фильтровать null результаты
    const watchListItems = allWatchListItems.filter(
      (item): item is WatchListItemFull => item !== null
    );
    
    if (watchListItems.length === 0) {
      logger.warn('Все items TMDB отклонили', { userId, context: 'ComputeTasteMap' });
      // Возвращаем пустую taste map или partial?
    }
    
    // ... остальное использует filteredItems ...
    
  } catch (error) {
    logger.error('Ошибка computeTasteMap', { 
      error: error instanceof Error ? error.message : String(error),
      userId,
      context: 'ComputeTasteMap'
    });
    // Возвращаем пустую taste map в качестве fallback
    return {
      userId,
      genreProfile: {},
      genreCounts: {},
      totalWatched: 0,
      ratingDistribution: { high: 0, medium: 0, low: 0 },
      averageRating: 0,
      personProfiles: { actors: {}, directors: {} },
      behaviorProfile: { rewatchRate: 0, dropRate: 0, completionRate: 100 },
      computedMetrics: { positiveIntensity: 0, negativeIntensity: 0, consistency: 0, diversity: 0 },
      updatedAt: new Date(),
    };
  }
}
```

### 4. **taste-map/page.tsx** - добавить обработку ошибок
```typescript
export default async function TasteMapPage() {
  // ... auth check ...
  
  let tasteMap: TasteMap;
  try {
    tasteMap = await computeTasteMap(session.user.id);
  } catch (error) {
    // Показать пользователю ошибку или пустую карту
    return (
      <div className="container mx-auto px-4">
        <p className="text-red-500">Ошибка загрузки карты вкуса. Попробуйте позже.</p>
      </div>
    );
  }
  
  return (
    <div>
      <TasteMapClient tasteMap={tasteMap} {...} />
    </div>
  );
}
```

---

## ВЫВОДЫ

| Статус | Описание |
|--------|---------|
| 🔴 **КРИТИЧНО** | Отсутствие try-catch в computeTasteMap → TMDB 404 = краш |
| 🔴 **КРИТИЧНО** | Promise.all в processInBatches → один ошибочный item = краш всего батча |
| 🟡 **ВАЖНО** | buildWatchListItem генерирует items с пустыми данными при ошибке TMDB |
| 🟡 **ВАЖНО** | Потеря информации об ошибках между слоями (fetchMediaDetails → buildWatchListItem → computeTasteMap) |
| 🟢 **УЛУЧШЕНИЕ** | Нужен механизм отслеживания успешных vs неудачных TMDB запросов |

**Рекомендованный приоритет исправления:**
1. Добавить try-catch в computeTasteMap
2. Заменить Promise.all на Promise.allSettled в processInBatches
3. Сделать buildWatchListItem валидирующей функцией (return null вместо empty defaults)
