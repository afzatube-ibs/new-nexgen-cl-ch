<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Events\CheckoutCompleted;
use App\Domains\Commerce\Checkout\Exceptions\CheckoutItemUnavailableException;
use App\Domains\Commerce\Checkout\Exceptions\CheckoutSessionExpiredException;
use App\Domains\Commerce\Checkout\Exceptions\CheckoutSubmissionInProgressException;
use App\Domains\Commerce\Checkout\Exceptions\CheckoutValidationException;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use App\Domains\Commerce\Customers\Actions\RegisterCustomerAction;
use App\Domains\Commerce\Customers\Models\Customer;
use App\Domains\Commerce\Inventory\Actions\ReleaseReservationAction;
use App\Domains\Commerce\Inventory\Actions\ReserveStockAction;
use App\Domains\Commerce\Inventory\Models\StockItem;
use App\Domains\Commerce\Inventory\Models\Warehouse;
use App\Domains\Commerce\Orders\Actions\CreateOrderAction;
use App\Domains\Commerce\Orders\Models\Order;
use App\Domains\Commerce\Promotions\Actions\EvaluatePromotionsAction;
use App\Domains\Commerce\Promotions\Actions\RedeemPromotionAction;
use App\Domains\Commerce\Promotions\Support\CartContext;
use App\Domains\Commerce\Promotions\Support\CartLineItem;
use App\Domains\Platform\Foundation\EventBus\Contracts\DomainEventBus;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Throwable;

/**
 * "Order creation orchestration" and "Idempotent checkout submission" —
 * the culminating step of a checkout, and this module's most important
 * piece of orchestration. Deliberately NOT one `DB::transaction()`
 * wrapping every side effect: doing so would make this action's
 * transaction span this module's own CheckoutSession aggregate *and*
 * Inventory's StockReservation, Promotions' Promotion/Coupon, and
 * Orders' Order aggregates all at once, which DATA:TRANSACTION_
 * BOUNDARIES explicitly forbids ("a transaction never spans more than
 * one aggregate ... reconsidered as two separate steps"). Instead this
 * is a saga: a sequence of independent, single-aggregate transactions
 * (each already provided by the module that owns that aggregate — this
 * action never opens a transaction touching another module's tables
 * directly), coordinated here with explicit compensation.
 *
 * The steps, in order:
 *
 *  1. **Claim** — a single-aggregate transaction against CheckoutSession
 *     alone: `lockForUpdate()`, verify status is `reviewed` and not
 *     expired, then set `submitting`. This row lock is the actual
 *     duplicate-submission-protection mechanism: a second concurrent
 *     request blocks here until the first commits, then observes
 *     `submitting` (rejected as in-progress) or `submitted` (returns the
 *     existing order) rather than racing into the steps below.
 *  2. **Reserve stock** — one Inventory `ReserveStockAction` call per
 *     item (each already its own transaction). If any reservation fails,
 *     every reservation already made in this attempt is released via
 *     `ReleaseReservationAction` (Inventory's own, real compensation
 *     capability) and the session reverts to `reviewed` so the caller can
 *     retry.
 *  3. **Resolve the customer** — for a guest session, finds an existing
 *     Customer by email or registers a new one via Customers' own
 *     `RegisterCustomerAction`; a registered session already has one.
 *  4. **Redeem promotions** — one Promotions `RedeemPromotionAction` call
 *     per promotion the final evaluation applies (each already its own
 *     transaction). If this fails, reservations from step 2 are released.
 *     A documented, accepted limitation: Promotions' public contract has
 *     no "undo a redemption" capability, so a redemption that succeeds in
 *     this loop before a LATER one fails cannot itself be reversed — it
 *     is fully audited (both here and in Promotions' own audit trail) and
 *     is the kind of narrow, honestly-stated edge case DATA:CONSISTENCY_
 *     RULES anticipates ("if a module's reaction ... fails ... that must
 *     surface, not disappear"), not a silent data-integrity gap.
 *  5. **Create the Order** — one Orders `CreateOrderAction` call (already
 *     its own transaction), from figures this action only sums and
 *     passes through, never recalculates.
 *  6. **Finalize** — a second single-aggregate transaction against
 *     CheckoutSession alone: set `submitted` and `order_id`.
 *
 * If a caller retries with the same session after a full success, step 1
 * observes `submitted` and this action short-circuits to the existing
 * Order without repeating any side effect — the idempotency guarantee.
 */
