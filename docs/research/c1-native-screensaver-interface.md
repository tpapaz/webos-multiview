# C1 native screensaver request veto and cleanup

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
roles do not establish those outcomes. No new package is ready to install.

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

## Next bounded experiment, before another endurance run

The interface contract is sufficiently traced to design a small app-owned
probe. Its runtime permission and cleanup must be demonstrated before another
30-minute retry. A future local build should log registration reply, numbered
request/state, decision, response reply, explicit unsubscribe reply, token
cancellation and handle teardown separately, without raw request strings or
bus identities. Failure or loss of subscription must stop the diagnostic
and clean up; do not silently continue with ineffective inhibition.

First validate same-build smoke and normal exit. Then separate timer expiry
from B teardown: hold both players across the Type 2 boundary, observe a real
request and accepted veto while foreground, release B several seconds later,
retain the veto through A recovery, then release it and check normal idle
eligibility. Do not shorten TV timers or call `turnOnScreenSaver` to manufacture
a request. Retain CPU/temperature sampling and owner clock observations.
This probe is proposed, not built or TV-tested.

Evidence ledger: ignored `build/reports/c1-native-screensaver-interface.json`,
firmware input manifests, REA export bundle, native-client static ledger and
C1 cleanup ledger referenced there. No vendor implementation was copied into
application code. Main/sub overlap evidence, the failed full recovery gate,
audio unknowns and unproven simultaneous HDMI remain unchanged.
