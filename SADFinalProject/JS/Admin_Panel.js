document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in
    const userRole = localStorage.getItem('userRole');
    if (!userRole) {
        window.location.href = '../HTML/LogIn.html';
        return;
    }
    
    // Set user role in the UI
    document.getElementById('currentUserRole').textContent = userRole;
    document.getElementById('userRoleDisplay').textContent = userRole;
    
    // Set user permissions based on role
    setUserPermissions(userRole);
    
    // Update UI based on user role
    updateUIForRole(userRole);
    
    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', function() {
        localStorage.removeItem('userRole');
        window.location.href = '../HTML/LogIn.html';
    });
    
    // Button handlers
    document.getElementById('manageBtn').addEventListener('click', function() {
        showStatus('Settings management opened');
    });
    
    document.getElementById('viewDashboardBtn').addEventListener('click', function() {
        showStatus('Dashboard view opened');
    });
    
    document.getElementById('exportBtn').addEventListener('click', function() {
        showStatus('Data export initiated');
    });
    
    // Sidebar navigation
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showStatus(`Navigated to ${section} section`);
            
            // Update active state
            document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    function setUserPermissions(role) {
        const permissionsElement = document.getElementById('userPermissions');
        let permissions = '';
        
        switch(role) {
            case 'admin':
                permissions = 'Manage all users, content, groups, and system settings. Access all analytics and reports.';
                break;
            case 'faculty':
                permissions = 'Manage course content, view student data, and access teaching analytics.';
                break;
            case 'coordinator':
                permissions = 'Manage groups, schedule events, and view group analytics.';
                break;
            case 'public':
                permissions = 'View public content and submit proposals. Limited access to analytics.';
                break;
            default:
                permissions = 'Basic viewing permissions.';
        }
        
        permissionsElement.textContent = permissions;
    }
    
    function updateUIForRole(role) {
        // Enable/disable buttons based on role
        const manageBtn = document.getElementById('manageBtn');
        const exportBtn = document.getElementById('exportBtn');
        
        switch(role) {
            case 'admin':
                manageBtn.disabled = false;
                exportBtn.disabled = false;
                break;
            case 'faculty':
                manageBtn.disabled = false;
                exportBtn.disabled = true;
                break;
            case 'coordinator':
                manageBtn.disabled = true;
                exportBtn.disabled = false;
                break;
            case 'public':
                manageBtn.disabled = true;
                exportBtn.disabled = true;
                break;
        }
    }
    
    function showStatus(message) {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        
        // Auto-clear status after 3 seconds
        setTimeout(() => {
            statusElement.textContent = 'Ready';
        }, 3000);
    }
});