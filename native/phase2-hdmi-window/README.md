# Single-HDMI owned-window candidate

[Current plan](../../docs/device-tests/current-plan.md) · [Acquisition evidence](../../docs/research/c1-hdmi-interface-map.md#focused-acquisition-and-owned-window-review--2026-11-12)

Original, minimal C1 client implementation. **Locally ARM-built and host
acceptance-tested; direct executable ABI checked. Not packaged, simulator-tested,
TV-tested or approved for device execution.** The saved client contract supports
this candidate; it does not prove Homebrew admission, safe release or live video.
No firmware implementation or upstream code is copied or bundled.

## Fixed behavior

Default launch exits 64 before SDL or LS2. Explicit JSON launch opt-in
`{"acquireHdmi4":true}` permits one attempt. Optional validated launcher metadata
is discarded; it cannot supply identities, port numbers, window IDs or endpoints.
No device launch command is authorized by this document.

The app creates one 1920×1080 SDL window, requiring that actual app size, and
one transparent exported region (type 2, matching saved InputCommon). The fixed
destination is (480,270,960,540). An opaque black surround and transparent interior
make the requested region identifiable; these graphics are not HDMI evidence.
It uses its own app/connection identity, with no root helper or proxy identity:

| Operation | Fixed request |
|---|---|
| `utp.extinputs/open` | `options.appId`: `io.github.tpapaz.multiview.hdmiwindow`; `options.windowId`: our freshly created export; `inputSourceType`: `HDMI` |
| `utp.extinputs/switchExternalInput` | Only the pipeline returned by our open; `portId: 4` |
| `utp.extinputs/stop`, then `close` | Only that returned pipeline, including after cancellation/selection failure |

The initial window binding is supplied at open. A redundant `setPipelineWindowId`
call is unnecessary. No IWC, SMP/decoder, capture, videooutput, audio, publication,
input-app launch or permission-setting API is used. Port selection is an active
operation and may affect shared hardware; running this is not read-only discovery.

After accepted selection, the observation interval lasts at most eight seconds.
Back/Exit/Escape, SDL close, focus/visibility loss, SIGINT/SIGTERM, a bus disconnect
or the native progression deadline stops further acquisition work. Each of the
four fixed methods has a two-second/4-KiB reply bound. In-flight open is drained
within its bound even on cancellation, so any valid returned ID is still released.
Stop failure does not suppress the close attempt. Unknown token cancellation
prevents overlapping further calls. Local cleanup cancels tokens, unregisters and
destroys only our exports/windows. Progression stops at +17 s; SIGALRM at +22 s
bounds blocking vendor calls as a last resort, with cleanup explicitly unknown.
There is no demonstrated survival of SIGKILL, app jail/cgroup death or lost TV
transport; the retained fake-worker helper is not a UTP recovery adapter.

The final JSON contains fixed outcomes and Booleans, never window/pipeline IDs,
requester metadata or raw service errors. `candidate_interval_completed` and exit
0 mean the bounded client sequence and acknowledged stop/close finished. They do
**not** mean a live picture or restored hardware was observed. Those fields remain
`unknown` until separate owner evidence exists. Vendor stdout/stderr is not a
sanitized report and must remain local.

An open submission without a usable returned ID leaves `acquisitionUncertain`
true; the client cannot close an unnamed allocation. A failed close also leaves
it true. Even an acknowledged close is only service acknowledgment; local export
destruction is not proof of receiver release or normal viewing restoration.
This unresolved server contract keeps the candidate **not device-ready**.

## Local build and acceptance checks

From repository PowerShell, using only the existing Linux SDK:

```powershell
$repo = '/mnt/d/Development/webos-multiview'
$sdk = '/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot'
$hostBuild = "$repo/build/phase-2/hdmi-window-host"
# Host JSON-C runtime exists; copy only architecture-independent API headers.
wsl -d Ubuntu --exec cmake -E copy_directory "$sdk/arm-webos-linux-gnueabi/sysroot/usr/include/json-c" "$hostBuild/include/json-c"
wsl -d Ubuntu --exec cmake -S "$repo/native/phase2-hdmi-window" -B $hostBuild -G Ninja '-DCMAKE_BUILD_TYPE=Debug' "-DJSON_C_INCLUDE_DIR=$hostBuild/include"
wsl -d Ubuntu --exec cmake --build $hostBuild
wsl -d Ubuntu --exec ctest --test-dir $hostBuild --output-on-failure
wsl -d Ubuntu --exec cmake -S "$repo/native/phase2-hdmi-window" -B "$repo/build/phase-2/hdmi-window-arm" -G Ninja '-DCMAKE_BUILD_TYPE=Release' "-DCMAKE_TOOLCHAIN_FILE=$sdk/share/buildroot/toolchainfile.cmake" "-DLUNA_LIBRARY=$repo/build/phase-1/firmware-inspection/native-idle/libluna-service2.so.3" "-DJSON_C_LIBRARY=$repo/build/phase-1/firmware-inspection/native-idle/libjson-c.so.4"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-2/hdmi-window-arm"
npm test
npm run lint
```

Check each command's exit code before the next. These commands compile the ARM
executable but execute only the Linux-host acceptance test. It covers explicit
opt-in, fixed app/port/window ownership, open failure/no-ID uncertainty, cancellation
after open/selection/during observation, stop/close failures and local cleanup.
It does not simulate a live HDMI picture or test SDL/LS2 framework defaults.

Built artifact: `build/phase-2/hdmi-window-arm/multiview-hdmi-window`, 29,908 bytes;
SHA-256 `ef19a74f59ad0cb95997f254f92e4bf0ad2c72377db988a121605f6f33997d3f`.

Local provenance and offline verification are retained in
`build/phase-2/hdmi-window-local-20261112/`: exact scoped disassembly, header hashes,
`hdmi-window.elf.txt`, `verify-local.py` and `direct-abi.json`/`.txt`. The local
driver verifies retained runtime hashes and invokes the existing
`scripts/verify-native-abi.py` with saved bytes, never an SSH collector:

```powershell
wsl -d Ubuntu --exec python3 "$repo/build/phase-2/hdmi-window-local-20261112/verify-local.py"
```

The ABI check covers the executable's eight direct DT_NEEDED providers, 75
required imports and their exact symbol versions, ELF32 ARM soft-float and
`/lib/ld-linux.so.3`, with no RPATH/RUNPATH. It does not cover the entire SDL
graphics dependency closure, optional imports or dynamic `dlopen` paths, and
does not establish loader execution. No IPK was generated and no proprietary
runtime libraries are redistributed. Preserve all earlier controls and reports.
