# Phase 0 implementation plan

Scope: roadmap Phase 0A and passive portions of 0B only. Initial repository was
empty; the supplied ZIP is the baseline on main, preserved verbatim except the
README will be revised on the feature branch. The initial issue list was empty, confirmed via GitHub CLI after the
issue-list connector returned argument-binding errors.

1. Audit pinned upstream trees and LG documentation; record licenses, generation
   limits, API ownership boundaries and documentation access failures.
2. Implement a least-privilege web diagnostic package and a separately built
   native filesystem inventory CLI. No privileged service, capture, decoder,
   compositor or HDMI activation adapter. Keep all functional capabilities unknown.
3. Enforce a versioned schema, allowlisted metadata and bounded reads. Test with
   fake transports/filesystems, including denied access and private data.
4. Build host code and package the web UI with the official webOS CLI if available.
   Verify archive contents separately from TV runtime and native ARM ABI validation.
5. Document install/remove, report export and human-operated C1 passive validation.
   Publish a focused PR; no TV connection, firmware change or active hardware test.

Acceptance: sourced research, host tests/lint/build pass, schema-validated reports,
truthful artifact status, safe C1 protocol. Later roadmap phases remain gated.
