<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\ProfileController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| SYNAGLO API Routes - Public (No Authentication Required for Prototype)
|
| Base URL: /api
|
*/

// Health Monitoring Endpoints
Route::prefix('health')->group(function () {
    // GET /api/health/current - Get current/latest health readings
    Route::get('/current', [HealthController::class, 'current']);
    
    // GET /api/health/stream?period=today&limit=50 - Get continuous data for charts
    Route::get('/stream', [HealthController::class, 'stream']);
    
    // GET /api/health/metrics?start_time=...&end_time=... - Get health metrics for time range
    Route::get('/metrics', [HealthController::class, 'metrics']);
});

// Analytics Endpoints
Route::prefix('analytics')->group(function () {
    // GET /api/analytics/summary - Overall health score & avg stress
    Route::get('/summary', [AnalyticsController::class, 'summary']);
    
    // GET /api/analytics/trends?period=today - Get trends data (today/week/month)
    Route::get('/trends', [AnalyticsController::class, 'trends']);
    
    // GET /api/analytics/detailed - Detailed metrics (HR analysis, stress pattern)
    Route::get('/detailed', [AnalyticsController::class, 'detailed']);
    
    // GET /api/analytics/history?period=today&limit=20 - Recording history
    Route::get('/history', [AnalyticsController::class, 'history']);
});

// Profile Endpoints
Route::prefix('profile')->group(function () {
    // GET /api/profile/stats - User statistics (days active, sessions, health score)
    Route::get('/stats', [ProfileController::class, 'stats']);
    
    // GET /api/profile/health-trends - Health trends for profile page
    Route::get('/health-trends', [ProfileController::class, 'healthTrends']);
});

// Root API endpoint - API info
Route::get('/', function () {
    return response()->json([
        'name' => 'Synaglo API',
        'version' => '1.0.0',
        'description' => 'REST API for Synaglo Smartwatch Health Monitoring System',
        'endpoints' => [
            'health' => [
                'GET /api/health/current' => 'Get current health readings',
                'GET /api/health/stream' => 'Get continuous data stream',
                'GET /api/health/metrics' => 'Get metrics for time range',
            ],
            'analytics' => [
                'GET /api/analytics/summary' => 'Get analytics summary',
                'GET /api/analytics/trends' => 'Get trends data',
                'GET /api/analytics/detailed' => 'Get detailed analytics',
                'GET /api/analytics/history' => 'Get recording history',
            ],
            'profile' => [
                'GET /api/profile/stats' => 'Get user statistics',
                'GET /api/profile/health-trends' => 'Get health trends',
            ],
        ],
        'status' => 'active',
        'timestamp' => now()->toIso8601String(),
    ]);
});
