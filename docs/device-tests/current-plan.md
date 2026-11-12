# Current C1 test plan

Updated 2026-11-12. [Status](../../STATUS.md) · [Results journal](c1-journal.md) · [Recovery gates](../research/c1-iwc-gates-after-lifecycle.md)

## Readiness and purpose

**Candidate: not implemented, built, ABI-checked or TV-tested.** Prepare the
focused real-worker adapter locally first; this document authorizes no TV run.
The existing native helper has fake workers only. Its normal/EOF cases and
stock-utility listing passed separately; [journal](c1-journal.md).

Next proposed device test: **one supervised read-only IWC preflight on HDMI 4**.
It combines the supervisor with actual stock utility children, checks predicted
permissions and records a sanitized HDMI baseline. No geometry or fault injection.

## Before a future authorized run

- Implement fixed operations and test locally: own-PID/default-identity matching,
  reply limits/schema, sequential child exit/reap, cancellation, hangs and cleanup.
  Reuse the existing listing schema: unique IDs, bounded strings and positive
  32-bit integral published dimensions; no permissive raw-reply capture.
- Build in the existing WSL SDK; ABI-check against saved C1 runtime evidence.
  Pin the new artifact; retain the existing fake helper and original reports.
- Recheck the actual `/usr/bin/luna-send` and its eight existing binary/policy
  bindings, runtime and app absence. No policy edits, install or persistent service.
- Owner manually selects HDMI 4 and confirms normal uncropped full view, PiP off,
  framing/motion/sound. Stop on a different/unknown port; no automatic switching.
- Reserve fresh host capture, exclusively create one private temporary directory,
  and prepare exact owned-process verification/cleanup. Keep control stdin and
  both SSH connections open; no fault injection in this first real-worker case.

## Fixed operation

TV-local supervisor launches at most **three sequential owned children**, without
a shell, arbitrary input/endpoint, name/app override or helper LS2 registration.
Each executes the actual `/usr/bin/luna-send` with fixed `-n 1 -w 2000`.

| Order | Actual destination | Payload |
|---|---|---|
| 1 | `luna://com.webos.service.bus/isCallAllowed` | `uri`: `luna://com.webos.service.iwc/listPublishedWindows`; requester: this utility child's own generated name. |
| 2 | `luna://com.webos.service.bus/isCallAllowed` | `uri`: `luna://com.webos.service.iwc/setExportedWindow`; requester: this second utility child's own generated name. |
| 3 | `luna://com.webos.service.iwc/listPublishedWindows` | `{"subscribe":false}` |

Each policy child derives its requester from **its own PID before exec**,
matching the pinned utility's automatic `com.webos.lunasend-%d` name. Exec
preserves that PID. Prove this contract locally before use; never borrow/reuse
another identity. Requester names remain private. Different children have
different connections; policy predictions establish no FIFO/application fence.
The setter URI above is **query data only**, never a call destination.

## Bounds, stops and pass criteria

- Two seconds per reply; 32 KiB/reply, at most 64 publications; one child at a
  time. Validate its reply and confirm exit/reap before launching the next.
- Stop new work by native entry +7 s, reserve cleanup through +8 s and launch
  only when reply/cleanup budgets fit. Keep a native hard deadline and bounded
  separate host capture/emergency cleanup. These bound attempts, not kernel stalls.
  Retain host budgets of 10 s preflight and 15 s after exec, with identity-checked
  emergency attempts at 10 s after exec; an emergency-rescued run cannot pass.
- Stop at first denial, malformed reply, timeout, unknown exit/identity or target
  mismatch. No retry, escalation, fallback identity or silent retargeting.
- Pass requires both `returnValue: true` / `allowed: true` predictions, all three
  children exited 0/reaped, one total publication and one matching HDMI-4 app
  candidate, valid published logical dimensions and owner-port agreement.
- Require helper/child absence, durable host capture **before** exact temporary
  file removal, no host rescue, and owner-confirmed normal viewing after exit.
  A rescued/uncertain run cannot pass.

## Capture and limits

Export policy Booleans, counts, publisher-derived port, bounded published logical
width/height, owner agreement, elapsed/exit/cleanup fields and artifact hashes.
Keep raw replies, target IDs, requester names and errors in memory only. Owned
PIDs/start times may use private `0600` cleanup metadata, never exported reports.
No saved target may arm a later write. Preserve separate owner observations.

Keep the app closed. No setters, crop, publish/stop-publish/property calls,
priority changes, subscriptions, input changes, service restarts or generic
privileged IPC. Listing may activate the dynamic IWC provider; it changes no
requested publication content/geometry but is not zero-effect process inspection.

A pass establishes real-worker read integration, current permission predictions
and one baseline sample. Actual setter admission/application, current crop/
priority, `logicalFullViewMatched`, applied ordering and hardware restoration
remain unknown/not tested. Published app coordinates are not panel/signal pixels.
Whole-SSH/app survival and simultaneous HDMI remain unproved. The geometry gate
stays closed; use the [recovery review](../research/c1-iwc-gates-after-lifecycle.md)
for those unresolved requirements. No runnable command exists for this new mode yet.
