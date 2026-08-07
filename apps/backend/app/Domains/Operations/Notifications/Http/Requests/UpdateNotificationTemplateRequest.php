<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class UpdateNotificationTemplateRequest extends FormRequest
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
            'subject' => ['sometimes', 'nullable', 'string', 'max:255'],
            'body' => ['sometimes', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
