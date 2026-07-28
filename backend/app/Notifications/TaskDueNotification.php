<?php

namespace App\Notifications;

use App\Models\Task;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class TaskDueNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly Task $task) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toArray(object $notifiable): array
    {
        return ['event' => 'task.due', 'task_id' => $this->task->public_id, 'title' => $this->task->title, 'due_at' => $this->task->due_at?->toIso8601String()];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)->subject('CRM task deadline')->line("Task: {$this->task->title}")->line('Due: '.($this->task->due_at?->toDayDateTimeString() ?? 'No due date'))->action('Open tasks', config('app.frontend_url').'/tasks');
    }
}
