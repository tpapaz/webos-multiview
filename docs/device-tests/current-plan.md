# Current C1 HDMI acquisition plan

Updated 2026-11-13. [Status](../../STATUS.md) · [Actual results](c1-journal.md) ·
[Candidate contract](../../native/phase2-hdmi-window/README.md) · [Evidence map](../research/c1-hdmi-interface-map.md)

## Objective and scope

First demonstrate one live physical HDMI-4 picture in our own fixed window,
then two independently live HDMI 1 + HDMI 2 pictures. Controls follow concurrency.
**This plan is not TV authorization.** Current work is local only. No installation,
launch, permission deployment, input switch or power action has occurred for it.

Candidate 0.1.3 is locally built/tested/packaged/direct-ABI checked, not installed,
simulator-tested or TV-tested. Artifact hashes, native behavior/report schema and
build commands are maintained in the candidate contract and build guide.
The IWC preflight and generic recovery work are paused; no more firmware is needed.

## Exact blockers to the first picture run

| Gate | Required validation |
|---|---|
| Installed context | Separately authorized installation/readback of exact ELF/manifest, generated pub/prv roles and public client grant; normal launcher, boot-clock metadata and jail report visibility. No direct root launch with assumed graphics context. |
| Scoped admission and rollback | Verify the static stock-utility route in its actual registered context, both administrative predictions and the fresh-app sequence below. Parser/trust/activation/removal remain untested. |
| Owner restoration conditions | Owner accepts the contingency below, has physical remote/TV-power access and confirms a safe power procedure without active update/panel maintenance. Otherwise acquisition is **unsafe_to_test**. |

The static administrative caller and local delayed-launch guard are resolved.
They are not measured device results. Actual motion/restoration are outcomes of
the future trial, not a demand for a prior successful HDMI run. A second receiver,
IWC setter recovery, Phase 1 endurance or deliberate SIGKILL/transport-failure
experiments are not prerequisites for the first normal-exit attempt.

## Scoped admission validation — prepared, not executed

Use the [four-file policy](../../native/phase2-hdmi-window/policy/README.md), one
app and four methods only. Local review bundle: `build/phase-2/hdmi-first-picture-0.1.3/`.
Package/source/policy pins: `build/phase-2/hdmi-window-0.1.3/package-validation.json`.

The static administrative route is native `/usr/bin/luna-send`, own default
`com.webos.lunasend-<actual PID>`, neither `-m` nor `-a`; do not substitute
`luna-send-pub`. Use its existing core grant, never copy it into the app.
Verify current utility/core hashes and both exact permission predictions before
loading anything. The own-PID query templates and evidence pins are retained in
`build/phase-2/hdmi-admin-caller-20261112-001/`.

Each query uses a real successful own registration/attachment, possibly separate
equivalent utility processes with the same executable/core pins, not one shared
handle or an invented/disconnected requester. Positive prediction can fall back
to configured groups; it does not prove active-cache population or later mutation.
The utility timeout is not remote cancellation/rollback. Denial, malformed reply,
transport loss or an uncertain mutation stops the sequence without automatic retry.

Both future operations, `luna://com.webos.service.bus/addOneManifest` and
`luna://com.webos.service.bus/removeOneManifest`, use this exact object:

```json
{"prefix":"/","path":"/var/luna-service2/manifests.d/io.github.tpapaz.multiview.hdmiwindow.utp-policy.json"}
```

| Stage | Action and acceptance |
|---|---|
| Install/context preflight | Install only under separate scope. Pin installed ELF/manifest and both generated roles/client grants. Confirm exact own executable/name and existing outbound permission, no inbound API. Preserve originals. Owned overlay paths/ID/group must be absent; a collision/mismatch stops, never replaces a role or file. |
| Baseline | Fresh app `{"checkUtpAdmission":"baseline"}`; four predictions in order open/select/stop/close. Require `policy_checked`, own caller ready, local cleanup, process absent and `[0,0,0,0]`. `allowed:false` is a valid query result. An unexpected allow stops review; do not add a duplicate grant. |
| Activate | After both admin predictions and explicit deployment scope, stage our three payloads, manifest last, then one exact add. Preserve LG/generated files. No broader trust, identity retry, reload signal or restart. |
| Overlay | Fresh app `{"checkUtpAdmission":"overlay"}`; require `[1,1,1,1]`, completed queries, local cleanup/process absence and original generated-policy hashes unchanged. This is permission prediction, not actual UTP execution. |
| Unload/preserve | Close app, submit one exact remove. Move only our manifest out of the scanned directory to an agreed owned holding path, preserving bytes/hashes. No deletion. Remove acknowledgment or moving/unlinking alone does not prove revocation. |
| Removed | Fresh app `{"checkUtpAdmission":"removed"}`; require `[0,0,0,0]`, equal to baseline, clean exit/process absence and unchanged generated hashes. Persistent access leaves policy unresolved; no restart/extra grant to force a pass. |

