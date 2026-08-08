# neXgen Core — Disaster Recovery Guide

| Field | Value |
|---|---|
| **Scope** | Recovering `apps/backend` from data loss, corruption, or total infrastructure loss |
| **Companion documents** | `docs/11_DEPLOYMENT_STANDARD.md` §14–16 (`Disaster Recovery`, `Business Continuity`, `Backup Verification` — the governing policy this guide implements), `SECURITY_REVIEW.md` finding S-7 (backup/rollback drills not yet exercised — see §5 below) |

---

## 1. What Actually Needs Backing Up

| Store | Contains | Recoverable another way? |
|---|---|---|
| **MySQL** (`mysql` service) | Every module's own data — the single source of truth, per `PRINCIPLES:SINGLE_SOURCE_OF_TRUTH`. Includes one table that is itself a derived cache with its own self-healing rebuild (see below) | No — this is the only durable store on the whole platform |
| **Redis** (`redis` service) | Cache, session, and queue (ADR-0004) | **Yes, entirely** — nothing in Redis is unique data. Cache entries regenerate on next read; sessions simply force a re-login; an in-flight queue job (currently only `notifications`) is re-queued from its own source-of-truth state in MySQL if lost |
| `product_search_index` table (inside MySQL) | Search's own derived index | **Yes** — `php artisan search:reindex` fully rebuilds it from Catalog's own MySQL data alone, with zero information loss, per `DATA:SEARCH_INDEXING`'s own acceptance criterion. If MySQL backup/restore ever loses just this one table's rows, this single command is the entire recovery procedure — no restore needed |
| `apps/backend/storage/` (uploaded media files, if using the `local` filesystem disk) | `Media` module's uploaded assets | No — back this up alongside MySQL if `FILESYSTEM_DISK=local` in production. If using S3 (`AWS_*` env vars), the object store's own durability/versioning applies instead and this directory holds nothing durable |
| Application code | Everything under version control | Git itself is the backup — `origin/main` on GitHub |

**Conclusion: only MySQL (and, if using local disk storage, `storage/app/public`) needs a real backup strategy.** Redis needing none, and Search's own table being fully self-healing, are both structural properties of this architecture, not assumptions — confirmed during Phase 1.1's reliability review.

---

## 2. Backup Procedure

No automated, scheduled backup job exists inside this repository as of Phase 1.1 — this is a documented gap (see §5), not a hidden assumption. Until one is wired (a cron job, a managed database's own automated backup feature, or an orchestrator-level volume snapshot), the manual procedure is:

```bash
# Full logical dump — portable, human-inspectable, restorable to any
# compatible MySQL/MariaDB version
docker compose exec mysql mysqldump \
  -u root -p"$DB_ROOT_PASSWORD" \
  --single-transaction \
  --routines \
  --triggers \
  "$DB_DATABASE" > backup-$(date +%Y%m%d-%H%M%S).sql

# If using local file storage for Media uploads, back up the volume too
docker compose exec app tar czf - storage/app/public > storage-backup-$(date +%Y%m%d-%H%M%S).tar.gz
```

`--single-transaction` takes a consistent snapshot without locking tables — safe to run against a live, in-use database.

**Store backups off the same host/infrastructure as the database itself** — a backup that lives on the same disk as the data it protects does not protect against the failure modes that matter most (disk failure, host loss, an operator error that affects the whole instance).

---

## 3. Restore Procedure

```bash
# 1. Stop the app and worker so nothing writes during restore
docker compose stop app worker

# 2. Restore the dump into a fresh (or truncated) database
docker compose exec -T mysql mysql -u root -p"$DB_ROOT_PASSWORD" "$DB_DATABASE" < backup-<timestamp>.sql

# 3. If Media files were backed up separately, restore that volume too
docker compose exec -T app tar xzf - -C / < storage-backup-<timestamp>.tar.gz

# 4. Rebuild Search's own derived index — it is never included in a
#    logical dump's own consistency guarantees the same way a live
#    table is, and rebuilding is free and complete regardless
docker compose up -d app
docker compose exec app php artisan search:reindex

# 5. Bring the worker back online
docker compose up -d worker

# 6. Verify (PRODUCTION_DEPLOYMENT_GUIDE.md §4 in full)
```

**A restored database may be missing anything written between the last backup and the incident** — this is the fundamental RPO (Recovery Point Objective) tradeoff of periodic logical backups. Until a shorter-interval backup schedule or binlog-based point-in-time recovery is configured (neither exists yet — see §5), assume data loss up to the interval between your last two backups.

---

## 4. Total Infrastructure Loss

If the entire host/cluster is lost (not just the database):

1. Provision new infrastructure per `PRODUCTION_DEPLOYMENT_GUIDE.md` §3, steps 1–3 (bring up `mysql`/`redis`/`app`/`worker` fresh — do **not** run step 4 (`migrate`) or step 5 (`db:seed`) yet).
2. Restore the most recent MySQL backup per §3 above, into the fresh `mysql` service, **before** running any migration — a restored dump already contains the full schema at the backup's own point in time; running `migrate` afterward only applies anything newer than that backup.
3. Run `php artisan migrate --force` to catch the schema up to the current codebase version, if the backup predates the currently-deployed code.
4. Continue with `search:reindex`, worker startup, and full verification as in §3.

---

## 5. What Is Honestly Not Yet Exercised

`SECURITY_REVIEW.md` (2026-08-05) named this explicitly as finding S-7, deferred to the hardening pass: **no backup has ever actually been taken from a running instance of this platform, and no restore has ever actually been performed and verified.** Phase 1.1 documents the procedure above from direct knowledge of this platform's own data model (§1's table is the concrete evidence: this session traced exactly what lives where and confirmed Search's own self-healing rebuild capability by actually reading `Actions\RebuildSearchIndexAction`'s source) — but a written procedure and a procedure that has been run against real data and confirmed to actually restore a working system are not the same thing.

**Before this platform depends on this guide in a real incident**, the recommendation is: stand up a disposable staging copy, run §2's backup, deliberately destroy the staging database, run §3's restore, and confirm the platform comes back healthy and correct. This is named as a remaining recommendation in `PRODUCTION_READINESS_REPORT.md`, not performed during this session (no disposable staging infrastructure exists in this sandbox to safely destroy and rebuild).
