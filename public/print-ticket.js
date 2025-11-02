// Print Ticket Management System
// This script handles the print ticket functionality for today's physician schedules

// Global variables
let todaySchedules = [];
let filteredSchedules = [];
let currentUser = null;
let selectedScheduleForTicket = null;
let openPrintWindows = []; // Track open print windows
let printMinutesAfterClinicEnd = 10; // Default value, will be loaded from configuration

// API endpoints
const TODAY_SCHEDULES_API = `${API_BASE_URL}/today-physician-schedules`;
const TICKETS_API = `${API_BASE_URL}/tickets`;
const CONFIGURATION_API = `${API_BASE_URL}/configuration`;

// DOM elements
let schedulesTableBody;
let searchInput;
let specialtyFilter;
let clinicFilter;
let locationFilter;
let clearFiltersBtn;
let ticketTypeModal;
let ticketPreview;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('Print Ticket System initialized');
    
    // Initialize immediately without waiting for auth
    initializeApp();
});

// Wait for authentication to complete
async function waitForAuth() {
    return new Promise((resolve) => {
        const checkAuth = () => {
            if (window.isAuthenticated !== undefined) {
                resolve();
            } else {
                setTimeout(checkAuth, 100);
            }
        };
        checkAuth();
    });
}

// Initialize the application
async function initializeApp() {
    try {
        console.log('Initializing Print Ticket System...');
        
        // Get current user data
        currentUser = getCurrentUserData();
        console.log('Current user:', currentUser);
        
        // Initialize DOM elements
        initializeDOMElements();
        
    // Set up event listeners
    setupEventListeners();
    
    // Set up cleanup on page unload
    setupCleanup();
    
    // Set today's date
    setTodayDate();
        
        // Load initial data with timeout
        const loadPromise = loadTodaySchedules();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Load timeout')), 10000)
        );
        
        try {
            await Promise.race([loadPromise, timeoutPromise]);
        } catch (error) {
            console.error('Load timeout or error:', error);
            createDummyData();
        }
        
        // Load print configuration
        await loadPrintConfiguration();
        
        // Set up periodic configuration refresh (every 5 minutes)
        setInterval(loadPrintConfiguration, 5 * 60 * 1000);
        
        // Load filter options
        await loadFilterOptions();
        
        // Add tooltip functionality to existing buttons
        addTooltipFunctionality();
        
        console.log('Print Ticket System initialized successfully');
        
    } catch (error) {
        console.error('Error initializing Print Ticket System:', error);
        showAlert('Error initializing the system. Using dummy data for demonstration.', 'warning');
        createDummyData();
    }
}

// Initialize DOM elements
function initializeDOMElements() {
    schedulesTableBody = document.getElementById('schedulesTableBody');
    searchInput = document.getElementById('searchInput');
    specialtyFilter = document.getElementById('specialtyFilter');
    clinicFilter = document.getElementById('clinicFilter');
    locationFilter = document.getElementById('locationFilter');
    clearFiltersBtn = document.getElementById('clearFiltersBtn');
    ticketTypeModal = document.getElementById('ticketTypeModal');
    ticketPreview = document.getElementById('ticketPreview');
}

// Set up event listeners
function setupEventListeners() {
    // Search functionality
    searchInput.addEventListener('input', handleSearch);
    
    // Filter functionality
    specialtyFilter.addEventListener('change', applyFilters);
    clinicFilter.addEventListener('change', applyFilters);
    locationFilter.addEventListener('change', applyFilters);
    
    // Button events
    clearFiltersBtn.addEventListener('click', clearFilters);
    
    // Modal events
    setupModalEventListeners();
}

// Set up modal event listeners
function setupModalEventListeners() {
    const closeTicketTypeModal = document.getElementById('closeTicketTypeModal');
    const cancelTicketBtn = document.getElementById('cancelTicketBtn');
    const printTicketBtn = document.getElementById('printTicketBtn');
    
    closeTicketTypeModal.addEventListener('click', closeTicketTypeModalHandler);
    cancelTicketBtn.addEventListener('click', closeTicketTypeModalHandler);
    printTicketBtn.addEventListener('click', handlePrintTicket);
    
    // Close modal when clicking outside
    ticketTypeModal.addEventListener('click', function(event) {
        if (event.target === ticketTypeModal) {
            closeTicketTypeModalHandler();
        }
    });
    
    // Schedule statistics modal event listeners
    const closeScheduleStatisticsModal = document.getElementById('closeScheduleStatisticsModal');
    const closeScheduleStatisticsBtn = document.getElementById('closeScheduleStatisticsBtn');
    const refreshScheduleStatisticsBtn = document.getElementById('refreshScheduleStatisticsBtn');
    const scheduleStatisticsModal = document.getElementById('scheduleStatisticsModal');
    
    closeScheduleStatisticsModal.addEventListener('click', closeScheduleStatisticsModalHandler);
    closeScheduleStatisticsBtn.addEventListener('click', closeScheduleStatisticsModalHandler);
    refreshScheduleStatisticsBtn.addEventListener('click', refreshScheduleStatistics);
    
    // Close schedule statistics modal when clicking outside
    scheduleStatisticsModal.addEventListener('click', function(event) {
        if (event.target === scheduleStatisticsModal) {
            closeScheduleStatisticsModalHandler();
        }
    });
}

// Set up cleanup on page unload
function setupCleanup() {
    // Close all print windows when page is unloaded
    window.addEventListener('beforeunload', function() {
        closePrintWindows();
    });
    
    // Also close on page hide (for mobile browsers)
    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            closePrintWindows();
        }
    });
}

// Set today's date
function setTodayDate() {
    const todayDateElement = document.getElementById('todayDate');
    if (todayDateElement) {
        const today = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        todayDateElement.textContent = today.toLocaleDateString('en-US', options);
    }
}

