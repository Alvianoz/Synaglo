/**
 * Syanglo - Main Application JavaScript
 * Handles general app functionality and initialization
 * Now supports BLE connection to ESP32-C3
 */

// BLE data source flag (for dashboard)
let useBLEData = false;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('Syanglo app initialized');
    
    // Add smooth scrolling behavior
    document.documentElement.style.scrollBehavior = 'smooth';
    
    // Initialize BLE connection if available (for dashboard)
    // Note: BLE connection is handled in health-monitoring.js for health page
    // Dashboard uses different approach
    if (window.BLEConnection && window.BLEConnection.isSupported()) {
        // Set up BLE data listeners for dashboard
        setupBLEDataListeners();
        
        // Check initial connection status
        const connectionStatus = window.BLEConnection.getConnectionStatus();
        if (connectionStatus.isConnected) {
            if (typeof useBLEData !== 'undefined') {
                useBLEData = true;
            }
            updateBLESignalIndicator(true);
        } else {
            updateBLESignalIndicator(false);
        }
        
        // Listen for connection changes
        window.BLEConnection.onConnectionChange((connected) => {
            if (typeof useBLEData !== 'undefined') {
                useBLEData = connected;
            }
            updateBLESignalIndicator(connected);
            
            // Reset values to "--" if disconnected
            if (!connected) {
                resetDashboardValues();
            }
        });
    } else {
        // BLE not supported, ensure signal indicator is not green
        updateBLESignalIndicator(false);
    }
    
    // Load dashboard data from Firestore
    loadDashboardDataFromFirestore();
    
    // Initialize real-time data updates (BLE or simulated)
    if (document.getElementById('hrvChart') || document.getElementById('stressChart')) {
        initializeDataUpdates();
    }
    
    // Initialize biometric updates
    if (document.getElementById('dashboardHR') || document.getElementById('dashboardGSR')) {
        initializeBiometricUpdates();
    }
    
    // Initialize mental health indicators updates
    if (document.querySelector('.indicator-card.anxiety')) {
        // Initial update
        updateDashboardMentalHealthIndicators();
        
        // Update every 5 seconds to get latest data
        setInterval(() => {
            updateDashboardMentalHealthIndicators();
        }, 5000);
    }
    
    // Hide welcome card after first visit (optional)
    const welcomeCard = document.querySelector('.welcome-card');
    if (welcomeCard && localStorage.getItem('syanglo_welcome_seen')) {
        welcomeCard.style.display = 'none';
    } else if (welcomeCard) {
        localStorage.setItem('syanglo_welcome_seen', 'true');
    }
});

/**
 * Setup BLE data listeners for dashboard
 */
function setupBLEDataListeners() {
    if (!window.BLEConnection) return;
    
    // Listen for All Data updates (JSON format)
    window.BLEConnection.onDataUpdate('allData', (data) => {
        // Update dashboard values if available
        updateDashboardFromBLE(data);
        
        // Update mental health indicators with real-time data
        updateDashboardMentalHealthIndicators();
    });
    
    // Also listen to individual characteristics
    window.BLEConnection.onDataUpdate('bpm', (bpm) => {
        const hrEl = document.getElementById('dashboardHR');
        if (hrEl && bpm > 0) {
            const currentHR = hrEl.textContent === '--' ? 0 : parseInt(hrEl.textContent);
            animateValue(hrEl, currentHR || bpm, Math.round(bpm), 500);
            updateDashboardHRStatus(bpm);
        }
    });
    
    window.BLEConnection.onDataUpdate('temp', (temp) => {
        const tempEl = document.getElementById('dashboardTemp');
        if (tempEl && temp > 0) {
            const currentTemp = tempEl.textContent === '--°C' ? 0 : parseFloat(tempEl.textContent.replace('°C', ''));
            animateValue(tempEl, currentTemp || temp, temp, 500, 1, '°C');
        }
    });
    
    window.BLEConnection.onDataUpdate('gsr', (gsr) => {
        const gsrEl = document.getElementById('dashboardGSR');
        if (gsrEl && gsr >= 0) {
            const currentGSR = gsrEl.textContent === '--' ? 0 : parseInt(gsrEl.textContent);
            animateValue(gsrEl, currentGSR || gsr, gsr, 500);
        }
    });
}

