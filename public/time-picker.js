/**
 * Time Picker Utility
 * Provides enhanced time picker functionality with validation and formatting
 */

class TimePicker {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.options = {
            format: '12h', // '12h' or '24h'
            step: 15, // minutes step
            minTime: '00:00',
            maxTime: '23:59',
            placeholder: 'Select time',
            showSeconds: false,
            ...options
        };
        
        this.init();
    }

    init() {
        this.createTimePicker();
        this.bindEvents();
    }

    createTimePicker() {
        const fromTimeInput = this.container.querySelector('input[name="startTime"]');
        const toTimeInput = this.container.querySelector('input[name="endTime"]');
        
        if (fromTimeInput) {
            this.enhanceTimeInput(fromTimeInput, 'startTime');
        }
        
        if (toTimeInput) {
            this.enhanceTimeInput(toTimeInput, 'endTime');
        }
    }

    enhanceTimeInput(input, name) {
        // Set input type to time for native time picker
        input.type = 'time';
        input.step = this.options.step * 60; // Convert minutes to seconds
        
        // Add time picker classes
        input.classList.add('time-picker-input');
        
        // Add validation
        input.addEventListener('blur', () => this.validateTime(input, name));
        input.addEventListener('input', () => this.formatTime(input));
        
        // Add time picker container if not exists
        if (!input.closest('.time-picker-container')) {
            this.wrapInContainer(input);
        }
    }

    wrapInContainer(input) {
        const container = document.createElement('div');
        container.className = 'time-picker-container';
        
        const label = document.createElement('span');
        label.className = 'time-picker-label';
        label.textContent = input.name === 'startTime' ? 'From:' : 'To:';
        
        input.parentNode.insertBefore(container, input);
        container.appendChild(label);
        container.appendChild(input);
    }

    formatTime(input) {
        let value = input.value;
        
        if (this.options.format === '12h' && value) {
            // Convert 24h to 12h format
            const [hours, minutes] = value.split(':');
            const hour24 = parseInt(hours);
            const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
            const ampm = hour24 >= 12 ? 'PM' : 'AM';
            const formattedTime = `${hour12}:${minutes} ${ampm}`;
            
            // Update display but keep original value for form submission
            input.setAttribute('data-display', formattedTime);
        }
    }

    validateTime(input, name) {
        const value = input.value;
        if (!value) return;

        const time = this.parseTime(value);
        if (!time) {
            this.showError(input, 'Invalid time format');
            return;
        }

        // Check time range
        if (this.options.minTime && this.isTimeBefore(time, this.parseTime(this.options.minTime))) {
            this.showError(input, `Time must be after ${this.options.minTime}`);
            return;
        }

        if (this.options.maxTime && this.isTimeAfter(time, this.parseTime(this.options.maxTime))) {
            this.showError(input, `Time must be before ${this.options.maxTime}`);
            return;
        }

        // Check if end time is after start time
        if (name === 'endTime') {
            const startInput = this.container.querySelector('input[name="startTime"]');
            if (startInput && startInput.value) {
                const startTime = this.parseTime(startInput.value);
                if (startTime && this.isTimeBefore(time, startTime)) {
                    this.showError(input, 'End time must be after start time');
                    return;
                }
            }
        }

        this.clearError(input);
    }

    parseTime(timeString) {
        if (!timeString) return null;
        
        const timeRegex = /^(\d{1,2}):(\d{2})(?:\s?(AM|PM))?$/i;
        const match = timeString.match(timeRegex);
        
        if (!match) return null;
        
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const ampm = match[3];
        
        if (ampm) {
            if (ampm.toUpperCase() === 'PM' && hours !== 12) {
                hours += 12;
            } else if (ampm.toUpperCase() === 'AM' && hours === 12) {
                hours = 0;
            }
        }
        
        return { hours, minutes };
    }

    isTimeBefore(time1, time2) {
        if (!time1 || !time2) return false;
        return time1.hours < time2.hours || 
               (time1.hours === time2.hours && time1.minutes < time2.minutes);
    }

    isTimeAfter(time1, time2) {
        if (!time1 || !time2) return false;
        return time1.hours > time2.hours || 
               (time1.hours === time2.hours && time1.minutes > time2.minutes);
    }

    showError(input, message) {
        input.classList.add('is-invalid');
        input.classList.remove('is-valid');
        
        // Remove existing error message
        const existingError = input.parentNode.querySelector('.time-picker-error');
        if (existingError) {
            existingError.remove();
        }
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'time-picker-error';
        errorDiv.style.cssText = 'color: #dc3545; font-size: 12px; margin-top: 4px;';
        errorDiv.textContent = message;
        
        input.parentNode.appendChild(errorDiv);
    }

    clearError(input) {
        input.classList.remove('is-invalid');
        input.classList.add('is-valid');
        
        const errorDiv = input.parentNode.querySelector('.time-picker-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    bindEvents() {
        // Add keyboard navigation
        this.container.addEventListener('keydown', (e) => {
            if (e.target.classList.contains('time-picker-input')) {
                this.handleKeyboard(e);
            }
        });
    }

    handleKeyboard(e) {
        const input = e.target;
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.incrementTime(input);
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.decrementTime(input);
                break;
            case 'Tab':
                // Allow normal tab behavior
                break;
        }
    }

    incrementTime(input) {
        const time = this.parseTime(input.value);
        if (!time) return;
        
        time.minutes += this.options.step;
        if (time.minutes >= 60) {
            time.minutes = 0;
            time.hours = (time.hours + 1) % 24;
        }
        
        input.value = this.formatTimeValue(time);
        this.validateTime(input, input.name);
    }

    decrementTime(input) {
        const time = this.parseTime(input.value);
        if (!time) return;
        
        time.minutes -= this.options.step;
        if (time.minutes < 0) {
            time.minutes = 60 - this.options.step;
            time.hours = time.hours === 0 ? 23 : time.hours - 1;
        }
        
        input.value = this.formatTimeValue(time);
        this.validateTime(input, input.name);
    }

    formatTimeValue(time) {
        const hours = time.hours.toString().padStart(2, '0');
        const minutes = time.minutes.toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    // Public methods
    getValue() {
        const startTime = this.container.querySelector('input[name="startTime"]')?.value;
        const endTime = this.container.querySelector('input[name="endTime"]')?.value;
        return { startTime, endTime };
    }

    setValue(startTime, endTime) {
        const startInput = this.container.querySelector('input[name="startTime"]');
        const endInput = this.container.querySelector('input[name="endTime"]');
        
        if (startInput && startTime) {
            startInput.value = startTime;
            this.formatTime(startInput);
        }
        
        if (endInput && endTime) {
            endInput.value = endTime;
            this.formatTime(endInput);
        }
    }

    clear() {
        const inputs = this.container.querySelectorAll('.time-picker-input');
        inputs.forEach(input => {
            input.value = '';
            this.clearError(input);
        });
    }
}

// Auto-initialize time pickers
document.addEventListener('DOMContentLoaded', function() {
    // Initialize all time picker containers
    const timePickerContainers = document.querySelectorAll('.time-picker-container, .time-range-picker, .time-picker-grid');
    
    timePickerContainers.forEach(container => {
        new TimePicker(container, {
            format: '24h',
            step: 15,
            minTime: '06:00',
            maxTime: '23:59'
        });
    });
});

// Export for use in other scripts
window.TimePicker = TimePicker;
