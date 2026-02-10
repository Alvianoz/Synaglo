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
        Schema::create('recording_history', function (Blueprint $table) {
            $table->id();
            $table->timestamp('start_time');
            $table->timestamp('end_time')->nullable();
            $table->integer('duration_seconds')->nullable()->comment('Duration in seconds');
            $table->boolean('is_complete')->default(false);
            $table->integer('avg_heart_rate')->nullable();
            $table->decimal('avg_spo2', 5, 2)->nullable();
            $table->integer('avg_stress')->nullable();
            $table->integer('avg_hrv')->nullable();
            $table->integer('health_score')->nullable()->comment('Overall score for this session');
            $table->json('summary_data')->nullable()->comment('Additional session summary');
            $table->timestamps();
            
            $table->index('start_time');
            $table->index('is_complete');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recording_history');
    }
};
