/**
 * Analytics Firestore Integration
 * Load data rekaman dari Firestore untuk ditampilkan di analytics page
 */

/**
 * Get user recordings from Firestore
 * Mengambil data rekaman user untuk analytics
 */
async function getUserRecordingsForAnalytics(userId, period = 'month') {
    try {
        // Import Firestore modules
        const { collection, query, getDocs, orderBy, where, limit, Timestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        // Load Firebase config from centralized file
        const { initializeFirebase } = await import("./firebase-loader.js");
        const { db } = await initializeFirebase();

        // Calculate date range based on period
        const now = new Date();
        let startDate = new Date();
        let endDate = new Date();
        
        switch (period) {
            case 'today':
                // Hanya data hari ini
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
                break;
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                // Default: hari ini saja
                startDate.setHours(0, 0, 0, 0);
                endDate.setHours(23, 59, 59, 999);
        }

        // Get recordings from Firestore
        // Simplified query to avoid index requirement - filter in memory
        const recordingsRef = collection(db, 'users', userId, 'recordings');
        const q = query(
            recordingsRef,
            where('isComplete', '==', true),
            limit(200) // Get last 200 recordings
        );

        const querySnapshot = await getDocs(q);
        const recordings = [];

        // Filter by date range in memory
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const recStartTime = data.startTime ? new Date(data.startTime) : null;
            
            // Filter by date range
            if (recStartTime) {
                if (period === 'today') {
                    // Filter for today only
                    if (recStartTime >= startDate && recStartTime <= endDate) {
                        recordings.push({
                            id: doc.id,
                            ...data,
                            startTime: recStartTime,
                            endTime: data.endTime ? new Date(data.endTime) : null
                        });
                    }
                } else {
                    // Filter for other periods
                    if (recStartTime >= startDate) {
                        recordings.push({
                            id: doc.id,
                            ...data,
                            startTime: recStartTime,
                            endTime: data.endTime ? new Date(data.endTime) : null
                        });
                    }
                }
            }
        });

        // Sort by startTime descending
        recordings.sort((a, b) => {
            const timeA = a.startTime ? a.startTime.getTime() : 0;
            const timeB = b.startTime ? b.startTime.getTime() : 0;
            return timeB - timeA;
        });

        return recordings;
    } catch (error) {
        console.error('Error getting user recordings for analytics:', error);
        return [];
    }
}

/**
 * Calculate analytics statistics from recordings
 * Menghitung statistik dari data rekaman
 */
function calculateAnalyticsStats(recordings) {
    if (!recordings || recordings.length === 0) {
        return {
            healthScore: 0,
            avgStress: 0,
            avgBPM: 0,
            avgSpO2: 0,
            avgGSR: 0,
            avgTemp: 0,
            totalRecordings: 0,
            totalDuration: 0,
            healthScoreChange: 0,
            stressChange: 0
        };
    }

    // Calculate averages
    const validRecordings = recordings.filter(r => r.statistics);
    const avgBPM = validRecordings.length > 0
        ? Math.round(validRecordings.reduce((sum, r) => sum + (r.statistics.avgBPM || 0), 0) / validRecordings.length)
        : 0;
    
    const avgSpO2 = validRecordings.length > 0
        ? Math.round(validRecordings.reduce((sum, r) => sum + (r.statistics.avgSpO2 || 0), 0) / validRecordings.length)
        : 0;
    
    const avgGSR = validRecordings.length > 0
        ? Math.round(validRecordings.reduce((sum, r) => sum + (r.statistics.avgGSR || 0), 0) / validRecordings.length)
        : 0;
    
    const avgTemp = validRecordings.length > 0
        ? (validRecordings.reduce((sum, r) => sum + (r.statistics.avgTemp || 0), 0) / validRecordings.length).toFixed(1)
        : 0;

    // Calculate health score (0-100)
    // Formula: Based on BPM (normal range), SpO2, and GSR
    let healthScore = 0;
    if (avgBPM > 0 && avgSpO2 > 0) {
        // BPM score (60-100 is optimal)
        const bpmScore = avgBPM >= 60 && avgBPM <= 100 ? 100 : 
                       avgBPM < 60 ? (avgBPM / 60) * 100 : 
                       Math.max(0, 100 - ((avgBPM - 100) / 100) * 100);
        
        // SpO2 score (95-100 is optimal)
        const spo2Score = avgSpO2 >= 95 ? 100 : (avgSpO2 / 95) * 100;
        
        // GSR score (lower is better, but we'll use a normalized approach)
        // Assuming lower GSR means less stress
        const gsrScore = avgGSR > 0 ? Math.max(0, 100 - (avgGSR / 100) * 50) : 50;
        
        // Weighted average
        healthScore = Math.round((bpmScore * 0.4 + spo2Score * 0.4 + gsrScore * 0.2));
    }

    // Calculate stress level (inverse of health, normalized)
    const avgStress = Math.max(0, Math.min(100, 100 - healthScore));

    // Calculate total duration
    const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);

    return {
        healthScore,
        avgStress: Math.round(avgStress),
        avgBPM,
        avgSpO2,
        avgGSR,
        avgTemp: parseFloat(avgTemp),
        totalRecordings: recordings.length,
        totalDuration,
        healthScoreChange: 0, // Will be calculated when comparing periods
        stressChange: 0 // Will be calculated when comparing periods
    };
}

