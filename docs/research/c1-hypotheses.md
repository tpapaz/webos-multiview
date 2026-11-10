# C1 hypothesis and evidence matrix

Reference target supplied by the owner: rooted LG OLED C1, webOS 6 generation.
**No physical C1 was accessed. Actual firmware, board, SoC and resource counts
are unknown.** All source citations are in [prior-art.md](prior-art.md).

| Question | C1 status | Evidence available | Evidence needed / permitted interpretation |
|---|---|---|---|
| HDMI 1 and HDMI 2 concurrently active | unknown | Input-app launch routes exist; no two-port session demonstrated in audited sources | Later reviewed experiment: both distinct physical sources must advance simultaneously without switching, with per-port identity and session ownership established |
| Independently updated per-input frames/surfaces | unknown | Hyperion selects scaler/display taps, not HDMI ports | Evidence of a documented/observed per-port acquisition path; two captures of the same output fail this criterion |
| Multiple native video surfaces | candidate route, functional capability unknown | SMP exported window API in modern sample; single-player tests reported on other models | Phase 1: two independently advancing local clips, geometry changes, resource-revocation/teardown logs on exact C1 firmware |
| Move/scale native surfaces | candidate route, functional capability unknown | Exported-window rectangles and older ACB geometry exist | Phase 1 on-device geometry measurements; window API presence alone is insufficient |
| Capture active HDMI | unknown | Active-output capture implementation exists in Hyperion | Not tested in Phase 0; would require a separate reviewed capture plan with no protected content, low-level memory access or invasive quirks |
| HDMI plus tuner coexistence | unknown | No C1 coexistence evidence audited | Later distinct simultaneously advancing physical source experiment, separate ownership/resource evidence |
| Existing apps remain live in composition | unknown | C5 native Multi-View camera companion and G4 overlay reports | Later exact C1 lifecycle/focus/background/DRM constraints; card/overlay success cannot imply arbitrary app embedding |
| Single selected audio focus | unknown | IPTV grid mutes inactive network players | Later exact-source audio arbitration and clean restoration, no multiple simultaneous audio assumptions |
| Decoder/scaler/plane counts | unknown | IPTV code uses a browser-generation heuristic | Actual allocation/release evidence; absence is not zero and no heuristic becomes a capability count |
| User-requested device metadata query | candidate | LG publicly documents getSystemInfo and keys | Phase 0C report with firmware and observed outcome; permission failure means unavailable, not unsupported HDMI |
| Candidate libraries installed | unknown until C1 inventory | Names inferred from upstream linkage | Fixed-path stat only; `present` means a regular file resolved at that path, no ABI/symbol/runtime assertion |
| Built-in Multi-View on C1 | unknown | Homebrew guide says some webOS 7+ models | Exact C1 firmware documentation/observation; do not enable hidden settings to test |

## Status vocabulary and evidence rule

- `unknown`: no sufficient target evidence; default for all functional outputs.
- `candidate`: plausible research route; never a success claim.
- `verified`: a narrowly specified result with adequate source or actual device evidence.
- `unsupported`: a bounded negative finding with exact device/firmware/backend scope.
- `blocked`: test could not run due to permission/tooling/prerequisites; not a hardware verdict.
- `unsafe_to_test`: method violates current safety scope; e.g. kernel-module
  force capture, /dev/mem mappings, service manipulation or protection bypass.

Schema capabilities use `{status,evidence}`. Every non-unknown entry requires
method, a **nonunique** family/firmware fingerprint, firmware, backend, result,
redacted log references and limitations. The Phase 0 producers never promote a
functional capability. Observations record the narrow metadata/stat result and
are not evidence of HDMI concurrency. A schema-valid report is not automatically
true or safe to publish; a human must inspect provenance and redaction.

## Ordered gates

1. Phase 0C: human validates install, passive metadata, library inventory if
   an ABI-checked helper exists, exit, and uninstall. Obtain actual redacted logs.
2. Phase 1: separately reviewed two-local-clip test using SMP exported windows,
   then NDL only if exact ABI/resource policy supports the intended test. Verify
   independent updates, geometry, one audio owner, cancellation and teardown.
3. Phase 2A/B: separately reviewed selected-HDMI graphics overlay and selected
   HDMI viewport tests, only through known C1-supported ownership interfaces.
4. Phase 2C: **do not implement or run until a credible per-port concurrency
   interface is identified.** Use two unprotected distinct clocks/motion patterns,
   record both advancing in the same view and retain exact identities/logs.
   A freeze, duplicate feed, rapid switching or stale screenshot is a failure
   to demonstrate the objective. Do not infer silicon impossibility from one
   decoder or API failure. Do not brute-force private inputs or numeric handles.

Later tests need explicit human opt-in, bounded runtime, watchdog/manual exit,
tracked ownership and restoration, and a new reviewed plan. They have no commands
or activation adapters in this PR. If no safe second-port route emerges, publish
that bounded negative result and reconsider scope with the owner; do not silently
pivot to IPTV.
