# Passive probe startup failure — 2026-11-10

Reference device: owner-identified LG C1. Exact firmware/webOS version was not
collected in this inspection. The owner installed version 0.1.0 through Dev
Manager and reported an unresponsive metadata button and black screen.

With explicit owner authorization, read-only SSH and the existing Web Inspector
were used to inspect only this application. No TV files, services, settings or
inputs were changed. Connections and the temporary localhost tunnel were closed.

## Verified observations

Installed probe.js, ui.js and index.html SHA256 values matched the checkout:

```text
probe.js   8fa356e2833e0e47d0b2fc0d505f80badb650194de89409a18fbfedcac2a2478
ui.js      a7ee4ede8a54c855ce8669dd0d284d05b95cdc295f7ff939c9ee8f1771cf9076
index.html 7c8420afed26b93cf07ca5a982cf4119255f4b9a20ff4ecfce7057be9b53aa56
```

Redacted Web Inspector state from Runtime.evaluate:

```json
{"ready":"complete","status":"Ready. Library inventory is a separate native CLI; it is not run by this app.","reportLength":0,"api":"undefined","runHandler":"object","runDisabled":false,"bridge":"function","visibility":"hidden"}
```

Log.enable returned CSP errors rejecting icon.png, style.css, probe.js and ui.js
from the installed application's file URL. Each error identified the applicable
`img-src 'self'`, `style-src 'self'` or `script-src 'self'` directive. The metadata
and export handlers therefore never loaded. Bridge availability alone does not
verify a successful service query.

The policy is in apps/probe-ui/index.html:3. Explicit file-scheme sources address
the observed file-origin mismatch; see [MDN's origin explanation](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Same-origin_policy)
and [CSP source syntax](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy).

## Local repair and validation

- Allow `file:` for scripts, styles and images alongside `'self'`; retain the
  prohibition on network connections, objects, inline scripts and eval.
- Invoke the packaging CLI through Node directly, avoiding Windows npm shims.
- `npm run lint`: passed.
- `npm test`: all seven existing host tests passed.
- `npm run package`: passed on Windows.
- Package structure/content: passed scripts/verify-ipk.py checks using an
  in-memory Python ar reader in place of unavailable external `ar`. No archive
  files were extracted or executed.
- Replacement IPK SHA256:
  `4e2e8556ef461deb3fa0fa464857748818559032e6588727984d9a535d0a3bf0`.
- Local rendered QA: blocked; a temporary headless Chrome debugging session did
  not start. No Browser plugin or Playwright installation was available. The
  launched process was stopped; no development server was started.

The replacement retains version 0.1.0; distinguish it by hash. It was **built and
packaged, not installed or TV-tested** during this inspection. Native ARM/ABI and
schema checks were not rerun for these HTML/packaging changes.

## Same-day owner-installed replacement retest

The owner confirmed reinstalling and opening the replacement. Inspection of the
existing TV Web Inspector target verified the updated CSP with `file:` sources,
`MultiViewProbe` as an object, the metadata click handler as a function, and the
stylesheet's computed body background `rgb(17, 24, 39)`. The initial status already
reported `ok`; an additional click through the page's own handler also returned
`ok`, with the Read button re-enabled after completion. No CSP errors were
returned by Log.enable in this inspection.

Actual TV report fields retrieved from the rendered JSON, not a mock:

| Field | Observed value |
|---|---|
| schemaVersion / probeVersion | 1 / 0.1.0 |
| mode / origin | passive / web-metadata |
| redactionApplied | true |
| modelFamily | LG C1 |
| webosVersion (SDK field) | 6.5.3 |
| firmwareVersion | 03.53.45 |
| boardFamily | unknown |
| observation method | luna-getSystemInfo |
| observation backend | luna://com.webos.service.tv.systemproperty/getSystemInfo |
| observation result | ok |
| observation limitations | Metadata only; no media or HDMI test. Missing fields remain unknown. |
| capabilities | All eight entries unknown, each with null evidence |
| tests | Empty |

The inspector reported document visibility as `hidden` despite the owner
reporting the app open. No screenshot or foreground/remote interaction claim is
made. This verifies script/style loading and the passive metadata request on the
TV; it does not verify every aspect of visible rendering or app lifecycle.
The SSH session and temporary inspector tunnel were closed after inspection.

## Owner-observed Close result

The owner reported that pressing Close exits the app and returns to the TV Home
screen. This verifies the visible Close-to-Home behavior on the same test TV;
it does not establish process termination, cancellation of an in-flight request,
uninstall success or restoration of previous HDMI playback.

## Export inspection

At the owner's request, SSH and the existing Web Inspector were used to invoke
the installed Export JSON button handler. The report contained 1252 characters;
Blob, URL.createObjectURL and the anchor download attribute were available. The
handler returned without a logged error, but the status remained unchanged and
no Page.downloadWillBegin or Page.downloadProgress events were observed during
the 3.5-second observation window. A bounded search for `multiview*.json` under
/media/internal, /media/developer, /tmp, /home/root and /var/luna found no file.
This is consistent with a silent download failure; it does not exclude a file
outside the searched locations or delayed download behavior.

The actual displayed report was retrieved through Runtime.evaluate and saved on
the development PC as build/reports/c1-web.report.json (ignored by Git). JSON
parsing succeeded; its origin was web-metadata, redactionApplied was true, and
the query result was ok. Full schema validation was not run in this inspection.
No TV download settings were changed. SSH and the temporary tunnel were closed.

Direct TV download remains unverified; inspector retrieval is verified. The UI
currently gives no confirmation when its download attempt is silently ignored.

## Owner-observed navigation and uninstall

The owner confirmed remote navigation works, their usual HDMI picture and sound
were normal after closing the app, and Dev Manager uninstalled the probe. One
physical HDMI source was connected. In-flight cancellation was not exercised on
the TV. The earlier Inspector retrieval provides the redacted report. These
results meet the Phase 0C gate for preparing the separate
[Phase 1 protocol](lg-c1-phase-1.md). All HDMI capability conclusions remain unknown.
