# C1 admission preflight — 2026-11-11

> **Archived detail; no test is authorized here.** [Compact C1 journal](../c1-journal.md) · [Current test plan](../current-plan.md). Original stage-by-stage findings, commands and hashes are retained below; old next steps are historical.

Reference: owner LG C1, firmware 03.53.45 / SDK 6.5.3. The owner installed
0.1.0 and reported that it had not been opened. We did not launch it.

## Verified installation evidence

A bounded SFTP-only pass read the app manifest, ELF, generated LS2 manifest,
public/private roles and client group. Six files and their hashes are retained
in ignored `build/phase-2/admission-installed-20261111/`, with
`inventory.json` and `verification.json`. No TV files or policies were changed.

- Installed ELF is 24,580 bytes, mode `0755`, SHA-256
  `f4c5d6ee0bfc67372013729c5efb81ee5a31befb080e88f749e81ff073a9717b`;
  it matches the packaged 0.1.0 build.
- Generated public and private roles bind the exact installed executable to
  the dedicated `io.github.tpapaz.multiview.admission` name. It has a regular
  role, outbound `*`, inbound `[]`; client group is `public`.
- These are installed declarations, not proof of runtime registration,
  effective method admission or simultaneous HDMI support. Those are unknown.

## Capture correction and local validation

Version 0.1.0 prints its report only to stdout. The local LG CLI implementation
`node_modules/@webos-tools/cli/lib/launch.js`, function `_launch`, returns the
application-manager launch result, not native stdout. No reliable normal-launch
stdout capture route has been verified. Do not substitute direct root SSH
execution as evidence of normal application launch context.

At the owner's request, 0.1.1 adds a private, one-run report reservation under
`/tmp/io.github.tpapaz.multiview.admission/report-0.1.1.json` in the app's mount
namespace. Directory mode is `0700`, file mode `0600`. Reservation must succeed
before LS2 calls. Existing files, symlinks and unsafe directory ownership/mode
are rejected. Reports are at most 2 KiB. The eight-second alarm also bounds
file work; empty/partial/missing JSON is failed capture, never successful admission.
Exit 73 means reservation failed; 74 means report writing failed.

The file is temporary app-owned data, not a system policy or persistent system
configuration change. It is not automatically deleted or overwritten. Reboot
may remove it. Capture before reboot; archive and deliberately remove only this
report before a later retry. The collector itself never removes anything.

Local acceptance tests cover admission logic plus refusal of report overwrite,
file/directory symlinks and a broadly writable directory. CTest 2/2, ARM build,
existing npm tests, lint and collector syntax checks passed. Static ABI checks
resolve 1,204 required symbol/version references across the executable and 17
runtime files. Runtime report-directory access and mount mapping are candidates
until TV testing, not verified facts. No 0.1.1 installation or execution occurred.
`node tests/host/admission_capture_test.cjs` also passed with mocked SFTP and
in-memory output: fresh preflight, denied-admission capture, unknown-field
redaction, incomplete JSON rejection and refusal of an existing report.
The 0.1.1 IPK archive/content verification passed; SHA-256 is
`f9b77dd96e7ea96e755c0e4d76777e62a5428e3db2ad9e4b1e2b543224bc3797`.

## Prepared capture procedure — do not launch yet

After the owner installed 0.1.1 and reported leaving it closed, the read-only
`--prepare` command below passed on 2026-11-11. Evidence is saved in
`build/phase-2/admission-run-001/preflight.json`: installed ELF and manifest
match the local 0.1.1 build, executable mode is `0755`, both generated roles
and the public client group pass, no matching process was found, and neither
known report path exists. No app launch or TV write occurred. Actual caller
admission, report-file creation and normal-launch behavior remain untested.

1. Owner installs `dist/io.github.tpapaz.multiview.admission_0.1.1_arm.ipk`.
2. From repository PowerShell, run:

   ```powershell
   node scripts/capture-admission.cjs --prepare build/phase-2/admission-run-001
   ```

   This connects only for bounded reads, checks installed ELF/manifest against
   the local build, checks both roles and the public group, requires no matching
   process and no old report at either known host/jail path, then writes a local
   preflight record. It never launches the app. Stop on failure.
3. Only after explicit authorization, the owner opens the app once normally.
   Record launch route and any visible HDMI interruption. Do not switch/reopen
   inputs to manufacture publications. Allow the eight-second process deadline.