/**
 * Update Mental Health Indicators in dashboard
 * Uses real-time BLE data or recording data from Firestore
 */
async function updateDashboardMentalHealthIndicators() {
    // Check if we're on dashboard page
    if (!document.querySelector('.indicator-card.anxiety')) {
        return;
    }
    
    let mentalHealthData = null;
    
    // First, try to get real-time data from BLE if available
    if (window.BLEConnection && window.BLEConnection.getConnectionStatus().isConnected) {
        const bleData = window.BLEConnection.getLastData();
        if (bleData && (bleData.bpm || bleData.temp || bleData.gsr || bleData.spo2)) {
            // Import calculateMentalHealthFromRealtimeData from health-monitoring.js
            if (typeof calculateMentalHealthFromRealtimeData === 'function') {
                const realtimeData = {
                    heartRate: bleData.bpm || null,
                    spo2: bleData.spo2 || null,
                    gsr: bleData.gsr >= 0 ? bleData.gsr : null,
                    temperature: bleData.temp || null,
                    motion: bleData.motion || { ax: 0, ay: 0, az: 0 }
                };
                mentalHealthData = calculateMentalHealthFromRealtimeData(realtimeData);
            }
        }
    }
    
    // If no real-time data, try to get from recordings in the last 24 hours
    if (!mentalHealthData) {
        try {
            const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
            const { collection, query, getDocs, where, limit } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const { initializeFirebase } = await import("./components/firebase-loader.js");
            const { auth, db } = await initializeFirebase();
            
            return new Promise((resolve) => {
                onAuthStateChanged(auth, async (user) => {
                    if (!user) {
                        // No user, show default/empty state
                        updateMentalHealthIndicatorsUI(null);
                        resolve();
                        return;
                    }
                    
                    try {
                        // Get all recordings from the last 24 hours
                        const now = new Date();
                        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
                        const yesterdayISO = yesterday.toISOString();
                        
                        const recordingsRef = collection(db, 'users', user.uid, 'recordings');
                        const q = query(
                            recordingsRef,
                            where('isComplete', '==', true),
                            limit(100) // Get last 100 recordings to filter in memory
                        );
                        
                        const querySnapshot = await getDocs(q);
                        const last24HoursRecordings = [];
                        
                        // Filter recordings from last 24 hours
                        querySnapshot.forEach((doc) => {
                            const data = doc.data();
                            if (data.startTime && data.startTime >= yesterdayISO) {
                                last24HoursRecordings.push(data);
                            }
                        });
                        
                        if (last24HoursRecordings.length > 0) {
                            // Calculate average statistics from all recordings in last 24 hours
                            let totalBPM = 0;
                            let totalSpO2 = 0;
                            let totalGSR = 0;
                            let totalTemp = 0;
                            let validCount = 0;
                            
                            last24HoursRecordings.forEach((recording) => {
                                if (recording.statistics) {
                                    const stats = recording.statistics;
                                    if (stats.avgBPM > 0) {
                                        totalBPM += stats.avgBPM;
                                        validCount++;
                                    }
                                    if (stats.avgSpO2 > 0) {
                                        totalSpO2 += stats.avgSpO2;
                                    }
                                    if (stats.avgGSR >= 0) {
                                        totalGSR += stats.avgGSR;
                                    }
                                    if (stats.avgTemp > 0) {
                                        totalTemp += stats.avgTemp;
                                    }
                                }
                            });
                            
                            // Calculate averages
                            const avgBPM = validCount > 0 ? totalBPM / validCount : null;
                            const avgSpO2 = last24HoursRecordings.length > 0 ? totalSpO2 / last24HoursRecordings.length : null;
                            const avgGSR = last24HoursRecordings.length > 0 ? totalGSR / last24HoursRecordings.length : null;
                            const avgTemp = last24HoursRecordings.length > 0 ? totalTemp / last24HoursRecordings.length : null;
                            
                            // Prepare data for mental health calculation
                            const recordingData = {
                                heartRate: avgBPM,
                                spo2: avgSpO2,
                                gsr: avgGSR >= 0 ? avgGSR : null,
                                temperature: avgTemp,
                                motion: { ax: 0, ay: 0, az: 0 } // Motion not stored in statistics
                            };
                            
                            // Calculate mental health from aggregated data
                            if (typeof calculateMentalHealthFromRealtimeData === 'function') {
                                mentalHealthData = calculateMentalHealthFromRealtimeData(recordingData);
                            }
                        }
                        
                        // Update UI with calculated data or null
                        updateMentalHealthIndicatorsUI(mentalHealthData);
                        resolve();
                    } catch (error) {
                        console.error('Error loading mental health data:', error);
                        updateMentalHealthIndicatorsUI(null);
                        resolve();
                    }
                });
            });
        } catch (error) {
            console.error('Error initializing Firebase for mental health:', error);
            updateMentalHealthIndicatorsUI(null);
        }
    } else {
        // Update UI with real-time data
        updateMentalHealthIndicatorsUI(mentalHealthData);
    }
}

