// Show page after authentication check passed
document.body.classList.add('authenticated');

// State
let schedules = [];
let filteredSchedules = [];
let physicians = [];
let clinics = [];
let degrees = [];
let currentScheduleId = null;
let scheduleToDelete = null;
let currentPage = 1;
let itemsPerPage = 10;

// API Endpoints
const SCHEDULES_API = `${API_BASE_URL}/physician-schedules`;
const PHYSICIANS_API = `${API_BASE_URL}/doctors`;
const CLINICS_API = `${API_BASE_URL}/clinics`;
const DEGREES_API = `${API_BASE_URL}/degrees`;

// Initialize
DOMUtils.initializePage(async function() {
    // Check role-based access
    if (!checkRoleAccess()) {
        return;
    }
    
    await loadPhysicians();
    await loadDegrees();
    loadSchedules();
    loadStatistics();
    setupEventListeners();
    setupModalEventListeners();
    setupDayCheckboxes();
});

// Load schedules from API
async function loadSchedules() {
    try {
        // Show loading overlay
        if (typeof showTableDataLoading === 'function') {
            showTableDataLoading('schedulesTable', 'Loading schedules...');
        } else if (typeof showLoading === 'function') {
            showLoading('Loading schedules...');
        }
        
        // Try to load schedules with populated physician data
        let response = await fetch(`${SCHEDULES_API}?populate=physician.degree,physician.speciality`);
        let result = await response.json();
        
        // If populate doesn't work, try regular endpoint
        if (!result.success || !result.data) {
            response = await fetch(SCHEDULES_API);
            result = await response.json();
        }
        
        if (result.success) {
            schedules = result.data;
            filteredSchedules = [...schedules];
            
            // Ensure we have full physician data for all schedules
            await enrichSchedulePhysicians();
            
            // Update physician filter dropdown with only physicians who have active schedules
            populatePhysicianDropdowns();
            
            displaySchedules();
            updatePagination();
        } else {
            showNotification('Error loading schedules: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading schedules:', error);
        showNotification('Error loading schedules. Please try again.', 'error');
    } finally {
        // Hide loading overlay
        if (typeof hideAllLoading === 'function') {
            hideAllLoading();
        } else if (typeof hideLoading === 'function') {
            hideLoading();
        }
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${SCHEDULES_API}/stats/summary`);
        const result = await response.json();
        
        if (result.success) {
            DOMUtils.safeSetTextContent('totalSchedules', result.data.total);
            DOMUtils.safeSetTextContent('activeSchedules', result.data.active);
            DOMUtils.safeSetTextContent('inactiveSchedules', result.data.inactive);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Load physicians
async function loadPhysicians() {
    try {
        // Try to load with populated degree and speciality
        const response = await fetch(`${PHYSICIANS_API}?populate=degree,speciality`);
        const result = await response.json();
        
        if (result.success) {
            physicians = result.data;
            console.log('Loaded physicians with populated data:', physicians.length);
            populatePhysicianDropdowns();
        } else {
            // Fallback to regular endpoint
            const fallbackResponse = await fetch(PHYSICIANS_API);
            const fallbackResult = await fallbackResponse.json();
            if (fallbackResult.success) {
                physicians = fallbackResult.data;
                populatePhysicianDropdowns();
            }
        }
    } catch (error) {
        console.error('Error loading physicians:', error);
        // Try fallback
        try {
            const fallbackResponse = await fetch(PHYSICIANS_API);
            const fallbackResult = await fallbackResponse.json();
            if (fallbackResult.success) {
                physicians = fallbackResult.data;
                populatePhysicianDropdowns();
            }
        } catch (fallbackError) {
            console.error('Error loading physicians (fallback):', fallbackError);
        }
    }
}

// Get physician by ID with full data
async function getPhysicianById(physicianId) {
    try {
        // First check if we already have it in physicians array
        let physician = physicians.find(p => p._id === physicianId);
        if (physician && physician.degree && typeof physician.degree === 'object') {
            return physician; // Already has populated degree
        }
        
        // Fetch from API with populate
        const response = await fetch(`${PHYSICIANS_API}/${physicianId}?populate=degree,speciality`);
        const result = await response.json();
        
        if (result.success && result.data) {
            // Update in physicians array
            const index = physicians.findIndex(p => p._id === physicianId);
            if (index !== -1) {
                physicians[index] = result.data;
            } else {
                physicians.push(result.data);
            }
            return result.data;
        }
        
        return physician; // Return what we have
    } catch (error) {
        console.error('Error fetching physician:', error);
        return physicians.find(p => p._id === physicianId);
    }
}

// Load degrees
async function loadDegrees() {
    try {
        const response = await fetch(DEGREES_API);
        const result = await response.json();
        
        if (result.success) {
            degrees = result.data || [];
            console.log('Loaded degrees:', degrees.length);
        } else {
            console.warn('Failed to load degrees:', result.message);
        }
    } catch (error) {
        console.error('Error loading degrees:', error);
        degrees = [];
    }
}

// Enrich schedule physicians with full data
async function enrichSchedulePhysicians() {
    const physicianIds = new Set();
    
    // Collect all unique physician IDs
    schedules.forEach(schedule => {
        const physicianId = typeof schedule.physician === 'object' && schedule.physician._id 
            ? schedule.physician._id 
            : schedule.physician;
        if (physicianId) {
            physicianIds.add(physicianId);
        }
    });
    
    // Fetch missing physicians
    for (const physicianId of physicianIds) {
        const existingPhysician = physicians.find(p => p._id === physicianId);
        if (!existingPhysician || !existingPhysician.degree || typeof existingPhysician.degree !== 'object') {
            await getPhysicianById(physicianId);
        }
    }
}


// Populate physician dropdowns
function populatePhysicianDropdowns() {
    const physicianSelect = document.getElementById('physicianSelect');
    const physicianFilter = document.getElementById('physicianFilter');
    
    // Get physicians with active schedules only
    const physiciansWithActiveSchedules = getPhysiciansWithActiveSchedules();
    
    if (physicianSelect) {
        physicianSelect.innerHTML = '<option value="">Choose a physician...</option>';
        physicians.forEach(physician => {
            const option = document.createElement('option');
            option.value = physician._id;
            option.textContent = physician.name;
            physicianSelect.appendChild(option);
        });
    }
    
    if (physicianFilter) {
        physicianFilter.innerHTML = '<option value="">All Physicians</option>';
        // Only show physicians with active schedules in the filter
        physiciansWithActiveSchedules.forEach(physician => {
            const option = document.createElement('option');
            option.value = physician._id;
            option.textContent = physician.name;
            physicianFilter.appendChild(option);
        });
    }
}

// Get physicians who have active schedules
function getPhysiciansWithActiveSchedules() {
    if (!schedules || schedules.length === 0) {
        return [];
    }
    
    // Get unique physician IDs from active schedules
    const activePhysicianIds = new Set();
    schedules.forEach(schedule => {
        if (schedule.isActive !== false) {
            const physicianId = typeof schedule.physician === 'object' && schedule.physician._id 
                ? schedule.physician._id 
                : schedule.physician;
            if (physicianId) {
                activePhysicianIds.add(physicianId);
            }
        }
    });
    
    // Get physician objects that have active schedules
    const physiciansWithActive = physicians.filter(physician => 
        activePhysicianIds.has(physician._id)
    );
    
    return physiciansWithActive;
}


// Display schedules
function displaySchedules() {
    const tbody = document.getElementById('schedulesTableBody');
    if (!tbody) return;
    
    const loadingRow = document.getElementById('loadingRow');
    const noSchedulesRow = document.getElementById('noSchedulesRow');

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageSchedules = filteredSchedules.slice(startIndex, endIndex);
    
    // Remove previous data rows
    tbody.querySelectorAll('tr.data-row').forEach(row => row.remove());

    if (pageSchedules.length === 0) {
        if (loadingRow) loadingRow.style.display = 'none';
        if (noSchedulesRow) noSchedulesRow.style.display = '';
        return;
    } else {
        if (noSchedulesRow) noSchedulesRow.style.display = 'none';
        if (loadingRow) loadingRow.style.display = 'none';
    }
    
    const rowsHtml = pageSchedules.map(schedule => {
        // Check if physician is already populated in the schedule data
        let physician = schedule.physician;
        if (typeof physician === 'object' && physician._id) {
            // Physician is already populated from backend
            console.log('Using populated physician:', physician);
        } else {
            // Physician is just an ID, find it in the physicians array
            const physicianId = schedule.physician;
            physician = physicians.find(p => p._id === physicianId);
            console.log('Schedule physician ID:', physicianId);
            console.log('Available physicians:', physicians.length);
            console.log('Found physician:', physician);
        }
        const clinic = clinics.find(c => c._id === schedule.clinic);
        
        // Resolve degree name with better logic
        let degreeName = 'N/A';
        if (physician) {
            // Try multiple ways to get degree
            if (physician.degree) {
                if (typeof physician.degree === 'object' && physician.degree !== null) {
                    // Degree is populated object
                    degreeName = physician.degree.enName || physician.degree.arName || physician.degree.name || physician.degree.label || 'N/A';
                } else if (typeof physician.degree === 'string') {
                    // Check if it's an ID (24 char hex) or a name
                    if (/^[0-9a-fA-F]{24}$/.test(physician.degree)) {
                        // It's an ID, find in degrees array
                        const degreeObj = degrees.find(d => d._id === physician.degree);
                        if (degreeObj) {
                            degreeName = degreeObj.enName || degreeObj.arName || degreeObj.name || degreeObj.label || 'N/A';
                        } else {
                            // Degree not found in array, try to fetch it
                            console.log('Degree ID not found in loaded degrees, ID:', physician.degree);
                        }
                    } else {
                        // It's a name string (not an ID)
                        degreeName = physician.degree;
                    }
                }
            } else if (physician.degreeName) {
                degreeName = physician.degreeName;
            } else if (physician.degreeId) {
                // Try to find by degreeId
                const degreeObj = degrees.find(d => d._id === physician.degreeId);
                if (degreeObj) {
                    degreeName = degreeObj.enName || degreeObj.arName || degreeObj.name || degreeObj.label || 'N/A';
                }
            }
            
            // Debug: log what we found
            if (degreeName === 'N/A') {
                console.log('Degree not found for physician:', {
                    name: physician.name,
                    physicianId: physician._id,
                    degree: physician.degree,
                    degreeName: physician.degreeName,
                    degreeId: physician.degreeId,
                    physicianData: physician
                });
            }
        } else {
            console.log('Physician not found for schedule:', schedule._id);
        }
        
        // Show only selected days
        const days = schedule.days && schedule.days.length > 0 ? 
            schedule.days.map(day => 
                `<span class="day-chip ${day}">${day.charAt(0).toUpperCase() + day.slice(1)}</span>`
            ).join('') : 
            '<span class="day-chip no-days">No days selected</span>';
        const statusClass = schedule.isActive ? 'status-active' : 'status-inactive';
        const statusText = schedule.isActive ? 'Active' : 'Inactive';
        const statusIcon = schedule.isActive ? 'fa-check-circle' : 'fa-times-circle';
        
        return `
            <tr class="data-row">
                <td>
                    <div class="user-info">
                        <div class="user-avatar">
                            <i class="fas fa-user-md"></i>
                        </div>
                        <div class="user-details">
                            <strong>${physician ? physician.name : 'Unknown'}</strong>
                            <small>${physician ? (physician.speciality ? (physician.speciality.arName || physician.speciality.enName || 'Unknown Speciality') : 'No Speciality') : ''}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <div style="color: #6c757d; font-weight: 500;">
                        <i class="fas fa-graduation-cap" style="margin-right: 6px; color: #1976d2;"></i>
                        <span>${degreeName}</span>
                    </div>
                </td>
                <td class="working-days-cell">
                    <span class="days-badge">${days}</span>
                </td>
                <td>
                    <div class="date-info">
                        <i class="fas fa-calendar"></i>
                        <span>${schedule.startDate ? new Date(schedule.startDate).toLocaleDateString() : 'Not set'}</span>
                    </div>
                </td>
                <td>
                    <div class="time-info">
                        <i class="fas fa-clock"></i>
                        <span>${formatTimeTo12Hour(schedule.startTime)} - ${formatTimeTo12Hour(schedule.endTime)}</span>
                    </div>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${statusIcon}"></i>
                        <span>${statusText}</span>
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-copy" data-schedule-id="${schedule._id}" data-action="copy" title="Copy Schedule">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="action-btn btn-toggle ${schedule.isActive ? 'active' : 'inactive'}" data-schedule-id="${schedule._id}" data-action="toggle" title="${schedule.isActive ? 'Deactivate Schedule' : 'Activate Schedule'}">
                            <i class="fas ${schedule.isActive ? 'fa-toggle-on' : 'fa-toggle-off'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Append rows after the placeholder rows
    const tempContainer = document.createElement('tbody');
    tempContainer.innerHTML = rowsHtml;
    Array.from(tempContainer.children).forEach(tr => tbody.appendChild(tr));
}

// Update pagination
function updatePagination() {
    const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, filteredSchedules.length);
    
    // Update pagination info
    const paginationInfo = document.getElementById('paginationInfo');
    if (paginationInfo) {
        paginationInfo.textContent = `Showing ${startIndex} to ${endIndex} of ${filteredSchedules.length} entries`;
    }
    
    // Update pagination controls
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    
    // Update page numbers
    const pageNumbers = document.getElementById('pageNumbers');
    if (pageNumbers) {
        let pageHtml = '';
        for (let i = 1; i <= totalPages; i++) {
            const isActive = i === currentPage ? 'active' : '';
            pageHtml += `<button class="page-btn ${isActive}" onclick="goToPage(${i})">${i}</button>`;
        }
        pageNumbers.innerHTML = pageHtml;
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Show loading for search
            if (typeof showTableDataLoading === 'function') {
                showTableDataLoading('schedulesTable', 'Searching schedules...');
            }
            
            const searchTerm = this.value.toLowerCase().trim();
            console.log('Searching with term:', searchTerm);
            console.log('Total schedules before search:', schedules.length);
            
            // If search term is empty, show all schedules
            if (!searchTerm) {
                filteredSchedules = [...schedules];
            } else {
                filteredSchedules = schedules.filter(schedule => {
                // Handle both populated physician objects and physician IDs
                let physician;
                if (typeof schedule.physician === 'object' && schedule.physician._id) {
                    // Physician is already populated
                    physician = schedule.physician;
                } else {
                    // Physician is just an ID, find it in the physicians array
                    physician = physicians.find(p => p._id === schedule.physician);
                }
                
                const matches = physician ? physician.name.toLowerCase().includes(searchTerm) : false;
                if (searchTerm && !matches) {
                    console.log('Schedule filtered out - physician name:', physician?.name, 'does not contain:', searchTerm);
                }
                
                return matches;
                });
            }
            
            console.log('Filtered schedules after search:', filteredSchedules.length);
            currentPage = 1;
            displaySchedules();
            updatePagination();
            
            // Hide loading after search
            setTimeout(() => {
                if (typeof hideAllLoading === 'function') {
                    hideAllLoading();
                }
            }, 300);
        });
    }

    // Filter functionality
    DOMUtils.safeAddEventListener('physicianFilter', 'change', applyFilters);
    DOMUtils.safeAddEventListener('statusFilter', 'change', applyFilters);
    DOMUtils.safeAddEventListener('clearFiltersBtn', 'click', clearFilters);

    // Pagination
    DOMUtils.safeAddEventListener('prevBtn', 'click', function() {
        if (currentPage > 1) {
            currentPage--;
            displaySchedules();
            updatePagination();
        }
    });

    DOMUtils.safeAddEventListener('nextBtn', 'click', function() {
        const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displaySchedules();
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
        if (e.target.closest('.action-btn')) {
            const button = e.target.closest('.action-btn');
            const scheduleId = button.getAttribute('data-schedule-id');
            const action = button.getAttribute('data-action');
            
            if (scheduleId && action === 'toggle') {
                toggleScheduleStatus(scheduleId);
            } else if (scheduleId && action === 'copy') {
                copySchedule(scheduleId);
            }
        }
    });
}

