# Where we are

Updated 2026-11-12. **Start here. This is the current project status and next task.**
Dated research notes and test records preserve history; their old “next steps”
do not override this page. [All documentation](docs/README.md).

## The goal and current position

We want **two independently live HDMI inputs**, movable/resizable in PiP or
split screen on the TV's own hardware.

**We have not demonstrated dual HDMI, or moving/resizing HDMI through our
application.** We have research tools and some proven building blocks. We are
in **Phase 2: HDMI acquisition and application-owned window research** on the rooted
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
| Direct UTP acquisition/window client path | **Verified/static:** the stock frontend exports its own window and passes its assigned ID to `utp.extinputs/open`, then selects a numbered HDMI port. A minimal single-HDMI candidate is locally ARM-built and host-tested; direct executable ABI checked. **Not packaged or TV-tested.** | [Acquisition trace](docs/research/c1-hdmi-interface-map.md#focused-acquisition-and-owned-window-review--2026-11-12), [prototype](native/phase2-hdmi-window/README.md) |
| HDMI resize/crop/reset, ordered hardware recovery, simultaneous HDMI 1 + 2 | **Unknown / not TV-tested.** Active geometry/crop is unsafe to test under the current recovery contract. | [Remaining gates](docs/research/c1-iwc-gates-after-lifecycle.md) |

The helper tests were useful because recovery must survive controller failure.
They tested processes and cleanup, **not HDMI picture control or recovery**.

## One next task

**Advance the single-HDMI application-owned window candidate toward its first
owner-authorized picture test.** The three-call read-only IWC preflight is
**paused**; no real-IWC-worker integration or more generic recovery machinery is
queued. The milestone is one live physical HDMI source in our fixed window,
then two independently live HDMI 1 + HDMI 2 sources, then product controls.

The saved client path is concrete enough for a minimal candidate: one export,
one UTP open bound to that export, explicit HDMI 4 selection, eight seconds of
observation, then owned-pipeline stop/close and local release. Default launch
does no graphics/IPC; acquisition requires explicit opt-in. The current source
is fixed to HDMI 4 because that is the owner's last confirmed connection.

**Readiness: locally built and acceptance-tested, direct executable ABI checked;
not packaged, simulator-tested, TV-tested or approved for execution.** Remaining
questions are own-caller UTP admission, allocation/reclamation and hardware
restoration, especially an open timeout with no returned pipeline ID. Saved
client/connector evidence does not resolve these server behaviors or the second
port's receiver/scaler allocation. Record these limits before proposing a bounded
normal-exit test; do not extend the old IWC recovery contract to this new path.
[Single current plan](docs/device-tests/current-plan.md).

## What still blocks an HDMI geometry test

- A fresh, unique HDMI target and logical full-view baseline; old report IDs
  cannot be reused, and panel/signal pixels cannot substitute for app coordinates.
- Actual setter admission/application. A successful permission prediction alone
  would not prove either.
- Ordered action/reset application and observable recovery. The inspected
  interface has no applied-geometry acknowledgment. Lifecycle passes cannot
  supply that missing guarantee.

These remain limits of the paused stock-window IWC route. The new candidate
positions only its own export; it never lists or modifies the stock publication.
That avoids an IWC takeover but does **not** prove safe UTP acquisition/release.

## Boundaries and where to resume

Keep the diagnostic apps closed. No TV operations, permission edits, automatic
input switching or stock-window geometry/crop experiments are authorized.
Each future TV operation needs explicit owner scope;
past runs do not authorize a repeat. No new TV run is authorized by this page.

Screensaver work is closed for this scope, with effective inhibition unknown.
Glasshouse/Home is separate. Phase 1 gaps are deferred, not passed. A dual-port
test also needs a second source and an evidenced independent input path.

- [Handoff](docs/handoff/hdmi-next-chat.md): short instructions for continuing work.
- [C1 journal](docs/device-tests/c1-journal.md): compact actual TV results and archive links.
- [Current plan](docs/device-tests/current-plan.md): acquisition candidate, readiness limits and future acceptance gates.
- [Roadmap](ROADMAP.md): product phases and acceptance criteria.
- [Documentation index](docs/README.md): test evidence, tools and research history.
- [Build guide](docs/build.md): local SDK/toolchain and retained controls.

Update this page when a test result or the selected next task changes. Keep
exact logs/hashes in original reports and exceptional diagnosis in the archive.