/**
 * Update analytics page with data from Firestore
 */
async function updateAnalyticsFromFirestore(userId, period = 'month') {
    try {
        // Get recordings
        const recordings = await getUserRecordingsForAnalytics(userId, period);
        
        // Calculate statistics
        const stats = calculateAnalyticsStats(recordings);

        // Prepare data for charts FIRST (before using chartData)
        const chartData = prepareChartData(recordings);

        // Update UI elements
        const healthScoreEl = document.getElementById('healthScore');
        if (healthScoreEl) {
            healthScoreEl.textContent = stats.healthScore;
        }

        const avgStressEl = document.getElementById('avgStress');
        if (avgStressEl) {
            avgStressEl.textContent = stats.avgStress;
        }

        // Update detailed metrics - Heart Rate Analysis
        const heartRateValueEl = document.querySelector('.metric-detail-card:first-of-type .metric-detail-value');
        if (heartRateValueEl && stats.avgBPM > 0) {
            heartRateValueEl.textContent = `${stats.avgBPM} BPM`;
        }

        // Update stats in Heart Rate detail card
        // Find Heart Rate card by looking for the canvas with id="heartRateChart"
        const heartRateChart = document.getElementById('heartRateChart');
        const heartRateCard = heartRateChart ? heartRateChart.closest('.metric-detail-card') : null;
        const heartRateStats = heartRateCard 
            ? heartRateCard.querySelectorAll('.detail-stat')
            : document.querySelectorAll('.metric-detail-card:first-of-type .detail-stat');
        
        if (heartRateStats.length >= 3 && stats.avgBPM > 0) {
            // Calculate min and max from recordings
            const validRecordings = recordings.filter(r => r.statistics && r.statistics.avgBPM);
            const bpmValues = validRecordings.map(r => r.statistics.avgBPM);
            const minBPM = bpmValues.length > 0 ? Math.min(...bpmValues) : stats.avgBPM;
            const maxBPM = bpmValues.length > 0 ? Math.max(...bpmValues) : stats.avgBPM;
            const restBPM = Math.round(stats.avgBPM * 0.9); // Estimate resting heart rate
            
            // Ensure we're updating the correct stat values with BPM format
            const statValues = Array.from(heartRateStats).map(stat => stat.querySelector('.stat-value'));
            if (statValues[0]) statValues[0].textContent = `${stats.avgBPM} BPM`; // Average
            if (statValues[1]) statValues[1].textContent = `${maxBPM} BPM`; // Highest
            if (statValues[2]) statValues[2].textContent = `${restBPM} BPM`; // Resting
        }

        // Update Stress Pattern detail card
        // Calculate stress level from recordings in the last 24 hours (today)
        const stressValueEl = document.getElementById('stressPatternValue') || 
                              document.querySelector('.metric-detail-card:nth-of-type(2) .metric-detail-value');
        
        if (stressValueEl) {
            // Check if we have recordings from today (last 24 hours)
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            const yesterdayISO = yesterday.toISOString();
            
            const todayRecordings = recordings.filter(r => {
                if (!r.startTime) return false;
                return r.startTime >= yesterdayISO;
            });
            
            if (todayRecordings.length === 0) {
                // No data available - hide the value
                stressValueEl.style.display = 'none';
            } else {
                // Calculate average stress from today's recordings using Human Resistance
                const validTodayRecordings = todayRecordings.filter(r => r.statistics && r.statistics.avgGSR && r.statistics.avgGSR > 0 && r.statistics.avgGSR < 512);
                
                if (validTodayRecordings.length > 0) {
                    // Calculate stress from GSR (Human Resistance)
                    let totalStress = 0;
                    let stressCount = 0;
                    
                    validTodayRecordings.forEach(r => {
                        const rawGSR = r.statistics.avgGSR;
                        // Calculate Human Resistance using formula: ((1024 + 2 * gsr) * 10000) / (512 - gsr)
                        const humanResistance = ((1024 + 2 * rawGSR) * 10000) / (512 - rawGSR);
                        // Convert to stress level (0-100)
                        // Lower resistance = higher stress
                        // Typical range: < 500 ohm = high stress, > 2000 ohm = low stress
                        const stressValue = Math.max(0, Math.min(100, 100 - ((humanResistance / 2000) * 100)));
                        totalStress += stressValue;
                        stressCount++;
                    });
                    
                    const avgTodayStress = stressCount > 0 ? totalStress / stressCount : 0;
                    
                    if (avgTodayStress > 0) {
                        // Determine stress level category based on average stress
                        let stressLevel = 'Low';
                        if (avgTodayStress < 30) {
                            stressLevel = 'Low';
                        } else if (avgTodayStress < 60) {
                            stressLevel = 'Medium';
                        } else {
                            stressLevel = 'High';
                        }
                        
                        stressValueEl.textContent = stressLevel;
                        stressValueEl.style.display = '';
                    } else {
                        // No valid stress calculation - hide the value
                        stressValueEl.style.display = 'none';
                    }
                } else {
                    // No valid data - hide the value
                    stressValueEl.style.display = 'none';
                }
            }
        }

        // Update Stress Pattern stats
        // Use data from recordings in the last 24 hours (today)
        const peakStressHoursEl = document.getElementById('peakStressHours');
        const lowestStressHoursEl = document.getElementById('lowestStressHours');
        const stressRecoveryEl = document.getElementById('stressRecovery');
        
        // Check if we have recordings from today (last 24 hours)
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const yesterdayISO = yesterday.toISOString();
        
        const todayRecordings = recordings.filter(r => {
            if (!r.startTime) return false;
            return r.startTime >= yesterdayISO;
        });
        
        if (todayRecordings.length === 0 || !chartData || !chartData.hourlyStress || chartData.hourlyStress.length === 0) {
            // No data available - show "--"
            if (peakStressHoursEl) peakStressHoursEl.textContent = '--';
            if (lowestStressHoursEl) lowestStressHoursEl.textContent = '--';
            if (stressRecoveryEl) stressRecoveryEl.textContent = '--';
        } else {
            // Validate hourly stress data
            const validStressData = chartData.hourlyStress.filter(v => v !== null && !isNaN(v) && v >= 0);
            
            if (validStressData.length === 0) {
                // No valid data - show "--"
                if (peakStressHoursEl) peakStressHoursEl.textContent = '--';
                if (lowestStressHoursEl) lowestStressHoursEl.textContent = '--';
                if (stressRecoveryEl) stressRecoveryEl.textContent = '--';
            } else {
            
            // Find peak stress hour and range
            const maxStress = Math.max(...validStressData);
            const peakHour = chartData.hourlyStress.indexOf(maxStress);
            const minStress = Math.min(...validStressData);
            const lowHour = chartData.hourlyStress.indexOf(minStress);
            
            // Validate peak and low hours
            if (peakHour < 0 || peakHour >= 24 || lowHour < 0 || lowHour >= 24) {
                // Invalid hours - show "--"
                if (peakStressHoursEl) peakStressHoursEl.textContent = '--';
                if (lowestStressHoursEl) lowestStressHoursEl.textContent = '--';
                if (stressRecoveryEl) stressRecoveryEl.textContent = '--';
                return;
            }
            
            // Find range of hours with high stress (within 10% of peak)
            const stressThreshold = maxStress * 0.9;
            let peakStart = Math.max(0, peakHour);
            let peakEnd = Math.min(23, peakHour);
            
            // Find start of peak range
            for (let i = peakHour - 1; i >= 0; i--) {
                if (chartData.hourlyStress[i] !== null && !isNaN(chartData.hourlyStress[i]) && 
                    chartData.hourlyStress[i] >= stressThreshold) {
                    peakStart = i;
                } else {
                    break;
                }
            }
            
            // Find end of peak range
            for (let i = peakHour + 1; i < 24; i++) {
                if (chartData.hourlyStress[i] !== null && !isNaN(chartData.hourlyStress[i]) && 
                    chartData.hourlyStress[i] >= stressThreshold) {
                    peakEnd = i;
                } else {
                    break;
                }
            }
            
            // Find range of hours with low stress (within 10% of minimum)
            const lowThreshold = minStress * 1.1;
            let lowStart = Math.max(0, lowHour);
            let lowEnd = Math.min(23, lowHour);
            
            // Find start of low range
            for (let i = lowHour - 1; i >= 0; i--) {
                if (chartData.hourlyStress[i] !== null && !isNaN(chartData.hourlyStress[i]) && 
                    chartData.hourlyStress[i] <= lowThreshold) {
                    lowStart = i;
                } else {
                    break;
                }
            }
            
            // Find end of low range
            for (let i = lowHour + 1; i < 24; i++) {
                if (chartData.hourlyStress[i] !== null && !isNaN(chartData.hourlyStress[i]) && 
                    chartData.hourlyStress[i] <= lowThreshold) {
                    lowEnd = i;
                } else {
                    break;
                }
            }
            
            // Ensure valid ranges
            peakStart = Math.max(0, Math.min(23, peakStart));
            peakEnd = Math.max(peakStart, Math.min(23, peakEnd));
            lowStart = Math.max(0, Math.min(23, lowStart));
            lowEnd = Math.max(lowStart, Math.min(23, lowEnd));
            
            // Format hour range in English format (e.g., "10:00 AM - 12:00 PM", "8:00 PM - 10:00 PM")
            const formatHourRange = (startHour, endHour) => {
                // Validate and normalize hours
                startHour = Math.max(0, Math.min(23, Math.round(startHour)));
                endHour = Math.max(0, Math.min(23, Math.round(endHour)));
                
                // If range is only 1 hour, expand to 2 hours for better readability
                if (startHour === endHour) {
                    endHour = Math.min(23, startHour + 1);
                }
                
                // Ensure endHour is after startHour
                if (endHour <= startHour) {
                    endHour = Math.min(23, startHour + 2);
                }
                
                // Format hours in 12-hour format with AM/PM
                const formatHour = (hour) => {
                    if (hour === 0) return '12:00 AM';
                    if (hour === 12) return '12:00 PM';
                    if (hour < 12) return `${hour}:00 AM`;
                    return `${hour - 12}:00 PM`;
                };
                
                const startTime = formatHour(startHour);
                const endTime = formatHour(endHour);
                
                return `${startTime} - ${endTime}`;
            };
            
            // Calculate recovery status based on stress pattern
            // Recovery is good if stress decreases significantly from peak to lowest
            const stressRange = maxStress - minStress;
            const avgStressValue = validStressData.reduce((sum, v) => sum + v, 0) / validStressData.length;
            
            let recoveryStatus = 'Good';
            // Consider both stress range and average stress
            if (avgStressValue > 70) {
                recoveryStatus = 'Poor'; // High average stress = poor recovery
            } else if (avgStressValue > 50) {
                recoveryStatus = 'Fair'; // Medium average stress = fair recovery
            } else if (stressRange < 20) {
                recoveryStatus = 'Fair'; // Small range = less recovery variation
            } else if (stressRange < 40) {
                recoveryStatus = 'Good'; // Moderate range = good recovery
            } else {
                recoveryStatus = 'Excellent'; // Large range = excellent recovery variation
            }
            
            // Update stat values
            if (peakStressHoursEl) peakStressHoursEl.textContent = formatHourRange(peakStart, peakEnd);
            if (lowestStressHoursEl) lowestStressHoursEl.textContent = formatHourRange(lowStart, lowEnd);
            if (stressRecoveryEl) stressRecoveryEl.textContent = recoveryStatus;
            }
        }

        // Update Sleep Quality detail card
        const sleepValueEl = document.querySelector('.metric-detail-card:nth-of-type(3) .metric-detail-value');
        if (sleepValueEl && chartData && chartData.sleepData && chartData.sleepData.length > 0) {
            const avgSleep = chartData.sleepData.reduce((sum, v) => sum + v, 0) / chartData.sleepData.length;
            sleepValueEl.textContent = `${avgSleep.toFixed(1)} jam rata-rata`;
        }

        // Update Sleep Quality stats
        const sleepStats = document.querySelectorAll('.metric-detail-card:nth-of-type(3) .detail-stat');
        if (sleepStats.length >= 3 && chartData.sleepData && chartData.sleepData.length > 0) {
            // Calculate sleep stages (simplified - in real app would come from sleep tracking)
            const avgSleep = chartData.sleepData.reduce((sum, v) => sum + v, 0) / chartData.sleepData.length;
            const deepSleep = (avgSleep * 0.28).toFixed(1); // ~28% deep sleep
            const remSleep = (avgSleep * 0.24).toFixed(1); // ~24% REM sleep
            const lightSleep = (avgSleep * 0.48).toFixed(1); // ~48% light sleep
            const quality = avgSleep >= 7 && avgSleep <= 9 ? 85 : Math.max(50, Math.min(100, (avgSleep / 9) * 100));
            
            sleepStats[0].querySelector('.stat-value').textContent = `${deepSleep} jam`; // Deep sleep
            sleepStats[1].querySelector('.stat-value').textContent = `${remSleep} jam`; // REM sleep
            sleepStats[2].querySelector('.stat-value').textContent = `${Math.round(quality)}%`; // Quality
        }

        // Update chart data cache and redraw charts
        if (typeof updateChartDataFromFirestore === 'function') {
            updateChartDataFromFirestore(chartData);
        } else {
            // Fallback: update charts directly
            if (typeof drawWeeklyTrendsChart === 'function') {
                drawWeeklyTrendsChart();
            }
            if (typeof drawHeartRateChart === 'function') {
                drawHeartRateChart();
            }
            if (typeof drawStressPatternChart === 'function') {
                drawStressPatternChart();
            }
        }

        return { recordings, stats, chartData };
    } catch (error) {
        console.error('Error updating analytics from Firestore:', error);
        return null;
    }
}