// Setup modal event listeners
function setupModalEventListeners() {
    // Modal controls
    DOMUtils.safeAddEventListener('addScheduleBtn', 'click', showAddScheduleModal);
    DOMUtils.safeAddEventListener('closeModal', 'click', closeModal);
    DOMUtils.safeAddEventListener('cancelBtn', 'click', closeModal);
    DOMUtils.safeAddEventListener('closeViewModal', 'click', closeViewModal);
    DOMUtils.safeAddEventListener('closeViewBtn', 'click', closeViewModal);
    DOMUtils.safeAddEventListener('closeDeleteModal', 'click', closeDeleteModal);
    DOMUtils.safeAddEventListener('cancelDeleteBtn', 'click', closeDeleteModal);
    DOMUtils.safeAddEventListener('confirmDeleteBtn', 'click', confirmDelete);
    
    // Form submission
    DOMUtils.safeAddEventListener('scheduleForm', 'submit', handleSubmit);
    
    // Close modal on outside click
    window.addEventListener('click', function(e) {
        const modal = document.getElementById('scheduleModal');
        const viewModal = document.getElementById('viewScheduleModal');
        const deleteModal = document.getElementById('deleteScheduleModal');
        
        if (e.target === modal) {
            modal.style.display = 'none';
        }
        if (e.target === viewModal) {
            viewModal.style.display = 'none';
        }
        if (e.target === deleteModal) {
            deleteModal.style.display = 'none';
        }
    });
}

