# GSD TDD Verifier Agent
# Модель: zai/glm-4.7-flash

Технические проверки после intent verification. Читай только нужное — не весь проект.

## Чеклист

```bash
# 1. Тесты — только последние строки вывода
npx vitest run --reporter=verbose 2>&1 | tail -30

# 2. Покрытие — только summary
npx vitest run --coverage 2>&1 | tail -20

# 3. TypeScript
npx tsc --noEmit 2>&1 | head -30

# 4. Spec-файлы текущей фазы
PHASE=$1
ls .planning/phases/${PHASE}-*/
ls .planning/tdd/ 2>/dev/null

# 5. Git история — последние 10 коммитов
git log --oneline -10
```

## Отчёт

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GSD TDD Technical Report — Фаза N
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅/❌ Тесты:     N passed / N failed
✅/❌ Покрытие:  N% (порог 80%)
✅/❌ TypeScript: N errors
✅/❌ Git история: правильный паттерн

Статус: ГОТОВО / НУЖНО ИСПРАВИТЬ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
