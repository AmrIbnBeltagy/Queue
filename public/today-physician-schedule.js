// Show page after authentication check passed
document.body.classList.add('authenticated');

// State
let todaySchedules = [];
let filteredSchedules = [];
let physicians = [];
let specialties = [];
let degrees = [];
let clinics = [];
let locations = [];
let locationIdToName = {};
let currentPage = 1;
let itemsPerPage = 10;
let selectedPhysicianId = null;
let selectedScheduleId = null;
// Print configuration variables removed

// API Endpoints
const SCHEDULES_API = `${API_BASE_URL}/physician-schedules`;
const PHYSICIANS_API = `${API_BASE_URL}/doctors`;
const SPECIALTIES_API = `${API_BASE_URL}/specialities`;
const DEGREES_API = `${API_BASE_URL}/degrees`;
const CLINICS_API = `${API_BASE_URL}/clinics`;
const LOCATIONS_API = `${API_BASE_URL}/locations`;
const ASSIGNMENTS_API = `${API_BASE_URL}/physician-clinic-assignments`;
const CONFIG_API = `${API_BASE_URL}/configuration`;
const TODAY_SCHEDULES_API = `${API_BASE_URL}/today-physician-schedules`;
// Missing earlier: ticket API for linking tickets to today schedule
const TICKET_API = `${API_BASE_URL}/tickets`;

// Initialize
DOMUtils.initializePage(async function() {
    // Check role-based access
    if (!checkRoleAccess()) {
        return;
    }
    
    await loadPhysicians();
    await loadSpecialties();
    await loadDegrees();
    await loadClinics();
    await loadLocations();
    // Print configuration loading removed
    await loadTodaySchedules();
    // Sync Today's Data function removed
    loadStatistics();
    setupEventListeners();
    setTodayDate();
});

// Set today's date
function setTodayDate() {
    const today = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('todayDate').textContent = today.toLocaleDateString('en-US', options);
}

// Load physicians
async function loadPhysicians() {
    try {
        const response = await fetch(PHYSICIANS_API);
        const result = await response.json();
        
        if (result.success) {
            physicians = result.data;
        } else {
            console.error('Error loading physicians:', result.message);
        }
    } catch (error) {
        console.error('Error loading physicians:', error);
    }
}

// Load specialties
async function loadSpecialties() {
    try {
        const response = await fetch(SPECIALTIES_API);
        const result = await response.json();
        
        if (result.success) {
            specialties = result.data;
            populateSpecialtyFilter();
        } else {
            console.error('Error loading specialties:', result.message);
        }
    } catch (error) {
        console.error('Error loading specialties:', error);
    }
}

// Load degrees
async function loadDegrees() {
    try {
        const response = await fetch(DEGREES_API);
        const result = await response.json();
        
        if (result.success) {
            degrees = result.data;
        } else {
            console.error('Error loading degrees:', result.message);
        }
    } catch (error) {
        console.error('Error loading degrees:', error);
    }
}

// Load clinics
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

// Load locations and build id->name map
async function loadLocations() {
    try {
        const response = await fetch(LOCATIONS_API);
        const result = await response.json();
        if (result.success) {
            const locs = result.data || [];
            locationIdToName = {};
            locations = [];
            for (const loc of locs) {
                const name = loc.enName || loc.arName || String(loc._id);
                locationIdToName[loc._id] = name;
                locations.push(name);
            }
            // Deduplicate readable names
            locations = [...new Set(locations)];
        }
    } catch (e) {
        console.error('Error loading locations:', e);
    }
}

// Populate specialty filter - only show specialties with active schedules today
function populateSpecialtyFilter() {
    const specialtyFilter = document.getElementById('specialtyFilter');
    if (!specialtyFilter) return;
    
    // Get specialties that have active schedules today
    const specialtiesWithSchedules = getSpecialtiesWithActiveSchedules();
    
    specialtyFilter.innerHTML = '<option value="">All Specialties</option>';
    
    if (specialtiesWithSchedules.length > 0) {
        specialtiesWithSchedules.forEach(specialty => {
            const option = document.createElement('option');
            option.value = specialty._id;
            option.textContent = specialty.enName || specialty.arName || specialty.name || 'Unknown Specialty';
            specialtyFilter.appendChild(option);
        });
    }
}

