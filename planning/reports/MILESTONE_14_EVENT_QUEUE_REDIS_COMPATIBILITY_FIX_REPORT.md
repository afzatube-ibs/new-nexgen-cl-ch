# Milestone 14 — Event Queue Redis Version-Compatibility Fix — Completion Report

**Source of truth**: `PRODUCTION_COMPLETION_PLAN_v2.md`, verified against the actual repository per the standing instruction. Not a planned milestone — a real, live-observed bug found while restarting the Gateway for Milestone 13's own verification, investigated and fixed on the same "verify → classify → fix" discipline as every other milestone this session.

## Part 0 — What Was Found

While the Gateway was up for Milestone 13's live verification, its own log was continuously emitting, every ~1 second, without exception:

```
WARN: Event queue: dequeue failed
err: { "type": "ReplyError", "message": "ERR wrong number of arguments for 'rpop' command", ... }
```

Direct investigation (`redis-cli INFO server`) found the real cause: this environment's own real Redis server reports `redis_version:3.0.504` (a Windows port from years before Redis 6.2). `events/queue.ts`'s `dequeueReady()` called `client.rpop(READY_KEY, count)` — the two-argument `RPOP key count` form, which **did not exist in the Redis protocol until version 6.2**. Every single call to this server's own real Redis genuinely fails with exactly the error observed, on every tick of the Event Pipeline's background dequeue loop, platform-wide, regardless of how many real events are actually queued.

**Classification**: **Fully implemented, but built for a newer Redis than this environment's own real instance provides — a real, reproducible version-compatibility bug**, not a design gap. The rest of the Event Pipeline (ingestion, validation, destination fan-out, retry/backoff, dead-letter) is real and correct; only the specific two-argument `RPOP` call was incompatible.

**Real-world impact assessed honestly**: in this dev environment, `EVENTS_WEBHOOK_URL`/`META_CAPI_ACCESS_TOKEN`/`GA4_API_SECRET`/`TIKTOK_EVENTS_ACCESS_TOKEN` are all unset, so no external destination was actually configured to receive events either way — the practical blast radius here was log noise and a stuck, ever-growing `events:ready` Redis list, not a customer-visible failure. In a real production deployment on a modern managed Redis (6.2+, the near-universal default for any current-generation offering), this exact bug would likely never manifest — but relying on that assumption rather than making the code itself version-safe is exactly the kind of "verify, don't assume" gap this engagement's own methodology exists to catch, and a single-key `RPOP` (supported since Redis 1.0) costs nothing to prefer.

## Part 1 — What Shipped

`apps/store-api-gateway/src/events/queue.ts`: `dequeueReady()` no longer calls the two-argument `RPOP key count` form. It now loops the plain, universally-supported single-key `RPOP key` up to `count` times, stopping the moment the queue runs dry — identical semantics, compatible with every Redis version since 1.0.

## Part 2 — Verification

| Check | Result |
|---|---|
| Gateway typecheck | Clean |
| Gateway lint | Clean |
| Gateway full test suite | **162/162** |

### Live, end-to-end verification (real Gateway + this environment's real Redis 3.0.504)
1. Confirmed the exact error live via `redis-cli`: `RPOP key` succeeds; `RPOP key <count>` fails with the identical `ERR wrong number of arguments` this environment's own Gateway log had been emitting.
2. Applied the fix; `tsx watch` auto-restarted the Gateway. Confirmed the warning stopped appearing entirely — zero occurrences in the log from the restart onward, versus roughly one per second before.
3. Sent a real event through the live Gateway (`POST /v1/events`, a real registered `page_viewed` schema) — accepted with `202` and a real `queuedFor: ["warehouse"]`. Confirmed via direct `redis-cli LLEN` against the real `events:ready` and `events:dead-letter` keys that the event was durably queued, then fully dequeued and delivered with zero errors and zero dead-letters — the exact code path that was silently broken before this fix.

## Part 3 — Final Classification

**Production ready.** A genuine, live-reproduced bug, root-caused against this environment's own real dependency version (not assumed), fixed with the minimal, version-compatible change, and verified against the real failing conditions rather than a mock.

## Part 4 — Roadmap Correction

Added to `PRODUCTION_COMPLETION_PLAN_v2.md` as Milestone 14 — not part of the plan's original scope, found during Milestone 13's own live verification, fixed under the same standing instruction to act on genuine findings rather than defer them.

---