// Setup day checkboxes
function setupDayCheckboxes() {
    document.querySelectorAll('input[name="days"]').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const label = this.closest('.day-cell-option');
            if (label) {
                if (this.checked) {
                    label.classList.add('checked');
                } else {
                    label.classList.remove('checked');
                }
            }
        });
    });
}

// Check for time overlap on same days of the week
function checkTimeOverlap(newSchedule) {
    const newStartTime = parseTime(newSchedule.startTime);
    const newEndTime = parseTime(newSchedule.endTime);
    const newDays = newSchedule.days;
    
    // Find existing schedules for the same physician
    const existingSchedules = schedules.filter(schedule => 
        schedule.physician === newSchedule.physician && 
        schedule.isActive !== false // Only check active schedules
    );
    
    for (const existingSchedule of existingSchedules) {
        const existingStartTime = parseTime(existingSchedule.startTime);
        const existingEndTime = parseTime(existingSchedule.endTime);
        const existingDays = existingSchedule.days || [];
        
        // Check if there's any day overlap
        const hasDayOverlap = newDays.some(day => existingDays.includes(day));
        
        if (hasDayOverlap) {
            // Check if there's time overlap
            const hasTimeOverlap = !(newEndTime <= existingStartTime || newStartTime >= existingEndTime);
            
            if (hasTimeOverlap) {
                return true; // Found overlap
            }
        }
    }
    
    return false; // No overlap found
}

