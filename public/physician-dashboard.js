// Physician Dashboard JavaScript
// State management
let currentUser = null;
let currentPatient = null;
let visitStartTime = null;
let visitTimer = null;
let queueStats = {
    examination: 0,
    consultation: 0,
    procedure: 0,
    late: 0
};
let todaySchedules = [];
let selectedScheduleId = null;
// Removed: allTodaySchedules
let cachedPhysicianId = null;

// Tickets pagination state
let allTickets = [];
let currentTicketsPage = 1;
const TICKETS_PER_PAGE = 5;

// API Endpoints
const API_BASE_URL = 'http://localhost:3000/api';
const PHYSICIAN_API = `${API_BASE_URL}/physician-dashboard`;
const TICKET_API = `${API_BASE_URL}/tickets`;
const TODAY_SCHEDULES_API = `${API_BASE_URL}/today-physician-schedules`;
const CALLING_SEQUENCE_API = `${API_BASE_URL}/calling-sequences`;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

// Format 24-hour time (HH:mm) to 12-hour with AM/PM; pass through if already formatted or invalid
function formatTimeTo12Hour(timeString) {
    try {
        if (!timeString || typeof timeString !== 'string') return timeString || '';
        if (timeString.includes('AM') || timeString.includes('PM')) return timeString;
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

// Initialize the physician dashboard
async function initializePage() {
    try {
        // Check authentication
        if (!checkAuthentication()) {
            return;
        }
        
        // Check role access
        if (!checkRoleAccess()) {
            return;
        }
        
        // Load current user data
        loadCurrentUser();
        
        // Load today's schedules and initialize selector
        await loadTodaySchedulesForPhysician();
        setupScheduleSelector();

        // Load initial data
        await loadQueueStats();
        
        // Load current patient in progress
        await loadCurrentPatientInProgress();
        
        // Load next ticket info
        // Display calling sequence configuration
        await displayCallingSequence();
        
        // Load all tickets for selected schedule
        await loadAllTickets();
        
        // Removed: Today's Schedules table loading

        // Setup event listeners
        setupEventListeners();
        
        // Start auto-refresh
        startAutoRefresh();
        
        console.log('Physician dashboard initialized successfully');
    } catch (error) {
        console.error('Error initializing physician dashboard:', error);
        showNotification('Error initializing dashboard. Please refresh the page.', 'error');
    }
}

// Check authentication
function checkAuthentication() {
    try {
        const userData = localStorage.getItem('currentUser');
        if (!userData) {
            window.location.href = 'login.html';
            return false;
        }
        
        currentUser = JSON.parse(userData);
        return true;
    } catch (error) {
        console.error('Error checking authentication:', error);
        window.location.href = 'login.html';
        return false;
    }
}

// Check role-based access control
function checkRoleAccess() {
    try {
        if (!currentUser) {
            window.location.href = 'login.html';
            return false;
        }
        
        // Only physicians can access this page
        if (currentUser.role !== 'physician' && currentUser.role !== 'doctor') {
            showNotification('Access restricted. Only physicians can access this dashboard.', 'error');
            setTimeout(() => {
                window.location.href = 'today-physician-schedule.html';
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

// Load current user data
function loadCurrentUser() {
    try {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            currentUser = JSON.parse(userData);
            console.log('Current user loaded:', currentUser);
        }
    } catch (error) {
        console.error('Error loading current user:', error);
    }
}

// Load today's schedules for this physician (prefer from tickets)
async function loadTodaySchedulesForPhysician() {
    try {
        const selector = document.getElementById('scheduleSelector');
        const scheduleMeta = document.getElementById('scheduleMeta');
        if (selector) selector.innerHTML = `<option>Loading schedules...</option>`;

        const physicianId = await resolveCurrentPhysicianId();
        const dateStr = getTodayString();

        // Directly load from TodayPhysicianSchedules for this physician and date
        let enriched = [];
        try {
            const url = `${TODAY_SCHEDULES_API}?physicianId=${encodeURIComponent(physicianId)}&date=${encodeURIComponent(dateStr)}`;
            const resp = await fetch(url);
            if (resp.ok) {
                const data = await resp.json();
                enriched = Array.isArray(data) ? data : (data.data || []);
            }
        } catch (e) {
            console.warn('Failed loading today schedules directly:', e);
        }

        todaySchedules = enriched;

        // Populate selector
        if (selector) {
            if (!todaySchedules || todaySchedules.length === 0) {
                selector.innerHTML = `<option value="">No schedules for today</option>`;
                selectedScheduleId = null;
                if (scheduleMeta) scheduleMeta.textContent = '';
                return;
            }

            // Restore previously selected schedule if available
            const saved = localStorage.getItem('physicianSelectedScheduleId');
            const exists = saved && todaySchedules.find(s => ((s.scheduleId && (s.scheduleId._id || s.scheduleId)) || s._id) === saved);
            // Prefer base PhysicianSchedule id (scheduleId) over TodayPhysicianSchedule id
            const firstScheduleId = (todaySchedules[0].scheduleId && (todaySchedules[0].scheduleId._id || todaySchedules[0].scheduleId)) || todaySchedules[0]._id;
            selectedScheduleId = exists ? saved : firstScheduleId;
            localStorage.setItem('physicianSelectedScheduleId', selectedScheduleId);

            selector.innerHTML = todaySchedules.map(s => {
                // Prefer PhysicianSchedule id for option value
                const id = (s.scheduleId && (s.scheduleId._id || s.scheduleId)) || s._id || '';
                const clinic = s.clinic || s.clinicName || 'Clinic';
                const location = s.location || s.locationName || '';
                const from = s.clinicTimeFrom || s.startTime || '';
                const to = s.clinicTimeTo || s.endTime || '';
                const label = (clinic || location) ? `${clinic}${location ? ' - ' + location : ''}` : 'Schedule';
                const time = (from || to) ? ` (${formatTimeTo12Hour(from || '--')} - ${formatTimeTo12Hour(to || '--')})` : '';
                const text = `${label}${time}`;
                return `<option value="${id}">${text}</option>`;
            }).join('');

            selector.value = selectedScheduleId;
            updateScheduleMeta();
        }
    } catch (err) {
        console.error('Error loading today schedules:', err);
        const selector = document.getElementById('scheduleSelector');
        if (selector) selector.innerHTML = `<option value="">Failed to load schedules</option>`;
    }
}

function updateScheduleMeta() {
    try {
        const scheduleMeta = document.getElementById('scheduleMeta');
        if (!scheduleMeta || !selectedScheduleId) return;
        const s = todaySchedules.find(x => (((x.scheduleId && (x.scheduleId._id || x.scheduleId)) || x._id) === selectedScheduleId));
        if (!s) { scheduleMeta.textContent = ''; return; }
        const from = s.clinicTimeFrom || s.startTime || '--';
        const to = s.clinicTimeTo || s.endTime || '--';
        scheduleMeta.textContent = `Time: ${formatTimeTo12Hour(from)} - ${formatTimeTo12Hour(to)}`;
    } catch {}
}

function setupScheduleSelector() {
    const selector = document.getElementById('scheduleSelector');
    if (!selector) return;
    selector.addEventListener('change', async (e) => {
        selectedScheduleId = e.target.value || null;
        if (selectedScheduleId) {
            localStorage.setItem('physicianSelectedScheduleId', selectedScheduleId);
        } else {
            localStorage.removeItem('physicianSelectedScheduleId');
        }
        updateScheduleMeta();
        // Reload widgets dependent on schedule
        await loadCurrentPatientInProgress();
        await refreshPerTypeBreakdown();
        await displayCallingSequence();
        await loadAllTickets();
        showNotification('Schedule changed', 'info');
    });
}

function getTodayString() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Resolve Doctor (physician) ObjectId for the current user
async function resolveCurrentPhysicianId() {
    try {
        if (cachedPhysicianId) return cachedPhysicianId;
        if (!currentUser) return null;

        // If the user object embeds a physician/doctor id, prefer it
        const directId = currentUser.physicianId || currentUser.doctorId || currentUser.doctor?._id || currentUser.physician?._id;
        if (directId) {
            cachedPhysicianId = directId;
            return cachedPhysicianId;
        }

        // Otherwise try to locate the doctor by username or email
        const username = currentUser.username;
        const email = currentUser.email;

        // Fetch doctors list and try to match (server may not support search params)
        const resp = await fetch(`${API_BASE_URL}/doctors`);
        const json = await resp.json();
        const doctors = Array.isArray(json?.data) ? json.data : [];
        const match = doctors.find(d => (d.username && d.username === username) || (d.email && d.email === email));
        if (match && match._id) {
            cachedPhysicianId = match._id;
            return cachedPhysicianId;
        }

        // Fallback: return null; caller should avoid adding physicianId filter
        return null;
    } catch (e) {
        console.warn('Could not resolve current physician id:', e);
        return null;
    }
}

// Removed: loadAllTodaySchedules, renderAllTodaySchedules, escapeHtml


// Load queue statistics
async function loadQueueStats() {
    try {
        const username = currentUser.username;
        const email = currentUser.email;
        const response = await fetch(`${PHYSICIAN_API}/stats?username=${username}&email=${email}`);
        const result = await response.json();
        
        if (result.success) {
            queueStats = result.data || { examination: 0, consultation: 0, procedure: 0, late: 0 };
            displayQueueStats();
            console.log('Queue stats loaded:', queueStats);
            // Also refresh per-type breakdown using selected schedule
            await refreshPerTypeBreakdown();
        } else {
            console.error('Error loading queue stats:', result.message);
        }
    } catch (error) {
        console.error('Error loading queue stats:', error);
    }
}

// Resolve schedule and update per-type breakdown counters
async function refreshPerTypeBreakdown() {
    try {
        // Determine scheduleId to use
        let scheduleId = selectedScheduleId;
        if (!scheduleId) {
            const username = currentUser.username;
            const email = currentUser.email;
            const queueResponse = await fetch(`${PHYSICIAN_API}/queue?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`);
            const queueResult = await queueResponse.json();
            if (queueResult.success && queueResult.data && queueResult.data.length > 0) {
                scheduleId = queueResult.data[0].scheduleId;
            }
        }
        if (!scheduleId) {
            updateTypeBreakdownUI({});
            return;
        }
        const response = await fetch(`${PHYSICIAN_API}/queue?scheduleId=${scheduleId}`);
        const result = await response.json();
        if (!result.success) {
            updateTypeBreakdownUI({});
            return;
        }
        const tickets = result.data || [];
        const byType = { Examination: { waiting: 0, served: 0 }, Consultation: { waiting: 0, served: 0 }, Procedure: { waiting: 0, served: 0 }, Late: { waiting: 0, served: 0 } };
        for (const t of tickets) {
            const type = t.ticketType || 'Examination';
            const bucket = byType[type] || (byType[type] = { waiting: 0, served: 0 });
            if (t.status === 'waiting') bucket.waiting += 1;
            else if (t.status === 'called' || t.status === 'in_progress' || t.status === 'completed') bucket.served += 1;
        }
        // Compute totals
        Object.keys(byType).forEach(k => {
            byType[k].total = byType[k].waiting + byType[k].served;
        });
        updateTypeBreakdownUI(byType);
    } catch (e) {
        updateTypeBreakdownUI({});
    }
}

function updateTypeBreakdownUI(byType) {
    const map = [
        { key: 'Examination', prefix: 'examination' },
        { key: 'Consultation', prefix: 'consultation' },
        { key: 'Procedure', prefix: 'procedure' },
        { key: 'Late', prefix: 'late' }
    ];
    map.forEach(({ key, prefix }) => {
        const data = byType[key] || { waiting: 0, served: 0, total: 0 };
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = String(val); };
        set(`${prefix}Waiting`, data.waiting);
        set(`${prefix}Served`, data.served);
        set(`${prefix}Total`, data.total);
    });
}


// Update current patient display
function updateCurrentPatient(patient) {
    const currentPatientCard = document.getElementById('currentPatientCard');
    const currentPatientName = document.getElementById('currentPatientName');
    const currentPatientTicket = document.getElementById('currentPatientTicket');
    const currentPatientType = document.getElementById('currentPatientType');
    
    // Handle null or undefined patient
    if (!patient || !patient.ticketType) {
        if (currentPatientCard) {
            currentPatientCard.style.display = 'none';
        }
        // Clear visit timer
        if (visitTimer) {
            clearInterval(visitTimer);
            visitTimer = null;
        }
        visitStartTime = null;
        return;
    }
    
    if (currentPatientCard && currentPatientName && currentPatientTicket && currentPatientType) {
        // Format ticket number with prefix
        const ticketPrefix = getTicketPrefix(patient.ticketType);
        const formattedTicketNumber = `${ticketPrefix}${patient.sequenceNumber.toString().padStart(3, '0')}`;
        
        currentPatientName.textContent = `Patient ${patient.patientCode || 'Unknown'}`;
        currentPatientTicket.textContent = `Current Ticket: ${formattedTicketNumber}`;
        currentPatientType.textContent = `Type: ${patient.ticketType} | Status: ${patient.status}`;
        
        currentPatientCard.style.display = 'block';
        // Set timer base from CalledAt if available, else fallback to visitStartedAt
        if (patient.calledAt) {
            visitStartTime = new Date(patient.calledAt);
        } else if (patient.visitStartedAt) {
            visitStartTime = new Date(patient.visitStartedAt);
        }
    }
}

// Helper function to get ticket prefix
function getTicketPrefix(ticketType) {
    switch(ticketType) {
        case 'Examination': return 'E';
        case 'Consultation': return 'C';
        case 'Procedure': return 'P';
        case 'Late': return 'L';
        default: return 'T';
    }
}

// Load current patient in progress
async function loadCurrentPatientInProgress() {
    try {
        const username = currentUser.username;
        const email = currentUser.email;
        
        // Determine scheduleId to use
        let scheduleId = selectedScheduleId;
        if (!scheduleId) {
            const queueResponse = await fetch(`${PHYSICIAN_API}/queue?username=${username}&email=${email}`);
            const queueResult = await queueResponse.json();
            if (queueResult.success && queueResult.data && queueResult.data.length > 0) {
                scheduleId = queueResult.data[0].scheduleId;
            }
        }
        if (scheduleId) {
            
            // Get current patient (most recently completed)
            const currentPatientResponse = await fetch(`${PHYSICIAN_API}/current-patient?scheduleId=${scheduleId}`);
            const currentPatientResult = await currentPatientResponse.json();
            
            if (currentPatientResult.success && currentPatientResult.data) {
                const patient = currentPatientResult.data;
                
                // Only set as current patient if status is in_progress or called (not completed)
                if (patient.status === 'in_progress' || patient.status === 'called') {
                // Update current patient display
                updateCurrentPatient(patient);
                
                // Set current patient
                currentPatient = patient;
                
                    // Start visit timer from calledAt or visitStartedAt
                    if (patient.calledAt) {
                        visitStartTime = new Date(patient.calledAt);
                    } else if (patient.visitStartedAt) {
                        visitStartTime = new Date(patient.visitStartedAt);
                    }
                    if (visitStartTime) startVisitTimer();
                
                console.log('Current patient in progress loaded:', patient);
                } else {
                    // Patient is completed, clear current patient
                    currentPatient = null;
                    updateCurrentPatient(null);
                    console.log('Patient is completed, clearing current patient');
                }
            } else {
                // No current patient in progress
                console.log('No current patient in progress');
            }
        }
    } catch (error) {
        console.error('Error loading current patient in progress:', error);
    }
}

// Helper function to get current active badge from sequenceOrder
function getCurrentActiveBadge() {
    // First try to get from DOM
    let currentActiveBadge = document.querySelector('.sequence-badge.current-active');
    
    // If not found, try to restore from localStorage
    if (!currentActiveBadge) {
        const savedIndex = localStorage.getItem('currentSequenceIndex');
        if (savedIndex) {
            const allBadges = Array.from(document.querySelectorAll('.sequence-badge'));
            currentActiveBadge = allBadges.find(badge => 
                badge.getAttribute('data-index') === savedIndex
            );
            if (currentActiveBadge) {
                currentActiveBadge.classList.add('current-active');
                updateBadgeStyles();
            }
        }
    }
    
    return currentActiveBadge;
}

// Helper function to save current sequence state to localStorage
function saveSequenceState(dataIndex, ticketType) {
    try {
        localStorage.setItem('currentSequenceIndex', dataIndex);
        localStorage.setItem('currentSequenceType', ticketType);
        console.log('Saved sequence state:', { dataIndex, ticketType });
    } catch (error) {
        console.error('Error saving sequence state:', error);
    }
}

// Helper function to get saved sequence state from localStorage
function getSavedSequenceState() {
    try {
        const dataIndex = localStorage.getItem('currentSequenceIndex');
        const ticketType = localStorage.getItem('currentSequenceType');
        return { dataIndex, ticketType };
    } catch (error) {
        console.error('Error getting saved sequence state:', error);
        return { dataIndex: null, ticketType: null };
    }
}

// Helper function to get first badge in sequence (when no active badge)
function getFirstBadgeInSequence() {
    const allBadges = Array.from(document.querySelectorAll('.sequence-badge'));
    return allBadges.length > 0 ? allBadges[0] : null;
}

// Helper function to activate next badge in sequence
// Returns the data-index of the next badge (for use after displayCallingSequence redraws)
function activateNextBadge(currentBadge) {
    if (!currentBadge) return null;
    
    // Get the data-index of current badge
    const currentIndex = parseInt(currentBadge.getAttribute('data-index')) || 0;
    
    // Get all badges to find the max index
    const allBadges = Array.from(document.querySelectorAll('.sequence-badge'));
    const maxIndex = allBadges.length;
    
    // Calculate next index (loop to 1 if last)
    let nextIndex = currentIndex + 1;
    if (nextIndex > maxIndex) {
        nextIndex = 1; // Loop back to first
    }
    
    // Store next index for use after redraw
    if (typeof window !== 'undefined') {
        window.nextBadgeIndex = nextIndex;
    }
    
    return nextIndex;
}

// Helper function to activate badge by data-index after redraw
function activateBadgeByIndex(targetIndex) {
    if (!targetIndex) return;
    
    const allBadges = Array.from(document.querySelectorAll('.sequence-badge'));
    const targetBadge = allBadges.find(badge => {
        const badgeIndex = parseInt(badge.getAttribute('data-index'));
        return badgeIndex === targetIndex;
    });
    
    if (targetBadge) {
        // Remove current-active from all badges first
        allBadges.forEach(badge => badge.classList.remove('current-active'));
        
        // Add current-active to target badge
        targetBadge.classList.add('current-active');
        updateBadgeStyles();
        
        // Clear the stored index
        if (typeof window !== 'undefined') {
            window.nextBadgeIndex = null;
        }
        
        return targetBadge;
    }
    
    return null;
}

// Helper function to update badge styles after activation change
function updateBadgeStyles() {
    const allBadges = Array.from(document.querySelectorAll('.sequence-badge'));
    allBadges.forEach(badge => {
        if (badge.classList.contains('current-active')) {
            const badgeColor = getTypeColor(badge.getAttribute('data-ticket-type'));
            badge.style.cssText = `
                padding: 10px 14px; 
                background: linear-gradient(135deg, ${badgeColor} 0%, ${badgeColor}dd 100%); 
                border-radius: 8px; 
                font-size: 1.1rem; 
                color: white; 
                font-weight: 800; 
                border: 3px solid #fff; 
                box-shadow: 0 6px 20px ${badgeColor}80, 0 0 0 3px ${badgeColor}40;
                transform: scale(1.1);
                animation: pulseHighlight 2s ease-in-out infinite;
                position: relative;
                z-index: 10;
            `;
        }
    });
}

// Helper function to get first waiting ticket of a specific type
async function getFirstWaitingTicketByType(scheduleId, ticketType) {
    try {
        const queueResponse = await fetch(`${PHYSICIAN_API}/queue?scheduleId=${scheduleId}`);
        const queueResult = await queueResponse.json();
        
        if (!queueResult.success || !queueResult.data) {
            console.log('getFirstWaitingTicketByType: No queue data returned');
            return null;
        }
        
        console.log('getFirstWaitingTicketByType: Looking for type:', ticketType);
        
        // Filter tickets by type and status = 'waiting', sort by sequenceNumber
        const waitingTickets = queueResult.data
            .filter(t => {
                const typeMatch = (t.ticketType || '').trim() === (ticketType || '').trim();
                const statusMatch = t.status === 'waiting';
                return typeMatch && statusMatch;
            })
            .sort((a, b) => a.sequenceNumber - b.sequenceNumber);
        
        console.log('getFirstWaitingTicketByType: Waiting tickets of type', ticketType, ':', waitingTickets.length);
        
        if (waitingTickets.length > 0) {
            const firstTicket = waitingTickets[0];
            console.log('getFirstWaitingTicketByType: Found first waiting ticket:', {
                sequenceNumber: firstTicket.sequenceNumber,
                type: firstTicket.ticketType,
                ticketId: firstTicket._id
            });
            return firstTicket;
        }
        
        console.log('getFirstWaitingTicketByType: No waiting tickets found for type:', ticketType);
        return null;
        
    } catch (error) {
        console.error('Error getting first waiting ticket by type:', error);
        return null;
    }
}

// Call next ticket based on current-active badge in sequenceOrder
async function callNextTicket() {
    try {
        showLoading('Calling next ticket...');
        
        // Determine scheduleId to use
        let scheduleId = selectedScheduleId;
        if (!scheduleId) {
            const username = currentUser.username;
            const email = currentUser.email;
            const queueResponse = await fetch(`${PHYSICIAN_API}/queue?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`);
            const queueResult = await queueResponse.json();
            if (queueResult.success && queueResult.data && queueResult.data.length > 0) {
                scheduleId = queueResult.data[0].scheduleId;
            }
        }
        
        if (!scheduleId) {
            showNotification('No schedule selected', 'warning');
            hideLoading();
            return;
        }
        
        // Check which badge is current-active in sequenceOrder
        let activeBadge = getCurrentActiveBadge();
        
        // If none is active, activate the first one
        if (!activeBadge) {
            activeBadge = getFirstBadgeInSequence();
            if (activeBadge) {
                activeBadge.classList.add('current-active');
                updateBadgeStyles();
            } else {
                showNotification('No sequence badges found', 'warning');
                hideLoading();
                return;
            }
        }
        
        // Get ticket type and data-index from current active badge
        let ticketType = activeBadge.getAttribute('data-ticket-type');
        let dataIndex = activeBadge.getAttribute('data-index');
        console.log('callNextTicket: Active badge ticket type:', ticketType);
        console.log('callNextTicket: Active badge data-index:', dataIndex);
        
        if (!ticketType || !dataIndex) {
            showNotification('Invalid badge data (missing type or index)', 'error');
            hideLoading();
            return;
        }
        
        // Save current sequence state to localStorage
        saveSequenceState(dataIndex, ticketType);
        
        // Complete current ticket if exists (status: in_progress -> completed)
        if (currentPatient && currentPatient._id && (currentPatient.status === 'in_progress' || currentPatient.status === 'called')) {
            try {
                console.log('Completing current ticket:', currentPatient._id);
                const completeResponse = await fetch(`${TICKET_API}/${currentPatient._id}/status`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify({
                        status: 'completed'
                    })
                });
                
                const completeResult = await completeResponse.json();
                if (completeResult.success) {
                    console.log('Current ticket marked as completed:', currentPatient._id);
                    currentPatient = null;
                    updateCurrentPatient(null);
                } else {
                    console.warn('Failed to complete current ticket:', completeResult.message);
                }
            } catch (error) {
                console.error('Error completing current ticket:', error);
            }
        }
        
        // Get first waiting ticket of the current badge type
        // Simply filter by data-ticket-type value with status = 'waiting'
        let nextTicket = await getFirstWaitingTicketByType(scheduleId, ticketType);
        
        // If no waiting tickets found for current type, continue to next badge in sequence
        if (!nextTicket) {
            console.log(`No waiting tickets found for type: ${ticketType}, moving to next in sequence`);
            
            // Get next badge in sequence
            const allBadges = Array.from(document.querySelectorAll('.sequence-badge'));
            const currentBadgeIndex = parseInt(dataIndex);
            let nextBadgeInSequence = null;
            let attempts = 0;
            const maxAttempts = allBadges.length; // Prevent infinite loop
            
            // Try to find next badge with waiting tickets
            while (!nextTicket && attempts < maxAttempts) {
                // Get next badge index (current + attempts + 1, loop if at end)
                let nextIndex = currentBadgeIndex + attempts + 1;
                const totalBadges = allBadges.length;
                if (nextIndex > totalBadges) {
                    nextIndex = ((nextIndex - 1) % totalBadges) + 1; // Loop back to 1
                }
                
                nextBadgeInSequence = allBadges.find(badge => {
                    const badgeIndex = parseInt(badge.getAttribute('data-index')) || 0;
                    return badgeIndex === nextIndex;
                });
                
                if (nextBadgeInSequence) {
                    const nextType = nextBadgeInSequence.getAttribute('data-ticket-type');
                    const nextDataIndex = nextBadgeInSequence.getAttribute('data-index');
                    
                    console.log(`Trying next badge in sequence: index ${nextDataIndex}, type ${nextType} (attempt ${attempts + 1})`);
                    
                    // Get first waiting ticket for this type
                    nextTicket = await getFirstWaitingTicketByType(scheduleId, nextType);
                    
                    if (nextTicket) {
                        // Update active badge to the one we found
                        activeBadge = nextBadgeInSequence;
                        // Update variables for rest of function
                        ticketType = nextType;
                        dataIndex = nextDataIndex;
                        // Save the state
                        saveSequenceState(nextDataIndex, nextType);
                        console.log(`Found waiting ticket for type: ${nextType} at index ${nextDataIndex}`);
                        break; // Exit loop once we found a ticket
                    } else {
                        console.log(`No waiting tickets for type: ${nextType}, continuing to next in sequence...`);
                    }
                }
                
                attempts++;
            }
            
            // If still no ticket found after checking all badges, show message
            if (!nextTicket) {
                showNotification('No waiting tickets found in the entire sequence', 'info');
                hideLoading();
                return;
            }
            
            // activeBadge, ticketType, and dataIndex have been updated in the loop above
            console.log('Continuing with next available badge:', { dataIndex, ticketType });
        }
        
        // Call the ticket (update status from waiting to in_progress)
        const callResponse = await fetch(`${PHYSICIAN_API}/call-patient`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                ticketId: nextTicket._id,
                physicianId: currentUser._id || currentUser.id
            })
        });
        
        const callResult = await callResponse.json();
        
        if (callResult.success) {
            // Update current patient display
            updateCurrentPatient(callResult.data);
            currentPatient = callResult.data;
            
            // Show success message
            const ticketPrefix = getTicketPrefix(callResult.data.ticketType);
            const formattedTicketNumber = `${ticketPrefix}${callResult.data.sequenceNumber.toString().padStart(3, '0')}`;
            showNotification(`Next patient called: ${formattedTicketNumber}`, 'success');
            
            // Move to next badge in sequence (following the exact order: E→L→L→P→P→C→E...)
            const currentDataIndex = parseInt(dataIndex);
            const allBadges = Array.from(document.querySelectorAll('.sequence-badge'));
            const totalBadges = allBadges.length;
            
            // Calculate next index (current + 1, loop to 1 if last)
            let nextIndex = currentDataIndex + 1;
            if (nextIndex > totalBadges) {
                nextIndex = 1; // Loop back to first badge
            }
            
            // Find next badge by data-index
            const nextBadge = allBadges.find(badge => {
                const badgeIndex = parseInt(badge.getAttribute('data-index')) || 0;
                return badgeIndex === nextIndex;
            });
            
            // Save next sequence state to localStorage (before redrawing)
            if (nextBadge) {
                const nextDataIndex = nextBadge.getAttribute('data-index');
                const nextTicketType = nextBadge.getAttribute('data-ticket-type');
                
                if (nextDataIndex && nextTicketType) {
                    saveSequenceState(nextDataIndex, nextTicketType);
                    // Save to window for use after redraw
                    if (typeof window !== 'undefined') {
                        window.nextBadgeIndex = parseInt(nextDataIndex);
                    }
                    console.log(`Next in sequence will be: data-index=${nextDataIndex}, type=${nextTicketType}`);
                }
            }
            
            // Start visit timer from CalledAt
            if (callResult.data && callResult.data.calledAt) {
                visitStartTime = new Date(callResult.data.calledAt);
            } else {
                visitStartTime = new Date();
            }
            startVisitTimer();
            
            // Update current patient in progress
            await loadCurrentPatientInProgress();
            
            // Refresh statistics and sequence details (this will redraw the sequence)
            await refreshPerTypeBreakdown();
            await displayCallingSequence();
            
            // After redrawing, activate the next badge by index if available
            if (typeof window !== 'undefined' && window.nextBadgeIndex) {
                activateBadgeByIndex(window.nextBadgeIndex);
                // Clear the stored index after use
                window.nextBadgeIndex = null;
            }
            
            // Refresh tickets list
            await loadAllTickets();
        } else {
            showNotification('Error calling patient: ' + callResult.message, 'error');
        }
        
    } catch (error) {
        console.error('Error calling next ticket:', error);
        showNotification('Error calling next ticket: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Get professional sequence configuration from API
async function getProfessionalSequence(scheduleId = null) {
    try {
        let url = `${CALLING_SEQUENCE_API}/default`;
        if (scheduleId) {
            url = `${CALLING_SEQUENCE_API}/schedule/${scheduleId}`;
        }
        
        const response = await fetch(url);
        const result = await response.json();
        
        if (result.success && result.data && result.data.sequence) {
            // Ensure sequence is sorted by priority (should already be sorted from API)
            const sequence = [...result.data.sequence].sort((a, b) => (a.priority || 0) - (b.priority || 0));
            return sequence;
        }
    } catch (error) {
        console.error('Error loading sequence from API:', error);
        // Fallback to localStorage for backward compatibility
    try {
        const savedConfig = localStorage.getItem('queueConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            if (config.sequence) {
                const sequence = [];
                Object.entries(config.sequence).forEach(([type, data]) => {
                    sequence.push({
                        type: type.charAt(0).toUpperCase() + type.slice(1),
                        count: data.count || 1,
                        priority: data.priority || 1
                    });
                });
                sequence.sort((a, b) => a.priority - b.priority);
                return sequence;
            }
        }
        } catch (e) {
            console.error('Error loading from localStorage:', e);
        }
    }
    
    // Default professional sequence
    return [
        { type: 'Examination', count: 2, priority: 1 },
        { type: 'Consultation', count: 1, priority: 2 },
        { type: 'Procedure', count: 1, priority: 3 },
        { type: 'Late', count: 2, priority: 4 }
    ];
}

// Display calling sequence configuration
async function displayCallingSequence() {
    try {
        let scheduleId = selectedScheduleId;
        if (!scheduleId) {
            const username = currentUser.username;
            const email = currentUser.email;
            const queueResponse = await fetch(`${PHYSICIAN_API}/queue?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`);
            const queueResult = await queueResponse.json();
            if (queueResult.success && queueResult.data && queueResult.data.length > 0) {
                scheduleId = queueResult.data[0].scheduleId;
            }
        }
        
        const sequence = await getProfessionalSequence(scheduleId);
        if (!sequence || sequence.length === 0) return;

        // Ensure sequence is sorted by priority for consistency
        const sortedSequence = [...sequence].sort((a, b) => (a.priority || 0) - (b.priority || 0));

        // Display sequence order with highlighting for current step
        const sequenceOrderEl = document.getElementById('sequenceOrder');
        if (sequenceOrderEl) {
            const state = scheduleId ? getSequenceState(scheduleId) : { index: -1, served: 0 };
            const totalSteps = sortedSequence.length;
            let currentStepIndex = state.index >= 0 && state.index < totalSteps ? state.index : -1;
            let currentStepServed = state.served || 0;
            
            // Check if there are any tickets in progress (completed or in_progress)
            let hasTicketsInProgress = false;
            let allCompletedTickets = []; // All completed tickets sorted by call order (exclude in_progress)
            let inProgressTicket = null; // Current ticket in progress
            let allTicketsInOrder = []; // All tickets (completed + in_progress) sorted by call order
            let completedStepIndexCount = 0; // Track how many step-indices have been completed globally
            let queueResultData = []; // Store tickets data for use in the loop
            
        if (scheduleId) {
                try {
                    const queueResponse = await fetch(`${PHYSICIAN_API}/queue?scheduleId=${scheduleId}`);
                    const queueResult = await queueResponse.json();
                    if (queueResult.success && queueResult.data) {
                        queueResultData = queueResult.data;
                        hasTicketsInProgress = queueResultData.some(t => 
                            t.status === 'in_progress' || t.status === 'completed' || t.status === 'called'
                        );
                        
                        // Separate completed and in_progress tickets
                        // Only completed tickets count toward completedStepIndexCount
                        allCompletedTickets = queueResultData
                            .filter(t => t.status === 'completed')
                            .sort((a, b) => {
                                const aTime = a.calledAt || a.visitStartedAt || a.printedAt || 0;
                                const bTime = b.calledAt || b.visitStartedAt || b.printedAt || 0;
                                return new Date(aTime) - new Date(bTime);
                            });
                        
                        // Find current in_progress ticket (should be only one)
                        inProgressTicket = queueResultData.find(t => t.status === 'in_progress');
                        
                        // Get all tickets (completed + in_progress) sorted by call order
                        // This helps us match the in_progress ticket to its position in sequence
                        allTicketsInOrder = queueResultData
                            .filter(t => t.status === 'completed' || t.status === 'in_progress')
                            .sort((a, b) => {
                                const aTime = a.calledAt || a.visitStartedAt || a.printedAt || 0;
                                const bTime = b.calledAt || b.visitStartedAt || b.printedAt || 0;
                                return new Date(aTime) - new Date(bTime);
                            });
                        
                        // Count how many step-indices are completed (only completed, not in_progress)
                        completedStepIndexCount = allCompletedTickets.length;
                        
                        // Log for debugging
                        console.log('displayCallingSequence - Ticket status:', {
                            completed: allCompletedTickets.length,
                            inProgress: inProgressTicket ? inProgressTicket.ticketType + inProgressTicket.sequenceNumber : null,
                            completedStepIndexCount: completedStepIndexCount,
                            allTicketsInOrderCount: allTicketsInOrder.length
                        });
                    }
                } catch (e) {
                    console.error('Error checking tickets in progress:', e);
                }
            }
            
            const orderItems = [];
            let globalPosition = 0; // Track position across all steps
            let globalStepIndex = 0; // Auto-increment step index without duplication
            
            sortedSequence.forEach((step, stepIdx) => {
                const isCurrentStep = (stepIdx === currentStepIndex);
                
                for (let i = 0; i < step.count; i++) {
                    const badgeColor = getTypeColor(step.type);
                    const positionInStep = i + 1;
                    const currentBadgeStepIndex = globalStepIndex;
                    
                    const indexNumber = globalPosition + 1; // 1-based index for display (data-index)
                    
                    // Check if this specific badge has been completed (only completed, not in_progress)
                    // Match based on data-index: badges with data-index <= completedStepIndexCount are completed
                    const isActive = completedStepIndexCount > 0 && 
                                   indexNumber <= completedStepIndexCount;
                    
                    // Check if this badge is currently in_progress (the currently called ticket)
                    // Match by finding the in_progress ticket's position in the sequence
                    let isInProgress = false;
                    let isCurrentlyCalled = false;
                    
                    if (inProgressTicket && allTicketsInOrder.length > 0) {
                        // Find the position of the in_progress ticket in the ordered list (0-based)
                        const inProgressPosition = allTicketsInOrder.findIndex(t => t.id === inProgressTicket.id);
                        
                        // The in_progress ticket should be at data-index = (inProgressPosition + 1)
                        // because data-index starts from 1 and matches the position in allTicketsInOrder
                        if (indexNumber === inProgressPosition + 1) {
                            // Verify this badge matches the in_progress ticket type and position within type
                            if (step.type === inProgressTicket.ticketType) {
                                // Count how many tickets of this type were already called (completed or in_progress)
                                // up to and including the in_progress ticket
                                const ticketsOfThisType = allTicketsInOrder.filter(t => 
                                    t.ticketType === inProgressTicket.ticketType
                                );
                                
                                const inProgressTypePosition = ticketsOfThisType.findIndex(t => 
                                    t.id === inProgressTicket.id
                                );
                                
                                // Check if this badge is at the correct position within this step type
                                if (positionInStep === inProgressTypePosition + 1) {
                                    isInProgress = true;
                                    isCurrentlyCalled = true; // This is the currently called ticket
                                }
                            }
                        }
                    }
                    
                    // Simplified: if inProgressTicket exists, use its position in allTicketsInOrder
                    // to determine which badge should have current-active based on data-index
                    if (inProgressTicket && allTicketsInOrder.length > 0 && !isInProgress) {
                        const inProgressGlobalPosition = allTicketsInOrder.findIndex(t => t.id === inProgressTicket.id);
                        // The currently called ticket should be at data-index = (position + 1)
                        if (inProgressGlobalPosition >= 0 && indexNumber === inProgressGlobalPosition + 1) {
                            // Double-check type match
                            if (step.type === inProgressTicket.ticketType) {
                                isCurrentlyCalled = true;
                                isInProgress = true;
                            }
                        }
                    }
                    
                    // Only mark as next (current-active) if there are waiting tickets and no in_progress ticket
                    // Next is the badge with data-index === completedStepIndexCount + 1 (the next one to be called)
                    // OR if in_progress ticket exists, the next one would be at completedStepIndexCount + 2
                    const isNext = hasTicketsInProgress && 
                                 !inProgressTicket &&
                                 indexNumber === completedStepIndexCount + 1;
                    
                    // Upcoming badges are those after the next one
                    const isUpcoming = completedStepIndexCount > 0 && 
                                     indexNumber > completedStepIndexCount + 1;
                    
                    // Determine style based on position
                    let spanStyle = '';
                    if (isActive) {
                        // Already served/completed - solid with checkmark
                        spanStyle = `
                            padding: 10px 14px; 
                            background: ${badgeColor}; 
                            border-radius: 8px; 
                            font-size: 1rem; 
                            color: white; 
                            font-weight: 700; 
                            border: 3px solid ${badgeColor}; 
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                            transform: scale(1.05);
                            position: relative;
                            transition: all 0.3s ease;
                        `;
                    } else if (isInProgress || isNext) {
                        // Current in_progress ticket or next to be served - highlighted with animation
                        spanStyle = `
                            padding: 10px 14px; 
                            background: linear-gradient(135deg, ${badgeColor} 0%, ${badgeColor}dd 100%); 
                            border-radius: 8px; 
                            font-size: 1.1rem; 
                            color: white; 
                            font-weight: 800; 
                            border: 3px solid #fff; 
                            box-shadow: 0 6px 20px ${badgeColor}80, 0 0 0 3px ${badgeColor}40;
                            transform: scale(1.1);
                            animation: pulseHighlight 2s ease-in-out infinite;
                            position: relative;
                            z-index: 10;
                        `;
            } else {
                        // Upcoming or other steps - normal style
                        const opacity = isUpcoming && isCurrentStep ? 0.6 : 1;
                        spanStyle = `
                            padding: 8px 12px; 
                            background: ${badgeColor}; 
                            border-radius: 6px; 
                            font-size: 0.9rem; 
                            color: white; 
                            font-weight: 600; 
                            border: 2px solid ${badgeColor}; 
                            opacity: ${opacity};
                            transition: all 0.3s ease;
                        `;
                    }
                    
                    const uniqueStepIndex = globalStepIndex; // Auto-increment step index
                    globalStepIndex++; // Increment for next badge
                    globalPosition++; // Increment global position for next iteration
                    
                    // Determine which class to add: ONLY the currently called (in_progress) ticket gets current-active
                    // Ensure only ONE badge has current-active class (the ticket currently in progress)
                    let badgeClass = '';
                    if (isInProgress || isCurrentlyCalled) {
                        badgeClass = 'current-active'; // ONLY currently called (in_progress) ticket gets current-active
                    } else if (isActive) {
                        badgeClass = 'current-completed'; // Completed tickets
                    }
                    // Note: Next ticket should NOT get current-active - only the actual current ticket
                    
                    orderItems.push(`
                        <span class="sequence-badge ${badgeClass}" 
                              data-step-index="${uniqueStepIndex}" 
                              data-position="${positionInStep}" 
                              data-ticket-type="${step.type}"
                              data-index="${indexNumber}"
                              style="${spanStyle}">
                            <span style="font-size: 0.7rem; opacity: 0.8; margin-right: 4px; font-weight: 600;">${indexNumber}</span>
                            ${isActive ? '<i class="fas fa-check" style="margin-right: 4px; font-size: 0.8rem;"></i>' : ''}${step.type.charAt(0)}
                        </span>
                    `);
                }
                
                if (stepIdx < sortedSequence.length - 1) {
                    orderItems.push('<span style="color: #6c757d; font-weight: bold; margin: 0 4px;">→</span>');
                }
            });
            
            sequenceOrderEl.innerHTML = orderItems.join('');
            
            // Ensure only ONE badge has current-active class (remove any duplicates)
            const allBadgesAfterRender = Array.from(document.querySelectorAll('.sequence-badge'));
            const activeBadges = allBadgesAfterRender.filter(b => b.classList.contains('current-active'));
            
            // If multiple badges have current-active, keep only the first one (or the one matching in_progress ticket)
            if (activeBadges.length > 1) {
                console.warn('Multiple badges with current-active found, cleaning up...');
                // Remove current-active from all
                allBadgesAfterRender.forEach(b => b.classList.remove('current-active'));
                
                // Try to find the badge matching the in_progress ticket
                if (inProgressTicket) {
                    const matchingBadge = allBadgesAfterRender.find(badge => {
                        const badgeIndex = parseInt(badge.getAttribute('data-index')) || 0;
                        const badgeType = badge.getAttribute('data-ticket-type');
                        // Find the badge that matches the in_progress ticket
                        const inProgressGlobalPosition = allTicketsInOrder.findIndex(t => t.id === inProgressTicket.id);
                        return badgeType === inProgressTicket.ticketType && 
                               badgeIndex === inProgressGlobalPosition + 1;
                    });
                    
                    if (matchingBadge) {
                        matchingBadge.classList.add('current-active');
                        updateBadgeStyles();
                        console.log('Restored current-active to in_progress ticket badge');
                    } else {
                        // If no matching badge, use saved state or first badge
                        const savedState = getSavedSequenceState();
                        if (savedState && savedState.dataIndex) {
                            const badgeToActivate = document.querySelector(`.sequence-badge[data-index="${savedState.dataIndex}"]`);
                            if (badgeToActivate) {
                                badgeToActivate.classList.add('current-active');
                                updateBadgeStyles();
                                console.log('Restored current-active from saved state');
                            }
                        }
                    }
                }
            } else if (activeBadges.length === 1) {
                // Only one active badge - ensure it's the correct one
                updateBadgeStyles();
            } else {
                // No active badge - try to restore from saved state or activate first if queue started
                const savedState = getSavedSequenceState();
                if (savedState && savedState.dataIndex) {
                    setTimeout(() => {
                        const badgeToActivate = document.querySelector(`.sequence-badge[data-index="${savedState.dataIndex}"]`);
                        if (badgeToActivate) {
                            badgeToActivate.classList.add('current-active');
                            updateBadgeStyles();
                            console.log('Restored sequence state from localStorage:', savedState);
                        }
                    }, 100);
                } else if (typeof window !== 'undefined' && window.nextBadgeIndex) {
                    setTimeout(() => {
                        activateBadgeByIndex(window.nextBadgeIndex);
                    }, 100);
                }
            }
            
            // Add CSS animation for pulse effect if not already added
            if (!document.getElementById('sequenceOrderPulseStyle')) {
                const style = document.createElement('style');
                style.id = 'sequenceOrderPulseStyle';
                style.textContent = `
                    @keyframes pulseHighlight {
                        0%, 100% {
                            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.5), 0 0 0 3px rgba(102, 126, 234, 0.3);
                            transform: scale(1.1);
                        }
                        50% {
                            box-shadow: 0 8px 25px rgba(102, 126, 234, 0.7), 0 0 0 4px rgba(102, 126, 234, 0.5);
                            transform: scale(1.15);
                        }
                    }
                    .sequence-badge.current-active {
                        animation: pulseHighlight 2s ease-in-out infinite !important;
                    }
                    .sequence-badge:hover {
                        transform: scale(1.05) !important;
                        transition: all 0.2s ease !important;
                    }
                `;
                document.head.appendChild(style);
            }
        }

        if (scheduleId) {
            const state = getSequenceState(scheduleId);
            const totalSteps = sortedSequence.length;
            let idx = state.index % totalSteps;
            if (idx < 0 || idx >= totalSteps) {
                idx = 0;
            }
            let servedInStep = state.served;
            
            // Get all tickets (waiting, in_progress, called) to validate current step
            let waitingTickets = [];
            let allTickets = [];
            try {
                const queueResponse = await fetch(`${PHYSICIAN_API}/queue?scheduleId=${scheduleId}`);
                const queueResult = await queueResponse.json();
                if (queueResult.success && queueResult.data) {
                    allTickets = queueResult.data;
                    waitingTickets = allTickets.filter(t => t.status === 'waiting');
                }
            } catch (e) {
                console.error('Error fetching tickets for validation:', e);
            }
            
            let currentStep = sortedSequence[idx];
            
            // Validate current step: must have tickets available or be in progress
            if (currentStep) {
                const hasWaitingTickets = waitingTickets.some(t => t.ticketType === currentStep.type);
                const hasAnyTickets = allTickets.some(t => t.ticketType === currentStep.type);
                const isInProgress = servedInStep > 0 && servedInStep < currentStep.count;
                
                // If step is completed (served >= count) but no waiting tickets, verify with actual tickets
                if (servedInStep >= currentStep.count && !hasWaitingTickets) {
                    // Check if there are any tickets of this type at all (including in_progress, called, served)
                    const stepTickets = allTickets.filter(t => t.ticketType === currentStep.type);
                    const hasAnyTicketsOfThisType = stepTickets.length > 0;
                    
                    if (!hasAnyTicketsOfThisType) {
                        // No tickets exist at all - reset state (old state was incorrect)
                        console.log(`Step ${currentStep.type} marked as completed but no tickets exist in database, resetting state`);
                        idx = 0;
                        servedInStep = 0;
                        setSequenceState(scheduleId, { index: 0, served: 0 });
                        // Find first step with tickets
                        for (let i = 0; i < totalSteps; i++) {
                            const step = sortedSequence[i];
                            if (step && waitingTickets.some(t => t.ticketType === step.type)) {
                                idx = i;
                                currentStep = step;
                                break;
                            }
                        }
                    } else {
                        // Step is truly completed - move to next step
                        console.log(`Step ${currentStep.type} is completed (${servedInStep}/${currentStep.count}) with no waiting tickets, moving to next step`);
                        const nextIdx = (idx + 1) % totalSteps;
                        const nextStep = sortedSequence[nextIdx];
                        if (nextStep && waitingTickets.some(t => t.ticketType === nextStep.type)) {
                            idx = nextIdx;
                            servedInStep = 0;
                            setSequenceState(scheduleId, { index: nextIdx, served: 0 });
                            currentStep = nextStep;
                        }
                    }
                }
                // If no tickets and not in progress, find next step with tickets
                else if (!hasWaitingTickets && !isInProgress && !hasAnyTickets) {
                    console.log(`Current step ${currentStep.type} has no tickets at all, searching for next available step...`);
                    
                    // Search forward from current index
                    let foundNext = false;
                    for (let attempt = 0; attempt < totalSteps; attempt++) {
                        const nextIdx = (idx + attempt + 1) % totalSteps;
                        const nextStep = sortedSequence[nextIdx];
                        if (nextStep && waitingTickets.some(t => t.ticketType === nextStep.type)) {
                            console.log(`Found next available step: ${nextStep.type} at index ${nextIdx}`);
                            idx = nextIdx;
                            servedInStep = 0;
                            setSequenceState(scheduleId, { index: nextIdx, served: 0 });
                            currentStep = nextStep;
                            foundNext = true;
                            break;
                        }
                    }
                    
                    // If no next step found, search from beginning
                    if (!foundNext) {
                        for (let i = 0; i < totalSteps; i++) {
                            const step = sortedSequence[i];
                            if (step && waitingTickets.some(t => t.ticketType === step.type)) {
                                console.log(`Found available step from beginning: ${step.type} at index ${i}`);
                                idx = i;
                                servedInStep = 0;
                                setSequenceState(scheduleId, { index: i, served: 0 });
                                currentStep = step;
                                foundNext = true;
                                break;
                            }
                        }
                    }
                }
            }
            
            // Calculate remaining based on sequence-badge current-active in DOM, or first badge if queue not started
            let remaining = 0;
            let totalInStep = 0;
            let currentPosition = 0;
            
            const currentActiveSpan = document.querySelector('.sequence-badge.current-active');
            if (currentActiveSpan) {
                // Queue has started - use current-active
                const stepIndex = parseInt(currentActiveSpan.getAttribute('data-step-index')) || 0;
                const positionInStep = parseInt(currentActiveSpan.getAttribute('data-position')) || 0;
                const ticketType = currentActiveSpan.getAttribute('data-ticket-type');
                
                // Find all badges of the same step (same step-index)
                const allBadges = Array.from(document.querySelectorAll('.sequence-badge'));
                const stepBadges = allBadges.filter(badge => 
                    parseInt(badge.getAttribute('data-step-index')) === stepIndex &&
                    badge.getAttribute('data-ticket-type') === ticketType
                );
                
                totalInStep = stepBadges.length;
                currentPosition = positionInStep;
                remaining = totalInStep - currentPosition;
                
                console.log(`Step info from DOM (active): stepIndex=${stepIndex}, position=${currentPosition}/${totalInStep}, remaining=${remaining}`);
            } else {
                // Queue not started yet - use first sequence-badge
                const allBadges = Array.from(document.querySelectorAll('.sequence-badge'));
                if (allBadges.length > 0) {
                    const firstBadge = allBadges[0];
                    const stepIndex = parseInt(firstBadge.getAttribute('data-step-index')) || 0;
                    const ticketType = firstBadge.getAttribute('data-ticket-type');
                    
                    // Find all badges of the same step (first step)
                    const stepBadges = allBadges.filter(badge => 
                        parseInt(badge.getAttribute('data-step-index')) === stepIndex &&
                        badge.getAttribute('data-ticket-type') === ticketType
                    );
                    
                    totalInStep = stepBadges.length;
                    currentPosition = 0; // Not started yet, so position is 0
                    remaining = totalInStep; // All tickets remaining
                    
                    console.log(`Step info from DOM (not started): stepIndex=${stepIndex}, position=0/${totalInStep}, remaining=${remaining}`);
                } else if (currentStep) {
                    // Fallback to old logic if no badges found
                    remaining = currentStep.count - servedInStep;
                    totalInStep = currentStep.count;
                }
            }
            
        }
    } catch (error) {
        console.error('Error displaying calling sequence:', error);
    }
}

// Get color for patient type
function getTypeColor(type) {
    const colors = {
        'Examination': '#007bff',
        'Consultation': '#28a745',
        'Procedure': '#ffc107',
        'Late': '#dc3545'
    };
    return colors[type] || '#6c757d';
}

// Load and display all tickets for selected schedule
async function loadAllTickets() {
    try {
        const loadingEl = document.getElementById('ticketsLoadingState');
        const emptyEl = document.getElementById('ticketsEmptyState');
        const tableContainer = document.getElementById('ticketsTableContainer');
        const tableBody = document.getElementById('ticketsTableBody');
        
        if (!loadingEl || !emptyEl || !tableContainer || !tableBody) return;
        
        // Show loading state
        loadingEl.style.display = 'block';
        emptyEl.style.display = 'none';
        tableContainer.style.display = 'none';
        
        // Get schedule ID
        let scheduleId = selectedScheduleId;
        if (!scheduleId) {
            const username = currentUser.username;
            const email = currentUser.email;
            const queueResponse = await fetch(`${PHYSICIAN_API}/queue?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`);
            const queueResult = await queueResponse.json();
            if (queueResult.success && queueResult.data && queueResult.data.length > 0) {
                scheduleId = queueResult.data[0].scheduleId;
            }
        }
        
        if (!scheduleId) {
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'block';
            emptyEl.innerHTML = `
                <i class="fas fa-calendar-times" style="font-size: 3rem; color: #dee2e6; margin-bottom: 15px;"></i>
                <p style="color: #6c757d; font-size: 1.1rem;">Please select a schedule from the dropdown</p>
            `;
                return;
            }
        
        // Fetch tickets for the schedule
        const response = await fetch(`${PHYSICIAN_API}/queue?scheduleId=${scheduleId}`);
        const result = await response.json();
        
        loadingEl.style.display = 'none';
        
        if (!result.success || !result.data || result.data.length === 0) {
            emptyEl.style.display = 'block';
            tableContainer.style.display = 'none';
            return;
        }
        
        // Store all tickets and reset to page 1
        allTickets = result.data;
        currentTicketsPage = 1;
        
        // Sort tickets by creation date (newest first)
        allTickets.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.created_at || 0);
            const dateB = new Date(b.createdAt || b.created_at || 0);
            return dateB - dateA;
        });
        
        // Render tickets for current page
        renderTicketsPage();
        renderTicketsPagination();
        
    } catch (error) {
        console.error('Error loading tickets:', error);
        const loadingEl = document.getElementById('ticketsLoadingState');
        const emptyEl = document.getElementById('ticketsEmptyState');
        const tableContainer = document.getElementById('ticketsTableContainer');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (emptyEl) {
            emptyEl.style.display = 'block';
            emptyEl.innerHTML = `
                <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #dc3545; margin-bottom: 15px;"></i>
                <p style="color: #6c757d; font-size: 1.1rem;">Error loading tickets: ${error.message}</p>
            `;
        }
        if (tableContainer) tableContainer.style.display = 'none';
        if (document.getElementById('ticketsPagination')) {
            document.getElementById('ticketsPagination').style.display = 'none';
        }
    }
}

