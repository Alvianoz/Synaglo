/**
 * Profile Data Integration
 * Loads profile stats from Laravel API
 */

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
    await loadProfileData();
});

/**
 * Load all profile data
 */
async function loadProfileData() {
    try {
        await loadProfileStats();
    } catch (error) {
        console.error('Error loading profile data:', error);
    }
}

/**
 * Load profile statistics
 */
async function loadProfileStats() {
    try {
        const response = await window.synagloAPI.getProfileStats();
        
        if (response.success && response.data) {
            const data = response.data;
            
            // Get stat items
            const statItems = document.querySelectorAll('.stat-item');
            
            if (statItems.length >= 3) {
                // Update Days Active
                const daysActiveValue = statItems[0].querySelector('.stat-value');
                if (daysActiveValue) {
                    daysActiveValue.textContent = data.days_active;
                }
                
                // Update Sessions
                const sessionsValue = statItems[1].querySelector('.stat-value');
                if (sessionsValue) {
                    sessionsValue.textContent = data.total_sessions;
                }
                
                // Update Health Score
                const healthScoreValue = statItems[2].querySelector('.stat-value');
                if (healthScoreValue) {
                    healthScoreValue.textContent = `${data.health_score}%`;
                }
            }
            
            console.log('✅ Profile stats loaded:', data);
        }
    } catch (error) {
        console.error('Error loading profile stats:', error);
    }
}
