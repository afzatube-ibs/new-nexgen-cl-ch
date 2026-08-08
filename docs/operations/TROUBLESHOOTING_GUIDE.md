# neXgen Core — Troubleshooting Guide

| Field | Value |
|---|---|
| **Scope** | Diagnosing and resolving the specific failure modes this platform's own architecture can produce — not a generic Laravel/Docker troubleshooting reference |
| **Companion documents** | `OPERATIONS_GUIDE.md` (routine commands), `DISASTER_RECOVERY_GUIDE.md` (when the fix is "restore from backup," not below) |

Every entry below is either a real failure mode this codebase's own design creates, or a genuine bug found and fixed during development/hardening — named specifically so the *next* person to hit it recognizes it immediately instead of re-diagnosing it from scratch.

---

## "Every request returns 500, even ones that should be a clean 401/403/422"

**Check first**: is `APP_DEBUG=true`? If so, the *real* exception (not the platform's own JSON envelope) is what's rendering — read it, it will name the actual cause. This should never be `true` in production (`PRODUCTION_DEPLOYMENT_GUIDE.md` §2).

**If `APP_DEBUG=false` and you still get raw 500s instead of the platform's consistent `{"error":{"type":...}}` envelope**: check `storage/logs/laravel.log` for the exception class. Every exception this platform expects gets an explicit render mapping in `bootstrap/app.php`'s `withExceptions()` block — an *unmapped* exception type falls through to Laravel's own default rendering, which is the actual bug to fix (add a mapping), not something to work around downstream.

**A specific, previously-real instance of this**: an unauthenticated request *without* an `Accept: application/json` header used to 500 instead of cleanly 401ing, on every protected route in every module — Laravel's default guest-redirect tried to build a `route('login')` URL this API-only platform has never had. **Already fixed** (`bootstrap/app.php`'s `redirectGuestsTo`), but if you ever see `RouteNotFoundException` mentioning `login` in the logs, this is the exact regression — check that `redirectGuestsTo` call is still present.

---

## "A caller reports being rate-limited but I don't see why"

Check the response's `X-RateLimit-Limit` header — it tells you *which* limiter blocked them:

- `5` → they hit `throttle:login` (credential attempts) or `throttle:install` — both intentionally strict
- `120` (or your configured `API_RATE_LIMIT_PER_MINUTE`) → they hit the general platform-wide floor
- Any other stricter, permanent block feeling → check `RateLimiter::for()` calls across every module's own `ServiceProvider` — several modules define their own named limiter beyond the general floor (`OPERATIONS_GUIDE.md` §5 lists all three that exist today)

If the number in the header doesn't match either the general floor or a known named limiter, and you're on a route with more than one `throttle:` middleware stacked, you may have reintroduced the exact nested-throttle header-confusion bug found and fixed during Phase 1.1 (see `login`/`install`/`payments-webhooks` routes' own `withoutMiddleware('throttle:api')` calls for the established fix pattern) — a new route that adds its own specific throttle needs the same exclusion, or its blocked responses will report the *general* floor's numbers instead of its own.

---

## "Search returns zero results for a term I know should match"

1. **Is the term shorter than 4 characters?** `Engines\MySqlFullTextSearchEngine`'s BOOLEAN MODE query drops any word under InnoDB's `ft_min_word_len` (default 4) before building the FULLTEXT query — but it falls back to a LIKE scan for exactly this case, so a short term should still work via that path. If it genuinely returns nothing, check the LIKE fallback branch specifically (`MySqlFullTextSearchEngine::search()`).
2. **Is the product actually indexed?** `GET /api/v1/search/products` only searches `product_search_index`, not Catalog directly. Run `php artisan search:reindex` to rebuild it from scratch — if the term matches *after* a rebuild, the index had drifted (a missed event, most likely — see item below).
3. **Is the product `status=active` and `visibility` in `[search, catalog_search]`?** `Actions\SearchProductsAction` hardcodes this filter — a draft or `not_visible`/`catalog`-only product is genuinely indexed (searchable-by-rebuild) but will never appear in a search *result*, by design, regardless of how well the term matches. This is not a bug.
4. **Did you just insert the product inside an open database transaction and immediately search for it in the same transaction?** InnoDB FULLTEXT indexes only consider *committed* data — a MySQL-documented behavior, not a bug in this codebase. Found and extensively documented during Search's own development (see `CHANGELOG.md`'s Search entry) — this specifically bit this platform's own test suite (fixed via `DatabaseTruncation` for the affected tests) and is a real production constraint on any future "create and immediately search" feature.

