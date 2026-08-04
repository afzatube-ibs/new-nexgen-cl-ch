<?php

declare(strict_types=1);

use App\Domains\Commerce\Promotions\Actions\EvaluatePromotionsAction;
use App\Domains\Commerce\Promotions\Models\Coupon;
use App\Domains\Commerce\Promotions\Models\Promotion;
use App\Domains\Commerce\Promotions\Models\PromotionCondition;
use App\Domains\Commerce\Promotions\Models\PromotionRedemption;
use App\Domains\Commerce\Promotions\Support\CartContext;
use App\Domains\Commerce\Promotions\Support\CartLineItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

function promotionsCart(array $overrides = []): CartContext
{
    return new CartContext(
        items: $overrides['items'] ?? [new CartLineItem(productId: (string) Str::uuid(), categoryIds: [], quantity: 1, unitPrice: '100.00')],
        subtotal: $overrides['subtotal'] ?? '100.00',
        currencyCode: $overrides['currencyCode'] ?? 'USD',
        customerId: $overrides['customerId'] ?? null,
        storeId: $overrides['storeId'] ?? null,
        couponCode: $overrides['couponCode'] ?? null,
    );
}

it('applies a cart-wide percentage discount when the promotion has no conditions', function () {
    Promotion::factory()->percentage('10.0000')->create();

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart(['subtotal' => '100.00']));

    expect($result->appliedPromotions)->toHaveCount(1);
    expect($result->totalDiscount)->toBe('10.0000');
});

it('scopes a percentage discount to only the matching product line item', function () {
    $matchingProductId = (string) Str::uuid();
    $promotion = Promotion::factory()->percentage('50.0000')->create();
    $promotion->conditions()->create(['condition_type' => PromotionCondition::TYPE_PRODUCT, 'reference_id' => $matchingProductId]);

    $cart = promotionsCart([
        'items' => [
            new CartLineItem(productId: $matchingProductId, categoryIds: [], quantity: 1, unitPrice: '40.00'),
            new CartLineItem(productId: (string) Str::uuid(), categoryIds: [], quantity: 1, unitPrice: '60.00'),
        ],
        'subtotal' => '100.00',
    ]);

    $result = (new EvaluatePromotionsAction)->execute($cart);

    expect($result->totalDiscount)->toBe('20.0000');
});

it('caps a fixed-amount discount at the eligible subtotal', function () {
    Promotion::factory()->fixedAmount('500.0000', 'USD')->create();

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart(['subtotal' => '30.00']));

    expect($result->totalDiscount)->toBe('30.0000');
});

it('signals free shipping without contributing a monetary discount', function () {
    Promotion::factory()->freeShipping()->create();

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart());

    expect($result->freeShipping)->toBeTrue();
    expect($result->appliedPromotions)->toHaveCount(1);
    expect($result->totalDiscount)->toBe('0.0000');
});

it('applies buy-X-get-Y once the buy quantity threshold is met in cart', function () {
    $productId = (string) Str::uuid();
    Promotion::factory()->buyXGetY(buyQuantity: 2, getQuantity: 1, getDiscountPercentage: '100.00')->create([
        'buy_x_target_type' => Promotion::TARGET_PRODUCT,
        'buy_x_target_id' => $productId,
        'get_y_target_type' => Promotion::TARGET_PRODUCT,
        'get_y_target_id' => $productId,
    ]);

    $cart = promotionsCart([
        'items' => [new CartLineItem(productId: $productId, categoryIds: [], quantity: 3, unitPrice: '10.00')],
        'subtotal' => '30.00',
    ]);

    $result = (new EvaluatePromotionsAction)->execute($cart);

    // 3 units / buy 2 = 1 eligible set -> 1 unit discounted 100% at $10.
    expect($result->totalDiscount)->toBe('10.0000');
});

it('does not apply buy-X-get-Y below the buy quantity threshold', function () {
    $productId = (string) Str::uuid();
    Promotion::factory()->buyXGetY(buyQuantity: 3, getQuantity: 1, getDiscountPercentage: '100.00')->create([
        'buy_x_target_type' => Promotion::TARGET_PRODUCT,
        'buy_x_target_id' => $productId,
        'get_y_target_type' => Promotion::TARGET_PRODUCT,
        'get_y_target_id' => $productId,
    ]);

    $cart = promotionsCart([
        'items' => [new CartLineItem(productId: $productId, categoryIds: [], quantity: 2, unitPrice: '10.00')],
        'subtotal' => '20.00',
    ]);

    $result = (new EvaluatePromotionsAction)->execute($cart);

    expect($result->appliedPromotions)->toHaveCount(0);
    expect($result->totalDiscount)->toBe('0.0000');
});

it('stacks every eligible stackable promotion together', function () {
    Promotion::factory()->stackable()->percentage('10.0000')->create();
    Promotion::factory()->stackable()->fixedAmount('5.0000', 'USD')->create();

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart(['subtotal' => '100.00']));

    expect($result->appliedPromotions)->toHaveCount(2);
    expect($result->totalDiscount)->toBe('15.0000');
});

it('applies only the highest-priority non-stackable promotion among competing ones', function () {
    Promotion::factory()->percentage('10.0000')->create(['priority' => 1]);
    $winner = Promotion::factory()->percentage('20.0000')->create(['priority' => 5]);

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart(['subtotal' => '100.00']));

    expect($result->appliedPromotions)->toHaveCount(1);
    expect($result->appliedPromotions[0]->promotionId)->toBe($winner->id);
    expect($result->totalDiscount)->toBe('20.0000');
});

