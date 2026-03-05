---
description: "Execute current GSD phase with full TDD cycle per task"
agent: gsd-tdd-orchestrator
---

Выполни текущую фазу GSD через полный TDD-цикл.

Для каждой задачи с кодом:
Acceptance Spec → Acceptance Code → Unit Spec → Red → Green → Refactor → Docs → Intent Verify → Technical Verify

Для задач без кода (docs, config, assets) — выполняй стандартно.

Текущий план фазы (читай планы из текущей фазы):
```bash
cat .planning/STATE.md
ls .planning/phases/
# Читай PLAN файлы текущей фазы:
# cat .planning/phases/<N>-<name>/<N>-<NN>-PLAN.md
```

$ARGUMENTS