/**
 * Prepare data for charts
 * Includes hourly data for heart rate and stress pattern charts
 */
function prepareChartData(recordings) {
    if (!recordings || recordings.length === 0) {
        return {
            dates: [],
            heartRate: [],
            stress: [],
            hrv: [],
            hourlyHeartRate: [],
            hourlyStress: [],
            sleepData: []
        };
    }

    // Sort by date
    const sortedRecordings = [...recordings].sort((a, b) => {
        const dateA = a.startTime ? new Date(a.startTime) : new Date(0);
        const dateB = b.startTime ? new Date(b.startTime) : new Date(0);
        return dateA - dateB;
    });

    const dates = sortedRecordings.map(r => {
        const date = r.startTime ? new Date(r.startTime) : new Date();
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    });

    const heartRate = sortedRecordings.map(r => r.statistics?.avgBPM || 0);
    const stress = sortedRecordings.map(r => {
        // Calculate stress from GSR (Human Resistance)
        // Lower Human Resistance = higher stress
        // Need to calculate Human Resistance from raw GSR first
        const rawGSR = r.statistics?.avgGSR || 0;
        if (rawGSR > 0 && rawGSR < 512) {
            // Calculate Human Resistance using formula: ((1024 + 2 * gsr) * 10000) / (512 - gsr)
            const humanResistance = ((1024 + 2 * rawGSR) * 10000) / (512 - rawGSR);
            // Convert to stress level (0-100)
            // Lower resistance = higher stress
            // Typical range: < 500 ohm = high stress, > 2000 ohm = low stress
            const stressValue = Math.max(0, Math.min(100, 100 - ((humanResistance / 2000) * 100)));
            return stressValue;
        }
        return 0;
    });
    const hrv = sortedRecordings.map(r => {
        // HRV can be calculated from heart rate variability
        // For now, use a simple calculation
        const bpm = r.statistics?.avgBPM || 0;
        return bpm > 0 ? 60 / bpm : 0; // Simplified HRV
    });

    // Prepare hourly data for heart rate chart (24 hours)
    const hourlyHeartRate = new Array(24).fill(null);
    const hourlyStress = new Array(24).fill(null);
    const hourlyCounts = new Array(24).fill(0);

    sortedRecordings.forEach(r => {
        if (r.startTime) {
            const date = new Date(r.startTime);
            const hour = date.getHours();
            
            const bpm = r.statistics?.avgBPM || 0;
            const rawGSR = r.statistics?.avgGSR || 0;
            
            // Calculate stress from GSR (Human Resistance)
            let stressValue = 0;
            if (rawGSR > 0 && rawGSR < 512) {
                // Calculate Human Resistance using formula: ((1024 + 2 * gsr) * 10000) / (512 - gsr)
                const humanResistance = ((1024 + 2 * rawGSR) * 10000) / (512 - rawGSR);
                // Convert to stress level (0-100)
                // Lower resistance = higher stress
                stressValue = Math.max(0, Math.min(100, 100 - ((humanResistance / 2000) * 100)));
            }
            
            if (bpm > 0) {
                if (hourlyHeartRate[hour] === null) {
                    hourlyHeartRate[hour] = bpm;
                } else {
                    hourlyHeartRate[hour] = (hourlyHeartRate[hour] * hourlyCounts[hour] + bpm) / (hourlyCounts[hour] + 1);
                }
            }
            
            if (gsr > 0) {
                if (hourlyStress[hour] === null) {
                    hourlyStress[hour] = stressValue;
                } else {
                    hourlyStress[hour] = (hourlyStress[hour] * hourlyCounts[hour] + stressValue) / (hourlyCounts[hour] + 1);
                }
            }
            
            hourlyCounts[hour]++;
        }
    });

    // Check if we have any data at all
    const hasAnyHeartRateData = hourlyHeartRate.some(val => val !== null);
    const hasAnyStressData = hourlyStress.some(val => val !== null);
    
    // Only fill null values if we have some data (don't fill if completely empty)
    if (hasAnyHeartRateData) {
        // Fill null values with average of nearby hours
        for (let i = 0; i < 24; i++) {
            if (hourlyHeartRate[i] === null) {
                // Find nearest non-null value
                let nearestValue = null;
                // Check both directions
                for (let offset = 1; offset < 24 && nearestValue === null; offset++) {
                    const prevIdx = (i - offset + 24) % 24;
                    const nextIdx = (i + offset) % 24;
                    if (hourlyHeartRate[prevIdx] !== null) {
                        nearestValue = hourlyHeartRate[prevIdx];
                    } else if (hourlyHeartRate[nextIdx] !== null) {
                        nearestValue = hourlyHeartRate[nextIdx];
                    }
                }
                // Only fill if we found a nearby value, otherwise keep null
                if (nearestValue !== null) {
                    hourlyHeartRate[i] = nearestValue;
                }
            }
        }
    }
    
    if (hasAnyStressData) {
        // Fill null values with average of nearby hours
        for (let i = 0; i < 24; i++) {
            if (hourlyStress[i] === null) {
                // Find nearest non-null value
                let nearestValue = null;
                // Check both directions
                for (let offset = 1; offset < 24 && nearestValue === null; offset++) {
                    const prevIdx = (i - offset + 24) % 24;
                    const nextIdx = (i + offset) % 24;
                    if (hourlyStress[prevIdx] !== null) {
                        nearestValue = hourlyStress[prevIdx];
                    } else if (hourlyStress[nextIdx] !== null) {
                        nearestValue = hourlyStress[nextIdx];
                    }
                }
                // Only fill if we found a nearby value, otherwise keep null
                if (nearestValue !== null) {
                    hourlyStress[i] = nearestValue;
                }
            }
        }
    }

    // Prepare sleep data (last 7 days)
    const sleepData = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        // Find recordings for this day
        const dayRecordings = sortedRecordings.filter(r => {
            if (!r.startTime) return false;
            const recDate = new Date(r.startTime);
            recDate.setHours(0, 0, 0, 0);
            return recDate.getTime() === date.getTime();
        });
        
        if (dayRecordings.length > 0) {
            // Calculate average sleep duration from recordings
            // For now, use a simple calculation based on recording duration
            // In a real app, you'd have separate sleep tracking data
            const totalDuration = dayRecordings.reduce((sum, r) => sum + (r.duration || 0), 0);
            const avgDuration = totalDuration / dayRecordings.length;
            const hours = avgDuration / (1000 * 60 * 60); // Convert ms to hours
            sleepData.push(Math.max(0, Math.min(12, hours))); // Clamp between 0-12 hours
        } else {
            // No data for this day, use null or default
            sleepData.push(null);
        }
    }

    // Fill null sleep values with average
    const validSleepData = sleepData.filter(v => v !== null);
    const avgSleep = validSleepData.length > 0 
        ? validSleepData.reduce((sum, v) => sum + v, 0) / validSleepData.length 
        : 7.5;
    for (let i = 0; i < sleepData.length; i++) {
        if (sleepData[i] === null) {
            sleepData[i] = avgSleep;
        }
    }

    return {
        dates,
        heartRate,
        stress,
        hrv,
        hourlyHeartRate,
        hourlyStress,
        sleepData
    };
}

// Export functions
window.analyticsFirestore = {
    getUserRecordingsForAnalytics,
    calculateAnalyticsStats,
    updateAnalyticsFromFirestore,
    prepareChartData
};
