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
 * Generic SMTP delivery — the one email provider every self-hosted
 * installation can use with no external account at all (a local mail
 * relay, or any mailbox provider's own SMTP credentials), per this
 * module's Bangladesh-first "SMTP" entry.
 *
 * Deliberately builds its own Symfony Mailer transport at send time from
 * this module's own config/notifications.php `smtp` block, rather than
 * routing through Laravel's global config/mail.php mailer configuration
 * — this module's provider configuration is self-contained, exactly as
 * Payments' own gateway configuration never depends on anything outside
 * config/payments.php.
 */
final readonly class SmtpEmailProvider implements NotificationProviderContract
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(private array $config) {}

    public function code(): string
    {
        return 'smtp';
    }

    public function label(): string
    {
        return 'SMTP';
    }

    public function channel(): string
    {
        return NotificationTemplate::CHANNEL_EMAIL;
    }

    public function isAvailable(): bool
    {
        return filled($this->config['host'] ?? null)
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
            (string) $this->config['host'],
            (int) ($this->config['port'] ?? 587),
            ($this->config['encryption'] ?? 'tls') === 'tls',
        );

        if (filled($this->config['username'] ?? null)) {
            $transport->setUsername((string) $this->config['username']);
            $transport->setPassword((string) ($this->config['password'] ?? ''));
        }

        return $transport;
    }

    private function fromAddress(): string
    {
        $name = $this->config['from_name'] ?? null;
        $address = (string) $this->config['from_address'];

        return filled($name) ? "{$name} <{$address}>" : $address;
    }
}