// Parse time string to minutes for comparison
function parseTime(timeString) {
    if (!timeString) return 0;
    
    // Handle both 24-hour and 12-hour formats
    let time = timeString.trim();
    
    // Convert 12-hour format to 24-hour format
    if (time.includes('AM') || time.includes('PM')) {
        const [timePart, period] = time.split(/(AM|PM)/i);
        const [hours, minutes] = timePart.split(':').map(Number);
        
        let hour24 = hours;
        if (period.toUpperCase() === 'AM' && hours === 12) {
            hour24 = 0;
        } else if (period.toUpperCase() === 'PM' && hours !== 12) {
            hour24 = hours + 12;
        }
        
        return hour24 * 60 + (minutes || 0);
    } else {
        // Handle 24-hour format (HH:MM)
        const [hours, minutes] = time.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) {
            console.warn('Invalid time format:', timeString);
            return 0;
        }
        return hours * 60 + (minutes || 0);
    }
}

// Convert 24-hour time to 12-hour AM/PM format
function formatTimeTo12Hour(timeString) {
    if (!timeString) return '';
    
    // If already in 12-hour format, return as is
    if (timeString.includes('AM') || timeString.includes('PM')) {
        return timeString;
    }
    
    // Parse 24-hour format
    const [hours, minutes] = timeString.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
        return timeString; // Return original if invalid
    }
    
    let hour12 = hours;
    let period = 'AM';
    
    if (hours === 0) {
        hour12 = 12;
    } else if (hours === 12) {
        period = 'PM';
    } else if (hours > 12) {
        hour12 = hours - 12;
        period = 'PM';
    }
    
    const minutesStr = minutes.toString().padStart(2, '0');
    return `${hour12}:${minutesStr} ${period}`;
}

