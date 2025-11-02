// Global variables
let monitors = [];
let filteredMonitors = [];
let clinics = [];
let currentMonitorId = null;

// API Endpoints
const MONITORS_API = `${API_BASE_URL}/monitors`;
const CLINICS_API = `${API_BASE_URL}/clinics`;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadMonitors();
    loadStatistics();
    loadClinics();
    setupEventListeners();
    setupModalEventListeners();
});

// Load monitors from API
async function loadMonitors() {
    try {
        const response = await fetch(MONITORS_API);
        const result = await response.json();
        
        if (result.success) {
            monitors = result.data;
            filteredMonitors = [...monitors];
            displayMonitors();
        } else {
            if (response.status === 503) {
                showNotification('Database connection not available. Please check your MongoDB connection.', 'error');
            } else {
                showNotification('Error loading monitors: ' + result.message, 'error');
            }
        }
    } catch (error) {
        console.error('Error loading monitors:', error);
        showNotification('Error loading monitors. Please check if the server is running.', 'error');
    }
}

// Load monitor statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${MONITORS_API}/stats/summary`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('totalMonitors').textContent = result.data.total;
            document.getElementById('activeMonitors').textContent = result.data.active;
            document.getElementById('disabledMonitors').textContent = result.data.disabled;
            document.getElementById('disabledMonitors').textContent = result.data.disabled;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load clinics from API
async function loadClinics() {
    try {
        const response = await fetch(CLINICS_API);
        const result = await response.json();
        
        if (result.success) {
            clinics = result.data;
        } else {
            console.error('Error loading clinics:', result.message);
        }
    } catch (error) {
        console.error('Error loading clinics:', error);
    }
}