4. Collect once the process has exited:

   ```powershell
   node scripts/capture-admission.cjs --collect build/phase-2/admission-run-001
   ```

   The collector rechecks installed hashes/policy, requires a single bounded
   report with exact allowlisted schema and checks process absence before/after.
   It writes only a local sanitized `capture.json`, preserving report hash and
   installation binding. The SSH pass has a 30-second deadline. It cannot prove
   the process exit code or independently establish its launch context; those
   remain explicit unknown/owner-confirmed fields. Missing, ambiguous or invalid
   evidence fails closed. Preflight and capture files are never overwritten.

No geometry, crop, reset, publication setter or input selection is authorized by
this procedure. A policy allowance for a setter remains a prediction only.

## First owner launch: capture failed

On 2026-11-11 the owner opened 0.1.1 once, observed an immediate return to Home,
waited at least ten seconds, and requested collection. The read-only collector
revalidated installed ELF/manifest and policies and found no matching process.
It failed at the report-presence gate: **zero** reports at the two expected paths.
Further fixed-path SFTP metadata checks found both host and jail `/tmp`
directories (mode `1777`), but neither app-specific report directory. The app
jail directory still existed. Evidence is retained in
`build/phase-2/admission-run-001/capture-failure.json`; no `capture.json` exists.

Outcome: **inconclusive**, not passed or denied admission. Process exit code,
whether execution reached `main`, LS2 registration/calls, and cleanup are
unknown. Returning to Home alone does not distinguish normal exit from startup
failure. The missing directories do not establish whether creation failed,
storage was cleaned up on exit, or a different mount mapping was used.
No relaunch, TV writes, input switching, geometry or crop calls were performed.
Next investigate normal native launch diagnostics and report lifetime/mapping
read-only before deciding whether another package or launch is necessary.

## Read-only diagnosis: launcher argument rejected

The follow-up reused the source, installed ELF hash, preflight and failed-capture
records before reading bounded retained logs over SFTP. No app was launched,
signalled or modified. Logs were projected into app-specific fields; raw payloads,
process IDs and the launch identifier were not retained in the projections.

**Verified log evidence:** `build/phase-2/admission-run-001/launch-exit-fields.json`
records jailer execution with the expected executable followed by an additional
JSON argument. Its keys are `@system_native_app` and `nid`; the first is `true`,
and the identifier value is deliberately excluded. Matching app-close records
carry `exit_status: 16384`. The retained log set contains four such exec/close
pairs; these are historical records, not launches performed during collection.
Do not infer four owner actions or a retry mechanism from this alone.

For example, source 0 (`/var/log/messages.0.gz`, decompressed SHA-256
`f4cbeecb193f8f19a4c4942e172e99bea80efe882b48bb394af55318224bfe47`),
lines 7347/7351 show exec/close at device-log times
`2026-11-11T19:14:37.750699Z` / `19:14:37.778019Z`.
Source 1 lines 1001/1005, 1179/1183 and 1376/1380 show the same argument shape
and status. Device log times and host preflight time have not been synchronized;
the records are not assigned individually to owner actions.

**Verified local code:** `native/phase2-admission/main.cpp:103` returns 64 when
`argc != 1`, before report reservation (line 108), transport construction and
`admission::run` (lines 110–111). The installed 0.1.1 ELF hash remains
`1cdd9db50613de059b1465c90ac2c47ea641f7274fb138f03af14b9c0275aea4`.
Local Linux Python `os.WIFEXITED(16384)`, `os.WEXITSTATUS(16384)` and
`os.WIFSIGNALED(16384)` returned `True`, `64`, `False` respectively.

**Evidence-backed diagnosis:** the normal launch metadata trips our own startup
argument guard. This explains the rapid return to Home and why the report
directory was never created. For that early-return path no LS2 registration or
IWC request is reached. This is a runner startup bug, not evidence of denied
IWC admission or a demonstrated crop/recovery problem. Temporary-file cleanup
is no longer needed to explain this failure; storage behavior after a successful
startup remains untested.

Next correction, not implemented in this read-only task: accept and validate
the bounded normal-launch metadata envelope without allowing caller identity,
destination URI or payload overrides. Keep all admission calls fixed. Cover
the observed launcher form and invalid/oversized/extra arguments with host
acceptance tests, then rebuild, ABI-check and package before another authorized
run. Startup rejection should also have a bounded captureable diagnostic.
No automatic relaunch or geometry/crop experiment is warranted.

## Launcher correction packaged locally: 0.1.2

The owner authorized a local fix/build only. The runner now validates the
observed single JSON argument (maximum 1,024 bytes): exactly the native-app
boolean set to true and a nonempty printable ASCII `nid` of at most 256 bytes.
These values are discarded. Caller identity and all three request definitions
remain fixed. Extra arguments, unknown fields, malformed/trailing JSON and bad
types are rejected with zero transport registrations/calls. Report reservation
now precedes validation, allowing `invalid_launch_arguments` to be captured
when storage is available. The existing eight-second alarm bounds this work.

