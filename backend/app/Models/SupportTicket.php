<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupportTicket extends TenantModel
{
    use HasPublicId, SoftDeletes;

    protected $casts = ['sla_due_at' => 'datetime', 'first_responded_at' => 'datetime', 'resolved_at' => 'datetime', 'closed_at' => 'datetime'];

    public function messages(): HasMany
    {
        return $this->hasMany(TicketMessage::class)->orderBy('sent_at');
    }
}
