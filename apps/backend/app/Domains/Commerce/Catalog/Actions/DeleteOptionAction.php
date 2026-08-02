<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Exceptions\DependentRecordsExistException;
use App\Domains\Commerce\Catalog\Models\Option;
use Illuminate\Support\Facades\DB;

final readonly class DeleteOptionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Option $option, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($option, $expectedVersion, $actorId) {
            $option->assertVersionMatches($expectedVersion);

            if (DB::table('product_options')->where('option_id', $option->id)->exists()) {
                throw new DependentRecordsExistException(
                    Option::class,
                    $option->id,
                    'one or more products still use it as a variant dimension.',
                );
            }

            $before = $option->only(['code', 'name']);
            $option->values()->delete();
            $option->delete();

            $this->auditLogger->log(
                action: 'option.deleted',
                actorId: $actorId,
                targetType: Option::class,
                targetId: $option->id,
                before: $before,
            );
        });
    }
}
