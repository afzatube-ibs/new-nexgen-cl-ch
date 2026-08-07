<?php

declare(strict_types=1);

use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use App\Domains\Operations\Notifications\Support\TemplateRenderer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

uses(TestCase::class, RefreshDatabase::class);

it('replaces every merge field placeholder in subject and body', function () {
    $template = NotificationTemplate::factory()->make([
        'subject' => 'Order {{order_number}} confirmed',
        'body' => 'Hi {{customer_name}}, your total is {{grand_total}} {{currency_code}}.',
    ]);

    $rendered = app(TemplateRenderer::class)->render($template, [
        'order_number' => 'ORD-1001',
        'customer_name' => 'Jane Doe',
        'grand_total' => '150.0000',
        'currency_code' => 'BDT',
    ]);

    expect($rendered->subject)->toBe('Order ORD-1001 confirmed');
    expect($rendered->body)->toBe('Hi Jane Doe, your total is 150.0000 BDT.');
});

it('leaves a placeholder with no matching merge key untouched, per PRINCIPLES:EXPLICIT_FAILURE', function () {
    $template = NotificationTemplate::factory()->make([
        'subject' => 'Hello {{customer_name}}',
        'body' => 'Your code is {{missing_field}}.',
    ]);

    $rendered = app(TemplateRenderer::class)->render($template, ['customer_name' => 'Jane']);

    expect($rendered->subject)->toBe('Hello Jane');
    expect($rendered->body)->toBe('Your code is {{missing_field}}.');
});

it('returns a null subject when the template has none', function () {
    $template = NotificationTemplate::factory()->make(['subject' => null, 'body' => 'Just a body.']);

    $rendered = app(TemplateRenderer::class)->render($template, []);

    expect($rendered->subject)->toBeNull();
    expect($rendered->body)->toBe('Just a body.');
});
