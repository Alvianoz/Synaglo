/**
 * BLE Connection Module
 * Handles Bluetooth Low Energy connection to ESP32-C3 device
 * 
 * Device: SYNAGLO Monitor (ESP32-C3)
 * Service UUID: 12345678-1234-1234-1234-123456789abc
 * Characteristics:
 *   - BPM: 12345678-1234-1234-1234-123456789ab1
 *   - Temperature: 12345678-1234-1234-1234-123456789ab2
 *   - GSR: 12345678-1234-1234-1234-123456789ab3
 *   - Motion: 12345678-1234-1234-1234-123456789ab4
 *   - All Data (JSON): 12345678-1234-1234-1234-123456789ab5
 */

// BLE Configuration - sesuai dengan ESP32-C3
const BLE_CONFIG = {
    deviceName: 'SYNAGLO Monitor',
    serviceUUID: '12345678-1234-1234-1234-123456789abc',
    characteristics: {
        bpm: '12345678-1234-1234-1234-123456789ab1',
        temp: '12345678-1234-1234-1234-123456789ab2',
        gsr: '12345678-1234-1234-1234-123456789ab3',
        motion: '12345678-1234-1234-1234-123456789ab4',
        allData: '12345678-1234-1234-1234-123456789ab5'
    }
};

// BLE Connection State
let bleDevice = null;
let bleServer = null;
let bleService = null;
let bleCharacteristics = {};
let isConnected = false;
let isConnecting = false;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// Sensor Data Storage
let sensorData = {
    bpm: 0,
    temp: 0,
    gsr: 0,
    motion: { ax: 0, ay: 0, az: 0 },
    ir: 0,
    lastUpdate: null
};

// Event listeners untuk data updates
const dataListeners = {
    bpm: [],
    temp: [],
    gsr: [],
    motion: [],
    allData: []
};

/**
 * Check if Web Bluetooth API is supported
 */
function isBLESupported() {
    return 'bluetooth' in navigator;
}

/**
 * Request BLE device connection
 */
async function connectBLE() {
    // Check if BLE is supported
    if (!isBLESupported()) {
        throw new Error('Bluetooth tidak didukung di browser ini. Gunakan Chrome, Edge, atau browser yang mendukung Web Bluetooth API.');
    }

    // Check if already connected
    if (isConnected) {
        console.log('Already connected to BLE device');
        return true;
    }

    // Check if already connecting
    if (isConnecting) {
        console.log('Connection already in progress...');
        return false;
    }

    isConnecting = true;
    updateConnectionStatus('connecting', 'Menghubungkan ke perangkat...');

    try {
        // Request device - Ini akan MEMBUKA DIALOG PEMILIHAN PERANGKAT BLUETOOTH
        // Dialog sistem akan muncul dan user bisa memilih perangkat dari daftar
        console.log('Requesting BLE device...');
        console.log('Dialog pemilihan perangkat akan muncul...');
        
        // navigator.bluetooth.requestDevice() akan menampilkan dialog sistem
        // User akan melihat daftar perangkat BLE yang memiliki service UUID ini
        bleDevice = await navigator.bluetooth.requestDevice({
            // Filter berdasarkan service UUID
            // Semua device yang memiliki service UUID ini akan muncul di dialog
            filters: [
                { services: [BLE_CONFIG.serviceUUID] }
            ],
            // Optional services untuk akses ke service yang sama
            optionalServices: [BLE_CONFIG.serviceUUID]
        });

        console.log('Device selected from dialog:', bleDevice.name || 'Unknown');

        // Listen for disconnection
        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);

        // Connect to GATT server
        console.log('Connecting to GATT server...');
        bleServer = await bleDevice.gatt.connect();
        console.log('GATT server connected');

        // Get service
        console.log('Getting service...');
        bleService = await bleServer.getPrimaryService(BLE_CONFIG.serviceUUID);
        console.log('Service obtained');

        // Get all characteristics
        console.log('Getting characteristics...');
        await getCharacteristics();

        // Subscribe to notifications
        console.log('Subscribing to notifications...');
        await subscribeToNotifications();

        // Connection successful
        isConnected = true;
        isConnecting = false;
        reconnectAttempts = 0;
        updateConnectionStatus('connected', 'Terhubung ke ' + bleDevice.name);

        // Notify listeners
        notifyConnectionChange(true);

        console.log('BLE connection established successfully');
        return true;

    } catch (error) {
        isConnecting = false;
        console.error('BLE connection error:', error);

        // Handle different error types dengan pesan yang jelas
        let errorMessage = 'Gagal menghubungkan ke perangkat.';
        
        if (error.name === 'NotFoundError') {
            errorMessage = 'Perangkat tidak ditemukan.\nPastikan ESP32-C3 sudah menyala dan dalam jangkauan.';
            updateConnectionStatus('error', 'Perangkat tidak ditemukan');
        } else if (error.name === 'SecurityError') {
            errorMessage = 'Izin Bluetooth ditolak.\nSilakan izinkan akses Bluetooth di browser.';
            updateConnectionStatus('error', 'Izin Bluetooth ditolak');
        } else if (error.name === 'NetworkError') {
            errorMessage = 'Gagal terhubung ke perangkat.\nCoba putuskan dan hubungkan lagi.';
            updateConnectionStatus('error', 'Gagal terhubung ke perangkat');
        } else if (error.name === 'InvalidStateError') {
            errorMessage = 'Perangkat sudah terhubung atau sedang dalam proses koneksi.';
            updateConnectionStatus('error', 'Perangkat sedang digunakan');
        } else if (error.message) {
            errorMessage = error.message;
            updateConnectionStatus('error', 'Error: ' + error.message);
        } else {
            updateConnectionStatus('error', 'Gagal menghubungkan');
        }

        notifyConnectionChange(false);
        
        // Error message sudah ditampilkan di UI, tidak perlu throw lagi
        // karena sudah di-handle di health-monitoring.js
        return false;
    }
}