it('combines a stackable promotion with the non-stackable winner', function () {
    Promotion::factory()->stackable()->fixedAmount('5.0000', 'USD')->create();
    Promotion::factory()->percentage('10.0000')->create(['priority' => 1]);
    Promotion::factory()->percentage('20.0000')->create(['priority' => 5]);

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart(['subtotal' => '100.00']));

    expect($result->appliedPromotions)->toHaveCount(2);
    expect($result->totalDiscount)->toBe('25.0000');
});

it('excludes a promotion outside its schedule window', function () {
    Promotion::factory()->percentage('10.0000')->create([
        'starts_at' => now()->addDay(),
    ]);

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart());

    expect($result->appliedPromotions)->toHaveCount(0);
});

it('excludes an archived promotion', function () {
    Promotion::factory()->percentage('10.0000')->archived()->create();

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart());

    expect($result->appliedPromotions)->toHaveCount(0);
});

it('excludes an automatic promotion once its global usage limit is reached', function () {
    Promotion::factory()->percentage('10.0000')->create(['usage_limit_global' => 5, 'usage_count_global' => 5]);

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart());

    expect($result->appliedPromotions)->toHaveCount(0);
});

it('excludes a promotion once a customer has reached their per-customer usage limit', function () {
    $customerId = (string) Str::uuid();
    $promotion = Promotion::factory()->percentage('10.0000')->create(['usage_limit_per_customer' => 1]);
    PromotionRedemption::factory()->create(['promotion_id' => $promotion->id, 'customer_id' => $customerId]);

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart(['customerId' => $customerId]));

    expect($result->appliedPromotions)->toHaveCount(0);
});

it('excludes a coupon-gated promotion when no coupon code is supplied', function () {
    Promotion::factory()->percentage('10.0000')->requiresCoupon()->create();

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart());

    expect($result->appliedPromotions)->toHaveCount(0);
});

it('includes a coupon-gated promotion when a matching active coupon code is supplied', function () {
    $promotion = Promotion::factory()->percentage('10.0000')->requiresCoupon()->create();
    Coupon::factory()->create(['promotion_id' => $promotion->id, 'code' => 'SAVE10']);

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart(['couponCode' => 'save10']));

    expect($result->appliedPromotions)->toHaveCount(1);
});

it('excludes a coupon-gated promotion once the coupon itself has reached its usage limit', function () {
    $promotion = Promotion::factory()->percentage('10.0000')->requiresCoupon()->create();
    Coupon::factory()->create([
        'promotion_id' => $promotion->id,
        'code' => 'SAVE10',
        'usage_limit_global' => 1,
        'usage_count_global' => 1,
    ]);

    $result = (new EvaluatePromotionsAction)->execute(promotionsCart(['couponCode' => 'SAVE10']));

    expect($result->appliedPromotions)->toHaveCount(0);
});

it('requires every condition_type present to match (AND across types)', function () {
    $matchingCustomerId = (string) Str::uuid();
    $matchingProductId = (string) Str::uuid();
    $promotion = Promotion::factory()->percentage('10.0000')->create();
    $promotion->conditions()->create(['condition_type' => PromotionCondition::TYPE_PRODUCT, 'reference_id' => $matchingProductId]);
    $promotion->conditions()->create(['condition_type' => PromotionCondition::TYPE_CUSTOMER, 'reference_id' => $matchingCustomerId]);

    $cart = promotionsCart([
        'items' => [new CartLineItem(productId: $matchingProductId, categoryIds: [], quantity: 1, unitPrice: '100.00')],
        'customerId' => (string) Str::uuid(),
    ]);

    $result = (new EvaluatePromotionsAction)->execute($cart);

    expect($result->appliedPromotions)->toHaveCount(0);
});

it('matches any condition of the same condition_type (OR within type)', function () {
    $productA = (string) Str::uuid();
    $productB = (string) Str::uuid();
    $promotion = Promotion::factory()->percentage('10.0000')->create();
    $promotion->conditions()->create(['condition_type' => PromotionCondition::TYPE_PRODUCT, 'reference_id' => $productA]);
    $promotion->conditions()->create(['condition_type' => PromotionCondition::TYPE_PRODUCT, 'reference_id' => $productB]);

    $cart = promotionsCart([
        'items' => [new CartLineItem(productId: $productB, categoryIds: [], quantity: 1, unitPrice: '100.00')],
    ]);

    $result = (new EvaluatePromotionsAction)->execute($cart);

    expect($result->appliedPromotions)->toHaveCount(1);
});

it('enforces a minimum-order-amount condition', function () {
    $promotion = Promotion::factory()->percentage('10.0000')->create();
    $promotion->conditions()->create(['condition_type' => PromotionCondition::TYPE_MINIMUM_ORDER_AMOUNT, 'numeric_value' => '200.00']);

    $belowThreshold = (new EvaluatePromotionsAction)->execute(promotionsCart(['subtotal' => '100.00']));
    $atThreshold = (new EvaluatePromotionsAction)->execute(promotionsCart(['subtotal' => '200.00']));

    expect($belowThreshold->appliedPromotions)->toHaveCount(0);
    expect($atThreshold->appliedPromotions)->toHaveCount(1);
});
