// Agent Counters Management
const API_BASE = '/api/agent-counters';
const LOCATIONS_API = '/api/locations';

let counters = [];
let filteredCounters = [];
let locations = [];
let selectedCounterId = null;

// Format date and time to dd-mm-yyyy hh:mm tt
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    
    return `${day}-${month}-${year} ${displayHours}:${minutes} ${ampm}`;
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    DOMUtils.initializePage();
    loadCounters();
    loadLocations();
    setupEventListeners();
});

// Load all counters
async function loadCounters() {
    try {
        showLoading('Loading counters...');
        
        const response = await fetch(API_BASE);
        const result = await response.json();
        
        if (result.success) {
            counters = result.data;
            filteredCounters = [...counters];
            displayCounters();
            updateStatistics();
        } else {
            showNotification('Error loading counters: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading counters:', error);
        showNotification('Error loading counters', 'error');
    } finally {
        hideLoading();
    }
}

// Load locations for dropdown
async function loadLocations() {
    try {
        const response = await fetch(LOCATIONS_API);
        const result = await response.json();
        
        if (result.success) {
            locations = result.data;
            populateLocationFilter();
            populateLocationSelect();
        }
    } catch (error) {
        console.error('Error loading locations:', error);
    }
}

// Populate location filter dropdown
function populateLocationFilter() {
    const locationFilter = document.getElementById('locationFilter');
    locationFilter.innerHTML = '<option value="">All Locations</option>';
    
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location._id;
        option.textContent = location.enName || location.arName || location.name || 'Unknown Location';
        locationFilter.appendChild(option);
    });
}

// Populate location select in modal
function populateLocationSelect() {
    const locationSelect = document.getElementById('location');
    locationSelect.innerHTML = '<option value="">Select Location</option>';
    
    locations.forEach(location => {
        const option = document.createElement('option');
        option.value = location._id;
        option.textContent = location.enName || location.arName || location.name || 'Unknown Location';
        locationSelect.appendChild(option);
    });
}

