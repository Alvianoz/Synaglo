/**
 * Health Monitoring Component
 * Handles real-time monitoring and health page functionality
 * Now integrated with BLE connection to ESP32-C3
 * Includes Firebase Firestore integration for auto-saving recordings
 */

// Firebase imports (will be loaded dynamically)
// Use window namespace to avoid conflicts with auth-guard.js
let healthDb = null;
let healthAuth = null;
let currentUserId = null;

// Real-time data update intervals
let monitoringInterval;
let miniTrendsInterval;
let spo2PollingInterval = null;  // Interval untuk polling SpO2 jika notifications tidak support

// Initialization flags to prevent double initialization
let isHealthMonitoringInitialized = false;
let isBLEConnectionInitialized = false;

// Recording state
let isRecording = false;
let recordingStartTime = null;
let recordingData = [];
let recordingInterval = null;
let recordingTimeInterval = null;
let autoSaveInterval = null;  // Interval untuk auto-save ke Firestore
let currentRecordingId = null;  // ID dokumen Firestore untuk rekaman saat ini
const MAX_RECORDING_DURATION = 3600000; // 1 hour in milliseconds
const RECORDING_INTERVAL = 3000; // Record every 3 seconds
const AUTO_SAVE_INTERVAL = 10000; // Auto-save setiap 10 detik

// BLE data source flag
let useBLEData = false;

let lastBLEData = {
    bpm: 0,
    temp: 0,
    gsr: 0,  // Raw GSR value dari ESP32-C3 (akan dihitung Human Resistance di web app)
    humanResistance: 0,  // Human Resistance (dihitung di web app dari raw GSR)
    spo2: 0,  // SpO2 (Saturasi Oksigen)
    motion: { ax: 0, ay: 0, az: 0 }
};

// Constants for Human Resistance calculation
// Note: Formula uses 512 as the calibration value (from Arduino code)

// Data history for mini trend charts (stores data with timestamp)
// Shows last 5 seconds of data for real-time trends
let dataHistory = {
    heartRate: [],    // Array of {value: number, timestamp: number}
    spo2: [],         // Array of {value: number, timestamp: number}
    gsr: [],          // Array of {value: number, timestamp: number}
    temperature: []   // Array of {value: number, timestamp: number}
};
const TREND_TIME_WINDOW = 5000; // 5 seconds in milliseconds
const MAX_HISTORY_LENGTH = 100; // Store up to 100 data points (to cover 5 seconds at high frequency)

/**
 * Initialize Firebase (called when page loads)
 * Menginisialisasi Firebase untuk menyimpan rekaman ke Firestore
 */
async function initFirebase() {
    try {
        // Import Firebase modules dynamically
        const { getAuth, onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
        
        // Load Firebase config from centralized file
        const { initializeFirebase } = await import("./firebase-loader.js");
        const { app: firebaseApp, auth: firebaseAuth, db: firestoreDb } = await initializeFirebase();
        
        // Use local variables to avoid conflicts
        healthAuth = firebaseAuth;
        healthDb = firestoreDb;

        // Check authentication state
        onAuthStateChanged(healthAuth, (user) => {
            if (user) {
                currentUserId = user.uid;
                console.log('User authenticated:', user.email);
            } else {
                currentUserId = null;
                console.log('User not authenticated');
            }
        });

        console.log('Firebase initialized successfully for health monitoring');
        return true;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
    }
}

// Make initFirebase available globally
window.initFirebase = initFirebase;

/**
 * Format date in Indonesian format: "Senin, 15 Januari 2024"
 * Format: hari, tanggal bulan tahun
 */
function formatDateIndonesian(date) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const day = days[date.getDay()];
    const dayNumber = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day}, ${dayNumber} ${month} ${year}`;
}

/**
 * Format date to record_dd-mm-yyyy format
 */
function formatDateForRecord(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `recording_${day}-${month}-${year}`;
}

/**
 * Format time range to HH.MM-HH.MM AM/PM format
 */
function formatTimeRange(startTime, endTime) {
    const formatTime = (date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${String(displayHours).padStart(2, '0')}${String(minutes).padStart(2, '0')}${period}`;
    };
    
    const start = formatTime(new Date(startTime));
    const end = formatTime(new Date(endTime));
    return `${start}-${end}`;
}

/**
 * Get record number for a specific date
 * Counts existing records for the date to determine the next record number
 */
async function getRecordNumberForDate(dateFolderId) {
    try {
        // Import Firestore functions
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        
        // Get all records for this date
        // Path: users/{userId}/recording_{dd-mm-yyyy} (collection)
        const dateRecordsRef = collection(healthDb, 'users', currentUserId, dateFolderId);
        const querySnapshot = await getDocs(dateRecordsRef);
        
        // Count existing records
        return querySnapshot.size + 1;
    } catch (error) {
        console.error('Error getting record number:', error);
        return 1; // Default to 1 if error
    }
}

/**
 * Auto-save recording data to Firestore
 * Menyimpan rekaman secara otomatis ke Firestore setiap beberapa detik
 */
