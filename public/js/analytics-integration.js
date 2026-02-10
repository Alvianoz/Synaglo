/**
 * Analytics Data Integration
 * Loads analytics data from Laravel API
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadAnalyticsData();
});

/**
 * Load all analytics data
 */
async function loadAnalyticsData() {
    try {
        // Load summary cards
        await loadAnalyticsSummary();
        
        // Load trends for main chart
        await loadTrendsChart();
        
        // Load detailed analytics
        await loadDetailedAnalytics();
        
        // Load recording history
        await loadRecordingHistory();
    } catch (error) {
        console.error('Error loading analytics data:', error);
    }
}

/**
 * Load analytics summary (Health Score & Avg Stress)
 */
async function loadAnalyticsSummary() {
    try {
        const response = await window.synagloAPI.getAnalyticsSummary();
        
        if (response.success && response.data) {
            const data = response.data;
            
            // Update Health Score
            updateElement('healthScore', data.overall_health_score);
            
            // Update Avg Stress
            updateElement('avgStress', Math.round(data.avg_stress));
            
            console.log('✅ Analytics summary loaded:', data);
        }
    } catch (error) {
        console.error('Error loading analytics summary:', error);
    }
}

/**
 * Load trends data for weekly chart
 */
async function loadTrendsChart() {
    try {
        const response = await window.synagloAPI.getTrends('today');
        
        if (response.success && response.data) {
            const chartData = response.data;
            
            // Update main trends chart if function exists
            if (typeof updateWeeklyTrendsChart === 'function') {
                updateWeeklyTrendsChart(chartData);
            }
            
            console.log('✅ Trends chart data loaded');
        }
    } catch (error) {
        console.error('Error loading trends chart:', error);
    }
}

/**
 * Load detailed analytics (Heart Rate & Stress Pattern)
 */
async function loadDetailedAnalytics() {
    try {
        const response = await window.synagloAPI.getDetailedAnalytics();
        
        if (response.success && response.data) {
            const data = response.data;
            
            // Update Heart Rate Chart
            if (typeof updateHeartRateChart === 'function') {
                updateHeartRateChart(
                    data.heart_rate_analysis.labels,
                    data.heart_rate_analysis.values
                );
            }
            
            // Update Stress Pattern Chart
            if (typeof updateStressPatternChart === 'function') {
                updateStressPatternChart(
                    data.stress_pattern.labels,
                    data.stress_pattern.values
                );
            }
            
            console.log('✅ Detailed analytics loaded');
        }
    } catch (error) {
        console.error('Error loading detailed analytics:', error);
    }
}

/**
 * Load recording history
 */
async function loadRecordingHistory() {
    try {
        const response = await window.synagloAPI.getRecordingHistory('today', 10);
        
        if (response.success && response.data) {
            const recordings = response.data;
            
            const container = document.getElementById('recordingHistoryList');
            const loadingEl = document.getElementById('historyLoading');
            const emptyEl = document.getElementById('historyEmpty');
            
            // Hide loading
            if (loadingEl) loadingEl.style.display = 'none';
            
            if (recordings.length === 0) {
                // Show empty state
                if (emptyEl) emptyEl.style.display = 'block';
                return;
            }
            
            // Hide empty state
            if (emptyEl) emptyEl.style.display = 'none';
            
            // Render recordings
            if (container) {
                container.innerHTML = recordings.map(recording => `
                    <div class="recording-item">
                        <div class="recording-time">
                            <i class="fas fa-clock"></i>
                            ${formatTime(recording.start_time)} - ${formatTime(recording.end_time)}
                        </div>
                        <div class="recording-duration">
                            Duration: ${recording.duration}
                        </div>
                        <div class="recording-stats">
                            <span>HR: ${recording.avg_heart_rate} bpm</span>
                            <span>Stress: ${recording.avg_stress}</span>
                            <span>Score: ${recording.health_score}</span>
                        </div>
                        <div class="recording-status ${recording.overall_status.toLowerCase().replace(' ', '-')}">
                            ${recording.overall_status}
                        </div>
                    </div>
                `).join('');
            }
            
            console.log('✅ Recording history loaded:', recordings.length, 'items');
        }
    } catch (error) {
        console.error('Error loading recording history:', error);
    }
}

/**
 * Format ISO time to readable format
 */
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

/**
 * Helper function to update DOM element
 */
function updateElement(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}
