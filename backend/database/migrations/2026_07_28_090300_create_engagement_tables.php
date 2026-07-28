<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 24)->default('task')->index();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('priority', 16)->default('medium')->index();
            $table->string('status', 24)->default('todo')->index();
            $table->timestamp('starts_at')->nullable()->index();
            $table->timestamp('due_at')->nullable()->index();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['organization_id', 'assigned_to', 'status', 'due_at'], 'tasks_org_assignee_status_due_idx');
        });

        Schema::create('taskables', function (Blueprint $table) {
            $table->foreignId('task_id')->constrained()->cascadeOnDelete();
            $table->string('taskable_type');
            $table->unsignedBigInteger('taskable_id');
            $table->primary(['task_id', 'taskable_type', 'taskable_id'], 'taskables_primary');
            $table->index(['taskable_type', 'taskable_id']);
        });

        Schema::create('activities', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->string('subject_type');
            $table->unsignedBigInteger('subject_id');
            $table->string('type', 40)->index();
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('occurred_at')->index();
            $table->json('metadata')->nullable();
            $table->timestamps();
            $table->index(['subject_type', 'subject_id', 'occurred_at'], 'activities_subject_occurred_idx');
            $table->index(['organization_id', 'type', 'occurred_at'], 'activities_org_type_occurred_idx');
        });

        Schema::create('notes', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('noteable_type');
            $table->unsignedBigInteger('noteable_id');
            $table->longText('body');
            $table->boolean('is_private')->default(false)->index();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['noteable_type', 'noteable_id', 'created_at']);
        });

        Schema::create('attachments', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('attachable_type');
            $table->unsignedBigInteger('attachable_id');
            $table->string('disk', 40)->default('local');
            $table->string('path');
            $table->string('original_name');
            $table->string('mime_type', 120);
            $table->unsignedBigInteger('size');
            $table->char('checksum', 64)->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index(['attachable_type', 'attachable_id']);
        });

        Schema::create('tags', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('color', 20)->nullable();
            $table->timestamps();
            $table->unique(['organization_id', 'name']);
        });

        Schema::create('taggables', function (Blueprint $table) {
            $table->foreignId('tag_id')->constrained()->cascadeOnDelete();
            $table->string('taggable_type');
            $table->unsignedBigInteger('taggable_id');
            $table->primary(['tag_id', 'taggable_type', 'taggable_id'], 'taggables_primary');
            $table->index(['taggable_type', 'taggable_id']);
        });

        Schema::create('reminders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('remindable_type');
            $table->unsignedBigInteger('remindable_id');
            $table->string('channel', 24)->default('in_app');
            $table->timestamp('remind_at')->index();
            $table->timestamp('sent_at')->nullable();
            $table->string('status', 24)->default('pending')->index();
            $table->timestamps();
            $table->index(['remindable_type', 'remindable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminders');
        Schema::dropIfExists('taggables');
        Schema::dropIfExists('tags');
        Schema::dropIfExists('attachments');
        Schema::dropIfExists('notes');
        Schema::dropIfExists('activities');
        Schema::dropIfExists('taskables');
        Schema::dropIfExists('tasks');
    }
};
