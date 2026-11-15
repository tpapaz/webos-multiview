# C1 HDMI evidence map

LG OLED C1 / firmware03.53.45 / SDK6.5.3. [Status](../../STATUS.md) ·
[Device results](../device-tests/c1-journal.md) · [Current prototype](../../native/phase2-hdmi-candidate-0.1.12/README.md)

## Verified result and limits

**One physical HDMI-4 picture with continuous motion in our app-owned centered
window is verified once, with audible sound reported.** Own live-caller
open/select/stop/close were accepted; local cleanup returned; termination was
independently observed. The owner confirmed restored picture/sound/remote with
no recovery action. [Actual result and hashes](../device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound).

| Boundary | Established / remaining limit |
|---|---|
| Window and acquisition | Own exported1920x1080 SDL surface, centered960x540 destination, UTP NormalWindow open bound to its exported window, then select HDMI4. Owner observed advancing video in that box. |
| Admission | Exact narrow four-method permission coverage and accepted calls from our own named handle passed in this attempt. Exported symbols or permission predictions alone were insufficient. |
| Cleanup/termination | Stop/close acknowledged, local cleanup returned, launch-bound parent-death witness observed termination, app absent and owner controls restored. Numeric exit status/alarm cause/hardware release remain unknown. |
| Audio | Sound was audible during the trial. Independent mixer ownership, routing and audio selection are not established. |
| Concurrency | Independently live HDMI1+HDMI2 remains unproven. Neither a second port selection nor two IP clips would establish it. |
| Repeatability | One short successful physical run; sustained stability and cross-firmware behavior are untested. |

## Current implementation and causal findings

- [Physical contract](../../native/phase2-hdmi-candidate-0.1.12/README.md) binds
  lifecycle/picture actions, schema2 trace and version/action/launch-bound witness.
- [Adapter](../../native/phase2-hdmi-dispatch/adapter.h) owns registration, SDL,
  four stable callback slots and copied synchronized replies. App submissions and
  cancellations run on the GLib context owner.
- [Dispatcher](../../native/phase2-context-dispatch/dispatcher.h) pumps the
  app-owned context during SDL startup and quit, and joins before own unregister/
  unref. The unpumped diagnostic took20.027 s in SDL_Init; the corrected setup
  diagnostic took68 ms. Exact vendor helper branches remain unobserved.
