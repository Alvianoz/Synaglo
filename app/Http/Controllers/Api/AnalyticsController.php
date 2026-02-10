<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AnalyticsSummary;
use App\Models\HealthReading;
use App\Models\RecordingHistory;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AnalyticsController extends Controller
{
    /**
     * Get analytics summary (overall health score & avg stress)
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function summary()
    {
        try {
            // Get the most recent summary available (not just today)
            $latestSummary = AnalyticsSummary::orderBy('date', 'desc')->first();

            if (!$latestSummary) {
                return response()->json([
                    'success' => false,
                    'message' => 'No analytics data available',
                ], 404);
            }

            // Get previous summary for comparison
            $previousSummary = AnalyticsSummary::where('date', '<', $latestSummary->date)
                ->orderBy('date', 'desc')
                ->first();

            $healthScoreChange = null;
            $stressChange = null;

            if ($previousSummary) {
                $healthScoreChange = $latestSummary->overall_health_score - $previousSummary->overall_health_score;
                $stressChange = $previousSummary->avg_stress - $latestSummary->avg_stress; // Reversed for improvement indicator
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'overall_health_score' => $latestSummary->overall_health_score,
                    'health_score_change' => $healthScoreChange,
                    'health_score_trend' => $healthScoreChange > 0 ? 'up' : ($healthScoreChange < 0 ? 'down' : 'stable'),
                    'avg_stress' => $latestSummary->avg_stress,
                    'stress_change' => $stressChange,
                    'stress_trend' => $stressChange > 0 ? 'improved' : ($stressChange < 0 ? 'increased' : 'stable'),
                    'avg_heart_rate' => $latestSummary->avg_heart_rate,
                    'avg_hrv' => $latestSummary->avg_hrv,
                    'avg_spo2' => $latestSummary->avg_spo2,
                    'total_readings' => $latestSummary->total_readings,
                ],
                'meta' => [
                    'date' => $latestSummary->date->toDateString(),
                    'last_updated' => $latestSummary->updated_at->diffForHumans(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch analytics summary',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get trends data for charts
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function trends(Request $request)
    {
        try {
            $period = $request->get('period', 'today'); // today, week, month

            $data = [];

            switch ($period) {
                case 'today':
                    $data = $this->getTodayTrends();
                    break;
                case 'week':
                    $data = $this->getWeekTrends();
                    break;
                case 'month':
                    $data = $this->getMonthTrends();
                    break;
            }

            return response()->json([
                'success' => true,
                'data' => $data,
                'meta' => [
                    'period' => $period,
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch trends data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get detailed analytics (heart rate analysis, stress pattern)
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function detailed()
    {
        try {
            // Get the most recent summary available
            $latestSummary = AnalyticsSummary::orderBy('date', 'desc')->first();

            if (!$latestSummary || !$latestSummary->hourly_data) {
                return response()->json([
                    'success' => false,
                    'message' => 'No detailed analytics available',
                ], 404);
            }

            $hourlyData = $latestSummary->hourly_data;

            // Prepare heart rate analysis
            $heartRateAnalysis = [
                'labels' => array_column($hourlyData, 'label'),
                'values' => array_column($hourlyData, 'avg_heart_rate'),
                'average' => $latestSummary->avg_heart_rate,
            ];

            // Prepare stress pattern
            $stressPattern = [
                'labels' => array_column($hourlyData, 'label'),
                'values' => array_column($hourlyData, 'avg_stress'),
                'average' => $latestSummary->avg_stress,
                'peak_hour' => $this->getPeakHour($hourlyData, 'avg_stress'),
            ];

            // Prepare HRV pattern
            $hrvPattern = [
                'labels' => array_column($hourlyData, 'label'),
                'values' => array_column($hourlyData, 'avg_hrv'),
                'average' => $latestSummary->avg_hrv,
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'heart_rate_analysis' => $heartRateAnalysis,
                    'stress_pattern' => $stressPattern,
                    'hrv_pattern' => $hrvPattern,
                ],
                'meta' => [
                    'date' => $latestSummary->date->toDateString(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch detailed analytics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get recording history
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function history(Request $request)
    {
        try {
            $period = $request->get('period', 'today'); // today, week, all
            $limit = $request->get('limit', 20);

            $query = RecordingHistory::query()->completed();

            switch ($period) {
                case 'today':
                    $query->today();
                    break;
                case 'week':
                    $query->where('start_time', '>=', Carbon::now()->subWeek());
                    break;
            }

            $recordings = $query
                ->orderBy('start_time', 'desc')
                ->limit($limit)
                ->get();

            $data = $recordings->map(function ($recording) {
                return [
                    'id' => $recording->id,
                    'start_time' => $recording->start_time->toIso8601String(),
                    'end_time' => $recording->end_time->toIso8601String(),
                    'duration' => $recording->formatted_duration,
                    'duration_seconds' => $recording->duration_seconds,
                    'avg_heart_rate' => $recording->avg_heart_rate,
                    'avg_spo2' => $recording->avg_spo2,
                    'avg_stress' => $recording->avg_stress,
                    'avg_hrv' => $recording->avg_hrv,
                    'health_score' => $recording->health_score,
                    'overall_status' => $recording->overall_status,
                    'summary_data' => $recording->summary_data,
                ];
            });

            return response()->json([
                'success' => true,
                'data' => $data,
                'meta' => [
                    'period' => $period,
                    'count' => $data->count(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch recording history',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get latest available trends
     */
    private function getTodayTrends()
    {
        // Get the most recent summary available
        $latestSummary = AnalyticsSummary::orderBy('date', 'desc')->first();

        if (!$latestSummary || !$latestSummary->hourly_data) {
            return [];
        }

        return [
            'labels' => array_column($latestSummary->hourly_data, 'label'),
            'heart_rate' => array_column($latestSummary->hourly_data, 'avg_heart_rate'),
            'stress' => array_column($latestSummary->hourly_data, 'avg_stress'),
            'hrv' => array_column($latestSummary->hourly_data, 'avg_hrv'),
        ];
    }

    /**
     * Get weekly trends (daily averages)
     */
    private function getWeekTrends()
    {
        $summaries = AnalyticsSummary::where('date', '>=', Carbon::now()->subWeek())
            ->orderBy('date', 'asc')
            ->get();

        return [
            'labels' => $summaries->pluck('date')->map(fn($d) => $d->format('D'))->toArray(),
            'heart_rate' => $summaries->pluck('avg_heart_rate')->toArray(),
            'stress' => $summaries->pluck('avg_stress')->toArray(),
            'hrv' => $summaries->pluck('avg_hrv')->toArray(),
            'health_score' => $summaries->pluck('overall_health_score')->toArray(),
        ];
    }

    /**
     * Get monthly trends (daily averages)
     */
    private function getMonthTrends()
    {
        $summaries = AnalyticsSummary::where('date', '>=', Carbon::now()->subMonth())
            ->orderBy('date', 'asc')
            ->get();

        return [
            'labels' => $summaries->pluck('date')->map(fn($d) => $d->format('M d'))->toArray(),
            'heart_rate' => $summaries->pluck('avg_heart_rate')->toArray(),
            'stress' => $summaries->pluck('avg_stress')->toArray(),
            'hrv' => $summaries->pluck('avg_hrv')->toArray(),
            'health_score' => $summaries->pluck('overall_health_score')->toArray(),
        ];
    }

    /**
     * Get peak hour for a specific metric
     */
    private function getPeakHour($hourlyData, $metric)
    {
        $maxValue = max(array_column($hourlyData, $metric));
        
        foreach ($hourlyData as $data) {
            if ($data[$metric] == $maxValue) {
                return $data['label'];
            }
        }
        
        return null;
    }
}