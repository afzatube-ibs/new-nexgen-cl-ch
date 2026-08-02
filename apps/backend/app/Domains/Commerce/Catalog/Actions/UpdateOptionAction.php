<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Option;
use Illuminate\Support\Facades\DB;

final readonly class UpdateOptionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Option $option, array $changes, int $expectedVersion, ?string $actorId): Option
    {
        return DB::transaction(function () use ($option, $changes, $expectedVersion, $actorId) {
            $option->assertVersionMatches($expectedVersion);

            $before = $option->only(['code', 'name', 'position']);
            $option->fill($changes)->save();
            $after = $option->only(['code', 'name', 'position']);

            $this->auditLogger->log(
                action: 'option.updated',
                actorId: $actorId,
                targetType: Option::class,
                targetId: $option->id,
                before: $before,
                after: $after,
            );

            return $option;
        });
    }
}
