// Show page after authentication check passed
document.body.classList.add('authenticated');

// Global variables
let doctors = [];
let filteredDoctors = [];
let degrees = [];
let specialities = [];
let currentPage = 1;
let itemsPerPage = 10;
let sortColumn = -1;
let sortDirection = 'asc';

// API Endpoints
const DOCTORS_API = `${API_BASE_URL}/doctors`;
const DEGREES_API = `${API_BASE_URL}/degrees`;
const SPECIALITIES_API = `${API_BASE_URL}/specialities`;

// Initialize the page
DOMUtils.initializePage(async function() {
    loadDoctors();
    loadStatistics();
    loadDegrees();
    loadSpecialities();
    loadSpecialitiesForFilter();
    setupEventListeners();
    setupModalEventListeners();
});

// Load doctors from API
async function loadDoctors() {
    try {
        const response = await fetch(DOCTORS_API);
        const result = await response.json();
        
        if (result.success) {
            doctors = result.data;
            filteredDoctors = [...doctors];
            displayDoctors();
            updatePagination();
        } else {
            if (response.status === 503) {
                showNotification('Database connection not available. Please check your MongoDB connection.', 'error');
            } else {
                showNotification('Error loading doctors: ' + result.message, 'error');
            }
        }
    } catch (error) {
        console.error('Error loading doctors:', error);
        showNotification('Error loading doctors. Please check if the server is running.', 'error');
    }
}

// Load specialities for filter dropdown
async function loadSpecialitiesForFilter() {
    try {
        const response = await fetch(SPECIALITIES_API);
        const result = await response.json();
        
        if (result.success) {
            const specialityFilter = document.getElementById('specialityFilter');
            
            // Clear existing options except "All Specialities"
            specialityFilter.innerHTML = '<option value="">All Specialities</option>';
            
            // Add specialities from database
            result.data.forEach(speciality => {
                const option = document.createElement('option');
                option.value = speciality._id;
                option.textContent = speciality.enName || speciality.arName || speciality.code;
                specialityFilter.appendChild(option);
            });
        } else {
            console.error('Error loading specialities for filter:', result.message);
        }
    } catch (error) {
        console.error('Error loading specialities for filter:', error);
    }
}

// Load doctor statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${DOCTORS_API}/stats/summary`);
        const result = await response.json();
        
        if (result.success) {
            const stats = result.data;
            document.getElementById('totalDoctors').textContent = stats.total;
            document.getElementById('activeDoctors').textContent = stats.active;
            document.getElementById('disabledDoctors').textContent = stats.disabled;
            document.getElementById('disabledDoctors').textContent = stats.disabled;
        } else {
            if (response.status === 503) {
                // Set default values when database is not available
                document.getElementById('totalDoctors').textContent = '0';
                document.getElementById('activeDoctors').textContent = '0';
                document.getElementById('disabledDoctors').textContent = '0';
                document.getElementById('disabledDoctors').textContent = '0';
            }
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
        // Set default values on error
        document.getElementById('totalDoctors').textContent = '0';
        document.getElementById('activeDoctors').textContent = '0';
        document.getElementById('disabledDoctors').textContent = '0';
        document.getElementById('disabledDoctors').textContent = '0';
    }
}

// Load degrees from API
async function loadDegrees() {
    try {
        const response = await fetch(DEGREES_API);
        const result = await response.json();
        
        if (result.success) {
            degrees = result.data;
            populateDegreeDropdowns();
        } else {
            console.error('Error loading degrees:', result.message);
        }
    } catch (error) {
        console.error('Error loading degrees:', error);
    }
}

// Load specialities from API
async function loadSpecialities() {
    try {
        const response = await fetch(SPECIALITIES_API);
        const result = await response.json();
        
        if (result.success) {
            specialities = result.data;
            populateSpecialityDropdowns();
        } else {
            console.error('Error loading specialities:', result.message);
        }
    } catch (error) {
        console.error('Error loading specialities:', error);
    }
}

