# Contributor Instructions — webOS MultiView

Read `ROADMAP.md` and the current research and decision records before making changes.

Current Phase 1 direction: validate repeatability and endurance of the
owner-observed SMP main_video/sub_video local-clip combination. Read
`docs/decisions/0002-main-sub-validation.md`, the Phase 1 device record and
the build guide before preparing another experiment. Keep historical controls.
Build artifacts locally in the existing Linux SDK under WSL; do not add or
invoke GitHub Actions, including push-triggered workflows. Never commit or push.

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
