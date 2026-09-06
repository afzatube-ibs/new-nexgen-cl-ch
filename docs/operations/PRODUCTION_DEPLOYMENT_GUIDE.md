# neXgen Core — Production Deployment Guide

| Field | Value |
|---|---|
| **Scope** | Complete neXgen v1 runtime: Backend, Worker, Scheduler, Store API Gateway, Storefront, Admin, MySQL, Redis |
| **Audience** | Operator of staging/production self-hosted deployments |
| **Primary topology** | `docker-compose.production.yml` |
| **Configuration template** | `.env.production.example` → local `.env.production` (never committed) |
| **Companion guides** | `OPERATIONS_GUIDE.md`, `UPGRADE_GUIDE.md`, `DISASTER_RECOVERY_GUIDE.md`, `TROUBLESHOOTING_GUIDE.md` |

This is the concrete runbook for the current codebase. It deliberately separates immutable application images from persistent state and real credentials.

---

## 1. Runtime topology

`docker-compose.production.yml` runs these services:

| Service | Purpose | Public host port by default |
|---|---|---:|
| `backend-nginx` | Laravel HTTP/API and public media edge | 8080 |
| `app` | Laravel PHP-FPM application process | internal only |
| `worker` | Redis queue worker | internal only |
| `scheduler` | Laravel scheduler process | internal only |
| `gateway` | Store API Gateway/BFF | 4000 |
| `storefront` | Next.js customer storefront | 3000 |
| `admin` | Compiled Vite Admin SPA | 8081 |
| `mysql` | MySQL 8.4 primary datastore | internal only |
| `redis` | Cache/session/queue/Gateway cache | internal only |

MySQL and Redis are intentionally not published to the host. `app`, `worker`, and `scheduler` use the same backend image so application and asynchronous code cannot drift onto different releases.

Production application images do **not** bind-mount source code. Only the named volumes `mysql_data`, `redis_data`, and `backend_storage` persist state.

---

## 2. DNS and TLS layout

A normal deployment uses four public origins, each terminated with HTTPS by the host's reverse proxy/load balancer:

```text
https://api.example.com       -> 127.0.0.1:8080  (backend-nginx)
https://store-api.example.com -> 127.0.0.1:4000  (gateway)
https://shop.example.com      -> 127.0.0.1:3000  (storefront)
https://admin.example.com     -> 127.0.0.1:8081  (admin)
```

Forward the standard `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto` headers. Do not expose MySQL or Redis publicly.

`VITE_API_BASE_URL` and the Storefront's `NEXT_PUBLIC_*` values are browser bundle configuration and are therefore compiled into their images. If one of the public origins changes, rebuild `admin`/`storefront` rather than only restarting them.

---

## 3. Prepare production configuration

```bash
cp .env.production.example .env.production
```

Fill every `REPLACE_*` value. Keep `.env.production` outside Git history.

Generate strong values locally, for example:

```bash
# Laravel APP_KEY
printf 'APP_KEY=base64:%s\n' "$(openssl rand -base64 32)"

# Independent random secrets
openssl rand -hex 32   # DB password
openssl rand -hex 32   # DB root password
openssl rand -hex 32   # Redis password
openssl rand -hex 32   # Guest-session secret
openssl rand -hex 32   # Preview-token secret
```

Use different values for each purpose. If the Redis password contains URL-reserved characters, URL-encode it in `GATEWAY_REDIS_URL`.

Before doing anything destructive, validate the Compose model:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml config --quiet
```

---

## 4. First installation

### 4.1 Build immutable images

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
```

The Storefront image build is intentionally independent of a live database/Gateway. Merchant/catalog content is resolved after deployment, at runtime.

### 4.2 Start infrastructure and Backend only

The two Gateway service-account tokens do not exist yet on a fresh database, so bootstrap the backend first:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d mysql redis app backend-nginx
```

Wait until healthy:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
```

### 4.3 Migrate and seed safe catalog data

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec app php artisan migrate --force
docker compose --env-file .env.production -f docker-compose.production.yml exec app php artisan db:seed --force
```

`DatabaseSeeder` seeds permissions, roles, Gateway service roles, CMS permissions, and notification templates. It deliberately does **not** create a default human user or known API token.

### 4.4 Create the first administrator

Use the interactive command so the password is not left in shell history:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec app php artisan identity-access:create-admin
```

### 4.5 Provision the two Gateway service accounts

