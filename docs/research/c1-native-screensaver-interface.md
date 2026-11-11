# C1 native screensaver request veto and cleanup

**Closed for the current scope; effective inhibition unverified.** See
[decision 0003](../decisions/0003-close-idle-work-resume-hdmi.md). The source,
ABI and experiment history below are retained, with no further retry planned.

Retained final control: **0.1.3**, the owner's final short caller correction. Uses
ordinary `LSCall`/`LSCallOneReply` on the app-owned public handle instead of
asserting an application ID through the privileged call API. Locally built,
packaged, C1 ABI-checked and now smoke-TV-tested. Registration, short playback,
A recovery and cleanup passed with owner clocks; no request arrived, so
effective veto remains unknown. The final request mode completed in 60.022 s
with no request, successful cleanup and confirmed exit: inconclusive. The
owner saw the menu throughout and a screensaver after exit. No actual NACK
was exercised; idle work is closed/deferred and HDMI research resumes.
The 0.1.2 failure below is preserved.

Read-only review: 2026-11-11, LG OLED C1, firmware 03.53.45, SDK 6.5.3.
Uses the existing run logs, fixed-path firmware copies and existing WSL ARM
binutils. No app launch, Luna call/registration, playback, TV write or IPK build.
[Earlier idle chronology](c1-app-idle-path.md) remains authoritative for the run.

## Result and boundary

**Verified/static:** the appropriate native hook to evaluate is the public
LS2 request/response pair on `com.webos.service.tvpower/power`. It registers
a connection-owned participant and accepts a timestamp-matched NACK. It is
not a persistent disable setting or a timed inhibitor lease. Keep the
registration and response policy in the actual native app process, across
both playback and the final A-only recovery interval. SSH only orchestrates
the bounded controller.

**Candidate/runtime:** this should let Endurance refuse a screensaver request
while its authorized playback/recovery is active. Permission from the actual
installed application identity, receipt of requests, accepted NACKs, visible
focus retention and restored idle eligibility after cleanup are **unknown**
until a bounded on-device experiment. Export availability and wildcard server
roles do not establish those outcomes. The separate 0.1.2 build below is
now smoke-TV-attempted, with registration submission failing before playback.
The static transport recommendation below is superseded by the privilege
guard finding in the follow-up; do not treat it as a validated caller recipe.

## Firmware contract

The copied `/usr/sbin/tvpowerd` is 522600 bytes, SHA-256
`43e63f23c5344035cccce287d528dfd2074fb6ce575f4e343ebf24befad60cba`.
All addresses below are virtual addresses in that exact ARM ELF; callable
Thumb addresses have bit 0 set. Disassembly is retained locally under ignored
`build/phase-1/firmware-inspection/native-idle/` as `tvpowerd.asm` and
`tvpowerd.annotated.asm`. This is body/control-flow evidence, not symbol-only
inference or recovered vendor source.

| Action | Public-bus method and payload |
|---|---|
| Register | `luna://com.webos.service.tvpower/power/registerScreenSaverRequest`, `{"clientName":"io.github.tpapaz.multiview.endurance","subscribe":true}` |
| Reply to a request | `luna://com.webos.service.tvpower/power/responseScreenSaverRequest`, `{"clientName":"io.github.tpapaz.multiview.endurance","timestamp":"<exact received string>","ack":false}` |
| Explicit unregister attempt | Same registration method and client name, `"subscribe":false`, on the same owning bus handle. This can fail while a request is being processed. |

The public category returns `/power` at `0x65da0`; its method table at
`0x8f2a0` binds registration to `0x68b61` and response to `0x67d81`, flags 0.
Public category routing is confirmed through `HandleService::addCategories`
(`0x5c400`), the category's public flag (`0x68bb8`),
`LSService::addCategory/registerCategories` and the public
`LSRegisterPubPriv(..., true, ...)` handle, not merely its C++ class name.
Private `/power` handlers also exist; no private-bus fallback is selected.

Registration `0x682f0` parses a boolean `subscribe` and string `clientName`
(`0x68562/0x68584`), obtains the real message unique token and sender
(`0x68568/0x68570`) and adds a subscription (`0x6875a`). The client name is
not an authorization grant; no caller-supplied sender or connection token is
needed. Successful registration returns `returnValue` and `subscribed`.
Require both to be true before claiming registration; a local LS2 call return
only means the call was submitted.

