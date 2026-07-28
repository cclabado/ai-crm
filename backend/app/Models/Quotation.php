<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Quotation extends TenantModel
{
    use HasPublicId, SoftDeletes;

    protected $casts = ['issued_at' => 'date', 'expires_at' => 'date', 'sent_at' => 'datetime', 'accepted_at' => 'datetime'];

    public function items(): HasMany
    {
        return $this->hasMany(QuotationItem::class)->orderBy('position');
    }
}
