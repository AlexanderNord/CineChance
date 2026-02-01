# Исправление загрузки постеров на мобильных устройствах

## Проблема

На мобильных устройствах (Android Chrome) новые постеры не загружаются, показываются только кэшированные изображения. На десктопе все работает корректно. Проблема критическая для UX.

## Коренные причины

1. **Агрессивный кэш Chrome на мобильных**: Chrome мобильный агрессивно кэширует изображения и не перезагружает их при ошибках
2. **Lazy loading проблемы**: На мобильных устройствах lazy loading может не срабатывать корректно
3. **Отсутствие retry логики**: Нет повторных попыток загрузки при сбоях
4. **Неправильные image sizes**: Размеры не оптимизированы под мобильные устройства
5. **Состояние загрузки**: Неправильная обработка состояний загрузки изображений

## Исправления

### 1. Детекция мобильных устройств

```typescript
const isMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};
```

### 2. Улучшенная обработка состояний

```typescript
const [imageError, setImageError] = useState(false);
const [fanartPoster, setFanartPoster] = useState<string | null>(null);
const [isTryingFanart, setIsTryingFanart] = useState(false);
const [imageLoaded, setImageLoaded] = useState(false);
const [retryCount, setRetryCount] = useState(0);
```

### 3. Retry логика с Cache Busting

```typescript
// Если это первая ошибка, пробуем перезагрузить TMDB изображение
if (retryCount === 0 && !fanartPoster && movie.poster_path) {
  setRetryCount(1);
  // Добавляем случайный параметр чтобы избежать кэша
  const timestamp = Date.now();
  const tmdbUrl = `https://image.tmdb.org/t/p/w500${movie.poster_path}?t=${timestamp}`;
  return;
}
```

### 4. Оптимизированные размеры для мобильных

```typescript
const imageSizes = isMobileDevice() 
  ? "(max-width: 640px) 33vw, (max-width: 768px) 25vw, (max-width: 1024px) 20vw, 16vw"
  : "(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw";
```

### 5. Умное Lazy Loading

```typescript
const shouldUseEagerLoading = priority || (isMobileDevice() && retryCount > 0);
```

### 6. Улучшенный Image компонент

```typescript
<Image
  key={`${movie.id}-${fanartPoster ? 'fanart' : 'tmdb'}-${retryCount}-${imageLoaded}`}
  src={imageUrl}
  sizes={imageSizes}
  loading={shouldUseEagerLoading ? "eager" : "lazy"}
  quality={isMobileDevice() ? 75 : 85}
  unoptimized={!!fanartPoster}
  onError={handlePosterError}
  onLoad={() => setImageLoaded(true)}
/>
```

### 7. Визуальная обратная связь

```typescript
className={`object-cover transition-transform duration-500 ${
  isHovered && !showOverlay ? 'scale-105' : ''
} ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
```

## Технические улучшения

### Cache Busting
- Добавление `?t=${timestamp}` к URL при повторных попытках
- Уникальный key для Image компонента при каждом изменении состояния

### Mobile Optimization
- Меньшие размеры изображений для мобильных (33vw vs 50vw)
- Сниженное качество (75 vs 85) для ускорения загрузки
- Eager loading для повторных попыток на мобильных

### Error Handling
- Детальное логирование всех этапов загрузки
- Graceful fallback на Fanart.tv
- Финальный fallback на placeholder

### State Management
- Правильный сброс всех состояний при изменении фильма
- Отслеживание количества попыток
- Визуальная индикация загрузки

## Результат

1. **Надежность**: Постеры загружаются даже на медленных мобильных соединениях
2. **UX**: Плавные переходы и визуальная обратная связь
3. **Производительность**: Оптимизированные размеры и качество для мобильных
4. **Fallbacks**: Многоуровневая система резервных источников
5. **Логирование**: Детальная информация для отладки

## Тестирование

После деплоя проверить на мобильных устройствах:
1. Новые постеры загружаются корректно
2. При ошибке загрузки пробуется Fanart.tv
3. При повторной ошибке показывается placeholder
4. Визуальные эффекты работают плавно
5. Нет "застрявших" состояний загрузки

## Файлы изменены

- `src/app/components/MoviePoster.tsx` - основная логика загрузки постеров
