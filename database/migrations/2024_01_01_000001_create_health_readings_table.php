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
        Schema::create('health_readings', function (Blueprint $table) {
            $table->id();
            $table->integer('heart_rate')->comment('BPM - Beats Per Minute');
            $table->decimal('spo2', 5, 2)->comment('Oxygen Saturation %');
            $table->decimal('gsr', 8, 2)->comment('Galvanic Skin Response (µS)');
            $table->decimal('temperature', 5, 2)->comment('Body Temperature (Celsius)');
            $table->integer('hrv')->comment('Heart Rate Variability');
            $table->integer('stress')->comment('Stress Level (0-100)');
            $table->timestamp('reading_time');
            $table->string('reading_type')->default('realtime')->comment('realtime, recorded, historical');
            $table->timestamps();
            
            // Indexes for faster queries
            $table->index('reading_time');
            $table->index('reading_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('health_readings');
    }
};
