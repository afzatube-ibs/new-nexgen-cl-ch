<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Http\Resources;

use App\Domains\Platform\Appearance\Models\StoreAppearance;
use App\Domains\Platform\Media\Http\Resources\MediaAssetResource;
use App\Domains\Platform\Media\Models\MediaAsset;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin StoreAppearance
 */
final class StoreAppearanceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'storeId' => $this->store_id,
            'logo' => $this->whenLoaded('logoMedia', fn () => $this->logoMedia ? new MediaAssetResource($this->logoMedia) : null),
            'favicon' => $this->whenLoaded('faviconMedia', fn () => $this->faviconMedia ? new MediaAssetResource($this->faviconMedia) : null),
            'primaryColor' => $this->primary_color,
            'secondaryColor' => $this->secondary_color,
            'accentColor' => $this->accent_color,
            'borderRadius' => $this->border_radius,
            'typographyPreset' => $this->typography_preset,
            'buttonStyle' => $this->button_style,
            'announcementEnabled' => $this->announcement_enabled,
            'announcementText' => $this->announcement_text,
            'social' => [
                'whatsappNumber' => $this->whatsapp_number,
                'messengerUrl' => $this->messenger_url,
                'facebookUrl' => $this->facebook_url,
                'instagramUrl' => $this->instagram_url,
                'tiktokUrl' => $this->tiktok_url,
                'youtubeUrl' => $this->youtube_url,
            ],
            'businessHours' => $this->business_hours,
            'isPublished' => $this->isPublished(),
            'hasUnpublishedChanges' => $this->hasUnpublishedChanges(),
            'publishedAt' => $this->published_at?->toIso8601String(),
            'publishedBy' => $this->published_by,
            // The real values a customer's own Storefront should ever read
            // — never the draft fields above, which may include an
            // in-progress, unreviewed edit. `null` when nothing has ever
            // been published; the Gateway's own consumer (`routes/
            // branding.ts`) is responsible for a sensible, honest default
            // in that case, never fabricating a "published" look that was
            // never actually published.
            'published' => $this->published_snapshot ? $this->publishedView() : null,
            'version' => $this->lock_version,
            'createdAt' => $this->created_at?->toIso8601String(),
            'updatedAt' => $this->updated_at?->toIso8601String(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function publishedView(): array
    {
        /** @var array<string, mixed> $snapshot */
        $snapshot = $this->published_snapshot;

        $logo = $snapshot['logo_media_id'] ?? null ? MediaAsset::query()->find($snapshot['logo_media_id']) : null;
        $favicon = $snapshot['favicon_media_id'] ?? null ? MediaAsset::query()->find($snapshot['favicon_media_id']) : null;

        return [
            'logo' => $logo ? new MediaAssetResource($logo) : null,
            'favicon' => $favicon ? new MediaAssetResource($favicon) : null,
            'primaryColor' => $snapshot['primary_color'] ?? null,
            'secondaryColor' => $snapshot['secondary_color'] ?? null,
            'accentColor' => $snapshot['accent_color'] ?? null,
            'borderRadius' => $snapshot['border_radius'] ?? StoreAppearance::RADIUS_MD,
            'typographyPreset' => $snapshot['typography_preset'] ?? 'inter-default',
            'buttonStyle' => $snapshot['button_style'] ?? StoreAppearance::BUTTON_STYLE_SOLID,
            'announcementEnabled' => $snapshot['announcement_enabled'] ?? false,
            'announcementText' => $snapshot['announcement_text'] ?? null,
            'social' => [
                'whatsappNumber' => $snapshot['whatsapp_number'] ?? null,
                'messengerUrl' => $snapshot['messenger_url'] ?? null,
                'facebookUrl' => $snapshot['facebook_url'] ?? null,
                'instagramUrl' => $snapshot['instagram_url'] ?? null,
                'tiktokUrl' => $snapshot['tiktok_url'] ?? null,
                'youtubeUrl' => $snapshot['youtube_url'] ?? null,
            ],
            'businessHours' => $snapshot['business_hours'] ?? null,
        ];
    }
}
