# C1 IWC admission gate and bounded full-view reset plan

> Research/tool record. [Current status](../../STATUS.md) · [Documentation index](../README.md). Earlier next steps and untested labels describe that stage; use Status and later device records for current results.

Date: 2026-11-11. LG OLED C1, firmware 03.53.45, SDK 6.5.3.
**Saved-evidence research and candidate plan only.** No TV connection, Luna
call, app launch, installation, geometry/crop request or build in this pass.
Actual caller admission and applied restoration remain **unknown**.

Plan for this pass: inspect the saved hub permission-query handler and IWC
listing, separate policy prediction from actual caller admission, then specify
the reset preconditions, bounds, failure handling and evidence required.
The [ownership/recovery trace](c1-iwc-ownership-recovery.md) supplies artifact
hashes and the underlying frontend/compositor trace. This plan does not advance
Phase 1 or establish independent HDMI receivers or simultaneous HDMI 1 + 2.

## Non-mutating admission gate

**Verified/static:** the saved C1 hub contains `HubService::IsCallAllowed`
at `0x4319c`. Its constructor associates the `isCallAllowed` method name at
`0x47550`; its saved schema strings near `0x51bef` require string `uri` and `requester`
fields. The handler parses the URI at `0x43438`, reads the supplied requester
at `0x43698–0x436aa`, and invokes `LSHubIsCallAllowed` at `0x436b8`. It builds
`returnValue: true` with a separate Boolean `allowed` at `0x436e4–0x43744`.
The inspected handler evaluates permission; it does not invoke the URI's IWC
method. JSON parsing, allocation and replies still occur: non-mutating here
means no requested publication, input or viewport change, not zero process work.

The underlying check uses provided groups (`0x3276a`), active permissions
(`0x32780`) and a required-groups lookup (`0x328c6`). A named-requester result
is a policy prediction, not authentication of that requester by the query.
In particular, it does not prove successful registration of the future binary,
service-name routing, IWC handler execution or applied geometry. Never query a
stock identity and report that as this application's admission.

Evidence: `build/phase-2/iwc-caller-restore-20261111/hub-5.bin`, SHA-256
`fe05e830674fd80b99d24d9707926b130d978f62cde0690502c898a614c18299`;
saved `hub.annotated.asm`, `hub.symbols` and `hub.strings`. Addresses are ELF
virtual addresses, not device observations. The follow-up below resolves the
client-to-hub route and selects a dedicated registration contract. Actual
registration and live permission responses remain untested.

| Gate | Required evidence | What it may establish |
|---|---|---|
| A. Real caller | Review the future package's manifest, executable hash, generated roles/client groups and actual registration form. Use its own declared identity. | Declaration plus successful registration, once observed. The installed Endurance app remains only a saved policy specimen. |
| B. Exact-method policy | From the intended caller context, query its own identity for IWC `listPublishedWindows` and `setExportedWindow`, separately. Review the hub route first. | `returnValue === true` AND `allowed === true` predict permission for those exact methods at that time. Denial, missing Boolean or timeout does not pass. |
| C. Actual read admission | One `listPublishedWindows` request with `subscribe: false`, from the same registered context. | A valid IWC reply demonstrates that caller's list-method admission only. It cannot prove setter admission or hardware application. |
| D. Target/baseline | Owner confirms the selected HDMI and normal uncropped full view; one unambiguous matching publication has valid positive integral logical dimensions. | A candidate target and full-view destination, not a snapshot of current crop, priority or arbitrary prior geometry. |

IWC list handler `0xa0d4` calls the listing wrapper at `0xa186`, tests
`LSMessageIsSubscription` at `0xa18c` and branches to subscription setup only
when true (`0xa192`, add at `0xa4a8`). The saved IWC binary/hash is reference
I3 in the ownership trace. Require a one-reply call and explicit false; do not
publish a dummy window to discover admission. A list call may activate the
declared dynamic IWC provider if absent. Thus it is non-mutating with respect
to viewport/registry content, not a guarantee that no process starts.

