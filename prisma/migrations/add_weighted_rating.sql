-- Миграция для добавления поля weightedRating в таблицу WatchList
-- Выполнить в продакшн базе данных когда она будет доступна

-- Шаг 1: Добавляем новую колонку с разрешением NULL
ALTER TABLE "WatchList" ADD COLUMN "weightedRating" Float;

-- Шаг 2: Создаем индекс для оптимизации запросов
CREATE INDEX "WatchList_weightedRating_idx" ON "WatchList"("weightedRating");

-- Примечание: Заполнение существующих данных НЕ требуется
-- Новое поле будет NULL для существующих записей
-- Код будет использовать fallback логику: weightedRating ?? userRating

-- Проверка результата:
SELECT COUNT(*) as total_records, 
       COUNT(weightedRating) as records_with_weighted_rating,
       COUNT(userRating) as records_with_user_rating
FROM "WatchList";
