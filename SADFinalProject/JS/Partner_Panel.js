// Partner_Panel.js
// Default email for testing - change this to match an email in your partnership_requests table
const DEFAULT_EMAIL = 'test@example.com';

document.addEventListener('DOMContentLoaded', function() {
    console.log('Partner Panel Loading...');
    
    // Initialize the partner panel
    initializePartnerPanel(DEFAULT_EMAIL);
});

function initializePartnerPanel(userEmail) {
    console.log("Partner Panel Initializing for:", userEmail);
    
    // Setup navigation
    setupSectionNavigation();
    
    // Setup refresh button - just reloads the page
    const refreshBtn = document.getElementById('logoutBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            window.location.reload();
        });
    }
    
    // Setup search and filter
    setupFilters();
    
    // Load initial data
    loadDashboardData(userEmail);
    loadAllRequests(userEmail);
}

// ============================================
// NAVIGATION
// ============================================

function setupSectionNavigation() {
    const sections = {
        'dashboard': { title: 'Partner Panel', element: 'dashboard-section' },
        'requests': { title: 'Partnership Requests', element: 'requests-section' },
        'projects': { title: 'Active Projects', element: 'projects-section' },
        'documents': { title: 'Documents & Attachments', element: 'documents-section' },
        'profile': { title: 'Organization Profile', element: 'profile-section' }
    };

    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            // Only prevent default for internal section links (those with data-section)
            const sectionKey = this.getAttribute('data-section');
            
            // If it's an external link (no data-section), let it navigate normally
            if (!sectionKey) {
                return; // Allow normal navigation
            }
            
            // Prevent default only for internal section navigation
            e.preventDefault();
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
                document.querySelectorAll('.sidebar .nav-link').forEach(l => {
                    // Only remove active from links with data-section
                    if (l.getAttribute('data-section')) {
                        l.classList.remove('active');
                    }
                });
                this.classList.add('active');
                
                // Load data if needed
                if (sectionKey === 'requests') {
                    loadAllRequests(DEFAULT_EMAIL);
                } else if (sectionKey === 'projects') {
                    loadActiveProjects(DEFAULT_EMAIL);
                } else if (sectionKey === 'documents') {
                    loadDocuments(DEFAULT_EMAIL);
                } else if (sectionKey === 'profile') {
                    loadOrganizationProfile(DEFAULT_EMAIL);
                } else if (sectionKey === 'dashboard') {
                    loadDashboardData(DEFAULT_EMAIL);
                }
            }
        });
    });
}

// ============================================
// DASHBOARD DATA
// ============================================

async function loadDashboardData(userEmail = DEFAULT_EMAIL) {
    try {
        // Load partner stats
        const statsResponse = await fetch(`../PHP/PartnerDashboard.php?action=stats&email=${encodeURIComponent(userEmail)}`);
        const statsText = await statsResponse.text();
        
        // Check if we got PHP source instead of JSON
        if (!statsText.trim().startsWith('{') && !statsText.trim().startsWith('[')) {
            throw new Error('PHP file not executing. Access via http://localhost/... not file://');
        }
        
        const statsData = JSON.parse(statsText);
        
        if (statsData.status === 'success') {
            updateDashboardStats(statsData.stats);
            updateOrganizationInfo(statsData.organization);
        }
        
        // Load recent requests
        const requestsResponse = await fetch(`../PHP/PartnerDashboard.php?action=requests&email=${encodeURIComponent(userEmail)}&limit=5`);
        const requestsText = await requestsResponse.text();
        
        // Check if we got PHP source instead of JSON
        if (!requestsText.trim().startsWith('{') && !requestsText.trim().startsWith('[')) {
            throw new Error('PHP file not executing. Access via http://localhost/... not file://');
        }
        
        const requestsData = JSON.parse(requestsText);
        
        if (requestsData.status === 'success') {
            updateRecentRequests(requestsData.requests);
        }
        
    } catch (error) {
        console.error('Dashboard error:', error);
        let errorMessage = error.message;
        if (errorMessage.includes('PHP file not executing')) {
            errorMessage = '⚠️ Access via http://localhost/... (XAMPP) not file://';
        }
        showStatus('Error loading dashboard data: ' + errorMessage, 'error');
    }
}

function updateDashboardStats(stats) {
    const update = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || 0;
    };
    
    update('totalRequestsCount', stats.total_requests);
    update('approvedRequestsCount', stats.approved_requests);
    update('pendingRequestsCount', stats.pending_requests);
    update('activeProjectsCount', stats.active_projects || 0);
}

