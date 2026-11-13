# C1 app-scoped idle path after the 30-minute run

> Research/tool record. [Current status](../../STATUS.md) · [Documentation index](../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

Historical idle investigation, **closed for the current scope** by
[decision 0003](../decisions/0003-close-idle-work-resume-hdmi.md).
Effective veto remains unknown. Earlier plans below are retained as history;
the next task is [HDMI discovery](../handoff/hdmi-next-chat.md).

Review: 2026-11-11, LG OLED C1, firmware 03.53.45, SDK 6.5.3.
Subsequent implementation/history: [retained short probe](../archive/build-reference-2026-11-12.md#retained-short-veto-control),
60-second idle wait / 90-second native cap, then return to HDMI research.
No long retry is scheduled; the analysis below records the earlier run.
Scope: existing logs and read-only firmware analysis. No playback replay,
IPK build, active idle-policy calls, service restart or configuration change.

The 0.1.1 run reached 1800.033 s of overlap, then lost focus 731 ms after
B release. Its full recovery gate still failed; the owner confirmed live
clocks at spot checks and spontaneous disappearance.
[Device measurements](../device-tests/archive/lg-c1-phase-1.md#endurance-011-30-minute-run--overlap-reached-recovery-interrupted)

## Findings

| Question | Result |
|---|---|
| Did B release initiate the recorded screensaver request? | **Verified/log ordering:** a matching request was already active about two seconds before the B-unload region. Release cannot be its initial trigger. |
| Did the recorded ACK come from Endurance? | **Verified/log component:** `_aw_adapter_responseScreenSaver` belongs to the AirPlay log component. It is not evidence of an Endurance idle-policy response. |
| Does SDL's disabled flag prove a TV inhibitor? | **Verified/static:** generic SDL changes a local flag and calls an optional device hook; the inspected C1 Wayland factory/init do not install that hook. Effective TV inhibition is not established by the flag. |
| Why did focus change just after release? | **Partially answered:** launch followed an already-active request near the Type 2 duration boundary. Pending-request unblocking versus ordinary launch delay remains **unknown**. |
| Is a replacement native hook identified? | **Verified/static:** C1 tvpower has a public-bus request/NACK interface and subscription cancellation cleanup. Endurance's permission and effective runtime veto remain **unknown**. [Native contract](c1-native-screensaver-interface.md). |

## Existing log sequence

The original `/var/log/messages` snapshot was reconstructed from the first
7114 lines of a later `messages.3.gz` archive and matched SHA-256 exactly:
`2ed9462b2a13cc81e607b9fdb48cd8bb67e23a6d89fd3e6cd0a50243a23a3461`.
Line numbers below refer to that original snapshot, not the current active log.
The archive later aged out during the review. The final evidence retains
the redacted observations returned while it was available; no fresh raw
re-read or persistent raw-log copy is claimed.

| UTC, 2026-11-11 | Source line | Verified observation |
|---|---:|---|
| 13:15:04.408802 | 4579 | EPL manager logs `requestScreenSaver`, state `active`. |
| 13:15:04.411096 | 4614 | Screen manager's `callback_registerScreenSaverRequest` reports the same active request. |
| 13:15:04.415198 | 4636 | AirPlay's `_aw_adapter_responseScreenSaver` logs `ack: true` for that request. |
| 13:15:04.415444 | 4640 | `registerScreenSaverRequestCallback` reports the same active request. |
| Around 13:15:06.47 | 4709 onward | Endurance exported-window teardown/visibility messages align with the native B-release interval. This marker alone is not an A/B identity map. |
| 13:15:06.494398 | 4844 | A screen-manager message contains the Endurance app ID and `playState: playing`. Complete per-session ownership was not recovered. |
| 13:15:06.913862 | 4969 | Screensaver `launching`. |
| 13:15:07.231609 | 5038 | Screensaver `visible: true`. |
| 13:15:07.238784 | 5063 | Screensaver `foreground`. |

The request timestamp was compared privately across lines 4579, 4614,
4636 and 4640 and replaced with `request_1`. Raw request tokens and process
IDs were not retained. Do not reinterpret the AirPlay ACK as an Endurance
registration or attach `supportScreenSaverPolicy: false` records for other
foreground apps to Endurance.

This chronology revises the earlier B-release-trigger hypothesis. The
request precedes teardown; whether teardown changes the eligibility of an
already-pending request remains unresolved. No evidence here establishes
that A stopped decoding or lost MAIN_SCALER.

## C1 SDL boundary

The fixed-path C1 copy `/usr/lib/libSDL2-2.0.so.0` is 772224 bytes, SHA-256
`d3358bab5342c947b5e1f32373b5929b65030628ff8b88e054488dabb3629c58`, matching
the 0.1.1 ABI record. Addresses below are ARM ELF virtual addresses; callable
Thumb pointers can have their low bit set. SDK headers are declarations,
not authority for this firmware's implementation.

| Inspected body | Observed behavior |
|---|---|
| `SDL_IsScreenSaverEnabled`, `0x729d0` | Reads local video-device state at `+0x148`. |
| `SDL_EnableScreenSaver`, `0x729ec` | Clears that local state; calls optional hook at `+0xec` if present. |
| `SDL_DisableScreenSaver`, `0x72a10` | Sets local state to 1; calls the same optional hook if present. |
| Wayland factory, `0x830e8–0x8325e` | Allocates zeroed `0x40c` device storage and populates callbacks, without installing `+0xec` in the inspected stores. |
| Wayland VideoInit, `0x83b14–0x83c76` | Inspected initialization also does not install that hook. |

The zeroed allocation was traced through the SDL dynamic-API table to its
calloc body. These static paths strongly support local-only inhibition on
this C1 backend. Unobserved runtime patching and all possible indirect writes
were not exhaustively excluded. No debugger attach, live memory inspection
or target function call was performed. Thus the report's local state 0 is
valid SDL telemetry, but it cannot certify a TV/compositor inhibitor.

Disassembly evidence, under ignored `build/phase-1/firmware-inspection/`:

- `libSDL2-2.0.so.0.thumb.asm`: lines 153759/153771/153786 for the three
  bodies, 178966 for the factory and 180076 for VideoInit.
- SDL export stubs are `0x22f14/0x22f24/0x22f34`; dynamic-API slots are
  `0x7e8/0x7ec/0x7f0`, table base `0xca0e4`.

The helper path is not a hidden inhibitor. Fixed-path `libhelpers.so.2`
is 46488 bytes, SHA-256
`f9b06012588a799ecf99b8cd0528a09fd77178238321cb2fef12bf9d5b8ac782`.
`HRegisterAppState` at `0x7644` stores a local callback;
`HProcessAppState` at `0x7658` dispatches callbacks. SDL's inspected caller
at `0x87626–0x87632` registers a joystick-state callback (`0x868b4`), not a
screensaver request. Neither inspected helper body performs inhibition IPC.
Helper disassembly anchors: `libhelpers.so.2.thumb.asm:5659/5669`.

No `SDL_webOSSetWindowProperty` export was found in the complete C1 SDL
export inventory. `SDL_webOSExportedSetProperty` at `0x23a38` concerns exported
video windows; an ordinary app idle-control role has not been established.

## Interpretation and next evidence

LG's Type 2 metadata extends the app idle timeout to 30 minutes with OSD
dimming; it is not an indefinite disable. That policy is consistent with
the observed request timing, but the precise idle-start trigger was not
recovered. [LG policy](https://webostv.developer.lge.com/develop/guides/screensaver)

The most supported explanation is a pending timer-based screensaver request
with no proven app-native inhibitor behind the SDL flag. B release occurs
during that request's transition to a visible foreground app. It remains
unknown whether release unblocks the transition or merely coincides with it.

Before another IPK, establish an app-owned native request/veto or inhibition
interface, its permission boundary, registration lifetime and cleanup. Then
design a bounded test that separates idle expiry from B teardown, rather
than repeating a 30-minute boundary where both occur together. Preserve
focus-loss cleanup; global screen-protection changes and fake key input are
outside this experiment.

The later [native-interface trace](c1-native-screensaver-interface.md) resolves
the method contract and service-side registration cleanup. The initial
fixed-name policy probe missed legacy roles referenced by
`/usr/share/luna-service2/manifests.d/tvpowerd.manifest.json`; both public and
private roles exist under `/usr/share/ls2/roles/`. Endurance has not called
the interface, so permission and effective runtime inhibition remain unknown.

Machine-readable evidence under ignored `build/reports/`:

- `c1-phase1-idle-path-review-0.1.1.json`: combined finding ledger/timeline.
- `c1-phase1-idle-attribution-0.1.1.json`: private request matching and component labels.
- `c1-phase1-sdl-idle-static-0.1.1.json`: hashes, body addresses, evidence IDs and limits.
- `c1-phase1-sdl-idle-rea-0.1.1.json`: exported REA evidence bundle.

REA supplied export inventories; its native deep provider was unavailable.
The body analysis uses the existing WSL SDK's binutils, not decompiler output.
The REA session is closed. No upstream implementation was copied, no IPK was
built and no playback occurred in this review. Assertions checked request
identity/order and actor classification; documentation checks cover this
research-only update. HDMI concurrency, audio and the failed recovery gate
are unchanged.