// Apply filters
function applyFilters() {
    // Show loading for filters
    if (typeof showTableDataLoading === 'function') {
        showTableDataLoading('schedulesTable', 'Applying filters...');
    }
    
    const physicianFilter = document.getElementById('physicianFilter')?.value || '';
    const statusFilter = document.getElementById('statusFilter')?.value || '';
    
    console.log('Filtering with physicianFilter:', physicianFilter);
    console.log('Total schedules before filter:', schedules.length);
    
    filteredSchedules = schedules.filter(schedule => {
        // Handle both populated physician objects and physician IDs
        let physicianId;
        if (typeof schedule.physician === 'object' && schedule.physician._id) {
            physicianId = schedule.physician._id;
        } else {
            physicianId = schedule.physician;
        }
        
        const physicianMatch = !physicianFilter || physicianId === physicianFilter;
        const statusMatch = !statusFilter || 
            (statusFilter === 'active' && schedule.isActive) ||
            (statusFilter === 'inactive' && !schedule.isActive);
        
        if (physicianFilter && !physicianMatch) {
            console.log('Schedule filtered out - physician ID:', physicianId, 'does not match filter:', physicianFilter);
        }
        
        return physicianMatch && statusMatch;
    });
    
    console.log('Filtered schedules count:', filteredSchedules.length);
    
    currentPage = 1;
    displaySchedules();
    updatePagination();
    
    // Hide loading after filtering
    setTimeout(() => {
        if (typeof hideAllLoading === 'function') {
            hideAllLoading();
        }
    }, 300);
}