**Candidate bounds for a future admission-only runner:** three calls maximum
(two policy queries, one listing), sequential, 2 seconds per reply, 8 seconds
overall including registration/cleanup. No retries or subscriptions; at most
32 KiB per reply and 64 list entries, with truncation/oversize failing closed.
Cancel outstanding tokens, discard late callbacks and close only owned handles.
If cleanup/exit is unconfirmed, report it separately. These are proposed limits,
not measured service latencies. No setters, invalid-target setter tests, crop,
publish/stop-publish or property calls belong in this runner.

The admission runner should have a fixed method allowlist and no generic URI,
payload or privileged command endpoint. Keep live publication/window IDs only
in process memory. Export build/policy hashes, handle form, elapsed times,
fixed error categories, reply-validity/allowed Booleans and target-match count;
omit raw payloads, IDs, arbitrary errors and network identifiers. A legitimate
root-shell diagnostic result, if separately obtained, cannot pass app admission.
Do not change policy or try borrowed/anonymous identities after denial.

**Current outcome:** static query path verified; gates A–D not executed. An
admission-only package has not been implemented, built, packaged or TV-tested.
Successful A–D would justify reviewing a later active test, not automatically
starting it. No non-mutating gate can demonstrate that a setter was applied.

## Resolved hub route and dedicated registration

Follow-up on 2026-11-11, using saved files only. **Verified/static route:**
`luna://com.webos.service.bus/isCallAllowed`. Use ordinary `LSCallOneReply`,
not a raw transport API or a shell call with an assumed application identity.
The exact C1 library is the retained `libluna-service2.so.3`, SHA-256
`e731f7ab993de5a29bf5e33b83c51eb86f87e45499701bcfe30ba6cb295e1e5b`.

The route is established by this chain, not just the hub's method-name string:

1. `LSCallOneReply` at `0xfe5c–0xfe74` enters the common call path at `0xda2c`
   with one-reply enabled and no application-proxy argument.
2. That path parses the URI at `0xda90` and matches its service name with
   `regexec` at `0xdaba`. The initializer at `0xd39c–0xd3aa` compiles the
   literal at `0x2b604`: `^com\.(palm\.(luna)?bus|webos\.service\.bus)$`.
3. After a match, it compares category against `/signal` at `0xdaf0` (literal
   `0x2b800`). The root-category route takes `0xdafa` to `0xdd3c`, passing
   method and payload to `LSTransportSendMethodToHub` at `0xdd48`.
4. That serializer appends the method at `0x1c3be` and payload at `0x1c448`,
   then sends to the existing hub connection at `0x1c45c–0x1c462`. It does not
   send this query to IWC or request IWC dynamic activation.
5. The saved hub dispatches to `HubService::HandleMethodCall` at `0x21a5e`.
   The handler reads two strings at `0x4706a`/`0x4707c`, selects the registered
   method and invokes it at `0x47116`, then sends the reply at `0x4717c`.
   `isCallAllowed` reaches the permission-only handler traced above.

No additional permission gate was identified inside the inspected generic hub
dispatcher or `IsCallAllowed` handler. This is a bounded static finding, not a
promise that an unregistered or differently packaged process can connect. The
runner must use normal registration and report any denial without changing
roles, flags or identities. IWC's ordinary service-name/method checks remain
separate from the hub query path.

**Candidate selected for implementation:** a new native package
`io.github.tpapaz.multiview.admission`, executable `multiview-admission`.
This is a proposed repository-owned identity, not an existing installed app.
Use one fixed named-public registration:

```cpp
LSRegisterPubPriv(ownAppId, &handle, true, &error);
```

The C1 wrapper at `0xb88c–0xb89c` forwards the supplied name, passes null
application metadata (`0xb896`) and preserves the explicit public flag.
This is **named service registration**, not application-aware registration and
not proof that the connection inherits an application's client-group grants.
The generated public role must bind the exact installed executable and permit
the exact name. Inspect the new manifest, role and client-permission files after
installation; do not manufacture them from the retained Endurance policy or
install custom hub roles. No system/media names or inbound API are needed.

