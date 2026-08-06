<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Http\Controllers;

use App\Domains\Operations\Returns\Actions\AddReturnNoteAction;
use App\Domains\Operations\Returns\Http\Requests\AddReturnNoteRequest;
use App\Domains\Operations\Returns\Http\Resources\ReturnNoteResource;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use Illuminate\Http\JsonResponse;

final class ReturnNoteController
{
    public function __construct(private readonly AddReturnNoteAction $addReturnNoteAction) {}

    public function store(AddReturnNoteRequest $request, ReturnRequest $returnRequest): JsonResponse
    {
        $note = $this->addReturnNoteAction->execute(
            returnRequest: $returnRequest,
            body: $request->string('body')->toString(),
            isCustomerVisible: $request->boolean('is_customer_visible'),
            actorId: $request->user()?->id,
        );

        return (new ReturnNoteResource($note))->response()->setStatusCode(201);
    }
}
