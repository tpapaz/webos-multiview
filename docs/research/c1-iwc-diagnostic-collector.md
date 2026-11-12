# Fixed IWC diagnostic collector

> Research/tool record. [Current status](../../STATUS.md) · [Documentation index](../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

Prepared locally 2026-11-12 from the
[permitted-caller evidence](c1-iwc-permitted-caller.md) for C1 firmware 03.53.45,
SDK 6.5.3. **Host-tested only; never connected to or run on the TV in this task.**
No package, installation, permission edit, app relaunch or geometry/crop change.

Implementation plan: pin the saved utility/policies, reserve local evidence
before connecting, allow one constant diagnostic command, validate/redact its
reply, bound cancellation/cleanup, and test acceptance failures using fake
SSH/SFTP and clock. The existing root profile loader is reused without printing
its data. It now accepts an AbortSignal so deadline cancellation can stop a
pending SSH connection. Existing callers retain the same connection behavior.

## Behavior and boundary

`scripts/collect-iwc-diagnostic.cjs` is a host CLI. Importing it, invoking
`--help` or omitting its execution flag performs no connection. An actual
device run requires the exact `--run-readonly <new-local-report.json>` form.
The output is exclusively created before connecting and never overwritten.
Do not invoke that execution form until the owner authorizes the device read.

`scripts/iwc-diagnostic.cjs` contains the fixed command and eight exact C1
artifact pins: the stock ELF, its role, client grants, two group files, API
rule and two referencing manifests. Each file must be regular, have the
recorded exact size/hash, and the executable mode must remain `0700`.
SFTP reads use an explicit maximum plus one byte, failing on size/hash changes.
A failed/incomplete preflight never submits an execution request. The pins
were independently compared with all eight saved evidence files locally.
These are sequential file checks, not an atomic snapshot of the live hub's
in-memory grants; later file/role changes remain outside that guarantee.

The only remote command string is:

```text
exec /usr/bin/luna-send -n 1 -w 2000 'luna://com.webos.service.iwc/listPublishedWindows' '{"subscribe":false}'
```

It uses the actual stock utility's own default identity. No caller name,
app ID, URI, payload, command, profile alias or loop options are accepted from
the CLI. No `-m`, `-a`, proxy, setters, subscriptions, app launch or input
switching are added. The shell `exec` replaces its process with that utility;
signal requests target only the owned SSH exec channel, never unrelated PIDs.
IWC dynamic activation remains possible even though listing does not modify
publication geometry.

One reply is requested, with the stock two-second timeout. A host deadline
starts before SSH connection/preflight. At 6.5 seconds it stops work and requests
TERM on the channel, then KILL after 0.5 seconds if still unresolved, and gives
up after another 0.5 seconds; a separate hard timer is eight seconds. SIGINT/
SIGTERM use the same cleanup path. No retries occur. Late connection/preflight/
reply events cannot launch a command or turn settled failure into success.
Timers are cancelled and the owned connection is destroyed when settled.

Exit confirmation requires both an SSH exit event and channel close. Servers
may reject signal requests or transport may disappear: the report then leaves
utility cleanup unconfirmed. Closing SSH alone is not claimed to prove process
death. An empty stdout with zero exit, missing exit, nonzero/signaled exit,
stderr, cancellation, transport error or deadline cannot pass admission.

## Evidence output

Stdout is bounded at 32 KiB and decoded as strict UTF-8. JSON must have Boolean
`returnValue`, no active subscription, and, on success, at most 64 publications
with unique nonnegative integral IDs, bounded nonempty strings and positive
integral dimensions. All IDs/dimensions follow the existing admission runner's
32-bit integer bounds; string bytes are capped at 256 and NUL is rejected.
Malformed, trailing, truncated, oversized and invalid rows fail closed.

`returnValue: false` is reported as `service_rejected`, not assumed to prove a
permission denial. Only validated success plus zero confirmed utility exit
reports `read_admission_passed` and publication/HDMI-app candidate counts. A
successful empty list is a valid diagnostic read, not proof of absent receivers.

The local report exports fixed status, known execution context, verified
hash/path bindings, execution-requested flag, exit/cleanup evidence, elapsed
time and counts. Counts remain null on failure. No raw replies, IDs, native
errors, stderr, credentials or network identifiers are printed or stored.
`executionRequested` is not a claim of delivered IWC calls. Caller registration
itself is not separately reported by the stock utility. A captured success
would establish only **root diagnostic IWC read admission**; app admission,
normal-view baseline, applied geometry and simultaneous HDMI remain separate.

CLI exits 0 only for that validated diagnostic success; failed capture exits 1,
and invalid arguments exit 64. A local write failure is also failure even if a
remote reply had succeeded; preserve any partial local evidence for review.

## Local acceptance and next step

`npm run test:iwc-diagnostic` uses fake SSH/SFTP, fixture digests and a simulated
clock. It covers exact command/absence of identity or setter overrides; pin,
mode and symlink refusal before execution; chunked/empty/error/malformed/UTF-8/
oversized replies; duplicate/invalid/too many publications; raw-data redaction;
required exit/close evidence; TERM/KILL escalation; successful cleanup on
cancellation; deadline/connection/preflight races and late-event rejection.
Node's cryptographic hash implementation is not mocked in the separate saved
evidence pin check; only transport fixtures substitute digests for portability.

Passed locally:

- `npm run test:iwc-diagnostic`
- `npm test`
- `npm run lint`
- `node --check scripts/iwc-diagnostic.cjs`
- `node --check scripts/collect-iwc-diagnostic.cjs`
- `node --check scripts/phase1-device.cjs`
- `node scripts/collect-iwc-diagnostic.cjs --help` (no connection)
- Saved evidence pin comparison and `git diff --check`.

No ARM rebuild, IPK or simulator test is relevant to this host-only collector.
No device test occurred. Next is review of this concrete collector, followed
only on owner instruction by a single diagnostic read while leaving the app
closed. Preserve the prior app-denial report and record whether a selected HDMI
input was visible; do not launch or switch inputs to manufacture publications.

Device follow-up: on 2026-11-12 the owner authorized exactly one fixed run.
[Root diagnostic run 001](../device-tests/c1-journal.md#root-read-001) passed with
all pins matched, zero publications/candidates, utility exit 0 and cleanup
confirmed (401 ms). No app relaunch or permission/geometry/crop change occurred.
This is TV-tested diagnostic listing admission only; app admission remains denied.
On the same date, a second separately authorized read with owner-confirmed
stable live HDMI passed with one publication and one HDMI-app candidate,
utility exit 0 and cleanup confirmed (449 ms). See
[run 002](../device-tests/c1-journal.md#root-read-002). No active geometry or crop
request occurred; target/baseline and recovery checks remain separate.
