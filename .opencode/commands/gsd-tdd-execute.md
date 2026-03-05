---
description: "Execute GSD phase with full TDD cycle per task. Usage: /gsd-tdd-execute 19"
agent: gsd-tdd-orchestrator
---

Выполни фазу **$ARGUMENTS** через полный TDD-цикл.

Прочитай планы фазы:
```bash
ls .planning/phases/ | grep "^$ARGUMENTS-"
cat .planning/phases/$ARGUMENTS-*/[0-9]*-PLAN.md
```

Для каждой задачи с кодом из планов фазы:
Acceptance Spec → Acceptance Code → Unit Spec → Red → Green → Refactor → Docs → Intent Verify → Technical Verify

Для задач без кода (docs, config, assets) — выполняй стандартно.
