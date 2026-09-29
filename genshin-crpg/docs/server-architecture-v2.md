# Account-local durable game state (design before implementation)

Base: abe662b5940763ef17b81c7392b33f49dd5c65d3. Production remains untouched.

## Evidence and acceptance

Supplied production observations: STORY_READ 2674ms (prelude 241, load 363, persistence 1709); STORY_PAUSE_FREE 1724ms (248 + 1476); MOVE 1825ms (252 + 1573). Persistence accounts for 63.9%, 85.6%, 86.2% respectively. SQL execution 0.1–1ms is not binding round-trip time. These are three observations, not percentiles. Workers performance.now/Date.now advance on I/O only, so zero CPU spans are not evidence of zero CPU cost.

Acceptance for a separate staging service from Korea: warm MOVE/COMBAT end-to-end p50 <=150ms and p95 <=300ms, including body download, no acknowledged data loss, no duplicate rewards under retries. Cold login/migration measured separately. These are targets, never claimed measurements. Do not promote if the Korean staging gate fails or has not run.

## Decision

SQLite-backed GameAccount Durable Object per account. D1 retains account/password directory, initial legacy saves, ranking projection and compressed asynchronous checkpoints. The authoritative durable commit, local session validation, revision CAS, receipt, recent inverse-patch backup and outbox marker share one local SQLite transaction. An action response waits for durable storage confirmation. No waitUntil-only saving and no optimistic client combat or rewards.

State is losslessly partitioned into top-level fields / one-level object entries. Unchanged parts are not rewritten. Delta responses are explicitly negotiated and anchored to a confirmed server revision; the client keeps a separate confirmed base, never applies patches onto provisional dialogue/menu state. Legacy clients receive full JSON. Replays receive a full current state plus the original result, as before.

Opaque random session secrets remain server-validated. v2 tokens add the account UUID for routing, not authorization; the secret hash and revocation live in the same account object. Every action checks expiry/revocation locally. Legacy sessions bootstrap through D1 and can upgrade without a password prompt. Logout leaves a local revocation tombstone, so a delayed D1 retry cannot resurrect it. No unbounded Worker-isolate auth cache.

## Alternatives

- Full-state D1: simplest, observed 1.5–1.7s persistence; cannot meet the target with current path.
- gzip/BLOB D1: measure actual engine-generated representative saves, not an invented ratio for the user's unavailable 378KB save. Smaller payload helps bytes but retains binding, routing and commit latency; D1's minimum cannot be derived from SQL meta.duration. Benchmark small-write vs full JSON vs gzip separately in isolated D1.
- Split D1 state: reduces writes but needs the same atomic commit and one remote round trip; schema/migration complexity without eliminating that hop.
- Async in-memory saving: rejected because acknowledged combat, PRNG and rewards could disappear.
- Coalesce authoritative actions: rejected for combat/rewards/inventory. Existing command-journal dialogue batching and local MENU stay unchanged. Backups/ranking projections may coalesce after the local durable commit.
- Account DO: removes all D1 I/O from warm actions, serializes devices, allows local durable session/revision/receipt. Costs: one-time migration, new namespace, explicit rollback, eventual ranking/checkpoint projection, region placement is a hint not a Korean latency guarantee.

## Migration and rollback contract

Separate staging Worker + staging D1 + staging namespace first. Production D1 is never used for benchmark writes. Production additive migration creates ownership fence/checkpoint tables and game-write triggers; no destructive schema change. On first authenticated adoption, one D1 batch fences the account and reads its save and receipts (legacy backups remain preserved in D1). After the fence, old Workers cannot update games. DO imports atomically; failure before import is retried from the frozen original. Existing D1 save stays intact.

Rollback is an explicit drain operation: freeze account in DO, stage receipts and session revocations while fenced, then atomically copy the exact latest state/revision and release ownership, validate and only then release D1 ownership. Keep DO frozen after drain; set GAME_IMPORT_DISABLED=1 to stop new adoptions, drain all adopted accounts, and switch backend only after the D1 ownership query confirms zero DO-owned accounts. Never merely deploy the old Worker or flip the backend while DO owns saves. Failure at any intermediate step remains frozen/retryable. Original D1 snapshots and DO inverse backups remain available.

## Versions and deployments

engineVersion identifies loaded game rules/content plus a declared protocol version; Worker plumbing is excluded. serverBuild identifies implementation independently. Existing engine2 compatibility requires a checked-in migration alias tied to the exact old rules digest, not accepting arbitrary previous versions. Optional delta/session upgrade uses capability negotiation; one UI release adds that support, future storage-only Worker releases never require Pages. Worker verification/build/deploy is separate from 7GB Pages packaging. Python entrypoint probes py -3/python/python3 cross-platform; Python children use sys.executable.

## Official references checked 2026-09-30 KST

- https://developers.cloudflare.com/workers/runtime-apis/performance/
- https://developers.cloudflare.com/durable-objects/api/sqlite-storage-api/
- https://developers.cloudflare.com/durable-objects/reference/data-location/
- https://developers.cloudflare.com/workers/platform/storage-options/
- https://developers.cloudflare.com/d1/worker-api/d1-database/
