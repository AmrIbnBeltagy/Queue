// DOM Utilities for handling global header compatibility
class DOMUtils {
    // Wait for global header to be loaded
    static waitForGlobalHeader() {
        return new Promise((resolve) => {
            const checkHeader = () => {
                // Check if common elements exist (indicating global header is loaded)
                const body = document.body;
                const hasGlobalHeader = body && body.querySelector('.main-nav');
                
                if (hasGlobalHeader) {
                    resolve();
                } else {
                    // Wait a bit more and try again
                    setTimeout(checkHeader, 100);
                }
            };
            checkHeader();
        });
    }

    // Safe event listener attachment with null checks
    static safeAddEventListener(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
            return true;
        }
        return false;
    }

    // Safe text content setting
    static safeSetTextContent(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
            return true;
        }
        return false;
    }

    // Safe value setting
    static safeSetValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.value = value;
            return true;
        }
        return false;
    }

    // Safe innerHTML setting
    static safeSetInnerHTML(elementId, html) {
        const element = document.getElementById(elementId);
        if (element) {
            element.innerHTML = html;
            return true;
        }
        return false;
    }

    // Safe class operations
    static safeAddClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.add(className);
            return true;
        }
        return false;
    }

    static safeRemoveClass(elementId, className) {
        const element = document.getElementById(elementId);
        if (element) {
            element.classList.remove(className);
            return true;
        }
        return false;
    }

    // Safe style setting
    static safeSetStyle(elementId, property, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.style[property] = value;
            return true;
        }
        return false;
    }

    // Initialize page with global header compatibility
    static async initializePage(initFunction) {
        document.addEventListener('DOMContentLoaded', async function() {
            // Wait for global header to load
            await DOMUtils.waitForGlobalHeader();
            
            // Add a small delay to ensure all elements are ready
            setTimeout(initFunction, 50);
        });
    }
}

// Make DOMUtils globally available
window.DOMUtils = DOMUtils;