/**
 * Get all BLE characteristics
 */
async function getCharacteristics() {
    try {
        // Get BPM characteristic
        bleCharacteristics.bpm = await bleService.getCharacteristic(BLE_CONFIG.characteristics.bpm);
        
        // Get Temperature characteristic
        bleCharacteristics.temp = await bleService.getCharacteristic(BLE_CONFIG.characteristics.temp);
        
        // Get GSR characteristic
        bleCharacteristics.gsr = await bleService.getCharacteristic(BLE_CONFIG.characteristics.gsr);
        
        // Get Motion characteristic
        bleCharacteristics.motion = await bleService.getCharacteristic(BLE_CONFIG.characteristics.motion);
        
        // Get All Data characteristic (JSON)
        bleCharacteristics.allData = await bleService.getCharacteristic(BLE_CONFIG.characteristics.allData);

        console.log('All characteristics obtained');
    } catch (error) {
        console.error('Error getting characteristics:', error);
        throw error;
    }
}

/**
 * Subscribe to characteristic notifications
 */
async function subscribeToNotifications() {
    try {
        // Subscribe to BPM notifications
        if (bleCharacteristics.bpm) {
            await bleCharacteristics.bpm.startNotifications();
            bleCharacteristics.bpm.addEventListener('characteristicvaluechanged', handleBPMNotification);
        }

        // Subscribe to Temperature notifications
        if (bleCharacteristics.temp) {
            await bleCharacteristics.temp.startNotifications();
            bleCharacteristics.temp.addEventListener('characteristicvaluechanged', handleTempNotification);
        }

        // Subscribe to GSR notifications
        if (bleCharacteristics.gsr) {
            await bleCharacteristics.gsr.startNotifications();
            bleCharacteristics.gsr.addEventListener('characteristicvaluechanged', handleGSRNotification);
        }

        // Subscribe to Motion notifications
        if (bleCharacteristics.motion) {
            await bleCharacteristics.motion.startNotifications();
            bleCharacteristics.motion.addEventListener('characteristicvaluechanged', handleMotionNotification);
        }

        // Subscribe to All Data notifications (JSON)
        if (bleCharacteristics.allData) {
            await bleCharacteristics.allData.startNotifications();
            bleCharacteristics.allData.addEventListener('characteristicvaluechanged', handleAllDataNotification);
        }

        console.log('Subscribed to all notifications');
    } catch (error) {
        console.error('Error subscribing to notifications:', error);
        throw error;
    }
}

/**
 * Handle BPM characteristic notification
 */
function handleBPMNotification(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const bpmValue = parseFloat(decoder.decode(value));
    
    if (!isNaN(bpmValue) && bpmValue > 0) {
        sensorData.bpm = bpmValue;
        sensorData.lastUpdate = Date.now();
        
        // Notify listeners
        dataListeners.bpm.forEach(listener => {
            try {
                listener(bpmValue);
            } catch (error) {
                console.error('Error in BPM listener:', error);
            }
        });
    }
}

/**
 * Handle Temperature characteristic notification
 */
function handleTempNotification(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const tempValue = parseFloat(decoder.decode(value));
    
    if (!isNaN(tempValue) && tempValue > 0) {
        sensorData.temp = tempValue;
        sensorData.lastUpdate = Date.now();
        
        // Notify listeners
        dataListeners.temp.forEach(listener => {
            try {
                listener(tempValue);
            } catch (error) {
                console.error('Error in Temp listener:', error);
            }
        });
    }
}

/**
 * Handle GSR characteristic notification
 */
function handleGSRNotification(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const gsrValue = parseInt(decoder.decode(value));
    
    if (!isNaN(gsrValue) && gsrValue >= 0) {
        sensorData.gsr = gsrValue;
        sensorData.lastUpdate = Date.now();
        
        // Notify listeners
        dataListeners.gsr.forEach(listener => {
            try {
                listener(gsrValue);
            } catch (error) {
                console.error('Error in GSR listener:', error);
            }
        });
    }
}

/**
 * Handle Motion characteristic notification
 */