Admission modes make **zero UTP target calls and no SDL/export**, at most four
bus queries with two-second/4-KiB reply bounds, 10-second progression and a
12-second hard cap. A failed/incomplete report or unconfirmed exit stops the
sequence. Keep the app closed before grant changes; use fresh connections.

A later separately authorized picture trial needs exact reactivation and fresh
`picture-ready` `[1,1,1,1]`. After all picture cleanup/restoration and app exit,
unload/preserve the manifest and require fresh `after-picture` `[0,0,0,0]`.
Do not revoke methods while acquisition still needs them. No phase auto-launches
picture mode; no cold cycle is assumed to remove policy. Preserve existing slots.

## Bounded capture and first-picture procedure

This is a future proposal, not a ready/authorized device runner. The collector
cannot launch, signal, execute remote commands, write or delete on TV. The IPK
contains no policy, installer or autostart.

1. Confirm package/generated bindings, successful admission rollback, separate
   reactivation and `picture-ready` predictions. Owner confirms HDMI 4 with
   distinct moving content, baseline sound/remote response, and restoration access.
2. Use a fresh host directory for each phase's prepare/collect pair. Preflight
   checks installed/generated-policy pins, app absence and no existing report.
   Picture prepare reads boot ID (38-byte cap) → uptime (64-byte cap) → boot ID
   at `/proc/sys/kernel/random/boot_id` and `/proc/uptime`, then exclusively saves
   private host `launch.json` if IDs agree. It never prints the ID or queues a launch.
3. Submit that exact unmodified payload once through the normal app launcher;
   start the owner's independent **27-second timer at submission**. The same-boot
   start deadline is sample +3,000 ms. Old/unbounded/stale/different-boot inputs
   are inert before report/graphics/IPC. Do not regenerate, refresh or retry on timeout.
4. Observe at most eight seconds after accepted selection: moving physical
   content must appear inside our `(480,270,960,540)` region in 1920×1080 app
   coordinates. Graphics, a full-screen takeover or successful replies do not pass.
