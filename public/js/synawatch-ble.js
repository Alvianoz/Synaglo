/**
 * SYNAWATCH Web Bluetooth Client
 * Handles connection, data parsing, and syncing to the backend.
 */
class SynawatchBLE {
    constructor() {
        this.deviceName = 'SYNAWATCH';
        this.serviceUuid = '12345678-1234-1234-1234-123456789abc';
        this.characteristicUuid = 'abcd1234-ab12-cd34-ef56-123456789abc';
        
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        
        this.isConnected = false;
        
        // State for syncing
        this.lastSyncTime = 0;
        this.syncIntervalMs = 3000; // Sync every 3 seconds
        this.latestData = null;
    }

    async connect() {
        try {
            console.log('Requesting Bluetooth Device...');
            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ name: this.deviceName }],
                optionalServices: [this.serviceUuid]
            });

            this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

            console.log('Connecting to GATT Server...');
            this.server = await this.device.gatt.connect();

            console.log('Getting Primary Service...');
            this.service = await this.server.getPrimaryService(this.serviceUuid);

            console.log('Getting Characteristic...');
            this.characteristic = await this.service.getCharacteristic(this.characteristicUuid);

            console.log('Starting Notifications...');
            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));

            this.isConnected = true;
            console.log('SYNAWATCH connected successfully!');
            
            // Dispatch connection status event
            window.dispatchEvent(new CustomEvent('synawatch_status', { detail: { connected: true } }));
            
            return true;
        } catch (error) {
            console.error('Connection failed!', error);
            this.isConnected = false;
            window.dispatchEvent(new CustomEvent('synawatch_status', { detail: { connected: false, error: error.message } }));
            return false;
        }
    }

    disconnect() {
        if (!this.device) {
            return;
        }
        console.log('Disconnecting from SYNAWATCH...');
        if (this.device.gatt.connected) {
            this.device.gatt.disconnect();
        } else {
            console.log('Already disconnected');
        }
    }

    onDisconnected() {
        console.log('SYNAWATCH disconnected.');
        this.isConnected = false;
        window.dispatchEvent(new CustomEvent('synawatch_status', { detail: { connected: false } }));
    }

    handleCharacteristicValueChanged(event) {
        const value = event.target.value;
        const decoder = new TextDecoder('utf-8');
        const jsonString = decoder.decode(value);

        try {
            const data = JSON.parse(jsonString);
            this.latestData = this.formatData(data);
            
            // Dispatch event to UI so it updates immediately (500ms)
            window.dispatchEvent(new CustomEvent('synawatch_data', { detail: this.latestData }));
            
            // Periodically sync to backend database
            this.syncToBackend(this.latestData);
            
        } catch (e) {
            console.error('Error parsing JSON from smartwatch:', e);
        }
    }

    formatData(data) {
        let formatted = { ...data };
        
        // HR & SpO2 validation
        const hasFinger = formatted.finger === true || formatted.finger === "true" || formatted.finger === 1;
        
        // Parse numbers just in case
        formatted.hr = parseInt(formatted.hr) || 0;
        formatted.spo2 = parseInt(formatted.spo2) || 0;
        formatted.stress = parseInt(formatted.stress) || 0;
        
        // Apply display logic for hr and spo2 inside the component or we can add display variables
        formatted.display_hr = (!hasFinger || formatted.hr === 0) ? "--" : formatted.hr;
        formatted.display_spo2 = (!hasFinger || formatted.spo2 === 0) ? "--" : formatted.spo2;
        
        // Decimals formatting
        formatted.display_bt = parseFloat(formatted.bt || 0).toFixed(1);
        formatted.display_ax = parseFloat(formatted.ax || 0).toFixed(2);
        formatted.display_ay = parseFloat(formatted.ay || 0).toFixed(2);
        formatted.display_az = parseFloat(formatted.az || 0).toFixed(2);
        formatted.display_gx = parseFloat(formatted.gx || 0).toFixed(1);
        formatted.display_gy = parseFloat(formatted.gy || 0).toFixed(1);
        formatted.display_gz = parseFloat(formatted.gz || 0).toFixed(1);
        
        return formatted;
    }

    async syncToBackend(data) {
        const now = Date.now();
        if (now - this.lastSyncTime > this.syncIntervalMs) {
            this.lastSyncTime = now;
            
            try {
                // Ensure we send valid numeric types for DB schema
                const payload = {
                    hr: typeof data.display_hr === 'number' ? data.display_hr : null,
                    spo2: typeof data.display_spo2 === 'number' ? data.display_spo2 : null,
                    bt: data.bt,
                    at: data.at,
                    ax: data.ax,
                    ay: data.ay,
                    az: data.az,
                    gx: data.gx,
                    gy: data.gy,
                    gz: data.gz,
                    stress: data.stress,
                    act: data.act,
                    finger: data.finger === true || data.finger === 'true' || data.finger === 1
                };

                // Add CSRF token
                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                const headers = {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                };
                if (csrfToken) {
                    headers['X-CSRF-TOKEN'] = csrfToken;
                }

                await fetch('/api/health-data', {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload)
                });
                
            } catch (err) {
                console.error("Failed to sync health data to backend:", err);
            }
        }
    }
}

// Instantiate globally
window.synawatchBle = new SynawatchBLE();