// Render tickets for current page
function renderTicketsPage() {
    const tableBody = document.getElementById('ticketsTableBody');
    const tableContainer = document.getElementById('ticketsTableContainer');
    const emptyEl = document.getElementById('ticketsEmptyState');
    
    if (!tableBody) return;
    
    // Show table container if we have tickets
    if (allTickets.length > 0 && tableContainer) {
        tableContainer.style.display = 'block';
    }
    if (emptyEl) {
        emptyEl.style.display = 'none';
    }
    
    tableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (currentTicketsPage - 1) * TICKETS_PER_PAGE;
    const endIndex = startIndex + TICKETS_PER_PAGE;
    const pageTickets = allTickets.slice(startIndex, endIndex);
    
    pageTickets.forEach(ticket => {
            const ticketPrefix = getTicketPrefix(ticket.ticketType);
            const formattedTicketNumber = `${ticketPrefix}${(ticket.sequenceNumber || ticket.sequence_number || 0).toString().padStart(3, '0')}`;
            const typeColor = getTypeColor(ticket.ticketType);
            
            // Format dates
            const printedAt = ticket.printedAt || ticket.printed_at;
            const printedAtFormatted = printedAt ? new Date(printedAt).toLocaleString() : '-';
            
            // Status badge color
            let statusColor = '#6c757d';
            let statusBg = '#f8f9fa';
            switch(ticket.status) {
                case 'waiting':
                    statusColor = '#ffc107';
                    statusBg = '#fff3cd';
                    break;
                case 'called':
                    statusColor = '#007bff';
                    statusBg = '#cfe2ff';
                    break;
                case 'in_progress':
                    statusColor = '#0d6efd';
                    statusBg = '#cfe2ff';
                    break;
                case 'completed':
                    statusColor = '#28a745';
                    statusBg = '#d4edda';
                    break;
                case 'served':
                    statusColor = '#28a745';
                    statusBg = '#d4edda';
                    break;
                default:
                    statusColor = '#6c757d';
                    statusBg = '#f8f9fa';
            }
            
            const row = document.createElement('tr');
            
            // Modern styling for called/completed tickets
            const isCalled = ticket.status === 'called' || ticket.status === 'in_progress' || ticket.status === 'completed';
            if (isCalled) {
                row.className = 'ticket-called-row';
                row.style.cssText = `
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-left: 4px solid #fff;
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
                    transition: all 0.3s ease;
                    position: relative;
                    animation: slideInRight 0.5s ease-out;
                `;
                row.addEventListener('mouseenter', function() {
                    this.style.transform = 'translateX(5px)';
                    this.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
                });
                row.addEventListener('mouseleave', function() {
                    this.style.transform = 'translateX(0)';
                    this.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                });
                
                        } else {
                row.style.borderBottom = '1px solid #dee2e6';
            }
            
            // Adjust text colors for called tickets
            const iconColor = isCalled ? '#fff' : '#6c757d';
            const badgeBg = isCalled ? 'rgba(255, 255, 255, 0.2)' : typeColor;
            const badgeTextColor = isCalled ? '#fff' : 'white';
            const typeBadgeBg = isCalled ? 'rgba(255, 255, 255, 0.15)' : `${typeColor}20`;
            const typeBadgeColor = isCalled ? '#fff' : typeColor;
            const statusBadgeBg = isCalled ? 'rgba(255, 255, 255, 0.2)' : statusBg;
            const statusBadgeColor = isCalled ? '#fff' : statusColor;
            
            row.innerHTML = `
                <td style="padding: 12px; ${isCalled ? 'color: white; position: relative;' : ''}">
                    ${isCalled ? '<div style="position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,1) 100%); animation: pulseIndicator 2s infinite; pointer-events: none;"></div>' : ''}
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="padding: 4px 10px; background: ${badgeBg}; color: ${badgeTextColor}; border-radius: 4px; font-weight: 700; font-size: 0.9rem; ${isCalled ? 'backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);' : ''}">
                            ${formattedTicketNumber}
                        </span>
                    </div>
                </td>
                <td style="padding: 12px; ${isCalled ? 'color: white;' : ''}">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-user" style="color: ${iconColor};"></i>
                        <span style="${isCalled ? 'color: white;' : ''}">${ticket.patientCode || ticket.patient_code || 'N/A'}</span>
                    </div>
                </td>
                <td style="padding: 12px; ${isCalled ? 'color: white;' : ''}">
                    <span style="padding: 4px 10px; background: ${typeBadgeBg}; color: ${typeBadgeColor}; border-radius: 4px; font-weight: 600; font-size: 0.85rem; ${isCalled ? 'backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);' : ''}">
                        ${ticket.ticketType || 'N/A'}
                    </span>
                </td>
                <td style="padding: 12px; ${isCalled ? 'color: white;' : ''}">
                    <span style="padding: 4px 10px; background: ${statusBadgeBg}; color: ${statusBadgeColor}; border-radius: 4px; font-weight: 600; font-size: 0.85rem; text-transform: capitalize; ${isCalled ? 'backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.3);' : ''}">
                        <i class="fas fa-bell" style="margin-right: 4px; ${isCalled ? 'animation: ring 2s infinite;' : ''}"></i>
                        ${ticket.status || 'N/A'}
                    </span>
                </td>
                <td style="padding: 12px; color: ${isCalled ? 'white' : '#6c757d'}; font-size: 0.9rem;">
                    ${printedAtFormatted}
                </td>
            `;
            
            tableBody.appendChild(row);
        });
}

