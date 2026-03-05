<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYNAGLO - Health Monitor</title>
    <link rel="stylesheet" href="{{ asset('css/styles.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>

<body>
    <!-- Top Header -->
    <header class="top-header">
        <div class="header-content">
            <div class="header-title">
                <div class="logo-container">
                    <img src="{{ asset('images/logo.png') }}" alt="SYNAWATCH Logo" class="header-logo-small">
                    <div class="logo-text">
                        <h1>Health Monitor</h1>
                        <p class="subtitle">Real-time health tracking</p>
                    </div>
                </div>
            </div>
            <div class="header-actions">
                <button class="record-btn" id="recordBtn">
                    <i class="fas fa-circle"></i>
                    <span>Start Recording</span>
                </button>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">

        <!-- Current Readings Grid -->
        <section class="current-readings">
            <h2 class="section-title">Current Readings</h2>

            <div class="readings-grid">
                <!-- Heart Rate -->
                <div class="reading-card heart-rate">
                    <div class="reading-icon">
                        <i class="fas fa-heartbeat"></i>
                    </div>
                    <div class="reading-content">
                        <div class="reading-label">Heart Rate</div>
                        <div class="reading-value" id="heartRate">72</div>
                        <div class="reading-unit">BPM</div>
                        <div class="reading-status status-normal">Normal</div>
                    </div>
                </div>

                <!-- SpO2 -->
                <div class="reading-card spo2">
                    <div class="reading-icon">
                        <i class="fas fa-lungs"></i>
                    </div>
                    <div class="reading-content">
                        <div class="reading-label">Oxygen Saturation</div>
                        <div class="reading-value" id="spO2">98</div>
                        <div class="reading-unit">%</div>
                        <div class="reading-status status-excellent">Excellent</div>
                    </div>
                </div>

                <!-- HRV -->
                <div class="reading-card hrv">
                    <div class="reading-icon">
                        <i class="fas fa-wave-square"></i>
                    </div>
                    <div class="reading-content">
                        <div class="reading-label">Heart Rate Variability</div>
                        <div class="reading-value" id="hrv">65</div>
                        <div class="reading-unit">ms</div>
                        <div class="reading-status status-good">Good</div>
                    </div>
                </div>

                <!-- Stress -->
                <div class="reading-card stress">
                    <div class="reading-icon">
                        <i class="fas fa-brain"></i>
                    </div>
                    <div class="reading-content">
                        <div class="reading-label">Stress Level</div>
                        <div class="reading-value" id="stress">32</div>
                        <div class="reading-unit">/100</div>
                        <div class="reading-status status-low">Low</div>
                    </div>
                </div>

                <!-- GSR -->
                <div class="reading-card gsr">
                    <div class="reading-icon">
                        <i class="fas fa-hand-sparkles"></i>
                    </div>
                    <div class="reading-content">
                        <div class="reading-label">Skin Conductance</div>
                        <div class="reading-value" id="gsr">2.8</div>
                        <div class="reading-unit">µS</div>
                        <div class="reading-status status-normal">Normal</div>
                    </div>
                </div>

                <!-- Temperature -->
                <div class="reading-card temp">
                    <div class="reading-icon">
                        <i class="fas fa-thermometer-half"></i>
                    </div>
                    <div class="reading-content">
                        <div class="reading-label">Body Temperature</div>
                        <div class="reading-value" id="temperature">36.5</div>
                        <div class="reading-unit">°C</div>
                        <div class="reading-status status-normal">Normal</div>
                    </div>
                </div>
            </div>
        </section>

        <!-- Real-time Chart -->
        <section class="realtime-chart-section">
            <h2 class="section-title">Real-time Monitoring</h2>

            <div class="chart-card">
                <div class="chart-controls">
                    <div class="chart-legend">
                        <span class="legend-item">
                            <span class="legend-color" style="background:#ef4444;"></span>
                            <p style="color: #667eea;">Heart Rate</p>
                        </span>
                        <span class="legend-item">
                            <span class="legend-color" style="background:#3b82f6;"></span>
                            <p style="color: #667eea;">SpO2</p>
                        </span>
                        <span class="legend-item">
                            <span class="legend-color" style="background:#8b5cf6;"></span>
                            <p style="color: #667eea;">Stress</p>
                        </span>
                    </div>
                </div>
                <div style="position: relative; height: 300px;">
                    <canvas id="realtimeChart"></canvas>
                </div>
            </div>
        </section>

        <!-- Health Insights -->
        <section class="health-insights">
            <h2 class="section-title">Health Insights</h2>

            <div class="insights-grid">
                <div class="insight-card">
                    <div class="insight-icon" style="background: #dbeafe; color: #1e40af;">
                        <i class="fas fa-heart"></i>
                    </div>
                    <div class="insight-content">
                        <h3>Cardiovascular Health</h3>
                        <p>Your heart rate and HRV are within healthy ranges. Keep up the good work!</p>
                    </div>
                </div>

                <div class="insight-card">
                    <div class="insight-icon" style="background: #ddd6fe; color: #6d28d9;">
                        <i class="fas fa-brain"></i>
                    </div>
                    <div class="insight-content">
                        <h3>Stress Management</h3>
                        <p>Low stress levels detected. Your relaxation techniques are working well.</p>
                    </div>
                </div>

                <div class="insight-card">
                    <div class="insight-icon" style="background: #d1fae5; color: #065f46;">
                        <i class="fas fa-lungs"></i>
                    </div>
                    <div class="insight-content">
                        <h3>Respiratory Function</h3>
                        <p>Oxygen saturation is excellent. Your breathing and lung function are optimal.</p>
                    </div>
                </div>
            </div>
        </section>

    </main>

    <!-- Bottom Nav -->
    <nav class="bottom-nav" id="bottomNav"></nav>

    <!-- Scripts -->
    <script src="{{ asset('js/components/navbar.js') }}"></script>

    <script>
        // Dummy data generator
        let chart;
        let dataPoints = {
            heartRate: [],
            spo2: [],
            stress: [],
            labels: []
        };

        // Initialize chart
        function initChart() {
            const ctx = document.getElementById('realtimeChart');
            if (!ctx) return;

            chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [
                        {
                            label: 'Heart Rate',
                            data: [],
                            borderColor: '#ef4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            tension: 0.4,
                            yAxisID: 'y'
                        },
                        {
                            label: 'SpO2',
                            data: [],
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            tension: 0.4,
                            yAxisID: 'y1'
                        },
                        {
                            label: 'Stress',
                            data: [],
                            borderColor: '#8b5cf6',
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            tension: 0.4,
                            yAxisID: 'y2'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            type: 'linear',
                            display: true,
                            position: 'left',
                            min: 50,
                            max: 120,
                            title: {
                                display: true,
                                text: 'Heart Rate (BPM)'
                            }
                        },
                        y1: {
                            type: 'linear',
                            display: true,
                            position: 'right',
                            min: 90,
                            max: 100,
                            title: {
                                display: true,
                                text: 'SpO2 (%)'
                            },
                            grid: {
                                drawOnChartArea: false
                            }
                        },
                        y2: {
                            type: 'linear',
                            display: false,
                            min: 0,
                            max: 100
                        }
                    }
                }
            });
        }

        // Generate random data
        function generateDummyData() {
            const now = new Date();
            const timeLabel = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            // Generate realistic values
            const hr = 65 + Math.random() * 15;
            const spo2 = 96 + Math.random() * 3;
            const stress = 25 + Math.random() * 20;

            // Update display values
            document.getElementById('heartRate').textContent = Math.round(hr);
            document.getElementById('spO2').textContent = spo2.toFixed(1);
            document.getElementById('stress').textContent = Math.round(stress);
            document.getElementById('hrv').textContent = Math.round(80 - stress * 0.5);
            document.getElementById('gsr').textContent = (2.5 + Math.random() * 0.6).toFixed(1);
            document.getElementById('temperature').textContent = (36.3 + Math.random() * 0.4).toFixed(1);

            // Add to chart
            dataPoints.labels.push(timeLabel);
            dataPoints.heartRate.push(hr);
            dataPoints.spo2.push(spo2);
            dataPoints.stress.push(stress);

            // Keep only last 20 points
            if (dataPoints.labels.length > 20) {
                dataPoints.labels.shift();
                dataPoints.heartRate.shift();
                dataPoints.spo2.shift();
                dataPoints.stress.shift();
            }

            // Update chart
            if (chart) {
                chart.data.labels = dataPoints.labels;
                chart.data.datasets[0].data = dataPoints.heartRate;
                chart.data.datasets[1].data = dataPoints.spo2;
                chart.data.datasets[2].data = dataPoints.stress;
                chart.update('none'); // No animation for smoother updates
            }
        }

        // Recording state
        let isRecording = false;
        let recordingInterval;

        // Record button handler
        document.getElementById('recordBtn')?.addEventListener('click', function () {
            isRecording = !isRecording;

            if (isRecording) {
                this.innerHTML = '<i class="fas fa-stop"></i><span>Stop Recording</span>';
                this.classList.add('recording');

                // Start generating data every 2 seconds
                recordingInterval = setInterval(generateDummyData, 2000);
                generateDummyData(); // Initial data
            } else {
                this.innerHTML = '<i class="fas fa-circle"></i><span>Start Recording</span>';
                this.classList.remove('recording');

                // Stop generating data
                clearInterval(recordingInterval);
            }
        });

        // Initialize on page load
        document.addEventListener('DOMContentLoaded', function () {
            initChart();

            // Generate initial dummy data
            for (let i = 0; i < 10; i++) {
                generateDummyData();
            }
        });
    </script>

    <style>
        .record-btn {
            background: #ef4444;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
        }

        .record-btn:hover {
            background: #dc2626;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .record-btn.recording {
            background: #3b82f6;
            animation: pulse 2s infinite;
        }

        @keyframes pulse {

            0%,
            100% {
                opacity: 1;
            }

            50% {
                opacity: 0.7;
            }
        }

        .current-readings {
            margin: 24px 0;
        }

        .readings-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }

        .reading-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.08);
            display: flex;
            gap: 16px;
            border-left: 4px solid rgba(124, 58, 237, 0.3);
            border: 1px solid rgba(124, 58, 237, 0.12);
            border-left-width: 4px;
            transition: transform 0.2s;
            color: #1E1B4B;
        }

        .reading-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(124, 58, 237, 0.15);
            background: rgba(255, 255, 255, 0.95);
        }

        .reading-card.heart-rate {
            border-left-color: #ef4444;
        }

        .reading-card.spo2 {
            border-left-color: #3b82f6;
        }

        .reading-card.hrv {
            border-left-color: #10b981;
        }

        .reading-card.stress {
            border-left-color: #8b5cf6;
        }

        .reading-card.gsr {
            border-left-color: #f59e0b;
        }

        .reading-card.temp {
            border-left-color: #ec4899;
        }

        .reading-icon {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            background: rgba(124, 58, 237, 0.12);
            color: #7C3AED;
        }

        .reading-content {
            flex: 1;
        }

        .reading-label {
            font-size: 0.85rem;
            color: #6B7280;
            font-weight: 500;
            margin-bottom: 8px;
        }

        .reading-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: #1E1B4B;
            line-height: 1;
        }

        .reading-unit {
            font-size: 0.9rem;
            color: #9CA3AF;
            margin-top: 4px;
        }

        .reading-status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            margin-top: 8px;
        }

        .status-excellent {
            background: #D1FAE5;
            color: #065F46;
        }

        .status-good {
            background: #DBEAFE;
            color: #1E40AF;
        }

        .status-normal {
            background: #EDE9FE;
            color: #5B21B6;
        }

        .status-low {
            background: #EDE9FE;
            color: #5B21B6;
        }

        .realtime-chart-section {
            margin: 32px 0;
        }

        .chart-controls {
            margin-bottom: 16px;
        }

        .health-insights {
            margin: 32px 0;
        }

        .insights-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }

        .insight-card {
            background: rgba(255, 255, 255, 0.85);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-radius: 12px;
            padding: 20px;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.08);
            display: flex;
            gap: 16px;
            border: 1px solid rgba(124, 58, 237, 0.12);
            color: #1E1B4B;
        }

        .insight-icon {
            width: 50px;
            height: 50px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.5rem;
            flex-shrink: 0;
        }

        .insight-content h3 {
            font-size: 1rem;
            font-weight: 600;
            color: #1E1B4B;
            margin-bottom: 8px;
        }

        .insight-content p {
            font-size: 0.9rem;
            color: #4B5563;
            line-height: 1.5;
        }
    </style>
</body>

</html>