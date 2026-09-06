<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Controllers;

use App\Domains\Platform\Cms\Actions\CreateMenuAction;
use App\Domains\Platform\Cms\Actions\PublishMenuAction;
use App\Domains\Platform\Cms\Actions\UnpublishMenuAction;
use App\Domains\Platform\Cms\Actions\UpdateMenuAction;
use App\Domains\Platform\Cms\Http\Requests\ExpectedVersionRequest;
use App\Domains\Platform\Cms\Http\Requests\StoreMenuRequest;
use App\Domains\Platform\Cms\Http\Requests\UpdateMenuRequest;
use App\Domains\Platform\Cms\Http\Resources\CmsMenuResource;
use App\Domains\Platform\Cms\Http\Resources\CmsPublishedMenuResource;
use App\Domains\Platform\Cms\Models\CmsMenu;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class CmsMenuController
{
    public function __construct(
        private readonly CreateMenuAction $createMenu,
        private readonly UpdateMenuAction $updateMenu,
        private readonly PublishMenuAction $publishMenu,
        private readonly UnpublishMenuAction $unpublishMenu,
    ) {}

    public function index(Store $store): AnonymousResourceCollection
    {
        return CmsMenuResource::collection(CmsMenu::query()->where('store_id', $store->id)->orderBy('title')->get());
    }

    public function store(StoreMenuRequest $request, Store $store): CmsMenuResource
    {
        return new CmsMenuResource($this->createMenu->execute($store->id, $request->validated()));
    }

    public function show(Store $store, CmsMenu $menu): CmsMenuResource
    {
        $this->assertStore($store, $menu);

        return new CmsMenuResource($menu);
    }

    public function update(UpdateMenuRequest $request, Store $store, CmsMenu $menu): CmsMenuResource
    {
        $this->assertStore($store, $menu);
        $updated = $this->updateMenu->execute($menu, $request->safe()->except('expected_version'), (int) $request->integer('expected_version'));

        return new CmsMenuResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, Store $store, CmsMenu $menu): Response
    {
        $this->assertStore($store, $menu);
        $menu->assertVersionMatches((int) $request->integer('expected_version'));
        $menu->delete();

        return response()->noContent();
    }

    public function publish(ExpectedVersionRequest $request, Store $store, CmsMenu $menu): CmsMenuResource
    {
        $this->assertStore($store, $menu);

        return new CmsMenuResource($this->publishMenu->execute($menu, (int) $request->integer('expected_version'), $request->user()?->id));
    }

    public function unpublish(ExpectedVersionRequest $request, Store $store, CmsMenu $menu): CmsMenuResource
    {
        $this->assertStore($store, $menu);

        return new CmsMenuResource($this->unpublishMenu->execute($menu, (int) $request->integer('expected_version')));
    }

    public function published(Store $store, string $handle): CmsPublishedMenuResource
    {
        $menu = CmsMenu::query()
            ->where('store_id', $store->id)
            ->where('handle', $handle)
            ->where('status', CmsMenu::STATUS_PUBLISHED)
            ->whereNotNull('published_snapshot')
            ->firstOrFail();

        return new CmsPublishedMenuResource($menu);
    }

    private function assertStore(Store $store, CmsMenu $menu): void
    {
        abort_unless($menu->store_id === $store->id, 404);
    }
}
