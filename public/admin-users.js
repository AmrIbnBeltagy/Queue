// Show page after authentication check passed
document.body.classList.add('authenticated');

// State
let users = [];
let currentUserId = null;
let userToDelete = null;

// Initialize
DOMUtils.initializePage(async function() {
    checkAuth();
    
    // Check role-based access
    if (!checkRoleAccess()) {
        return;
    }
    
    loadUsers();
    loadStats();
    setupEventListeners();
});

// Check if user is authenticated
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (!token || !user) {
        // Redirect to login if not authenticated
        window.location.href = 'login.html';
        return;
    }
    
    // Display user info
    try {
        const userData = JSON.parse(user);
        const userNameElement = document.getElementById('currentUserName');
        if (userNameElement) {
            userNameElement.textContent = userData.name || userData.username || 'User';
        }
    } catch (error) {
        console.error('Error parsing user data:', error);
    }
}

// Logout function - redirect to login page
function logout() {
    // Clear user data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    sessionStorage.clear();
    // Redirect to login page
    window.location.href = 'login.html';
}

// Setup event listeners
function setupEventListeners() {
    // Navigation controls
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // Modal controls - using DOMUtils for safety
    DOMUtils.safeAddEventListener('addUserBtn', 'click', showAddUserModal);
    DOMUtils.safeAddEventListener('closeModal', 'click', closeModal);
    DOMUtils.safeAddEventListener('cancelBtn', 'click', closeModal);
    DOMUtils.safeAddEventListener('closeViewModal', 'click', closeViewModal);
    DOMUtils.safeAddEventListener('closeViewBtn', 'click', closeViewModal);
    DOMUtils.safeAddEventListener('closeDeleteModal', 'click', closeDeleteModal);
    DOMUtils.safeAddEventListener('cancelDeleteBtn', 'click', closeDeleteModal);
    DOMUtils.safeAddEventListener('confirmDeleteBtn', 'click', confirmDelete);
    
    // Form submission
    DOMUtils.safeAddEventListener('userForm', 'submit', handleSubmit);
    
    // Filters - using DOMUtils for safety
    DOMUtils.safeAddEventListener('searchInput', 'input', debounce(filterUsers, 300));
    DOMUtils.safeAddEventListener('roleFilter', 'change', filterUsers);
    DOMUtils.safeAddEventListener('clearFiltersBtn', 'click', clearFilters);
    
    // Password controls - using DOMUtils for safety
    DOMUtils.safeAddEventListener('generatePassword', 'click', generatePassword);
    DOMUtils.safeAddEventListener('togglePassword', 'click', togglePasswordVisibility);
    
    // Username lowercase - using DOMUtils for safety
    const userUsernameInput = document.getElementById('userUsername');
    if (userUsernameInput) {
        userUsernameInput.addEventListener('input', function(e) {
            e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        });
    }
    
    
    // Close modal on outside click
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('userModal');
        const viewModal = document.getElementById('viewUserModal');
        const deleteModal = document.getElementById('deleteConfirmModal');
        if (e.target === modal) closeModal();
        if (e.target === viewModal) closeViewModal();
        if (e.target === deleteModal) closeDeleteModal();
    });
    
    // Event delegation for action buttons
    document.getElementById('usersTableBody').addEventListener('click', function(e) {
        const target = e.target.closest('button');
        if (!target) return;
        
        const action = target.dataset.action;
        const userId = target.dataset.id;
        
        if (action === 'view') viewUser(userId);
        else if (action === 'edit') editUser(userId);
        else if (action === 'delete') deleteUser(userId);
    });
}

// Load statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/stats/summary`);
        const result = await response.json();
        
        if (result.success) {
            DOMUtils.safeSetTextContent('totalUsers', result.data.total);
            DOMUtils.safeSetTextContent('adminUsers', result.data.admins);
            DOMUtils.safeSetTextContent('activeUsers', result.data.active);
            DOMUtils.safeSetTextContent('disabledUsers', result.data.disabled);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const searchInput = document.getElementById('searchInput');
        const roleFilter = document.getElementById('roleFilter');
        
        const searchTerm = searchInput ? searchInput.value : '';
        const role = roleFilter ? roleFilter.value : '';
        
        let url = `${API_BASE_URL}/users?`;
        if (searchTerm) url += `search=${encodeURIComponent(searchTerm)}&`;
        if (role) url += `role=${role}&`;
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success) {
            users = result.data;
            displayUsers(users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
        showMessage('Error loading users', 'error');
    }
}

