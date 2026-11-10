# Passive scope, privacy and recovery

This build performs no firmware changes, flash/device-node writes, kernel-module
loads, protection bypass, persistent service/config changes, hooks/injection,
critical service restarts, HDMI switching or active video capture. Installing an
application does add its ordinary package files; uninstall removes the app.
Starting a normal foreground diagnostic app can obscure/suspend existing video
through normal webOS lifecycle behavior. This is not an HDMI coexistence test.

The web app makes no query until the user presses **Read device metadata**. It
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

The native CLI has no input parameters, network access, service calls, file reads
or privileged APIs. Seven fixed local library paths are checked using stat;
symlinks can resolve to a regular library. It does not reveal link destinations
or read/link/load library bytes. Missing/unresolvable paths mean only
`not_found_in_scope`, while denied/nonregular/error cases mean `unavailable`.
Libraries in other directories/versions may exist. No counts are inferred.
The CLI owns no hardware resources and writes only stdout/stderr. A human may
redirect stdout to a temporary file; no TV path is written by the program.

If the app or optional helper misbehaves, close **only this app** or interrupt
the foreground CLI. Stop testing on any unexpected input/mode/service behavior.
Use the physical remote's normal Home/Back/Input controls to restore viewing.
Do not follow upstream recovery instructions that restart ACB, compositor or
other system services. No backup/restore of firmware or settings is needed
because this implementation has no such write path.

The cloud environment has no TV credentials or access authorization. All physical
actions in the manual protocol are human-operated, separately from cloud builds.
