<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\RecordingHistory;
use Carbon\Carbon;

class RecordingHistorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing data
        RecordingHistory::truncate();

        // Generate recording sessions untuk 7 hari terakhir
        // 2-4 sessions per day
        for ($day = 0; $day <= 7; $day++) {
            $date = Carbon::today()->subDays($day);
            $sessionsCount = rand(2, 4);
            
            for ($session = 0; $session < $sessionsCount; $session++) {
                // Random start time during the day (8 AM - 8 PM)
                $startHour = rand(8, 20);
                $startMinute = rand(0, 59);
                $startTime = $date->copy()->setTime($startHour, $startMinute, 0);
                
                // Skip future sessions
                if ($startTime->isFuture()) {
                    continue;
                }
                
                // Duration: 5-30 minutes
                $durationSeconds = rand(5, 30) * 60;
                $endTime = $startTime->copy()->addSeconds($durationSeconds);
                
                // Generate realistic averages
                $avgStress = rand(20, 70);
                $avgHeartRate = rand(65, 95);
                $avgHRV = rand(40, 80);
                $avgSpO2 = rand(96, 100) + (rand(0, 99) / 100);
                
                // Calculate health score
                $hrScore = $this->calculateHRScore($avgHeartRate);
                $stressScore = 100 - $avgStress;
                $hrvScore = min(100, ($avgHRV / 80) * 100);
                $spo2Score = min(100, ($avgSpO2 / 100) * 100);
                
                $healthScore = intval(
                    ($hrScore * 0.25) + 
                    ($stressScore * 0.35) + 
                    ($hrvScore * 0.25) + 
                    ($spo2Score * 0.15)
                );
                
                // Summary data with trends
                $summaryData = [
                    'peak_stress' => min(100, $avgStress + rand(5, 15)),
                    'min_stress' => max(0, $avgStress - rand(5, 15)),
                    'peak_heart_rate' => min(150, $avgHeartRate + rand(10, 20)),
                    'min_heart_rate' => max(50, $avgHeartRate - rand(5, 10)),
                    'stress_trend' => $this->getStressTrend($avgStress),
                    'activity_level' => $this->getActivityLevel($avgHeartRate),
                ];
                
                RecordingHistory::create([
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'duration_seconds' => $durationSeconds,
                    'is_complete' => true,
                    'avg_heart_rate' => intval($avgHeartRate),
                    'avg_spo2' => round($avgSpO2, 2),
                    'avg_stress' => intval($avgStress),
                    'avg_hrv' => intval($avgHRV),
                    'health_score' => $healthScore,
                    'summary_data' => $summaryData,
                ]);
            }
        }

        $this->command->info('Recording history seeded successfully!');
    }

    /**
     * Calculate heart rate score
     */
    private function calculateHRScore($heartRate)
    {
        if ($heartRate >= 60 && $heartRate <= 100) {
            if ($heartRate >= 70 && $heartRate <= 80) {
                return 100;
            }
            return 85;
        }
        
        if ($heartRate < 60) {
            return max(50, 100 - ((60 - $heartRate) * 2));
        }
        
        return max(50, 100 - ((heartRate - 100) * 2));
    }

    /**
     * Get stress trend description
     */
    private function getStressTrend($avgStress)
    {
        if ($avgStress < 30) {
            return 'consistently_low';
        } elseif ($avgStress < 50) {
            return 'moderate_fluctuations';
        } elseif ($avgStress < 70) {
            return 'elevated_periods';
        }
        return 'high_throughout';
    }

    /**
     * Get activity level based on heart rate
     */
    private function getActivityLevel($avgHeartRate)
    {
        if ($avgHeartRate < 70) {
            return 'resting';
        } elseif ($avgHeartRate < 85) {
            return 'light_activity';
        } elseif ($avgHeartRate < 100) {
            return 'moderate_activity';
        }
        return 'active';
    }
}