Response `0x67d80` parses string `clientName`, boolean `ack` and string
`timestamp` (`0x67fb0/0x67fc0/0x67fd0`) and obtains the actual sender at
`0x67f9c`. It forwards to `IServicePower::responseScreenSaverRequest`
(`0x6807a` -> `0x29900`). `ack:true` calls `receiveAck` (`0x29974`);
`ack:false` calls `receiveNack` (`0x29a18`), both for condition 5, the
screensaver client list at `PowerStatesMgr+28`. No response `reason` field is
required by the inspected handler.

`receiveNack` checks the exact request timestamp (`0x2f5a8–0x2f60c`), the
Request Screen Saver state (`0x2f818–0x2f822`) and the registered sender/name
through `ClientList::setNack` (`0x2c530`). Wrong state/timestamp has error
paths. An unknown sender/name is subtler: `setNack` logs a warning and returns
false (`0x2c66e–0x2c6a8`), but `receiveNack` still returns service success
without queuing the response event (`0x2f6b6–0x2f6bc`). Thus even a
`returnValue:true` response alone does not prove an applied veto. Correlate
the successful registration, attributable service NACK/state evidence and
visible focus retention. Do not synthesize timestamps. The emitted request contains `returnValue`, string
`timestamp` and state (`AServicePower::sendSignalCheckProcess`,
`0x4da96–0x4daf4`). Existing logs observed state `active`. Initial subscription
acknowledgements without a request timestamp are not veto requests.

The NACK changes the request decision, not just a counter: request-state
status handling at `0x35f32–0x35f40` branches to `isAnyNack` and
`resetToWaitResponses` / event 17 (`0x3605e–0x3606e`). Constructor transition
`0x39b14–0x39b1c` maps request state 17/event 17 to Screen On state 8,
whereas all-ACK handling emits event 14 (`0x36070–0x360a6`) toward Screen
Saver Ready state 24 (`0x39b08–0x39b10`). Thus `ack:false` is the static veto
branch. Runtime scheduling and other policy actors still need observation.
The ordinary response wait is three seconds (`0x35bf8–0x35c02`;
`Timer::setTimer` multiplies seconds by 1000 at `0x24d9c–0x24dae`); callbacks
must respond promptly rather than waiting for the host SSH poll.

## Ownership, cancellation and cleanup

**Verified/static on C1:** public startup installs
`LSSubscriptionSetCancelFunction` at `0x65e90`. Its callback
`0x65db8` dispatches `onClientCancel` (`0x65dcc`), which reads the cancelled
message's unique token and calls `IServicePower::unregisterClient`
(`0x65dde–0x65de6` -> `0x2a2f4`). That reaches
`PowerStatesMgr::unregisterClient` (`0x31008`), including the same screensaver
list at `+28` (`0x3108a/0x310a8`). `removeClientByConnection` (`0x2c910`)
compares the stored connection string and erases matching entries. The
private category has an analogous cancellation path.

Explicit `subscribe:false` removes the logical sender/name registration and
then tries `LSServiceMessage::removeSubscription` (`0x687e2` -> `0x45458`),
which removes the first same-sender subscription under that request key.
However, `isSameProcessingState` can reject registration/unregistration as
busy **before** that work (`0x685d0–0x685ea`), and the false path does not
propagate the catalog removal result. Therefore a successful unsubscribe
reply alone is insufficient cleanup evidence. Use one registration per
owning handle and always cancel the original subscription token.

For a future implementation: end the bounded veto policy only after both
players, including A recovery, have finished; attempt bounded explicit
unregister; call `LSCallCancel` on the original live subscription token;
cancel any outstanding response calls; and `LSUnregister` the app-owned
handle before destroying callback context. Serialize callbacks and teardown
on the attached GLib context. Apply this same cleanup on error, cancellation,
focus loss, signal and deadline; preserve existing player cleanup and exit
events. Do not cancel when B alone is released.

