<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    use HasPublicId;

    public $timestamps = false;

    protected $guarded = ['id'];

    protected $casts = ['before' => 'array', 'after' => 'array', 'created_at' => 'datetime'];
}