/**
 * Update Mental Health Indicators UI in dashboard
 */
function updateMentalHealthIndicatorsUI(data) {
    // Update Anxiety Level
    const anxietyCard = document.querySelector('.indicator-card.anxiety');
    if (anxietyCard) {
        const anxietyValue = anxietyCard.querySelector('.indicator-value');
        const anxietyDesc = anxietyCard.querySelector('.indicator-description');
        const anxietyProgress = anxietyCard.querySelector('.progress-fill');
        const anxietyLabel = anxietyCard.querySelector('.progress-label');
        
        if (data && data.anxiety !== null && data.anxiety !== undefined) {
            const anxiety = data.anxiety;
            let anxietyText = 'Low';
            let anxietyDescription = 'Your condition is good, no signs of excessive anxiety';
            let anxietyStatus = 'Excellent';
            
            if (anxiety < 30) {
                anxietyText = 'Low';
                anxietyDescription = 'Your condition is good, no signs of excessive anxiety';
                anxietyStatus = 'Excellent';
            } else if (anxiety < 60) {
                anxietyText = 'Moderate';
                anxietyDescription = 'Moderate anxiety level detected. Consider relaxation techniques.';
                anxietyStatus = 'Moderate';
            } else {
                anxietyText = 'High';
                anxietyDescription = 'High anxiety level detected. Consultation recommended.';
                anxietyStatus = 'High';
            }
            
            if (anxietyValue) anxietyValue.textContent = anxietyText;
            if (anxietyDesc) anxietyDesc.textContent = anxietyDescription;
            if (anxietyProgress) anxietyProgress.style.width = `${anxiety}%`;
            if (anxietyLabel) anxietyLabel.textContent = `${anxiety}% - ${anxietyStatus}`;
        } else {
            // No data available
            if (anxietyValue) anxietyValue.textContent = '--';
            if (anxietyDesc) anxietyDesc.textContent = 'No recording data available';
            if (anxietyProgress) anxietyProgress.style.width = '0%';
            if (anxietyLabel) anxietyLabel.textContent = '--';
        }
    }
    
    // Update Stress Resilience
    const stressCard = document.querySelector('.indicator-card.stress');
    if (stressCard) {
        const stressValue = stressCard.querySelector('.indicator-value');
        const stressDesc = stressCard.querySelector('.indicator-description');
        const stressProgress = stressCard.querySelector('.progress-fill');
        const stressLabel = stressCard.querySelector('.progress-label');
        
        if (data && data.stress !== null && data.stress !== undefined) {
            const stress = data.stress;
            let stressText = 'High';
            let stressDescription = 'You have good ability to manage stress';
            let stressStatus = 'Excellent';
            
            if (stress >= 70) {
                stressText = 'High';
                stressDescription = 'You have excellent ability to manage stress';
                stressStatus = 'Excellent';
            } else if (stress >= 40) {
                stressText = 'Medium';
                stressDescription = 'Moderate stress resilience. Room for improvement.';
                stressStatus = 'Good';
            } else {
                stressText = 'Low';
                stressDescription = 'Low stress resilience. Consider stress management techniques.';
                stressStatus = 'Low';
            }
            
            if (stressValue) stressValue.textContent = stressText;
            if (stressDesc) stressDesc.textContent = stressDescription;
            if (stressProgress) stressProgress.style.width = `${stress}%`;
            if (stressLabel) stressLabel.textContent = `${stress}% - ${stressStatus}`;
        } else {
            // No data available
            if (stressValue) stressValue.textContent = '--';
            if (stressDesc) stressDesc.textContent = 'No recording data available';
            if (stressProgress) stressProgress.style.width = '0%';
            if (stressLabel) stressLabel.textContent = '--';
        }
    }
    
    // Update Mood Stability
    const moodCard = document.querySelector('.indicator-card.mood');
    if (moodCard) {
        const moodValue = moodCard.querySelector('.indicator-value');
        const moodDesc = moodCard.querySelector('.indicator-description');
        const moodProgress = moodCard.querySelector('.progress-fill');
        const moodLabel = moodCard.querySelector('.progress-label');
        
        if (data && data.mood !== null && data.mood !== undefined) {
            const mood = data.mood;
            let moodText = 'Stable';
            let moodDescription = 'Your mood is quite stable today';
            let moodStatus = 'Good';
            
            if (mood >= 70) {
                moodText = 'Stable';
                moodDescription = 'Your mood is very stable. Excellent emotional balance.';
                moodStatus = 'Excellent';
            } else if (mood >= 40) {
                moodText = 'Moderate';
                moodDescription = 'Your mood is relatively stable with some variations.';
                moodStatus = 'Good';
            } else {
                moodText = 'Unstable';
                moodDescription = 'Mood stability is low. Consider mindfulness practices.';
                moodStatus = 'Low';
            }
            
            if (moodValue) moodValue.textContent = moodText;
            if (moodDesc) moodDesc.textContent = moodDescription;
            if (moodProgress) moodProgress.style.width = `${mood}%`;
            if (moodLabel) moodLabel.textContent = `${mood}% - ${moodStatus}`;
        } else {
            // No data available
            if (moodValue) moodValue.textContent = '--';
            if (moodDesc) moodDesc.textContent = 'No recording data available';
            if (moodProgress) moodProgress.style.width = '0%';
            if (moodLabel) moodLabel.textContent = '--';
        }
    }
}