// Get specialties that have active schedules today
function getSpecialtiesWithActiveSchedules() {
    if (!todaySchedules || todaySchedules.length === 0) {
        return [];
    }
    
    // Get unique specialty IDs from active schedules
    const specialtyIds = new Set();
    
    todaySchedules.forEach(schedule => {
        if (schedule.isActive !== false) {
            // Get specialty from physician data
            let specialtyId = null;
            
            if (schedule.physician) {
                const physician = typeof schedule.physician === 'object' && schedule.physician._id
                    ? schedule.physician
                    : physicians.find(p => p._id === schedule.physician || p._id === schedule.physicianId);
                
                if (physician && physician.speciality) {
                    if (typeof physician.speciality === 'object' && physician.speciality._id) {
                        specialtyId = physician.speciality._id;
                    } else if (typeof physician.speciality === 'string') {
                        specialtyId = physician.speciality;
                    }
                }
            }
            
            if (specialtyId) {
                specialtyIds.add(specialtyId);
            }
        }
    });
    
    // Get specialty objects that have active schedules
    const specialtiesWithActive = specialties.filter(specialty => 
        specialtyIds.has(specialty._id)
    );
    
    // Sort by name
    specialtiesWithActive.sort((a, b) => {
        const nameA = (a.enName || a.arName || a.name || '').toLowerCase();
        const nameB = (b.enName || b.arName || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
    
    return specialtiesWithActive;
}

// Print configuration loading removed

// Load today's schedules
async function loadTodaySchedules() {
    try {
        // Show loading overlay
        if (typeof showTableDataLoading === 'function') {
            showTableDataLoading('schedulesTable', 'Loading today\'s schedules...');
        } else if (typeof showLoading === 'function') {
            showLoading('Loading today\'s schedules...');
        } else {
            // Fallback loading display
            const tbody = document.getElementById('schedulesTableBody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Loading schedules...</td></tr>';
            }
        }

        // Build URL for today-physician-schedules, optionally filtering by current physician
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;

        let schedulesUrl = `${TODAY_SCHEDULES_API}?date=${encodeURIComponent(dateStr)}`;

        const response = await fetch(schedulesUrl);
        const result = await response.json();
        
        if (result.success) {
            todaySchedules = Array.isArray(result.data) ? result.data : (result.data ? [result.data] : []);

            // Fallback: derive today's schedules from base schedules if endpoint returns none
            if (!todaySchedules || todaySchedules.length === 0) {
                todaySchedules = await deriveTodaySchedulesFromBase(dateStr);
            }

            filteredSchedules = [...todaySchedules];
            
            // Update specialty filter with only specialties that have active schedules today
            populateSpecialtyFilter();
            
            // Load clinics and populate filters
            await loadClinics();
            await populateClinicFilter();
            await populateLocationFilter();
            
            // Load clinic assignments for all schedules
            await loadClinicAssignmentsForSchedules(todaySchedules);
            
            displaySchedules();
            updateStatistics();
        } else {
            showNotification('Error loading today\'s schedules: ' + result.message, 'error');
            todaySchedules = [];
            filteredSchedules = [];
            displaySchedules();
        }
    } catch (error) {
        console.error('Error loading today\'s schedules:', error);
        showNotification('Error loading today\'s schedules. Please try again.', 'error');
        todaySchedules = [];
        filteredSchedules = [];
        displaySchedules();
    } finally {
        // Hide loading overlay
        if (typeof hideAllLoading === 'function') {
            hideAllLoading();
        } else if (typeof hideLoading === 'function') {
            hideLoading();
        }
        // Fallback - clear loading display
        const tbody = document.getElementById('schedulesTableBody');
        if (tbody && tbody.innerHTML.includes('Loading schedules...')) {
            // Loading will be cleared by displaySchedules()
        }
    }
}

// Fallback: build today's schedules from PhysicianSchedule list
async function deriveTodaySchedulesFromBase(dateStr) {
    try {
        const resp = await fetch(SCHEDULES_API);
        const res = await resp.json();
        if (!res.success || !Array.isArray(res.data)) return [];

        const todayDate = new Date(dateStr);
        const todayWeekday = todayDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();

        const base = res.data.filter(s => {
            // active
            if (s.isActive === false) return false;
            // startDate <= today
            const sd = s.startDate ? new Date(s.startDate) : null;
            if (sd && sd > todayDate) return false;
            // days contains today
            const days = Array.isArray(s.days) ? s.days.map(d => String(d).toLowerCase()) : [];
            return days.includes(todayWeekday);
        });

        // Map to TodayPhysicianSchedule-like structure used by displaySchedules
        return base.map(s => {
            const physicianId = s.physician?._id || s.physician;
            const physicianRecord = (typeof s.physician === 'object') ? s.physician : (physicians.find(p => p._id === physicianId) || {});
            // Resolve degree from physician record if possible
            const degObj = physicianRecord?.degree;
            const degId = (typeof degObj === 'string') ? degObj : degObj?._id;
            const degName = (degObj && typeof degObj === 'object') ? (degObj.enName || degObj.arName || degObj.name)
                           : (typeof physicianRecord.degreeName === 'string' ? physicianRecord.degreeName : null);
            const degFromList = (!degName && degId && Array.isArray(degrees)) ? (degrees.find(d => d._id === degId) || null) : null;

            return {
                _id: s._id,
                scheduleId: s._id,
                physician: physicianRecord._id ? physicianRecord : s.physician,
                physicianId: physicianId,
                physicianName: physicianRecord.name || s.physician?.name,
                speciality: physicianRecord?.speciality?.enName || physicianRecord?.speciality?.arName || s.physician?.speciality?.enName || s.physician?.speciality?.arName,
                degree: degName || degFromList?.enName || degFromList?.arName || undefined,
                degreeId: degId,
                startTime: s.startTime,
                endTime: s.endTime,
                clinicTimeFrom: s.startTime,
                clinicTimeTo: s.endTime,
                clinicName: s.clinic?.name,
                location: s.clinic?.location?.enName || s.clinic?.location?.arName,
                isActive: s.isActive !== false,
                date: dateStr
            };
        });
    } catch (e) {
        console.error('Fallback derive error:', e);
        return [];
    }
}

// Sync Today's Data function removed
// Helper function to get day name
function getDayName(dateString) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const date = new Date(dateString);
    return days[date.getDay()];
}

// Get fresh physician data from database
async function getPhysicianById(physicianId) {
    try {
        const response = await fetch(`${PHYSICIANS_API}/${physicianId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            return result.data;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching physician:', error);
        return null;
    }
}

// Get fresh clinic data from database
async function getClinicById(clinicId) {
    try {
        const response = await fetch(`${CLINICS_API}/${clinicId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            return result.data;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching clinic:', error);
        return null;
    }
}

// Get fresh speciality data from database
async function getSpecialityById(specialityId) {
    try {
        const response = await fetch(`${API_BASE_URL}/specialities/${specialityId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            return result.data;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching speciality:', error);
        return null;
    }
}

// Get fresh degree data from database
async function getDegreeById(degreeId) {
    try {
        const response = await fetch(`${API_BASE_URL}/degrees/${degreeId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            return result.data;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching degree:', error);
        return null;
    }
}

// Get fresh location data from database
async function getLocationById(locationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/locations/${locationId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            return result.data;
        }
        
        return null;
    } catch (error) {
        console.error('Error fetching location:', error);
        return null;
    }
}

// Find existing today schedule (by date only)
async function findExistingTodaySchedule(date) {
    try {
        const response = await fetch(`${TODAY_SCHEDULES_API}?date=${date}`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            return result.data[0];
        }
        
        return null;
    } catch (error) {
        console.error('Error finding existing today schedule:', error);
        return null;
    }
}

// Find existing today schedule by schedule ID
async function findExistingTodayScheduleByScheduleId(scheduleId, date) {
    try {
        const response = await fetch(`${TODAY_SCHEDULES_API}?scheduleId=${scheduleId}&date=${date}`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
            return result.data[0];
        }
        
        return null;
    } catch (error) {
        console.error('Error finding existing today schedule by schedule ID:', error);
        return null;
    }
}

// Create today schedule
async function createTodaySchedule(scheduleData) {
    try {
        // Use the data as provided (already includes createdBy and updatedBy)
        const dataToSend = {
            ...scheduleData
        };
        
        console.log('Sending data to API:', dataToSend);
        console.log('Data validation:', {
            physicianId: !!dataToSend.physicianId,
            physicianName: !!dataToSend.physicianName,
            speciality: !!dataToSend.speciality,
            degree: !!dataToSend.degree,
            clinicTimeFrom: !!dataToSend.clinicTimeFrom,
            clinicTimeTo: !!dataToSend.clinicTimeTo,
            day: !!dataToSend.day,
            date: !!dataToSend.date,
            clinicName: !!dataToSend.clinicName,
            location: !!dataToSend.location,
            createdBy: !!dataToSend.createdBy,
            updatedBy: !!dataToSend.updatedBy
        });
        
        // Check for missing or empty essential fields only
        const missingFields = [];
        if (!dataToSend.scheduleId) missingFields.push('scheduleId');
        if (!dataToSend.physicianId) missingFields.push('physicianId');
        if (!dataToSend.physicianName) missingFields.push('physicianName');
        if (!dataToSend.clinicName) missingFields.push('clinicName');
        if (!dataToSend.clinicTimeFrom) missingFields.push('clinicTimeFrom');
        if (!dataToSend.clinicTimeTo) missingFields.push('clinicTimeTo');
        if (!dataToSend.day) missingFields.push('day');
        if (!dataToSend.date) missingFields.push('date');
        if (!dataToSend.createdBy) missingFields.push('createdBy');
        if (!dataToSend.updatedBy) missingFields.push('updatedBy');
        
        if (missingFields.length > 0) {
            console.error('Missing fields:', missingFields);
            console.error('Data being sent:', dataToSend);
            console.error('Full data object:', JSON.stringify(dataToSend, null, 2));
        }
        
        const response = await fetch(TODAY_SCHEDULES_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        });
        
        const result = await response.json();
        
        console.log('API Response status:', response.status);
        console.log('API Response:', result);
        
        if (!result.success) {
            console.error('Error creating today schedule:', result.message);
            console.error('Full error response:', result);
        }
        
        return result;
    } catch (error) {
        console.error('Error creating today schedule:', error);
        throw error;
    }
}

// Update today schedule
async function updateTodaySchedule(scheduleId, scheduleData) {
    try {
        // Use the data as provided (already includes updatedBy)
        const dataToSend = {
            ...scheduleData
        };
        
        console.log('Updating schedule with data:', dataToSend);
        console.log('Update data validation:', {
            scheduleId: !!dataToSend.scheduleId,
            physicianId: !!dataToSend.physicianId,
            physicianName: !!dataToSend.physicianName,
            clinicName: !!dataToSend.clinicName,
            clinicTimeFrom: !!dataToSend.clinicTimeFrom,
            clinicTimeTo: !!dataToSend.clinicTimeTo,
            day: !!dataToSend.day,
            date: !!dataToSend.date,
            updatedBy: !!dataToSend.updatedBy
        });
        
        const response = await fetch(`${TODAY_SCHEDULES_API}/${scheduleId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        });
        
        const result = await response.json();
        
        if (!result.success) {
            console.error('Error updating today schedule:', result.message);
        }
        
        return result;
    } catch (error) {
        console.error('Error updating today schedule:', error);
        throw error;
    }
}

// Load statistics
async function loadStatistics() {
    try {
        const response = await fetch(`${SCHEDULES_API}/stats/summary`);
        const result = await response.json();
        
        if (result.success) {
            updateStatistics(result.data);
        }
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Update statistics
function updateStatistics(stats = null) {
    const totalPhysicians = physicians.length;
    const activeSchedules = todaySchedules.filter(s => s.isActive !== false).length;
    const todaySchedulesCount = todaySchedules.length;
    // Printable tickets calculation removed

    document.getElementById('totalPhysicians').textContent = totalPhysicians;
    document.getElementById('activeSchedules').textContent = activeSchedules;
    document.getElementById('todaySchedules').textContent = todaySchedulesCount;
    // Printable tickets stat removed
}

// Display schedules
function displaySchedules() {
    const tbody = document.getElementById('schedulesTableBody');
    const noSchedulesMessage = document.getElementById('noSchedulesMessage');
    
    if (filteredSchedules.length === 0) {
        tbody.innerHTML = '';
        noSchedulesMessage.style.display = 'block';
        return;
    }
    noSchedulesMessage.style.display = 'none';
    
    const rowsHtml = filteredSchedules.map(schedule => {
        // Safely derive physician info for both PhysicianSchedule and TodayPhysicianSchedule shapes
        const physician = schedule.physician;
        const physicianId = (schedule.physicianId && (schedule.physicianId._id || schedule.physicianId)) || physician?._id || physician?.id || '';
        // If not populated, try to resolve physician from preloaded list
        const physicianRecord = (physician && typeof physician === 'object') ? physician : (physicians.find(p => p._id === physicianId) || {});
        const physicianName = schedule.physicianName || physicianRecord.name || physicianRecord.username || physician?.name || 'Unknown Physician';
        const specialtyName = schedule.speciality || physicianRecord?.speciality?.enName || physicianRecord?.speciality?.arName || physicianRecord?.speciality?.name || physician?.speciality?.enName || physician?.speciality?.arName || physician?.speciality?.name || 'Unknown Specialty';
        // Resolve degree name robustly (handle object, id, or plain text)
        const degreeName = (function resolveDegreeName() {
            const fromSchedule = schedule.degree || schedule.degreeId || schedule.degreeName;
            const fromPhysician = physicianRecord?.degree || physicianRecord?.degreeId || physicianRecord?.degreeName || physician?.degree;
            // If schedule.degree is a label (any non-24hex string), use it first (allow short labels like MD)
            if (typeof fromSchedule === 'string' && !/^[0-9a-fA-F]{24}$/.test(fromSchedule)) {
                return fromSchedule;
            }
            // If schedule.degree is an object with names
            if (fromSchedule && typeof fromSchedule === 'object') {
                if (Array.isArray(fromSchedule)) {
                    const first = fromSchedule[0];
                    return first?.enName || first?.arName || first?.name || 'Unknown Degree';
                }
                return fromSchedule.enName || fromSchedule.arName || fromSchedule.name || fromSchedule.label || 'Unknown Degree';
            }
            // If physician degree is an object
            if (fromPhysician && typeof fromPhysician === 'object') {
                if (Array.isArray(fromPhysician)) {
                    const first = fromPhysician[0];
                    return first?.enName || first?.arName || first?.name || 'Unknown Degree';
                }
                return fromPhysician.enName || fromPhysician.arName || fromPhysician.name || fromPhysician.label || 'Unknown Degree';
            }
            // If degree is an ID, try lookup in loaded degrees list (check both schedule and physician sources)
            const degreeId = (typeof fromSchedule === 'string' && /^[0-9a-fA-F]{24}$/.test(fromSchedule)) ? fromSchedule
                              : (typeof fromPhysician === 'string' && /^[0-9a-fA-F]{24}$/.test(fromPhysician)) ? fromPhysician
                              : '';
            if (degreeId) {
                const deg = Array.isArray(degrees) ? degrees.find(d => d._id === degreeId) : null;
                if (deg) return deg.enName || deg.arName || deg.name || 'Unknown Degree';
            }
            // Last resort: try matching by physicianRecord.degreeName to degrees names
            if (physicianRecord && typeof physicianRecord.degreeName === 'string') {
                const byName = Array.isArray(degrees) ? degrees.find(d => d.enName === physicianRecord.degreeName || d.arName === physicianRecord.degreeName || d.name === physicianRecord.degreeName) : null;
                if (byName) return physicianRecord.degreeName;
            }
            return 'Unknown Degree';
        })();
        const physicianInitials = physicianName.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase();
        const fromTime = schedule.clinicTimeFrom || schedule.startTime || '';
        const toTime = schedule.clinicTimeTo || schedule.endTime || '';
        const clinicName = schedule.clinicName || 'Not Assigned';
        const locationName = schedule.location || '-';
        const assignmentScheduleId = schedule.scheduleId ? (schedule.scheduleId._id || schedule.scheduleId) : schedule._id;
        
        return `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 50px; height: 50px; border-radius: 50%; background: #1976d2; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.2rem;">
                            ${physicianInitials}
                        </div>
                        <div>
                            <h4 style="margin: 0; font-size: 1.1rem; color: #2c3e50;">${physicianName}</h4>
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        <strong>${specialtyName}</strong><br>
                        <small id="degree-${schedule._id}" style="color: #6c757d;">${degreeName}</small>
                    </div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px; font-weight: 600; color: #2c3e50;">
                        <i class="fas fa-clock" style="color: #1976d2;"></i>
                        <span>${formatTimeTo12Hour(fromTime)} - ${formatTimeTo12Hour(toTime)}</span>
                    </div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-hospital" style="color: #28a745;"></i>
                        <span id="clinic-${schedule._id}" style="color: #495057; font-weight: 500;">${clinicName}</span>
                    </div>
                </td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-map-marker-alt" style="color: #17a2b8;"></i>
                        <span id="location-${schedule._id}" data-location-id="" style="color: #495057; font-weight: 500;">${locationName}</span>
                    </div>
                </td>
                <td>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <!-- Print button removed -->
                        <button class="btn btn-warning" data-schedule-id="${assignmentScheduleId}" data-physician-id="${physicianId}" data-action="assign-clinic" title="Assign Clinic" style="background: #fd7e14; border: none; color: white; font-weight: 600; padding: 8px 12px; font-size: 0.9rem; border-radius: 6px; box-shadow: 0 2px 8px rgba(253, 126, 20, 0.3); transition: all 0.3s ease;">
                            <i class="fas fa-hospital" style="margin-right: 4px;"></i>
                            Assign Clinic
                        </button>
                        <!-- Ticket statistics button removed -->
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rowsHtml;

    // Load clinic assignments for each schedule
    loadClinicAssignmentsForSchedules(filteredSchedules);

    // Post-render: resolve unknown degrees by fetching full physician data if needed
    filteredSchedules.forEach(async (schedule) => {
        const degreeEl = document.getElementById(`degree-${schedule._id}`);
        if (!degreeEl) return;
        if ((degreeEl.textContent || '').trim().toLowerCase() !== 'unknown degree') return;

        try {
            const pid = (schedule.physicianId && (schedule.physicianId._id || schedule.physicianId)) || schedule.physician?._id || schedule.physician;
            if (!pid) return;
            const fullPhysician = await getPhysicianById(pid);
            if (!fullPhysician) return;

            let resolved = fullPhysician.degree && typeof fullPhysician.degree === 'object'
                ? (fullPhysician.degree.enName || fullPhysician.degree.arName || fullPhysician.degree.name)
                : (fullPhysician.degreeName || '');

            if (!resolved && typeof fullPhysician.degree === 'string') {
                const degById = Array.isArray(degrees) ? degrees.find(d => d._id === fullPhysician.degree) : null;
                resolved = degById ? (degById.enName || degById.arName || degById.name) : '';
            }

            if (resolved && resolved.trim().length > 0) {
                degreeEl.textContent = resolved;
            }
        } catch (e) {
            // ignore
        }
    });
}

// Load clinics data
async function loadClinics() {
    try {
        const response = await fetch(CLINICS_API);
        const result = await response.json();
        
        if (result.success) {
            clinics = result.data || [];
            console.log('Loaded clinics data:', clinics);
            if (clinics.length > 0) {
                console.log('First clinic structure:', clinics[0]);
                console.log('First clinic location:', clinics[0].location);
            }
            
            // Extract unique locations from clinics
            const uniqueLocations = [...new Set(clinics.map(clinic => {
                if (typeof clinic.location === 'string') {
                    return clinic.location;
                } else if (clinic.location && typeof clinic.location === 'object') {
                    // Use enName or arName from location object
                    return clinic.location.enName || clinic.location.arName || 'Unknown Location';
                }
                return null;
            }).filter(location => location && location !== 'Unknown Location'))];
            locations = uniqueLocations;
        }
    } catch (error) {
        console.error('Error loading clinics:', error);
        clinics = [];
        locations = [];
    }
}

// Populate clinic filter dropdown
async function populateClinicFilter() {
    const clinicFilter = document.getElementById('clinicFilter');
    if (!clinicFilter || clinics.length === 0) return;

    clinicFilter.innerHTML = '<option value="">All Clinics</option>';
    clinics.forEach(clinic => {
        const option = document.createElement('option');
        option.value = clinic._id;
        option.textContent = clinic.enName || clinic.arName || clinic.name;
        clinicFilter.appendChild(option);
    });
}

// Populate location filter dropdown (values are IDs, labels are names)
async function populateLocationFilter() {
    const locationFilter = document.getElementById('locationFilter');
    if (!locationFilter) return;

    locationFilter.innerHTML = '<option value="">All Locations</option>';
    const entries = Object.entries(locationIdToName);
    if (entries.length === 0 && locations.length > 0) {
        // Backward compatibility if only names are available
        locations.forEach(name => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            locationFilter.appendChild(option);
        });
        return;
    }
    entries.forEach(([id, name]) => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = name;
        locationFilter.appendChild(option);
    });
}

// Load clinic assignments for all schedules
async function loadClinicAssignmentsForSchedules(schedules) {
    for (const schedule of schedules) {
        try {
            // Use PhysicianSchedule id when available (for TodayPhysicianSchedule rows),
            // otherwise fall back to the schedule's own id (PhysicianSchedule listing)
            const assignmentLookupId = schedule.scheduleId ? (schedule.scheduleId._id || schedule.scheduleId) : schedule._id;
            const response = await fetch(`${ASSIGNMENTS_API}/schedule/${assignmentLookupId}`);
            const result = await response.json();
            
            // Store assignment data in schedule object for filtering
            if (result.success && result.data.length > 0) {
                schedule.clinicAssignment = result.data;
            } else {
                schedule.clinicAssignment = [];
            }
            
            const clinicElement = document.getElementById(`clinic-${schedule._id}`);
            const locationElement = document.getElementById(`location-${schedule._id}`);
            
            if (clinicElement) {
                if (result.success && result.data.length > 0) {
                    const assignment = result.data[0];
                    const clinicName = assignment.clinic?.enName || assignment.clinic?.arName || 'Unknown Clinic';
                    let clinicLocation = 'Unknown Location';
                    if (assignment.clinic?.location) {
                        console.log('Location data structure:', assignment.clinic.location);
                        if (typeof assignment.clinic.location === 'string') {
                            clinicLocation = assignment.clinic.location;
                        } else if (typeof assignment.clinic.location === 'object') {
                            // Check if it's a populated location object
                            if (assignment.clinic.location.enName || assignment.clinic.location.arName) {
                                clinicLocation = assignment.clinic.location.enName || assignment.clinic.location.arName;
                                console.log('Using populated location name:', clinicLocation);
                            } else if (assignment.clinic.location._id) {
                                // If it's just an ID, try to find it in our locations data
                                const locationId = assignment.clinic.location._id;
                                console.log('Looking for location ID:', locationId);
                                const location = locations.find(l => l._id === locationId);
                                if (location) {
                                    clinicLocation = location.enName || location.arName || location.name || 'Unknown Location';
                                    console.log('Found location in data:', clinicLocation);
                                } else {
                                    console.log('Location not found in locations data');
                                }
                            }
                        }
                    } else {
                        console.log('No location data in assignment.clinic');
                    }
                    
                    clinicElement.innerHTML = `
                        <span style="color: #28a745; font-weight: 600;">${clinicName}</span>
                    `;
                    
                    if (locationElement) {
                        const locId = typeof assignment.clinic.location === 'string' ? assignment.clinic.location : (assignment.clinic.location?._id || '');
                        if (locId && locationIdToName[locId]) {
                            locationElement.setAttribute('data-location-id', locId);
                            locationElement.textContent = locationIdToName[locId];
                        } else {
                            locationElement.setAttribute('data-location-id', '');
                            locationElement.textContent = clinicLocation;
                        }
                    }
                } else {
                    clinicElement.innerHTML = `
                        <span style="color: #6c757d; font-style: italic;">Not Assigned</span>
                    `;
                    
                    if (locationElement) {
                        locationElement.setAttribute('data-location-id', '');
                        locationElement.innerHTML = `
                            <span style="color: #6c757d; font-style: italic;">-</span>
                        `;
                    }
                }
            }
        } catch (error) {
            console.error(`Error loading clinic assignment for schedule ${schedule._id}:`, error);
            const clinicElement = document.getElementById(`clinic-${schedule._id}`);
            const locationElement = document.getElementById(`location-${schedule._id}`);
            
            if (clinicElement) {
                clinicElement.innerHTML = `
                    <span style="color: #dc3545; font-style: italic;">Error Loading</span>
                `;
            }
            
            if (locationElement) {
                locationElement.innerHTML = `
                    <span style="color: #dc3545; font-style: italic;">Error Loading</span>
                `;
            }
        }
    }
}

// Refresh clinic display for a specific schedule
async function refreshClinicDisplay(scheduleId) {
    try {
        const response = await fetch(`${ASSIGNMENTS_API}/schedule/${scheduleId}`);
        const result = await response.json();
        
        const clinicElement = document.getElementById(`clinic-${scheduleId}`);
        const locationElement = document.getElementById(`location-${scheduleId}`);
        
        if (clinicElement) {
            if (result.success && result.data.length > 0) {
                const assignment = result.data[0];
                const clinicName = assignment.clinic?.enName || assignment.clinic?.arName || 'Unknown Clinic';
                let clinicLocation = 'Unknown Location';
                if (assignment.clinic?.location) {
                    if (typeof assignment.clinic.location === 'string') {
                        clinicLocation = assignment.clinic.location;
                    } else if (typeof assignment.clinic.location === 'object') {
                        // Check if it's a populated location object
                        if (assignment.clinic.location.enName || assignment.clinic.location.arName) {
                            clinicLocation = assignment.clinic.location.enName || assignment.clinic.location.arName;
                        } else if (assignment.clinic.location._id) {
                            // If it's just an ID, try to find it in our locations data
                            const locationId = assignment.clinic.location._id;
                            const location = locations.find(l => l._id === locationId);
                            if (location) {
                                clinicLocation = location.enName || location.arName || location.name || 'Unknown Location';
                            }
                        }
                    }
                }
                
                clinicElement.innerHTML = `
                    <span style="color: #28a745; font-weight: 600;">${clinicName}</span>
                `;
                
                if (locationElement) {
                    const locId = typeof assignment.clinic.location === 'string' ? assignment.clinic.location : (assignment.clinic.location?._id || '');
                    if (locId && locationIdToName[locId]) {
                        locationElement.setAttribute('data-location-id', locId);
                        locationElement.textContent = locationIdToName[locId];
                    } else {
                        locationElement.setAttribute('data-location-id', '');
                        locationElement.textContent = clinicLocation;
                    }
                }
            } else {
                clinicElement.innerHTML = `
                    <span style="color: #6c757d; font-style: italic;">Not Assigned</span>
                `;
                
                if (locationElement) {
                    locationElement.setAttribute('data-location-id', '');
                    locationElement.innerHTML = `
                        <span style="color: #6c757d; font-style: italic;">-</span>
                    `;
                }
            }
        }
    } catch (error) {
        console.error(`Error refreshing clinic display for schedule ${scheduleId}:`, error);
        const clinicElement = document.getElementById(`clinic-${scheduleId}`);
        const locationElement = document.getElementById(`location-${scheduleId}`);
        
        if (clinicElement) {
            clinicElement.innerHTML = `
                <span style="color: #dc3545; font-style: italic;">Error Loading</span>
            `;
        }
        
        if (locationElement) {
            locationElement.innerHTML = `
                <span style="color: #dc3545; font-style: italic;">Error Loading</span>
            `;
        }
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

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            // Show loading for search
            if (typeof showTableDataLoading === 'function') {
                showTableDataLoading('schedulesTable', 'Searching schedules...');
            } else {
                // Fallback loading display
                const tbody = document.getElementById('schedulesTableBody');
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Searching...</td></tr>';
                }
            }
            
            const searchTerm = this.value.toLowerCase();
            filteredSchedules = todaySchedules.filter(schedule => {
                // Use populated physician data from API response
                const physician = schedule.physician;
                const specialty = physician?.speciality;
                const degree = physician?.degree;
                
                const physicianName = physician?.name?.toLowerCase() || '';
                const specialtyName = (specialty?.enName || specialty?.arName)?.toLowerCase() || '';
                const degreeName = (degree?.enName || degree?.arName)?.toLowerCase() || '';
                
                return physicianName.includes(searchTerm) || 
                       specialtyName.includes(searchTerm) || 
                       degreeName.includes(searchTerm);
            });
            displaySchedules();
            
            // Hide loading after search
            setTimeout(() => {
                if (typeof hideAllLoading === 'function') {
                    hideAllLoading();
                }
                // Fallback - loading will be cleared by displaySchedules()
            }, 300);
        });
    }

    // Filter functionality
    DOMUtils.safeAddEventListener('specialtyFilter', 'change', applyFilters);
    DOMUtils.safeAddEventListener('startDateFilter', 'change', applyFilters);
    DOMUtils.safeAddEventListener('clinicFilter', 'change', applyFilters);
    DOMUtils.safeAddEventListener('locationFilter', 'change', applyFilters);

    // Action buttons
    DOMUtils.safeAddEventListener('refreshBtn', 'click', loadTodaySchedules);
    DOMUtils.safeAddEventListener('exportBtn', 'click', exportSchedule);
    // Sync Today's Data button removed
    DOMUtils.safeAddEventListener('clearFiltersBtn', 'click', clearFilters);

    // Modal functionality
    DOMUtils.safeAddEventListener('closeAssignmentsModal', 'click', closeAssignmentsModal);
    DOMUtils.safeAddEventListener('closeAssignmentsBtn', 'click', closeAssignmentsModal);
    DOMUtils.safeAddEventListener('assignClinicBtn', 'click', assignClinic);
    
    // Print functionality removed

    // Event delegation for action buttons
    document.addEventListener('click', function(e) {
        if (e.target.closest('[data-schedule-id]')) {
            const button = e.target.closest('[data-schedule-id]');
            const scheduleId = button.getAttribute('data-schedule-id');
            const action = button.getAttribute('data-action');
            
            // Print and ticket stats actions removed
        }
        
        if (e.target.closest('[data-action="assign-clinic"]')) {
            const button = e.target.closest('[data-action="assign-clinic"]');
            const scheduleId = button.getAttribute('data-schedule-id');
            const physicianId = button.getAttribute('data-physician-id');
            
            if (scheduleId && physicianId) {
                openPhysicianClinicAssignments(scheduleId, physicianId);
            }
        }
        
        // Assignment modal buttons
        if (e.target.closest('[data-assignment-id]')) {
            const button = e.target.closest('[data-assignment-id]');
            const assignmentId = button.getAttribute('data-assignment-id');
            const action = button.getAttribute('data-action');
            
            if (assignmentId && action === 'toggle-status') {
                toggleAssignmentStatus(assignmentId);
            } else if (assignmentId && action === 'delete-assignment') {
                deleteAssignment(assignmentId);
            }
        }
    });
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        const assignmentsModal = document.getElementById('assignmentsModal');
        // Print modals removed
        
        if (e.target === assignmentsModal) {
            closeAssignmentsModal();
        }
        
        // Print modals removed
    });
}

