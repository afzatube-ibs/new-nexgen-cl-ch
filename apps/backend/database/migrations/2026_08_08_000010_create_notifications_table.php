<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:NOTIFICATIONS' own aggregate root — the record of one
     * attempted outbound communication, from the moment a triggering
     * module's event resolves into a queued send through to its final
     * delivery status. This is deliberately the ONE aggregate the whole
     * module revolves around (not split per channel) — a "Notification"
     * is the same concept whether it eventually sends by email, SMS, or
     * WhatsApp; the channel is an attribute of the notification, not a
     * different kind of thing, per `DATA:AGGREGATE_BOUNDARIES`.
     *
     * `notification_template_id` is nullable and `restrictOnDelete`,
     * never `cascadeOnDelete` — a Notification is a permanent delivery
     * record (DATA:AUDIT_DATA-adjacent) that must survive even if its
     * originating template is later deleted; `restrictOnDelete` instead
     * refuses to delete a template still referenced by history, matching
     * Shipping's own restrictOnDelete guards for the same reason.
     *
     * `related_type`/`related_id` are plain string/uuid columns, never a
     * foreign key — the triggering module (Orders, Payments, Fulfillment,
     * Returns, Customers) is a different module in a different domain in
     * every case that matters, and `DATA:CROSS_MODULE_ACCESS` forbids a
     * database-level foreign key across that boundary; this is a
     * traceability snapshot only ("this notification was about
     * order 123"), resolved once at creation time by the cross-domain
     * listener that queued it (see app/Listeners/Send*.php), never
     * re-queried live.
     *
     * `recipient` is a plain string (an email address in this delivery;
     * a phone number once a Phase 2 SMS/WhatsApp provider is wired) —
     * deliberately not a foreign key to Customers or Identity & Access,
     * for the identical `DATA:CROSS_MODULE_ACCESS` reason: the recipient
     * address is resolved once, at queue time, from whichever module
     * owns that contact detail (Orders' own immutable
     * `customer_email` snapshot, in every listener this delivery ships),
     * not re-resolved live against a possibly-since-changed profile —
     * which is also the semantically correct behaviour for a
     * transactional email: it goes to the address that was on file when
     * the triggering event happened, not whatever the customer's current
     * address happens to be by the time the queue worker gets to it.
     *
     * The Notification Status Lifecycle: `pending -> queued -> sending ->
     * sent`, with `failed` reachable from `sending` and `queued`
     * reachable again from `failed` (retry) or `sending` (a job release),
     * plus `cancelled` reachable from `pending`/`queued`. `attempts_count`
     * / `max_attempts` / `next_retry_at` are this module's own "Retry
     * Policy" data (a named Responsibility in the master plan), driving
     * Actions\SendNotificationAction's own backoff decision — deliberately
     * domain-level and auditable, not hidden inside the queue driver's
     * own retry mechanism.
     */
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->foreignUuid('notification_template_id')->nullable()->constrained('notification_templates')->restrictOnDelete();
            $table->string('channel');
            $table->string('recipient');
            $table->string('subject')->nullable();
            $table->text('body');
            $table->string('status')->default('pending');
            $table->json('context')->nullable();
            $table->string('related_type')->nullable();
            $table->uuid('related_id')->nullable();
            $table->string('provider_code')->nullable();
            $table->unsignedSmallInteger('attempts_count')->default(0);
            $table->unsignedSmallInteger('max_attempts')->default(5);
            $table->timestamp('next_retry_at')->nullable();
            $table->timestamp('last_attempted_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();

            $table->index(['tenant_id', 'status']);
            $table->index(['related_type', 'related_id']);
            $table->index('next_retry_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
