// Show page after authentication check passed
document.body.classList.add('authenticated');

// Global variables
let specialities = [];
let filteredSpecialities = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortColumn = -1;
let sortDirection = 'asc';

// API Endpoint
const SPECIALITIES_API = `${API_BASE_URL}/specialities`;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    loadSpecialities();
    loadStatistics();
    setupEventListeners();
    setupModalEventListeners();
});

// Load specialities from API
async function loadSpecialities() {
    try {
        // Show loading state
        showTableLoading();
        
        const response = await fetch(SPECIALITIES_API);
        const result = await response.json();
        
        if (result.success) {
            specialities = result.data;
            filteredSpecialities = [...specialities];
            displaySpecialities();
            updatePagination();
        } else {
            if (response.status === 503) {
                showNotification('Database connection not available. Please check your MongoDB connection.', 'error');
            } else {
                showNotification('Error loading specialities: ' + result.message, 'error');
            }
        }
    } catch (error) {
        console.error('Error loading specialities:', error);
        showNotification('Error loading specialities. Please check if the server is running.', 'error');
    } finally {
        // Clear loading state
        clearTableLoading();
    }
}

// Load speciality statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${SPECIALITIES_API}/stats/summary`);
        const result = await response.json();
        
        if (result.success) {
            const stats = result.data;
            document.getElementById('totalSpecialities').textContent = stats.total;
            document.getElementById('activeSpecialities').textContent = stats.active;
            document.getElementById('disabledSpecialities').textContent = stats.disabled;
            document.getElementById('disabledSpecialities').textContent = stats.disabled;
        } else {
            if (response.status === 503) {
                // Set default values when database is not available
                document.getElementById('totalSpecialities').textContent = '0';
                document.getElementById('activeSpecialities').textContent = '0';
                document.getElementById('disabledSpecialities').textContent = '0';
                document.getElementById('disabledSpecialities').textContent = '0';
            }
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        // Set default values on error
        document.getElementById('totalSpecialities').textContent = '0';
        document.getElementById('activeSpecialities').textContent = '0';
        document.getElementById('disabledSpecialities').textContent = '0';
        document.getElementById('disabledSpecialities').textContent = '0';
    }
}

// Display specialities in table
function displaySpecialities() {
    const tbody = document.getElementById('specialitiesTableBody');
    tbody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageSpecialities = filteredSpecialities.slice(startIndex, endIndex);
    
    if (pageSpecialities.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
                    <i class="fas fa-stethoscope"></i> No specialities found
                </td>
            </tr>
        `;
        return;
    }
    
    pageSpecialities.forEach(speciality => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="badge badge-primary">${speciality.code}</span></td>
            <td>${speciality.arName}</td>
            <td>${speciality.enName}</td>
            <td>
                <span class="status-badge ${getStatusClass(speciality.status)}">
                    ${speciality.status}
                </span>
            </td>
            <td>${formatDate(speciality.createdAt)}</td>
            <td>
                ${speciality.isDisabled && speciality.disabledReason ? 
                    `<div class="disable-reason" title="Disabled by: ${speciality.disabledBy || 'Unknown'} on ${formatDate(speciality.disabledDate)}">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${speciality.disabledReason}</span>
                    </div>` : 
                    '<span class="text-muted">-</span>'
                }
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-edit edit-speciality-btn" data-speciality-id="${speciality._id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${speciality.isDisabled ? 
                        `<button class="action-btn btn-success enable-speciality-btn" data-speciality-id="${speciality._id}" title="Enable">
                            <i class="fas fa-check-circle"></i>
                        </button>` :
                        `<button class="action-btn btn-delete disable-speciality-btn" data-speciality-id="${speciality._id}" title="Disable">
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
        
        // Show loading for search
        showTableLoading();
        
        // Add small delay to show loading state
        setTimeout(() => {
            filteredSpecialities = specialities.filter(speciality => 
                speciality.code.toLowerCase().includes(searchTerm) ||
                speciality.arName.toLowerCase().includes(searchTerm) ||
                speciality.enName.toLowerCase().includes(searchTerm)
            );
            currentPage = 1;
            displaySpecialities();
            updatePagination();
        }, 100);
    });

    // Filter functionality
    document.getElementById('statusFilter').addEventListener('change', applyFilters);
    document.getElementById('clearFiltersBtn').addEventListener('click', clearFilters);

    // Pagination
    document.getElementById('prevBtn').addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage--;
            displaySpecialities();
            updatePagination();
        }
    });

    document.getElementById('nextBtn').addEventListener('click', function() {
        const totalPages = Math.ceil(filteredSpecialities.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displaySpecialities();
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
        if (e.target.closest('.edit-speciality-btn')) {
            const specialityId = e.target.closest('.edit-speciality-btn').getAttribute('data-speciality-id');
            editSpeciality(specialityId);
        } else if (e.target.closest('.disable-speciality-btn')) {
            const specialityId = e.target.closest('.disable-speciality-btn').getAttribute('data-speciality-id');
            disableSpeciality(specialityId);
        } else if (e.target.closest('.enable-speciality-btn')) {
            const specialityId = e.target.closest('.enable-speciality-btn').getAttribute('data-speciality-id');
            enableSpeciality(specialityId);
        }
    });
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    
    // Show loading for filters
    showTableLoading();
    
    // Add small delay to show loading state
    setTimeout(() => {
        filteredSpecialities = specialities.filter(speciality => {
            let matches = true;
            
            if (statusFilter) {
                const status = speciality.isDisabled ? 'disabled' : (speciality.isActive ? 'active' : 'disabled');
                matches = matches && status === statusFilter;
            }
        
            return matches;
        });
        
        currentPage = 1;
        displaySpecialities();
        updatePagination();
    }, 100);
}

