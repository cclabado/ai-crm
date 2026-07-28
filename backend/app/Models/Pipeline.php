<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Pipeline extends TenantModel
{
    use HasPublicId;

    protected $casts = ['is_default' => 'boolean', 'is_active' => 'boolean'];

    public function stages(): HasMany
    {
        return $this->hasMany(PipelineStage::class)->orderBy('position');
    }
}
