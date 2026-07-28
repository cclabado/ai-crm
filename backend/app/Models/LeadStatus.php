<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;

class LeadStatus extends TenantModel
{
    use HasPublicId;

    protected $casts = ['is_active' => 'boolean'];
}
