<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\SoftDeletes;

class Contact extends TenantModel
{
    use HasPublicId, SoftDeletes;
}
