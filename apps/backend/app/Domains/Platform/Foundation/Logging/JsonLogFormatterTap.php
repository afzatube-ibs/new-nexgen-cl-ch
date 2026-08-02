<?php

declare(strict_types=1);

namespace App\Domains\Platform\Foundation\Logging;

use Illuminate\Log\Logger;
use Monolog\Formatter\JsonFormatter;
use Monolog\Handler\FormattableHandlerInterface;

/**
 * Applied to the "structured" log channel (config/logging.php) to make
 * ENGINEERING:LOGGING_PRINCIPLES concrete: logs must be genuinely
 * consumable by whatever the operator ingests them with, not merely
 * human-readable free text. Laravel's Context (correlation_id — see
 * AssignCorrelationId — and anything else added to it) is automatically
 * merged into every record's "extra" data, so a JSON-formatted line
 * already carries it without any per-log-call plumbing.
 */
final class JsonLogFormatterTap
{
    public function __invoke(Logger $logger): void
    {
        foreach ($logger->getHandlers() as $handler) {
            // Not every Monolog handler formats records (some, like a raw
            // socket handler, don't use a formatter at all) — this check is
            // the correct behavior, not a workaround: a handler this tap
            // can't format is simply left as-is rather than the tap
            // assuming every handler shares the same capability.
            if ($handler instanceof FormattableHandlerInterface) {
                $handler->setFormatter(new JsonFormatter);
            }
        }
    }
}
