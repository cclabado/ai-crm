<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Company extends TenantModel
{
    use HasPublicId, SoftDeletes;

    protected $casts = ['annual_revenue' => 'decimal:4'];

    public function contacts(): BelongsToMany
    {
        return $this->belongsToMany(Contact::class)->withPivot(['is_primary', 'relationship_title'])->withTimestamps();
    }
}