// Apply filters
function applyFilters() {
    // Show loading for filters
    if (typeof showTableDataLoading === 'function') {
        showTableDataLoading('schedulesTable', 'Applying filters...');
    } else {
        // Fallback loading display
        const tbody = document.getElementById('schedulesTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;"><i class="fas fa-spinner fa-spin"></i> Applying filters...</td></tr>';
        }
    }
    
    const specialtyFilter = document.getElementById('specialtyFilter')?.value || '';
    const startDateFilter = document.getElementById('startDateFilter')?.value || '';
    const clinicFilter = document.getElementById('clinicFilter')?.value || '';
    const locationFilter = document.getElementById('locationFilter')?.value || '';
    
    filteredSchedules = todaySchedules.filter(schedule => {
        // Use populated physician data from API response
        const physician = schedule.physician;
        const specialtyMatch = !specialtyFilter || physician?.speciality?._id === specialtyFilter;
        
        // Start date filter
        let startDateMatch = true;
        if (startDateFilter) {
            const today = new Date();
            const scheduleStartDate = new Date(schedule.startDate);
            const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
            const scheduleStart = new Date(scheduleStartDate.getFullYear(), scheduleStartDate.getMonth(), scheduleStartDate.getDate());
            
            if (startDateFilter === 'today') {
                startDateMatch = scheduleStart.getTime() === todayStart.getTime();
            } else if (startDateFilter === 'future') {
                startDateMatch = scheduleStart > todayStart;
            } else if (startDateFilter === 'past') {
                startDateMatch = scheduleStart < todayStart;
            }
        }
        
        // Clinic and location filters (these will be applied after clinic assignments are loaded)
        let clinicMatch = true;
        let locationMatch = true;
        
        if (clinicFilter || locationFilter) {
            // Check if schedule has clinic assignment from the schedule data
            if (schedule.clinicAssignment && schedule.clinicAssignment.length > 0) {
                const assignment = schedule.clinicAssignment[0]; // Get the first (and only) assignment
                
                if (clinicFilter) {
                    // Find clinic by ID and check if it matches
                    const selectedClinic = clinics.find(c => c._id === clinicFilter);
                    if (selectedClinic) {
                        const clinicName = selectedClinic.enName || selectedClinic.arName || selectedClinic.name;
                        const assignedClinicName = assignment.clinic?.enName || assignment.clinic?.arName || assignment.clinic?.name;
                        clinicMatch = clinicName === assignedClinicName;
                    }
                }
                
                if (locationFilter) {
                    // Check location match by ID or name
                    const assignmentLocation = assignment.clinic?.location;
                    if (assignmentLocation) {
                        if (typeof assignmentLocation === 'string') {
                            // Location is an ID
                            locationMatch = assignmentLocation === locationFilter;
                        } else if (assignmentLocation._id) {
                            // Location is an object with _id
                            locationMatch = assignmentLocation._id === locationFilter;
                        } else {
                            // Fallback to name comparison
                            const locationName = assignmentLocation.enName || assignmentLocation.arName;
                            const expectedName = locationIdToName[locationFilter] || locationFilter;
                            locationMatch = locationName === expectedName;
                        }
                    } else {
                        locationMatch = false;
                    }
                }
            } else {
                // If no clinic assignment, only match if no filters are applied
                clinicMatch = !clinicFilter;
                locationMatch = !locationFilter;
            }
        }
        
        return specialtyMatch && startDateMatch && clinicMatch && locationMatch;
    });
    
    displaySchedules();
    
    // Hide loading after filtering
    setTimeout(() => {
        if (typeof hideAllLoading === 'function') {
            hideAllLoading();
        }
        // Fallback - loading will be cleared by displaySchedules()
    }, 300);
}

