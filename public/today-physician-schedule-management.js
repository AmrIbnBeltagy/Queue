// API Base URL
const API_BASE_URL = '/api/today-physician-schedules';

// Global variables
let schedules = [];
let physicians = [];
let specialities = [];
let clinics = [];

// DOM elements
const schedulesTableBody = document.getElementById('schedulesTableBody');
const totalCount = document.getElementById('totalCount');
const addScheduleBtn = document.getElementById('addScheduleBtn');
const refreshBtn = document.getElementById('refreshBtn');
const scheduleModal = new bootstrap.Modal(document.getElementById('scheduleModal'));
const scheduleForm = document.getElementById('scheduleForm');
const scheduleModalTitle = document.getElementById('scheduleModalTitle');
const saveScheduleBtn = document.getElementById('saveScheduleBtn');

// Filter elements
const dateFilter = document.getElementById('dateFilter');
const physicianFilter = document.getElementById('physicianFilter');
const specialityFilter = document.getElementById('specialityFilter');
const clinicFilter = document.getElementById('clinicFilter');
const applyFiltersBtn = document.getElementById('applyFiltersBtn');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

// Form elements
const scheduleId = document.getElementById('scheduleId');
const physicianSelect = document.getElementById('physicianSelect');
const physicianName = document.getElementById('physicianName');
const speciality = document.getElementById('speciality');
const degree = document.getElementById('degree');
const clinicTimeFrom = document.getElementById('clinicTimeFrom');
const clinicTimeTo = document.getElementById('clinicTimeTo');
const day = document.getElementById('day');
const date = document.getElementById('date');
const clinicSelect = document.getElementById('clinicSelect');
const clinicName = document.getElementById('clinicName');
const location = document.getElementById('location');

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
});

