<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/** `POST /reviews/{id}/respond` — `reviews.reviews.manage`. A real merchant reply is editable: calling this again on the same review replaces the prior response, rather than stacking a thread of responses (`ReviewCard.tsx`'s own contract has room for exactly one). */
final class RespondToReviewRequest extends FormRequest
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
            'body' => ['required', 'string', 'max:2000'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }
}
