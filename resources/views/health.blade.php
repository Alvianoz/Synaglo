<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>SYNAWATCH - Health Monitor</title>
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
                <button class="record-btn" id="connectBleBtn">
                    <i class="fab fa-bluetooth-b"></i>
                    <span>Connect SYNAWATCH</span>
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
                        <div style="width: 100%; background: #e5e7eb; height: 8px; border-radius: 4px; margin-top: 8px; overflow: hidden;">
                            <div id="stressProgressBar" style="width: 32%; background: #8b5cf6; height: 100%; transition: width 0.3s;"></div>
                        </div>
                        <div class="reading-status status-low" id="stressStatus">Low</div>
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

                <!-- Activity / Accelerometer -->
                <div class="reading-card act">
                    <div class="reading-icon" style="background: rgba(16, 185, 129, 0.12); color: #10b981;">
                        <i class="fas fa-running"></i>
                    </div>
                    <div class="reading-content">
                        <div class="reading-label">Motion (Accel)</div>
                        <div class="reading-value" style="font-size: 1.25rem;" id="accelData">X: -- Y: -- Z: --</div>
                        <div class="reading-unit">g</div>
                        <div class="reading-status status-good" id="activityStatus">--</div>
                    </div>
                </div>

                <!-- Gyroscope -->
                <div class="reading-card gyro">
                    <div class="reading-icon" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b;">
                        <i class="fas fa-compass"></i>
                    </div>
                    <div class="reading-content">
                        <div class="reading-label">Orientation (Gyro)</div>
                        <div class="reading-value" style="font-size: 1.25rem;" id="gyroData">X: -- Y: -- Z: --</div>
                        <div class="reading-unit">°/s</div>
                        <div class="reading-status status-normal">Tracking</div>
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
    <script src="{{ asset('js/synawatch-ble.js') }}"></script>

    <script>
        // Data generator
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

        // Handle BLE Connection
        const connectBtn = document.getElementById('connectBleBtn');
        if (connectBtn) {
            connectBtn.addEventListener('click', async () => {
                if (!window.synawatchBle.isConnected) {
                    await window.synawatchBle.connect();
                } else {
                    window.synawatchBle.disconnect();
                }
            });
        }

        window.addEventListener('synawatch_status', (e) => {
            const connected = e.detail.connected;
            if (connected) {
                connectBtn.innerHTML = '<i class="fas fa-stop"></i><span>Disconnect SYNAWATCH</span>';
                connectBtn.classList.add('recording');
            } else {
                connectBtn.innerHTML = '<i class="fab fa-bluetooth-b"></i><span>Connect SYNAWATCH</span>';
                connectBtn.classList.remove('recording');
                
                if (e.detail.error) {
                    alert('Bluetooth Error: ' + e.detail.error);
                }
            }
        });

        // Handle real-time data from BLE
        window.addEventListener('synawatch_data', (e) => {
            const data = e.detail;

            // Update DOM Elements
            document.getElementById('heartRate').textContent = data.display_hr;
            document.getElementById('spO2').textContent = data.display_spo2;
            document.getElementById('stress').textContent = data.stress;
            
            // Stress Progress Bar
            const stressBar = document.getElementById('stressProgressBar');
            if (stressBar) {
                stressBar.style.width = Math.min(100, Math.max(0, data.stress)) + '%';
                // Color based on stress
                if (data.stress < 40) {
                    stressBar.style.background = '#10b981'; // Green
                    document.getElementById('stressStatus').textContent = 'Low';
                    document.getElementById('stressStatus').className = 'reading-status status-excellent';
                } else if (data.stress < 70) {
                    stressBar.style.background = '#f59e0b'; // Yellow/Orange
                    document.getElementById('stressStatus').textContent = 'Moderate';
                    document.getElementById('stressStatus').className = 'reading-status status-good';
                } else {
                    stressBar.style.background = '#ef4444'; // Red
                    document.getElementById('stressStatus').textContent = 'High';
                    document.getElementById('stressStatus').className = 'reading-status status-low';
                }
            }

            document.getElementById('temperature').textContent = data.display_bt;

            const fakeHrv = Math.round(80 - data.stress * 0.5);
            document.getElementById('hrv').textContent = fakeHrv;
            
            // Accelerometer & Gyro
            if (document.getElementById('accelData')) {
                document.getElementById('accelData').textContent = `X: ${data.display_ax} Y: ${data.display_ay} Z: ${data.display_az}`;
            }
            if (document.getElementById('gyroData')) {
                document.getElementById('gyroData').textContent = `X: ${data.display_gx} Y: ${data.display_gy} Z: ${data.display_gz}`;
            }
            if (document.getElementById('activityStatus') && data.act) {
                document.getElementById('activityStatus').textContent = data.act;
            }

            // Add to chart
            const now = new Date();
            const timeLabel = now.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit', second: '2-digit'
            });

            dataPoints.labels.push(timeLabel);
            dataPoints.heartRate.push(data.hr || 0);
            dataPoints.spo2.push(data.spo2 || 0);
            dataPoints.stress.push(data.stress || 0);

            if (dataPoints.labels.length > 20) {
                dataPoints.labels.shift();
                dataPoints.heartRate.shift();
                dataPoints.spo2.shift();
                dataPoints.stress.shift();
            }

            if (chart) {
                chart.data.labels = dataPoints.labels;
                chart.data.datasets[0].data = dataPoints.heartRate;
                chart.data.datasets[1].data = dataPoints.spo2;
                chart.data.datasets[2].data = dataPoints.stress;
                chart.update('none');
            }
        });

        document.addEventListener('DOMContentLoaded', function () {
            initChart();
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