Updated app manifest, report filename and host collector target 0.1.2 only.
Original 0.1.1 ELF/ABI/package validation files were preserved locally before
rebuilding. No TV connection, installation, relaunch or experiment occurred.

Validation commands and results:

- `wsl -d Ubuntu --exec cmake --build /mnt/d/Development/webos-multiview/build/phase-2/admission-host`: passed.
- `wsl -d Ubuntu --exec ctest --test-dir /mnt/d/Development/webos-multiview/build/phase-2/admission-host --output-on-failure`: 2/2 passed, including launch-envelope acceptance/rejection and zero bus work on rejection.
- `wsl -d Ubuntu --exec cmake --build /mnt/d/Development/webos-multiview/build/phase-2/admission-arm`: passed.
- `node --check scripts/capture-admission.cjs`, `node tests/host/admission_capture_test.cjs`, `npm test`, `npm run lint`, `git diff --check`: passed.
- `./scripts/package-admission.ps1`: offline ABI passed (17 runtime files, 1,205 references); IPK archive/content verification passed.

Artifact: `dist/io.github.tpapaz.multiview.admission_0.1.2_arm.ipk`, SHA-256
`daf947077eb16995b9bfbd88bcc8ba85d80e826a6af35cddda4744f5912c9fe5`.
Not simulator-tested or TV-tested. Normal-launch storage lifetime and actual
named-caller admission remain unresolved device gates. After separately
authorized installation, use `--prepare build/phase-2/admission-run-002` before
any launch, then collect into the same fresh directory. Do not reuse run 001.

## Installed 0.1.2: read-only preflight passed

After the owner reported installing 0.1.2 without opening it,
`node scripts/capture-admission.cjs --prepare build/phase-2/admission-run-002`
passed. The timestamp and installation/policy hashes are retained in
`build/phase-2/admission-run-002/preflight.json`. Installed ELF and manifest
match the local 0.1.2 build; executable mode is `0755`; public/private roles and
the public client group pass. No matching process or existing 0.1.2 report was
found at either expected path. No launch, TV write, geometry or crop call was
performed. Actual launch-metadata acceptance, report creation and IWC admission
remain untested on the TV. Use run 002 for the next authorized collection.

## Owner launch of 0.1.2: permission gate denied, report recovered

On 2026-11-12 the owner reported opening the app and seeing what appeared to
be a crash. Read-only collection rechecked the installed artifact/policy binding
and found no matching process. The initial collector rejected two report paths.
Bounded reads established that both host and jail locations expose identical
388-byte, mode `0600` report contents. The collector now accepts byte-identical
copies with matching modes, records both locations and still rejects conflicting
contents. This does not assert that matching files have the same inode.
Local mocked-SFTP acceptance cases for identical and conflicting copies passed;
collector syntax validation passed. No TV file was changed or app relaunched.

Evidence: `build/phase-2/admission-run-002/capture.json`, report SHA-256
`77d505bea2da1ca42b1a672a33aca7b24951365a9f73736e070865c65907896c`.
The report says `denied`, registration and identity match true, cleanup true,
one call, list-policy allowed `0`, reset-policy unknown `-1`, list admission
false, elapsed 13 ms. The parser sets list-policy `0` only for a successful
hub query reply with `allowed: false`; an API error would leave it unknown.
Therefore the runner stopped at the first hub permission gate, before the
second policy query or any actual IWC listing request. Publication/candidate
counts of zero are defaults, not observations of absent HDMI windows.

The retained redacted `launch-exit-fields.json` contains device-log exec/close
pairs at 08:05:54 and 08:05:56 UTC, with wait statuses 256 (normal exit code 1)
and 18688 (normal exit code 73). Code 1 matches the captured failed gate;
73 is report reservation failure, consistent with a later attempt encountering
the retained report. Neither is a crash signal. These historical log records
do not assign separate actions to the owner. Owner launch context is recorded
here; the collector's own launch-context and exit-code fields remain unknown
because SFTP cannot independently establish them.

Verified on this C1: launcher-argument acceptance, dedicated named registration,
captured denial prediction and self-reported cleanup with observed process
absence. Actual IWC read admission remains untested; geometry/crop permissions,
application and simultaneous HDMI remain unknown. The runner has no window or
menu and exits immediately on a failed gate, explaining the return to Home.
Next investigate the effective named-caller permission resolution read-only,
using this evidence first. Leave the app closed; retain the report unchanged.
