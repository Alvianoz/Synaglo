<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('analytics_summary', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->integer('overall_health_score')->comment('0-100');
            $table->decimal('avg_stress', 5, 2)->comment('Average stress level for the day');
            $table->decimal('avg_heart_rate', 5, 2)->comment('Average heart rate for the day');
            $table->decimal('avg_hrv', 5, 2)->comment('Average HRV for the day');
            $table->decimal('avg_spo2', 5, 2)->comment('Average SpO2 for the day');
            $table->integer('total_readings')->default(0)->comment('Number of readings taken');
            $table->json('hourly_data')->nullable()->comment('Hourly breakdown of metrics');
            $table->timestamps();
            
            // Unique constraint on date
            $table->unique('date');
            $table->index('date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('analytics_summary');
    }
};
