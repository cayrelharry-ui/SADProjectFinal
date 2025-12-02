// Admin_Panel.js - SUPER SIMPLE WORKING VERSION
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and is admin
    const userRole = localStorage.getItem('userRole');
    if (!userRole || userRole !== 'admin') {
        window.location.href = '../HTML/LogIn.html';
        return;
    }

    // Initialize the admin panel
    initializeAdminPanel(userRole);
});

function initializeAdminPanel(userRole) {
    console.log("Admin Panel Initializing for:", userRole);
    
    // Set user role in UI
    document.getElementById('currentUserRole').textContent = userRole;
    document.getElementById('userRoleDisplay').textContent = userRole;
    
    // Set user permissions
    setUserPermissions(userRole);
    
    // Load initial data
    loadDashboardData();
    loadAllUsers();
    loadPendingApprovals();
    
    // Setup navigation
    setupSectionNavigation();
    
    // Setup file upload (SIMPLE VERSION)
    setupSimpleFileUpload();
    
    // Setup file management
    setupFileManagement();
}

// ============================================
// SIMPLE FILE UPLOAD - THIS WILL WORK
// ============================================

function setupSimpleFileUpload() {
    const uploadBtn = document.getElementById('uploadBtn');
    const fileInput = document.getElementById('fileInput');
    
    if (!uploadBtn || !fileInput) return;
    
    // Preview selected files
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
                    <div class="d-flex justify-content-between">
                        <div><i class="bi bi-file-earmark me-2"></i>${file.name}</div>
                        <div class="text-muted">${size}</div>
                    </div>
                `;
                filesList.appendChild(item);
            }
        } else {
            preview.style.display = 'none';
        }
    });
    
    // Handle upload button click
    uploadBtn.addEventListener('click', uploadFilesSimple);
}

async function uploadFilesSimple() {
    console.log("Upload button clicked");
    
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadSpinner = document.getElementById('uploadSpinner');
    
    if (!fileInput || fileInput.files.length === 0) {
        alert('Please select at least one file');
        return;
    }
    
    // Show loading
    uploadBtn.disabled = true;
    if (uploadSpinner) {
        uploadSpinner.classList.remove('d-none');
    }
    
    showStatus('Uploading files...', 'info');
    
    try {
        // Create FormData
        const formData = new FormData();
        
        // Add files (MUST use 'files[]' with brackets for PHP)
        for (let file of fileInput.files) {
            formData.append('files[]', file);
        }
        
        // Add other data
        const category = document.getElementById('fileCategory').value;
        const description = document.getElementById('fileDescription').value;
        const accessLevel = document.querySelector('input[name="accessLevel"]:checked').value;
        
        formData.append('category', category);
        formData.append('description', description);
        formData.append('access_level', accessLevel); // Note: underscore!
        
        // Send to PHP
        const response = await fetch('../PHP/UploadFile.php', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        console.log("Upload result:", result);
        
        if (result.status === 'success') {
            showStatus(result.message, 'success');
            
            // Clear form
            fileInput.value = '';
            document.getElementById('filePreview').style.display = 'none';
            document.getElementById('selectedFilesList').innerHTML = '';
            document.getElementById('fileDescription').value = '';
            
            // Refresh file list
            loadUploadedFiles();
        } else {
            showStatus('Upload failed: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showStatus('Upload failed: ' + error.message, 'error');
    } finally {
        uploadBtn.disabled = false;
        if (uploadSpinner) {
            uploadSpinner.classList.add('d-none');
        }
    }
}

// ============================================
// FILE MANAGEMENT FUNCTIONS
// ============================================

function setupFileManagement() {
    console.log("Setting up file management...");
    
    // Setup search and filter
    const searchInput = document.getElementById('searchFiles');
    const categoryFilter = document.getElementById('filterCategory');
    const refreshBtn = document.querySelector('#manage-panel .btn-outline-secondary');
    
    if (searchInput) {
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Enter') {
                loadUploadedFiles();
            }
        });
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', loadUploadedFiles);
    }
    
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadUploadedFiles);
    }
    
    // Handle tab switch to load files
    const manageTab = document.getElementById('manage-tab');
    if (manageTab) {
        manageTab.addEventListener('shown.bs.tab', function() {
            console.log("Manage files tab shown");
            loadUploadedFiles();
        });
    }
}

async function loadUploadedFiles() {
    console.log("Loading uploaded files...");
    
    const tbody = document.getElementById('filesTableBody');
    if (!tbody) {
        console.error("Files table body not found");
        return;
    }
    
    // Show loading
    tbody.innerHTML = `
        <tr>
            <td colspan="6" class="text-center">
                <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading files...</p>
            </td>
        </tr>
    `;
    
    try {
        // Get filter values
        const category = document.getElementById('filterCategory')?.value || '';
        const search = document.getElementById('searchFiles')?.value || '';
        
        // Build URL with parameters
        let url = '../PHP/GetFiles.php';
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (search) params.append('search', search);
        
        if (params.toString()) {
            url += '?' + params.toString();
        }
        
        console.log("Fetching from:", url);
        
        // Fetch files
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log("Files loaded:", result);
        
        if (result.status === 'success') {
            renderFilesTable(result.files);
            updateStorageStats(result.stats);
            showStatus(`Loaded ${result.files.length} file(s)`, 'success');
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">${result.message || 'No files found'}</td></tr>`;
            showStatus(result.message || 'No files found', 'warning');
        }
        
    } catch (error) {
        console.error('Error loading files:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error loading files
                    <br><small>${error.message}</small>
                </td>
            </tr>
        `;
        showStatus('Error loading files: ' + error.message, 'error');
    }
}

function renderFilesTable(files) {
    const tbody = document.getElementById('filesTableBody');
    if (!tbody) return;
    
    if (!files || files.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted">
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
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const accessBadge = file.access_level === 'public' 
            ? '<span class="badge bg-success"><i class="bi bi-globe"></i> Public</span>' 
            : '<span class="badge bg-warning"><i class="bi bi-lock"></i> Private</span>';
        
        // Get appropriate icon for file type
        const fileIcon = getFileIcon(file.file_type);
        
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
            <td>
                <span class="badge bg-info">
                    <i class="bi bi-tag"></i> ${file.category}
                </span>
            </td>
            <td>${fileSize}</td>
            <td>
                <small title="${new Date(file.uploaded_at).toLocaleString()}">
                    ${uploadedDate}
                </small>
            </td>
            <td>${accessBadge}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <a href="../PHP/DownloadFile.php?id=${file.id}" 
                       class="btn btn-outline-primary" 
                       title="Download ${file.original_name}"
                       download>
                        <i class="bi bi-download"></i>
                    </a>
                    <button class="btn btn-outline-info" 
                            onclick="viewFileInfo(${file.id})"
                            title="View file info"
                            data-bs-toggle="modal" 
                            data-bs-target="#fileInfoModal">
                        <i class="bi bi-info-circle"></i>
                    </button>
                    <button class="btn btn-outline-danger" 
                            onclick="confirmDeleteFile(${file.id}, '${file.original_name.replace(/'/g, "\\'")}')"
                            title="Delete file">
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
    
    if (!progressBar || !usedElement || !totalElement) {
        console.error("Storage stats elements not found");
        return;
    }
    
    const used = stats.total_size || 0;
    const total = stats.storage_limit || (100 * 1024 * 1024); // Default 100MB
    const percentage = Math.min(100, (used / total) * 100);
    const remaining = total - used;
    
    // Update progress bar
    progressBar.style.width = `${percentage}%`;
    progressBar.setAttribute('aria-valuenow', percentage);
    progressBar.innerHTML = `${percentage.toFixed(1)}% Used`;
    
    // Update text displays
    usedElement.textContent = formatFileSize(used);
    totalElement.textContent = formatFileSize(total);
    
    // Change color based on usage
    progressBar.className = 'progress-bar';
    if (percentage >= 90) {
        progressBar.classList.add('bg-danger');
    } else if (percentage >= 70) {
        progressBar.classList.add('bg-warning');
    } else if (percentage >= 50) {
        progressBar.classList.add('bg-info');
    } else {
        progressBar.classList.add('bg-success');
    }
    
    console.log(`Storage: ${formatFileSize(used)} used, ${formatFileSize(remaining)} remaining (${percentage.toFixed(1)}%)`);
}

async function deleteFile(fileId) {
    console.log("Deleting file ID:", fileId);
    
    try {
        const response = await fetch('../PHP/DeleteFile.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ file_id: fileId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            showStatus('File deleted successfully', 'success');
            loadUploadedFiles(); // Refresh the list
        } else {
            throw new Error(result.message || 'Delete failed');
        }
        
    } catch (error) {
        console.error('Delete error:', error);
        showStatus('Delete failed: ' + error.message, 'error');
    }
}

function confirmDeleteFile(fileId, fileName) {
    // Create a custom confirmation modal
    const modalHtml = `
        <div class="modal fade" id="deleteConfirmModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header bg-danger text-white">
                        <h5 class="modal-title">
                            <i class="bi bi-exclamation-triangle"></i> Confirm Delete
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete:</p>
                        <div class="alert alert-warning">
                            <i class="bi bi-file-earmark"></i> <strong>${fileName}</strong>
                        </div>
                        <p class="text-danger"><i class="bi bi-warning"></i> This action cannot be undone!</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="bi bi-x-circle"></i> Cancel
                        </button>
                        <button type="button" class="btn btn-danger" onclick="deleteFile(${fileId})" data-bs-dismiss="modal">
                            <i class="bi bi-trash"></i> Delete File
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing modal if any
    const existingModal = document.getElementById('deleteConfirmModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // Add new modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Show the modal
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modal.show();
    
    // Remove modal from DOM after hiding
    document.getElementById('deleteConfirmModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

function viewFileInfo(fileId) {
    // This function can be expanded to show detailed file information
    // For now, we'll just show a simple alert
    showStatus('View file info for ID: ' + fileId, 'info');
    
    // You could fetch detailed file info and display it in a modal
    // fetch(`../PHP/GetFileInfo.php?id=${fileId}`)
    //     .then(response => response.json())
    //     .then(data => {
    //         // Display file info in a modal
    //     });
}

function getFileIcon(fileType) {
    const iconMap = {
        // Documents
        'pdf': 'bi-file-pdf-fill text-danger',
        'doc': 'bi-file-word-fill text-primary',
        'docx': 'bi-file-word-fill text-primary',
        'xls': 'bi-file-excel-fill text-success',
        'xlsx': 'bi-file-excel-fill text-success',
        'ppt': 'bi-file-ppt-fill text-warning',
        'pptx': 'bi-file-ppt-fill text-warning',
        'txt': 'bi-file-text text-secondary',
        'csv': 'bi-file-text text-info',
        
        // Images
        'jpg': 'bi-file-image-fill text-info',
        'jpeg': 'bi-file-image-fill text-info',
        'png': 'bi-file-image-fill text-info',
        'gif': 'bi-file-image-fill text-info',
        'bmp': 'bi-file-image-fill text-info',
        'svg': 'bi-file-image-fill text-info',
        'webp': 'bi-file-image-fill text-info',
        
        // Audio
        'mp3': 'bi-file-music-fill text-success',
        'wav': 'bi-file-music-fill text-success',
        'ogg': 'bi-file-music-fill text-success',
        
        // Video
        'mp4': 'bi-file-play-fill text-danger',
        'avi': 'bi-file-play-fill text-danger',
        'mov': 'bi-file-play-fill text-danger',
        'wmv': 'bi-file-play-fill text-danger',
        
        // Archives
        'zip': 'bi-file-zip-fill text-warning',
        'rar': 'bi-file-zip-fill text-warning',
        '7z': 'bi-file-zip-fill text-warning',
        'tar': 'bi-file-zip-fill text-warning',
        'gz': 'bi-file-zip-fill text-warning'
    };
    
    const ext = (fileType || '').toLowerCase();
    return iconMap[ext] || 'bi-file-earmark-fill';
}

// ============================================
// ENHANCED UTILITY FUNCTIONS
// ============================================

function formatFileSize(bytes, decimals = 2) {
    if (bytes === 0 || bytes === undefined || bytes === null) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
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
    
    if (type === 'info') {
        setTimeout(() => {
            if (statusElement.textContent === message) {
                statusElement.textContent = 'Ready';
                alertElement.className = 'alert alert-info mt-4';
            }
        }, 5000);
    }
}

// ============================================
// NAVIGATION & OTHER FUNCTIONS
// ============================================

function setupSectionNavigation() {
    const sections = {
        'dashboard': { title: 'Admin Dashboard', element: 'dashboard-section' },
        'user-management': { title: 'User Management', element: 'user-management-section' },
        'approvals': { title: 'Pending Approvals', element: 'approvals-section' },
        'content': { title: 'Content Management', element: 'content-section' }
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
                if (sectionKey === 'content') loadUploadedFiles();
                else if (sectionKey === 'user-management') loadAllUsers();
                else if (sectionKey === 'approvals') loadPendingApprovals();
                else if (sectionKey === 'dashboard') loadDashboardData();
            }
        });
    });
}