async function autoSaveRecording() {
    if (!isRecording || !healthDb || !currentUserId || recordingData.length === 0) {
        return;
    }

    try {
        // Import Firestore functions
        const { doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        // Create or update recording document
        if (!currentRecordingId) {
            // Create new recording document
            currentRecordingId = `recording_${Date.now()}`;
        }

        // Calculate statistics
        const validHR = recordingData.filter(d => d.heartRate !== null && !isNaN(d.heartRate)).map(d => d.heartRate);
        const validSpO2 = recordingData.filter(d => d.spo2 !== null && !isNaN(d.spo2)).map(d => d.spo2);
        const validGSR = recordingData.filter(d => d.gsr !== null && !isNaN(d.gsr)).map(d => d.gsr);
        const validTemp = recordingData.filter(d => d.temperature !== null && !isNaN(d.temperature)).map(d => d.temperature);

        const avgBPM = validHR.length > 0 ? Math.round(validHR.reduce((sum, val) => sum + val, 0) / validHR.length) : 0;
        const avgSpO2 = validSpO2.length > 0 ? Math.round(validSpO2.reduce((sum, val) => sum + val, 0) / validSpO2.length) : 0;
        const avgGSR = validGSR.length > 0 ? Math.round(validGSR.reduce((sum, val) => sum + val, 0) / validGSR.length) : 0;
        const avgTemp = validTemp.length > 0 ? (validTemp.reduce((sum, val) => sum + val, 0) / validTemp.length).toFixed(1) : '0.0';

        const duration = recordingData[recordingData.length - 1]?.timestamp || 0;

        // Format date in Indonesian
        const formattedDate = formatDateIndonesian(new Date(recordingStartTime));

        // Prepare recording data
        const recordingDoc = {
            userId: currentUserId,
            startTime: new Date(recordingStartTime).toISOString(),
            formattedDate: formattedDate,  // Format: "Senin, 15 Januari 2024"
            duration: duration,
            dataPoints: recordingData.length,
            data: recordingData,  // All recorded data points
            statistics: {
                avgBPM: avgBPM,
                avgSpO2: avgSpO2,
                avgGSR: avgGSR,
                avgTemp: parseFloat(avgTemp)
            },
            lastUpdated: serverTimestamp(),
            isComplete: false  // Will be set to true when recording stops
        };

        // Save to Firestore
        const recordingRef = doc(healthDb, 'users', currentUserId, 'recordings', currentRecordingId);
        await setDoc(recordingRef, recordingDoc, { merge: true });

        console.log('Recording auto-saved to Firestore');
    } catch (error) {
        console.error('Error auto-saving recording:', error);
    }
}

/**
 * Format date to record_dd-mm-yyyy format
 */
function formatDateForRecord(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `recording_${day}-${month}-${year}`;
}

/**
 * Format time range to HH.MM-HH.MM AM/PM format
 */
function formatTimeRange(startTime, endTime) {
    const formatTime = (date) => {
        const hours = date.getHours();
        const minutes = date.getMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        return `${String(displayHours).padStart(2, '0')}${String(minutes).padStart(2, '0')}${period}`;
    };
    
    const start = formatTime(new Date(startTime));
    const end = formatTime(new Date(endTime));
    return `${start}-${end}`;
}

/**
 * Save recording data to local storage
 */
function saveRecordingDataToLocalStorage() {
    try {
        if (!currentUserId || !recordingStartTime) return;
        const storageKey = `recording_data_${currentUserId}_${recordingStartTime}`;
        localStorage.setItem(storageKey, JSON.stringify(recordingData));
    } catch (error) {
        console.error('Error saving to local storage:', error);
    }
}

/**
 * Load recording data from local storage
 */
function loadRecordingDataFromLocalStorage() {
    try {
        if (!currentUserId || !recordingStartTime) return [];
        const storageKey = `recording_data_${currentUserId}_${recordingStartTime}`;
        const storedData = localStorage.getItem(storageKey);
        if (storedData) {
            return JSON.parse(storedData);
        }
    } catch (error) {
        console.error('Error loading from local storage:', error);
    }
    return [];
}

/**
 * Clear recording data from local storage
 */
function clearRecordingDataFromLocalStorage() {
    try {
        if (!currentUserId || !recordingStartTime) return;
        const storageKey = `recording_data_${currentUserId}_${recordingStartTime}`;
        localStorage.removeItem(storageKey);
    } catch (error) {
        console.error('Error clearing local storage:', error);
    }
}

/**
 * Get record number for a specific date
 * Counts existing records for the date to determine the next record number
 */
async function getRecordNumberForDate(dateFolderId) {
    try {
        // Import Firestore functions
        const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        
        // Get all records for this date
        // Path: users/{userId}/recording_{dd-mm-yyyy} (collection)
        const dateRecordsRef = collection(healthDb, 'users', currentUserId, dateFolderId);
        const querySnapshot = await getDocs(dateRecordsRef);
        
        // Count existing records
        return querySnapshot.size + 1;
    } catch (error) {
        console.error('Error getting record number:', error);
        return 1; // Default to 1 if error
    }
}

/**
 * Save final recording to Firestore when recording stops
 * New structure: users/{userId}/recording_{dd-mm-yyyy}/record_{number}_{time}
 * Data is loaded from local storage, averaged, then saved to Firestore
 */
async function saveFinalRecording() {
    if (!healthDb || !currentUserId) {
        return;
    }

    try {
        // Load data from local storage
        const storedData = loadRecordingDataFromLocalStorage();
        
        if (storedData.length === 0 && recordingData.length === 0) {
            console.warn('No recording data to save');
            return;
        }
        
        // Use data from local storage if available, otherwise use recordingData
        const dataToProcess = storedData.length > 0 ? storedData : recordingData;

        // Import Firestore functions
        const { collection, doc, setDoc, serverTimestamp } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

        // Calculate final statistics (averages from all data points)
        const validHR = dataToProcess.filter(d => d.heartRate !== null && !isNaN(d.heartRate)).map(d => d.heartRate);
        const validSpO2 = dataToProcess.filter(d => d.spo2 !== null && !isNaN(d.spo2)).map(d => d.spo2);
        const validGSR = dataToProcess.filter(d => d.gsr !== null && !isNaN(d.gsr)).map(d => d.gsr);
        const validTemp = dataToProcess.filter(d => d.temperature !== null && !isNaN(d.temperature)).map(d => d.temperature);

        const avgBPM = validHR.length > 0 ? Math.round(validHR.reduce((sum, val) => sum + val, 0) / validHR.length) : 0;
        const avgSpO2 = validSpO2.length > 0 ? Math.round(validSpO2.reduce((sum, val) => sum + val, 0) / validSpO2.length) : 0;
        const avgGSR = validGSR.length > 0 ? Math.round(validGSR.reduce((sum, val) => sum + val, 0) / validGSR.length) : 0;
        const avgTemp = validTemp.length > 0 ? (validTemp.reduce((sum, val) => sum + val, 0) / validTemp.length).toFixed(1) : '0.0';

        const duration = dataToProcess[dataToProcess.length - 1]?.timestamp || 0;
        const endTime = Date.now();

        // Format date folder: recording_dd-mm-yyyy
        const dateFolderId = formatDateForRecord(new Date(recordingStartTime));
        
        // Format time range: HHMM-HHMM AM/PM (without spaces and dots)
        const timeRange = formatTimeRange(recordingStartTime, endTime);
        
        // Get record number for this date
        const recordNumber = await getRecordNumberForDate(dateFolderId);
        
        // Create record ID: record_{number}_{time}
        const recordId = `record_${recordNumber}_${timeRange}`;

        // Format date in Indonesian for display
        const formattedDate = formatDateIndonesian(new Date(recordingStartTime));

        // Prepare final recording data (only averages, not all data points)
        const recordingDoc = {
            userId: currentUserId,
            startTime: new Date(recordingStartTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            formattedDate: formattedDate,  // Format: "Senin, 15 Januari 2024"
            duration: duration,
            dataPoints: dataToProcess.length,
            // Save only average data, not all data points
            data: {
                heartRate: avgBPM,
                spo2: avgSpO2,
                gsr: avgGSR,
                temperature: parseFloat(avgTemp)
            },
            statistics: {
                avgBPM: avgBPM,
                avgSpO2: avgSpO2,
                avgGSR: avgGSR,
                avgTemp: parseFloat(avgTemp)
            },
            lastUpdated: serverTimestamp(),
            isComplete: true,
            completedAt: serverTimestamp()
        };

        // Save to Firestore with new structure
        // Path: users/{userId}/recording_{dd-mm-yyyy}/record_{number}_{time}
        const recordRef = doc(healthDb, 'users', currentUserId, dateFolderId, recordId);
        
        // Save record data
        await setDoc(recordRef, recordingDoc, { merge: true });
        
        console.log('Final recording saved to Firestore:', recordId, 'in collection:', dateFolderId);
        
        // Clear local storage after successful save
        clearRecordingDataFromLocalStorage();
        
        // Also clear recordingData array
        recordingData = [];
    } catch (error) {
        console.error('Error saving final recording:', error);
    }
}

/**
 * Initialize health monitoring
 * Initialize Firebase first, then set up monitoring
 */
async function initHealthMonitoring() {
    // Prevent double initialization
    if (isHealthMonitoringInitialized) {
        console.log('Health monitoring already initialized, skipping...');
        return;
    }
    
    // Initialize Firebase first if not already initialized
    if (!healthDb || !healthAuth) {
        console.log('Initializing Firebase for health monitoring...');
        await initFirebase();
    }
    
    // Initialize BLE connection UI
    initBLEConnection();
    
    // Mark as initialized
    isHealthMonitoringInitialized = true;
    
    // Check if BLE is available
    if ('bluetooth' in navigator) {
        console.log('Web Bluetooth API is supported');
        // BLE listeners akan di-setup saat connect
    } else {
        // Fallback to simulated data
        console.log('BLE not supported, using simulated data');
        useBLEData = false;
    }
    
    // Load sleep and activity data from Firestore
    loadSleepAndActivityData();
    
    // Load and update health score from history
    loadAndUpdateHealthScore();
    
    // Initialize with a small delay to ensure DOM is fully ready
    setTimeout(() => {
        updateRealtimeData();
        drawHealthScoreRing();
        drawSleepChart();
        drawMiniTrends();
        // Don't draw mental health gauge on init - wait for real BLE data
        resetMentalHealthIndicators();
    }, 100);
    
    // Update real-time data every 3 seconds
    monitoringInterval = setInterval(updateRealtimeData, 3000);
    
    // Update health score from history every 30 seconds
    setInterval(() => {
        loadAndUpdateHealthScore();
    }, 30000);
    
    // Update mini trends more frequently (every 500ms) for smooth animation
    // This ensures the 5-second window is always up-to-date and shows smooth up/down trends
    miniTrendsInterval = setInterval(() => {
        // Always redraw mini trends to show the 5-second window moving
        // This creates smooth animation as old data falls out of the window
        drawMiniTrends();
    }, 500);
}

/**
 * Initialize BLE connection UI and handlers
 * Mengikuti pola sederhana dari contoh Web Bluetooth API
 */
function initBLEConnection() {
    // Prevent double initialization
    if (isBLEConnectionInitialized) {
        console.log('BLE connection already initialized, skipping...');
        return;
    }
    
    console.log('Initializing BLE connection...');
    
    // Check if BLE is supported
    if (!('bluetooth' in navigator)) {
        console.warn('Web Bluetooth API tidak didukung');
        const connectBtn = document.getElementById('bleConnectBtn');
        if (connectBtn) {
            connectBtn.disabled = true;
            connectBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Bluetooth tidak didukung</span>';
        }
        updateBLEStatus('error', 'Web Bluetooth tidak didukung di browser ini');
        return;
    }
    
    // Check if running on HTTPS or localhost (required for Web Bluetooth)
    const isSecure = window.location.protocol === 'https:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';
    
    if (!isSecure) {
        console.warn('Web Bluetooth memerlukan HTTPS atau localhost');
        const connectBtn = document.getElementById('bleConnectBtn');
        if (connectBtn) {
            connectBtn.disabled = true;
            connectBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i><span>Perlu HTTPS</span>';
        }
        updateBLEStatus('error', 'Web Bluetooth memerlukan HTTPS atau localhost');
        return;
    }
    
    console.log('Web Bluetooth API didukung, mencari tombol connect...');
    
    // Wait a bit to ensure DOM is ready
    setTimeout(() => {
        const connectBtn = document.getElementById('bleConnectBtn');
        const disconnectBtn = document.getElementById('bleDisconnectBtn');
        
        console.log('Connect button found:', !!connectBtn);
        console.log('Disconnect button found:', !!disconnectBtn);
        
        if (connectBtn) {
            // Remove any existing listeners to prevent duplicates
            const newConnectBtn = connectBtn.cloneNode(true);
            connectBtn.parentNode.replaceChild(newConnectBtn, connectBtn);
            
            // Add click event listener
            newConnectBtn.addEventListener('click', async () => {
                console.log('Connect button clicked!');
                
                // Disable button saat connecting
                newConnectBtn.disabled = true;
                const originalText = newConnectBtn.innerHTML;
                newConnectBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Menghubungkan...</span>';
                
                // Update status
                updateBLEStatus('connecting', 'Mencari perangkat...');
                
                try {
                    // Connect to device - ini akan MEMBUKA DIALOG PEMILIHAN PERANGKAT
                    // Mengikuti pola sederhana dari contoh Web Bluetooth API
                    console.log('Calling connectToBLEDevice()...');
                    await connectToBLEDevice();
                    
                    console.log('BLE device connected successfully');
                    useBLEData = true;
                    updateMonitoringInfo('Data real-time dari perangkat ESP32-C3');
                    updateBLEStatus('connected', 'Terhubung ke perangkat');
                    
                } catch (error) {
                    console.error('Connection error:', error);
                    console.error('Error name:', error.name);
                    console.error('Error message:', error.message);
                    
                    // Re-enable button
                    newConnectBtn.disabled = false;
                    newConnectBtn.innerHTML = originalText;
                    
                    // Update status
                    updateBLEStatus('error', 'Gagal menghubungkan');
                    
                    // Show user-friendly error message in modal
                    let errorMessage = 'Failed to connect to device.';
                    let errorTitle = 'Connection Error';
                    let checklistItems = [];
                    
                    if (error.name === 'NotFoundError') {
                        errorTitle = 'Device Not Found';
                        errorMessage = 'The device could not be found.';
                        checklistItems = [
                            'ESP32-C3 is powered on',
                            'Device is within Bluetooth range',
                            'Device is sending advertising'
                        ];
                    } else if (error.name === 'SecurityError') {
                        errorTitle = 'Bluetooth Permission Denied';
                        errorMessage = 'Bluetooth access was denied.';
                        checklistItems = [
                            'Please allow Bluetooth access in your browser',
                            'Check browser permissions settings'
                        ];
                    } else if (error.name === 'NetworkError') {
                        errorTitle = 'Connection Failed';
                        errorMessage = 'Failed to connect to the device.';
                        checklistItems = [
                            'Try disconnecting and reconnecting',
                            'Check if device is still in range'
                        ];
                    } else if (error.message) {
                        errorMessage = error.message;
                    }
                    
                    showModal(errorTitle, errorMessage, checklistItems);
                }
            });
            
            console.log('Connect button event listener attached');
        } else {
            console.error('Connect button not found!');
        }
        
        if (disconnectBtn) {
            // Remove any existing listeners to prevent duplicates
            const newDisconnectBtn = disconnectBtn.cloneNode(true);
            disconnectBtn.parentNode.replaceChild(newDisconnectBtn, disconnectBtn);
            
            newDisconnectBtn.addEventListener('click', async () => {
                console.log('Disconnect button clicked');
                await disconnectBLEDevice();
            });
            
            console.log('Disconnect button event listener attached');
        }
        
        // Mark as initialized
        isBLEConnectionInitialized = true;
    }, 200); // Wait 200ms to ensure DOM is ready
    
    // Listen for BLE status changes (if using old BLEConnection module)
    document.addEventListener('bleStatusChange', (event) => {
        const { status, message } = event.detail;
        updateBLEStatus(status, message);
        
        // Re-enable connect button jika disconnected
        if (status === 'disconnected' || status === 'error') {
            const connectBtn = document.getElementById('bleConnectBtn');
            if (connectBtn) {
                connectBtn.disabled = false;
                connectBtn.innerHTML = '<i class="fas fa-link"></i><span>Hubungkan</span>';
            }
        }
    });
}

/**
 * Connect to BLE device - Mengikuti pola sederhana dari contoh Web Bluetooth API
 */
let bleDevice = null;
let bleServer = null;
let bleService = null;
let bleCharacteristics = {};

async function connectToBLEDevice() {
    const BLE_SERVICE_UUID = '12345678-1234-1234-1234-123456789abc';
    const BLE_CHAR_BPM = '12345678-1234-1234-1234-123456789ab1';
    const BLE_CHAR_TEMP = '12345678-1234-1234-1234-123456789ab2';
    const BLE_CHAR_GSR = '12345678-1234-1234-1234-123456789ab3';
    const BLE_CHAR_MOTION = '12345678-1234-1234-1234-123456789ab4';
    const BLE_CHAR_SPO2 = '12345678-1234-1234-1234-123456789ab6';  // SpO2 Characteristic
    const BLE_CHAR_ALL_DATA = '12345678-1234-1234-1234-123456789ab5';
    
    try {
        // Check if Web Bluetooth is supported
        if (!('bluetooth' in navigator)) {
            throw new Error('Web Bluetooth API tidak didukung di browser ini. Gunakan Chrome, Edge, atau browser yang mendukung Web Bluetooth API.');
        }
        
        // Check if running on HTTPS or localhost (required for Web Bluetooth)
        const isSecure = window.location.protocol === 'https:' || 
                         window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
        
        if (!isSecure) {
            throw new Error('Web Bluetooth memerlukan HTTPS atau localhost. Saat ini menggunakan: ' + window.location.protocol);
        }
        
        // Request device - ini akan MEMBUKA DIALOG PEMILIHAN PERANGKAT
        // Dialog akan muncul OTOMATIS tanpa perlu buka Settings > Bluetooth dulu
        console.log('Requesting BLE device...');
        console.log('Dialog pemilihan perangkat akan muncul otomatis...');
        console.log('Service UUID:', BLE_SERVICE_UUID);
        console.log('Protocol:', window.location.protocol);
        console.log('Hostname:', window.location.hostname);
        
        // Try with service filter first, if no device found, try acceptAllDevices
        try {
            bleDevice = await navigator.bluetooth.requestDevice({
                // Filter berdasarkan service UUID - device dengan service ini akan muncul
                filters: [{
                    services: [BLE_SERVICE_UUID]
                }],
                // Optional services untuk memastikan service bisa diakses
                optionalServices: [BLE_SERVICE_UUID]
            });
            console.log('Device found with service filter');
        } catch (filterError) {
            // If filter doesn't find device, try acceptAllDevices (shows all nearby BLE devices)
            console.log('Service filter tidak menemukan device, mencoba acceptAllDevices...');
            console.log('Filter error:', filterError);
            
            bleDevice = await navigator.bluetooth.requestDevice({
                // Accept all devices - akan menampilkan semua perangkat BLE di sekitar
                acceptAllDevices: true,
                // Optional services untuk memastikan service bisa diakses
                optionalServices: [BLE_SERVICE_UUID]
            });
            console.log('Device found with acceptAllDevices');
        }
        
        console.log('Device selected:', bleDevice.name || 'Unknown');
        
        // Listen for disconnection
        bleDevice.addEventListener('gattserverdisconnected', () => {
            console.log('Device disconnected');
            handleBLEDisconnect();
        });
        
        // Connect to GATT server
        console.log('Connecting to GATT server...');
        bleServer = await bleDevice.gatt.connect();
        console.log('GATT server connected');
        
        // Get service
        console.log('Getting service...');
        bleService = await bleServer.getPrimaryService(BLE_SERVICE_UUID);
        console.log('Service obtained');
        
        // Get characteristics dengan error handling untuk setiap characteristic
        // Beberapa characteristics mungkin tidak tersedia di versi firmware lama
        console.log('Getting characteristics...');
        
        try {
            bleCharacteristics.bpm = await bleService.getCharacteristic(BLE_CHAR_BPM);
            console.log('BPM characteristic obtained');
        } catch (err) {
            console.warn('BPM characteristic not found:', err);
        }
        
        try {
            bleCharacteristics.temp = await bleService.getCharacteristic(BLE_CHAR_TEMP);
            console.log('Temperature characteristic obtained');
        } catch (err) {
            console.warn('Temperature characteristic not found:', err);
        }
        
        try {
            bleCharacteristics.gsr = await bleService.getCharacteristic(BLE_CHAR_GSR);
            console.log('GSR characteristic obtained');
        } catch (err) {
            console.warn('GSR characteristic not found:', err);
        }
        
        try {
            bleCharacteristics.motion = await bleService.getCharacteristic(BLE_CHAR_MOTION);
            console.log('Motion characteristic obtained');
        } catch (err) {
            console.warn('Motion characteristic not found:', err);
        }
        
        try {
            bleCharacteristics.spo2 = await bleService.getCharacteristic(BLE_CHAR_SPO2);
            console.log('SpO2 characteristic obtained');
        } catch (err) {
            console.warn('SpO2 characteristic not found (may not be available in older firmware):', err);
        }
        
        try {
            bleCharacteristics.allData = await bleService.getCharacteristic(BLE_CHAR_ALL_DATA);
            console.log('All Data characteristic obtained');
        } catch (err) {
            console.warn('All Data characteristic not found (will use individual characteristics):', err);
        }
        
        console.log('Characteristics setup completed');
        
        // Start notifications for all characteristics
        // Gunakan error handling untuk setiap characteristic
        // Jika salah satu gagal, kita masih bisa menggunakan yang lain
        console.log('Starting notifications...');
        
        // All Data notifications (JSON) - PRIORITAS UTAMA
        // Gunakan ini karena lebih efisien dan reliable
        // Hanya gunakan jika characteristic tersedia
        if (bleCharacteristics.allData) {
            try {
                await bleCharacteristics.allData.startNotifications();
                bleCharacteristics.allData.addEventListener('characteristicvaluechanged', (e) => {
                    const decoder = new TextDecoder('utf-8');
                    const jsonStr = decoder.decode(e.target.value);
                    try {
                        const data = JSON.parse(jsonStr);
                        if (data.bpm !== undefined) lastBLEData.bpm = data.bpm;
                        if (data.temp !== undefined) lastBLEData.temp = data.temp;
                        if (data.gsr !== undefined) {
                            lastBLEData.gsr = data.gsr;
                            // Hitung Human Resistance di web app dari raw GSR
                            lastBLEData.humanResistance = calculateHumanResistance(data.gsr);
                        }
                        if (data.spo2 !== undefined) lastBLEData.spo2 = data.spo2;  // SpO2 dari ESP32-C3
                        if (data.ir !== undefined) lastBLEData.ir = data.ir;
                        if (data.ax !== undefined) lastBLEData.motion.ax = data.ax;
                        if (data.ay !== undefined) lastBLEData.motion.ay = data.ay;
                        if (data.az !== undefined) lastBLEData.motion.az = data.az;
                        updateRealtimeData();
                    } catch (error) {
                        console.error('Error parsing JSON data:', error);
                    }
                });
                console.log('All Data notifications started');
            } catch (error) {
                console.warn('Could not start All Data notifications:', error);
            }
        } else {
            console.log('All Data characteristic not available, using individual characteristics');
        }
        
        // Fallback ke individual characteristics jika All Data tidak tersedia
        // Atau gunakan sebagai backup jika All Data gagal
        if (!bleCharacteristics.allData || true) {  // Selalu setup individual sebagai backup
            // Setup individual characteristics (sebagai backup atau jika All Data tidak tersedia)
            if (bleCharacteristics.bpm) {
                try {
                    await bleCharacteristics.bpm.startNotifications();
                    bleCharacteristics.bpm.addEventListener('characteristicvaluechanged', (e) => {
                        const decoder = new TextDecoder('utf-8');
                        const value = parseFloat(decoder.decode(e.target.value));
                        if (!isNaN(value) && value > 0) {
                            lastBLEData.bpm = value;
                            updateRealtimeData();
                        }
                    });
                    console.log('BPM notifications started');
                } catch (err) {
                    console.warn('Could not start BPM notifications:', err);
                }
            }
            
            if (bleCharacteristics.temp) {
                try {
                    await bleCharacteristics.temp.startNotifications();
                    bleCharacteristics.temp.addEventListener('characteristicvaluechanged', (e) => {
                        const decoder = new TextDecoder('utf-8');
                        const value = parseFloat(decoder.decode(e.target.value));
                        if (!isNaN(value) && value > 0) {
                            lastBLEData.temp = value;
                            updateRealtimeData();
                        }
                    });
                    console.log('Temperature notifications started');
                } catch (err) {
                    console.warn('Could not start Temperature notifications:', err);
                }
            }
            
            if (bleCharacteristics.gsr) {
                try {
                    await bleCharacteristics.gsr.startNotifications();
                    bleCharacteristics.gsr.addEventListener('characteristicvaluechanged', (e) => {
                        const decoder = new TextDecoder('utf-8');
                        // ESP32-C3 mengirim raw GSR value, web app akan menghitung Human Resistance
                        const gsrValue = parseInt(decoder.decode(e.target.value));
                        if (!isNaN(gsrValue) && gsrValue >= 0) {
                            lastBLEData.gsr = gsrValue;
                            // Hitung Human Resistance di web app
                            lastBLEData.humanResistance = calculateHumanResistance(gsrValue);
                            updateRealtimeData();
                        }
                    });
                    console.log('GSR (Human Resistance) notifications started');
                } catch (err) {
                    console.warn('Could not start GSR notifications:', err);
                }
            }
            
            if (bleCharacteristics.spo2) {
                try {
                    // Cek apakah characteristic support notifications
                    // Beberapa device mungkin tidak support notifications untuk semua characteristics
                    const properties = bleCharacteristics.spo2.properties;
                    if (properties.notify || properties.indicate) {
                        await bleCharacteristics.spo2.startNotifications();
                        bleCharacteristics.spo2.addEventListener('characteristicvaluechanged', (e) => {
                            const decoder = new TextDecoder('utf-8');
                            const value = parseFloat(decoder.decode(e.target.value));
                            if (!isNaN(value) && value > 0) {
                                lastBLEData.spo2 = value;
                                updateRealtimeData();
                            }
                        });
                        console.log('SpO2 notifications started');
                    } else {
                        // Jika tidak support notifications, gunakan polling
                        console.log('SpO2 does not support notifications, will use polling');
                        if (spo2PollingInterval) clearInterval(spo2PollingInterval);
                        spo2PollingInterval = setInterval(async () => {
                            try {
                                if (bleCharacteristics.spo2 && bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
                                    const spo2Value = await bleCharacteristics.spo2.readValue();
                                    const decoder = new TextDecoder('utf-8');
                                    const value = parseFloat(decoder.decode(spo2Value));
                                    if (!isNaN(value) && value > 0) {
                                        lastBLEData.spo2 = value;
                                        updateRealtimeData();
                                    }
                                }
                            } catch (pollErr) {
                                // Silent fail untuk polling
                            }
                        }, 2000); // Poll setiap 2 detik
                    }
                } catch (err) {
                    console.warn('Could not start SpO2 notifications, will use polling:', err);
                    // Fallback ke polling jika notifications gagal
                    if (spo2PollingInterval) clearInterval(spo2PollingInterval);
                    spo2PollingInterval = setInterval(async () => {
                        try {
                            if (bleCharacteristics.spo2 && bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
                                const spo2Value = await bleCharacteristics.spo2.readValue();
                                const decoder = new TextDecoder('utf-8');
                                const value = parseFloat(decoder.decode(spo2Value));
                                if (!isNaN(value) && value > 0) {
                                    lastBLEData.spo2 = value;
                                    updateRealtimeData();
                                }
                            }
                        } catch (pollErr) {
                            // Silent fail untuk polling
                        }
                    }, 2000); // Poll setiap 2 detik
                }
            }
            
            if (bleCharacteristics.motion) {
                try {
                    await bleCharacteristics.motion.startNotifications();
                    bleCharacteristics.motion.addEventListener('characteristicvaluechanged', (e) => {
                        const decoder = new TextDecoder('utf-8');
                        const motionStr = decoder.decode(e.target.value);
                        const parts = motionStr.split(',');
                        if (parts.length === 3) {
                            const ax = parseFloat(parts[0]);
                            const ay = parseFloat(parts[1]);
                            const az = parseFloat(parts[2]);
                            if (!isNaN(ax) && !isNaN(ay) && !isNaN(az)) {
                                lastBLEData.motion = { ax, ay, az };
                                updateRealtimeData();
                            }
                        }
                    });
                    console.log('Motion notifications started');
                } catch (err) {
                    console.warn('Could not start Motion notifications:', err);
                }
            }
        }
        
        console.log('Notifications setup completed');
        
        // Update UI
        updateBLEStatus('connected', 'Terhubung ke ' + (bleDevice.name || 'Perangkat BLE'));
        updateMonitoringInfo('Data real-time dari perangkat ESP32-C3');
        
        // Read initial values dan setup polling sebagai fallback
        // Jika notifications tidak bekerja, kita akan polling setiap 1 detik
        let notificationWorking = false;
        
        // Coba baca All Data terlebih dahulu (jika tersedia)
        if (bleCharacteristics.allData) {
            try {
                const allDataValue = await bleCharacteristics.allData.readValue();
                const decoder = new TextDecoder('utf-8');
                const jsonStr = decoder.decode(allDataValue);
                const data = JSON.parse(jsonStr);
                if (data.bpm !== undefined) lastBLEData.bpm = data.bpm;
                if (data.temp !== undefined) lastBLEData.temp = data.temp;
                if (data.gsr !== undefined) lastBLEData.gsr = data.gsr;
                if (data.humanResistance !== undefined) lastBLEData.humanResistance = data.humanResistance;  // Human Resistance dari ESP32-C3
                if (data.spo2 !== undefined) lastBLEData.spo2 = data.spo2;
                if (data.ir !== undefined) lastBLEData.ir = data.ir;
                if (data.ax !== undefined) lastBLEData.motion.ax = data.ax;
                if (data.ay !== undefined) lastBLEData.motion.ay = data.ay;
                if (data.az !== undefined) lastBLEData.motion.az = data.az;
                notificationWorking = true;
                console.log('Initial data read successfully from All Data');
            } catch (error) {
                console.warn('Could not read All Data, trying individual characteristics:', error);
            }
        }
        
        // Fallback: baca individual characteristics jika All Data tidak tersedia atau gagal
        if (!notificationWorking) {
            try {
                if (bleCharacteristics.bpm) {
                    try {
                        const bpmValue = await bleCharacteristics.bpm.readValue();
                        const decoder = new TextDecoder('utf-8');
                        const bpm = parseFloat(decoder.decode(bpmValue));
                        if (!isNaN(bpm) && bpm > 0) lastBLEData.bpm = bpm;
                    } catch (err) {
                        console.warn('Could not read BPM initial value:', err);
                    }
                }
                
                if (bleCharacteristics.temp) {
                    try {
                        const tempValue = await bleCharacteristics.temp.readValue();
                        const decoder = new TextDecoder('utf-8');
                        const temp = parseFloat(decoder.decode(tempValue));
                        if (!isNaN(temp) && temp > 0) lastBLEData.temp = temp;
                    } catch (err) {
                        console.warn('Could not read Temperature initial value:', err);
                    }
                }
                
                if (bleCharacteristics.gsr) {
                    try {
                        const gsrValueBuffer = await bleCharacteristics.gsr.readValue();
                        const decoder = new TextDecoder('utf-8');
                        // ESP32-C3 mengirim raw GSR value, web app akan menghitung Human Resistance
                        const gsrValue = parseInt(decoder.decode(gsrValueBuffer));
                        if (!isNaN(gsrValue) && gsrValue >= 0) {
                            lastBLEData.gsr = gsrValue;
                            // Hitung Human Resistance di web app
                            lastBLEData.humanResistance = calculateHumanResistance(gsrValue);
                        }
                    } catch (err) {
                        console.warn('Could not read GSR initial value:', err);
                    }
                }
                
                if (bleCharacteristics.spo2) {
                    try {
                        const spo2Value = await bleCharacteristics.spo2.readValue();
                        const decoder = new TextDecoder('utf-8');
                        const spo2 = parseFloat(decoder.decode(spo2Value));
                        if (!isNaN(spo2) && spo2 > 0) lastBLEData.spo2 = spo2;
                    } catch (err) {
                        console.warn('Could not read SpO2 initial value:', err);
                    }
                }
                
                notificationWorking = true;
                console.log('Initial data read from individual characteristics');
            } catch (err) {
                console.warn('Could not read initial values:', err);
            }
        }
        
        updateRealtimeData();
        
    } catch (error) {
        console.error('Error connecting to device:', error);
        throw error;
    }
}

/**
 * Handle BLE disconnection
 */
function handleBLEDisconnect() {
    useBLEData = false;
    
    // Clear polling intervals
    if (spo2PollingInterval) {
        clearInterval(spo2PollingInterval);
        spo2PollingInterval = null;
    }
    
    bleDevice = null;
    bleServer = null;
    bleService = null;
    bleCharacteristics = {};
    
    // Reset values
    resetAllValuesToPlaceholder();
    
    // Update UI
    updateBLEStatus('disconnected', 'Terputus dari perangkat');
    updateMonitoringInfo('Hubungkan perangkat untuk melihat data real-time');
    
    // Re-enable connect button
    const connectBtn = document.getElementById('bleConnectBtn');
    if (connectBtn) {
        connectBtn.disabled = false;
        connectBtn.innerHTML = '<i class="fas fa-link"></i><span>Hubungkan</span>';
    }
}

/**
 * Disconnect from BLE device
 */
async function disconnectBLEDevice() {
    try {
        if (bleCharacteristics.bpm) await bleCharacteristics.bpm.stopNotifications();
        if (bleCharacteristics.temp) await bleCharacteristics.temp.stopNotifications();
        if (bleCharacteristics.gsr) await bleCharacteristics.gsr.stopNotifications();
        if (bleCharacteristics.motion) await bleCharacteristics.motion.stopNotifications();
        if (bleCharacteristics.spo2) await bleCharacteristics.spo2.stopNotifications();
        if (bleCharacteristics.allData) await bleCharacteristics.allData.stopNotifications();
        
        if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
            await bleDevice.gatt.disconnect();
        }
    } catch (error) {
        console.error('Error disconnecting:', error);
    } finally {
        handleBLEDisconnect();
    }
}

/**
 * Update BLE connection status UI
 * Mengikuti pola dari WebBluetoothCG heart-rate-sensor demo
 */
function updateBLEStatus(status, message) {
    const statusIcon = document.getElementById('bleStatusIcon');
    const statusLabel = document.getElementById('bleStatusLabel');
    const statusMessage = document.getElementById('bleStatusMessage');
    const connectBtn = document.getElementById('bleConnectBtn');
    const disconnectBtn = document.getElementById('bleDisconnectBtn');
    
    // Update status label
    if (statusLabel) {
        statusLabel.textContent = message;
    }
    
    // Update status message
    if (statusMessage) {
        if (status === 'connected') {
            statusMessage.textContent = 'Data sensor sedang diterima dari perangkat...';
        } else if (status === 'connecting') {
            statusMessage.textContent = 'Menghubungkan... Pilih perangkat dari dialog yang muncul.';
        } else if (status === 'error') {
            statusMessage.textContent = 'Gagal terhubung. Klik tombol Hubungkan untuk mencoba lagi.';
        } else {
            statusMessage.textContent = 'Klik tombol Hubungkan untuk memilih perangkat dari dialog.';
        }
    }
    
    // Update icon dengan warna sesuai status
    if (statusIcon) {
        const icon = statusIcon.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-bluetooth-b';
            
            // Remove all status classes
            statusIcon.classList.remove('status-connected', 'status-connecting', 'status-error', 'status-disconnected');
            
            if (status === 'connected') {
                icon.style.color = '#10b981';
                statusIcon.style.color = '#10b981';
                statusIcon.classList.add('status-connected');
            } else if (status === 'connecting') {
                icon.style.color = '#f59e0b';
                statusIcon.style.color = '#f59e0b';
                statusIcon.classList.add('status-connecting');
            } else if (status === 'error') {
                icon.style.color = '#ef4444';
                statusIcon.style.color = '#ef4444';
                statusIcon.classList.add('status-error');
            } else {
                icon.style.color = '#64748b';
                statusIcon.style.color = '#64748b';
                statusIcon.classList.add('status-disconnected');
            }
        }
    }
    
    // Update buttons visibility
    if (connectBtn && disconnectBtn) {
        if (status === 'connected') {
            connectBtn.style.display = 'none';
            disconnectBtn.style.display = 'inline-flex';
            connectBtn.disabled = false;
            connectBtn.innerHTML = '<i class="fas fa-link"></i><span>Hubungkan</span>';
        } else {
            connectBtn.style.display = 'inline-flex';
            disconnectBtn.style.display = 'none';
            // Button akan di-enable oleh error handler jika ada error
        }
    }
}

