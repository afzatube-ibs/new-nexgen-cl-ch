<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Phase 1.1 Production Hardening: baseline security response headers,
 * applied platform-wide (see `bootstrap/app.php`'s global `$middleware->
 * append()`), never opt-in per module — mirrors `AssignCorrelationId`'s own
 * "not opt-in per route" reasoning exactly, and per `08_SECURITY_STANDARD.md`'s
 * `SECURITY:DEFENSE_IN_DEPTH`: none of these headers is this platform's only
 * defense against what it mitigates, but each closes a real, cheap-to-close
 * gap a browser-based client (this API's own JSON responses, or the future
 * Admin UI/storefront `ADR-0005`/`ADR-0006` will eventually add) would
 * otherwise be exposed to.
 *
 * Every value below is deliberately conservative for a pure JSON API with
 * no first-party HTML surface except the framework's own `/up` health page
 * (`API:PHILOSOPHY`) — there is no legitimate reason for this application's
 * own responses to be framed, sniffed as a different content type, or to
 * leak a referrer, and no legitimate reason for a browser to grant this
 * origin geolocation/camera/microphone access, since nothing here would
 * ever ask for it.
 */
final class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var Response $response */
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'no-referrer');
        $response->headers->set('Permissions-Policy', 'geolocation=(), camera=(), microphone=(), payment=()');

        // `default-src 'none'` is safe for every JSON response this API
        // returns (a CSP header has no effect on how a non-browser HTTP
        // client — curl, a server-to-server integration, this platform's
        // own test suite — reads a JSON body) and degrades the framework's
        // own `/up` health page gracefully to unstyled plain text rather
        // than breaking it (verified live: the page still renders
        // "Application up" and still returns HTTP 200 either way — nothing
        // that page does depends on its own inline `<style>` executing).
        $response->headers->set('Content-Security-Policy', "default-src 'none'");

        // Ignored by a plain-HTTP request (browsers only honor HSTS over a
        // response that was itself already HTTPS) — safe to always send,
        // and one less thing to remember to add when TLS termination is
        // configured at the reverse proxy in front of this application.
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

        return $response;
    }
}
