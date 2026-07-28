<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends TenantModel
{
    use HasPublicId, SoftDeletes;

    protected $casts = ['issued_at' => 'date', 'due_at' => 'date', 'paid_at' => 'datetime'];

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('position');
    }
}
