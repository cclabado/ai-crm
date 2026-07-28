<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\SoftDeletes;

class Note extends TenantModel
{
    use HasPublicId, SoftDeletes;

    protected $casts = ['is_private' => 'boolean'];
}
