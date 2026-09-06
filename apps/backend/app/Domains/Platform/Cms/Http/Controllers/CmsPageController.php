<?php

declare(strict_types=1);

namespace App\Domains\Platform\Cms\Http\Controllers;

use App\Domains\Platform\Cms\Actions\CreatePageAction;
use App\Domains\Platform\Cms\Actions\PublishPageAction;
use App\Domains\Platform\Cms\Actions\RestorePageRevisionAction;
use App\Domains\Platform\Cms\Actions\UnpublishPageAction;
use App\Domains\Platform\Cms\Actions\UpdatePageAction;
use App\Domains\Platform\Cms\Http\Requests\ExpectedVersionRequest;
use App\Domains\Platform\Cms\Http\Requests\StorePageRequest;
use App\Domains\Platform\Cms\Http\Requests\UpdatePageRequest;
use App\Domains\Platform\Cms\Http\Resources\CmsPageResource;
use App\Domains\Platform\Cms\Http\Resources\CmsPageRevisionResource;
use App\Domains\Platform\Cms\Http\Resources\CmsPublishedPageResource;
use App\Domains\Platform\Cms\Models\CmsPage;
use App\Domains\Platform\Cms\Models\CmsPageRevision;
use App\Domains\Platform\StoreConfiguration\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class CmsPageController
{
    public function __construct(
        private readonly CreatePageAction $createPage,
        private readonly UpdatePageAction $updatePage,
        private readonly PublishPageAction $publishPage,
        private readonly UnpublishPageAction $unpublishPage,
        private readonly RestorePageRevisionAction $restoreRevision,
    ) {}

    public function index(Store $store): AnonymousResourceCollection
    {
        return CmsPageResource::collection(CmsPage::query()->where('store_id', $store->id)->orderBy('title')->get());
    }

    public function store(StorePageRequest $request, Store $store): CmsPageResource
    {
        $page = $this->createPage->execute($store->id, $request->validated(), $request->user()?->id);
        return new CmsPageResource($page);
    }

    public function show(Store $store, CmsPage $page): CmsPageResource
    {
        $this->assertStore($store, $page);
        return new CmsPageResource($page);
    }

    public function update(UpdatePageRequest $request, Store $store, CmsPage $page): CmsPageResource
    {
        $this->assertStore($store, $page);
        $updated = $this->updatePage->execute($page, $request->safe()->except('expected_version'), (int) $request->integer('expected_version'), $request->user()?->id);
        return new CmsPageResource($updated);
    }

    public function destroy(ExpectedVersionRequest $request, Store $store, CmsPage $page): Response
    {
        $this->assertStore($store, $page);
        $page->assertVersionMatches((int) $request->integer('expected_version'));
        $page->delete();
        return response()->noContent();
    }

    public function publish(ExpectedVersionRequest $request, Store $store, CmsPage $page): CmsPageResource
    {
        $this->assertStore($store, $page);
        return new CmsPageResource($this->publishPage->execute($page, (int) $request->integer('expected_version'), $request->user()?->id));
    }

    public function unpublish(ExpectedVersionRequest $request, Store $store, CmsPage $page): CmsPageResource
    {
        $this->assertStore($store, $page);
        return new CmsPageResource($this->unpublishPage->execute($page, (int) $request->integer('expected_version'), $request->user()?->id));
    }

    public function revisions(Store $store, CmsPage $page): AnonymousResourceCollection
    {
        $this->assertStore($store, $page);
        return CmsPageRevisionResource::collection($page->revisions()->get());
    }

    public function restore(ExpectedVersionRequest $request, Store $store, CmsPage $page, CmsPageRevision $revision): CmsPageResource
    {
        $this->assertStore($store, $page);
        return new CmsPageResource($this->restoreRevision->execute($page, $revision, (int) $request->integer('expected_version'), $request->user()?->id));
    }

    public function published(Request $request, Store $store, string $slug): CmsPublishedPageResource
    {
        $locale = (string) $request->query('locale', $store->locale);
        $page = CmsPage::query()
            ->where('store_id', $store->id)
            ->where('locale', $locale)
            ->where('slug', $slug)
            ->where('status', CmsPage::STATUS_PUBLISHED)
            ->whereNotNull('published_snapshot')
            ->firstOrFail();

        return new CmsPublishedPageResource($page);
    }

    private function assertStore(Store $store, CmsPage $page): void
    {
        abort_unless($page->store_id === $store->id, 404);
    }
}
