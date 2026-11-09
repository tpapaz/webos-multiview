# Paste this prompt into Codex Cloud

You are the lead engineer and technical research agent for **webOS MultiView**, a new open-source standalone Homebrew app for rooted consumer LG webOS televisions.

**First, read `ROADMAP.md` and `AGENTS.md` in the root of this repository.** Treat those as the authoritative product scope and safety rules. If the files are absent in the repo, ask me to add them or use this task's attached versions; do not silently replace the physical HDMI objective with an IPTV-only product.

## Core project outcome

We want a standalone app where users can choose two or more sources and arrange them in draggable/resizable PiP, side-by-side or grid windows on their LG TV, using **only the TV's hardware** (no external capture cards, splitters or PCs). Sources include HDMI ports, internal tuner, supported webOS app surfaces and network streams. The first and most important hardware question is whether a rooted **LG OLED C1 (2021 / webOS 6 generation)** can simultaneously display **two distinct live HDMI inputs**, e.g. HDMI 1 (PS5) plus HDMI 2 (PC).

Root access is not proof that independent input pipelines exist. Do not overclaim. Hardware limitations are an acceptable research outcome if evidenced.

## Your assignment: Phase 0A and safe parts of 0B ONLY

1. **Research audit:** inspect the latest applicable code and documentation in these sources:
   - https://github.com/webosbrew/samples
   - https://github.com/webosbrew/hyperion-webos
   - https://github.com/webosbrew/apps-repo/issues/87
   - https://github.com/sharktie/lg-iptv
   - https://github.com/angelcode1/webos-HomeBack
   - https://github.com/iDaddyCz/ha-lg-webos-pip
   - https://www.webosbrew.org/guides/customize/multiview/
   Investigate additional official/homebrew documentation as needed. Include source URLs, relevant code paths and revisions, API descriptions, limitations, and licenses in `docs/research/prior-art.md`.
2. **Trace capability boundaries:** document how HDMI inputs are selected and owned, whether simultaneous HDMI source sessions have any precedent on consumer LG, whether the video capture backends expose only the active display signal, and how SMP/NDL exported video windows, plane management, compositor limitations and app lifecycle differ across webOS generations. Write a hypothesis and evidence matrix in `docs/research/c1-hypotheses.md`. Label all missing information clearly.
3. **Initialize repository:** sensible `README.md`, CMake-compatible native structure, simple frontend scaffolding if justified, schemas, host tests, documentation and CI. Do not create unnecessary modules that would misrepresent verified functionality.
4. **Implement a passive capability probe prototype:** collect permissible device/firmware information, inspect availability of candidate libraries/interfaces without activating or switching sources, expose redacted JSON according to a versioned schema, and add mockable host tests. If the development environment supports openlgtv NDK and packaging, produce a minimal installable Homebrew `.ipk`; otherwise set up exact reproducible build steps and explicitly report why an artifact could not be created.
5. **Write a C1 test protocol:** exact non-destructive actions a human can perform, commands/tools, expected evidence, opt-in boundaries, redaction, exit/rollback, and interpretation of each result. Do NOT run active HDMI/tuner/compositor tests from cloud environments.
6. **Deliver a bounded report:** changed files, commands run, unit/build/packaging results, sourced claims, known unknowns, and concrete Phase 0C on-device steps. Be explicit about what cannot be proven until the rooted C1 is tested.

## Hard constraints

- Do NOT attempt to bypass HDCP/DRM or capture protected media.
- Do NOT patch firmware, load kernel modules, restart/kill critical system services, or make persistent modifications as part of the first deliverable.
- Do NOT claim a dual-HDMI implementation exists just because native windows, IPTV multiview, or active-input capture exists.
- Do NOT fabricate observed TV logs, test outcomes, packaging artifacts, or upstream findings.
- Do NOT clone code into our repo without verifying licensing and attribution.
- Don't require root privilege for the entire app if a narrowly scoped helper can provide it.

## Acceptance criteria

The first PR should include a documented audit, a truthful evidence/unknowns matrix, a safe capability-schema implementation with host tests, a reproducible build or documented build blockers, and a clear C1 manual-test guide. The code should build in its supported host environment and not assume access to my physical television.

First tell me your brief plan and major uncertainties, then execute Phase 0 within these boundaries. In your final report, state the most promising technical route and the evidence still needed to decide whether to implement a full physical-input compositor.
