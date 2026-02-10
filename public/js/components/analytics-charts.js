/**
 * Analytics Charts Component
 * Handles all chart rendering for the Analytics page
 * Now uses real data from Firestore
 */

// Store chart data from Firestore
let analyticsChartDataCache = {
    weeklyTrends: null,
    heartRate: null,
    stressPattern: null,
    sleepQuality: null,
    monthComparison: null
};

/**
 * Initialize all analytics charts
 * Now loads data from Firestore first
 */
async function initAnalyticsCharts() {
    // Load data from Firestore if available
    // Data will be loaded by analytics-firestore.js and passed to charts
    drawWeeklyTrendsChart();
    drawHeartRateChart();
    drawStressPatternChart();
    drawSleepQualityChart();
    drawMonthComparisonChart();
    updateAnalyticsData();
}

/**
 * Update chart data from Firestore
 * Called by analytics-firestore.js when data is loaded
 */
function updateChartDataFromFirestore(chartData) {
    if (chartData) {
        analyticsChartDataCache.weeklyTrends = chartData;
        analyticsChartDataCache.heartRate = chartData;
        analyticsChartDataCache.stressPattern = chartData;
        analyticsChartDataCache.sleepQuality = chartData;
        // Redraw charts with new data
        drawWeeklyTrendsChart();
        drawHeartRateChart();
        drawStressPatternChart();
        drawSleepQualityChart();
    }
}

/**
 * Draw weekly trends chart (multi-line)
 * Now uses real data from Firestore
 */
function drawWeeklyTrendsChart() {
    const canvas = document.getElementById('weeklyTrendsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Use real data from Firestore if available
    let chartData = analyticsChartDataCache.weeklyTrends;
    
    // Generate default data if no real data available
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    let heartRateData, stressData, hrvData;
    
    if (chartData && chartData.dates && chartData.heartRate && chartData.stress && chartData.hrv) {
        // Use real data from Firestore
        // Take last 7 days or all available data
        const dataLength = Math.min(7, chartData.dates.length);
        const startIndex = Math.max(0, chartData.dates.length - 7);
        
        heartRateData = chartData.heartRate.slice(startIndex, startIndex + dataLength);
        stressData = chartData.stress.slice(startIndex, startIndex + dataLength);
        hrvData = chartData.hrv.slice(startIndex, startIndex + dataLength);
        
        // Pad with default values if less than 7 days
        while (heartRateData.length < 7) {
            heartRateData.unshift(heartRateData[0] || 70);
            stressData.unshift(stressData[0] || 40);
            hrvData.unshift(hrvData[0] || 55);
        }
    } else {
        // Generate dummy data as fallback
        heartRateData = [72, 75, 70, 73, 74, 71, 72];
        stressData = [45, 50, 40, 42, 38, 35, 32];
        hrvData = [55, 58, 52, 60, 62, 65, 68];
    }
    
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Find max value for scaling
    const maxValue = Math.max(...heartRateData, ...stressData, ...hrvData) * 1.2;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw grid
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
        const y = padding.top + (chartHeight / 5) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();
    }
    
    // Draw lines
    function drawLine(data, color, label) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding.left + (chartWidth / (data.length - 1)) * index;
            const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = color;
        data.forEach((value, index) => {
            const x = padding.left + (chartWidth / (data.length - 1)) * index;
            const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
    }
    
    drawLine(heartRateData, '#6366f1', 'Heart Rate');
    drawLine(stressData, '#ec4899', 'Stress');
    drawLine(hrvData, '#10b981', 'HRV');
    
    // Draw labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    days.forEach((day, index) => {
        const x = padding.left + (chartWidth / (days.length - 1)) * index;
        ctx.fillText(day, x, height - padding.bottom + 20);
    });
}

/**
 * Draw heart rate detailed chart
 * Uses data from recordings in the last 24 hours (today)
 * Shows empty state if no recording data available
 */
