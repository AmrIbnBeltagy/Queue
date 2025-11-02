// Professional Queue Management Configuration
// Modern and simplified queue configuration system

// Professional queue sequence configuration
const PROFESSIONAL_SEQUENCE = {
    examination: { count: 2, priority: 1, name: 'Examination' },
    consultation: { count: 1, priority: 2, name: 'Consultation' },
    procedure: { count: 1, priority: 3, name: 'Procedure' },
    late: { count: 2, priority: 4, name: 'Late Arrivals' }
};

// Display professional queue configuration as modal
function displayQueueConfiguration() {
    // Create modal overlay
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'queue-config-modal-overlay';
    modalOverlay.id = 'queueConfigModal';
    
    // Create modal content
    const modalContent = document.createElement('div');
    modalContent.className = 'queue-config-modal';
    
    let html = `
        <div class="modal-header">
            <h3><i class="fas fa-cogs"></i> Professional Queue Management</h3>
            <button class="modal-close-btn" id="closeQueueConfigModal">
                <i class="fas fa-times"></i>
            </button>
        </div>
        
        <div class="modal-body">
            <div class="queue-config-container">
                <div class="queue-sequence-section">
                    <h4><i class="fas fa-list-ol"></i> Patient Calling Sequence</h4>
                    <p>Configure the order, count, and priority for calling patients</p>
                    
                    <div class="sequence-config">
                        <div class="sequence-item" data-type="examination">
                            <div class="sequence-info">
                                <span class="sequence-type examination">Examination</span>
                                <span class="sequence-description">Regular patient examinations</span>
                            </div>
                            <div class="sequence-controls">
                                <div class="control-group">
                                    <label>Count: </label>
                                    <input type="number" id="examinationCount" value="2" min="1" max="10" class="count-input">
                                </div>
                                <div class="control-group">
                                    <label>Priority: </label>
                                    <select id="examinationPriority" class="priority-select">
                                        <option value="1">1 - Highest</option>
                                        <option value="2">2 - High</option>
                                        <option value="3">3 - Medium</option>
                                        <option value="4">4 - Low</option>
                                    </select>
                                </div>
                                <div class="priority-actions">
                                    <button class="priority-btn priority-up" data-type="examination" title="Move Up">
                                        <i class="fas fa-arrow-up"></i>
                                    </button>
                                    <button class="priority-btn priority-down" data-type="examination" title="Move Down">
                                        <i class="fas fa-arrow-down"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="sequence-item" data-type="consultation">
                            <div class="sequence-info">
                                <span class="sequence-type consultation">Consultation</span>
                                <span class="sequence-description">Patient consultations</span>
                            </div>
                            <div class="sequence-controls">
                                <div class="control-group">
                                    <label>Count: </label>
                                    <input type="number" id="consultationCount" value="1" min="1" max="10" class="count-input">
                                </div>
                                <div class="control-group">
                                    <label>Priority: </label>
                                    <select id="consultationPriority" class="priority-select">
                                        <option value="1">1 - Highest</option>
                                        <option value="2" selected>2 - High</option>
                                        <option value="3">3 - Medium</option>
                                        <option value="4">4 - Low</option>
                                    </select>
                                </div>
                                <div class="priority-actions">
                                    <button class="priority-btn priority-up" data-type="consultation" title="Move Up">
                                        <i class="fas fa-arrow-up"></i>
                                    </button>
                                    <button class="priority-btn priority-down" data-type="consultation" title="Move Down">
                                        <i class="fas fa-arrow-down"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="sequence-item" data-type="procedure">
                            <div class="sequence-info">
                                <span class="sequence-type procedure">Procedure</span>
                                <span class="sequence-description">Medical procedures</span>
                            </div>
                            <div class="sequence-controls">
                                <div class="control-group">
                                    <label>Count: </label>
                                    <input type="number" id="procedureCount" value="1" min="1" max="10" class="count-input">
                                </div>
                                <div class="control-group">
                                    <label>Priority: </label>
                                    <select id="procedurePriority" class="priority-select">
                                        <option value="1">1 - Highest</option>
                                        <option value="2">2 - High</option>
                                        <option value="3" selected>3 - Medium</option>
                                        <option value="4">4 - Low</option>
                                    </select>
                                </div>
                                <div class="priority-actions">
                                    <button class="priority-btn priority-up" data-type="procedure" title="Move Up">
                                        <i class="fas fa-arrow-up"></i>
                                    </button>
                                    <button class="priority-btn priority-down" data-type="procedure" title="Move Down">
                                        <i class="fas fa-arrow-down"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div class="sequence-item" data-type="late">
                            <div class="sequence-info">
                                <span class="sequence-type late">Late Arrivals</span>
                                <span class="sequence-description">Patients who arrived late</span>
                            </div>
                            <div class="sequence-controls">
                                <div class="control-group">
                                    <label>Count: </label>
                                    <input type="number" id="lateCount" value="2" min="1" max="10" class="count-input">
                                </div>
                                <div class="control-group">
                                    <label>Priority: </label>
                                    <select id="latePriority" class="priority-select">
                                        <option value="1">1 - Highest</option>
                                        <option value="2">2 - High</option>
                                        <option value="3">3 - Medium</option>
                                        <option value="4" selected>4 - Low</option>
                                    </select>
                                </div>
                                <div class="priority-actions">
                                    <button class="priority-btn priority-up" data-type="late" title="Move Up">
                                        <i class="fas fa-arrow-up"></i>
                                    </button>
                                    <button class="priority-btn priority-down" data-type="late" title="Move Down">
                                        <i class="fas fa-arrow-down"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="queue-settings-section">
                    <h4><i class="fas fa-sliders-h"></i> Queue Settings</h4>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <label>Auto Repeat Sequence</label>
                            <p>Automatically restart the sequence when all patients are called</p>
                        </div>
                        <div class="setting-control">
                            <input type="checkbox" id="autoRepeat" checked>
                        </div>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <label>Call Timeout (minutes)</label>
                            <p>Maximum time to wait for a patient to respond</p>
                        </div>
                        <div class="setting-control">
                            <input type="number" id="callTimeout" value="5" min="1" max="30" class="timeout-input">
                        </div>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <label>Visit Duration Tracking</label>
                            <p>Track and display patient visit duration</p>
                        </div>
                        <div class="setting-control">
                            <input type="checkbox" id="trackDuration" checked>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="modal-footer">
            <div class="config-actions">
                <button class="config-btn config-btn-primary" id="saveQueueConfigBtn">
                    <i class="fas fa-save"></i> Save Configuration
                </button>
                <button class="config-btn config-btn-secondary" id="resetQueueConfigBtn">
                    <i class="fas fa-undo"></i> Reset to Defaults
                </button>
                <button class="config-btn config-btn-info" id="testQueueConfigBtn">
                    <i class="fas fa-play"></i> Test Sequence
                </button>
                <button class="config-btn config-btn-danger" id="closeQueueConfigModal">
                    <i class="fas fa-times"></i> Close
                </button>
            </div>
        </div>
    `;
    
    modalContent.innerHTML = html;
    modalOverlay.appendChild(modalContent);
    document.body.appendChild(modalOverlay);
    
    // Add event listeners
    setupQueueConfigEventListeners();
}