After registration, require `LSHandleGetName(handle)` to equal the fixed own
name (C1 export `0xb8a8`), attach an owned GLib context and retain that same
handle for all three one-reply calls. Name equality is a local identity check,
not an independent report of effective permissions. A duplicate name,
registration/context failure or name mismatch ends the run before querying.
Use `LSCallCancel` for outstanding tokens and `LSUnregister` for the owned
handle during cleanup; require confirmed process exit separately.

The retained diagnostic does **not** validate this named form:
`native/phase1-endurance/native-veto.h:25` passes `nullptr` as its name.
Its app ID in payload metadata is not a registered LS2 name. Current lines
135–138 use ordinary calls; do not revive the failed historical
`FromApplication` proxy attempt. `LSRegisterApplicationService` at
`0xc3dc–0xc3e8` supplies application metadata but forces the common public flag
false; it is not an automatic alternative after denial. Neither ordinary
private registration nor anonymous registration is a fallback in this runner.

Once that fixed named handle is live, the complete outbound allowlist is:

| Order | Actual destination | Fixed payload |
|---|---|---|
| 1 | `luna://com.webos.service.bus/isCallAllowed` | `{"uri":"luna://com.webos.service.iwc/listPublishedWindows","requester":"io.github.tpapaz.multiview.admission"}` |
| 2 | `luna://com.webos.service.bus/isCallAllowed` | `{"uri":"luna://com.webos.service.iwc/setExportedWindow","requester":"io.github.tpapaz.multiview.admission"}` |
| 3 | `luna://com.webos.service.iwc/listPublishedWindows` | `{"subscribe":false}` |

The setter URI in row 2 is only a string evaluated by the hub. It must never
be selected as the call destination. Stop if either policy query fails,
returns `allowed: false`, is malformed or exceeds its bound; row 3 is then
not sent. A fixed call builder should enforce this distinction. Preserve the
three-call, two-second-per-reply and eight-second-total bounds above, with
deadlines measured from process start; registration can consume that budget.

The query's requester must stay registered through all calls. The hub looks up
its service name at `0x32770`, uses active-client permissions at `0x32780`,
and can fall back to configured required groups at `0x328c6` if it cannot use
an active entry. Querying a not-yet-installed or disconnected name can therefore
produce a policy answer without proving registration. A handle-name check plus
successful query still does not make setter admission or application verified.

Keep runtime context separate from permission results. A future owner-operated
normal package launch is the intended app-context test; invoking a binary from
root SSH would be a separately labeled context. Native app launch may obscure
or deactivate HDMI even if this runner creates no SDL/Qt/Wayland surface.
If the stock publication disappears, record target unavailable; do not launch,
switch or republish HDMI automatically. Listing admission can pass while the
target/baseline gate remains unknown. This read-only runner is not the reset
broker and establishes no independent-restorer lifetime.

**Resolved:** static external query route, payloads, single registration choice
and exact caller name. **Unknown/device:** generated policy for the new package,
successful named registration, effective grants, query/list replies and HDMI
publication continuity during its launch. These are runtime acceptance checks,
not reasons to try broader identities. No admission runner was implemented,
built, installed or TV-tested in this research pass.

Derived evidence is retained beside the previous hub analysis in ignored
`build/phase-2/iwc-caller-restore-20261111/`: `ls2-call-route.asm`,
`ls2-hub-transport.asm`, `ls2-bus-match.asm`, `ls2-bus-regex.asm` and
`admission-route-findings.json`. The latter records the verified library hash,
resolved literals and hashes of all four derived assembly files. Existing Linux
SDK `objdump -dC -M force-thumb --start-address=... --stop-address=...` ran
locally under WSL against saved files; no TV access or new upstream source was
needed. Proprietary bytes/disassembly remain local and are not copied into code.

