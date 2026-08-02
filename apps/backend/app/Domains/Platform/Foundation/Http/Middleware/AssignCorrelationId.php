<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Context;
use Ramsey\Uuid\Uuid;
use Symfony\Component\HttpFoundation\Response;

/**
 * Establishes the correlation identifier every request carries, per
 * API:CORRELATION: "ties together everything that happens as a consequence
 * of it — the request itself, any domain events it causes to be published,
 * and any error recorded because of it."
 *
 * A caller-supplied X-Correlation-Id is honored (so a caller tracing its
 * own multi-request workflow can thread one identifier through), otherwise
 * one is generated. Either way it is placed on Laravel's Context facade,
 * which is automatically merged into every log record written during this
 * request/job's lifecycle — this is what makes ENGINEERING:LOGGING_
 * PRINCIPLES's requirement real rather than aspirational: the identifier
 * genuinely reaches log output, not just the API response.
 */
final class AssignCorrelationId
{
    public const string HEADER = 'X-Correlation-Id';

    public function handle(Request $request, Closure $next): Response
    {
        $correlationId = $this->resolve($request);

        Context::add('correlation_id', $correlationId);

        /** @var Response $response */
        $response = $next($request);

        $response->headers->set(self::HEADER, $correlationId);

        return $response;
    }

    private function resolve(Request $request): string
    {
        $supplied = $request->header(self::HEADER);

        if (is_string($supplied) && Uuid::isValid($supplied)) {
            return $supplied;
        }

        return Uuid::uuid7()->toString();
    }
}
