// Global variables
let clinics = [];
let filteredClinics = [];
let locations = [];
let currentClinicId = null;

// API Endpoints
const CLINICS_API = `${API_BASE_URL}/clinics`;
const LOCATIONS_API = `${API_BASE_URL}/locations`;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadClinics();
    loadStatistics();
    loadLocations();
    setupEventListeners();
    setupModalEventListeners();
});

// Load clinics from API
async function loadClinics() {
    try {
        // Show loading state
        showTableLoading();
        
        const response = await fetch(CLINICS_API);
        const result = await response.json();
        
        if (result.success) {
            clinics = result.data;
            filteredClinics = [...clinics];
            displayClinics();
        } else {
            if (response.status === 503) {
                showNotification('Database connection not available. Please check your MongoDB connection.', 'error');
            } else {
                showNotification('Error loading clinics: ' + result.message, 'error');
            }
        }
    } catch (error) {
        console.error('Error loading clinics:', error);
        showNotification('Error loading clinics. Please check if the server is running.', 'error');
    } finally {
        // Clear loading state
        clearTableLoading();
    }
}

// Load locations for dropdowns
async function loadLocations() {
    try {
        const response = await fetch(LOCATIONS_API);
        const result = await response.json();
        
        if (result.success) {
            locations = result.data;
            populateLocationDropdowns();
        } else {
            console.error('Error loading locations:', result.message);
        }
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

// Populate location dropdowns
function populateLocationDropdowns() {
    const locationFilter = document.getElementById('locationFilter');
    const clinicLocation = document.getElementById('clinicLocation');
    const editClinicLocation = document.getElementById('editClinicLocation');
    
    // Clear existing options except "All Locations" and "Select Location"
    locationFilter.innerHTML = '<option value="">All Locations</option>';
    clinicLocation.innerHTML = '<option value="">Select Location</option>';
    editClinicLocation.innerHTML = '<option value="">Select Location</option>';
    
    // Add locations from database
    locations.forEach(location => {
        const option1 = document.createElement('option');
        option1.value = location._id;
        option1.textContent = location.enName || location.arName;
        locationFilter.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = location._id;
        option2.textContent = location.enName || location.arName;
        clinicLocation.appendChild(option2);
        
        const option3 = document.createElement('option');
        option3.value = location._id;
        option3.textContent = location.enName || location.arName;
        editClinicLocation.appendChild(option3);
    });
}

// Load clinic statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${CLINICS_API}/stats/summary`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('totalClinics').textContent = result.data.total;
            document.getElementById('activeClinics').textContent = result.data.active;
            document.getElementById('disabledClinics').textContent = result.data.disabled;
            document.getElementById('disabledClinics').textContent = result.data.disabled;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Display clinics in table
function displayClinics() {
    const tbody = document.getElementById('clinicsTableBody');
    tbody.innerHTML = '';
    
    filteredClinics.forEach(clinic => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span class="code-badge">${clinic.code || '--'}</span>
            </td>
            <td>${clinic.arName}</td>
            <td>${clinic.enName}</td>
            <td>${clinic.location ? (clinic.location.enName || clinic.location.arName) : 'Not specified'}</td>
            <td>
                <span class="status-badge ${getStatusClass(getClinicStatus(clinic))}">
                    ${getClinicStatus(clinic)}
                </span>
            </td>
            <td>${formatDate(clinic.createdAt)}</td>
            <td>
                ${clinic.isDisabled && clinic.disabledReason ? 
                    `<div class="disable-reason" title="Disabled by: ${clinic.disabledBy || 'Unknown'} on ${formatDate(clinic.disabledDate)}">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${clinic.disabledReason}</span>
                    </div>` : 
                    '<span class="text-muted">-</span>'
                }
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-view view-clinic-btn" data-clinic-id="${clinic._id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit edit-clinic-btn" data-clinic-id="${clinic._id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-copy copy-clinic-btn" data-clinic-id="${clinic._id}" title="Copy Clinic">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${clinic.isDisabled ? 
                        `<button class="action-btn btn-success enable-clinic-btn" data-clinic-id="${clinic._id}" title="Enable">
                            <i class="fas fa-check-circle"></i>
                        </button>` :
                        `<button class="action-btn btn-delete disable-clinic-btn" data-clinic-id="${clinic._id}" title="Disable">
                            <i class="fas fa-ban"></i>
                        </button>`
                    }
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get status based on clinic properties
function getClinicStatus(clinic) {
    if (clinic.isDisabled) return 'disabled';
    if (clinic.isActive) return 'active';
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
        
        // Show loading for search
        showTableLoading();
        
        // Add small delay to show loading state
        setTimeout(() => {
            filteredClinics = clinics.filter(clinic => 
                clinic.arName.toLowerCase().includes(searchTerm) ||
                clinic.enName.toLowerCase().includes(searchTerm) ||
                (clinic.code && clinic.code.toLowerCase().includes(searchTerm)) ||
                (clinic.location && clinic.location.enName && clinic.location.enName.toLowerCase().includes(searchTerm)) ||
                (clinic.location && clinic.location.arName && clinic.location.arName.toLowerCase().includes(searchTerm))
            );
            currentPage = 1;
            displayClinics();
            updatePagination();
        }, 100);
    });

    // Filter functionality
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('locationFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

    // Action buttons
    document.addEventListener('click', function(event) {
        if (event.target.closest('.view-clinic-btn')) {
            const clinicId = event.target.closest('.view-clinic-btn').getAttribute('data-clinic-id');
            viewClinic(clinicId);
        }
        
        if (event.target.closest('.edit-clinic-btn')) {
            const clinicId = event.target.closest('.edit-clinic-btn').getAttribute('data-clinic-id');
            editClinic(clinicId);
        }
        
        if (event.target.closest('.disable-clinic-btn')) {
            const clinicId = event.target.closest('.disable-clinic-btn').getAttribute('data-clinic-id');
            disableClinic(clinicId);
        }
        
        if (event.target.closest('.enable-clinic-btn')) {
            const clinicId = event.target.closest('.enable-clinic-btn').getAttribute('data-clinic-id');
            enableClinic(clinicId);
        }
        
        if (event.target.closest('.copy-clinic-btn')) {
            const clinicId = event.target.closest('.copy-clinic-btn').getAttribute('data-clinic-id');
            copyClinic(clinicId);
        }
    });

    // Add clinic button
    document.getElementById('addClinicBtn').addEventListener('click', showAddClinicModal);
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Add clinic modal
    document.getElementById('saveClinic').addEventListener('click', createClinic);
    document.getElementById('cancelAddClinic').addEventListener('click', closeAddClinicModal);

    // Edit clinic modal
    document.getElementById('updateClinic').addEventListener('click', updateClinic);
    document.getElementById('cancelEditClinic').addEventListener('click', closeEditClinicModal);

    // Disable clinic modal
    document.getElementById('confirmDisableClinic').addEventListener('click', confirmDisableClinic);
    document.getElementById('cancelDisableClinic').addEventListener('click', closeDisableClinicModal);

    // Enable clinic modal
    document.getElementById('confirmEnableClinic').addEventListener('click', confirmEnableClinic);
    document.getElementById('cancelEnableClinic').addEventListener('click', closeEnableClinicModal);

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const modals = ['addClinicModal', 'editClinicModal', 'disableClinicModal', 'enableClinicModal', 'clinicDetailsModal'];
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
    const locationFilter = document.getElementById('locationFilter').value;
    
    // Show loading for filters
    showTableLoading();
    
    // Add small delay to show loading state
    setTimeout(() => {
        filteredClinics = clinics.filter(clinic => {
            let matches = true;
            
            if (statusFilter) {
                const status = getClinicStatus(clinic);
                matches = matches && status === statusFilter;
            }
        
        if (locationFilter) {
            const clinicLocation = typeof clinic.location === 'object' 
                ? clinic.location._id || clinic.location 
                : clinic.location;
            matches = matches && clinicLocation === locationFilter;
        }
        
            return matches;
        });
        
        displayClinics();
    }, 100);
}

// Clear filters
function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('searchInput').value = '';
    
    // Show loading for clear filters
    showTableLoading();
    
    // Add small delay to show loading state
    setTimeout(() => {
        filteredClinics = [...clinics];
        displayClinics();
    }, 100);
}


// Show add clinic modal
function showAddClinicModal() {
    document.getElementById('addClinicModal').style.display = 'block';
    document.getElementById('addClinicForm').reset();
}

// Copy clinic function
async function copyClinic(clinicId) {
    try {
        const response = await fetch(`${CLINICS_API}/${clinicId}`);
        const result = await response.json();
        
        if (result.success) {
            const clinic = result.data;
            
            // Populate the add clinic form with the existing clinic data
            document.getElementById('clinicArName').value = clinic.arName;
            document.getElementById('clinicEnName').value = clinic.enName;
            document.getElementById('clinicLocation').value = clinic.location._id || clinic.location;
            
            // Show the add clinic modal
            document.getElementById('addClinicModal').style.display = 'block';
            
            showNotification('📋 Clinic data copied to form. Please review and modify as needed.', 'info');
        } else {
            showNotification('Error loading clinic: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading clinic:', error);
        showNotification('Error loading clinic. Please try again.', 'error');
    }
}

// Check for duplicate clinic
async function checkDuplicateClinic(arName, enName, locationId) {
    try {
        const response = await fetch(`${CLINICS_API}/check-duplicate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                arName: arName,
                enName: enName,
                location: locationId
            })
        });
        
        const result = await response.json();
        return result.success ? result.isDuplicate : false;
    } catch (error) {
        console.error('Error checking for duplicate clinic:', error);
        return false;
    }
}

// Close add clinic modal
function closeAddClinicModal() {
    document.getElementById('addClinicModal').style.display = 'none';
}

// Create new clinic
async function createClinic() {
    try {
        const formData = new FormData(document.getElementById('addClinicForm'));
        const clinicData = Object.fromEntries(formData.entries());
        
        // Check for duplicate clinic before creating
        const isDuplicate = await checkDuplicateClinic(
            clinicData.arName, 
            clinicData.enName, 
            clinicData.location
        );
        
        if (isDuplicate) {
            showNotification('⚠️ A clinic with the same name and location already exists. Please choose a different name or location.', 'warning');
            return;
        }
        
        const response = await fetch(CLINICS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clinicData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Clinic created successfully!', 'success');
            closeAddClinicModal();
            loadClinics();
            loadStatistics();
        } else {
            showNotification('Error creating clinic: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error creating clinic:', error);
        showNotification('Error creating clinic. Please try again.', 'error');
    }
}

// View clinic details
async function viewClinic(clinicId) {
    try {
        const response = await fetch(`${CLINICS_API}/${clinicId}`);
        const result = await response.json();
        
        if (result.success) {
            const clinic = result.data;
            const detailsHtml = `
                <div class="clinic-details">
                    <div class="detail-section">
                        <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Code:</label>
                                <span><span class="code-badge">${clinic.code || '--'}</span></span>
                            </div>
                            <div class="detail-item">
                                <label>Arabic Name:</label>
                                <span>${clinic.arName}</span>
                            </div>
                            <div class="detail-item">
                                <label>English Name:</label>
                                <span>${clinic.enName}</span>
                            </div>
                            <div class="detail-item">
                                <label>Location:</label>
                                <span>${clinic.location ? (clinic.location.enName || clinic.location.arName) : 'Not specified'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Status:</label>
                                <span class="status-badge ${getStatusClass(getClinicStatus(clinic))}">${getClinicStatus(clinic)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Created:</label>
                                <span>${formatDate(clinic.createdAt)}</span>
                            </div>
                            ${clinic.isDisabled ? `
                                <div class="detail-item">
                                    <label>Disabled Date:</label>
                                    <span>${formatDate(clinic.disabledDate)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Disabled Reason:</label>
                                    <span>${clinic.disabledReason}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Disabled By:</label>
                                    <span>${clinic.disabledBy}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('clinicDetails').innerHTML = detailsHtml;
            document.getElementById('clinicDetailsModal').style.display = 'block';
        } else {
            showNotification('Error loading clinic details: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading clinic details:', error);
        showNotification('Error loading clinic details. Please try again.', 'error');
    }
}

// Edit clinic
async function editClinic(clinicId) {
    try {
        const response = await fetch(`${CLINICS_API}/${clinicId}`);
        const result = await response.json();
        
        if (result.success) {
            const clinic = result.data;
            document.getElementById('editClinicArName').value = clinic.arName;
            document.getElementById('editClinicEnName').value = clinic.enName;
            document.getElementById('editClinicLocation').value = clinic.location._id || clinic.location;
            currentClinicId = clinicId;
            document.getElementById('editClinicModal').style.display = 'block';
        } else {
            showNotification('Error loading clinic: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading clinic:', error);
        showNotification('Error loading clinic. Please try again.', 'error');
    }
}

// Close edit clinic modal
function closeEditClinicModal() {
    document.getElementById('editClinicModal').style.display = 'none';
    currentClinicId = null;
}

// Update clinic
async function updateClinic() {
    try {
        const formData = new FormData(document.getElementById('editClinicForm'));
        const clinicData = Object.fromEntries(formData.entries());
        
        const response = await fetch(`${CLINICS_API}/${currentClinicId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(clinicData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Clinic information updated successfully!', 'success');
            closeEditClinicModal();
            loadClinics();
        } else {
            showNotification('Error updating clinic: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating clinic:', error);
        showNotification('Error updating clinic. Please try again.', 'error');
    }
}

// Disable clinic
async function disableClinic(clinicId) {
    try {
        const response = await fetch(`${CLINICS_API}/${clinicId}`);
        const result = await response.json();
        
        if (result.success) {
            const clinic = result.data;
            document.getElementById('disabledBy').value = 'Current User';
            protectReadOnlyField(document.getElementById('disabledBy'));
            currentClinicId = clinicId;
            document.getElementById('disableClinicModal').style.display = 'block';
        } else {
            showNotification('Error loading clinic: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading clinic:', error);
        showNotification('Error loading clinic. Please try again.', 'error');
    }
}

// Close disable clinic modal
function closeDisableClinicModal() {
    document.getElementById('disableClinicModal').style.display = 'none';
    currentClinicId = null;
}

// Confirm disable clinic
async function confirmDisableClinic() {
    try {
        const formData = new FormData(document.getElementById('disableClinicForm'));
        const disableData = Object.fromEntries(formData.entries());
        
        const response = await fetch(`${CLINICS_API}/${currentClinicId}/disable`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(disableData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('⚠️ Clinic disabled successfully! The clinic has been deactivated.', 'warning');
            closeDisableClinicModal();
            loadClinics();
            loadStatistics();
        } else {
            showNotification('Error disabling clinic: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error disabling clinic:', error);
        showNotification('Error disabling clinic. Please try again.', 'error');
    }
}

// Enable clinic
async function enableClinic(clinicId) {
    try {
        const response = await fetch(`${CLINICS_API}/${clinicId}`);
        const result = await response.json();
        
        if (result.success) {
            const clinic = result.data;
            document.getElementById('enabledBy').value = 'Current User';
            protectReadOnlyField(document.getElementById('enabledBy'));
            currentClinicId = clinicId;
            document.getElementById('enableClinicModal').style.display = 'block';
        } else {
            showNotification('Error loading clinic: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading clinic:', error);
        showNotification('Error loading clinic. Please try again.', 'error');
    }
}

// Close enable clinic modal
function closeEnableClinicModal() {
    document.getElementById('enableClinicModal').style.display = 'none';
    currentClinicId = null;
}

// Confirm enable clinic
async function confirmEnableClinic() {
    try {
        const formData = new FormData(document.getElementById('enableClinicForm'));
        const enableData = Object.fromEntries(formData.entries());
        
        const response = await fetch(`${CLINICS_API}/${currentClinicId}/enable`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(enableData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Clinic enabled successfully! The clinic has been reactivated.', 'success');
            closeEnableClinicModal();
            loadClinics();
            loadStatistics();
        } else {
            showNotification('Error enabling clinic: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error enabling clinic:', error);
        showNotification('Error enabling clinic. Please try again.', 'error');
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

// Show table loading state
function showTableLoading() {
    const tbody = document.getElementById('clinicsTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #007bff; margin-right: 10px;"></i><span style="font-size: 16px; color: #666;">Loading clinics...</span></td></tr>';
    }
}

// Clear table loading state
function clearTableLoading() {
    const tbody = document.getElementById('clinicsTableBody');
    if (tbody && tbody.innerHTML.includes('Loading clinics...')) {
        // Loading will be cleared by displayClinics()
    }
}
