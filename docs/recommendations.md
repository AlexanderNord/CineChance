# Рекомендательная система CineChance

## Обзор

Рекомендательная система CineChance - это многоуровневая ML-архитектура, которая обеспечивает персонализированные рекомендации фильмов и сериалов на основе поведения пользователя, предпочтений и контекстуальных факторов.

## Архитектура

### Версии алгоритмов

#### v1 - Random Baseline
- Случайный выбор из доступных фильмов
- Базовый бенчмарк для сравнения
- Быстрый, но неперсонализированный

#### v2 - Weighted Hybrid
- Совмещение контент-based и collaborative filtering
- Взвешенная оценка на нескольких признаках
- Учитывает историю просмотров и оценки

#### v3 - Neural Embeddings
- Нейронные эмбеддинги для пользователей и фильмов
- Deep learning модель для предсказания предпочтений
- Адаптивное обучение на основе обратной связи

## Компоненты системы

### 1. Сбор данных

#### Источники данных
- **WatchList** - статусы фильмов (want/watched/dropped)
- **RatingHistory** - история оценок пользователя
- **RewatchLog** - логи пересмотров
- **RecommendationLog** - взаимодействие с рекомендациями
- **UserEmbedding** - векторные представления пользователей
- **MovieEmbedding** - векторные представления фильмов

#### Поведенческие сигналы
```typescript
interface IntentSignal {
  signalType: 'hover_duration' | 'dwell_time' | 'scroll_depth' | 'content_expansion';
  intensityScore: number;        // 0-1 нормализованная сила сигнала
  elementContext: object;        // контекст элемента
  temporalContext: object;       // временной контекст
  predictedIntent: object;       // ML-определённые намерения
}
```

### 2. Обработка признаков

#### Пользовательские признаки
- **Демографические**: возраст, предпочтения по жанрам
- **Поведенческие**: средний рейтинг, активность
- **Временные**: время суток, день недели просмотра
- **Социальные**: влияние друзей, тренды

#### Признаки фильмов
- **Контентные**: жанр, год, рейтинг TMDB, актеры
- **Популярность**: тренды, количество просмотров
- **Семантические**: эмбеддинги описаний
- **Коллаборативные**: похожие пользователи

#### Контекстуальные признаки
```typescript
interface ContextualFeatures {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: number;
  sessionDuration: number;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  recentGenres: string[];
  moodPredicted: 'action' | 'comedy' | 'drama' | 'documentary';
}
```

### 3. ML модели

#### Collaborative Filtering
```python
# Матричная факторизация
class CollaborativeFiltering:
    def __init__(self, n_factors=50):
        self.n_factors = n_factors
        
    def fit(self, user_item_matrix):
        # SVD разложение матрицы пользователь-фильм
        U, sigma, Vt = svds(user_item_matrix, k=self.n_factors)
        return U, sigma, Vt
        
    def predict(self, user_id, movie_id):
        # Предсказание рейтинга
        return np.dot(U[user_id], sigma * Vt[movie_id])
```

#### Content-Based Filtering
```python
# Похожесть по контенту
class ContentBasedFiltering:
    def __init__(self):
        self.tfidf = TfidfVectorizer()
        self.cosine_sim = cosine_similarity
        
    def fit(self, movie_features):
        # TF-IDF для жанров, описаний, актеров
        self.feature_matrix = self.tfidf.fit_transform(movie_features)
        
    def get_similar_movies(self, movie_id, top_k=10):
        # Косинусная схожесть
        sim_scores = self.cosine_sim[movie_id]
        return sim_scores.argsort()[-top_k:][::-1]
```

#### Neural Embeddings
```python
# Нейронная сеть для эмбеддингов
class RecommendationModel(nn.Module):
    def __init__(self, n_users, n_movies, embedding_dim=64):
        super().__init__()
        self.user_embedding = nn.Embedding(n_users, embedding_dim)
        self.movie_embedding = nn.Embedding(n_movies, embedding_dim)
        self.fc_layers = nn.Sequential(
            nn.Linear(embedding_dim * 2, 128),
            nn.ReLU(),
            nn.Linear(128, 64),
            nn.ReLU(),
            nn.Linear(64, 1),
            nn.Sigmoid()
        )
        
    def forward(self, user_ids, movie_ids):
        user_emb = self.user_embedding(user_ids)
        movie_emb = self.movie_embedding(movie_ids)
        concat = torch.cat([user_emb, movie_emb], dim=1)
        return self.fc_layers(concat)
```

### 4. Алгоритмы рекомендаций

