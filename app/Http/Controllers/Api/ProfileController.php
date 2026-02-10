<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RecordingHistory;
use App\Models\AnalyticsSummary;
use Carbon\Carbon;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    /**
     * Get profile statistics
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function stats()
    {
        try {
            // Calculate days active
            $firstRecording = RecordingHistory::orderBy('start_time', 'asc')->first();
            $daysActive = 0;
            
            if ($firstRecording) {
                $daysActive = Carbon::parse($firstRecording->start_time)->diffInDays(Carbon::now()) + 1;
            }

            // Total completed sessions
            $totalSessions = RecordingHistory::completed()->count();

            // Get latest health score
            $latestSummary = AnalyticsSummary::orderBy('date', 'desc')->first();
            $healthScore = $latestSummary ? $latestSummary->overall_health_score : 0;

            // Additional stats
            $stats = [
                'days_active' => $daysActive,
                'total_sessions' => $totalSessions,
                'health_score' => $healthScore,
                'sessions_this_week' => RecordingHistory::completed()
                    ->where('start_time', '>=', Carbon::now()->subWeek())
                    ->count(),
                'sessions_this_month' => RecordingHistory::completed()
                    ->where('start_time', '>=', Carbon::now()->subMonth())
                    ->count(),
                'avg_session_duration' => $this->getAverageSessionDuration(),
                'total_monitoring_time' => $this->getTotalMonitoringTime(),
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'meta' => [
                    'calculated_at' => Carbon::now()->toIso8601String(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch profile stats',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get health trends for profile
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function healthTrends()
    {
        try {
            // Get last 7 days of health scores
            $summaries = AnalyticsSummary::where('date', '>=', Carbon::now()->subWeek())
                ->orderBy('date', 'asc')
                ->get();

            $trends = [
                'labels' => $summaries->pluck('date')->map(fn($d) => $d->format('M d'))->toArray(),
                'health_scores' => $summaries->pluck('overall_health_score')->toArray(),
                'stress_levels' => $summaries->pluck('avg_stress')->toArray(),
            ];

            return response()->json([
                'success' => true,
                'data' => $trends,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch health trends',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Calculate average session duration
     */
    private function getAverageSessionDuration()
    {
        $avgSeconds = RecordingHistory::completed()
            ->avg('duration_seconds');

        if (!$avgSeconds) {
            return '00:00';
        }

        $minutes = floor($avgSeconds / 60);
        $seconds = $avgSeconds % 60;

        return sprintf('%02d:%02d', $minutes, $seconds);
    }

    /**
     * Calculate total monitoring time
     */
    private function getTotalMonitoringTime()
    {
        $totalSeconds = RecordingHistory::completed()
            ->sum('duration_seconds');

        if (!$totalSeconds) {
            return '00:00:00';
        }

        $hours = floor($totalSeconds / 3600);
        $minutes = floor(($totalSeconds % 3600) / 60);
        $seconds = $totalSeconds % 60;

        return sprintf('%02d:%02d:%02d', $hours, $minutes, $seconds);
    }
}
