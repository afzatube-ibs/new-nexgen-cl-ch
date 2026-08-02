<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Exceptions\DependentRecordsExistException;
use App\Domains\Commerce\Catalog\Models\Option;
use App\Domains\Commerce\Catalog\Models\OptionValue;
use Illuminate\Support\Facades\DB;

final readonly class RemoveOptionValueAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Option $option, OptionValue $optionValue, int $expectedOptionVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($option, $optionValue, $expectedOptionVersion, $actorId) {
            $option->assertVersionMatches($expectedOptionVersion);

            if (DB::table('product_variant_option_values')->where('option_value_id', $optionValue->id)->exists()) {
                throw new DependentRecordsExistException(
                    OptionValue::class,
                    $optionValue->id,
                    'one or more product variants still use it.',
                );
            }

            $before = ['value' => $optionValue->value];
            $optionValue->delete();

            $this->auditLogger->log(
                action: 'option_value.removed',
                actorId: $actorId,
                targetType: Option::class,
                targetId: $option->id,
                before: $before + ['option_value_id' => $optionValue->id],
            );
        });
    }
}
