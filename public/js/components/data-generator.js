/**
 * Data Generator Component
 * Generates realistic dummy data for all pages
 */

// Generate random number within range
function randomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

// Generate random integer within range
function randomInt(min, max) {
    return Math.floor(randomBetween(min, max));
}

/**
 * Generate weekly data points
 */
function generateWeeklyData(count = 7, baseValue, variance = 10) {
    const data = [];
    for (let i = 0; i < count; i++) {
        const value = baseValue + randomBetween(-variance, variance);
        data.push(Math.max(0, Math.round(value * 10) / 10));
    }
    return data;
}

/**
 * Generate hourly data for a day
 */
function generateHourlyData(baseValue, variance = 5) {
    const data = [];
    for (let i = 0; i < 24; i++) {
        // Simulate circadian rhythm
        let multiplier = 1;
        if (i >= 22 || i <= 6) {
            multiplier = 0.8; // Lower at night
        } else if (i >= 10 && i <= 14) {
            multiplier = 1.2; // Higher during day
        }
        const value = baseValue * multiplier + randomBetween(-variance, variance);
        data.push(Math.max(0, Math.round(value * 10) / 10));
    }
    return data;
}

/**
 * Generate daily data for a month
 */
function generateMonthlyData(baseValue, variance = 15) {
    const data = [];
    for (let i = 0; i < 30; i++) {
        const value = baseValue + randomBetween(-variance, variance);
        data.push(Math.max(0, Math.round(value * 10) / 10));
    }
    return data;
}

/**
 * Generate sleep stages data
 */
function generateSleepStages() {
    return {
        deep: randomInt(90, 150), // minutes
        rem: randomInt(80, 120),
        light: randomInt(180, 240),
        awake: randomInt(10, 30)
    };
}

/**
 * Generate heart rate variability data
 */
function generateHRVData(count = 14) {
    const data = [];
    const baseHRV = 50;
    for (let i = 0; i < count; i++) {
        const value = baseHRV + randomBetween(-15, 25) + (i * 1.5); // Slight upward trend
        data.push(Math.max(30, Math.round(value)));
    }
    return data;
}

/**
 * Generate stress level data (decreasing trend)
 */
function generateStressData(count = 14) {
    const data = [];
    const startValue = 70;
    for (let i = 0; i < count; i++) {
        const value = startValue - (i * 2.5) + randomBetween(-8, 8);
        data.push(Math.max(10, Math.min(100, Math.round(value))));
    }
    return data;
}

/**
 * Generate real-time monitoring data
 */
function generateRealtimeData() {
    return {
        heartRate: randomInt(65, 85),
        spo2: randomInt(96, 100),
        gsr: randomInt(35, 55),
        temperature: randomBetween(36.2, 36.8).toFixed(1)
    };
}

/**
 * Generate health score based on various factors
 */
function generateHealthScore() {
    // Base score with some variation
    return randomInt(88, 98);
}

/**
 * Generate activity data
 */
function generateActivityData() {
    return {
        steps: randomInt(7000, 12000),
        calories: randomInt(1500, 2200),
        distance: randomBetween(5.5, 8.5).toFixed(1),
        activeMinutes: randomInt(45, 90)
    };
}

/**
 * Generate insights data
 */
function generateInsights() {
    const insights = [
        {
            type: 'positive',
            title: 'Great Progress!',
            message: 'Your stress levels have decreased by 15% this week. Keep up the good work!',
            icon: 'fas fa-check-circle'
        },
        {
            type: 'info',
            title: 'Sleep Optimization',
            message: 'Your sleep quality improves when you go to bed before 11 PM. Try maintaining this schedule.',
            icon: 'fas fa-lightbulb'
        },
        {
            type: 'warning',
            title: 'Activity Alert',
            message: 'Your activity level is 20% lower than last week. Consider adding a 15-minute walk to your routine.',
            icon: 'fas fa-exclamation-triangle'
        }
    ];
    return insights;
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        randomBetween,
        randomInt,
        generateWeeklyData,
        generateHourlyData,
        generateMonthlyData,
        generateSleepStages,
        generateHRVData,
        generateStressData,
        generateRealtimeData,
        generateHealthScore,
        generateActivityData,
        generateInsights
    };
}