// Display counters in table
function displayCounters() {
    const tbody = document.getElementById('countersTableBody');
    const noCountersMessage = document.getElementById('noCountersMessage');

    if (filteredCounters.length === 0) {
        tbody.innerHTML = '';
        noCountersMessage.style.display = 'block';
        return;
    }

    noCountersMessage.style.display = 'none';

    tbody.innerHTML = filteredCounters.map(counter => {
        const locationName = counter.location?.enName || counter.location?.arName || 'Unknown Location';
        const createdDate = formatDateTime(counter.createdAt);
        const statusClass = counter.isActive ? 'status-active' : 'status-inactive';
        const statusText = counter.isActive ? 'Active' : 'Inactive';

        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-desktop" style="color: #6f42c1; font-size: 18px;"></i>
                        <strong>${counter.counterNo}</strong>
                    </div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-map-marker-alt" style="color: #17a2b8;"></i>
                        <span>${locationName}</span>
                    </div>
                </td>
                <td>
                    <span style="color: #6c757d;">${counter.description || 'No description'}</span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <span style="color: #6c757d;">${createdDate}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-edit" data-action="edit" data-counter-id="${counter._id}" title="Edit Counter">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn ${counter.isActive ? 'btn-warning' : 'btn-success'}" data-action="toggle-status" data-counter-id="${counter._id}" title="${counter.isActive ? 'Deactivate' : 'Activate'} Counter">
                            <i class="fas ${counter.isActive ? 'fa-pause' : 'fa-play'}"></i>
                        </button>
                        <button class="action-btn btn-delete" data-action="delete" data-counter-id="${counter._id}" title="Delete Counter">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Update statistics
function updateStatistics() {
    const totalCounters = counters.length;
    const activeCounters = counters.filter(c => c.isActive).length;
    const inactiveCounters = totalCounters - activeCounters;

    document.getElementById('totalCounters').textContent = totalCounters;
    document.getElementById('activeCounters').textContent = activeCounters;
    document.getElementById('inactiveCounters').textContent = inactiveCounters;
}

// Apply filters
function applyFilters() {
    const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
    const locationFilter = document.getElementById('locationFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;

    filteredCounters = counters.filter(counter => {
        const matchesSearch = !searchTerm || 
            counter.counterNo.toLowerCase().includes(searchTerm) ||
            (counter.description && counter.description.toLowerCase().includes(searchTerm));
        
        const matchesLocation = !locationFilter || counter.location._id === locationFilter;
        const matchesStatus = !statusFilter || counter.isActive.toString() === statusFilter;

        return matchesSearch && matchesLocation && matchesStatus;
    });

    displayCounters();
}

// Clear filters
function clearFilters() {
    document.getElementById('searchFilter').value = '';
    document.getElementById('locationFilter').value = '';
    document.getElementById('statusFilter').value = '';
    applyFilters();
}

// Open add counter modal
function openAddCounterModal() {
    selectedCounterId = null;
    document.getElementById('counterModalTitle').textContent = 'Add New Counter';
    document.getElementById('counterModalSubtitle').textContent = 'Create a new agent counter for your queue management system';
    document.getElementById('counterForm').reset();
    document.getElementById('statusGroup').style.display = 'none';
    document.getElementById('counterModal').style.display = 'block';
}

// Open edit counter modal
function openEditCounterModal(counterId) {
    console.log('openEditCounterModal called with counterId:', counterId);
    console.log('Available counters:', counters);
    
    const counter = counters.find(c => c._id === counterId);
    console.log('Found counter:', counter);
    
    if (!counter) {
        console.error('Counter not found with ID:', counterId);
        return;
    }

    selectedCounterId = counterId;
    document.getElementById('counterModalTitle').textContent = 'Edit Counter';
    document.getElementById('counterModalSubtitle').textContent = 'Update the agent counter information';
    document.getElementById('counterNo').value = counter.counterNo;
    document.getElementById('location').value = counter.location._id;
    document.getElementById('description').value = counter.description || '';
    document.getElementById('isActive').value = counter.isActive.toString();
    document.getElementById('statusGroup').style.display = 'block';
    document.getElementById('counterModal').style.display = 'block';
    
    console.log('Modal should be visible now');
}

// Close counter modal
function closeCounterModal() {
    document.getElementById('counterModal').style.display = 'none';
    selectedCounterId = null;
}

// Save counter
async function saveCounter() {
    const form = document.getElementById('counterForm');
    const formData = new FormData(form);
    
    // Get current user information
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    console.log('Current user data:', currentUser);
    
    // Get user ID with better fallback
    const userId = currentUser._id || currentUser.id || currentUser.userId;
    console.log('User ID to send:', userId);
    
    const counterData = {
        counterNo: formData.get('counterNo'),
        location: formData.get('location'),
        description: formData.get('description')
    };
    
    // Only add userId if it exists and is valid
    if (userId && userId !== 'undefined' && userId !== 'null') {
        counterData.userId = userId;
    }
    
    console.log('Counter data being sent:', counterData);

    if (selectedCounterId) {
        counterData.isActive = formData.get('isActive') === 'true';
    }

    try {
        showLoading(selectedCounterId ? 'Updating counter...' : 'Creating counter...');

        const url = selectedCounterId ? `${API_BASE}/${selectedCounterId}` : API_BASE;
        const method = selectedCounterId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(counterData)
        });

        const result = await response.json();

        if (result.success) {
            showNotification(
                selectedCounterId ? 'Counter updated successfully' : 'Counter created successfully', 
                'success'
            );
            closeCounterModal();
            loadCounters();
        } else {
            showNotification('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving counter:', error);
        showNotification('Error saving counter', 'error');
    } finally {
        hideLoading();
    }
}

// Toggle counter status
async function toggleCounterStatus(counterId) {
    const counter = counters.find(c => c._id === counterId);
    if (!counter) return;

    try {
        showLoading('Updating counter status...');

        // Get current user information
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        
        const response = await fetch(`${API_BASE}/${counterId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                isActive: !counter.isActive,
                userId: currentUser._id || currentUser.id
            })
        });

        const result = await response.json();

        if (result.success) {
            showNotification(
                `Counter ${!counter.isActive ? 'activated' : 'deactivated'} successfully`, 
                'success'
            );
            loadCounters();
        } else {
            showNotification('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error toggling counter status:', error);
        showNotification('Error updating counter status', 'error');
    } finally {
        hideLoading();
    }
}

// Delete counter
async function deleteCounter(counterId) {
    try {
        showLoading('Deleting counter...');

        const response = await fetch(`${API_BASE}/${counterId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Counter deleted successfully', 'success');
            closeDeleteModal();
            loadCounters();
        } else {
            showNotification('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting counter:', error);
        showNotification('Error deleting counter', 'error');
    } finally {
        hideLoading();
    }
}

// Open delete confirmation modal
function openDeleteModal(counterId) {
    selectedCounterId = counterId;
    document.getElementById('deleteModal').style.display = 'block';
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteModal').style.display = 'none';
    selectedCounterId = null;
}

// Setup event listeners
function setupEventListeners() {
    // Filter controls
    DOMUtils.safeAddEventListener('searchFilter', 'input', applyFilters);
    DOMUtils.safeAddEventListener('locationFilter', 'change', applyFilters);
    DOMUtils.safeAddEventListener('statusFilter', 'change', applyFilters);
    DOMUtils.safeAddEventListener('clearFiltersBtn', 'click', clearFilters);

    // Action buttons
    DOMUtils.safeAddEventListener('addCounterBtn', 'click', openAddCounterModal);
    DOMUtils.safeAddEventListener('addFirstCounterBtn', 'click', openAddCounterModal);

    // Modal controls
    DOMUtils.safeAddEventListener('closeCounterModal', 'click', closeCounterModal);
    DOMUtils.safeAddEventListener('cancelCounterBtn', 'click', closeCounterModal);
    DOMUtils.safeAddEventListener('saveCounterBtn', 'click', saveCounter);

    // Delete modal controls
    DOMUtils.safeAddEventListener('closeDeleteModal', 'click', closeDeleteModal);
    DOMUtils.safeAddEventListener('cancelDeleteBtn', 'click', closeDeleteModal);
    DOMUtils.safeAddEventListener('confirmDeleteBtn', 'click', () => {
        if (selectedCounterId) {
            deleteCounter(selectedCounterId);
        }
    });

    // Close modals when clicking outside
    window.addEventListener('click', (event) => {
        const counterModal = document.getElementById('counterModal');
        const deleteModal = document.getElementById('deleteModal');
        
        if (event.target === counterModal) {
            closeCounterModal();
        }
        if (event.target === deleteModal) {
            closeDeleteModal();
        }
    });

    // Table action buttons
    document.addEventListener('click', (event) => {
        console.log('Click event:', event.target);
        
        if (event.target.closest('[data-action]')) {
            const button = event.target.closest('[data-action]');
            const action = button.dataset.action;
            const counterId = button.dataset.counterId;
            
            console.log('Button clicked:', { action, counterId });

            if (action === 'edit') {
                console.log('Opening edit modal for counter:', counterId);
                openEditCounterModal(counterId);
            } else if (action === 'toggle-status') {
                console.log('Toggling status for counter:', counterId);
                toggleCounterStatus(counterId);
            } else if (action === 'delete') {
                console.log('Opening delete modal for counter:', counterId);
                openDeleteModal(counterId);
            }
        }
    });
}