// Clear filters
function clearFilters() {
    // Show loading for clearing filters
    if (typeof showTableDataLoading === 'function') {
        showTableDataLoading('schedulesTable', 'Clearing filters...');
    }
    
    document.getElementById('searchInput').value = '';
    document.getElementById('physicianFilter').value = '';
    document.getElementById('statusFilter').value = '';
    
    filteredSchedules = [...schedules];
    currentPage = 1;
    displaySchedules();
    updatePagination();
    
    // Hide loading after clearing
    setTimeout(() => {
        if (typeof hideAllLoading === 'function') {
            hideAllLoading();
        }
    }, 300);
}

// Go to page
function goToPage(page) {
    // Show loading for pagination
    if (typeof showTableDataLoading === 'function') {
        showTableDataLoading('schedulesTable', 'Loading page...');
    }
    
    currentPage = page;
    displaySchedules();
    updatePagination();
    
    // Hide loading after pagination
    setTimeout(() => {
        if (typeof hideAllLoading === 'function') {
            hideAllLoading();
        }
    }, 300);
}

// Sort table
function sortTable(column) {
    // Show loading for sorting
    if (typeof showTableDataLoading === 'function') {
        showTableDataLoading('schedulesTable', 'Sorting table...');
    }
    
    // Implementation for table sorting
    // This would sort the filteredSchedules array based on the column
    displaySchedules();
    
    // Hide loading after sorting
    setTimeout(() => {
        if (typeof hideAllLoading === 'function') {
            hideAllLoading();
        }
    }, 300);
}

