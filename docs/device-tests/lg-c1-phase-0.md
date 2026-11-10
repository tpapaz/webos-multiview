# LG C1 Phase 0 — Passive probe

## C1 results

On 2026-11-10 the owner installed probe 0.1.0 through Dev Manager. The
original build displayed a black screen and its buttons did nothing.
Authorized SSH and Web Inspector showed that CSP blocked the packaged
scripts, style and icon from the app's file URL. The replacement allows
`file:` for these local assets. Replacement IPK SHA-256
`4e2e8556ef461deb3fa0fa464857748818559032e6588727984d9a535d0a3bf0`.

After the owner reinstalled, Inspector verified the scripts and style
loaded and the metadata query returned `ok`. The report records LG C1,
firmware 03.53.45 and webOS SDK 6.5.3, with board and all eight functional
capabilities unknown. The redacted report is
`build/reports/c1-web.report.json`. The owner verified remote navigation,
Close to Home, normal HDMI picture and sound after exit, and uninstall.

**Unknown:** direct on-TV download and in-flight cancellation. The Export
handler ran, but Inspector observed no download events over 3.5 s, and
a bounded search found no matching file. Reading the report via Inspector
worked. All physical-input capability conclusions remain unknown.

## Repeat the test

1. Build or install the passive IPK using the [build guide](../build.md).
   Open it in Dev Manager and verify that the initial UI responds to the
   remote.
2. Press **Read device metadata**. Expect a result within three seconds.
   Check that device metadata is limited to the family and versions. If
   time permits, cancel a fresh query while it is pending.
3. Try **Export JSON**. If there is no download, use the authorized local
   profile with `npx --no-install ares-inspect -d c1 io.github.tpapaz.multiview.probe`.
   Copy only the result of `document.getElementById('report').textContent`
   and validate it with `python3 scripts/validate-report.py c1-web.report.json`.
4. Close the app, return to normal viewing and remove it through Dev
   Manager. Record the package hash, firmware and observed results.
   [Safety and privacy](../safety.md)

The separate native inventory CLI can be tested after an ARM build and ABI
review against the exact firmware. Run it in the foreground from a
temporary path and retrieve its JSON. A resolved library path is a file
observation. Remove the temporary binary and report after the test.

## Host and package checks

The initial Phase 0 build passed seven Node tests, one CTest, ES5/JSON and
schema validation, and exact IPK payload inspection. Mocked Chromium
verified metadata, redaction, cancellation, export and keyboard navigation.
The replacement passed lint, Node tests and package inspection before the
C1 retest. The original source and CI package were published with
[PR #1](https://github.com/tpapaz/webos-multiview/pull/1).
