<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Http\Controllers;

use App\Domains\Operations\Notifications\Actions\QueueNotificationAction;
use App\Domains\Operations\Notifications\Http\Requests\QueueNotificationRequest;
use App\Domains\Operations\Notifications\Http\Resources\NotificationResource;
use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class NotificationController
{
    public function __construct(private readonly QueueNotificationAction $queueNotificationAction) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Notification::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('channel')) {
            $query->where('channel', $request->string('channel')->toString());
        }

        if ($request->filled('related_type') && $request->filled('related_id')) {
            $query->where('related_type', $request->string('related_type')->toString())
                ->where('related_id', $request->string('related_id')->toString());
        }

        return NotificationResource::collection($query->orderByDesc('created_at')->paginate());
    }

    public function show(Notification $notification): NotificationResource
    {
        return new NotificationResource($notification->load('deliveryAttempts'));
    }

    public function store(QueueNotificationRequest $request): JsonResponse
    {
        /** @var array<string, scalar|null> $mergeData */
        $mergeData = $request->validated('merge_data') ?? [];

        $notification = $this->queueNotificationAction->execute(
            channel: $request->string('channel')->toString(),
            recipient: $request->string('recipient')->toString(),
            templateCode: $request->string('template_code')->toString() ?: null,
            mergeData: $mergeData,
            locale: $request->string('locale')->toString() ?: 'en',
            subject: $request->string('subject')->toString() ?: null,
            body: $request->string('body')->toString() ?: null,
            actorId: $request->user()?->id,
        );

        return (new NotificationResource($notification))->response()->setStatusCode(201);
    }
}