/**
 * Update monitoring info text
 */
function updateMonitoringInfo(text) {
    const infoText = document.getElementById('monitoringInfoText');
    if (infoText) {
        infoText.textContent = text;
    }
}

/**
 * Reset all sensor values to placeholder "--"
 */
function resetAllValuesToPlaceholder() {
    // Reset real-time monitoring values
    updateValueWithPlaceholder('realtimeHR', '--');
    updateValueWithPlaceholder('realtimeSpO2', '--');
    updateValueWithPlaceholder('realtimeGSR', '--');
    updateValueWithPlaceholder('realtimeTemp', '--');
    updateValueWithPlaceholder('overallHealthScore', '--');
    
    // Reset status indicators
    updateStatusIndicator('realtimeHRStatus', '--');
    updateStatusIndicator('realtimeGSRStatus', '--');
    updateStatusIndicator('realtimeTempStatus', '--');
    
    // Redraw health score ring
    drawHealthScoreRing();
}

/**
 * Calculate mental health indicators from real-time sensor data
 * Uses actual sensor readings: BPM, SpO2, GSR (Human Resistance), Temperature, Motion
 */
function calculateMentalHealthFromRealtimeData(data) {
    if (!data || (!data.heartRate && !data.gsr && !data.spo2 && !data.temperature && !data.motion)) {
        return null;
    }
    
    const bpm = data.heartRate || 0;
    const spo2 = data.spo2 || 0;
    const gsr = data.humanResistance || (data.gsr >= 0 ? calculateHumanResistance(data.gsr) : 0);
    const temp = data.temperature || 0;
    const motion = data.motion || { ax: 0, ay: 0, az: 0 };
    
    // Calculate motion magnitude
    const motionMagnitude = Math.sqrt(
        Math.pow(motion.ax || 0, 2) + 
        Math.pow(motion.ay || 0, 2) + 
        Math.pow(motion.az || 0, 2)
    );
    
    // Calculate HRV (Heart Rate Variability) from recent history
    // HRV is calculated from RR intervals (time between heartbeats)
    // We'll use BPM variability as a proxy for HRV
    let hrv = 0;
    if (dataHistory.heartRate.length >= 5) {
        const recentHR = dataHistory.heartRate.slice(-20).map(d => d.value); // Use last 20 data points
        if (recentHR.length > 1) {
            // Calculate standard deviation of BPM as HRV proxy
            const avgHR = recentHR.reduce((sum, val) => sum + val, 0) / recentHR.length;
            const variance = recentHR.reduce((sum, val) => sum + Math.pow(val - avgHR, 2), 0) / recentHR.length;
            hrv = Math.sqrt(variance); // Standard deviation as HRV proxy (in BPM units)
        }
    } else if (bpm > 0) {
        // If not enough history, use current BPM deviation from normal (60-100) as proxy
        if (bpm >= 60 && bpm <= 100) {
            hrv = 5; // Assume normal HRV for normal BPM range
        } else {
            hrv = Math.abs(bpm - 80) / 10; // Rough estimate based on deviation from center
        }
    }
    
    // 1. ANXIETY LEVEL (0-100)
    // Factors: High GSR (low resistance = high stress), High BPM, High Motion, Low SpO2
    let anxietyScore = 0;
    let anxietyFactors = 0;
    
    // GSR factor (lower resistance = higher anxiety) - normalize 0-2000 ohm range
    if (gsr > 0) {
        const gsrFactor = Math.min(100, Math.max(0, ((2000 - gsr) / 2000) * 100));
        anxietyScore += gsrFactor * 0.35; // 35% weight
        anxietyFactors++;
    }
    
    // BPM factor (higher BPM = higher anxiety) - normal range 60-100
    if (bpm > 0) {
        let bpmFactor = 0;
        if (bpm > 100) {
            bpmFactor = Math.min(100, ((bpm - 100) / 40) * 100); // 100-140 bpm range
        } else if (bpm < 60) {
            bpmFactor = Math.min(100, ((60 - bpm) / 20) * 100); // 40-60 bpm range (can indicate stress)
        }
        anxietyScore += bpmFactor * 0.25; // 25% weight
        anxietyFactors++;
    }
    
    // Motion factor (higher motion = higher anxiety)
    if (motionMagnitude > 0) {
        const motionFactor = Math.min(100, (motionMagnitude / 3.0) * 100); // Normalize to 3g max
        anxietyScore += motionFactor * 0.25; // 25% weight
        anxietyFactors++;
    }
    
    // SpO2 factor (lower SpO2 = higher anxiety)
    if (spo2 > 0) {
        const spo2Factor = spo2 < 95 ? Math.min(100, ((95 - spo2) / 25) * 100) : 0; // Below 95%
        anxietyScore += spo2Factor * 0.15; // 15% weight
        anxietyFactors++;
    }
    
    const anxiety = anxietyFactors > 0 ? Math.min(100, Math.max(0, anxietyScore)) : 25;
    
    // 2. STRESS RESILIENCE (0-100) - Inverse of stress
    // Factors: Low GSR (high resistance = low stress), Normal BPM, Normal SpO2, Low Motion
    let stressScore = 0;
    let stressFactors = 0;
    
    // GSR factor (higher resistance = lower stress = higher resilience)
    if (gsr > 0) {
        const gsrResilience = Math.min(100, Math.max(0, (gsr / 2000) * 100));
        stressScore += gsrResilience * 0.35; // 35% weight
        stressFactors++;
    }
    
    // BPM factor (normal BPM = higher resilience) - optimal 60-100
    if (bpm > 0) {
        let bpmResilience = 0;
        if (bpm >= 60 && bpm <= 100) {
            bpmResilience = 100; // Optimal range
        } else if (bpm > 100) {
            bpmResilience = Math.max(0, 100 - ((bpm - 100) / 40) * 100);
        } else {
            bpmResilience = Math.max(0, (bpm / 60) * 100);
        }
        stressScore += bpmResilience * 0.30; // 30% weight
        stressFactors++;
    }
    
    // SpO2 factor (normal SpO2 = higher resilience)
    if (spo2 > 0) {
        const spo2Resilience = spo2 >= 95 ? 100 : Math.max(0, (spo2 / 95) * 100);
        stressScore += spo2Resilience * 0.20; // 20% weight
        stressFactors++;
    }
    
    // Motion factor (low motion = higher resilience)
    if (motionMagnitude > 0) {
        const motionResilience = Math.max(0, 100 - Math.min(100, (motionMagnitude / 3.0) * 100));
        stressScore += motionResilience * 0.15; // 15% weight
        stressFactors++;
    }
    
    const stressResilience = stressFactors > 0 ? Math.min(100, Math.max(0, stressScore)) : 85;
    
    // 3. MOOD STABILITY (0-100)
    // Based on HRV (Heart Rate Variability) - moderate HRV = stable mood
    // Too low HRV = rigid/stressed, Too high HRV = unstable
    let moodStability = 70; // Default
    if (hrv > 0) {
        const optimalHRV = 5; // Optimal HRV around 5 bpm
        const hrvDeviation = Math.abs(hrv - optimalHRV);
        moodStability = Math.max(0, Math.min(100, 100 - (hrvDeviation * 8))); // Penalty for deviation
    } else if (bpm > 0) {
        // Fallback: use BPM consistency from history
        if (dataHistory.heartRate.length >= 5) {
            const recentHR = dataHistory.heartRate.slice(-10).map(d => d.value);
            const avgHR = recentHR.reduce((sum, val) => sum + val, 0) / recentHR.length;
            const consistency = recentHR.filter(hr => Math.abs(hr - avgHR) < 5).length / recentHR.length;
            moodStability = Math.max(0, Math.min(100, consistency * 100));
        }
    }
    
    // 4. DEPRESSION RISK (0-100)
    // Factors: High GSR (low resistance), Low BPM, Low Motion, Low SpO2, Low HRV
    let depressionScore = 0;
    let depressionFactors = 0;
    
    // GSR factor (low resistance = high stress = higher depression risk)
    if (gsr > 0) {
        const gsrRisk = Math.min(100, Math.max(0, ((2000 - gsr) / 2000) * 100));
        depressionScore += gsrRisk * 0.30; // 30% weight
        depressionFactors++;
    }
    
    // BPM factor (low BPM = higher depression risk)
    if (bpm > 0) {
        const bpmRisk = bpm < 60 ? Math.min(100, ((60 - bpm) / 30) * 100) : 0;
        depressionScore += bpmRisk * 0.25; // 25% weight
        depressionFactors++;
    }
    
    // Motion factor (low motion = higher depression risk)
    if (motionMagnitude > 0) {
        const motionRisk = motionMagnitude < 0.5 ? 50 : Math.max(0, 50 - (motionMagnitude / 3.0) * 50);
        depressionScore += motionRisk * 0.20; // 20% weight
        depressionFactors++;
    }
    
    // SpO2 factor (low SpO2 = higher depression risk)
    if (spo2 > 0) {
        const spo2Risk = spo2 < 95 ? Math.min(100, ((95 - spo2) / 25) * 100) : 0;
        depressionScore += spo2Risk * 0.15; // 15% weight
        depressionFactors++;
    }
    
    // HRV factor (low HRV = higher depression risk)
    if (hrv > 0) {
        const hrvRisk = hrv < 3 ? Math.min(100, ((3 - hrv) / 3) * 100) : 0;
        depressionScore += hrvRisk * 0.10; // 10% weight
        depressionFactors++;
    }
    
    const depressionRisk = depressionFactors > 0 ? Math.min(100, Math.max(0, depressionScore)) : 15;
    
    return {
        anxiety: Math.round(anxiety),
        stress: Math.round(stressResilience),
        mood: Math.round(moodStability),
        depression: Math.round(depressionRisk)
    };
}

