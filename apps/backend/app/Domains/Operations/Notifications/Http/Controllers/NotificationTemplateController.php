<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Http\Controllers;

use App\Domains\Operations\Notifications\Actions\CreateNotificationTemplateAction;
use App\Domains\Operations\Notifications\Actions\UpdateNotificationTemplateAction;
use App\Domains\Operations\Notifications\Http\Requests\CreateNotificationTemplateRequest;
use App\Domains\Operations\Notifications\Http\Requests\UpdateNotificationTemplateRequest;
use App\Domains\Operations\Notifications\Http\Resources\NotificationTemplateResource;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class NotificationTemplateController
{
    public function __construct(
        private readonly CreateNotificationTemplateAction $createNotificationTemplateAction,
        private readonly UpdateNotificationTemplateAction $updateNotificationTemplateAction,
    ) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $query = NotificationTemplate::query();

        if ($request->filled('channel')) {
            $query->where('channel', $request->string('channel')->toString());
        }

        if ($request->filled('code')) {
            $query->where('code', $request->string('code')->toString());
        }

        // Free-text Template Search, per the accepted scope for
        // MODULE:SEARCH (docs/04_MODULE_ARCHITECTURE.md v1.5): Template
        // search is satisfied by this module's own list endpoint rather
        // than by Search's cross-domain index, so it stays a plain
        // in-module LIKE filter over this module's own columns — no
        // dependency on Search at all.
        if ($request->filled('q')) {
            $term = $request->string('q')->toString();
            $query->where(function ($sub) use ($term): void {
                $sub->where('code', 'like', "%{$term}%")
                    ->orWhere('subject', 'like', "%{$term}%")
                    ->orWhere('body', 'like', "%{$term}%");
            });
        }

        return NotificationTemplateResource::collection($query->orderBy('code')->paginate());
    }

    public function show(NotificationTemplate $notificationTemplate): NotificationTemplateResource
    {
        return new NotificationTemplateResource($notificationTemplate);
    }

    public function store(CreateNotificationTemplateRequest $request): JsonResponse
    {
        $template = $this->createNotificationTemplateAction->execute(
            attributes: $request->validated(),
            actorId: $request->user()?->id,
        );

        return (new NotificationTemplateResource($template))->response()->setStatusCode(201);
    }

    public function update(UpdateNotificationTemplateRequest $request, NotificationTemplate $notificationTemplate): NotificationTemplateResource
    {
        $updated = $this->updateNotificationTemplateAction->execute(
            template: $notificationTemplate,
            changes: $request->safe()->except('expected_version'),
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new NotificationTemplateResource($updated);
    }
}
