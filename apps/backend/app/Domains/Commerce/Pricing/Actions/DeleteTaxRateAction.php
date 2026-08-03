<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Pricing\Actions;

use App\Domains\Commerce\Pricing\Audit\AuditLogger;
use App\Domains\Commerce\Pricing\Models\TaxRate;
use Illuminate\Support\Facades\DB;

/**
 * Soft-deletes a TaxRate — DATA:LIFECYCLE's Deleted state. No dependent
 * -records guard needed: nothing in this module references a TaxRate by
 * identifier (Checkout/Orders, once built, will resolve a rate through
 * Actions\CalculateTaxAction's lookup at the moment tax is calculated,
 * never store a persisted reference to this row).
 */
final readonly class DeleteTaxRateAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(TaxRate $rate, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($rate, $expectedVersion, $actorId) {
            $rate->assertVersionMatches($expectedVersion);

            $before = $rate->only(['tax_zone_id', 'tax_class_id', 'rate']);
            $rate->delete();

            $this->auditLogger->log(
                action: 'tax_rate.deleted',
                actorId: $actorId,
                targetType: TaxRate::class,
                targetId: $rate->id,
                before: $before,
            );
        });
    }
}
