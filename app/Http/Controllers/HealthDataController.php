<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

use Illuminate\Support\Facades\Auth;
use App\Models\HealthData;

class HealthDataController extends Controller
{
    /**
     * Save real-time BLE data to the database
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'hr' => 'nullable|numeric',
            'spo2' => 'nullable|numeric',
            'bt' => 'nullable|numeric',
            'at' => 'nullable|numeric',
            'ax' => 'nullable|numeric',
            'ay' => 'nullable|numeric',
            'az' => 'nullable|numeric',
            'gx' => 'nullable|numeric',
            'gy' => 'nullable|numeric',
            'gz' => 'nullable|numeric',
            'stress' => 'nullable|numeric',
            'act' => 'nullable|string',
            'finger' => 'nullable|boolean',
        ]);

        $validated['user_id'] = Auth::id() ?? 1; // Fallback for testing if not auth

        $healthData = HealthData::create($validated);

        return response()->json(['success' => true, 'data' => $healthData]);
    }

    /**
     * Get the latest health data for the dashboard
     */
    public function latest()
    {
        $userId = Auth::id() ?? 1;
        $data = HealthData::where('user_id', $userId)->latest()->first();

        if (!$data) {
            return response()->json(['success' => false, 'message' => 'No data found']);
        }

        return response()->json(['success' => true, 'data' => $data]);
    }

    /**
     * Get analytics data for trends (e.g., last 20 readings or aggregated)
     */
    public function analytics()
    {
        $userId = Auth::id() ?? 1;
        
        // Fetch up to 20 recent data points for charts
        $recentData = HealthData::where('user_id', $userId)
            ->latest()
            ->take(20)
            ->get()
            ->reverse()
            ->values(); // Re-index after reverse

        if ($recentData->isEmpty()) {
            return response()->json(['success' => false, 'message' => 'No data found']);
        }

        // Format data for Chart.js
        $labels = [];
        $heart_rate = [];
        $stress = [];
        $hrv = []; // Pseudo-HRV based on stress if not provided by ESP32

        foreach ($recentData as $row) {
            $labels[] = $row->created_at->format('H:i:s');
            $heart_rate[] = $row->hr ?? 0;
            $stress[] = $row->stress ?? 0;
            $hrv[] = round(80 - (($row->stress ?? 0) * 0.5)); // Fallback fake hrv
        }

        return response()->json([
            'success' => true, 
            'data' => [
                'labels' => $labels,
                'heart_rate' => $heart_rate,
                'stress' => $stress,
                'hrv' => $hrv
            ]
        ]);
    }
}
