<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Models\CheckoutItem;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Support\Facades\DB;

final readonly class UpdateCheckoutItemAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(CheckoutSession $session, CheckoutItem $item, int $quantity, int $expectedVersion, ?string $actorId): CheckoutItem
    {
        return DB::transaction(function () use ($session, $item, $quantity, $expectedVersion, $actorId) {
            $session->assertVersionMatches($expectedVersion);
            $session->assertMutable();

            $before = $item->only(['quantity']);
            $item->quantity = $quantity;
            $item->save();

            $session->resetReviewIfNeeded();
            $session->touchExpiry();
            $session->touchAggregateVersion();

            $this->auditLogger->log(
                action: 'checkout.item_updated',
                actorId: $actorId,
                targetType: CheckoutItem::class,
                targetId: $item->id,
                before: $before,
                after: $item->only(['quantity']),
            );

            return $item;
        });
    }
}
