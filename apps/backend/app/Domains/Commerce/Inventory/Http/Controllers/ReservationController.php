<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Inventory\Http\Controllers;

use App\Domains\Commerce\Inventory\Actions\CommitReservationAction;
use App\Domains\Commerce\Inventory\Actions\ReleaseReservationAction;
use App\Domains\Commerce\Inventory\Http\Resources\StockReservationResource;
use App\Domains\Commerce\Inventory\Models\StockReservation;
use Illuminate\Http\Request;

final class ReservationController
{
    public function __construct(
        private readonly ReleaseReservationAction $releaseReservationAction,
        private readonly CommitReservationAction $commitReservationAction,
    ) {}

    public function release(Request $request, StockReservation $reservation): StockReservationResource
    {
        $released = $this->releaseReservationAction->execute($reservation, $request->user()?->id);

        return new StockReservationResource($released);
    }

    public function commit(Request $request, StockReservation $reservation): StockReservationResource
    {
        $committed = $this->commitReservationAction->execute($reservation, $request->user()?->id);

        return new StockReservationResource($committed);
    }
}