function drawHeartRateChart() {
    const canvas = document.getElementById('heartRateChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Use real data from Firestore if available
    let chartData = analyticsChartDataCache.heartRate;
    let data = [];
    let hasData = false;
    
    if (chartData && chartData.hourlyHeartRate && chartData.hourlyHeartRate.length > 0) {
        // Use real hourly data from Firestore
        data = chartData.hourlyHeartRate.filter(val => val !== null && val > 0);
        hasData = data.length > 0;
    } else if (chartData && chartData.heartRate && chartData.heartRate.length > 0) {
        // Fallback: distribute available data across 24 hours
        const hourlyData = new Array(24).fill(null);
        const dataPoints = chartData.heartRate.filter(val => val !== null && val > 0);
        
        if (dataPoints.length > 0) {
            hasData = true;
            const step = Math.max(1, Math.floor(dataPoints.length / 24));
            
            for (let i = 0; i < 24; i++) {
                const index = Math.min(i * step, dataPoints.length - 1);
                hourlyData[i] = dataPoints[index] || null;
            }
            
            data = hourlyData.filter(val => val !== null);
        }
    }
    
    // If no data, show empty state
    if (!hasData || data.length === 0) {
        // Show "No recording data available" message
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No recording data available', width / 2, height / 2);
        
        // Hide chart container and show empty state
        const chartContainer = canvas.closest('.metric-detail-chart');
        if (chartContainer) {
            chartContainer.style.display = 'none';
        }
        
        // Show empty state message in card
        const card = canvas.closest('.metric-detail-card');
        if (card) {
            let emptyState = card.querySelector('.chart-empty-state');
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'chart-empty-state';
                emptyState.innerHTML = `
                    <i class="fas fa-clipboard-list"></i>
                    <p>No recording data available</p>
                    <small>Start recording on the Health page to see your heart rate analysis</small>
                `;
                const chartContainer = card.querySelector('.metric-detail-chart');
                if (chartContainer) {
                    chartContainer.parentNode.insertBefore(emptyState, chartContainer);
                }
            }
            emptyState.style.display = 'flex';
        }
        return;
    }
    
    // Hide empty state if it exists
    const card = canvas.closest('.metric-detail-card');
    if (card) {
        const emptyState = card.querySelector('.chart-empty-state');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }
    
    // Show chart container
    const chartContainer = canvas.closest('.metric-detail-chart');
    if (chartContainer) {
        chartContainer.style.display = 'block';
    }
    
    const padding = 10;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxValue = Math.max(...data) * 1.1;
    const minValue = Math.min(...data) * 0.9;
    const valueRange = maxValue - minValue;
    const barWidth = chartWidth / data.length;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw area chart
    const gradient = ctx.createLinearGradient(0, padding, 0, padding + chartHeight);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');
    
    ctx.beginPath();
    data.forEach((value, index) => {
        const x = padding + index * barWidth;
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.lineTo(padding + (data.length - 1) * barWidth, padding + chartHeight);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Draw line
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    data.forEach((value, index) => {
        const x = padding + index * barWidth;
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
}

/**
 * Draw stress pattern chart
 * Now uses real data from Firestore if available
 */
function drawStressPatternChart() {
    const canvas = document.getElementById('stressPatternChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Use real data from Firestore if available
    let chartData = analyticsChartDataCache.stressPattern;
    let data = [];
    let hasData = false;
    
    if (chartData && chartData.hourlyStress && chartData.hourlyStress.length > 0) {
        // Use real hourly data from Firestore
        data = chartData.hourlyStress.filter(val => val !== null && val > 0);
        hasData = data.length > 0;
    } else if (chartData && chartData.stress && chartData.stress.length > 0) {
        // Fallback: distribute available data across 24 hours
        const hourlyData = new Array(24).fill(null);
        const dataPoints = chartData.stress.filter(val => val !== null && val > 0);
        
        if (dataPoints.length > 0) {
            hasData = true;
            const step = Math.max(1, Math.floor(dataPoints.length / 24));
            
            for (let i = 0; i < 24; i++) {
                const index = Math.min(i * step, dataPoints.length - 1);
                hourlyData[i] = dataPoints[index] || null;
            }
        }
        
        data = hourlyData.filter(val => val !== null);
    }
    
    // If no data, show empty state
    if (!hasData || data.length === 0) {
        // Show "No recording data available" message
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('No recording data available', width / 2, height / 2);
        
        // Hide chart container and show empty state
        const chartContainer = canvas.closest('.metric-detail-chart');
        if (chartContainer) {
            chartContainer.style.display = 'none';
        }
        
        // Show empty state message in card
        const card = canvas.closest('.metric-detail-card');
        if (card) {
            let emptyState = card.querySelector('.chart-empty-state');
            if (!emptyState) {
                emptyState = document.createElement('div');
                emptyState.className = 'chart-empty-state';
                emptyState.innerHTML = `
                    <i class="fas fa-clipboard-list"></i>
                    <p>No recording data available</p>
                    <small>Start recording on the Health page to see your stress pattern analysis</small>
                `;
                const chartContainer = card.querySelector('.metric-detail-chart');
                if (chartContainer) {
                    chartContainer.parentNode.insertBefore(emptyState, chartContainer);
                }
            }
            emptyState.style.display = 'flex';
        }
        return;
    }
    
    // Hide empty state if it exists
    const card = canvas.closest('.metric-detail-card');
    if (card) {
        const emptyState = card.querySelector('.chart-empty-state');
        if (emptyState) {
            emptyState.style.display = 'none';
        }
    }
    
    // Show chart container
    const chartContainer = canvas.closest('.metric-detail-chart');
    if (chartContainer) {
        chartContainer.style.display = 'block';
    }
    
    const padding = 10;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxValue = 100;
    const barWidth = chartWidth / data.length;
    const barSpacing = barWidth * 0.3;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw bars
    data.forEach((value, index) => {
        const clampedValue = Math.max(0, Math.min(100, value));
        const barHeight = (clampedValue / maxValue) * chartHeight;
        const x = padding + index * barWidth + barSpacing / 2;
        const y = padding + chartHeight - barHeight;
        
        const gradient = ctx.createLinearGradient(0, y, 0, padding + chartHeight);
        gradient.addColorStop(0, '#ec4899');
        gradient.addColorStop(1, '#f472b6');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - barSpacing, barHeight, 4);
        ctx.fill();
    });
}

/**
 * Draw sleep quality chart
 * Now uses real data from Firestore if available
 */
function drawSleepQualityChart() {
    const canvas = document.getElementById('sleepQualityChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Use real data from Firestore if available
    let chartData = analyticsChartDataCache.sleepQuality || analyticsChartDataCache.heartRate;
    let data = [];
    
    if (chartData && chartData.sleepData && chartData.sleepData.length > 0) {
        // Use real sleep data from Firestore (last 7 days)
        data = chartData.sleepData;
    } else {
        // Generate weekly sleep data as fallback
        data = [7.2, 7.5, 6.8, 7.8, 7.3, 8.1, 7.5];
    }
    
    const padding = 10;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxValue = 10;
    const barWidth = chartWidth / data.length;
    const barSpacing = barWidth * 0.2;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw bars
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + index * barWidth + barSpacing / 2;
        const y = padding + chartHeight - barHeight;
        
        const gradient = ctx.createLinearGradient(0, y, 0, padding + chartHeight);
        gradient.addColorStop(0, '#6366f1');
        gradient.addColorStop(1, '#8b5cf6');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - barSpacing, barHeight, 4);
        ctx.fill();
        
        // Draw value label
        ctx.fillStyle = '#1e293b';
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(value.toFixed(1) + 'h', x + (barWidth - barSpacing) / 2, y - 5);
    });
}

/**
 * Draw month comparison chart
 */
function drawMonthComparisonChart() {
    const canvas = document.getElementById('monthComparisonChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Generate comparison data
    const categories = ['HRV', 'Stress', 'Sleep', 'Activity'];
    const thisMonth = [65, 35, 85, 78];
    const lastMonth = [58, 45, 72, 65];
    
    const padding = { top: 20, right: 20, bottom: 60, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const categoryWidth = chartWidth / categories.length;
    const barWidth = categoryWidth * 0.35;
    const maxValue = 100;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw bars
    categories.forEach((category, index) => {
        const x = padding.left + index * categoryWidth;
        
        // This month bar
        const thisHeight = (thisMonth[index] / maxValue) * chartHeight;
        const thisY = padding.top + chartHeight - thisHeight;
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(x + categoryWidth * 0.1, thisY, barWidth, thisHeight);
        
        // Last month bar
        const lastHeight = (lastMonth[index] / maxValue) * chartHeight;
        const lastY = padding.top + chartHeight - lastHeight;
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + categoryWidth * 0.55, lastY, barWidth, lastHeight);
        
        // Category label
        ctx.fillStyle = '#64748b';
        ctx.font = '12px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(category, x + categoryWidth / 2, height - padding.bottom + 20);
    });
    
    // Draw legend
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(padding.left, padding.top - 15, 12, 12);
    ctx.fillStyle = '#1e293b';
    ctx.font = '11px Inter';
    ctx.textAlign = 'left';
    ctx.fillText('This Month', padding.left + 18, padding.top - 3);
    
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(padding.left + 100, padding.top - 15, 12, 12);
    ctx.fillStyle = '#1e293b';
    ctx.fillText('Last Month', padding.left + 118, padding.top - 3);
}

/**
 * Generate random integer
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min) + min);
}

/**
 * Generate health score
 */
function generateHealthScore() {
    return Math.floor(Math.random() * 10 + 88);
}

/**
 * Update analytics data
 * Now data is updated by analytics-firestore.js, this function is kept for compatibility
 */
function updateAnalyticsData() {
    // Data is now updated by analytics-firestore.js via updateAnalyticsFromFirestore
    // This function is kept for compatibility but doesn't need to do anything
    // The actual updates happen in analytics-firestore.js
}

// Polyfill for roundRect
if (!CanvasRenderingContext2D.prototype.roundRect) {
    CanvasRenderingContext2D.prototype.roundRect = function(x, y, width, height, radius) {
        this.beginPath();
        this.moveTo(x + radius, y);
        this.lineTo(x + width - radius, y);
        this.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.lineTo(x + width, y + height - radius);
        this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.lineTo(x + radius, y + height);
        this.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.lineTo(x, y + radius);
        this.quadraticCurveTo(x, y, x + radius, y);
        this.closePath();
    };
}

// Make updateChartDataFromFirestore available globally
window.updateChartDataFromFirestore = updateChartDataFromFirestore;

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(async () => {
        await initAnalyticsCharts();
    }, 500);
    
    // Redraw on resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(async () => {
            await initAnalyticsCharts();
        }, 250);
    });
    
    // Handle period selector change
    const periodSelector = document.getElementById('periodSelector');
    if (periodSelector) {
        periodSelector.addEventListener('change', async function() {
            await initAnalyticsCharts();
        });
    }
});