#### v2 Weighted Hybrid
```typescript
interface RecommendationScore {
  collaborativeScore: number;     // 0-1
  contentScore: number;          // 0-1
  popularityScore: number;       // 0-1
  noveltyScore: number;          // 0-1
  temporalScore: number;         // 0-1
  
  // Веса алгоритма
  weights: {
    collaborative: 0.4;
    content: 0.3;
    popularity: 0.2;
    novelty: 0.1;
  };
  
  finalScore: number;
}

function calculateRecommendationScore(
  user: User, 
  movie: Movie, 
  context: Context
): RecommendationScore {
  const collaborative = getCollaborativeScore(user, movie);
  const content = getContentScore(user, movie);
  const popularity = getPopularityScore(movie);
  const novelty = getNoveltyScore(user, movie);
  const temporal = getTemporalScore(user, movie, context);
  
  const finalScore = 
    collaborative * weights.collaborative +
    content * weights.content +
    popularity * weights.popularity +
    novelty * weights.novelty +
    temporal * weights.temporal;
    
  return { ...scores, finalScore };
}
```

#### v3 Neural Pipeline
```typescript
interface NeuralRecommendation {
  userEmbedding: number[];       // 128-dim вектор
  movieEmbedding: number[];       // 128-dim вектор
  contextEmbedding: number[];     // 64-dim вектор
  predictedScore: number;         // 0-1 вероятность принятия
  confidence: number;             // уверенность модели
  explanation: string[];          // факторы влияния
}

class NeuralRecommendationEngine {
  async generateRecommendations(
    userId: string, 
    context: Context,
    limit: number = 10
  ): Promise<NeuralRecommendation[]> {
    
    // 1. Получить эмбеддинги
    const userEmb = await this.getUserEmbedding(userId);
    const candidates = await this.getCandidateMovies(userId);
    
    // 2. Вычислить схожесть
    const scores = await Promise.all(
      candidates.map(async movie => {
        const movieEmb = await this.getMovieEmbedding(movie.tmdbId);
        const contextEmb = this.getContextEmbedding(context);
        
        // 3. Нейронная сеть для предсказания
        const prediction = await this.model.predict({
          user: userEmb,
          movie: movieEmb,
          context: contextEmb
        });
        
        return {
          movie,
          score: prediction.probability,
          confidence: prediction.confidence,
          explanation: this.explainPrediction(prediction)
        };
      })
    );
    
    // 4. Сортировка и фильтрация
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}
```

## Персонализация

### Настройки пользователя
```typescript
interface RecommendationSettings {
  minRating: number;              // Минимальный рейтинг (5.0)
  preferHighRating: boolean;      // Предпочитать высокий рейтинг (true)
  avoidRewatches: boolean;        // Исключать пересмотры (false)
  preferUnwatched: boolean;       // Приоритет непросмотренного (true)
  noveltyWeight: number;          // Вес новизны (1.0)
  randomnessWeight: number;       // Вес случайности (1.0)
  includeWant: boolean;           // Включать "Хочу посмотреть" (true)
  includeWatched: boolean;        // Включать "Уже просмотрено" (true)
  includeDropped: boolean;        // Включать "Брошено" (false)
}
```

### Адаптивное обучение
```typescript
class AdaptiveLearning {
  async updateModel(userId: string, feedback: RecommendationFeedback) {
    // 1. Обновить вектор пользователя
    await this.updateUserEmbedding(userId, feedback);
    
    // 2. Скорректировать веса алгоритма
    await this.adjustAlgorithmWeights(userId, feedback);
    
    // 3. Переобучить нейронную сеть
    if (this.shouldRetrain()) {
      await this.retrainModel();
    }
    
    // 4. Логировать для анализа
    await this.logFeedback(feedback);
  }
}
```

## A/B тестирование

### Эксперименты
```typescript
interface AlgorithmExperiment {
  id: string;
  experimentId: string;           // "v2_weighted_genre_boost"
  name: string;
  description: string;
  algorithmVersion: string;       // "v2_weighted", "v3_neural"
  variantLabel: string;           // "control", "treatment"
  algorithmConfig: object;        // Конфигурация алгоритма
  status: 'draft' | 'active' | 'completed';
  trafficAllocation: number;      // % трафика
  targetingCriteria: object;      // Критерии таргетинга
  successMetrics: object;         // Метрики успеха
}
```

### Метрики экспериментов
- **Conversion Rate**: % принятых рекомендаций
- **Time to Action**: время до первого действия
- **User Satisfaction**: средняя оценка рекомендаций
- **Diversity**: разнообразие рекомендаций
- **Novelty**: новизна контента

## Аналитика и метрики

### Ключевые метрики
```typescript
interface RecommendationMetrics {
  dailyActiveUsers: number;
  recommendationsShown: number;
  acceptanceRate: number;        // % принятых рекомендаций
  averageTimeToAction: number;    // среднее время до действия
  filtersChangedCount: number;    // количество изменений фильтров
  modalOpenedCount: number;       // открытий модального окна
  newUsers: number;
  returningUsers: number;
}
```

