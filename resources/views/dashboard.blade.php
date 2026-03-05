<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYNAGLO - Dashboard</title>

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
            <div class="time-display" id="currentTime">9:41</div>

            <div class="header-title">
                <div class="logo-container logo-container-column">
                    <img src="{{ asset('images/logo.png') }}" alt="SYNAWATCH Logo" class="header-logo">
                    <p class="subtitle">Real-time monitoring</p>
                </div>
            </div>

            <div class="header-actions">
                <div class="status-indicator connected" id="apiStatusIndicator">
                    <i class="fas fa-wifi" id="apiStatusIcon"></i>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">

        <!-- Current Biometric Readings -->
        <section class="biometric-card">
            <div class="section-header-with-help">
                <h3 class="section-subtitle">Current Health</h3>
                <div class="help-tooltip-container">
                    <i class="fas fa-info-circle help-icon"
                        data-tooltip="Your current health values measured in real-time"></i>
                </div>
            </div>

            <div class="biometric-item">
                <div class="biometric-icon">
                    <i class="fas fa-heart"></i>
                </div>
                <div class="biometric-value" id="dashboardHR">79</div>
                <div class="biometric-label">
                    Heart Rate
                    <span class="metric-explanation">(Beats per minute)</span>
                </div>
                <div class="biometric-status status-normal" id="dashboardHRStatus">Loading...</div>
                <div class="metric-info">
                    <small>Normal range: 60–100 bpm</small>
                </div>
            </div>

            <div class="biometric-item">
                <div class="biometric-icon">
                    <i class="fas fa-moon"></i>
                </div>
                <div class="biometric-value" id="dashboardSpO2">96.36</div>
                <div class="biometric-label">
                    Sleep Quality
                    <span class="metric-explanation">(Percentage of sleeping quality)</span>
                </div>
                <div class="biometric-status status-excellent" id="dashboardSpO2Status">Loading...</div>
                <div class="metric-info">
                    <small>Normal range: 90–100%</small>
                </div>
            </div>
        </section>

        <!-- Trends -->
        <section class="trends-section">
            <div class="section-header-with-help">
                <h2 class="section-title">Today's Trends</h2>
                <div class="help-tooltip-container">
                    <i class="fas fa-info-circle help-icon"
                        data-tooltip="Chart shows changes in your health data throughout the day"></i>
                </div>
            </div>

            <div class="chart-card">
                <div class="chart-header">
                    <div class="chart-title-with-help">
                        <h3>Heart Rate Variability (HRV)</h3>
                        <i class="fas fa-question-circle chart-help"
                            data-tooltip="Higher HRV = healthier nervous system"></i>
                    </div>
                    <i class="fas fa-chart-line"></i>
                </div>
                <div class="chart-explanation">
                    <p>Higher values indicate better adaptability.</p>
                </div>
                <div class="chart-container">
                    <canvas id="hrvChart"></canvas>
                </div>
            </div>

            <div class="chart-card">
                <div class="chart-header">
                    <div class="chart-title-with-help">
                        <h3>Stress Level</h3>
                        <i class="fas fa-question-circle chart-help"
                            data-tooltip="Lower stress is better for mental health"></i>
                    </div>
                    <i class="fas fa-chart-bar"></i>
                </div>
                <div class="chart-explanation">
                    <p>Try to keep stress below 50.</p>
                </div>
                <div class="chart-container">
                    <canvas id="stressChart"></canvas>
                </div>
            </div>
        </section>

        <!-- Metrics -->
        <section class="metrics-section">
            <div class="section-header-with-help">
                <h2 class="section-title">Additional Metrics</h2>
                <div class="help-tooltip-container">
                    <i class="fas fa-info-circle help-icon"></i>
                </div>
            </div>

            <div class="metrics-grid">
                <div class="metric-card">
                    <div class="metric-icon gsr">
                        <i class="fas fa-hand-sparkles"></i>
                    </div>
                    <div class="metric-info">
                        <span class="metric-label">Sweat Activity (GSR)</span>
                        <div class="metric-value" id="dashboardGSR">--</div>
                        <div class="metric-unit">µS</div>
                    </div>
                </div>

                <div class="metric-card">
                    <div class="metric-icon temp">
                        <i class="fas fa-thermometer-half"></i>
                    </div>
                    <div class="metric-info">
                        <span class="metric-label">Body Temperature</span>
                        <div class="metric-value" id="dashboardTemp">--</div>
                        <div class="metric-unit">Celsius</div>
                    </div>
                </div>
            </div>
        </section>

    </main>

    <!-- Bottom Nav -->
    <nav class="bottom-nav" id="bottomNav"></nav>

    <!-- Chart Setup - MUST BE BEFORE API Integration -->
    <script>
        // Initialize charts
        let hrvChart, stressChart;

        // Wait for DOM to be fully loaded
        document.addEventListener('DOMContentLoaded', function () {
            console.log('🎨 Initializing charts...');

            // Create HRV Chart
            const hrvCtx = document.getElementById('hrvChart');
            if (hrvCtx) {
                console.log('✅ HRV Chart canvas found');
                hrvChart = new Chart(hrvCtx, {
                    type: 'line',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'HRV',
                            data: [],
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4,
                            fill: true
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
                                ticks: { color: 'rgba(30, 27, 75, 0.6)' },
                                grid: { color: 'rgba(124, 58, 237, 0.08)' }
                            },
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: { color: 'rgba(30, 27, 75, 0.6)' },
                                grid: { color: 'rgba(124, 58, 237, 0.08)' }
                            }
                        }
                    }
                });
            } else {
                console.error('❌ HRV Chart canvas not found!');
            }

            // Create Stress Chart
            const stressCtx = document.getElementById('stressChart');
            if (stressCtx) {
                console.log('✅ Stress Chart canvas found');
                stressChart = new Chart(stressCtx, {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: [{
                            label: 'Stress Level',
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
                                ticks: { color: 'rgba(30, 27, 75, 0.6)' },
                                grid: { color: 'rgba(124, 58, 237, 0.08)' }
                            },
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: { color: 'rgba(30, 27, 75, 0.6)' },
                                grid: { color: 'rgba(124, 58, 237, 0.08)' }
                            }
                        }
                    }
                });
            } else {
                console.error('❌ Stress Chart canvas not found!');
            }
        });

        // Update chart functions (global scope)
        function updateHRVChart(labels, data) {
            console.log('📊 Updating HRV chart with', data.length, 'points');
            if (hrvChart) {
                hrvChart.data.labels = labels;
                hrvChart.data.datasets[0].data = data;
                hrvChart.update();
            }
        }

        function updateStressChart(labels, data) {
            console.log('📊 Updating Stress chart with', data.length, 'points');
            if (stressChart) {
                stressChart.data.labels = labels;
                stressChart.data.datasets[0].data = data;
                stressChart.update();
            }
        }

        // Update current time
        function updateTime() {
            const timeEl = document.getElementById('currentTime');
            if (timeEl) {
                const now = new Date();
                timeEl.textContent = now.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
        }

        setInterval(updateTime, 1000);
        updateTime();
    </script>

    <!-- API Integration Scripts -->
    <script src="{{ asset('js/api-integration.js') }}"></script>
    <script src="{{ asset('js/dashboard-integration.js') }}"></script>

    <!-- Navbar Component -->
    <script src="{{ asset('js/components/navbar.js') }}"></script>
</body>

</html>