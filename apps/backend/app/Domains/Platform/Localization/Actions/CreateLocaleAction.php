<?php

declare(strict_types=1);

namespace App\Domains\Platform\Localization\Actions;

use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use App\Domains\Platform\Localization\Audit\AuditLogger;
use App\Domains\Platform\Localization\Events\LocaleAdded;
use App\Domains\Platform\Localization\Models\Locale;
use Illuminate\Support\Facades\DB;

/**
 * Always creates a Locale as non-default (`is_default` is never accepted
 * here) — promoting a locale to default is a separate, explicit operator
 * action via Actions\UpdateLocaleAction, so the single-default invariant
 * has exactly one enforcement point rather than two.
 */
final readonly class CreateLocaleAction
{
    public function __construct(
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(array $attributes, ?string $actorId): Locale
    {
        return DB::transaction(function () use ($attributes, $actorId) {
            $locale = Locale::query()->create([
                'code' => $attributes['code'],
                'name' => $attributes['name'],
                'native_name' => $attributes['native_name'],
                'is_rtl' => $attributes['is_rtl'] ?? false,
            ]);

            $this->auditLogger->log(
                action: 'locale.added',
                actorId: $actorId,
                targetType: Locale::class,
                targetId: $locale->id,
                after: $this->snapshot($locale),
            );

            $this->eventBus->publish(new LocaleAdded(
                localeId: $locale->id,
                code: $locale->code,
                name: $locale->name,
            ));

            return $locale;
        });
    }

    /**
     * @return array<string, scalar>
     */
    private function snapshot(Locale $locale): array
    {
        return $locale->only(['code', 'name', 'native_name', 'is_rtl', 'is_default', 'status']);
    }
}
