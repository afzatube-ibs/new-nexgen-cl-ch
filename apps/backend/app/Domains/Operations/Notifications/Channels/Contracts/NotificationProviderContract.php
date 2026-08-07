<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Channels\Contracts;

use App\Domains\Operations\Notifications\Channels\Support\NotificationSendRequest;
use App\Domains\Operations\Notifications\Channels\Support\NotificationSendResult;
use App\Domains\Operations\Notifications\Exceptions\UnsupportedNotificationProviderException;

/**
 * The one seam every channel provider integrates through — "adapter/
 * plugin based, never hardcoded into the notification engine," mirroring
 * Payments' Gateways\Contracts\PaymentGatewayContract and Shipping's
 * Couriers\Contracts\ShippingProviderContract exactly. A future provider
 * (a Phase 2 SMS or WhatsApp adapter, per the master plan's own "Phase 1
 * (Notifications + Email) / Phase 2 (SMS, WhatsApp)" split) becomes a new
 * class implementing this interface plus a Channels\ProviderFactory case
 * and a config/notifications.php entry — never a change to
 * Models\Notification, any Actions\* class, or any controller.
 *
 * Only `email` has a real, functional implementation in this delivery
 * (SmtpEmailProvider, MailgunEmailProvider, SesEmailProvider,
 * BrevoEmailProvider) — this interface itself is channel-agnostic by
 * design specifically so an `sms`/`whatsapp` provider plugs into the
 * identical `send()` shape without this interface, or any of this
 * module's own Actions, needing to change at all.
 */
interface NotificationProviderContract
{
    /**
     * The stable identifier this provider is registered and resolved
     * under — must match its config/notifications.php key.
     */
    public function code(): string;

    public function label(): string;

    /**
     * Which channel (Models\NotificationTemplate::CHANNELS) this provider
     * serves — a provider serves exactly one channel; a deployment with
     * both an email and (eventually) an SMS provider configured
     * registers two separate provider instances, never one provider
     * branching internally on channel.
     */
    public function channel(): string;

    /**
     * Whether this provider is currently usable — false when required
     * configuration (API credentials) is absent, per SECURITY:
     * SECRETS_MANAGEMENT. Channels\ProviderResolver refuses to resolve an
     * unavailable provider rather than letting a caller discover the gap
     * mid-send.
     */
    public function isAvailable(): bool;

    /**
     * @throws UnsupportedNotificationProviderException when the
     *                                                  provider's own API
     *                                                  rejects or fails
     *                                                  the request.
     */
    public function send(NotificationSendRequest $request): NotificationSendResult;
}