/**
 * Update mental health indicators from recordings data (for historical analysis)
 */
async function updateMentalHealthIndicators(recordings) {
    // First, try to use real-time data if available
    if (useBLEData && lastBLEData) {
        const realtimeData = {
            heartRate: lastBLEData.bpm > 0 ? lastBLEData.bpm : null,
            spo2: lastBLEData.spo2 > 0 ? lastBLEData.spo2 : null,
            gsr: lastBLEData.gsr >= 0 ? lastBLEData.gsr : null,
            humanResistance: lastBLEData.humanResistance > 0 ? lastBLEData.humanResistance : null,
            temperature: lastBLEData.temp > 0 ? lastBLEData.temp : null,
            motion: lastBLEData.motion || null
        };
        
        const realtimeIndicators = calculateMentalHealthFromRealtimeData(realtimeData);
        if (realtimeIndicators) {
            drawMentalHealthGauge(realtimeIndicators);
            updateMentalHealthLegend(realtimeIndicators);
            return;
        }
    }
    
    // Fallback to recordings data if no real-time data
    if (!recordings || recordings.length === 0) {
        // Use default values if no data
        drawMentalHealthGauge({
            anxiety: 25,
            stress: 85,
            mood: 70,
            depression: 15
        });
        return;
    }
    
    // Calculate mental health indicators from recordings
    const validRecordings = recordings.filter(r => r.statistics);
    
    // Calculate average GSR (higher = more stress/anxiety)
    const avgGSR = validRecordings.length > 0
        ? validRecordings.reduce((sum, r) => sum + (r.statistics.avgGSR || 0), 0) / validRecordings.length
        : 0;
    
    // Calculate average BPM variability (higher variability = better mood stability)
    const bpmValues = validRecordings.map(r => r.statistics?.avgBPM || 0).filter(bpm => bpm > 0);
    let bpmVariability = 0;
    if (bpmValues.length > 1) {
        const avgBPM = bpmValues.reduce((sum, bpm) => sum + bpm, 0) / bpmValues.length;
        const variance = bpmValues.reduce((sum, bpm) => sum + Math.pow(bpm - avgBPM, 2), 0) / bpmValues.length;
        bpmVariability = Math.sqrt(variance);
    }
    
    // Anxiety Level: Based on GSR (higher GSR = higher anxiety)
    // Normalize GSR to 0-100 (assuming max GSR around 200)
    const anxiety = Math.min(100, Math.max(0, (avgGSR / 200) * 100));
    
    // Stress Resilience: Inverse of stress level (lower stress = higher resilience)
    // Based on GSR and BPM (lower values = better resilience)
    const stressLevel = Math.min(100, Math.max(0, (avgGSR / 200) * 100));
    const stressResilience = Math.max(0, 100 - stressLevel);
    
    // Mood Stability: Based on BPM variability (moderate variability = stable mood)
    // Too low or too high variability = unstable mood
    const optimalVariability = 5; // Optimal BPM variability
    const moodStability = Math.max(0, Math.min(100, 100 - Math.abs(bpmVariability - optimalVariability) * 10));
    
    // Depression Risk: Based on low activity and high stress
    // Higher GSR + lower activity = higher depression risk
    const totalDuration = recordings.reduce((sum, r) => sum + (r.duration || 0), 0);
    const avgDuration = recordings.length > 0 ? totalDuration / recordings.length : 0;
    const activityLevel = Math.min(100, (avgDuration / 3600000) * 100); // Normalize to hours
    const depressionRisk = Math.min(100, Math.max(0, stressLevel - (activityLevel * 0.5)));
    
    // Update gauge with calculated values
    drawMentalHealthGauge({
        anxiety: Math.round(anxiety),
        stress: Math.round(stressResilience),
        mood: Math.round(moodStability),
        depression: Math.round(depressionRisk)
    });
    
    // Update legend values
    updateMentalHealthLegend({
        anxiety: Math.round(anxiety),
        stress: Math.round(stressResilience),
        mood: Math.round(moodStability),
        depression: Math.round(depressionRisk)
    });
}

/**
 * Update mental health legend with real values
 */
function updateMentalHealthLegend(values) {
    // Check if values are null/undefined (no data)
    const hasNoData = !values || (values.anxiety === null && values.stress === null && values.mood === null && values.depression === null);
    
    // Update Anxiety Level
    const anxietyValueEl = document.querySelector('.legend-item:nth-of-type(1) .legend-value');
    if (anxietyValueEl) {
        if (hasNoData || values.anxiety === null || values.anxiety === undefined) {
            anxietyValueEl.textContent = '--';
        } else {
            let anxietyLabel = 'Low';
            if (values.anxiety >= 70) anxietyLabel = 'High';
            else if (values.anxiety >= 40) anxietyLabel = 'Medium';
            anxietyValueEl.textContent = `${values.anxiety}% - ${anxietyLabel}`;
        }
        
        const anxietyDesc = document.querySelector('.legend-item:nth-of-type(1) .legend-desc');
        if (anxietyDesc) {
            if (hasNoData || values.anxiety === null || values.anxiety === undefined) {
                anxietyDesc.textContent = 'Connect device to see anxiety level';
            } else if (values.anxiety < 30) {
                anxietyDesc.textContent = 'Anxiety level within normal range';
            } else if (values.anxiety < 60) {
                anxietyDesc.textContent = 'Moderate anxiety level, attention needed';
            } else {
                anxietyDesc.textContent = 'High anxiety level, consultation recommended';
            }
        }
    }
    
    // Update Stress Resilience
    const stressValueEl = document.querySelector('.legend-item:nth-of-type(2) .legend-value');
    if (stressValueEl) {
        if (hasNoData || values.stress === null || values.stress === undefined) {
            stressValueEl.textContent = '--';
        } else {
            let stressLabel = 'High';
            if (values.stress < 40) stressLabel = 'Low';
            else if (values.stress < 70) stressLabel = 'Medium';
            stressValueEl.textContent = `${values.stress}% - ${stressLabel}`;
        }
        
        const stressDesc = document.querySelector('.legend-item:nth-of-type(2) .legend-desc');
        if (stressDesc) {
            if (hasNoData || values.stress === null || values.stress === undefined) {
                stressDesc.textContent = 'Connect device to see stress resilience';
            } else if (values.stress >= 70) {
                stressDesc.textContent = 'Excellent resilience to stress';
            } else if (values.stress >= 40) {
                stressDesc.textContent = 'Moderate stress resilience';
            } else {
                stressDesc.textContent = 'Stress resilience needs improvement';
            }
        }
    }
    
    // Update Mood Stability
    const moodValueEl = document.querySelector('.legend-item:nth-of-type(3) .legend-value');
    if (moodValueEl) {
        if (hasNoData || values.mood === null || values.mood === undefined) {
            moodValueEl.textContent = '--';
        } else {
            let moodLabel = 'Stable';
            if (values.mood < 40) moodLabel = 'Unstable';
            else if (values.mood < 70) moodLabel = 'Moderate';
            moodValueEl.textContent = `${values.mood}% - ${moodLabel}`;
        }
        
        const moodDesc = document.querySelector('.legend-item:nth-of-type(3) .legend-desc');
        if (moodDesc) {
            if (hasNoData || values.mood === null || values.mood === undefined) {
                moodDesc.textContent = 'Connect device to see mood stability';
            } else if (values.mood >= 70) {
                moodDesc.textContent = 'Mood stability is relatively stable';
            } else if (values.mood >= 40) {
                moodDesc.textContent = 'Moderate mood stability';
            } else {
                moodDesc.textContent = 'Mood stability needs attention';
            }
        }
    }
    
    // Update Depression Risk
    const depressionValueEl = document.querySelector('.legend-item:nth-of-type(4) .legend-value');
    if (depressionValueEl) {
        if (hasNoData || values.depression === null || values.depression === undefined) {
            depressionValueEl.textContent = '--';
        } else {
            let depressionLabel = 'Low';
            if (values.depression >= 50) depressionLabel = 'High';
            else if (values.depression >= 30) depressionLabel = 'Medium';
            depressionValueEl.textContent = `${values.depression}% - ${depressionLabel}`;
        }
        
        const depressionDesc = document.querySelector('.legend-item:nth-of-type(4) .legend-desc');
        if (depressionDesc) {
            if (hasNoData || values.depression === null || values.depression === undefined) {
                depressionDesc.textContent = 'Connect device to see depression risk';
            } else if (values.depression < 30) {
                depressionDesc.textContent = 'Low depression risk';
            } else if (values.depression < 50) {
                depressionDesc.textContent = 'Moderate depression risk, attention needed';
            } else {
                depressionDesc.textContent = 'High depression risk, consultation recommended';
            }
        }
    }
}

/**
 * Draw mental health unified gauge with proportional segments
 * Each segment is proportional to its value, total always equals 100%
 */
/**
 * Reset mental health indicators to empty state
 */
function resetMentalHealthIndicators() {
    // Reset gauge to empty (no segments visible)
    const circumference = 2 * Math.PI * 85;
    
    // Set all segments to empty and hide them completely
    const anxietyCircle = document.getElementById('gauge-anxiety');
    const stressCircle = document.getElementById('gauge-stress');
    const moodCircle = document.getElementById('gauge-mood');
    const depressionCircle = document.getElementById('gauge-depression');
    
    if (anxietyCircle) {
        anxietyCircle.setAttribute('stroke-dasharray', `0 ${circumference}`);
        anxietyCircle.setAttribute('stroke-dashoffset', '0');
        anxietyCircle.removeAttribute('stroke-linecap'); // Remove round cap to avoid dots
        anxietyCircle.style.opacity = '0'; // Hide completely
        anxietyCircle.style.display = 'none'; // Hide completely
    }
    if (stressCircle) {
        stressCircle.setAttribute('stroke-dasharray', `0 ${circumference}`);
        stressCircle.setAttribute('stroke-dashoffset', '0');
        stressCircle.removeAttribute('stroke-linecap'); // Remove round cap to avoid dots
        stressCircle.style.opacity = '0'; // Hide completely
        stressCircle.style.display = 'none'; // Hide completely
    }
    if (moodCircle) {
        moodCircle.setAttribute('stroke-dasharray', `0 ${circumference}`);
        moodCircle.setAttribute('stroke-dashoffset', '0');
        moodCircle.removeAttribute('stroke-linecap'); // Remove round cap to avoid dots
        moodCircle.style.opacity = '0'; // Hide completely
        moodCircle.style.display = 'none'; // Hide completely
    }
    if (depressionCircle) {
        depressionCircle.setAttribute('stroke-dasharray', `0 ${circumference}`);
        depressionCircle.setAttribute('stroke-dashoffset', '0');
        depressionCircle.removeAttribute('stroke-linecap'); // Remove round cap to avoid dots
        depressionCircle.style.opacity = '0'; // Hide completely
        depressionCircle.style.display = 'none'; // Hide completely
    }
    
    // Reset legend values to "No data"
    updateMentalHealthLegend({
        anxiety: null,
        stress: null,
        mood: null,
        depression: null
    });
}

