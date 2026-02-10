<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecordingHistory extends Model
{
    use HasFactory;

    protected $table = 'recording_history';

    protected $fillable = [
        'start_time',
        'end_time',
        'duration_seconds',
        'is_complete',
        'avg_heart_rate',
        'avg_spo2',
        'avg_stress',
        'avg_hrv',
        'health_score',
        'summary_data',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'is_complete' => 'boolean',
        'avg_spo2' => 'decimal:2',
        'summary_data' => 'array',
    ];

    /**
     * Get completed recordings only
     */
    public function scopeCompleted($query)
    {
        return $query->where('is_complete', true);
    }

    /**
     * Get recordings for today
     */
    public function scopeToday($query)
    {
        return $query->whereDate('start_time', today());
    }

    /**
     * Get latest recordings
     */
    public function scopeLatest($query, $limit = 10)
    {
        return $query->orderBy('start_time', 'desc')->limit($limit);
    }

    /**
     * Get formatted duration
     */
    public function getFormattedDurationAttribute()
    {
        if (!$this->duration_seconds) {
            return 'N/A';
        }

        $minutes = floor($this->duration_seconds / 60);
        $seconds = $this->duration_seconds % 60;

        return sprintf('%02d:%02d', $minutes, $seconds);
    }

    /**
     * Get overall status based on health score
     */
    public function getOverallStatusAttribute()
    {
        if (!$this->health_score) {
            return 'Unknown';
        }

        if ($this->health_score >= 80) {
            return 'Excellent';
        } elseif ($this->health_score >= 60) {
            return 'Good';
        } elseif ($this->health_score >= 40) {
            return 'Fair';
        }
        
        return 'Needs Attention';
    }
}
