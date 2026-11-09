# Phase 0: audit native input boundaries and add a passive capability probe

## Problem and result

Two independently live physical HDMI inputs on the LG C1 are unproven. Existing
media playback, output capture and newer-model camera overlays do not demonstrate
that capability. This PR establishes the Phase 0A evidence and safe 0B probe
without allocating HDMI, capture, decoder or compositor resources.

The web-only probe performs a user-requested, time-bounded metadata query and
exports allowlisted JSON. The separate portable native CLI checks seven fixed
library paths using stat and is not embedded in the web package. Every functional
capability remains unknown. No root helper, boot hook or arbitrary IPC is added.

## Scope and evidence

- Pinned audits of samples, Hyperion, IPTV, HomeBack, HA PiP, Homebrew guide source
  and userland, with licensing boundaries and exact source links; apps-repo #87
  and current LG public device/ACG/CLI references. Record inaccessible support
  pages instead of attributing claims to them.
- Capability schema and evidence rules, CMake/Ninja scaffold, mock/privacy tests,
  host/package CI and exact build/inspect/install/remove instructions.
- Human-operated C1 protocol, explicit Phase 0C prerequisites and later gates.
  No firmware changes, input switching, capture, DRM bypass or active TV tests.

## Validation

- Seven Node tests, ES5/JSON checks, native host build and one CTest pass.
- Independent JSON Schema checks pass for synthetic web, timeout and native
  host reports, including rejection of unsupported extra/private fields and
  verified claims without evidence.
- Headless Chromium at 1920x1080: missing-bridge fallback, mocked metadata,
  redaction, cleanup, download, cancel, arrow focus and report scrolling pass;
  no relevant console/page errors. A browser timer-binding bug was fixed and
  regression-tested. These are mocked host checks, not a webOS simulator test.
- Official webOS CLI 3.2.6 packages the web-only IPK; archive allowlist and exact
  source-byte inspection pass. Archive timestamp reproducibility is not claimed.

## Limits and next gate

No TV has been accessed. Native ARM compilation and ABI verification are blocked
by the missing openlgtv toolchain; no ARM artifact is supplied. C1 bridge/runtime,
install/export/close/uninstall and all physical-input capabilities are unverified.
SMP exported windows are a promising later **presentation** route; independent
HDMI ingress/ownership remains the decisive unknown. Collect a genuine passive
C1 report before separately reviewing two-local-clip and then physical-input
experiments. See docs/validation.md and docs/device-tests/lg-c1-phase-0.md.

The remote repository was empty. The supplied starter documents are preserved in
an initial main commit, with this implementation on codex/phase-0-passive-probe.
