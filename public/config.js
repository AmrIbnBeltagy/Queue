// Global Configuration - Dynamic API URL
const API_BASE_URL = (() => {
    const hostname = window.location.hostname;
    
    // Check if running locally
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:3000/api';
    }
    
    // Production URL
    return 'https://shippingproject-1o44.onrender.com/api';
})();

// App Pages Configuration
const APP_PAGES = {
    // Authentication
    LOGIN: 'login.html',
    
    // Dashboards
    DASHBOARD: 'today-physician-schedule.html',
    AGENT_DASHBOARD: 'agent-dashboard.html',
    FULFILLMENT_DASHBOARD: 'fulfillment-dashboard.html',
    
    // Orders
    TEST_ORDERS: 'test-orders.html',
    
    // People Management
    ADMIN_USERS: 'admin-users.html',
    DOCTORS: 'doctors.html',
    
    // Management
    PHYSICIAN_SCHEDULE: 'pages/physician-schedule.html'
};

// User Roles
const USER_ROLES = {
    ADMIN: 'admin',
    AGENT: 'agent',
    PREPARATION: 'preparation',
    MANAGER: 'manager'
};

// Role-based page redirects
const ROLE_REDIRECTS = {
    [USER_ROLES.ADMIN]: APP_PAGES.DASHBOARD,
    [USER_ROLES.AGENT]: APP_PAGES.AGENT_DASHBOARD,
    [USER_ROLES.PREPARATION]: APP_PAGES.FULFILLMENT_DASHBOARD,
    [USER_ROLES.MANAGER]: APP_PAGES.DASHBOARD
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API_BASE_URL, APP_PAGES, USER_ROLES, ROLE_REDIRECTS };
}

