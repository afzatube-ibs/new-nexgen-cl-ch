<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Option;
use App\Domains\Commerce\Catalog\Models\OptionValue;
use Illuminate\Support\Facades\DB;

final readonly class UpdateOptionValueAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Option $option, OptionValue $optionValue, string $value, int $expectedOptionVersion, ?string $actorId): OptionValue
    {
        return DB::transaction(function () use ($option, $optionValue, $value, $expectedOptionVersion, $actorId) {
            $option->assertVersionMatches($expectedOptionVersion);

            $before = ['value' => $optionValue->value];
            $optionValue->update(['value' => $value]);

            $this->auditLogger->log(
                action: 'option_value.updated',
                actorId: $actorId,
                targetType: Option::class,
                targetId: $option->id,
                before: $before,
                after: ['option_value_id' => $optionValue->id, 'value' => $value],
            );

            return $optionValue;
        });
    }
}
