<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Models;

use App\Domains\Platform\Appearance\Models\Concerns\HasOptimisticLocking;
use App\Domains\Platform\Foundation\EventBus\TenantId;
use App\Domains\Platform\Media\Models\MediaAsset;
use Database\Factories\StoreAppearanceFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * MODULE:APPEARANCE's aggregate root — one row per store, holding the
 * merchant's own brand identity (`planning/architecture/
 * APPEARANCE_WORKSPACE_SPECIFICATION.md` §4.2(a), §7). See the
 * `store_appearances` migration's own docblock for why this is a separate
 * table from `Store`, and for the real `published_snapshot`-based
 * draft/published mechanism the Actions in this module implement.
 *
 * @property string $id
 * @property string $tenant_id
 * @property string $store_id
 * @property string|null $logo_media_id
 * @property string|null $favicon_media_id
 * @property string|null $primary_color
 * @property string|null $secondary_color
 * @property string|null $accent_color
 * @property string $border_radius
 * @property string $typography_preset
 * @property string $button_style
 * @property bool $announcement_enabled
 * @property string|null $announcement_text
 * @property string|null $whatsapp_number
 * @property string|null $messenger_url
 * @property string|null $facebook_url
 * @property string|null $instagram_url
 * @property string|null $tiktok_url
 * @property string|null $youtube_url
 * @property array<string, mixed>|null $business_hours
 * @property array<string, mixed>|null $published_snapshot
 * @property Carbon|null $published_at
 * @property string|null $published_by
 * @property int $lock_version
 */
final class StoreAppearance extends Model
{
    /** @use HasFactory<StoreAppearanceFactory> */
    use HasFactory, HasOptimisticLocking, HasUuids;

    public const string RADIUS_NONE = 'none';

    public const string RADIUS_SM = 'sm';

    public const string RADIUS_MD = 'md';

    public const string RADIUS_LG = 'lg';

    public const string RADIUS_FULL = 'full';

    public const string BUTTON_STYLE_SOLID = 'solid';

    public const string BUTTON_STYLE_OUTLINE = 'outline';

    public const string BUTTON_STYLE_SOFT = 'soft';

    /** The curated, finite typography-preset list — `APPEARANCE_WORKSPACE_SPECIFICATION.md` §7.4's own "curated list, not a raw font-picker" rule. Expandable by a future release without a schema change (a plain string column). */
    public const array TYPOGRAPHY_PRESETS = [
        'inter-default', 'system-sans', 'playfair-elegant', 'poppins-modern', 'jakarta-friendly',
    ];

    /** Every real field a merchant can edit on this aggregate — used by the Update Action to compute a real before/after audit diff, matching `StoreConfiguration\Actions\UpdateStoreAction`'s own `TRACKED_FIELDS` pattern. */
    public const array TRACKED_FIELDS = [
        'logo_media_id', 'favicon_media_id',
        'primary_color', 'secondary_color', 'accent_color',
        'border_radius', 'typography_preset', 'button_style',
        'announcement_enabled', 'announcement_text',
        'whatsapp_number', 'messenger_url', 'facebook_url', 'instagram_url', 'tiktok_url', 'youtube_url',
        'business_hours',
    ];

    // `store_id` is deliberately fillable too, separately from
    // TRACKED_FIELDS above: it is the structural FK `GetOrCreateStore
    // AppearanceAction`'s own `firstOrCreate(['store_id' => ...])` call
    // relies on flowing through mass assignment on create — real bug
    // found live (this Pack's own first end-to-end verification): without
    // this, `store_id` was silently dropped, and every fresh row failed
    // its real NOT NULL constraint. Never merchant-editable via the
    // Branding screen — TRACKED_FIELDS alone is what the Update Action's
    // audit diff and the Http Request's validation rules cover.
    protected $fillable = ['store_id', ...self::TRACKED_FIELDS];

    protected function casts(): array
    {
        return [
            'announcement_enabled' => 'boolean',
            'business_hours' => 'array',
            'published_snapshot' => 'array',
            'published_at' => 'datetime',
        ];
    }

    /**
     * @return StoreAppearanceFactory
     */
    protected static function newFactory(): Factory
    {
        return StoreAppearanceFactory::new();
    }

    protected static function booted(): void
    {
        self::creating(function (self $appearance): void {
            $appearance->tenant_id ??= TenantId::DEFAULT;
            $appearance->border_radius ??= self::RADIUS_MD;
            $appearance->typography_preset ??= 'inter-default';
            $appearance->button_style ??= self::BUTTON_STYLE_SOLID;
            $appearance->announcement_enabled ??= false;
            $appearance->lock_version ??= 1;
        });
    }

    /**
     * Read-only, per `MediaAsset`'s own docblock — "the one class other
     * modules are expected to read directly (never write) when they hold
     * a `media_id` reference."
     *
     * @return BelongsTo<MediaAsset, $this>
     */
    public function logoMedia(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'logo_media_id');
    }

    /**
     * @return BelongsTo<MediaAsset, $this>
     */
    public function faviconMedia(): BelongsTo
    {
        return $this->belongsTo(MediaAsset::class, 'favicon_media_id');
    }

    public function isPublished(): bool
    {
        return $this->published_snapshot !== null;
    }

    /** True if the current draft columns differ from the last published snapshot (or a snapshot has never been published at all) — the real, honest "unpublished changes" signal `APPEARANCE_WORKSPACE_SPECIFICATION.md` §3.3/§10 names. */
    public function hasUnpublishedChanges(): bool
    {
        if ($this->published_snapshot === null) {
            return true;
        }

        $current = $this->only(self::TRACKED_FIELDS);

        foreach ($current as $key => $value) {
            if (($this->published_snapshot[$key] ?? null) !== $value) {
                return true;
            }
        }

        return false;
    }
}
