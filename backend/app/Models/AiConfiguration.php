<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiConfiguration extends Model
{
    protected $guarded = ['id'];

    protected $hidden = ['encrypted_api_key'];

    protected $casts = ['is_enabled' => 'boolean', 'mock_mode' => 'boolean', 'allowed_features' => 'array'];
}
