# Delivery and publication status

Implementation and validation are complete locally. **No pull request was created.**
Git push to the supplied repository returned HTTP 403 (`Permission denied`), and
the connected GitHub contents API returned HTTP 403 (`Resource not accessible by
integration`). Repository metadata reported user push permission, but the
integration's effective write access did not permit publishing. This is a
GitHub authorization failure, not an automatic sandbox-approval rejection.
No remote files, branches or settings were changed. CI is authored, not remotely
executed. No release was published.

The local repository contains main (the original supplied starter documents) and
codex/phase-0-passive-probe (the implementation). Deliverables outside source are:

- `webos-multiview-phase0.bundle`: both branches and complete Git history.
- `phase0-feature.patch`: feature diff from the supplied main baseline.
- `webos-multiview-phase0-source.zip`: tracked source only, including the PR body.
- `io.github.tpapaz.multiview.probe_0.1.0_all.ipk`: web-only package, not TV-tested.
- `SHA256SUMS`: transfer checksums.

After enabling **Contents and Pull Requests write access** for the connected
GitHub integration, Codex can retry publishing without reimplementing the work.
Alternatively, an authorized maintainer can use their own local Git credentials:

```sh
git clone --branch codex/phase-0-passive-probe webos-multiview-phase0.bundle webos-multiview
cd webos-multiview
git branch main origin/main
git remote set-url origin https://github.com/tpapaz/webos-multiview.git
git push origin main codex/phase-0-passive-probe
gh pr create --repo tpapaz/webos-multiview --base main \
  --head codex/phase-0-passive-probe \
  --title 'Phase 0: HDMI feasibility audit and passive capability probe' \
  --body-file docs/pull-request.md
```

These commands expect the remote still to be empty. If another maintainer has
initialized main meanwhile, fetch and reconcile the baseline; **do not force push**.
The feature patch omits the baseline documents; use the bundle or source ZIP when
starting from an empty repository. Source archives/bundles contain no build
caches, node_modules, TV credentials or genuine device reports.
