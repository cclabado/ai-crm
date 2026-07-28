<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Organization extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'slug',
        'logo_path',
        'status',
        'currency',
        'timezone',
        'locale',
        'date_format',
    ];

    protected static function booted(): void
    {
        static::creating(function (self $organization): void {
            if (! $organization->getAttribute('public_id')) {
                $organization->setAttribute('public_id', (string) Str::ulid());
            }

            if (! $organization->getAttribute('slug')) {
                $organization->setAttribute('slug', Str::slug($organization->name).'-'.Str::lower(Str::random(6)));
            }
        });
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class)
            ->withPivot(['status', 'is_owner', 'joined_at'])
            ->withTimestamps();
    }
}