// Show add schedule modal
function showAddScheduleModal() {
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-calendar-plus"></i> Add New Schedule';
    document.getElementById('scheduleForm').reset();
    clearDayCheckboxes();
    
    // Set default start date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    
    // Set default working hours
    document.getElementById('startTime').value = '09:00';
    document.getElementById('endTime').value = '17:00';
    
    document.getElementById('scheduleModal').style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('scheduleModal').style.display = 'none';
    currentScheduleId = null;
}

// Close view modal
function closeViewModal() {
    document.getElementById('viewScheduleModal').style.display = 'none';
}

// Close delete modal
function closeDeleteModal() {
    document.getElementById('deleteScheduleModal').style.display = 'none';
    scheduleToDelete = null;
}

// Clear day checkboxes
function clearDayCheckboxes() {
    document.querySelectorAll('input[name="days"]').forEach(checkbox => {
        checkbox.checked = false;
        const label = checkbox.closest('.day-cell-option');
        if (label) {
            label.classList.remove('checked');
        }
    });
}

// Handle form submission
async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const scheduleData = {
        physician: formData.get('physician'),
        days: Array.from(document.querySelectorAll('input[name="days"]:checked')).map(cb => cb.value),
        startDate: formData.get('startDate'),
        startTime: formData.get('startTime'),
        endTime: formData.get('endTime'),
        notes: formData.get('notes') || null
    };
    
    // Validation
    if (!scheduleData.physician || scheduleData.days.length === 0 || !scheduleData.startDate || !scheduleData.startTime || !scheduleData.endTime) {
        showNotification('Please fill in all required fields.', 'error');
        return;
    }
    
    // Check for time overlap on same days of the week (not same date)
    if (!currentScheduleId) { // Only check for new schedules, not updates
        const hasTimeOverlap = checkTimeOverlap(scheduleData);
        if (hasTimeOverlap) {
            showNotification('This physician already has a schedule with overlapping time on the same day(s). Please choose different days or times to avoid conflicts.', 'error');
            return;
        }
    }
    
    try {
        const url = currentScheduleId ? `${SCHEDULES_API}/${currentScheduleId}` : SCHEDULES_API;
        const method = currentScheduleId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(scheduleData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Schedule ${currentScheduleId ? 'updated' : 'created'} successfully!`, 'success');
            closeModal();
            loadSchedules();
            loadStatistics();
        } else {
            showNotification('Error saving schedule: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error saving schedule:', error);
        showNotification('Error saving schedule. Please try again.', 'error');
    }
}

// View schedule
function viewSchedule(scheduleId) {
    const schedule = schedules.find(s => s._id === scheduleId);
    if (!schedule) return;
    
    // Check if physician is already populated in the schedule data
    let physician = schedule.physician;
    if (typeof physician === 'object' && physician._id) {
        // Physician is already populated from backend
    } else {
        // Physician is just an ID, find it in the physicians array
        physician = physicians.find(p => p._id === schedule.physician);
    }
    const clinic = clinics.find(c => c._id === schedule.clinic);
    
    const content = `
        <div class="schedule-details">
            <div class="detail-row">
                <strong>Physician:</strong> ${physician ? physician.name : 'Unknown'}
            </div>
            <div class="detail-row">
                <strong>Working Days:</strong> ${schedule.days && schedule.days.length > 0 ? 
                    schedule.days.map(day => 
                        `<span class="day-chip ${day}">${day.charAt(0).toUpperCase() + day.slice(1)}</span>`
                    ).join('') : 
                    '<span class="day-chip no-days">No days selected</span>'}
            </div>
            <div class="detail-row">
                <strong>Start Date:</strong> ${schedule.startDate ? new Date(schedule.startDate).toLocaleDateString() : 'Not set'}
            </div>
            <div class="detail-row">
                <strong>Time:</strong> ${formatTimeTo12Hour(schedule.startTime)} - ${formatTimeTo12Hour(schedule.endTime)}
            </div>
            <div class="detail-row">
                <strong>Status:</strong> 
                <span class="status-badge ${schedule.isActive ? 'status-active' : 'status-inactive'}">
                    <i class="fas ${schedule.isActive ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                    <span>${schedule.isActive ? 'Active' : 'Inactive'}</span>
                </span>
            </div>
            ${schedule.notes ? `<div class="detail-row"><strong>Notes:</strong> ${schedule.notes}</div>` : ''}
        </div>
    `;
    
    document.getElementById('viewScheduleContent').innerHTML = content;
    document.getElementById('viewScheduleModal').style.display = 'block';
}

// Edit schedule
function editSchedule(scheduleId) {
    const schedule = schedules.find(s => s._id === scheduleId);
    if (!schedule) return;
    
    currentScheduleId = scheduleId;
    
    // Populate form
    document.getElementById('physicianSelect').value = schedule.physician;
    document.getElementById('startDate').value = schedule.startDate || '';
    document.getElementById('startTime').value = schedule.startTime;
    document.getElementById('endTime').value = schedule.endTime;
    document.getElementById('notes').value = schedule.notes || '';
    
    // Clear and set day checkboxes
    clearDayCheckboxes();
    if (schedule.days) {
        schedule.days.forEach(day => {
            const checkbox = document.querySelector(`input[name="days"][value="${day}"]`);
            if (checkbox) {
                checkbox.checked = true;
                const label = checkbox.closest('.day-cell-option');
                label.classList.add('checked');
            }
        });
    }
    
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Schedule';
    document.getElementById('scheduleModal').style.display = 'block';
}

// Toggle schedule status
async function toggleScheduleStatus(scheduleId) {
    try {
        const response = await fetch(`${SCHEDULES_API}/${scheduleId}/toggle-status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(`Schedule ${result.data.isActive ? 'activated' : 'deactivated'} successfully!`, 'success');
            loadSchedules();
            loadStatistics();
        } else {
            showNotification('Error toggling schedule status: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error toggling schedule status:', error);
        showNotification('Error toggling schedule status. Please try again.', 'error');
    }
}

