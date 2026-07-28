<?php

namespace App\Jobs;

use App\Models\EmailMessage;
use App\Models\Setting;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Mail;
use Throwable;

class SendCrmEmail implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    public function __construct(public readonly int $messageId, public readonly int $organizationId, public readonly string $subject) {}

    public function handle(): void
    {
        $message = EmailMessage::query()->findOrFail($this->messageId);
        $settings = Setting::query()->where('organization_id', $this->organizationId)->where('group', 'email')->pluck('value', 'key');
        if ($settings->has('host')) {
            config([
                'mail.default' => 'smtp', 'mail.mailers.smtp.host' => $settings['host'],
                'mail.mailers.smtp.port' => (int) ($settings['port'] ?? 587),
                'mail.mailers.smtp.encryption' => $settings['encryption'] ?? 'tls',
                'mail.mailers.smtp.username' => $settings['username'] ?? null,
                'mail.mailers.smtp.password' => filled($settings['password'] ?? null) ? Crypt::decryptString($settings['password']) : null,
                'mail.from.address' => $settings['from_address'] ?? $message->from_address,
                'mail.from.name' => $settings['from_name'] ?? config('app.name'),
            ]);
        }
        Mail::raw($message->body_text ?? '', function ($mail) use ($message): void {
            $mail->to($message->to_addresses)->subject($this->subject);
            if ($message->cc_addresses) {
                $mail->cc($message->cc_addresses);
            }
        });
        $message->update(['status' => 'sent', 'sent_at' => now()]);
    }

    public function failed(Throwable $exception): void
    {
        EmailMessage::query()->whereKey($this->messageId)->update(['status' => 'failed']);
    }
}