/**
 * Update dashboard from BLE data
 */
function updateDashboardFromBLE(data) {
    // Update heart rate
    if (data.bpm !== undefined && data.bpm > 0) {
        const hrEl = document.getElementById('dashboardHR');
        if (hrEl) {
            const currentHR = hrEl.textContent === '--' ? 0 : parseInt(hrEl.textContent);
            if (currentHR === 0 || Math.abs(currentHR - data.bpm) > 0) {
                animateValue(hrEl, currentHR || data.bpm, Math.round(data.bpm), 500);
                updateDashboardHRStatus(data.bpm);
            }
        }
    } else {
        // Show "--" if no data
        const hrEl = document.getElementById('dashboardHR');
        if (hrEl && hrEl.textContent !== '--') {
            hrEl.textContent = '--';
        }
        updateDashboardHRStatus(null);
    }
    
    // Update SpO2 (not available from ESP32-C3, always keep as "--")
    const spo2El = document.getElementById('dashboardSpO2');
    if (spo2El) {
        spo2El.textContent = '--';
        updateDashboardSpO2Status(null);
    }
    
    // Update temperature
    if (data.temp !== undefined && data.temp > 0) {
        const tempEl = document.getElementById('dashboardTemp');
        if (tempEl) {
            const currentTemp = tempEl.textContent === '--°C' ? 0 : parseFloat(tempEl.textContent.replace('°C', ''));
            if (currentTemp === 0 || Math.abs(currentTemp - data.temp) > 0.1) {
                animateValue(tempEl, currentTemp || data.temp, data.temp, 500, 1, '°C');
            }
        }
    } else {
        // Show "--" if no data
        const tempEl = document.getElementById('dashboardTemp');
        if (tempEl && tempEl.textContent !== '--°C') {
            tempEl.textContent = '--°C';
        }
    }
    
    // Update GSR
    if (data.gsr !== undefined && data.gsr >= 0) {
        const gsrEl = document.getElementById('dashboardGSR');
        if (gsrEl) {
            const currentGSR = gsrEl.textContent === '--' ? 0 : parseInt(gsrEl.textContent);
            if (currentGSR === 0 || Math.abs(currentGSR - data.gsr) > 0) {
                animateValue(gsrEl, currentGSR || data.gsr, data.gsr, 500);
            }
        }
    } else {
        // Show "--" if no data
        const gsrEl = document.getElementById('dashboardGSR');
        if (gsrEl && gsrEl.textContent !== '--') {
            gsrEl.textContent = '--';
        }
    }
    
    // Update mental health indicators with real-time BLE data
    updateDashboardMentalHealthIndicators();
}

