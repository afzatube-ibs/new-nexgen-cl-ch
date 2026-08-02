<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * MODULE:MEDIA's aggregate root — "owns uploaded assets (images and
     * other files) referenced by other modules; other modules reference
     * media by identifier, never by direct storage access" per
     * 04_MODULE_ARCHITECTURE. `path` is a randomly-generated storage key
     * (see Actions\UploadMediaAction), never the caller-supplied filename,
     * so `filename` (kept only for display/download purposes) can never
     * cause a path-traversal or overwrite issue — SECURITY:FILE_UPLOAD's
     * "untrusted content, validated against contract, isolated from
     * executable logic."
     *
     * `uploaded_by` is a plain identifier column, not a foreign key: the
     * user it references belongs to Identity & Access, a different
     * module, and DATA:CROSS_MODULE_ACCESS forbids a schema-level (FK)
     * coupling across module boundaries — an identifier reference is the
     * correct shape, exactly as `tenant_id` and every audit log's
     * `actor_id` already do platform-wide.
     */
    public function up(): void
    {
        Schema::create('media_assets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('tenant_id')->default('default');
            $table->string('disk');
            $table->string('path');
            $table->string('filename');
            $table->string('mime_type');
            $table->unsignedBigInteger('size');
            $table->unsignedInteger('width')->nullable();
            $table->unsignedInteger('height')->nullable();
            $table->string('alt_text')->nullable();
            $table->uuid('uploaded_by')->nullable();
            $table->unsignedInteger('lock_version')->default(1);
            $table->timestamps();
            $table->softDeletes();

            $table->index('tenant_id');
            $table->index('mime_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media_assets');
    }
};
