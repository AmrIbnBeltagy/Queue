// Enhanced Alert System
class AlertSystem {
    constructor() {
        this.alerts = [];
        this.maxAlerts = 3;
    }

    show(message, type = 'info', duration = 5000) {
        // Remove oldest alert if we have too many
        if (this.alerts.length >= this.maxAlerts) {
            this.remove(this.alerts[0]);
        }

        const alertId = 'alert-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        const alert = this.createAlert(alertId, message, type);
        
        this.alerts.push(alertId);
        document.body.appendChild(alert);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                this.remove(alertId);
            }, duration);
        }

        return alertId;
    }

    createAlert(id, message, type) {
        const alert = document.createElement('div');
        alert.id = id;
        alert.className = `alert-message ${type}`;
        
        const icon = this.getIcon(type);
        const closeBtn = this.createCloseButton(id);
        
        alert.innerHTML = `
            <div class="icon">${icon}</div>
            <div class="content">${message}</div>
        `;
        
        alert.appendChild(closeBtn);
        return alert;
    }

    getIcon(type) {
        const icons = {
            success: '<i class="fas fa-check-circle"></i>',
            error: '<i class="fas fa-exclamation-circle"></i>',
            warning: '<i class="fas fa-exclamation-triangle"></i>',
            info: '<i class="fas fa-info-circle"></i>'
        };
        return icons[type] || icons.info;
    }

    createCloseButton(alertId) {
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '<i class="fas fa-times"></i>';
        closeBtn.onclick = () => this.remove(alertId);
        return closeBtn;
    }

    remove(alertId) {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.classList.add('slide-out');
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
                this.alerts = this.alerts.filter(id => id !== alertId);
            }, 300);
        }
    }

    success(message, duration = 5000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 7000) {
        return this.show(message, 'error', duration);
    }

    warning(message, duration = 6000) {
        return this.show(message, 'warning', duration);
    }

    info(message, duration = 4000) {
        return this.show(message, 'info', duration);
    }

    clear() {
        this.alerts.forEach(alertId => this.remove(alertId));
    }
}

// Create global instance
window.alertSystem = new AlertSystem();

// Enhanced notification functions
function showSuccessAlert(message, duration = 5000) {
    return window.alertSystem.success(message, duration);
}

function showErrorAlert(message, duration = 7000) {
    return window.alertSystem.error(message, duration);
}

function showWarningAlert(message, duration = 6000) {
    return window.alertSystem.warning(message, duration);
}

function showInfoAlert(message, duration = 4000) {
    return window.alertSystem.info(message, duration);
}

// Override existing showNotification function for backward compatibility
function showNotification(message, type = 'info') {
    const duration = type === 'error' ? 7000 : type === 'warning' ? 6000 : type === 'success' ? 5000 : 4000;
    return window.alertSystem.show(message, type, duration);
}