// Populate degree dropdowns
function populateDegreeDropdowns() {
    const addDegreeSelect = document.getElementById('degree');
    const editDegreeSelect = document.getElementById('editDegree');
    
    // Clear existing options except the first one
    addDegreeSelect.innerHTML = '<option value="">Select Degree</option>';
    editDegreeSelect.innerHTML = '<option value="">Select Degree</option>';
    
    degrees.forEach(degree => {
        if (degree.isActive && !degree.isDisabled) {
            const option1 = document.createElement('option');
            option1.value = degree._id;
            option1.textContent = `${degree.enName} (${degree.arName})`;
            addDegreeSelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = degree._id;
            option2.textContent = `${degree.enName} (${degree.arName})`;
            editDegreeSelect.appendChild(option2);
        }
    });
}

// Populate speciality dropdowns
function populateSpecialityDropdowns() {
    const addSpecialitySelect = document.getElementById('speciality');
    const editSpecialitySelect = document.getElementById('editSpeciality');
    
    // Clear existing options except the first one
    addSpecialitySelect.innerHTML = '<option value="">Select Speciality</option>';
    editSpecialitySelect.innerHTML = '<option value="">Select Speciality</option>';
    
    specialities.forEach(speciality => {
        if (speciality.isActive && !speciality.isDisabled) {
            const option1 = document.createElement('option');
            option1.value = speciality._id;
            option1.textContent = `${speciality.enName} (${speciality.arName})`;
            addSpecialitySelect.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = speciality._id;
            option2.textContent = `${speciality.enName} (${speciality.arName})`;
            editSpecialitySelect.appendChild(option2);
        }
    });
}

// Display doctors in table
function displayDoctors() {
    const tbody = document.getElementById('doctorsTableBody');
    tbody.innerHTML = '';
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageDoctors = filteredDoctors.slice(startIndex, endIndex);
    
    if (pageDoctors.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted">
                    <i class="fas fa-user-md"></i> No doctors found
                </td>
            </tr>
        `;
        return;
    }
    
    pageDoctors.forEach(doctor => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="badge badge-primary">${doctor.code}</span></td>
            <td>
                <div class="user-info">
                    <div class="user-name">${doctor.name}</div>
                    <div class="user-username">@${doctor.username}</div>
                </div>
            </td>
            <td><span class="speciality-badge">${doctor.speciality ? doctor.speciality.enName : 'N/A'}</span></td>
            <td>${doctor.degree ? doctor.degree.enName : 'N/A'}</td>
            <td>${doctor.email}</td>
            <td>${doctor.phone}</td>
            <td>
                <span class="status-badge ${getStatusClass(doctor.status)}">
                    ${doctor.status}
                </span>
            </td>
            <td>${formatDate(doctor.createdAt)}</td>
            <td>
                ${doctor.isDisabled && doctor.disabledReason ? 
                    `<div class="disable-reason" title="Disabled by: ${doctor.disabledBy || 'Unknown'} on ${formatDate(doctor.disabledDate)}">
                        <i class="fas fa-exclamation-triangle"></i>
                        <span>${doctor.disabledReason}</span>
                    </div>` : 
                    '<span class="text-muted">-</span>'
                }
            </td>
            <td>
                <div class="action-buttons">
                    <button class="action-btn btn-view view-doctor-btn" data-doctor-id="${doctor._id}" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="action-btn btn-edit edit-doctor-btn" data-doctor-id="${doctor._id}" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    ${doctor.isDisabled ? 
                        `<button class="action-btn btn-success enable-doctor-btn" data-doctor-id="${doctor._id}" title="Enable">
                            <i class="fas fa-user-check"></i>
                        </button>` :
                        `<button class="action-btn btn-delete disable-doctor-btn" data-doctor-id="${doctor._id}" title="Disable">
                            <i class="fas fa-user-times"></i>
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
    // Search functionality - using DOMUtils for safety
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            filteredDoctors = doctors.filter(doctor => 
                doctor.name.toLowerCase().includes(searchTerm) ||
                doctor.code.toLowerCase().includes(searchTerm) ||
                doctor.email.toLowerCase().includes(searchTerm) ||
                doctor.speciality.toLowerCase().includes(searchTerm)
            );
            currentPage = 1;
            displayDoctors();
            updatePagination();
        });
    }

    // Filter functionality - using DOMUtils for safety
    DOMUtils.safeAddEventListener('statusFilter', 'change', applyFilters);
    DOMUtils.safeAddEventListener('specialityFilter', 'change', applyFilters);
    DOMUtils.safeAddEventListener('clearFiltersBtn', 'click', clearFilters);

    // Pagination - using DOMUtils for safety
    DOMUtils.safeAddEventListener('prevBtn', 'click', function() {
        if (currentPage > 1) {
            currentPage--;
            displayDoctors();
            updatePagination();
        }
    });

    DOMUtils.safeAddEventListener('nextBtn', 'click', function() {
        const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayDoctors();
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
        if (e.target.closest('.view-doctor-btn')) {
            const doctorId = e.target.closest('.view-doctor-btn').getAttribute('data-doctor-id');
            viewDoctor(doctorId);
        } else if (e.target.closest('.edit-doctor-btn')) {
            const doctorId = e.target.closest('.edit-doctor-btn').getAttribute('data-doctor-id');
            editDoctor(doctorId);
        } else if (e.target.closest('.disable-doctor-btn')) {
            const doctorId = e.target.closest('.disable-doctor-btn').getAttribute('data-doctor-id');
            disableDoctor(doctorId);
        } else if (e.target.closest('.enable-doctor-btn')) {
            const doctorId = e.target.closest('.enable-doctor-btn').getAttribute('data-doctor-id');
            enableDoctor(doctorId);
        }
    });
}