function drawMentalHealthGauge(values = null) {
    // Don't use default values - only draw if we have real data
    if (!values) {
        resetMentalHealthIndicators();
        return;
    }
    
    const mentalHealthValues = values;
    
    // Store values for later use
    window.mentalHealthValues = mentalHealthValues;
    
    // Calculate total for normalization
    const total = mentalHealthValues.anxiety + mentalHealthValues.stress + mentalHealthValues.mood + mentalHealthValues.depression;
    
    // Normalize to 100% total (so all segments together form a complete circle)
    const normalized = {
        anxiety: (mentalHealthValues.anxiety / total) * 100,
        stress: (mentalHealthValues.stress / total) * 100,
        mood: (mentalHealthValues.mood / total) * 100,
        depression: (mentalHealthValues.depression / total) * 100
    };
    
    // Circle properties
    const radius = 85;
    const circumference = 2 * Math.PI * radius;
    
    // Calculate dash array and offset for each segment
    let currentOffset = 0;
    
    // Anxiety segment (first segment starts at 0)
    const anxietyLength = (normalized.anxiety / 100) * circumference;
    const anxietyCircle = document.getElementById('gauge-anxiety');
    if (anxietyCircle) {
        const gap = circumference - anxietyLength;
        anxietyCircle.setAttribute('stroke-dasharray', `${anxietyLength} ${gap}`);
        anxietyCircle.setAttribute('stroke-dashoffset', '0');
        anxietyCircle.setAttribute('stroke-linecap', 'round'); // Restore round cap for visible segments
        anxietyCircle.style.opacity = '1'; // Show
        anxietyCircle.style.display = ''; // Show
        currentOffset = anxietyLength;
    }
    
    // Stress segment (continues from anxiety)
    const stressLength = (normalized.stress / 100) * circumference;
    const stressCircle = document.getElementById('gauge-stress');
    if (stressCircle) {
        const gap = circumference - stressLength;
        stressCircle.setAttribute('stroke-dasharray', `${stressLength} ${gap}`);
        stressCircle.setAttribute('stroke-dashoffset', `-${currentOffset}`);
        stressCircle.setAttribute('stroke-linecap', 'round'); // Restore round cap for visible segments
        stressCircle.style.opacity = '1'; // Show
        stressCircle.style.display = ''; // Show
        currentOffset += stressLength;
    }
    
    // Mood segment (continues from stress)
    const moodLength = (normalized.mood / 100) * circumference;
    const moodCircle = document.getElementById('gauge-mood');
    if (moodCircle) {
        const gap = circumference - moodLength;
        moodCircle.setAttribute('stroke-dasharray', `${moodLength} ${gap}`);
        moodCircle.setAttribute('stroke-dashoffset', `-${currentOffset}`);
        moodCircle.setAttribute('stroke-linecap', 'round'); // Restore round cap for visible segments
        moodCircle.style.opacity = '1'; // Show
        moodCircle.style.display = ''; // Show
        currentOffset += moodLength;
    }
    
    // Depression segment (continues from mood, completes the circle)
    const depressionLength = (normalized.depression / 100) * circumference;
    const depressionCircle = document.getElementById('gauge-depression');
    if (depressionCircle) {
        const gap = circumference - depressionLength;
        depressionCircle.setAttribute('stroke-dasharray', `${depressionLength} ${gap}`);
        depressionCircle.setAttribute('stroke-dashoffset', `-${currentOffset}`);
        depressionCircle.setAttribute('stroke-linecap', 'round'); // Restore round cap for visible segments
        depressionCircle.style.opacity = '1'; // Show
        depressionCircle.style.display = ''; // Show
    }
    
    // Verify total (should be 100%)
    // Debug log removed - only log if needed for debugging
    // const verifyTotal = normalized.anxiety + normalized.stress + normalized.mood + normalized.depression;
    // console.log('Mental Health Gauge - Normalized values:', {
    //     anxiety: normalized.anxiety.toFixed(2) + '%',
    //     stress: normalized.stress.toFixed(2) + '%',
    //     mood: normalized.mood.toFixed(2) + '%',
    //     depression: normalized.depression.toFixed(2) + '%',
    //     total: verifyTotal.toFixed(2) + '%'
    // });
}

/**
 * Update real-time monitoring values
 * Now uses BLE data if available, otherwise shows "--"
 */
function updateRealtimeData() {
    let data;
    let hasData = false;
    
    // Use BLE data if connected, otherwise show "--"
    if (useBLEData && bleDevice) {
        // Use lastBLEData directly (updated by event listeners)
        // Only use data if we have valid values
        if (lastBLEData.bpm > 0 || lastBLEData.temp > 0 || lastBLEData.gsr >= 0 || lastBLEData.humanResistance > 0 || lastBLEData.spo2 > 0) {
            hasData = true;
            // Hitung Human Resistance dari raw GSR
            const calculatedHR = lastBLEData.gsr >= 0 ? calculateHumanResistance(lastBLEData.gsr) : 0;
            
            data = {
                heartRate: lastBLEData.bpm > 0 ? Math.round(lastBLEData.bpm) : null,
                spo2: lastBLEData.spo2 > 0 ? Math.round(lastBLEData.spo2) : null,  // SpO2 dari ESP32-C3
                gsr: lastBLEData.gsr >= 0 ? lastBLEData.gsr : null,  // Raw GSR dari ESP32-C3
                humanResistance: calculatedHR > 0 ? calculatedHR : null,  // Human Resistance (dihitung di web app)
                temperature: lastBLEData.temp > 0 ? lastBLEData.temp : null,
                motion: lastBLEData.motion || null  // Motion data from MPU sensor
            };
        }
    }
    
    // If no BLE data, show "--"
    if (!hasData) {
        updateValueWithPlaceholder('realtimeHR', '--');
        updateValueWithPlaceholder('realtimeSpO2', '--');
        updateValueWithPlaceholder('realtimeGSR', '--');
        updateValueWithPlaceholder('realtimeTemp', '--');
        updateValueWithPlaceholder('overallHealthScore', '--');
        
        // Update status indicators
        updateStatusIndicator('realtimeHRStatus', '--');
        updateStatusIndicator('realtimeGSRStatus', '--');
        updateStatusIndicator('realtimeTempStatus', '--');
        
        return;
    }
    
    // Update heart rate
    if (data.heartRate !== null && data.heartRate > 0) {
        const hrEl = document.getElementById('realtimeHR');
        if (hrEl) {
            const currentHR = hrEl.textContent === '--' ? 0 : parseInt(hrEl.textContent);
            if (currentHR === 0 || Math.abs(currentHR - data.heartRate) > 0) {
                animateValue(hrEl, currentHR || data.heartRate, data.heartRate, 500);
                updateHRStatus(data.heartRate);
            }
        }
    } else {
        updateValueWithPlaceholder('realtimeHR', '--');
        updateStatusIndicator('realtimeHRStatus', '--');
    }
    
    // Update SpO2 (now available from ESP32-C3)
    if (data.spo2 !== null && data.spo2 > 0) {
        const spo2El = document.getElementById('realtimeSpO2');
        if (spo2El) {
            const currentSpO2 = spo2El.textContent === '--' ? 0 : parseInt(spo2El.textContent);
            if (currentSpO2 === 0 || Math.abs(currentSpO2 - data.spo2) > 0) {
                animateValue(spo2El, currentSpO2 || data.spo2, data.spo2, 500);
                updateSpO2Status(data.spo2);
            }
        }
    } else {
        updateValueWithPlaceholder('realtimeSpO2', '--');
        updateStatusIndicator('realtimeSpO2Status', '--');
    }
    
    // Update GSR - Display raw value from device (same as shown on device)
    // Tampilkan nilai raw GSR dari alat langsung (800-900), bukan hasil konversi resistance
    let gsrRawValue = null;
    if (data.gsr !== null && data.gsr >= 0) {
        // Gunakan nilai raw GSR langsung dari alat
        gsrRawValue = data.gsr;
    } else if (lastBLEData.gsr >= 0) {
        // Fallback: gunakan nilai dari lastBLEData
        gsrRawValue = lastBLEData.gsr;
    }
    
    if (gsrRawValue !== null && gsrRawValue >= 0) {
        const gsrEl = document.getElementById('realtimeGSR');
        if (gsrEl) {
            // Display raw value as plain number (same as device shows: 800-900)
            const displayValue = Math.round(gsrRawValue);
            const currentGSR = gsrEl.textContent === '--' ? 0 : parseFloat(gsrEl.textContent.replace(/[^0-9.-]/g, ''));
            
            if (currentGSR === 0 || Math.abs(currentGSR - gsrRawValue) > 0) {
                // Update dengan format angka saja (tanpa unit) - sama seperti di alat
                gsrEl.textContent = displayValue.toString();
                
                // Update status berdasarkan raw value (sama seperti di alat)
                // Raw value 800-900 adalah range normal untuk ESP32-C3
                updateGSRStatusFromRaw(gsrRawValue);
            }
        }
    } else {
        updateValueWithPlaceholder('realtimeGSR', '--');
        updateStatusIndicator('realtimeGSRStatus', '--');
    }
    
    // Update temperature
    if (data.temperature !== null && data.temperature > 0) {
        const tempEl = document.getElementById('realtimeTemp');
        if (tempEl) {
            const currentTemp = tempEl.textContent === '--' ? 0 : parseFloat(tempEl.textContent);
            if (currentTemp === 0 || Math.abs(currentTemp - data.temperature) > 0.1) {
                animateValue(tempEl, currentTemp || data.temperature, parseFloat(data.temperature), 500, 1);
                updateTempStatus(data.temperature);
            }
        }
    } else {
        updateValueWithPlaceholder('realtimeTemp', '--');
        updateStatusIndicator('realtimeTempStatus', '--');
    }
    
    // Update motion status (from MPU sensor) and show notification if high motion
    if (data.motion && (data.motion.ax !== undefined || data.motion.ay !== undefined || data.motion.az !== undefined)) {
        updateMotionStatus(data.motion);
    } else if (lastBLEData.motion && (lastBLEData.motion.ax !== 0 || lastBLEData.motion.ay !== 0 || lastBLEData.motion.az !== 0)) {
        updateMotionStatus(lastBLEData.motion);
    }
    
    // Update health score (calculated from real data if available)
    // Always calculate health score when we have BLE data connected
    if (hasData && useBLEData) {
        // Check if we have minimum required data for health score calculation
        const hasMinData = (data.heartRate && data.heartRate > 0) || 
                          (data.temperature && data.temperature > 0) || 
                          (data.gsr !== null && data.gsr >= 0) ||
                          (data.spo2 && data.spo2 > 0);
        
        if (hasMinData) {
            const healthScore = calculateHealthScoreFromData(data);
            if (healthScore > 0) {
                const scoreEl = document.getElementById('overallHealthScore');
                if (scoreEl) {
                    const currentScore = scoreEl.textContent === '--' ? 0 : parseInt(scoreEl.textContent);
                    // Update if score changed significantly (more than 1 point) or if it's the first time
                    if (currentScore === 0 || Math.abs(currentScore - healthScore) >= 1) {
                        animateValue(scoreEl, currentScore || healthScore, healthScore, 500);
                        updateHealthStatus(healthScore);
                        drawHealthScoreRing();
                    }
                }
            }
        }
    } else if (!useBLEData) {
        // If no BLE connection, try to load from history
        // This will show "no data" message if history is also empty
        loadAndUpdateHealthScore();
    }
    
    // Store data in history for mini trends (with timestamp)
    // This allows us to show trends for the last 5 seconds
    const currentTime = Date.now();
    
    if (hasData) {
        // Add current values to history with timestamp
        if (data.heartRate !== null && data.heartRate > 0) {
            dataHistory.heartRate.push({
                value: data.heartRate,
                timestamp: currentTime
            });
            // Remove old data (older than 5 seconds) and limit array size
            dataHistory.heartRate = dataHistory.heartRate
                .filter(item => currentTime - item.timestamp <= TREND_TIME_WINDOW)
                .slice(-MAX_HISTORY_LENGTH);
        }
        
        if (data.spo2 !== null && data.spo2 > 0) {
            dataHistory.spo2.push({
                value: data.spo2,
                timestamp: currentTime
            });
            dataHistory.spo2 = dataHistory.spo2
                .filter(item => currentTime - item.timestamp <= TREND_TIME_WINDOW)
                .slice(-MAX_HISTORY_LENGTH);
        }
        
        // Simpan Human Resistance ke history (dihitung di web app dari raw GSR)
        // Hitung Human Resistance dari raw GSR jika tersedia
        let gsrHistoryValue = null;
        if (data.gsr !== null && data.gsr >= 0) {
            gsrHistoryValue = calculateHumanResistance(data.gsr);
        } else if (data.humanResistance !== null && data.humanResistance > 0) {
            gsrHistoryValue = data.humanResistance;
        }
        
        if (gsrHistoryValue !== null && gsrHistoryValue >= 0) {
            dataHistory.gsr.push({
                value: gsrHistoryValue,
                timestamp: currentTime
            });
            dataHistory.gsr = dataHistory.gsr
                .filter(item => currentTime - item.timestamp <= TREND_TIME_WINDOW)
                .slice(-MAX_HISTORY_LENGTH);
        }
        
        if (data.temperature !== null && data.temperature > 0) {
            dataHistory.temperature.push({
                value: parseFloat(data.temperature),
                timestamp: currentTime
            });
            dataHistory.temperature = dataHistory.temperature
                .filter(item => currentTime - item.timestamp <= TREND_TIME_WINDOW)
                .slice(-MAX_HISTORY_LENGTH);
        }
        
        // Redraw mini trends with real data from last 5 seconds
        drawMiniTrends();
        
        // Update mental health indicators from real-time BLE data
        // Only calculate when we have BLE data connected and valid sensor data
        if (hasData && useBLEData && bleDevice) {
            const mentalHealthData = calculateMentalHealthFromRealtimeData(data);
            if (mentalHealthData) {
                // Update gauge and legend with real-time calculated values
                drawMentalHealthGauge(mentalHealthData);
                updateMentalHealthLegend(mentalHealthData);
            } else {
                // No valid data yet, reset to empty state
                resetMentalHealthIndicators();
            }
        } else {
            // No BLE connection, reset to empty state
            resetMentalHealthIndicators();
        }
    } else {
        // If no data, still draw empty/minimal trends
        drawMiniTrends();
    }
}

/**
 * Calculate Human Resistance from raw GSR value
 * Formula: Human Resistance = ((1024 + 2 * Serial_Port_Reading) * 10000) / (512 - Serial_Port_Reading)
 * Where:
 * - Serial_Port_Reading = gsr (value from analogRead/ADC)
 * - This formula is from Arduino code, now calculated in web app
 */
function calculateHumanResistance(gsr) {
    // ESP32-C3 uses 12-bit ADC (0-4095), but the formula expects 10-bit range (0-512)
    // Data dari alat menunjukkan 800-900, ini adalah raw ADC value dari ESP32-C3
    // Convert ESP32-C3 ADC value to Arduino-equivalent range (0-512)
    let normalizedGSR = gsr;
    
    // Handle different input ranges
    if (gsr > 0 && gsr <= 512) {
        // Already in Arduino 10-bit format (0-512), use directly
        normalizedGSR = gsr;
    } else if (gsr > 512 && gsr <= 4095) {
        // ESP32-C3 12-bit ADC (0-4095) - normalize to Arduino 10-bit equivalent (0-512)
        // Data normal dari alat: 800-900, ini akan dinormalisasi ke ~100-112
        normalizedGSR = (gsr / 4095) * 512;
    } else if (gsr > 4095) {
        // If value is even larger, it might already be in resistance format (ohm)
        // Check if it's a reasonable resistance value (e.g., 1670k = 1670000 ohm)
        // In this case, return it directly as it's already calculated
        if (gsr >= 1000 && gsr <= 10000000) {
            return gsr; // Already in ohm format
        }
        // Otherwise, normalize assuming it's a very high ADC reading
        normalizedGSR = 511.9; // Cap just below 512 to avoid division issues
    } else {
        // Invalid input (0 or negative)
        return 0;
    }
    
    // Validate normalized input - should be between 0 and 512 (exclusive)
    // For data 800-900 from ESP32-C3, normalized value will be around 100-112
    if (normalizedGSR <= 0 || normalizedGSR >= 512) {
        return 0;
    }
    
    // Calculate denominator
    const denominator = 512 - normalizedGSR;
    
    // Prevent division by zero
    if (denominator <= 0) {
        return 0;
    }
    
    // Calculate Human Resistance using the Arduino formula
    // Formula: ((1024 + 2 * Serial_Port_Reading) * 10000) / (512 - Serial_Port_Reading)
    // For normalized value 100-112 (from 800-900 ADC), this will give reasonable resistance values
    const humanResistance = ((1024 + 2 * normalizedGSR) * 10000) / denominator;
    
    // Clamp value to reasonable range (0 - 10M ohm)
    if (humanResistance < 0) return 0;
    if (humanResistance > 10000000) return 10000000;
    
    return humanResistance;
}

