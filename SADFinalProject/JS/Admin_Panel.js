// Admin_Panel.js - COMPLETE VERSION WITH STATISTICS
import { 
    supabase, 
    logout as supabaseLogout, 
    getCurrentUser,
    getAllUsers,
    getPendingUsers,
    approveUser,
    rejectUser,
    updateUserStatus
} from './db_connection.js';

// Import the upload functions
import {
    uploadFiles,
    getUploadedFiles,
    deleteFile,
    downloadFile,
    formatFileSize,
    getFileIcon,
    getFileAccessBadge,
    initializeFileUploadForm
} from './UploadFile.js';

// Import the Statistics module
import {
    loadStatistics,
    updateStatisticsUI,
    drawCharts,
    refreshStatistics
} from './Statistics.js';

document.addEventListener('DOMContentLoaded', async function() {
    console.log("👑 Admin Panel Initializing...");
    
    // Check if user is logged in and is admin
    const user = getCurrentUser();
    
    if (!user) {
        console.log("❌ No user session, redirecting to login");
        window.location.href = '../HTML/LogIn.html';
        return;
    }
    
    if (user.role !== 'admin') {
        console.log("❌ User is not admin, redirecting to login");
        showStatus('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = '../HTML/LogIn.html';
        }, 2000);
        return;
    }

    // Store current admin user ID for approval tracking
    window.currentAdminId = user.user_id;
    
    // Initialize the admin panel
    await initializeAdminPanel(user);
    
    // Setup logout button
    setupLogoutButton();
});

// ============================================
// INITIALIZE ADMIN PANEL
// ============================================

async function initializeAdminPanel(user) {
    console.log("Admin Panel Initializing for:", user);
    
    // Display user info
    displayUserInfo(user);
    
    // Set user permissions
    setUserPermissions(user.role);
    
    // Load initial data from Supabase
    await loadDashboardData();
    await loadAllUsers();
    await loadPendingApprovals();
    
    // Setup navigation
    setupSectionNavigation();
    
    // Initialize file upload form
    initializeFileUploadForm('fileUploadForm');
    
    // Setup file preview on selection
    setupFilePreview();
    
    // Setup search and filter listeners
    setupSearchAndFilters();
}

function displayUserInfo(user) {
    const elements = {
        'currentUserRole': user.role,
        'userRoleDisplay': user.role,
        'adminName': `Welcome, ${user.full_name || user.email}`,
        'userInfo': `Logged in as: ${user.full_name || user.email} (${user.role})`
    };
    
    for (const [id, value] of Object.entries(elements)) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }
}

function setUserPermissions(role) {
    const el = document.getElementById('userPermissions');
    if (el) el.textContent = role === 'admin' 
        ? 'Manage all users, content, and system settings.' 
        : 'Limited access.';
}

function setupSectionNavigation() {
    const sections = {
        'dashboard': { title: 'Admin Dashboard', element: 'dashboard-section' },
        'user-management': { title: 'User Management', element: 'user-management-section' },
        'approvals': { title: 'Pending Approvals', element: 'approvals-section' },
        'content': { title: 'Content Management', element: 'content-section' },
        'analytics': { title: 'Analytics & Statistics', element: 'analytics-section' },
        'settings': { title: 'Settings', element: 'settings-section' }
    };

    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionKey = this.getAttribute('data-section');
            const section = sections[sectionKey];
            
            if (section) {
                // Update title
                document.getElementById('sectionTitle').textContent = section.title;
                
                // Hide all sections
                document.querySelectorAll('.section-content').forEach(el => {
                    el.classList.add('d-none');
                });
                
                // Show selected section
                document.getElementById(section.element).classList.remove('d-none');
                
                // Update active state
                document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                // Load data if needed
                if (sectionKey === 'content') {
                    loadUploadedFiles();
                } else if (sectionKey === 'user-management') {
                    loadAllUsers();
                } else if (sectionKey === 'approvals') {
                    loadPendingApprovals();
                } else if (sectionKey === 'dashboard') {
                    loadDashboardData();
                } else if (sectionKey === 'analytics') {
                    loadAnalyticsSection();
                }
            }
        });
    });
}

