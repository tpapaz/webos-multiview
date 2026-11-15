# Root-assisted UTP permission policy

[Current state](../../../STATUS.md) · [Current trial](../../../docs/device-tests/current-plan.md) ·
[Technical evidence](../../../docs/research/c1-hdmi-interface-map.md)

## Exact scope

Manifest ID: `io.github.tpapaz.multiview.hdmiwindow.utp-policy`.
One non-public group: `io.github.tpapaz.multiview.hdmiwindow.utp`, granted only to
connection `io.github.tpapaz.multiview.hdmiwindow`, for four additional methods:

- `com.webos.service.utp.extinputs/open`
- `com.webos.service.utp.extinputs/switchExternalInput`
- `com.webos.service.utp.extinputs/stop`
- `com.webos.service.utp.extinputs/close`

| Source file | Meaning |
|---|---|
| `hdmiwindow-utp.manifest.json` | Separate manifest referencing only the three owned payloads. Its policy version is independent of app version. |
| `hdmiwindow-utp.api.json` | Four exact methods assigned to the own group. |
| `hdmiwindow-utp.client.json` | Group assigned only to the own app connection. |
| `hdmiwindow-utp.groups.json` | Description and `public:false`; no extra trust metadata. |

Remote payloads are under `/var/luna-service2/multiview-hdmi-window/`. The original
manifest is held at
`/var/luna-service2/multiview-hdmi-window/hdmiwindow-utp.manifest.removed-20261114-001.json`,
outside scan roots. Its historical filename does **not** mean it is unloaded.
Latest authorized activation loaded that exact file and verified exact coverage;
the grant is retained pending trial/separate cleanup. [Actual result](../../../docs/device-tests/archive/c1-first-picture-campaign-2026-11-15.md#014-narrow-permission-activation-and-coverage-verified).

No LG/generated policy replacement, role/service, inbound endpoint, wildcard,
borrowed caller, broad all/private or bus-admin grant is added. App requiredACG
stays empty. IPKs contain no policy, installer or autostart. Method permission
cannot constrain port/window/pipeline payload ownership or prove two receivers.

## Acceptance and limits

The stock utility uses its default named identity, not `-m`/`-a` or a borrowed app.
Saved caller/core policies and exact before/after coverage support the authorized
activation. This is not a root-UID bypass. Normally registered app permission
predictions can fall back to configured groups; empty-data allow branches explain
why a positive Boolean alone is insufficient. Historical native acceptance
remains failed; current reports call it `predictionMatchesExpected` and keep
`permissionReadiness:unknown`.

`queryServicePermissions` replies do not label active-versus-configured origin.
Exact map coverage certifies these two returned subjects and the scoped delta,
not effective live-caller inheritance, provider registration, UTP execution or
hardware release. Installed/generated bindings remain separate acceptance gates.

The earlier live removal lost transport with receipt/execution/cause unknown.
Later preservation/owner boot/denied maps independently established rollback;
the frozen changed-UUID gate stayed failed. Latest activation loaded the grant
again. No removal retry, manifest move, reload/service restart or routine boot
is queued. Do not revoke cleanup methods while acquisition might still need them.
[Full historical analysis](../../../docs/research/archive/c1-hdmi-admission-2026-11-14.md).

## Offline coverage acceptance

The checker reads local captures only: no profiles/network, evidence writes,
policy changes or app launches. The latest actual activation replays with:

```powershell
node scripts/check-hdmi-utp-coverage.cjs overlay build/phase-2/utp-activation-0.1.4-20261114-001/baseline build/phase-2/utp-activation-0.1.4-20261114-001/overlay
```

| Mode | Directory arguments in order | Acceptance |
|---|---|---|
| `baseline` | Baseline | Valid nonempty context, own group absent, target coverage `[0,0,0,0]`. |
| `overlay` | Baseline, overlay | Only own-app membership and four exact rule additions; coverage `[1,1,1,1]`. |
| `removed` | Baseline, removed | Own group gone and semantic maps restored exactly to baseline. |
| `transaction` | Baseline, overlay, removed | All three phases pass; a failed original transaction stays failed. |

Each directory needs `capture.json`, `reply-0.json` (own app), `reply-1.json`
(UTP). The loader validates subject/reply hashes, successful utility exits, size/
time bounds and seven core pins against saved references. Phases must be strictly
ordered without overlap and share the same core bindings. Missing private inputs
fail locally without fetching; portable `npm test` uses synthetic fixtures instead.

Group order/duplicates do not add access. Exact/prefix-wildcard matches are all
considered; empty context, unsupported syntax, extra scope or incomplete removal
fails. Output keeps actual admission/context/release unknown and always states
`deploymentAuthorized:false`: checking a file is not permission to deploy anything.

## Local scope check

```powershell
npm run check:utp-policy
```

This rejects extra methods/groups/identities, roles/services, unowned paths,
inbound APIs and broad grants. It does not emulate C1 loading or hardware.
Payload hashes are pinned in the package validation record. No more firmware
retrieval is needed for this policy review; current action belongs only to the
single trial plan and explicit owner scope.
