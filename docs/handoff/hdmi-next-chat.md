# Continue webOS MultiView

Updated 2026-11-12. Workspace: `D:\Development\webos-multiview`.

## Start here

1. Read [Status](../../STATUS.md) for the current result and single next task.
2. Follow [contributor instructions](../../AGENTS.md) and [safety rules](../safety.md).
3. Read the single [current plan](../device-tests/current-plan.md), the
   [focused acquisition trace](../research/c1-hdmi-interface-map.md#focused-acquisition-and-owned-window-review--2026-11-12)
   and [prototype contract](../../native/phase2-hdmi-window/README.md).
4. Use the [documentation index](../README.md) for a specific test/source record.

The [roadmap](../../ROADMAP.md) holds product phases. The
[old chronological handoff](hdmi-history-2026-11-12.md) is preserved for history,
not as an instruction list. Do not require another full historical review to
resume the selected task.

## Current continuation boundary

The three-call IWC preflight is **paused by owner direction**. Focus on UTP
acquisition/window binding and the smallest direct HDMI prototype. Saved C1
client evidence establishes export → assigned window ID → UTP open → numbered
port selection. `native/phase2-hdmi-window/` implements one owned fixed window
and HDMI 4, with explicit opt-in, bounded observation and stop/close/release.
It is locally ARM-built, host acceptance-tested and direct-executable ABI checked;
it is not packaged, simulator-tested, TV-tested or device-ready.

Own-caller UTP admission, server allocation/cleanup (including open-without-ID)
and hardware restoration remain unknown. A distinct window ID is presentation
identity, not a second HDMI receiver or SUB_SCALER grant. Resolve or explicitly
bound these questions before proposing the first normal-exit picture test.
Then test two independent physical sources in fixed windows; add controls only
after concurrency works. Do not restart generic normal/EOF or IWC infrastructure
work. Existing helpers remain fake-only and supply no UTP cleanup guarantee.

No TV operations or permission changes are authorized. Keep the diagnostic apps closed.
No stock-window geometry/crop, automatic input
switching, persistent daemon, service restart or new privileged generic endpoint.
A past authorization applies to its completed run, not another run. No further
TV execution is authorized merely by this handoff. Screensaver/Glasshouse work
and Phase 1 repeat campaigns remain outside the current scope.

## Workspace and evidence map

| Path | Purpose |
|---|---|
| `native/phase2-admission/` | Installed app diagnostic; named registration worked, first policy query denied. No relaunch queued. |
| `native/phase2-hdmi-window/` | Minimal direct UTP/owned-export candidate; default launch inert, explicit HDMI-4 opt-in only. Local build/tests; no TV execution. |
| `scripts/iwc-diagnostic.cjs`, `scripts/collect-iwc-diagnostic.cjs` | Fixed stock-utility listing collector, counts only; root reads 001/002 passed. |
| `scripts/iwc-recovery-model.cjs` | Pure local simulation; real arming gates remain unresolved. |
| `scripts/iwc-local-process-harness.cjs` | Host Linux fake-worker process harness. |
| `native/phase2-lifecycle/` | Fake-worker C helper; normal/EOF C1 controls passed. No real IWC exec path. |
| `scripts/lifecycle-controller.cjs`, `scripts/run-native-lifecycle.cjs` | Fixed normal/EOF staging/capture; do not use live flags during local development. |
| `scripts/phase1-device.cjs` | Existing root SSH profile interface. Consume it without displaying profile, key or network identifiers. |
| `build/phase-2/` | Ignored original reports, separate owner observations, ABI records and saved firmware/runtime evidence. Exact paths/hashes are in the linked records. |
| `native/phase1*`, `dist/`, `build/reports/` | Retained local-video controls and original Phase 1 evidence. Preserve them. |

Before a device-related change, read the relevant device record and
[build guide](../build.md). Use cached sources and saved evidence before another
TV retrieval. Never export raw publication IDs, unrestricted logs, credentials,
profile/network identifiers or proprietary firmware copies.

## Tooling and workflow

Use PowerShell on Windows. Linux-native tests and ARM builds use the existing
Ubuntu WSL SDK:
`/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot`.
Existing Linux Node 22:
`/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node`.
C1 applications use ARM32 soft-float with `/lib/ld-linux.so.3`; the aarch64 kernel
does not establish aarch64 application ABI. Verify every new artifact.

Use the existing uncommitted working tree. Never reset it, create a replacement
checkout/worktree, commit, push or invoke GitHub Actions. Keep tests tied to
business/acceptance rules. Run relevant checks for the actual change, record
commands/outcomes, and finish with a suggested commit message. No dev server is
needed; close any server you start and leave pre-existing servers untouched.

Update Status when evidence or the selected task changes. Append a concise
result to the [C1 journal](../device-tests/c1-journal.md) after an authorized run;
keep original machine reports immutable and owner observations separate. Maintain
one current plan, not a Markdown file per run. Historical detail is archived.
Do not append chronological progress to this handoff or the roadmap.
