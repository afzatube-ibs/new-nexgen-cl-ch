<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Actions;

use App\Domains\Commerce\Catalog\Audit\AuditLogger;
use App\Domains\Commerce\Catalog\Models\Option;
use Illuminate\Support\Facades\DB;

final readonly class RestoreOptionAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Option $option, ?string $actorId): Option
    {
        return DB::transaction(function () use ($option, $actorId) {
            $option->restore();

            $this->auditLogger->log(
                action: 'option.restored',
                actorId: $actorId,
                targetType: Option::class,
                targetId: $option->id,
                after: $option->only(['code', 'name']),
            );

            return $option;
        });
    }
}
