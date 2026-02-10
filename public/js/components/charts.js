/**
 * Charts Component
 * Handles rendering of HRV and Stress Level charts
 * Now loads real data from Firestore
 */

// Store chart data from Firestore
let chartDataCache = {
    hrv: [],
    stress: []
};

/**
 * Calculate Human Resistance from raw GSR value
 * Formula: ((1024 + 2 * Serial_Port_Reading) * 10000) / (512 - Serial_Port_Reading)
 */
function calculateHumanResistance(gsr) {
    // Validate input - Serial_Port_Reading should be between 0 and 512
    if (gsr <= 0 || gsr >= 512) {
        return 0;
    }
    
    const denominator = 512 - gsr;
    if (denominator <= 0) {
        return 0;
    }
    
    const humanResistance = ((1024 + 2 * gsr) * 10000) / denominator;
    
    // Clamp value to reasonable range (0 - 10M ohm)
    if (humanResistance < 0) return 0;
    if (humanResistance > 10000000) return 10000000;
    
    return humanResistance;
}

/**
 * Load chart data from Firestore
 * Mengambil data rekaman dari Firestore untuk ditampilkan di charts
 */
async function loadChartDataFromFirestore() {
    try {
        // Import Firebase modules
        const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        const { collection, query, getDocs, orderBy, where, limit, Timestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        // Load Firebase config from centralized file
        const { initializeFirebase } = await import("./firebase-loader.js");
        const { auth, db } = await initializeFirebase();

        // Wait for auth state
        return new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                if (!user) {
                    console.log('No user logged in for chart data');
                    // Use empty data if not logged in
                    chartDataCache.hrv = [];
                    chartDataCache.stress = [];
                    resolve();
                    return;
                }

                try {
                    // Get today's recordings
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    
                    const recordingsRef = collection(db, 'users', user.uid, 'recordings');
                    // Simplified query to avoid index requirement
                    // Get all completed recordings and filter in memory
                    const q = query(
                        recordingsRef,
                        where('isComplete', '==', true),
                        limit(100) // Get last 100 recordings
                    );

                    const querySnapshot = await getDocs(q);
                    const recordings = [];
                    const todayISO = today.toISOString();

                    // Filter by date in memory
                    querySnapshot.forEach((doc) => {
                        const data = doc.data();
                        if (data.startTime && data.startTime >= todayISO) {
                            recordings.push(data);
                        }
                    });
                    
                    // Sort by startTime ascending
                    recordings.sort((a, b) => {
                        const timeA = new Date(a.startTime).getTime();
                        const timeB = new Date(b.startTime).getTime();
                        return timeA - timeB;
                    });

                    // Process recordings to extract HRV and Stress data
                    // HRV can be calculated from heart rate variability
                    // Stress can be calculated from GSR (higher GSR = higher stress)
                    const hrvData = [];
                    const stressData = [];

                    recordings.forEach((recording) => {
                        if (recording.data && Array.isArray(recording.data)) {
                            // Calculate HRV from heart rate data
                            const heartRates = recording.data
                                .map(d => d.heartRate)
                                .filter(hr => hr !== null && !isNaN(hr) && hr > 0);
                            
                            if (heartRates.length > 1) {
                                // Calculate HRV as standard deviation of heart rates
                                const avgHR = heartRates.reduce((sum, hr) => sum + hr, 0) / heartRates.length;
                                const variance = heartRates.reduce((sum, hr) => sum + Math.pow(hr - avgHR, 2), 0) / heartRates.length;
                                const hrv = Math.sqrt(variance);
                                hrvData.push(hrv);
                            }

                            // Calculate stress from GSR (Human Resistance)
                            // Data in recording.data is raw GSR, need to calculate Human Resistance
                            const gsrValues = recording.data
                                .map(d => {
                                    // Use humanResistance if available, otherwise calculate from raw GSR
                                    if (d.humanResistance !== null && d.humanResistance > 0) {
                                        return d.humanResistance;
                                    } else if (d.gsr !== null && !isNaN(d.gsr) && d.gsr > 0 && d.gsr < 512) {
                                        return calculateHumanResistance(d.gsr);
                                    }
                                    return null;
                                })
                                .filter(hr => hr !== null && hr > 0);
                            
                            if (gsrValues.length > 0) {
                                // Lower Human Resistance = higher stress
                                // Normalize to 0-100 scale
                                // Typical range: < 500 ohm = high stress, > 2000 ohm = low stress
                                const avgHR = gsrValues.reduce((sum, hr) => sum + hr, 0) / gsrValues.length;
                                // Convert to stress level (0-100)
                                // Formula: stress increases as resistance decreases
                                const stress = Math.max(0, Math.min(100, 100 - ((avgHR / 2000) * 100)));
                                stressData.push(stress);
                            }
                        } else if (recording.statistics) {
                            // Use statistics if available
                            const bpm = recording.statistics.avgBPM || 0;
                            if (bpm > 0) {
                                // Calculate HRV from BPM variability
                                // HRV is typically measured as standard deviation of R-R intervals
                                // Simplified: use BPM as proxy for HRV calculation
                                const hrv = 60 / bpm * 10; // Simplified formula
                                hrvData.push(hrv);
                            }

                            // Calculate stress from avgGSR (which is raw GSR in statistics)
                            // Need to convert to Human Resistance first
                            const rawGSR = recording.statistics.avgGSR || 0;
                            if (rawGSR > 0 && rawGSR < 512) {
                                const humanResistance = calculateHumanResistance(rawGSR);
                                // Convert to stress level (0-100)
                                const stress = Math.max(0, Math.min(100, 100 - ((humanResistance / 2000) * 100)));
                                stressData.push(stress);
                            }
                        }
                    });

                    // Only use real data - don't generate sample data
                    if (hrvData.length > 0) {
                        chartDataCache.hrv = hrvData;
                    } else {
                        chartDataCache.hrv = []; // Empty array - no data
                    }

                    if (stressData.length > 0) {
                        chartDataCache.stress = stressData;
                    } else {
                        chartDataCache.stress = []; // Empty array - no data
                    }

                    resolve();
                } catch (error) {
                    console.error('Error loading chart data from Firestore:', error);
                    // Use empty data on error
                    chartDataCache.hrv = [];
                    chartDataCache.stress = [];
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error('Error initializing Firebase for chart data:', error);
        // Use empty data on error
        chartDataCache.hrv = [];
        chartDataCache.stress = [];
    }
}

/**
 * Initialize all charts on the page
 */
async function initCharts() {
    // Load data from Firestore first
    await loadChartDataFromFirestore();
    
    const hrvCanvas = document.getElementById('hrvChart');
    const stressCanvas = document.getElementById('stressChart');
    
    if (hrvCanvas) {
        drawHRVChart(hrvCanvas);
    }
    
    if (stressCanvas) {
        drawStressChart(stressCanvas);
    }
}

/**
 * Draw Heart Rate Variability chart
 * Only displays if real recording data is available
 */
function drawHRVChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Use real data from Firestore only
    const data = chartDataCache.hrv || [];
    
    // Chart configuration
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // If no data, show flat line chart
    if (!data || data.length === 0) {
        // Draw flat line at bottom (zero value)
        const flatY = padding + chartHeight;
        const barWidth = chartWidth / 14; // Use 14 as default number of bars
        const barSpacing = barWidth * 0.2;
        
        // Draw flat bars (height = 0 or very small)
        for (let i = 0; i < 14; i++) {
            const x = padding + i * barWidth + barSpacing / 2;
            const y = flatY;
            const barHeight = 2; // Very small height to show flat line
            
            // Draw gray flat bar
            ctx.fillStyle = '#e5e7eb';
            ctx.fillRect(x, y - barHeight, barWidth - barSpacing, barHeight);
        }
        
        // Show "No data" message below chart
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('No recording data available', width / 2, flatY + 10);
        return;
    }
    
    // Calculate chart values
    const maxValue = Math.max(...data) * 1.2;
    const minValue = Math.min(...data) * 0.8;
    const valueRange = maxValue - minValue;
    const barWidth = chartWidth / data.length;
    const barSpacing = barWidth * 0.2;
    
    // Draw bars
    data.forEach((value, index) => {
        const barHeight = ((value - minValue) / valueRange) * chartHeight;
        const x = padding + index * barWidth + barSpacing / 2;
        const y = padding + chartHeight - barHeight;
        
        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(0, y, 0, padding + chartHeight);
        gradient.addColorStop(0, '#ec4899');
        gradient.addColorStop(1, '#f472b6');
        
        // Draw bar
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth - barSpacing, barHeight);
        
        // Add rounded corners effect
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - barSpacing, barHeight, 4);
        ctx.fill();
    });
}