/**
 * Update dashboard heart rate status
 */
function updateDashboardHRStatus(bpm) {
    const statusEl = document.getElementById('dashboardHRStatus');
    if (!statusEl) return;
    
    if (bpm === null || bpm === 0) {
        statusEl.textContent = '--';
        statusEl.className = 'biometric-status';
        return;
    }
    
    if (bpm < 60) {
        statusEl.textContent = 'Rendah';
        statusEl.className = 'biometric-status status-low';
    } else if (bpm > 100) {
        statusEl.textContent = 'Tinggi';
        statusEl.className = 'biometric-status status-high';
    } else {
        statusEl.textContent = 'Normal';
        statusEl.className = 'biometric-status status-normal';
    }
}

/**
 * Update dashboard SpO2 status
 */
function updateDashboardSpO2Status(spo2) {
    const statusEl = document.getElementById('dashboardSpO2Status');
    if (!statusEl) return;
    
    if (spo2 === null || spo2 === 0) {
        statusEl.textContent = '--';
        statusEl.className = 'biometric-status';
        return;
    }
    
    if (spo2 >= 95) {
        statusEl.textContent = 'Sangat Baik';
        statusEl.className = 'biometric-status status-excellent';
    } else if (spo2 >= 90) {
        statusEl.textContent = 'Baik';
        statusEl.className = 'biometric-status status-normal';
    } else {
        statusEl.textContent = 'Rendah';
        statusEl.className = 'biometric-status status-low';
    }
}

/**
 * Animate value change (helper function)
 */
