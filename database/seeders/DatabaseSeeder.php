<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            HealthReadingSeeder::class,
            AnalyticsSummarySeeder::class,
            RecordingHistorySeeder::class,
        ]);

        $this->command->info('🎉 All Synaglo data seeded successfully!');
    }
}
