# neXgen Core — Upgrade Guide

| Field | Value |
|---|---|
| **Scope** | Deploying a new version of `apps/backend` over an existing, already-live installation |
| **Companion documents** | `PRODUCTION_DEPLOYMENT_GUIDE.md` (first deployment), `DISASTER_RECOVERY_GUIDE.md` (what to do if an upgrade goes wrong) |

Per `docs/11_DEPLOYMENT_STANDARD.md` §11 (`Upgrade Strategy`) and §10 (`Rollback Philosophy`) — this document is the concrete procedure those sections describe.

---

## 1. Pre-Upgrade Checklist

- [ ] The new version's commit has already passed `.github/workflows/backend-ci.yml` (PHPStan, Pint, Deptrac, the full Pest suite) — never deploy a commit CI hasn't run against
- [ ] `git log` reviewed for any new migration files — know in advance whether this upgrade adds tables/columns (additive, low-risk) or modifies/removes existing ones (higher-risk, read the migration itself)
- [ ] `CHANGELOG.md` reviewed for the new version's own entry — every module addition/change in this codebase's history has documented its own migration and rollback considerations there
- [ ] A recent, verified backup exists (`DISASTER_RECOVERY_GUIDE.md` §2) — taken *before* this upgrade begins, not relying on the last scheduled one
- [ ] If the new version changes any `.env.example` entries (new required config, renamed variables), the running deployment's real `.env` has been updated to match — `git diff <old>..<new> -- apps/backend/.env.example` is the fastest way to see exactly what changed

---

## 2. Standard Upgrade Procedure

```bash
# 1. Pull the new code
git fetch origin && git checkout <new-tag-or-commit>

# 2. Rebuild the images (composer dependencies may have changed)
docker compose build app worker

# 3. Take the worker offline first, to avoid a worker processing a job
#    against half-migrated data while `app` is still being replaced
docker compose stop worker

# 4. Recreate the app containers with the new image
docker compose up -d app

# 5. Run migrations — every migration in this codebase is written to be
#    safe to run against a live database (additive by convention; see
#    §3 below for the one class of migration that needs extra care)
docker compose exec app php artisan migrate --force

# 6. Sync permissions for any module whose PermissionRegistry changed
#    (safe to just run all of them — idempotent)
docker compose exec app php artisan db:seed --force

# 7. Bring the worker back up on the new image
docker compose up -d worker

# 8. Verify — run every check in PRODUCTION_DEPLOYMENT_GUIDE.md §4
```

**Why stop the worker before migrating (step 3)**: a job already in flight when a migration changes a table's shape could fail mid-execution in a confusing way. Since every queue job in this codebase (`Jobs\SendNotificationJob`, currently the only one) is designed to be safely re-attempted (`Actions\SendNotificationAction`'s own retry policy), a few minutes of the worker being offline during migration costs nothing — an in-flight job simply resumes once the worker restarts.

---

## 3. Migrations That Need More Than the Standard Procedure

Every migration this codebase has ever shipped has been additive (`CREATE TABLE`, `ADD COLUMN`) — confirmed by this platform's own delivery discipline across all 19 modules (no destructive migration exists in `database/migrations/` as of Phase 1.1). If a future migration ever needs to **drop or rename** a column/table that existing rows depend on:

1. Do it in two separate deployments, not one: deployment A adds the new shape *alongside* the old one and starts writing to both; deployment B (after A has been live long enough to confirm correctness) removes the old shape. This is standard expand/contract migration practice — nothing in this codebase currently requires it, but the pattern should be followed the first time one does.
2. Never run a destructive migration without a fresh backup taken immediately beforehand, regardless of how recent the last scheduled one is.

---

## 4. Rollback

Per `docs/11_DEPLOYMENT_STANDARD.md` §10, a rollback path must be "verified by actually being exercised (not only designed)" before go-live — this section is the designed procedure; exercising it against a real staging environment before the first production upgrade is a remaining recommendation (see `PRODUCTION_READINESS_REPORT.md`), not something this session could perform without one.

```bash
# 1. Stop the worker (same reasoning as upgrading — avoid a job running
#    against a database shape the old code doesn't expect)
docker compose stop worker

# 2. Roll back the code
git checkout <previous-tag-or-commit>
docker compose build app worker

# 3. If the failed upgrade included new migrations, roll them back
#    BEFORE restarting the app on old code — old code was never tested
#    against the new schema
docker compose exec app php artisan migrate:rollback --step=<N> --force

# 4. Restart on the old image
docker compose up -d app worker

# 5. Verify (PRODUCTION_DEPLOYMENT_GUIDE.md §4)
```

**If the failed upgrade's migration is additive-only** (the common case, per §3), rolling the migration back is usually optional — old code simply ignores a column/table it doesn't know about. **Only skip the rollback-migration step if you have specifically confirmed the new migration was purely additive** for that release; when in doubt, roll it back too.

If the upgrade already caused bad data to be written (not just a code-level failure), migration rollback alone is not sufficient — see `DISASTER_RECOVERY_GUIDE.md` for restoring from backup instead.

---

## 5. Zero-Downtime Considerations

This platform's `app`/`worker` statelessness (`OPERATIONS_GUIDE.md` §4) makes a rolling upgrade possible in principle — bring up new-version containers alongside old ones, shift traffic, then retire the old ones — but `docker-compose.yml` alone does not orchestrate this (no blue/green tooling is wired, per `docs/11_DEPLOYMENT_STANDARD.md` §9's own "philosophy only, no tooling yet" framing). Until that tooling exists, treat every upgrade as a brief, planned maintenance window (§8, `docs/11_DEPLOYMENT_STANDARD.md`'s Change Window), not a zero-downtime event.
