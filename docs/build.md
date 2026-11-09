# Build, inspect and install

Host prerequisites: Linux, C++11 compiler, CMake >=3.16, Ninja, Node >=20 (CI:
22), npm, Python 3 and binutils `ar`. No webOS runtime libraries needed for host
tests. Use an ordinary user account. Dependency versions are pinned in
package-lock.json; CLI build tools are not bundled in the TV package.

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

`npm test` creates synthetic web/timeout reports in build/reports; run it before
the native redirection and schema checks. These are host/synthetic evidence,
not C1 results. `lint` checks ES5 syntax and JSON parseability, not a general
style linter. C++ warnings are errors for the inventory core.

The official `@webos-tools/cli` 3.2.6 packages only the six allowlisted app files.
Packaging uses `--no-minify` to preserve auditable source bytes and a build-local
APPDATA directory to avoid changing user CLI device profiles. `verify-ipk.py`
checks the ar/tar structure, exact regular file allowlist, no links/device nodes/
executable files/install scripts, and exact source payload bytes. It does not
prove device install success. CLI-generated archive timestamps may differ;
byte-for-byte reproducible IPK containers are **not claimed**. Report generation
and source payload are deterministic for identical inputs.

Output: `dist/io.github.tpapaz.multiview.probe_0.1.0_all.ipk`. `all` is correct
for this **web-only** app; no native ELF or root service is embedded. No NDK is
needed for this artifact. Do not package or transfer build/host/multiview-probe
as a TV executable.

## Optional native ARM inventory — toolchain currently unavailable here

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
firmware** before transfer. Do not run an unreviewed binary as root or copy host
libc/libstdc++/SDL into the TV. Upstream `webosbrew-ipk-verify`/firmware-symbol
checks may help if a native package is later added, but this PR does not create
or ABI-validate a native IPK. Merely naming the NDK path is not a cross-build.

## Human-operated web package installation

Only use an already authorized local device profile configured in LG's CLI or
webOS Dev Manager. Do not put TV addresses/credentials in this repo or cloud chat.
These commands are **not run by Codex**. See the [C1 protocol](device-tests/lg-c1-phase-0.md)
for opt-in and expected evidence. Replace `c1` with your existing local alias.

```sh
npx --no-install ares-install -d c1 dist/io.github.tpapaz.multiview.probe_0.1.0_all.ipk
npx --no-install ares-launch -d c1 io.github.tpapaz.multiview.probe
npx --no-install ares-launch -d c1 --close io.github.tpapaz.multiview.probe
npx --no-install ares-install -d c1 --remove io.github.tpapaz.multiview.probe
```

Installation is ordinary app deployment, without root requirements. Do not
change bus permissions/jails or use Homebrew root-service impersonation if the
query is denied. Device install, runtime bridge availability, on-TV download,
remote close/focus and uninstall remain unverified until the human protocol runs.
