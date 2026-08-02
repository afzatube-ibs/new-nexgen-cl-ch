<?php

declare(strict_types=1);

namespace App\Domains\Commerce\Catalog\Http\Controllers;

use App\Domains\Commerce\Catalog\Actions\AddOptionValueAction;
use App\Domains\Commerce\Catalog\Actions\RemoveOptionValueAction;
use App\Domains\Commerce\Catalog\Actions\UpdateOptionValueAction;
use App\Domains\Commerce\Catalog\Http\Requests\AddOptionValueRequest;
use App\Domains\Commerce\Catalog\Http\Requests\RemoveOptionValueRequest;
use App\Domains\Commerce\Catalog\Http\Requests\UpdateOptionValueRequest;
use App\Domains\Commerce\Catalog\Http\Resources\OptionValueResource;
use App\Domains\Commerce\Catalog\Models\Option;
use App\Domains\Commerce\Catalog\Models\OptionValue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

final class OptionValueController
{
    public function __construct(
        private readonly AddOptionValueAction $addOptionValueAction,
        private readonly UpdateOptionValueAction $updateOptionValueAction,
        private readonly RemoveOptionValueAction $removeOptionValueAction,
    ) {}

    public function store(AddOptionValueRequest $request, Option $option): JsonResponse
    {
        $value = $this->addOptionValueAction->execute(
            option: $option,
            value: $request->string('value')->toString(),
            expectedOptionVersion: (int) $request->integer('expected_option_version'),
            actorId: $request->user()?->id,
        );

        return (new OptionValueResource($value))->response()->setStatusCode(201);
    }

    public function update(UpdateOptionValueRequest $request, Option $option, OptionValue $value): OptionValueResource
    {
        $updated = $this->updateOptionValueAction->execute(
            option: $option,
            optionValue: $value,
            value: $request->string('value')->toString(),
            expectedOptionVersion: (int) $request->integer('expected_option_version'),
            actorId: $request->user()?->id,
        );

        return new OptionValueResource($updated);
    }

    public function destroy(RemoveOptionValueRequest $request, Option $option, OptionValue $value): Response
    {
        $this->removeOptionValueAction->execute(
            option: $option,
            optionValue: $value,
            expectedOptionVersion: (int) $request->integer('expected_option_version'),
            actorId: $request->user()?->id,
        );

        return response()->noContent();
    }
}
