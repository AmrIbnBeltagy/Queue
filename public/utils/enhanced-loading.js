/**
 * Enhanced Loading Integration
 * Provides additional loading controls for specific page operations
 */

class EnhancedLoading {
    constructor() {
        this.operationTimeouts = new Map();
        this.init();
    }

    init() {
        this.setupFormLoading();
        this.setupAPILoading();
        this.setupNavigationLoading();
        this.setupTableLoading();
    }

    // Setup loading for form submissions
    setupFormLoading() {
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.tagName === 'FORM') {
                this.showFormLoading(form);
            }
        });
    }

    // Setup loading for API calls
    setupAPILoading() {
        // Override fetch to show loading for API calls
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const url = args[0];
            
            // Show loading for API calls
            if (typeof url === 'string' && (url.includes('/api/') || url.includes('localhost:3000'))) {
                this.showAPILoading(url);
            }
            
            try {
                const response = await originalFetch(...args);
                this.hideAPILoading();
                return response;
            } catch (error) {
                this.hideAPILoading();
                throw error;
            }
        };
    }

    // Setup loading for navigation
    setupNavigationLoading() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && !link.href.startsWith('#')) {
                this.showNavigationLoading(link);
            }
        });
    }

    // Setup loading for table data loading
    setupTableLoading() {
        this.setupTableRefreshLoading();
        this.setupTableSearchLoading();
        this.setupTableFilterLoading();
        this.setupTablePaginationLoading();
    }

    // Setup loading for table refresh operations
    setupTableRefreshLoading() {
        // Monitor for table refresh buttons
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && this.isTableRefreshButton(button)) {
                this.showTableLoading(button, 'Refreshing data...');
            }
        });
    }

    // Setup loading for table search operations
    setupTableSearchLoading() {
        // Monitor search inputs
        document.addEventListener('input', (e) => {
            if (e.target.matches('input[type="search"], input[placeholder*="search" i], input[id*="search" i]')) {
                this.showTableSearchLoading(e.target);
            }
        });
    }

    // Setup loading for table filter operations
    setupTableFilterLoading() {
        // Monitor filter dropdowns and buttons
        document.addEventListener('change', (e) => {
            if (e.target.matches('select[id*="filter" i], select[id*="Filter"]')) {
                this.showTableFilterLoading(e.target);
            }
        });
    }

    // Setup loading for table pagination
    setupTablePaginationLoading() {
        // Monitor pagination buttons
        document.addEventListener('click', (e) => {
            const button = e.target.closest('button');
            if (button && this.isPaginationButton(button)) {
                this.showTablePaginationLoading(button);
            }
        });
    }

    // Show loading for form submission
    showFormLoading(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            this.showButtonLoading(submitBtn, 'Saving...');
        } else {
            showLoading('Processing form...');
        }
    }

    // Show loading for API calls
    showAPILoading(url) {
        const operation = this.getOperationFromURL(url);
        showLoadingForOperation(operation, 0); // Don't auto-hide
    }

    // Hide API loading
    hideAPILoading() {
        hideLoading();
    }

    // Show loading for table operations
    showTableLoading(button, message) {
        this.showButtonLoading(button, message);
        showLoading(message);
    }

    // Show loading for table search
    showTableSearchLoading(input) {
        // Debounce search loading
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            showLoading('Searching...');
            // Auto-hide after 1 second
            setTimeout(() => hideLoading(), 1000);
        }, 300);
    }

    // Show loading for table filter
    showTableFilterLoading(select) {
        showLoading('Filtering data...');
        // Auto-hide after 1 second
        setTimeout(() => hideLoading(), 1000);
    }

    // Show loading for table pagination
    showTablePaginationLoading(button) {
        this.showButtonLoading(button, 'Loading page...');
        showLoading('Loading page...');
    }

    // Check if button is a table refresh button
    isTableRefreshButton(button) {
        const refreshKeywords = ['refresh', 'reload', 'update', 'sync'];
        const buttonText = button.textContent.toLowerCase();
        const buttonId = button.id.toLowerCase();
        const buttonClass = button.className.toLowerCase();
        
        return refreshKeywords.some(keyword => 
            buttonText.includes(keyword) || 
            buttonId.includes(keyword) || 
            buttonClass.includes(keyword)
        );
    }

    // Check if button is a pagination button
    isPaginationButton(button) {
        const paginationKeywords = ['page', 'next', 'prev', 'previous', 'first', 'last'];
        const buttonText = button.textContent.toLowerCase();
        const buttonId = button.id.toLowerCase();
        const buttonClass = button.className.toLowerCase();
        
        return paginationKeywords.some(keyword => 
            buttonText.includes(keyword) || 
            buttonId.includes(keyword) || 
            buttonClass.includes(keyword)
        );
    }

    // Show loading for navigation
    showNavigationLoading(link) {
        const pageName = this.getPageNameFromURL(link.href);
        showLoading(`Navigating to ${pageName}...`);
        
        // Auto-hide after 2 seconds
        setTimeout(() => {
            hideLoading();
        }, 2000);
    }

    // Show button loading state
    showButtonLoading(button, text = 'Loading...') {
        const originalContent = button.innerHTML;
        const originalDisabled = button.disabled;
        
        button.disabled = true;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
        button.classList.add('loading');
        
        // Store original state
        button.dataset.originalContent = originalContent;
        button.dataset.originalDisabled = originalDisabled;
        
        // Auto-restore after 5 seconds
        setTimeout(() => {
            this.restoreButton(button);
        }, 5000);
    }

    // Restore button to original state
    restoreButton(button) {
        if (button.dataset.originalContent) {
            button.innerHTML = button.dataset.originalContent;
            button.disabled = button.dataset.originalDisabled === 'true';
            button.classList.remove('loading');
            
            delete button.dataset.originalContent;
            delete button.dataset.originalDisabled;
        }
    }

    // Get operation name from URL
    getOperationFromURL(url) {
        if (url.includes('login')) return 'login';
        if (url.includes('logout')) return 'logout';
        if (url.includes('save') || url.includes('create')) return 'save';
        if (url.includes('update') || url.includes('edit')) return 'update';
        if (url.includes('delete')) return 'delete';
        if (url.includes('load') || url.includes('get')) return 'load';
        if (url.includes('search')) return 'search';
        if (url.includes('filter')) return 'filter';
        return 'processing';
    }

    // Get page name from URL
    getPageNameFromURL(url) {
        const path = url.split('/').pop().replace('.html', '');
        const pageNames = {
            'index': 'Dashboard',
            'admin-users': 'User Management',
            'doctors': 'Doctor Management',
            'degrees': 'Degree Management',
            'specialities': 'Speciality Management',
            'locations': 'Location Management',
            'clinics': 'Clinic Management',
            'monitors': 'Monitor Management',
            'physician-schedule': 'Physician Schedule',
            'login': 'Login Page'
        };
        return pageNames[path] || path.charAt(0).toUpperCase() + path.slice(1);
    }

    // Show loading for table data loading
    showTableDataLoading(tableId, message = 'Loading data...') {
        const table = document.getElementById(tableId) || document.querySelector(`#${tableId}`);
        if (table) {
            this.addTableLoadingOverlay(table, message);
        } else {
            showLoading(message);
        }
    }

    // Add loading overlay to specific table
    addTableLoadingOverlay(table, message) {
        // Remove existing overlay if any
        this.removeTableLoadingOverlay(table);
        
        const overlay = document.createElement('div');
        overlay.className = 'table-loading-overlay';
        overlay.innerHTML = `
            <div class="table-loading-spinner">
                <i class="fas fa-spinner fa-spin"></i>
                <p>${message}</p>
            </div>
        `;
        
        table.style.position = 'relative';
        table.appendChild(overlay);
    }

    // Remove loading overlay from table
    removeTableLoadingOverlay(table) {
        const existingOverlay = table.querySelector('.table-loading-overlay');
        if (existingOverlay) {
            existingOverlay.remove();
        }
    }

    // Show loading for table row operations
    showTableRowLoading(row, message = 'Processing...') {
        const originalContent = row.innerHTML;
        row.innerHTML = `
            <td colspan="100%" style="text-align: center; padding: 20px;">
                <i class="fas fa-spinner fa-spin"></i> ${message}
            </td>
        `;
        row.classList.add('loading-row');
        row.dataset.originalContent = originalContent;
    }

    // Restore table row
    restoreTableRow(row) {
        if (row.dataset.originalContent) {
            row.innerHTML = row.dataset.originalContent;
            row.classList.remove('loading-row');
            delete row.dataset.originalContent;
        }
    }

    // Public methods for manual control
    showLoadingForButton(button, message) {
        this.showButtonLoading(button, message);
    }

    showLoadingForOperation(operation, duration = 2000) {
        showLoadingForOperation(operation, duration);
    }

    hideAllLoading() {
        hideLoading();
        // Restore all buttons
        document.querySelectorAll('button.loading').forEach(button => {
            this.restoreButton(button);
        });
        // Remove all table overlays
        document.querySelectorAll('.table-loading-overlay').forEach(overlay => {
            overlay.remove();
        });
    }
}

// Initialize enhanced loading
let enhancedLoading;

document.addEventListener('DOMContentLoaded', function() {
    enhancedLoading = new EnhancedLoading();
});

// Export for use in other scripts
window.EnhancedLoading = EnhancedLoading;
window.showButtonLoading = (button, message) => enhancedLoading?.showButtonLoading(button, message);
window.showTableDataLoading = (tableId, message) => enhancedLoading?.showTableDataLoading(tableId, message);
window.showTableRowLoading = (row, message) => enhancedLoading?.showTableRowLoading(row, message);
window.removeTableLoadingOverlay = (table) => enhancedLoading?.removeTableLoadingOverlay(table);
window.hideAllLoading = () => enhancedLoading?.hideAllLoading();