// Load today's schedules
async function loadTodaySchedules() {
    try {
        console.log('Loading today\'s schedules...');
        console.log('API_BASE_URL:', API_BASE_URL);
        console.log('TODAY_SCHEDULES_API:', TODAY_SCHEDULES_API);
        
        // Show loading state
        showLoadingState();
        
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        console.log('Today\'s date:', today);
        
        // Fetch schedules
        const url = `${TODAY_SCHEDULES_API}?date=${today}`;
        console.log('Fetching from URL:', url);
        
        const response = await fetch(url);
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.success) {
            todaySchedules = result.data || [];
            filteredSchedules = [...todaySchedules];
            
            console.log('Loaded schedules:', todaySchedules.length);
            console.log('Schedules data:', todaySchedules);
            
            // If no schedules for today, try loading all schedules
            if (todaySchedules.length === 0) {
                console.log('No schedules for today, trying to load all schedules...');
                await loadAllSchedules();
            } else {
                // Update statistics
                updateStatistics();
                
                // Render schedules
                renderSchedules();
            }
            
        } else {
            console.error('Error loading schedules:', result.message);
            showAlert('Error loading schedules: ' + result.message, 'error');
            // Try loading all schedules as fallback
            await loadAllSchedules();
        }
        
    } catch (error) {
        console.error('Error loading today\'s schedules:', error);
        console.log('Trying to load all schedules as fallback...');
        await loadAllSchedules();
    }
}

// Load all schedules (fallback when no today's schedules)
async function loadAllSchedules() {
    try {
        console.log('Loading all schedules...');
        
        const url = `${TODAY_SCHEDULES_API}`;
        console.log('Fetching all schedules from URL:', url);
        
        const response = await fetch(url);
        console.log('All schedules response status:', response.status);
        
        const result = await response.json();
        console.log('All schedules API Response:', result);
        
        if (result.success) {
            todaySchedules = result.data || [];
            filteredSchedules = [...todaySchedules];
            
            console.log('Loaded all schedules:', todaySchedules.length);
            console.log('All schedules data:', todaySchedules);
            
            // Update statistics
            updateStatistics();
            
            // Render schedules
            renderSchedules();
            
        } else {
            console.error('Error loading all schedules:', result.message);
            showAlert('No schedules found in the system.', 'warning');
            // Create dummy data for testing
            createDummyData();
        }
        
    } catch (error) {
        console.error('Error loading all schedules:', error);
        showAlert('Error loading schedules. Please try again.', 'error');
        // Create dummy data for testing
        createDummyData();
    }
}

// Create dummy data for testing
function createDummyData() {
    console.log('Creating dummy data for testing...');
    
    todaySchedules = [
        {
            _id: 'dummy1',
            physicianId: 'physician1',
            physicianName: 'Dr. John Smith',
            speciality: 'Cardiology',
            degree: 'MD',
            clinicTimeFrom: '09:00',
            clinicTimeTo: '17:00',
            day: 'Monday',
            date: new Date().toISOString().split('T')[0],
            clinicName: 'Main Clinic',
            location: 'Building A, Floor 2',
            isActive: true
        },
        {
            _id: 'dummy2',
            physicianId: 'physician2',
            physicianName: 'Dr. Sarah Johnson',
            speciality: 'Pediatrics',
            degree: 'MD',
            clinicTimeFrom: '08:00',
            clinicTimeTo: '16:00',
            day: 'Monday',
            date: new Date().toISOString().split('T')[0],
            clinicName: 'Children\'s Clinic',
            location: 'Building B, Floor 1',
            isActive: true
        },
        {
            _id: 'dummy3',
            physicianId: 'physician3',
            physicianName: 'Dr. Michael Brown',
            speciality: 'Orthopedics',
            degree: 'MD',
            clinicTimeFrom: '10:00',
            clinicTimeTo: '18:00',
            day: 'Monday',
            date: new Date().toISOString().split('T')[0],
            clinicName: 'Sports Medicine Clinic',
            location: 'Building C, Floor 3',
            isActive: true
        }
    ];
    
    filteredSchedules = [...todaySchedules];
    
    console.log('Created dummy data:', todaySchedules.length, 'schedules');
    
    // Update statistics
    updateStatistics();
    
    // Render schedules
    renderSchedules();
    
    showAlert('Using dummy data for demonstration. Please check your API connection.', 'warning');
}