5. Progress dispatch stops at sample +17 s; cleanup dispatch at sample +22 s.
   Each reply has a two-second bound. The process alarm is armed before boot
   validation, 22 s from entry, ending by sample +25 s for an admitted start.
   Boot-time dispatch checks include suspend and are rechecked at each request.
   The [native contract](../../native/phase2-hdmi-window/README.md#launch-and-timing-contract)
   explains the proof and execution limits; backend release is not bounded.
6. Confirm exit independently by owner submit +27 s. On missing exit, cancellation,
   error, transport loss or black/frozen/wrong picture, enter restoration by that
   handoff. Never add a delay after a late entry, wait for the collector or retry.
7. Collect only when safe. The read-only collector's separate 30-second cap and
   at most 1,024 process entries never extend the owner timer. It checks exact
   report schema/privacy, matching aliases, package/generated pins and process
   absence before/after reading. Host `capture.json` is saved exclusively.

Reports are at `/tmp/io.github.tpapaz.multiview.hdmiwindow/<filename>` or the same
path below `/var/palm/jail/io.github.tpapaz.multiview.hdmiwindow`. Filenames are
`picture-0.1.3.json` and `admission-<phase>-0.1.3.json`. They are at most 2 KiB,
0600 in an owned 0700 directory, reserved before SDL/LS2 without following links
or overwriting, then fsynced/closed. Missing/partial/conflicting reports leave
cleanup unknown. `/tmp` may disappear during cold recovery; recovery takes priority.
Process absence at capture time proves neither exit code nor exit before +27 s.

Future separately authorized read examples, from repo PowerShell (parent host
folder exists; destination must be new):

```powershell
node scripts/capture-hdmi-window.cjs --prepare baseline build/reports/hdmi-0.1.3-baseline --allow-tv-read
# Separate authorized app launch; collector does not launch.
node scripts/capture-hdmi-window.cjs --collect baseline build/reports/hdmi-0.1.3-baseline --allow-tv-read
```

Use distinct directories for overlay/removed/picture-ready/picture/after-picture
within their authorized stages. None was run for this preparation. Offline
validation is `node scripts/capture-hdmi-window.cjs --check-report <mode> <local-file>`;
it never loads device credentials or connects.

## Restoration route — proposal for one owner-attended trial

Chosen route: bounded app cleanup → one owner UI attempt → one owner-operated
true cold power cycle for a stuck/lost session. No software-only bounded reset is
established. This emergency research contingency must be separately accepted;
it is not an automatic product recovery feature or permission to power-cycle.

Owner must be present with physical remote and safe access to **only the TV's**
power connection, independent of host/SSH/HA. Confirm safe shutdown/disconnection,
no active update/panel maintenance or operation requiring uninterrupted power.
No Quick Start, maintenance, power, HDMI or other settings change. If these
conditions cannot be established, acquisition remains **unsafe_to_test**.

The following are experiment observation/attempt budgets, not LG guarantees or
a validated OLED power-maintenance procedure. Safe shutdown may take longer or
require stopping. Never force interruption to satisfy a timer.

| Stage | One bounded attempt and disposition |
|---|---|
| Client cleanup | Drain the bounded current reply; stop→close only the returned own ID, then local teardown. No usable ID means no guessed close. Failed cancellation may leave close unsent. Stop/close acknowledgments, unregister and hard exit do not prove hardware release. Exit uncertainty reaches the owner at submit +27 s. |
| Owner UI | Back/Exit once if app remains visible; select HDMI 4 once through normal UI if responsive. Allow 15 s to return, then observe motion/sound for 10 s. Unresponsive UI means stop keys. For a lost/uncertain session, visible UI recovery alone does not reconcile ownership: continue to cold contingency before any later experiment. |
| True cold cycle | Stop controller/replay first. Follow confirmed safe shutdown/disconnection; once safe, disconnect **only the TV** from mains for 60 s, reconnect once and start normally with physical control. No shell reboot, service restart, settings/factory reset, file deletion or second cycle. If safe disconnection is unavailable, leave unresolved and end testing. Standby/HA off→on does not prove old processes ended. |
| Fresh baseline | Allow 120 s after power restoration for startup. If responsive/needed, select HDMI 4 once; observe motion/sound for 10 s. Confirm no candidate relaunch when reviewed process checks are available; otherwise mark unknown. Abnormal boot/viewing or maintenance/update means stop. Do not relaunch app or reapply permissions. |

If the client completed, both outer acknowledgments/local cleanup/exit are
confirmed and owner sees normal HDMI-4 motion/sound, end normally. Conservative
`acquisitionUncertain:true` alone does not require a cold cycle; hardware release
still remains unknown. No emergency trial/repeat is queued.

If open may have reached UTP without usable ID, stop/close is negative/missing/
NotSent, cleanup/exit is unconfirmed, transport disappears or viewing is abnormal,
mark failed/inconclusive and take the owner contingency. A later reply or recovered
picture cannot turn it into a clean normal-close pass. If no open was sent, restore
UI if needed; do not label a session lost solely because setup/opt-in was rejected.

Cold power removal ends old processes/waits/maps independently of session IDs;
successful usable recovery remains untested, not a promised duration. Keep the
original report immutable, discard all pre-cycle IDs and ignore late replies.
Policy state needs separate validation after boot. No deliberate stuck-session,
SIGKILL or broken-transport test is included in the first-picture scope.

## Results and later acceptance

Keep machine reports and owner observations separate. Record fixed outcomes/
timestamps for intended-rectangle motion, post-exit motion/sound, timely exit,
UI attempt, witnessed true cold cycle and post-cycle viewing; no IDs/raw errors.
Preserve `hardwareRelease:unknown`. Missing stop acknowledgment stays a failed
normal-close trial even if close/cold recovery restores viewing; no pause grant.
Append only actual authorized outcomes to the C1 journal.

Only after single-source evidence and an independent allocation path justify it,
connect different moving devices to HDMI 1 and HDMI 2. Use distinct exports/
pipelines and two fixed rectangles; both must advance concurrently without
freezing/replacing/switching. Release one while the other continues, then confirm
restoration. Two opens/IDs or service replies cannot pass. Move/resize, layouts,
remote navigation and audio selection follow concurrency proof.
