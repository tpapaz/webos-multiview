# LG C1 Phase 1 dual local video protocol

Target: LG C1, firmware 03.53.45, webOS SDK 6.5.3. The
[Phase 0C record](2026-11-10-csp-startup.md) covers metadata, remote navigation,
Close, normal HDMI viewing after exit, and uninstall. The test below feeds two
synthetic files from TV-local storage. A connected HDMI source is optional.

## Build and compatibility

- **Verified inventory:** read-only SSH on the target reported `uname -m` as
  `aarch64` and `getconf GNU_LIBC_VERSION` as `glibc 2.28`. Reading the first 20
  bytes of `/usr/lib/libplayerAPIs.so.1` and `/usr/lib/libSDL2-2.0.so.0` found
  ELF class `01`, encoding `01`, and machine `28 00`: 32-bit little-endian ARM.
  `readelf`, `objdump`, and `nm` were unavailable in the TV shell. No library
  code ran during this inventory. The userspace ABI target is ARM32.
- **Candidate backend:** modern SMP with one player and one SDL exported window
  per clip. The upstream [window sample](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/media/smp/webos5/exported_window.c#L11-L109)
  demonstrates one window. The [ABI and test notes](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/README.md#L67-L75)
  describe the modern `__cxx11` and four-argument `Load` variant. The
  [hardware table](https://github.com/webosbrew/samples/blob/e95eed3afa7896894f811b84d8e9e277e9e2b74c/README.md#L147-L180)
  reports single-player runs on the 65UP7560 and OLED77C5. Whether one or two
  sessions work on this C1 remains **unknown**. The sample is a reference under
  the [existing reuse decision](../research/prior-art.md#snapshot-and-reuse-decisions).
- **Built and packaged:** the app in `native/phase1` cross-compiled under Ubuntu
  on WSL with CMake/Ninja and the Linux x86-64-host ARM SDK from the
  [2026.08-webos release](https://github.com/openlgtv/buildroot-nc4/releases/tag/2026.08-webos).
  The SDK archive matched the release SHA-256
  `2230a6351e5cce6fcb9d4fdcb4697335f223995401ef969c81744aaeb14c5344`.
  It supplies the SMP declarations and link stub and the webOS SDL headers.
  The app implements its own playback loop and uses the TV's installed libraries.
- **ABI checked on the exact C1:** Linux `readelf -W -h -l -d -V --dyn-syms`
  identified ARM EABI5 soft float and `/lib/ld-linux.so.3`. Read-only SSH supplied
  the loader and six `DT_NEEDED` files from firmware 03.53.45 for in-memory ELF
  inspection. All 75 required dynamic imports matched. Versioned imports matched
  their required providers, including `GLIBC_2.4`, `GLIBCXX_3.4.21` and
  `CXXABI_1.3.9`. This check covers binary linkage. The installer, playback,
  permissions for the media API, and runtime resource limits still need testing.
- **Package checked:** the `arm` IPK contains the exact staged files, including
  the checked ELF at mode `0755`, and package metadata. It contains no service,
  install scripts, or shared libraries. LG CLI 3.2.6 warned about the absent
  `requiredACG` declaration and completed packaging. Build SHA-256:
  `c4087fc1a636a577d01c111a3029a140a644227e28f69bae1599a0929ea9fc95`.

To reproduce from PowerShell after extracting the SDK onto Ubuntu's Linux
filesystem and running its `relocate-sdk.sh`, use the SDK toolchain file in
`share/buildroot/toolchainfile.cmake`:

```powershell
npm ci --no-audit --no-fund
./scripts/make-phase1-clips.ps1
$repo = '/mnt/d/Development/webos-multiview'
$sdk = '/absolute/linux/path/to/arm-webos-linux-gnueabi_sdk-buildroot'
wsl -d Ubuntu --exec cmake -S "$repo/native/phase1" -B "$repo/build/phase-1/arm" -G Ninja -DCMAKE_BUILD_TYPE=Release "-DCMAKE_TOOLCHAIN_FILE=$sdk/share/buildroot/toolchainfile.cmake"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-1/arm"
./scripts/package-phase1.ps1
```

The packaging script expects FFprobe on Windows and Node 22 on Ubuntu. Pass
`-LinuxNode /absolute/linux/path/to/node` when the Linux binary is outside PATH.
It stages the executable on Linux to preserve file mode. Output is
`dist/io.github.tpapaz.multiview.phase1_0.1.0_arm.ipk`.

## Fixtures and first TV run

Run `./scripts/make-phase1-clips.ps1` from PowerShell with FFmpeg on PATH. It
generates two MP4 previews plus separate Annex B H.264 and ADTS AAC streams in
`build/phase-1/media`. Both clips are 640×360 at 30 fps with visible clocks.
A uses normal colors, runs for 12 seconds, and has a 440 Hz tone. B uses inverted
colors, runs for 15 seconds, and has a 660 Hz tone. The first IPK ships video
only. The audio streams are available for a later audio focus test once the
C1's per-session mute interface can be checked.

Host validation on 2026-11-10: the generator completed on Windows. `ffprobe
-count_frames` measured 360 and 450 H.264 frames, respectively, at the expected
resolution and frame rate, with AAC-LC audio in both MP4s. FFmpeg decoded both
extracted stream pairs to a null sink with `-xerror`. The packager checked that
the H.264 frame indexes cover both streams. `npm run lint`, all seven existing
`npm test` checks, the host CMake build, and its one CTest check passed.

1. Install the ARM IPK through Dev Manager and launch **MultiView Phase 1 Test**.
   The menu is idle until you press a playback key.
2. Press **Left** for A alone, then **Right** for B alone. Watch each clock and
   wait for the menu to return. Stop if either baseline fails. A red footer
   indicates the run failed. Green indicates the app reached end of stream.
3. Press **OK** for dual playback. The app attempts B two seconds after A's
   first frame. Watch for both clocks advancing at once. Press **Up** to move
   and resize B while A stays fixed. Record whether each clip ends independently.
4. Repeat and press **Back** during playback. Verify the app exits and normal
   HDMI picture and sound return. The app cleans up on Back, focus loss, a
   pipeline error, or timeout. It allows eight seconds for each first frame and
   30 seconds for the run. A 35-second process alarm bounds a stalled vendor
   call. If a run fails or normal viewing does not return, stop the experiment.
   Remove the app through Dev Manager after the test.

The pass gate is two independently advancing clips, independent geometry,
predictable audio focus, and cleanup. Capture app-scoped evidence only. Treat a
second-session rejection as a result for this backend, clip format, and firmware.
Audio focus remains a later step. Native playback, dual surfaces, and
simultaneous HDMI all remain **unknown**. The IPK was built and ABI checked.
Installation and playback on the TV are pending.
