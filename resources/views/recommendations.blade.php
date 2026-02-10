<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SYNAGLO - Health Recommendations</title>
    <link rel="stylesheet" href="{{ asset('css/styles.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <!-- Top Header -->
    <header class="top-header">
        <div class="header-content">
            <div class="header-title">
                <div class="logo-container">
                    <img src="{{ asset('images/logo.png') }}" alt="SYNAGLO Logo" class="header-logo-small">
                    <div class="logo-text">
                        <h1>Health Recommendations</h1>
                        <p class="subtitle">Personal suggestions for your health</p>
                    </div>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="main-content">
        <!-- Recommendations Section -->
        <section class="recommendations-section">
            <div class="recommendations-card">
                <div class="recommendations-header">
                    <div class="recommendations-icon-container">
                        <i class="fas fa-user-md"></i>
                    </div>
                    <div class="recommendations-header-text">
                        <h3>Personal Recommendations</h3>
                        <p>Based on analysis of your health data</p>
                    </div>
                </div>
                
                <div class="recommendations-list" id="recommendationsList">
                    <!-- Loading state -->
                    <div class="recommendations-loading" id="recommendationsLoading">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Loading personal health recommendations...</p>
                    </div>
                </div>
                
                <div class="recommendations-footer">
                    <p class="recommendations-update-info">
                        <i class="fas fa-sync-alt"></i>
                        Recommendations are updated periodically based on your latest health data
                    </p>
                </div>
            </div>
        </section>
    </main>

    <!-- Bottom Navigation Bar -->
    <nav class="bottom-nav" id="bottomNav"></nav>

    <!-- Auth Guard - must be loaded first -->
    <script src="{{ asset('js/components/auth-guard.js') }}"></script>
    <script src="{{ asset('js/app.js') }}"></script>
    <script src="{{ asset('js/components/navbar.js') }}"></script>
    <script src="{{ asset('js/components/tooltips.js') }}"></script>
    <script src="{{ asset('js/components/gemini-integration.js') }}"></script>
    <script>
        /**
         * Load and display AI-generated recommendations
         */
        async function loadRecommendations() {
            try {
                // Import Firebase auth module
                const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js");
                
                // Load Firebase config from centralized file
                const { initializeFirebase } = await import("./components/firebase-loader.js");
                const { auth } = await initializeFirebase();

                // Wait for auth state
                onAuthStateChanged(auth, async (user) => {
                    if (!user) {
                        console.log('No user logged in');
                        return;
                    }

                    // Show loading state
                    const loadingEl = document.getElementById('recommendationsLoading');
                    if (loadingEl) {
                        loadingEl.style.display = 'flex';
                        loadingEl.style.flexDirection = 'column';
                        loadingEl.style.alignItems = 'center';
                        loadingEl.style.gap = 'var(--spacing-md)';
                        loadingEl.style.padding = 'var(--spacing-xl)';
                    }

                    // Check if user has recording data first
                    const healthData = await window.geminiIntegration.getUserHealthData(user.uid);
                    
                    if (!healthData || !healthData.recordings || healthData.recordings.length === 0) {
                        // Hide loading state
                        if (loadingEl) {
                            loadingEl.style.display = 'none';
                        }
                        
                        // Show "No recording data" message
                        const container = document.getElementById('recommendationsList');
                        if (container) {
                            container.innerHTML = `
                                <div class="recommendations-no-data">
                                    <i class="fas fa-clipboard-list"></i>
                                    <h3>No Recording Data Available</h3>
                                    <p>Start recording your health data to receive personalized AI recommendations.</p>
                                    <p class="recommendations-hint">Go to the Health page and start a recording session to begin tracking your health metrics.</p>
                                </div>
                            `;
                        }
                        return;
                    }

                    // Generate recommendations using Gemini AI
                    const recommendations = await window.geminiIntegration.generateHealthRecommendations(user.uid);

                    // Hide loading state
                    if (loadingEl) {
                        loadingEl.style.display = 'none';
                    }

                    // Display recommendations
                    if (recommendations && recommendations.length > 0) {
                        window.geminiIntegration.displayRecommendations(recommendations, 'recommendationsList');
                    } else {
                        // Show error message
                        const container = document.getElementById('recommendationsList');
                        if (container) {
                            container.innerHTML = `
                                <div class="recommendations-error">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    <p>Failed to load recommendations. Please try again later.</p>
                                </div>
                            `;
                        }
                    }
                });
            } catch (error) {
                console.error('Error loading recommendations:', error);
                
                // Hide loading and show error
                const loadingEl = document.getElementById('recommendationsLoading');
                if (loadingEl) {
                    loadingEl.style.display = 'none';
                }
                
                const container = document.getElementById('recommendationsList');
                if (container) {
                    container.innerHTML = `
                        <div class="recommendations-error">
                            <i class="fas fa-exclamation-triangle"></i>
                            <p>Failed to load recommendations. Please try again later.</p>
                        </div>
                    `;
                }
            }
        }

        // Load recommendations when page loads
        document.addEventListener('DOMContentLoaded', () => {
            loadRecommendations();
        });
    </script>
    <style>
        .recommendations-loading {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-xl);
            gap: var(--spacing-md);
            color: var(--text-secondary);
        }

        .recommendations-loading i {
            font-size: 2rem;
            color: var(--primary-color);
        }

        .recommendations-error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-xl);
            gap: var(--spacing-md);
            color: var(--text-secondary);
            text-align: center;
        }

        .recommendations-error i {
            font-size: 2rem;
            color: #ef4444;
        }

        .recommendations-no-data {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: var(--spacing-xl);
            gap: var(--spacing-md);
            color: var(--text-secondary);
            text-align: center;
        }

        .recommendations-no-data i {
            font-size: 3rem;
            color: var(--text-secondary);
            margin-bottom: var(--spacing-sm);
        }

        .recommendations-no-data h3 {
            color: var(--text-primary);
            margin: var(--spacing-sm) 0;
            font-size: 1.25rem;
        }

        .recommendations-no-data p {
            color: var(--text-secondary);
            line-height: 1.6;
            max-width: 500px;
        }

        .recommendations-hint {
            margin-top: var(--spacing-md);
            font-size: 0.9rem;
            color: var(--text-secondary);
            font-style: italic;
        }
    </style>
</body>
</html>
