<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Actions;

use App\Domains\Platform\Localization\Audit\AuditLogger;
use App\Domains\Platform\Localization\Exceptions\CannotRemoveDefaultLocaleException;
use App\Domains\Platform\Localization\Models\Locale;
use Illuminate\Support\Facades\DB;

/**
 * Soft-deletes a Locale — DATA:LIFECYCLE's Deleted state. Refuses to
 * delete the default locale — see CannotRemoveDefaultLocaleException's
 * docblock.
 */
final readonly class DeleteLocaleAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Locale $locale, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($locale, $expectedVersion, $actorId) {
            $locale->assertVersionMatches($expectedVersion);

            if ($locale->is_default) {
                throw new CannotRemoveDefaultLocaleException;
            }

            $before = $locale->only(['code', 'name']);
            $locale->delete();

            $this->auditLogger->log(
                action: 'locale.deleted',
                actorId: $actorId,
                targetType: Locale::class,
                targetId: $locale->id,
                before: $before,
            );
        });
    }
}
