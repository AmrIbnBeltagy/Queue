// Door Signage Display System
// Load clinic details from todayphysicianschedules by clinic code URL parameter

// Global variables
let refreshInterval = null;
let currentClinicCode = null;

// API endpoints
const TODAY_SCHEDULES_API = `${API_BASE_URL}/today-physician-schedules`;
const TICKETS_API = `${API_BASE_URL}/tickets`;
const PHYSICIAN_API = `${API_BASE_URL}/physician-dashboard`;

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    console.log('Door Signage System initialized');
    
    // Get clinic code from URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    currentClinicCode = urlParams.get('clinicCode') || urlParams.get('code');
    
    if (currentClinicCode) {
        console.log('Clinic Code from URL:', currentClinicCode);
        // Load clinic data
        loadClinicDataByCode(currentClinicCode);
    } else {
        // Show error if no clinic code provided
        showError('يرجى إضافة clinicCode في URL: ?clinicCode=C001');
        clearDisplay();
    }
    
    // Auto-refresh data every 10 seconds if clinic code is set
    refreshInterval = setInterval(() => {
        if (currentClinicCode) {
            loadClinicDataByCode(currentClinicCode);
        }
    }, 10000);
});


// Load clinic data from todayphysicianschedules by clinic code
async function loadClinicDataByCode(clinicCode) {
    try {
        showLoading(true);
        hideError();
        
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's schedule by clinic code
        const scheduleResponse = await fetch(`${TODAY_SCHEDULES_API}?date=${today}&clinic=${encodeURIComponent(clinicCode)}`);
        const scheduleResult = await scheduleResponse.json();
        
        if (!scheduleResult.success || !scheduleResult.data || scheduleResult.data.length === 0) {
            showError('لا توجد بيانات لهذه العيادة اليوم');
            clearDisplay();
            showLoading(false);
            return;
        }
        
        // Get the first active schedule for today
        const schedule = scheduleResult.data.find(s => s.isActive) || scheduleResult.data[0];
        
        if (!schedule) {
            showError('لا توجد جدولة نشطة لهذه العيادة');
            clearDisplay();
            showLoading(false);
            return;
        }
        
        // Display clinic and physician information
        displayClinicInfo(schedule);
        
        // Get and display current ticket
        await loadCurrentTicket(schedule);
        
        showLoading(false);
        
    } catch (error) {
        console.error('Error loading clinic data by code:', error);
        showError('حدث خطأ أثناء تحميل البيانات');
        showLoading(false);
    }
}

// Display clinic and physician information
function displayClinicInfo(schedule) {
    // Clinic number / Code
    const clinicNumberEl = document.getElementById('clinicName');
    if (clinicNumberEl) {
        // Use clinicCode if available, otherwise extract from clinicName
        if (schedule.clinicCode) {
            clinicNumberEl.textContent = `${schedule.clinicName}`;
        } else {
            const clinicName = schedule.clinicName || '';
            const match = clinicName.match(/\d+/);
            clinicNumberEl.textContent = match ? `عيادة رقم ${match[0]}` : `عيادة ${clinicName}`;
        }
    }
    
    // Clinic type / Speciality
    const clinicTypeEl = document.getElementById('clinicType');
    if (clinicTypeEl) {
        clinicTypeEl.textContent = schedule.speciality || '--';
    }
    
    // Doctor name
    const doctorNameEl = document.getElementById('doctorName');
    if (doctorNameEl) {
        const doctorName = schedule.physicianName || '--';
        doctorNameEl.textContent = doctorName.startsWith('دكتور') || doctorName.startsWith('Dr') ? 
            doctorName : `دكتور / ${doctorName}`;
    }
    
    // Doctor title / Degree
    const doctorTitleEl = document.getElementById('doctorTitle');
    if (doctorTitleEl) {
        doctorTitleEl.textContent = schedule.degree || '--';
    }
    
    // Clinic times
    const clinicTimesEl = document.getElementById('clinicTimes');
    if (clinicTimesEl) {
        const timeFrom = formatTime(schedule.clinicTimeFrom) || '--';
        const timeTo = formatTime(schedule.clinicTimeTo) || '--';
        clinicTimesEl.textContent = `${timeFrom} - ${timeTo}`;
    }
}

// Load and display current ticket based on clinicCode
async function loadCurrentTicket(schedule) {
    try {
        const today = new Date().toISOString().split('T')[0];
        let currentTicket = null;
        
        // Use clinicCode from URL parameter or from schedule
        const clinicCodeToUse = currentClinicCode || schedule.clinicCode;
        
        if (!clinicCodeToUse) {
            console.warn('No clinic code available for ticket lookup');
            document.getElementById('queueNumber').textContent = '--';
            return;
        }
        
        // Get last ticket with status in_progress by clinicCode
        const inProgressResponse = await fetch(`${TICKETS_API}?clinicCode=${encodeURIComponent(clinicCodeToUse)}&date=${today}&status=in_progress`);
        const inProgressResult = await inProgressResponse.json();
        
        if (inProgressResult.success && inProgressResult.data && inProgressResult.data.length > 0) {
            // Get the last in_progress ticket (most recently started)
            const sortedInProgressTickets = inProgressResult.data.sort((a, b) => 
                new Date(b.visitStartedAt || b.calledAt || b.printedAt || b.createdAt) - 
                new Date(a.visitStartedAt || a.calledAt || a.printedAt || a.createdAt)
            );
            currentTicket = sortedInProgressTickets[0];
        }
        
        if (currentTicket) {
            displayTicketNumber(currentTicket);
        } else {
            document.getElementById('queueNumber').textContent = '--';
        }
        
    } catch (error) {
        console.error('Error loading current ticket:', error);
        document.getElementById('queueNumber').textContent = '--';
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
        // If only sequence number, show it as is
        ticketNumber = ticket.sequenceNumber.toString();
    }
    
    // Display the full formatted ticket number (e.g., "E001", "C002")
    if (ticketNumber) {
        queueNumberEl.textContent = ticketNumber;
    } else {
        queueNumberEl.textContent = '--';
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

// Clear display
function clearDisplay() {
    document.getElementById('clinicNumber').textContent = '--';
    document.getElementById('clinicType').textContent = '--';
    document.getElementById('doctorName').textContent = '--';
    document.getElementById('doctorTitle').textContent = '--';
    document.getElementById('clinicTimes').textContent = '--';
    document.getElementById('queueNumber').textContent = '--';
    const doctorAvatar = document.getElementById('doctorAvatar');
    if (doctorAvatar) doctorAvatar.style.display = 'none';
}

// Show loading indicator
function showLoading(show) {
    // Show loading by updating display elements
    const elements = ['clinicNumber', 'clinicType', 'doctorName', 'doctorTitle', 'clinicTimes', 'queueNumber'];
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

// Show error message
function showError(message) {
    // Display error in clinic number field
    const clinicNumberEl = document.getElementById('clinicNumber');
    if (clinicNumberEl) {
        clinicNumberEl.textContent = message;
        clinicNumberEl.style.color = '#dc3545';
        clinicNumberEl.style.borderColor = '#dc3545';
    }
    
    console.error('Door Signage Error:', message);
}

// Hide error message
function hideError() {
    const clinicNumberEl = document.getElementById('clinicNumber');
    if (clinicNumberEl) {
        clinicNumberEl.style.color = '#ffb300';
        clinicNumberEl.style.borderColor = '#ffb300';
    }
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});

