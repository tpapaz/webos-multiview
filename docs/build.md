# Build, inspect and install

## Passive probe and host checks

Host prerequisites: C++11 compiler, CMake >=3.16, Ninja, Node >=20 (CI:
22), npm, Python 3 and binutils `ar`. No webOS runtime libraries needed for host
tests. The following host checks use a Linux shell. Dependency versions are
pinned in package-lock.json. CLI build tools stay on the development PC.

```sh
npm ci --no-audit --no-fund
python3 -m venv .venv
.venv/bin/python -m pip install jsonschema==4.23.0
npm run lint
npm test
cmake -S . -B build/host -G Ninja -DCMAKE_BUILD_TYPE=Release
cmake --build build/host
ctest --test-dir build/host --output-on-failure
build/host/multiview-probe > build/reports/native.report.json
.venv/bin/python tests/host/schema_test.py
npm run package
python3 scripts/verify-ipk.py dist/io.github.tpapaz.multiview.probe_0.1.0_all.ipk
```

`npm test` generates synthetic reports for the schema checks. The passive
IPK is web-only. `verify-ipk.py` checks archive structure, file allowlist
and payload bytes. Archive timestamps can change the package hash.

## Phase 1 local clip packages

On Windows, use PowerShell with FFmpeg and FFprobe on PATH. For the ARM
packages, install Ubuntu in WSL with CMake, Ninja, Python 3, binutils, Node 22
and the [2026.08 Linux webOS SDK](https://github.com/openlgtv/buildroot-nc4/releases/tag/2026.08-webos).
Extract the ARM SDK on the Linux filesystem and run its `relocate-sdk.sh`.
Set `$sdk` to its absolute Linux path.

```powershell
npm ci --no-audit --no-fund
./scripts/make-phase1-clips.ps1
node scripts/package.cjs browser

$repo = wsl -d Ubuntu --exec wslpath -a (Get-Location).Path
$sdk = '/absolute/linux/path/to/arm-webos-linux-gnueabi_sdk-buildroot'
wsl -d Ubuntu --exec cmake -S "$repo/native/phase1-ndl" -B "$repo/build/phase-1/ndl" -G Ninja -DCMAKE_BUILD_TYPE=Release "-DCMAKE_TOOLCHAIN_FILE=$sdk/share/buildroot/toolchainfile.cmake"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-1/ndl"
./scripts/package-phase1.ps1 -Target ndl
wsl -d Ubuntu --exec python3 "$repo/scripts/verify-ipk.py" --ndl "$repo/dist/io.github.tpapaz.multiview.ndl_0.1.0_arm.ipk"
```

If Node 22 is outside the Linux PATH, pass `-LinuxNode /absolute/linux/path/to/node`
to the packager. It stages the ARM executable on Linux with mode `0755`.
The SMP build uses `native/phase1` with output `build/phase-1/arm` and
`./scripts/package-phase1.ps1` without `-Target ndl`.

| App | Output under `dist/` | Run after installing and opening in Dev Manager |
|---|---|---|
| HTML5 comparison | `io.github.tpapaz.multiview.browser_0.1.0_all.ipk` | `node scripts/run-phase1-browser-ssh.cjs` |
| Native SMP stages | `io.github.tpapaz.multiview.phase1_0.1.4_arm.ipk` | `node scripts/run-phase1-ssh.cjs` |
| Native NDL v2 solo | `io.github.tpapaz.multiview.ndl_0.1.0_arm.ipk` | `node scripts/run-phase1-ndl-ssh.cjs` |

Use an authorized local SSH profile. Pass its alias to the runner if
several root profiles are configured. [C1 playback record](device-tests/lg-c1-phase-1.md)

## Optional native ARM inventory

Use the [openlgtv buildroot NDK](https://github.com/openlgtv/buildroot-nc4) path
used by the pinned webosbrew samples, matching the reference TV's userspace:

```sh
cmake -S . -B build/tv -G Ninja -DBUILD_TESTING=OFF \
  -DCMAKE_TOOLCHAIN_FILE=/opt/arm-webos-linux-gnueabi_sdk-buildroot/share/buildroot/toolchainfile.cmake \
  -DCMAKE_BUILD_TYPE=Release
cmake --build build/tv --target multiview-probe
readelf -h build/tv/multiview-probe
readelf -d build/tv/multiview-probe
readelf --version-info build/tv/multiview-probe
```

Review ELF architecture (expected candidate: ARM 32 bit, verify against device),
interpreter, DT_NEEDED and GLIBC/GLIBCXX symbol versions against the **exact C1
firmware** before transfer. The portable inventory is a separate CLI. The
two Phase 1 ARM packages use the TV's own shared libraries.

## Human-operated web package installation

Use Dev Manager or the commands below with your authorized local alias
in place of `c1`. [Passive test procedure](device-tests/lg-c1-phase-0.md#repeat-the-test)

```sh
npx --no-install ares-install -d c1 dist/io.github.tpapaz.multiview.probe_0.1.0_all.ipk
npx --no-install ares-launch -d c1 io.github.tpapaz.multiview.probe
npx --no-install ares-launch -d c1 --close io.github.tpapaz.multiview.probe
npx --no-install ares-install -d c1 --remove io.github.tpapaz.multiview.probe
```