function updateOrganizationInfo(org) {
    if (org) {
        const orgNameEl = document.getElementById('orgNameDisplay');
        const orgTypeEl = document.getElementById('orgTypeDisplay');
        const orgEmailEl = document.getElementById('orgEmailDisplay');
        const orgStatusEl = document.getElementById('orgStatusDisplay');
        
        if (orgNameEl) orgNameEl.textContent = org.org_name || 'Partner Organization';
        if (orgTypeEl) orgTypeEl.textContent = org.org_type || 'N/A';
        if (orgEmailEl) orgEmailEl.textContent = org.email || 'N/A';
        
        if (orgStatusEl && org.status) {
            orgStatusEl.textContent = org.status.charAt(0).toUpperCase() + org.status.slice(1);
            orgStatusEl.className = 'badge';
            if (org.status === 'approved') {
                orgStatusEl.classList.add('bg-success');
            } else if (org.status === 'pending') {
                orgStatusEl.classList.add('bg-warning');
            } else {
                orgStatusEl.classList.add('bg-secondary');
            }
        }
    }
}

function updateRecentRequests(requests) {
    const container = document.getElementById('recentRequests');
    if (!container) return;
    
    if (!requests || requests.length === 0) {
        container.innerHTML = '<div class="list-group-item text-muted text-center">No recent requests</div>';
        return;
    }
    
    let html = '';
    requests.forEach(request => {
        const statusBadge = getStatusBadge(request.status);
        const date = new Date(request.submitted_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        html += `
        <div class="list-group-item request-card ${request.status}">
            <div class="d-flex w-100 justify-content-between align-items-center">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${request.subject || 'Partnership Request'}</h6>
                    <p class="mb-1 text-muted small">Submitted: ${date}</p>
                </div>
                <div class="d-flex align-items-center gap-2">
                    ${statusBadge}
                    <button class="btn btn-sm btn-outline-primary" onclick="viewRequestDetails(${request.request_id})">
                        <i class="bi bi-eye"></i> View
                    </button>
                </div>
            </div>
        </div>
        `;
    });
    
    container.innerHTML = html;
}

// ============================================
// PARTNERSHIP REQUESTS
// ============================================

async function loadAllRequests(userEmail = DEFAULT_EMAIL) {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;
    
    // Show loading
    tbody.innerHTML = `
        <tr>
            <td colspan="5" class="text-center">
                <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading requests...</p>
            </td>
        </tr>
    `;
    
    try {
        // Get filter values
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const searchQuery = document.getElementById('searchRequests')?.value || '';
        
        // Build URL with parameters
        let url = `../PHP/PartnerDashboard.php?action=requests&email=${encodeURIComponent(userEmail)}`;
        if (statusFilter) url += `&status=${statusFilter}`;
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`;
        
        const response = await fetch(url);
        
        // Check if we got HTML/PHP instead of JSON (means PHP isn't executing)
        const contentType = response.headers.get('content-type');
        const text = await response.text();
        
        if (!text.trim().startsWith('{') && !text.trim().startsWith('[')) {
            // We got HTML/PHP source code instead of JSON
            console.error('Got non-JSON response:', text.substring(0, 200));
            throw new Error('PHP file not executing. Make sure you access the page through a web server (http://localhost), not file:// protocol.');
        }
        
        const result = JSON.parse(text);
        
        if (result.status === 'success') {
            renderRequestsTable(result.requests);
            showStatus(`Loaded ${result.requests.length} request(s)`, 'success');
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted">${result.message || 'No requests found'}</td></tr>`;
            showStatus(result.message || 'No requests found', 'warning');
        }
        
    } catch (error) {
        console.error('Error loading requests:', error);
        let errorMessage = error.message;
        if (errorMessage.includes('PHP file not executing')) {
            errorMessage = '⚠️ PHP not executing. Access via: http://localhost/... (not file://)';
        }
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error loading requests
                    <br><small>${errorMessage}</small>
                </td>
            </tr>
        `;
        showStatus('Error loading requests: ' + errorMessage, 'error');
    }
}

function renderRequestsTable(requests) {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;
    
    if (!requests || requests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="bi bi-inbox"></i> No requests found
                    <br><small>Try changing your search or filter</small>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    requests.forEach(request => {
        const statusBadge = getStatusBadge(request.status);
        const date = new Date(request.submitted_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        html += `
        <tr>
            <td>#${request.request_id}</td>
            <td>
                <div class="fw-semibold">${request.subject || 'Partnership Request'}</div>
                <small class="text-muted">${request.org_name || ''}</small>
            </td>
            <td>
                <small title="${new Date(request.submitted_at).toLocaleString()}">
                    ${date}
                </small>
            </td>
            <td>${statusBadge}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" 
                        onclick="viewRequestDetails(${request.request_id})"
                        title="View details">
                    <i class="bi bi-eye"></i> View
                </button>
            </td>
        </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

function getStatusBadge(status) {
    const statusMap = {
        'pending': '<span class="badge bg-warning text-dark"><i class="bi bi-clock"></i> Pending</span>',
        'reviewed': '<span class="badge bg-info"><i class="bi bi-eye"></i> Reviewed</span>',
        'approved': '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Approved</span>',
        'rejected': '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Rejected</span>'
    };
    
    return statusMap[status] || '<span class="badge bg-secondary">Unknown</span>';
}

async function viewRequestDetails(requestId) {
    try {
        const response = await fetch(`../PHP/PartnerDashboard.php?action=details&id=${requestId}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            displayRequestDetails(result.request, result.attachments || []);
            
            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
            modal.show();
        } else {
            showStatus('Error loading request details: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error loading request details:', error);
        showStatus('Error loading request details', 'error');
    }
}

function displayRequestDetails(request, attachments) {
    const content = document.getElementById('requestDetailsContent');
    if (!content) return;
    
    const statusBadge = getStatusBadge(request.status);
    const submittedDate = new Date(request.submitted_at).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    let attachmentsHtml = '';
    if (attachments && attachments.length > 0) {
        attachmentsHtml = `
            <div class="mt-4">
                <h6>Attachments:</h6>
                <ul class="list-group">
                    ${attachments.map(att => `
                        <li class="list-group-item d-flex justify-content-between align-items-center">
                            <div>
                                <i class="bi bi-file-earmark me-2"></i>
                                ${att.original_name}
                                <small class="text-muted ms-2">(${formatFileSize(att.file_size)})</small>
                            </div>
                            <a href="../PHP/DownloadAttachment.php?id=${att.attachment_id}" 
                               class="btn btn-sm btn-outline-primary" 
                               download>
                                <i class="bi bi-download"></i> Download
                            </a>
                        </li>
                    `).join('')}
                </ul>
            </div>
        `;
    } else {
        attachmentsHtml = '<p class="text-muted mt-4">No attachments</p>';
    }
    
    content.innerHTML = `
        <div class="row mb-3">
            <div class="col-md-6">
                <strong>Request ID:</strong> #${request.request_id}
            </div>
            <div class="col-md-6 text-end">
                ${statusBadge}
            </div>
        </div>
        
        <div class="mb-3">
            <strong>Subject:</strong>
            <p>${request.subject || 'N/A'}</p>
        </div>
        
        <div class="row mb-3">
            <div class="col-md-6">
                <strong>Organization Name:</strong>
                <p>${request.org_name || 'N/A'}</p>
            </div>
            <div class="col-md-6">
                <strong>Organization Type:</strong>
                <p>${request.org_type || 'N/A'}</p>
            </div>
        </div>
        
        <div class="mb-3">
            <strong>Address:</strong>
            <p>${request.address || 'N/A'}</p>
        </div>
        
        <div class="mb-3">
            <strong>Collaboration Areas:</strong>
            <p>${request.collaboration || 'N/A'}</p>
        </div>
        
        ${request.outcomes ? `
        <div class="mb-3">
            <strong>Expected Outcomes:</strong>
            <p>${request.outcomes}</p>
        </div>
        ` : ''}
        
        ${request.additional_info ? `
        <div class="mb-3">
            <strong>Additional Information:</strong>
            <p>${request.additional_info}</p>
        </div>
        ` : ''}
        
        <hr>
        
        <div class="row mb-3">
            <div class="col-md-6">
                <strong>Contact Person:</strong>
                <p>${request.contact_person || 'N/A'}</p>
            </div>
            <div class="col-md-6">
                <strong>Position:</strong>
                <p>${request.position || 'N/A'}</p>
            </div>
        </div>
        
        <div class="row mb-3">
            <div class="col-md-6">
                <strong>Email:</strong>
                <p>${request.email || 'N/A'}</p>
            </div>
            <div class="col-md-6">
                <strong>Phone:</strong>
                <p>${request.phone || 'N/A'}</p>
            </div>
        </div>
        
        <div class="mb-3">
            <strong>Date Submitted:</strong>
            <p>${submittedDate}</p>
        </div>
        
        ${attachmentsHtml}
    `;
}

// ============================================
// FILTERS AND SEARCH
// ============================================

function setupFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const searchInput = document.getElementById('searchRequests');
    
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            loadAllRequests(DEFAULT_EMAIL);
        });
    }
    
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('keyup', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (e.key === 'Enter' || this.value.length >= 3 || this.value.length === 0) {
                    loadAllRequests(DEFAULT_EMAIL);
                }
            }, 500);
        });
    }
}

// ============================================
// OTHER SECTIONS
// ============================================

async function loadActiveProjects(userEmail = DEFAULT_EMAIL) {
    const container = document.getElementById('activeProjects');
    if (!container) return;
    
    try {
        const response = await fetch(`../PHP/PartnerDashboard.php?action=projects&email=${encodeURIComponent(userEmail)}`);
        const result = await response.json();
        
        if (result.status === 'success' && result.projects && result.projects.length > 0) {
            let html = '';
            result.projects.forEach(project => {
                html += `
                    <div class="card mb-3">
                        <div class="card-body">
                            <h5 class="card-title">${project.title || 'Untitled Project'}</h5>
                            <p class="card-text">${project.description || 'No description'}</p>
                            <small class="text-muted">Status: ${project.status}</small>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-briefcase"></i>
                    <h5>No Active Projects</h5>
                    <p>You don't have any active projects at the moment.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error loading projects
            </div>
        `;
    }
}

async function loadDocuments(userEmail = DEFAULT_EMAIL) {
    const container = document.getElementById('documentsList');
    if (!container) return;
    
    try {
        const response = await fetch(`../PHP/PartnerDashboard.php?action=documents&email=${encodeURIComponent(userEmail)}`);
        const result = await response.json();
        
        if (result.status === 'success' && result.documents && result.documents.length > 0) {
            let html = '';
            result.documents.forEach(doc => {
                html += `
                    <div class="document-item">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <i class="bi bi-file-earmark me-2"></i>
                                <strong>${doc.original_name}</strong>
                                <small class="text-muted ms-2">(${formatFileSize(doc.file_size)})</small>
                            </div>
                            <a href="../PHP/DownloadAttachment.php?id=${doc.attachment_id}" 
                               class="btn btn-sm btn-outline-primary" 
                               download>
                                <i class="bi bi-download"></i> Download
                            </a>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = html;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-folder"></i>
                    <h5>No Documents</h5>
                    <p>You don't have any documents uploaded yet.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error loading documents
            </div>
        `;
    }
}

async function loadOrganizationProfile(userEmail = DEFAULT_EMAIL) {
    const container = document.getElementById('orgProfile');
    if (!container) return;
    
    try {
        const response = await fetch(`../PHP/PartnerDashboard.php?action=profile&email=${encodeURIComponent(userEmail)}`);
        const result = await response.json();
        
        if (result.status === 'success' && result.organization) {
            const org = result.organization;
            container.innerHTML = `
                <div class="profile-info">
                    <div class="row">
                        <div class="col-md-6">
                            <label>Organization Name:</label>
                            <p>${org.org_name || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <label>Organization Type:</label>
                            <p>${org.org_type || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12">
                            <label>Address:</label>
                            <p>${org.address || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <label>Contact Person:</label>
                            <p>${org.contact_person || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <label>Position:</label>
                            <p>${org.position || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <label>Email:</label>
                            <p>${org.email || 'N/A'}</p>
                        </div>
                        <div class="col-md-6">
                            <label>Phone:</label>
                            <p>${org.phone || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <label>Status:</label>
                            <p>${getStatusBadge(org.status || 'pending')}</p>
                        </div>
                        <div class="col-md-6">
                            <label>Last Updated:</label>
                            <p>${new Date(org.updated_at || org.submitted_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-person-circle"></i>
                    <h5>No Profile Found</h5>
                    <p>Unable to load organization profile.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        container.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle"></i> Error loading profile
            </div>
        `;
    }
}

// ============================================
// UTILITY FUNCTIONS
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
// NEW REQUEST MODAL
// ============================================

function openNewRequestModal() {
    const modal = new bootstrap.Modal(document.getElementById('newRequestModal'));
    modal.show();
    
    // Reload iframe when modal is shown to ensure fresh form
    const iframe = document.getElementById('partnerFormIframe');
    if (iframe) {
        iframe.src = iframe.src; // Reload iframe
    }
    
    // Listen for form submission success to close modal and refresh
    window.addEventListener('message', function(event) {
        if (event.data === 'partnershipSubmitted') {
            modal.hide();
            // Refresh the requests list
            loadAllRequests(DEFAULT_EMAIL);
            loadDashboardData(DEFAULT_EMAIL);
            showStatus('Partnership request submitted successfully!', 'success');
        }
    });
}

// ============================================
// GLOBAL EXPORTS
// ============================================

window.loadAllRequests = loadAllRequests;
window.viewRequestDetails = viewRequestDetails;
window.openNewRequestModal = openNewRequestModal;

