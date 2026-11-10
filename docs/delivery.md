# Delivery and publication status

Published on 2026-11-10 after the repository owner installed the GitHub connector.
The earlier HTTP 403 publishing failures are resolved.

- [Pull request #1](https://github.com/tpapaz/webos-multiview/pull/1)
- Feature branch: `codex/phase-0-passive-probe`
- Base branch: `main`, containing the original supplied starter documents
- [Download feature-branch source ZIP](https://github.com/tpapaz/webos-multiview/archive/refs/heads/codex/phase-0-passive-probe.zip)
- [GitHub Actions](https://github.com/tpapaz/webos-multiview/actions): select a
  successful **Phase 0 host and package** run, then download the
  **passive-web-probe-not-TV-tested** artifact from its Artifacts section.
  GitHub may require sign-in for artifact downloads. The ZIP contains the IPK.

The web package is passive and web-only. It has not been tested on the LG C1.
No native ARM artifact or release is supplied. The PR remains open for review;
no merge, TV deployment or active hardware test is performed by publication.

The original local delivery bundle, feature patch and source ZIP were prepared
before publication because this chat's workspace downloads were unavailable.
GitHub now provides the source and CI-generated package delivery path. Use the
current PR/branch for subsequent changes, rather than the older local snapshot.
