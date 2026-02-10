/**
 * Synaglo API Integration
 * Handles all API calls to Laravel backend
 */

class SynagloAPI {
    constructor(baseURL = 'http://127.0.0.1:8000/api') {
        this.baseURL = baseURL;
    }

    /**
     * Generic GET request
     */
    async get(endpoint) {
        try {
            const response = await fetch(`${this.baseURL}${endpoint}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API Error (GET ${endpoint}):`, error);
            throw error;
        }
    }

    /**
     * Health API Endpoints
     */
    async getCurrentHealth() {
        return await this.get('/health/current');
    }

    async getHealthStream(period = 'today', limit = 50) {
        return await this.get(`/health/stream?period=${period}&limit=${limit}`);
    }

    async getHealthMetrics(startTime, endTime) {
        return await this.get(`/health/metrics?start_time=${startTime}&end_time=${endTime}`);
    }

    /**
     * Analytics API Endpoints
     */
    async getAnalyticsSummary() {
        return await this.get('/analytics/summary');
    }

    async getTrends(period = 'today') {
        return await this.get(`/analytics/trends?period=${period}`);
    }

    async getDetailedAnalytics() {
        return await this.get('/analytics/detailed');
    }

    async getRecordingHistory(period = 'today', limit = 20) {
        return await this.get(`/analytics/history?period=${period}&limit=${limit}`);
    }

    /**
     * Profile API Endpoints
     */
    async getProfileStats() {
        return await this.get('/profile/stats');
    }

    async getHealthTrends() {
        return await this.get('/profile/health-trends');
    }
}

// Create global instance
window.synagloAPI = new SynagloAPI();

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SynagloAPI;
}
