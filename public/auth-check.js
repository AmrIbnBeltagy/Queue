// Immediate authentication check - Include this script in head of all protected pages
(function() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('currentUser');
    
    if (!token || !user) {
        // Use replace to prevent back button issues
        window.location.replace('login.html');
    } else {
        // Show page after authentication verified
        document.addEventListener('DOMContentLoaded', function() {
            document.body.classList.add('authenticated');
        });
    }
})();

