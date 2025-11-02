// Online Follow-up System
// Follow the last in_progress ticket for selected physician today

// Global variables
let refreshInterval = null;
let currentPhysicianId = null;
let currentPhysicianName = null;

// API endpoints
const TODAY_SCHEDULES_API = `${API_BASE_URL}/today-physician-schedules`;
const TICKETS_API = `${API_BASE_URL}/tickets`;
const PHYSICIAN_API = `${API_BASE_URL}/physician-dashboard`;
const DOCTORS_API = `${API_BASE_URL}/doctors`;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Online Follow-up System initialized');
    
    // Setup physician selection
    setupPhysicianSelection();
    
    // Setup selection change handler
    const physicianSelect = document.getElementById('physicianSelect');
    if (physicianSelect) {
        physicianSelect.addEventListener('change', handlePhysicianSelection);
    }
    
    // Auto-refresh data every 5 seconds if physician is selected
    refreshInterval = setInterval(() => {
        if (currentPhysicianId) {
            loadPhysicianData();
        }
    }, 5000);
});

// Setup physician selection dropdown
async function setupPhysicianSelection() {
    try {
        // Load physicians for today's schedules
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`${TODAY_SCHEDULES_API}?date=${today}&isActive=true`);
        const result = await response.json();
        
        const physicianSelect = document.getElementById('physicianSelect');
        if (!physicianSelect) return;
        
        if (result.success && result.data) {
            // Get unique physicians from schedules
            const physicians = new Map();
            
            result.data.forEach(schedule => {
                let physicianId = schedule.physicianId || schedule.physician?._id || schedule.physician?.id;
                
                // Convert to string - handle all possible formats
                if (!physicianId) return;
                
                // If it's an object, extract the ID
                if (typeof physicianId === 'object') {
                    if (physicianId._id) {
                        physicianId = String(physicianId._id);
                    } else if (physicianId.id) {
                        physicianId = String(physicianId.id);
                    } else if (physicianId.toString) {
                        physicianId = String(physicianId.toString());
                    } else {
                        physicianId = String(physicianId);
                    }
                } else {
                    physicianId = String(physicianId);
                }
                
                const physicianName = schedule.physicianName || schedule.physician?.name || 'Unknown';
                
                // Use string ID as key
                const idKey = String(physicianId);
                if (idKey && idKey !== 'undefined' && idKey !== 'null' && !physicians.has(idKey)) {
                    physicians.set(idKey, {
                        id: idKey,
                        name: physicianName
                    });
                }
            });
            
            // Add physicians to dropdown
            Array.from(physicians.values()).forEach(physician => {
                const option = document.createElement('option');
                // Ensure value is always a string
                option.value = String(physician.id);
                option.textContent = physician.name;
                physicianSelect.appendChild(option);
            });
            
            // Also try to load from doctors API as fallback
            if (physicians.size === 0) {
                await loadDoctorsFromAPI(physicianSelect);
            }
        } else {
            await loadDoctorsFromAPI(physicianSelect);
        }
    } catch (error) {
        console.error('Error loading physicians:', error);
        await loadDoctorsFromAPI(document.getElementById('physicianSelect'));
    }
}