function setUserPermissions(role) {
    const el = document.getElementById('userPermissions');
    if (el) el.textContent = role === 'admin' 
        ? 'Manage all users, content, and system settings.' 
        : 'Limited access.';
}

// ============================================
// EXISTING FUNCTIONS (keep these as they were)
// ============================================

function loadDashboardData() {
    fetch('../PHP/GetDashboardStats.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') {
                updateDashboardStats(data.stats);
                updateRecentActivity(data.recentActivity || []);
            }
        })
        .catch(err => console.error('Dashboard error:', err));
}

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

function updateRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    if (!container) return;
    
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
        </div>
        `;
    });
    
    container.innerHTML = html;
}

function loadAllUsers() {
    fetch('../PHP/GetAllUsers.php')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') updateUsersTable(data.users);
        })
        .catch(err => console.error('Users error:', err));
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
            : '<span class="badge bg-warning">Inactive</span>';
        
        html += `
        <tr>
            <td>${user.user_id}</td>
            <td>${user.full_name}</td>
            <td>${user.email}</td>
            <td><span class="badge bg-secondary">${user.role}</span></td>
            <td>${statusBadge}</td>
            <td>${user.created_at}</td>
            <td>
                ${user.status === 'active' 
                    ? '<button class="btn btn-warning btn-sm" onclick="deactivateUser(' + user.user_id + ')">Deactivate</button>'
                    : '<button class="btn btn-success btn-sm" onclick="activateUser(' + user.user_id + ')">Activate</button>'}
            </td>
        </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function loadPendingApprovals() {
    fetch('../PHP/GetAccounts.php?status=inactive')
        .then(response => response.json())
        .then(data => {
            if (data.status === 'success') updatePendingApprovals(data.accounts);
        })
        .catch(err => console.error('Approvals error:', err));
}

