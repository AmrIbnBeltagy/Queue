// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkExistingSession();
});

// Setup event listeners
function setupEventListeners() {
    // Form submission
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Toggle password visibility
    document.getElementById('togglePassword').addEventListener('click', togglePassword);
    
    // Test account buttons
    document.querySelectorAll('.test-account-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const username = this.getAttribute('data-username');
            const password = this.getAttribute('data-password');
            fillCredentials(username, password);
        });
    });
    
    // Remember me checkbox
    const savedUsername = localStorage.getItem('rememberedUsername');
    if (savedUsername) {
        document.getElementById('username').value = savedUsername;
        document.getElementById('rememberMe').checked = true;
    }
}

// Check if user is already logged in
function checkExistingSession() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (token && user) {
        // Redirect to dashboard
        window.location.href = 'today-physician-schedule.html';
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    const loginBtn = document.getElementById('loginBtn');
    const loadingOverlay = document.getElementById('loadingOverlay');
    
    // Validation
    if (!username || !password) {
        showMessage('Please enter both username and password', 'error');
        return;
    }
    
    // Disable button and show loading
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';
    loadingOverlay.style.display = 'flex';
    
    try {
        // For now, simulate authentication (you'll need to implement actual backend authentication)
        // This is a temporary solution for demonstration
        await simulateLogin(username, password);
        
        // Save credentials if remember me is checked
        if (rememberMe) {
            localStorage.setItem('rememberedUsername', username);
        } else {
            localStorage.removeItem('rememberedUsername');
        }
        
        showMessage('Login successful! Redirecting...', 'success');
        
        // Get user data
        const userData = JSON.parse(localStorage.getItem('currentUser'));
        
        // Redirect based on role
        setTimeout(() => {
            if (userData.role === 'agent') {
                window.location.href = 'agent-counters.html';
            } else if (userData.role === 'preparation') {
                window.location.href = 'fulfillment-dashboard.html';
            } else {
                window.location.href = 'today-physician-schedule.html';
            }
        }, 1500);
        
    } catch (error) {
        console.error('Login error:', error);
        showMessage(error.message || 'Invalid username or password', 'error');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        loadingOverlay.style.display = 'none';
    }
}

// Authenticate with real backend API
async function simulateLogin(username, password) {
    try {
        // Try to find user by username or email
        const response = await fetch(`${API_BASE_URL}/users/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const result = await response.json();
        
        if (result.success && result.data) {
            const user = result.data;
            // Store authentication token and user data
            const token = result.token || btoa(`${username}:${Date.now()}`);
            localStorage.setItem('authToken', token);
            localStorage.setItem('currentUser', JSON.stringify({
                id: user._id,
                username: user.username,
                role: user.role,
                name: user.name,
                email: user.email
            }));
            return user;
        } else {
            throw new Error(result.message || 'Invalid username or password');
        }
    } catch (error) {
        console.error('Login error:', error);
        throw new Error('Invalid username or password');
    }
}

// Toggle password visibility
function togglePassword() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('togglePassword');
    
    if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        passwordInput.type = 'password';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// Fill credentials from test account buttons
function fillCredentials(username, password) {
    document.getElementById('username').value = username;
    document.getElementById('password').value = password;
    
    // Add visual feedback
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.style.borderColor = '#28a745';
        setTimeout(() => {
            input.style.borderColor = '';
        }, 1000);
    });
}

// Show message notification
function showMessage(message, type = 'info') {
    const notification = document.createElement('div');
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#17a2b8'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle';
    notification.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Add slide animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100px);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100px);
        }
    }
`;
document.head.appendChild(style);

