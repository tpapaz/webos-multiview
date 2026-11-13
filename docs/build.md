# Local build and checks

[Status](../STATUS.md) · [Candidate contract/artifacts](../native/phase2-hdmi-window/README.md) ·
[Current device procedure](device-tests/current-plan.md)

Build locally; no GitHub Actions, automatic commit/push or TV execution. Use
PowerShell on Windows. Linux-host tests and ARM builds use the existing Ubuntu
WSL SDK; do not download another toolchain or use pnpm as a fallback.

## Existing toolchain

- SDK: `/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot`
- Linux Node: `/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node`
- Repo in WSL: `/mnt/d/Development/webos-multiview`
- Local CLI: `@webos-tools/cli@3.2.6`, pinned in `package-lock.json`.

C1 apps are ARM32 soft-float with `/lib/ld-linux.so.3`; an aarch64 kernel does
not establish an aarch64 app ABI. Saved runtime inputs are link/check inputs only,
not redistributed libraries. Missing SDK/runtime evidence is a blocker, not
permission to invent an IPK or call a different target.

## Phase 2 single-HDMI candidate

Current artifact/hashes and verification limits live in the candidate contract.
Version 0.1.3 is locally packaged/direct-ABI checked, not installed or TV-tested.
For existing local artifacts, run from repo PowerShell:

```powershell
npm test
npm run lint
wsl -d Ubuntu --exec ctest --test-dir /mnt/d/Development/webos-multiview/build/phase-2/hdmi-window-host-0.1.3 --output-on-failure
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/tests/host/native_abi_versions_test.py
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/verify-ipk.py --hdmi-window /mnt/d/Development/webos-multiview/dist/io.github.tpapaz.multiview.hdmiwindow_0.1.3_arm.ipk
git diff --check
```

`npm test` runs the current portable HDMI report/launch/policy checks.
CTest runs the existing compiled host acquisition/admission acceptance tests;
rebuild them after changing native source. No ARM executable is run by these
commands. Schema/privacy/ABI checks cannot establish visible HDMI or restoration.

The complete local build recipe is:

```powershell
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/prepare-hdmi-window.py
```

It requires fresh versioned outputs and intentionally refuses the retained
0.1.3 directories/IPK. Do not delete evidence to force a rebuild. The recipe
runs focused host checks, ARM compilation, saved-provider ABI validation,
Linux staging (0755 executable/0644 metadata), local packaging and archive
inspection. Exact 0.1.3 completion records remain in
`build/phase-2/hdmi-window-0.1.3/`, including `package-validation.json`,
`direct-abi.json` and `finish-clock-provider.py`. Full SDL closure/dlopen and
actual loader execution remain unchecked.

## Retained controls and historical commands

The earlier apps, scripts, tests and IPKs remain useful controls; none is
scheduled to rerun. `npm run test:controls` retains the former portable Phase 0/1
suite. Separate IWC/lifecycle npm commands remain explicit opt-ins.
`npm run package` still packages the original passive probe; it is not the HDMI
packager. The root CMake project also remains the passive inventory/control project.

Use the [archived build reference](archive/build-reference-2026-11-12.md) for
passive-probe/schema setup, Phase 1 clip generation/builds, veto/mixed/main-sub
protocols, native inventory and historical installation commands. Actual outcomes
are in the [C1 journal](device-tests/c1-journal.md). Screensaver work is closed,
Phase 1 is partial and the IWC preflight is paused. Historical device commands
are not authorization to install, launch or deploy anything.