Run these separately:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml exec app php artisan identity-access:create-service-account storefront-service
docker compose --env-file .env.production -f docker-compose.production.yml exec app php artisan identity-access:create-service-account checkout-service
```

Each command prints a real Sanctum token in `id|secret` form. Copy the complete first token into:

```text
BACKEND_SERVICE_TOKEN=...
```

and the complete second token into:

```text
BACKEND_CHECKOUT_SERVICE_TOKEN=...
```

inside `.env.production`. Treat both as production secrets. The plaintext cannot be recovered from the database later; rotate by issuing a new token and replacing the env value.

### 4.6 Start the complete platform

```bash
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

This starts Gateway, Storefront, Admin, worker, and scheduler in addition to the already-running backend/data services.

---

## 5. Go-live verification

Do not call a deployment live until these checks pass:

```bash
COMPOSE='docker compose --env-file .env.production -f docker-compose.production.yml'

$COMPOSE ps
$COMPOSE exec app php artisan platform:health
curl -fsS http://127.0.0.1:${BACKEND_PORT:-8080}/healthz
curl -fsS http://127.0.0.1:${GATEWAY_PORT:-4000}/health
curl -fsS http://127.0.0.1:${STOREFRONT_PORT:-3000}/
curl -fsS http://127.0.0.1:${ADMIN_PORT:-8081}/healthz
```

Then verify through the **real HTTPS domains**, not only localhost:

- Admin login succeeds with the administrator created above.
- Storefront homepage loads with the configured merchant identity.
- A published product appears with its real price and stock behavior.
- Cart → address → configured shipping option → available payment method → order success works.
- The resulting order appears in Admin.
- A protected backend endpoint returns `401` without a token, not `500`.
- CORS only permits the named Admin/Storefront origins configured in `.env.production`.
- `docker compose ... logs worker` and `logs scheduler` show stable processes, not restart loops.

For external bKash/Nagad/SSLCommerz/courier integrations, use sandbox credentials first. A provider with missing credentials must remain unavailable rather than being presented as active.

---

## 6. Normal upgrade procedure

Back up first (see §7), then:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main

docker compose --env-file .env.production -f docker-compose.production.yml build

docker compose --env-file .env.production -f docker-compose.production.yml run --rm app php artisan migrate --force

docker compose --env-file .env.production -f docker-compose.production.yml up -d --remove-orphans

docker compose --env-file .env.production -f docker-compose.production.yml exec app php artisan platform:health
```

Never use `migrate:fresh` on a real deployment. Never delete named volumes during a normal upgrade.

---

## 7. Minimum backup procedure

### MySQL

```bash
mkdir -p backups

docker compose --env-file .env.production -f docker-compose.production.yml exec -T mysql \
  sh -c 'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  > "backups/nexgen-db-$(date +%Y%m%d-%H%M%S).sql"
```

### Uploaded/local storage

```bash
docker compose --env-file .env.production -f docker-compose.production.yml run --rm --no-deps app \
  tar -C /var/www/html/storage -czf - . \
  > "backups/nexgen-storage-$(date +%Y%m%d-%H%M%S).tar.gz"
```

Copy backups off the application host. A backup that has never been restored in a test environment is not yet a proven recovery plan; follow `DISASTER_RECOVERY_GUIDE.md` for restore exercises.

---

## 8. Logs and basic operations

```bash
# Tail the whole platform
docker compose --env-file .env.production -f docker-compose.production.yml logs -f --tail=200

# One service
docker compose --env-file .env.production -f docker-compose.production.yml logs -f gateway

# Restart only one stateless service
docker compose --env-file .env.production -f docker-compose.production.yml restart worker

# Scale workers independently
docker compose --env-file .env.production -f docker-compose.production.yml up -d --scale worker=3
```

Do not scale MySQL/Redis by duplicating Compose containers; they require datastore-specific high-availability design rather than ordinary horizontal application scaling.

---

## 9. What still requires operator-owned production information

Code can provide the integration boundaries, but the repository must never invent or contain these values:

- real DNS/domain names and TLS certificates;
- production bKash/Nagad/SSLCommerz credentials;
- courier credentials/store IDs;
- email/SMS provider credentials;
- merchant bank-transfer details;
- legal business/policy text and contact information;
- backup destination/retention policy and monitoring destination.

Leave an unused provider blank. neXgen's production rule is **unconfigured = unavailable**, never fake-successful.