// Render pagination controls
function renderTicketsPagination() {
    const paginationEl = document.getElementById('ticketsPagination');
    const pageNumbersEl = document.getElementById('ticketsPageNumbers');
    const prevBtn = document.getElementById('ticketsPrevBtn');
    const nextBtn = document.getElementById('ticketsNextBtn');
    const pageInfoStart = document.getElementById('ticketsPageInfoStart');
    const pageInfoEnd = document.getElementById('ticketsPageInfoEnd');
    const pageInfoTotal = document.getElementById('ticketsPageInfoTotal');
    
    if (!paginationEl || !pageNumbersEl || !prevBtn || !nextBtn) return;
    
    const totalTickets = allTickets.length;
    const totalPages = Math.ceil(totalTickets / TICKETS_PER_PAGE);
    
    if (totalTickets === 0) {
        paginationEl.style.display = 'none';
        return;
    }
    
    paginationEl.style.display = 'block';
    
    // Update page info
    const start = totalTickets === 0 ? 0 : (currentTicketsPage - 1) * TICKETS_PER_PAGE + 1;
    const end = Math.min(currentTicketsPage * TICKETS_PER_PAGE, totalTickets);
    if (pageInfoStart) pageInfoStart.textContent = start;
    if (pageInfoEnd) pageInfoEnd.textContent = end;
    if (pageInfoTotal) pageInfoTotal.textContent = totalTickets;
    
    // Update prev/next buttons
    prevBtn.disabled = currentTicketsPage === 1;
    nextBtn.disabled = currentTicketsPage === totalPages;
    
    // Style disabled buttons
    if (prevBtn.disabled) {
        prevBtn.style.opacity = '0.5';
        prevBtn.style.cursor = 'not-allowed';
                    } else {
        prevBtn.style.opacity = '1';
        prevBtn.style.cursor = 'pointer';
                    }
            
    if (nextBtn.disabled) {
        nextBtn.style.opacity = '0.5';
        nextBtn.style.cursor = 'not-allowed';
        } else {
        nextBtn.style.opacity = '1';
        nextBtn.style.cursor = 'pointer';
    }
    
    // Render page numbers
    pageNumbersEl.innerHTML = '';
    
    // Show up to 5 page numbers
    let startPage = Math.max(1, currentTicketsPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust if we're near the end
    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }
    
    // First page
    if (startPage > 1) {
        const btn = createPageButton(1);
        pageNumbersEl.appendChild(btn);
        if (startPage > 2) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '8px 4px';
            ellipsis.style.color = '#6c757d';
            pageNumbersEl.appendChild(ellipsis);
        }
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
        const btn = createPageButton(i);
        pageNumbersEl.appendChild(btn);
    }
    
    // Last page
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const ellipsis = document.createElement('span');
            ellipsis.textContent = '...';
            ellipsis.style.padding = '8px 4px';
            ellipsis.style.color = '#6c757d';
            pageNumbersEl.appendChild(ellipsis);
        }
        const btn = createPageButton(totalPages);
        pageNumbersEl.appendChild(btn);
    }
}

