# Local build and checks

[Status](../STATUS.md) · [Current procedure](device-tests/current-plan.md) ·
[Repository layout](repository-layout.md)

Use PowerShell on Windows and the existing Ubuntu WSL SDK for Linux work. No
GitHub Actions, automatic commit/push, new toolchain or pnpm fallback. These
commands are local checks; they do not authorize a TV operation. Build-time flags
in original package records remain build-time facts; the journal owns later TV
outcomes and Status owns readiness.

## Portable repository checks

```powershell
npm ci # only when dependencies need installation
npm test
npm run lint
npm run test:controls
git diff --check
```

Tests use synthetic transports and fixtures for strict dual-clock authority,
one-shot dispatch, report/privacy/partial/conflict states, exact generated role
and policy linkage, bounded collection, cancellation and cleanup. They do not
load a device profile or prove physical HDMI operation. Lint discovers host CJS
files and application/native/schema JSON instead of maintaining parallel lists;
the three browser scripts retain their ES5 syntax requirement.

## Existing native toolchain

- SDK: `/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot`
- Linux Node: `/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node`
- Repo in WSL: `/mnt/d/Development/webos-multiview`
- Packaging CLI: pinned `@webos-tools/cli@3.2.6` in package-lock.

Retail C1 apps use ARM32 soft-float and `/lib/ld-linux.so.3`. Saved firmware is a
private linking/ABI input, never bundled. A missing SDK/private provider is a
blocker, not authority to fetch from TV or substitute a different target. The
extracted WSL toolchain is used directly; redundant download archives are not
build dependencies. [Retention rules](repository-layout.md#local-build-material).

## Native contracts and preserved artifacts

| Artifact | Contract / local recipe | Preserved record |
|---|---|---|
| Original physical 0.1.4 | [Contract](../native/phase2-hdmi-window/README.md); scripts/prepare-hdmi-window.py | build/phase-2/hdmi-window-0.1.4/package-validation.json |
| Inert 0.1.5 | [Contract](../native/phase2-entry-diagnostic/diagnostic.h); scripts/prepare-entry-diagnostic.py | build/phase-2/entry-diagnostic-0.1.5/package-validation.json |
| Inert 0.1.6 | native/phase2-entry-diagnostic-0.1.6; same retained preparation recipe | build/phase-2/entry-diagnostic-0.1.6/package-validation.json |
| Physical 0.1.7 | [Contract](../native/phase2-hdmi-picture/README.md); scripts/prepare-hdmi-picture.py | build/phase-2/hdmi-window-0.1.7/package-validation.json |
| Setup-only 0.1.8 | [Contract](../native/phase2-setup-diagnostic/README.md); scripts/prepare-setup-diagnostic.py | build/phase-2/entry-diagnostic-0.1.8/package-validation.json |

These recipes refuse occupied versioned outputs/IPKs. Do not delete evidence to
force packaging again. Native revisions require a new version/fresh slots and
local validation. Native/import/archive checks do not establish loader/runtime
success, live caller admission, actual exit or hardware release.

Run existing host executables and direct ABI checks locally:

```powershell
wsl -d Ubuntu --exec ctest --test-dir /mnt/d/Development/webos-multiview/build/phase-2/hdmi-window-host-0.1.7 --output-on-failure
wsl -d Ubuntu --exec ctest --test-dir /mnt/d/Development/webos-multiview/build/phase-2/entry-diagnostic-host-0.1.8 --output-on-failure
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/tests/host/native_abi_versions_test.py
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/check-hdmi-picture-deadlines.py
```

After removing object/dependency caches, `cmake --build <existing-build-dir>`
regenerates them; preserve final binaries, CMake configuration and test outcomes.
Do not treat a test against an old executable as validation of changed sources.

## Offline registration correction

[Reviewed patch](../native/phase2-hdmi-picture/registration-before-graphics.patch)
moves named registration/identity/context/disconnect checks ahead of graphics,
with both strict guards, geometry and cleanup unchanged. It was applied only in
build/offline-registration-review-20261115-001/source; real begin-body controlled
host scenarios, ARM build, 96 direct imports/nine DSOs and both native CTests
passed. Record: validation.json in that review directory; direct-abi.json records
its ELF. No new IPK/version or TV result. The original 0.1.7 source is unchanged.
[Mechanism and remaining uncertainty](research/c1-hdmi-interface-map.md#registration-identity-and-smallest-correction).

A later fresh setup-only candidate should incorporate this order and report
closed registration-error categories. No current run command is authorized.
Local runner checks remain safe:

```powershell
node scripts/run-setup-diagnostic.cjs --plan
node scripts/run-hdmi-picture.cjs --plan
```

They verify local pinned inputs and do not import the device adapter. Physical,
inert and setup runners have distinct version/report/timing contracts. Never use
an old runner or occupied report slot for a new diagnostic.

## Offline device-evidence replay

Private captures are intentionally absent from a fresh clone. The
[policy guide](../native/phase2-hdmi-window/policy/README.md#offline-coverage-acceptance)
owns checker phase semantics. Example, using saved files only:

```powershell
node scripts/check-hdmi-utp-coverage.cjs overlay build/phase-2/utp-activation-0.1.4-20261114-001/baseline build/phase-2/utp-activation-0.1.4-20261114-001/overlay
```

The dedicated setup collector omits UTP-map queries. A failed/missing gate stops;
no fallback retrieval, repairs or automatic retries. Preserve earlier failed
acceptance states and private authority.

## Inert native-entry diagnostic 0.1.5

Preserved artifact pins, not installation/run instructions. Actual dated outcomes
are in the [journal](device-tests/c1-journal.md#015-inert-diagnostic--realtime-guard-rejected).

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| 0.1.5 IPK | 11,080 | b5765948a9fd250454c4584343f9ffa5f5954301b93166579d66bd0cf301a7b0 |
| 0.1.5 ELF | 23,708 | 15ae289ef204778bd453a3efffc7eae5277c7d90888e973f7c01341b9904eae8 |
| 0.1.5 appinfo | 265 | 671c1b591cb3593ac018fe25d651a16c7e19797702d71913250c0e9704ce7933 |
| 0.1.6 IPK | 11,076 | 56b0e79157c24232aefb058c3482fe857517a71670d2ff5b27517c073c4584ec |
| 0.1.6 ELF | 23,708 | 2aabe2cb6e46372eb511604266d251910b80259d6a2a8eee5272dbb9d6329b11 |

## Retained controls and historical commands

Root CMake builds the passive inventory/control project; npm run package packages
the passive UI. Neither builds a current HDMI diagnostic. Earlier Phase 0/1,
admission, IWC and lifecycle sources/IPKs remain controls, not queued tests.
[Historical recipes](archive/build-reference-2026-11-12.md). Mode correction and
activation tools remain dormant and must not be invoked as generic preflight.
