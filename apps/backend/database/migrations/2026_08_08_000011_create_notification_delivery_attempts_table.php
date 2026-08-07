<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The child ledger of every provider interaction against a
     * Notification — "Delivery Attempts" from the master plan's own data
     * ownership, mirroring Payments' `payment_attempts` exactly: an
     * append-only table (no `lock_version`, no update path anywhere in
     * this module — a new attempt always produces a NEW row), so it is
     * itself an accurate, tamper-evident history of everything this
     * module ever tried to send.
     *
     * `provider_reference` is the provider's own message identifier
     * (SMTP's queued Message-ID, Mailgun's/Brevo's returned message id),
     * or null when the attempt failed before the provider returned one.
     */
    public function up(): void
    {
        Schema::create('notification_delivery_attempts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->foreignUuid('notification_id')->constrained('notifications')->cascadeOnDelete();
            $table->string('provider_code');
            $table->string('status');
            $table->string('provider_reference')->nullable();
            $table->json('request_payload')->nullable();
            $table->json('response_payload')->nullable();
            $table->text('failure_reason')->nullable();
            $table->timestamp('occurred_at');
            $table->timestamp('created_at');

            $table->index(['notification_id', 'occurred_at']);
            $table->index('tenant_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_delivery_attempts');
    }
};