// Copy schedule
function copySchedule(scheduleId) {
    const schedule = schedules.find(s => s._id === scheduleId);
    if (!schedule) return;
    
    // Set modal title for copy
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-copy"></i> Copy Schedule';
    
    // Reset form
    document.getElementById('scheduleForm').reset();
    clearDayCheckboxes();
    
    // Populate form with schedule data (excluding ID and dates)
    document.getElementById('physicianSelect').value = schedule.physician;
    
    // Set working days
    if (schedule.days && schedule.days.length > 0) {
        schedule.days.forEach(day => {
            const checkbox = document.querySelector(`input[name="days"][value="${day}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
    
    // Set times
    document.getElementById('startTime').value = schedule.startTime;
    document.getElementById('endTime').value = schedule.endTime;
    
    // Set notes
    document.getElementById('notes').value = schedule.notes || '';
    
    // Set start date to today for copied schedule
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    
    // Clear the schedule ID so it creates a new schedule
    document.getElementById('scheduleId').value = '';
    
    // Show modal
    document.getElementById('scheduleModal').style.display = 'block';
    
    showNotification('Schedule copied to form. Please review and save.', 'info');
}

// Delete schedule

function deleteSchedule(scheduleId) {
    scheduleToDelete = scheduleId;
    document.getElementById('deleteScheduleModal').style.display = 'block';
}

// Confirm delete
async function confirmDelete() {
    if (!scheduleToDelete) return;
    
    try {
        const response = await fetch(`${SCHEDULES_API}/${scheduleToDelete}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Schedule deleted successfully!', 'success');
            closeDeleteModal();
            loadSchedules();
            loadStatistics();
        } else {
            showNotification('Error deleting schedule: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting schedule:', error);
        showNotification('Error deleting schedule. Please try again.', 'error');
    }
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
            showNotification('Access restricted. Agents must be assigned to counters.', 'warning');
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