function handleMotionNotification(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const motionStr = decoder.decode(value);
    
    // Format: "ax,ay,az"
    const parts = motionStr.split(',');
    if (parts.length === 3) {
        const ax = parseFloat(parts[0]);
        const ay = parseFloat(parts[1]);
        const az = parseFloat(parts[2]);
        
        if (!isNaN(ax) && !isNaN(ay) && !isNaN(az)) {
            sensorData.motion = { ax, ay, az };
            sensorData.lastUpdate = Date.now();
            
            // Notify listeners
            dataListeners.motion.forEach(listener => {
                try {
                    listener({ ax, ay, az });
                } catch (error) {
                    console.error('Error in Motion listener:', error);
                }
            });
        }
    }
}

/**
 * Handle All Data characteristic notification (JSON format)
 */
function handleAllDataNotification(event) {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const jsonStr = decoder.decode(value);
    
    try {
        const data = JSON.parse(jsonStr);
        
        // Update sensor data
        if (data.bpm !== undefined) sensorData.bpm = data.bpm;
        if (data.temp !== undefined) sensorData.temp = data.temp;
        if (data.gsr !== undefined) sensorData.gsr = data.gsr;
        if (data.ir !== undefined) sensorData.ir = data.ir;
        if (data.ax !== undefined) sensorData.motion.ax = data.ax;
        if (data.ay !== undefined) sensorData.motion.ay = data.ay;
        if (data.az !== undefined) sensorData.motion.az = data.az;
        
        sensorData.lastUpdate = Date.now();
        
        // Notify listeners
        dataListeners.allData.forEach(listener => {
            try {
                listener(data);
            } catch (error) {
                console.error('Error in AllData listener:', error);
            }
        });
    } catch (error) {
        console.error('Error parsing JSON data:', error);
    }
}

/**
 * Disconnect from BLE device
 */
async function disconnectBLE() {
    if (!isConnected && !isConnecting) {
        return;
    }

    try {
        // Stop notifications
        if (bleCharacteristics.bpm) {
            await bleCharacteristics.bpm.stopNotifications();
        }
        if (bleCharacteristics.temp) {
            await bleCharacteristics.temp.stopNotifications();
        }
        if (bleCharacteristics.gsr) {
            await bleCharacteristics.gsr.stopNotifications();
        }
        if (bleCharacteristics.motion) {
            await bleCharacteristics.motion.stopNotifications();
        }
        if (bleCharacteristics.allData) {
            await bleCharacteristics.allData.stopNotifications();
        }

        // Disconnect from device
        if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
            await bleDevice.gatt.disconnect();
        }

        console.log('BLE disconnected');
    } catch (error) {
        console.error('Error disconnecting:', error);
    } finally {
        // Reset state
        isConnected = false;
        isConnecting = false;
        bleDevice = null;
        bleServer = null;
        bleService = null;
        bleCharacteristics = {};
        
        updateConnectionStatus('disconnected', 'Terputus dari perangkat');
        notifyConnectionChange(false);
    }
}

/**
 * Handle disconnection event
 */
function onDisconnected(event) {
    console.log('Device disconnected');
    isConnected = false;
    isConnecting = false;
    
    updateConnectionStatus('disconnected', 'Terputus dari perangkat');
    notifyConnectionChange(false);
    
    // Attempt reconnection if needed
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`Attempting reconnection (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => {
            if (!isConnected) {
                connectBLE();
            }
        }, 2000);
    }
}

/**
 * Update connection status UI
 */
function updateConnectionStatus(status, message) {
    // Dispatch custom event untuk update UI
    const event = new CustomEvent('bleStatusChange', {
        detail: { status, message }
    });
    document.dispatchEvent(event);
}

/**
 * Notify connection change listeners
 */
const connectionListeners = [];
function notifyConnectionChange(connected) {
    connectionListeners.forEach(listener => {
        try {
            listener(connected);
        } catch (error) {
            console.error('Error in connection listener:', error);
        }
    });
}

/**
 * Add connection change listener
 */
function onConnectionChange(callback) {
    connectionListeners.push(callback);
}

/**
 * Remove connection change listener
 */
function offConnectionChange(callback) {
    const index = connectionListeners.indexOf(callback);
    if (index > -1) {
        connectionListeners.splice(index, 1);
    }
}

/**
 * Add data listener
 */
function onDataUpdate(type, callback) {
    if (dataListeners[type]) {
        dataListeners[type].push(callback);
    }
}

/**
 * Remove data listener
 */
function offDataUpdate(type, callback) {
    if (dataListeners[type]) {
        const index = dataListeners[type].indexOf(callback);
        if (index > -1) {
            dataListeners[type].splice(index, 1);
        }
    }
}

/**
 * Get current sensor data
 */
function getSensorData() {
    return { ...sensorData };
}

/**
 * Get connection status
 */
function getConnectionStatus() {
    return {
        isConnected,
        isConnecting,
        deviceName: bleDevice?.name || null
    };
}

// Export functions
window.BLEConnection = {
    connect: connectBLE,
    disconnect: disconnectBLE,
    isSupported: isBLESupported,
    getSensorData,
    getConnectionStatus,
    onConnectionChange,
    offConnectionChange,
    onDataUpdate,
    offDataUpdate
};
