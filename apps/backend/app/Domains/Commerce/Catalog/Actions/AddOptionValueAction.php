<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Option;
use App\Domains\Commerce\Catalog\Models\OptionValue;
use App\Domains\Commerce\Catalog\Support\SlugGenerator;
use Illuminate\Support\Facades\DB;

/**
 * OptionValue is part of Option's aggregate (DATA:AGGREGATE_BOUNDARIES) —
 * it is only ever added, changed, or removed through its owning Option,
 * which is why this and its sibling actions take the parent Option's
 * expected_version rather than the value having one of its own.
 */
final readonly class AddOptionValueAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Option $option, string $value, int $expectedOptionVersion, ?string $actorId): OptionValue
    {
        return DB::transaction(function () use ($option, $value, $expectedOptionVersion, $actorId) {
            $option->assertVersionMatches($expectedOptionVersion);

            $slug = SlugGenerator::unique($value, OptionValue::query()->where('option_id', $option->id), 'slug');
            $optionValue = $option->values()->create(['value' => $value, 'slug' => $slug]);

            $this->auditLogger->log(
                action: 'option_value.added',
                actorId: $actorId,
                targetType: Option::class,
                targetId: $option->id,
                after: ['option_value_id' => $optionValue->id, 'value' => $value],
            );

            return $optionValue;
        });
    }
}
