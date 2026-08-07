<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Http\Requests;

use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The HTTP-facing half of "Send notification" — the master plan's own
 * Public Contract, exposed here for an operator to manually queue a
 * notification (a one-off announcement, a support follow-up) alongside
 * the event-triggered path every app/Listeners/Send*.php class uses.
 */
final class QueueNotificationRequest extends FormRequest
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
            'channel' => ['required', Rule::in(NotificationTemplate::CHANNELS)],
            'recipient' => ['required', 'string', 'max:255'],
            'template_code' => ['sometimes', 'nullable', 'string', 'max:150'],
            'merge_data' => ['sometimes', 'array'],
            'locale' => ['sometimes', 'string', 'max:10'],
            'subject' => ['sometimes', 'nullable', 'string', 'max:255'],
            'body' => ['required_without:template_code', 'nullable', 'string'],
        ];
    }
}