function animateValue(element, start, end, duration, decimals = 0, suffix = '') {
    // Don't animate if start is "--" or invalid
    if (element.textContent === '--' || element.textContent === '--°C' || start === 0 || isNaN(start)) {
        element.textContent = (decimals > 0 ? end.toFixed(decimals) : Math.round(end)) + suffix;
        return;
    }
    
    const startTime = performance.now();
    const difference = end - start;
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const current = start + difference * easeOut;
        
        element.textContent = (decimals > 0 ? current.toFixed(decimals) : Math.round(current)) + suffix;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Initialize biometric updates
 */
function initializeBiometricUpdates() {
    // Update biometric values periodically (every 5 seconds)
    // Only if not using BLE data
    setInterval(() => {
        if (!useBLEData) {
            updateBiometricReadings();
        }
    }, 5000);
}

/**
 * Update BLE signal indicator in header
 */
function updateBLESignalIndicator(connected) {
    const signalIcon = document.getElementById('bleSignalIcon');
    const signalIndicator = document.getElementById('bleSignalIndicator');
    
    if (signalIcon && signalIndicator) {
        if (connected) {
            // Change to green when connected
            signalIcon.style.color = '#10b981';
            signalIndicator.style.color = '#10b981';
            signalIcon.classList.add('connected');
        } else {
            // Reset to default color when disconnected
            signalIcon.style.color = '';
            signalIndicator.style.color = '';
            signalIcon.classList.remove('connected');
        }
    }
}

/**
 * Reset dashboard values to placeholder
 */
function resetDashboardValues() {
    // Reset heart rate
    const hrEl = document.getElementById('dashboardHR');
    if (hrEl) hrEl.textContent = '--';
    updateDashboardHRStatus(null);
    
    // Reset SpO2
    const spo2El = document.getElementById('dashboardSpO2');
    if (spo2El) spo2El.textContent = '--';
    updateDashboardSpO2Status(null);
    
    // Reset temperature
    const tempEl = document.getElementById('dashboardTemp');
    if (tempEl) tempEl.textContent = '--°C';
    
    // Reset GSR
    const gsrEl = document.getElementById('dashboardGSR');
    if (gsrEl) gsrEl.textContent = '--';
}

/**
 * Get current user ID
 * Mengambil user ID dari auth guard atau Firebase auth
 */
async function getCurrentUserId() {
    // Try to get from auth guard first (fastest)
    if (window.currentUser) {
        return window.currentUser.uid;
    }
    
    // Try to get from auth guard function
    if (window.authGuard && window.authGuard.getCurrentUser) {
        const user = window.authGuard.getCurrentUser();
        if (user) {
            return user.uid;
        }
    }
    
    // Wait for auth state from Firebase
    try {
        const { initializeFirebase } = await import("./components/firebase-loader.js");
        const { auth } = await initializeFirebase();
        
        // Check current user immediately
        if (auth.currentUser) {
            return auth.currentUser.uid;
        }
        
        // Wait for auth state if not available
        return new Promise((resolve) => {
            const unsubscribe = auth.onAuthStateChanged((user) => {
                unsubscribe();
                resolve(user ? user.uid : null);
            });
        });
    } catch (error) {
        console.error('Error getting current user ID:', error);
        return null;
    }
}

/**
 * Load dashboard data from Firestore
 * Mengambil data rekaman terbaru dari Firestore untuk ditampilkan di dashboard
 */
async function loadDashboardDataFromFirestore() {
    try {
        // Import Firebase modules
        const { collection, query, getDocs, orderBy, where, limit } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        // Load Firebase config from centralized file
        const { initializeFirebase } = await import("./components/firebase-loader.js");
        const { db } = await initializeFirebase();

        // Get current user ID (wait for it if needed)
        const userId = await getCurrentUserId();
        
        if (!userId) {
            console.log('No user logged in for dashboard data');
            return;
        }
        
        console.log('Loading dashboard data for user:', userId);

        try {
            // Get today's recordings
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            const recordingsRef = collection(db, 'users', userId, 'recordings');
            // Simplified query to avoid index requirement
            // Get all completed recordings and filter in memory
            const q = query(
                recordingsRef,
                where('isComplete', '==', true),
                limit(50) // Get last 50 recordings
            );

            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
                // Filter by date and sort in memory
                const todayISO = today.toISOString();
                const todayRecordings = [];
                
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    if (data.startTime && data.startTime >= todayISO) {
                        todayRecordings.push({
                            ...data,
                            id: doc.id
                        });
                    }
                });
                
                // Sort by startTime descending and get the most recent
                todayRecordings.sort((a, b) => {
                    const timeA = new Date(a.startTime).getTime();
                    const timeB = new Date(b.startTime).getTime();
                    return timeB - timeA;
                });
                
                if (todayRecordings.length === 0) {
                    console.log('No recordings found for today');
                    return;
                }
                
                const latestRecording = todayRecordings[0];
                const stats = latestRecording.statistics || {};
                
                console.log('Latest recording found:', latestRecording);
                console.log('Statistics:', stats);
                
                // Update dashboard metrics with real data
                // Only update if not using BLE data
                if (typeof useBLEData === 'undefined' || !useBLEData) {
                    // Update GSR if available
                    if (stats.avgGSR !== undefined && stats.avgGSR > 0) {
                        const gsrEl = document.getElementById('dashboardGSR');
                        if (gsrEl) {
                            gsrEl.textContent = Math.round(stats.avgGSR);
                        }
                    }
                    
                    // Update temperature if available
                    if (stats.avgTemp !== undefined && stats.avgTemp > 0) {
                        const tempEl = document.getElementById('dashboardTemp');
                        if (tempEl) {
                            tempEl.textContent = parseFloat(stats.avgTemp).toFixed(1) + '°C';
                        }
                    }
                }
            } else {
                console.log('No recordings found for today');
            }
            
            // Load activity data (steps, sleep) from user document or calculate from recordings
            const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
            const userDocRef = doc(db, 'users', userId);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Steps and Sleep data removed - device doesn't support these metrics
            }
            
            // Update mental health indicators from latest recording
            updateDashboardMentalHealthIndicators();
        } catch (error) {
            console.error('Error loading dashboard data from Firestore:', error);
            // Still try to update mental health indicators even if there's an error
            updateDashboardMentalHealthIndicators();
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Still try to update mental health indicators even if there's an error
        updateDashboardMentalHealthIndicators();
    }
}

