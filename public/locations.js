// Global variables
let locations = [];
let filteredLocations = [];
let currentLocationId = null;

// API Endpoints
const LOCATIONS_API = `${API_BASE_URL}/locations`;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadLocations();
    loadStatistics();
    setupEventListeners();
    setupModalEventListeners();
});

// Load locations from API
async function loadLocations() {
    try {
        const response = await fetch(LOCATIONS_API);
        const result = await response.json();
        
        if (result.success) {
            locations = result.data;
            filteredLocations = [...locations];
            displayLocations();
        } else {
            if (response.status === 503) {
                showNotification('Database connection not available. Please check your MongoDB connection.', 'error');
            } else {
                showNotification('Error loading locations: ' + result.message, 'error');
            }
        }
    } catch (error) {
        console.error('Error loading locations:', error);
        showNotification('Error loading locations. Please check if the server is running.', 'error');
    }
}

// Load location statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${LOCATIONS_API}/stats/summary`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('totalLocations').textContent = result.data.total;
            document.getElementById('activeLocations').textContent = result.data.active;
            document.getElementById('disabledLocations').textContent = result.data.disabled;
            document.getElementById('disabledLocations').textContent = result.data.disabled;
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Display locations in table
function displayLocations() {
    const tbody = document.getElementById('locationsTableBody');
    tbody.innerHTML = '';
    
    filteredLocations.forEach(location => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${location.arName}</td>
            <td>${location.enName}</td>
            <td>
                <span class="status-badge ${getStatusClass(getLocationStatus(location))}">
                    ${getLocationStatus(location)}
                </span>
            </td>
            <td>${formatDate(location.createdAt)}</td>
            <td>
                ${location.isDisabled && location.disabledReason ? 
                    `<div class="disable-reason" title="Disabled by: ${location.disabledBy || 'Unknown'} on ${formatDate(location.disabledDate)}">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${location.disabledReason}</span>
                    </div>` : 
                    '<span class="text-muted">-</span>'
                }
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-view view-location-btn" data-location-id="${location._id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit edit-location-btn" data-location-id="${location._id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn btn-copy copy-location-btn" data-location-id="${location._id}" title="Copy Location">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${location.isDisabled ? 
                        `<button class="action-btn btn-success enable-location-btn" data-location-id="${location._id}" title="Enable">
                            <i class="fas fa-check-circle"></i>
                        </button>` :
                        `<button class="action-btn btn-delete disable-location-btn" data-location-id="${location._id}" title="Disable">
                            <i class="fas fa-ban"></i>
                        </button>`
                    }
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get status based on location properties
function getLocationStatus(location) {
    if (location.isDisabled) return 'disabled';
    if (location.isActive) return 'active';
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
        filteredLocations = locations.filter(location => 
            location.arName.toLowerCase().includes(searchTerm) ||
            location.enName.toLowerCase().includes(searchTerm)
        );
        displayLocations();
    });

    // Filter functionality
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

    // Action buttons
    document.addEventListener('click', function(event) {
        if (event.target.closest('.view-location-btn')) {
            const locationId = event.target.closest('.view-location-btn').getAttribute('data-location-id');
            viewLocation(locationId);
        }
        
        if (event.target.closest('.edit-location-btn')) {
            const locationId = event.target.closest('.edit-location-btn').getAttribute('data-location-id');
            editLocation(locationId);
        }
        
        if (event.target.closest('.disable-location-btn')) {
            const locationId = event.target.closest('.disable-location-btn').getAttribute('data-location-id');
            disableLocation(locationId);
        }
        
        if (event.target.closest('.enable-location-btn')) {
            const locationId = event.target.closest('.enable-location-btn').getAttribute('data-location-id');
            enableLocation(locationId);
        }
        
        if (event.target.closest('.copy-location-btn')) {
            const locationId = event.target.closest('.copy-location-btn').getAttribute('data-location-id');
            copyLocation(locationId);
        }
    });

    // Add location button
    document.getElementById('addLocationBtn').addEventListener('click', showAddLocationModal);
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Add location modal
    document.getElementById('saveLocation').addEventListener('click', createLocation);
    document.getElementById('cancelAddLocation').addEventListener('click', closeAddLocationModal);

    // Edit location modal
    document.getElementById('updateLocation').addEventListener('click', updateLocation);
    document.getElementById('cancelEditLocation').addEventListener('click', closeEditLocationModal);

    // Disable location modal
    document.getElementById('confirmDisableLocation').addEventListener('click', confirmDisableLocation);
    document.getElementById('cancelDisableLocation').addEventListener('click', closeDisableLocationModal);

    // Enable location modal
    document.getElementById('confirmEnableLocation').addEventListener('click', confirmEnableLocation);
    document.getElementById('cancelEnableLocation').addEventListener('click', closeEnableLocationModal);

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const modals = ['addLocationModal', 'editLocationModal', 'disableLocationModal', 'enableLocationModal', 'locationDetailsModal'];
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
    
    filteredLocations = locations.filter(location => {
        let matches = true;
        
        if (statusFilter) {
            const status = getLocationStatus(location);
            matches = matches && status === statusFilter;
        }
        
        return matches;
    });
    
    displayLocations();
}

// Clear filters
function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('searchInput').value = '';
    filteredLocations = [...locations];
    displayLocations();
}