final readonly class SubmitCheckoutAction
{
    public function __construct(
        private ReserveStockAction $reserveStockAction,
        private ReleaseReservationAction $releaseReservationAction,
        private RegisterCustomerAction $registerCustomerAction,
        private EvaluatePromotionsAction $evaluatePromotionsAction,
        private RedeemPromotionAction $redeemPromotionAction,
        private CreateOrderAction $createOrderAction,
        private DomainEventBus $eventBus,
        private AuditLogger $auditLogger,
    ) {}

    public function execute(CheckoutSession $session, string $idempotencyKey, int $expectedVersion, ?string $actorId): Order
    {
        $claimed = $this->claim($session, $expectedVersion, $idempotencyKey);

        if ($claimed->status === CheckoutSession::STATUS_SUBMITTED) {
            /** @var Order $order */
            $order = Order::query()->findOrFail($claimed->order_id);

            return $order;
        }

        $reservations = [];

        try {
            foreach ($claimed->items as $item) {
                $stockItem = $this->resolveStockItem($item->sku, $item->quantity);
                $reservations[] = $this->reserveStockAction->execute(
                    stockItemId: $stockItem->id,
                    quantity: $item->quantity,
                    referenceType: CheckoutSession::class,
                    referenceId: $claimed->id,
                    actorId: $actorId,
                );
            }

            $customerId = $this->resolveCustomerId($claimed, $actorId);

            $cartContext = new CartContext(
                items: array_values($claimed->items->map(fn ($item) => new CartLineItem(
                    productId: $item->product_id,
                    categoryIds: $item->category_ids ?? [],
                    quantity: $item->quantity,
                    unitPrice: (string) $item->unit_price,
                ))->all()),
                subtotal: (string) $claimed->subtotal,
                currencyCode: $claimed->currency_code,
                customerId: $customerId,
                storeId: null,
                couponCode: $claimed->coupon_code,
            );
            $evaluation = $this->evaluatePromotionsAction->execute($cartContext);

            $discounts = [];

            foreach ($evaluation->appliedPromotions as $applied) {
                $this->redeemPromotionAction->execute(
                    promotionId: $applied->promotionId,
                    couponCode: $claimed->coupon_code,
                    customerId: $customerId,
                    orderReference: $claimed->id,
                    discountAmount: $applied->discountAmount,
                    currencyCode: $claimed->currency_code,
                    actorId: $actorId,
                );

                $discounts[] = [
                    'promotion_id' => $applied->promotionId,
                    'code' => $claimed->coupon_code,
                    'label' => $applied->name,
                    'amount' => $applied->discountAmount,
                ];
            }

            $order = $this->createOrderAction->execute([
                'customer_id' => $customerId,
                'currency_code' => $claimed->currency_code,
                'items' => $claimed->items->map(fn ($item) => [
                    'product_id' => $item->product_id,
                    'sku' => $item->sku,
                    'product_name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'tax_amount' => $item->tax_amount ?? '0.0000',
                ])->all(),
                'billing_address' => $claimed->billing_address,
                'shipping_address' => $claimed->shipping_address,
                'discounts' => $discounts,
                'shipping_total' => $claimed->shipping_total ?? '0.0000',
            ], $actorId);
        } catch (Throwable $e) {
            foreach ($reservations as $reservation) {
                $this->releaseReservationAction->execute($reservation, $actorId);
            }

            $this->revertToReviewed($claimed);

            $this->auditLogger->log(
                action: 'checkout.submission_failed',
                actorId: $actorId,
                targetType: CheckoutSession::class,
                targetId: $claimed->id,
                after: ['reason' => $e->getMessage()],
            );

            throw $e;
        }

        $this->finalize($claimed, $order, $idempotencyKey);

        $this->auditLogger->log(
            action: 'checkout.submitted',
            actorId: $actorId,
            targetType: CheckoutSession::class,
            targetId: $claimed->id,
            after: ['order_id' => $order->id, 'order_number' => $order->order_number],
        );

        $this->eventBus->publish(new CheckoutCompleted(
            sessionId: $claimed->id,
            orderId: $order->id,
            customerId: $order->customer_id,
            grandTotal: $order->grand_total,
            currencyCode: $order->currency_code,
        ));

        return $order;
    }

    /**
     * Step 1 — see this class's docblock. Single-aggregate transaction
     * against CheckoutSession alone.
     */
    private function claim(CheckoutSession $session, int $expectedVersion, string $idempotencyKey): CheckoutSession
    {
        return DB::transaction(function () use ($session, $expectedVersion, $idempotencyKey) {
            /** @var CheckoutSession $locked */
            $locked = CheckoutSession::query()->lockForUpdate()->findOrFail($session->id);

            // A session already fully submitted short-circuits before the
            // version check: the idempotency guarantee means a caller
            // retrying with a now-stale version they read before
            // submission succeeded must still get the existing result,
            // not a spurious conflict.
            if ($locked->status === CheckoutSession::STATUS_SUBMITTED) {
                return $locked;
            }

            if ($locked->status === CheckoutSession::STATUS_SUBMITTING) {
                throw new CheckoutSubmissionInProgressException($locked->id);
            }

            $locked->assertVersionMatches($expectedVersion);

            if ($locked->isExpired()) {
                throw new CheckoutSessionExpiredException($locked->id);
            }

            if ($locked->status !== CheckoutSession::STATUS_REVIEWED) {
                throw new CheckoutValidationException(
                    $locked->id,
                    'not_reviewed',
                    "Checkout session [{$locked->id}] must be reviewed before it can be submitted.",
                );
            }

            $locked->status = CheckoutSession::STATUS_SUBMITTING;
            $locked->idempotency_key = $idempotencyKey;
            $locked->save();

            return $locked->load('items');
        });
    }

    /**
     * Step 6 — see this class's docblock. Single-aggregate transaction
     * against CheckoutSession alone.
     */
    private function finalize(CheckoutSession $session, Order $order, string $idempotencyKey): void
    {
        DB::transaction(function () use ($session, $order, $idempotencyKey) {
            $session->status = CheckoutSession::STATUS_SUBMITTED;
            $session->order_id = $order->id;
            $session->idempotency_key = $idempotencyKey;
            $session->save();
        });
    }

    /**
     * Reverts a claimed session back to `reviewed` after a failed
     * submission attempt, so the caller can simply retry (or amend the
     * cart, which itself falls back to `open` via the normal cart-
     * mutation actions). Single-aggregate transaction against
     * CheckoutSession alone.
     */
    private function revertToReviewed(CheckoutSession $session): void
    {
        DB::transaction(function () use ($session) {
            $session->status = CheckoutSession::STATUS_REVIEWED;
            $session->save();
        });
    }

    /**
     * Resolves which Inventory StockItem row a SKU's reservation is taken
     * against — Inventory's own ReserveStockAction takes a resolved
     * stock_item_id, not a SKU, so this resolution is this module's own
     * orchestration responsibility (never a duplication of Inventory's
     * stock-level logic, which stays entirely inside Inventory's own
     * `available()`/reservation code). Phase 1 is single-warehouse in
     * practice (per Inventory's own module notes), so this prefers the
     * warehouse flagged `is_default`, falling back to any warehouse
     * carrying the SKU.
     */
    private function resolveStockItem(string $sku, int $requestedQuantity): StockItem
    {
        $defaultWarehouse = Warehouse::query()->where('is_default', true)->where('status', Warehouse::STATUS_ACTIVE)->first();

        if ($defaultWarehouse !== null) {
            $viaDefault = StockItem::query()->where('warehouse_id', $defaultWarehouse->id)->where('sku', $sku)->first();

            if ($viaDefault !== null) {
                return $viaDefault;
            }
        }

        $stockItem = StockItem::query()->where('sku', $sku)->first();

        if ($stockItem === null) {
            throw new CheckoutItemUnavailableException($sku, $requestedQuantity, 0);
        }

        return $stockItem;
    }

    /**
     * Resolves the Customer an Order will be attributed to — already
     * settled for a registered session; for a guest session, reuses an
     * existing Customer sharing the same email (so a repeat guest never
     * accumulates duplicate accounts) or registers a new one via
     * Customers' own public Actions\RegisterCustomerAction, with a
     * random, never-communicated password (the guest never authenticates
     * with it — see that class's docblock for why every Customer row
     * requires one regardless).
     */
    private function resolveCustomerId(CheckoutSession $session, ?string $actorId): string
    {
        if ($session->customer_id !== null) {
            return $session->customer_id;
        }

        $existing = Customer::query()->where('email', $session->guest_email)->first();

        if ($existing !== null) {
            return $existing->id;
        }

        try {
            $customer = $this->registerCustomerAction->execute([
                'name' => $session->guest_name,
                'email' => $session->guest_email,
                'password' => Str::password(32),
            ], $actorId);

            return $customer->id;
        } catch (QueryException) {
            // A concurrent guest checkout with the same email won the
            // race to register first — reuse that Customer rather than
            // fail a checkout over a benign duplicate-email collision.
            /** @var Customer $racedCustomer */
            $racedCustomer = Customer::query()->where('email', $session->guest_email)->firstOrFail();

            return $racedCustomer->id;
        }
    }
}