// Create page number button
function createPageButton(pageNum) {
    const btn = document.createElement('button');
    btn.textContent = pageNum;
    btn.className = 'pagination-page-btn';
    const isActive = pageNum === currentTicketsPage;
    
    if (isActive) {
        btn.style.padding = '8px 16px';
        btn.style.background = '#007bff';
        btn.style.color = '#fff';
        btn.style.border = '1px solid #007bff';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = '700';
        btn.style.minWidth = '40px';
    } else {
        btn.style.padding = '8px 16px';
        btn.style.background = '#fff';
        btn.style.color = '#007bff';
        btn.style.border = '1px solid #dee2e6';
        btn.style.borderRadius = '8px';
        btn.style.cursor = 'pointer';
        btn.style.fontWeight = '600';
        btn.style.minWidth = '40px';
        btn.style.transition = 'all 0.3s ease';
        
        btn.addEventListener('mouseenter', function() {
            if (!isActive) {
                this.style.background = '#f8f9fa';
                this.style.borderColor = '#007bff';
            }
        });
        
        btn.addEventListener('mouseleave', function() {
            if (!isActive) {
                this.style.background = '#fff';
                this.style.borderColor = '#dee2e6';
            }
        });
    }
    
    btn.addEventListener('click', function() {
        if (!isActive) {
            currentTicketsPage = pageNum;
            renderTicketsPage();
            renderTicketsPagination();
        }
    });
    
    return btn;
}

