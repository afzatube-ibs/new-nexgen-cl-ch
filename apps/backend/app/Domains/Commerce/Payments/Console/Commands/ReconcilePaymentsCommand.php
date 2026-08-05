<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Payments\Console\Commands;

use App\Domains\Commerce\Payments\Actions\ReconcilePaymentsAction;
use Illuminate\Console\Command;

/**
 * The operator-facing (and scheduler-facing) entry point to
 * Actions\ReconcilePaymentsAction — see that class's docblock.
 */
final class ReconcilePaymentsCommand extends Command
{
    protected $signature = 'payments:reconcile';

    protected $description = 'Query each gateway for the current status of any payment stuck pending/authorized past its reconciliation threshold.';

    public function handle(ReconcilePaymentsAction $action): int
    {
        $result = $action->execute();

        $this->info("Checked {$result['checked']} payment(s), reconciled {$result['reconciled']}, {$result['errors']} error(s).");

        return self::SUCCESS;
    }
}
