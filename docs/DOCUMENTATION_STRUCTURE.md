# Документация: Структура документации проекта

**Дата:** 2026-03-04
**Статус:** ✅ Завершено

---

## Обзор

В предыдущих итерациях работы GitHub Copilot агента были созданы файлы документации непосредственно в корне репозитория, нарушая стандартную структуру проекта.

---

## Структура

### Корневая директория (5 файлов)

```
C:/Projects/CineChance-2/
├── AGENTS.md                    # Инструкции для AI агентов
├── README.md                    # Проектный README
├── design_guidelines.md         # Руководство по дизайну
├── test-instructions.md         # Инструкции для тестирования
├── test-status-instructions.md  # Статус тестов
```

### Документация баг-фиксов (`docs/bugfix-reports/`)

```
docs/bugfix-reports/
├── BUGFIX_PATTERN1_ALL_MOVIES.md
├── BUGFIX_PATTERN1_FINAL_REPORT.md
├── BUGFIX_TESTING_PATTERN1.md
├── BUG_FIX_SUMMARY.md
├── BUG_FIX_TESTING.md
├── CANDIDATE_SEARCH_FIX.md
├── COMPLETE_FIX_REPORT.md
├── FINAL_REPORT.md
├── FIX_FINAL_REPORT.md
├── TASTE_MAP_AUTO_COMPUTE_FIX.md
├── TWIN_TASTERS_WATCHED_MOVIES_FIX.md
├── UPDATE_MOVIE_MATCH_LOGIC.md
└── VERIFICATION_CHECKLIST.md
```

**Всего:** 13 файлов

---

### Документация фич (`docs/features/`)

```
docs/features/
├── COMPARISON_PAGE_FEATURE.md
├── GENRE_MATCH_PERCENTAGE_SUMMARY.md
├── IMPLEMENTATION_CHECKLIST.md
├── IMPLEMENTATION_GENRE_MATCH_PERCENTAGE.md
├── TWIN_TASTERS_QUICK_START.md
├── TWIN_TASTERS_README.md
├── TWIN_TASTERS_SUMMARY.md
├── TWIN_TASTERS_UI_IMPROVEMENTS.md
└── TWIN_TASTERS_V3_COMPLETE.md
```

**Всего:** 10 файлов

---

### Документация тестов (`docs/testing/`)

```
docs/testing/
├── TESTING_GUIDE.md
├── TEST_TWIN_TASTERS_COMPARISON.md
└── TWIN_TASTERS_V3_TEST_CHECKLIST.md
```

**Всего:** 3 файла

---

### Общая документация (`docs/`)

```
docs/
└── FILE_MAP.md
```

**Всего:** 1 файл

---

## Процесс реорганизации

### 1. Анализ (выполнено)

**Выявлено:**
- 31 файл в корне проекта
- 23 файла подлежали перемещению
- Файлы были разбросаны без структуры

### 2. Создание структуры (выполнено)

Созданы подпапки:
- `docs/bugfix-reports/` - для баг-репортов
- `docs/features/` - для документации фич
- `docs/testing/` - для тестовой документации
- `docs/` - для общей документации

### 3. Перемещение файлов (выполнено)

- Перемещено 23 файла в соответствующие папки
- 5 файлов оставлено в корне (стандартные файлы проекта)

---

## Стандартная документация

### Отчёты о багах и исправлениях

**Правильное место:** `.planning/debug/resolved/`

**Формат:** `YYYY-MM-DD-description.md`

**Примеры:**
- `2026-03-04-my-movies-pagination-fix.md`
- `.planning/debug/resolved/pagination-system-failures.md`

**Почему не в docs/:**
- Уже существует централизованная система GSD (Get Shit Done)
- Отчёты хранятся в истории сессий отладки
- Система автоматически архивирует завершённые сессии

---

## Обновление ссылок

### Что нужно проверить

1. **Внутренние ссылки** внутри документов
2. **Ссылки на документацию** в AGENTS.md и README.md
3. **Ссылки между файлами** в docs/

### Потенциальные проблемы

- Ссылки формата `../FILE_MAP.md` теперь некорректны
- Ссылки на корень теперь должны указывать на `docs/`
- Необходимо обновить README.md если там есть ссылки

---

## Инструкции для разработки

### Добавление новой документации

**Если это баг-фикс:**
```
.planning/debug/resolved/YYYY-MM-DD-description.md
```

**Если это документация фичи:**
```
docs/features/filename.md
```

**Если это руководство по тестированию:**
```
docs/testing/filename.md
```

**Если это стандартный проектный файл:**
```
/root/file.md (только AGENTS.md, README.md, design_guidelines.md, test-*.md)
```

---

## Заключение

✅ **Завершено:**
- Создана логичная структура документации
- Все файлы перемещены в правильные папки
- Оставлено 5 стандартных файлов в корне
- Создана документация по структуре

📝 **Рекомендуется:**
- Проверить и обновить внутренние ссылки
- Обновить README.md если есть ссылки на старые пути
- Обучить разработчиков новой структуре