// Clear all filters
function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('specialtyFilter').value = '';
    document.getElementById('startDateFilter').value = '';
    document.getElementById('clinicFilter').value = '';
    document.getElementById('locationFilter').value = '';
    
    filteredSchedules = [...todaySchedules];
    displaySchedules();
    
    showNotification('Filters cleared', 'info');
}

// Print functionality removed

// Print functionality removed

// Print functionality removed

// Print functionality removed


// Print functionality removed

// Print functionality removed


// Export schedule
function exportSchedule() {
    if (filteredSchedules.length === 0) {
        showNotification('No schedules to export', 'warning');
        return;
    }
    
    // Show loading
    if (typeof showLoading === 'function') {
        showLoading('Preparing export...');
    } else {
        showNotification('Preparing export...', 'info');
    }
    
    // Create CSV content
    let csvContent = 'Physician,Specialty,Degree,Start Time,End Time,Clinic Name,Clinic Location,Status,Notes\n';
    
    filteredSchedules.forEach(schedule => {
        // Use populated physician data from API response
        const physician = schedule.physician;
        const specialty = physician?.speciality;
        const degree = physician?.degree;
        
        const physicianName = physician?.name || 'Unknown Physician';
        const specialtyName = specialty?.enName || specialty?.arName || 'Unknown Specialty';
        const degreeName = degree?.enName || degree?.arName || 'Unknown Degree';
        const status = schedule.isActive !== false ? 'Active' : 'Inactive';
        const notes = schedule.notes || '';
        
        // Get clinic information from the DOM elements
        const clinicElement = document.getElementById(`clinic-${schedule._id}`);
        const locationElement = document.getElementById(`location-${schedule._id}`);
        const clinicName = clinicElement?.textContent?.trim() || 'Not Assigned';
        const locationName = locationElement?.textContent?.trim() || 'Unknown';
        
        csvContent += `"${physicianName}","${specialtyName}","${degreeName}","${formatTimeTo12Hour(schedule.startTime)}","${formatTimeTo12Hour(schedule.endTime)}","${clinicName}","${locationName}","${status}","${notes}"\n`;
    });
    
    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `physician-schedule-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    // Hide loading
    setTimeout(() => {
        if (typeof hideAllLoading === 'function') {
            hideAllLoading();
        } else if (typeof hideLoading === 'function') {
            hideLoading();
        }
    }, 1000);
    
    showNotification('Schedule exported successfully', 'success');
}



// Open physician schedule-specific clinic assignments modal
async function openPhysicianClinicAssignments(scheduleId, physicianId) {
    selectedPhysicianId = physicianId;
    selectedScheduleId = scheduleId;
    const physician = physicians.find(p => p._id === physicianId);
    const physicianName = physician?.name || 'Unknown Physician';
    
    // Update modal title and physician name
    document.getElementById('assignmentsModalTitle').innerHTML = `<i class="fas fa-hospital"></i> Clinic Assignment - ${physicianName}`;
    document.getElementById('physicianName').textContent = physicianName;
    
    // Populate clinic dropdown
    await populateClinicSelect();
    
    // Load current assignments for this schedule
    loadPhysicianScheduleAssignments(scheduleId);
    
    // Show modal
    document.getElementById('assignmentsModal').style.display = 'block';
}

// Close assignments modal
function closeAssignmentsModal() {
    document.getElementById('assignmentsModal').style.display = 'none';
    selectedPhysicianId = null;
    selectedScheduleId = null;
}

// Populate clinic select dropdown (excluding already assigned clinics)
async function populateClinicSelect() {
    const clinicSelect = document.getElementById('clinicSelect');
    if (!clinicSelect || clinics.length === 0) return;
    
    try {
        // Get all active assignments to see which clinics are already assigned
        const response = await fetch(`${ASSIGNMENTS_API}?active=true`);
        const result = await response.json();
        
        // Helper function to check if two dates are the same day
        const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
        
        // Helper function to get yesterday's date
        const getYesterday = () => {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday;
        };
        
        const today = new Date();
        const yesterday = getYesterday();
        
        // Build a set of clinics actively assigned TODAY or YESTERDAY to other schedules
        const activeTodayAssignments = new Map(); // clinicId -> array of assignments today
        const activeYesterdayAssignments = new Map(); // clinicId -> array of assignments yesterday
        
        if (result.success && Array.isArray(result.data)) {
            for (const a of result.data) {
                const clinicId = a?.clinic?._id || a?.clinic;
                if (!clinicId) continue;
                
                const assignedTs = a.assignedDate || a.assignmentDate || a.createdAt;
                const assignedAt = assignedTs ? new Date(assignedTs) : null;
                
                if (assignedAt) {
                    const isToday = isSameDay(assignedAt, today);
                    const isYesterday = isSameDay(assignedAt, yesterday);
                    
                    if (a.isActive) {
                        if (isToday) {
                            const arr = activeTodayAssignments.get(clinicId) || [];
                            arr.push(a);
                            activeTodayAssignments.set(clinicId, arr);
                        } else if (isYesterday) {
                            // Block clinics assigned yesterday
                            const arr = activeYesterdayAssignments.get(clinicId) || [];
                            arr.push(a);
                            activeYesterdayAssignments.set(clinicId, arr);
                        }
                    }
                }
            }
        }

        // Filter out clinics that have an active assignment today OR yesterday for a different schedule
        const availableClinics = clinics.filter(clinic => {
            const blockedTodayAssignments = activeTodayAssignments.get(clinic._id) || [];
            const blockedYesterdayAssignments = activeYesterdayAssignments.get(clinic._id) || [];
            
            // Block if clinic was assigned yesterday (regardless of schedule)
            if (blockedYesterdayAssignments.length > 0) {
                return false;
            }
            
            // Check today's assignments
            if (blockedTodayAssignments.length === 0) return true;
            
            // Allow if any of today's assignments are for the currently selected schedule (editing case)
            if (selectedScheduleId) {
                const assignedToCurrent = blockedTodayAssignments.some(a => (a.physicianSchedule?._id || a.physicianSchedule) === selectedScheduleId);
                if (assignedToCurrent) return true;
            }
            return false;
        });
        
        clinicSelect.innerHTML = '<option value="">Choose a clinic...</option>';
        availableClinics.forEach(clinic => {
            const option = document.createElement('option');
            option.value = clinic._id;
            option.textContent = clinic.enName || clinic.arName || clinic.name;
            clinicSelect.appendChild(option);
        });
        
        // Show message if no clinics available
        if (availableClinics.length === 0) {
            clinicSelect.innerHTML = '<option value="">No available clinics</option>';
        }
        
    } catch (error) {
        console.error('Error loading clinic assignments:', error);
        // Fallback to showing all clinics if there's an error
        clinicSelect.innerHTML = '<option value="">Choose a clinic...</option>';
        clinics.forEach(clinic => {
            const option = document.createElement('option');
            option.value = clinic._id;
            option.textContent = clinic.enName || clinic.arName || clinic.name;
            clinicSelect.appendChild(option);
        });
    }
}

// Load physician schedule assignments
async function loadPhysicianScheduleAssignments(scheduleId) {
    try {
        const response = await fetch(`${ASSIGNMENTS_API}/schedule/${scheduleId}`);
        const result = await response.json();
        
        if (result.success) {
            displayAssignments(result.data);
        } else {
            console.error('Error loading assignments:', result.message);
            document.getElementById('assignmentsList').innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;">Error loading assignments</div>';
        }
    } catch (error) {
        console.error('Error loading assignments:', error);
        document.getElementById('assignmentsList').innerHTML = '<div style="text-align: center; padding: 20px; color: #6c757d;">Error loading assignments</div>';
    }
}

// Display assignments in modal (single clinic assignment)
function displayAssignments(assignments) {
    const assignmentsList = document.getElementById('assignmentsList');
    
    if (assignments.length === 0) {
        assignmentsList.innerHTML = '<div style="text-align: center; padding: 40px; color: #6c757d;"><i class="fas fa-unlink" style="font-size: 2rem; margin-bottom: 10px;"></i><br>No clinic assigned</div>';
        return;
    }
    
    // Show only the first (and should be only) assignment
    const assignment = assignments[0];
    const clinicName = assignment.clinic?.enName || assignment.clinic?.arName || 'Unknown Clinic';
    const statusClass = assignment.isActive ? 'status-active' : 'status-inactive';
    const statusText = assignment.isActive ? 'Active' : 'Inactive';
    
    // Format the assigned date properly - try different date field names
    const assignedDateFormatted = (() => {
        const dateField = assignment.assignedDate || assignment.assignmentDate || assignment.createdAt;
        if (dateField) {
            try {
                return new Date(dateField).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            } catch (e) {
                return 'Invalid Date';
            }
        }
        return 'Unknown Date';
    })();
    
    // Get assigned by information
    const assignedByName = assignment.assignedBy?.name || assignment.assignedBy?.username || 'System';
    const updatedDateFormatted = (() => {
        const dateField = assignment.updatedAt;
        if (dateField) {
            try {
                return new Date(dateField).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                });
            } catch (e) {
                return 'Invalid Date';
            }
        }
        return 'Unknown Date';
    })();
    const updatedByName = assignment.updatedBy?.name || assignment.updatedBy?.username || assignedByName;

    // Previous clinic info if present
    const previousClinicName = assignment.previousClinic?.enName || assignment.previousClinic?.arName || null;
    const previousUpdatedAtFormatted = (() => {
        const dateField = assignment.previousUpdatedAt;
        if (dateField) {
            try {
                return new Date(dateField).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
            } catch (e) { return 'Invalid Date'; }
        }
        return null;
    })();
    const previousUpdatedByName = assignment.previousUpdatedBy?.name || assignment.previousUpdatedBy?.username || null;

    assignmentsList.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border: 2px solid #e9ecef; border-radius: 12px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="flex: 1;">
                <h5 style="margin: 0 0 8px 0; color: #2c3e50; font-size: 1.1rem;">
                    <i class="fas fa-hospital" style="color: #1976d2; margin-right: 8px;"></i>
                    ${clinicName}
                </h5>
                <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 0.9rem;">
                    <i class="fas fa-calendar" style="margin-right: 5px;"></i>
                    Assigned: ${assignedDateFormatted}
                </p>
                <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 0.9rem;">
                    <i class="fas fa-user" style="margin-right: 5px;"></i>
                    Assigned By: ${assignedByName}
                </p>
                <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 0.9rem;">
                    <i class="fas fa-edit" style="margin-right: 5px;"></i>
                    Updated: ${updatedDateFormatted}
                </p>
                <p style="margin: 0 0 5px 0; color: #6c757d; font-size: 0.9rem;">
                    <i class="fas fa-user-check" style="margin-right: 5px;"></i>
                    Updated By: ${updatedByName}
                </p>
                ${previousClinicName ? `
                <div style=\"margin-top:8px; padding:10px; background:#f8f9fa; border:1px solid #e9ecef; border-radius:6px;\">
                    <p style=\"margin: 0 0 5px 0; color: #495057; font-size: 0.9rem; font-weight:600;\">
                        <i class=\"fas fa-history\" style=\"margin-right: 6px;\"></i>
                        Previous Clinic: ${previousClinicName}
                    </p>
                    ${previousUpdatedAtFormatted ? `<p style=\"margin: 0 0 5px 0; color: #6c757d; font-size: 0.85rem;\">
                        <i class=\"fas fa-clock\" style=\"margin-right: 6px;\"></i>
                        Changed At: ${previousUpdatedAtFormatted}
                    </p>` : ''}
                    ${previousUpdatedByName ? `<p style=\"margin: 0; color: #6c757d; font-size: 0.85rem;\">
                        <i class=\"fas fa-user-edit\" style=\"margin-right: 6px;\"></i>
                        Changed By: ${previousUpdatedByName}
                    </p>` : ''}
                </div>
                ` : ''}
                ${assignment.notes ? `<p style="margin: 8px 0 0 0; color: #495057; font-size: 0.85rem; font-style: italic; background: #f8f9fa; padding: 8px; border-radius: 4px;"><i class="fas fa-sticky-note" style="margin-right: 5px;"></i>${assignment.notes}</p>` : ''}
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <span class="status-badge ${statusClass}" style="padding: 6px 16px; border-radius: 20px; font-size: 0.9rem; font-weight: 600;">${statusText}</span>
                <button class="btn btn-sm ${assignment.isActive ? 'btn-warning' : 'btn-success'}" data-assignment-id="${assignment._id}" data-action="toggle-status" style="background: ${assignment.isActive ? '#fd7e14' : '#28a745'}; border: none; color: white; font-weight: 600; padding: 6px 12px; font-size: 0.8rem; border-radius: 4px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: all 0.3s ease;" title="${assignment.isActive ? 'Deactivate' : 'Activate'} Assignment">
                    <i class="fas fa-toggle-${assignment.isActive ? 'off' : 'on'}" style="margin-right: 4px;"></i>
                </button>
                <button class="btn btn-sm btn-danger" data-assignment-id="${assignment._id}" data-action="delete-assignment" style="background: #dc3545; border: none; color: white; font-weight: 600; padding: 6px 12px; font-size: 0.8rem; border-radius: 4px; box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3); transition: all 0.3s ease;" title="Remove Assignment">
                    <i class="fas fa-trash" style="margin-right: 4px;"></i>
                </button>
            </div>
        </div>
    `;
}

