<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Option;
use Illuminate\Support\Facades\DB;

final readonly class CreateOptionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Option
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $option = Option::query()->create($attributes);

            $this->auditLogger->log(
                action: 'option.created',
                actorId: $actorId,
                targetType: Option::class,
                targetId: $option->id,
                after: $option->only(['code', 'name', 'position']),
            );

            return $option;
        });
    }
}
