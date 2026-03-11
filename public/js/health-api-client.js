/**
 * Health API Client
 * Fetches latest and analytics data from the backend to populate dashboard/analytics pages
 */
class HealthApiClient {
    constructor() {
        this.pollInterval = 5000; // Poll every 5 seconds
        this.timer = null;
    }

    startPollingLatest(callback) {
        this.fetchLatest(callback);
        this.timer = setInterval(() => this.fetchLatest(callback), this.pollInterval);
    }

    stopPolling() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async fetchLatest(callback) {
        try {
            const res = await fetch('/api/health-data/latest');
            const result = await res.json();
            if (result.success && result.data) {
                callback(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch latest health data:', error);
        }
    }

    async fetchAnalytics(callback) {
        try {
            const res = await fetch('/api/health-data/analytics');
            const result = await res.json();
            if (result.success && result.data) {
                callback(result.data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics health data:', error);
        }
    }
}

// Global instance
window.healthApiClient = new HealthApiClient();
