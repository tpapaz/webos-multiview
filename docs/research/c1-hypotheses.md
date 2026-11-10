# C1 hypothesis and evidence matrix

Reference device: rooted LG OLED C1, firmware 03.53.45, webOS SDK 6.5.3.
See [prior art](prior-art.md) and the [Phase 1 record](../device-tests/lg-c1-phase-1.md)
for source and device evidence. SoC resource counts remain **unknown**.

| Question | C1 status | Evidence available | Evidence needed / permitted interpretation |
|---|---|---|---|
| HDMI 1 and HDMI 2 concurrently active | unknown | Input-app launch routes exist; no two-port session demonstrated in audited sources | Later reviewed experiment: both distinct physical sources must advance simultaneously without switching, with per-port identity and session ownership established |
| Independently updated per-input frames/surfaces | unknown | Hyperion selects scaler/display taps, not HDMI ports | Evidence of a documented/observed per-port acquisition path; two captures of the same output fail this criterion |
| Multiple native video surfaces | candidate route, concurrent playback unknown | An empty B window coexisted with playing A. B's SMP Load stalled A's frame callbacks. Release restored them. | Phase 1: two independently advancing local clips, geometry changes and cleanup on the exact firmware |
| Move/scale native surfaces | verified for one SMP video | Owner observed B move and resize while it was the only visible video | Independent geometry during concurrent playback remains unknown |
| Capture active HDMI | unknown | Active-output capture implementation exists in Hyperion | Not tested in Phase 0; would require a separate reviewed capture plan with no protected content, low-level memory access or invasive quirks |
| HDMI plus tuner coexistence | unknown | No C1 coexistence evidence audited | Later distinct simultaneously advancing physical source experiment, separate ownership/resource evidence |
| Existing apps remain live in composition | unknown | C5 native Multi-View camera companion and G4 overlay reports | Later exact C1 lifecycle/focus/background/DRM constraints; card/overlay success cannot imply arbitrary app embedding |
| Single selected audio focus | unknown | IPTV grid mutes inactive network players | Later exact-source audio arbitration and clean restoration, no multiple simultaneous audio assumptions |
| Decoder/scaler/plane counts | unknown | IPTV code uses a browser-generation heuristic | Actual allocation/release evidence; absence is not zero and no heuristic becomes a capability count |
| User-requested device metadata query | verified | The passive probe queried the device and Inspector retrieved the redacted report | Direct on-TV JSON download remains unknown |
| Candidate media libraries installed | verified for inspected SMP, SDL and NDL libraries | Read-only firmware ELF inspection verified the named ARM32 files and app imports | NDL playback and the broader library inventory remain unknown |
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

1. Phase 0C passed with install, passive metadata, redacted report retrieval,
   remote navigation, exit and uninstall on the C1.
2. Phase 1: run the ABI-checked solo NDL v2 probe after the staged SMP and
   browser controls. If NDL works alone, compare SMP A plus NDL B with the
   two-SMP trace. The gate requires independent updates, geometry, one audio
   owner, cancellation and teardown.
3. Phase 2A/B: separately reviewed selected-HDMI graphics overlay and selected
   HDMI viewport tests, only through known C1-supported ownership interfaces.
4. Phase 2C: **do not implement or run until a credible per-port concurrency
   interface is identified.** Use two unprotected distinct clocks/motion patterns,
   record both advancing in the same view and retain exact identities/logs.
   A freeze, duplicate feed, rapid switching or stale screenshot is a failure
   to demonstrate the objective. Do not infer silicon impossibility from one
   decoder or API failure. Do not brute-force private inputs or numeric handles.

Later tests need explicit human opt-in, bounded runtime, watchdog/manual exit,
tracked ownership and restoration, and a reviewed plan. If no safe second-port route emerges, publish
that bounded negative result and reconsider scope with the owner; do not silently
pivot to IPTV.
