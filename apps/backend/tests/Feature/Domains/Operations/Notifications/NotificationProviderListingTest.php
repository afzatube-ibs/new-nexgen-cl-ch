<?php

declare(strict_types=1);

it('denies listing notification providers without the view permission', function () {
    $caller = userWithPermissions([]);

    $this->actingAs($caller, 'sanctum')
        ->getJson('/api/v1/notification-providers')
        ->assertStatus(403);
});

it('lists every registered channel provider, including unavailable ones', function () {
    $caller = userWithPermissions(['notifications.providers.view']);

    $response = $this->actingAs($caller, 'sanctum')->getJson('/api/v1/notification-providers');

    $response->assertOk();
    $codes = collect($response->json('data'))->pluck('code')->all();

    expect($codes)->toContain('smtp', 'mailgun', 'ses', 'brevo');

    // None of this environment's real NOTIFICATIONS_SMTP_*/MAILGUN_*/SES_*/
    // BREVO_* credentials are configured (confirmed by direct read of
    // `.env` — this module's own dedicated env namespace, distinct from
    // Laravel's generic unrelated MAIL_* config) — every provider reports
    // honestly unavailable, never a fabricated `true`.
    foreach ($response->json('data') as $provider) {
        expect($provider['available'])->toBeFalse();
        expect($provider['channel'])->toBe('email');
    }
});
