<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Catalog\Models\Product;
use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Exceptions\CheckoutValidationException;
use App\Domains\Commerce\Checkout\Models\CheckoutItem;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Support\Facades\DB;

/**
 * "Cart validation" made concrete for the add-item step: the referenced
 * product must exist and be active, per Catalog — the one place this
 * module reads Catalog on the caller's behalf, since a cart line's
 * identity (name, category membership) has to be resolved from
 * somewhere, and Checkout owns none of that data itself.
 *
 * Adding a SKU already present in the cart increases its quantity rather
 * than creating a second line — the conventional "add to cart" merge
 * behavior, and the reason `checkout_items` carries a unique
 * (checkout_session_id, sku) index.
 */
final readonly class AddCheckoutItemAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $attributes
     */
    public function execute(CheckoutSession $session, array $attributes, int $expectedVersion, ?string $actorId): CheckoutItem
    {
        return DB::transaction(function () use ($session, $attributes, $expectedVersion, $actorId) {
            $session->assertVersionMatches($expectedVersion);
            $session->assertMutable();

            $variantId = $attributes['variant_id'] ?? null;
            /** @var Product $product */
            $product = Product::query()->findOrFail($attributes['product_id']);

            if ($product->status !== Product::STATUS_ACTIVE) {
                throw new CheckoutValidationException(
                    $session->id,
                    'product_not_available',
                    "Product [{$product->id}] is not currently available.",
                );
            }

            $sku = $variantId !== null
                ? strtoupper((string) $product->variants()->findOrFail((string) $variantId)->sku)
                : strtoupper($product->sku);

            $categoryIds = $product->categories()->pluck('categories.id')->values()->all();
            $quantity = (int) $attributes['quantity'];

            $item = $session->items()->where('sku', $sku)->first();

            if ($item !== null) {
                $before = $item->only(['quantity']);
                $item->quantity += $quantity;
                $item->save();
                $action = 'checkout.item_quantity_increased';
            } else {
                $before = null;
                $item = $session->items()->create([
                    'product_id' => $product->id,
                    'sku' => $sku,
                    'product_name' => $product->name,
                    'category_ids' => $categoryIds,
                    'quantity' => $quantity,
                    'tax_class_id' => $attributes['tax_class_id'] ?? null,
                ]);
                $action = 'checkout.item_added';
            }

            $session->resetReviewIfNeeded();
            $session->touchExpiry();
            $session->touchAggregateVersion();

            $this->auditLogger->log(
                action: $action,
                actorId: $actorId,
                targetType: CheckoutItem::class,
                targetId: $item->id,
                before: $before,
                after: $item->only(['sku', 'quantity']),
            );

            return $item;
        });
    }
}
