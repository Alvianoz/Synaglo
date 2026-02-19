<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;

Route::get('/', function () {
    return view('landing-page');
});

// Auth API endpoints (must be in web.php for session support)
Route::post('/api/auth/register', [App\Http\Controllers\AuthController::class, 'register']);
Route::post('/api/auth/login', [App\Http\Controllers\AuthController::class, 'login']);

Route::get('/auth', function () {
    return view('auth');
})->name('login');

Route::post('/logout', function (\Illuminate\Http\Request $request) {
    Auth::logout();
    $request->session()->invalidate();
    $request->session()->regenerateToken();
    return redirect()->route('login');
})->name('logout');

// Protected routes - require authentication
Route::middleware(['access'])->group(function () {
    Route::get('/dashboard', function () {
        return view('dashboard');
    });

    Route::get('/test-gemini-key', function () {
        return config('services.gemini.api_key');
    });

    Route::get('/analytics', function () {
        return view('analytics');
    });

    Route::get('/health', function () {
        return view('health');
    });

    Route::get('/profile', function () {
        $user = Auth::user();

        // Calculate days active (from account creation)
        $daysActive = $user->created_at->diffInDays(now());

        // Get total completed sessions from RecordingHistory
        $totalSessions = \App\Models\RecordingHistory::completed()->count();

        // Get today's health score from AnalyticsSummary
        $todaysSummary = \App\Models\AnalyticsSummary::today();
        $healthScore = $todaysSummary ? round($todaysSummary->overall_health_score) : null;

        return view('profile', compact('user', 'daysActive', 'totalSessions', 'healthScore'));
    });

    // AI Analytics Summary
    // Route::get('/api/analytics/ai-summary', [App\Http\Controllers\AnalyticsController::class, 'getAiSummary']);

    Route::get('/gemini-chat', [App\Http\Controllers\GeminiChatController::class, 'index']);
    Route::post('/gemini-chat/send', [App\Http\Controllers\GeminiChatController::class, 'sendMessage']);
});
