<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\ArchiveBrandAction;
use App\Domains\Commerce\Catalog\Actions\CreateBrandAction;
use App\Domains\Commerce\Catalog\Actions\DeleteBrandAction;
use App\Domains\Commerce\Catalog\Actions\RestoreBrandAction;
use App\Domains\Commerce\Catalog\Actions\UpdateBrandAction;
use App\Domains\Commerce\Catalog\Http\Requests\CreateBrandRequest;
use App\Domains\Commerce\Catalog\Http\Requests\ExpectedVersionRequest;
use App\Domains\Commerce\Catalog\Http\Requests\UpdateBrandRequest;
use App\Domains\Commerce\Catalog\Http\Resources\BrandResource;
use App\Domains\Commerce\Catalog\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

final class BrandController
{
    public function __construct(
        private readonly CreateBrandAction $createBrandAction,
        private readonly UpdateBrandAction $updateBrandAction,
        private readonly ArchiveBrandAction $archiveBrandAction,
        private readonly DeleteBrandAction $deleteBrandAction,
        private readonly RestoreBrandAction $restoreBrandAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Brand::query()->with('logo')->orderBy('name');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        return BrandResource::collection($query->paginate());
    }

    public function show(Brand $brand): BrandResource
    {
        return new BrandResource($brand->load('logo'));
    }

    public function store(CreateBrandRequest $request): JsonResponse
    {
        $brand = $this->createBrandAction->execute($request->validated(), $request->user()?->id);

        return (new BrandResource($brand->load('logo')))->response()->setStatusCode(201);
    }

    public function update(UpdateBrandRequest $request, Brand $brand): BrandResource
    {
        $updated = $this->updateBrandAction->execute(
            brand: $brand,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new BrandResource($updated->load('logo'));
    }

    public function archive(ExpectedVersionRequest $request, Brand $brand): BrandResource
    {
        $archived = $this->archiveBrandAction->execute(
            $brand,
            (int) $request->integer('expected_version'),
            $request->user()?->id,
        );

        return new BrandResource($archived);
    }

    public function destroy(ExpectedVersionRequest $request, Brand $brand): Response
    {
        $this->deleteBrandAction->execute($brand, (int) $request->integer('expected_version'), $request->user()?->id);

        return response()->noContent();
    }

    public function restore(Request $request, string $brand): BrandResource
    {
        $model = Brand::withTrashed()->findOrFail($brand);
        $restored = $this->restoreBrandAction->execute($model, $request->user()?->id);

        return new BrandResource($restored->load('logo'));
    }
}
