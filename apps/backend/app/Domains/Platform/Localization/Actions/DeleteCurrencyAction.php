<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Actions;

use App\Domains\Platform\Localization\Audit\AuditLogger;
use App\Domains\Platform\Localization\Exceptions\CannotRemoveBaseCurrencyException;
use App\Domains\Platform\Localization\Models\Currency;
use Illuminate\Support\Facades\DB;

/**
 * Soft-deletes a Currency — DATA:LIFECYCLE's Deleted state. Refuses to
 * delete the base currency — see CannotRemoveBaseCurrencyException's
 * docblock.
 */
final readonly class DeleteCurrencyAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Currency $currency, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($currency, $expectedVersion, $actorId) {
            $currency->assertVersionMatches($expectedVersion);

            if ($currency->is_base) {
                throw new CannotRemoveBaseCurrencyException;
            }

            $before = $currency->only(['code', 'name']);
            $currency->delete();

            $this->auditLogger->log(
                action: 'currency.deleted',
                actorId: $actorId,
                targetType: Currency::class,
                targetId: $currency->id,
                before: $before,
            );
        });
    }
}