The exact C1 `/usr/lib/libluna-service2.so.3` is 218736 bytes, SHA-256
`e731f7ab993de5a29bf5e33b83c51eb86f87e45499701bcfe30ba6cb295e1e5b`.
It exports `LSRegisterPubPriv` (`0xb88c`), application-aware
`LSCallFromApplication` (`0xfe7c`), `LSGmainAttach` (`0x13194`),
`LSCallSetTimeout` (`0xfebc`), `LSCallCancel` (`0x10050`) and
`LSUnregister` (`0xc89c`). SDK declarations provide the matching native
transport interface for calling and cleanup. The installed 2026.08 SDK has
no `LSRegisterPubPriv` declaration. Its firmware-specific signature is
`bool LSRegisterPubPriv(const char *name, LSHandle **handle, bool publicBus, LSError *error)`:
the wrapper moves incoming `r2` to the common public flag and incoming `r1`
to the handle pointer (`0xb892/0xb894`). C1 `libhelpers.so.2` corroborates
this with private/public calls at `0x6d4c/0x6d86` and an anonymous public
call at `0x6da6`. The public probe would use
`LSRegisterPubPriv(nullptr, &handle, true, &error)`, with an isolated,
firmware-specific declaration. Do not swap the handle and boolean arguments.
A future binary still needs its normal full ABI check.

The actual C1 library also establishes disconnect cleanup statically:
`_LSDisconnectHandler` (`0xfb74`, tail call `0xfbce`) calls
`_LSCatalogRemoveClientSubscriptions` (`0x15d7c`), which invokes its internal
remover with notification enabled (`0x15df0`). The remover calls the catalog's
stored cancellation callback with the original registration message
(`0x1596c–0x15978`). Explicit cancel follows the same notifying path
(`0x15c9c–0x15ca2`); service-side `LSSubscriptionRemove` uses notification
false (`0x16854–0x1685c`), consistent with explicit unsubscribe first removing
the logical client. This closes the static disconnect-to-tvpower chain.
It does not establish crash cleanup latency on a running TV.