// Setup pagination event listeners
function setupTicketsPaginationListeners() {
    const prevBtn = document.getElementById('ticketsPrevBtn');
    const nextBtn = document.getElementById('ticketsNextBtn');
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            if (currentTicketsPage > 1) {
                currentTicketsPage--;
                renderTicketsPage();
                renderTicketsPagination();
            }
        });
    }
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            const totalPages = Math.ceil(allTickets.length / TICKETS_PER_PAGE);
            if (currentTicketsPage < totalPages) {
                currentTicketsPage++;
                renderTicketsPage();
                renderTicketsPagination();
            }
        });
    }
}

// Sequence state helpers (per schedule)
function getSequenceState(scheduleId) {
    try {
        const raw = localStorage.getItem(`queueSequenceState_${scheduleId}`);
        if (raw) {
            const parsed = JSON.parse(raw);
            return { index: Number(parsed.index) || 0, served: Number(parsed.served) || 0 };
        }
    } catch {}
    return { index: 0, served: 0 };
}

// Reset sequence state - useful when configuration changes
function resetSequenceState(scheduleId) {
    try {
        localStorage.setItem(`queueSequenceState_${scheduleId}`, JSON.stringify({ index: 0, served: 0 }));
        console.log(`Sequence state reset for schedule ${scheduleId}`);
    } catch (error) {
        console.error('Error resetting sequence state:', error);
    }
}

