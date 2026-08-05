<?php

declare(strict_types=1);

namespace App\Listeners;

use App\Domains\Commerce\Orders\Events\OrderPlaced;
use App\Domains\Operations\Fulfillment\Actions\CreateShipmentFromOrderPlacedAction;

/**
 * The platform's cross-domain event-routing seam — not owned by Orders
 * (Commerce) or Fulfillment (Operations), deliberately: per MODULE:
 * INTERACTION_RULES, "across domains, communication happens only through
 * the domain event bus," and deptrac.yaml enforces that no class under
 * `App\Domains\Operations\*` may reference anything under
 * `App\Domains\Commerce\*` (or vice versa). A listener that both knows
 * OrderPlaced's class and calls into Fulfillment's own Action necessarily
 * references both, so it lives here — outside every domain's namespace,
 * alongside `bootstrap/providers.php`'s own already-established pattern of
 * being the one place allowed to know about every module at once — rather
 * than inside either module, where it would be an unenforceable violation
 * dressed up as a domain event subscription.
 *
 * Deliberately thin: this class's only job is translating OrderPlaced's
 * public fields into the plain primitives Actions\
 * CreateShipmentFromOrderPlacedAction::execute() accepts — see that
 * Action's own docblock for why it never accepts the event object itself.
 * No business logic lives here; if this class ever needs an `if`
 * statement deciding whether to create a shipment, that decision belongs
 * in Fulfillment's own Action, not in this translation layer.
 *
 * Registered via App\Providers\AppServiceProvider::boot() — see that
 * class's docblock.
 */
final readonly class CreateShipmentOnOrderPlaced
{
    public function __construct(private CreateShipmentFromOrderPlacedAction $createShipmentFromOrderPlacedAction) {}

    public function handle(OrderPlaced $event): void
    {
        $this->createShipmentFromOrderPlacedAction->execute(
            orderId: $event->orderId,
            orderNumber: $event->orderNumber,
            customerId: $event->customerId,
            grandTotal: $event->grandTotal,
            currencyCode: $event->currencyCode,
        );
    }
}
