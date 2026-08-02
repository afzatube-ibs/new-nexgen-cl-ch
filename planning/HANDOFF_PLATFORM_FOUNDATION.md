# neXgen Core — Implementation Handoff: Platform Foundation

| Field | Value |
|---|---|
| **Document Type** | Execution artifact — NOT a constitutional document |
| **Module** | Module 1 — Platform Foundation (`planning/IMPLEMENTATION_MASTER_PLAN.md`, Platform Domain) |
| **Status** | In progress — scaffolding only, no business logic written yet |
| **Handoff Date** | 2026-08-02 |
| **Prepared By** | Chief Software Architect & Lead Engineer (Claude) |
| **For** | Next Claude Code session continuing this work |

This document exists so the next session can resume without re-deriving context from chat history, per `GOVERNANCE:SELF_CONTAINED_DOCUMENTATION`'s underlying principle applied to a handoff rather than a constitutional document.

---

## 1. What Has Been Completed

### 1a. Governance unblock (done, verified)
Six of the eight ADRs Platform Foundation depends on were promoted **Draft → Accepted** with Product Owner confirmation, per `GOVERNANCE:ADR_OWNERSHIP` §9 and `GOVERNANCE:COMPLETION_RULE` ("implementation never starts without an Accepted specification"):

- `ADR-0001` (modular monolith), `ADR-0002` (PHP 8.4+/Laravel), `ADR-0003` (MySQL 8+), `ADR-0004` (Redis), `ADR-0007` (REST/OpenAPI), `ADR-0008` (Docker) → **Accepted**.
- `ADR-0005` (admin/React) and `ADR-0006` (storefront/Next.js) deliberately left **Draft** — out of scope for Platform Foundation, which is backend-only.

`03_SYSTEM_ARCHITECTURE.md` (v1.2→1.3), `docs/README.md`, and `PROJECT_STATUS.md` were updated to reflect this and are internally consistent as of this handoff. **As of the user's most recent instruction, these documents are now frozen** — do not modify `README.md`, `PROJECT_STATUS.md`, `CHANGELOG.md`, ADRs, or any constitutional document automatically going forward. Only touch them again if the user explicitly requests a documentation change.

### 1b. Laravel skeleton generated (done)
A genuine Laravel 12.64 / PHP ^8.2 skeleton was generated via `composer create-project laravel/laravel` (not hand-written) into `apps/backend/`, then pruned of frontend build tooling (`resources/js`, `resources/css`, `vite.config.js`, `package.json`, default `welcome` view) since this backend is API-only — the storefront and admin are separate apps per `ARCH:DEPLOYMENT_TOPOLOGY` and will be scaffolded only when `ADR-0005`/`ADR-0006` are reached.

A hand-authored `apps/backend/composer.json` replaced the generated one, pinning `"php": "^8.4"` per `ADR-0002` exactly and adding: `predis/predis` (pure-PHP Redis client — deliberately chosen over the `redis` C extension so local/native development doesn't require compiling a PECL extension; the Dockerfile still installs the native extension for production performance — this is not a contradiction, Laravel's Redis client supports either transparently), `ramsey/uuid`, and dev tooling: `pestphp/pest` + `pest-plugin-arch` + `pest-plugin-laravel`, `larastan/larastan`, `laravel/pint`, `qossmic/deptrac`.

**`composer install` has NOT been run yet** — see §6 Next Step.

### 1c. Docker packaging written (done, unexecuted)
Per the user's mid-session correction, Docker is **not required to continue** — Docker Desktop is blocked by a Windows/WSL compatibility issue on this machine. All Docker artifacts below are written and believed correct, but **none have been built or run** — they need validation once Docker is available again, or in CI:

- `apps/backend/Dockerfile` — multi-stage (composer vendor stage → `php:8.4-fpm-alpine` runtime), non-root user, opcache+JIT enabled, `pdo_mysql`/`redis`/`gd`/`intl`/`zip`/`bcmath` extensions.
- `apps/backend/docker/php/php.ini`, `opcache.ini`, `docker/supervisor/supervisord.conf`, `docker/entrypoint.sh` (dispatches `php-fpm` / `worker` / `scheduler` roles from one image).
- `docker/nginx/default.conf` — nginx front for the Application Unit.
- Root `docker-compose.yml` — full `ARCH:DEPLOYMENT_TOPOLOGY`: `nginx`, `app`, `worker`, `mysql` (8.4), `redis` (7), with `.env`-required secrets (no insecure defaults, per `SECURITY:SECURE_CONFIGURATION`), healthchecks, and named volumes. `app`/`worker` are written to be horizontally scalable via `docker compose up --scale app=N --scale worker=N`.
- `.env.example` (root, for Compose) and `apps/backend/.env.example` (Laravel's own, framework-generated, not yet customized with our DB/Redis/session/queue/logging defaults — see §4 remaining work).
- `.github/workflows/backend-ci.yml` — GitHub Actions CI running PHP 8.4 + MySQL 8.4 + Redis 7 services, `composer analyse` (Larastan) and `composer test` (Deptrac boundaries + Pest). **Not yet triggered/verified** since nothing has been pushed.

### 1d. Module directory skeleton (done, empty)
Created but **contains zero code files yet**:
```
apps/backend/app/Domains/Platform/Foundation/
├── Console/Commands/
├── EventBus/Contracts/
├── Health/Checks/
├── Health/Contracts/
├── Http/Controllers/
├── Http/Middleware/
└── Providers/
```
This mirrors `04_MODULE_ARCHITECTURE.md` (`ARCH:DOMAIN_MAP` → Platform domain → Foundation module) rather than Laravel's default flat `app/` convention, per `ENGINEERING:CODE_ORGANIZATION`'s requirement that module ownership, not framework convenience, be the organizing principle. These directories will not appear in `git status` (git does not track empty directories) until files are written into them.

### 1e. PHP 8.4.24 downloaded, not yet installed
`php-8.4.24-nts-Win32-vs17-x64.zip` (~35MB, verified valid zip) was downloaded from `windows.php.net` into the session's **scratchpad temp directory**, which **does not persist across sessions**. It has not been extracted or wired into PATH. **The next session must either re-download it or use a different local PHP 8.4 acquisition path** — see §6 and §8.

---

## 2. Current Project State

- **No PHP dependencies installed** (`vendor/` does not exist). No `composer.lock` has been generated for our custom `composer.json`.
- **No code has executed.** Nothing has been run, tested, or verified — not even `php artisan --version`.
- **No business logic exists.** The event bus abstraction, health check service, correlation-ID middleware, and their controllers/commands/service provider — all designed in the conversation that led here — are **not yet written to disk**. Only empty directories exist for them.
- **Nothing is committed to git.** All work described above is uncommitted working-tree changes (modified + untracked files). See §9.
- Platform Foundation's acceptance criteria (`planning/IMPLEMENTATION_MASTER_PLAN.md` module 1: "All modules can publish/subscribe; health endpoint reports accurately; horizontal scaling... verified") are **not yet met**.

---

## 3. Files Created / Modified This Session

**Modified (constitutional docs — now frozen, do not touch without explicit request):**
- `PROJECT_STATUS.md`
- `docs/03_SYSTEM_ARCHITECTURE.md` (v1.2 → v1.3)
- `docs/README.md`
- `docs/adr/ADR-0001-modular-monolith.md`
- `docs/adr/ADR-0002-backend-runtime.md`
- `docs/adr/ADR-0003-primary-datastore.md`
- `docs/adr/ADR-0004-caching-session-queue.md`
- `docs/adr/ADR-0007-api-style.md`
- `docs/adr/ADR-0008-containerized-deployment.md`

**Created (implementation — free to continue modifying):**
- `.env.example` (root)
- `.github/workflows/backend-ci.yml`
- `docker-compose.yml` (root)
- `docker/nginx/default.conf`
- `apps/backend/` — full Laravel 12 skeleton (`app/`, `artisan`, `bootstrap/`, `config/`, `database/`, `public/`, `routes/`, `storage/`, `tests/`, `composer.json`, `phpunit.xml`, `.env.example`, `.gitignore`, `.editorconfig`, `.gitattributes`, `.dockerignore`, `Dockerfile`, `docker/php/php.ini`, `docker/php/opcache.ini`, `docker/supervisor/supervisord.conf`, `docker/entrypoint.sh`)
- `apps/backend/app/Domains/Platform/Foundation/**` — **empty directories only**, no files
- `planning/HANDOFF_PLATFORM_FOUNDATION.md` — this document

---

## 4. Remaining Platform Foundation Tasks

In dependency order:

1. **Install dependencies locally.** Get PHP 8.4 working natively (no Docker), run `composer install` in `apps/backend/`, generate `composer.lock`, run `php artisan key:generate`.
2. **Domain event bus abstraction** (`EventBus/`):
   - `Contracts/DomainEventBus.php` — interface: `publish(DomainEvent $event): void`, `subscribe(string $eventClass, Closure|array|string $listener): void`.
   - `DomainEvent.php` — abstract base envelope: immutable `eventId` (UUID), `occurredAt`, `correlationId` (pulled from Laravel's `Context` facade if not explicit — see next item), `tenantId` (a single well-known default constant — `ARCH:DATA_OWNERSHIP`'s tenant-scoping designed in, unexercised in Phase 1; do not build real multi-tenancy).
   - `LaravelDomainEventBus.php` — implementation wrapping `Illuminate\Contracts\Events\Dispatcher`. This is the **only** place in the codebase permitted to touch Laravel's native event dispatcher directly — every other module must depend on `DomainEventBus`, never on `Illuminate\Support\Facades\Event`, satisfying `ARCH:CROSS_DOMAIN_COMMUNICATION`'s "accessed through an abstraction... swappable for a distributed broker."
   - `Providers/FoundationServiceProvider.php` binds the interface to the implementation as a singleton.
3. **Correlation ID + observability**:
   - `Http/Middleware/AssignCorrelationId.php` — reads `X-Correlation-Id` request header or generates a UUID, sets it on the response, and calls `Context::add('correlation_id', $id)` (Laravel 11+ `Context` facade) so it's ambient for the rest of the request/job lifecycle and automatically merged into log records — this is `API:CORRELATION` made real, satisfying `ENGINEERING:LOGGING_PRINCIPLES`'s "a correlation identifier that never reaches the actual log output has not satisfied that requirement."
   - Add a structured JSON log channel in `config/logging.php` (Monolog `JsonFormatter`), set as default, confirmed to include `Context` automatically.
   - Register the middleware globally in `bootstrap/app.php`'s `withMiddleware()`.
4. **Health check surface** (`Health/`):
   - `Contracts/HealthCheck.php`, `HealthCheckResult.php` (value object: healthy/unhealthy + message + meta, no leaked exception detail in the HTTP-facing message — log full detail server-side only, per `DATA:CLASSIFICATION`/`SECURITY:DATA_PROTECTION`), `HealthCheckService.php` (aggregates registered checks, never lets one check's exception break the others).
   - `Checks/DatabaseHealthCheck.php` (PDO `SELECT 1`), `CacheHealthCheck.php` (Redis roundtrip via the cache store), `QueueHealthCheck.php` (Redis queue connection reachability — explicitly document that this verifies connectivity, not that a worker is actively consuming, to avoid overclaiming per `PRINCIPLES:EXPLICIT_FAILURE`).
   - `Http/Controllers/HealthController.php` — `GET /api/health`: 200 if all healthy, 503 otherwise, structured JSON body (status per check, overall status, timestamp), correlation ID in response header. Document explicitly in a docblock that this endpoint is deliberately **outside** `API:VERSIONING`'s versioned business surface (it's operational infrastructure per `ARCH:NFR`/`DEPLOYMENT:OPERATIONAL_READINESS`, not a module public business contract) — `API:STABILITY_LEVELS` requires this kind of exception be stated explicitly, not left for a caller to guess.
   - Leave Laravel's built-in `/up` liveness ping as-is (already wired via `bootstrap/app.php`'s `health: '/up'`) — do not duplicate it.
   - `Console/Commands/PlatformHealthCommand.php` (`platform:health --liveness` for fast, dependency-free container healthchecks; without the flag, runs the full `HealthCheckService` for manual ops diagnostics) — this is what `docker-compose.yml`'s `app`/`worker` healthchecks already call.