function setSequenceState(scheduleId, state) {
    try {
        localStorage.setItem(`queueSequenceState_${scheduleId}` , JSON.stringify({ index: state.index || 0, served: state.served || 0 }));
    } catch {}
}

async function onTicketCalled(scheduleId, ticketType) {
    try {
        console.log(`=== onTicketCalled ===`);
        console.log(`Called ticket type: ${ticketType}, scheduleId: ${scheduleId}`);
        
        // Get sequence from database configuration
        const sequence = await getProfessionalSequence(scheduleId);
        if (!sequence || sequence.length === 0) {
            console.warn('No sequence found');
            return;
        }
        
        // Ensure sequence is sorted by priority
        const sortedSequence = [...sequence].sort((a, b) => (a.priority || 0) - (b.priority || 0));
        const totalSteps = sortedSequence.length;
        
        const state = getSequenceState(scheduleId);
        console.log(`Current state before update:`, { index: state.index, served: state.served });
        
        // Find the step index for the called ticket type
        const foundIdx = sortedSequence.findIndex(s => s.type === ticketType);
        if (foundIdx < 0) {
            console.warn(`Ticket type ${ticketType} not found in sequence, resetting to start`);
            setSequenceState(scheduleId, { index: 0, served: 0 });
            return;
        }
        
        const currentStep = sortedSequence[foundIdx];
        if (!currentStep) {
            console.warn(`Step at index ${foundIdx} is null`);
            return;
        }
        
        console.log(`Found step at index ${foundIdx}: ${currentStep.type} (priority ${currentStep.priority}, count ${currentStep.count})`);
        
        // Check if this is the current step we're serving
        let served = 1;
        if (foundIdx === state.index) {
            // This is the current step - increment served
            served = state.served + 1;
            console.log(`  This is current step - incrementing served: ${state.served} -> ${served}`);
        } else {
            // This is a different step - we're starting a new step
            console.log(`  This is a NEW step - switching from index ${state.index} to ${foundIdx}`);
            console.log(`  Previous step was: ${state.index >= 0 && state.index < totalSteps ? sortedSequence[state.index].type : 'unknown'}`);
            served = 1;
        }
        
        const quota = currentStep.count || 1;
        console.log(`  Ticket called: ${ticketType}, served: ${served}/${quota}`);
        
        if (served >= quota) {
            // Step is complete - move to next step in priority order
            const nextIndex = (foundIdx + 1) % totalSteps;
            const nextStep = sortedSequence[nextIndex];
            console.log(`✓ Step ${currentStep.type} COMPLETE (${served}/${quota})`);
            console.log(`  Moving to next step: index ${foundIdx} -> ${nextIndex} (${nextStep ? nextStep.type : 'wrap around'})`);
            setSequenceState(scheduleId, { index: nextIndex, served: 0 });
        } else {
            // Step not complete - stay on same step with updated served count
            console.log(`  Step ${currentStep.type} NOT complete - staying at index ${foundIdx}`);
            console.log(`  Updated served: ${state.served} -> ${served}`);
            setSequenceState(scheduleId, { index: foundIdx, served });
        }
        
        const newState = getSequenceState(scheduleId);
        console.log(`New state after update:`, { index: newState.index, served: newState.served });
    } catch (error) {
        console.error('Error updating sequence state:', error);
    }
}

