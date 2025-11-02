// Show page after authentication check passed
document.body.classList.add('authenticated');

// State
let configurations = [];
let configurationsByCategory = {};
let currentUserId = null;

// API Endpoints
const CONFIG_API = `${API_BASE_URL}/configuration`;

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    // Check role-based access
    if (!checkRoleAccess()) {
        return;
    }
    
    // Add timeout to prevent infinite loading
    setTimeout(() => {
        const loadingState = document.getElementById('loadingState');
        if (loadingState && loadingState.style.display !== 'none') {
            console.log('Configuration loading timeout - showing no config message');
            showNoConfigMessage();
        }
    }, 10000); // 10 second timeout
    
    loadConfigurations();
    loadStatistics();
    setupEventListeners();
    
        // Add event listener for queue configuration button
        const queueConfigBtn = document.getElementById('queueConfigBtn');
        if (queueConfigBtn) {
            queueConfigBtn.addEventListener('click', function() {
                initializeQueueConfiguration();
            });
        }
    
    // Add event listener for initialize defaults button
    const initializeDefaultsBtn = document.getElementById('initializeDefaultsBtn');
    if (initializeDefaultsBtn) {
        initializeDefaultsBtn.addEventListener('click', async function() {
            await initializeDefaults();
        });
    }
});

