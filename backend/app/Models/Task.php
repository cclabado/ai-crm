<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class Task extends TenantModel
{
    use HasPublicId, SoftDeletes;

    protected $casts = ['starts_at' => 'datetime', 'due_at' => 'datetime', 'completed_at' => 'datetime'];

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }
}
