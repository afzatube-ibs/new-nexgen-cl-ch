<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Checkout\Console\Commands;

use App\Domains\Commerce\Checkout\Actions\ExpireCheckoutSessionsAction;
use Illuminate\Console\Command;

/**
 * The operator-facing (and scheduler-facing) entry point to
 * Actions\ExpireCheckoutSessionsAction — see that class's docblock.
 */
final class ExpireCheckoutSessionsCommand extends Command
{
    protected $signature = 'checkout:expire-sessions';

    protected $description = 'Transition stale checkout sessions to expired and publish CheckoutAbandoned.';

    public function handle(ExpireCheckoutSessionsAction $action): int
    {
        $count = $action->execute();

        $this->info("Expired {$count} checkout session(s).");

        return self::SUCCESS;
    }
}
