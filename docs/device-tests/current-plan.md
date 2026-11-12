# Current C1 HDMI acquisition plan

Updated 2026-11-12. [Status](../../STATUS.md) · [Actual TV results](c1-journal.md) · [Saved acquisition evidence](../research/c1-hdmi-interface-map.md#focused-acquisition-and-owned-window-review--2026-11-12)

## Objective and scope

**One live physical HDMI picture in an application-owned fixed window, followed
by two independently live HDMI 1 + HDMI 2 pictures.** Product controls follow
concurrency proof. The three-call IWC preflight is **paused**; no further generic
supervisor/recovery integration is queued.

This task uses saved evidence and local builds only. **No TV operation, install,
launch, permission change or input switch is authorized.** The C1 journal is
unchanged because there is no new device result.

## What is ready

The [minimal candidate](../../native/phase2-hdmi-window/README.md) is ARM-built,
focused host acceptance-tested and checked against saved C1 direct executable
ABI providers. It is **not packaged, simulator-tested, TV-tested or device-ready**.
The graphics dependency closure/dynamic runtime paths are not fully ABI-checked.

The candidate follows the saved frontend's client contract, with its own fixed
placement and bounds:

1. Export an app-owned window; wait for its assigned window ID.
2. Open `utp.extinputs` with our own app ID, that window ID and source type HDMI.
3. Select physical port 4 on the returned pipeline, matching the owner's last
   connected-source observation. This is active acquisition, not passive discovery.
4. Observe for at most eight seconds in a fixed 960×540 rectangle at (480,270)
   in a required 1920×1080 app coordinate space.
5. Stop and close only that returned pipeline; cancel pending calls, unregister
   the handle and destroy our own exported/SDL windows. Never touch the stock
   publication. A close acknowledgment is not observed hardware restoration.

Normal launch exits before graphics or bus registration. The sole opt-in is
`acquireHdmi4: true`; arbitrary ports, identities, windows and URIs are rejected.
Each IPC reply is limited to 4 KiB and two seconds. Cancellation drains the current
bounded open reply so that a returned ID can still be closed. Progression stops
on Back/Exit, focus/visibility loss, SIGINT/SIGTERM, denial or malformed replies.
The native progression deadline is 17 seconds; the hard cap is 22 seconds, leaving
room for two bounded cleanup requests. A hard exit never confirms cleanup.

## Remaining readiness questions

- **Unknown:** admission for our own app/connection to UTP open, port selection,
  stop and close. The stock frontend's wildcard role is not ours; ordinary IWC
  denial says nothing conclusive about UTP. No identity substitution, root utility
  fallback or policy edits are implemented.
- **Unknown:** UTP server arbitration, allocation and disconnect cleanup. If open
  is submitted but no valid ID returns, we cannot name an allocation to release.
  The candidate reports acquisition uncertain and stops; export destruction or
  process exit is not a proven inverse. No corresponding server implementation
  was found in the retained evidence inventory. This is a readiness blocker.
- **Unknown:** whether our export displays physical HDMI, and whether normal
  stop/close restores ordinary viewing. Allocation may reclaim the stock HDMI
  session or other hardware resources even though we never alter its window.
- **Unknown:** a second pipeline's independent receiver and scaler assignment.
  `windowId` and `setPipelineWindowId` name presentation bindings. They do not
  select SUB0/SUB_SCALER or establish simultaneous jack acquisition. Do not add
  SMP `avSink` options to UTP by analogy, or treat connector port 5 as a jack.

The next work is a focused review of these acquisition/release limits and the
candidate, then a concrete first-picture proposal for owner authorization. Keep
this tied to HDMI acquisition; do not restart IWC preflight or generic fault tests.
No runnable device procedure is approved at this readiness stage.

## Future acceptance sequence — requires separate owner scope

**Single source:** after readiness review, the owner identifies the actual port
and a source with distinct moving content, and confirms normal baseline viewing.
The initial candidate is fixed to HDMI 4; a different connection requires an
explicit source change in the candidate, never silent retargeting. Success needs
visible motion inside our smaller fixed window, no full-screen takeover presented
as window success, clean stop/close/process exit, and owner-confirmed normal
picture/motion/sound afterward. Record service outcomes and human observations
separately. Black/frozen video, denial, unexpected switching or uncertain cleanup
ends the attempt without retry or permission changes.

**Two sources:** only after the single-source result and independent allocation
path justify it, connect different moving sources to HDMI 1 and HDMI 2. Extend
to two distinct owned exports/pipelines and fixed rectangles. Both must advance
at the same time without either freezing, replacing or switching the other;
release one and check the other continues, then confirm restoration. Two opens,
two window IDs or successful service replies cannot pass this gate.

Only after that proof add move/resize, PiP/split layouts, remote navigation and
audio selection. Retain the existing cleanup controls and evidence; do not claim
the fake-worker supervisor has tested HDMI recovery.
