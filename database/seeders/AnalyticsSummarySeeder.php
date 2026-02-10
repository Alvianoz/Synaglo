<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AnalyticsSummary;
use App\Models\HealthReading;
use Carbon\Carbon;

class AnalyticsSummarySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing data
        AnalyticsSummary::truncate();

        // Generate summary untuk hari ini dan 7 hari terakhir
        for ($day = 0; $day <= 7; $day++) {
            $date = Carbon::today()->subDays($day);
            
            // Get all readings for this day
            $readings = HealthReading::whereDate('reading_time', $date)->get();
            
            if ($readings->count() > 0) {
                // Calculate averages
                $avgHeartRate = $readings->avg('heart_rate');
                $avgStress = $readings->avg('stress');
                $avgHRV = $readings->avg('hrv');
                $avgSpO2 = $readings->avg('spo2');
                
                // Calculate health score (0-100)
                // Formula: weight average of metrics
                $hrScore = $this->calculateHRScore($avgHeartRate);
                $stressScore = 100 - $avgStress; // Lower stress is better
                $hrvScore = min(100, ($avgHRV / 80) * 100); // Target HRV = 80
                $spo2Score = min(100, ($avgSpO2 / 100) * 100);
                
                $overallScore = intval(
                    ($hrScore * 0.25) + 
                    ($stressScore * 0.35) + 
                    ($hrvScore * 0.25) + 
                    ($spo2Score * 0.15)
                );
                
                // Generate hourly breakdown
                $hourlyData = $this->generateHourlyData($date);
                
                AnalyticsSummary::create([
                    'date' => $date,
                    'overall_health_score' => $overallScore,
                    'avg_stress' => round($avgStress, 2),
                    'avg_heart_rate' => round($avgHeartRate, 2),
                    'avg_hrv' => round($avgHRV, 2),
                    'avg_spo2' => round($avgSpO2, 2),
                    'total_readings' => $readings->count(),
                    'hourly_data' => $hourlyData,
                ]);
            }
        }

        $this->command->info('Analytics summary seeded successfully!');
    }

    /**
     * Calculate heart rate score (0-100)
     */
    private function calculateHRScore($heartRate)
    {
        // Normal range: 60-100 bpm
        if ($heartRate >= 60 && $heartRate <= 100) {
            // Perfect score if between 70-80
            if ($heartRate >= 70 && $heartRate <= 80) {
                return 100;
            }
            // Good score if in normal range
            return 85;
        }
        
        // Outside normal range
        if ($heartRate < 60) {
            return max(50, 100 - ((60 - $heartRate) * 2));
        }
        
        return max(50, 100 - ((heartRate - 100) * 2));
    }

    /**
     * Generate hourly breakdown data
     */
    private function generateHourlyData($date)
    {
        $hourlyData = [];
        
        for ($hour = 8; $hour < 22; $hour++) {
            $startTime = Carbon::parse($date)->setTime($hour, 0, 0);
            $endTime = Carbon::parse($date)->setTime($hour, 59, 59);
            
            $hourReadings = HealthReading::whereBetween('reading_time', [$startTime, $endTime])->get();
            
            if ($hourReadings->count() > 0) {
                $hourlyData[] = [
                    'hour' => $hour,
                    'label' => sprintf('%02d:00', $hour),
                    'avg_heart_rate' => round($hourReadings->avg('heart_rate'), 1),
                    'avg_stress' => round($hourReadings->avg('stress'), 1),
                    'avg_hrv' => round($hourReadings->avg('hrv'), 1),
                    'avg_spo2' => round($hourReadings->avg('spo2'), 1),
                    'count' => $hourReadings->count(),
                ];
            }
        }
        
        return $hourlyData;
    }
}
