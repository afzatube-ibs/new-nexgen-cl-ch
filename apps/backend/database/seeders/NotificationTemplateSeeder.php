<?php

namespace Database\Seeders;

use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Illuminate\Database\Seeder;

/**
 * Idempotent — safe to run repeatedly. Seeds the default English `email`
 * template for every event this delivery's app/Listeners/Send*.php
 * classes trigger, so the platform sends a real, usable notification out
 * of the box rather than failing with `NotificationValidationException`
 * ("template_not_found") on a fresh installation — matching
 * `PRINCIPLES:EXPLICIT_FAILURE`'s spirit of a working default over a
 * silent gap, and RoleSeeder's own precedent of shipping a real,
 * usable default rather than an empty table.
 */
class NotificationTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->templates() as $template) {
            NotificationTemplate::query()->updateOrCreate(
                ['code' => $template['code'], 'channel' => $template['channel'], 'locale' => $template['locale']],
                ['subject' => $template['subject'], 'body' => $template['body'], 'is_active' => true],
            );
        }
    }

    /**
     * @return list<array{code: string, channel: string, locale: string, subject: string, body: string}>
     */
    private function templates(): array
    {
        return [
            [
                'code' => 'order.confirmation',
                'channel' => NotificationTemplate::CHANNEL_EMAIL,
                'locale' => 'en',
                'subject' => 'Your order {{order_number}} has been received',
                'body' => "Hi {{customer_name}},\n\nThank you for your order! We've received order {{order_number}} for {{grand_total}} {{currency_code}} and will begin processing it shortly.\n\nThank you for shopping with us.",
            ],
            [
                'code' => 'payment.receipt',
                'channel' => NotificationTemplate::CHANNEL_EMAIL,
                'locale' => 'en',
                'subject' => 'Payment received for order {{order_number}}',
                'body' => "Hi {{customer_name}},\n\nWe've successfully received your payment of {{amount}} {{currency_code}} for order {{order_number}}.\n\nThank you.",
            ],
            [
                'code' => 'payment.refunded',
                'channel' => NotificationTemplate::CHANNEL_EMAIL,
                'locale' => 'en',
                'subject' => 'Refund processed for order {{order_number}}',
                'body' => "Hi {{customer_name}},\n\nA refund of {{amount}} {{currency_code}} has been processed for order {{order_number}}. Please allow a few business days for it to appear on your original payment method.",
            ],
            [
                'code' => 'shipment.dispatched',
                'channel' => NotificationTemplate::CHANNEL_EMAIL,
                'locale' => 'en',
                'subject' => 'Your order {{order_number}} is on its way',
                'body' => "Hi {{customer_name}},\n\nYour order {{order_number}} has been dispatched via {{courier}}. Tracking number: {{tracking_number}}.",
            ],
            [
                'code' => 'shipment.delivered',
                'channel' => NotificationTemplate::CHANNEL_EMAIL,
                'locale' => 'en',
                'subject' => 'Your order {{order_number}} has been delivered',
                'body' => "Hi {{customer_name}},\n\nYour order {{order_number}} has been delivered. We hope you enjoy your purchase!",
            ],
            [
                'code' => 'return.requested',
                'channel' => NotificationTemplate::CHANNEL_EMAIL,
                'locale' => 'en',
                'subject' => 'We received your return request ({{rma_number}})',
                'body' => "Hi {{customer_name}},\n\nWe've received your return request for order {{order_number}} (RMA {{rma_number}}). We'll review it and follow up with next steps shortly.",
            ],
            [
                'code' => 'refund.issued',
                'channel' => NotificationTemplate::CHANNEL_EMAIL,
                'locale' => 'en',
                'subject' => 'Your refund for return {{rma_number}} has been issued',
                'body' => "Hi {{customer_name}},\n\nYour refund of {{amount}} {{currency_code}} for return {{rma_number}} (order {{order_number}}) has been issued.",
            ],
            [
                'code' => 'customer.welcome',
                'channel' => NotificationTemplate::CHANNEL_EMAIL,
                'locale' => 'en',
                'subject' => 'Welcome!',
                'body' => "Hi there,\n\nThanks for creating an account with us. We're glad to have you!",
            ],
            [
                'code' => 'payment.failed',
                'channel' => NotificationTemplate::CHANNEL_EMAIL,
                'locale' => 'en',
                'subject' => 'We couldn\'t process your payment for order {{order_number}}',
                'body' => "Hi {{customer_name}},\n\nWe were unable to process your payment for order {{order_number}}: {{reason}}. Please try again or use a different payment method.",
            ],
            [
                'code' => 'checkout.abandoned',
                'channel' => NotificationTemplate::CHANNEL_EMAIL,
                'locale' => 'en',
                'subject' => 'You left something in your cart',
                'body' => "Hi {{customer_name}},\n\nYou still have {{item_count}} item(s) totalling {{grand_total}} {{currency_code}} waiting in your cart. Come back whenever you're ready to complete your order.",
            ],
            [
                'code' => 'order.cancelled',
                'channel' => NotificationTemplate::CHANNEL_EMAIL,
                'locale' => 'en',
                'subject' => 'Your order {{order_number}} has been cancelled',
                'body' => "Hi {{customer_name}},\n\nYour order {{order_number}} has been cancelled. If you believe this is a mistake or have any questions, please contact customer support.",
            ],
        ];
    }
}
