# Diagnostic scope, privacy and recovery

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
reports on the development PC. [Phase 1 protocol](device-tests/lg-c1-phase-1.md)

The endurance app loops only those fixtures on SMP main/sub. The repetition
runner confirms this app exits before a fixed application-manager launch
of the exact app ID and installed ELF. It cannot select arbitrary launch
targets. It checks process identity before signals and stops on failure.
The owner opens the first menu; subsequent launches are part of the
explicitly requested bounded repetition sequence.

Profiles are eight seconds of dual overlap per cycle (at most 20 cycles),
five minutes or 30 minutes, plus startup/recovery/cleanup. Longer profiles
require same-build reports and human visual checks. Native progress/feed
watchdogs and a hard alarm bound failures; an alarm or unconfirmed exit
is not successful cleanup. Back, focus loss and Ctrl+C cancel. Fixture
clocks reset at stream wraps; native PTS must keep advancing.

Long playback collects resource logs in startup/final windows, not continuously.
Retained logs are correlated privately for A/B ownership; arbitrary vendor
strings, raw registration IDs and SSH identifiers stay out of shared reports.
Human observations remain separate from telemetry. [Run procedure](build.md#repeatability-and-endurance)

If the app or optional helper misbehaves, close **only this app** or interrupt
the foreground CLI. Stop testing on any unexpected input/mode/service behavior.
Use the physical remote's normal Home/Back/Input controls to restore viewing.
Do not follow upstream recovery instructions that restart ACB, compositor or
other system services. No backup/restore of firmware or settings is needed
because this implementation has no such write path.

The owner handles installation and checks visible playback and normal viewing
after exit. Builds and ABI checks are tracked separately from device playback.