function setupFilePreview() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput) return;
    
    fileInput.addEventListener('change', function() {
        const preview = document.getElementById('filePreview');
        const filesList = document.getElementById('selectedFilesList');
        
        if (!preview || !filesList) return;
        
        filesList.innerHTML = '';
        
        if (this.files.length > 0) {
            preview.style.display = 'block';
            
            for (let file of this.files) {
                const size = formatFileSize(file.size);
                const item = document.createElement('div');
                item.className = 'list-group-item';
                item.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="bi ${getFileIcon(file.name)} me-2"></i>
                            <span>${file.name}</span>
                        </div>
                        <div class="text-muted">${size}</div>
                    </div>
                `;
                filesList.appendChild(item);
            }
        } else {
            preview.style.display = 'none';
        }
    });
}

function setupSearchAndFilters() {
    // File search
    const searchInput = document.getElementById('searchFiles');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadUploadedFiles, 300));
    }
    
    // File filter
    const filterSelect = document.getElementById('filterCategory');
    if (filterSelect) {
        filterSelect.addEventListener('change', loadUploadedFiles);
    }
    
    // User search
    const userSearch = document.getElementById('searchUsers');
    if (userSearch) {
        userSearch.addEventListener('input', debounce(filterUsersTable, 300));
    }
    
    // Refresh statistics button
    const refreshStatsBtn = document.getElementById('refreshStatsBtn');
    if (refreshStatsBtn) {
        refreshStatsBtn.addEventListener('click', async function() {
            await loadAnalyticsSection();
        });
    }
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// DATA LOADING FUNCTIONS
// ============================================

async function loadDashboardData() {
    console.log("Loading dashboard data...");
    
    try {
        // Get total users count
        const { count: totalUsers, error: usersError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        // Get active users count
        const { count: activeUsers, error: activeError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        
        // Get pending users count
        const { count: pendingUsers, error: pendingError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        // Get inactive users count
        const { count: inactiveUsers, error: inactiveError } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'inactive');
        
        if (usersError || activeError || pendingError || inactiveError) {
            throw new Error('Failed to load dashboard stats');
        }
        
        // Update dashboard stats
        updateDashboardStats({
            total_users: totalUsers || 0,
            active_users: activeUsers || 0,
            pending_users: pendingUsers || 0,
            inactive_users: inactiveUsers || 0
        });
        
        console.log("Dashboard data loaded");
        
    } catch (error) {
        console.error('Dashboard error:', error);
        showStatus('Error loading dashboard data: ' + error.message, 'error');
    }
}

async function loadAllUsers() {
    console.log("Loading all users...");
    
    try {
        // Use the new function from db_connection.js
        const { users, error } = await getAllUsers();
        
        if (error) {
            throw new Error('Failed to load users: ' + error.message);
        }
        
        updateUsersTable(users || []);
        console.log("Users loaded:", users?.length || 0);
        
    } catch (error) {
        console.error('Users error:', error);
        showStatus('Error loading users: ' + error.message, 'error');
    }
}

async function loadPendingApprovals() {
    console.log("Loading pending approvals...");
    
    try {
        // Use the new function from db_connection.js
        const { users, error } = await getPendingUsers();
        
        if (error) {
            throw new Error('Failed to load pending approvals: ' + error.message);
        }
        
        updatePendingApprovals(users || []);
        updatePendingCount(users?.length || 0);
        console.log("Pending approvals loaded:", users?.length || 0);
        
    } catch (error) {
        console.error('Approvals error:', error);
        showStatus('Error loading pending approvals: ' + error.message, 'error');
    }
}

async function loadAnalyticsSection() {
    console.log("📊 Loading analytics section...");
    
    const analyticsSection = document.getElementById('analytics-section');
    if (!analyticsSection) {
        console.error("Analytics section not found!");
        return;
    }
    
    // Get the card body inside analytics section
    const cardBody = analyticsSection.querySelector('.card-body');
    if (!cardBody) {
        console.error("Card body not found in analytics section!");
        return;
    }
    
    // Show loading state
    cardBody.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading statistics...</span>
            </div>
            <p class="mt-3">Loading statistics...</p>
        </div>
    `;
    
    try {
        // Load statistics
        const result = await loadStatistics();
        
        if (result.success) {
            console.log("✅ Statistics loaded:", result.data);
            
            // Update the UI with statistics
            updateStatisticsUI(result.data);
            
            // Try to draw charts (will fail silently if Chart.js not loaded)
            try {
                drawCharts(result.data.users, result.data.files);
            } catch (chartError) {
                console.log("Charts not available:", chartError.message);
            }
            
            showStatus('Statistics loaded successfully', 'success');
        } else {
            console.error("❌ Failed to load statistics:", result.error);
            cardBody.innerHTML = `
                <div class="alert alert-danger m-3">
                    <i class="bi bi-exclamation-triangle"></i> 
                    Failed to load statistics: ${result.error || 'Unknown error'}
                    <br>
                    <button class="btn btn-sm btn-primary mt-2" onclick="loadAnalyticsSection()">
                        Try Again
                    </button>
                </div>
            `;
            showStatus('Failed to load statistics', 'error');
        }
        
    } catch (error) {
        console.error('❌ Analytics section error:', error);
        cardBody.innerHTML = `
            <div class="alert alert-danger m-3">
                <i class="bi bi-exclamation-triangle"></i> 
                Error loading analytics: ${error.message}
                <br>
                <button class="btn btn-sm btn-primary mt-2" onclick="loadAnalyticsSection()">
                    Try Again
                </button>
            </div>
        `;
        showStatus('Error loading analytics', 'error');
    }
}
// Global function to load uploaded files
window.loadUploadedFiles = async function() {
    console.log("Loading uploaded files...");
    
    const tbody = document.getElementById('filesTableBody');
    if (!tbody) {
        console.error("Files table body not found");
        return;
    }
    
    // Show loading
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading files...</p>
            </td>
        </tr>
    `;
    
    try {
        const currentUser = getCurrentUser();
        const userId = currentUser?.user_id;
        
        // Get filter values
        const category = document.getElementById('filterCategory')?.value || '';
        const search = document.getElementById('searchFiles')?.value || '';
        
        // Fetch files
        const files = await getUploadedFiles({
            user_id: userId,
            category: category === 'all' ? '' : category,
            search: search
        });
        
        // Calculate storage stats
        const stats = await calculateStorageStats(files);
        
        // Render table
        renderFilesTable(files);
        updateStorageStats(stats);
        
        console.log(`Loaded ${files?.length || 0} file(s)`);
        
    } catch (error) {
        console.error('Error loading files:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error loading files
                    <br><small>${error.message}</small>
                </td>
            </tr>
        `;
    }
};

async function calculateStorageStats(files) {
    try {
        const totalSize = files?.reduce((sum, file) => sum + (file.file_size || 0), 0) || 0;
        const storageLimit = 100 * 1024 * 1024; // 100MB default
        
        return {
            total_size: totalSize,
            storage_limit: storageLimit
        };
        
    } catch (error) {
        console.error('Storage stats error:', error);
        return {
            total_size: 0,
            storage_limit: 100 * 1024 * 1024
        };
    }
}

// Global delete function
window.deleteUploadedFile = async function(fileId, fileName) {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
        return;
    }
    
    try {
        const result = await deleteFile(fileId);
        
        if (result.success) {
            showStatus('File deleted successfully', 'success');
            await loadUploadedFiles(); // Refresh the list
        } else {
            showStatus('Delete failed: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showStatus('Delete failed: ' + error.message, 'error');
    }
};

// Global download function
window.downloadFileFromSupabase = async function(fileId, fileName) {
    try {
        const result = await downloadFile(fileId, fileName);
        
        if (result.success) {
            showStatus(result.message, 'success');
        } else {
            showStatus('Download failed: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Download error:', error);
        showStatus('Download failed: ' + error.message, 'error');
    }
};

// ============================================
// UI UPDATE FUNCTIONS
// ============================================

function updateDashboardStats(stats) {
    const update = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || 0;
    };
    
    update('activeUsersCount', stats.active_users);
    update('pendingUsersCount', stats.pending_users);
    update('totalUsersCount', stats.total_users);
    update('inactiveUsersCount', stats.inactive_users);
}

function updatePendingCount(count) {
    const badge = document.getElementById('pendingCountBadge');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('d-none', count === 0);
    }
}

function updateUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No users found</td></tr>';
        return;
    }
    
    let html = '';
    users.forEach(user => {
        const statusBadge = user.status === 'active' 
            ? '<span class="badge bg-success">Active</span>' 
            : user.status === 'pending'
            ? '<span class="badge bg-warning">Pending</span>'
            : '<span class="badge bg-danger">Inactive</span>';
        
        // Show approval info if available
        let approvalInfo = '';
        if (user.approved_at) {
            approvalInfo = `<br><small class="text-muted">Approved: ${new Date(user.approved_at).toLocaleDateString()}</small>`;
        }
        
        html += `
        <tr>
            <td>${user.user_id}</td>
            <td>${user.full_name}</td>
            <td>${user.email}</td>
            <td><span class="badge bg-secondary">${user.role}</span></td>
            <td>${statusBadge}${approvalInfo}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    ${user.status === 'active' 
                        ? `<button class="btn btn-warning btn-sm" onclick="deactivateUser(${user.user_id})">Deactivate</button>`
                        : user.status === 'pending'
                        ? `<button class="btn btn-success btn-sm" onclick="approveUserAccount(${user.user_id})">Approve</button>
                           <button class="btn btn-danger btn-sm" onclick="rejectUserAccount(${user.user_id})">Reject</button>`
                        : `<button class="btn btn-success btn-sm" onclick="activateUser(${user.user_id})">Activate</button>`
                    }
                    <button class="btn btn-danger btn-sm" onclick="deleteUserAccount(${user.user_id}, '${user.full_name}')">
                        <i class="bi bi-trash"></i> Delete
                    </button>
                </div>
            </td>
        </tr>
        `;
    });
    
    tbody.innerHTML = html;
}
function filterUsersTable() {
    const searchTerm = document.getElementById('searchUsers')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

function updatePendingApprovals(accounts) {
    const container = document.getElementById('pendingApprovals');
    if (!container) return;
    
    if (!accounts || accounts.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5">
                <i class="bi bi-check-circle-fill text-success fs-1"></i>
                <h5 class="mt-3">No pending approvals</h5>
                <p class="text-muted">All user accounts are approved</p>
            </div>
        `;
        return;
    }
    
    let html = '';
    accounts.forEach(account => {
        const createdDate = new Date(account.created_at);
        const daysAgo = Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24));
        
        html += `
        <div class="card mb-3 border-warning">
            <div class="card-body">
                <div class="row align-items-center">
                    <div class="col-md-8">
                        <div class="d-flex align-items-start">
                            <div class="flex-shrink-0">
                                <div class="avatar-sm">
                                    <span class="avatar-title bg-warning-subtle text-warning rounded-circle fs-4">
                                        ${account.full_name.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                            </div>
                            <div class="flex-grow-1 ms-3">
                                <h6 class="card-title mb-1">${account.full_name}</h6>
                                <p class="card-text text-muted mb-1">
                                    <i class="bi bi-envelope"></i> ${account.email}<br>
                                    <i class="bi bi-person-badge"></i> ${account.role}<br>
                                    <i class="bi bi-clock"></i> ${createdDate.toLocaleDateString()} (${daysAgo} day${daysAgo !== 1 ? 's' : ''} ago)
                                </p>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4 text-end">
                        <div class="btn-group" role="group">
                            <button class="btn btn-success btn-sm me-2" onclick="approveUserAccount(${account.user_id})" title="Approve this user">
                                <i class="bi bi-check-lg me-1"></i> Approve
                            </button>
                            <button class="btn btn-danger btn-sm" onclick="rejectUserAccount(${account.user_id})" title="Reject this user">
                                <i class="bi bi-x-lg me-1"></i> Reject
                            </button>
                        </div>
                        <div class="mt-2">
                            <small class="text-muted">Click approve to activate this account</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

function renderFilesTable(files) {
    const tbody = document.getElementById('filesTableBody');
    if (!tbody) return;
    
    if (!files || files.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="bi bi-inbox"></i> No files found
                    <br><small>Try changing your search or filter</small>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    files.forEach(file => {
        const fileSize = formatFileSize(file.file_size);
        const uploadedDate = new Date(file.uploaded_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        const accessBadge = getFileAccessBadge(file.access_level);
        const fileIcon = getFileIcon(file.original_name || file.file_type);
        const escapedFileName = (file.original_name || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
        
        html += `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <i class="bi ${fileIcon} me-2 fs-5"></i>
                    <div>
                        <div class="fw-semibold">${file.original_name}</div>
                        <small class="text-muted">${file.description || 'No description'}</small>
                    </div>
                </div>
            </td>
            <td>${fileSize}</td>
            <td>${uploadedDate}</td>
            <td>${accessBadge}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-primary" onclick="downloadFileFromSupabase(${file.id}, '${escapedFileName}')" title="Download ${file.original_name}">
                        <i class="bi bi-download"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="deleteUploadedFile(${file.id}, '${escapedFileName}')" title="Delete file">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function updateStorageStats(stats) {
    const progressBar = document.getElementById('storageProgress');
    const usedElement = document.getElementById('storageUsed');
    const totalElement = document.getElementById('storageTotal');
    
    if (!progressBar || !usedElement || !totalElement) return;
    
    const used = stats.total_size || 0;
    const total = stats.storage_limit || (100 * 1024 * 1024);
    const percentage = Math.min(100, (used / total) * 100);
    
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
    progressBar.textContent = `${percentage.toFixed(1)}% Used`;
    
    usedElement.textContent = formatFileSize(used);
    totalElement.textContent = formatFileSize(total);
    
    progressBar.className = 'progress-bar';
    if (percentage >= 90) progressBar.classList.add('bg-danger');
    else if (percentage >= 70) progressBar.classList.add('bg-warning');
    else if (percentage >= 50) progressBar.classList.add('bg-info');
    else progressBar.classList.add('bg-success');
}

// ============================================
// AUTH & UTILITY FUNCTIONS
// ============================================

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

async function logout() {
    if (confirm('Are you sure you want to logout?')) {
        try {
            showStatus('Logging out...', 'info');
            
            await supabaseLogout();
            localStorage.clear();
            
            showStatus('Logged out successfully', 'success');
            
            setTimeout(() => {
                window.location.href = '../HTML/LogIn.html';
            }, 1000);
            
        } catch (error) {
            console.error('Logout error:', error);
            showStatus('Logout failed: ' + error.message, 'error');
        }
    }
}

function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    const alertElement = document.getElementById('statusAlert');
    
    if (!statusElement || !alertElement) return;
    
    statusElement.textContent = message;
    alertElement.className = 'alert mt-4';
    
    switch(type) {
        case 'success': alertElement.classList.add('alert-success'); break;
        case 'error': alertElement.classList.add('alert-danger'); break;
        case 'warning': alertElement.classList.add('alert-warning'); break;
        default: alertElement.classList.add('alert-info');
    }
}

// ============================================
// GLOBAL FUNCTIONS FOR HTML ONCLICK
// ============================================

// Approval functions using the new db_connection.js functions
window.approveUserAccount = async function(userId) {
    if (!confirm('Approve this user account? They will be able to login immediately.')) {
        return;
    }
    
    try {
        const result = await approveUser(userId, window.currentAdminId);
        
        if (result.success) {
            showStatus('User approved successfully!', 'success');
            // Refresh data
            await loadDashboardData();
            await loadAllUsers();
            await loadPendingApprovals();
        } else {
            showStatus('Approval failed: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Approval error:', error);
        showStatus('Approval failed: ' + error.message, 'error');
    }
};

window.rejectUserAccount = async function(userId) {
    if (!confirm('Reject this user account? They will not be able to login.')) {
        return;
    }
    
    try {
        const result = await rejectUser(userId, window.currentAdminId);
        
        if (result.success) {
            showStatus('User rejected successfully', 'success');
            // Refresh data
            await loadDashboardData();
            await loadAllUsers();
            await loadPendingApprovals();
        } else {
            showStatus('Rejection failed: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Rejection error:', error);
        showStatus('Rejection failed: ' + error.message, 'error');
    }
};

window.activateUser = async function(userId) {
    if (!confirm('Activate this user account?')) {
        return;
    }
    
    try {
        const result = await updateUserStatus(userId, 'active', window.currentAdminId);
        
        if (result.success) {
            showStatus('User activated successfully', 'success');
            // Refresh data
            await loadDashboardData();
            await loadAllUsers();
            await loadPendingApprovals();
        } else {
            showStatus('Activation failed: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Activation error:', error);
        showStatus('Activation failed: ' + error.message, 'error');
    }
};

window.deactivateUser = async function(userId) {
    if (!confirm('Deactivate this user account? They will not be able to login.')) {
        return;
    }
    
    try {
        const result = await updateUserStatus(userId, 'inactive', window.currentAdminId);
        
        if (result.success) {
            showStatus('User deactivated successfully', 'success');
            // Refresh data
            await loadDashboardData();
            await loadAllUsers();
            await loadPendingApprovals();
        } else {
            showStatus('Deactivation failed: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Deactivation error:', error);
        showStatus('Deactivation failed: ' + error.message, 'error');
    }
};

window.viewUserDetails = async function(userId) {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', userId)
            .single();
        
        if (error) throw error;
        
        let details = `
            <strong>User Details:</strong><br><br>
            <strong>ID:</strong> ${user.user_id}<br>
            <strong>Name:</strong> ${user.full_name}<br>
            <strong>Email:</strong> ${user.email}<br>
            <strong>Username:</strong> ${user.username || 'N/A'}<br>
            <strong>Role:</strong> ${user.role}<br>
            <strong>Status:</strong> ${user.status}<br>
            <strong>Created:</strong> ${new Date(user.created_at).toLocaleString()}<br>
        `;
        
        if (user.approved_at) {
            details += `<strong>Approved:</strong> ${new Date(user.approved_at).toLocaleString()}<br>`;
        }
        
        if (user.approved_by) {
            details += `<strong>Approved By:</strong> User ID ${user.approved_by}<br>`;
        }
        
        alert(details);
    } catch (error) {
        console.error('View user error:', error);
        alert('Failed to load user details');
    }
};

window.refreshUserData = async function() {
    showStatus('Refreshing...', 'info');
    await loadDashboardData();
    await loadAllUsers();
    await loadPendingApprovals();
    showStatus('Data refreshed', 'success');
};

// Global statistics refresh function
window.refreshStatistics = async function() {
    showStatus('Refreshing statistics...', 'info');
    await loadAnalyticsSection();
};

// Add this to your global functions in Admin_Panel.js
window.deleteUserAccount = async function(userId, userName) {
    if (!confirm(`Are you sure you want to DELETE user "${userName}"?\n\n⚠️ This action cannot be undone!`)) {
        return;
    }
    
    try {
        showStatus('Deleting user...', 'warning');
        
        // Delete user from Supabase
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('user_id', userId);
        
        if (error) {
            throw new Error('Failed to delete user: ' + error.message);
        }
        
        showStatus(`User "${userName}" deleted successfully`, 'success');
        
        // Refresh data
        await loadDashboardData();
        await loadAllUsers();
        await loadPendingApprovals();
        
    } catch (error) {
        console.error('Delete user error:', error);
        showStatus('Delete failed: ' + error.message, 'error');
    }
};

window.loadAnalyticsSection = loadAnalyticsSection;
window.refreshUserData = refreshUserData;
window.loadUploadedFiles = loadUploadedFiles;