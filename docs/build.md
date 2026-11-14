# Local build and checks

[Status](../STATUS.md) · [Candidate contract/artifacts](../native/phase2-hdmi-window/README.md) ·
[Current device procedure](device-tests/current-plan.md)

Use PowerShell on Windows and the existing Ubuntu WSL SDK for Linux work. No
GitHub Actions, automatic commit/push, new toolchain or pnpm fallback. These
commands are local checks, not authorization for TV installation or execution.

## Portable repository checks

With the pinned npm dependencies installed (`npm ci` on a fresh checkout):

```powershell
npm test
npm run lint
npm run test:controls
git diff --check
```

Current npm tests use synthetic fixtures for report/privacy, exact generated
policy linkage, dual-clock launch freshness, group/method coverage and two-file
mode-correction rules. They load no device profile or network module and need no
private firmware. The retained controls cover earlier probe/local-clip report
rules; none launches an app or proves a physical picture.

## Existing native toolchain

- SDK: `/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot`
- Linux Node: `/home/tasos/.cache/webos-multiview/node-v22.17.0-linux-x64/bin/node`
- Repo in WSL: `/mnt/d/Development/webos-multiview`
- Packaging CLI: `@webos-tools/cli@3.2.6`, pinned in package-lock.

Retail C1 apps use ARM32 soft-float and `/lib/ld-linux.so.3`; its kernel ABI does
not establish the app ABI. Firmware providers are local linking/check inputs,
never redistributed libraries. Missing SDK/private evidence is a build blocker,
not permission to fetch from TV or substitute a different target.

## Phase 2 single-HDMI candidate

The canonical artifact hashes and exact contract are in the candidate README.
0.1.4 was built/tested/packaged/direct-ABI checked; installed files/modes and narrow
permission coverage are verified separately in the C1 journal. No 0.1.4 app,
clock/graphics integration, live HDMI or restoration test has run.

For the existing local artifacts:

```powershell
wsl -d Ubuntu --exec ctest --test-dir /mnt/d/Development/webos-multiview/build/phase-2/hdmi-window-host-0.1.4 --output-on-failure
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/tests/host/native_abi_versions_test.py
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/verify-ipk.py --hdmi-window /mnt/d/Development/webos-multiview/dist/io.github.tpapaz.multiview.hdmiwindow_0.1.4_arm.ipk
```

CTest runs the compiled host acquisition/cleanup/freshness acceptance rules, not
the ARM executable. Rebuild host tests after native changes. ABI checks cover
exact direct imports/providers, not the full SDL closure/dlopen or runtime graphics.
Package inspection confirms the allowed contents and Linux 0755/0644 staging.

Full recipe, already completed for 0.1.4:

```powershell
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/prepare-hdmi-window.py
```

It refuses existing versioned output/IPK. Preserve evidence; a later native
revision needs a new version/fresh outputs, not deletion to force a rebuild.
Records are under `build/phase-2/hdmi-window-0.1.4/`, with versioned ARM/host peers.
The recipe runs host/native tests, ARM compilation, saved-provider ABI validation,
Linux staging, local packaging and archive inspection. No vendor library, policy,
installer, service or autostart is bundled.

## Offline device-evidence replay

This requires the original private captures and saved reference pins; a fresh
clone intentionally lacks them. It never loads profiles, connects or deploys:

```powershell
node scripts/check-hdmi-utp-coverage.cjs overlay build/phase-2/utp-activation-0.1.4-20261114-001/baseline build/phase-2/utp-activation-0.1.4-20261114-001/overlay
```

The [policy guide](../native/phase2-hdmi-window/policy/README.md#offline-coverage-acceptance)
owns all phase semantics. Missing/unbound input fails without retrieval. Keep
original failed native/transaction reports unchanged; current-version validators
must not relabel older captures.

## Retained controls and historical commands

Mode correction is **not needed** for the verified installation. Its source/tests
remain a dormant control. `scripts/restore-hdmi-window-modes.cjs --plan` is local
only and requires the exact package record plus private saved references for later
execution, including the frozen transport under `build/phase-2/hdmi-correction-0.1.3/`.
It is not a self-contained fresh-clone TV utility; do not run mutation flags as a
build check. Frozen incident helpers/occupied reports are never rerun or rewritten.

The earlier apps/scripts/IPKs are controls, not scheduled tests. Root CMake still
builds the passive inventory/control project; `npm run package` packages the
original passive UI, not the HDMI candidate. Use the [historical build reference](archive/build-reference-2026-11-12.md)
only for dated Phase 0/1/admission/lifecycle recipes, with their unresolved limits.
All active TV work belongs to the current plan and explicit owner scope.
