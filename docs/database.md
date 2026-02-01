# База данных CineChance

## Обзор

CineChance использует PostgreSQL через Prisma ORM с адаптером Neon для serverless работы. База данных спроектирована для поддержки сложной рекомендательной системы и масштабирования.

## Схема данных

### Основные модели

#### User - Пользователи
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  hashedPassword TEXT,
  emailVerified TIMESTAMP,
  image TEXT,
  birthDate TIMESTAMP,                    -- Для age-gating
  agreedToTerms BOOLEAN DEFAULT FALSE,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  -- ML поля
  recommendationStats JSON,               -- Агрегированная статистика
  preferencesSnapshot JSON,               -- Текущие предпочтения
  mlProfileVersion TEXT                   -- Версия ML профиля
);
```

**Ключевые индексы:**
- `email` - быстрая аутентификация
- `createdAt`, `updatedAt` - сортировка и аналитика

#### WatchList - Списки просмотра
```sql
CREATE TABLE watch_lists (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  tmdbId INTEGER NOT NULL,
  mediaType TEXT NOT NULL,                -- "movie" или "tv"
  title TEXT NOT NULL,
  voteAverage REAL,
  userRating INTEGER,                     -- 1-10
  statusId INTEGER NOT NULL,
  addedAt TIMESTAMP DEFAULT NOW(),
  watchedDate TIMESTAMP,
  note TEXT,
  watchCount INTEGER DEFAULT 0,
  
  -- Рекомендационные метаданные
  recommendationCount INTEGER DEFAULT 0,
  lastRecommendedAt TIMESTAMP,
  acceptanceCount INTEGER DEFAULT 0,
  hiddenFromRecommendations BOOLEAN DEFAULT FALSE,
  hiddenReason TEXT,
  
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (statusId) REFERENCES movie_statuses(id),
  
  UNIQUE(userId, tmdbId, mediaType)       -- Один фильм один раз
);
```

**Ключевые индексы:**
- `userId` - пользовательские списки
- `tmdbId` - поиск по фильмам
- `statusId` - фильтрация по статусам
- `(userId, statusId, addedAt)` - оптимизация сортировки

#### MovieStatus - Статусы фильмов
```sql
CREATE TABLE movie_statuses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL               -- "want", "watched", "dropped"
);
```

#### RecommendationLog - Лог рекомендаций
```sql
CREATE TABLE recommendation_logs (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  tmdbId INTEGER NOT NULL,
  mediaType TEXT NOT NULL,
  algorithm TEXT NOT NULL,                -- "random_v1", "smart_v2", etc.
  score REAL,                            -- Вес релевантности
  action TEXT,                           -- "shown", "opened", "skipped", "watched"
  context JSON,                          -- Контекст показа
  shownAt TIMESTAMP DEFAULT NOW(),
  
  -- Расширенные поля для ML
  filtersSnapshot JSON,
  candidatePoolMetrics JSON,
  temporalContext JSON,
  mlFeatures JSON,
  
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

**Ключевые индексы:**
- `(userId, shownAt)` - история рекомендаций пользователя
- `(algorithm, shownAt)` - анализ алгоритмов
- `(userId, action, shownAt)` - анализ действий

### Расширенные модели для ML

#### Tag - Пользовательские теги
```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  userId TEXT NOT NULL,
  usageCount INTEGER DEFAULT 0,
  createdAt TIMESTAMP DEFAULT NOW(),
  updatedAt TIMESTAMP DEFAULT NOW(),
  
  -- ML поля
  recommendationWeight REAL DEFAULT 1.0,
  isPromoted BOOLEAN DEFAULT FALSE,
  recommendationCount INTEGER DEFAULT 0,
  
  FOREIGN KEY (userId) REFERENCES users(id),
  UNIQUE(userId, name)
);
```

#### RatingHistory - История оценок
```sql
CREATE TABLE rating_histories (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  tmdbId INTEGER NOT NULL,
  mediaType TEXT NOT NULL,
  rating REAL NOT NULL,                  -- 0.5-10.0
  actionType TEXT NOT NULL,              -- "initial", "rating_change", "rewatch"
  createdAt TIMESTAMP DEFAULT NOW(),
  
  -- ML поля
  recommendationLogId TEXT,
  previousRating REAL,
  ratingChange REAL,
  ratingSource TEXT,
  
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (recommendationLogId) REFERENCES recommendation_logs(id)
);
```

#### RewatchLog - Лог пересмотров
```sql
CREATE TABLE rewatch_logs (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  tmdbId INTEGER NOT NULL,
  mediaType TEXT NOT NULL,
  watchedAt TIMESTAMP DEFAULT NOW(),
  ratingBefore REAL,
  ratingAfter REAL,
  previousWatchCount INTEGER,
  recommendationLogId TEXT,
  
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (recommendationLogId) REFERENCES recommendation_logs(id)
);
```

### Аналитические модели

#### RecommendationEvent - События рекомендаций
```sql
CREATE TABLE recommendation_events (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  parentLogId TEXT,
  eventType TEXT NOT NULL,                -- "page_view", "hover_start", etc.
  eventData JSON,
  sessionState JSON,
  timingMs INTEGER,
  timestamp TIMESTAMP DEFAULT NOW(),
  deviceContext JSON,
  
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (parentLogId) REFERENCES recommendation_logs(id)
);
```

#### FilterSession - Сессии фильтров
```sql
CREATE TABLE filter_sessions (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  sessionId TEXT,
  startedAt TIMESTAMP DEFAULT NOW(),
  endedAt TIMESTAMP,
  durationMs INTEGER,
  
  initialState JSON,
  finalState JSON,
  changesHistory JSON,
  resultMetrics JSON,
  abandonedFilters JSON,
  
  status TEXT DEFAULT "active",
  completedAt TIMESTAMP,
  
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### UserSession - Пользовательские сессии
```sql
CREATE TABLE user_sessions (
  id TEXT PRIMARY KEY,
  sessionId TEXT UNIQUE NOT NULL,
  userId TEXT NOT NULL,
  startedAt TIMESTAMP DEFAULT NOW(),
  endedAt TIMESTAMP,
  durationMs INTEGER,
  isActive BOOLEAN DEFAULT TRUE,
  
  entryPoint TEXT,
  exitPoint TEXT,
  deviceContext JSON,
  sessionFlow JSON,
  outcome TEXT,
  outcomeMetrics JSON,
  
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

### ML инфраструктура

#### UserEmbedding - Векторные представления пользователей
```sql
CREATE TABLE user_embeddings (
  id TEXT PRIMARY KEY,
  userId TEXT UNIQUE NOT NULL,
  vectorData JSON,                        -- Вектор признаков
  embeddingVersion TEXT,
  modelType TEXT,                         -- "collaborative", "content_based", "hybrid"
  computedAt TIMESTAMP DEFAULT NOW(),
  qualityMetrics JSON,
  
  FOREIGN KEY (userId) REFERENCES users(id)
);
```

#### MovieEmbedding - Векторные представления фильмов
```sql
CREATE TABLE movie_embeddings (
  id TEXT PRIMARY KEY,
  tmdbId INTEGER UNIQUE NOT NULL,
  mediaType TEXT NOT NULL,
  vectorData JSON,
  embeddingVersion TEXT,
  modelType TEXT,
  computedAt TIMESTAMP DEFAULT NOW(),
  similarityCache JSON
);
```

#### PredictionLog - Лог предсказаний ML моделей
```sql
CREATE TABLE prediction_logs (
  id TEXT PRIMARY KEY,
  recommendationLogId TEXT UNIQUE NOT NULL,
  userId TEXT NOT NULL,
  predictedScore REAL NOT NULL,
  actualAction TEXT,
  predictionError REAL,
  modelVersion TEXT,
  featureVector JSON,
  computedAt TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (userId) REFERENCES users(id),
  FOREIGN KEY (recommendationLogId) REFERENCES recommendation_logs(id)
);
```

## Оптимизация производительности

### Индексы

#### Пользовательские данные
```sql
-- Быстрый доступ к данным пользователя
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(createdAt);
CREATE INDEX idx_users_updated_at ON users(updatedAt);
```

#### Списки просмотра
```sql
-- Оптимизация пользовательских запросов
CREATE INDEX idx_watchlists_user_id ON watch_lists(userId);
CREATE INDEX idx_watchlists_tmdb_id ON watch_lists(tmdbId);
CREATE INDEX idx_watchlists_status ON watch_lists(statusId);
CREATE INDEX idx_watchlists_added_at ON watch_lists(addedAt);

-- Композитные индексы для сложных запросов
CREATE INDEX idx_watchlists_user_status_added ON watch_lists(userId, statusId, addedAt);
CREATE INDEX idx_watchlists_user_status ON watch_lists(userId, statusId);
```

#### Рекомендации
```sql
-- Аналитика рекомендаций
CREATE INDEX idx_recommendations_user_shown ON recommendation_logs(userId, shownAt);
CREATE INDEX idx_recommendations_algorithm ON recommendation_logs(algorithm, shownAt);
CREATE INDEX idx_recommendations_user_action ON recommendation_logs(userId, action, shownAt);
```

#### Теги
```sql
-- Поиск и популярность тегов
CREATE INDEX idx_tags_user_id ON tags(userId);
CREATE INDEX idx_tags_usage_count ON tags(usageCount);
CREATE INDEX idx_tags_name ON tags(name);
```

### Партиционирование

Для больших таблиц可以考虑 партиционирование по времени:

```sql
-- Партиционирование recommendation_logs по месяцам
CREATE TABLE recommendation_logs_y2024m01 PARTITION OF recommendation_logs
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Масштабирование

### Горизонтальное масштабирование
- **Neon PostgreSQL** - автоматическое масштабирование
- **Read replicas** для аналитических запросов
- **Connection pooling** через Prisma

### Вертикальная оптимизация
- **Индексация** всех частых запросов
- **Query optimization** через EXPLAIN ANALYZE
- **Batch operations** для массовых операций

## Резервное копирование

### Автоматические бэкапы
- **Daily backups** через Neon
- **Point-in-time recovery** до 7 дней
- **Cross-region replication** для отказоустойчивости

### Экспорт данных
```sql
-- Экспорт пользовательских данных
pg_dump --data-only --table=users --table=watch_lists cinechance > backup.sql
```

## Безопасность

### Шифрование
- **Password hashing** bcryptjs
- **TLS connections** к базе данных
- **Encryption at rest** в Neon

### Access Control
- **Row Level Security** для пользовательских данных
- **Least privilege** для подключения
- **Audit logging** для доступа к данным

## Мониторинг

### Метрики производительности
- **Query latency** через Prisma
- **Connection pool utilization**
- **Index usage statistics**

### Аналитические запросы
```sql
-- Топ популярных фильмов
SELECT tmdbId, COUNT(*) as watch_count
FROM watch_lists
WHERE statusId = (SELECT id FROM movie_statuses WHERE name = 'watched')
GROUP BY tmdbId
ORDER BY watch_count DESC
LIMIT 10;

-- Эффективность рекомендаций
SELECT algorithm, 
       AVG(CASE WHEN action = 'watched' THEN 1 ELSE 0 END) as conversion_rate
FROM recommendation_logs
WHERE shownAt > NOW() - INTERVAL '7 days'
GROUP BY algorithm;
```

## Миграции

### Управление миграциями через Prisma
```bash
# Создать миграцию
npx prisma migrate dev --name add_recommendation_system

# Применить миграции
npx prisma migrate deploy

# Сбазировать базу (dev только!)
npx prisma db push
```

### Seed данные
```typescript
// prisma/seed.ts
const statuses = [
  { name: 'want' },
  { name: 'watched' },
  { name: 'dropped' }
];

await prisma.movieStatus.createMany({
  data: statuses
});
```

## Траблшутинг

### Частые проблемы
1. **Slow queries** - проверьте индексы через EXPLAIN
2. **Connection limits** - увеличите pool size
3. **Memory usage** - оптимизируйте JSON поля

### Диагностика
```sql
-- Медленные запросы
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Использование индексов
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```
