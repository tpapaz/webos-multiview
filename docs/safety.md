# Diagnostic scope, privacy and recovery

> [Current status](../STATUS.md) · [Documentation index](README.md). These operating restrictions remain in force across research phases.

This build performs no firmware changes, flash/device-node writes, kernel-module
loads, protection bypass, persistent service/config changes, hooks/injection,
critical service restarts, HDMI switching or active video capture. Installing an
application does add its ordinary package files; uninstall removes the app.
Starting a normal foreground diagnostic app can obscure/suspend existing video
through normal webOS lifecycle behavior. This is not an HDMI coexistence test.

The passive web probe makes no query until the user presses **Read device metadata**. It
requests three LG-documented keys, once, with a 3 second timeout. Cancel, hiding,
closing and completion release the bridge handle. It never subscribes, retries,
uploads, writes browser storage or echoes arbitrary service errors. Transport
callbacks over 8192 characters are discarded. Export is an explicit user action;
browser downloads may add a report to the user's chosen storage.

Allowlist export, not keyword masking: export only `LG C1`/`unknown`, strictly
numeric dotted SDK/firmware versions and fixed observation messages. Full model
names, serial/device IDs, board/region strings, network addresses, accounts,
tokens, credentials, arbitrary errors and user-agent strings are omitted.
Board family is deliberately unknown. A future schema expansion needs a privacy
review and tests. Schema validation does not prove arbitrary imported evidence
strings are redacted. Review every report before sharing.

The passive native inventory CLI has no input parameters, network access, service calls, file reads
or privileged APIs. Seven fixed local library paths are checked using stat;
symlinks can resolve to a regular library. It does not reveal link destinations
or read/link/load library bytes. Missing/unresolvable paths mean only
`not_found_in_scope`, while denied/nonregular/error cases mean `unavailable`.
Libraries in other directories/versions may exist. No counts are inferred.
The CLI owns no hardware resources and writes only stdout/stderr. A human may
redirect stdout to a temporary file; no TV path is written by the program.

Phase 1 apps play bundled synthetic clips after explicit owner opt-in. They
run with the normal app lifecycle, bound playback with a timeout and release
media on exit or loss of visibility or focus. The native apps write fixed
events and counts to an unlinked process-local file. The local SSH controller
checks the installed manifest and running executable identity before signaling
the test app. The browser controller checks the specific Inspector target over
a temporary loopback tunnel. Both use the authorized local profile and save
reports on the development PC. [Archived Phase 1 protocol](device-tests/archive/lg-c1-phase-1.md)

The retained 0.1.3 veto diagnostic has only short modes: acknowledged
registration and eight-second dual playback plus A recovery, or a real-request
wait of at most 60 seconds before that playback. Native hard cap: 90 seconds.
The owner opens a fresh menu; the controller does not relaunch or run repeated
cycles. It uses ordinary public LS2 calls on an app-owned handle, validates
bounded payloads, and keeps registration through A recovery and both Unloads.
Unsubscribe, token cancellation and handle teardown are logged separately.
The final request test received no request, so actual NACK inhibition remains
unknown. [Scope closure](decisions/0003-close-idle-work-resume-hdmi.md).

Historical Endurance 0.1.0/0.1.1 repetition and longer runs are retained in the
device journal and local control IPKs. They are not current modes or planned
tasks. The old 0.1.1 Type 2 metadata/SDL requests were not proof of TV inhibition.
Focus loss, Back/Exit, hide/minimize, signals and deadlines still cancel and
release resources. A hard alarm or unconfirmed process exit is not clean
cleanup evidence.

Log collection exports known categories and numeric/redacted evidence only,
not arbitrary vendor strings or raw IDs. CPU telemetry reads numeric
`/proc/stat` and identity-checked app stat/status counters. Temperature checks
read fixed thermal/hwmon temperature paths; missing values stay unknown.
Post-exit and idle-menu measurements are not playback load. No thermal,
cooling, system idle settings, fake key input or timer reset loops are used.

Current HDMI discovery is read-only: inspect existing source, firmware,
declarations and policy/configuration, and distinguish input selection,
receiver ownership, output capture and presentation. Do not switch inputs,
open capture, load a hardware session or call set methods during discovery.
A later active test needs owner opt-in, a narrow justified interface, bounds
and restoration. A simultaneous dual-HDMI test also needs a second independent
source; only one is currently connected.

If the app or optional helper misbehaves, close **only this app** or interrupt
the foreground CLI. Stop testing on any unexpected input/mode/service behavior.
Use the physical remote's normal Home/Back/Input controls to restore viewing.
Do not follow upstream recovery instructions that restart ACB, compositor or
other system services. No backup/restore of firmware or settings is needed
because this implementation has no such write path.

The owner handles installation and checks visible playback and normal viewing
after exit. Builds and ABI checks are tracked separately from device playback.
