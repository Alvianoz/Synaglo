<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\HealthReading;
use Carbon\Carbon;

class HealthReadingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Clear existing data
        HealthReading::truncate();

        // Generate data untuk hari ini (setiap jam dari jam 8 pagi)
        $today = Carbon::today();
        $currentHour = Carbon::now()->hour;
        
        // Mulai dari jam 8 pagi sampai jam sekarang
        for ($hour = 8; $hour <= $currentHour; $hour++) {
            // Generate beberapa readings per jam (setiap 15 menit)
            for ($minute = 0; $minute < 60; $minute += 15) {
                $time = $today->copy()->setTime($hour, $minute);
                
                // Skip future times
                if ($time->isFuture()) {
                    continue;
                }

                // Generate realistic health data dengan variasi natural
                $baseStress = $this->getBaseStress($hour);
                $stress = $baseStress + rand(-5, 5);
                
                HealthReading::create([
                    'heart_rate' => $this->getHeartRate($hour, $stress),
                    'spo2' => rand(96, 100) + (rand(0, 99) / 100),
                    'gsr' => rand(15, 35) / 10, // 1.5 - 3.5 µS
                    'temperature' => 36.0 + (rand(0, 15) / 10), // 36.0 - 37.5°C
                    'hrv' => $this->getHRV($stress),
                    'stress' => max(0, min(100, $stress)),
                    'reading_time' => $time,
                    'reading_type' => 'realtime',
                ]);
            }
        }

        // Generate data untuk 7 hari terakhir (hourly data)
        for ($day = 1; $day <= 7; $day++) {
            $date = Carbon::today()->subDays($day);
            
            for ($hour = 8; $hour < 22; $hour++) {
                $time = $date->copy()->setTime($hour, 0);
                
                $baseStress = $this->getBaseStress($hour);
                $stress = $baseStress + rand(-5, 5);
                
                HealthReading::create([
                    'heart_rate' => $this->getHeartRate($hour, $stress),
                    'spo2' => rand(96, 100) + (rand(0, 99) / 100),
                    'gsr' => rand(15, 35) / 10,
                    'temperature' => 36.0 + (rand(0, 15) / 10),
                    'hrv' => $this->getHRV($stress),
                    'stress' => max(0, min(100, $stress)),
                    'reading_time' => $time,
                    'reading_type' => 'historical',
                ]);
            }
        }

        $this->command->info('Health readings seeded successfully!');
    }

    /**
     * Get base stress level based on time of day
     */
    private function getBaseStress($hour)
    {
        // Stress pattern: lower in morning, peaks mid-day, lowers in evening
        if ($hour >= 8 && $hour < 10) {
            return rand(20, 35); // Morning - low stress
        } elseif ($hour >= 10 && $hour < 14) {
            return rand(40, 60); // Mid-day - moderate to high stress
        } elseif ($hour >= 14 && $hour < 18) {
            return rand(35, 50); // Afternoon - moderate stress
        } else {
            return rand(20, 40); // Evening - lower stress
        }
    }

    /**
     * Get heart rate based on time and stress
     */
    private function getHeartRate($hour, $stress)
    {
        // Base heart rate
        $baseHR = rand(65, 75);
        
        // Stress adds to heart rate
        $stressEffect = intval($stress / 5);
        
        // Time of day effect
        if ($hour >= 10 && $hour < 14) {
            $baseHR += rand(5, 10); // Higher during active hours
        }
        
        return $baseHR + $stressEffect;
    }

    /**
     * Get HRV (inversely related to stress)
     */
    private function getHRV($stress)
    {
        // Higher stress = lower HRV
        $baseHRV = 80;
        $stressEffect = intval($stress / 2);
        
        return max(30, $baseHRV - $stressEffect + rand(-5, 5));
    }
}
