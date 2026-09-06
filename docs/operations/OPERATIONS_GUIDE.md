# neXgen Core — Operations Guide

| Field | Value |
|---|---|
| **Scope** | Day-2 operation of the complete neXgen production deployment |
| **Primary topology** | `docker-compose.production.yml` + local `.env.production` |
| **Companion documents** | `PRODUCTION_DEPLOYMENT_GUIDE.md`, `UPGRADE_GUIDE.md`, `DISASTER_RECOVERY_GUIDE.md`, `TROUBLESHOOTING_GUIDE.md` |

Use this shorthand in examples:

```bash
COMPOSE='docker compose --env-file .env.production -f docker-compose.production.yml'
```

---

## 1. Health and status

```bash
$COMPOSE ps
$COMPOSE exec -T app php artisan platform:health

curl -fsS http://127.0.0.1:${BACKEND_PORT:-8080}/healthz
curl -fsS http://127.0.0.1:${GATEWAY_PORT:-4000}/health
curl -fsS http://127.0.0.1:${STOREFRONT_PORT:-3000}/
curl -fsS http://127.0.0.1:${ADMIN_PORT:-8081}/healthz
```

`platform:health` checks the backend's database/cache/queue dependencies. Container health checks additionally cover the four HTTP services and liveness of worker/scheduler containers.

A healthy container is necessary but not sufficient for go-live. External monitoring should also request the real HTTPS domains through the TLS/reverse-proxy layer so DNS/certificate/routing failures are visible.

---

## 2. Service responsibilities

| Service | Operational responsibility |
|---|---|
| `backend-nginx` | Laravel HTTP/API edge and local uploaded-media delivery |
| `app` | PHP-FPM application runtime |
| `gateway` | Storefront BFF, guest checkout orchestration, Redis-backed Gateway cache |
| `storefront` | Next.js customer site |
| `admin` | Merchant/staff SPA |
| `worker` | Redis queue consumption |
| `scheduler` | Laravel scheduled maintenance |
| `mysql` | Durable relational source of truth |
| `redis` | Cache/session/queue/Gateway cache |

Do not publish MySQL/Redis ports to the public internet.

---

## 3. Scheduled maintenance

The dedicated `scheduler` container runs `php artisan schedule:work`. The repository currently schedules:

| Command | Cadence | Purpose |
|---|---|---|
| `checkout:expire-sessions` | every 5 minutes, without overlap | Marks stale checkout sessions expired and emits the abandoned-checkout lifecycle |
| `payments:reconcile` | every 5 minutes, without overlap | Sweeps payment records; the command itself still respects `PAYMENTS_RECONCILIATION_THRESHOLD_MINUTES` before reconciling an individual payment |

Inspect the effective schedule:

```bash
$COMPOSE exec -T app php artisan schedule:list
$COMPOSE logs --tail=200 scheduler
```

`search:reindex` remains operator-triggered because a full rebuild can be expensive and should not be scheduled blindly for every merchant/catalog size.

---

## 4. Queue operation

```bash
# Watch the real worker.
$COMPOSE logs -f --tail=200 worker

# Failed jobs.
$COMPOSE exec -T app php artisan queue:failed

# Retry one or all failed jobs.
$COMPOSE exec -T app php artisan queue:retry <uuid>
$COMPOSE exec -T app php artisan queue:retry all

# Process one job manually for diagnosis.
$COMPOSE exec -T app php artisan queue:work redis --once --queue=notifications
```

Do not run a second ad-hoc long-lived worker inside the `app` service during normal operation; scale the dedicated `worker` service instead.

---

## 5. Permissions, roles and service accounts

Permission/role/template catalog data is safe to synchronize through the idempotent seeders after a reviewed release:

```bash
$COMPOSE exec -T app php artisan db:seed --force
```

The initial administrator and the two Gateway service-account tokens are **not** seeded credentials. They are deliberately provisioned by operator commands described in `PRODUCTION_DEPLOYMENT_GUIDE.md`.

If a Gateway token is exposed, issue a new token for the appropriate service account, update `.env.production`, then recreate only Gateway:

```bash
$COMPOSE up -d --force-recreate gateway
```

Never paste tokens into Git, tickets, screenshots, or normal application logs.

---

## 6. Search maintenance

The MySQL full-text product index is derived from Catalog data and can be rebuilt deterministically:

```bash
$COMPOSE exec -T app php artisan search:reindex
```

Use after a bulk import, a suspected index drift, or disaster recovery. Monitor runtime on large catalogs before deciding whether to automate it.

---

## 7. Logs and correlation

Backend structured logs carry the request `X-Correlation-Id`, allowing an HTTP response/support ticket to be traced into application/queued work logs.

```bash
# Whole platform
$COMPOSE logs -f --tail=200

# Individual service
$COMPOSE logs -f --tail=200 gateway
$COMPOSE logs -f --tail=200 app
$COMPOSE logs -f --tail=200 worker
$COMPOSE logs -f --tail=200 scheduler
```

Containers are ephemeral. A serious deployment should ship logs to an external retention/search system rather than relying only on `docker logs` or files inside a container.

---

## 8. Scaling

Stateless services can be scaled independently when an external load balancer/reverse proxy is configured appropriately:

```bash
$COMPOSE up -d --scale worker=3
```

Worker scaling is directly safe because instances compete on the same Redis queue. Scaling `app`, `gateway`, or `storefront` behind the provided simple host-port Compose mapping requires an edge/load-balancer configuration that can route to multiple replicas; do not claim horizontal web scaling by merely setting `--scale` while one fixed host port is bound.

MySQL and Redis are single-instance services in this Compose topology. High availability for either requires datastore-specific replication/managed-service design, not ordinary Docker service duplication.

---

## 9. Rate limiting and CORS

Backend and Gateway both have rate limits. Repeated legitimate `429` responses should be investigated before limits are raised; raising a limit can mask abusive traffic rather than solving the cause.

Production CORS must remain an explicit named origin list:

- Backend: Admin + Storefront origins that actually call it.
- Gateway: Storefront origin.

Never revert production CORS to `*` simply to fix a browser error. Confirm the exact caller origin/protocol/port and correct `.env.production` instead.

---

## 10. Provider availability

Payments, couriers and notification providers follow the same operating rule:

> **Configured and healthy enough to report available = usable. Missing required credentials = unavailable.**

Do not add fake badges/options to compensate for missing credentials. For a new external provider, configure sandbox/test credentials first, verify the platform reports it available, exercise the full workflow, and only then switch to production credentials.

---

## 11. Backups and upgrades

Use `DISASTER_RECOVERY_GUIDE.md` for backup/restore and perform a restore drill before relying on backups in production. Use `UPGRADE_GUIDE.md` for release changes; never delete `mysql_data`, `redis_data`, or `backend_storage` during a routine upgrade.
