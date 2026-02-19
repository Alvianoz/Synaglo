<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AnalyticsSummary;
use Carbon\Carbon;

class DummyAnalyticsSummarySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        AnalyticsSummary::create([
            'date' => Carbon::now()->toDateString(),
            'overall_health_score' => 75,
            'avg_stress' => 30,
            'avg_heart_rate' => 72,
            'avg_hrv' => 55,
            'avg_spo2' => 98,
            'total_readings' => 120,
            'hourly_data' => json_encode([
                ['label' => '08:00', 'avg_heart_rate' => 70, 'avg_stress' => 28, 'avg_hrv' => 60],
                ['label' => '12:00', 'avg_heart_rate' => 75, 'avg_stress' => 32, 'avg_hrv' => 54],
                ['label' => '16:00', 'avg_heart_rate' => 73, 'avg_stress' => 30, 'avg_hrv' => 52],
                ['label' => '20:00', 'avg_heart_rate' => 74, 'avg_stress' => 29, 'avg_hrv' => 55],
            ]),
        ]);
    }
}
