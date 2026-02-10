/**
 * Dashboard Data Integration
 * Loads real-time health data from Laravel API
 */

// Wait for DOM and API to be ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();
    
    // Auto-refresh every 5 seconds
    setInterval(loadDashboardData, 5000);
});

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
    try {
        // Load current health readings
        await loadCurrentHealth();
        
        // Load trends for charts
        await loadTodayTrends();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

/**
 * Load current health readings
 */
async function loadCurrentHealth() {
    try {
        const response = await window.synagloAPI.getCurrentHealth();
        
        if (response.success && response.data) {
            const data = response.data;
            
            // Update Heart Rate
            updateElement('dashboardHR', data.heart_rate);
            updateElement('dashboardHRStatus', data.heart_rate_status);
            
            // Update SpO2
            updateElement('dashboardSpO2', `${data.spo2}%`);
            updateElement('dashboardSpO2Status', data.spo2_status);
            
            // Update GSR
            updateElement('dashboardGSR', `${data.gsr} µS`);
            
            // Update Temperature
            updateElement('dashboardTemp', `${data.temperature}°C`);
            
            console.log('✅ Current health data loaded:', data);
        }
    } catch (error) {
        console.error('Error loading current health:', error);
        showError('Failed to load current health data');
    }
}

/**
 * Load today's trends for charts
 */
async function loadTodayTrends() {
    try {
        // Request latest available data (not just today)
        const response = await window.synagloAPI.getHealthStream('latest', 50);
        
        console.log('📥 API Response:', response); // Debug log
        
        if (response.success && response.data) {
            const chartData = response.data;
            
            console.log('📊 Chart Data:', chartData); // Debug log
            console.log('📊 HRV Data Length:', chartData.hrv?.length);
            console.log('📊 Stress Data Length:', chartData.stress?.length);
            
            // Update HRV Chart if it exists
            if (typeof updateHRVChart === 'function' && chartData.hrv && chartData.hrv.length > 0) {
                updateHRVChart(chartData.labels, chartData.hrv);
                console.log('✅ HRV Chart updated with', chartData.hrv.length, 'points');
            } else {
                console.warn('⚠️ No HRV data available or update function missing');
            }
            
            // Update Stress Chart if it exists
            if (typeof updateStressChart === 'function' && chartData.stress && chartData.stress.length > 0) {
                updateStressChart(chartData.labels, chartData.stress);
                console.log('✅ Stress Chart updated with', chartData.stress.length, 'points');
            } else {
                console.warn('⚠️ No Stress data available or update function missing');
            }
            
            console.log('✅ Trends data loaded for charts');
        } else {
            console.error('❌ Invalid API response:', response);
        }
    } catch (error) {
        console.error('Error loading trends:', error);
    }
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

/**
 * Show error message to user
 */
function showError(message) {
    console.error(message);
    // You can add UI error display here
}