# neXgen Core — Production Deployment Guide

| Field | Value |
|---|---|
| **Scope** | `apps/backend` — the only deployable unit as of Phase 1.1 (no frontend exists yet; `ADR-0005`/`ADR-0006` remain Draft) |
| **Audience** | Whoever operates the first production (or production-like staging) deployment of this platform |
| **Prerequisites** | Docker + Docker Compose (or an equivalent container runtime honoring `docker-compose.yml`'s topology), a domain/TLS termination point in front of `nginx`, and the ability to set environment variables as real secrets (never committed) |
| **Companion documents** | `docs/11_DEPLOYMENT_STANDARD.md` (the governing policy this guide implements), `OPERATIONS_GUIDE.md`, `UPGRADE_GUIDE.md`, `DISASTER_RECOVERY_GUIDE.md`, `TROUBLESHOOTING_GUIDE.md` |

This is an operational runbook, not a policy document — it tells you the concrete steps for *this* codebase's *actual* deployment topology. `docs/11_DEPLOYMENT_STANDARD.md` is the constitutional document these steps exist to satisfy; consult it for the *why*, not the *how*.

---

## 1. Deployment Topology (What You're Actually Standing Up)

`docker-compose.yml` defines five services, per `ARCH:DEPLOYMENT_TOPOLOGY`:

| Service | Role | Scales independently? |
|---|---|---|
| `nginx` | Reverse proxy in front of `app`, serves `apps/backend/public` | Yes (put a load balancer in front of multiple) |
| `app` | The Application Unit — `php-fpm`, stateless | Yes — `docker compose up --scale app=3` is supported |
| `worker` | Background Worker — `php artisan queue:work` | Yes, independently of `app` |
| `mysql` | Primary datastore (ADR-0003) | No — single primary in Phase 1 |
| `redis` | Cache/session/queue backbone (ADR-0004) | No — single instance in Phase 1 |

`app` and `worker` build from the same `Dockerfile` and the same codebase — the only difference is which `command` each container runs. There is no way for the worker to drift onto a different build than the web process.

---

## 2. Before You Deploy — Environment

Copy `apps/backend/.env.example` to `apps/backend/.env` and set every value below for real. **Every credential in this list must be a genuine secret, never the example file's blank/placeholder value** — `docker-compose.yml` itself refuses to start `mysql`/`redis` without `DB_PASSWORD`/`DB_ROOT_PASSWORD`/`REDIS_PASSWORD` set (`:?` required-variable syntax), so a forgotten secret fails loudly at container start, not silently at runtime.

**Non-negotiable for production, not just "fill in the blank":**

| Variable | Why it matters in production specifically |
|---|---|
| `APP_ENV=production` | Disables debug-mode behaviors |
| `APP_DEBUG=false` | **Critical** — `true` in production leaks stack traces (file paths, query bindings, sometimes credentials in exception context) to any caller who triggers a 500 |
| `APP_KEY` | Generate with `php artisan key:generate --force` inside the built image *before* first boot — every encrypted value (nothing currently uses this, but Sanctum token hashing and any future encrypted column depend on it) is unrecoverable if this changes later |
| `APP_URL` | The real public URL — several modules build absolute URLs from this (e.g. `PAYMENTS_CHECKOUT_RETURN_URL` falls back to it if unset) |
| `DB_PASSWORD`, `DB_ROOT_PASSWORD`, `REDIS_PASSWORD` | Real, unique secrets — `docker-compose.yml` will not start without them |
| `CORS_ALLOWED_ORIGINS` | Still `*` by default (safe today — see `config/cors.php`'s own docblock, since no browser client exists and `supports_credentials` is `false`). **The moment a browser-based client (Admin UI, storefront) exists, this MUST become a real, named origin list** |
| `SANCTUM_TOKEN_EXPIRATION_MINUTES` | Defaults to 14 days (20160) — a deliberate choice, not an oversight; shorten if your security posture requires it |
| `API_RATE_LIMIT_PER_MINUTE` | Defaults to 120/min per caller — this is a Phase 1 starting point (`config/api.php`'s own docblock), tune once real traffic patterns exist |
| Every module's provider credentials (`PAYMENTS_*`, `*_API_KEY`, `NOTIFICATIONS_*`, `SHIPPING`-courier `*_API_*`) | Each provider is simply unavailable, never fake-successful, until its own credentials are set — see each `config/*.php`'s own docblock. Decide which providers this deployment actually uses and set only those; leave the rest blank |
| `SEARCH_DEFAULT_ENGINE` | Only `mysql_fulltext` exists — do not set this to anything else |

---

## 3. First Deployment (Fresh Installation)

```bash
# 1. Build and start the datastore/cache layer first
docker compose up -d mysql redis

# 2. Build the app image (installs composer dependencies, per Dockerfile's
#    multi-stage build — no dev dependencies in the final image)
docker compose build app worker

# 3. Bring up the full stack
docker compose up -d

# 4. Run migrations (creates every one of the 19 modules' tables — safe,
#    idempotent, ordinary Laravel migration)
docker compose exec app php artisan migrate --force

# 5. Seed permissions/roles (idempotent — every *:sync-permissions
#    command and the platform's own DatabaseSeeder are safe to re-run)
docker compose exec app php artisan db:seed --force

# 6. Create the first real administrator account — deliberately NOT part
#    of any seeder (DatabaseSeeder's own docblock: seeding a default
#    account with a known password would violate SECURITY:
#    SECURE_CONFIGURATION). This command requires an interactively-
#    supplied or explicitly-flagged password; there is no default.
docker compose exec app php artisan identity-access:create-admin

# 7. Verify
docker compose exec app php artisan platform:health
curl -f http://<your-domain>/up
curl -f http://<your-domain>/api/health
```

If step 4 or 5 fails, **stop** — do not proceed to step 6 against a partially-migrated database. See `TROUBLESHOOTING_GUIDE.md`.

---

## 4. Post-Deployment Verification Checklist

Before calling a deployment "live," per `DEPLOYMENT:GO_LIVE_CHECKLIST` and `DEPLOYMENT:DEPLOYMENT_VERIFICATION`:

- [ ] `GET /up` returns 200 ("Application up")
- [ ] `GET /api/health` returns `{"data":{"status":"healthy",...}}` with all three checks (`database`, `cache`, `queue`) healthy
- [ ] `docker compose exec app php artisan platform:health` reports healthy from inside the container (catches a scenario where the container is up but its own outbound connections to `mysql`/`redis` are broken — a different failure mode than the HTTP health endpoint alone would catch)
- [ ] `docker compose exec worker php artisan platform:health --liveness` exits 0 (confirms the worker process itself is alive — this check intentionally does NOT verify dependency connectivity, since a worker has no HTTP surface to report through; see `QueueHealthCheck`'s own docblock)
- [ ] A real login (`POST /api/v1/auth/login`) with the administrator account created in step 6 succeeds and returns a token
- [ ] That token successfully calls at least one permission-gated endpoint (e.g. `GET /api/v1/users`)
- [ ] An unauthenticated request to a protected endpoint returns a clean `401` (not a `500`) — this exact regression (`redirectGuestsTo`) was found and fixed during the Phase 1 hardening pass specifically because it was never obvious from a green test suite alone; verifying it live, once, on a fresh deployment costs nothing
- [ ] CORS preflight (`OPTIONS` request with an `Origin` header) returns the expected `Access-Control-Allow-*` headers matching `config/cors.php`
- [ ] Response headers on any request include `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` (Phase 1.1's `SecurityHeaders` middleware)
- [ ] `docker compose logs worker` shows the worker actively polling its queue, not crash-looping

---

## 5. What Does NOT Exist Yet (Do Not Assume It Does)

- **No frontend of any kind** — no Admin UI, no storefront, no landing pages. This is a pure JSON API. `ADR-0005`/`ADR-0006` are Draft.
- **No CI/CD pipeline deploys this automatically** — `.github/workflows/backend-ci.yml` runs verification (tests, static analysis, style) on push/PR to `main`; it does not deploy anywhere. Deployment today is the manual procedure in §3.
- **No blue/green or canary mechanism** — `docs/11_DEPLOYMENT_STANDARD.md` §9 describes the philosophy; no concrete tooling implements it yet. A deployment today is `docker compose up -d` against the new image, full stop.
- **No automated backup job** — see `DISASTER_RECOVERY_GUIDE.md` for what exists (a documented, exercisable manual procedure) versus what would need building for a hands-off, scheduled backup.
