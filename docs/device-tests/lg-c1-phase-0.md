# LG C1 Phase 0C — human-operated passive verification

Current result: **not run**. No measured device log is included in this PR.
Expected examples are not observations. Run only after reviewing this build and
explicitly choosing to install this diagnostic on a TV you own/control.

## Prerequisites and scope

- Rooted C1 is the research reference; this package does not use root. Existing
  authorized CLI/Dev Manager access, working physical remote and ordinary viewing
  controls are required. Do not establish root or change developer/system
  settings as part of this procedure.
- Record locally: app commit, package SHA256, LG C1 family, exact firmware and
  displayed webOS version. Do not record serial, complete region/model suffix,
  IP/MAC, login/device ID or credentials in shared logs. Firmware/SDK versions
  are relevant nonunique evidence. Leave board/SoC unknown unless separately
  established without private identifiers.
- Review [safety](../safety.md), [build/inspection steps](../build.md) and the
  package verification result. Do not use a host binary on the TV.
- No HDMI/tuner/compositor test is enabled. You do not need connected sources or
  protected video. Launching a foreground app can cover/suspend existing content
  normally; that does not measure source coexistence.

## A — install, metadata and cleanup (about 5 minutes)

1. On your local development computer, run the host/build/package checks in
   build.md and note `sha256sum dist/io.github.tpapaz.multiview.probe_0.1.0_all.ipk`.
   Confirm the archive is the **web-only** package with no helper/service/scripts.
2. Install and launch using the four commands in build.md (run the close/remove
   commands at the end). Installation is your explicit opt-in to add this app's
   normal package files. Do not change permissions to force installation.
3. Observe initial UI: all functional capabilities unknown, no query in progress.
   Use arrows/OK and Magic Remote pointer if available. Record only the outcome
   of initial rendering/focus, not a screen showing personal content.
4. Press **Read device metadata** once. Expected within 3 seconds: `ok`,
   `unavailable`, `timeout`, or `invalid_response`. `ok` may still have missing
   fields if agreements/permissions differ. C1 family may remain unknown if its
   model format differs from the conservative OLEDxxC1 allowlist.
5. Confirm the output contains only C1/unknown family and numeric dotted
   firmware/SDK versions. All eight capabilities must remain unknown, tests
   empty; there must be no source activation or settings change. File/library
   observations are absent in this web report by design.
6. If possible, press Cancel during a query. It should settle as cancelled and
   permit another manual query; completion may win the race. Hide/close the app
   during a query; it must not continue querying/retrying. Reopen for one further
   manual run to check cleanup; no background service is installed.
7. Press Export JSON once. TV browsers may not download; if it fails silently,
   use local Web Inspector: `npx --no-install ares-inspect -d c1 io.github.tpapaz.multiview.probe`.
   In the inspector console evaluate
   `document.getElementById('report').textContent` and copy **only the JSON**
   into a local `c1-web.report.json`. Do not copy complete console/session logs,
   inspector URLs or network/debug traces. Inspector is optional; if unavailable,
   record the report fields manually and mark export unverified. Do not enable
   new privileged debugging capabilities to force it.
8. On the local computer validate (validation does not upload):

   ```sh
   .venv/bin/python scripts/validate-report.py c1-web.report.json
   ```

9. Review the JSON before voluntarily sharing it. Report the commit/hash, C1
   family, exact firmware, observed query outcome and whether normal viewing
   returned. Never label this file synthetic if genuinely collected; never label
   fixture-generated data a TV result.
10. Close via UI/Back or the app-specific close command; return to your previous
    viewing activity using the remote. Remove only this app with the remove
    command in build.md. Verify it disappears from your app list and viewing
    works normally. Keep/delete the local export at your discretion; it is not
    automatically removed from a computer/download folder by TV uninstall.

If any unexpected display/input behavior persists, stop and use normal remote
controls. Do not restart system services, alter firmware or retry an invasive
method. Record a redacted failure and keep all related hardware conclusions unknown.

## B — optional native filesystem inventory, separately gated

This PR contains **no ARM binary and no native IPK**. Skip this section unless a
local engineer has completed and recorded the cross-build/ABI review in build.md
against your exact firmware. It is not required to validate the web package.

Using your existing authorized local shell, transfer the reviewed helper to
`/tmp/multiview-probe` (not a system directory). Do not paste credentials/hostnames
or shell history into a report. Run in a foreground shell with the least
available privilege; no root escalation is needed by the implementation:

```sh
/tmp/multiview-probe > /tmp/multiview-native.report.json
```

Expected runtime is under a second for seven local stat calls. If it has not
returned in 5 seconds, interrupt with Ctrl-C and mark blocked; do not retry with
more privilege. Retrieve only `/tmp/multiview-native.report.json` with your
authorized local file tool, validate with validate-report.py, and review it.
Do not dump libraries or their contents. The native device metadata stays
unknown: associate its origin with the consented web report **in the local test
record**, without inventing a unique fingerprint or blindly merging reports.

Remove only these two files through the same local file tool or foreground shell:

```sh
rm /tmp/multiview-probe /tmp/multiview-native.report.json
```

`present` means a regular file resolved at one allowlisted path. Missing,
denied or partial inventory proves no hardware limit. No library constructors,
exported symbols, capture operations, device nodes or input APIs were exercised.

## Record and next decision

Use a small local record with: date, commit/package hash, family, firmware/SDK,
web/native report origin, observed outcome, manual controls/export/exit/remove
results, any normal lifecycle interruption, and limitations. No genuine test is
complete until evidence exists. A host report or package build cannot close 0C.

After a genuine passive report, review C1-specific SMP exported-window ABI and
resource ownership for the separate Phase 1 two-local-clip experiment. Then seek
a credible per-port HDMI session interface before proposing Phase 2 dual-input
activation. Two unprotected independent HDMI clocks must later advance in the
same view to prove the defining objective. This PR provides **no active test
commands**; do not run upstream allowlist writes, private API guesses, forced
capture or firmware/service changes from this protocol.
