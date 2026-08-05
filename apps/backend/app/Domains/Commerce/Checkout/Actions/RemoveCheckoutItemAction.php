<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Actions;

use App\Domains\Commerce\Checkout\Audit\AuditLogger;
use App\Domains\Commerce\Checkout\Models\CheckoutItem;
use App\Domains\Commerce\Checkout\Models\CheckoutSession;
use Illuminate\Support\Facades\DB;

final readonly class RemoveCheckoutItemAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(CheckoutSession $session, CheckoutItem $item, int $expectedVersion, ?string $actorId): void
    {
        DB::transaction(function () use ($session, $item, $expectedVersion, $actorId) {
            $session->assertVersionMatches($expectedVersion);
            $session->assertMutable();

            $before = $item->only(['sku', 'quantity']);
            $item->delete();

            $session->resetReviewIfNeeded();
            $session->touchExpiry();
            $session->touchAggregateVersion();

            $this->auditLogger->log(
                action: 'checkout.item_removed',
                actorId: $actorId,
                targetType: CheckoutItem::class,
                targetId: $item->id,
                before: $before,
            );
        });
    }
}
