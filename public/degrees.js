// Show page after authentication check passed
document.body.classList.add('authenticated');

// Global variables
let degrees = [];
let filteredDegrees = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortColumn = -1;
let sortDirection = 'asc';

// API Endpoint
const DEGREES_API = `${API_BASE_URL}/degrees`;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadDegrees();
    loadStatistics();
    setupEventListeners();
    setupModalEventListeners();
});

// Load degrees from API
async function loadDegrees() {
    try {
        const response = await fetch(DEGREES_API);
        const result = await response.json();
        
        if (result.success) {
            degrees = result.data;
            filteredDegrees = [...degrees];
            displayDegrees();
            updatePagination();
        } else {
            if (response.status === 503) {
                showNotification('Database connection not available. Please check your MongoDB connection.', 'error');
            } else {
                showNotification('Error loading degrees: ' + result.message, 'error');
            }
        }
    } catch (error) {
        console.error('Error loading degrees:', error);
        showNotification('Error loading degrees. Please check if the server is running.', 'error');
    }
}

// Load degree statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${DEGREES_API}/stats/summary`);
        const result = await response.json();
        
        if (result.success) {
            const stats = result.data;
            document.getElementById('totalDegrees').textContent = stats.total;
            document.getElementById('activeDegrees').textContent = stats.active;
            document.getElementById('disabledDegrees').textContent = stats.disabled;
            document.getElementById('disabledDegrees').textContent = stats.disabled;
        } else {
            if (response.status === 503) {
                // Set default values when database is not available
                document.getElementById('totalDegrees').textContent = '0';
                document.getElementById('activeDegrees').textContent = '0';
                document.getElementById('disabledDegrees').textContent = '0';
                document.getElementById('disabledDegrees').textContent = '0';
            }
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        // Set default values on error
        document.getElementById('totalDegrees').textContent = '0';
        document.getElementById('activeDegrees').textContent = '0';
        document.getElementById('disabledDegrees').textContent = '0';
        document.getElementById('disabledDegrees').textContent = '0';
    }
}