// Assign clinic to physician (single clinic assignment)
async function assignClinic() {
    const clinicId = document.getElementById('clinicSelect').value;
    const notes = document.getElementById('assignmentNotes').value;
    
    if (!clinicId) {
        showNotification('Please select a clinic', 'warning');
        return;
    }
    
    if (!selectedScheduleId) {
        showNotification('No schedule selected', 'error');
        return;
    }
    
    try {
        showLoading('Assigning clinic...');
        
        // First, check if schedule already has an assignment
        const existingResponse = await fetch(`${ASSIGNMENTS_API}/schedule/${selectedScheduleId}`);
        const existingResult = await existingResponse.json();
        
        let response;
        if (existingResult.success && existingResult.data.length > 0) {
            // Update existing assignment
            const existingAssignment = existingResult.data[0];
            response = await fetch(`${ASSIGNMENTS_API}/${existingAssignment._id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    physicianSchedule: selectedScheduleId,
                    clinic: clinicId,
                    notes: notes || null,
                    isActive: true,
                    userId: getCurrentUserId()
                })
            });
        } else {
            // Create new assignment
            response = await fetch(ASSIGNMENTS_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    physicianSchedule: selectedScheduleId,
                    clinic: clinicId,
                    notes: notes || null,
                    userId: getCurrentUserId()
                })
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Clinic assigned successfully', 'success');
            document.getElementById('clinicSelect').value = '';
            document.getElementById('assignmentNotes').value = '';
            loadPhysicianScheduleAssignments(selectedScheduleId);
            // Refresh the clinic dropdown to update available options
            await populateClinicSelect();
            // Refresh the clinic display in the main table
            await refreshClinicDisplay(selectedScheduleId);
            
            // Add new row to todayphysicianschedules table
            await addToTodayPhysicianSchedules(selectedScheduleId, clinicId);
        } else {
            console.error('Assignment error:', result);
            // Show specific error message for clinic already assigned
            if (result.message.includes('already assigned to another schedule')) {
                showNotification('This clinic is already assigned to another schedule. Please choose a different clinic.', 'warning');
            } else if (result.message.includes('Physician schedule not found')) {
                showNotification('Schedule not found. Please refresh the page and try again.', 'error');
            } else {
                showNotification('Error: ' + result.message, 'error');
            }
        }
    } catch (error) {
        console.error('Error assigning clinic:', error);
        showNotification('Error assigning clinic. Please try again.', 'error');
    } finally {
        hideAllLoading();
    }
}

// Get current user ID from localStorage
function getCurrentUserId() {
    try {
        const userData = localStorage.getItem('currentUser');
        console.log('User data from localStorage:', userData);
        if (userData) {
            const user = JSON.parse(userData);
            console.log('Parsed user:', user);
            const userId = user._id || user.id;
            console.log('Extracted user ID:', userId);
            return userId;
        }
    } catch (error) {
        console.error('Error getting current user ID:', error);
    }
    const defaultId = '507f1f77bcf86cd799439011';
    console.log('Using default user ID:', defaultId);
    return defaultId; // Default user ID as fallback
}

// Get current user data from localStorage
function getCurrentUserData() {
    try {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            const user = JSON.parse(userData);
            return {
                id: user._id || user.id,
                name: user.name || user.firstName + ' ' + user.lastName || user.username || 'Unknown User',
                username: user.username || 'Unknown User'
            };
        }
    } catch (error) {
        console.error('Error getting current user data:', error);
    }
    return {
        id: '507f1f77bcf86cd799439011',
        name: 'Unknown User',
        username: 'Unknown User'
    };
}

// Add new row to todayphysicianschedules table when clinic is assigned
async function addToTodayPhysicianSchedules(scheduleId, clinicId) {
    try {
        console.log('Adding to TodayPhysicianSchedule:', { scheduleId, clinicId });
        
        // Get the schedule data
        const scheduleResponse = await fetch(`${API_BASE_URL}/physician-schedules/${scheduleId}`);
        const scheduleResult = await scheduleResponse.json();
        
        if (!scheduleResult.success) {
            console.error('Error fetching schedule:', scheduleResult);
            return;
        }
        
        const schedule = scheduleResult.data;
        
        // Get physician data
        const physicianId = schedule.physician?._id || schedule.physician;
        const physician = await getPhysicianById(physicianId);
        
        if (!physician) {
            console.error('Physician not found:', physicianId);
            return;
        }
        
        // Get clinic data
        const clinic = await getClinicById(clinicId);
        
        if (!clinic) {
            console.error('Clinic not found:', clinicId);
            return;
        }
        
        // Get speciality data if physician has speciality ID
        let specialityData = null;
        if (physician.speciality && typeof physician.speciality === 'string') {
            specialityData = await getSpecialityById(physician.speciality);
            console.log('Fetched speciality data:', specialityData);
        }
        
        // Get degree data if physician has degree ID
        let degreeData = null;
        if (physician.degree && typeof physician.degree === 'string') {
            degreeData = await getDegreeById(physician.degree);
            console.log('Fetched degree data:', degreeData);
        }
        
        // Get location data if clinic has location ID
        let locationData = null;
        if (clinic.location && typeof clinic.location === 'string') {
            locationData = await getLocationById(clinic.location);
            console.log('Fetched location data:', locationData);
        }
        
        // Get current user data for createdBy name
        const currentUserData = getCurrentUserData();
        console.log('Current user data:', currentUserData);
        
        // Get current user ID from session or localStorage
        const currentUserId = getCurrentUserId();
        console.log('Current user ID:', currentUserId);
        
        // Prepare data for TodayPhysicianSchedule (simplified - only physician name and clinic name)
        const physicianName = physician.name || 'Unknown Physician';
        
        console.log('Physician name preparation:', {
            name: physician.name,
            finalName: physicianName
        });
        
        console.log('Physician speciality and degree:', {
            speciality: physician.speciality,
            specialityEnName: physician.speciality?.enName,
            specialityArName: physician.speciality?.arName,
            degree: physician.degree
        });
        
        // Prepare speciality name
        let specialityName = 'N/A';
        if (specialityData) {
            specialityName = specialityData.enName || specialityData.arName || specialityData.name || 'N/A';
        } else if (physician.speciality) {
            if (typeof physician.speciality === 'object') {
                specialityName = physician.speciality.enName || physician.speciality.arName || physician.speciality.name || 'N/A';
            } else {
                specialityName = physician.speciality;
            }
        }
        
        // Prepare degree name
        let degreeName = 'N/A';
        if (degreeData) {
            degreeName = degreeData.enName || degreeData.arName || degreeData.name || 'N/A';
        } else if (physician.degree) {
            if (typeof physician.degree === 'object') {
                degreeName = physician.degree.enName || physician.degree.arName || physician.degree.name || 'N/A';
            } else {
                degreeName = physician.degree;
            }
        }
        
        // Prepare location name
        let locationName = 'N/A';
        if (locationData) {
            locationName = locationData.enName || locationData.arName || locationData.name || 'N/A';
        } else if (clinic.location) {
            if (typeof clinic.location === 'object') {
                locationName = clinic.location.enName || clinic.location.arName || clinic.location.name || 'N/A';
            } else {
                locationName = clinic.location;
            }
        }
    
    console.log('Speciality preparation:', {
        specialityData: specialityData,
        specialityName: specialityName
    });
    
    console.log('Degree preparation:', {
        degreeData: degreeData,
        degreeName: degreeName
    });
    
    console.log('Location preparation:', {
        locationData: locationData,
        locationName: locationName
    });
    
    console.log('Clinic times preparation:', {
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        clinicTimeFrom: schedule.startTime || '09:00',
        clinicTimeTo: schedule.endTime || '17:00'
    });
    
        const todayScheduleData = {
            scheduleId: scheduleId, // Add schedule ID to distinguish multiple schedules for same physician
            physicianId: physician._id,
            physicianName: physicianName,
            speciality: specialityName,
            degree: degreeName,
            clinicTimeFrom: schedule.startTime || '09:00',
            clinicTimeTo: schedule.endTime || '17:00',
            day: getDayName(new Date()), // Today's day
            date: new Date().toISOString().split('T')[0], // Today's date
            clinicName: clinic.enName || clinic.arName || clinic.name,
            clinicCode: clinic.code || null, // Add clinic code
            location: locationName,
            isActive: true,
            createdBy: currentUserId,
            createdByName: currentUserData.name,
            updatedBy: currentUserId,
            updatedByName: currentUserData.name
        };
        
        console.log('Raw physician data:', physician);
        console.log('Raw clinic data:', clinic);
        console.log('Raw schedule data:', schedule);
        
        // Validate that essential fields are present
        if (!physician._id) {
            console.error('Physician ID is missing');
            return;
        }
        if (!clinic._id) {
            console.error('Clinic ID is missing');
            return;
        }
        if (!physician.name) {
            console.error('Physician name is missing - no name found in doctor table');
            console.error('Physician data:', physician);
            return;
        }
        if (!physician.speciality && !physician.degree) {
            console.warn('Warning: Physician speciality and degree are missing');
            console.log('Physician data:', physician);
        }
        if (!schedule.startTime && !schedule.endTime) {
            console.warn('Warning: Schedule times are missing, using default times');
            console.log('Schedule data:', schedule);
        }
        if (!clinic.name && !clinic.enName && !clinic.arName) {
            console.error('Clinic name is missing');
            return;
        }
        
        console.log('Prepared TodayPhysicianSchedule data:', todayScheduleData);
        console.log('Data validation check:', {
            scheduleId: !!todayScheduleData.scheduleId,
            physicianId: !!todayScheduleData.physicianId,
            physicianName: !!todayScheduleData.physicianName,
            speciality: !!todayScheduleData.speciality,
            degree: !!todayScheduleData.degree,
            clinicName: !!todayScheduleData.clinicName,
            clinicTimeFrom: !!todayScheduleData.clinicTimeFrom,
            clinicTimeTo: !!todayScheduleData.clinicTimeTo,
            day: !!todayScheduleData.day,
            date: !!todayScheduleData.date,
            isActive: !!todayScheduleData.isActive,
            createdBy: !!todayScheduleData.createdBy,
            updatedBy: !!todayScheduleData.updatedBy
        });
        
        // Check if schedule already exists for today
        const existingSchedule = await findExistingTodayScheduleByScheduleId(
            todayScheduleData.scheduleId, 
            todayScheduleData.date
        );
        
        let todayScheduleId;
        if (existingSchedule) {
            // Update existing schedule
            console.log('Updating existing TodayPhysicianSchedule:', existingSchedule._id);
            const updateRes = await updateTodaySchedule(existingSchedule._id, todayScheduleData);
            todayScheduleId = (updateRes && updateRes.data && updateRes.data._id) || existingSchedule._id;
            console.log('Updated TodayPhysicianSchedule successfully');
        } else {
            // Create new schedule
            console.log('Creating new TodayPhysicianSchedule');
            const createRes = await createTodaySchedule(todayScheduleData);
            todayScheduleId = createRes && createRes.data && (createRes.data._id || createRes.data);
            console.log('Created TodayPhysicianSchedule successfully');
        }

        // Link today's tickets for this PhysicianSchedule to the TodayPhysicianSchedule id
        try {
            if (todayScheduleId) {
                const linkResp = await fetch(`${TICKET_API}/link-today-schedule`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        scheduleId: selectedScheduleId,
                        todayScheduleId,
                        date: new Date().toISOString().split('T')[0]
                    })
                });
                const linkJson = await linkResp.json();
                if (!linkResp.ok || !linkJson.success) {
                    console.warn('Failed to link tickets:', linkJson);
                }
            }
        } catch (e) {
            console.warn('Error linking tickets to TodayPhysicianSchedule:', e);
        }
        
    } catch (error) {
        console.error('Error adding to TodayPhysicianSchedule:', error);
    }
}

// Toggle assignment status
async function toggleAssignmentStatus(assignmentId) {
    try {
        showLoading('Updating status...');
        
        const response = await fetch(`${ASSIGNMENTS_API}/${assignmentId}/toggle-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification(result.message, 'success');
            loadPhysicianScheduleAssignments(selectedScheduleId);
            // Refresh the clinic dropdown to update available options
            await populateClinicSelect();
            // Refresh the clinic display in the main table
            await refreshClinicDisplay(selectedScheduleId);
            
            // Update todayphysicianschedules table if assignment is activated
            if (result.data && result.data.isActive) {
                const clinicId = result.data.clinic?._id || result.data.clinic;
                if (clinicId) {
                    await addToTodayPhysicianSchedules(selectedScheduleId, clinicId);
                }
            }
        } else {
            showNotification('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error toggling status:', error);
        showNotification('Error updating status. Please try again.', 'error');
    } finally {
        hideAllLoading();
    }
}

// Delete assignment
async function deleteAssignment(assignmentId) {
    if (!confirm('Are you sure you want to delete this assignment?')) {
        return;
    }
    
    try {
        showLoading('Deleting assignment...');
        
        const response = await fetch(`${ASSIGNMENTS_API}/${assignmentId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showNotification('Assignment deleted successfully', 'success');
            loadPhysicianScheduleAssignments(selectedScheduleId);
            // Refresh the clinic dropdown to update available options
            await populateClinicSelect();
            // Refresh the clinic display in the main table
            await refreshClinicDisplay(selectedScheduleId);
        } else {
            showNotification('Error: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error deleting assignment:', error);
        showNotification('Error deleting assignment. Please try again.', 'error');
    } finally {
        hideAllLoading();
    }
}

// Loading functions
function showLoading(message = 'Loading...') {
    // Show loading overlay
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (loadingOverlay) {
        if (loadingText) {
            loadingText.textContent = message;
        }
        loadingOverlay.style.display = 'flex';
    } else {
        // Fallback: show notification
        showNotification(message, 'info');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function hideAllLoading() {
    hideLoading();
}

// Print functionality removed

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
