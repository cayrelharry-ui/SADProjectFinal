document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin
    const userRole = localStorage.getItem('userRole');
    if (!userRole) {
        window.location.href = '../HTML/LogIn.html';
        return;
    }

    if (userRole !== 'admin') {
        alert('Access denied. Admin privileges required.');
        window.location.href = '../HTML/LogIn.html';
        return;
    }

    // Initialize the admin panel
    initializeAdminPanel(userRole);
});

function initializeAdminPanel(userRole) {
    // Set user role in the UI
    document.getElementById('currentUserRole').textContent = userRole;
    document.getElementById('userRoleDisplay').textContent = userRole;
    
    // Set user permissions
    setUserPermissions(userRole);
    
    // Load initial data
    loadDashboardData();
    loadAllUsers();
    loadPendingApprovals();
    
    // Set up event listeners
    setupEventListeners();
    
    // Set up section navigation
    setupSectionNavigation();
}

function setupEventListeners() {
    // Logout handler
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to logout?')) {
            localStorage.removeItem('userRole');
            localStorage.removeItem('userName');
            window.location.href = '../HTML/LogIn.html';
        }
    });
}

function setupSectionNavigation() {
    const sections = {
        'dashboard': { title: 'Admin Dashboard', element: 'dashboard-section' },
        'user-management': { title: 'User Management', element: 'user-management-section' },
        'approvals': { title: 'Pending Approvals', element: 'approvals-section' },
        'content': { title: 'Content Management', element: 'content-section' },
        'analytics': { title: 'Analytics Dashboard', element: 'analytics-section' },
        'settings': { title: 'System Settings', element: 'settings-section' }
    };

    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionKey = this.getAttribute('data-section');
            const section = sections[sectionKey];
            
            if (section) {
                // Update section title
                document.getElementById('sectionTitle').textContent = section.title;
                
                // Hide all sections
                document.querySelectorAll('.section-content').forEach(el => {
                    el.classList.add('d-none');
                });
                
                // Show selected section
                document.getElementById(section.element).classList.remove('d-none');
                
                // Update active state in sidebar
                document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Refresh data if needed
                if (sectionKey === 'user-management') {
                    loadAllUsers();
                } else if (sectionKey === 'approvals') {
                    loadPendingApprovals();
                } else if (sectionKey === 'dashboard') {
                    loadDashboardData();
                }
                
                showStatus(`Navigated to ${section.title}`);
            }
        });
    });
}

function setUserPermissions(role) {
    const permissionsElement = document.getElementById('userPermissions');
    if (role === 'admin') {
        permissionsElement.textContent = 'Manage all users, content, groups, and system settings. Access all analytics and reports.';
    } else {
        permissionsElement.textContent = 'Limited access. Admin privileges required for full functionality.';
    }
}

// Dashboard Functions
function loadDashboardData() {
    fetch('../PHP/GetDashboardStats.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateDashboardStats(data.stats);
                updateRecentActivity(data.recentActivity || []);
            } else {
                showStatus('Error loading dashboard data: ' + data.message, 'error');
            }
        })
        .catch(err => {
            console.error('Dashboard error:', err);
            showStatus('Error loading dashboard data', 'error');
        });
}

function updateDashboardStats(stats) {
    document.getElementById('activeUsersCount').textContent = stats.active_users || 0;
    document.getElementById('pendingUsersCount').textContent = stats.pending_users || 0;
    document.getElementById('totalUsersCount').textContent = stats.total_users || 0;
    document.getElementById('inactiveUsersCount').textContent = stats.inactive_users || 0;
    
    // Update pending count badge
    const pendingBadge = document.getElementById('pendingCountBadge');
    if (stats.pending_users > 0) {
        pendingBadge.textContent = stats.pending_users;
        pendingBadge.classList.remove('d-none');
    } else {
        pendingBadge.classList.add('d-none');
    }
}

function updateRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    
    if (activities.length === 0) {
        container.innerHTML = '<div class="list-group-item text-muted text-center">No recent activity</div>';
        return;
    }
    
    let html = '';
    activities.forEach(activity => {
        html += `
        <div class="list-group-item">
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1">${activity.action}</h6>
                <small class="text-muted">${activity.timestamp}</small>
            </div>
            <p class="mb-1">${activity.description}</p>
            <small class="text-muted">By: ${activity.user}</small>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

// User Management Functions
function loadAllUsers() {
    fetch('../PHP/GetAllUsers.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateUsersTable(data.users);
            } else {
                showStatus('Error loading users: ' + data.message, 'error');
            }
        })
        .catch(err => {
            console.error('Users error:', err);
            showStatus('Error loading users', 'error');
        });
}

function updateUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No users found</td></tr>';
        return;
    }
    
    let html = '';
    users.forEach(user => {
        const statusBadge = user.status === 'active' ? 
            '<span class="badge bg-success">Active</span>' : 
            '<span class="badge bg-warning">Inactive</span>';
        
        const actions = user.status === 'active' ? 
            `<button class="btn btn-warning btn-sm" onclick="deactivateUser(${user.user_id})">Deactivate</button>` :
            `<button class="btn btn-success btn-sm" onclick="activateUser(${user.user_id})">Activate</button>`;
        
        html += `
        <tr>
            <td>${user.user_id}</td>
            <td>${user.full_name}</td>
            <td>${user.email}</td>
            <td><span class="badge bg-secondary">${user.role}</span></td>
            <td>${statusBadge}</td>
            <td>${user.created_at}</td>
            <td>${actions}</td>
        </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Pending Approvals Functions
function loadPendingApprovals() {
    fetch('../PHP/GetAccounts.php?status=inactive')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updatePendingApprovals(data.accounts);
            } else {
                showStatus('Error loading pending approvals: ' + data.message, 'error');
            }
        })
        .catch(err => {
            console.error('Pending approvals error:', err);
            showStatus('Error loading pending approvals', 'error');
        });
}

function updatePendingApprovals(accounts) {
    const container = document.getElementById('pendingApprovals');
    
    if (accounts.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">No pending approvals</p>';
        return;
    }
    
    let html = '';
    accounts.forEach(account => {
        html += `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h6 class="card-title">${account.full_name}</h6>
                        <p class="card-text mb-1">
                            <i class="bi bi-envelope"></i> ${account.email}<br>
                            <i class="bi bi-person-badge"></i> ${account.role}<br>
                            <i class="bi bi-calendar"></i> Created: ${account.created_at}
                        </p>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-success btn-sm" onclick="approveAccount(${account.user_id})">
                            <i class="bi bi-check-lg"></i> Approve
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectAccount(${account.user_id})">
                            <i class="bi bi-x-lg"></i> Reject
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

// Account Management Functions
function approveAccount(userId) {
    if (confirm('Are you sure you want to approve this account?')) {
        updateAccountStatus(userId, 'active', 'Account approved successfully!');
    }
}

function rejectAccount(userId) {
    if (confirm('Are you sure you want to reject this account? This action cannot be undone.')) {
        updateAccountStatus(userId, 'rejected', 'Account rejected successfully!');
    }
}

function activateUser(userId) {
    if (confirm('Are you sure you want to activate this user?')) {
        updateAccountStatus(userId, 'active', 'User activated successfully!');
    }
}

function deactivateUser(userId) {
    if (confirm('Are you sure you want to deactivate this user?')) {
        updateAccountStatus(userId, 'inactive', 'User deactivated successfully!');
    }
}

function updateAccountStatus(userId, status, successMessage) {
    fetch('../PHP/UpdateAccountStatus.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `user_id=${userId}&status=${status}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showStatus(successMessage, 'success');
            // Refresh all relevant data
            loadDashboardData();
            loadAllUsers();
            loadPendingApprovals();
        } else {
            showStatus('Error: ' + data.message, 'error');
        }
    })
    .catch(err => {
        console.error('Update status error:', err);
        showStatus('Error updating account status', 'error');
    });
}

function refreshUserData() {
    showStatus('Refreshing user data...', 'info');
    loadDashboardData();
    loadAllUsers();
    loadPendingApprovals();
}

// Utility Functions
function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    const alertElement = document.getElementById('statusAlert');
    
    statusElement.textContent = message;
    
    // Update alert type
    alertElement.className = 'alert mt-4';
    switch(type) {
        case 'success':
            alertElement.classList.add('alert-success');
            break;
        case 'error':
            alertElement.classList.add('alert-danger');
            break;
        case 'warning':
            alertElement.classList.add('alert-warning');
            break;
        default:
            alertElement.classList.add('alert-info');
    }
    
    // Auto-clear status after 5 seconds for info messages
    if (type === 'info') {
        setTimeout(() => {
            statusElement.textContent = 'Ready';
            alertElement.className = 'alert alert-info mt-4';
        }, 5000);
    }
}