/**
 * Bottom Navigation Bar Component
 * Dynamically renders the navigation bar
 */

// Navigation items configuration
const navItems = [
    {
        icon: 'fas fa-home',
        label: 'Home',
        href: '/dashboard',
        id: 'nav-home'
    },
    {
        icon: 'fas fa-chart-line',
        label: 'Analytics',
        href: '/analytics',
        id: 'nav-analytics'
    },
    {
        icon: 'fas fa-heartbeat',
        label: 'Health',
        href: '/health',
        id: 'nav-health'
    },
    {
        icon: 'fas fa-robot',
        label: 'AI',
        href: '/gemini-chat',
        id: 'nav-recommendations'
    },
    {
        icon: 'fas fa-user',
        label: 'Profile',
        href: '/profile',
        id: 'nav-profile'
    }
];

/**
 * Initialize and render the bottom navigation bar
 */
function initBottomNav() {
    const navElement = document.getElementById('bottomNav');
    if (!navElement) return;
    
    // Get current page to set active state
    const currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
    
    // Create navigation container
    const navContainer = document.createElement('div');
    navContainer.className = 'nav-container';
    
    // Create navigation items
    navItems.forEach(item => {
        const navItem = document.createElement('a');
        navItem.href = item.href;
        navItem.className = 'nav-item';
        navItem.id = item.id;

        // Active state (Laravel-friendly)
        if (window.location.pathname === item.href) {
            navItem.classList.add('active');
        }

        const icon = document.createElement('i');
        icon.className = item.icon;

        const label = document.createElement('span');
        label.textContent = item.label;

        navItem.appendChild(icon);
        navItem.appendChild(label);
        navContainer.appendChild(navItem);
    });

    
    // Append container to nav element
    navElement.appendChild(navContainer);
}

// Initialize navigation when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initBottomNav();
});