// Show current configuration in modal
async function showCurrentConfiguration() {
    try {
        let scheduleId = selectedScheduleId;
        if (!scheduleId) {
            const username = currentUser.username;
            const email = currentUser.email;
            const queueResponse = await fetch(`${PHYSICIAN_API}/queue?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`);
            const queueResult = await queueResponse.json();
            if (queueResult.success && queueResult.data && queueResult.data.length > 0) {
                scheduleId = queueResult.data[0].scheduleId;
            }
        }
        
        let configData = null;
        let url = `${CALLING_SEQUENCE_API}/default`;
        if (scheduleId) {
            url = `${CALLING_SEQUENCE_API}/schedule/${scheduleId}`;
        }
        
        try {
            const response = await fetch(url);
            const result = await response.json();
            if (result.success && result.data) {
                configData = {
                    sequence: result.data.sequence || [],
                    settings: result.data.settings || {
                        autoRepeat: true,
                        callTimeout: 5,
                        trackDuration: true
                    }
                };
            }
        } catch (e) {
            console.error('Error fetching from API, trying localStorage:', e);
            // Fallback to localStorage
            const savedConfig = localStorage.getItem('queueConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            if (config.sequence) {
                const sequenceItems = Object.entries(config.sequence).map(([type, data]) => ({
                    type: type.charAt(0).toUpperCase() + type.slice(1),
                    count: data.count || 1,
                    priority: data.priority || 1
                })).sort((a, b) => a.priority - b.priority);
                configData = {
                    sequence: sequenceItems,
                    settings: config.settings || {
                        autoRepeat: true,
                        callTimeout: 5,
                        trackDuration: true
                    }
                };
                }
            }
        }
        
        // Create modal
        createConfigurationModal(configData);
        
    } catch (error) {
        console.error('Error showing current configuration:', error);
        showNotification('Error loading configuration: ' + error.message, 'error');
    }
}

