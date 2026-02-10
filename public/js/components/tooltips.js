/**
 * Tooltips Component
 * Handles tooltip display for help icons
 */

// Initialize tooltips when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initTooltips();
});

/**
 * Initialize all tooltips on the page
 */
function initTooltips() {
    const helpIcons = document.querySelectorAll('[data-tooltip]');
    
    helpIcons.forEach(icon => {
        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = icon.getAttribute('data-tooltip');
        document.body.appendChild(tooltip);
        
        // Show tooltip on hover
        icon.addEventListener('mouseenter', function(e) {
            const text = this.getAttribute('data-tooltip');
            tooltip.textContent = text;
            tooltip.style.display = 'block';
            positionTooltip(tooltip, this);
        });
        
        icon.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
        });
        
        icon.addEventListener('mousemove', function(e) {
            positionTooltip(tooltip, this);
        });
    });
}

/**
 * Position tooltip relative to icon
 */
function positionTooltip(tooltip, icon) {
    const rect = icon.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Position above the icon by default
    let top = rect.top - tooltipRect.height - 8;
    let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    
    // Adjust if tooltip goes off screen
    if (top < 0) {
        top = rect.bottom + 8;
    }
    
    if (left < 10) {
        left = 10;
    } else if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    
    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
}

/**
 * Toggle help guide visibility
 */
function toggleHelp() {
    const helpGuide = document.getElementById('helpGuide');
    if (helpGuide) {
        if (helpGuide.style.display === 'none') {
            helpGuide.style.display = 'block';
            helpGuide.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            helpGuide.style.display = 'none';
        }
    }
}
