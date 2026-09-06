# neXgen Core — Upgrade Guide

| Field | Value |
|---|---|
| **Scope** | Deploying a new neXgen release over an existing full production installation |
| **Primary topology** | `docker-compose.production.yml` + local `.env.production` |
| **Companion documents** | `PRODUCTION_DEPLOYMENT_GUIDE.md`, `DISASTER_RECOVERY_GUIDE.md`, `TROUBLESHOOTING_GUIDE.md` |

---

## 1. Pre-upgrade checklist

Before changing the running release:

- [ ] The target commit has passed the repository's backend/full-stack/production packaging checks that apply to it.
- [ ] Review migrations between the running revision and the target revision.
- [ ] Review changes to `.env.production.example`, `apps/backend/.env.example`, Storefront/Gateway/Admin environment contracts, and `docker-compose.production.yml`.
- [ ] Take and verify a fresh MySQL backup and, when local media storage is used, a `backend_storage` backup.
- [ ] Record the currently deployed Git SHA/tag so rollback has an unambiguous target.
- [ ] Confirm sufficient disk space exists to build the new images while the old images/volumes still exist.

Never use `migrate:fresh`, `db:wipe`, or delete named volumes during a normal upgrade.

---

## 2. Standard upgrade procedure

```bash
COMPOSE='docker compose --env-file .env.production -f docker-compose.production.yml'

# 1. Move the working tree to the exact reviewed release.
git fetch origin
git checkout <new-tag-or-commit>

# 2. Validate configuration before touching running containers.
$COMPOSE config --quiet

# 3. Build all deployable images. Browser-exposed Admin/Storefront origins
#    are compiled at image build time, so they must be rebuilt as part of a
#    normal release rather than assumed to follow runtime environment changes.
$COMPOSE build

# 4. Pause asynchronous writers before changing schema/code.
$COMPOSE stop worker scheduler

# 5. Run migrations using the NEW backend image in a one-off container.
#    Existing MySQL/Redis volumes remain untouched.
$COMPOSE run --rm app php artisan migrate --force

# 6. Sync safe permission/role/template catalog data. DatabaseSeeder is
#    deliberately credential-free and idempotent for these platform records.
$COMPOSE run --rm app php artisan db:seed --force

# 7. Recreate the complete application tier on the new images.
$COMPOSE up -d --remove-orphans

# 8. Wait for health checks and verify.
$COMPOSE ps
$COMPOSE exec -T app php artisan platform:health
```

Then run every go-live verification in `PRODUCTION_DEPLOYMENT_GUIDE.md`, including the real HTTPS Storefront, Admin login, Gateway health/integration, and stable worker/scheduler logs.

### Why worker and scheduler stop before migration

Both can initiate application work while the schema is changing. Pausing them prevents a queued notification/scheduled task from executing halfway through a release boundary. HTTP traffic should also be placed behind an operator-owned maintenance page/window if a migration is not guaranteed compatible with both old and new code simultaneously.

---

## 3. Environment changes

There are two different environment classes in this platform:

### Runtime values
Backend/Gateway secrets and internal runtime settings are supplied by Compose when containers start. After changing them, recreate the affected service:

```bash
$COMPOSE up -d --force-recreate app worker scheduler gateway
```

### Browser-bundle values
`VITE_API_BASE_URL` and Storefront `NEXT_PUBLIC_*` values are intentionally compiled into static/client output. Changing public Backend/Gateway/Storefront origins therefore requires rebuilding the corresponding image:

```bash
$COMPOSE build admin storefront
$COMPOSE up -d admin storefront
```

Never place a secret in any `VITE_*` or `NEXT_PUBLIC_*` variable; those values are readable by browsers.

---

## 4. Migration discipline

Prefer expand/contract migrations:

1. **Expand release:** add the new table/column/index while old code can still operate.
2. Migrate/backfill data if required.
3. Deploy code that uses the new shape.
4. **Contract release:** remove the old shape only after no deployed code depends on it.

For any destructive migration, take an immediately pre-change backup and define the rollback/data-recovery path before deployment. A migration being syntactically reversible is not proof that application data can be safely reconstructed after rollback.

---

## 5. Rollback without data restoration

Use this only when the failed release has **not** written incompatible/bad business data.

```bash
COMPOSE='docker compose --env-file .env.production -f docker-compose.production.yml'

# 1. Stop asynchronous writers and, if necessary, remove public traffic.
$COMPOSE stop worker scheduler

# 2. Return source to the recorded previous release and validate its config.
git checkout <previous-tag-or-commit>
$COMPOSE config --quiet

# 3. Rebuild previous application images.
$COMPOSE build

# 4. If the failed release used a schema that the previous code cannot
#    tolerate, explicitly roll back ONLY the reviewed migrations required.
#    Otherwise leave additive schema in place.
# $COMPOSE run --rm app php artisan migrate:rollback --step=<N> --force

# 5. Recreate the previous application tier.
$COMPOSE up -d --remove-orphans

# 6. Verify all public surfaces and internal health.
$COMPOSE exec -T app php artisan platform:health
$COMPOSE ps
```

If the failed release corrupted or transformed business data incompatibly, code rollback is not enough. Restore the verified backup using `DISASTER_RECOVERY_GUIDE.md`.

---

## 6. Service-account/token changes

The Gateway's Storefront and Checkout Sanctum tokens are deployment secrets. A release that changes service-role permissions normally only needs `db:seed --force`; the existing account's role relationship remains and the new permission composition is picked up from the role.

Rotate a token when it is exposed, intentionally expired/revoked, or your security policy requires rotation. Issue a new token with the appropriate service-account command, update `.env.production`, and recreate `gateway`. Never commit the plaintext token or print it into CI logs.

---

## 7. Zero-downtime status

The application services are stateless enough to support a blue/green or rolling strategy, but `docker-compose.production.yml` by itself does **not** provide traffic shifting or two-version orchestration. Until a staging/edge deployment mechanism explicitly implements and exercises that strategy, treat upgrades as controlled maintenance-window releases rather than claiming zero downtime.

Database compatibility across the release boundary is the primary requirement for any future rolling deployment; expand/contract migrations in §4 are what make that possible.
