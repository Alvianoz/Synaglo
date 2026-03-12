<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use App\Models\HealthData;
use App\Models\User;

class HealthDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Generate 20 minutes of fake data
        $now = now();
        $data = [];

        // Ensure we have a user
        $user = User::first() ?? User::factory()->create([
            'name' => 'Demo User',
            'email' => 'demo@example.com',
        ]);

        for ($i = 20; $i >= 0; $i--) {
            // Fake realistic variance
            $baseHr = 75;
            $baseStress = 30;
            $baseSpo2 = 98;
            
            $data[] = [
                'user_id' => $user->id,
                'hr' => $baseHr + rand(-5, 10),
                'spo2' => $baseSpo2 + rand(-1, 2),
                'bt' => 36.5 + (rand(-4, 4) / 10),
                'at' => 28.2,
                'ax' => rand(-50, 50) / 100,
                'ay' => rand(-50, 50) / 100,
                'az' => 1.00 + (rand(-10, 10) / 100),
                'gx' => rand(-50, 50) / 10,
                'gy' => rand(-50, 50) / 10,
                'gz' => rand(-50, 50) / 10,
                'stress' => $baseStress + rand(-10, 20),
                'act' => 'DIAM',
                'finger' => true,
                'created_at' => $now->copy()->subMinutes($i),
                'updated_at' => $now->copy()->subMinutes($i),
            ];
        }

        HealthData::insert($data);
    }
}
