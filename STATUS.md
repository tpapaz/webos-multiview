# Where we are

Updated 2026-11-12. **Start here. This is the current project status and next task.**
Dated research notes and test records preserve history; their old “next steps”
do not override this page. [All documentation](docs/README.md).

## The goal and current position

We want **two independently live HDMI inputs**, movable/resizable in PiP or
split screen on the TV's own hardware.

**We have not demonstrated dual HDMI, or moving/resizing HDMI through our
application.** We have research tools and some proven building blocks. We are
in **Phase 2: read-only HDMI discovery and recovery preparation** on the rooted
LG C1, firmware 03.53.45 / SDK 6.5.3. One HDMI source is connected; the owner
last identified it as HDMI 4.

## What has actually been proved

| Work | Current result | Evidence |
|---|---|---|
| Two local video files on separate main/sub surfaces | **Verified on TV**, including B geometry and A continuity. Phase 1 still has audio/repeatability/recovery gaps. This does not prove HDMI support. | [Phase 1 journal](docs/device-tests/c1-journal.md#phase-1) |
| Ordinary admission app 0.1.2 | **Verified registration, then denied** at its first permission query. It exited; it did not list or modify HDMI windows. | [App record](docs/device-tests/c1-journal.md#admission-app) |
| Stock root utility reading HDMI window information | **Verified on TV.** One HDMI-app publication found while live HDMI was selected. Report retained counts, not usable target IDs or dimensions. | [Root read 002](docs/device-tests/c1-journal.md#root-read-002) |
| Temporary native helper: normal completion | **Verified on TV.** Fake worker completed; children reaped; helper exited; files/processes cleaned up. | [Normal control](docs/device-tests/c1-journal.md#native-normal) |
| Temporary native helper: loss of control stdin | **Verified on TV.** It observed EOF, cancelled fake work and cleaned up without host rescue. Both SSH connections stayed up. | [Control EOF](docs/device-tests/c1-journal.md#native-control-eof) |
| HDMI resize/crop/reset, ordered hardware recovery, simultaneous HDMI 1 + 2 | **Unknown / not TV-tested.** Active geometry/crop is unsafe to test under the current recovery contract. | [Remaining gates](docs/research/c1-iwc-gates-after-lifecycle.md) |

The helper tests were useful because recovery must survive controller failure.
They tested processes and cleanup, **not HDMI picture control or recovery**.

## One next task

**Implement and locally validate one supervised, read-only IWC preflight.**
IWC is the TV service through which the stock HDMI app exposes window control.
The listing utility and fake-worker supervisor worked separately; this step
combines the supervisor with the real stock utility and adds baseline detail.

The proposed single TV test has three fixed requests:

1. Ask the hub whether the actual stock utility's own identity may list windows.
2. Ask whether it may call `setExportedWindow`. This is permission-query data;
   **no setter is invoked**.
3. Read the selected HDMI publication and report its port and published logical
   dimensions, keeping live IDs private.

**Readiness: plan ready; real-worker adapter not implemented, built or TV-tested.**
The existing native helper has fake workers only. Next implement the focused
adapter, test it locally, and ABI-check it against saved runtime evidence.
Then one new owner-authorized TV run can test it. No more generic normal/EOF
helper work is queued. [Single current test plan](docs/device-tests/current-plan.md).

## What still blocks an HDMI geometry test

- A fresh, unique HDMI target and logical full-view baseline; old report IDs
  cannot be reused, and panel/signal pixels cannot substitute for app coordinates.
- Actual setter admission/application. A successful permission prediction alone
  would not prove either.
- Ordered action/reset application and observable recovery. The inspected
  interface has no applied-geometry acknowledgment. Lifecycle passes cannot
  supply that missing guarantee.

The next read-only preflight advances the first two investigations and real
worker integration. It does **not** automatically clear the geometry gate.

## Boundaries and where to resume

Keep the app closed. No permission edits, automatic input switching or active
geometry/crop experiments. Each future TV operation needs explicit owner scope;
past runs do not authorize a repeat. No new TV run is authorized by this page.

Screensaver work is closed for this scope, with effective inhibition unknown.
Glasshouse/Home is separate. Phase 1 gaps are deferred, not passed. A dual-port
test also needs a second source and an evidenced independent input path.

- [Handoff](docs/handoff/hdmi-next-chat.md): short instructions for continuing work.
- [C1 journal](docs/device-tests/c1-journal.md): compact actual TV results and archive links.
- [Current test plan](docs/device-tests/current-plan.md): one procedure for the proposed next test.
- [Roadmap](ROADMAP.md): product phases and acceptance criteria.
- [Documentation index](docs/README.md): test evidence, tools and research history.
- [Build guide](docs/build.md): local SDK/toolchain and retained controls.

Update this page when a test result or the selected next task changes. Keep
exact logs/hashes in original reports and exceptional diagnosis in the archive.
