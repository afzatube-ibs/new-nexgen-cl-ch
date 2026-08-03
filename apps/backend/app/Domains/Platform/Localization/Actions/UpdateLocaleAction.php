<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Actions;

use App\Domains\Platform\Localization\Audit\AuditLogger;
use App\Domains\Platform\Localization\Models\Locale;
use Illuminate\Support\Facades\DB;

/**
 * Enforces the single-default invariant: if `is_default` is being set true
 * in this update, every other Locale's `is_default` is cleared first, in
 * the same transaction — exactly one Locale may be default at a time.
 */
final readonly class UpdateLocaleAction
{
    private const array TRACKED_FIELDS = ['code', 'name', 'native_name', 'is_rtl', 'is_default'];

    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $changes
     */
    public function execute(Locale $locale, array $changes, int $expectedVersion, ?string $actorId): Locale
    {
        return DB::transaction(function () use ($locale, $changes, $expectedVersion, $actorId) {
            $locale->assertVersionMatches($expectedVersion);

            $before = $locale->only(self::TRACKED_FIELDS);

            if (($changes['is_default'] ?? false) === true) {
                Locale::query()->where('id', '!=', $locale->id)->update(['is_default' => false]);
            }

            $locale->fill($changes)->save();

            $this->auditLogger->log(
                action: 'locale.updated',
                actorId: $actorId,
                targetType: Locale::class,
                targetId: $locale->id,
                before: $before,
                after: $locale->only(self::TRACKED_FIELDS),
            );

            return $locale;
        });
    }
}
