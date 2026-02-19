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

        <!-- AI Insights Section -->
        <section class="ai-insights-section">
            <div class="ai-insights-card">
                <div class="ai-insights-header">
                    <div class="ai-insights-title">
                        <i class="fas fa-brain"></i>
                        <h3>AI Health Insights</h3>
                    </div>
                    <button class="refresh-btn" id="refreshInsights" title="Refresh insights">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button class="start-analysis-btn" id="startAnalysisBtn" title="Start AI Analysis">
                        <i class="fas fa-play"></i> Start Analysis
                    </button>
                </div>
                <div class="ai-insights-content">
                    <div id="insightsLoading" class="insights-loading" style="display:none;">
                        <i class="fas fa-spinner fa-spin"></i>
                        <span>Analyzing your health data...</span>
                    </div>
                    <div id="insightsText" class="insights-text" style="display:none;"></div>
                    <div id="insightsError" class="insights-error" style="display:none;">
                        Unable to generate insights. Please try again.
                    </div>
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
                    <span class="legend-item"><span class="legend-color" style="background:#6366f1;"></span>
                        <p style="color: #667eea;">Heart Rate</p>
                    </span>
                    <span class="legend-item"><span class="legend-color" style="background:#ec4899;"></span>
                        <p style="color: #667eea;">Stress</p>
                    </span>
                    <span class="legend-item"><span class="legend-color" style="background:#10b981;"></span>
                        <p style="color: #667eea;">HRV</p>
                    </span>
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
                        legend: { display: false },
                        tooltip: {
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            backgroundColor: 'rgba(0,0,0,0.7)'
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: 'rgba(255,255,255,0.7)' },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        },
                        y: {
                            ticks: { color: 'rgba(255,255,255,0.7)' },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        }
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
                        legend: { display: false },
                        tooltip: {
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            backgroundColor: 'rgba(0,0,0,0.7)'
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: 'rgba(255,255,255,0.7)' },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        },
                        y: {
                            ticks: { color: 'rgba(255,255,255,0.7)' },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        }
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
                        legend: { display: false },
                        tooltip: {
                            titleColor: '#fff',
                            bodyColor: '#fff',
                            backgroundColor: 'rgba(0,0,0,0.7)'
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: 'rgba(255,255,255,0.7)' },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        },
                        y: {
                            ticks: { color: 'rgba(255,255,255,0.7)' },
                            grid: { color: 'rgba(255,255,255,0.1)' }
                        }
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

        // AI Insights Functionality
        async function fetchAiInsights() {
            const loadingEl = document.getElementById('insightsLoading');
            const textEl = document.getElementById('insightsText');
            const errorEl = document.getElementById('insightsError');
            const refreshBtn = document.getElementById('refreshInsights');
            loadingEl.style.display = 'flex';
            textEl.style.display = 'none';
            errorEl.style.display = 'none';
            refreshBtn.querySelector('i').classList.add('fa-spin');
            try {
                const response = await fetch('/api/analytics/ai-summary');
                const result = await response.json();
                loadingEl.style.display = 'none';
                if (result.success) {
                    textEl.textContent = result.insights;
                    textEl.style.display = 'block';
                    errorEl.style.display = 'none';
                } else {
                    errorEl.style.display = 'block';
                    textEl.style.display = 'none';
                }
            } catch (error) {
                console.error('Error fetching AI insights:', error);
                loadingEl.style.display = 'none';
                errorEl.style.display = 'block';
            } finally {
                refreshBtn.querySelector('i').classList.remove('fa-spin');
            }
        }

        // Only trigger AI analysis when user clicks Start Analysis
        document.addEventListener('DOMContentLoaded', function () {
            // Remove auto-load
            // fetchAiInsights();

            // Start Analysis button handler
            document.getElementById('startAnalysisBtn').addEventListener('click', function () {
                fetchAiInsights();
            });

            // Refresh button handler
            document.getElementById('refreshInsights').addEventListener('click', fetchAiInsights);
        });
    </script>

    <style>
        .prompt-text {
            margin-top: 10px;
            font-size: 0.95rem;
            color: #dbeafe;
            background: rgba(255, 255, 255, 0.08);
            border-radius: 8px;
            padding: 8px 12px;
            white-space: pre-wrap;
        }

        /* AI Insights Section */
        .ai-insights-section {
            margin: var(--spacing-xl) 0;
        }

        .ai-insights-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: var(--radius-xl);
            padding: var(--spacing-xl);
            color: white;
            box-shadow: var(--shadow-lg);
        }

        .ai-insights-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-lg);
        }

        .ai-insights-title {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }

        .ai-insights-title i {
            font-size: 1.5rem;
        }

        .ai-insights-title h3 {
            margin: 0;
            font-size: 1.25rem;
            font-weight: 600;
        }

        .refresh-btn {
            background: rgba(255, 255, 255, 0.2);
            border: none;
            border-radius: var(--radius-md);
            padding: var(--spacing-sm) var(--spacing-md);
            color: white;
            cursor: pointer;
            transition: all var(--transition-base);
        }

        .refresh-btn:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        .start-analysis-btn {
            background: #10b981;
            border: none;
            border-radius: var(--radius-md);
            padding: var(--spacing-sm) var(--spacing-md);
            color: white;
            cursor: pointer;
            margin-left: 10px;
            font-weight: 600;
            transition: all var(--transition-base);
        }

        .start-analysis-btn:hover {
            background: #059669;
        }

        .ai-insights-content {
            background: rgba(255, 255, 255, 0.1);
            border-radius: var(--radius-md);
            padding: var(--spacing-lg);
            min-height: 100px;
        }

        .insights-loading {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
            justify-content: center;
        }

        .insights-text {
            line-height: 1.8;
            font-size: 1rem;
            white-space: pre-wrap;
        }

        .insights-error {
            text-align: center;
            opacity: 0.8;
        }

        /* Recording Items */
        .recording-item {
            background: rgba(255, 255, 255, 0.1);
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
        }

        .recording-time {
            font-weight: 600;
            color: #fff;
            margin-bottom: 8px;
        }

        .recording-time i {
            color: #A78BFA;
            margin-right: 5px;
        }

        .recording-duration {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.7);
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