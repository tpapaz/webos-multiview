# Continue webOS MultiView

1. Read [Status](../../STATUS.md) for the installed versions, readiness and single next task.
2. Read the [research history](../research/c1-hdmi-evidence-ledger.md#research-history) for why native dual HDMI paused, why JS was tried, why the connector move paused and how receiver allocation became the active question. Follow the linked trial or firmware finding when you need the underlying evidence.
3. For receiver work, use the [offline acceptance criteria](../device-tests/current-plan.md#offline-acceptance-criteria), the [firmware trace](../research/c1-hdmi-interface-map.md#where-does-the-separate-receiver-get-its-index) and the [existing TVRM decoder](../../scripts/hdmi-receiver-decoder.cjs). The [stock HDMI 1 ownership capture](../device-tests/c1-journal.md#hdmi-1-selected-with-the-lg-remote) and [HDMI 1 reconnect](../device-tests/c1-journal.md#hdmi-1-reconnect-under-observation) are separate runs. Only correlate identifiers within their recorded session.
4. Before preparing an experiment, read the [contributor rules](../../AGENTS.md), [scope decision](../decisions/0003-close-idle-work-resume-hdmi.md), [device procedure](../device-tests/current-plan.md), [safety rules](../safety.md) and [build guide](../build.md).
5. Before ending a task, follow the [documentation update rules](../README.md#keeping-the-record-current).

Detailed pre-consolidation C1 notes are retained locally in `build/publication-review-c1-20261118/originals/`. Use the [device journal](../device-tests/c1-journal.md) to locate actual outcomes and original receipts.
