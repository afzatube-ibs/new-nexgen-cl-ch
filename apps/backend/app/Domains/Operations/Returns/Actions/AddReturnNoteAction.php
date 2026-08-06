<?php

declare(strict_types=1);

namespace App\Domains\Operations\Returns\Actions;

use App\Domains\Operations\Returns\Audit\AuditLogger;
use App\Domains\Operations\Returns\Models\ReturnNote;
use App\Domains\Operations\Returns\Models\ReturnRequest;
use App\Domains\Operations\Returns\Models\ReturnTimelineEvent;
use Illuminate\Support\Facades\DB;

final readonly class AddReturnNoteAction
{
    public function __construct(private AuditLogger $auditLogger) {}

    public function execute(ReturnRequest $returnRequest, string $body, bool $isCustomerVisible, ?string $actorId): ReturnNote
    {
        return DB::transaction(function () use ($returnRequest, $body, $isCustomerVisible, $actorId) {
            $note = $returnRequest->notes()->create([
                'author_id' => $actorId,
                'body' => $body,
                'is_customer_visible' => $isCustomerVisible,
            ]);

            ReturnTimelineEvent::query()->create([
                'return_request_id' => $returnRequest->id,
                'event_type' => ReturnTimelineEvent::TYPE_NOTE_ADDED,
                'description' => 'A note was added.',
                'occurred_at' => now(),
            ]);

            $this->auditLogger->log(
                action: 'return_note.added',
                actorId: $actorId,
                targetType: ReturnNote::class,
                targetId: $note->id,
                after: $note->only(['return_request_id', 'body', 'is_customer_visible']),
            );

            return $note;
        });
    }
}