/**
 * Update value with placeholder if needed
 */
function updateValueWithPlaceholder(elementId, placeholder) {
    const el = document.getElementById(elementId);
    if (el && el.textContent !== placeholder) {
        el.textContent = placeholder;
    }
}

/**
 * Update status indicator
 */
function updateStatusIndicator(elementId, text) {
    const el = document.getElementById(elementId);
    if (el) {
        el.textContent = text;
    }
}

/**
 * Update heart rate status
 */
function updateHRStatus(bpm) {
    const statusEl = document.getElementById('realtimeHRStatus');
    if (statusEl) {
        if (bpm < 60) {
            statusEl.textContent = 'Low';
            statusEl.className = 'monitor-status low';
        } else if (bpm > 100) {
            statusEl.textContent = 'High';
            statusEl.className = 'monitor-status high';
        } else {
            statusEl.textContent = 'Normal';
            statusEl.className = 'monitor-status normal';
        }
    }
}

/**
 * Update SpO2 status
 */
function updateSpO2Status(spo2) {
    const statusEl = document.getElementById('realtimeSpO2Status');
    if (statusEl) {
        if (spo2 < 90) {
            statusEl.textContent = 'Critical!';
            statusEl.className = 'monitor-status high';
        } else if (spo2 < 95) {
            statusEl.textContent = 'Low';
            statusEl.className = 'monitor-status low';
        } else if (spo2 >= 95 && spo2 <= 100) {
            statusEl.textContent = 'Normal';
            statusEl.className = 'monitor-status normal';
        } else {
            statusEl.textContent = 'High';
            statusEl.className = 'monitor-status high';
        }
    }
}

/**
 * Update GSR status based on raw value (same as device shows)
 * Raw value range for ESP32-C3: 0-4095 (12-bit ADC)
 * Normal range: 800-900
 */
function updateGSRStatusFromRaw(gsrRaw) {
    const statusEl = document.getElementById('realtimeGSRStatus');
    if (statusEl) {
        // Status berdasarkan raw value dari ESP32-C3 (0-4095)
        // Range normal: 800-900
        if (gsrRaw < 500) {
            statusEl.textContent = 'Very Low';
            statusEl.className = 'monitor-status low';
        } else if (gsrRaw < 700) {
            statusEl.textContent = 'Low';
            statusEl.className = 'monitor-status normal';
        } else if (gsrRaw >= 700 && gsrRaw <= 1000) {
            statusEl.textContent = 'Normal';
            statusEl.className = 'monitor-status normal';
        } else if (gsrRaw < 2000) {
            statusEl.textContent = 'Elevated';
            statusEl.className = 'monitor-status high';
        } else {
            statusEl.textContent = 'High';
            statusEl.className = 'monitor-status high';
        }
    }
}

/**
 * Update GSR status (legacy function for resistance-based status)
 * @deprecated Use updateGSRStatusFromRaw for raw value-based status
 */
function updateGSRStatus(gsr) {
    const statusEl = document.getElementById('realtimeGSRStatus');
    if (statusEl) {
        if (gsr < 500) {
            statusEl.textContent = 'Relaxed';
            statusEl.className = 'monitor-status normal';
        } else if (gsr < 1500) {
            statusEl.textContent = 'Calm';
            statusEl.className = 'monitor-status normal';
        } else if (gsr < 2500) {
            statusEl.textContent = 'Normal';
            statusEl.className = 'monitor-status normal';
        } else if (gsr < 3500) {
            statusEl.textContent = 'Stressed';
            statusEl.className = 'monitor-status high';
        } else {
            statusEl.textContent = 'Highly Stressed';
            statusEl.className = 'monitor-status high';
        }
    }
}

/**
 * Update temperature status
 */
function updateTempStatus(temp) {
    const statusEl = document.getElementById('realtimeTempStatus');
    if (statusEl) {
        if (temp < 35.0) {
            statusEl.textContent = 'Hypothermia';
            statusEl.className = 'monitor-status low';
        } else if (temp < 36.1) {
            statusEl.textContent = 'Low';
            statusEl.className = 'monitor-status low';
        } else if (temp > 38.0) {
            statusEl.textContent = 'Fever!';
            statusEl.className = 'monitor-status high';
        } else if (temp > 37.2) {
            statusEl.textContent = 'High';
            statusEl.className = 'monitor-status high';
        } else {
            statusEl.textContent = 'Normal';
            statusEl.className = 'monitor-status normal';
        }
    }
}

/**
 * Calculate motion intensity from MPU sensor data (ax, ay, az)
 * Returns motion level: 0 = no motion, 1 = low, 2 = medium, 3 = high, 4 = very high
 */
function calculateMotionIntensity(motion) {
    if (!motion || (motion.ax === 0 && motion.ay === 0 && motion.az === 0)) {
        return 0; // No motion
    }
    
    // Calculate magnitude of acceleration vector
    const magnitude = Math.sqrt(
        Math.pow(motion.ax, 2) + 
        Math.pow(motion.ay, 2) + 
        Math.pow(motion.az, 2)
    );
    
    // Remove gravity component (approximately 9.8 m/s² or 1g)
    // For simplicity, we'll use magnitude directly
    // Higher magnitude = more movement
    
    // Thresholds for motion levels (in m/s² or g units)
    // These can be adjusted based on actual sensor readings
    if (magnitude < 0.5) {
        return 1; // Low motion - calm/resting
    } else if (magnitude < 1.5) {
        return 2; // Medium motion - normal activity
    } else if (magnitude < 3.0) {
        return 3; // High motion - active movement
    } else {
        return 4; // Very high motion - excessive movement
    }
}

/**
 * Get mental health status based on motion level
 * High motion can indicate anxiety, restlessness, or agitation
 */
function getMotionMentalHealthStatus(motionLevel) {
    switch (motionLevel) {
        case 0:
            return {
                status: 'No Motion',
                mentalHealth: 'Calm',
                description: 'No movement detected. Body is at rest.',
                color: 'normal'
            };
        case 1:
            return {
                status: 'Low Motion',
                mentalHealth: 'Calm',
                description: 'Minimal movement. Body is relaxed and calm.',
                color: 'normal'
            };
        case 2:
            return {
                status: 'Normal Motion',
                mentalHealth: 'Stable',
                description: 'Normal activity level. Healthy movement pattern.',
                color: 'normal'
            };
        case 3:
            return {
                status: 'High Motion',
                mentalHealth: 'Anxious',
                description: 'Increased movement detected. May indicate restlessness or anxiety.',
                color: 'high'
            };
        case 4:
            return {
                status: 'Excessive Motion',
                mentalHealth: 'Highly Anxious',
                description: 'Excessive movement detected. Strong indicator of anxiety or agitation.',
                color: 'high'
            };
        default:
            return {
                status: 'Unknown',
                mentalHealth: '--',
                description: 'Motion data unavailable.',
                color: 'normal'
            };
    }
}

// Track last motion notification to prevent spam
let lastMotionNotificationTime = 0;
const MOTION_NOTIFICATION_COOLDOWN = 10000; // 10 seconds cooldown between notifications

// Track previous motion values to detect large changes
let previousMotion = { ax: 0, ay: 0, az: 0 };
let previousMotionMagnitude = 0;
const MOTION_CHANGE_THRESHOLD = 2.0; // Minimum change in magnitude to trigger notification (g units)

/**
 * Show notification for high motion activity
 */
function showMotionNotification(motionStatus, motionLevel) {
    // Only show notification for high motion (level 3 or 4)
    if (motionLevel < 3) {
        return;
    }
    
    // Check cooldown to prevent notification spam
    const now = Date.now();
    if (now - lastMotionNotificationTime < MOTION_NOTIFICATION_COOLDOWN) {
        return;
    }
    lastMotionNotificationTime = now;
    
    // Create notification element
    const container = document.getElementById('notificationContainer');
    if (!container) {
        // Create container if it doesn't exist
        const newContainer = document.createElement('div');
        newContainer.id = 'notificationContainer';
        newContainer.className = 'notification-container';
        document.body.appendChild(newContainer);
        return showMotionNotification(motionStatus, motionLevel);
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.className = 'notification notification-motion';
    
    // Set icon and message based on motion level
    let icon = 'fa-exclamation-triangle';
    let title = 'High Movement Detected';
    let message = motionStatus.description;
    
    if (motionLevel === 4) {
        icon = 'fa-exclamation-circle';
        title = 'Excessive Movement Detected';
        message = 'Excessive body movement detected. This may indicate high anxiety or restlessness. Consider taking a moment to relax.';
    } else if (motionLevel === 3) {
        message = 'Increased body movement detected. This may indicate restlessness or anxiety.';
    }
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="notification-content">
            <div class="notification-title">${title}</div>
            <div class="notification-message">${message}</div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remove after 8 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 8000);
}

/**
 * Update motion status display and show notification if needed
 * Only shows notification when there's a large change in motion (not just high absolute value)
 */
function updateMotionStatus(motion) {
    if (!motion || (motion.ax === undefined && motion.ay === undefined && motion.az === undefined)) {
        return;
    }
    
    // Calculate current motion magnitude
    const currentMagnitude = Math.sqrt(
        Math.pow(motion.ax || 0, 2) + 
        Math.pow(motion.ay || 0, 2) + 
        Math.pow(motion.az || 0, 2)
    );
    
    // Calculate change in motion (delta)
    const motionChange = Math.abs(currentMagnitude - previousMotionMagnitude);
    
    // Calculate motion intensity for status display
    const motionLevel = calculateMotionIntensity(motion);
    const motionStatus = getMotionMentalHealthStatus(motionLevel);
    
    // Only show notification if:
    // 1. Motion level is high (>= 3) AND
    // 2. There's a large change in motion (delta > threshold)
    // This prevents notifications from appearing just because motion is high,
    // but only when there's a significant change/increase in movement
    if (motionLevel >= 3 && motionChange >= MOTION_CHANGE_THRESHOLD) {
        showMotionNotification(motionStatus, motionLevel);
    }
    
    // Update previous motion values for next comparison
    previousMotion = {
        ax: motion.ax || 0,
        ay: motion.ay || 0,
        az: motion.az || 0
    };
    previousMotionMagnitude = currentMagnitude;
}

/**
 * Calculate health score from real sensor data
 */
/**
 * Calculate health score from real-time data
 */
function calculateHealthScoreFromData(data) {
    let score = 100;
    
    // Heart rate scoring (60-100 is optimal)
    if (data.heartRate < 60 || data.heartRate > 100) {
        score -= 10;
    } else if (data.heartRate < 50 || data.heartRate > 110) {
        score -= 20;
    }
    
    // Temperature scoring (36.1-37.2 is normal)
    if (data.temperature < 36.1 || data.temperature > 37.2) {
        score -= 10;
    } else if (data.temperature < 35.0 || data.temperature > 38.0) {
        score -= 20;
    }
    
    // GSR/Human Resistance scoring
    // Human Resistance rendah = kulit basah = stres tinggi
    // Human Resistance tinggi = kulit kering = relaks
    // Hitung Human Resistance dari raw GSR jika belum dihitung
    const humanRes = data.humanResistance || (data.gsr >= 0 ? calculateHumanResistance(data.gsr) : 0);
    const resistanceKOhm = humanRes / 1000;
    if (resistanceKOhm < 50) {
        score -= 15;  // Stres tinggi (resistance sangat rendah)
    } else if (resistanceKOhm < 100) {
        score -= 10;  // Stres (resistance rendah)
    } else if (resistanceKOhm > 500) {
        score -= 5;   // Terlalu kering (mungkin dehidrasi)
    }
    
    // SpO2 scoring (95-100 is optimal)
    if (data.spo2) {
        if (data.spo2 < 90) {
            score -= 20;  // Critical
        } else if (data.spo2 < 95) {
            score -= 10;  // Low
        }
    }
    
    return Math.max(0, Math.min(100, score));
}

/**
 * Calculate health score from recordings/history data
 * Takes average of all recordings to determine overall health
 */
async function calculateHealthScoreFromHistory() {
    if (!healthDb || !currentUserId) {
        return null;
    }
    
    try {
        const { collection, query, getDocs, where, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        
        // Get recent completed recordings (last 30 days or last 50 recordings)
        const recordingsRef = collection(healthDb, 'users', currentUserId, 'recordings');
        const q = query(
            recordingsRef,
            where('isComplete', '==', true),
            orderBy('startTime', 'desc'),
            limit(50)
        );
        
        const querySnapshot = await getDocs(q);
        const recordings = [];
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.statistics) {
                recordings.push({
                    statistics: data.statistics,
                    startTime: data.startTime
                });
            }
        });
        
        if (recordings.length === 0) {
            return null;
        }
        
        // Calculate averages from all recordings
        const validRecordings = recordings.filter(r => r.statistics);
        
        // Calculate average BPM
        const bpmValues = validRecordings.map(r => r.statistics.avgBPM || 0).filter(bpm => bpm > 0);
        const avgBPM = bpmValues.length > 0 
            ? bpmValues.reduce((sum, bpm) => sum + bpm, 0) / bpmValues.length 
            : 0;
        
        // Calculate average SpO2
        const spo2Values = validRecordings.map(r => r.statistics.avgSpO2 || 0).filter(spo2 => spo2 > 0);
        const avgSpO2 = spo2Values.length > 0 
            ? spo2Values.reduce((sum, spo2) => sum + spo2, 0) / spo2Values.length 
            : 0;
        
        // Calculate average Temperature
        const tempValues = validRecordings.map(r => r.statistics.avgTemp || 0).filter(temp => temp > 0);
        const avgTemp = tempValues.length > 0 
            ? tempValues.reduce((sum, temp) => sum + temp, 0) / tempValues.length 
            : 0;
        
        // Calculate average GSR (Human Resistance)
        // Note: avgGSR in recordings is already the calculated Human Resistance
        const gsrValues = validRecordings.map(r => r.statistics.avgGSR || 0).filter(gsr => gsr > 0);
        const avgGSR = gsrValues.length > 0 
            ? gsrValues.reduce((sum, gsr) => sum + gsr, 0) / gsrValues.length 
            : 0;
        
        // Calculate health score from averages
        let score = 100;
        let factors = 0;
        
        // BPM factor (60-100 is optimal) - 30% weight
        if (avgBPM > 0) {
            factors++;
            if (avgBPM >= 60 && avgBPM <= 100) {
                // Optimal range - no penalty
            } else if (avgBPM < 60) {
                score -= ((60 - avgBPM) / 60) * 30; // Penalty for low BPM
            } else if (avgBPM > 100) {
                score -= ((avgBPM - 100) / 100) * 30; // Penalty for high BPM
            }
        }
        
        // SpO2 factor (95-100 is optimal) - 25% weight
        if (avgSpO2 > 0) {
            factors++;
            if (avgSpO2 >= 95) {
                // Optimal - no penalty
            } else if (avgSpO2 < 90) {
                score -= 25; // Critical - full penalty
            } else {
                score -= ((95 - avgSpO2) / 5) * 25; // Penalty for low SpO2
            }
        }
        
        // Temperature factor (36.1-37.2 is normal) - 20% weight
        if (avgTemp > 0) {
            factors++;
            if (avgTemp >= 36.1 && avgTemp <= 37.2) {
                // Normal - no penalty
            } else if (avgTemp < 35.0 || avgTemp > 38.0) {
                score -= 20; // Critical - full penalty
            } else {
                const deviation = avgTemp < 36.1 ? (36.1 - avgTemp) : (avgTemp - 37.2);
                score -= (deviation / 1.1) * 20; // Penalty for deviation
            }
        }
        
        // GSR/Human Resistance factor - 25% weight
        // Higher resistance = lower stress = better health
        if (avgGSR > 0) {
            factors++;
            const resistanceKOhm = avgGSR / 1000;
            if (resistanceKOhm < 50) {
                score -= 25; // High stress - full penalty
            } else if (resistanceKOhm < 100) {
                score -= 15; // Moderate stress
            } else if (resistanceKOhm > 500) {
                score -= 10; // Too dry (possible dehydration)
            }
        }
        
        // Normalize score if not all factors available
        if (factors < 4) {
            score = (score / 100) * (factors * 25);
        }
        
        return Math.max(0, Math.min(100, Math.round(score)));
        
    } catch (error) {
        console.error('Error calculating health score from history:', error);
        return null;
    }
}