// Display users
function displayUsers(usersList) {
    const tbody = document.getElementById('usersTableBody');
    
    if (usersList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 60px 40px; color: #94a3b8;">
                    <i class="fas fa-users" style="font-size: 4rem; opacity: 0.2; margin-bottom: 20px;"></i>
                    <p style="font-size: 1.2rem; font-weight: 600; margin: 0;">No users found</p>
                    <p style="font-size: 0.95rem; margin-top: 8px; opacity: 0.7;">Try adjusting your search or filters</p>
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = usersList.map((user, index) => `
        <tr>
            <td>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 40px; height: 40px; border-radius: 8px; background: ${getRoleColor(user.role)}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1rem; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">
                        ${user.name.charAt(0).toUpperCase()}
                    </div>
                    <strong>${user.name}</strong>
                </div>
            </td>
            <td>
                <span style="font-family: monospace; background: #ecf0f1; padding: 4px 8px; border-radius: 4px;">
                    ${user.username}
                </span>
            </td>
            <td>${user.email}</td>
            <td>${user.phone || 'N/A'}</td>
            <td>
                <span class="badge badge-${user.role}">
                    <i class="fas fa-${getRoleIcon(user.role)}"></i>
                    ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </span>
            </td>
            <td>
                <span class="badge ${user.isActive ? 'badge-success' : 'badge-danger'}">
                    <i class="fas fa-${user.isActive ? 'check-circle' : 'times-circle'}"></i>
                    ${user.isActive ? 'Active' : 'disabled'}
                </span>
            </td>
            <td>${formatDate(user.createdAt)}</td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-view" data-action="view" data-id="${user._id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit" data-action="edit" data-id="${user._id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-delete" data-action="delete" data-id="${user._id}" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Get role color (solid colors matching app style)
function getRoleColor(role) {
    const colors = {
        'admin': '#dc3545',
        'manager': '#8e44ad',
        'agent': '#3498db',
        'user': '#6c757d'
    };
    return colors[role] || '#6c757d';
}

// Get role icon
function getRoleIcon(role) {
    const icons = {
        'admin': 'user-shield',
        'manager': 'user-tie',
        'agent': 'headset',
        'user': 'user',
        'doctor': 'user-md'
    };
    return icons[role] || 'user';
}

// Show add user modal
function showAddUserModal() {
    currentUserId = null;
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-plus"></i> Add New User';
    document.getElementById('userForm').reset();
    document.getElementById('userId').value = '';
    document.getElementById('userPassword').required = true;
    document.getElementById('userModal').style.display = 'block';
    
    // Setup username suggestion for this modal instance
    setupUsernameSuggestion();
}

// Edit user
async function editUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        const result = await response.json();
        
        if (result.success) {
            currentUserId = userId;
            const user = result.data;
            
            document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit User';
            document.getElementById('userId').value = user._id;
            document.getElementById('fullName').value = user.name;
            document.getElementById('userUsername').value = user.username;
            document.getElementById('userEmail').value = user.email;
            document.getElementById('userPhone').value = user.phone || '';
            document.getElementById('userRole').value = user.role;
            document.getElementById('userPassword').value = '';
            document.getElementById('userPassword').required = false;
            document.getElementById('userPassword').placeholder = 'Leave blank to keep current password';
            
            document.getElementById('userModal').style.display = 'block';
            
            // Setup username suggestion for this modal instance
            setupUsernameSuggestion();
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showMessage('Error loading user details', 'error');
    }
}

// View user
async function viewUser(userId) {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`);
        const result = await response.json();
        
        if (result.success) {
            const user = result.data;
            
            document.getElementById('userDetailsContent').innerHTML = `
                <div class="detail-section">
                    <h3><i class="fas fa-user-circle"></i> User Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label><i class="fas fa-user"></i> Full Name</label>
                            <span>${user.name}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-user-tag"></i> Username</label>
                            <span style="font-family: monospace; background: #ecf0f1; padding: 4px 8px; border-radius: 4px;">${user.username}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-envelope"></i> Email</label>
                            <span>${user.email}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-phone"></i> Phone</label>
                            <span>${user.phone || 'Not provided'}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-user-shield"></i> Role</label>
                            <span class="badge badge-${user.role}">
                                <i class="fas fa-${getRoleIcon(user.role)}"></i>
                                ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-toggle-on"></i> Status</label>
                            <span class="badge ${user.isActive ? 'badge-success' : 'badge-danger'}">
                                <i class="fas fa-${user.isActive ? 'check-circle' : 'times-circle'}"></i>
                                ${user.isActive ? 'Active' : 'disabled'}
                            </span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-calendar-plus"></i> Created</label>
                            <span>${formatDate(user.createdAt)}</span>
                        </div>
                        <div class="detail-item">
                            <label><i class="fas fa-calendar-check"></i> Last Updated</label>
                            <span>${formatDate(user.updatedAt)}</span>
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('viewUserModal').style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showMessage('Error loading user details', 'error');
    }
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    // Debug: Check if elements exist
    console.log('handleSubmit called');
    console.log('Event target:', e.target);
    console.log('Form ID:', e.target.id);
    console.log('Modal visible:', document.getElementById('userModal')?.style.display);
    console.log('Modal element:', document.getElementById('userModal'));
    console.log('userName element:', document.getElementById('fullName'));
    console.log('userUsername element:', document.getElementById('userUsername'));
    console.log('userEmail element:', document.getElementById('userEmail'));
    console.log('userPhone element:', document.getElementById('userPhone'));
    console.log('userRole element:', document.getElementById('userRole'));
    
    // Check if we're in the right form
    if (e.target.id !== 'userForm') {
        console.error('Form submission from wrong form:', e.target.id);
        return;
    }
    
    // Check if modal is visible and elements exist
    const modal = document.getElementById('userModal');
    if (!modal) {
        console.error('Modal element not found');
        return;
    }
    
    console.log('Modal computed style:', window.getComputedStyle(modal).display);
    console.log('Modal inline style:', modal.style.display);
    console.log('Modal classList:', modal.classList.toString());
    
    if (modal.style.display === 'none' || window.getComputedStyle(modal).display === 'none') {
        console.error('Modal is not visible, aborting form submission');
        return;
    }
    
    // Check if all required elements exist
    const requiredElements = ['userName', 'userUsername', 'userEmail', 'userPhone', 'userRole'];
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('Missing form elements:', missingElements);
        console.log('All form elements in DOM:', document.querySelectorAll('input, select'));
        showMessage('Form elements not found. Please try again.', 'error');
        return;
    }
    
    // Additional check: wait a bit and try again if elements are still missing
    if (missingElements.length > 0) {
        console.log('Waiting 100ms and retrying...');
        setTimeout(() => {
            const retryMissing = requiredElements.filter(id => !document.getElementById(id));
            if (retryMissing.length > 0) {
                console.error('Still missing after retry:', retryMissing);
                showMessage('Form elements not found. Please try again.', 'error');
                return;
            }
        }, 100);
    }
    
    const userId = document.getElementById('userId')?.value;
    const userData = {
        name: document.getElementById('fullName')?.value?.trim() || '',
        username: document.getElementById('userUsername')?.value?.trim()?.toLowerCase() || '',
        email: document.getElementById('userEmail')?.value?.trim()?.toLowerCase() || '',
        phone: document.getElementById('userPhone')?.value?.trim() || '',
        role: document.getElementById('userRole')?.value || ''
    };
    
    const password = document.getElementById('userPassword')?.value;
    if (password) {
        userData.password = password;
    }
    
    // Validate required fields
    if (!userData.name) {
        showMessage('Full name is required', 'error');
        return;
    }
    if (!userData.username) {
        showMessage('Username is required', 'error');
        return;
    }
    if (!userData.email) {
        showMessage('Email is required', 'error');
        return;
    }
    if (!userData.phone) {
        showMessage('Phone is required', 'error');
        return;
    }
    if (!userData.role) {
        showMessage('Role is required', 'error');
        return;
    }
    
    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const submitBtn = e.target.querySelector('button[type="submit"]');
    
    if (loadingText) {
        loadingText.textContent = userId ? 'Updating user...' : 'Creating user...';
    }
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    }
    
    try {
        const url = userId ? `${API_BASE_URL}/users/${userId}` : `${API_BASE_URL}/users`;
        const method = userId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const result = await response.json();
        
        loadingOverlay.style.display = 'none';
        
        if (result.success) {
            showMessage(userId ? 'User updated successfully' : 'User created successfully', 'success');
            closeModal();
            loadUsers();
            loadStats();
        } else {
            showMessage(result.message || 'Error saving user', 'error');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Save User';
            }
        }
    } catch (error) {
        console.error('Error saving user:', error);
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        showMessage('Error saving user', 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Save User';
        }
    } finally {
        // Always hide loading overlay
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
}

// Delete user - show confirmation modal
function deleteUser(userId) {
    const user = users.find(u => u._id === userId);
    if (!user) return;
    
    userToDelete = userId;
    document.getElementById('deleteUserName').textContent = user.name;
    document.getElementById('deleteConfirmModal').style.display = 'block';
}

// Confirm delete
async function confirmDelete() {
    if (!userToDelete) return;
    
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    
    loadingText.textContent = 'Deleting user...';
    loadingOverlay.style.display = 'flex';
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Deleting...';
    
    try {
        const response = await fetch(`${API_BASE_URL}/users/${userToDelete}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        loadingOverlay.style.display = 'none';
        
        if (result.success) {
            showMessage('User deleted successfully', 'success');
            closeDeleteModal();
            loadUsers();
            loadStats();
        } else {
            showMessage(result.message || 'Error deleting user', 'error');
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Yes, Delete User';
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        loadingOverlay.style.display = 'none';
        showMessage('Error deleting user', 'error');
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Yes, Delete User';
    }
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteConfirmModal').style.display = 'none';
    userToDelete = null;
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.disabled = false;
    confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Yes, Delete User';
}

// Generate strong password
function generatePassword() {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
    password += '0123456789'[Math.floor(Math.random() * 10)];
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
    
    // Fill the rest
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }
    
    // Shuffle the password
    password = password.split('').sort(() => Math.random() - 0.5).join('');
    
    document.getElementById('userPassword').value = password;
    document.getElementById('userPassword').type = 'text';
    
    // Copy to clipboard
    navigator.clipboard.writeText(password).then(() => {
        showMessage('Password generated and copied to clipboard!', 'success');
    });
    
    setTimeout(() => {
        document.getElementById('userPassword').type = 'password';
    }, 3000);
}

// Toggle password visibility
function togglePasswordVisibility() {
    const passwordField = document.getElementById('userPassword');
    const toggleBtn = document.getElementById('togglePassword');
    
    if (passwordField.type === 'password') {
        passwordField.type = 'text';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        passwordField.type = 'password';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

// Filter users
function filterUsers() {
    loadUsers();
}

// Clear filters
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('roleFilter').value = '';
    loadUsers();
}

// Check role-based access control
function checkRoleAccess() {
    try {
        const userData = localStorage.getItem('currentUser');
        if (!userData) {
            window.location.href = 'login.html';
            return false;
        }
        
        const user = JSON.parse(userData);
        
        // If user is an agent, redirect to agent-counters page
        if (user.role === 'agent') {
            showMessage('Access restricted. Agents must be assigned to counters.', 'error');
            setTimeout(() => {
                window.location.href = 'agent-counters.html';
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

// Close modals
function closeModal() {
    document.getElementById('userModal').style.display = 'none';
    document.getElementById('userForm').reset();
    
    // Reset submit button state
    const submitBtn = document.querySelector('#userForm button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Save User';
    }
    
    // Hide loading overlay if still showing
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function closeViewModal() {
    document.getElementById('viewUserModal').style.display = 'none';
}

// Format date
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

// Show message matching app style
function showMessage(message, type = 'info') {
    const notification = document.createElement('div');
    
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        info: '#3498db'
    };
    
    notification.className = `notification ${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${colors[type] || colors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 6px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
        z-index: 10000;
        animation: slideInRight 0.3s ease;
        max-width: 400px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 10px;
    `;
    
    notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Setup username suggestion functionality
function setupUsernameSuggestion() {
    const userNameInput = document.getElementById('fullName');
    const userUsernameInput = document.getElementById('userUsername');
    
    if (userNameInput && userUsernameInput) {
        // Remove any existing listeners to avoid duplicates
        userNameInput.removeEventListener('input', handleNameInput);
        
        // Add the new listener
        userNameInput.addEventListener('input', handleNameInput);
    }
}

// Handle name input for username suggestion
function handleNameInput(e) {
    const fullName = e.target.value.trim();
    const userUsernameInput = document.getElementById('userUsername');
    
    console.log('Name input detected:', fullName);
    console.log('Username field found:', !!userUsernameInput);
    console.log('Username field value:', userUsernameInput ? userUsernameInput.value : 'N/A');
    
    if (fullName && userUsernameInput && !userUsernameInput.value) {
        const suggestedUsername = generateUsernameFromName(fullName);
        console.log('Suggested username:', suggestedUsername);
        userUsernameInput.value = suggestedUsername;
    }
}

// Generate username from full name
function generateUsernameFromName(fullName) {
    if (!fullName || fullName.trim() === '') return '';
    
    // Clean the name: remove extra spaces, convert to lowercase
    const cleanName = fullName.trim().toLowerCase();
    
    // Split into words
    const words = cleanName.split(/\s+/).filter(word => word.length > 0);
    
    if (words.length === 0) return '';
    
    if (words.length === 1) {
        // Single name: use as is, limit to 20 characters
        return words[0].substring(0, 20);
    }
    
    if (words.length === 2) {
        // First name + Last name: firstname.lastname
        const firstName = words[0];
        const lastName = words[1];
        return `${firstName}.${lastName}`.substring(0, 20);
    }
    
    // Multiple names: firstname.lastname (using first and last)
    const firstName = words[0];
    const lastName = words[words.length - 1];
    return `${firstName}.${lastName}`.substring(0, 20);
}