// Display degrees in table
function displayDegrees() {
    const tbody = document.getElementById('degreesTableBody');
    tbody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageDegrees = filteredDegrees.slice(startIndex, endIndex);
    
    if (pageDegrees.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-graduation-cap"></i> No degrees found
                </td>
            </tr>
        `;
        return;
    }
    
    pageDegrees.forEach(degree => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${degree.arName}</td>
            <td>${degree.enName}</td>
            <td>
                <span class="status-badge ${getStatusClass(degree.status)}">
                    ${degree.status}
                </span>
            </td>
            <td>${formatDate(degree.createdAt)}</td>
            <td>
                ${degree.isDisabled && degree.disabledReason ? 
                    `<div class="disable-reason" title="Disabled by: ${degree.disabledBy || 'Unknown'} on ${formatDate(degree.disabledDate)}">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${degree.disabledReason}</span>
                    </div>` : 
                    '<span class="text-muted">-</span>'
                }
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-edit edit-degree-btn" data-degree-id="${degree._id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${degree.isDisabled ? 
                        `<button class="action-btn btn-success enable-degree-btn" data-degree-id="${degree._id}" title="Enable">
                            <i class="fas fa-check-circle"></i>
                        </button>` :
                        `<button class="action-btn btn-delete disable-degree-btn" data-degree-id="${degree._id}" title="Disable">
                            <i class="fas fa-ban"></i>
                        </button>`
                    }
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Get status class for styling
function getStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'active': return 'status-active';
        case 'disabled': return 'status-disabled';
        case 'disabled': return 'status-disabled';
        default: return 'status-unknown';
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    document.getElementById('searchInput').addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        filteredDegrees = degrees.filter(degree => 
            degree.arName.toLowerCase().includes(searchTerm) ||
            degree.enName.toLowerCase().includes(searchTerm)
        );
        currentPage = 1;
        displayDegrees();
        updatePagination();
    });

    // Filter functionality
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

    // Pagination
    document.getElementById('prevBtn').addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            displayDegrees();
            updatePagination();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', function() {
        const totalPages = Math.ceil(filteredDegrees.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayDegrees();
            updatePagination();
        }
    });

    // Table sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', function() {
            const column = parseInt(this.getAttribute('data-sort'));
            sortTable(column);
        });
    });

    // Event delegation for action buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-degree-btn')) {
            const degreeId = e.target.closest('.edit-degree-btn').getAttribute('data-degree-id');
            editDegree(degreeId);
        } else if (e.target.closest('.disable-degree-btn')) {
            const degreeId = e.target.closest('.disable-degree-btn').getAttribute('data-degree-id');
            disableDegree(degreeId);
        } else if (e.target.closest('.enable-degree-btn')) {
            const degreeId = e.target.closest('.enable-degree-btn').getAttribute('data-degree-id');
            enableDegree(degreeId);
        }
    });
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    
    filteredDegrees = degrees.filter(degree => {
        let matches = true;
        
        if (statusFilter) {
            const status = degree.isDisabled ? 'disabled' : (degree.isActive ? 'active' : 'disabled');
            matches = matches && status === statusFilter;
        }
        
        return matches;
    });
    
    currentPage = 1;
    displayDegrees();
    updatePagination();
}

// Clear filters
function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('searchInput').value = '';
    filteredDegrees = [...degrees];
    currentPage = 1;
    displayDegrees();
    updatePagination();
}

// Sort table
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    filteredDegrees.sort((a, b) => {
        let aVal, bVal;
        
        switch (column) {
            case 0: aVal = a.arName; bVal = b.arName; break;
            case 1: aVal = a.enName; bVal = b.enName; break;
            case 2: aVal = a.status; bVal = b.status; break;
            case 3: aVal = new Date(a.createdAt); bVal = new Date(b.createdAt); break;
            default: return 0;
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    displayDegrees();
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredDegrees.length / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredDegrees.length);
    
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages || totalPages === 0;
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Add Degree Modal
    document.getElementById('addDegreeBtn').addEventListener('click', function() {
        document.getElementById('addDegreeModal').style.display = 'block';
        document.getElementById('addDegreeForm').reset();
    });

    document.getElementById('closeAddDegreeModal').addEventListener('click', function() {
        document.getElementById('addDegreeModal').style.display = 'none';
    });

    document.getElementById('cancelAddDegreeBtn').addEventListener('click', function() {
        document.getElementById('addDegreeModal').style.display = 'none';
    });

    document.getElementById('addDegreeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createDegree();
    });

    // Edit Degree Modal
    document.getElementById('closeEditDegreeModal').addEventListener('click', function() {
        document.getElementById('editDegreeModal').style.display = 'none';
    });

    document.getElementById('cancelEditDegreeBtn').addEventListener('click', function() {
        document.getElementById('editDegreeModal').style.display = 'none';
    });

    document.getElementById('editDegreeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateDegree();
    });

    // Disable Degree Modal
    document.getElementById('closeDisableDegreeModal').addEventListener('click', function() {
        document.getElementById('disableDegreeModal').style.display = 'none';
    });

    document.getElementById('cancelDisableDegreeBtn').addEventListener('click', function() {
        document.getElementById('disableDegreeModal').style.display = 'none';
    });

    document.getElementById('disableDegreeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        disableDegreeConfirm();
    });

    // Enable Degree Modal
    document.getElementById('closeEnableDegreeModal').addEventListener('click', function() {
        document.getElementById('enableDegreeModal').style.display = 'none';
    });

    document.getElementById('cancelEnableDegreeBtn').addEventListener('click', function() {
        document.getElementById('enableDegreeModal').style.display = 'none';
    });

    document.getElementById('enableDegreeForm').addEventListener('submit', function(e) {
        e.preventDefault();
        enableDegreeConfirm();
    });

    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

// Create new degree
async function createDegree() {
    const form = document.getElementById('addDegreeForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(DEGREES_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Degree created successfully! Available for doctor selection.', 'success');
            document.getElementById('addDegreeModal').style.display = 'none';
            loadDegrees();
            loadStatistics();
        } else {
            showNotification('Error creating degree: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error creating degree:', error);
        showNotification('Error creating degree. Please try again.', 'error');
    }
}

// Edit degree
async function editDegree(degreeId) {
    try {
        const response = await fetch(`${DEGREES_API}/${degreeId}`);
        const result = await response.json();
        
        if (result.success) {
            const degree = result.data;
            
            // Populate form fields
            document.getElementById('editDegreeId').value = degree._id;
            document.getElementById('editArName').value = degree.arName;
            document.getElementById('editEnName').value = degree.enName;
            
            document.getElementById('editDegreeModal').style.display = 'block';
        } else {
            showNotification('Error loading degree: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading degree:', error);
        showNotification('Error loading degree. Please try again.', 'error');
    }
}

// Update degree
async function updateDegree() {
    const form = document.getElementById('editDegreeForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const degreeId = data.id;
    
    // Remove the id from data
    delete data.id;
    
    try {
        const response = await fetch(`${DEGREES_API}/${degreeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Degree information updated successfully!', 'success');
            document.getElementById('editDegreeModal').style.display = 'none';
            loadDegrees();
        } else {
            showNotification('Error updating degree: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating degree:', error);
        showNotification('Error updating degree. Please try again.', 'error');
    }
}

// Disable degree
function disableDegree(degreeId) {
    document.getElementById('disableDegreeId').value = degreeId;
    
    // Auto-populate disabledBy with current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        const disabledByField = document.getElementById('disabledBy');
        disabledByField.value = currentUser.name || currentUser.username || 'Current User';
        
        // Add additional protection against modification
        protectReadOnlyField(disabledByField);
    }
    
    document.getElementById('disableDegreeModal').style.display = 'block';
}

