<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Model;

class EmailMessage extends Model
{
    use HasPublicId;

    protected $guarded = ['id'];

    protected $casts = ['to_addresses' => 'array', 'cc_addresses' => 'array', 'sent_at' => 'datetime'];

    public function thread()
    {
        return $this->belongsTo(EmailThread::class, 'email_thread_id');
    }
}