/**
 * Draw Stress Level chart
 * Only displays if real recording data is available
 */
function drawStressChart(canvas) {
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    
    // Set canvas size
    canvas.width = width;
    canvas.height = height;
    
    // Use real data from Firestore only
    const data = chartDataCache.stress || [];
    
    // Chart configuration
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // If no data, show flat line chart
    if (!data || data.length === 0) {
        // Draw flat line at bottom (zero value)
        const flatY = padding + chartHeight;
        const barWidth = chartWidth / 14; // Use 14 as default number of bars
        const barSpacing = barWidth * 0.2;
        
        // Draw flat bars (height = 0 or very small)
        for (let i = 0; i < 14; i++) {
            const x = padding + i * barWidth + barSpacing / 2;
            const y = flatY;
            const barHeight = 2; // Very small height to show flat line
            
            // Draw gray flat bar
            ctx.fillStyle = '#e5e7eb';
            ctx.fillRect(x, y - barHeight, barWidth - barSpacing, barHeight);
        }
        
        // Show "No data" message below chart
        ctx.fillStyle = '#6b7280';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('No recording data available', width / 2, flatY + 10);
        return;
    }
    
    // Calculate chart values
    const maxValue = 100;
    const minValue = 0;
    const valueRange = maxValue - minValue;
    const barWidth = chartWidth / data.length;
    const barSpacing = barWidth * 0.2;
    
    // Draw bars
    data.forEach((value, index) => {
        const clampedValue = Math.max(0, Math.min(100, value));
        const barHeight = (clampedValue / valueRange) * chartHeight;
        const x = padding + index * barWidth + barSpacing / 2;
        const y = padding + chartHeight - barHeight;
        
        // Create gradient for each bar (green gradient)
        const gradient = ctx.createLinearGradient(0, y, 0, padding + chartHeight);
        gradient.addColorStop(0, '#10b981');
        gradient.addColorStop(1, '#34d399');
        
        // Draw bar
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - barSpacing, barHeight, 4);
        ctx.fill();
    });
}

// Polyfill for roundRect if not available
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

// Initialize charts when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Small delay to ensure canvas elements are rendered and Firebase is initialized
    setTimeout(async () => {
        await initCharts();
    }, 500);
    
    // Redraw charts on window resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(async () => {
            await initCharts();
        }, 250);
    });
    
    // Reload chart data every 30 seconds to get latest data
    setInterval(async () => {
        await loadChartDataFromFirestore();
        const hrvCanvas = document.getElementById('hrvChart');
        const stressCanvas = document.getElementById('stressChart');
        if (hrvCanvas) drawHRVChart(hrvCanvas);
        if (stressCanvas) drawStressChart(stressCanvas);
    }, 30000);
});