/**
 * Get health status label and icon based on score
 */
function getHealthStatus(score) {
    if (score >= 90) {
        return {
            label: 'Excellent Health',
            icon: 'fa-check-circle',
            color: '#10b981' // Green
        };
    } else if (score >= 75) {
        return {
            label: 'Good Health',
            icon: 'fa-check-circle',
            color: '#3b82f6' // Blue
        };
    } else if (score >= 60) {
        return {
            label: 'Normal Health',
            icon: 'fa-info-circle',
            color: '#f59e0b' // Orange
        };
    } else if (score >= 40) {
        return {
            label: 'Fair Health',
            icon: 'fa-exclamation-circle',
            color: '#f97316' // Orange-red
        };
    } else {
        return {
            label: 'Poor Health',
            icon: 'fa-exclamation-triangle',
            color: '#ef4444' // Red
        };
    }
}

/**
 * Update health status display
 */
function updateHealthStatus(score) {
    const statusEl = document.querySelector('.health-status');
    if (!statusEl) return;
    
    const iconEl = statusEl.querySelector('i');
    const textEl = statusEl.querySelector('span');
    
    // If no score or score is invalid, show "no data" message
    if (score === null || score === undefined || isNaN(score) || score === 0) {
        if (iconEl) {
            iconEl.className = 'fas fa-info-circle';
            iconEl.style.color = '#ffffff'; // White - readable on gradient background
        }
        
        if (textEl) {
            textEl.textContent = 'No recording data available';
            textEl.style.color = '#ffffff'; // White - readable on gradient background
        }
        return;
    }
    
    // Show health status based on score
    const status = getHealthStatus(score);
    
    if (iconEl) {
        iconEl.className = `fas ${status.icon}`;
        iconEl.style.color = status.color;
    }
    
    if (textEl) {
        textEl.textContent = status.label;
        textEl.style.color = status.color;
    }
}

/**
 * Load and update health score from history
 */
async function loadAndUpdateHealthScore() {
    // First try to get score from real-time data if available
    if (useBLEData && lastBLEData && (lastBLEData.bpm > 0 || lastBLEData.temp > 0 || lastBLEData.gsr >= 0)) {
        const realtimeData = {
            heartRate: lastBLEData.bpm > 0 ? lastBLEData.bpm : null,
            spo2: lastBLEData.spo2 > 0 ? lastBLEData.spo2 : null,
            gsr: lastBLEData.gsr >= 0 ? lastBLEData.gsr : null,
            humanResistance: lastBLEData.humanResistance > 0 ? lastBLEData.humanResistance : null,
            temperature: lastBLEData.temp > 0 ? lastBLEData.temp : null
        };
        
        const realtimeScore = calculateHealthScoreFromData(realtimeData);
        if (realtimeScore > 0) {
            const scoreEl = document.getElementById('overallHealthScore');
            if (scoreEl) {
                const currentScore = scoreEl.textContent === '--' ? 0 : parseInt(scoreEl.textContent);
                animateValue(scoreEl, currentScore || realtimeScore, realtimeScore, 500);
                updateHealthStatus(realtimeScore);
                drawHealthScoreRing();
            }
            return;
        }
    }
    
    // Fallback to history/recordings data
    const historyScore = await calculateHealthScoreFromHistory();
    const scoreEl = document.getElementById('overallHealthScore');
    
    if (historyScore !== null && historyScore > 0) {
        // We have valid score from history
        if (scoreEl) {
            const currentScore = scoreEl.textContent === '--' ? 0 : parseInt(scoreEl.textContent);
            animateValue(scoreEl, currentScore || historyScore, historyScore, 500);
            updateHealthStatus(historyScore);
            drawHealthScoreRing();
        }
    } else {
        // No data available - show placeholder and "no data" message
        if (scoreEl) {
            updateValueWithPlaceholder('overallHealthScore', '--');
        }
        updateHealthStatus(null); // Pass null to show "no data" message
        drawHealthScoreRing(); // Draw empty ring
    }
}

/**
 * Animate value change
 */
function animateValue(element, start, end, duration, decimals = 0) {
    // Don't animate if start is "--" or invalid
    if (element.textContent === '--' || start === 0 || isNaN(start)) {
        element.textContent = decimals > 0 ? end.toFixed(decimals) : Math.round(end);
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
        
        element.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
        
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    
    requestAnimationFrame(update);
}

/**
 * Draw health score ring
 */
function drawHealthScoreRing() {
    const ring = document.getElementById('healthScoreRing');
    if (!ring) return;
    
    const scoreEl = document.getElementById('overallHealthScore');
    const scoreText = scoreEl?.textContent || '--';
    
    // Don't draw if score is "--"
    if (scoreText === '--') {
        ring.style.strokeDasharray = '0 339.292';
        ring.style.strokeDashoffset = '339.292';
        return;
    }
    
    const score = parseInt(scoreText);
    if (isNaN(score)) return;
    
    const circumference = 2 * Math.PI * 54;
    const offset = circumference - (score / 100) * circumference;
    
    ring.style.strokeDasharray = circumference;
    ring.style.strokeDashoffset = offset;
    ring.style.transition = 'stroke-dashoffset 1s ease';
}

/**
 * Load sleep and activity data from Firestore
 * Mengambil data sleep dan activity dari Firestore
 */
async function loadSleepAndActivityData() {
    if (!healthDb || !currentUserId) return;
    
    try {
        const { collection, query, getDocs, where, limit, orderBy } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
        
        // Get today's recordings to calculate real data
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const recordingsRef = collection(healthDb, 'users', currentUserId, 'recordings');
        const q = query(
            recordingsRef,
            where('isComplete', '==', true),
            limit(100) // Get last 100 recordings
        );
        
        const querySnapshot = await getDocs(q);
        const recordings = [];
        
        // Filter by today and yesterday for sleep/activity data
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.startTime) {
                const recDate = new Date(data.startTime);
                recDate.setHours(0, 0, 0, 0);
                // Include today and yesterday's recordings
                if (recDate.getTime() >= yesterday.getTime()) {
                    recordings.push(data);
                }
            }
        });
        
        // Calculate sleep data from yesterday's recordings
        const yesterdayRecordings = recordings.filter(r => {
            if (!r.startTime) return false;
            const recDate = new Date(r.startTime);
            recDate.setHours(0, 0, 0, 0);
            return recDate.getTime() === yesterday.getTime();
        });
        
        if (yesterdayRecordings.length > 0) {
            // Calculate sleep duration from recordings (simplified - in real app would have separate sleep tracking)
            const totalDuration = yesterdayRecordings.reduce((sum, r) => sum + (r.duration || 0), 0);
            const sleepHours = totalDuration / (1000 * 60 * 60); // Convert ms to hours
            
            // Update sleep duration display
            const sleepTimeEl = document.querySelector('.sleep-time');
            if (sleepTimeEl) {
                const hours = Math.floor(sleepHours);
                const minutes = Math.round((sleepHours - hours) * 60);
                sleepTimeEl.textContent = `${hours}j ${minutes}m`;
            }
            
            // Calculate sleep quality based on health metrics
            const avgBPM = yesterdayRecordings.reduce((sum, r) => {
                return sum + (r.statistics?.avgBPM || 70);
            }, 0) / yesterdayRecordings.length;
            
            const avgSpO2 = yesterdayRecordings.reduce((sum, r) => {
                return sum + (r.statistics?.avgSpO2 || 98);
            }, 0) / yesterdayRecordings.length;
            
            // Quality score based on BPM (lower is better for sleep) and SpO2
            let quality = 85;
            if (avgBPM > 0) {
                // Lower BPM during sleep = better quality
                if (avgBPM < 60) quality = 95;
                else if (avgBPM < 65) quality = 90;
                else if (avgBPM < 70) quality = 85;
                else if (avgBPM < 75) quality = 75;
                else quality = 65;
            }
            
            // Update sleep quality
            const qualityScoreEl = document.querySelector('.quality-score');
            if (qualityScoreEl) {
                qualityScoreEl.textContent = `${Math.round(quality)}%`;
            }
            
            // Calculate sleep stages (simplified - based on duration)
            // Deep sleep: ~28%, REM: ~24%, Light: ~48%
            const totalMinutes = sleepHours * 60;
            window.sleepStagesData = {
                deep: Math.round(totalMinutes * 0.28),
                rem: Math.round(totalMinutes * 0.24),
                light: Math.round(totalMinutes * 0.48),
                awake: Math.max(0, Math.round(totalMinutes * 0.05))
            };
            
            // Update sleep stages display
            const sleepStages = document.querySelectorAll('.sleep-stage .stage-value');
            if (sleepStages.length >= 3) {
                sleepStages[0].textContent = `${(window.sleepStagesData.deep / 60).toFixed(1)} jam`; // Deep
                sleepStages[1].textContent = `${(window.sleepStagesData.rem / 60).toFixed(1)} jam`; // REM
                sleepStages[2].textContent = `${(window.sleepStagesData.light / 60).toFixed(1)} jam`; // Light
            }
            
            // Redraw sleep chart
            drawSleepChart();
        }
        
        // Calculate activity data from today's recordings
        const todayRecordings = recordings.filter(r => {
            if (!r.startTime) return false;
            const recDate = new Date(r.startTime);
            recDate.setHours(0, 0, 0, 0);
            return recDate.getTime() === today.getTime();
        });
        
        if (todayRecordings.length > 0) {
            // Estimate activity from recordings
            // Steps: estimate based on duration and heart rate (higher HR = more activity)
            let totalSteps = 0;
            let totalCalories = 0;
            let totalDistance = 0;
            
            todayRecordings.forEach(r => {
                const duration = r.duration || 0;
                const hours = duration / (1000 * 60 * 60);
                const avgBPM = r.statistics?.avgBPM || 70;
                
                // Estimate steps: higher BPM = more steps per hour
                // Base: 100 steps per hour, +10 steps per BPM above 60
                const stepsPerHour = 100 + Math.max(0, (avgBPM - 60) * 10);
                totalSteps += Math.round(stepsPerHour * hours);
                
                // Estimate calories: ~0.5 kcal per step
                totalCalories += Math.round(totalSteps * 0.5);
                
                // Estimate distance: ~0.0008 km per step
                totalDistance += totalSteps * 0.0008;
            });
            
            // Update steps
            const stepsValueEl = document.querySelector('.activity-item:first-of-type .activity-value');
            if (stepsValueEl) {
                const targetSteps = 10000;
                const progress = Math.min(100, (totalSteps / targetSteps) * 100);
                stepsValueEl.textContent = `${totalSteps.toLocaleString()} / ${targetSteps.toLocaleString()}`;
                
                // Update progress bar
                const progressFill = document.querySelector('.activity-item:first-of-type .activity-progress-fill');
                if (progressFill) {
                    progressFill.style.width = `${progress}%`;
                }
            }
            
            // Update calories
            const caloriesValueEl = document.querySelector('.activity-item:nth-of-type(2) .activity-value');
            if (caloriesValueEl) {
                caloriesValueEl.textContent = `${totalCalories.toLocaleString()} kcal`;
                
                // Update progress bar (target: 2000 kcal)
                const progressFill = document.querySelector('.activity-item:nth-of-type(2) .activity-progress-fill');
                if (progressFill) {
                    const progress = Math.min(100, (totalCalories / 2000) * 100);
                    progressFill.style.width = `${progress}%`;
                }
            }
            
            // Update distance
            const distanceValueEl = document.querySelector('.activity-item:nth-of-type(3) .activity-value');
            if (distanceValueEl) {
                distanceValueEl.textContent = `${totalDistance.toFixed(1)} km`;
                
                // Update progress bar (target: 8 km)
                const progressFill = document.querySelector('.activity-item:nth-of-type(3) .activity-progress-fill');
                if (progressFill) {
                    const progress = Math.min(100, (totalDistance / 8) * 100);
                    progressFill.style.width = `${progress}%`;
                }
            }
        }
        
        // Calculate mental health indicators from recent recordings
        await updateMentalHealthIndicators(recordings);
        
    } catch (error) {
        console.error('Error loading sleep and activity data:', error);
    }
}

/**
 * Draw sleep chart
 * Now uses real data from Firestore if available
 */
