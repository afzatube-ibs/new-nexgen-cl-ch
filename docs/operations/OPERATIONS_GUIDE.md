# neXgen Core — Operations Guide

| Field | Value |
|---|---|
| **Scope** | Day-2 operation of a running `apps/backend` deployment |
| **Companion documents** | `PRODUCTION_DEPLOYMENT_GUIDE.md` (first deployment), `UPGRADE_GUIDE.md`, `DISASTER_RECOVERY_GUIDE.md`, `TROUBLESHOOTING_GUIDE.md` |

---

## 1. Health & Status

| What you want to know | How to check it |
|---|---|
| Is the platform reachable at all? | `GET /up` — a bare liveness page, no dependency checks |
| Is the platform actually usable (DB/cache/queue reachable)? | `GET /api/health` (unauthenticated, safe to poll from an external monitor) or `php artisan platform:health` from inside the `app` container |
| Is a specific worker process alive? | `php artisan platform:health --liveness` from inside that `worker` container — deliberately skips dependency checks (a worker's own liveness is "is this process running," not "can it currently reach Redis," which its own job-processing loop already handles failure for) |
| What does the container orchestrator use to restart a crashed container? | `docker-compose.yml`'s own `healthcheck:` blocks on `app` and `worker`, both calling `platform:health --liveness` |

`platform:health` (without `--liveness`) checks: database connectivity, cache roundtrip, queue (Redis) connectivity. It does **not** check whether a worker is actively consuming jobs — see `QueueHealthCheck`'s own docblock for why that's structurally unobservable from the Application Unit.

---

## 2. Common Commands

### Permissions

Every one of the 19 modules owns its own permission registry and its own idempotent sync command:

```
catalog:sync-permissions
checkout:sync-permissions
customers:sync-permissions
fulfillment:sync-permissions
identity-access:sync-permissions
inventory:sync-permissions
localization:sync-permissions
media:sync-permissions
notifications:sync-permissions
orders:sync-permissions
payments:sync-permissions
pricing:sync-permissions
promotions:sync-permissions
returns:sync-permissions
search:sync-permissions
shipping:sync-permissions
store-configuration:sync-permissions
```

Run any of these (or `php artisan db:seed`, which runs every module's seeder together) after deploying code that changed a module's `Authorization\PermissionRegistry` — it inserts new permission rows and leaves existing ones untouched. Safe to run repeatedly; never destructive.

### Scheduled / Operator-Triggered Maintenance

| Command | What it does | When to run it |
|---|---|---|
| `checkout:expire-sessions` | Expires stale checkout sessions | On a schedule (e.g. every few minutes) — not required for correctness, but keeps the table from growing unbounded |
| `payments:reconcile` | Reconciles payment gateway state against local records | On a schedule, per `PAYMENTS_RECONCILIATION_THRESHOLD_MINUTES` |
| `search:reindex` | Full rebuild of the product search index from Catalog data (`RebuildSearchIndexAction` — truncates then repopulates, per `DATA:SEARCH_INDEXING`) | After a bulk Catalog import, after any suspected search-index drift, or as a periodic self-healing job. Safe to run at any time — fully deterministic, converges to exactly what Catalog's current data implies |
| `identity-access:create-admin` | Creates the first administrator account (interactive password prompt or explicit flag — never a default password) | Once, on first deployment. Deliberately not idempotent-by-default the way sync-permissions commands are — read its own `--help` before re-running |

None of these are wired to a scheduler inside this codebase yet (no `Schedule::command()` calls exist) — running them is currently an explicit operator action (cron, a orchestrator's own scheduled job, or manual) until Phase 2 or later adds one.

### Queue

```bash
# Start a worker (docker-compose's own `worker` service already does this
# via its `command: ["worker"]` override — this is for manual/debugging use)
docker compose exec app php artisan queue:work --queue=notifications

# Process exactly one job then exit (useful for debugging a specific stuck job)
docker compose exec app php artisan queue:work --once --queue=notifications

# List failed jobs (Laravel's own `failed_jobs` table — created by
# `0001_01_01_000002_create_jobs_table.php`, confirmed present during
# Phase 1.1's reliability review)
docker compose exec app php artisan queue:failed

# Retry a specific failed job, or all of them
docker compose exec app php artisan queue:retry <uuid>
docker compose exec app php artisan queue:retry all
```

Only one queue currently carries real traffic: `notifications` (`Jobs\SendNotificationJob`). Every other module's work is synchronous, in-request — see `ARCHITECTURE_REVIEW_PHASE1.md` finding B-14 for why, and for what that means as traffic grows.

---

## 3. Logs

`LOG_CHANNEL=structured` (`.env.example`) — every log line is a single JSON object, including a `correlation_id` field automatically merged in via Laravel's `Context` facade (`Foundation\Http\Middleware\AssignCorrelationId`). This `correlation_id` is:

- Set from the caller's own `X-Correlation-Id` request header if they supplied a valid UUID, otherwise generated fresh per request.
- Returned on every response as the same `X-Correlation-Id` header — grep application logs for the value from a support ticket's own response header to find every log line from that exact request.
- **Automatically propagated into queued jobs** (Laravel 12's built-in `Illuminate\Log\Context\ContextServiceProvider`: dehydrated onto the job payload at dispatch time, rehydrated before `handle()` runs) — a `SendNotificationJob`'s own log output carries the same `correlation_id` as the HTTP request that originally queued it, verified live during Phase 1.1's monitoring review.

Log location inside the container: `storage/logs/laravel.log` (single-file channel, per `.env.example`'s `LOG_STACK=single`). Only genuine errors/exceptions are logged — a routine 4xx (validation failure, permission denial, rate limit) is never logged as an error, since it isn't one; only an actual server-side fault (a 5xx, or a caught-but-unexpected exception inside a health check or a resilience-wrapped listener) writes a log line.

---

## 4. Scaling

Both `app` and `worker` are stateless (`ARCH:NFR`'s horizontal-scalability principle, made concrete):

```bash
docker compose up -d --scale app=3 --scale worker=2
```

Nothing in the codebase assumes a single instance — no in-memory state survives a request, session/cache/queue all live in Redis (ADR-0004), and the database is the only source of truth. Put a load balancer in front of multiple `app` replicas; `worker` replicas simply compete for jobs off the same Redis-backed queue, which handles concurrent consumption safely.

**Not yet scalable**: `mysql` and `redis` themselves are single instances in Phase 1's topology — read replicas, Redis Cluster, or a managed multi-AZ datastore are all real options a production deployment may need, but none is configured by this repository's own `docker-compose.yml` today.

---

## 5. Rate Limiting in Operation

`config('api.rate_limit_per_minute')` (default 120/min, keyed by authenticated user id or caller IP) is the platform-wide floor. Three routes carry their own, stricter, purpose-built limiter instead (see `bootstrap/app.php` and each route's own `withoutMiddleware('throttle:api')` — deliberately not stacked with the general floor, since nesting two `ThrottleRequests` instances produces confusing `X-RateLimit-*` headers without adding real protection, found during Phase 1.1's hardening pass):

| Route | Limiter | Limit |
|---|---|---|
| `POST /api/v1/auth/login` | `throttle:login` | 5/min, keyed by email+IP |
| `POST /api/v1/install` | `throttle:install` | 5/min, keyed by IP |
| `POST /api/v1/payments/webhooks/*` | `throttle:payments-webhooks` | 120/min, keyed by IP |

If a legitimate integration is being rate-limited in production (visible as repeated `429` responses with a `type: rate_limited` error body), raise `API_RATE_LIMIT_PER_MINUTE` — this does not require a code change, only a config/env change and a restart.
