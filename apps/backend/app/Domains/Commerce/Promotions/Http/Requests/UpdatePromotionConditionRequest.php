<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Promotions\Http\Requests;

use App\Domains\Commerce\Promotions\Models\PromotionCondition;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

final class UpdatePromotionConditionRequest extends FormRequest
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
            'condition_type' => ['sometimes', Rule::in([
                PromotionCondition::TYPE_PRODUCT,
                PromotionCondition::TYPE_CATEGORY,
                PromotionCondition::TYPE_CUSTOMER,
                PromotionCondition::TYPE_STORE,
                PromotionCondition::TYPE_MINIMUM_ORDER_AMOUNT,
            ])],
            'reference_id' => ['sometimes', 'nullable', 'uuid'],
            'numeric_value' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'expected_version' => ['required', 'integer', 'min:1'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var PromotionCondition|null $condition */
            $condition = $this->route('condition');
            $type = $this->input('condition_type', $condition?->condition_type);

            if ($type === PromotionCondition::TYPE_MINIMUM_ORDER_AMOUNT) {
                if ($this->input('numeric_value', $condition?->numeric_value) === null) {
                    $validator->errors()->add('numeric_value', 'A minimum-order-amount condition requires a numeric value.');
                }
            } elseif ($this->input('reference_id', $condition?->reference_id) === null) {
                $validator->errors()->add('reference_id', 'This condition type requires a reference id.');
            }
        });
    }
}
