// Global Header Component
class GlobalHeader {
    constructor() {
        this.currentPage = this.getCurrentPage();
        this.init();
        // Make instance globally accessible for testing
        window.globalHeader = this;
    }

    // Get current page name from URL
    getCurrentPage() {
        const path = window.location.pathname;
        const page = path.split('/').pop().replace('.html', '');
        return page;
    }

    // Initialize the global header
    init() {
        this.loadHeader();
        this.setupEventListeners();
        this.setActiveNavigation();
        this.ensureFavicon();
    }

    // Load the header HTML
    async loadHeader() {
        try {
            const response = await fetch('components/global-header.html');
            const headerHTML = await response.text();
            
            // Insert header at the beginning of body
            document.body.insertAdjacentHTML('afterbegin', headerHTML);
            
            // Setup user info after header is loaded
            setTimeout(() => {
                this.setupUserInfo();
                this.setupLogout();
            }, 100);
        } catch (error) {
            console.error('Error loading global header:', error);
        }
    }

    // Ensure a favicon exists to avoid 404s
    ensureFavicon() {
        try {
            const existing = document.querySelector('link[rel="icon"]');
            if (!existing) {
                const link = document.createElement('link');
                link.rel = 'icon';
                // Simple inline SVG favicon (blue circle with white H)
                const svg = encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" ry="12" fill="#2c3e50"/><text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" fill="#ffffff">Q</text></svg>');
                link.href = `data:image/svg+xml,${svg}`;
                document.head.appendChild(link);
            }
        } catch (e) {
            // no-op
        }
    }

    // Setup event listeners for navigation
    setupEventListeners() {
        // Wait for DOM to be ready
        document.addEventListener('DOMContentLoaded', () => {
            this.setupDropdowns();
        });
    }

    // Setup dropdown functionality
    setupDropdowns() {
        const dropdownToggles = document.querySelectorAll('.nav-item.has-dropdown');
        
        dropdownToggles.forEach(toggle => {
            const link = toggle.querySelector('.nav-link');
            const dropdown = toggle.querySelector('.dropdown-menu');
            
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Close other dropdowns
                dropdownToggles.forEach(otherToggle => {
                    if (otherToggle !== toggle) {
                        otherToggle.classList.remove('active');
                    }
                });
                
                // Toggle current dropdown
                toggle.classList.toggle('active');
            });
        });

        // Close dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.nav-item.has-dropdown')) {
                dropdownToggles.forEach(toggle => {
                    toggle.classList.remove('active');
                });
            }
        });
    }

    // Setup user info display
    setupUserInfo() {
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        
        console.log('Setting up user info...', { userInfo, userName });
        
        if (userInfo && userName) {
            // Load user info from localStorage or API
            const currentUser = this.getCurrentUser();
            console.log('Current user:', currentUser);
            userName.textContent = currentUser;
            
            // Add click handler for user info dropdown (optional)
            userInfo.addEventListener('click', (e) => {
                e.preventDefault();
                this.showUserDropdown();
            });
            
            // Update user info periodically
            setInterval(() => {
                const updatedUser = this.getCurrentUser();
                if (userName.textContent !== updatedUser) {
                    userName.textContent = updatedUser;
                }
            }, 5000); // Check every 5 seconds
        } else {
            console.error('User info elements not found:', { userInfo, userName });
        }
    }

    // Get current user info
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('currentUser');
            console.log('User data from localStorage:', userData);
            
            if (userData) {
                const user = JSON.parse(userData);
                console.log('Parsed user object:', user);
                // Return the best available name
                const userName = user.name || user.fullName || user.username || user.email || 'Admin';
                console.log('Selected user name:', userName);
                return userName;
            }
        } catch (error) {
            console.error('Error getting current user:', error);
        }
        console.log('No user data found, returning default');
        return 'Admin';
    }

    // Get detailed user info
    getDetailedUserInfo() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                const user = JSON.parse(userData);
                return {
                    name: user.name || user.fullName || user.username || 'Admin',
                    email: user.email || '',
                    role: user.role || 'User',
                    avatar: user.avatar || user.profilePicture || ''
                };
            }
        } catch (error) {
            console.error('Error getting detailed user info:', error);
        }
        return {
            name: 'Admin',
            email: '',
            role: 'Admin',
            avatar: ''
        };
    }

    // Setup logout functionality
    setupLogout() {
        const logoutBtn = document.getElementById('logoutBtn');
        
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    // Show user dropdown (optional feature)
    showUserDropdown() {
        const userInfo = this.getDetailedUserInfo();
        
        // Create a simple alert for now (can be enhanced with a proper dropdown)
        const message = `Logged in as: ${userInfo.name}\nRole: ${userInfo.role}${userInfo.email ? `\nEmail: ${userInfo.email}` : ''}`;
        alert(message);
    }

    // Handle logout
    handleLogout() {
        // Clear user data
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        
        // Redirect to login page
        window.location.href = 'login.html';
    }

    // Set active navigation based on current page
    setActiveNavigation() {
        // Wait for header to be loaded
        setTimeout(() => {
            const navItems = document.querySelectorAll('.nav-item');
            const menuLinks = document.querySelectorAll('.dropdown-menu a');
            
            // Remove active class from all items
            navItems.forEach(item => item.classList.remove('active'));
            menuLinks.forEach(link => link.classList.remove('active'));
            
            // Set active based on current page
            this.setActiveForPage(this.currentPage);
        }, 100);
    }

    // Set active navigation for specific page
    setActiveForPage(pageName) {
        const pageMap = {
            'today-physician-schedule': { section: 'queue', item: 'today-physician-schedule.html' },
            'admin-users': { section: 'people', item: 'admin-users.html' },
            'doctors': { section: 'people', item: 'doctors.html' },
            'degrees': { section: 'management', item: 'degrees.html' },
            'specialities': { section: 'management', item: 'specialities.html' },
            'locations': { section: 'management', item: 'locations.html' },
            'clinics': { section: 'management', item: 'clinics.html' },
            'monitors': { section: 'management', item: 'monitors.html' },
            'physician-schedule': { section: 'management', item: 'physician-schedule.html' }
        };

        const pageConfig = pageMap[pageName];
        if (pageConfig) {
            // Set active section
            const sectionItems = document.querySelectorAll('.nav-item');
            sectionItems.forEach(item => {
                const link = item.querySelector('.nav-link span');
                if (link && link.textContent.toLowerCase() === pageConfig.section) {
                    item.classList.add('active');
                }
            });

            // Set active menu item
            const menuLinks = document.querySelectorAll('.dropdown-menu a');
            menuLinks.forEach(link => {
                if (link.getAttribute('href') === pageConfig.item) {
                    link.classList.add('active');
                }
            });
        }
    }
}

// Initialize global header when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new GlobalHeader();
});
