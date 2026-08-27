<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:APPEARANCE's aggregate root — one row per store, deliberately
     * a separate table from `stores` rather than new columns on it (per
     * `planning/architecture/APPEARANCE_WORKSPACE_SPECIFICATION.md` §4.2(a)
     * Option B): a store's identity/legal/tax fields and a store's own
     * *look* are two independently-versioned concerns, so a branding edit
     * never contends for `stores.lock_version` against an unrelated
     * Store-identity edit happening at the same time.
     *
     * `logo_media_id`/`favicon_media_id` are real `media_assets.id`
     * references, never a raw URL — `THEME_ENGINE_ARCHITECTURE.md` §8's own
     * "a Media-module asset identifier, per MODULE:MEDIA, never a raw URL"
     * rule, applied here for the first time.
     *
     * `published_snapshot` + `published_at` + `published_by` implement a
     * real, lightweight draft/published distinction without a full
     * `theme_versions` history table (out of this Pack's own scope, per the
     * Appearance spec's own §14 Pack 1 boundary): the row's own columns
     * ARE the draft; `published_snapshot` is the last full copy of those
     * columns a merchant explicitly published — what the real Storefront
     * actually reads. "Reset" restores the draft columns from this same
     * snapshot.
     *
     * Currency/locale/timezone/contact-email/contact-phone/business-address
     * are deliberately NOT duplicated here — they already exist on `stores`
     * (real, shipped) and the Appearance Branding screen edits those
     * through the real, existing Store Configuration endpoints instead of
     * a second, competing copy.
     */
    public function up(): void
    {
        Schema::create('store_appearances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->uuid('store_id');

            $table->uuid('logo_media_id')->nullable();
            $table->uuid('favicon_media_id')->nullable();

            $table->string('primary_color', 7)->nullable();
            $table->string('secondary_color', 7)->nullable();
            $table->string('accent_color', 7)->nullable();

            $table->string('border_radius')->default('md');
            $table->string('typography_preset')->default('inter-default');
            $table->string('button_style')->default('solid');

            $table->boolean('announcement_enabled')->default(false);
            $table->string('announcement_text')->nullable();

            $table->string('whatsapp_number')->nullable();
            $table->string('messenger_url')->nullable();
            $table->string('facebook_url')->nullable();
            $table->string('instagram_url')->nullable();
            $table->string('tiktok_url')->nullable();
            $table->string('youtube_url')->nullable();

            $table->json('business_hours')->nullable();

            $table->json('published_snapshot')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->uuid('published_by')->nullable();

            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();

            $table->unique('store_id');
            $table->index('tenant_id');
            $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            $table->foreign('logo_media_id')->references('id')->on('media_assets')->nullOnDelete();
            $table->foreign('favicon_media_id')->references('id')->on('media_assets')->nullOnDelete();
            $table->foreign('published_by')->references('id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('store_appearances');
    }
};
