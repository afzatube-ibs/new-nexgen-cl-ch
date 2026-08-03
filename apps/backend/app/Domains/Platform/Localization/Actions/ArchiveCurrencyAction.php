<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Actions;

use App\Domains\Platform\Localization\Audit\AuditLogger;
use App\Domains\Platform\Localization\Exceptions\CannotRemoveBaseCurrencyException;
use App\Domains\Platform\Localization\Models\Currency;
use Illuminate\Support\Facades\DB;

/**
 * Transitions a Currency to DATA:LIFECYCLE's Archived state — an
 * intentional, recorded action, distinct from deletion
 * (DeleteCurrencyAction). Refuses to archive the base currency — see
 * CannotRemoveBaseCurrencyException's docblock.
 */
final readonly class ArchiveCurrencyAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Currency $currency, int $expectedVersion, ?string $actorId): Currency
    {
        return DB::transaction(function () use ($currency, $expectedVersion, $actorId) {
            $currency->assertVersionMatches($expectedVersion);

            if ($currency->is_base) {
                throw new CannotRemoveBaseCurrencyException;
            }

            $previousStatus = $currency->status;
            $currency->status = Currency::STATUS_ARCHIVED;
            $currency->save();

            $this->auditLogger->log(
                action: 'currency.archived',
                actorId: $actorId,
                targetType: Currency::class,
                targetId: $currency->id,
                before: ['status' => $previousStatus],
                after: ['status' => $currency->status],
            );

            return $currency;
        });
    }
}