// Show loading state
function showLoadingState() {
    if (schedulesTableBody) {
        schedulesTableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #6c757d;"></i>
                    <p style="margin-top: 10px; color: #6c757d;">Loading schedules...</p>
                </td>
            </tr>
        `;
    }
}

// Update statistics
function updateStatistics() {
    const totalPhysicians = document.getElementById('totalPhysicians');
    const activeSchedules = document.getElementById('activeSchedules');
    const todaySchedulesCount = document.getElementById('todaySchedules');
    const printableTickets = document.getElementById('printableTickets');
    
    if (totalPhysicians) {
        const uniquePhysicians = new Set(todaySchedules.map(s => s.physicianId)).size;
        totalPhysicians.textContent = uniquePhysicians;
    }
    
    if (activeSchedules) {
        const activeCount = todaySchedules.filter(s => s.isActive).length;
        activeSchedules.textContent = activeCount;
    }
    
    if (todaySchedulesCount) {
        todaySchedulesCount.textContent = todaySchedules.length;
    }
    
    if (printableTickets) {
        const printableCount = todaySchedules.filter(schedule => isSchedulePrintable(schedule)).length;
        printableTickets.textContent = printableCount;
    }
}

// Render schedules table
function renderSchedules() {
    try {
        if (!schedulesTableBody) {
            console.error('schedulesTableBody not found');
            return;
        }
        
        if (filteredSchedules.length === 0) {
            schedulesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">
                        <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <p>No schedules found matching your criteria.</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        schedulesTableBody.innerHTML = filteredSchedules.map(schedule => `
            <tr>
                <td>
                    <div class="physician-info">
                        <div class="physician-name">${schedule.physicianName || 'Unknown'}</div>
                    </div>
                </td>
                <td>
                    <div class="specialty-info">
                        <div class="specialty">${schedule.speciality || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <div class="degree-info">
                        <div class="degree">${schedule.degree || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <div class="time-info">
                        <div class="time-range">
                            <i class="fas fa-clock"></i>
                            ${formatTimeTo12Hour(schedule.clinicTimeFrom || schedule.startTime || 'N/A')} - ${formatTimeTo12Hour(schedule.clinicTimeTo || schedule.endTime || 'N/A')}
                        </div>
                    </div>
                </td>
                <td>
                    <div class="clinic-info">
                        <div class="clinic-name">${schedule.clinicName || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <div class="location-info">
                        <div class="location">${schedule.location || 'N/A'}</div>
                    </div>
                </td>
                <td>
                    <div class="action-buttons" style="display: flex; flex-direction: row; gap: 8px; align-items: center; flex-wrap: wrap;">
                        ${isSchedulePrintable(schedule) ? 
                            `<button class="btn btn-primary btn-sm print-ticket-btn" data-schedule-id="${schedule._id}" 
                                    style="background: #6f42c1; border: none; color: white; font-weight: 600; padding: 8px 16px; border-radius: 6px; white-space: nowrap;">
                                <i class="fas fa-print"></i> Print Ticket
                            </button>` :
                            `<div class="tooltip-wrapper" style="position: relative; display: inline-block;" 
                                    title="Cannot print after ${printMinutesAfterClinicEnd} minutes past clinic end">
                                <button class="btn btn-secondary btn-sm" disabled 
                                        style="background: #6c757d; border: none; color: white; font-weight: 600; padding: 8px 16px; border-radius: 6px; opacity: 0.6; white-space: nowrap;">
                                    <i class="fas fa-clock"></i> Time Expired
                                </button>
                            </div>`
                        }
                        <button class="btn btn-info btn-sm schedule-stats-btn" data-schedule-id="${schedule._id}" 
                                style="background: #17a2b8; border: none; color: white; font-weight: 600; padding: 8px 12px; border-radius: 6px; font-size: 0.85rem; white-space: nowrap;">
                            <i class="fas fa-chart-bar"></i> Stats
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
        // Add event listeners to the print ticket buttons
        addPrintTicketEventListeners();
        
        // Add event listeners to the schedule stats buttons
        addScheduleStatsEventListeners();
        
        // Add tooltip functionality
        setTimeout(() => {
            addTooltipFunctionality();
        }, 100);
        
    } catch (error) {
        console.error('Error rendering schedules:', error);
        if (schedulesTableBody) {
            schedulesTableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: #dc3545;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                        <p>Error rendering schedules. Please refresh the page.</p>
                    </td>
                </tr>
            `;
        }
    }
}

// Load print configuration
async function loadPrintConfiguration() {
    try {
        console.log('Loading print configuration...');
        
        const response = await fetch(`${CONFIGURATION_API}/print_minutes_after_clinic_end`);
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                const newValue = result.data.value || 10;
                if (newValue !== printMinutesAfterClinicEnd) {
                    printMinutesAfterClinicEnd = newValue;
                    console.log('Updated print configuration - Minutes after clinic end:', printMinutesAfterClinicEnd);
                    
                    // Re-render schedules to update visual indicators
                    if (todaySchedules.length > 0) {
                        renderSchedules();
                        updateStatistics();
                    }
                } else {
                    console.log('Print configuration unchanged - Minutes after clinic end:', printMinutesAfterClinicEnd);
                }
            }
        } else {
            console.warn('Failed to load print configuration, using default value:', printMinutesAfterClinicEnd);
        }
        
    } catch (error) {
        console.error('Error loading print configuration:', error);
        console.log('Using default value:', printMinutesAfterClinicEnd);
    }
}

// Load filter options
async function loadFilterOptions() {
    try {
        // Load specialties
        const specialties = [...new Set(todaySchedules.map(s => s.speciality).filter(Boolean))];
        specialtyFilter.innerHTML = '<option value="">All Specialties</option>' + 
            specialties.map(s => `<option value="${s}">${s}</option>`).join('');
        
        // Load clinics
        const clinics = [...new Set(todaySchedules.map(s => s.clinicName).filter(Boolean))];
        clinicFilter.innerHTML = '<option value="">All Clinics</option>' + 
            clinics.map(c => `<option value="${c}">${c}</option>`).join('');
        
        // Load locations
        const locations = [...new Set(todaySchedules.map(s => s.location).filter(Boolean))];
        locationFilter.innerHTML = '<option value="">All Locations</option>' + 
            locations.map(l => `<option value="${l}">${l}</option>`).join('');
        
    } catch (error) {
        console.error('Error loading filter options:', error);
    }
}

// Handle search
function handleSearch() {
    applyFilters();
}

// Apply filters
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedSpecialty = specialtyFilter.value;
    const selectedClinic = clinicFilter.value;
    const selectedLocation = locationFilter.value;
    
    filteredSchedules = todaySchedules.filter(schedule => {
        const matchesSearch = !searchTerm || 
            (schedule.physicianName && schedule.physicianName.toLowerCase().includes(searchTerm)) ||
            (schedule.speciality && schedule.speciality.toLowerCase().includes(searchTerm)) ||
            (schedule.degree && schedule.degree.toLowerCase().includes(searchTerm));
        
        const matchesSpecialty = !selectedSpecialty || schedule.speciality === selectedSpecialty;
        const matchesClinic = !selectedClinic || schedule.clinicName === selectedClinic;
        const matchesLocation = !selectedLocation || schedule.location === selectedLocation;
        
        return matchesSearch && matchesSpecialty && matchesClinic && matchesLocation;
    });
    
    renderSchedules();
}

// Clear filters
function clearFilters() {
    searchInput.value = '';
    specialtyFilter.value = '';
    clinicFilter.value = '';
    locationFilter.value = '';
    
    filteredSchedules = [...todaySchedules];
    renderSchedules();
}

// Open ticket type modal
function openTicketTypeModal(scheduleId) {
    const schedule = todaySchedules.find(s => s._id === scheduleId);
    if (!schedule) {
        showAlert('Schedule not found', 'error');
        return;
    }
    
    // Check if schedule is printable
    if (!isSchedulePrintable(schedule)) {
        const currentTime = new Date().toLocaleTimeString('en-US', { 
            hour12: false, 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const clinicEndTime = schedule.clinicTimeTo || 'Unknown';
        const errorMessage = `⚠️ Cannot print tickets for this schedule.\n\n📅 Clinic End Time: ${clinicEndTime}\n🕐 Current Time: ${currentTime}\n\nTicket printing is only allowed within ${printMinutesAfterClinicEnd} minutes after clinic ends.`;
        
        if (window.alertSystem) {
            window.alertSystem.error(errorMessage, 8000);
        } else if (window.showNotification) {
            window.showNotification(errorMessage, 'error');
        } else {
            alert(errorMessage);
        }
        return;
    }
    
    selectedScheduleForTicket = schedule;
    
    // Update modal content
    const scheduleInfo = document.getElementById('scheduleInfo');
    if (scheduleInfo) {
        scheduleInfo.textContent = `${schedule.physicianName} - ${schedule.clinicName}`;
    }
    
    // Reset form
    document.getElementById('ticketTypeSelect').value = 'Examination';
    document.getElementById('patientCode').value = '';
    document.getElementById('ticketNotes').value = '';
    
    // Show modal
    ticketTypeModal.style.display = 'block';
}

// Close ticket type modal
function closeTicketTypeModalHandler() {
    ticketTypeModal.style.display = 'none';
    selectedScheduleForTicket = null;
    
    // Close any open print windows
    closePrintWindows();
}

// Handle print ticket
async function handlePrintTicket() {
    if (!selectedScheduleForTicket) {
        showAlert('No schedule selected', 'error');
        return;
    }
    
    const ticketType = document.getElementById('ticketTypeSelect').value;
    const patientCode = document.getElementById('patientCode').value.trim();
    const notes = document.getElementById('ticketNotes').value;
    
    if (!ticketType) {
        showAlert('Please select a ticket type', 'warning');
        return;
    }
    
    try {
        // Show loading
        showAlert('Creating ticket and preparing for print...', 'info');
        
        // Create ticket in database
        const ticketData = {
            scheduleId: selectedScheduleForTicket.scheduleId || selectedScheduleForTicket._id,
            ticketType: ticketType,
            patientCode: patientCode || null,
            notes: notes || null,
            clinicCode: selectedScheduleForTicket.clinicCode || null
        };
        
        console.log('Creating ticket with data:', ticketData);
        console.log('Selected schedule:', selectedScheduleForTicket);
        
        const response = await fetch(TICKETS_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(ticketData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.message || 'Failed to create ticket');
        }
        
        // Get the created ticket with sequence number
        const ticket = result.data;
        
        // Create ticket content with formatted ticket number, ticket type, and patient code
        const ticketContent = createTicketContent(selectedScheduleForTicket, ticket.formattedTicketNumber || ticket.sequenceNumber, ticket.ticketType, patientCode);
    
        // Open print window
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(ticketContent);
        printWindow.document.close();
        
        // Track the print window
        openPrintWindows.push(printWindow);
        
        // Focus and print
        printWindow.focus();
        printWindow.print();
        
        // Close the print window after a delay (longer to allow for print dialog)
        setTimeout(() => {
            closePrintWindow(printWindow);
        }, 3000);
        
        // Close modal
        closeTicketTypeModalHandler();
        
        // Show success message
        showAlert('Ticket printed successfully! Print window will close automatically.', 'success');
        
    } catch (error) {
        console.error('Error creating ticket:', error);
        
        // Extract the specific error message from the API response
        let errorMessage = 'Error creating ticket. Please try again.';
        
        if (error.message) {
            if (error.message.includes('Tickets cannot be printed more than') && error.message.includes('minutes after clinic end time')) {
                const schedule = selectedScheduleForTicket;
                const currentTime = new Date().toLocaleTimeString('en-US', { 
                    hour12: false, 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                const clinicEndTime = schedule?.clinicTimeTo || 'Unknown';
                errorMessage = `⚠️ Ticket printing is not allowed more than ${printMinutesAfterClinicEnd} minutes after clinic end time.\n\n📅 Clinic End Time: ${clinicEndTime}\n🕐 Current Time: ${currentTime}\n\nPlease try again during clinic hours or within ${printMinutesAfterClinicEnd} minutes after clinic ends.`;
            } else if (error.message.includes('Schedule not found')) {
                errorMessage = '❌ Schedule not found. Please refresh the page and try again.';
            } else if (error.message.includes('Invalid schedule')) {
                errorMessage = '❌ Invalid schedule data. Please contact the administrator.';
            } else {
                errorMessage = `❌ ${error.message}`;
            }
        }
        
        // Use modern alert system
        if (window.alertSystem) {
            window.alertSystem.error(errorMessage, 8000);
        } else if (window.showNotification) {
            window.showNotification(errorMessage, 'error');
        } else {
            // Fallback to basic alert
            alert(errorMessage);
        }
    }
}


// Format 24h time (HH:mm) to 12-hour with AM/PM; pass through if already formatted or invalid
function formatTimeTo12Hour(timeString) {
    try {
        if (!timeString || typeof timeString !== 'string') return timeString || '';
        if (timeString.includes('AM') || timeString.includes('PM')) return timeString; // already formatted
        const [hStr, mStr] = timeString.split(':');
        const hours = parseInt(hStr, 10);
        const minutes = parseInt(mStr, 10);
        if (isNaN(hours) || isNaN(minutes)) return timeString;
        let period = 'AM';
        let displayHour = hours;
        if (hours === 0) displayHour = 12;
        else if (hours === 12) period = 'PM';
        else if (hours > 12) { displayHour = hours - 12; period = 'PM'; }
        const mm = String(minutes).padStart(2, '0');
        return `${displayHour}:${mm} ${period}`;
    } catch { return timeString || ''; }
}

// Create ticket content for printing
function createTicketContent(schedule, sequenceNumber = null, ticketType = null, patientCode = null) {
    const specialtyName = (schedule && (schedule.speciality || schedule.specialty || schedule.specialityName)) || 'Unknown Specialty';
    const degreeName = (schedule && (schedule.degreeName || schedule.degree)) || 'Unknown Degree';
    const physicianName = (schedule && (schedule.physicianName || (schedule.physician && (schedule.physician.name || schedule.physician.fullName)))) || 'Unknown Physician';
    const clinicName = (schedule && (schedule.clinicName || schedule.clinic)) || 'Unknown Clinic';
    const locationName = (schedule && (schedule.locationName || schedule.location)) || 'Unknown Location';
    
    // Use provided sequence number or generate a random one
    const queueNumber = sequenceNumber || Math.floor(Math.random() * 900) + 100;
    
    const today = new Date();
    
    return `
        <html>
        <head>
            <title>Patient Ticket - ${physicianName}</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@300;400;700;800&display=swap');
                body {
                    font-family: 'Almarai', Arial, sans-serif;
                    margin: 0;
                    padding: 10px;
                    background-color: white;
                    width: 100%;
                    height: 100vh;
                }
                .ticket {
                    background: white;
                    width: 100%;
                    height: 100vh;
                    padding: 15px;
                    box-sizing: border-box;
                }
                .logo {
                    text-align: center;
                    margin-bottom: 15px;
                }
                .logo img {
                    max-width: 80px;
                    max-height: 80px;
                    object-fit: contain;
                }
                .hospital-name {
                    font-size: 16px;
                    font-weight: bold;
                    color: #007bff;
                    text-align: center;
                    margin: 10px 0;
                    position: relative;
                }
                .hospital-name::before,
                .hospital-name::after {
                    content: '';
                    position: absolute;
                    top: 50%;
                    width: 25px;
                    height: 2px;
                    background: #007bff;
                }
                .hospital-name::before {
                    left: -30px;
                }
                .hospital-name::after {
                    right: -30px;
                }
                .queue-number {
                    text-align: center;
                    margin: 20px 0;
                }
                .queue-number .number {
                    font-size: 36px;
                    font-weight: bold;
                    color: #333;
                    border: 2px dashed #999;
                    padding: 15px;
                    display: inline-block;
                    border-radius: 6px;
                }
                .appointment-time {
                    text-align: center;
                    font-size: 14px;
                    color: #333;
                    margin: 15px 0;
                }
                .details {
                    display: flex;
                    justify-content: space-between;
                    margin: 15px 0;
                }
                .details-left, .details-right {
                    flex: 1;
                }
                .detail-label {
                    font-size: 11px;
                    color: #666;
                    margin-bottom: 3px;
                }
                .detail-value {
                    font-size: 14px;
                    font-weight: bold;
                    color: #333;
                }
                .footer-line {
                    border-top: 1px dashed #999;
                    margin: 15px 0;
                }
                .footer-text {
                    text-align: center;
                    font-size: 10px;
                    color: #333;
                    margin: 8px 0;
                }
                .print-time {
                    font-size: 10px;
                    color: #666;
                    text-align: left;
                }
                .close-btn {
                    position: fixed;
                    top: 10px;
                    right: 10px;
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 8px 12px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                    z-index: 1000;
                }
                .close-btn:hover {
                    background: #c82333;
                }
                .close-btn:active {
                    background: #a71e2a;
                }
                .info-message {
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    background: #e3f2fd;
                    color: #1976d2;
                    padding: 8px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 1000;
                }
                @media print {
                    body { margin: 0; padding: 0; }
                    .ticket { border: none; box-shadow: none; }
                    .close-btn { display: none; }
                    .info-message { display: none; }
                }
            </style>
        </head>
        <body>
        <button class="close-btn" onclick="window.close()">Close</button>
        <div class="info-message">
            <i class="fas fa-info-circle"></i> This window will close automatically in a few seconds
        </div>
        <div class="ticket">
                <div class="logo">
                    <img src="/logo.png" alt="Hospital Logo">
            </div>
            <div class="hospital-name">Queue Management System</div>
                        <div class="queue-number">
                            <div class="number">${queueNumber}</div>
            </div>
                
                <div class="appointment-time">
                    ${ticketType ? `<strong>Ticket Type: ${ticketType}</strong>` : ''}
            </div>
                
                <div class="details">
                    <div class="details-left">
                        <div class="detail-label">Doctor Name :</div>
                        <div class="detail-value">${physicianName}</div>
                        <div class="detail-label">Speciality</div>
                        <div class="detail-value">${specialtyName}</div>
                        <div class="detail-label">Degree</div>
                        <div class="detail-value">${degreeName}</div>
                                ${patientCode ? `
                                <div class="detail-label">Patient Code</div>
                                <div class="detail-value">${patientCode}</div>
                                ` : ''}
            </div>
                    <div class="details-right">
                        <div class="detail-label">Floor</div>
                        <div class="detail-value">${locationName}</div>
                        <div class="detail-label">Clinic No</div>
                        <div class="detail-value">${clinicName}</div>
                        <div class="detail-label">Working Hours</div>
                        <div class="detail-value">${formatTimeTo12Hour(schedule.clinicTimeFrom || schedule.startTime || 'N/A')} - ${formatTimeTo12Hour(schedule.clinicTimeTo || schedule.endTime || 'N/A')}</div>
        </div>
                </div>
                
                <div class="footer-line"></div>
                
                <div class="footer-text">
                    يتم سحب رقم جديد فى حالة عدم تواجدكم اثناء الاستدعاء بعد مرور 5 ارقام
                </div>
                
                <div class="print-time">
                    Printing Time : ${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear()} ${today.toLocaleTimeString()}
            </div>
            </div>
        </body>
        </html>
    `;
}



// Get current user data
function getCurrentUserData() {
    try {
        const userData = localStorage.getItem('userData');
        if (userData) {
            return JSON.parse(userData);
        }
    } catch (error) {
        console.error('Error parsing user data:', error);
    }
    
    return {
        id: 'unknown',
        name: 'Unknown User',
        username: 'Unknown User'
    };
}

// Show alert
function showAlert(message, type = 'info') {
    // Check if there's a global showAlert function from another script
    if (window.showAlert && window.showAlert !== showAlert) {
        window.showAlert(message, type);
    } else if (window.alertSystem) {
        // Use modern alert system
        const duration = type === 'error' ? 7000 : type === 'warning' ? 6000 : type === 'success' ? 5000 : 4000;
        window.alertSystem.show(message, type, duration);
    } else if (window.showNotification) {
        // Use showNotification if available
        window.showNotification(message, type);
    } else {
        // Fallback to console and simple alert
        console.log(`${type.toUpperCase()}: ${message}`);
        
        // Show a simple browser alert for errors
        if (type === 'error') {
            alert(`Error: ${message}`);
        }
    }
}

// Add event listeners to print ticket buttons
function addPrintTicketEventListeners() {
    try {
        const printButtons = document.querySelectorAll('.print-ticket-btn');
        printButtons.forEach(button => {
            // Remove any existing event listeners to prevent duplicates
            button.removeEventListener('click', handlePrintButtonClick);
            button.addEventListener('click', handlePrintButtonClick);
        });
    } catch (error) {
        console.error('Error adding print ticket event listeners:', error);
    }
}

// Add event listeners to schedule stats buttons
function addScheduleStatsEventListeners() {
    try {
        const statsButtons = document.querySelectorAll('.schedule-stats-btn');
        statsButtons.forEach(button => {
            // Remove any existing event listeners to prevent duplicates
            button.removeEventListener('click', handleScheduleStatsClick);
            button.addEventListener('click', handleScheduleStatsClick);
        });
    } catch (error) {
        console.error('Error adding schedule stats event listeners:', error);
    }
}

// Add tooltip functionality
function addTooltipFunctionality() {
    try {
        // Find both buttons and tooltip wrappers
        const buttonsWithTooltips = document.querySelectorAll('button[title]');
        const wrappersWithTooltips = document.querySelectorAll('.tooltip-wrapper[title]');
        
        console.log('Found buttons with tooltips:', buttonsWithTooltips.length);
        console.log('Found tooltip wrappers:', wrappersWithTooltips.length);
        
        // Handle regular buttons
        buttonsWithTooltips.forEach((button, index) => {
            console.log(`Button ${index}:`, button.textContent, 'Title:', button.getAttribute('title'), 'Disabled:', button.disabled);
            
            // Remove existing tooltip event listeners
            button.removeEventListener('mouseenter', showTooltip);
            button.removeEventListener('mouseleave', hideTooltip);
            
            // Add tooltip event listeners for enabled buttons
            if (!button.disabled) {
                button.addEventListener('mouseenter', showTooltip);
                button.addEventListener('mouseleave', hideTooltip);
            }
        });
        
        // Handle tooltip wrappers (for disabled buttons)
        wrappersWithTooltips.forEach((wrapper, index) => {
            console.log(`Wrapper ${index}:`, wrapper.textContent, 'Title:', wrapper.getAttribute('title'));
            
            // Remove existing tooltip event listeners
            wrapper.removeEventListener('mouseenter', showTooltip);
            wrapper.removeEventListener('mouseleave', hideTooltip);
            
            // Add tooltip event listeners
            wrapper.addEventListener('mouseenter', showTooltip);
            wrapper.addEventListener('mouseleave', hideTooltip);
        });
        
        console.log('Tooltip functionality added to', buttonsWithTooltips.length, 'buttons and', wrappersWithTooltips.length, 'wrappers');
    } catch (error) {
        console.error('Error adding tooltip functionality:', error);
    }
}

// Show tooltip
function showTooltip(event) {
    console.log('showTooltip called');
    const element = event.target;
    const tooltipText = element.getAttribute('title');
    
    console.log('Element:', element.textContent, 'Tooltip text:', tooltipText);
    
    if (!tooltipText) {
        console.log('No tooltip text found');
        return;
    }
    
    // Remove existing tooltip
    hideTooltip();
    
    // Create tooltip element
    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    tooltip.textContent = tooltipText;
    tooltip.style.cssText = `
        position: fixed;
        background: #333;
        color: white;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        white-space: nowrap;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease-in-out;
        max-width: 300px;
    `;
    
    // Add red background for disabled buttons or tooltip wrappers
    if (element.disabled || element.classList.contains('tooltip-wrapper')) {
        tooltip.style.background = '#dc3545';
    }
    
    // Add to document first to get dimensions
    document.body.appendChild(tooltip);
    
    // Position tooltip
    const rect = element.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Calculate position
    const left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
    const top = rect.top - tooltipRect.height - 8;
    
    // Ensure tooltip stays within viewport
    const finalLeft = Math.max(10, Math.min(left, window.innerWidth - tooltipRect.width - 10));
    const finalTop = Math.max(10, top);
    
    tooltip.style.left = finalLeft + 'px';
    tooltip.style.top = finalTop + 'px';
    
    // Show with animation
    setTimeout(() => {
        tooltip.style.opacity = '1';
    }, 10);
    
    // Store reference for cleanup
    element._tooltip = tooltip;
}

// Hide tooltip
function hideTooltip(event) {
    // Remove all existing tooltips
    const existingTooltips = document.querySelectorAll('.custom-tooltip');
    existingTooltips.forEach(tooltip => tooltip.remove());
    
    // Clear all button and wrapper tooltip references
    const buttons = document.querySelectorAll('button[title]');
    const wrappers = document.querySelectorAll('.tooltip-wrapper[title]');
    
    buttons.forEach(button => {
        if (button._tooltip) {
            button._tooltip = null;
        }
    });
    
    wrappers.forEach(wrapper => {
        if (wrapper._tooltip) {
            wrapper._tooltip = null;
        }
    });
}

// Handle print button click
function handlePrintButtonClick(event) {
    try {
        const scheduleId = event.currentTarget.getAttribute('data-schedule-id');
        if (scheduleId) {
            openTicketTypeModal(scheduleId);
        } else {
            console.error('No schedule ID found on button');
        }
    } catch (error) {
        console.error('Error handling print button click:', error);
    }
}

// Handle schedule stats button click
function handleScheduleStatsClick(event) {
    try {
        const scheduleId = event.currentTarget.getAttribute('data-schedule-id');
        if (scheduleId) {
            openScheduleStatisticsModal(scheduleId);
        } else {
            console.error('No schedule ID found on stats button');
        }
    } catch (error) {
        console.error('Error handling schedule stats click:', error);
    }
}

// Close a specific print window
function closePrintWindow(printWindow) {
    try {
        if (printWindow && !printWindow.closed) {
            printWindow.close();
        }
        // Remove from tracking array
        const index = openPrintWindows.indexOf(printWindow);
        if (index > -1) {
            openPrintWindows.splice(index, 1);
        }
    } catch (error) {
        console.error('Error closing print window:', error);
    }
}

// Close all open print windows
function closePrintWindows() {
    try {
        openPrintWindows.forEach(printWindow => {
            closePrintWindow(printWindow);
        });
        // Clear the array
        openPrintWindows = [];
    } catch (error) {
        console.error('Error closing print windows:', error);
    }
}

// Refresh print configuration manually
async function refreshPrintConfiguration() {
    await loadPrintConfiguration();
    showAlert('Print configuration refreshed', 'info');
}

// Check if a schedule is within printable time window
function isSchedulePrintable(schedule) {
    try {
        if (!schedule || !schedule.clinicTimeTo) {
            return true; // Allow if no end time specified
        }
        
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes
        
        // Parse clinic end time
        const [endHour, endMinute] = schedule.clinicTimeTo.split(':').map(Number);
        const clinicEndTime = endHour * 60 + endMinute; // Clinic end time in minutes
        
        // Check if current time is within configured minutes after clinic end
        const timeDifference = currentTime - clinicEndTime;
        return timeDifference <= printMinutesAfterClinicEnd; // Allow printing within configured minutes after clinic ends
        
    } catch (error) {
        console.error('Error checking if schedule is printable:', error);
        return true; // Allow printing if there's an error
    }
}

// Open schedule statistics modal
function openScheduleStatisticsModal(todayScheduleId) {
    const schedule = todaySchedules.find(s => s._id === todayScheduleId);
    if (!schedule) {
        showAlert('Schedule not found', 'error');
        return;
    }
    
    // Update modal title and schedule info
    document.getElementById('scheduleName').textContent = schedule.physicianName || 'Unknown Physician';
    document.getElementById('scheduleDetails').textContent = 
        `${schedule.speciality || 'Unknown Specialty'} - ${schedule.clinicName || 'Unknown Clinic'} (${formatTimeTo12Hour(schedule.clinicTimeFrom || schedule.startTime || 'N/A')} - ${formatTimeTo12Hour(schedule.clinicTimeTo || schedule.endTime || 'N/A')})`;
    
    // Show modal
    document.getElementById('scheduleStatisticsModal').style.display = 'block';
    
    // Get the actual PhysicianSchedule ID (not TodayPhysicianSchedule ID)
    // Tickets are linked to PhysicianSchedule._id, not TodayPhysicianSchedule._id
    let actualScheduleId = null;
    
    // Check if scheduleId exists and extract the ID properly
    if (schedule.scheduleId) {
        // If scheduleId is populated (object with _id), extract _id
        if (typeof schedule.scheduleId === 'object' && schedule.scheduleId._id) {
            actualScheduleId = schedule.scheduleId._id;
        } else if (typeof schedule.scheduleId === 'object' && schedule.scheduleId.toString) {
            // If it's a Mongoose ObjectId, convert to string
            actualScheduleId = schedule.scheduleId.toString();
        } else {
            // Already a string or primitive
            actualScheduleId = schedule.scheduleId;
        }
    } else {
        // Fallback to _id if scheduleId doesn't exist
        actualScheduleId = schedule._id;
    }
    
    // Convert to string and validate
    actualScheduleId = actualScheduleId ? String(actualScheduleId) : null;
    
    console.log('Opening statistics modal:', {
        todayScheduleId: todayScheduleId,
        scheduleId: schedule.scheduleId,
        scheduleIdType: typeof schedule.scheduleId,
        scheduleIdIsObject: schedule.scheduleId instanceof Object,
        actualScheduleId: actualScheduleId,
        schedule: schedule
    });
    
    if (!actualScheduleId) {
        console.error('Cannot determine actual schedule ID');
        showAlert('Cannot determine schedule ID for statistics', 'error');
        return;
    }
    
    // Load statistics for this specific schedule using PhysicianSchedule ID
    loadScheduleStatistics(actualScheduleId);
}

// Close schedule statistics modal
function closeScheduleStatisticsModalHandler() {
    document.getElementById('scheduleStatisticsModal').style.display = 'none';
}

// Refresh schedule statistics
async function refreshScheduleStatistics() {
    const modal = document.getElementById('scheduleStatisticsModal');
    if (!modal) {
        showAlert('Statistics modal not found', 'error');
        return;
    }
    
    const scheduleId = modal.getAttribute('data-current-schedule-id');
    if (scheduleId) {
        console.log('Refreshing statistics for schedule:', scheduleId);
        await loadScheduleStatistics(scheduleId);
        showAlert('Schedule statistics refreshed', 'success');
    } else {
        console.error('No schedule ID found for refresh');
        showAlert('Schedule ID not found', 'error');
    }
}

// Load statistics for a specific schedule
async function loadScheduleStatistics(scheduleId) {
    try {
        console.log('Loading statistics for schedule:', scheduleId);
        
        if (!scheduleId) {
            console.error('Schedule ID is missing!');
            showAlert('Schedule ID is missing', 'error');
            return;
        }
        
        const modal = document.getElementById('scheduleStatisticsModal');
        if (!modal) {
            console.error('Schedule statistics modal not found!');
            showAlert('Statistics modal not found', 'error');
            return;
        }
        
        // Store current schedule ID for refresh functionality
        modal.setAttribute('data-current-schedule-id', scheduleId);
        
        // Show loading state
        showScheduleStatisticsLoading();
        
        // Get today's date
        const today = new Date().toISOString().split('T')[0];
        
        // Ensure scheduleId is a string
        const scheduleIdStr = String(scheduleId);
        
        // Validate scheduleId format
        if (!scheduleIdStr || scheduleIdStr === 'null' || scheduleIdStr === 'undefined' || scheduleIdStr.includes('[object')) {
            console.error('Invalid scheduleId:', scheduleIdStr);
            showAlert('Invalid schedule ID. Cannot load statistics.', 'error');
            return;
        }
        
        const apiUrl = `${TICKETS_API}/schedule/${scheduleIdStr}?date=${today}`;
        console.log('Fetching tickets from:', apiUrl);
        console.log('Schedule ID (string):', scheduleIdStr);
        console.log('Schedule ID (original):', scheduleId);
        console.log('Schedule ID type:', typeof scheduleId);
        
        // Load ticket statistics for this specific schedule
        const response = await fetch(apiUrl);
        
        console.log('Response status:', response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('HTTP error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        console.log('API Response:', result);
        
        if (result.success) {
            const tickets = result.data || [];
            
            console.log('Tickets received:', tickets.length, tickets);
            
            // Calculate statistics
            // Status values: 'waiting', 'called', 'in_progress', 'completed', 'cancelled'
            const totalTickets = tickets.length;
            const printedTickets = tickets.filter(t => t.status === 'completed').length; // Completed = served
            const pendingTickets = tickets.filter(t => 
                t.status === 'waiting' || 
                t.status === 'called' || 
                t.status === 'in_progress'
            ).length; // Waiting, called, or in progress
            const cancelledTickets = tickets.filter(t => t.status === 'cancelled').length;
            
            console.log('Calculated Statistics:', {
                totalTickets,
                printedTickets,
                pendingTickets,
                cancelledTickets,
                ticketsByStatus: {
                    waiting: tickets.filter(t => t.status === 'waiting').length,
                    called: tickets.filter(t => t.status === 'called').length,
                    in_progress: tickets.filter(t => t.status === 'in_progress').length,
                    completed: tickets.filter(t => t.status === 'completed').length,
                    cancelled: tickets.filter(t => t.status === 'cancelled').length
                }
            });
            
            // Group by ticket type
            const ticketTypeBreakdown = {};
            tickets.forEach(ticket => {
                const type = ticket.ticketType || 'Unknown';
                ticketTypeBreakdown[type] = (ticketTypeBreakdown[type] || 0) + 1;
            });
            
            console.log('Ticket Type Breakdown:', ticketTypeBreakdown);
            
            // Get recent tickets (last 10) - sort by printedAt descending
            const recentTickets = tickets
                .filter(t => t.printedAt) // Only tickets with printedAt
                .sort((a, b) => {
                    const dateA = new Date(a.printedAt);
                    const dateB = new Date(b.printedAt);
                    return dateB - dateA; // Descending order (newest first)
                })
                .slice(0, 10);
            
            console.log('Recent Tickets:', recentTickets.length, recentTickets);
            
            // Prepare statistics object
            const stats = {
                totalTickets,
                printedTickets,
                pendingTickets,
                cancelledTickets,
                ticketTypeBreakdown,
                recentTickets
            };
            
            console.log('Displaying statistics:', stats);
            
            // Display statistics
            displayScheduleStatistics(stats);
            
        } else {
            console.error('API returned success: false', result);
            throw new Error(result.message || 'Failed to load schedule statistics');
        }
        
    } catch (error) {
        console.error('Error loading schedule statistics:', error);
        showAlert(`Error loading schedule statistics: ${error.message}`, 'error');
        
        // Show empty state
        displayScheduleStatistics({
            totalTickets: 0,
            printedTickets: 0,
            pendingTickets: 0,
            cancelledTickets: 0,
            ticketTypeBreakdown: {},
            recentTickets: []
        });
    }
}

// Show loading state for schedule statistics
function showScheduleStatisticsLoading() {
    const elements = [
        'scheduleTotalTickets', 'schedulePrintedTickets', 'schedulePendingTickets', 'scheduleCancelledTickets'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = '...';
        }
    });
    
    const breakdown = document.getElementById('scheduleTicketTypeBreakdown');
    if (breakdown) {
        breakdown.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Loading...</div>';
    }
    
    const recentTickets = document.getElementById('scheduleRecentTickets');
    if (recentTickets) {
        recentTickets.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">Loading...</div>';
    }
}

// Display schedule statistics
function displayScheduleStatistics(stats) {
    console.log('Displaying schedule statistics:', stats);
    
    // Update summary statistics
    const totalEl = document.getElementById('scheduleTotalTickets');
    const printedEl = document.getElementById('schedulePrintedTickets');
    const pendingEl = document.getElementById('schedulePendingTickets');
    const cancelledEl = document.getElementById('scheduleCancelledTickets');
    
    if (!totalEl || !printedEl || !pendingEl || !cancelledEl) {
        console.error('Statistics display elements not found!', {
            totalEl: !!totalEl,
            printedEl: !!printedEl,
            pendingEl: !!pendingEl,
            cancelledEl: !!cancelledEl
        });
        return;
    }
    
    totalEl.textContent = stats.totalTickets || 0;
    printedEl.textContent = stats.printedTickets || 0;
    pendingEl.textContent = stats.pendingTickets || 0;
    cancelledEl.textContent = stats.cancelledTickets || 0;
    
    console.log('Updated summary statistics:', {
        total: totalEl.textContent,
        printed: printedEl.textContent,
        pending: pendingEl.textContent,
        cancelled: cancelledEl.textContent
    });
    
    // Display ticket type breakdown
    const ticketTypeBreakdown = document.getElementById('scheduleTicketTypeBreakdown');
    if (ticketTypeBreakdown) {
        const types = Object.keys(stats.ticketTypeBreakdown);
        if (types.length > 0) {
            ticketTypeBreakdown.innerHTML = types.map(type => `
                <div style="background: white; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #ddd;">
                    <div style="font-size: 1.2rem; font-weight: bold; color: #333; margin-bottom: 4px;">
                        ${stats.ticketTypeBreakdown[type]}
                    </div>
                    <div style="color: #666; font-size: 0.8rem;">${type}</div>
                </div>
            `).join('');
        } else {
            ticketTypeBreakdown.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No tickets found for this schedule</div>';
        }
    }
    
    // Display recent tickets
    const recentTickets = document.getElementById('scheduleRecentTickets');
    if (recentTickets) {
        if (stats.recentTickets.length > 0) {
            recentTickets.innerHTML = stats.recentTickets.map(ticket => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;">
                    <div>
                        <div style="font-weight: bold; color: #333;">${ticket.ticketType || 'Unknown'}</div>
                        <div style="font-size: 0.8rem; color: #666;">${ticket.patientCode ? `Patient: ${ticket.patientCode}` : 'No patient code'}</div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; color: #666;">
                            ${new Date(ticket.printedAt).toLocaleTimeString()}
                        </div>
                        <div style="font-size: 0.8rem; color: ${ticket.status === 'completed' ? '#28a745' : (ticket.status === 'waiting' || ticket.status === 'called' || ticket.status === 'in_progress') ? '#ffc107' : ticket.status === 'cancelled' ? '#dc3545' : '#6c757d'};">
                            ${(ticket.status || 'Unknown').charAt(0).toUpperCase() + (ticket.status || 'Unknown').slice(1).replace('_', ' ')}
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            recentTickets.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No recent tickets for this schedule</div>';
        }
    }
}
