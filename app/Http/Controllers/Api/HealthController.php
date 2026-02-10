<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\HealthReading;
use Carbon\Carbon;
use Illuminate\Http\Request;

class HealthController extends Controller
{
    /**
     * Get current/latest health readings
     * 
     * @return \Illuminate\Http\JsonResponse
     */
    public function current()
    {
        try {
            // Get the most recent reading
            $reading = HealthReading::orderBy('reading_time', 'desc')->first();

            if (!$reading) {
                return response()->json([
                    'success' => false,
                    'message' => 'No health data available',
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'heart_rate' => $reading->heart_rate,
                    'heart_rate_status' => $reading->heart_rate_status,
                    'spo2' => $reading->spo2,
                    'spo2_status' => $reading->spo2_status,
                    'gsr' => $reading->gsr,
                    'temperature' => $reading->temperature,
                    'hrv' => $reading->hrv,
                    'stress' => $reading->stress,
                    'stress_status' => $reading->stress_status,
                    'timestamp' => $reading->reading_time->toIso8601String(),
                    'reading_type' => $reading->reading_type,
                ],
                'meta' => [
                    'last_updated' => $reading->reading_time->diffForHumans(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch health data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get health data stream for charts (continuous data)
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function stream(Request $request)
    {
        try {
            $period = $request->get('period', 'latest'); // latest, today, week, month
            $limit = $request->get('limit', 50);

            $query = HealthReading::query();

            switch ($period) {
                case 'today':
                    $query->today();
                    break;
                case 'week':
                    $query->where('reading_time', '>=', Carbon::now()->subWeek());
                    break;
                case 'month':
                    $query->where('reading_time', '>=', Carbon::now()->subMonth());
                    break;
                case 'latest':
                default:
                    // Get latest available data regardless of date
                    // Just order by time descending and limit
                    break;
            }

            $readings = $query
                ->orderBy('reading_time', 'desc')
                ->limit($limit)
                ->get()
                ->reverse(); // Reverse to get chronological order

            // Format data for charts
            $chartData = [
                'labels' => [],
                'heart_rate' => [],
                'stress' => [],
                'hrv' => [],
                'spo2' => [],
            ];

            foreach ($readings as $reading) {
                $chartData['labels'][] = $reading->reading_time->format('H:i');
                $chartData['heart_rate'][] = $reading->heart_rate;
                $chartData['stress'][] = $reading->stress;
                $chartData['hrv'][] = $reading->hrv;
                $chartData['spo2'][] = floatval($reading->spo2);
            }

            return response()->json([
                'success' => true,
                'data' => $chartData,
                'meta' => [
                    'period' => $period,
                    'count' => $readings->count(),
                    'start_time' => $readings->first()?->reading_time->toIso8601String(),
                    'end_time' => $readings->last()?->reading_time->toIso8601String(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch health stream data',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Get health metrics for specific time range
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function metrics(Request $request)
    {
        try {
            $startTime = $request->get('start_time', Carbon::today()->toDateTimeString());
            $endTime = $request->get('end_time', Carbon::now()->toDateTimeString());

            $readings = HealthReading::whereBetween('reading_time', [$startTime, $endTime])
                ->orderBy('reading_time', 'asc')
                ->get();

            if ($readings->isEmpty()) {
                return response()->json([
                    'success' => false,
                    'message' => 'No data available for the specified time range',
                ], 404);
            }

            // Calculate statistics
            $stats = [
                'heart_rate' => [
                    'average' => round($readings->avg('heart_rate'), 1),
                    'min' => $readings->min('heart_rate'),
                    'max' => $readings->max('heart_rate'),
                ],
                'stress' => [
                    'average' => round($readings->avg('stress'), 1),
                    'min' => $readings->min('stress'),
                    'max' => $readings->max('stress'),
                ],
                'hrv' => [
                    'average' => round($readings->avg('hrv'), 1),
                    'min' => $readings->min('hrv'),
                    'max' => $readings->max('hrv'),
                ],
                'spo2' => [
                    'average' => round($readings->avg('spo2'), 1),
                    'min' => $readings->min('spo2'),
                    'max' => $readings->max('spo2'),
                ],
            ];

            return response()->json([
                'success' => true,
                'data' => $stats,
                'meta' => [
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'total_readings' => $readings->count(),
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to calculate metrics',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}