// Initialize page
async function initializePage() {
    try {
        showLoading();
        
        // Set today's date as default
        const today = new Date().toISOString().split('T')[0];
        dateFilter.value = today;
        date.value = today;
        
        // Load initial data
        await Promise.all([
            loadPhysicians(),
            loadSpecialities(),
            loadClinics(),
            loadSchedules()
        ]);
        
    } catch (error) {
        console.error('Error initializing page:', error);
        showNotification('Error initializing page', 'error');
    } finally {
        hideLoading();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Add schedule button
    addScheduleBtn.addEventListener('click', () => {
        openAddScheduleModal();
    });
    
    // Refresh button
    refreshBtn.addEventListener('click', () => {
        loadSchedules();
    });
    
    // Apply filters button
    applyFiltersBtn.addEventListener('click', () => {
        loadSchedules();
    });
    
    // Clear filters button
    clearFiltersBtn.addEventListener('click', () => {
        clearFilters();
    });
    
    // Save schedule button
    saveScheduleBtn.addEventListener('click', () => {
        saveSchedule();
    });
    
    // Physician select change
    physicianSelect.addEventListener('change', (e) => {
        const selectedPhysician = physicians.find(p => p._id === e.target.value);
        if (selectedPhysician) {
            physicianName.value = selectedPhysician.name;
            speciality.value = selectedPhysician.speciality;
            degree.value = selectedPhysician.degree;
        }
    });
    
    // Clinic select change
    clinicSelect.addEventListener('change', (e) => {
        const selectedClinic = clinics.find(c => c._id === e.target.value);
        if (selectedClinic) {
            clinicName.value = selectedClinic.name;
            location.value = selectedClinic.location;
        }
    });
}

// Load physicians
async function loadPhysicians() {
    try {
        const response = await fetch(`${API_BASE_URL}/physicians/list`);
        const result = await response.json();
        
        if (result.success) {
            physicians = result.data;
            populatePhysicianSelects();
        }
    } catch (error) {
        console.error('Error loading physicians:', error);
    }
}

// Load specialities
async function loadSpecialities() {
    try {
        const response = await fetch(`${API_BASE_URL}/specialities/list`);
        const result = await response.json();
        
        if (result.success) {
            specialities = result.data;
            populateSpecialityFilter();
        }
    } catch (error) {
        console.error('Error loading specialities:', error);
    }
}

// Load clinics
async function loadClinics() {
    try {
        const response = await fetch(`${API_BASE_URL}/clinics/list`);
        const result = await response.json();
        
        if (result.success) {
            clinics = result.data;
            populateClinicSelects();
        }
    } catch (error) {
        console.error('Error loading clinics:', error);
    }
}

// Load schedules
async function loadSchedules() {
    try {
        showLoading();
        
        const params = new URLSearchParams();
        
        if (dateFilter.value) params.append('date', dateFilter.value);
        if (physicianFilter.value) params.append('physicianId', physicianFilter.value);
        if (specialityFilter.value) params.append('speciality', specialityFilter.value);
        if (clinicFilter.value) params.append('clinic', clinicFilter.value);
        
        const response = await fetch(`${API_BASE_URL}?${params.toString()}`);
        const result = await response.json();
        
        if (result.success) {
            schedules = result.data;
            displaySchedules();
            totalCount.textContent = `Total: ${schedules.length}`;
        } else {
            showNotification('Error loading schedules: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Error loading schedules:', error);
        showNotification('Error loading schedules', 'error');
    } finally {
        hideLoading();
    }
}

// Display schedules
function displaySchedules() {
    if (schedules.length === 0) {
        schedulesTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted">
                    <i class="fas fa-calendar-times"></i> No schedules found
                </td>
            </tr>
        `;
        return;
    }
    
    schedulesTableBody.innerHTML = schedules.map(schedule => `
        <tr>
            <td>${schedule.physicianName}</td>
            <td>${schedule.speciality}</td>
            <td>${schedule.degree}</td>
            <td>${schedule.clinicTimeFrom} - ${schedule.clinicTimeTo}</td>
            <td>${schedule.day}</td>
            <td>${formatDate(schedule.date)}</td>
            <td>${schedule.clinicName}</td>
            <td>${schedule.location}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="editSchedule('${schedule._id}')">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSchedule('${schedule._id}')">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

// Populate physician selects
function populatePhysicianSelects() {
    const options = physicians.map(physician => 
        `<option value="${physician._id}">${physician.name} (${physician.speciality})</option>`
    ).join('');
    
    physicianSelect.innerHTML = '<option value="">Select Physician</option>' + options;
    physicianFilter.innerHTML = '<option value="">All Physicians</option>' + options;
}

// Populate speciality filter
function populateSpecialityFilter() {
    const uniqueSpecialities = [...new Set(specialities.map(s => s.name))];
    const options = uniqueSpecialities.map(spec => 
        `<option value="${spec}">${spec}</option>`
    ).join('');
    
    specialityFilter.innerHTML = '<option value="">All Specialities</option>' + options;
}

// Populate clinic selects
function populateClinicSelects() {
    const options = clinics.map(clinic => 
        `<option value="${clinic._id}">${clinic.name} (${clinic.location})</option>`
    ).join('');
    
    clinicSelect.innerHTML = '<option value="">Select Clinic</option>' + options;
    clinicFilter.innerHTML = '<option value="">All Clinics</option>' + options;
}

// Open add schedule modal
function openAddScheduleModal() {
    scheduleModalTitle.textContent = 'Add New Schedule';
    scheduleForm.reset();
    scheduleId.value = '';
    scheduleModal.show();
}

// Edit schedule
function editSchedule(id) {
    const schedule = schedules.find(s => s._id === id);
    if (!schedule) return;
    
    scheduleModalTitle.textContent = 'Edit Schedule';
    scheduleId.value = schedule._id;
    physicianSelect.value = schedule.physicianId._id || schedule.physicianId;
    physicianName.value = schedule.physicianName;
    speciality.value = schedule.speciality;
    degree.value = schedule.degree;
    clinicTimeFrom.value = schedule.clinicTimeFrom;
    clinicTimeTo.value = schedule.clinicTimeTo;
    day.value = schedule.day;
    date.value = formatDateForInput(schedule.date);
    clinicSelect.value = '';
    clinicName.value = schedule.clinicName;
    location.value = schedule.location;
    
    scheduleModal.show();
}

// Delete schedule
async function deleteSchedule(id) {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Schedule deleted successfully', 'success');
            loadSchedules();
        } else {
            showNotification('Error deleting schedule: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Error deleting schedule:', error);
        showNotification('Error deleting schedule', 'error');
    } finally {
        hideLoading();
    }
}

// Save schedule
async function saveSchedule() {
    if (!scheduleForm.checkValidity()) {
        scheduleForm.reportValidity();
        return;
    }
    
    try {
        showLoading();
        
        const scheduleData = {
            physicianId: physicianSelect.value,
            physicianName: physicianName.value,
            speciality: speciality.value,
            degree: degree.value,
            clinicTimeFrom: clinicTimeFrom.value,
            clinicTimeTo: clinicTimeTo.value,
            day: day.value,
            date: date.value,
            clinicName: clinicName.value,
            location: location.value
        };
        
        const url = scheduleId.value ? `${API_BASE_URL}/${scheduleId.value}` : API_BASE_URL;
        const method = scheduleId.value ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(scheduleData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(
                scheduleId.value ? 'Schedule updated successfully' : 'Schedule created successfully', 
                'success'
            );
            scheduleModal.hide();
            loadSchedules();
        } else {
            showNotification('Error saving schedule: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Error saving schedule:', error);
        showNotification('Error saving schedule', 'error');
    } finally {
        hideLoading();
    }
}

// Clear filters
function clearFilters() {
    dateFilter.value = new Date().toISOString().split('T')[0];
    physicianFilter.value = '';
    specialityFilter.value = '';
    clinicFilter.value = '';
    loadSchedules();
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB');
}

// Format date for input
function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Show loading
function showLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

// Hide loading
function hideLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.getElementById('notificationContainer').appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}