// Create configuration modal
function createConfigurationModal(configData) {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'config-modal-overlay';
    modalOverlay.id = 'configModal';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'config-modal';
    
    let sequenceHtml = '';
    let settingsHtml = '';
    
    if (configData) {
        // Generate sequence HTML
        configData.sequence.forEach((item, index) => {
            sequenceHtml += `
                <div class="config-sequence-item">
                    <div class="sequence-number">${index + 1}</div>
                    <div class="sequence-info">
                        <div class="sequence-type">${item.type}</div>
                        <div class="sequence-details">
                            <span class="sequence-count">Count: ${item.count}</span>
                            <span class="sequence-priority">Priority: ${item.priority}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        // Generate settings HTML
        settingsHtml = `
            <div class="config-settings">
                <h4>Settings</h4>
                <div class="setting-item">
                    <span class="setting-label">Auto Repeat:</span>
                    <span class="setting-value ${configData.settings.autoRepeat ? 'enabled' : 'disabled'}">
                        ${configData.settings.autoRepeat ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">Call Timeout:</span>
                    <span class="setting-value">${configData.settings.callTimeout} minutes</span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">Duration Tracking:</span>
                    <span class="setting-value ${configData.settings.trackDuration ? 'enabled' : 'disabled'}">
                        ${configData.settings.trackDuration ? 'Enabled' : 'Disabled'}
                    </span>
                </div>
            </div>
        `;
    } else {
        // Default configuration
        sequenceHtml = `
            <div class="config-sequence-item">
                <div class="sequence-number">1</div>
                <div class="sequence-info">
                    <div class="sequence-type">Examination</div>
                    <div class="sequence-details">
                        <span class="sequence-count">Count: 2</span>
                        <span class="sequence-priority">Priority: 1</span>
                    </div>
                </div>
            </div>
            <div class="config-sequence-item">
                <div class="sequence-number">2</div>
                <div class="sequence-info">
                    <div class="sequence-type">Consultation</div>
                    <div class="sequence-details">
                        <span class="sequence-count">Count: 1</span>
                        <span class="sequence-priority">Priority: 2</span>
                    </div>
                </div>
            </div>
            <div class="config-sequence-item">
                <div class="sequence-number">3</div>
                <div class="sequence-info">
                    <div class="sequence-type">Procedure</div>
                    <div class="sequence-details">
                        <span class="sequence-count">Count: 1</span>
                        <span class="sequence-priority">Priority: 3</span>
                    </div>
                </div>
            </div>
            <div class="config-sequence-item">
                <div class="sequence-number">4</div>
                <div class="sequence-info">
                    <div class="sequence-type">Late</div>
                    <div class="sequence-details">
                        <span class="sequence-count">Count: 2</span>
                        <span class="sequence-priority">Priority: 4</span>
                    </div>
                </div>
            </div>
        `;
        
        settingsHtml = `
            <div class="config-settings">
                <h4>Default Settings</h4>
                <div class="setting-item">
                    <span class="setting-label">Auto Repeat:</span>
                    <span class="setting-value enabled">Enabled</span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">Call Timeout:</span>
                    <span class="setting-value">5 minutes</span>
                </div>
                <div class="setting-item">
                    <span class="setting-label">Duration Tracking:</span>
                    <span class="setting-value enabled">Enabled</span>
                </div>
            </div>
        `;
    }
    
    let html = `
        <div class="modal-header">
            <h3><i class="fas fa-eye"></i> Current Configuration</h3>
            <button class="modal-close-btn" id="closeConfigModal">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="modal-body">
            <div class="config-content">
                <div class="config-section">
                    <h4><i class="fas fa-list-ol"></i> Calling Sequence</h4>
                    <div class="sequence-container">
                        ${sequenceHtml}
                    </div>
                </div>
                
                ${settingsHtml}
            </div>
        </div>
        
        <div class="modal-footer">
            <button class="config-btn config-btn-primary" id="closeConfigModal">
                <i class="fas fa-check"></i> Close
            </button>
        </div>
    `;
    
    modalContent.innerHTML = html;
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Add event listeners
    const closeBtns = document.querySelectorAll('#closeConfigModal');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            modalOverlay.remove();
        });
    });
    
    // Close modal when clicking overlay
    modalOverlay.addEventListener('click', function(e) {
        if (e.target === modalOverlay) {
            modalOverlay.remove();
        }
    });
}

// Professional sequence logic to get next patient
async function getNextPatientBySequence(scheduleId) {
    try {
        // Get all waiting tickets for this specific schedule
        console.log('Getting tickets for scheduleId:', scheduleId);
        const response = await fetch(`${PHYSICIAN_API}/queue?scheduleId=${scheduleId}`);
        const result = await response.json();
        console.log('Queue response for scheduleId:', result);
        
        if (!result.success || !result.data || result.data.length === 0) {
            return null;
        }
        
        const waitingTickets = result.data.filter(ticket => ticket.status === 'waiting');
        
        if (waitingTickets.length === 0) {
            return null;
        }
        
        // Load professional sequence from API
        const sequence = await getProfessionalSequence(scheduleId);
        if (!sequence || sequence.length === 0) {
            return waitingTickets[0] || null;
        }

        // Ensure sequence is sorted by priority
        const sortedSequence = [...sequence].sort((a, b) => (a.priority || 0) - (b.priority || 0));

        // Use per-schedule rotating sequence state stored in localStorage
        const state = getSequenceState(scheduleId);
        const totalSteps = sortedSequence.length;
        
        // Debug logging
        console.log('=== getNextPatientBySequence ===');
        console.log('Sequence state:', { index: state.index, served: state.served });
        console.log('Sorted sequence:', sortedSequence.map(s => `${s.type} (priority: ${s.priority}, count: ${s.count})`));
        console.log('Waiting tickets:', waitingTickets.map(t => `${t.ticketType}${t.sequenceNumber}`));
        
        // STEP 1: Check if we're actively serving a step (respecting COUNT)
        // Rule: If served > 0 and served < count, we MUST complete this step first
        if (state.index >= 0 && state.index < totalSteps) {
            const currentStep = sortedSequence[state.index];
            const isActivelyServing = (currentStep && state.served > 0 && state.served < currentStep.count);
            
            if (isActivelyServing) {
                // We're actively serving this step - MUST find ticket of this type
                const candidate = waitingTickets.find(t => t.ticketType === currentStep.type);
                if (candidate) {
                    console.log(`✓ STEP 1: Found ${currentStep.type} ticket from ACTIVE step (${state.served}/${currentStep.count})`);
                    console.log(`  Rule: Must complete ${currentStep.count} ${currentStep.type} before moving to next`);
                    return candidate;
                } else {
                    console.log(`✗ STEP 1: Current step ${currentStep.type} has no waiting tickets (${state.served}/${currentStep.count})`);
                    // Step is actively being served but no tickets - continue to find alternative
                }
            }
        }
        
        // STEP 2: Find the step with HIGHEST PRIORITY (lowest priority number) that can be served
        // Rules:
        // - Always start from priority 1 (index 0)
        // - Only choose a step if it has waiting tickets
        // - Skip steps that are actively being served (already checked in STEP 1)
        // - If current step is complete (served >= count) or not started (served = 0), we can choose any available step
        
        let selectedStep = null;
        let selectedTicket = null;
        let selectedIndex = -1;
        
        // Iterate through steps in priority order (1, 2, 3, ...)
        for (let i = 0; i < totalSteps; i++) {
            const step = sortedSequence[i];
            if (!step) continue;
            
            // Skip if this is the active incomplete step (already checked in STEP 1)
            if (state.index >= 0 && state.index < totalSteps && 
                i === state.index && state.served > 0 && state.served < sortedSequence[state.index].count) {
                console.log(`  Skipping index ${i} (${step.type}) - actively serving`);
                continue;
            }
            
            // Check if this step has waiting tickets
            const candidate = waitingTickets.find(t => t.ticketType === step.type);
            if (!candidate) {
                console.log(`  No tickets for ${step.type} (priority ${step.priority})`);
                continue;
            }
            
            // Determine if we can serve this step:
            // - If it's different from current step: YES (we can start it)
            // - If it's current step but served = 0: YES (we haven't started it yet)
            // - If it's current step but served >= count: YES (we completed it, can start fresh)
            // - If it's current step and 0 < served < count: NO (already checked in STEP 1, shouldn't reach here)
            
            const isCurrentStep = (i === state.index);
            const isCurrentStepComplete = (isCurrentStep && state.served >= step.count);
            const isCurrentStepNotStarted = (isCurrentStep && state.served === 0);
            const isDifferentStep = (i !== state.index);
            
            const canServe = isDifferentStep || isCurrentStepNotStarted || isCurrentStepComplete;
            
            if (canServe) {
                // Found a valid step - this is the first (highest priority) we found
                selectedStep = step;
                selectedTicket = candidate;
                selectedIndex = i;
                console.log(`✓ STEP 2: Selected ${step.type} (priority ${step.priority}, index ${i}, count: ${step.count})`);
                console.log(`  Reason: ${isDifferentStep ? 'Different step' : isCurrentStepNotStarted ? 'Current step not started' : 'Current step complete'}`);
                break; // Take first valid step (highest priority)
            }
        }
        
        if (selectedTicket) {
            // Update state to selected step if it's different
            if (selectedIndex !== state.index) {
                console.log(`  Updating state: index ${state.index} -> ${selectedIndex}`);
                setSequenceState(scheduleId, { index: selectedIndex, served: 0 });
            }
            
            return selectedTicket;
        }
        
        console.log('No matching ticket found in sequence, returning first waiting ticket');

        // Fallback: return first waiting if none match sequence types
        return waitingTickets[0];
        
    } catch (error) {
        console.error('Error getting next patient by sequence:', error);
        return null;
    }
}



// Display queue statistics
function displayQueueStats() {
    const elements = {
        examination: document.getElementById('examinationCount'),
        consultation: document.getElementById('consultationCount'),
        procedure: document.getElementById('procedureCount'),
        late: document.getElementById('lateCount')
    };
    
    Object.keys(elements).forEach(key => {
        if (elements[key]) {
            elements[key].textContent = queueStats[key] || 0;
        }
    });
    
    
    // Update current patient in progress
    loadCurrentPatientInProgress();
    
    // Update next ticket info
    // Update statistics and sequence details in real-time
    refreshPerTypeBreakdown();
    displayCallingSequence();
}

// Setup event listeners
function setupEventListeners() {
    // Action buttons removed
    
    // Call Next Ticket button
    const callNextTicketBtn = document.getElementById('callNextTicketBtn');
    if (callNextTicketBtn) {
        callNextTicketBtn.addEventListener('click', callNextTicket);
    }
    
    // Reset called -> waiting button
    const resetCalledBtn = document.getElementById('resetCalledBtn');
    if (resetCalledBtn) {
        resetCalledBtn.addEventListener('click', resetCalledTicketsForSchedule);
        }
        
        // System info toggle
        const toggleSystemInfoBtn = document.getElementById('toggleSystemInfo');
        const systemInfoContent = document.getElementById('systemInfoContent');
        if (toggleSystemInfoBtn && systemInfoContent) {
            toggleSystemInfoBtn.addEventListener('click', function() {
                systemInfoContent.classList.toggle('expanded');
                toggleSystemInfoBtn.classList.toggle('rotated');
            });
        }
        
        // View current configuration button
        const viewCurrentConfigBtn = document.getElementById('viewCurrentConfigBtn');
        if (viewCurrentConfigBtn) {
            viewCurrentConfigBtn.addEventListener('click', showCurrentConfiguration);
        }
        
        // Refresh tickets button
        const refreshTicketsBtn = document.getElementById('refreshTicketsBtn');
        if (refreshTicketsBtn) {
            refreshTicketsBtn.addEventListener('click', loadAllTickets);
        }
        
        // Setup pagination listeners
        setupTicketsPaginationListeners();
}


// Delete all today's tickets for current schedule
async function resetCalledTicketsForSchedule() {
    const btn = document.getElementById('resetCalledBtn');
    try {
        if (btn) btn.disabled = true;
        showLoading('Deleting tickets...');

        // Global truncate option
        const doTruncateAll = window.confirm('Delete ALL tickets across ALL schedules and ALL days? This cannot be undone.');
        if (doTruncateAll) {
            const resp = await fetch(`${PHYSICIAN_API}/delete-tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({ truncate: true })
            });
            const json = await resp.json();
            if (!resp.ok || !json.success) {
                showNotification('Failed to truncate tickets', 'error');
            } else {
                showNotification('All tickets deleted (truncate)', 'success');
            }
            await loadQueueStats();
            await refreshPerTypeBreakdown();
            await loadAllTickets();
            return;
        }

        const username = currentUser.username;
        const email = currentUser.email;
        let scheduleId = selectedScheduleId;
        if (!scheduleId) {
            const queueResponse = await fetch(`${PHYSICIAN_API}/queue?username=${encodeURIComponent(username)}&email=${encodeURIComponent(email)}`);
            const queueResult = await queueResponse.json();
            if (queueResult.success && queueResult.data && queueResult.data.length > 0) {
                scheduleId = queueResult.data[0].scheduleId;
            }
        }
        if (!scheduleId) {
            showNotification('No schedule selected to reset', 'warning');
            return;
        }

        const resp = await fetch(`${PHYSICIAN_API}/delete-tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ scheduleId })
        });
        const json = await resp.json();
        if (!resp.ok || !json.success) {
            showNotification('Failed to delete tickets', 'error');
            return;
        }
        showNotification(`Deleted ${json.deleted || 0} ticket(s)`, 'success');
        await loadQueueStats();
        await refreshPerTypeBreakdown();
        await displayCallingSequence(); // Update sequence details
        await loadAllTickets();
    } catch (e) {
        console.error('Error deleting tickets:', e);
        showNotification('Error deleting tickets: ' + e.message, 'error');
    } finally {
        hideLoading();
        if (btn) btn.disabled = false;
    }
}




// Start visit timer
function startVisitTimer() {
    if (visitTimer) {
        clearInterval(visitTimer);
    }
    // Do not override visitStartTime here; it should be set from calledAt before starting
    visitTimer = setInterval(() => {
        updateVisitTimer();
    }, 1000);
}

// Update visit timer
function updateVisitTimer() {
    if (!visitStartTime) return;
    
    const now = new Date();
    const elapsed = now - visitStartTime;
    
    const hours = Math.floor(elapsed / (1000 * 60 * 60));
    const minutes = Math.floor((elapsed % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((elapsed % (1000 * 60)) / 1000);
    
    const timerDisplay = document.getElementById('visitTimer');
    if (timerDisplay) {
        timerDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}






// Start auto-refresh
function startAutoRefresh() {
    // Refresh queue, statistics, and sequence details every 10 seconds
    setInterval(async () => {
        try {
            await loadQueueStats();
            await loadCurrentPatientInProgress();
            await refreshPerTypeBreakdown();
            await displayCallingSequence(); // Update sequence details with current progress
        } catch (error) {
            console.error('Error in auto-refresh:', error);
        }
    }, 10000); // Refresh every 10 seconds for more real-time updates
}

// Format date and time
function formatDateTime(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch (error) {
        return 'Invalid Date';
    }
}

// Loading functions
function showLoading(message = 'Loading...') {
    const loadingOverlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (loadingOverlay) {
        if (loadingText) {
            loadingText.textContent = message;
        }
        loadingOverlay.style.display = 'flex';
    } else {
        showNotification(message, 'info');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Notification system
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    // Add styles if not already added
    if (!document.getElementById('notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                min-width: 300px;
                max-width: 500px;
                padding: 16px;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                animation: slideIn 0.3s ease-out;
            }
            .notification-success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
            }
            .notification-error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
            }
            .notification-warning {
                background: #fff3cd;
                color: #856404;
                border: 1px solid #ffeaa7;
            }
            .notification-info {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            .notification-close {
                background: none;
                border: none;
                color: inherit;
                cursor: pointer;
                padding: 4px;
                margin-left: auto;
            }
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        case 'info': return 'info-circle';
        default: return 'info-circle';
    }
}
