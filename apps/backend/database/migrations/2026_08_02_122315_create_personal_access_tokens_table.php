<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('personal_access_tokens', function (Blueprint $table) {
            $table->id();
            // uuidMorphs, not morphs: DATA:ENTITY_IDENTITY requires every
            // entity's identity to be stable and never encode business
            // meaning, and this project uses UUIDv7 primary keys for
            // Identity & Access's aggregates (see users table) rather than
            // auto-increment integers, partly to resist account
            // enumeration on the platform's highest-severity attack
            // surface (SECURITY:IDENTITY). tokenable_id must match that.
            $table->uuidMorphs('tokenable');
            $table->text('name');
            $table->string('token', 64)->unique();
            $table->text('abilities')->nullable();
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable()->index();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personal_access_tokens');
    }
};
