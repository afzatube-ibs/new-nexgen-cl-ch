<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:NOTIFICATIONS' Template aggregate root — "Notification
     * Templates" from the master plan's own Data Ownership line
     * ("Templates, delivery logs — Internal"). One row per (code,
     * channel, locale): the same logical template ("order confirmation")
     * has one row per channel it is authored for and one row per locale,
     * mirroring how Localization & Currency's own translation surface
     * (`04_MODULE_ARCHITECTURE.md`'s "the translation surface Catalog,
     * CMS, and Notifications content read from") is expected to be
     * consulted — this table stores the authored content itself, not the
     * locale mechanism.
     *
     * `channel` is deliberately a plain string, not a database enum —
     * `email` is the only channel with a real, functional provider wired
     * in this delivery (Phase 1 per the master plan's own "Phase 1
     * (Notifications + Email) / Phase 2 (SMS, WhatsApp)" split), but
     * `sms`/`whatsapp`/`in_app` template rows are equally valid to author
     * now — Providers\Contracts\NotificationProviderContract is the seam
     * a future Phase 2 delivery plugs a live SMS/WhatsApp adapter into
     * without touching this table's shape at all.
     *
     * `body` carries `{{merge_field}}` placeholders resolved at send time
     * by Actions\QueueNotificationAction against the caller-supplied
     * merge data — a deliberately simple mechanism (no template engine
     * dependency), consistent with this module owning presentation of
     * its own content, never business logic belonging to the module that
     * triggered the notification.
     */
    public function up(): void
    {
        Schema::create('notification_templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            // Keep the composite unique key comfortably below MySQL/InnoDB's
            // 3072-byte index limit when the database uses utf8mb4 (4 bytes
            // per character). These are identifiers, not free-form content.
            $table->string('tenant_id', 191)->default('default');
            $table->string('code', 191);
            $table->string('channel', 32);
            $table->string('locale', 10)->default('en');
            $table->string('subject')->nullable();
            $table->text('body');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['tenant_id', 'code', 'channel', 'locale']);
            $table->index(['tenant_id', 'channel', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notification_templates');
    }
};
