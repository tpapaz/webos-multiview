# C1 test journal

Updated 2026-11-12. LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
[Current status](../../STATUS.md) · [Current test plan](current-plan.md) · [Documentation index](../README.md)

This is the compact record of **actual TV results**. Original machine reports,
hashes and owner observations are unchanged; full commands/diagnosis are archived
below. Past runs authorize no repeats. Local simulations are not TV evidence.

## Phase 0

2026-11-10: passive probe 0.1.0 passed after a local-asset CSP fix. Metadata,
remote navigation, Close to Home and uninstall worked; owner confirmed normal
HDMI picture/sound afterward. On-TV file export and in-flight cancellation
remain unknown. Report: `build/reports/c1-web.report.json`. [Detail](archive/lg-c1-phase-0.md).

## Phase 1

Local synthetic video files only; these results establish no physical HDMI path.

| Test, 2026-11-10–11 | Result and limitation |
|---|---|
| Default-main SMP, browser/NDL and mixed comparisons | Did not establish the desired independently live combination. Native resource traces attributed MAIN_SCALER contention to B startup. |
| NDL 0.1.1 solo | Owner confirmed visibly advancing playback; packet acceptance alone was not treated as visual proof. Cleanup/exit confirmed. |
| Explicit SMP `main_video` + `sub_video` | **Verified:** both clocks advanced, B geometry changed independently, A continued after B release. |
| Endurance 0.1.0 | Smoke and 20-cycle repetition passed; first five-minute attempt was interrupted. This does not validate later builds' repeatability. |
| Endurance 0.1.1 | Five-minute retry passed telemetry with owner spot checks; 30-minute overlap was reached, but recovery was interrupted/failed at a focus/screensaver transition. |
| Veto 0.1.2 | Smoke aborted before playback; not a playback/recovery pass. |
| Veto 0.1.3 | Short smoke passed (8.056 s overlap, 3.049 s A recovery, cleanup/exit). Request probe ended after 60.022 s without a request: **inconclusive**, no effective inhibition proved. |

Phase 1 remains partial: audio focus, wider geometry, final-build repeatability
and full recovery are open/deferred. Screensaver work is closed for this scope.
[Full journal, reports and build hashes](archive/lg-c1-phase-1.md).

## Admission app

2026-11-11–12: 0.1.0 had a normal-launch stdout capture gap; 0.1.1 returned Home
at its launcher-argument guard without producing a report. Version 0.1.2 accepted
launcher metadata and registered its dedicated identity, then the first hub
permission query returned **allowed: false** (13 ms). No IWC list/setter ran.
Report recovered; self-reported cleanup and observed process absence. Retained
exit records show normal failure exits, not crash signals. Zero candidate counts
were defaults, not HDMI observations. No relaunch is queued. [Detail](archive/c1-admission-preflight.md).

## Root read 001

2026-11-12: actual stock `luna-send` listing **passed**, zero publications/HDMI
candidates, exit 0 and cleanup confirmed, 401 ms. Visible input unknown; this
does not prove absent HDMI receivers. App stayed closed. [Detail](archive/c1-iwc-root-read-001.md).

## Root read 002

2026-11-12: after owner-selected stable live HDMI, listing **passed**, one total
publication/HDMI-app candidate, exit 0 and cleanup confirmed, 449 ms. Owner later
confirmed HDMI 4, normal view/motion/sound. Exported counts contain no reusable
target or logical dimensions. No input/geometry change. [Detail](archive/c1-iwc-root-read-002.md).

## Native normal

2026-11-12: fake-worker normal control **passed**. Helper 284 ms; reply validated,
actor/worker reaped, launcher exit 0, no survivors, stage removed without host
rescue. App absent before/after; zero IWC calls. Owner confirmed normal viewing
afterward; before/during unknown. [Detail](archive/c1-lifecycle-normal-001.md).

## Native control EOF

2026-11-12: fake-worker control loss **passed**. Host sent stdin EOF at 128 ms;
native helper observed loss, cancelled/reaped both children and finished in
108 ms (different clock origin), exit 0. No survivors; stage removed without
host rescue. Both SSH connections remained up. App absent; zero IWC calls;
owner confirmed normal picture/motion/sound before and after. This proves no
whole-transport/app survival or HDMI recovery. [Detail](archive/c1-lifecycle-control-loss-001.md).

## Report identities

Paths below are local/ignored. Owner observations remain separate beside their
reports. Earlier Phase 0/1 report paths and all package/ELF hashes remain in the
linked archive; no original hash has been replaced or regenerated.

| Evidence | Original path / SHA-256 |
|---|---|
| App run 002 | `build/phase-2/admission-run-002/capture.json`; captured report hash `77d505bea2da1ca42b1a672a33aca7b24951365a9f73736e070865c65907896c` |
| Root read 001 | `build/phase-2/iwc-root-read-001/report.json`; `b402a29bf3f25d815e0f96d8399cd0b2202fdd2e2e71ff08f523131da44c86bf` |
| Root read 002 | `build/phase-2/iwc-root-read-002/report.json`; `3e46d5953b2aa0928581e3f1ebb6261c5d6ffd93c43dbe930309389d44e2e695` |
| Normal control | `build/phase-2/lifecycle-c1-normal-001.json`; `1bcae74a7dee81bf8af005c3189f765c64e75ef21d073ff5f58c6806c249e053` |
| Control EOF | `build/phase-2/lifecycle-c1-control-loss-001.json`; `718d53e62b4aea4b80fce5370c57e37f052281f1e8c671173902ff284cb000fe` |
| Native helper | `build/phase-2/lifecycle-arm/multiview-lifecycle`; `375e17c98229221392a98fc11ffacadfb713dd50a09b1d425002af0dcb07bec0` |

## Current conclusion and archive

**Verified:** local main/sub playback, root listing and normal/EOF fake-process
lifecycle. **Unknown:** actual setter admission, applied reset ordering, HDMI
resize/recovery and simultaneous HDMI 1 + 2. Active geometry/crop remains
**unsafe_to_test under the current recovery contract**. [Remaining gates](../research/c1-iwc-gates-after-lifecycle.md).

The [archived lifecycle-only plan](archive/c1-lifecycle-only-plan.md) is completed
history; no further generic lifecycle case is queued. Every former device-test
file is retained under `archive/`, including its original commands, hashes and
limits. Use the single [current plan](current-plan.md) for the proposed next test.
Append short results here after future authorized runs; keep raw reports immutable.
