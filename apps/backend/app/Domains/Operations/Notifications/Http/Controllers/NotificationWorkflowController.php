<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Http\Controllers;

use App\Domains\Operations\Notifications\Actions\CancelNotificationAction;
use App\Domains\Operations\Notifications\Actions\RetryNotificationAction;
use App\Domains\Operations\Notifications\Http\Requests\ExpectedVersionRequest;
use App\Domains\Operations\Notifications\Http\Resources\NotificationResource;
use App\Domains\Operations\Notifications\Models\Notification;
use Illuminate\Http\Request;

final class NotificationWorkflowController
{
    public function __construct(
        private readonly RetryNotificationAction $retryNotificationAction,
        private readonly CancelNotificationAction $cancelNotificationAction,
    ) {}

    public function retry(Request $request, Notification $notification): NotificationResource
    {
        $updated = $this->retryNotificationAction->execute(
            notification: $notification,
            actorId: $request->user()?->id,
        );

        return new NotificationResource($updated);
    }

    public function cancel(ExpectedVersionRequest $request, Notification $notification): NotificationResource
    {
        $updated = $this->cancelNotificationAction->execute(
            notification: $notification,
            expectedVersion: (int) $request->integer('expected_version'),
            actorId: $request->user()?->id,
        );

        return new NotificationResource($updated);
    }
}
