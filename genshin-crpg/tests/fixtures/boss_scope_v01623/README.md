# Verified historical boss-scope source supplement

The boss scope test reconstructs the published 0.16.23 engine from the immutable
manifest at `docs/data/balance_v01624/source_before/published_source_manifest.json`.
Its baseline commit is `1bf0ee5fb35f5fba371466e2e29f01ef7fa4ed59`.

The original before-source overlay covered files changed in 0.16.24. Four more
files changed in subsequent releases, so sharing those current files no longer
reconstructed the historical engine. This directory supplies their authentic
published Git blobs. `provenance.json` records their identities and retrieval
locations. The test verifies their hashes and all 233 source blobs against the
original manifest before executing any baseline comparison.

The raw QA database is shared between old and current engines and must remain
identical. It is not represented as the authored production database. Optional
`--require-recorded-qa` additionally requires the recorded diagnostic DB hash.

Do not change a recorded old hash to match current source, copy current source
into this supplement, or weaken save and scope assertions to hide baseline
failure. If a future shared file changes, retrieve its immutable blob from the
original manifest and add it here with provenance. `--baseline-root` remains
available for a separately materialized complete historical tree.
