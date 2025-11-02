/**
 * Global Loading Overlay Utility
 * Provides a consistent loading experience across all pages
 */

class LoadingOverlay {
    constructor() {
        this.overlay = null;
        this.isVisible = false;
        this.init();
    }

    init() {
        this.createOverlay();
        this.setupGlobalButtonHandlers();
    }

    createOverlay() {
        // Create loading overlay HTML
        this.overlay = document.createElement('div');
        this.overlay.id = 'globalLoadingOverlay';
        this.overlay.className = 'loading-overlay';
        this.overlay.style.display = 'none';
        this.overlay.innerHTML = `
            <div class="loading-spinner">
                <i class="fas fa-spinner"></i>
                <p>Loading...</p>
            </div>
        `;
        
        // Add to body
        document.body.appendChild(this.overlay);
    }

    show(message = 'Loading...') {
        if (this.overlay) {
            // Update message if provided
            const messageElement = this.overlay.querySelector('p');
            if (messageElement) {
                messageElement.textContent = message;
            }
            
            this.overlay.style.display = 'flex';
            this.isVisible = true;
            
            // Add body class to prevent scrolling
            document.body.classList.add('loading-active');
        }
    }

    hide() {
        if (this.overlay) {
            this.overlay.style.display = 'none';
            this.isVisible = false;
            
            // Remove body class
            document.body.classList.remove('loading-active');
        }
    }

    setupGlobalButtonHandlers() {
        // Handle all button clicks globally
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (!button) return;

            // Skip if button is disabled
            if (button.disabled) return;

            // Skip certain buttons that shouldn't show loading
            const skipButtons = [
                'closeModal', 'closeViewModal', 'closeDeleteModal',
                'cancelBtn', 'cancelDeleteBtn', 'closeViewBtn',
                'close', 'close-btn'
            ];
            
            if (skipButtons.some(id => button.id === id || button.classList.contains(id))) {
                return;
            }

            // Skip buttons that are already showing loading
            if (button.classList.contains('loading') || button.querySelector('.loading')) {
                return;
            }

            // Show loading for buttons that trigger async operations
            if (this.shouldShowLoading(button)) {
                this.showLoadingForButton(button);
            }
        });

        // Handle form submissions
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.tagName === 'FORM') {
                this.show('Processing...');
            }
        });
    }

    shouldShowLoading(button) {
        // Skip primary buttons - they shouldn't show loading spinners
        if (button.classList.contains('btn-primary')) {
            return false;
        }
        
        // Skip action buttons - they shouldn't show loading spinners
        if (button.classList.contains('action-btn')) {
            return false;
        }
        
        // Skip danger buttons - they shouldn't show loading spinners
        if (button.classList.contains('btn-danger')) {
            return false;
        }

        // Check if button triggers async operations
        const asyncActions = [
            'addScheduleBtn', 'saveBtn', 'submitBtn', 'save',
            'add', 'create', 'update', 'edit', 'delete', 'remove',
            'load', 'refresh', 'search', 'filter', 'toggle',
            'login', 'logout', 'register', 'reset'
        ];

        const buttonText = button.textContent.toLowerCase();
        const buttonId = button.id.toLowerCase();
        const buttonClass = button.className.toLowerCase();

        return asyncActions.some(action => 
            buttonText.includes(action) || 
            buttonId.includes(action) || 
            buttonClass.includes(action)
        );
    }

    showLoadingForButton(button) {
        // Store original content
        const originalContent = button.innerHTML;
        const originalDisabled = button.disabled;

        // Show loading state
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        button.classList.add('loading');

        // Show global overlay
        this.show('Processing...');

        // Auto-hide after 3 seconds if not manually hidden
        setTimeout(() => {
            if (this.isVisible) {
                this.hide();
                this.restoreButton(button, originalContent, originalDisabled);
            }
        }, 3000);
    }

    restoreButton(button, originalContent, originalDisabled) {
        button.innerHTML = originalContent;
        button.disabled = originalDisabled;
        button.classList.remove('loading');
    }

    // Public methods for manual control
    showWithMessage(message) {
        this.show(message);
    }

    hideOverlay() {
        this.hide();
    }

    // Method to show loading for specific operations
    showForOperation(operation, duration = 2000) {
        const messages = {
            'save': 'Saving...',
            'load': 'Loading...',
            'delete': 'Deleting...',
            'update': 'Updating...',
            'create': 'Creating...',
            'search': 'Searching...',
            'filter': 'Filtering...',
            'login': 'Signing in...',
            'logout': 'Signing out...',
            'refresh': 'Refreshing...'
        };

        this.show(messages[operation] || 'Processing...');
        
        if (duration > 0) {
            setTimeout(() => this.hide(), duration);
        }
    }
}

// Initialize global loading overlay
let globalLoadingOverlay;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    globalLoadingOverlay = new LoadingOverlay();
});

// Export for use in other scripts
window.LoadingOverlay = LoadingOverlay;
window.showLoading = (message) => globalLoadingOverlay?.show(message);
window.hideLoading = () => globalLoadingOverlay?.hide();
window.showLoadingForOperation = (operation, duration) => globalLoadingOverlay?.showForOperation(operation, duration);

