<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Actions;

use App\Domains\Platform\Localization\Audit\AuditLogger;
use App\Domains\Platform\Localization\Exceptions\CannotRemoveDefaultLocaleException;
use App\Domains\Platform\Localization\Models\Locale;
use Illuminate\Support\Facades\DB;

/**
 * Transitions a Locale to DATA:LIFECYCLE's Archived state — an intentional,
 * recorded action, distinct from deletion (DeleteLocaleAction). Refuses to
 * archive the default locale — see CannotRemoveDefaultLocaleException's
 * docblock.
 */
final readonly class ArchiveLocaleAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(Locale $locale, int $expectedVersion, ?string $actorId): Locale
    {
        return DB::transaction(function () use ($locale, $expectedVersion, $actorId) {
            $locale->assertVersionMatches($expectedVersion);

            if ($locale->is_default) {
                throw new CannotRemoveDefaultLocaleException;
            }

            $previousStatus = $locale->status;
            $locale->status = Locale::STATUS_ARCHIVED;
            $locale->save();

            $this->auditLogger->log(
                action: 'locale.archived',
                actorId: $actorId,
                targetType: Locale::class,
                targetId: $locale->id,
                before: ['status' => $previousStatus],
                after: ['status' => $locale->status],
            );

            return $locale;
        });
    }
}
