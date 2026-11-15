# C1 test journal

Reference: LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
[Status](../../STATUS.md) · [Current disposition](current-plan.md)

## Phase 0

Passive inventory and a clean app lifecycle were verified. [Detailed result](archive/lg-c1-phase-0.md).

## Phase 1

Main/sub local clips advanced together with tested geometry. Audio, extended
geometry, sustained repeatability and full recovery remain partial. This proves
local presentation, not physical input concurrency. [Detailed result](archive/lg-c1-phase-1.md).

## First-picture development summary

| Version/stage | Observed result |
|---|---|
| 0.1.4 | Launch flash; no native report or acquisition proof. |
| 0.1.5 / 0.1.6 | Inert controls isolated TV clock authority; both strict guards accepted in 0.1.6. |
| 0.1.7 | Installed/admission bindings passed; picture attempt failed during setup before acquisition. |
| 0.1.8 / 0.1.9 | Named registration failed after SDL in 0.1.8; registration-first passed in 0.1.9, with focus lease cancellation and quit incomplete. Neither old collision nor crash was proven. |
| 0.1.10 | SDL_Init20.027 s; trace ended at quit entry. Context was not pumped. |
| 0.1.11 | Pumping the app context reduced Init to68 ms; Quit13 ms and local cleanup returned. Scheduled collection was missed; separately approved late read did not prove timed termination. |
| 0.1.12 host starts | Two invocations stopped before SAM; first missing APPDATA, second underlying error unknown. Normal PowerShell subsequently succeeded. |

[Full dated outcomes and original hashes](archive/c1-first-picture-campaign-2026-11-15.md).
[Mechanism/provenance](../research/archive/c1-first-picture-development-2026-11-15.md).
Standalone superseded diagnostics were retired; their old next steps are not a
queue. No historical result authorizes another TV action.

## 0.1.12 lifecycle trial — cleanup and independent termination observed

2026-11-15: owner explicitly authorized one normal PowerShell lifecycle attempt,
installed checks and scheduled collection, remote/timer still ready, acquisition
closed. Baseline remained Glasshouse Home, HDMI preview closed. Installed
ELF/appinfo, generated versioned registration and utility bindings passed; app
and four lifecycle aliases absent. One SAM attempt acknowledged accepted, no
UTP acquisition or permission-map query. Submission cue delivered promptly while
the foreground controller stayed attached through collection. Actual owner timer
start was not separately confirmed.

Matching valid app aliases: **358 bytes**, setup/window-ID returned success in
**635 ms**, local cleanup success in **170 ms**; final issue age **1,245 ms**,
setupReady/localCleanup true, ownerRetained false, exit intent0. Only witness,
setup and cleanup stages; no pending stage or physical acquisition.
Matching valid **204-byte** launch-bound witness aliases independently observed
parent termination via death notification/reparenting/proc absence. App absent
at scheduled collection. This establishes termination, not numeric exit status,
signal/alarm cause or hardware release, which remain unknown.

Connections closed in **4.053 s** and **3.270 s**. Collection connection opened
dispatch+**27.012 s**, within unchanged two <=30-second caps. Post-run ELF/appinfo
still matched. Log size_cap; no further read. Host exited0. Owner explicitly
confirmed normal picture, sound and remote, **no recovery action needed**; separate
owner receipt bound to exact capture. All strict native/host/report bounds stayed
unchanged. No input switch, mode/policy change, restart, power, rebuild or package.
This grant is consumed; no further device action was made or authorized.

