# TDD Protocol Reference v3
# Подключается к plan-phase — планировщик учитывает TDD и Research

## Пайплайн фазы

```
/gsd-research <N>        ← ОБЯЗАТЕЛЬНО перед plan-phase
/gsd-plan-phase <N>      ← план с TDD чеклистом
/gsd-tdd-execute         ← полный цикл на каждую задачу
/gsd-tdd-verify          ← intent + технические проверки
```

## Расширение плана для задач с кодом

```markdown
### Задача: <название>
**Файлы:** src/... (из RESEARCH.md — точки интеграции)
**Тест-файл:** src/.../name.test.ts
**Acceptance:** tests/acceptance/feature.acceptance.test.ts

**TDD чеклист:**
- [ ] RESEARCH.md прочитан, риски учтены
- [ ] Acceptance spec создан (.planning/tdd/acceptance-spec-*.md)
- [ ] E2E тесты написаны
- [ ] Unit spec создан (.planning/tdd/spec-*.md)
- [ ] RED подтверждён (git commit: test: RED)
- [ ] GREEN подтверждён (git commit: feat: GREEN)
- [ ] REFACTOR завершён (git commit: refactor:)
- [ ] Intent verified — оригинальная идея реализована
- [ ] TypeScript: 0 errors
- [ ] Покрытие >= 80% новых файлов
- [ ] Регрессии: существующие тесты не сломаны
```

## Модели и роли

| Роль | Модель | Источник |
|---|---|---|
| Orchestrator | `stepfun/step-3.5-flash:free` | OpenRouter |
| Researcher | `qwen3-235b-a22b-thinking-2507` | OpenRouter $0 |
| Acceptance Spec | `qwen3-235b-a22b-thinking-2507` | OpenRouter $0 |
| Acceptance Code | `stepfun/step-3.5-flash:free` | OpenRouter |
| Unit Spec | `qwen3-235b-a22b-thinking-2507` | OpenRouter $0 |
| **Red + Green** | **minimax/minimax-m2.5** | API ⚠️ лимит |
| Refactor | `stepfun/step-3.5-flash:free` | OpenRouter |
| Docs | `big-pickle` | OpenCode |
| Debug + TDD Verifier | `glm-4.7-flash` | API |
| Intent Verifier | `qwen3-235b-a22b-thinking-2507` | OpenRouter $0 |
| **Fallback (всё)** | `nemotron-3-nano-30b-a3b:free` | OpenRouter |

## MCP серверы

| Сервер | Используется в |
|---|---|
| `sequential-thinking` | Researcher, Planner, Intent Verifier |
| `context7` | Researcher (документация зависимостей) |

## Лимит MiniMax M2.5

Используется ТОЛЬКО для Red и Green.
При исчерпании → fallback: `stepfun/step-3.5-flash:free`
Фиксировать в: `.planning/tdd/session-log.md`