// Show add location modal
function showAddLocationModal() {
    document.getElementById('addLocationModal').style.display = 'block';
    document.getElementById('addLocationForm').reset();
}

// Copy location function
async function copyLocation(locationId) {
    try {
        const response = await fetch(`${LOCATIONS_API}/${locationId}`);
        const result = await response.json();
        
        if (result.success) {
            const location = result.data;
            
            // Populate the add location form with the existing location data
            document.getElementById('locationArName').value = location.arName;
            document.getElementById('locationEnName').value = location.enName;
            
            // Show the add location modal
            document.getElementById('addLocationModal').style.display = 'block';
            
            showNotification('📋 Location data copied to form. Please review and modify as needed.', 'info');
        } else {
            showNotification('Error loading location: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading location:', error);
        showNotification('Error loading location. Please try again.', 'error');
    }
}

// Check for duplicate location
async function checkDuplicateLocation(arName, enName) {
    try {
        const response = await fetch(`${LOCATIONS_API}/check-duplicate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                arName: arName,
                enName: enName
            })
        });
        
        const result = await response.json();
        return result.success ? result.isDuplicate : false;
    } catch (error) {
        console.error('Error checking for duplicate location:', error);
        return false;
    }
}

// Close add location modal
function closeAddLocationModal() {
    document.getElementById('addLocationModal').style.display = 'none';
}

// Create new location
async function createLocation() {
    try {
        const formData = new FormData(document.getElementById('addLocationForm'));
        const locationData = Object.fromEntries(formData.entries());
        
        // Check for duplicate location before creating
        const isDuplicate = await checkDuplicateLocation(
            locationData.arName, 
            locationData.enName
        );
        
        if (isDuplicate) {
            showNotification('⚠️ A location with the same name already exists. Please choose a different name.', 'warning');
            return;
        }
        
        const response = await fetch(LOCATIONS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(locationData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Location created successfully!', 'success');
            closeAddLocationModal();
            loadLocations();
            loadStatistics();
        } else {
            showNotification('Error creating location: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error creating location:', error);
        showNotification('Error creating location. Please try again.', 'error');
    }
}

// View location details
async function viewLocation(locationId) {
    try {
        const response = await fetch(`${LOCATIONS_API}/${locationId}`);
        const result = await response.json();
        
        if (result.success) {
            const location = result.data;
            const detailsHtml = `
                <div class="location-details">
                    <div class="detail-section">
                        <h3><i class="fas fa-info-circle"></i> Basic Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Arabic Name:</label>
                                <span>${location.arName}</span>
                            </div>
                            <div class="detail-item">
                                <label>English Name:</label>
                                <span>${location.enName}</span>
                            </div>
                            <div class="detail-item">
                                <label>Status:</label>
                                <span class="status-badge ${getStatusClass(getLocationStatus(location))}">${getLocationStatus(location)}</span>
                            </div>
                            <div class="detail-item">
                                <label>Created:</label>
                                <span>${formatDate(location.createdAt)}</span>
                            </div>
                            ${location.isDisabled ? `
                                <div class="detail-item">
                                    <label>Disabled Date:</label>
                                    <span>${formatDate(location.disabledDate)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Disabled Reason:</label>
                                    <span>${location.disabledReason}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Disabled By:</label>
                                    <span>${location.disabledBy}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('locationDetails').innerHTML = detailsHtml;
            document.getElementById('locationDetailsModal').style.display = 'block';
        } else {
            showNotification('Error loading location details: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading location details:', error);
        showNotification('Error loading location details. Please try again.', 'error');
    }
}

// Edit location
async function editLocation(locationId) {
    try {
        const response = await fetch(`${LOCATIONS_API}/${locationId}`);
        const result = await response.json();
        
        if (result.success) {
            const location = result.data;
            document.getElementById('editLocationArName').value = location.arName;
            document.getElementById('editLocationEnName').value = location.enName;
            currentLocationId = locationId;
            document.getElementById('editLocationModal').style.display = 'block';
        } else {
            showNotification('Error loading location: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading location:', error);
        showNotification('Error loading location. Please try again.', 'error');
    }
}

// Close edit location modal
function closeEditLocationModal() {
    document.getElementById('editLocationModal').style.display = 'none';
    currentLocationId = null;
}

// Update location
async function updateLocation() {
    try {
        const formData = new FormData(document.getElementById('editLocationForm'));
        const locationData = Object.fromEntries(formData.entries());
        
        const response = await fetch(`${LOCATIONS_API}/${currentLocationId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(locationData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Location information updated successfully!', 'success');
            closeEditLocationModal();
            loadLocations();
        } else {
            showNotification('Error updating location: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating location:', error);
        showNotification('Error updating location. Please try again.', 'error');
    }
}

// Disable location
async function disableLocation(locationId) {
    try {
        const response = await fetch(`${LOCATIONS_API}/${locationId}`);
        const result = await response.json();
        
        if (result.success) {
            const location = result.data;
            document.getElementById('disabledBy').value = 'Current User';
            protectReadOnlyField(document.getElementById('disabledBy'));
            currentLocationId = locationId;
            document.getElementById('disableLocationModal').style.display = 'block';
        } else {
            showNotification('Error loading location: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading location:', error);
        showNotification('Error loading location. Please try again.', 'error');
    }
}

// Close disable location modal
function closeDisableLocationModal() {
    document.getElementById('disableLocationModal').style.display = 'none';
    currentLocationId = null;
}

// Confirm disable location
async function confirmDisableLocation() {
    try {
        const formData = new FormData(document.getElementById('disableLocationForm'));
        const disableData = Object.fromEntries(formData.entries());
        
        const response = await fetch(`${LOCATIONS_API}/${currentLocationId}/disable`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(disableData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('⚠️ Location disabled successfully! The location has been deactivated.', 'warning');
            closeDisableLocationModal();
            loadLocations();
            loadStatistics();
        } else {
            showNotification('Error disabling location: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error disabling location:', error);
        showNotification('Error disabling location. Please try again.', 'error');
    }
}

// Enable location
async function enableLocation(locationId) {
    try {
        const response = await fetch(`${LOCATIONS_API}/${locationId}`);
        const result = await response.json();
        
        if (result.success) {
            const location = result.data;
            document.getElementById('enabledBy').value = 'Current User';
            protectReadOnlyField(document.getElementById('enabledBy'));
            currentLocationId = locationId;
            document.getElementById('enableLocationModal').style.display = 'block';
        } else {
            showNotification('Error loading location: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading location:', error);
        showNotification('Error loading location. Please try again.', 'error');
    }
}

// Close enable location modal
function closeEnableLocationModal() {
    document.getElementById('enableLocationModal').style.display = 'none';
    currentLocationId = null;
}

// Confirm enable location
async function confirmEnableLocation() {
    try {
        const formData = new FormData(document.getElementById('enableLocationForm'));
        const enableData = Object.fromEntries(formData.entries());
        
        const response = await fetch(`${LOCATIONS_API}/${currentLocationId}/enable`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(enableData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Location enabled successfully! The location has been reactivated.', 'success');
            closeEnableLocationModal();
            loadLocations();
            loadStatistics();
        } else {
            showNotification('Error enabling location: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error enabling location:', error);
        showNotification('Error enabling location. Please try again.', 'error');
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
