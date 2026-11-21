# Build and validate the current prototype

[Status](../STATUS.md) · [Contract](../native/phase2-hdmi-candidate-0.1.12/README.md) · [Layout](repository-layout.md)

## Offline host checks

The [offline receiver decoder](research/c1-receiver-decoder.md#offline-receiver-decoder) runs with stock Node.js. It reads one capture of HDMI backend, TVRM and media-server JSONL events from standard input, with optional ordered TVRM slot diagnostics. Its host acceptance tests run in `npm test` or separately with `node --test tests/host/hdmi-receiver-decoder.test.cjs`.

The [stock HDMI 1 replay tests](research/c1-receiver-decoder.md#stock-hdmi-1-filter-replay) also run the saved monitor’s AWK selector against synthetic input. On Windows they use the AWK executable bundled with Git for Windows.

`npm test` includes the [bounded monitor acceptance tests](../tests/host/stock-hdmi1-monitor.test.cjs). Run them separately with `node --test tests/host/stock-hdmi1-monitor.test.cjs`. They use an in-memory SSH substitute and a local Bash pipeline with a synthetic producer. On Windows the shell test uses Git Bash.

From the repository root in PowerShell:

~~~powershell
npm test
npm run lint
npm run test:controls
~~~

The default suite exercises the current prototype, both browser probes and the receiver decoder with simulated transports. The optional controls cover the retained passive and local-media code.

<details>
<summary>Reproduce host checks for the completed read-only collectors</summary>

Run in a normal Windows user context for the owner-only file and directory ACL checks. The tests use synthetic transports or local loopback. The plan commands validate local pins. The original scopes and receipts are in the [collection archive](device-tests/archive/c1-hdmi-collection-2026-11-15-to-17.md).

~~~powershell
node tests/host/hdmi-element-collector.test.cjs
node scripts/collect-hdmi-elements.cjs --plan
node tests/host/hdmi-host-key-check.test.cjs
node scripts/check-hdmi-host-key.cjs --plan
node tests/host/resource-client-collector.test.cjs
node scripts/collect-resource-client.cjs --plan
node tests/host/videooutput-collector.test.cjs
node scripts/collect-videooutput.cjs --plan
node tests/host/val-library-reader.test.cjs
node scripts/collect-val-library.cjs --plan
node tests/host/val-capability-reader.test.cjs
node scripts/collect-val-capability.cjs --plan
~~~

</details>

Native acceptance requires CMake/Ninja, json-c and GLib in the existing Ubuntu
WSL environment. Use fresh output directories for the entry/trace/witness and
adapter/core acceptance projects:

~~~powershell
wsl -d Ubuntu --exec cmake -S /mnt/d/Development/webos-multiview/native/phase2-hdmi-candidate-0.1.12 -B /mnt/d/Development/webos-multiview/build/check-prototype -G Ninja -DCMAKE_BUILD_TYPE=Debug
wsl -d Ubuntu --exec cmake --build /mnt/d/Development/webos-multiview/build/check-prototype
wsl -d Ubuntu --exec ctest --test-dir /mnt/d/Development/webos-multiview/build/check-prototype --output-on-failure
wsl -d Ubuntu --exec cmake -S /mnt/d/Development/webos-multiview/native/phase2-hdmi-dispatch -B /mnt/d/Development/webos-multiview/build/check-adapter -G Ninja -DCMAKE_BUILD_TYPE=Debug
wsl -d Ubuntu --exec cmake --build /mnt/d/Development/webos-multiview/build/check-adapter
wsl -d Ubuntu --exec ctest --test-dir /mnt/d/Development/webos-multiview/build/check-adapter --output-on-failure
~~~

If json-c headers are not on the host search path, supply
-DJSON_C_INCLUDE_DIR=<existing-json-c-include-directory>. The current workspace
retains its validated header input at
build/phase-2/entry-diagnostic-host-0.1.11/include. That is a local dependency,
not another installed app. Do not delete all build evidence as a cache cleanup.

On 2026-11-18 the offline review passed `npm test`, `npm run lint`,
`npm run test:controls`, the six collector suites and their plan commands.
The root, native 0.1.12 and dispatch projects passed all ten WSL CTest cases
in Release builds. The ABI version test and report schema test passed.
The source-only checkout also passed the default tests and lint with the
installed npm dependencies. The retained 0.1.12 artifact passed its local
hash checks. These checks cover host behavior and package integrity.

## Browser HDMI preview

~~~powershell
npm run test:hdmi-browser
npm run package:hdmi-preview
npm run package:hdmi-pair
~~~

The browser apps use the existing webOS CLI and require no ARM compilation. The default output is `dist/`. Packaging refuses to overwrite an existing IPK. For a verification rebuild, pass a fresh output directory, for example `npm run package:hdmi-preview -- build/preview-rebuild`. Each package stages its manifest, HTML, JS, CSS and shared icon.

| App | Package and behavior |
|---|---|
| Single HDMI preview | `io.github.tpapaz.multiview.hdmipreview_0.1.0_all.ipk`. Explicit opt-in opens HDMI 4 for a bounded observation. [TV result](device-tests/c1-journal.md#browser-hdmi-4--moving-picture-and-sound) |
| HDMI pair probe | `io.github.tpapaz.multiview.hdmipair_0.1.4_all.ipk`. A fresh owner-armed relaunch starts HDMI 4, then a separate OK starts HDMI 1. The `traceHdmi1: true` mode opens HDMI 1 alone. The last trial log survives an idle reopen or stale arm. Host-tested and packaged locally. The TV evidence is from pair 0.1.2 and 0.1.3. [Device disposition](device-tests/current-plan.md#browser-hdmi-4-preview) |

## ARM build and saved ABI inputs

The existing extracted SDK is
/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot.
Use its share/buildroot/toolchainfile.cmake with the current candidate CMake
project in a fresh build directory. Retail C1 uses ARM32 soft-float and
/lib/ld-linux.so.3. Supply the retained C1 LS2/json-c/rt/pthread libraries used
by the existing build rather than inventing or downloading replacement providers.
The sources must not bundle those firmware libraries.

The current ELF is already built and direct-ABI checked:118 imports/10 exact
saved providers,112,020 bytes. scripts/verify-hdmi-window-abi.py checks a specified
local ELF using retained provider inventories. Native/ASan/UBSan acceptance and
the one actual lifecycle/physical TV result are recorded with the artifact;
build success alone never establishes firmware runtime behavior or dual HDMI.
ThreadSanitizer could not start in the tested host environment; no pass is claimed.

## Native media registration helper

Build the [registration helper](../native/phase2-media-registration/main.cpp) from the repository root with the existing WSL SDK and an existing local output directory.

~~~powershell
wsl -d Ubuntu --exec /home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot/bin/arm-webos-linux-gnueabi-g++ -std=c++14 -Wall -Wextra -Werror -Os native/phase2-media-registration/main.cpp -lplayerAPIs -o build/phase-2/c1-helper-media-registration.elf
~~~

The local build produced an 8,368-byte ELF32 ARM executable, SHA-256 `cc55a6296d8cb9571f902a430a136657194515d08c2f60af8929b48e454924b8`. The helper checks whether the SDK returns a nonempty pre-load media ID. Its eight-second alarm covers player construction, the getter and destruction. Its own output reports only presence or absence. This artifact has no HDMI open, selection or ownership calls. Packaging, target execution and runtime registration are unverified.

## HDMI 1 ownership probe core

The [core](../native/phase2-media-registration/ownership.cpp) uses the SDK player as the parent. It passes the parent ID only to open and uses the fresh logical session ID for selection and cleanup. A failed stop still leads to one close attempt. The result records both acknowledgments and local teardown separately. A completed observation window provides no owner-association or picture evidence.

Run from PowerShell with the existing WSL environment and a fresh output directory under ignored `build/`:

~~~powershell
$probeBuild = 'build/phase-2/hdmi1-ownership-offline-local'
New-Item -ItemType Directory -Path $probeBuild -ErrorAction Stop | Out-Null
wsl -d Ubuntu --exec cmake -S . -B "$probeBuild/host" -G Ninja -DCMAKE_BUILD_TYPE=Release
wsl -d Ubuntu --exec cmake --build "$probeBuild/host" --target hdmi1-ownership-test
wsl -d Ubuntu --exec ctest --test-dir "$probeBuild/host" -R hdmi1-ownership-lifetime --output-on-failure
wsl -d Ubuntu --exec /home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot/bin/arm-webos-linux-gnueabi-g++ -std=c++14 -Wall -Wextra -Wpedantic -Werror -Os -fPIC -shared '-Wl,-z,defs' native/phase2-media-registration/ownership.cpp -lplayerAPIs -o "$probeBuild/libhdmi1-ownership.so"
~~~

**2026-11-22, offline.** All four root CTest cases passed. The [lifetime test](../tests/host/hdmi1_ownership_test.cpp) compiles the same core against a substitute SDK and port-1 session. It covers the complete sequence, failed registration, unusable IDs, ambiguous open, cancellation, failed selection, interrupted observation and teardown failures. The separate SDK link produced an 8,380-byte ARM32 shared library with SHA-256 `566332c59555dfac3ca8e68d15b79a99b2ae58c5cf9ebaaadd0cdbfeb8390201`. Its constructor, getter and destructor imports match exports in the saved C1 `libplayerAPIs.so.1` (`0b0f665415e6`). This checks those three symbols only. The [device adapter requirements](device-tests/current-plan.md#one-remaining-native-candidate) remain open. Packaging and TV execution have not occurred.

## Current package and immutable records

IPK: dist/io.github.tpapaz.multiview.hdmiwindow_0.1.12_arm.ipk,51,124 bytes,
SHA256 cb7ec17381a23526299545300f5437c3d1fbeb12e45f1466adc05a71ec829e4f.
Build/package/ABI records: build/phase-2/physical-candidate-0.1.12/.
[Actual picture result](device-tests/c1-journal.md#0112-physical-hdmi-4--moving-picture-and-sound).

The build record retains its build-time archiveVerified false fact. The separate
package-validation.json binds its exact hash, ELF, manifest/version/schema and
IPK bytes. Later TV outcomes remain separate immutable captures. Do not rewrite
old receipts to make cleanup or a later device result appear to have happened
at build time.

The pinned validate-physical-candidate.py and package-physical-candidate.py are
as-built one-shot recipes. Their occupied outputs are preserved, and their old
preservation inputs include retired controls/IPKs. They are retained as current
artifact provenance, not rerunnable commands for the consolidated tree. A future
native revision needs a fresh version/output contract. No package is built here.

## Safe local plan and device execution

~~~powershell
node scripts/run-physical-candidate.cjs --plan
~~~

This hashes local sources/package and reports the plan without loading the TV
adapter. Live flags are owned by the prototype contract and require explicit
owner scope. Retain normal PowerShell foreground execution, prompt owner timer
cue and scheduled bounded collection. No dev server, GitHub Actions, automatic
commit/push, TV connection or install is part of any offline check.