- Named LS2 public/private handles can share transport. A different-context
  attach is rejected, not silently migrated. Registration success did not prove
  the old collision hypothesis. [Exact saved disassembly and review](archive/c1-first-picture-development-2026-11-15.md#ls2glib-context-and-sdl-lifecycle-review).
- [Session core](../../native/phase2-hdmi-picture/session.cpp) selects only HDMI4
  and stops/closes only an ID returned by this attempt. acquisitionUncertain
  intentionally remains true after open dispatch; acknowledgments cannot prove
  backend release.
- [Host runner](../../scripts/run-physical-candidate.cjs) composes the bounded
  controller in normal PowerShell. A stripped persistent child environment caused
  one preconnection failure; the other earlier connection failure is unknown.
  Do not equate those with native app failures.

## Independent second-path research

The next task is saved-evidence tracing, not another first-picture run or package.
For HDMI1+HDMI2, identify separately allocated input/receiver state and independently
bindable presentation windows. The saved backend supports cached-session adoption/
rebinding; that does not prove a second allocation. Trace creation, port ownership,
resource arbitration, stop/release and output binding before proposing a dual
experiment. A later actual proof needs two distinct moving sources advancing
simultaneously without input switching/freezing.

Primary saved traces:

- [Frontend window-to-UTP binding](archive/c1-hdmi-investigation-2026-11-12.md#the-missing-client-side-connection).
- [Cached session eligibility and failed close](archive/c1-hdmi-investigation-2026-11-12.md#cached-session-eligibility-and-failed-close--2026-11-12).
- [Backend release failure](archive/c1-hdmi-investigation-2026-11-12.md#hdmi-backend-implementation-and-release-failure--2026-11-12) and [downstream resource wait](archive/c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12).
- [Policy/cache admission analysis](archive/c1-hdmi-admission-2026-11-14.md).
- [Paused IWC route](c1-iwc-research.md): stock publication control is not an
  independent receiver and is not a prerequisite for the direct UTP path.

## Glasshouse preview source and owner observation

Owner reports HDMI-4 picture **and sound** in Glasshouse Home dashboard PiP when
HDMI 4 is selected on this C1. This is not a result from our app. After that report,
the owner supplied [Glasshouse source](https://github.com/rorygallagher2024/glasshouse).
Read-only review pinned commit `43ec5ac020838ebee985b1a392c0f9afe7d8f95e`;
the installed version/commit is **unknown**. Nine selected text blobs were checked
against Git object IDs and SHA-256; no upstream code was executed or integrated.
Provenance and source copies are in the private review bundle's `glasshouse/`
subdirectory. [MIT license](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/LICENSE)
permits adaptation subject to its notice requirements.

| Technique | Exact source/API | Finding, applicability and limit |
|---|---|---|
| External HDMI media element | [`server/assets/home.html`, `startPreview()`, lines 2352–2382](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2352-L2382) | **Verified/static, high confidence:** appends a source with type `service/webos-external`, URL `ext://hdmi:` + port; calls `load()`/`play()`. This is physical-input client code, separate from encoded-network decoding. Strong candidate for a smaller own-app first picture; underlying LG pipeline/window binding and access under our identity remain **unknown**. |
| Fixed/variable placement | [`placeTilePreview()`, lines 2143–2157](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2143-L2157) | **Verified/static:** CSS position/size/clip track a tile while the video stays attached to its parent. Author warns reparenting/transformed containers drop its native player. Reuse the stable-element approach; no compositor ownership or arbitrary-app embedding demonstrated. |
| Sound and teardown | [`previewMuted()` and `applyPreviewSound()`, lines 2161–2170](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2161-L2170), [`releaseVideo()`/`stopPreview()`, lines 2207–2237](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2207-L2237) | **Verified/static:** mute follows settings; teardown removes handlers, pauses, removes children/direct `src`, then reloads. Visibility loss calls `darken()` → `stopPreview()`; `pagehide` also stops ([handlers](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L5963-L5967), [`darken()`](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L1883-L1893)). These are client teardown requests, **not verified hardware release or a bounded process exit**. |
| Tuner source | [`startPreview()`, lines 2358–2360](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2358-L2360) | **Verified/static:** non-port target uses `tv://<channel-id>` with `service/webos-broadcast-preview` (legacy `service/webos-broadcast` for webOS ≤4). A later mixed-source lead, not HDMI+tuner concurrency proof. |
| C1/webOS 6 setup | [`server/lib/home.js`, lines 1999–2043](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/lib/home.js#L1999-L2043), [web app manifest](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home-app/appinfo.json) | **Verified/static:** webOS 3–6 selects standalone mode; manifest is a web app, `com.tvweb.home`, 1920×1080, with no explicit trust/required-permissions fields. **Reported/device:** comments mention C1 6.5.3. Full installation/security context was not audited; do not borrow its identity, Home-key hooks or infer our app needs no admission. |
| Concurrency | [`home.html`, lines 2025–2033](https://github.com/rorygallagher2024/glasshouse/blob/43ec5ac020838ebee985b1a392c0f9afe7d8f95e/server/assets/home.html#L2025-L2033) | **Reported/device:** author describes G3/webOS 9.2.2 preview and says another port takes the receiver off the old input. Implementation has one preview video/target. This is a warning against assuming two sources, not proof of a universal C1 hardware limit. |

**Comparison and roadmap implication:** retain direct UTP as the explicit
acquisition/window research path and Glasshouse as a complementary implementation
reference/possible simpler baseline. No experiment is abandoned and no replacement
client has been selected. The setup-only trace identifies a registration failure; it does not establish a failed UTP call.

| Question | Direct native UTP candidate | Glasshouse media-element path |
|---|---|---|
| What does our client control? | Explicit `open`, returned session ID, own exported window, port selection and own-ID cleanup. Valuable for allocation/binding research. | Source URL, media element geometry/playback and player teardown; session/plane binding is internal to LG's media implementation. |
| Is it demonstrably better? | More explicit control, but no verified live UTP call or picture in this attempt. | Concrete source plus owner-reported picture in another app; our identity/installation context is untested. |
| Does it reach a different receiver? | Unknown; explicit session creation does not prove independent allocation. | Unknown; it may use UTP or the same lower-level resource manager. Client code does not resolve that trace. |
| What can it establish next? | A recovered report can locate the failed stage; a later authorized picture trial can test explicit binding. | A separately reviewed minimal web candidate could establish a simpler single-picture baseline; success would not validate the native candidate or dual HDMI. |

The media element avoids our manual SDL export/UTP calls at the client layer; it
does **not** establish that LG's backend bypasses UTP, resource management or
permissions. No new package, integration, dependency installation or TV run was
performed. Keep one-picture → independent HDMI 1+2; no product phase change.

Before a new trial, resolve own-identity admission, a fixed bounded launch/exit
contract, teardown/reporting and physical-motion observation. Do not transplant
the Home launcher or weaken the native lease. The web path is a **candidate**,
not a claimed fix for the failed native run. The source shows the HDMI request;
allocation, plane ownership, hardware release and independent-port capacity remain
**unknown**. There is no evidence that Glasshouse preview caused our failure.


## Provenance, policy and retained evidence

The [source lock](source-lock.json) and [prior-art audit](prior-art.md) own upstream
revisions/licensing. The [scoped policy](../../native/phase2-hdmi-window/policy/README.md)
adds exactly four methods to our own app. Its loaded disposition is not silently
changed or claimed revoked by this cleanup. No TV/policy action is authorized.

The [development archive](archive/c1-first-picture-development-2026-11-15.md)
preserves saved-library addresses/hashes, rejected hypotheses and correction
analysis. The [journal archive](../device-tests/archive/c1-first-picture-campaign-2026-11-15.md)
preserves dated observations. Private firmware/assembly, original raw reports,
launch authority and frozen inputs stay under ignored build; the working IPK stays
in dist. Never publish/refetch them as part of documentation cleanup.
