<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Production Completion Plan v2, Milestone 5b (Password Reset) — the
     * table `config/auth.php`'s own docblock named as missing: "no
     * password_reset_tokens table exists in this module's migrations —
     * add both together when password reset is actually implemented."
     * Deliberately its own table, not Laravel's stock `password_reset_
     * tokens` (which Identity & Access's own migrations also never
     * created) or a foreign key into `customers` — keyed by `email`
     * alone, matching Laravel's own `DatabaseTokenRepository` convention
     * exactly, so a reset request for an email with no real account can
     * still be handled indistinguishably from one that does (see
     * Actions\RequestPasswordResetAction's own docblock for why that
     * matters).
     *
     * `token` stores a HASH (`Hash::make()`), never the real, plaintext
     * token a customer actually receives by email — identical discipline
     * to `personal_access_tokens.token` for Sanctum's own bearer tokens
     * (SECURITY:SECURE_CONFIGURATION: a credential is never stored in a
     * form that lets a database compromise alone impersonate a customer).
     * `created_at` (not a Customer-style full timestamp pair) is
     * Laravel's own established shape for this exact table type — this
     * migration matches it rather than inventing a new one.
     */
    public function up(): void
    {
        Schema::create('customer_password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_password_reset_tokens');
    }
};