### Воронка рекомендаций
```
Показ рекомендаций (100%)
    ↓
Открытие карточки (45%)
    ↓
Добавление в список (15%)
    ↓
Просмотр фильма (8%)
    ↓
Оценка фильма (5%)
```

### Качество рекомендаций
```sql
-- Conversion Rate по алгоритмам
SELECT 
  algorithm,
  COUNT(*) as total_shown,
  COUNT(CASE WHEN action = 'accepted' THEN 1 END) as accepted,
  COUNT(CASE WHEN action = 'accepted' THEN 1 END) * 100.0 / COUNT(*) as conversion_rate
FROM recommendation_logs
WHERE shownAt > NOW() - INTERVAL '7 days'
GROUP BY algorithm;

-- Среднее время до принятия
SELECT 
  algorithm,
  AVG(EXTRACT(EPOCH FROM (updated_at - shown_at))) as avg_seconds_to_accept
FROM recommendation_logs
WHERE action = 'accepted'
  AND shownAt > NOW() - INTERVAL '7 days'
GROUP BY algorithm;
```

## Обратная связь

### Типы обратной связи
```typescript
interface RecommendationFeedback {
  recommendationLogId: string;
  action: 'accepted' | 'skipped' | 'filtered' | 'reported';
  explicitRating?: number;       // 1-5 оценка рекомендации
  implicitSignals: IntentSignal[];
  contextualFactors: object;
  correctiveAction: object;       // предложенные корректировки
}
```

### Негативная обратная связь
```typescript
interface NegativeFeedback {
  feedbackType: 'explicit_negative' | 'implicit_skip' | 'filter_override';
  detailedReason: 'wrong_genre' | 'already_watched' | 'low_rating' | 'not_interested';
  severity: number;               // 0-1 серьезность
  contextualFactors: object;
  correctiveAction: {
    suggestedWeightAdjustment: object;
    suggestedFilterAdjustment: object;
    confidence: number;
    applied: boolean;
  };
}
```

## Оптимизация производительности

### Кэширование
```typescript
class RecommendationCache {
  // Кэш пользовательских рекомендаций
  async getUserRecommendations(userId: string): Promise<Recommendation[]> {
    const cacheKey = `recs:${userId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const recommendations = await this.generateRecommendations(userId);
    await redis.setex(cacheKey, 3600, JSON.stringify(recommendations)); // 1 час
    
    return recommendations;
  }
  
  // Кэш похожих фильмов
  async getSimilarMovies(tmdbId: number): Promise<number[]> {
    const cacheKey = `similar:${tmdbId}`;
    const cached = await redis.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    const similar = await this.calculateSimilarity(tmdbId);
    await redis.setex(cacheKey, 86400, JSON.stringify(similar)); // 24 часа
    
    return similar;
  }
}
```

### Batch рекомендации
```typescript
class BatchRecommendationProcessor {
  async processBatchRecommendations() {
    // 1. Найти активных пользователей
    const activeUsers = await this.getActiveUsers();
    
    // 2. Генерировать рекомендации пакетами
    const batches = chunk(activeUsers, 100);
    
    for (const batch of batches) {
      await Promise.all(
        batch.map(user => this.generateAndCacheRecommendations(user.id))
      );
    }
    
    // 3. Обновить метрики
    await this.updateRecommendationMetrics();
  }
}
```

## Будущее развитие

### Планируемые улучшения
1. **Graph Neural Networks** для учета социальных связей
2. **Multi-armed bandits** для динамического баланса exploration/exploitation
3. **Reinforcement learning** для долгосрочной оптимизации
4. **Cross-domain recommendations** (книги, музыка)
5. **Real-time personalization** с streaming данными

### Исследования
- **Cold start problem** для новых пользователей
- **Diversity-aware recommendations**
- **Explainable AI** для прозрачности рекомендаций
- **Fairness and bias mitigation**
- **Long-term satisfaction prediction**

## Траблшутинг

### Частые проблемы
1. **Low conversion rate** - проверить качество данных
2. **Overfitting** - увеличить регуляризацию
3. **Cold start** - использовать content-based подход
4. **Filter bubble** - добавить diversity constraints

### Диагностика
```python
# Анализ качества рекомендаций
def analyze_recommendation_quality():
  metrics = {
    'precision_at_k': calculate_precision_at_k(),
    'recall_at_k': calculate_recall_at_k(),
    'ndcg_at_k': calculate_ndcg_at_k(),
    'coverage': calculate_catalog_coverage(),
    'diversity': calculate_diversity(),
    'novelty': calculate_novelty()
  }
  return metrics
```
