<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Http\Requests;

use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

final class CreateNotificationTemplateRequest extends FormRequest
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
            'code' => ['required', 'string', 'max:150'],
            'channel' => ['required', Rule::in(NotificationTemplate::CHANNELS)],
            'locale' => ['sometimes', 'string', 'max:10'],
            'subject' => ['sometimes', 'nullable', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