// Load doctors from doctors API
async function loadDoctorsFromAPI(physicianSelect) {
    try {
        const response = await fetch(DOCTORS_API);
        const result = await response.json();
        
        if (result.success && result.data) {
            result.data.forEach(doctor => {
                const option = document.createElement('option');
                // Ensure ID is always a string
                let doctorId = doctor._id || doctor.id;
                if (typeof doctorId === 'object') {
                    doctorId = String(doctorId._id || doctorId.id || doctorId);
                } else {
                    doctorId = String(doctorId);
                }
                option.value = doctorId;
                option.textContent = doctor.name || `${doctor.arName || ''} ${doctor.enName || ''}`.trim();
                physicianSelect.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading doctors from API:', error);
    }
}

// Handle physician selection
function handlePhysicianSelection(event) {
    let physicianId = event.target.value;
    const physicianName = event.target.options[event.target.selectedIndex].textContent;
    
    console.log('Selected physicianId (raw):', physicianId, typeof physicianId);
    
    if (!physicianId || physicianId === 'null' || physicianId === 'undefined') {
        hideDisplay();
        return;
    }
    
    // Force conversion to string - handle all cases
    if (typeof physicianId === 'object') {
        if (physicianId._id) {
            physicianId = String(physicianId._id);
        } else if (physicianId.id) {
            physicianId = String(physicianId.id);
        } else if (physicianId.toString) {
            physicianId = String(physicianId.toString());
        } else {
            physicianId = String(physicianId);
        }
    } else {
        physicianId = String(physicianId);
    }
    
    console.log('Selected physicianId (converted):', physicianId, typeof physicianId);
    
    currentPhysicianId = physicianId;
    currentPhysicianName = physicianName;
    
    // Show display card
    const displayCard = document.getElementById('displayCard');
    if (displayCard) {
        displayCard.style.display = 'flex';
    }
    
    // Load physician data
    loadPhysicianData();
}

// Load physician data and current ticket
async function loadPhysicianData() {
    try {
        if (!currentPhysicianId) {
            hideDisplay();
            return;
        }
        
        showLoading(true);
        
        const today = new Date().toISOString().split('T')[0];
        
        // Ensure currentPhysicianId is a string
        let physicianIdParam = currentPhysicianId;
        if (typeof physicianIdParam === 'object') {
            physicianIdParam = physicianIdParam._id || physicianIdParam.id || String(physicianIdParam);
        }
        physicianIdParam = String(physicianIdParam || '');
        
        console.log('Loading data with physicianId:', physicianIdParam);
        
        // Get physician's schedules for today
        const schedulesResponse = await fetch(`${TODAY_SCHEDULES_API}?date=${today}&physicianId=${encodeURIComponent(physicianIdParam)}&isActive=true`);
        const schedulesResult = await schedulesResponse.json();
        
        let schedule = null;
        
        if (schedulesResult.success && schedulesResult.data && schedulesResult.data.length > 0) {
            // Get the first active schedule
            schedule = schedulesResult.data[0];
            
            // Display physician information
            displayPhysicianInfo(schedule);
        } else {
            // If no schedule found, still display physician name
            displayPhysicianInfo({
                physicianName: currentPhysicianName,
                speciality: '--',
                degree: '--',
                clinicName: '--',
                clinicTimeFrom: '--',
                clinicTimeTo: '--'
            });
        }
        
        // Load current in_progress ticket
        await loadCurrentInProgressTicket();
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading physician data:', error);
        showLoading(false);
    }
}

// Display physician information
function displayPhysicianInfo(schedule) {
    // Clinic name
    const clinicNameEl = document.getElementById('clinicName');
    if (clinicNameEl) {
        clinicNameEl.textContent = schedule.clinicName || schedule.clinic?.name || '--';
    }
    
    // Speciality
    const clinicTypeEl = document.getElementById('clinicType');
    if (clinicTypeEl) {
        clinicTypeEl.textContent = schedule.speciality || schedule.specialityName || '--';
    }
    
    // Doctor name
    const doctorNameEl = document.getElementById('doctorName');
    if (doctorNameEl) {
        const doctorName = schedule.physicianName || currentPhysicianName || '--';
        doctorNameEl.textContent = doctorName.startsWith('دكتور') || doctorName.startsWith('Dr') ? 
            doctorName : `دكتور / ${doctorName}`;
    }
    
    // Doctor title / Degree
    const doctorTitleEl = document.getElementById('doctorTitle');
    if (doctorTitleEl) {
        doctorTitleEl.textContent = schedule.degree || schedule.degreeName || '--';
    }
    
    // Clinic times
    const clinicTimesEl = document.getElementById('clinicTimes');
    if (clinicTimesEl && schedule.clinicTimeFrom && schedule.clinicTimeTo) {
        const timeFrom = formatTime(schedule.clinicTimeFrom) || '--';
        const timeTo = formatTime(schedule.clinicTimeTo) || '--';
        clinicTimesEl.textContent = `${timeFrom} - ${timeTo}`;
    } else if (clinicTimesEl) {
        clinicTimesEl.textContent = '--';
    }
}

// Load and display current in_progress ticket
async function loadCurrentInProgressTicket() {
    try {
        const today = new Date().toISOString().split('T')[0];
        let currentTicket = null;
        
        // Ensure currentPhysicianId is a string
        const physicianIdParam = String(currentPhysicianId || '');
        
        // Get tickets for physician today
        // First, get schedules for this physician
        const schedulesResponse = await fetch(`${TODAY_SCHEDULES_API}?date=${today}&physicianId=${encodeURIComponent(physicianIdParam)}&isActive=true`);
        const schedulesResult = await schedulesResponse.json();
        
        if (schedulesResult.success && schedulesResult.data && schedulesResult.data.length > 0) {
            // Extract schedule IDs and convert them to strings
            const scheduleIds = schedulesResult.data
                .map(s => {
                    let scheduleId = s.scheduleId || s._id;
                    // Convert to string if it's an object
                    if (scheduleId) {
                        if (typeof scheduleId === 'object') {
                            scheduleId = String(scheduleId._id || scheduleId.id || scheduleId);
                        } else {
                            scheduleId = String(scheduleId);
                        }
                    }
                    return scheduleId;
                })
                .filter(id => id && id !== 'undefined' && id !== 'null');
            
            if (scheduleIds.length > 0) {
                // Get in_progress tickets for these schedules
                const ticketPromises = scheduleIds.map(scheduleId => {
                    const scheduleIdParam = String(scheduleId);
                    return fetch(`${TICKETS_API}?scheduleId=${encodeURIComponent(scheduleIdParam)}&date=${today}&status=in_progress`)
                        .then(res => res.json());
                });
                
                const ticketResults = await Promise.all(ticketPromises);
                
                // Find the last in_progress ticket
                let allInProgressTickets = [];
                ticketResults.forEach(result => {
                    if (result.success && result.data && result.data.length > 0) {
                        allInProgressTickets = allInProgressTickets.concat(result.data);
                    }
                });
                
                if (allInProgressTickets.length > 0) {
                    // Get the last in_progress ticket (most recently started)
                    const sortedTickets = allInProgressTickets.sort((a, b) => 
                        new Date(b.visitStartedAt || b.calledAt || b.printedAt || b.createdAt) - 
                        new Date(a.visitStartedAt || a.calledAt || a.printedAt || a.createdAt)
                    );
                    currentTicket = sortedTickets[0];
                }
            }
        }
        
        // Alternative: Try using physician dashboard API
        if (!currentTicket) {
            try {
                const physicianIdParam = String(currentPhysicianId || '');
                const queueResponse = await fetch(`${PHYSICIAN_API}/queue?physicianId=${encodeURIComponent(physicianIdParam)}`);
                const queueResult = await queueResponse.json();
                
                if (queueResult.success && queueResult.data) {
                    // Filter in_progress tickets
                    const inProgressTickets = queueResult.data.filter(t => t.status === 'in_progress');
                    if (inProgressTickets.length > 0) {
                        const sortedTickets = inProgressTickets.sort((a, b) => 
                            new Date(b.visitStartedAt || b.calledAt || b.printedAt || b.createdAt) - 
                            new Date(a.visitStartedAt || a.calledAt || a.printedAt || a.createdAt)
                        );
                        currentTicket = sortedTickets[0];
                    }
                }
            } catch (error) {
                console.error('Error fetching from physician API:', error);
            }
        }
        
        // Display ticket number
        if (currentTicket) {
            displayTicketNumber(currentTicket);
            updateStatusBadge('in-progress');
        } else {
            document.getElementById('queueNumber').textContent = '--';
            updateStatusBadge('waiting');
        }
        
    } catch (error) {
        console.error('Error loading current in_progress ticket:', error);
        document.getElementById('queueNumber').textContent = '--';
        updateStatusBadge('waiting');
    }
}

// Display ticket number
function displayTicketNumber(ticket) {
    const queueNumberEl = document.getElementById('queueNumber');
    if (!queueNumberEl) return;
    
    // Get formatted ticket number (e.g., E001, C002, P003, L004)
    let ticketNumber = null;
    
    if (ticket.formattedTicketNumber) {
        ticketNumber = ticket.formattedTicketNumber;
    } else if (ticket.ticketType && ticket.sequenceNumber) {
        ticketNumber = getFormattedTicketNumber(ticket.ticketType, ticket.sequenceNumber);
    } else if (ticket.ticketNumber) {
        ticketNumber = ticket.ticketNumber;
    } else if (ticket.sequenceNumber) {
        ticketNumber = ticket.sequenceNumber.toString();
    }
    
    // Display the full formatted ticket number
    if (ticketNumber) {
        queueNumberEl.textContent = ticketNumber;
    } else {
        queueNumberEl.textContent = '--';
    }
}

// Update status badge
function updateStatusBadge(status) {
    const statusBadge = document.getElementById('statusBadge');
    if (!statusBadge) return;
    
    if (status === 'in-progress') {
        statusBadge.textContent = ' داخل العيادة';
        statusBadge.className = 'status-badge in-progress';
    } else {
        statusBadge.textContent = 'في انتظار التذكرة';
        statusBadge.className = 'status-badge waiting';
    }
}

// Helper function to format ticket number
function getFormattedTicketNumber(ticketType, sequenceNumber) {
    const prefixes = {
        'Examination': 'E',
        'Consultation': 'C',
        'Procedure': 'P',
        'Late': 'L'
    };
    
    const prefix = prefixes[ticketType] || 'T';
    return `${prefix}${sequenceNumber.toString().padStart(3, '0')}`;
}

// Format time to 12-hour format
function formatTime(timeString) {
    if (!timeString) return '';
    
    try {
        // If already in 12-hour format with AM/PM, return as is
        if (timeString.includes('AM') || timeString.includes('PM')) {
            return timeString;
        }
        
        // If in 24-hour format, convert to 12-hour
        const [hours, minutes] = timeString.split(':').map(Number);
        if (isNaN(hours) || isNaN(minutes)) return timeString;
        
        const period = hours >= 12 ? 'PM' : 'AM';
        const hours12 = hours % 12 || 12;
        return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
    } catch {
        return timeString;
    }
}

// Hide display
function hideDisplay() {
    const displayCard = document.getElementById('displayCard');
    if (displayCard) {
        displayCard.style.display = 'none';
    }
    currentPhysicianId = null;
    currentPhysicianName = null;
}

// Show loading indicator
function showLoading(show) {
    const elements = ['clinicName', 'clinicType', 'doctorName', 'doctorTitle', 'queueNumber'];
    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (show) {
                el.style.opacity = '0.5';
            } else {
                el.style.opacity = '1';
            }
        }
    });
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

