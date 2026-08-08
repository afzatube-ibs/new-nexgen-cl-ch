<?php

declare(strict_types=1);

/**
 * Regression test for a Phase 1 Hardening Pass finding (2026-08-08):
 * `bootstrap/app.php`'s `AuthenticationException` render mapping always
 * returns a clean 401 JSON envelope — but Laravel's default `Illuminate\
 * Auth\Middleware\Authenticate::redirectTo()` used to call `route('login')`
 * to decide where to send an unauthenticated *guest* request, evaluated
 * BEFORE `AuthenticationException` is even constructed, whenever the
 * caller's `Accept` header doesn't ask for JSON. This platform has no
 * web/login route at all, so that call always threw
 * `RouteNotFoundException` instead — a raw 500, not the intended 401 —
 * bypassing the render mapping entirely. Every existing test in this
 * suite uses Pest's `getJson`/`postJson` helpers, which always send
 * `Accept: application/json`, so this went undetected by the automated
 * suite until a live smoke test using a plain HTTP client (no `Accept`
 * header at all) surfaced it. Fixed via `$middleware->redirectGuestsTo
 * (fn (): ?string => null)` in `bootstrap/app.php`.
 *
 * Deliberately uses the raw `$this->get()`/`$this->post()` test helpers
 * here, not `getJson()`/`postJson()` — the whole point is to exercise a
 * request that does NOT send `Accept: application/json`, which is
 * exactly the case `getJson()` can never reproduce.
 */
it('returns a clean 401 JSON envelope for an unauthenticated request with no Accept header', function () {
    $this->get('/api/v1/search/products')
        ->assertStatus(401)
        ->assertJsonPath('error.type', 'unauthenticated');
});

it('returns a clean 401 JSON envelope for an unauthenticated POST with no Accept header', function () {
    $this->post('/api/v1/search/reindex')
        ->assertStatus(401)
        ->assertJsonPath('error.type', 'unauthenticated');
});