After the owner's SDK question, LG's current [OSE bus reference](https://www.webosose.org/docs/reference/ls2-api/com-webos-service-bus/#iscallallowed)
was checked on 2026-11-11: it independently documents this exact query URI,
`requester`/`uri` fields and separate `returnValue`/`allowed` Booleans. Reuse
that documented contract; the saved-binary trace verifies its presence on this
retail C1. OSE labels it API level 26 and ACG `servicebus.communication`; neither
label establishes this C1's policy or platform version. LG explicitly does not
guarantee [OSE API compatibility with retail TV](https://www.webosose.org/docs/reference/).
Prefer existing SDK headers and API references for common LS2 mechanics, then
check only firmware-specific ABI, policy and behavior against saved evidence.

## Candidate full-view reset contract

Current gate assessment after the authorized root reads is in the
[2026-11-12 target/baseline/recovery review](c1-hdmi-target-baseline-recovery-review.md).
The bounds and reset operation below remain proposals, not permission to run
geometry or evidence of successful restoration.

### 2026-11-12: explanation of the captured policy denial

Reference remains LG C1 03.53.45 / SDK 6.5.3. Run 002 of owner-launched 0.1.2
registered its own named public handle and captured `returnValue: true` /
`allowed: false` for the first list-method permission query (the report records
the parsed result, not the raw reply). It made no IWC listing call. See the
[device/capture record](../device-tests/c1-journal.md#admission-app).

Plan for this follow-up: reuse that report, installed caller declarations and
saved C1 hub trace; inspect the exact method-group decision; read bounded API
policy files only if missing locally; compare declared groups with matching
method patterns. No registration, service call, relaunch or policy edit.

**Verified installed policy:** the caller's client-permission declaration grants
`public`; its legacy role has wildcard outbound service-name permission. These
are different checks. The hub's saved `LSHubIsCallAllowed` at `0x32724` obtains
destination patterns at `0x3276a`, active caller groups at `0x32780` (configured
fallback `0x328c6`), matches category/method patterns and searches group
intersection (`0x32832–0x32896`, `0x329ea–0x32a28`). A mismatch returns false
at `0x328a4`. Empty provided/required sets take the compatibility allow path
at `0x328fe`; absence of an exact IWC API file therefore does not by itself
explain denial. Wildcard destination patterns must also be considered.

The newly read policies resolve that wildcard case:

| Installed file | Relevant rule | Effect for the ordinary root-category list method |
|---|---|---|
| `api-permissions.d/luna-service2.api.json` | `all: ["*/*"]` | Matches `com.webos.service.iwc/listPublishedWindows`; requires intersection with `all`. |
| `api-permissions.d/ls2-internal.api.json` | public ping/cancel; private internal category | These internal paths do not match `/listPublishedWindows`. |
| `api-permissions.d/compat.api.json` | No matching IWC or service wildcard rule | Supplies no additional matching public grant in this file. |

All paths above are under `/usr/share/luna-service2/`. The first file's SHA-256
is `6bd211c7a7adc09828d9edbdbfaee800811dfbaa3530f4617f218edd46e8087b`;
the second `6232aa7111659c6165cdc81fa596c065025371bf86b65ebeed5bdaaa69a7ae17`;
compatibility file `8d648277fa2ff206e33cdc6e3060e4c4c203db824df5fd58ec52e495421a9f73`.
Matching installed manifests reference these files. Manifest hashes and exact
references are in `build/phase-2/admission-permission-20261112/manifest-inventory.json`.

Collection used only SFTP: five fixed API-policy roots from the saved hub
configuration, 512-file, 256 KiB per-file, 8 MiB aggregate and 30-second bounds.
146 JSON entries were inspected; the 300,244-byte compatibility file exceeded
the initial per-file cap and was explicitly recorded as skipped, then read
separately at its exact path with a 4 MiB/30-second cap. Initial passes stopped
at that cap; no result from an incomplete pass was treated as complete.
Regular-file reads total 836,098 bytes including compatibility. No other exact
or wildcard service pattern matching IWC was found in the examined policies.
Three matching manifest files were also read with 32 KiB per-file bounds.
Certificates, raw logs, process memory and private credentials were not read.
Configured overlay API directories were absent. This is installed-file evidence,
not a dump of every in-memory manifest or dynamic grant.

**Evidence-backed explanation:** the declared `public` caller grant does not
intersect the matching `all` API rule. Offline pattern/group evaluation predicts
denial and agrees with the captured hub result. `all` is a group name; the
wildcard method coverage does not grant access to every caller. The legacy
wildcard inbound/outbound roles do not override this method-group check.
The caller had already exited, so its exact active group vector was not captured.
Do not claim live group introspection, that IWC rejected an actual request, or
that switching registration forms would automatically solve the restriction.

Upstream context only: LG's Apache-2.0 LS2 source at commit
`5bc38aa348b35f5799f1bf9ed7c6cb513bc5f702`,
[`security.cpp:854–924`](https://github.com/webosose/luna-service2/blob/5bc38aa348b35f5799f1bf9ed7c6cb513bc5f702/src/ls-hubd/security.cpp#L854-L924),
describes the same pattern/intersection sequence. It is not asserted to be the
exact retail firmware revision; the C1 disassembly remains primary evidence.
No upstream implementation was copied. REA opened/hash-checked the saved hub,
but decompilation was unavailable (no configured provider supporting this target);
the existing annotated disassembly was sufficient, and the session was closed.

Outcome: current app-context admission gate is **denied** at policy prediction;
actual IWC listing and geometry/crop remain **unknown/untested**. Next review
whether a documented permitted caller path exists for this firmware, and, if
none does, describe a narrowly isolated root-assisted helper boundary for owner
review. Do not request the broad `all` group, alter roles, impersonate stock
services, bypass the failed gate, or implement a privileged helper in this pass.
Original report and package remain unchanged. Derived inventories and offline
`denial-findings.json` remain ignored local evidence. Documentation-only changes;
offline evidence assertions and `git diff --check` passed; no app build or run.

Limit the starting state to owner-confirmed normal uncropped HDMI full view,
outside live-menu PiP. Resolve the exact publication tuple and logical full
width/height from fresh evidence; do not substitute panel pixels, input signal
resolution or InputCommon's fixed logical source region. Ambiguous dimensions,
multiple matching publications, a cropped/PiP baseline, source changes or
publisher lifecycle changes prevent arming.

Pin publish ID, window ID, publisher app and dimensions together. The provider
matches only publish ID/window string; the extra checks are client guards, not
an atomic compare-and-set. Shared broadcasts and the frontend's post-mismatch
publish-ID assignment also leave multiple-subscriber isolation unproved (I3
`0x8894–0x8896`, saved `route-5.qml:1198–1204`). Require one eligible publication
and stop on competing activity; a list cannot establish that no stale subscriber
exists. Revalidation followed by a setter still has a time-of-check race.

The only candidate inverse is ordinary `setExportedWindow` to destination
`(0,0,fullWidth,fullHeight)` for that same publication. The C1 compositor normal
handler `0x6533c` clears original-input/crop-source rectangles before destination
dispatch (`0x653e8–0x653fa`; R2 in the ownership trace). This establishes a
static reset path, not the outcome of a hardware call. Never use crop with
guessed rectangles, stop-publish, input switching, window destruction or service
restart as automatic recovery. Do not claim preservation of an arbitrary prior
viewport or arbitration priority: neither is available in the list response.

Separate the experimental actor from a small restorer that outlives it. Prefer
one independently running, app-owned command broker as the **sole IWC writer**:
the actor requests only the reviewed fixed action through a private bounded
channel, while the broker owns the target, deadline and reset. It must reject
all actor requests once cancellation/reset begins. This is a design proposal,
not an existing helper or an arbitrary privileged IPC service. Verify its own
permitted identity, lifecycle and survival of actor exit before arming. A helper
in the actor's event loop, or a host timer dependent on surviving SSH, does not
establish independent recovery.

There is no server lease or ownership fence. Two independent writers create a
late-command race: an actor request can arrive after a restorer's reset. Killing
the actor or cancelling its token does not retract an already queued request.
A sole writer removes that local race, but still needs an evidenced ordering
contract through IWC and publisher delivery. A setter reply is not an applied
acknowledgment. Unresolved ordering, transport loss or an in-flight timeout must
remain an uncertain outcome, not a successful bounded reset.

| Stage | Proposed bound and action | Stop/failure rule |
|---|---|---|
| Preflight | Complete admission separately; fresh target check and owner baseline immediately before arming. | Any mismatch, denial or lifecycle/foreground uncertainty: no mutation. |
| Arm | Restorer records immutable target, full rectangle and a monotonic deadline before accepting an actor action. Actor receives readiness only afterward. | Missing readiness: no mutation. No timer extension by actor heartbeat. |
| Active interval | At most one reviewed geometry action; end within 4 seconds of arming, or earlier on cancellation/actor death. No crop in the first proposed trial. | Restorer permanently closes its actor-command channel on transition to reset. |
| Reset | By the 4-second deadline, revalidate the same target once (1-second limit), then attempt one ordinary full-view reset (2-second reply limit). | Stale/missing/ambiguous target: no retargeting. Timeout/denial: no repeated writes or priority escalation. |
| Finish | Close owned calls/handles and finish automated work within 8 seconds of arming. | Hard cap bounds attempted work, not time to restored picture. Unconfirmed exit or reset requires manual recovery and an inconclusive/failed result. |

All times above are **candidate engineering limits**, separate from the HUD
proposal. They must be implemented and tested with a fake transport before
device use. A blocked call or failed restorer can violate recovery expectations;
no claim of unconditional eight-second restoration is supportable.

Priority needs an explicit review gate. Omission/nonzero normalizes to 99;
zero normalizes to 0. Equal priority can overwrite, and lower priority can be
rejected for the same target (I3 `0xad2c`, `0xaf18–0xaf22`, `0x6dda–0x6de8`).
Use the same reviewed priority for action/reset; never escalate after rejection.
The least intrusive candidate is 0, which may be refused by an existing 99
request. The current priority is unavailable, so permission/preflight cannot
guarantee acceptance. Even a successful full-view reset does not restore a
previous controller's priority or provide exclusivity against stock geometry.
In particular, a priority-99 reset leaves manager state that may reject a later
stock priority-0 command for that target. Using 99 to overpower a late actor
request would therefore introduce a residual arbitration change, not establish
safe restoration; it is excluded from this candidate plan.

Owner observation is required separately: full picture, expected framing,
continuously live source and normal sound after reset and after helper exit.
Store yes/no/unknown for each; absence of sound at baseline cannot become an
audio-recovery pass. A Boolean setter success, normal process exit or a list
response does not pass visual recovery. Stop on unexpected mode/source changes,
competing geometry, denied reset or lost transport. Use only normal physical
remote recovery; do not automatically launch/switch the stock app.

## Remaining work and validation

The [admission-only implementation](../../native/phase2-admission/README.md)
now implements this contract and passes local fake-transport acceptance tests.
Its ARM ELF now passes static checks against the complete 17-file runtime
dependency closure, and the IPK is packaged and archive-verified. It has not
been installed or TV-tested. Next review the package before owner-authorized
installation, then generated policy and normal launch context before use;
actual admission stays unknown until that bounded run supplies evidence.
Keep geometry methods absent from that runner. Separately review the sole-writer
ordering and restorer lifetime before proposing an active test for owner opt-in.
Crop experiments, deliberate device crashes and dual-HDMI experiments remain
out of scope. Existing saved evidence cannot pass those runtime gates.

This pass inspected local evidence only and added documentation. Read-only Node
checks passed for 11 saved artifact sizes/SHA-256 values, 27 local links across
the four changed documents and Markdown trailing whitespace. `git diff --check`
passed. No tests were added; host unit tests/lint and native builds were not
rerun for this documentation-only plan. No package or device experiment ran.

Route/registration follow-up checks passed: 12 saved library/firmware hashes,
four derived assembly hashes, three fixed JSON payloads and 27 local links
across the four core documents. No production code or tests changed; no builds,
installation or TV calls occurred. Public documentation was subsequently checked
for the owner's SDK question; it supplements rather than replaces C1 evidence.
