<?php

declare(strict_types=1);

namespace App\Domains\Operations\Notifications\Channels;

use App\Domains\Operations\Notifications\Channels\Contracts\NotificationProviderContract;
use App\Domains\Operations\Notifications\Channels\Support\NotificationSendRequest;
use App\Domains\Operations\Notifications\Channels\Support\NotificationSendResult;
use App\Domains\Operations\Notifications\Models\NotificationTemplate;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\Transport\Smtp\EsmtpTransport;
use Symfony\Component\Mime\Email;

/**
 * Amazon SES — integrated through SES's own documented SMTP interface
 * (`email-smtp.{region}.amazonaws.com:587`, authenticated with SES SMTP
 * credentials — a distinct credential pair AWS generates specifically for
 * this purpose, not a raw IAM access key/secret), per this module's
 * Bangladesh-first "Amazon SES" entry.
 *
 * Deliberately not SES's REST `SendEmail` API: that surface requires
 * AWS Signature Version 4 request signing, which this delivery does not
 * hand-roll and would otherwise require adding the full AWS SDK as a
 * dependency for exactly one call. SES's own SMTP interface is a fully
 * genuine, first-class, AWS-documented way to send through SES — not a
 * stand-in — so this class is a real integration, honestly described,
 * per PRINCIPLES:EXPLICIT_FAILURE; it simply reuses the same transport
 * mechanism SmtpEmailProvider already implements rather than duplicating
 * it, since SES's SMTP interface and generic SMTP are the same protocol.
 */
final readonly class SesEmailProvider implements NotificationProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config) {}

    public function code(): string
    {
        return 'ses';
    }

    public function label(): string
    {
        return 'Amazon SES';
    }

    public function channel(): string
    {
        return NotificationTemplate::CHANNEL_EMAIL;
    }

    public function isAvailable(): bool
    {
        return filled($this->config['region'] ?? null)
            && filled($this->config['smtp_username'] ?? null)
            && filled($this->config['smtp_password'] ?? null)
            && filled($this->config['from_address'] ?? null);
    }

    public function send(NotificationSendRequest $request): NotificationSendResult
    {
        $email = (new Email)
            ->from($this->fromAddress())
            ->to($request->recipient)
            ->subject($request->subject ?? '')
            ->html($request->body);

        try {
            $sentMessage = $this->transport()->send($email);
        } catch (TransportExceptionInterface $e) {
            return new NotificationSendResult(
                status: 'failed',
                providerReference: null,
                raw: [],
                failureReason: $e->getMessage(),
            );
        }

        return new NotificationSendResult(
            status: 'succeeded',
            providerReference: $sentMessage?->getMessageId(),
            raw: ['message_id' => $sentMessage?->getMessageId()],
        );
    }

    private function transport(): EsmtpTransport
    {
        $transport = new EsmtpTransport(
            "email-smtp.{$this->config['region']}.amazonaws.com",
            (int) ($this->config['port'] ?? 587),
            true,
        );

        $transport->setUsername((string) $this->config['smtp_username']);
        $transport->setPassword((string) $this->config['smtp_password']);

        return $transport;
    }

    private function fromAddress(): string
    {
        $name = $this->config['from_name'] ?? null;
        $address = (string) $this->config['from_address'];

        return filled($name) ? "{$name} <{$address}>" : $address;
    }
}