// Display monitors in table
function displayMonitors() {
    const tbody = document.getElementById('monitorsTableBody');
    tbody.innerHTML = '';
    
    filteredMonitors.forEach(monitor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${monitor.arName}</td>
            <td>${monitor.enName}</td>
            <td>
                <span class="ip-address">${monitor.ip}</span>
            </td>
            <td>
                <span class="status-badge ${getStatusClass(getMonitorStatus(monitor))}">
                    ${getMonitorStatus(monitor)}
                </span>
            </td>
            <td>${formatDate(monitor.createdAt)}</td>
            <td>
                ${monitor.isDisabled && monitor.disabledReason ? 
                    `<div class="disable-reason" title="Disabled by: ${monitor.disabledBy || 'Unknown'} on ${formatDate(monitor.disabledDate)}">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${monitor.disabledReason}</span>
                    </div>` : 
                    '<span class="text-muted">-</span>'
                }
            </td>
            <td>
                ${monitor.assignedClinics && monitor.assignedClinics.length > 0 ? 
                    `<div class="clinic-badges-container">
                        ${monitor.assignedClinics.slice(0, 2).map(assignment => {
                            const clinic = assignment.clinic;
                            const fullName = `${clinic.enName} (${clinic.arName})`;
                            const displayName = clinic.arName.length > 15 ? clinic.arName.substring(0, 15) + '...' : clinic.arName;
                            return `<span class="clinic-badge-small" title="${fullName}">
                                <i class="fas fa-hospital"></i> ${displayName}
                            </span>`;
                        }).join('')}
                        ${monitor.assignedClinics.length > 2 ? 
                            `<span class="clinic-count-badge" title="${monitor.assignedClinics.slice(2).map(a => a.clinic.arName).join(', ')}">+${monitor.assignedClinics.length - 2} more</span>` : ''
                        }
                    </div>` : 
                    '<span class="text-muted">Not Assigned</span>'
                }
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-view view-monitor-btn" data-monitor-id="${monitor._id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit edit-monitor-btn" data-monitor-id="${monitor._id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-primary assign-clinic-btn" data-monitor-id="${monitor._id}" title="Assign Clinic">
                        <i class="fas fa-hospital"></i>
                    </button>
                    ${monitor.isDisabled ? 
                        `<button class="action-btn btn-success enable-monitor-btn" data-monitor-id="${monitor._id}" title="Enable">
                            <i class="fas fa-check-circle"></i>
                        </button>` :
                        `<button class="action-btn btn-delete disable-monitor-btn" data-monitor-id="${monitor._id}" title="Disable">
                            <i class="fas fa-ban"></i>
                        </button>`
                    }
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get status based on monitor properties
function getMonitorStatus(monitor) {
    if (monitor.isDisabled) return 'disabled';
    if (monitor.isActive) return 'active';
    return 'disabled';
}

// Get status class for styling
function getStatusClass(status) {
    if (status === 'active') return 'status-active';
    if (status === 'disabled') return 'status-disabled';
    if (status === 'disabled') return 'status-disabled';
    return 'status-disabled';
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filteredMonitors = monitors.filter(monitor => 
            monitor.arName.toLowerCase().includes(searchTerm) ||
            monitor.enName.toLowerCase().includes(searchTerm) ||
            monitor.ip.toLowerCase().includes(searchTerm)
        );
        currentPage = 1;
        displayMonitors();
        updatePagination();
    });

    // Filter functionality
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

    // Action buttons
    document.addEventListener('click', function(event) {
        if (event.target.closest('.view-monitor-btn')) {
            const monitorId = event.target.closest('.view-monitor-btn').getAttribute('data-monitor-id');
            viewMonitor(monitorId);
        }
        
        if (event.target.closest('.edit-monitor-btn')) {
            const monitorId = event.target.closest('.edit-monitor-btn').getAttribute('data-monitor-id');
            editMonitor(monitorId);
        }
        
        if (event.target.closest('.disable-monitor-btn')) {
            const monitorId = event.target.closest('.disable-monitor-btn').getAttribute('data-monitor-id');
            disableMonitor(monitorId);
        }
        
        if (event.target.closest('.enable-monitor-btn')) {
            const monitorId = event.target.closest('.enable-monitor-btn').getAttribute('data-monitor-id');
            enableMonitor(monitorId);
        }
        
        if (event.target.closest('.assign-clinic-btn')) {
            const monitorId = event.target.closest('.assign-clinic-btn').getAttribute('data-monitor-id');
            showAssignClinicModal(monitorId);
        }
    });

    // Add monitor button
    document.getElementById('addMonitorBtn').addEventListener('click', showAddMonitorModal);
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Add monitor modal
    document.getElementById('saveMonitor').addEventListener('click', createMonitor);
    document.getElementById('cancelAddMonitor').addEventListener('click', closeAddMonitorModal);

    // Edit monitor modal
    document.getElementById('updateMonitor').addEventListener('click', updateMonitor);
    document.getElementById('cancelEditMonitor').addEventListener('click', closeEditMonitorModal);

    // Disable monitor modal
    document.getElementById('confirmDisableMonitor').addEventListener('click', confirmDisableMonitor);
    document.getElementById('cancelDisableMonitor').addEventListener('click', closeDisableMonitorModal);

    // Enable monitor modal
    document.getElementById('confirmEnableMonitor').addEventListener('click', confirmEnableMonitor);
    document.getElementById('cancelEnableMonitor').addEventListener('click', closeEnableMonitorModal);

    // Assign clinic modal
    document.getElementById('confirmAssignClinic').addEventListener('click', confirmAssignClinic);
    document.getElementById('cancelAssignClinic').addEventListener('click', closeAssignClinicModal);
    
    // Select all/clear all buttons
    document.getElementById('selectAllClinics').addEventListener('click', selectAllClinics);
    document.getElementById('clearAllClinics').addEventListener('click', clearAllClinics);

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const modals = ['addMonitorModal', 'editMonitorModal', 'disableMonitorModal', 'enableMonitorModal', 'monitorDetailsModal', 'assignClinicModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close modals with close button
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredMonitors = monitors.filter(monitor => {
        let matches = true;
        
        if (statusFilter) {
            const status = getMonitorStatus(monitor);
            matches = matches && status === statusFilter;
        }
        
        return matches;
    });
    
    displayMonitors();
}

// Clear filters
function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('searchInput').value = '';
    filteredMonitors = [...monitors];
    displayMonitors();
}


// Show add monitor modal
function showAddMonitorModal() {
    document.getElementById('addMonitorModal').style.display = 'block';
    document.getElementById('addMonitorForm').reset();
}

// Close add monitor modal
function closeAddMonitorModal() {
    document.getElementById('addMonitorModal').style.display = 'none';
}

// Create new monitor
async function createMonitor() {
    try {
        const formData = new FormData(document.getElementById('addMonitorForm'));
        const monitorData = Object.fromEntries(formData.entries());
        
        const response = await fetch(MONITORS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(monitorData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Monitor created successfully!', 'success');
            closeAddMonitorModal();
            loadMonitors();
            loadStatistics();
        } else {
            showNotification('Error creating monitor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error creating monitor:', error);
        showNotification('Error creating monitor. Please try again.', 'error');
    }
}

// View monitor details
async function viewMonitor(monitorId) {
    try {
        const response = await fetch(`${MONITORS_API}/${monitorId}`);
        const result = await response.json();
        
        if (result.success) {
            const monitor = result.data;
            const detailsHtml = `
                <div class="monitor-details">
                    <div class="detail-section">
                        <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Arabic Name:</label>
                                <span>${monitor.arName}</span>
                            </div>
                            <div class="detail-item">
                                <label>English Name:</label>
                                <span>${monitor.enName}</span>
                            </div>
                            <div class="detail-item">
                                <label>IP Address:</label>
                                <span class="ip-address">${monitor.ip}</span>
                            </div>
                            <div class="detail-item">
                                <label>Status:</label>
                                <span class="status-badge ${getStatusClass(getMonitorStatus(monitor))}">${getMonitorStatus(monitor)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Created:</label>
                                <span>${formatDate(monitor.createdAt)}</span>
                            </div>
                            ${monitor.isDisabled ? `
                                <div class="detail-item">
                                    <label>Disabled Date:</label>
                                    <span>${formatDate(monitor.disabledDate)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Disabled Reason:</label>
                                    <span>${monitor.disabledReason}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Disabled By:</label>
                                    <span>${monitor.disabledBy}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('monitorDetails').innerHTML = detailsHtml;
            document.getElementById('monitorDetailsModal').style.display = 'block';
        } else {
            showNotification('Error loading monitor details: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading monitor details:', error);
        showNotification('Error loading monitor details. Please try again.', 'error');
    }
}

// Edit monitor
async function editMonitor(monitorId) {
    try {
        const response = await fetch(`${MONITORS_API}/${monitorId}`);
        const result = await response.json();
        
        if (result.success) {
            const monitor = result.data;
            document.getElementById('editMonitorArName').value = monitor.arName;
            document.getElementById('editMonitorEnName').value = monitor.enName;
            document.getElementById('editMonitorIP').value = monitor.ip;
            currentMonitorId = monitorId;
            document.getElementById('editMonitorModal').style.display = 'block';
        } else {
            showNotification('Error loading monitor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading monitor:', error);
        showNotification('Error loading monitor. Please try again.', 'error');
    }
}

// Close edit monitor modal
function closeEditMonitorModal() {
    document.getElementById('editMonitorModal').style.display = 'none';
    currentMonitorId = null;
}

// Update monitor
async function updateMonitor() {
    try {
        const formData = new FormData(document.getElementById('editMonitorForm'));
        const monitorData = Object.fromEntries(formData.entries());
        
        const response = await fetch(`${MONITORS_API}/${currentMonitorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(monitorData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Monitor information updated successfully!', 'success');
            closeEditMonitorModal();
            loadMonitors();
        } else {
            showNotification('Error updating monitor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating monitor:', error);
        showNotification('Error updating monitor. Please try again.', 'error');
    }
}

// Disable monitor
async function disableMonitor(monitorId) {
    try {
        const response = await fetch(`${MONITORS_API}/${monitorId}`);
        const result = await response.json();
        
        if (result.success) {
            const monitor = result.data;
            document.getElementById('disabledBy').value = 'Current User';
            protectReadOnlyField(document.getElementById('disabledBy'));
            currentMonitorId = monitorId;
            document.getElementById('disableMonitorModal').style.display = 'block';
        } else {
            showNotification('Error loading monitor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading monitor:', error);
        showNotification('Error loading monitor. Please try again.', 'error');
    }
}

// Close disable monitor modal
function closeDisableMonitorModal() {
    document.getElementById('disableMonitorModal').style.display = 'none';
    currentMonitorId = null;
}

// Confirm disable monitor
async function confirmDisableMonitor() {
    try {
        const formData = new FormData(document.getElementById('disableMonitorForm'));
        const disableData = Object.fromEntries(formData.entries());
        
        const response = await fetch(`${MONITORS_API}/${currentMonitorId}/disable`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(disableData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('⚠️ Monitor disabled successfully! The monitor has been deactivated.', 'warning');
            closeDisableMonitorModal();
            loadMonitors();
            loadStatistics();
        } else {
            showNotification('Error disabling monitor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error disabling monitor:', error);
        showNotification('Error disabling monitor. Please try again.', 'error');
    }
}

// Enable monitor
async function enableMonitor(monitorId) {
    try {
        const response = await fetch(`${MONITORS_API}/${monitorId}`);
        const result = await response.json();
        
        if (result.success) {
            const monitor = result.data;
            document.getElementById('enabledBy').value = 'Current User';
            protectReadOnlyField(document.getElementById('enabledBy'));
            currentMonitorId = monitorId;
            document.getElementById('enableMonitorModal').style.display = 'block';
        } else {
            showNotification('Error loading monitor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading monitor:', error);
        showNotification('Error loading monitor. Please try again.', 'error');
    }
}

// Close enable monitor modal
function closeEnableMonitorModal() {
    document.getElementById('enableMonitorModal').style.display = 'none';
    currentMonitorId = null;
}

// Confirm enable monitor
async function confirmEnableMonitor() {
    try {
        const formData = new FormData(document.getElementById('enableMonitorForm'));
        const enableData = Object.fromEntries(formData.entries());
        
        const response = await fetch(`${MONITORS_API}/${currentMonitorId}/enable`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(enableData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Monitor enabled successfully! The monitor has been reactivated.', 'success');
            closeEnableMonitorModal();
            loadMonitors();
            loadStatistics();
        } else {
            showNotification('Error enabling monitor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error enabling monitor:', error);
        showNotification('Error enabling monitor. Please try again.', 'error');
    }
}

// Enhanced notification system
function showNotification(message, type = 'info') {
    if (window.alertSystem) {
        return window.alertSystem.show(message, type);
    } else {
        // Fallback to basic notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, 5000);
    }
}

// Protect read-only fields from modification
function protectReadOnlyField(field) {
    const originalValue = field.value;
    
    // Prevent keyboard input
    field.addEventListener('keydown', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Prevent pasting
    field.addEventListener('paste', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Prevent context menu
    field.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Monitor for attribute changes
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                field.value = originalValue;
            }
        });
    });
    
    observer.observe(field, { attributes: true, attributeFilter: ['value'] });
    
    // Periodic check to ensure value hasn't changed
    setInterval(function() {
        if (field.value !== originalValue) {
            field.value = originalValue;
        }
    }, 100);
}

// Show assign clinic modal
function showAssignClinicModal(monitorId) {
    const monitor = monitors.find(m => m._id === monitorId);
    if (!monitor) {
        showNotification('Monitor not found', 'error');
        return;
    }

    currentMonitorId = monitorId;
    
    // Populate monitor info
    document.getElementById('monitorInfo').value = `${monitor.enName} (${monitor.ip})`;
    
    // Populate clinic table
    populateClinicTable(monitor);
    
    // Clear notes
    document.getElementById('assignmentNotes').value = '';
    
    // Show modal
    document.getElementById('assignClinicModal').style.display = 'block';
}

// Populate clinic table
function populateClinicTable(monitor) {
    const clinicTableBody = document.getElementById('clinicTableBody');
    clinicTableBody.innerHTML = '';
    
    // Get currently assigned clinic IDs
    const assignedClinicIds = monitor.assignedClinics ? 
        monitor.assignedClinics.map(assignment => assignment.clinic._id || assignment.clinic) : [];
    
    clinics.forEach(clinic => {
        const row = document.createElement('tr');
        const isChecked = assignedClinicIds.includes(clinic._id);
        
        row.className = isChecked ? 'selected' : '';
        row.innerHTML = `
            <td>
                <input type="checkbox" id="clinic_${clinic._id}" value="${clinic._id}" ${isChecked ? 'checked' : ''}>
            </td>
            <td class="clinic-name-cell">${clinic.enName}</td>
            <td class="clinic-arabic-name-cell">${clinic.arName}</td>
            <td class="clinic-location-cell">${clinic.location ? clinic.location.enName : 'No Location'}</td>
        `;
        
        clinicTableBody.appendChild(row);
    });
    
    updateSelectionCount();
    setupTableEventListeners();
}

// Setup table event listeners
function setupTableEventListeners() {
    // Individual checkbox changes
    const checkboxes = document.querySelectorAll('#clinicTableBody input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const row = this.closest('tr');
            if (this.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
            updateSelectionCount();
        });
    });
    
    // Row click to toggle checkbox
    const rows = document.querySelectorAll('#clinicTableBody tr');
    rows.forEach(row => {
        row.addEventListener('click', function(e) {
            if (e.target.type !== 'checkbox') {
                const checkbox = this.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            }
        });
    });
    
    // Select all checkbox in header
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    selectAllCheckbox.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('#clinicTableBody input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
            const row = checkbox.closest('tr');
            if (this.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
        updateSelectionCount();
    });
}

// Update selection count
function updateSelectionCount() {
    const checkboxes = document.querySelectorAll('#clinicTableBody input[type="checkbox"]');
    const checkedCount = document.querySelectorAll('#clinicTableBody input[type="checkbox"]:checked').length;
    document.getElementById('selectionCount').textContent = `${checkedCount} selected`;
    
    // Update select all checkbox
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (checkedCount === 0) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = false;
    } else if (checkedCount === checkboxes.length) {
        selectAllCheckbox.indeterminate = false;
        selectAllCheckbox.checked = true;
    } else {
        selectAllCheckbox.indeterminate = true;
    }
}

// Get selected clinic IDs
function getSelectedClinicIds() {
    const checkboxes = document.querySelectorAll('#clinicTableBody input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(checkbox => checkbox.value);
}

// Get current user from localStorage
function getCurrentUser() {
    try {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            const user = JSON.parse(userData);
            return user.name || user.username || 'Admin';
        }
    } catch (error) {
        console.error('Error getting current user:', error);
    }
    return 'Admin';
}

// Select all clinics
function selectAllClinics() {
    const checkboxes = document.querySelectorAll('#clinicTableBody input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = true;
        checkbox.closest('tr').classList.add('selected');
    });
    updateSelectionCount();
}

// Clear all clinics
function clearAllClinics() {
    const checkboxes = document.querySelectorAll('#clinicTableBody input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.closest('tr').classList.remove('selected');
    });
    updateSelectionCount();
}

// Close assign clinic modal
function closeAssignClinicModal() {
    document.getElementById('assignClinicModal').style.display = 'none';
    document.getElementById('assignClinicForm').reset();
    currentMonitorId = null;
}

// Confirm assign clinic
async function confirmAssignClinic() {
    const clinicIds = getSelectedClinicIds();
    const notes = document.getElementById('assignmentNotes').value;
    
    if (clinicIds.length === 0) {
        showNotification('Please select at least one clinic', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${MONITORS_API}/${currentMonitorId}/assign-clinics`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                clinicIds: clinicIds,
                notes: notes,
                assignedBy: getCurrentUser() || 'Admin'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            closeAssignClinicModal();
            loadMonitors(); // Reload to show updated assignment
        } else {
            showNotification(result.message, 'error');
        }
    } catch (error) {
        console.error('Error assigning clinics:', error);
        showNotification('Error assigning clinics. Please try again.', 'error');
    }
}