// Clear filters
function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('searchInput').value = '';
    
    // Show loading for clear filters
    showTableLoading();
    
    // Add small delay to show loading state
    setTimeout(() => {
        filteredSpecialities = [...specialities];
        currentPage = 1;
        displaySpecialities();
        updatePagination();
    }, 100);
}

// Sort table
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortColumn = column;
        sortDirection = 'asc';
    }
    
    filteredSpecialities.sort((a, b) => {
        let aVal, bVal;
        
        switch (column) {
            case 0: aVal = a.code; bVal = b.code; break;
            case 1: aVal = a.arName; bVal = b.arName; break;
            case 2: aVal = a.enName; bVal = b.enName; break;
            case 3: aVal = a.status; bVal = b.status; break;
            case 4: aVal = new Date(a.createdAt); bVal = new Date(b.createdAt); break;
            default: return 0;
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    displaySpecialities();
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredSpecialities.length / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredSpecialities.length);
    
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages || totalPages === 0;
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Add Speciality Modal
    document.getElementById('addSpecialityBtn').addEventListener('click', function() {
        document.getElementById('addSpecialityModal').style.display = 'block';
        document.getElementById('addSpecialityForm').reset();
        generateSpecialityCode();
    });

    document.getElementById('closeAddSpecialityModal').addEventListener('click', function() {
        document.getElementById('addSpecialityModal').style.display = 'none';
    });

    document.getElementById('cancelAddSpecialityBtn').addEventListener('click', function() {
        document.getElementById('addSpecialityModal').style.display = 'none';
    });

    document.getElementById('addSpecialityForm').addEventListener('submit', function(e) {
        e.preventDefault();
        createSpeciality();
    });

    // Edit Speciality Modal
    document.getElementById('closeEditSpecialityModal').addEventListener('click', function() {
        document.getElementById('editSpecialityModal').style.display = 'none';
    });

    document.getElementById('cancelEditSpecialityBtn').addEventListener('click', function() {
        document.getElementById('editSpecialityModal').style.display = 'none';
    });

    document.getElementById('editSpecialityForm').addEventListener('submit', function(e) {
        e.preventDefault();
        updateSpeciality();
    });

    // Disable Speciality Modal
    document.getElementById('closeDisableSpecialityModal').addEventListener('click', function() {
        document.getElementById('disableSpecialityModal').style.display = 'none';
    });

    document.getElementById('cancelDisableSpecialityBtn').addEventListener('click', function() {
        document.getElementById('disableSpecialityModal').style.display = 'none';
    });

    document.getElementById('disableSpecialityForm').addEventListener('submit', function(e) {
        e.preventDefault();
        disableSpecialityConfirm();
    });

    // Enable Speciality Modal
    document.getElementById('closeEnableSpecialityModal').addEventListener('click', function() {
        document.getElementById('enableSpecialityModal').style.display = 'none';
    });

    document.getElementById('cancelEnableSpecialityBtn').addEventListener('click', function() {
        document.getElementById('enableSpecialityModal').style.display = 'none';
    });

    document.getElementById('enableSpecialityForm').addEventListener('submit', function(e) {
        e.preventDefault();
        enableSpecialityConfirm();
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

// Generate auto code for new speciality
async function generateSpecialityCode() {
    try {
        // Get the next available code number
        const response = await fetch(`${SPECIALITIES_API}/next-code`);
        const result = await response.json();
        
        if (result.success) {
            document.getElementById('code').value = result.code;
        } else {
            // Fallback: generate a simple sequential code
            const existingCodes = specialities.map(s => s.code).filter(code => code.startsWith('SP-'));
            const nextNumber = existingCodes.length + 1;
            document.getElementById('code').value = `SP-${nextNumber.toString().padStart(3, '0')}`;
        }
    } catch (error) {
        console.error('Error generating code:', error);
        // Fallback: generate a simple sequential code
        const existingCodes = specialities.map(s => s.code).filter(code => code.startsWith('SP-'));
        const nextNumber = existingCodes.length + 1;
        document.getElementById('code').value = `SP-${nextNumber.toString().padStart(3, '0')}`;
    }
}

// Create new speciality
async function createSpeciality() {
    const form = document.getElementById('addSpecialityForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    try {
        const response = await fetch(SPECIALITIES_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Speciality created successfully! Available for doctor selection.', 'success');
            document.getElementById('addSpecialityModal').style.display = 'none';
            loadSpecialities();
            loadStatistics();
        } else {
            showNotification('Error creating speciality: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error creating speciality:', error);
        showNotification('Error creating speciality. Please try again.', 'error');
    }
}

// Edit speciality
async function editSpeciality(specialityId) {
    try {
        const response = await fetch(`${SPECIALITIES_API}/${specialityId}`);
        const result = await response.json();
        
        if (result.success) {
            const speciality = result.data;
            
            // Populate form fields
            document.getElementById('editSpecialityId').value = speciality._id;
            document.getElementById('editCode').value = speciality.code;
            document.getElementById('editArName').value = speciality.arName;
            document.getElementById('editEnName').value = speciality.enName;
            
            document.getElementById('editSpecialityModal').style.display = 'block';
        } else {
            showNotification('Error loading speciality: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading speciality:', error);
        showNotification('Error loading speciality. Please try again.', 'error');
    }
}

// Update speciality
async function updateSpeciality() {
    const form = document.getElementById('editSpecialityForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const specialityId = data.id;
    
    // Remove the id from data
    delete data.id;
    
    try {
        const response = await fetch(`${SPECIALITIES_API}/${specialityId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Speciality information updated successfully!', 'success');
            document.getElementById('editSpecialityModal').style.display = 'none';
            loadSpecialities();
        } else {
            showNotification('Error updating speciality: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating speciality:', error);
        showNotification('Error updating speciality. Please try again.', 'error');
    }
}

// Disable speciality
function disableSpeciality(specialityId) {
    document.getElementById('disableSpecialityId').value = specialityId;
    
    // Auto-populate disabledBy with current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        const disabledByField = document.getElementById('disabledBy');
        disabledByField.value = currentUser.name || currentUser.username || 'Current User';
        
        // Add additional protection against modification
        protectReadOnlyField(disabledByField);
    }
    
    document.getElementById('disableSpecialityModal').style.display = 'block';
}

// Confirm disable speciality
async function disableSpecialityConfirm() {
    const form = document.getElementById('disableSpecialityForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const specialityId = data.id;
    
    try {
        const response = await fetch(`${SPECIALITIES_API}/${specialityId}/disable`, {
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
            showNotification('⚠️ Speciality disabled successfully! No longer available for selection.', 'warning');
            document.getElementById('disableSpecialityModal').style.display = 'none';
            loadSpecialities();
            loadStatistics();
        } else {
            showNotification('Error disabling speciality: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error disabling speciality:', error);
        showNotification('Error disabling speciality. Please try again.', 'error');
    }
}

// Enable speciality
function enableSpeciality(specialityId) {
    document.getElementById('enableSpecialityId').value = specialityId;
    
    // Auto-populate enabledBy with current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        const enabledByField = document.getElementById('enabledBy');
        enabledByField.value = currentUser.name || currentUser.username || 'Current User';
        
        // Add additional protection against modification
        protectReadOnlyField(enabledByField);
    }
    
    document.getElementById('enableSpecialityModal').style.display = 'block';
}

// Confirm enable speciality
async function enableSpecialityConfirm() {
    const form = document.getElementById('enableSpecialityForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const specialityId = data.id;
    
    try {
        const response = await fetch(`${SPECIALITIES_API}/${specialityId}/enable`, {
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
            showNotification('✅ Speciality enabled successfully! Available for doctor selection.', 'success');
            document.getElementById('enableSpecialityModal').style.display = 'none';
            loadSpecialities();
            loadStatistics();
        } else {
            showNotification('Error enabling speciality: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error enabling speciality:', error);
        showNotification('Error enabling speciality. Please try again.', 'error');
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

// Show table loading state
function showTableLoading() {
    const tbody = document.getElementById('specialitiesTableBody');
    if (tbody) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;"><i class="fas fa-spinner fa-spin" style="font-size: 24px; color: #007bff; margin-right: 10px;"></i><span style="font-size: 16px; color: #666;">Loading specialities...</span></td></tr>';
    }
}

// Clear table loading state
function clearTableLoading() {
    const tbody = document.getElementById('specialitiesTableBody');
    if (tbody && tbody.innerHTML.includes('Loading specialities...')) {
        // Loading will be cleared by displaySpecialities()
    }
}
