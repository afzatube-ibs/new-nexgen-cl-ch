<?php

use App\Domains\Commerce\Catalog\Exceptions\ConcurrencyConflictException as CatalogConcurrencyConflictException;
use App\Domains\Commerce\Catalog\Exceptions\DependentRecordsExistException as CatalogDependentRecordsExistException;
use App\Domains\Commerce\Catalog\Exceptions\InvalidVariantException;
use App\Domains\Commerce\Catalog\Exceptions\ProductNotReadyToPublishException;
use App\Domains\Commerce\Customers\Exceptions\ConcurrencyConflictException as CustomersConcurrencyConflictException;
use App\Domains\Commerce\Inventory\Exceptions\ConcurrencyConflictException as InventoryConcurrencyConflictException;
use App\Domains\Commerce\Inventory\Exceptions\DependentRecordsExistException as InventoryDependentRecordsExistException;
use App\Domains\Commerce\Inventory\Exceptions\InsufficientStockException;
use App\Domains\Commerce\Inventory\Exceptions\InvalidReservationStateException;
use App\Domains\Commerce\Inventory\Exceptions\InvalidTransferStateException;
use App\Domains\Commerce\Pricing\Exceptions\ConcurrencyConflictException as PricingConcurrencyConflictException;
use App\Domains\Commerce\Pricing\Exceptions\DependentRecordsExistException as PricingDependentRecordsExistException;
use App\Domains\Platform\Foundation\Http\Middleware\AssignCorrelationId;
use App\Domains\Platform\IdentityAccess\Exceptions\AuthorizationDeniedException;
use App\Domains\Platform\IdentityAccess\Exceptions\ConcurrencyConflictException;
use App\Domains\Platform\IdentityAccess\Http\Middleware\EnsurePermission;
use App\Domains\Platform\Installer\Exceptions\AdministratorRoleMissingException;
use App\Domains\Platform\Installer\Exceptions\AlreadyInstalledException;
use App\Domains\Platform\Localization\Exceptions\CannotRemoveBaseCurrencyException;
use App\Domains\Platform\Localization\Exceptions\CannotRemoveDefaultLocaleException;
use App\Domains\Platform\Localization\Exceptions\ConcurrencyConflictException as LocalizationConcurrencyConflictException;
use App\Domains\Platform\Media\Exceptions\ConcurrencyConflictException as MediaConcurrencyConflictException;
use App\Domains\Platform\Media\Exceptions\UnsupportedMediaTypeException;
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

        // Catalog's own optimistic-locking conflict — same reasoning as
        // Store Configuration's, one render mapping per module's own copy.
        $exceptions->render(function (CatalogConcurrencyConflictException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        // Catalog's restrictOnDelete guards (a category with children, an
        // attribute still valued on a product, an option/option value
        // still assigned) surfaced as a clean 409, never a raw database
        // constraint violation — see DependentRecordsExistException's
        // docblock.
        $exceptions->render(function (CatalogDependentRecordsExistException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        // Catalog's "Publishing workflow" completeness rule — a
        // validation-shaped 422, not a conflict, per that exception's
        // docblock.
        $exceptions->render(function (ProductNotReadyToPublishException $e) use ($envelope): JsonResponse {
            return $envelope('validation_failed', $e->getMessage(), status: 422);
        });

        // Catalog's variant invariants (non-configurable product, foreign
        // option values, duplicate combination) — also validation-shaped.
        $exceptions->render(function (InvalidVariantException $e) use ($envelope): JsonResponse {
            return $envelope('validation_failed', $e->getMessage(), status: 422);
        });

        // Media's own optimistic-locking conflict.
        $exceptions->render(function (MediaConcurrencyConflictException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        // SECURITY:FILE_UPLOAD's content-derived MIME/size rejection —
        // validation-shaped, not a conflict.
        $exceptions->render(function (UnsupportedMediaTypeException $e) use ($envelope): JsonResponse {
            return $envelope('validation_failed', $e->getMessage(), status: 422);
        });

        // Inventory's own optimistic-locking conflict (Warehouse) and
        // restrictOnDelete guard (a warehouse with stock items).
        $exceptions->render(function (InventoryConcurrencyConflictException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        $exceptions->render(function (InventoryDependentRecordsExistException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        // "Concurrent checkout reservations never oversell" — insufficient
        // stock is a conflict with the item's current available quantity.
        $exceptions->render(function (InsufficientStockException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        $exceptions->render(function (InvalidReservationStateException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        $exceptions->render(function (InvalidTransferStateException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        // Customers' own optimistic-locking conflict.
        $exceptions->render(function (CustomersConcurrencyConflictException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        // Pricing's own optimistic-locking conflict.
        $exceptions->render(function (PricingConcurrencyConflictException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        // Pricing's restrictOnDelete guards (a TaxZone or TaxClass still
        // referenced by a TaxRate) and its currency-change guard once a
        // PriceList has priced entries.
        $exceptions->render(function (PricingDependentRecordsExistException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        // Localization & Currency's own optimistic-locking conflict.
        $exceptions->render(function (LocalizationConcurrencyConflictException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        // Single-default-locale and single-base-currency invariants —
        // well-formed requests that violate a business rule, not a
        // validation or version-conflict failure.
        $exceptions->render(function (CannotRemoveDefaultLocaleException $e) use ($envelope): JsonResponse {
            return $envelope('unprocessable_entity', $e->getMessage(), status: 422);
        });

        $exceptions->render(function (CannotRemoveBaseCurrencyException $e) use ($envelope): JsonResponse {
            return $envelope('unprocessable_entity', $e->getMessage(), status: 422);
        });

        // Installer's self-lock — the installation resource already exists.
        $exceptions->render(function (AlreadyInstalledException $e) use ($envelope): JsonResponse {
            return $envelope('conflict', $e->getMessage(), status: 409);
        });

        // A fresh database that has been migrated but not yet seeded — the
        // platform itself isn't ready, not a fault of the caller's request.
        $exceptions->render(function (AdministratorRoleMissingException $e) use ($envelope): JsonResponse {
            return $envelope('service_unavailable', $e->getMessage(), status: 503);
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
