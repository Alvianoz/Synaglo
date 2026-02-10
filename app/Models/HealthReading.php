<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HealthReading extends Model
{
    use HasFactory;

    protected $fillable = [
        'heart_rate',
        'spo2',
        'gsr',
        'temperature',
        'hrv',
        'stress',
        'reading_time',
        'reading_type',
    ];

    protected $casts = [
        'reading_time' => 'datetime',
        'spo2' => 'decimal:2',
        'gsr' => 'decimal:2',
        'temperature' => 'decimal:2',
    ];

    /**
     * Scope untuk mendapatkan data hari ini
     */
    public function scopeToday($query)
    {
        return $query->whereDate('reading_time', today());
    }

    /**
     * Scope untuk mendapatkan data realtime
     */
    public function scopeRealtime($query)
    {
        return $query->where('reading_type', 'realtime');
    }

    /**
     * Scope untuk mendapatkan data dalam range waktu tertentu
     */
    public function scopeInTimeRange($query, $start, $end)
    {
        return $query->whereBetween('reading_time', [$start, $end]);
    }

    /**
     * Get status for heart rate
     */
    public function getHeartRateStatusAttribute()
    {
        if ($this->heart_rate < 60) {
            return 'Low';
        } elseif ($this->heart_rate > 100) {
            return 'High';
        }
        return 'Normal';
    }

    /**
     * Get status for SpO2
     */
    public function getSpO2StatusAttribute()
    {
        if ($this->spo2 >= 95) {
            return 'Excellent';
        } elseif ($this->spo2 >= 90) {
            return 'Good';
        }
        return 'Low';
    }

    /**
     * Get status for stress level
     */
    public function getStressStatusAttribute()
    {
        if ($this->stress < 30) {
            return 'Low';
        } elseif ($this->stress < 60) {
            return 'Moderate';
        }
        return 'High';
    }
}