Capture/stages/private authority/raw aliases/owner receipt:
build/reports/lifecycle-0.1.12-20261115-003/.
Capture SHA-256 ecf2196c8cdbf0730f3b120810f8ae6ff9e6725d0919eb943f14c1353e51c805.
Trace SHA-256 001238d808c3d156d1a3277f0b23b274f49e6e24f498b5de0bea82e004ee5ab3.
Witness SHA-256 1d3e4d45831a9f833453c8ae150012f9271268ac1c27c47a0c2dc06b6ca5e419.
Frozen as-used inputs, exact offline lifecycle evidence replay and public result:
build/phase-2/lifecycle-trial-0.1.12-20261115-003/.
Replay passed installed/build/package/launch/metadata/raw alias/stage/bounds/owner
bindings, 271 preservation pins, 43 source pins and 21 original IPKs. Existing
native/ABI/sanitizer/archive acceptance reused unchanged. Lifecycle evidence
accepted; **physical acquisition stays closed without fresh separate owner scope**
and the existing same-boot check. No more setup package is needed for this result.


## 0.1.12 physical HDMI-4 — moving picture and sound

2026-11-15, LG OLED C1 / firmware 03.53.45: owner authorized one bounded physical
HDMI-4 trial, installed/admission checks and scheduled collection, no retries.
Owner reported moving video on HDMI 4, Glasshouse preview closed, remote/timer
ready. Normal PowerShell foreground runner passed same-artifact lifecycle evidence,
fresh same-boot authority, installed/generated/utility/app-absence/four-fresh-slot
checks and two exact read-only permission maps. One SAM attempt acknowledged.
Submission cue delivered promptly; actual owner timer start not separately confirmed.

**First physical picture verified:** owner reported HDMI-4 picture and audible
sound, then explicitly confirmed **continuously moving video in the centered box**.
After collection, owner confirmed normal picture/sound/remote, **no recovery needed**.
This is one short single-port result, not dual HDMI, long-term stability, independent
audio routing or hardware-release proof.

Both app aliases identical/valid **588 bytes**; witness aliases identical/valid
**204 bytes**, exact physical action/gate/launch binding. Timings: setup416 ms,
open23 ms, select242 ms, observation8,003 ms, stop12 ms, close215 ms, local cleanup
172 ms. Status candidate_interval_completed; open/select/stop/close/localCleanup
true, ownerRetained false, exit intent0, final issue age9,453 ms. Independent
termination observed; app absent at collection. Numeric exit status, signal/alarm
cause and hardware release remain unknown. acquisitionUncertain remains true by
design after any dispatched open; acknowledgments do not clear backend uncertainty.

Submission/collection connections closed in **4.568/3.370 s**; collection connection
opened dispatch+**27.003 s**. Post-run ELF/appinfo matched. Log size_cap; no extra
retrieval. All native/host/report bounds unchanged; no second attempt, policy/mode
change, restart, power, build or package. Grant consumed; no further TV action.

Original capture/stages/private launch authority/map replies/raw alias pairs and
separate capture-bound owner observations:
build/reports/picture-0.1.12-20261115-001/.
Capture SHA-256 88713048c9bb137c2cb147eda546ee11455b8a1087f5bffa9026e25f2c2965b2.
Trace SHA-256 9c9d000e2d7683699317665215552c5b2e44614b1bbe8a72c7f9ba48e14a4809.
Witness SHA-256 8249d08bacc6ab7d1ea6151523ef2a75b80ed2d779125705f87444913bc085e9.
Frozen as-used inputs and saved-evidence validation:
build/phase-2/picture-trial-0.1.12-20261115-001/.
Exact raw trace/witness/launch/lifecycle/boot/package/stage/closure checks passed;
43 candidate source pins and the 0.1.12 package remained exact. Existing native/
ABI/sanitizer/archive acceptance reused unchanged.

Preservation exception: all 21 original IPKs matched immediately before the run.
Post-run local audit found 11 older hdmiwindow IPKs absent from dist, with 274
other unique preservation pins matching and no changed contents. The owner then
confirmed intentionally removing those packages. The agent issued no deletion/move. Current
0.1.12 IPK and all current/lifecycle evidence remain present and matched. No files
were recreated or package rebuilt. This exception does not invalidate the observed
picture; exact historical package reinstall/replay is unavailable for those versions.
The owner does not need them for current work; leave them absent, retaining hashes.