Pinned
[LS2 subscription source](https://github.com/webosose/luna-service2/blob/5bc38aa348b35f5799f1bf9ed7c6cb513bc5f702/src/libluna-service2/subscription.c#L729)
and [client disconnect dispatch](https://github.com/webosose/luna-service2/blob/5bc38aa348b35f5799f1bf9ed7c6cb513bc5f702/src/libluna-service2/callmap.c#L1065)
provide a separate upstream comparison for this behavior, not a C1 crash test.
Neither the inspected server unregister body nor a successful local cancel
proves immediate reevaluation of an already-pending request or restoration
of its timer. Verify orderly cleanup and crash/disconnect behavior separately.

## Permission and excluded alternatives

The C1 tvpower manifest references legacy public/private roles under
`/usr/share/ls2/roles/`; both allow wildcard inbound/outbound for the service.
The public handler bodies above contain no additional app-ID allowlist check.
This establishes the inspected server boundary only. LS2 client outbound
policy, application registration and jail identity may still deny the call.
Use an explicitly public `LSRegisterPubPriv` connection and
`LSCallFromApplication` with the real Endurance app ID. The ordinary
`LSRegisterApplicationService` wrapper at `0xc3dc` forces the common
registration's public flag false (`0xc3e2`); it must not be assumed to open
the public connection. Do not call the internal `_LSRegisterCommon` export
to work around that distinction. Keep both methods on the same public
handle and validate actual caller permission at runtime;
do not impersonate a system client or add root role files. If permission is
denied, report that boundary and stop the experiment.

SDL's additional `ScreensaverTimer` is not an app inhibitor: joystick-open
starts it (`0x86f84`, entry `0x86c61`), joystick events set its activity flag
(`0x877f8–0x87800`), and the loop resets `nop/removeNopTimer` only after input
activity while foreground. Its payload is
`{"timerId":"[TIMER]ScreenSaver:%d","option":"reset"}`, using a global
configuration value, with no app ownership field. Joystick cleanup stops and
joins it (`0x86984–0x8699e`). Endurance initializes `SDL_INIT_VIDEO` only.
Do not enable joystick input, fabricate input or reset that global timer as
the playback fix. No ordinary Wayland idle property name or dedicated lease
API was established. The local SDL flag remains local telemetry.

## Short implementation follow-up: 0.1.2

Owner steering limits the next probe to a 60-second idle-menu wait and a
90-second total native cap. There is no thirty-minute retry or additional
endurance campaign. The app's extended Type 2 metadata is removed so the
normal app idle policy can produce a real request without a system timer
change. If none arrives, the result is inconclusive and HDMI research resumes.

[Native implementation](../../native/phase1-endurance/native-veto.h) uses
the public C1 ABI above, validates bounded JSON and real timestamps, and
pumps its own GLib context on the app thread. It logs register/request/NACK/
reply/unsubscribe/cancel/unregister separately, without raw bus identifiers
or payloads. Registration and response failures stop the diagnostic.
Cancellation/disconnect behavior remains to be observed on the running TV.

A short smoke registers the client and runs eight seconds of A/B overlap,
B release and three seconds of A recovery. The request mode first waits
up to 60 seconds on the idle menu for a real request and successful reply,
then performs that same short playback/recovery sequence. Veto lifetime
extends through A recovery and both player Unloads. Thus request expiry is
separated from B release without a long playback run.

Version 0.1.2 is locally built, packaged, C1 ABI-checked and **smoke-TV-attempted:
failed before playback**. The bus opened and context attached, but registration
submission returned false. The handle closed and controlled exit succeeded;
the owner saw LG Home. No request/reply or live playback occurred.
CPU/temp sampling, identity checks, cancellation, resource/display logs and
separate owner observations remain in the SSH controller.
[Build identity and pending tests](../device-tests/lg-c1-phase-1.md#native-veto-probe-012--built-not-tv-tested).
Neither a service success reply nor telemetry alone certifies effective veto.
Skip request mode; additional idle work is deferred in favor of read-only
HDMI path research.

The saved C1 LS2 implementation exposes a missed caller restriction:
`LSCallFromApplication` at `0xfe7c` forwards to common call body `0xda2c`.
With non-null application ID, `0xda5a–0xda6a` invokes
`_LSTransportGetPrivileged` and branches to failure at `0xdcb2` when false,
before URI parsing at `0xda90`. The same binary contains the diagnostic
`LSCallFromApplication with application ID %s but not privileged` at file
offset `0x2b758`. The pinned upstream comparison has the equivalent guard
in `callmap.c:1895–1898`.

The candidate uses an anonymous public connection but did not establish a
privileged transport. Therefore the application-ID caller API is the leading
static explanation for the immediate false return. The runtime error detail
and actual transport privilege flag were not captured, so the exact failing
branch is **candidate**, not verified. This is not evidence that tvpower's
registration method rejected permission or that the NACK hook failed.
The original code discarded `LSError` details; that logging gap prevents a
definitive runtime diagnosis. No privilege escalation, alternate API call,
rebuild or replay follows from this finding.

The owner subsequently authorized this one correction. Actual C1 wrappers
`LSCall` (`0xfe3c`, clears the common app-ID argument at `0xfe42/0xfe4a`)
and `LSCallOneReply` (`0xfe5c`, clears it at `0xfe6a`) forward to `0xda2c`
without the privileged application-ID assertion. The service still receives
the real connection's sender; the payload's client name is a label, not
an authorization grant. Version 0.1.3 uses these ordinary calls directly,
with no alternate privileged path, role-file change or policy bypass.

API and service failures now emit only reason classes 0–6 and bounded signed
numeric codes. Classes: 0 no detail, 1 permission/privilege, 2 unavailable,
3 invalid argument, 4 disconnected, 5 timeout, 6 other. Values above one
million in magnitude use a capped marker and are reported as unknown.
Raw error strings and JSON remain private; the class is diagnostic evidence,
not a definitive security diagnosis. Cleanup and all runtime limits remain.

Evidence ledger: ignored `build/reports/c1-native-screensaver-interface.json`,
firmware input manifests, REA export bundle, native-client static ledger and
C1 cleanup ledger referenced there. No vendor implementation was copied into
application code. Main/sub overlap evidence, the failed full recovery gate,
audio unknowns and unproven simultaneous HDMI remain unchanged.
