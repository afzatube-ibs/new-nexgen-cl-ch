<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Reviews\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * `POST /reviews` — `customer.guard` (a real, authenticated Customer
 * only, never a guest/anonymous path — see `Actions\CreateReviewAction`'s
 * own docblock). `product_id` is a plain, unvalidated-against-Catalog
 * UUID — this module has no code-level dependency on Catalog to check it
 * against (mirroring `order_items.product_id`'s own identical stance); a
 * review against a nonexistent product is a real, honest possibility a
 * merchant would need to notice and reject manually, not something this
 * request can catch.
 */
final class CreateReviewRequest extends FormRequest
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
            'product_id' => ['required', 'uuid'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'title' => ['nullable', 'string', 'max:255'],
            'body' => ['required', 'string', 'min:10', 'max:5000'],
        ];
    }
}
