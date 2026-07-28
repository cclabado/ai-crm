<?php

use App\Models\Task;
use App\Notifications\TaskDueNotification;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function (): void {
    Task::withoutGlobalScopes()->with('assignee')->whereNotNull('assigned_to')->whereNot('status', 'completed')->whereBetween('due_at', [now(), now()->addDay()])->chunkById(100, function ($tasks): void {
        foreach ($tasks as $task) {
            if ($task->assignee && Cache::add("task-reminder:{$task->id}:{$task->due_at?->format('YmdH')}", true, now()->addDays(2))) {
                $task->assignee->notify(new TaskDueNotification($task));
            }
        }
    });
})->hourly()->name('send-task-deadline-reminders')->withoutOverlapping();
