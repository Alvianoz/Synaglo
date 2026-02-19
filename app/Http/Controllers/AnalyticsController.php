<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

class AnalyticsController extends Controller
{
    /**
     * Generate AI-powered health insights based on user's data
     */
    public function getAiSummary(Request $request)
    {
        $user = Auth::user();

        // Fetch user's recent health data
        $todaysSummary = \App\Models\AnalyticsSummary::today();
        $recentReadings = \App\Models\HealthReading::where('created_at', '>=', now()->subHours(24))
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();
        $sessionsToday = \App\Models\RecordingHistory::completed()
            ->whereDate('created_at', today())
            ->count();

        // Prepare data for AI analysis
        $healthScore = $todaysSummary ? round($todaysSummary->overall_health_score) : null;
        $avgStress = $todaysSummary ? round($todaysSummary->average_stress) : null;
        $avgHeartRate = $recentReadings->avg('heart_rate');
        $avgHrv = $recentReadings->avg('hrv');

        // Build prompt for Gemini
        $prompt = "You are a health advisor AI. Analyze this user's health data and provide 2-3 brief, actionable insights:\n\n";
        $prompt .= "Overall Health Score: " . ($healthScore ?? 'No data') . "/100\n";
        $prompt .= "Average Stress Level: " . ($avgStress ?? 'No data') . "/100\n";
        $prompt .= "Average Heart Rate: " . ($avgHeartRate ? round($avgHeartRate) . ' bpm' : 'No data') . "\n";
        $prompt .= "Average HRV: " . ($avgHrv ? round($avgHrv) . ' ms' : 'No data') . "\n";
        $prompt .= "Sessions Today: " . $sessionsToday . "\n\n";
        $prompt .= "Provide concise insights (2-3 sentences total). Focus on what's good and what could be improved. Be encouraging and specific.";

        try {
            // Call Gemini API
            $apiKey = env('GEMINI_API_KEY');

            // Check if key is available
            if (empty($apiKey)) {
                return response()->json([
                    'success' => false,
                    'message' => 'API Key missing in environment'
                ], 500);
            }

            // Using gemini-pro which is supported
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
            ])->post("https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={$apiKey}", [
                        'contents' => [
                            [
                                'parts' => [
                                    ['text' => $prompt]
                                ]
                            ]
                        ]
                    ]);

            if ($response->successful()) {
                $data = $response->json();

                // Detailed check for response structure
                if (isset($data['candidates'][0]['content']['parts'][0]['text'])) {
                    $aiText = $data['candidates'][0]['content']['parts'][0]['text'];

                    return response()->json([
                        'success' => true,
                        'insights' => $aiText,
                        'data' => [
                            'health_score' => $healthScore,
                            'avg_stress' => $avg_stress ?? 0,
                            'sessions_today' => $sessionsToday,
                        ]
                    ]);
                } else {
                    \Log::error('Gemini API success but invalid structure: ' . $response->body());
                    return response()->json([
                        'success' => false,
                        'message' => 'Invalid AI response format'
                    ], 500);
                }
            } else {
                \Log::error('Gemini API Error: ' . $response->status() . ' - ' . $response->body());
                return response()->json([
                    'success' => false,
                    'message' => 'AI Service Error: ' . $response->status()
                ], 500);
            }
        } catch (\Exception $e) {
            \Log::error('AI Analysis Exception: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Internal Error: ' . $e->getMessage()
            ], 500);
        }
    }
}
