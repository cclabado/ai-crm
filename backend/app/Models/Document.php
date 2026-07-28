<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\SoftDeletes;

class Document extends TenantModel
{
    use HasPublicId, SoftDeletes;
}
