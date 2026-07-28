<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\SoftDeletes;

class Attachment extends TenantModel
{
    use HasPublicId, SoftDeletes;
}
