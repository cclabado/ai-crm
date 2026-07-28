<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Model;

class AiRequestLog extends Model
{
    use HasPublicId;

    public $timestamps = false;

    protected $guarded = ['id'];
}
