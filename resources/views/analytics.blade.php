<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYNAGLO - Analytics</title>

    <!-- Local CSS -->
    <link rel="stylesheet" href="{{ asset('css/styles.css') }}">

    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Google Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Chart.js -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>

    <!-- Top Header -->
    <header class="top-header">
        <div class="header-content">
            <div class="header-title">
                <div class="logo-container">
                    <img src="{{ asset('images/logo.png') }}" alt="SYNAGLO Logo" class="header-logo-small">
                    <div class="logo-text">
                        <h1>Analytics</h1>
                        <p class="subtitle">Data insights & trends</p>
                    </div>
                </div>
            </div>
            <div class="header-actions">
                <div class="period-indicator">
                    <i class="fas fa-calendar-day"></i>
                    <span>Today</span>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">

        <!-- Summary Cards -->
        <section class="summary-cards">
            <div class="summary-card primary">
                <div class="summary-icon">
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="summary-content">
                    <div class="summary-label">Overall Health Score</div>
                    <div class="summary-value" id="healthScore">--</div>
                    <div class="summary-change positive">
                        <i class="fas fa-arrow-up"></i> <span id="healthScoreChange">Loading...</span>
                    </div>
                    <div class="summary-description">
                        This score combines all aspects of your health
                    </div>
                </div>
            </div>

            <div class="summary-card secondary">
                <div class="summary-icon">
                    <i class="fas fa-brain"></i>
                </div>
                <div class="summary-content">
                    <div class="summary-label">Average Stress Level</div>
                    <div class="summary-value" id="avgStress">--</div>
                    <div class="summary-change positive">
                        <i class="fas fa-arrow-down"></i> <span id="stressChange">Loading...</span>
                    </div>
                    <div class="summary-description">Lower values mean better</div>
                </div>
            </div>
        </section>

        <!-- Trends -->
        <section class="chart-section">
            <div class="section-header">
                <h2 class="section-title">Today's Trends</h2>
                <div class="help-tooltip-container">
                    <i class="fas fa-info-circle help-icon"></i>
                </div>
            </div>

            <div class="chart-explanation-box">
                <p>
                    <strong>How to read the chart:</strong>
                    Lines show data changes throughout today.
                </p>
            </div>

            <div class="chart-card large">
                <div class="chart-legend">
                    <span class="legend-item"><span class="legend-color" style="background:#6366f1;"></span> Heart Rate</span>
                    <span class="legend-item"><span class="legend-color" style="background:#ec4899;"></span> Stress</span>
                    <span class="legend-item"><span class="legend-color" style="background:#10b981;"></span> HRV</span>
                </div>
                <div style="position: relative; height: 300px;">
                    <canvas id="weeklyTrendsChart"></canvas>
                </div>
            </div>
        </section>

        <!-- Detailed Metrics -->
        <section class="detailed-metrics">
            <div class="section-header-with-help">
                <h2 class="section-title">Detailed Analysis</h2>
                <div class="help-tooltip-container">
                    <i class="fas fa-info-circle help-icon"></i>
                </div>
            </div>

            <!-- Heart Rate -->
            <div class="metric-detail-card">
                <div class="metric-detail-header">
                    <div class="metric-detail-title">
                        <i class="fas fa-heartbeat"></i>
                        <span>Heart Rate Analysis</span>
                    </div>
                </div>
                <p class="metric-explanation-text">
                    Normal resting heart rate is 60–100 BPM.
                </p>
                <div style="position: relative; height: 300px;">
                    <canvas id="heartRateChart"></canvas>
                </div>
            </div>

            <!-- Stress Pattern -->
            <div class="metric-detail-card">
                <div class="metric-detail-header">
                    <div class="metric-detail-title">
                        <i class="fas fa-shield-alt"></i>
                        <span>Daily Stress Pattern</span>
                    </div>
                </div>
                <p class="metric-explanation-text">
                    Shows when stress peaks during the day.
                </p>
                <div style="position: relative; height: 300px;">
                    <canvas id="stressPatternChart"></canvas>
                </div>
            </div>
        </section>

        <!-- Recording History -->
        <section class="recording-history-section">
            <h2 class="section-title">Recording History</h2>
            <div id="historyLoading" style="display:block; text-align:center; padding:20px;">
                <i class="fas fa-spinner fa-spin"></i> Loading...
            </div>
            <div id="historyEmpty" style="display:none; text-align:center; padding:20px; color:#999;">
                No recordings today
            </div>
            <div id="recordingHistoryList"></div>
        </section>

    </main>

    <!-- Bottom Nav -->
    <nav class="bottom-nav" id="bottomNav"></nav>

    <!-- API Integration Scripts -->
    <script src="{{ asset('js/api-integration.js') }}"></script>
    <script src="{{ asset('js/analytics-integration.js') }}"></script>
    
    <!-- Navbar Component -->
    <script src="{{ asset('js/components/navbar.js') }}"></script>
    
    <!-- Chart Setup -->
    <script>
        // Initialize charts
        let weeklyTrendsChart, heartRateChart, stressPatternChart;
        
        // Weekly Trends Chart
        const trendsCtx = document.getElementById('weeklyTrendsChart');
        if (trendsCtx) {
            weeklyTrendsChart = new Chart(trendsCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Heart Rate',
                            data: [],
                            borderColor: '#6366f1',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'Stress',
                            data: [],
                            borderColor: '#ec4899',
                            backgroundColor: 'rgba(236, 72, 153, 0.1)',
                            tension: 0.4
                        },
                        {
                            label: 'HRV',
                            data: [],
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
        
        // Heart Rate Chart
        const hrCtx = document.getElementById('heartRateChart');
        if (hrCtx) {
            heartRateChart = new Chart(hrCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Heart Rate',
                        data: [],
                        borderColor: '#6366f1',
                        backgroundColor: 'rgba(99, 102, 241, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
        
        // Stress Pattern Chart
        const stressCtx = document.getElementById('stressPatternChart');
        if (stressCtx) {
            stressPatternChart = new Chart(stressCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Stress',
                        data: [],
                        backgroundColor: '#ec4899',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
        
        // Chart update functions
        function updateWeeklyTrendsChart(data) {
            if (weeklyTrendsChart && data) {
                weeklyTrendsChart.data.labels = data.labels || [];
                weeklyTrendsChart.data.datasets[0].data = data.heart_rate || [];
                weeklyTrendsChart.data.datasets[1].data = data.stress || [];
                weeklyTrendsChart.data.datasets[2].data = data.hrv || [];
                weeklyTrendsChart.update();
            }
        }
        
        function updateHeartRateChart(labels, data) {
            if (heartRateChart) {
                heartRateChart.data.labels = labels;
                heartRateChart.data.datasets[0].data = data;
                heartRateChart.update();
            }
        }
        
        function updateStressPatternChart(labels, data) {
            if (stressPatternChart) {
                stressPatternChart.data.labels = labels;
                stressPatternChart.data.datasets[0].data = data;
                stressPatternChart.update();
            }
        }
    </script>
    
    <style>
        .recording-item {
            background: var(--card-background, #fff);
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
        }
        
        .recording-time {
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 8px;
        }
        
        .recording-time i {
            color: #6366f1;
            margin-right: 5px;
        }
        
        .recording-duration {
            font-size: 0.9rem;
            color: #6b7280;
            margin-bottom: 8px;
        }
        
        .recording-stats {
            display: flex;
            gap: 15px;
            margin-bottom: 8px;
        }
        
        .recording-stats span {
            font-size: 0.85rem;
            color: #4b5563;
            background: #f3f4f6;
            padding: 4px 8px;
            border-radius: 4px;
        }
        
        .recording-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 600;
        }
        
        .recording-status.excellent {
            background: #d1fae5;
            color: #065f46;
        }
        
        .recording-status.good {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .recording-status.fair {
            background: #fef3c7;
            color: #92400e;
        }
        
        .recording-status.needs-attention {
            background: #fee2e2;
            color: #991b1b;
        }
    </style>
</body>
</html>