/**
 * Simulate real-time data updates for biometric readings
 */
function initializeDataUpdates() {
    // Load data from Firestore first
    loadDashboardDataFromFirestore();
    
    // Update biometric values periodically (every 5 seconds)
    // Only if not using BLE data
    setInterval(() => {
        if (typeof useBLEData === 'undefined' || !useBLEData) {
            updateBiometricReadings();
        }
    }, 5000);
}

/**
 * Initialize biometric updates
 */
function initializeBiometricUpdates() {
    // Update every 3 seconds if BLE is not connected
    setInterval(() => {
        if (!useBLEData) {
            updateBiometricReadings();
        }
    }, 3000);
}

/**
 * Update biometric readings with slight variations
 * Only used when BLE is not connected
 * Now shows "--" instead of random values
 */
function updateBiometricReadings() {
    // Skip if using BLE data (check if variable exists)
    if (typeof useBLEData !== 'undefined' && useBLEData) return;
    
    // Show "--" for sensor values if not connected to BLE
    const heartRateElement = document.getElementById('dashboardHR');
    if (heartRateElement && heartRateElement.textContent !== '--') {
        heartRateElement.textContent = '--';
    }
    
    // Keep SpO2 as "--" or default (not from ESP32-C3)
    const bloodOxygenElement = document.getElementById('dashboardSpO2');
    if (bloodOxygenElement && bloodOxygenElement.textContent !== '--') {
        // SpO2 can stay as default or "--"
    }
    
    // Show "--" for GSR
    const gsrElement = document.getElementById('dashboardGSR');
    if (gsrElement && gsrElement.textContent !== '--') {
        gsrElement.textContent = '--';
    }
    
    // Show "--" for temperature
    const tempElement = document.getElementById('dashboardTemp');
    if (tempElement && tempElement.textContent !== '--°C') {
        tempElement.textContent = '--°C';
    }
    
    // Steps and Sleep data removed - device doesn't support these metrics
}

/**
 * Handle menu item clicks
 */
document.addEventListener('click', function(e) {
    const menuItem = e.target.closest('.menu-item');
    if (menuItem) {
        const menuText = menuItem.querySelector('span')?.textContent;
        console.log('Menu item clicked:', menuText);
        // Add your navigation logic here
        // For now, just show an alert
        // alert(`Navigating to ${menuText}`);
    }
});

/**
 * Handle settings icon click
 */
document.addEventListener('click', function(e) {
    if (e.target.closest('.fa-cog')) {
        console.log('Settings clicked');
        // Add settings modal or navigation here
    }
});