// Apply filters
function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const specialityFilter = document.getElementById('specialityFilter').value;
    
    filteredDoctors = doctors.filter(doctor => {
        let matches = true;
        
        if (statusFilter) {
            const status = doctor.isDisabled ? 'disabled' : (doctor.isActive ? 'active' : 'disabled');
            matches = matches && status === statusFilter;
        }
        
        if (specialityFilter) {
            // Handle both object and string speciality formats
            const doctorSpeciality = typeof doctor.speciality === 'object' 
                ? doctor.speciality._id || doctor.speciality 
                : doctor.speciality;
            matches = matches && doctorSpeciality === specialityFilter;
        }
        
        return matches;
    });
    
    currentPage = 1;
    displayDoctors();
    updatePagination();
}

// Clear filters
function clearFilters() {
    document.getElementById('statusFilter').value = '';
    document.getElementById('specialityFilter').value = '';
    document.getElementById('searchInput').value = '';
    filteredDoctors = [...doctors];
    currentPage = 1;
    displayDoctors();
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
    
    filteredDoctors.sort((a, b) => {
        let aVal, bVal;
        
        switch (column) {
            case 0: aVal = a.code; bVal = b.code; break;
            case 1: aVal = a.name; bVal = b.name; break;
            case 2: aVal = a.speciality; bVal = b.speciality; break;
            case 3: aVal = a.degree; bVal = b.degree; break;
            case 4: aVal = a.email; bVal = b.email; break;
            case 5: aVal = a.phone; bVal = b.phone; break;
            case 6: aVal = a.status; bVal = b.status; break;
            case 7: aVal = new Date(a.createdAt); bVal = new Date(b.createdAt); break;
            default: return 0;
        }
        
        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });
    
    displayDoctors();
    updatePagination();
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredDoctors.length / itemsPerPage);
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, filteredDoctors.length);
    
    document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
    document.getElementById('prevBtn').disabled = currentPage === 1;
    document.getElementById('nextBtn').disabled = currentPage === totalPages || totalPages === 0;
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Add Doctor Modal - using DOMUtils for safety
    DOMUtils.safeAddEventListener('addDoctorBtn', 'click', function() {
        const modal = document.getElementById('addDoctorModal');
        const form = document.getElementById('addDoctorForm');
        if (modal) modal.style.display = 'block';
        if (form) form.reset();
    });

    DOMUtils.safeAddEventListener('closeAddDoctorModal', 'click', function() {
        const modal = document.getElementById('addDoctorModal');
        if (modal) modal.style.display = 'none';
    });

    DOMUtils.safeAddEventListener('cancelAddDoctorBtn', 'click', function() {
        const modal = document.getElementById('addDoctorModal');
        if (modal) modal.style.display = 'none';
    });

    DOMUtils.safeAddEventListener('addDoctorForm', 'submit', function(e) {
        e.preventDefault();
        createDoctor();
    });

    // Edit Doctor Modal - using DOMUtils for safety
    DOMUtils.safeAddEventListener('closeEditDoctorModal', 'click', function() {
        const modal = document.getElementById('editDoctorModal');
        if (modal) modal.style.display = 'none';
    });

    DOMUtils.safeAddEventListener('cancelEditDoctorBtn', 'click', function() {
        const modal = document.getElementById('editDoctorModal');
        if (modal) modal.style.display = 'none';
    });

    DOMUtils.safeAddEventListener('editDoctorForm', 'submit', function(e) {
        e.preventDefault();
        updateDoctor();
    });

    // Disable Doctor Modal - using DOMUtils for safety
    DOMUtils.safeAddEventListener('closeDisableDoctorModal', 'click', function() {
        const modal = document.getElementById('disableDoctorModal');
        if (modal) modal.style.display = 'none';
    });

    DOMUtils.safeAddEventListener('cancelDisableDoctorBtn', 'click', function() {
        const modal = document.getElementById('disableDoctorModal');
        if (modal) modal.style.display = 'none';
    });

    DOMUtils.safeAddEventListener('disableDoctorForm', 'submit', function(e) {
        e.preventDefault();
        disableDoctorConfirm();
    });

    // Enable Doctor Modal - using DOMUtils for safety
    DOMUtils.safeAddEventListener('closeEnableDoctorModal', 'click', function() {
        const modal = document.getElementById('enableDoctorModal');
        if (modal) modal.style.display = 'none';
    });

    DOMUtils.safeAddEventListener('cancelEnableDoctorBtn', 'click', function() {
        const modal = document.getElementById('enableDoctorModal');
        if (modal) modal.style.display = 'none';
    });

    DOMUtils.safeAddEventListener('enableDoctorForm', 'submit', function(e) {
        e.preventDefault();
        enableDoctorConfirm();
    });

    // Doctor Details Modal - using DOMUtils for safety
    DOMUtils.safeAddEventListener('closeDoctorDetailsModal', 'click', function() {
        const modal = document.getElementById('doctorDetailsModal');
        if (modal) modal.style.display = 'none';
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

// Create new doctor
async function createDoctor() {
    const form = document.getElementById('addDoctorForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    
    try {
        const response = await fetch(DOCTORS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Doctor created successfully! The doctor can now log in with their credentials.', 'success');
            document.getElementById('addDoctorModal').style.display = 'none';
            loadDoctors();
            loadStatistics();
        } else {
            showNotification('Error creating doctor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error creating doctor:', error);
        showNotification('Error creating doctor. Please try again.', 'error');
    }
}

// View doctor details
async function viewDoctor(doctorId) {
    try {
        const response = await fetch(`${DOCTORS_API}/${doctorId}`);
        const result = await response.json();
        
        if (result.success) {
            const doctor = result.data;
            const detailsHtml = `
                <div class="doctor-details">
                    <div class="detail-section">
                        <h3><i class="fas fa-user"></i> Basic Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Name:</label>
                                <span>${doctor.name}</span>
                            </div>
                            <div class="detail-item">
                                <label>Code:</label>
                                <span>${doctor.code}</span>
                            </div>
                            <div class="detail-item">
                                <label>Email:</label>
                                <span>${doctor.email}</span>
                            </div>
                            <div class="detail-item">
                                <label>Phone:</label>
                                <span>${doctor.phone}</span>
                            </div>
                            <div class="detail-item">
                                <label>Username:</label>
                                <span>@${doctor.username}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3><i class="fas fa-stethoscope"></i> Medical Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Speciality:</label>
                                <span>${doctor.speciality ? doctor.speciality.enName || doctor.speciality : 'Not specified'}</span>
                            </div>
                            <div class="detail-item">
                                <label>Degree:</label>
                                <span>${doctor.degree ? doctor.degree.enName || doctor.degree : 'Not specified'}</span>
                            </div>
                            <div class="detail-item">
                                <label>License Number:</label>
                                <span>${doctor.licenseNumber || 'Not provided'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="detail-section">
                        <h3><i class="fas fa-info-circle"></i> Status Information</h3>
                        <div class="detail-grid">
                            <div class="detail-item">
                                <label>Status:</label>
                                <span class="status-badge ${getStatusClass(doctor.status)}">${doctor.status}</span>
                            </div>
                            <div class="detail-item">
                                <label>Created:</label>
                                <span>${formatDate(doctor.createdAt)}</span>
                            </div>
                            ${doctor.isDisabled ? `
                                <div class="detail-item">
                                    <label>Disabled Date:</label>
                                    <span>${formatDate(doctor.disabledDate)}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Disabled Reason:</label>
                                    <span>${doctor.disabledReason}</span>
                                </div>
                                <div class="detail-item">
                                    <label>Disabled By:</label>
                                    <span>${doctor.disabledBy}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
            
            document.getElementById('doctorDetails').innerHTML = detailsHtml;
            document.getElementById('doctorDetailsModal').style.display = 'block';
        } else {
            showNotification('Error loading doctor details: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading doctor details:', error);
        showNotification('Error loading doctor details. Please try again.', 'error');
    }
}

// Edit doctor
async function editDoctor(doctorId) {
    try {
        const response = await fetch(`${DOCTORS_API}/${doctorId}`);
        const result = await response.json();
        
        if (result.success) {
            const doctor = result.data;
            
            // Populate form fields
            document.getElementById('editDoctorId').value = doctor._id;
            document.getElementById('editDoctorName').value = doctor.name;
            document.getElementById('editDoctorCode').value = doctor.code;
            document.getElementById('editDoctorEmail').value = doctor.email;
            document.getElementById('editDoctorPhone').value = doctor.phone;
            document.getElementById('editSpeciality').value = doctor.speciality ? doctor.speciality._id : '';
            document.getElementById('editDegree').value = doctor.degree ? doctor.degree._id : '';
            document.getElementById('editLicenseNumber').value = doctor.licenseNumber || '';
            
            document.getElementById('editDoctorModal').style.display = 'block';
        } else {
            showNotification('Error loading doctor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading doctor:', error);
        showNotification('Error loading doctor. Please try again.', 'error');
    }
}

// Update doctor
async function updateDoctor() {
    const form = document.getElementById('editDoctorForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const doctorId = data.id;
    
    // Remove the id from data
    delete data.id;
    
    try {
        const response = await fetch(`${DOCTORS_API}/${doctorId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('✅ Doctor information updated successfully!', 'success');
            document.getElementById('editDoctorModal').style.display = 'none';
            loadDoctors();
        } else {
            showNotification('Error updating doctor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error updating doctor:', error);
        showNotification('Error updating doctor. Please try again.', 'error');
    }
}

// Disable doctor
function disableDoctor(doctorId) {
    document.getElementById('disableDoctorId').value = doctorId;
    
    // Auto-populate disabledBy with current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        const disabledByField = document.getElementById('disabledBy');
        disabledByField.value = currentUser.name || currentUser.username || 'Current User';
        
        // Add additional protection against modification
        protectReadOnlyField(disabledByField);
    }
    
    document.getElementById('disableDoctorModal').style.display = 'block';
}

// Confirm disable doctor
async function disableDoctorConfirm() {
    const form = document.getElementById('disableDoctorForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const doctorId = data.id;
    
    try {
        const response = await fetch(`${DOCTORS_API}/${doctorId}/disable`, {
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
            showNotification('⚠️ Doctor disabled successfully! The doctor account has been deactivated.', 'warning');
            document.getElementById('disableDoctorModal').style.display = 'none';
            loadDoctors();
            loadStatistics();
        } else {
            showNotification('Error disabling doctor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error disabling doctor:', error);
        showNotification('Error disabling doctor. Please try again.', 'error');
    }
}

// Enable doctor
function enableDoctor(doctorId) {
    document.getElementById('enableDoctorId').value = doctorId;
    
    // Auto-populate enabledBy with current user
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (currentUser) {
        const enabledByField = document.getElementById('enabledBy');
        enabledByField.value = currentUser.name || currentUser.username || 'Current User';
        
        // Add additional protection against modification
        protectReadOnlyField(enabledByField);
    }
    
    document.getElementById('enableDoctorModal').style.display = 'block';
}

// Confirm enable doctor
async function enableDoctorConfirm() {
    const form = document.getElementById('enableDoctorForm');
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const doctorId = data.id;
    
    try {
        const response = await fetch(`${DOCTORS_API}/${doctorId}/enable`, {
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
            showNotification('✅ Doctor enabled successfully! The doctor account has been reactivated.', 'success');
            document.getElementById('enableDoctorModal').style.display = 'none';
            loadDoctors();
            loadStatistics();
        } else {
            showNotification('Error enabling doctor: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error enabling doctor:', error);
        showNotification('Error enabling doctor. Please try again.', 'error');
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
