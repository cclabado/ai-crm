<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends TenantModel
{
    use HasPublicId, SoftDeletes;

    protected $casts = ['unit_price' => 'decimal:4', 'default_tax_rate' => 'decimal:4', 'is_active' => 'boolean'];
}
