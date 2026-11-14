# C1 HDMI evidence map

Updated 2026-11-15. LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
[Status](../../STATUS.md) · [Current procedure](../device-tests/current-plan.md) ·
[Physical contract](../../native/phase2-hdmi-picture/README.md)

This page owns mechanisms, provenance and technical limits. Dated TV outcomes
belong in the [journal](../device-tests/c1-journal.md), readiness in Status.
Detailed older traces remain in the [acquisition investigation](archive/c1-hdmi-investigation-2026-11-12.md)
and [admission investigation](archive/c1-hdmi-admission-2026-11-14.md).

## Findings and limits

| Boundary | Supported finding and limit |
|---|---|
| Acquisition/window | Stock frontend exports its own window and passes its ID to UTP open before selection. [Static trace](archive/c1-hdmi-investigation-2026-11-12.md#the-missing-client-side-connection). Our physical picture remains unverified. |
| Receiver allocation | Cached sessions support adoption/rebinding; they do not prove independent allocation. [Trace](archive/c1-hdmi-investigation-2026-11-12.md#cached-session-eligibility-and-failed-close--2026-11-12). |
| Admission | Last returned 0.1.7 maps show exact [1,1,1,1] coverage. Live-caller UTP admission remains unknown; 0.1.8 performs no UTP-map query. [Verification](../device-tests/c1-journal.md#017-read-only-installed-binding-and-admission-verification). |
| Historical predictions | Original native allowed predictions did not prove a grant: saved hub has empty-data allow branches. Preserve their failed acceptance. [Trace](archive/c1-hdmi-admission-2026-11-14.md#why-the-all-allowed-baseline-does-not-establish-a-grant). |
| Installed files | 0.1.8 exact executable/appinfo/generated bindings passed, including 0755/0644. No mode repair is queued. [Capture](../device-tests/c1-journal.md#018-setup-only-diagnostic--named-ls2-registration-failed). |
| Cleanup/release | Returned close/local cleanup cannot prove hardware release. Backend bookkeeping may remove IDs after failure; resource wait is untimed. [Release](archive/c1-hdmi-investigation-2026-11-12.md#hdmi-backend-implementation-and-release-failure--2026-11-12), [routing/wait](archive/c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12). |
| Concurrency | Independently live HDMI 1 + HDMI 2 is unknown; no independent second receiver/presentation path is established. |

## First-picture failure boundary

The original 0.1.4 attempt produced only a launch flash. The old collector
collapsed several gates into one error and retained no failed stage. Subsequent
read-only collection found both report aliases and parents absent at capture;
that cannot establish their state at launch. Native entry, delivered argv/jailed
clocks, reservation/setup, actual UTP execution and exit reason remain unknown.
[Attempt](../device-tests/c1-journal.md#014-first-picture-attempt--no-native-capture),
[postmortem](../device-tests/c1-journal.md#014-read-only-postmortem--reports-and-parents-absent).
Saved-input production-parser/local-collector replays passed offline; originals
are in build/phase-2/hdmi-picture-failure-review-20261114-001/.

0.1.5 reached native code and rejected the host-derived realtime lease. This
provides a candidate explanation for 0.1.4, not retrospective cause proof. The
0.1.6 inert run accepted TV-derived deadlines. 0.1.7 then reported setup_failed
before acquisition without its exact substage. 0.1.8 identifies its own returned
registration failure; it cannot retrospectively establish the older substage.
Actual exit and a crash remain unknown; a return to Home is not a crash diagnosis.

## Strict TV-derived launch authority

The native parser/predicate requires both realtime and boottime inside strict
three-second issue windows, before reservation and again before SDL/LS2. A reused
boot identifier/uptime cannot revive an expired absolute deadline while realtime
advances; simultaneous clock reset remains a limit. Both guards are unchanged.

The [current producer](../../scripts/tv-launch-authority.cjs) brackets uptime and
fixed read-only date +%s with matching boot IDs. Realtime deadline is TV seconds
x1000 +3000; whole-second flooring shortens the lease by up to one second. Sampling
and dispatch must finish within 2000 host-monotonic milliseconds, independently
of TV clocks. One authority allows one attempted submission, even on uncertainty.
Unsupported/failed/stale samples fail closed, without host epoch fallback or clock
setting. [Verified inert result](../device-tests/c1-journal.md#016-inert-diagnostic--both-clock-guards-accepted).

The shared physical/setup controller uses one monotonic origin and two separately
capped connections, closing A before opening B no earlier than dispatch +27 s.
Report aliases/parents are read before post-binding gates, capped at 2 KiB each;
partial/conflicting/unreadable findings and mode mismatches survive. Bounded log
failure categories are retained, but reopening a pathname cannot prove continuity
or actual wait status. No automatic retries or broader log search.

## Registration identity and smallest correction

**Verified on this C1:** 0.1.8 returned false from LSRegisterPubPriv after context
creation. Display/request/window were all 1920x1080; renderer/export/focus checks
passed. Later handle-name/attachment/disconnect/window-ID checks were not reached.
Cleanup calls returned, exit intent 1; log gate size_cap left actual exit unknown.
[Actual trace](../device-tests/c1-journal.md#018-setup-only-diagnostic--named-ls2-registration-failed).

**Verified offline bindings:** saved generated public/private roles allow our
exact executable and app name; client and version-0.1.8 manifest hashes matched
preflight. The saved public-role shape at
build/phase-2/hdmi-installed-context-20261114-001/pub-role.json includes our name
and empty name. This does not prove the live bus loaded the expected role or that
the requested name remained free. No permission/identity repair is inferred.

**Verified static mechanism:** saved SDL library SHA-256
`d3358bab5342c947b5e1f32373b5929b65030628ff8b88e054488dabb3629c58`
Wayland VideoInit calls 0x83a60 at 0x83bd8. That routine resolves its indirect call
at 0x83aba to HLunaServiceCall through global slot 0xc939c and requests getConfigs.
The slot is populated from the exact HLunaServiceCall symbol at 0x11da2–0x11db0.
The helper SHA-256
`f9b06012588a799ecf99b8cd0528a09fd77178238321cb2fef12bf9d5b8ac782`
exports HLunaServiceCall at 0x7681 (Thumb), which calls bridge instance() and,
if needed, MakeBridge(). MakeBridge reads HApp_GetCurrentAppID at 0x6d18, then
attempts named private/public registration at 0x6d4c/0x6d86 before its vendor
anonymous fallback branches. These are existing vendor paths, not app fallbacks.

Saved LS2 SHA-256
`e731f7ab993de5a29bf5e33b83c51eb86f87e45499701bcfe30ba6cb295e1e5b`
_LSRegisterCommon looks up an existing named transport at 0xb38c–0xb390 and checks
its same-bus handle at 0xb4c6–0xb4d0. An occupied slot goes to the duplicate-name
error branch (0xb518–0xb53c, signed code -1028). Distinguish its separate invalid-
permissions branch (code -1027). 0.1.8 captured neither code; the actual rejection
reason remains unknown. REA export identity Evidence
`ev_4dfa15f7cac033dab9c9bf3ed0af871640c0e8e235d1130b3d061e3962dd5a12`
corroborates helper exports; call paths above are manual saved/fresh SDK disassembly
analysis, not decompiler or runtime observations.

**Candidate cause:** our physical startup calls beginGraphics before its own named
public registration (native/phase2-hdmi-picture/main.cpp:41–44); SDL's helper may
already own that same public name. The admission control registers without SDL
(native/phase2-admission/main.cpp:39). Working endurance uses anonymous public
registration (native/phase1-endurance/native-veto.h:25); that cannot replace our
explicit named UTP caller contract. The exact helper runtime branch, live role
state and 0.1.8 LSError remain unknown.

**Smallest reviewed correction:** [patch](../../native/phase2-hdmi-picture/registration-before-graphics.patch)
registers, checks the exact own name, attaches the app-owned context and installs
disconnect handling before graphics. Both strict guards, geometry, deadlines,
ordinary caller API, acquisition and cleanup are unchanged. No borrowed helper
handle, proxy identity, role changes, anonymous app fallback or retry.

Patch applied only in build/offline-registration-review-20261115-001/source.
The real begin() body was compiled into a controlled host model: old ordering
fails when graphics claims the name; corrected ordering passes; each registration
setup failure stops before graphics, stale guard stops all startup, graphics
failure stops progression, and policy-only startup does not create graphics.
This models the identified mechanism; it does not replay the unavailable TV error.
ARM build, 96 direct imports/nine original DSOs and both existing native CTests
passed. Validation/provenance, fresh disassembly and REA export are preserved in
that review directory. Its isolated ELF SHA-256 is
`e2d8813b1f236e728387210cd5b011865e8a3d808989d754b01d5ec4695af653`.
No IPK/version was produced and no TV operation occurred. Original native source,
packages, report slots and private authority are unchanged. A later fresh setup
artifact needs this order plus fixed sanitized registration-error categories;
Status owns that next task, not this technical record.

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

## Policy lifetime and cleanup

Saved hub caches are process-local and replayed by same-process configuration
reload; startup rescans configured manifest directories. A suffix-only rename
inside a scan root is insufficient. These are static findings, not a guaranteed
cleanup API. [Exact addresses and hashes](archive/c1-hdmi-admission-2026-11-14.md#prepared-correction-route--startup-cache-and-two-file-modes).

The original manifest was preserved outside scan roots; post-boot maps restored
the original denied semantics. That independently verifies rollback at that capture,
without upgrading the failed UUID gate or the interrupted live-removal report.
The latest activation from that held path is verified, so the current recorded
disposition is **grant retained loaded pending trial/separate cleanup**. No file
move, repeat activation, hot remove, config reload or routine boot is queued.
Permission cleanup and HDMI restoration are distinct outcomes.

## Browser research

The six-browser [source review](webos-browser-architecture.md) found useful own-
surface/media techniques, but no new HDMI/tuner ingress or second receiver path
within those six repositories. The later Glasshouse finding above adds a concrete
HDMI/tuner media-element client as a complementary candidate lead, without
establishing a second receiver or requiring a browser port/root launcher.

## Evidence location

Saved firmware/assembly, original reports, private boot bindings and earlier
packages remain under ignored `build/` and `dist/`; do not publish or refetch them.
The archives retain exact paths, provenance, hashes and analysis limits. Upstream
reuse/licensing boundaries remain in [prior art](prior-art.md),
[the source lock](source-lock.json) and the pinned browser review.
No export, successful compilation, decoder session or local-clip result proves
simultaneous physical HDMI support.
