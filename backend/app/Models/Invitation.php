<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Invitation extends TenantModel
{
    use HasPublicId;

    protected $casts = ['expires_at' => 'datetime', 'accepted_at' => 'datetime'];

    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }
}
