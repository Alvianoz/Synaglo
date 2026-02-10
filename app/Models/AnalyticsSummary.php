<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AnalyticsSummary extends Model
{
    use HasFactory;

    protected $table = 'analytics_summary';

    protected $fillable = [
        'date',
        'overall_health_score',
        'avg_stress',
        'avg_heart_rate',
        'avg_hrv',
        'avg_spo2',
        'total_readings',
        'hourly_data',
    ];

    protected $casts = [
        'date' => 'date',
        'avg_stress' => 'decimal:2',
        'avg_heart_rate' => 'decimal:2',
        'avg_hrv' => 'decimal:2',
        'avg_spo2' => 'decimal:2',
        'hourly_data' => 'array',
    ];

    /**
     * Get today's summary
     */
    public static function today()
    {
        return self::whereDate('date', today())->first();
    }

    /**
     * Get summary for specific date
     */
    public static function forDate($date)
    {
        return self::whereDate('date', $date)->first();
    }

    /**
     * Get health score trend
     */
    public function getHealthScoreTrendAttribute()
    {
        $yesterday = self::whereDate('date', today()->subDay())->first();
        
        if (!$yesterday) {
            return 'stable';
        }

        $diff = $this->overall_health_score - $yesterday->overall_health_score;
        
        if ($diff > 0) {
            return 'up';
        } elseif ($diff < 0) {
            return 'down';
        }
        
        return 'stable';
    }

    /**
     * Get stress trend
     */
    public function getStressTrendAttribute()
    {
        $yesterday = self::whereDate('date', today()->subDay())->first();
        
        if (!$yesterday) {
            return 'stable';
        }

        $diff = $this->avg_stress - $yesterday->avg_stress;
        
        // For stress, lower is better
        if ($diff < 0) {
            return 'improved';
        } elseif ($diff > 0) {
            return 'increased';
        }
        
        return 'stable';
    }
}
