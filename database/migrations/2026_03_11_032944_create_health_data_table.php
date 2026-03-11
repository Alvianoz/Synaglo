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
        Schema::create('health_data', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->cascadeOnDelete();
            $table->integer('hr')->nullable();
            $table->integer('spo2')->nullable();
            $table->decimal('bt', 5, 2)->nullable();
            $table->decimal('at', 5, 2)->nullable();
            $table->decimal('ax', 6, 3)->nullable();
            $table->decimal('ay', 6, 3)->nullable();
            $table->decimal('az', 6, 3)->nullable();
            $table->decimal('gx', 6, 3)->nullable();
            $table->decimal('gy', 6, 3)->nullable();
            $table->decimal('gz', 6, 3)->nullable();
            $table->integer('stress')->nullable();
            $table->string('act')->nullable();
            $table->boolean('finger')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('health_data');
    }
};