5. **Boundary enforcement** (`ENGINEERING:DOMAIN_BOUNDARY_ENFORCEMENT` — must be *detectable*, not just documented):
   - `apps/backend/deptrac.yaml` — layers by `App\Domains\{Platform,Commerce,Operations,Growth}` namespace, ruleset matching `MODULE:COUPLING_RULES` (Platform depended-upon-by-all, depends-on-none; no cross-domain direct dependency; only Foundation's `EventBus` namespace may import `Illuminate\Contracts\Events\Dispatcher`/`Illuminate\Support\Facades\Event`).
   - A couple of `pest-plugin-arch` tests as a second, independent enforcement layer (defense in depth, mirroring `SECURITY:DEFENSE_IN_DEPTH`'s logic applied to code-quality gates).
6. **Tests** (`TESTING_STANDARD` pyramid): unit tests for `DomainEvent`/`LaravelDomainEventBus`/`HealthCheckService`; a feature test hitting `GET /api/health` for both healthy and simulated-unhealthy states; an integration test proving a synthetic publish→subscribe round-trip through the real bound `DomainEventBus` (do **not** invent fake business modules in `app/` for this — keep the synthetic event/listener pair inside `tests/`).
7. **Verify**: `composer install`, `composer analyse` (Larastan), `composer boundaries` (Deptrac), `composer test` (Pest) all green, locally, under real PHP 8.4.
8. **Docker validation** (once Docker Desktop's WSL issue is resolved, or in CI): `docker compose build`, `docker compose up`, confirm `GET /api/health` responds through nginx, confirm `--scale app=2 --scale worker=2` works.
9. Only then: commit locally, report results per the user's required format (implemented / files changed / tests passed / remaining / risks / recommendations), and **wait for explicit approval before starting any other module.**

---

## 5. Assumptions Made

- **Laravel 12** (current stable major, `laravel/framework: "^12.0"`) satisfies `ADR-0002`'s "current stable major version at implementation time" — not independently reconfirmed with the user.
- **`predis/predis`** (pure-PHP client) as the Composer-level Redis client, with the native `redis` PECL extension only inside the Docker image for production performance, is treated as a legitimate reading of `ADR-0004` (Redis is the *backbone*; nothing in the ADR mandates the C extension specifically as the access mechanism) — not independently reconfirmed.
- **`GET /api/health` sits outside API versioning** as operational infrastructure rather than a versioned business capability — a defensible but not user-confirmed interpretation of `API:VERSIONING`/`API:STABILITY_LEVELS`; flagged in-code per §4 item 4, should be called out explicitly in the eventual progress report so the user can object if they read it differently.
- **Deptrac + Pest-arch together**, not a hand-rolled boundary checker, satisfies `ENGINEERING:DOMAIN_BOUNDARY_ENFORCEMENT`'s "catchable before it reaches production, not merely documented" — both are established, purpose-built PHP tools, not exotic choices.
- **Full multi-node horizontal-scaling load testing is out of scope for Platform Foundation itself** — the module makes scaling *possible and demonstrably wired correctly* (stateless config, `docker compose --scale`), but real load testing across a populated platform is treated as the Phase 1 "hardening pass" (`planning/IMPLEMENTATION_MASTER_PLAN.md` Implementation Order item 20), not this module's job. This should be stated plainly as a risk/limitation in the eventual progress report, not silently assumed.
- **Docker being unavailable does not block Platform Foundation's completion** — per the user's explicit correction, native local PHP/Composer is the primary path; Docker artifacts are written but validated later (either when Docker/WSL is fixed, or via CI, which runs on Linux and is unaffected by the local Windows/WSL issue).

None of these are irreversible; flag them to the user in the next progress report rather than treating them as settled.

---

## 6. Next Implementation Step

**Get PHP 8.4 running natively on this Windows machine, with no Docker dependency**, then run `composer install` in `apps/backend/`. Concretely, in order of preference:

1. Extract the already-downloaded `php-8.4.24-nts-Win32-vs17-x64.zip` if it still exists at `C:\Users\LOKKIS~1\AppData\Local\Temp\claude\D--NEW-NEXGEN-neXgen-repo-verified-neXgen\707c041c-7535-44ac-b09c-a3b0b03d1700\scratchpad\php84\php.zip` (unlikely — scratchpad is session-scoped and probably gone in a new session).
2. If gone, re-download from `https://windows.php.net/downloads/releases/php-8.4.24-nts-Win32-vs17-x64.zip` (confirmed working URL as of this session — redirects to a live mirror) to a **persistent** location, e.g. `C:\tools\php84\`, not scratchpad. Add `php.exe` to `PATH` for the session.
3. Only if that path is somehow blocked, fall back to Laragon's bundled PHP 8.3.30 (`C:\laragon\bin\php\php-8.3.30-Win32-vs16-x64\php.exe`) with `composer install --ignore-platform-reqs`, but **disclose this compromise explicitly** in the next progress report — it means local dev ran on 8.3 against a codebase declared `^8.4`, even though the Dockerfile and CI both correctly target real 8.4.
4. Run `composer install` (via Laragon's bundled `composer.phar` at `C:\laragon\bin\composer\composer.phar`, or a fresh `composer.phar`/`composer.exe`) inside `apps/backend/`.
5. Then proceed through §4's task list in order.

---

## 7. Known Issues

- **Docker Desktop is blocked by a Windows/WSL compatibility issue** on this machine (user-reported). Do not attempt to wait on it or re-launch it as a blocking dependency; Docker validation is deferred to when it's fixed or to CI.
- **Node.js was directed to be used locally** by the user's instruction, but Platform Foundation is backend-only (no frontend in this module) — there is currently nothing that needs Node for this specific module. Re-evaluate when `ADR-0005`/`ADR-0006` modules are reached; no action needed now.
- **The downloaded PHP 8.4.24 zip lives in session-scoped scratchpad** and will very likely not exist in the next session — treat it as gone; see §6 step 2 for the direct re-download URL, which was confirmed live in this session.
- **No `.env` exists yet** for `apps/backend/` (only Laravel's generated `.env.example`, uncustomized) — needs `APP_KEY` generation and DB/Redis/session/queue/cache driver values set to match `ADR-0003`/`ADR-0004` (MySQL, Redis for cache/session/queue — never the local/file/sync drivers, per `ARCH:NFR` statelessness) before anything can actually run against real dependencies. For fully local (non-Docker) development, a local MySQL and Redis instance need to be reachable too — neither was confirmed available on this machine; check XAMPP's bundled MySQL (`C:\xampp\mysql`) and whether Redis exists locally at all (it did not appear to be installed — may need `Memurai` or WSL-hosted Redis as a native-Windows-friendly option, or accept that full integration testing waits for Docker).
- **`git status` currently shows the ADR/status-doc changes as unstaged** alongside the untracked implementation files — nothing has been committed. The user's instruction to commit only after a completed milestone means these should stay uncommitted until Platform Foundation actually compiles and passes its tests.

---

## 8. Commands Needed to Continue

```bash
# 1. Get PHP 8.4 (if the scratchpad download is gone) — persistent location, not scratchpad:
curl -sL -o C:/tools/php84.zip "https://windows.php.net/downloads/releases/php-8.4.24-nts-Win32-vs17-x64.zip"
# then extract to C:/tools/php84/ and add to PATH for the session

# 2. Install Composer dependencies (from apps/backend/):
cd apps/backend
php C:/laragon/bin/composer/composer.phar install --no-interaction

# 3. Generate app key:
php artisan key:generate

# 4. Once local MySQL/Redis are reachable and .env is configured, verify boot:
php artisan --version
php artisan route:list

# 5. Run the test/quality suite once tests exist (per §4):
composer analyse
composer boundaries
composer test
```

---

## 9. Git Status

**Nothing has been committed.** Current working tree (relative to `origin/main` @ `6081627`):

- **Modified, unstaged:** `PROJECT_STATUS.md`, `docs/03_SYSTEM_ARCHITECTURE.md`, `docs/README.md`, `docs/adr/ADR-0001-modular-monolith.md`, `docs/adr/ADR-0002-backend-runtime.md`, `docs/adr/ADR-0003-primary-datastore.md`, `docs/adr/ADR-0004-caching-session-queue.md`, `docs/adr/ADR-0007-api-style.md`, `docs/adr/ADR-0008-containerized-deployment.md`
- **Untracked:** `.env.example`, `.github/`, `apps/backend/`, `docker-compose.yml`, `docker/nginx/`, `planning/HANDOFF_PLATFORM_FOUNDATION.md`

Do not commit yet — no milestone is complete (nothing has been installed, run, or tested). Commit only once §4's tasks reach a green `composer test` run, per the user's instruction to commit locally after each completed implementation milestone and wait for approval before the next module.

---

## 10. Continuation Prompt for the Next Claude Session

> Continue implementing the neXgen Core **Platform Foundation** module (Phase 1, Module 1). Read `planning/HANDOFF_PLATFORM_FOUNDATION.md` in full first — it has complete context: governance state (6 of 8 ADRs now Accepted — `00`–`11` and the ADRs are now **frozen**, do not modify them without an explicit user request), what's already scaffolded (`apps/backend/` has a real Laravel 12 skeleton plus Docker packaging, but zero business logic and zero installed dependencies), and the exact remaining task list (§4).
>
> Docker Desktop is blocked by a Windows/WSL issue on this machine — do not wait on it or treat it as required. Work natively: get PHP 8.4 running locally (§6/§8 have the exact commands and a confirmed-working download URL), run `composer install`, and implement the domain event bus, correlation-ID/logging wiring, and health check surface exactly as designed in §4, inside `app/Domains/Platform/Foundation/` (directories already exist, empty).
>
> Enforce module boundaries detectably (Deptrac + Pest-arch, per §4 item 5) — this is a hard requirement, not optional polish. Get `composer analyse`, `composer boundaries`, and `composer test` all green under real PHP 8.4 before considering anything done. Then commit locally, report using the required format (implemented / files changed / tests passed / remaining / risks / recommendations), and **stop and wait for explicit approval** before touching any module beyond Platform Foundation.

---

End of Handoff Document