function updatePendingApprovals(accounts) {
    const container = document.getElementById('pendingApprovals');
    if (!container) return;
    
    if (!accounts || accounts.length === 0) {
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
                        <p class="card-text">
                            <i class="bi bi-envelope"></i> ${account.email}<br>
                            <i class="bi bi-person-badge"></i> ${account.role}<br>
                            <i class="bi bi-calendar"></i> ${account.created_at}
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

function approveAccount(userId) {
    if (confirm('Approve this account?')) updateAccountStatus(userId, 'active', 'Account approved');
}

function rejectAccount(userId) {
    if (confirm('Reject this account?')) updateAccountStatus(userId, 'rejected', 'Account rejected');
}

function activateUser(userId) {
    updateAccountStatus(userId, 'active', 'User activated');
}

function deactivateUser(userId) {
    updateAccountStatus(userId, 'inactive', 'User deactivated');
}

function updateAccountStatus(userId, status, message) {
    fetch('../PHP/UpdateAccountStatus.php', {
        method: 'POST',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: `user_id=${userId}&status=${status}`
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            showStatus(message, 'success');
            loadDashboardData();
            loadAllUsers();
            loadPendingApprovals();
        }
    })
    .catch(err => console.error('Update error:', err));
}

function refreshUserData() {
    showStatus('Refreshing...', 'info');
    loadDashboardData();
    loadAllUsers();
    loadPendingApprovals();
}

// ============================================
// GLOBAL EXPORTS
// ============================================

window.approveAccount = approveAccount;
window.rejectAccount = rejectAccount;
window.activateUser = activateUser;
window.deactivateUser = deactivateUser;
window.deleteFile = deleteFile;
window.loadUploadedFiles = loadUploadedFiles;
window.refreshUserData = refreshUserData;
window.confirmDeleteFile = confirmDeleteFile;
window.viewFileInfo = viewFileInfo;
