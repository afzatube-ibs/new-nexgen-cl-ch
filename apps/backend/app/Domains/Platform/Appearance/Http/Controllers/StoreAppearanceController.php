<?php

declare(strict_types=1);

namespace App\Domains\Platform\Appearance\Http\Controllers;

use App\Domains\Platform\Appearance\Actions\GetOrCreateStoreAppearanceAction;
use App\Domains\Platform\Appearance\Actions\PublishStoreAppearanceAction;
use App\Domains\Platform\Appearance\Actions\ResetStoreAppearanceAction;
use App\Domains\Platform\Appearance\Actions\UpdateStoreAppearanceAction;
use App\Domains\Platform\Appearance\Http\Requests\ExpectedVersionRequest;
use App\Domains\Platform\Appearance\Http\Requests\UpdateStoreAppearanceRequest;
use App\Domains\Platform\Appearance\Http\Resources\StoreAppearanceResource;
use App\Domains\Platform\StoreConfiguration\Models\Store;

final class StoreAppearanceController
{
    public function __construct(
        private readonly GetOrCreateStoreAppearanceAction $getOrCreateStoreAppearanceAction,
        private readonly UpdateStoreAppearanceAction $updateStoreAppearanceAction,
        private readonly PublishStoreAppearanceAction $publishStoreAppearanceAction,
        private readonly ResetStoreAppearanceAction $resetStoreAppearanceAction,
    ) {}

    public function show(Store $store): StoreAppearanceResource
    {
        $appearance = $this->getOrCreateStoreAppearanceAction->execute($store);

        return new StoreAppearanceResource($appearance->load(['logoMedia', 'faviconMedia']));
    }

    public function update(UpdateStoreAppearanceRequest $request, Store $store): StoreAppearanceResource
    {
        $appearance = $this->getOrCreateStoreAppearanceAction->execute($store);

        $updated = $this->updateStoreAppearanceAction->execute(
            appearance: $appearance,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new StoreAppearanceResource($updated->load(['logoMedia', 'faviconMedia']));
    }

    public function publish(ExpectedVersionRequest $request, Store $store): StoreAppearanceResource
    {
        $appearance = $this->getOrCreateStoreAppearanceAction->execute($store);

        $published = $this->publishStoreAppearanceAction->execute(
            appearance: $appearance,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new StoreAppearanceResource($published->load(['logoMedia', 'faviconMedia']));
    }

    public function reset(ExpectedVersionRequest $request, Store $store): StoreAppearanceResource
    {
        $appearance = $this->getOrCreateStoreAppearanceAction->execute($store);

        $reset = $this->resetStoreAppearanceAction->execute(
            appearance: $appearance,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new StoreAppearanceResource($reset->load(['logoMedia', 'faviconMedia']));
    }
}
