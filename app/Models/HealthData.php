<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HealthData extends Model
{
    protected $fillable = [
        'user_id', 'hr', 'spo2', 'bt', 'at',
        'ax', 'ay', 'az', 'gx', 'gy', 'gz',
        'stress', 'act', 'finger'
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
