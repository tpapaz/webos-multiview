# 0002 — Validate SMP main/sub local playback before expanding sources

Status: accepted for Phase 1. Date: 2026-11-11.

Historical validation decision. Current priority is
[decision 0003](0003-close-idle-work-resume-hdmi.md): screensaver work is closed
for this scope and read-only HDMI discovery resumes. Earlier “next test”
statements below retain their historical context; they are not current tasks.

The C1 03.53.45 staged tests establish a short, video-only combination:
SMP A requests `main_video`, SMP B requests `sub_video`. The owner saw both
clocks advance together, B move/shrink and A continue after B release.
Attributed logs show distinct decoder grants and MAIN_SCALER for A versus
SUB_SCALER for B. [Device evidence](../device-tests/c1-journal.md#phase-1)

Earlier default-main SMP and mixed SMP/NDL tests failed because B's separate
presentation registration reclaimed MAIN_SCALER. B holding a media-pipeline
SUB_SCALER token did not select its presentation sink. The inspected NDL
wrapper exposes no equivalent selector. Use two SMP sessions with explicit
Load-time sink selection; retain NDL and earlier SMP packages as controls.
[Firmware path and log attribution](../research/c1-smp-ndl-resource-path.md)

Validate in this order: separate endurance build smoke cycle, 20 distinct
app processes with clean exits, five minutes, then 30 minutes. Loop the
existing video-only fixtures without reloading players and retain monotonic
feed PTS. Require native progress, bounded execution, cancellation, cleanup,
identity checks and human clock observations. Resource startup/final windows
do not prove continuous resource ownership over a long run.

The endurance package is built, packaged and C1 ABI-checked. Its first C1
smoke trace passed duration, callback/PTS continuity, A recovery and cleanup;
the owner confirmed both clocks advancing together and A continuity after
B release. This completes the smoke gate. A host post-run saving
error was fixed and retained log categories recovered; no IPK change was
needed. The subsequent 20-cycle run passed in distinct app processes with
native progress, A continuation, cleanup and exit, plus owner-confirmed
clocks and normal viewing afterward. Four collectors flagged stderr, so
resource-log completeness/ownership must not be inferred. Next is five
minutes of continuous overlap with fixture wraps, then 30 minutes.
The first five-minute attempt subsequently cancelled after 21.343 seconds,
while both players still advanced; B crossed one fixture wrap. Screensaver
launch/visibility near cancellation is the leading lifecycle explanation,
not yet an exact native event attribution. Review app-scoped screensaver
handling before retrying; no TV idle-policy or firmware changes. CPU sampling
is now available in the host runner; standard temperature paths exposed no
readable sensors. Each later gate still requires its own evidence.

The targeted 0.1.1 lifecycle retry uses documented LG
`screenSaverProperties.preferredType: 2` plus a playback-scoped SDL inhibition
request, restored after cleanup. It logs each exit cause separately, retaining
focus-loss safety. A repeated 0.1.1 smoke run passed native progress, local
SDL state restoration, cleanup/exit and owner-observed clocks. Its five-minute
retry then passed 300.044 s overlap, repeated fixture wraps, native A
continuation, cleanup/exit and zero recorded lifecycle exits. Two owner
spot checks were positive; the visible ending and continuous picture coverage
remain unknown. This verifies the combined policy for this bounded run,
not either mechanism individually or 30-minute behavior.
The subsequent 30-minute run reached its overlap target but recorded focus
loss 731 ms after B release, before the required A-only recovery completed.
Retained logs show screensaver launch/foreground at this transition, despite
SDL's local inhibited flag. Cleanup/exit succeeded, but the full diagnostic
failed. Investigate the effective app-scoped idle backend and B-release
transition before another IPK or long-run retry; retain focus-loss safety.
The owner confirmed both clocks advancing at spot checks and no intentional
Home/Back/input/app action at disappearance. That supports observed playback
and a spontaneous interruption; it does not change the failed recovery gate.
The subsequent read-only [idle-path review](../research/c1-app-idle-path.md)
found the request active before B unload and the C1 Wayland hook absent in
the inspected SDL setup. Treat the local SDL flag as telemetry, not a
verified TV inhibitor. The AirPlay ACK is not Endurance's. Establish an
app-owned native interface and cleanup before another IPK; separate timer
expiry from B teardown in the next bounded experiment.
The subsequent [native contract trace](../research/c1-native-screensaver-interface.md)
establishes public request/NACK handlers and cancellation/disconnect cleanup
statically. Select that app-owned interface for a bounded permission/veto/cleanup
probe; runtime authorization and inhibition remain unknown. Keep its lifetime
through A recovery, including after B release. No new build occurred in this trace.
[Screensaver investigation](../research/c1-smp-ndl-resource-path.md#app-scoped-screensaver-review-and-011-retry)

For the historical 0.1.1 focused retry, require a fresh same-ELF smoke with owner confirmation
before five minutes, then a same-ELF five-minute pass before 30 minutes.
This deliberately advances the lifecycle investigation without transferring
the old build's 20-cycle result. Repeat 20 cycles on the final candidate
before claiming repeatability for that binary. The host report records the
actual prerequisite; it contains no old-version compatibility path or override.
[Build and run procedure](../archive/build-reference-2026-11-12.md#retained-short-veto-control)

Phase 1 remains active until stability, wider independent geometry and audio
focus are validated. Simultaneous HDMI 1 + HDMI 2 remains the defining
objective and **unknown**; the current setup has one physical HDMI source.
Local clip success is presentation evidence only. No firmware/configuration
changes, forced resource grants or IPTV product pivot follow from this result.

All artifacts are built locally in WSL. No GitHub Actions, automatic commits
or pushes. Keep evidence tied to model, firmware, package and ELF hashes.

## Bounded veto probe and return to HDMI research

Owner direction, 2026-11-11: limit further idle work to one native veto
candidate, then resume the defining HDMI investigation. This does not mark
Phase 1 complete or turn local clip evidence into physical-input support.
Defer additional endurance repetitions, audio and wider geometry while
returning to read-only HDMI path research; active dual-HDMI testing still
requires an evidenced path and a second independent connected source.

Implementation plan for Endurance 0.1.2: use normal app idle policy (remove
the Type 2 extension), and add an app-owned public LS2
subscription using the traced C1 ABI; require an acknowledged registration,
validate and promptly NACK real active requests, and log numeric/redacted
transport, service and cleanup outcomes separately. Retain the subscription
through B release, three-second A recovery and player cleanup, then explicitly
unsubscribe, cancel tokens and unregister the handle. Preserve all exit paths,
hard bounds and CPU/temperature sampling. Keep existing control packages.

Use one same-build eight-second smoke before a single idle-boundary probe.
The latter waits at most 60 seconds on the idle menu for a real request,
then runs eight seconds of overlap and three seconds of A recovery. The
entire native run has a 90-second hard cap. No 30-minute or repeated endurance
test is part of this probe. An absent request or denied interface is an explicit inconclusive
or failed result, not a reason to change system timers or keep iterating on
screensaver policy. Native success alone cannot establish an applied veto;
retain server attribution and human observations. Build/package locally in
WSL, verify exact IPK contents and firmware ABI, and install only after those
checks. No playback is authorized as part of this build task.

Subsequent owner-authorized 0.1.2 smoke: registration submission returned
false before either player started. The native handle closed and the SSH
controller confirmed exit; the owner saw LG Home. This is a failed API smoke,
not an observed playback crash or proof of permission denial. The underlying
error was not logged. Skip the request-mode test and resume read-only HDMI
research; further idle work remains deferred.

### One final caller correction: 0.1.3

The owner authorized one final short attempt before HDMI research. Plan:
replace the privileged application-ID call APIs with ordinary `LSCall` /
`LSCallOneReply` on the same app-owned public handle. Preserve the actual
client name, validated service payloads, registration lifetime and all cleanup.
Log only bounded numeric API error codes and allowlisted reason classes;
never emit raw `LSError` or vendor JSON. Keep CPU/temp sampling, eight-second
overlap, three-second A recovery, 60-second request wait and 90-second hard
cap. Build/package locally in WSL, verify exact IPK contents and C1 ABI, and
retain 0.1.2 as the failed control. Runtime permission/effective veto remain
unknown until installation and an owner-observed short test. No long retry.

The owner-authorized 0.1.3 smoke then passed: service registration, 8.056 s
overlap, 3.049 s A recovery, both Unloads, unsubscribe/cancel/unregister and
controlled exit, with owner-confirmed clocks/A continuation. No request or
NACK reply occurred. This establishes the ordinary caller registration and
cleanup path, not effective inhibition. Next is the separate brief request
mode after reopening the menu; no rebuild or long test.

The final request attempt then completed in 60.022 s, within its 90-second
cap, without receiving a request. Registration, explicit unsubscribe, token
cancellation, handle close and controlled exit succeeded. No players started
and no NACK was sent; result **inconclusive**, not a veto pass. The owner saw
the menu throughout, then reported screensaver activation after probe exit.
Owner uncertainty about idle delay and changed Glasshouse/Home routing after
an update are separate context, not diagnosed causes. Stop idle experiments
here and resume read-only HDMI path research. No long retry or policy changes.
