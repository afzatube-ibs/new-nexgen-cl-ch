<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Http\Requests;

use App\Domains\Platform\Appearance\Models\StoreAppearance;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class UpdateStoreAppearanceRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'logo_media_id' => ['sometimes', 'nullable', 'uuid', 'exists:media_assets,id'],
            'favicon_media_id' => ['sometimes', 'nullable', 'uuid', 'exists:media_assets,id'],

            'primary_color' => ['sometimes', 'nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'secondary_color' => ['sometimes', 'nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'accent_color' => ['sometimes', 'nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],

            'border_radius' => ['sometimes', Rule::in([
                StoreAppearance::RADIUS_NONE, StoreAppearance::RADIUS_SM, StoreAppearance::RADIUS_MD,
                StoreAppearance::RADIUS_LG, StoreAppearance::RADIUS_FULL,
            ])],
            'typography_preset' => ['sometimes', Rule::in(StoreAppearance::TYPOGRAPHY_PRESETS)],
            'button_style' => ['sometimes', Rule::in([
                StoreAppearance::BUTTON_STYLE_SOLID, StoreAppearance::BUTTON_STYLE_OUTLINE, StoreAppearance::BUTTON_STYLE_SOFT,
            ])],

            'announcement_enabled' => ['sometimes', 'boolean'],
            'announcement_text' => ['sometimes', 'nullable', 'string', 'max:255'],

            'whatsapp_number' => ['sometimes', 'nullable', 'string', 'max:32'],
            'messenger_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'facebook_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'instagram_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'tiktok_url' => ['sometimes', 'nullable', 'url', 'max:255'],
            'youtube_url' => ['sometimes', 'nullable', 'url', 'max:255'],

            'business_hours' => ['sometimes', 'nullable', 'array'],
            'business_hours.*.day' => ['required_with:business_hours', 'string', Rule::in(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])],
            'business_hours.*.open' => ['nullable', 'date_format:H:i'],
            'business_hours.*.close' => ['nullable', 'date_format:H:i'],
            'business_hours.*.closed' => ['sometimes', 'boolean'],

            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