function drawSleepChart() {
    const canvas = document.getElementById('sleepChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;
    
    // Use real data from Firestore if available, otherwise use default
    let stages = window.sleepStagesData || {
        deep: 126,    // 2.1h
        rem: 108,     // 1.8h
        light: 216,  // 3.6h
        awake: 20
    };
    
    const total = stages.deep + stages.rem + stages.light + stages.awake;
    const padding = 10;
    const chartHeight = height - padding * 2;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    let currentY = padding;
    const colors = {
        deep: '#6366f1',
        rem: '#8b5cf6',
        light: '#a78bfa',
        awake: '#cbd5e1'
    };
    
    // Draw sleep stages as horizontal bars
    Object.entries(stages).forEach(([stage, minutes]) => {
        const barHeight = (minutes / total) * chartHeight;
        ctx.fillStyle = colors[stage];
        ctx.fillRect(padding, currentY, width - padding * 2, barHeight);
        currentY += barHeight;
    });
}

/**
 * Draw mini trend charts for real-time monitoring
 * Shows data from the last 5 seconds with smooth up/down trends
 */
function drawMiniTrends() {
    const currentTime = Date.now();
    
    // Map canvas IDs to their corresponding data history keys
    const canvases = [
        { id: 'hrTrendMini', color: '#6366f1', dataKey: 'heartRate', defaultValue: 70 },
        { id: 'spo2TrendMini', color: '#ec4899', dataKey: 'spo2', defaultValue: 98 },
        { id: 'gsrTrendMini', color: '#f59e0b', dataKey: 'gsr', defaultValue: 1000 },
        { id: 'tempTrendMini', color: '#ef4444', dataKey: 'temperature', defaultValue: 36.5 }
    ];
    
    canvases.forEach(({ id, color, dataKey, defaultValue }) => {
        const canvas = document.getElementById(id);
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Get canvas dimensions - use offsetWidth/offsetHeight for proper sizing
        let width = canvas.offsetWidth || canvas.width || 132;
        let height = canvas.offsetHeight || canvas.height || 40;
        
        // Ensure minimum dimensions
        if (width < 50) width = 132;
        if (height < 20) height = 40;
        
        // Set canvas internal resolution
        canvas.width = width;
        canvas.height = height;
        
        // Get data from history (with timestamp)
        let historyData = dataHistory[dataKey] || [];
        
        // Filter data to only show last 5 seconds
        const timeWindowStart = currentTime - TREND_TIME_WINDOW;
        historyData = historyData.filter(item => item.timestamp >= timeWindowStart);
        
        // Extract values from history data
        let data = historyData.map(item => item.value);
        
        // If no data, show a flat line at default value or empty chart
        if (data.length === 0) {
            // Draw empty/minimal chart with subtle line
            ctx.clearRect(0, 0, width, height);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.moveTo(2, height / 2);
            ctx.lineTo(width - 2, height / 2);
            ctx.stroke();
            ctx.globalAlpha = 1.0;
            return;
        }
        
        // Ensure we have at least 2 points for a line
        if (data.length === 1) {
            data = [data[0], data[0]]; // Duplicate single point
        }
        
        const padding = 2;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        // Calculate value range with some padding for better visualization
        const maxValue = Math.max(...data) * 1.1;
        const minValue = Math.min(...data) * 0.9;
        
        // Ensure we have a valid range (if all values are same, add some range)
        let valueRange = maxValue - minValue;
        if (valueRange === 0 || valueRange < 0.1) {
            // If all values are the same, create a small range around the value
            const centerValue = data[0];
            valueRange = Math.max(centerValue * 0.1, 1); // 10% of value or minimum 1
        }
        
        const pointWidth = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Draw gradient area under the line for better visualization
        const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
        gradient.addColorStop(0, color + '30'); // 30% opacity at top
        gradient.addColorStop(1, color + '05'); // 5% opacity at bottom
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.moveTo(padding, height - padding);
        
        data.forEach((value, index) => {
            const x = padding + index * pointWidth;
            const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
            ctx.lineTo(x, y);
        });
        
        ctx.lineTo(padding + (data.length - 1) * pointWidth, height - padding);
        ctx.closePath();
        ctx.fill();
        
        // Draw main trend line (smooth and visible)
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        
        data.forEach((value, index) => {
            const x = padding + index * pointWidth;
            const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        
        // Draw data points for better visibility (small circles)
        ctx.fillStyle = color;
        data.forEach((value, index) => {
            const x = padding + index * pointWidth;
            const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
            ctx.beginPath();
            ctx.arc(x, y, 1.5, 0, Math.PI * 2);
            ctx.fill();
        });
    });
}

/**
 * Generate real-time data
 */
function generateRealtimeData() {
    return {
        heartRate: Math.floor(Math.random() * 20 + 65),
        spo2: Math.floor(Math.random() * 4 + 96),
        gsr: Math.floor(Math.random() * 20 + 35),
        temperature: (Math.random() * 0.6 + 36.2).toFixed(1)
    };
}

/**
 * Generate health score
 */
function generateHealthScore() {
    return Math.floor(Math.random() * 10 + 88);
}

/**
 * Start recording data
 */
function startRecording() {
    if (isRecording) return;
    
    // Check if user is authenticated
    if (!currentUserId) {
        if (typeof showModal === 'function') {
            showModal('Login Required', 'Please login first to save recordings.', []);
        } else {
            alert('Please login first to save recordings.');
        }
        return;
    }
    
    // Check if BLE device is connected
    if (!useBLEData || !bleDevice) {
        if (typeof showModal === 'function') {
            showModal('Device Not Connected', 'Please connect to device first before recording. Recording requires real-time data from the device.', [
                'Click the Connect button to connect to your device',
                'Make sure the device is powered on and in range'
            ]);
        } else {
            alert('Please connect to device first before recording. Recording requires real-time data from the device.');
        }
        return;
    }
    
    // Check if we have valid BLE data
    if (lastBLEData.bpm === 0 && lastBLEData.temp === 0 && lastBLEData.gsr === 0 && lastBLEData.spo2 === 0) {
        if (typeof showModal === 'function') {
            showModal('No Data Received', 'Device connected but no data received yet. Please wait for data from the device.', [
                'Wait a few seconds for data to start streaming',
                'Check if the device is sending data correctly'
            ]);
        } else {
            alert('Device connected but no data received yet. Please wait for data from the device.');
        }
        return;
    }
    
    isRecording = true;
    recordingStartTime = Date.now();
    recordingData = [];
    currentRecordingId = null;  // Reset recording ID
    
    // Clear any existing local storage data for this recording
    clearRecordingDataFromLocalStorage();
    
    // Update UI
    const startBtn = document.getElementById('startRecordBtn');
    const stopBtn = document.getElementById('stopRecordBtn');
    const statusLabel = document.getElementById('recordingStatusLabel');
    const indicator = document.getElementById('recordingIndicator');
    
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    if (statusLabel) statusLabel.textContent = 'Sedang merekam...';
    if (indicator) {
        indicator.classList.add('recording-active');
        indicator.style.color = '#ef4444';
    }
    
    // Start recording timer
    updateRecordingTime();
    recordingTimeInterval = setInterval(updateRecordingTime, 1000);
    
    // Start recording data
    recordDataPoint();
    recordingInterval = setInterval(recordDataPoint, RECORDING_INTERVAL);
    
    // Start auto-save to Firestore
    autoSaveInterval = setInterval(autoSaveRecording, AUTO_SAVE_INTERVAL);
}

/**
 * Stop recording data
 */
async function stopRecording() {
    if (!isRecording) return;
    
    isRecording = false;
    
    // Clear intervals
    if (recordingInterval) {
        clearInterval(recordingInterval);
        recordingInterval = null;
    }
    if (recordingTimeInterval) {
        clearInterval(recordingTimeInterval);
        recordingTimeInterval = null;
    }
    if (autoSaveInterval) {
        clearInterval(autoSaveInterval);
        autoSaveInterval = null;
    }
    
    // Save final recording to Firestore
    await saveFinalRecording();
    
    // Update UI
    const startBtn = document.getElementById('startRecordBtn');
    const stopBtn = document.getElementById('stopRecordBtn');
    const statusLabel = document.getElementById('recordingStatusLabel');
    const indicator = document.getElementById('recordingIndicator');
    
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    if (statusLabel) statusLabel.textContent = 'Rekaman selesai';
    if (indicator) {
        indicator.classList.remove('recording-active');
        indicator.style.color = '';
    }
    
    // Display results
    displayRecordingResults();
}

/**
 * Record a data point
 */
function recordDataPoint() {
    if (!isRecording) return;
    
    // Check if max duration reached
    const elapsed = Date.now() - recordingStartTime;
    if (elapsed >= MAX_RECORDING_DURATION) {
        stopRecording();
        return;
    }
    
    // Only record data from BLE device (no fallback to generated data)
    // Recording should only work when device is connected
    if (!useBLEData || !bleDevice) {
        // Device not connected - stop recording
        console.warn('Device disconnected during recording, stopping...');
        stopRecording();
        return;
    }
    
    // Use lastBLEData directly (updated by event listeners)
    // Only record if we have valid data from device
    if (lastBLEData.bpm > 0 || lastBLEData.temp > 0 || lastBLEData.gsr >= 0 || lastBLEData.spo2 > 0) {
        // Calculate Human Resistance from raw GSR
        const calculatedHR = lastBLEData.gsr >= 0 ? calculateHumanResistance(lastBLEData.gsr) : 0;
        
        const recordData = {
            timestamp: Date.now() - recordingStartTime,
            heartRate: lastBLEData.bpm > 0 ? Math.round(lastBLEData.bpm) : null,
            spo2: lastBLEData.spo2 > 0 ? Math.round(lastBLEData.spo2) : null,  // SpO2 from ESP32-C3
            gsr: calculatedHR > 0 ? calculatedHR : null,  // Human Resistance (calculated in web app from raw GSR)
            temperature: lastBLEData.temp > 0 ? lastBLEData.temp : null
        };
        
        // Add data point to recording array
        recordingData.push(recordData);
        // Save to local storage immediately
        saveRecordingDataToLocalStorage();
    } else {
        // Device connected but no valid data yet - skip this data point
        console.warn('No valid data from device, skipping this data point');
    }
}

/**
 * Update recording time display
 */
function updateRecordingTime() {
    if (!isRecording || !recordingStartTime) return;
    
    const elapsed = Date.now() - recordingStartTime;
    const hours = Math.floor(elapsed / 3600000);
    const minutes = Math.floor((elapsed % 3600000) / 60000);
    const seconds = Math.floor((elapsed % 60000) / 1000);
    
    const timeEl = document.getElementById('recordingTime');
    if (timeEl) {
        timeEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
    
    // Auto-stop at 1 hour
    if (elapsed >= MAX_RECORDING_DURATION) {
        stopRecording();
    }
}

/**
 * Display recording results
 */
function displayRecordingResults() {
    // Only display results if we have actual recording data
    if (recordingData.length === 0) {
        // Hide results if no data
        const resultsEl = document.getElementById('recordingResults');
        if (resultsEl) {
            resultsEl.style.display = 'none';
        }
        return;
    }
    
    const resultsEl = document.getElementById('recordingResults');
    if (!resultsEl) return;
    
    // Calculate summary statistics from actual recorded data
    // Handle null values properly to avoid errors
    const duration = recordingData[recordingData.length - 1]?.timestamp || 0;
    
    // Filter out null values for calculations
    const validHR = recordingData.filter(d => d.heartRate !== null && !isNaN(d.heartRate)).map(d => d.heartRate);
    const validSpO2 = recordingData.filter(d => d.spo2 !== null && !isNaN(d.spo2)).map(d => d.spo2);
    const validGSR = recordingData.filter(d => d.gsr !== null && !isNaN(d.gsr)).map(d => d.gsr);
    const validTemp = recordingData.filter(d => d.temperature !== null && !isNaN(d.temperature)).map(d => d.temperature);
    
    const avgBPM = validHR.length > 0 ? Math.round(validHR.reduce((sum, val) => sum + val, 0) / validHR.length) : 0;
    const avgSpO2 = validSpO2.length > 0 ? Math.round(validSpO2.reduce((sum, val) => sum + val, 0) / validSpO2.length) : 0;
    const avgGSR = validGSR.length > 0 ? Math.round(validGSR.reduce((sum, val) => sum + val, 0) / validGSR.length) : 0;
    const avgTemp = validTemp.length > 0 ? (validTemp.reduce((sum, val) => sum + val, 0) / validTemp.length).toFixed(1) : '0.0';
    
    // Update summary - only show if we have valid data
    // Format duration properly
    const durationHours = Math.floor(duration / 3600000);
    const durationMinutes = Math.floor((duration % 3600000) / 60000);
    const durationSeconds = Math.floor((duration % 60000) / 1000);
    
    // Format duration text (e.g., "0m 51s" for 51 seconds)
    let durationText = '--';
    if (duration > 0) {
        if (durationHours > 0) {
            durationText = `${durationHours}h ${durationMinutes}m ${durationSeconds}s`;
        } else if (durationMinutes > 0) {
            durationText = `${durationMinutes}m ${durationSeconds}s`;
        } else {
            durationText = `${durationSeconds}s`;
        }
    }
    
    const summaryDuration = document.getElementById('summaryDuration');
    const summaryDataPoints = document.getElementById('summaryDataPoints');
    const summaryAvgBPM = document.getElementById('summaryAvgBPM');
    
    if (summaryDuration) summaryDuration.textContent = durationText;
    if (summaryDataPoints) summaryDataPoints.textContent = recordingData.length > 0 ? recordingData.length : '--';
    if (summaryAvgBPM) summaryAvgBPM.textContent = avgBPM > 0 ? `${avgBPM} BPM` : '--';
    
    // Draw charts with proper error handling
    // Use setTimeout to ensure canvas elements are properly rendered
    setTimeout(() => {
        drawRecordedChart('recordedHRChart', recordingData.map(d => d.heartRate), '#ff6b9d', ' BPM');
        drawRecordedChart('recordedSpO2Chart', recordingData.map(d => d.spo2), '#4ecdc4', '%');
        drawRecordedChart('recordedGSRChart', recordingData.map(d => d.gsr), '#ffe66d', ' μS');
        drawRecordedChart('recordedTempChart', recordingData.map(d => d.temperature), '#ff6b6b', '°C');
    }, 100);
    
    // Show results
    resultsEl.style.display = 'block';
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

/**
 * Draw recorded data chart
 * Improved to handle canvas sizing properly and ensure charts display correctly
 */
function drawRecordedChart(canvasId, data, color, unit) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    
    // Filter out null/undefined values
    const validData = data.filter(d => d !== null && d !== undefined && !isNaN(d));
    
    if (validData.length === 0) {
        // Draw empty chart message
        const ctx = canvas.getContext('2d');
        const width = canvas.offsetWidth || 300;
        const height = canvas.offsetHeight || 150;
        canvas.width = width;
        canvas.height = height;
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#64748b';
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Tidak ada data', width / 2, height / 2);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Get canvas dimensions - use offsetWidth/offsetHeight for proper sizing
    let width = canvas.offsetWidth || canvas.width || 300;
    let height = canvas.offsetHeight || canvas.height || 150;
    
    // Ensure minimum dimensions
    if (width < 200) width = 300;
    if (height < 100) height = 150;
    
    // Set canvas internal resolution
    canvas.width = width;
    canvas.height = height;
    
    const padding = 20;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Use validData instead of data
    const maxValue = Math.max(...validData) * 1.1;
    const minValue = Math.min(...validData) * 0.9;
    const valueRange = maxValue - minValue || 1;
    const pointWidth = validData.length > 1 ? chartWidth / (validData.length - 1) : 0;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw gradient background
    const gradient = ctx.createLinearGradient(0, padding, 0, height - padding);
    gradient.addColorStop(0, color + '20');
    gradient.addColorStop(1, color + '05');
    
    // Draw area under curve
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(padding, height - padding);
    
    validData.forEach((value, index) => {
        const x = padding + index * pointWidth;
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
        ctx.lineTo(x, y);
    });
    
    ctx.lineTo(padding + (validData.length - 1) * pointWidth, height - padding);
    ctx.closePath();
    ctx.fill();
    
    // Draw line
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    validData.forEach((value, index) => {
        const x = padding + index * pointWidth;
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
        
        if (index === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    
    ctx.stroke();
    
    // Draw data points
    ctx.fillStyle = color;
    validData.forEach((value, index) => {
        const x = padding + index * pointWidth;
        const y = padding + chartHeight - ((value - minValue) / valueRange) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    });
    
    // Draw labels
    ctx.fillStyle = '#64748b';
    ctx.font = '12px Inter';
    ctx.textAlign = 'left';
    ctx.fillText(`Min: ${Math.min(...validData).toFixed(1)}${unit}`, padding, height - 5);
    ctx.textAlign = 'right';
    ctx.fillText(`Max: ${Math.max(...validData).toFixed(1)}${unit}`, width - padding, height - 5);
}

/**
 * Close recording results
 */
function closeRecordingResults() {
    const resultsEl = document.getElementById('recordingResults');
    if (resultsEl) {
        resultsEl.style.display = 'none';
    }
}

// Initialize when DOM is loaded
// Note: health.html will call initHealthMonitoring() directly, so this is a fallback
document.addEventListener('DOMContentLoaded', async function() {
    // Check if we're on health.html page
    const isHealthPage = window.location.pathname.includes('health.html');
    
    // Only initialize if on health.html and not already initialized
    if (isHealthPage && typeof initHealthMonitoring === 'function' && !isHealthMonitoringInitialized && !healthDb) {
        setTimeout(async () => {
            await initHealthMonitoring();
        }, 100);
    }
    
    // Initialize recording controls (health.html also does this, but this is a fallback)
    const startBtn = document.getElementById('startRecordBtn');
    const stopBtn = document.getElementById('stopRecordBtn');
    const closeResultsBtn = document.getElementById('closeResultsBtn');
    
    if (startBtn && !startBtn.hasAttribute('data-listener-attached')) {
        startBtn.setAttribute('data-listener-attached', 'true');
        startBtn.addEventListener('click', startRecording);
    }
    
    if (stopBtn && !stopBtn.hasAttribute('data-listener-attached')) {
        stopBtn.setAttribute('data-listener-attached', 'true');
        stopBtn.addEventListener('click', stopRecording);
    }
    
    if (closeResultsBtn && !closeResultsBtn.hasAttribute('data-listener-attached')) {
        closeResultsBtn.setAttribute('data-listener-attached', 'true');
        closeResultsBtn.addEventListener('click', closeRecordingResults);
    }
    
    // Redraw on resize
    let resizeTimeout;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            drawSleepChart();
            drawMiniTrends();
            // Only redraw mental health gauge if values are available
            if (window.mentalHealthValues) {
                drawMentalHealthGauge(window.mentalHealthValues);
            } else {
                drawMentalHealthGauge(); // Use default values
            }
            drawHealthScoreRing();
            // Redraw recorded charts if visible
            const resultsEl = document.getElementById('recordingResults');
            if (recordingData.length > 0 && resultsEl && resultsEl.style.display !== 'none') {
                displayRecordingResults();
            }
        }, 250);
    });
});

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (monitoringInterval) {
        clearInterval(monitoringInterval);
    }
    if (miniTrendsInterval) {
        clearInterval(miniTrendsInterval);
    }
    if (recordingInterval) {
        clearInterval(recordingInterval);
    }
    if (recordingTimeInterval) {
        clearInterval(recordingTimeInterval);
    }
});
