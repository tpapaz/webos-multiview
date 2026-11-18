# Contributor Instructions — webOS MultiView

Read `STATUS.md` first for the current result and single next task, then
`ROADMAP.md` and the linked research/decision records relevant to the change.
Use `docs/README.md` as the documentation index. Historical “next steps” in dated
records do not override `STATUS.md`; do not append chronological updates to the
roadmap or active handoff.
Before finishing each task, apply the [documentation update rules](docs/README.md#keeping-the-record-current). The [research history](docs/research/c1-hdmi-evidence-ledger.md#research-history) owns route transitions and their reasons.
Keep device testing in `docs/device-tests/c1-journal.md` (concise actual outcomes)
and `docs/device-tests/current-plan.md` (one current procedure). Do not create a
Markdown file per run. Preserve original reports/hashes; archive exceptional
historical detail and link to it only when needed.

Current direction: **Phase 2 HDMI acquisition/window research**. The defining
milestone is one physical HDMI picture, then independently live HDMI 1 + HDMI 2.
Use Status for exact installed version, current captured grant disposition and
readiness. Keep this file about contributor rules rather than a second handoff.
The owner grants standing permission for useful, bounded read-only TV research;
do not request permission again for each file, passive inspection or new read-only
evidence scope. Follow `docs/safety.md#standing-read-only-permission` and the
current plan's operational bounds. Preserve TV operation and critical files.
Use saved evidence first and follow the current plan's
[TV readiness rules](docs/device-tests/current-plan.md#tv-readiness) for live work.
Completed tests do not authorize app/HDMI acquisition, policy changes or power
actions. The current plan owns any proposed active trial.

Do not repeat activation, mode correction or boot diagnostics as generic preflight.
IWC setter work is paused; screensaver/Glasshouse work is closed/separate; Phase 1
remains partial. Preserve current prototype dependencies/IPK and original private
evidence/frozen inputs. Superseded standalone diagnostics may be retired after
checking current imports, recording useful findings and validating the prototype;
do not keep old implementations solely for historical purposes. Read
`docs/handoff/hdmi-next-chat.md`, the current plan, decision 0003 and build guide
before preparing an experiment. Build locally in the existing WSL SDK; no GitHub
Actions (including on push), automatic commit or push.

## Mission

Build a standalone, root-assisted Homebrew MultiView application for supported LG webOS televisions. The **defining research objective** is simultaneous, independently live **HDMI 1 + HDMI 2**, displayed in movable/scalable PiP or split-screen windows using the TV's own hardware. HDMI+tuner, apps and IP streams are additional goals, not replacements for the primary one.

## Evidence and accuracy

- Treat C1 simultaneous HDMI operation as an **unproven hypothesis**.
- Separate `verified`, `candidate`, `unknown`, `unsupported`, and `unsafe_to_test` in all prose and software reports.
- Do not equate exported symbols, compile success, active HDMI capture, or dual-IP playback with simultaneous HDMI support.
- Cite upstream URL, exact file/line or commit, hardware model, firmware and on-device test logs for technical claims.
- State clearly whether an artifact is built, packaged, ABI-checked, simulator-tested, or **actually TV-tested**.

## Change scope

- Stay within the active roadmap phase and the requested experiment.
- No fully featured PiP compositor or mock video screenshot presented as a working physical-input implementation.
- Keep patches small, focused and reviewable; log blockers and assumptions.
- Prioritize portable host tests, mockable interfaces and deterministic builds.
- Use the least privileged interfaces available; root-only operations must be isolated and reviewed.

## Mandatory safety rules

- No flash writes, kernel modules, firmware patches, critical service restarts, persistent system modifications, HDCP/DRM bypass or unauthorized access to TV services.
- No automatic active input switching during passive discovery.
- No arbitrary-command execution endpoints or exposure of privileged APIs through unvalidated Luna IPC.
- Timeouts, cancellation, cleanup, safe fallback, telemetry redaction and opt-in are required for any active device probe.
- Never ask for, commit or print passwords, access tokens, SSH private keys, or serial/network identifiers.
- Never claim remote access to or verification on the user's LG C1 unless an authorized human-operated test occurred and its evidence is available.

## Research & licensing

Audit relevant upstream projects, including `webosbrew/samples`, `webosbrew/hyperion-webos`, `webosbrew/apps-repo` issue #87, `sharktie/lg-iptv`, `angelcode1/webos-HomeBack`, and LG documentation. Do not copy code without confirming its license and attribution obligations.

## Development workflow

1. Read roadmap and open issues; identify exact acceptance gate.
2. Write an implementation plan within the PR/task before coding.
3. Implement, keeping hardware adapters stubbed/disabled until evidence exists.
4. Run host unit tests, linting and builds; record exact commands and outcomes.
5. If packaging toolchain unavailable, document the missing dependency and give exact local steps. Do not invent an `.ipk` artifact.
6. End with summary, changed files, tests run/not run, risks, outstanding device tests, and recommended next task.

Prefer CMake/Ninja and the relevant openlgtv toolchain for native code where upstream samples support them; use TypeScript/vanilla JS for a small, compatible webOS diagnostic UI. Avoid assuming the development host has the TV NDK or proprietary runtime libraries. Choose a package/application identifier owned by the repository's GitHub owner; do not appropriate the `org.webosbrew.*` namespace without authorization.
