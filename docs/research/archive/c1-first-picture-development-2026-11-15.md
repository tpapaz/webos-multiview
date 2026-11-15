# First-picture development archive

Updated 2026-11-15. LG OLED C1, firmware 03.53.45 / SDK 6.5.3.
[Status](../../../STATUS.md) · [Current procedure](../../device-tests/current-plan.md) ·
[Physical contract](../../../native/phase2-hdmi-picture/README.md)

This page owns mechanisms, provenance and technical limits. Dated TV outcomes
belong in the [journal](../../device-tests/c1-journal.md), readiness in Status.
Detailed older traces remain in the [acquisition investigation](c1-hdmi-investigation-2026-11-12.md)
and [admission investigation](c1-hdmi-admission-2026-11-14.md).

## Findings and limits

| Boundary | Supported finding and limit |
|---|---|
| Acquisition/window | Own exported window plus UTP open/HDMI-4 selection produced continuously moving content in our centered window, with sound reported, once on C1/0.1.12. [Actual result](../../device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound). [Stock trace](c1-hdmi-investigation-2026-11-12.md#the-missing-client-side-connection). |
| Receiver allocation | Cached sessions support adoption/rebinding; they do not prove independent allocation. [Trace](c1-hdmi-investigation-2026-11-12.md#cached-session-eligibility-and-failed-close--2026-11-12). |
| Admission | 0.1.12 exact narrow maps passed and the own live caller received accepted open/select/stop/close replies in the successful physical trial. Verified for this attempt, not a model-wide guarantee. [Result](../../device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound). |
| Historical predictions | Original native allowed predictions did not prove a grant: saved hub has empty-data allow branches. Preserve their failed acceptance. [Trace](c1-hdmi-admission-2026-11-14.md#why-the-all-allowed-baseline-does-not-establish-a-grant). |
| Installed files | 0.1.12 exact executable/appinfo/generated bindings passed before the physical run; ELF/appinfo still matched at scheduled collection. No mode repair is queued. [Capture](../../device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound). |
| Cleanup/release | Returned close/local cleanup cannot prove hardware release. Backend bookkeeping may remove IDs after failure; resource wait is untimed. [Release](c1-hdmi-investigation-2026-11-12.md#hdmi-backend-implementation-and-release-failure--2026-11-12), [routing/wait](c1-hdmi-investigation-2026-11-12.md#stop-routing-resolved-and-downstream-release-boundary--2026-11-12). |
| Concurrency | Independently live HDMI 1 + HDMI 2 is unknown; no independent second receiver/presentation path is established. |

## First-picture failure boundary

The original 0.1.4 attempt produced only a launch flash. The old collector
collapsed several gates into one error and retained no failed stage. Subsequent
read-only collection found both report aliases and parents absent at capture;
that cannot establish their state at launch. Native entry, delivered argv/jailed
clocks, reservation/setup, actual UTP execution and exit reason remain unknown.
[Attempt](../../device-tests/archive/c1-first-picture-campaign-2026-11-15.md#014-first-picture-attempt--no-native-capture),
[postmortem](../../device-tests/archive/c1-first-picture-campaign-2026-11-15.md#014-read-only-postmortem--reports-and-parents-absent).
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

The [current producer](../../../scripts/tv-launch-authority.cjs) brackets uptime and
fixed read-only date +%s with matching boot IDs. Realtime deadline is TV seconds
x1000 +3000; whole-second flooring shortens the lease by up to one second. Sampling
and dispatch must finish within 2000 host-monotonic milliseconds, independently
of TV clocks. One authority allows one attempted submission, even on uncertainty.
Unsupported/failed/stale samples fail closed, without host epoch fallback or clock
setting. [Verified inert result](../../device-tests/archive/c1-first-picture-campaign-2026-11-15.md#016-inert-diagnostic--both-clock-guards-accepted).

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
[Actual trace](../../device-tests/archive/c1-first-picture-campaign-2026-11-15.md#018-setup-only-diagnostic--named-ls2-registration-failed).

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

**Smallest reviewed correction:** [Retired source: patch](c1-first-picture-development-2026-11-15.md#retired-diagnostic-sources)
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
packages, report slots and private authority are unchanged by that review.

The [Retired source: 0.1.9 setup-only diagnostic](c1-first-picture-development-2026-11-15.md#retired-diagnostic-sources)
now implements that order and records closed registration categories: success,
duplicate name (-1028), invalid permissions (-1027), other set error and failure
without a set error. It never writes raw vendor messages or arbitrary error codes.
The fresh schema/report slot separates it from 0.1.8; the old decoder rejects it.
Both strict guards, geometry and alarm are unchanged. Native failure/order/cleanup
tests, 38 actual C++ writer/JS decoder fixtures, ARM/direct ABI and package checks
passed locally before the separately authorized device trial. This preparation
did not establish reordered runtime behavior or a physical-input result. The
actual trial below verifies registration but leaves later setup/quit incomplete.
Status owns readiness and the next task.

The dedicated host runner/collector is now locally validated against this exact
0.1.9/schema-2 contract. Shared preflight/controller/IO synthetic tests recover
all fixed categories and setup/cleanup fields, partial category/call records,
conflicting aliases and findings despite mode changes. Exact new generated
registration checks precede one authority/attempt; no UTP query occurs. The two
30-second caps, +27-second collection, strict producer freshness and no-retry
behavior remain unchanged. Old flags/headers and tampered local bindings fail
closed; --plan/rejected flags load no device module. No TV evidence is added by
these tests. The later device result below supersedes the pretrial installed state.

## 0.1.9 device result — registration passed, later setup incomplete

The [single authorized trial on C1/03.53.45](../../device-tests/archive/c1-first-picture-campaign-2026-11-15.md#019-setup-only-diagnostic--registration-passed-focus-cancelled-quit-pending)
verified own named public registration, exact handle-name match, context
attachment and disconnect setup before graphics; registrationError none. Both
strict admission guards passed. SDL initialization, 1920x1080 window/renderer,
render and export/ID/binding calls returned success. This verifies those calls'
returned outcomes in the reordered diagnostic, not a physical HDMI picture.

Focus failed with before/after 0/0 and cancelReason lease. At
native/phase2-setup-diagnostic-0.1.9/main.cpp:53 this means dispatchAllowed returned
false. The shared predicate at native/phase2-hdmi-window/session.cpp:124–130 checks
clock validity and the issue-to-+17-second progression window. The report lacks
per-stage elapsed times and the boottime value/read-validity at cancellation;
elapsed-window rejection and clock-read failure cannot be separated from this
category alone. Do not interpret it as failure of either initial three-second guard.

Unregister, context unref, export/renderer/window destruction returned success.
The last durable marker is entered SDL_Quit, with no return, summary or exit intent.
Both aliases are identical partial 630-byte traces. App absence and a size_cap
log gate do not establish whether quit blocked, the 22-second alarm fired, another
signal/crash occurred or the final writes were lost. Actual exit and complete
cleanup/hardware release remain unknown. Native begin/graphics setup is therefore
not fully validated, and no physical run follows automatically.

Owner started in the screensaver and saw LG Home then Glasshouse Home/flickering;
normal picture/sound/remote remained usable. Context differed from 0.1.8's channel
viewing. Registration success supports the chosen order but does not prove the
missing 0.1.8 duplicate-name error. The transition alone establishes no Glasshouse
or screensaver cause; those separate investigations stay closed.

The saved-library review below supplies concrete mechanisms without upgrading
them to this run's cause. Status owns readiness; no new TV action is authorized.

## LS2/GLib context and SDL lifecycle review

**Verified static on saved C1/03.53.45 libraries, not observed runtime branches:**

- Named public/private handles can share one LS2 transport. `_LSRegisterCommon`
  looks it up at 0xb38c–0xb390 and selects separate bus-handle slots. At
  `LSGmainContextAttach` 0x12f9c–0x12fa8/0x130b8–0x130ba, an already attached
  transport accepts only the same context; another context is rejected, not
  silently substituted. Initial attachment refs the context at 0x18544–0x18556.
- Helper `MakeBridge` creates a separate context/loop/thread at 0x6dac–0x6dc2,
  then attaches private/public handles at 0x6dd6/0x6dec. First attachment failure
  returns through 0x6e26–0x6e32 without visible rollback or the second attachment.
  `instance` at 0x6ea0–0x6ece skips reconstruction while either handle is nonnull.
- `_LSUnregisterCommon` clears one bus slot and checks the opposite slot at
  0xc4ee–0xc508. A surviving handle keeps the transport and its context reference;
  app-handle context unref at 0xc50a–0xc514 does not establish context destruction.
  Final transport deinit releases that reference at 0x1f3d0–0x1f3e0. Immediate
  context use-after-free is not established; missing dispatch is the concern.
- Helper `LunaServiceCall` has a 10,000 ms first-callback wait at 0x7016–0x7032;
  its tick function 0x6f78 uses unchecked `gettimeofday`. SDL getConfigs calls
  it at 0x83aba and, on zero return, polls a callback flag with 10 ms sleeps at
  0x83ac4–0x83ad2 without a local timeout. VideoInit ignores the routine's return
  at 0x83bd8. A returned SDL_Init does not prove every helper operation succeeded.
- Helper destructor calls loop quit at 0x6c84 and untimed join at 0x6c8c. However,
  real SDL_Quit 0x10300 calls loader cleanup 0x11bbc at 0x1035a, which closes slots
  0/+4 while the helper was loaded in slot +8. **SDL_Quit → helper-destructor is
  not established.** Wayland quit 0x833b8–0x8348c also flushes/disconnects display;
  the observed quit boundary cannot identify which lower call ran or blocked.
- Public `LSGmainGetContext` reads the handle context at 0x12ee4, not the shared
  transport context. Equality with our pointer cannot prove helper attachment or
  shared-transport dispatch. Setup 0.1.9 never iterates its app context.

Provenance: the exact LS2, SDL and helper SHA-256 identities are recorded in the
[registration analysis](#registration-identity-and-smallest-correction) and were
rechecked. Saved evidence: build/phase-1/firmware-inspection/native-idle/
libluna-service2.so.3.cleanup.asm (0x130b8 at line 18416, 0xc4ee at line 7261),
SHA-256 `4124b7a698ced7d9821445ec3610ebe46a6b5247a61a5f114de503bd52848627`;
libhelpers.so.2.thumb.asm (MakeBridge line 4660, wait line 4997, destructor line
4591); libSDL2-2.0.so.0.thumb.asm and the retained config-call disassembly under
build/offline-registration-review-20261115-001/. These are saved manual static
traces, not new decompiler or device observations.

| Priority / candidate | Supporting evidence and cheapest discriminator | Acceptance / stop |
|---|---|---|
| 1 — transport/context liveness | Shared named transport plus rejected different-context attachment and no app pumping form a coherent mechanism. Observe supported app association/lifecycle alongside stage time; actual helper branch remains unknown. | Do not infer transport ownership from handle equality or introduce an unproven worker/default-context correction. |
| 2 — slow startup/reporting | Concrete callback waits plus per-row write/fsync can consume progression time. Separate returned backend duration, issue-age and persistence time in one diagnostic. Ten seconds alone cannot explain seventeen. | Identify where elapsed time accumulated; expiry stops progression without deadline widening. |
| 3 — incomplete quit | Last durable marker has no quit outcome. Measure cleanup calls and retain pending stage/exit intent/observed termination separately. | Missing return or independent termination evidence stops progression; no inferred hang/alarm/crash. |
| 4 — cancellation clock failure | Existing lease category combines invalid read, before-issue and expiry. Classify the same raw sample used by dispatchAllowed. | Invalid reads remain fail-closed; clipped report values never affect decisions. |

These are investigation priorities, not probabilities or mutually exclusive causes.
No smallest supported lifecycle correction is established. One cohesive
[Retired source: 0.1.10/schema-3 diagnostic](c1-first-picture-development-2026-11-15.md#retired-diagnostic-sources)
was built, packaged, host-tested and direct-ABI checked before its single TV trial
recorded below. The installed version is now verified and TV-tested once.
It measures the supported facts above without changing context dispatch, startup/
cleanup order or any guard/bound. Original 0.1.9 evidence is unchanged. Its 41
actual C++ traces decode, including a 1,834-byte saturated fixture. Instrumentation
adds timing cost and can itself consume the existing budget; that is measured,
not authority to extend it. Actual termination/release and private helper state
cannot be guaranteed by this report or the unchanged collection scope.

The previous 4–6-hour estimate covered offline preparation; no second package is
queued. The completed trial supplies causal timing evidence below. Missing quit/
termination evidence stops physical escalation. Direct UTP remains selected;
Glasshouse stays complementary. Status/current plan own the next offline task.

## 0.1.10 device result and specific startup/quit candidate

**Verified on C1/03.53.45:** the single 0.1.10 diagnostic measured **20,027 ms
inside returned SDL_Init**, from trace age 13 ms / issue age 696 ms to 20,040 /
20,723 ms. This excludes entered-row persistence. Later focus was already 1/1;
its loop never sampled cancellation, so not_sampled is expected. Final window-ID
returned success but no summary/exit intent was recovered. Five owned cleanup
calls returned through window destruction; SDL_Quit entry at trace age 20,312 ms /
issue age 20,995 ms is the last marker. Both 1,463-byte aliases are identical
partial traces. [Actual record and pins](../../device-tests/archive/c1-first-picture-campaign-2026-11-15.md#0110-timinglifecycle-diagnostic--20-second-sdl_init-quit-pending).

Our handle still reported its own stored context before/after SDL_Init and before
unregister; that does not show private helper association or dispatch. Snapshot
sink totals are 0 ms at integer-ms resolution, not exact zero persistence cost.
The dominant delay is measured in SDL_Init, not inferred from report-write gaps.
The later already-focused path does not renew issue+17-second progression authority;
actual HDMI dispatch still needs its unchanged deadline check. The old 0.1.9
cancellation-time clock reason remains unknown and is not retroactively proven.

**Verified saved code, candidate runtime explanation:** follow-up traced a more
specific two-wait startup and one-wait quit mechanism in the same hash-matched
SDL/helper providers. Saved SDL Thumb disassembly references:

| Path | Exact saved calls / limit |
|---|---|
| Initial helper creation | Real SDL_Init 0xfd24 calls getAppInfo routine 0xf7bc at 0xfec0 (SDL ASM line 3199); HLunaServiceCall at 0xf81a (line 2497). MakeBridge can fail context attachment while leaving handles/thread; later instance skips reconstruction when a handle remains. Actual branch unknown. |
| First candidate startup wait | SDL_Init 0xfd66 branches to 0xfe72; power-state subscribe=true calls 0xf6d4 at 0xfe74 (line 3168), whose helper call is 0xf72e (line 2392), private flag 1. At 0xfe78–0xfe7a it sets the subscription flag without checking the return. |
| Second candidate startup wait | VideoInit calls display configuration routine 0x83a60 at 0x83bd8 (line 180157); helper call at 0x83aba (line 180036), private flag 1. Returned failure is ignored by VideoInit. |
| Specific quit wait | Real SDL_Quit compares the subscription flag with 1 at 0x1031a–0x1031e (lines 3679–3681). If set, 0x1035e supplies false and 0x10360 calls the same power-state routine 0xf6d4, then clears the flag at 0x10364 (lines 3702–3704), before subsystem cleanup. No helper-destructor linkage is needed for this candidate. |

Both startup calls can enter helper first-callback wait 0x7016–0x7032 (helper ASM
lines 4997–5011), with `_getTickCount()+10000`, while its global callback flag stays
zero. The unpumped shared app-context candidate can therefore account for two
ten-second waits and ignored failures followed by SDL_Init success. Quit's same
callback path can then wait again despite its small remaining 22-second alarm
budget. This fits **20.027 seconds**; it does not observe those branches, count
runtime timeouts or prove alarm termination. The helper tick uses unchecked
gettimeofday, not our valid boottime measurement. Vendor power-state calls here
are static SDL lifecycle analysis, not a request to reopen screensaver work or
invoke internal services manually.

The saved file is build/phase-1/firmware-inspection/libSDL2-2.0.so.0.thumb.asm;
helper references remain in libhelpers.so.2.thumb.asm. Provider hashes are the
unchanged identities above. Exact capture/stage/native hashes and the hash-matched
decoded reconstruction are in the journal/frozen trial directory. Actual quit
completion, alarm firing, exit/signal and hardware release remain unknown; a crash
is not established. Owner-confirmed normal picture/sound/remote establishes observed
usability, not hardware-release proof.

Installed 0.1.10 is verified and TV-tested once, its grant/slots consumed. The
offline correction below addresses this candidate mechanically; no further TV
connection or physical acquisition is authorized. Status owns the next task.

## Offline context-dispatch correction

**Locally validated correction candidate, not TV-tested:** one
app-owned dispatcher services our existing attached context while main executes
SDL_Init and SDL_Quit. It stays alive during main cancellation, then stops and
joins before own LSUnregister/context unref. Disconnect becomes atomic; SDL/trace
state stays main-thread-owned. Worker readiness and join have new 100 ms sub-bounds
inside the unchanged progression/cleanup predicates and 22-second hard alarm.
Post-Init and already-focused checks reject stale/cancelled progression using the
existing raw-clock decision. [Component and isolated patch](../../../native/phase2-context-dispatch/README.md).

This is the smallest supported change found within the current independent named
public-handle design. Delayed attachment cannot obtain the helper transport's
context through our handle; LSGmainGetContext reads handle +8, not transport +12.
LSGmainDetach at 0x13490–0x134a2 invokes unregister, not a reusable detach. The
register-app SDL hint does not suppress power/config calls. Main-only pumping
cannot run while main is blocked; a default-context change still conflicts with
the helper's new context. No private accessors, borrowed helper handles, additional
private registration or vendor patch is introduced.

**Static dispatch support:** after retained partial MakeBridge construction,
instance reuses its handles at helper 0x6ea8–0x6ec2. Private calls select its private
handle at 0x6fc8–0x6fd2 and issue LSCall at 0x700e. Saved LSCall routing has no
handle-context-field precondition; `_LSHandleReply` at 0x104f0 uses its call map and
invokes the callback at 0x105ea–0x105f2. Thus a callback can be serviced on the
shared app transport even if that private handle's own context attachment failed.
The initial getAppInfo/helper-constructor failure and anonymous public-handle path
are not claimed repaired. Whether C1 used this branch remains unobserved.

**Completion and cleanup:** helper first-callback flag is set at 0x6bcc–0x6bd6,
before the SDL callback at 0x6be6; SDL power callback clears its wait flag at
0xf03a before later parsing/freeing. Neither acknowledgment proves that callback
has returned. Observed dispatcher join is required before own handle/context or
callback-owner storage can be released. Saved unregister locking does not justify
concurrent dispatch/unregister. Pending join or unregister failure retains ownership
and exits with intent 75; no detach, thread cancellation or unbounded join. A failed
unregister is not followed by handle-context inspection or unref of that uncertain
owner. The host observes exit 75 in controlled cases; actual TV status stays unknown.

**Traced library lifetime:** SDL loader cleanup 0x11bbc–0x11bde closes slots 0/+4;
helper load stores the independent reference in slot +8 at 0x11d74. ELF literals
0x11be0 (0xbabd8 + PC 0x11bc4), 0x11be4 (0xbabc8 + 0x11bd4), and 0x11eb8
(0xbab9a + 0x11c02) all resolve to the same base **0xcc79c**. The traced quit
path retains the helper reference until our dispatcher can join; no extra loader
pin is added. Main cannot return into process/library destructors with a pending
worker or owned handle. Full vendor runtime/destructor closure is still unverified.

Validation: build/offline-context-dispatch-review-20261115-003/validation.json and
direct-abi.json own the finalized result. Real Linux GLib/pthread plus modeled
retail transport/helper branches and the actual corrected setup driver passed
normal and ASan/UBSan CTests, including acquisition/create failure, missing replies,
early acknowledgments, main cancellation/disconnect, Init failure/late return,
focused expiry, callback-in-progress shutdown, invalid cleanup clock, unregister
failure and every trace-write boundary. Actual changed Native cancellation/focus/
progress bodies were also compiled/executed. Host dev metadata was absent, so
thin public opaque declarations use the installed GLib runtime; ARM uses SDK headers.

Isolated ARM build: **87 imports/ten direct saved providers**, retail interpreter,
including saved pthread GLIBC_2.4 nonblocking tryjoin. No acquisition/service URI or
command path, no pthread_join/detach/cancel import. All **215 preservation pins and
20 existing IPKs** matched before/after. No package, active runner/control change,
new grant or TV connection. Earlier -001/-002 local review artifacts remain preserved
but do not supersede -003's finalized unregister-failure handling.

The isolated adapter deliberately uses an offline-only wire header. The fresh
[Retired source: 0.1.11/schema 4 setup-only integration](c1-first-picture-development-2026-11-15.md#retired-diagnostic-sources)
now represents dispatch/progression stages, reordered cleanup and exit/owner
uncertainty in an exclusive decoder/runner. It was packaged once after three native
CTests normally/under ASan/UBSan, actual Native body checks, 51 C++ writer/decoder
fixtures (maximum 2,021 bytes), synthetic runner cases and ARM ABI validation
(87 imports/ten saved providers). Seven CLI cases and seven tamper refusals passed
without device/transport imports. 215 preservation pins/20 previous IPKs matched;
no TV connection, installation or run by that preparation. Last machine-verified
version is 0.1.10; later owner-reported installation/readiness lives in Status.
Records: build/phase-2/entry-diagnostic-0.1.11/{package-validation,local-validation,direct-abi}.json
and build/phase-2/setup-dispatch-0.1.11-preparation-20261115-001/.

Runtime improvement,
complete helper initialization, original failure cause, actual TV quit/alarm/exit,
hardware release and physical HDMI remain unknown. Physical UTP integration is
separate: its existing reply buffers need synchronization before using a dispatcher.

## 0.1.11 observed dispatch correction result

**Verified on C1/03.53.45, one setup-only launch:** the new app-context dispatcher
returned ready before SDL_Init. Init returned in **68 ms** (0.1.10: 20,027 ms);
post-Init progression sampled in_window at issue age 485 ms. Window/renderer/
render/export/binding/1920x1080/final ID passed. Focus 0 to 1 in 202 ms, with
in_window cancellation sample at issue age 792 ms and no cancellation.

Cleanup now returned through SDL_Quit (**13 ms**), own dispatcher stop/join (1 ms),
unregister and context unref. Final stage at trace age 551 ms / issue age 952 ms;
setupReady/localCleanup true, ownerRetained false, exit intent0. Supported own
handle/context observations match before/after Init/Quit and before unregister.
This is returned local-lifecycle evidence. Helper context/transport, actual process
exit status/signal/alarm and hardware release remain unknown. Sink 0 ms is
integer-ms resolution, not exact zero cost. No HDMI acquisition/query was made.

The large startup improvement and returned cleanup strongly support the dispatch
correction. One changed-build result does not directly identify which internal
helper callback branches ran, prove complete helper construction, or settle the
old registration-collision/0.1.9 clock hypotheses.

**Collection deviation:** host submission closed in 3.879 s after one acknowledged
launch. The background host controller disappeared before scheduled collection;
the owner cue was delayed by a local output-file sharing failure. Exact host exit
reason and actual owner timer start are unverified. The owner separately approved
one late read-only connection (2.310 s, closed, no relaunch). Both valid 1,476-byte
aliases matched, app absent at that late observation, installed hashes unchanged,
log gate size_cap. No dispatch+27-second process state or hardware-release claim.
[Journal/provenance](../../device-tests/archive/c1-first-picture-campaign-2026-11-15.md#0111-setup-only-trial--complete-local-cleanup-late-collection).

Saved-only reconstruction matches the observed SHA-256; schema/stage/hash/bindings,
215 preservation pins and 30 as-used source/tool snapshots passed without another
TV read. Both grants/slots are consumed. Carry the validated dispatcher into an
offline physical-adapter change only after synchronizing callback replies;
independent termination evidence/restoration remains a gate before acquisition.
Host controller lifetime and prompt cue delivery also need offline validation.

## Offline physical adapter and independent termination evidence

The [fresh adapter](../../../native/phase2-hdmi-dispatch/README.md) reuses the unchanged
physical acquisition/session core and the validated dispatcher. Registration
precedes graphics; post-Init/focused checks reject stale authority. App LSCallOneReply
and LSCallCancel execute on the owning GLib worker. Main exchanges only bounded
copied requests/replies through a mutex-protected state machine; no vendor call or
wait runs under that lock. Four stable callback slots outlive callbacks through
join. Early replies await successful LSCall return; stale/duplicate callbacks cannot
complete a new request. Failed cancellation poisons further dispatch. Teardown
keeps helper dispatch through Quit, joins, then unregisters/unrefs only safe owners.

**Independent termination mechanism, host-validated only:** before app LS2/GLib/
graphics work, a small child arms Linux PR_SET_PDEATHSIG and acknowledges readiness
inside 100 ms. The original SAM-launched process keeps graphics, identity and PID.
The child performs no SDK/vendor/stdio/heap work after fork. A sanitized sub-256-byte
record requires death notification, reparenting and disappearance of the original
parent proc entry. Main-thread/zombie state alone is insufficient. Raw PIDs, boot
IDs, pointers and argv are never serialized. Parent alarm22 remains unchanged;
witness lifetime/persistence is bounded by existing issue+25-second outer authority.

Fresh-slot/exact-artifact/owned-metadata correlation is required by the new decoder.
Valid witness evidence establishes process termination only; numeric exit status,
signal/alarm cause and hardware release remain unknown. Missing/partial evidence
does not pass. Retail jail/cgroup child survival, parent reaping and complete vendor
runtime closure are unverified. This cannot retrospectively close 0.1.11's
termination gap; the existing pre-acquisition gate remains explicit.

Validation: build/offline-hdmi-dispatch-review-20261115-003/validation.json. Four
CTests passed normally/ASan/UBSan: actual adapter with mock SDL/LS2 plus real GLib,
concurrent callback mailbox, retained-owner exits and parent witness. Five actual
witness outputs decoded per build; timeout/write failure remained empty. ARM:
114 imports/ten exact saved providers. 255 preservation pins/21 IPKs matched;
zero package/device/runner changes. ThreadSanitizer failed to start due to host
memory mapping; no host policy/settings change or race-detector pass is claimed.

This is an offline physical integration, not another setup candidate. A fresh
physical version/schema/runner and bounded witness collection contract are required
before packaging; no such package or TV action is authorized by this review.

## 0.1.12 bound physical contract and acquisition gate

The [physical candidate](../../../native/phase2-hdmi-candidate-0.1.12/README.md) binds
the unchanged reviewed adapter/dispatcher/core to one 0.1.12 ELF and schema2 trace.
It has explicit non-acquiring lifecycle validation and physical actions. Lifecycle
does not invoke UTP or permission-map queries. Acquisition requires exact prior
same-artifact/verified-package lifecycle evidence and separate owner restoration;
default/old/ambiguous flags fail before work. Both strict guards/deadlines remain.

GLib SHA-256 and Node SHA-256 agree on canonical mode/boot/deadline/gate data.
Only the digest is serialized. Trace and witness prefix bind exact version/action/
launch hash; launcher metadata is excluded. The unchanged child appends its death
marker only afterward. Old/generic/mismatched witness data cannot pass this gate.
Witness cap256 and app trace cap2KiB stay strict. Raw private authority stays local.

The runner composes the frozen one-shot controller, retains its two <=30-second
connections, single attempt and scheduled dispatch+27-second collection, and
collects only the new candidate's exact four aliases. Independent termination is
separate from numeric exit status/alarm and hardware release. The gate replays raw
trace/witness pairs and checks current build/archive/binary/manifest, fresh slots,
generated and post-run bindings, complete safe cleanup, scheduled capture/stages
and explicit owner restoration tied to capture hash. Freshly sampled boot identity
must match prior private authority before dispatch. No manual bypass flag.

**Physical acquisition remains closed without separate owner scope.** The
candidate is packaged, installed-binding verified and lifecycle-only TV-tested
once; that lifecycle's raw evidence now passes offline replay. The separate
archive receipt still binds unchanged build-time facts and exact package bytes.
Future physical dispatch additionally requires the existing same-boot check.
0.1.11 actual termination remains unknown. The later physical HDMI-4 result is
recorded below; simultaneous HDMI remains unverified.

Two native CTests passed normally/ASan/UBSan; 16 real traces decode (maximum665
bytes), two real bound witness outputs per build fit256, and cross-language hashes
match. Report/gate/runner/foreground tests plus CLI/tamper/archive refusals passed.
ARM direct ABI: 118 imports/ten saved providers. 272 preservation pins/21 existing
IPKs matched, npm test/lint passed; zero package/TV actions. Original reviewed
adapter/dispatcher and TSan host limitation are reused unchanged. Records:
build/phase-2/physical-candidate-0.1.12/ and its linked preparation directory.

The subsequent single packaging stage reused that ELF/native/ABI/sanitizer evidence
without rebuilding: one 51,124-byte IPK, SHA-256
cb7ec17381a23526299545300f5437c3d1fbeb12e45f1466adc05a71ec829e4f.
Exact control/ARM metadata, app bytes and archive modes passed; no scripts,
services, policies, vendor libraries or special entries. 25 malformed in-memory
archive cases were rejected. Six packaged-state runner cases and eight tamper
refusals passed without device imports. All 271 deduplicated preservation pins,
43 source pins and 21 original IPKs match; packaging network attempts zero.
Separate package-validation.json preserves the immutable build record.
Archive/runner evidence: build/phase-2/physical-candidate-0.1.12-packaging-20261115-001/.
Packaging establishes no retail lifecycle, termination, hardware-release or picture
result. No TV connection, installation or run occurred.

The subsequent separately authorized normal PowerShell lifecycle trial on
C1/03.53.45 completed setup/window-ID validation in 635 ms and local cleanup in
170 ms, final issue age1,245 ms, no retained owner and exit intent0. Identical
358-byte app aliases and identical 204-byte version/action/launch-bound witness
aliases passed replay, including fresh slots, metadata, exact installed/build/IPK,
scheduled collection and separately capture-bound owner restoration. Parent
termination is now **independently observed for this one 0.1.12 launch**; witness
survival is no longer merely host-tested. Numeric exit status, signal/alarm cause,
hardware release and future SAM behavior remain unknown. The 0.1.11 historical
exit is not changed retrospectively.

One acknowledged SAM attempt, zero UTP acquisition/permission queries, collection
connection at dispatch+27.012 s, connections closed in 4.053/3.270 s. Owner
confirmed picture/sound/remote with no recovery. This supports the physical
adapter's local setup/cleanup and witness path, not UTP admission or a picture.
[Actual result and exact hashes](../../device-tests/c1-journal.md#0112-lifecycle-trial--cleanup-and-independent-termination-observed).
Record: build/phase-2/lifecycle-trial-0.1.12-20261115-003/validation.json.
Physical acquisition remains unauthorized; no new setup package is justified.

## 0.1.12 physical HDMI-4 observation

The separately authorized physical trial on C1/03.53.45 verified the complete
own-window acquisition path once: exact same-boot lifecycle evidence and narrow
permission coverage, one SAM submission, accepted open/HDMI-4 select, 8,003 ms
observation, accepted stop/close and returned local cleanup. The owner explicitly
confirmed **continuously moving HDMI-4 video in the centered box** and audible
sound, then normal picture/sound/remote with no recovery action. This meets the
first-picture milestone; it is not merely an exported-symbol/API prediction.

Identical valid 588-byte app aliases and 204-byte physical-action/launch-bound
witness aliases passed saved-evidence replay. No retained owner, exit intent0,
independent termination observed, app absent afterward. Connections closed in
4.568/3.370 s; collection connection at dispatch+27.003 s. Post bindings unchanged.
Setup416 ms/open23/select242/stop12/close215/local cleanup172. Final issue age
9,453 ms. No bounds widened, retry, rebuild or package.
[Actual outcome and exact hashes](../../device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound).
Record: build/phase-2/picture-trial-0.1.12-20261115-001/validation.json.

Numeric exit status, signal/alarm cause and hardware release remain unknown.
The core's acquisitionUncertain true means an open was dispatched; it remains
conservative even after accepted close. Audible sound is owner-observed, not
independent mixer ownership proof. One short HDMI-4 result establishes neither
sustained stability nor an independently allocated second port. Next research
must identify that second acquisition/presentation path from saved evidence;
changing the selected port on this path alone would not prove simultaneous
HDMI 1 + HDMI 2. No further TV action is authorized.

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
cleanup API. [Exact addresses and hashes](c1-hdmi-admission-2026-11-14.md#prepared-correction-route--startup-cache-and-two-file-modes).

The original manifest was preserved outside scan roots; post-boot maps restored
the original denied semantics. That independently verifies rollback at that capture,
without upgrading the failed UUID gate or the interrupted live-removal report.
The latest activation from that held path is verified, so the current recorded
disposition is **grant retained loaded pending trial/separate cleanup**. No file
move, repeat activation, hot remove, config reload or routine boot is queued.
Permission cleanup and HDMI restoration are distinct outcomes.

## Browser research

The six-browser [source review](../webos-browser-architecture.md) found useful own-
surface/media techniques, but no new HDMI/tuner ingress or second receiver path
within those six repositories. The later Glasshouse finding above adds a concrete
HDMI/tuner media-element client as a complementary candidate lead, without
establishing a second receiver or requiring a browser port/root launcher.

## Evidence location

Saved firmware/assembly, original reports, private boot bindings and earlier
packages remain under ignored `build/` and `dist/`; do not publish or refetch them.
The archives retain exact paths, provenance, hashes and analysis limits. Upstream
reuse/licensing boundaries remain in [prior art](../prior-art.md),
[the source lock](../source-lock.json) and the pinned browser review.
No export, successful compilation, decoder session or local-clip result proves
simultaneous physical HDMI support.

## Retired diagnostic sources

The milestone cleanup removed standalone native entry/setup/admission probes, their launchers and local IWC/lifecycle harnesses. Current shared production dependencies remain in the source tree. Earlier source paths and line numbers in this record refer to the as-used snapshots with the private build/report evidence, or the cleanup snapshot under build/milestone-consolidation-20261115-001/before/. Those snapshots are local provenance, not a runtime compatibility layer or files needed in a fresh source checkout. Original device findings and unknowns remain unchanged.


