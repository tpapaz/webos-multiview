# IWC admission-only runner

> Tool record. [Current status](../../STATUS.md) · [Documentation index](../../docs/README.md). Build/test claims below describe their recorded stage; use current Status for the selected next task.

Implemented 2026-11-11 for the reference C1 03.53.45 / SDK 6.5.3 investigation.
**Current package: 0.1.2, built, packaged, ABI-checked and owner-launched on C1.**
Named registration passed; its first permission query was denied, before IWC
listing. See the [compact result](../../docs/device-tests/c1-journal.md#admission-app).
Earlier 0.1.1 rejected launcher metadata before report creation. See the
[archived installation/capture procedure](../../docs/device-tests/archive/c1-admission-preflight.md).
This is not an HDMI geometry controller or reset helper.
The [research contract](../../docs/research/c1-iwc-admission-reset-plan.md) records
the saved firmware evidence and the distinction between permission and behavior.

The executable registers its fixed package name on one public LS2 handle,
checks that handle's name, and uses ordinary `LSCallOneReply` for exactly:

1. Hub permission query for IWC listing.
2. Hub permission query for IWC ordinary geometry (URI is payload data only).
3. IWC `listPublishedWindows` with `subscribe: false`.

Any denial, malformed response, identity mismatch, disconnect or timeout stops
progression. There are no retries, identity fallbacks, inbound service methods,
proxy calls, setters, subscriptions, media sessions or graphical surfaces.
No URI, payload or caller identity is accepted as a command-line parameter.
The new package's generated policy and normal launch context still require
review; the retained Endurance installation is not reused or modified.

Each reply has a two-second deadline. A seven-second soft deadline, measured
from process entry, reserves cleanup time inside an eight-second process alarm.
SIGINT/SIGTERM request cleanup; the alarm exits 124 if a vendor call or cleanup
blocks. That hard exit writes only a fixed cleanup-unconfirmed marker, not a
successful report. Cancellation does not retract a query already delivered.
Outstanding tokens are cancelled and owned handles/context are released.

Replies are limited to 32 KiB, 64 publications, valid typed IDs/strings and
positive integral dimensions. Duplicate publication IDs are rejected. The
runner counts HDMI-app publications without selecting an input or retaining
IDs in its report. Empty/multiple candidates do not establish a target or
normal-view baseline. A successful list is read-method admission only.

One JSON report is saved in a private temporary file and also goes to stdout:
fixed status, named-startup/identity/cleanup
results, call count, policy results (`-1` unknown, `0` denied, `1` allowed),
listing and candidate counts, elapsed time, and explicit unknown execution
context/baseline/applied geometry. It excludes raw responses, IDs, arbitrary
service errors and network identifiers. An external owner-operated collector
must bind a future report to the installed ELF/policy hashes, launch context,
device record and confirmed exit. Self-reported cleanup does not prove exit.
Exit 0 means read admission plus cleanup succeeded; exit 1 is a failed gate,
64 rejects invalid launch arguments, and 124 is the hard deadline.

Version 0.1.2 reserves its report before argument validation or any LS2 call and refuses an existing
report or unsafe directory. Exit 73 means reservation failed; 74 means writing
failed. The collector never launches the app or changes TV files. See the capture
procedure above before opening it. Normal-launch storage access is not TV-tested.

The observed webOS launch envelope is accepted as one JSON argument (at most
1,024 bytes), containing exactly `@system_native_app: true` and a nonempty
printable ASCII `nid` string of at most 256 bytes. Metadata is discarded after
validation and never selects caller identity, URIs or request payloads. No-argument
entry remains valid. Other argument counts, malformed/trailing JSON, unknown
fields and incorrect types are rejected before transport registration. When
report reservation succeeds, rejection writes `invalid_launch_arguments` with
zero calls and exits 64. It never logs the metadata or its identifier.

Current capture uses `report-0.1.2.json` and the updated collector. Use a new
host evidence directory such as `build/phase-2/admission-run-002` for a future
authorized preflight; do not reuse run 001's 0.1.1 bindings. Package is
`dist/io.github.tpapaz.multiview.admission_0.1.2_arm.ipk`. Exact current hashes
are in `build/phase-2/admission-arm/package-validation.json`. The 0.1.1 binary
and validation files are preserved in `build/phase-2/admission-0.1.1-preserved/`.
CTest 2/2, mocked collector fixtures (including startup rejection), ARM build,
npm tests/lint and static ABI checks (17 runtime files, 1,205 required references)
passed locally. No simulator test or TV installation/execution was performed.

The remaining artifact hashes and counts below document the original 0.1.0
build. Its binary and validation records are preserved under
`build/phase-2/admission-0.1.0-preserved/`. Historical 0.1.1 hashes:

- ELF: `1cdd9db50613de059b1465c90ac2c47ea641f7274fb138f03af14b9c0275aea4`.
- IPK: `f9b77dd96e7ea96e755c0e4d76777e62a5428e3db2ad9e4b1e2b543224bc3797`.
- Package: `dist/io.github.tpapaz.multiview.admission_0.1.1_arm.ipk`.
- CTest 2/2 passed; full static ABI: 17 runtime files, 1,204 symbol references;
  archive inspection, npm tests and lint passed. No TV run.

## Local tests and ARM build

Run from the repository using PowerShell and the existing Linux SDK. No command
below connects to the TV. Host tests use a fake transport and real host JSON-C;
they do not load the ARM firmware libraries. If host development headers are
missing, CMake copies only the SDK's architecture-independent JSON-C headers
into the ignored host build directory. It still links the host JSON-C library.

```powershell
$repo = '/mnt/d/Development/webos-multiview'
$sdk = '/home/tasos/.cache/webos-multiview/202608/arm-webos-linux-gnueabi_sdk-buildroot'
wsl -d Ubuntu --exec cmake -S "$repo/native/phase2-admission" -B "$repo/build/phase-2/admission-host" -G Ninja '-DCMAKE_BUILD_TYPE=Debug' "-DSDK_JSON_HEADERS=$sdk/arm-webos-linux-gnueabi/sysroot/usr/include"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-2/admission-host"
wsl -d Ubuntu --exec ctest --test-dir "$repo/build/phase-2/admission-host" --output-on-failure
wsl -d Ubuntu --exec cmake -S "$repo/native/phase2-admission" -B "$repo/build/phase-2/admission-arm" -G Ninja '-DCMAKE_BUILD_TYPE=Release' "-DCMAKE_TOOLCHAIN_FILE=$sdk/share/buildroot/toolchainfile.cmake" "-DLUNA_LIBRARY=$repo/build/phase-1/firmware-inspection/native-idle/libluna-service2.so.3" "-DJSON_C_LIBRARY=$repo/build/phase-1/firmware-inspection/native-idle/libjson-c.so.4"
wsl -d Ubuntu --exec cmake --build "$repo/build/phase-2/admission-arm"
npm test
npm run lint
git diff --check
```

Host acceptance cases cover the exact call sequence/destinations, denied and
malformed replies at every stage, trailing JSON, payload/list limits, duplicate
IDs, invalid dimensions, identity/registration failure, send failure, no reply,
late reply, cancellation, disconnect, startup/overall deadlines and failed
cleanup. All passed. Existing npm tests and lint passed. Host tests exercise
the shared control logic/parser, not the proprietary LS2 adapter, OS alarm or
TV launch lifecycle. No simulator or device test ran.

The local ARM ELF is `build/phase-2/admission-arm/multiview-admission`:
24,580 bytes, SHA-256
`f4c5d6ee0bfc67372013729c5efb81ee5a31befb080e88f749e81ff073a9717b`.
`local-validation.json` alongside it records the artifact and library hashes.
ELF32 ARM soft-float, `/lib/ld-linux.so.3`, no RPATH/RUNPATH, expected dependency
allowlist and 24 LS2/JSON-C imports were checked against retained C1 binaries.
The initial host configure failed because PowerShell split an unquoted SDK
argument; quoting it fixed configuration. Subsequent builds/checks passed.

## Completed static ABI and packaging gate

On 2026-11-11, saved evidence was reused first. Two existing C1 LS2/JSON-C files
were sufficient; the other runtime files were absent locally. Two bounded SFTP
passes retrieved 15 library/loader files, without remote execution or service
calls. Each pass had a 30-second deadline, 16 MiB per-file and 64 MiB total limits,
and only `/lib` and `/usr/lib` paths named by the ELF dependency tables were read.
The six newly retrieved core files matched the prior C1 03.53.45 ABI hashes.
No package was transferred to the TV. Original evidence remains unchanged.

`scripts/verify-admission-abi.py` verifies the executable plus the complete
17-file `DT_NEEDED`/interpreter closure, including 1,194 required symbol/version
references (56 for the executable, including copy-relocation providers).
It checks ARM32, ABI, SONAME, dependency presence, required version nodes,
symbol versions and evidence hashes. The initial verifier keyed providers by
version name, which conflated identically named versions in different libraries.
It now uses ELF version indices; a regression fixture covers that distinction.
All references resolve in their declared providers for this artifact.

Version-node checking and scope-based symbol matching are separate ELF steps;
the general lookup rule was checked against
[glibc 2.28 `check_match`/`do_lookup_x`](https://github.com/bminor/glibc/blob/glibc-2.28/elf/dl-lookup.c#L58-L155).
No upstream implementation was copied. These are static checks, not proof of
loader execution, optional weak imports, dynamically loaded plugins, LS2
admission or correct TV behavior.

Runtime files and inventories are ignored under
`build/phase-2/admission-runtime-20261111/`. The final ABI record is
`build/phase-2/admission-arm/abi-validation.json`; the earlier
`local-validation.json` intentionally preserves the initial partial check.

The locally produced package is:

`dist/io.github.tpapaz.multiview.admission_0.1.0_arm.ipk`

SHA-256: `8054198c6714aa81be6916ea0ed481ccaa2964ccac4e5501c2d169a0abac6e05`.
The packaged ELF matches the build hash above. Archive inspection verifies the
exact manifest/icon/executable bytes, ARM control metadata, generated package
metadata, executable mode `0755`, safe paths and absence of extra files, links,
device nodes or install scripts. No proprietary library or custom policy is
bundled. `package-validation.json` beside the ELF records the package identity.

Reproduce the offline checks and packaging from PowerShell:

```powershell
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/tests/host/admission_abi_test.py
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/verify-admission-abi.py
./scripts/package-admission.ps1
wsl -d Ubuntu --exec python3 /mnt/d/Development/webos-multiview/scripts/verify-ipk.py --admission /mnt/d/Development/webos-multiview/dist/io.github.tpapaz.multiview.admission_0.1.0_arm.ipk
```

Packaging refuses to overwrite an existing IPK; preserve/archive the existing
artifact explicitly before a deliberate rebuild. It stages only the three
approved app files on Linux, preserves executable mode, runs the offline ABI
gate and uses the existing local CLI. The regression, final ABI check, IPK
inspection, `npm test`, `npm run lint` and `git diff --check` passed. Production
runner code and ELF were unchanged, so host CTest/builds were not repeated.

Next review this package before authorizing installation. After a future
owner-authorized installation, review generated policy before a bounded,
owner-operated admission run. Normal app launch may deactivate HDMI even with
no created surface; record publication absence rather than switching/reopening
the input. Geometry/crop experiments remain gated separately.