// Setup event listeners for queue configuration
function setupQueueConfigEventListeners() {
    // Save configuration button
    const saveBtn = document.getElementById('saveQueueConfigBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveQueueConfiguration);
    }
    
    // Reset configuration button
    const resetBtn = document.getElementById('resetQueueConfigBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', resetQueueConfiguration);
    }
    
    // Test sequence button
    const testBtn = document.getElementById('testQueueConfigBtn');
    if (testBtn) {
        testBtn.addEventListener('click', testQueueSequence);
    }
    
    // Close modal buttons
    const closeBtns = document.querySelectorAll('#closeQueueConfigModal');
    closeBtns.forEach(btn => {
        btn.addEventListener('click', closeQueueConfigModal);
    });
    
    // Priority up/down buttons
    const priorityUpBtns = document.querySelectorAll('.priority-up');
    priorityUpBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            movePriorityUp(this.dataset.type);
        });
    });
    
    const priorityDownBtns = document.querySelectorAll('.priority-down');
    priorityDownBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            movePriorityDown(this.dataset.type);
        });
    });
    
    // Priority select changes
    const prioritySelects = document.querySelectorAll('.priority-select');
    prioritySelects.forEach(select => {
        select.addEventListener('change', function() {
            updatePriorityOrder();
        });
    });
    
    // Close modal when clicking overlay
    const modalOverlay = document.getElementById('queueConfigModal');
    if (modalOverlay) {
        modalOverlay.addEventListener('click', function(e) {
            if (e.target === modalOverlay) {
                closeQueueConfigModal();
            }
        });
    }
}