## "Search's index seems to have drifted from Catalog (a product exists but isn't indexed, or vice versa)"

This should be structurally impossible in normal operation — `Listeners\ReindexProductOnProductCreated`/`ReindexProductOnProductUpdated`/`RemoveProductFromIndexOnProductArchived` react to every Catalog product mutation automatically. If it happens anyway (a missed event during an outage, a direct database write that bypassed Catalog's own Actions, or bulk-imported data that never went through `CreateProductAction`), the fix is always the same, and always fully correct: `php artisan search:reindex`. There is no partial-repair scenario to reason about — the command truncates and fully rebuilds, converging to exactly what Catalog's current data implies.

---

## "A notification never got sent, and I don't see an obvious error"

1. Check the `Notification`'s own `status` column — `pending`/`queued`/`sending`/`sent`/`failed`/`cancelled`. A `failed` status with `attempts_count` at the configured max (`NOTIFICATIONS_MAX_ATTEMPTS`) means the retry policy genuinely exhausted itself — check `NotificationDeliveryAttempt` rows (append-only ledger) for the actual provider-reported failure reason on each attempt.
2. If it's stuck in `queued` with a `next_retry_at` in the future, that's the retry backoff schedule working as designed (`config('notifications.retry.backoff_seconds')`) — not stuck, just waiting.
3. If it's stuck in `sending` indefinitely, that is a genuine bug class — `Actions\SendNotificationAction`'s own backstop try/catch around the provider call exists specifically to prevent this (a raw connection-level exception escaping a provider's own internal handling used to leave notifications stuck exactly this way — found and fixed during Notifications' own development). If you see this, check whether a *new* provider or a modified one is missing that same backstop.
4. Check the relevant provider's `isAvailable()` — every provider is deliberately, silently unavailable (never fake-successful) when its own credentials are unset. A notification queued for a channel with no available provider fails immediately with `UnsupportedNotificationProviderException`.

---

## "`docker-compose.yml` won't start `mysql` or `redis`"

By design — `DB_PASSWORD`, `DB_ROOT_PASSWORD`, and `REDIS_PASSWORD` all use Docker Compose's `${VAR:?error message}` required-variable syntax, per `SECURITY:SECURE_CONFIGURATION`'s "no insecure default." Set real values in `.env`; there is no way to start these services without them, deliberately.

---

## "Migrations fail partway through on a fresh database"

Almost always a MariaDB/MySQL connectivity issue mid-run, not a genuine schema conflict — this codebase's own migrations have never had an ordering or dependency bug found in Phase 1/1.1 (93 migrations, zero conflicts across 19 modules' worth of delivery). Check:

1. Is the database actually reachable for the *entire* duration of the migration run, not just at the start? (A database that restarts mid-migration, e.g. during a container health-check-triggered restart, will fail whatever migration was running at that moment.)
2. Re-run `php artisan migrate` — it is idempotent (tracks applied migrations in the `migrations` table) and will simply continue from where it stopped, not re-apply anything already committed.
3. If a specific migration genuinely fails against real data (not connectivity), read that migration file directly — every migration in this codebase carries a docblock explaining its own rationale, which usually reveals the actual precondition it assumes.

---

## "Permission checks are failing for a user who should have access"

1. Confirm the permission key actually exists: `Permission::where('key', '<key>')->exists()` — if a module's `PermissionRegistry` was updated but its `*:sync-permissions` command (or `db:seed`) was never re-run after deploying that change, the permission row simply doesn't exist yet. This is the single most common cause.
2. Confirm the user's role actually has that permission attached — `$user->roles->pluck('permissions.*.key')`.
3. Remember `RoleSeeder`'s own behavior: the `administrator` role is granted *every currently-registered* permission on every `db:seed` run — if a brand-new permission was just added and seeded, existing administrators already have it automatically; a non-administrator role does not, and never will without an explicit grant.

---

## "I can't tell which log lines belong to one specific request/incident"

Every request and every queued job carries a `correlation_id` (see `OPERATIONS_GUIDE.md` §3) — grep `storage/logs/laravel.log` for the `X-Correlation-Id` value from the affected response (or from the original request that queued a job whose processing you're now investigating; the id survives the queue boundary automatically).
