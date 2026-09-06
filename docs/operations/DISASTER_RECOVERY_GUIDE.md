# neXgen Core — Disaster Recovery Guide

| Field | Value |
|---|---|
| **Scope** | Recovering the complete neXgen production deployment from data loss, corruption, or infrastructure loss |
| **Primary topology** | `docker-compose.production.yml` with `.env.production` |
| **Companion documents** | `PRODUCTION_DEPLOYMENT_GUIDE.md`, `UPGRADE_GUIDE.md`, `TROUBLESHOOTING_GUIDE.md`, `docs/11_DEPLOYMENT_STANDARD.md` |

---

## 1. Durable state

| Store | Contains | Reconstructible? |
|---|---|---|
| MySQL `mysql_data` | Commerce/platform source-of-truth data | **No** — back it up |
| Backend `backend_storage` | Uploaded media when `FILESYSTEM_DISK=local` | **No** — back it up when local storage is used |
| Redis `redis_data` | Cache, sessions, queue and Gateway cache | Operationally disposable; losing it can force login/cache rebuild and can lose in-flight queue state, but durable business state remains in MySQL |
| `product_search_index` table | Derived search index | **Yes** — rebuild with `php artisan search:reindex` |
| Application images/code | Versioned release | **Yes** — rebuild from the exact Git commit/tag |
| `.env.production` / external secrets | Deployment credentials and origins | **No** — back these up securely in the operator's secret/password system, never in Git |

A recoverable installation therefore requires, at minimum, a tested MySQL backup, local media backup when applicable, the deployed Git revision, and access to the production secret set.

---

## 2. Backup procedure

Use the production Compose file explicitly:

```bash
COMPOSE='docker compose --env-file .env.production -f docker-compose.production.yml'
mkdir -p backups

# Consistent logical MySQL snapshot.
$COMPOSE exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysqldump -uroot --single-transaction --routines --triggers "$MYSQL_DATABASE"' \
  > "backups/nexgen-db-$(date +%Y%m%d-%H%M%S).sql"

# Local uploaded-media/application storage.
$COMPOSE run --rm --no-deps app tar -C /var/www/html/storage -czf - . \
  > "backups/nexgen-storage-$(date +%Y%m%d-%H%M%S).tar.gz"
```

Copy backups to storage outside the application host. Encrypt backups at rest and in transit. A file on the same machine as the database is not adequate disaster recovery.

If an external S3/R2-compatible disk is used instead of local storage, protect that object store using its own versioning/backup policy rather than relying on `backend_storage`.

---

## 3. Restore into an existing host

Choose a maintenance window and verify the backup files before changing the live database.

```bash
COMPOSE='docker compose --env-file .env.production -f docker-compose.production.yml'

# 1. Stop every process that can serve or write application data.
$COMPOSE stop storefront admin gateway backend-nginx worker scheduler app

# 2. Keep/start only the datastores.
$COMPOSE up -d --wait mysql redis

# 3. Restore MySQL. This example assumes the target database already exists.
$COMPOSE exec -T mysql sh -c \
  'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" mysql -uroot "$MYSQL_DATABASE"' \
  < backups/nexgen-db-<timestamp>.sql

# 4. Restore local backend storage when applicable.
cat backups/nexgen-storage-<timestamp>.tar.gz | \
  $COMPOSE run --rm --no-deps -T app tar -C /var/www/html/storage -xzf -

# 5. Start Backend on the restored data, apply only newer migrations, then
#    rebuild the derived search index.
$COMPOSE up -d --wait app backend-nginx
$COMPOSE exec -T app php artisan migrate --force
$COMPOSE exec -T app php artisan search:reindex
$COMPOSE exec -T app php artisan platform:health

# 6. Start the complete platform and verify it.
$COMPOSE up -d --wait
$COMPOSE ps
```

Then run the complete go-live verification from `PRODUCTION_DEPLOYMENT_GUIDE.md`, including Admin login and a Storefront/Gateway request through the real HTTPS domains.

Do **not** run `migrate:fresh`, `db:wipe`, or any seed command that creates/replaces business data during a restore.

---

## 4. Total infrastructure loss

On a replacement server:

1. Check out the exact application revision you intend to recover to.
2. Restore the secure `.env.production` secret set (or recreate/rotate secrets deliberately).
3. Validate/build the production topology per `PRODUCTION_DEPLOYMENT_GUIDE.md`.
4. Start `mysql` and `redis` only.
5. Restore the MySQL dump and local media/storage backup.
6. Start `app` + `backend-nginx`, run `php artisan migrate --force`, then `search:reindex`.
7. Start the complete topology.
8. Verify Admin, Storefront, Gateway, payments/shipping availability, workers and scheduler before reopening traffic.

If service-account Sanctum tokens are unavailable after the incident but the restored database is intact, rotate them deliberately by issuing new Storefront/Checkout service-account tokens and updating `.env.production` before starting Gateway.

---

## 5. Recovery objectives and data loss

A periodic logical backup can only recover data up to its snapshot time. If backups run every 24 hours, the potential Recovery Point Objective is up to 24 hours of writes. Choose an actual backup frequency from the business's acceptable loss window; this repository cannot decide that operational policy for the merchant.

For a tighter RPO, use managed MySQL snapshots/binlog point-in-time recovery or an equivalent externally operated solution. Do not claim point-in-time recovery is available merely because MySQL supports it; it must be configured and tested in the deployed environment.

---

## 6. Required restore drill before production reliance

A backup procedure is not proven until a restore succeeds. Before depending on this runbook for a real incident:

1. Create a disposable staging installation from the production images.
2. Populate it with representative products, media, customers and orders.
3. Take the MySQL/storage backups using §2.
4. Destroy the disposable database/storage volumes.
5. Restore using §3.
6. Verify the restored order/product/media records in Admin and Storefront.
7. Record the restore duration and any manual fixes required.

Repeat the drill after material datastore/storage/deployment changes. This remains an operational requirement until an automated backup-and-restore test is added to CI/staging.