// Save queue configuration
async function saveQueueConfiguration() {
    try {
        showLoading('Saving queue configuration...');
        
        // Build sequence array in the format expected by API
        const sequence = [
            {
                type: 'Examination',
                count: parseInt(document.getElementById('examinationCount').value),
                priority: parseInt(document.getElementById('examinationPriority').value)
            },
            {
                type: 'Consultation',
                count: parseInt(document.getElementById('consultationCount').value),
                priority: parseInt(document.getElementById('consultationPriority').value)
            },
            {
                type: 'Procedure',
                count: parseInt(document.getElementById('procedureCount').value),
                priority: parseInt(document.getElementById('procedurePriority').value)
            },
            {
                type: 'Late',
                count: parseInt(document.getElementById('lateCount').value),
                priority: parseInt(document.getElementById('latePriority').value)
            }
        ];
        
        const settings = {
            autoRepeat: document.getElementById('autoRepeat').checked,
            callTimeout: parseInt(document.getElementById('callTimeout').value),
            trackDuration: document.getElementById('trackDuration').checked
        };
        
        // Check if default sequence exists
        let existingDefault = null;
        try {
            const checkResponse = await fetch(`${API_BASE_URL}/calling-sequences/default`);
            const checkResult = await checkResponse.json();
            if (checkResult.success && checkResult.data && checkResult.data._id) {
                existingDefault = checkResult.data;
            }
        } catch (e) {
            // No existing default, will create new one
        }
        
        // Prepare data for API
        const configData = {
            name: 'Default Calling Sequence',
            description: 'Default calling sequence for patient queue management',
            sequence: sequence,
            settings: settings,
            isDefault: true,
            scheduleId: null // Global default, not schedule-specific
        };
        
        // Save to database via API (POST for new, PUT for update)
        let response;
        if (existingDefault && existingDefault._id) {
            // Update existing default
            response = await fetch(`${API_BASE_URL}/calling-sequences/${existingDefault._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configData)
            });
        } else {
            // Create new default
            response = await fetch(`${API_BASE_URL}/calling-sequences`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(configData)
            });
        }
        
        const result = await response.json();
        
        if (result.success) {
            // Also save to localStorage as backup
            const localStorageConfig = {
                sequence: {
                    examination: { count: sequence[0].count, priority: sequence[0].priority },
                    consultation: { count: sequence[1].count, priority: sequence[1].priority },
                    procedure: { count: sequence[2].count, priority: sequence[2].priority },
                    late: { count: sequence[3].count, priority: sequence[3].priority }
                },
                settings: settings
            };
            localStorage.setItem('queueConfig', JSON.stringify(localStorageConfig));
            
            const action = existingDefault ? 'updated' : 'saved';
            showNotification(`Queue configuration ${action} successfully to database!`, 'success');
        } else {
            throw new Error(result.message || 'Failed to save configuration');
        }
        
    } catch (error) {
        console.error('Error saving queue configuration:', error);
        showNotification('Error saving configuration: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Reset queue configuration to defaults
function resetQueueConfiguration() {
    if (confirm('Are you sure you want to reset to default configuration?')) {
        document.getElementById('examinationCount').value = 2;
        document.getElementById('consultationCount').value = 1;
        document.getElementById('procedureCount').value = 1;
        document.getElementById('lateCount').value = 2;
        document.getElementById('autoRepeat').checked = true;
        document.getElementById('callTimeout').value = 5;
        document.getElementById('trackDuration').checked = true;
        
        showNotification('Configuration reset to defaults', 'info');
    }
}

// Test queue sequence
function testQueueSequence() {
    const sequence = [];
    
    // Get all sequence items with their priorities
    const items = [
        { type: 'examination', count: parseInt(document.getElementById('examinationCount').value), priority: parseInt(document.getElementById('examinationPriority').value) },
        { type: 'consultation', count: parseInt(document.getElementById('consultationCount').value), priority: parseInt(document.getElementById('consultationPriority').value) },
        { type: 'procedure', count: parseInt(document.getElementById('procedureCount').value), priority: parseInt(document.getElementById('procedurePriority').value) },
        { type: 'late', count: parseInt(document.getElementById('lateCount').value), priority: parseInt(document.getElementById('latePriority').value) }
    ];
    
    // Sort by priority
    items.sort((a, b) => a.priority - b.priority);
    
    // Build sequence
    items.forEach(item => {
        for (let i = 0; i < item.count; i++) {
            sequence.push(item.type.charAt(0).toUpperCase() + item.type.slice(1));
        }
    });
    
    const sequenceText = sequence.join(' → ');
    showNotification(`Test Sequence: ${sequenceText}`, 'info');
}

// Load queue configuration from API
async function loadQueueConfiguration() {
    try {
        // First try to load from API
        try {
            const response = await fetch(`${API_BASE_URL}/calling-sequences/default`);
            const result = await response.json();
            
            if (result.success && result.data && result.data.sequence) {
                const sequence = result.data.sequence;
                
                // Find each type in the sequence array
                const examination = sequence.find(s => s.type === 'Examination');
                const consultation = sequence.find(s => s.type === 'Consultation');
                const procedure = sequence.find(s => s.type === 'Procedure');
                const late = sequence.find(s => s.type === 'Late');
                
                // Load counts
                if (examination) {
                    document.getElementById('examinationCount').value = examination.count || 2;
                    document.getElementById('examinationPriority').value = examination.priority || 1;
                }
                if (consultation) {
                    document.getElementById('consultationCount').value = consultation.count || 1;
                    document.getElementById('consultationPriority').value = consultation.priority || 2;
                }
                if (procedure) {
                    document.getElementById('procedureCount').value = procedure.count || 1;
                    document.getElementById('procedurePriority').value = procedure.priority || 3;
                }
                if (late) {
                    document.getElementById('lateCount').value = late.count || 2;
                    document.getElementById('latePriority').value = late.priority || 4;
                }
                
                // Load settings
                if (result.data.settings) {
                    document.getElementById('autoRepeat').checked = result.data.settings.autoRepeat !== false;
                    document.getElementById('callTimeout').value = result.data.settings.callTimeout || 5;
                    document.getElementById('trackDuration').checked = result.data.settings.trackDuration !== false;
                }
                
                // Update priority order
                updatePriorityOrder();
                return;
            }
        } catch (apiError) {
            console.log('API not available, loading from localStorage:', apiError);
        }
        
        // Fallback to localStorage
        const savedConfig = localStorage.getItem('queueConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            
            if (config.sequence) {
                // Load counts
                document.getElementById('examinationCount').value = config.sequence.examination?.count || 2;
                document.getElementById('consultationCount').value = config.sequence.consultation?.count || 1;
                document.getElementById('procedureCount').value = config.sequence.procedure?.count || 1;
                document.getElementById('lateCount').value = config.sequence.late?.count || 2;
                
                // Load priorities
                document.getElementById('examinationPriority').value = config.sequence.examination?.priority || 1;
                document.getElementById('consultationPriority').value = config.sequence.consultation?.priority || 2;
                document.getElementById('procedurePriority').value = config.sequence.procedure?.priority || 3;
                document.getElementById('latePriority').value = config.sequence.late?.priority || 4;
                
                // Update priority order
                updatePriorityOrder();
            }
            
            if (config.settings) {
                document.getElementById('autoRepeat').checked = config.settings.autoRepeat !== false;
                document.getElementById('callTimeout').value = config.settings.callTimeout || 5;
                document.getElementById('trackDuration').checked = config.settings.trackDuration !== false;
            }
        }
    } catch (error) {
        console.error('Error loading queue configuration:', error);
    }
}

// Close queue configuration modal
function closeQueueConfigModal() {
    const modal = document.getElementById('queueConfigModal');
    if (modal) {
        modal.remove();
    }
}

// Move priority up
function movePriorityUp(type) {
    const currentSelect = document.getElementById(`${type}Priority`);
    const currentPriority = parseInt(currentSelect.value);
    
    if (currentPriority > 1) {
        const newPriority = currentPriority - 1;
        currentSelect.value = newPriority;
        updatePriorityOrder();
    }
}

// Move priority down
function movePriorityDown(type) {
    const currentSelect = document.getElementById(`${type}Priority`);
    const currentPriority = parseInt(currentSelect.value);
    
    if (currentPriority < 4) {
        const newPriority = currentPriority + 1;
        currentSelect.value = newPriority;
        updatePriorityOrder();
    }
}

// Update priority order and reorder items
function updatePriorityOrder() {
    const sequenceContainer = document.querySelector('.sequence-config');
    const items = Array.from(sequenceContainer.children);
    
    // Sort items by priority
    items.sort((a, b) => {
        const aPriority = parseInt(document.getElementById(`${a.dataset.type}Priority`).value);
        const bPriority = parseInt(document.getElementById(`${b.dataset.type}Priority`).value);
        return aPriority - bPriority;
    });
    
    // Reorder DOM elements
    items.forEach(item => {
        sequenceContainer.appendChild(item);
    });
    
    // Update priority badges
    items.forEach((item, index) => {
        const priorityBadge = item.querySelector('.priority-badge');
        if (priorityBadge) {
            priorityBadge.textContent = `Priority ${index + 1}`;
        }
    });
}

// Initialize queue configuration
function initializeQueueConfiguration() {
    displayQueueConfiguration();
    loadQueueConfiguration();
}