// Check role-based access control
function checkRoleAccess() {
    try {
        const userData = localStorage.getItem('currentUser');
        if (!userData) {
            window.location.href = 'login.html';
            return false;
        }
        
        const user = JSON.parse(userData);
        
        // Only admin and manager can access configuration
        if (user.role !== 'admin' && user.role !== 'manager') {
            showNotification('Access restricted. Only administrators can access system configuration.', 'error');
            setTimeout(() => {
                window.location.href = 'today-physician-schedule.html';
            }, 2000);
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('Error checking role access:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Load configurations from API
async function loadConfigurations() {
    try {
        showLoading('Loading configurations...');
        
        console.log('Fetching configurations from:', CONFIG_API);
        
        const response = await fetch(CONFIG_API);
        console.log('Configuration API response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Configuration API result:', result);
        
        if (result.success) {
            configurations = result.data || [];
            console.log('Loaded configurations:', configurations);
            
            // If no configurations exist, show the no config message
            if (configurations.length === 0) {
                console.log('No configurations found, showing no config message');
                showNoConfigMessage();
                return;
            }
            
            groupConfigurationsByCategory();
            displayConfigurations();
            loadStatistics();
        } else {
            console.error('API returned error:', result.message);
            showNotification('Error loading configurations: ' + result.message, 'error');
            showNoConfigMessage();
        }
    } catch (error) {
        console.error('Error loading configurations:', error);
        showNotification('Error loading configurations. Please try again.', 'error');
        showNoConfigMessage();
    } finally {
        hideLoading();
    }
}

// Load statistics
function loadStatistics() {
    try {
        const totalConfigs = configurations.length;
        const printingConfigs = configurations.filter(c => c.category === 'printing').length;
        const schedulingConfigs = configurations.filter(c => c.category === 'scheduling').length;
        const securityConfigs = configurations.filter(c => c.category === 'security').length;
        
        // Update statistics cards
        const totalConfigsElement = document.getElementById('totalConfigs');
        const printingConfigsElement = document.getElementById('printingConfigs');
        const schedulingConfigsElement = document.getElementById('schedulingConfigs');
        const securityConfigsElement = document.getElementById('securityConfigs');
        
        if (totalConfigsElement) totalConfigsElement.textContent = totalConfigs;
        if (printingConfigsElement) printingConfigsElement.textContent = printingConfigs;
        if (schedulingConfigsElement) schedulingConfigsElement.textContent = schedulingConfigs;
        if (securityConfigsElement) securityConfigsElement.textContent = securityConfigs;
        
        console.log('Statistics updated:', {
            total: totalConfigs,
            printing: printingConfigs,
            scheduling: schedulingConfigs,
            security: securityConfigs
        });
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Group configurations by category
function groupConfigurationsByCategory() {
    configurationsByCategory = {};
    
    configurations.forEach(config => {
        if (!configurationsByCategory[config.category]) {
            configurationsByCategory[config.category] = [];
        }
        configurationsByCategory[config.category].push(config);
    });
}

// Display configurations
function displayConfigurations() {
    const content = document.getElementById('configurationContent');
    const loadingState = document.getElementById('loadingState');
    const noConfigMessage = document.getElementById('noConfigMessage');
    
    console.log('Displaying configurations. Count:', configurations.length);
    
    if (configurations.length === 0) {
        console.log('No configurations found, showing no config message');
        loadingState.style.display = 'none';
        noConfigMessage.style.display = 'block';
        return;
    }
    
    console.log('Hiding loading state and showing configurations');
    loadingState.style.display = 'none';
    noConfigMessage.style.display = 'none';
    
    let html = '';
    
    // Display configurations by category
    const categories = ['system', 'printing', 'scheduling', 'notifications', 'security'];
    const categoryNames = {
        'system': 'System Settings',
        'printing': 'Printing Configuration',
        'scheduling': 'Scheduling Settings',
        'notifications': 'Notification Settings',
        'security': 'Security Settings'
    };
    
    const categoryIcons = {
        'system': 'fas fa-cogs',
        'printing': 'fas fa-print',
        'scheduling': 'fas fa-calendar-alt',
        'notifications': 'fas fa-bell',
        'security': 'fas fa-shield-alt'
    };
    
    categories.forEach(category => {
        if (configurationsByCategory[category] && configurationsByCategory[category].length > 0) {
            html += `
                <div class="config-section">
                    <h3>
                        <i class="${categoryIcons[category]}"></i>
                        ${categoryNames[category]}
                    </h3>
                    ${configurationsByCategory[category].map(config => createConfigItem(config)).join('')}
                </div>
            `;
        }
    });
    
    content.innerHTML = html;
}

// Create configuration item HTML
function createConfigItem(config) {
    const inputType = getInputType(config.dataType);
    const currentValue = getDisplayValue(config.value, config.dataType);
    
    return `
        <div class="config-item">
            <div class="config-info">
                <div class="config-key">${config.key}</div>
                <div class="config-description">${config.description || 'No description available'}</div>
                <div class="config-badge badge-${config.category}">${config.category}</div>
            </div>
            <div class="config-value">
                <input 
                    type="${inputType}" 
                    class="config-input" 
                    id="config-${config.key}" 
                    value="${currentValue}"
                    data-original-value="${currentValue}"
                    data-type="${config.dataType}"
                    ${config.dataType === 'boolean' ? 'checked="' + config.value + '"' : ''}
                />
                <button 
                    class="save-btn" 
                    onclick="saveConfiguration('${config.key}')"
                    id="save-${config.key}"
                >
                    <i class="fas fa-save"></i> Save
                </button>
            </div>
        </div>
    `;
}

// Get input type based on data type
function getInputType(dataType) {
    switch (dataType) {
        case 'number': return 'number';
        case 'boolean': return 'checkbox';
        case 'string': return 'text';
        default: return 'text';
    }
}

// Get display value for input
function getDisplayValue(value, dataType) {
    if (dataType === 'boolean') {
        return value ? 'true' : 'false';
    }
    return value;
}

// Save configuration
async function saveConfiguration(key) {
    try {
        const input = document.getElementById(`config-${key}`);
        const saveBtn = document.getElementById(`save-${key}`);
        
        if (!input) {
            showNotification('Configuration input not found', 'error');
            return;
        }
        
        // Get value based on data type
        let value = input.value;
        const dataType = input.dataset.type;
        
        if (dataType === 'number') {
            value = parseFloat(value);
            if (isNaN(value)) {
                showNotification('Please enter a valid number', 'error');
                return;
            }
        } else if (dataType === 'boolean') {
            value = input.checked;
        }
        
        // Check if value has changed
        const originalValue = input.dataset.originalValue;
        if (dataType === 'boolean') {
            if (value.toString() === originalValue) {
                showNotification('No changes to save', 'info');
                return;
            }
        } else {
            if (value === originalValue) {
                showNotification('No changes to save', 'info');
                return;
            }
        }
        
        // Show loading
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        const response = await fetch(`${CONFIG_API}/${key}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                value: value,
                userId: currentUser._id || currentUser.id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Configuration saved successfully', 'success');
            input.dataset.originalValue = value.toString();
            
            // Update the configurations array
            const configIndex = configurations.findIndex(c => c.key === key);
            if (configIndex !== -1) {
                configurations[configIndex].value = value;
            }
        } else {
            showNotification('Error saving configuration: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving configuration:', error);
        showNotification('Error saving configuration. Please try again.', 'error');
    } finally {
        // Reset button
        const saveBtn = document.getElementById(`save-${key}`);
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
        }
    }
}

// Initialize default configurations
async function initializeDefaults() {
    try {
        console.log('Starting initialization of default configurations...');
        
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        console.log('Current user:', currentUser);
        
        showLoading('Initializing default configurations...');
        
        const requestBody = {
            userId: currentUser._id || currentUser.id || '507f1f77bcf86cd799439011'
        };
        
        console.log('Sending request to:', `${CONFIG_API}/initialize`);
        console.log('Request body:', requestBody);
        
        const response = await fetch(`${CONFIG_API}/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Initialize result:', result);
        
        if (result.success) {
            showNotification('Default configurations initialized successfully', 'success');
            // Reload configurations
            setTimeout(() => {
                loadConfigurations();
                loadStatistics();
            }, 1000);
        } else {
            showNotification('Error initializing configurations: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error initializing configurations:', error);
        showNotification('Error initializing configurations. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

// Show no configurations message
function showNoConfigMessage() {
    const loadingState = document.getElementById('loadingState');
    const noConfigMessage = document.getElementById('noConfigMessage');
    const content = document.getElementById('configurationContent');
    
    console.log('Showing no config message');
    
    if (loadingState) {
        loadingState.style.display = 'none';
    }
    if (noConfigMessage) {
        noConfigMessage.style.display = 'block';
    }
    if (content) {
        content.innerHTML = '';
    }
    
    // Also hide the main loading overlay
    hideLoading();
}

// Setup event listeners
function setupEventListeners() {
    // Initialize defaults button
    const initializeBtn = document.getElementById('initializeDefaultsBtn');
    if (initializeBtn) {
        initializeBtn.addEventListener('click', initializeDefaults);
    }
    
    // Test API button
    const testApiBtn = document.getElementById('testApiBtn');
    if (testApiBtn) {
        testApiBtn.addEventListener('click', testApiConnection);
    }
    
    // Listen for input changes to enable/disable save buttons
    document.addEventListener('input', function(e) {
        if (e.target.classList.contains('config-input')) {
            const key = e.target.id.replace('config-', '');
            const saveBtn = document.getElementById(`save-${key}`);
            const originalValue = e.target.dataset.originalValue;
            
            if (saveBtn) {
                if (e.target.dataset.type === 'boolean') {
                    const hasChanged = e.target.checked.toString() !== originalValue;
                    saveBtn.disabled = !hasChanged;
                } else {
                    const hasChanged = e.target.value !== originalValue;
                    saveBtn.disabled = !hasChanged;
                }
            }
        }
    });
}

// Loading functions
function showLoading(message = 'Loading...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (loadingOverlay) {
        if (loadingText) {
            loadingText.textContent = message;
        }
        loadingOverlay.style.display = 'flex';
    } else {
        showNotification(message, 'info');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add styles if not already added
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                min-width: 300px;
                max-width: 500px;
                padding: 16px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                animation: slideIn 0.3s ease-out;
            }
            .notification-success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            .notification-error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            .notification-warning {
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            .notification-info {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .notification-close {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: 4px;
                margin-left: auto;
            }
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}

// Test API connection
async function testApiConnection() {
    try {
        showLoading('Testing API connection...');
        
        console.log('Testing API connection to:', CONFIG_API);
        
        const response = await fetch(CONFIG_API);
        console.log('API response status:', response.status);
        console.log('API response headers:', response.headers);
        
        const result = await response.json();
        console.log('API response data:', result);
        
        if (response.ok) {
            showNotification(`API connection successful! Status: ${response.status}`, 'success');
        } else {
            showNotification(`API connection failed! Status: ${response.status}, Message: ${result.message || 'Unknown error'}`, 'error');
        }
    } catch (error) {
        console.error('API connection test failed:', error);
        showNotification(`API connection test failed: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}
