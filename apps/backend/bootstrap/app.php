<?php

use App\Domains\Platform\Foundation\Http\Middleware\AssignCorrelationId;
use App\Domains\Platform\IdentityAccess\Exceptions\AuthorizationDeniedException;
use App\Domains\Platform\IdentityAccess\Exceptions\ConcurrencyConflictException;
use App\Domains\Platform\IdentityAccess\Http\Middleware\EnsurePermission;
use App\Domains\Platform\StoreConfiguration\Exceptions\ConcurrencyConflictException as StoreConfigurationConcurrencyConflictException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // API:CORRELATION on every request, platform-wide — not opt-in per
        // route, since a request with no correlation identifier is exactly
        // the gap ENGINEERING:LOGGING_PRINCIPLES prohibits.
        $middleware->append(AssignCorrelationId::class);

        // SECURITY:AUTHORIZATION's API-boundary permission check, reusable
        // by every route in every module — see EnsurePermission's docblock.
        $middleware->alias(['permission' => EnsurePermission::class]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // API:ERROR_MODEL / API:RESPONSE_ENVELOPE: "every module's API
        // returns errors in one consistent, platform-wide structure."
        // This backend has no HTML surface at all (API:PHILOSOPHY), so
        // every exception below renders as this one JSON envelope
        // unconditionally, rather than only when a caller happens to send
        // an Accept: application/json header.
        $envelope = fn (string $type, string $message, ?array $details = null, int $status = 500): JsonResponse => response()->json([
            'error' => array_filter([
                'type' => $type,
                'message' => $message,
                'details' => $details,
            ], fn ($v) => $v !== null),
        ], $status);

        $exceptions->render(function (ConcurrencyConflictException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        // Store Configuration defines its own ConcurrencyConflictException
        // rather than depending on Identity & Access's — see that class's
        // docblock — so it needs its own render mapping to the same
        // platform-wide 409 envelope.
        $exceptions->render(function (StoreConfigurationConcurrencyConflictException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        $exceptions->render(function (AuthorizationDeniedException $e) use ($envelope): JsonResponse {
            return $envelope('authorization_denied', $e->getMessage(), status: 403);
        });

        $exceptions->render(function (AuthenticationException $e) use ($envelope): JsonResponse {
            return $envelope('unauthenticated', 'Authentication is required.', status: 401);
        });

        $exceptions->render(function (ValidationException $e) use ($envelope): JsonResponse {
            return $envelope('validation_failed', 'The given data was invalid.', $e->errors(), $e->status);
        });

        $exceptions->render(function (ModelNotFoundException $e) use ($envelope): JsonResponse {
            return $envelope('not_found', 'The requested resource was not found.', status: 404);
        });

        $exceptions->render(function (TooManyRequestsHttpException $e) use ($envelope): JsonResponse {
            return $envelope('rate_limited', 'Too many requests. Please try again later.', status: 429);
        });

        $exceptions->render(function (NotFoundHttpException $e) use ($envelope): JsonResponse {
            return $envelope('not_found', 'The requested resource was not found.', status: 404);
        });

        // Catch-all for any other HTTP-shaped exception (e.g. a 405 from a
        // route matched with the wrong verb) — still the same envelope,
        // never Laravel's default HTML error page, which this backend
        // never has a legitimate reason to render.
        $exceptions->render(function (HttpExceptionInterface $e) use ($envelope): JsonResponse {
            return $envelope('http_error', $e->getMessage() ?: 'An error occurred.', status: $e->getStatusCode());
        });

        // A genuinely unexpected exception must still be explicit
        // (PRINCIPLES:EXPLICIT_FAILURE) and must never leak internals
        // (stack traces, file paths, class names) to a caller, regardless
        // of APP_DEBUG — that leakage is exactly what SECURITY:
        // DATA_PROTECTION exists to prevent, whether or not the leaked
        // detail happens to be "just" a stack trace rather than business
        // data. Full detail still reaches the application log.
        $exceptions->render(function (Throwable $e, Request $request) use ($envelope): JsonResponse {
            report($e);

            return $envelope('server_error', 'An unexpected error occurred.', status: 500);
        });
    })->create();