// Confirm disable degree
async function disableDegreeConfirm() {
    const form = document.getElementById('disableDegreeForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const degreeId = data.id;
    
    try {
        const response = await fetch(`${DEGREES_API}/${degreeId}/disable`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                reason: data.reason,
                disabledBy: data.disabledBy
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('⚠️ Degree disabled successfully! No longer available for selection.', 'warning');
            document.getElementById('disableDegreeModal').style.display = 'none';
            loadDegrees();
            loadStatistics();
        } else {
            showNotification('Error disabling degree: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error disabling degree:', error);
        showNotification('Error disabling degree. Please try again.', 'error');
    }
}

// Enable degree
function enableDegree(degreeId) {
    document.getElementById('enableDegreeId').value = degreeId;
    
    // Auto-populate enabledBy with current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        const enabledByField = document.getElementById('enabledBy');
        enabledByField.value = currentUser.name || currentUser.username || 'Current User';
        
        // Add additional protection against modification
        protectReadOnlyField(enabledByField);
    }
    
    document.getElementById('enableDegreeModal').style.display = 'block';
}

// Confirm enable degree
async function enableDegreeConfirm() {
    const form = document.getElementById('enableDegreeForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const degreeId = data.id;
    
    try {
        const response = await fetch(`${DEGREES_API}/${degreeId}/enable`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                enabledBy: data.enabledBy
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Degree enabled successfully! Available for doctor selection.', 'success');
            document.getElementById('enableDegreeModal').style.display = 'none';
            loadDegrees();
            loadStatistics();
        } else {
            showNotification('Error enabling degree: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error enabling degree:', error);
        showNotification('Error enabling degree. Please try again.', 'error');
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
    
    // Prevent paste
    field.addEventListener('paste', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Prevent context menu
    field.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        return false;
    });
    
    // Monitor for value changes and restore original
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                field.value = originalValue;
            }
        });
    });
    
    observer.observe(field, { attributes: true, attributeFilter: ['value'] });
    
    // Periodic check to restore value if changed
    setInterval(function() {
        if (field.value !== originalValue) {
            field.value = originalValue;
        }
    }, 100);
}
