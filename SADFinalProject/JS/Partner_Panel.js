// Partner_Panel.js - Complete working version with Supabase integration
document.addEventListener('DOMContentLoaded', function() {
    console.log('Partner Panel Initializing...');

    // Initialize the application
    initializePartnerPanel();
});

// ============================================
// INITIALIZATION
// ============================================

function initializePartnerPanel() {
    console.log('Initializing Partner Panel...');

    // Check if user is logged in
    if (!checkUserLogin()) {
        return;
    }

    // Setup all event listeners
    setupEventListeners();

    // Load initial data
    loadDashboardData();

    console.log('Partner Panel Initialized Successfully!');
}

function checkUserLogin() {
    try {
        // Try to get user from localStorage
        const userData = localStorage.getItem('user');
        if (!userData) {
            console.log('No user logged in, redirecting to login...');
            window.location.href = '../HTML/LogIn.html';
            return false;
        }

        const user = JSON.parse(userData);
        console.log('User logged in:', user.email);

        // Update welcome message
        const welcomeEl = document.getElementById('userWelcome');
        if (welcomeEl) {
            welcomeEl.textContent = `Welcome back, ${user.full_name || user.email}!`;
        }

        return true;
    } catch (error) {
        console.error('Error checking user login:', error);
        window.location.href = '../HTML/LogIn.html';
        return false;
    }
}

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    console.log('Setting up event listeners...');

    // Logout button
    setupLogoutButton();

    // Navigation links
    setupNavigation();

    // Quick action buttons
    setupQuickActions();

    // Refresh buttons
    setupRefreshButtons();

    // New request buttons
    setupNewRequestButtons();

    // Filter and search
    setupFilters();

    console.log('All event listeners set up!');
}

function setupLogoutButton() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();

            if (confirm('Are you sure you want to logout?')) {
                // Clear all localStorage items
                localStorage.clear();
                sessionStorage.clear();

                // Redirect to login page
                window.location.href = '../HTML/LogIn.html';
            }
        });
        console.log('Logout button listener added');
    }
}

function setupNavigation() {
    const sections = {
        'dashboard': { title: 'Partner Panel', element: 'dashboard-section' },
        'requests': { title: 'Partnership Requests', element: 'requests-section' },
        'projects': { title: 'Active Projects', element: 'projects-section' },
        'documents': { title: 'Documents & Attachments', element: 'documents-section' },
        'moa': { title: 'MOA Management', element: 'moa-section' },
        'budget': { title: 'Budget Tracking', element: 'budget-section' },
        'profile': { title: 'Organization Profile', element: 'profile-section' }
    };

    // Add click listeners to all navigation links
    const navLinks = [
        'dashboard-link', 'requests-link', 'projects-link',
        'documents-link', 'moa-link', 'budget-link', 'profile-link'
    ];

    navLinks.forEach(linkId => {
        const link = document.getElementById(linkId);
        if (link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const sectionKey = this.getAttribute('data-section');
                navigateToSection(sectionKey);
            });
        }
    });

    // New request link
    const newRequestLink = document.getElementById('new-request-link');
    if (newRequestLink) {
        newRequestLink.addEventListener('click', function(e) {
            e.preventDefault();
            openNewRequestModal();
        });
    }

    console.log('Navigation listeners added');
}

function navigateToSection(sectionKey) {
    const sections = {
        'dashboard': { title: 'Partner Panel', element: 'dashboard-section' },
        'requests': { title: 'Partnership Requests', element: 'requests-section' },
        'projects': { title: 'Active Projects', element: 'projects-section' },
        'documents': { title: 'Documents & Attachments', element: 'documents-section' },
        'moa': { title: 'MOA Management', element: 'moa-section' },
        'budget': { title: 'Budget Tracking', element: 'budget-section' },
        'profile': { title: 'Organization Profile', element: 'profile-section' }
    };

    const section = sections[sectionKey];
    if (!section) {
        console.error('Invalid section:', sectionKey);
        return;
    }

    // Update title
    document.getElementById('sectionTitle').textContent = section.title;

    // Hide all sections
    document.querySelectorAll('.section-content').forEach(el => {
        el.classList.add('d-none');
    });

    // Show selected section
    document.getElementById(section.element).classList.remove('d-none');

    // Update active state in sidebar
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const activeLink = document.querySelector(`#${sectionKey}-link`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // Load section data
    loadSectionData(sectionKey);

    console.log('Navigated to section:', sectionKey);
}

function setupQuickActions() {
    // New Request quick action
    const newRequestBtn = document.getElementById('quick-action-new-request');
    if (newRequestBtn) {
        newRequestBtn.addEventListener('click', function() {
            openNewRequestModal();
        });
    }

    // MOA quick action
    const moaBtn = document.getElementById('quick-action-moa');
    if (moaBtn) {
        moaBtn.addEventListener('click', function() {
            navigateToSection('moa');
        });
    }

    // Budget quick action
    const budgetBtn = document.getElementById('quick-action-budget');
    if (budgetBtn) {
        budgetBtn.addEventListener('click', function() {
            navigateToSection('budget');
        });
    }

    console.log('Quick action listeners added');
}

function setupRefreshButtons() {
    // Refresh recent requests
    const refreshRecentBtn = document.getElementById('refresh-recent-requests');
    if (refreshRecentBtn) {
        refreshRecentBtn.addEventListener('click', function() {
            loadDashboardData();
        });
    }

    // Refresh all requests
    const refreshRequestsBtn = document.getElementById('refresh-requests-btn');
    if (refreshRequestsBtn) {
        refreshRequestsBtn.addEventListener('click', function() {
            loadAllRequests();
        });
    }

    console.log('Refresh button listeners added');
}

function setupNewRequestButtons() {
    // New request button in requests section
    const newRequestBtn = document.getElementById('new-request-btn');
    if (newRequestBtn) {
        newRequestBtn.addEventListener('click', function() {
            openNewRequestModal();
        });
    }

    console.log('New request button listeners added');
}

function setupFilters() {
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', function() {
            loadAllRequests();
        });
    }

    // Search input
    const searchInput = document.getElementById('searchRequests');
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('keyup', function(e) {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                if (e.key === 'Enter' || this.value.length >= 3 || this.value.length === 0) {
                    loadAllRequests();
                }
            }, 500);
        });
    }

    console.log('Filter listeners added');
}

// ============================================
// DASHBOARD DATA (With Supabase Integration)
// ============================================

async function loadDashboardData() {
    console.log('Loading dashboard data...');

    try {
        // Get user email
        const user = getUserData();
        if (!user) return;

        // Show loading state
        showLoading('dashboard');

        // Try to fetch real data from Supabase
        try {
            // Fetch user's partnership requests
            const { data: requests, error: requestsError } = await supabase
                .from('partnership_requests')
                .select('*')
                .eq('user_id', user.user_id);

            if (requestsError) {
                console.error('Error fetching requests from Supabase:', requestsError);
                throw requestsError;
            }

            // Calculate statistics
            const totalRequests = requests?.length || 0;
            const approvedRequests = requests?.filter(req => req.status === 'approved').length || 0;
            const pendingRequests = requests?.filter(req => req.status === 'pending').length || 0;
            const activeProjectsCount = 0; // Update when you have projects table

            // Update UI with real data
            updateDashboardStats({
                total_requests: totalRequests,
                approved_requests: approvedRequests,
                pending_requests: pendingRequests,
                active_projects: activeProjectsCount
            });

            // Update organization info
            updateOrganizationInfo({
                org_name: user.full_name || 'Partner Organization',
                org_type: 'Partner',
                email: user.email || 'N/A',
                status: user.status || 'active'
            });

            // Update recent requests
            const recentRequests = requests?.slice(0, 3) || [];
            updateRecentRequests(recentRequests);

            showStatus('Dashboard data loaded successfully!', 'success');

        } catch (supabaseError) {
            console.log('Falling back to mock data due to error:', supabaseError);

            // Fall back to mock data
            const mockStats = {
                total_requests: 0,
                approved_requests: 0,
                pending_requests: 0,
                active_projects: 0
            };

            const mockOrgInfo = {
                org_name: user.full_name || user.email.split('@')[0],
                org_type: 'Partner',
                email: user.email,
                status: user.status || 'active'
            };

            const mockRequests = [];

            updateDashboardStats(mockStats);
            updateOrganizationInfo(mockOrgInfo);
            updateRecentRequests(mockRequests);

            showStatus('Using mock data. Please check your connection.', 'warning');
        }

    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showStatus('Error loading dashboard data: ' + error.message, 'error');
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
        if (orgTypeEl) {
            orgTypeEl.textContent = org.org_type || 'N/A';
            orgTypeEl.className = 'badge bg-secondary';
        }
        if (orgEmailEl) orgEmailEl.textContent = org.email || 'N/A';

        if (orgStatusEl && org.status) {
            orgStatusEl.textContent = org.status.charAt(0).toUpperCase() + org.status.slice(1);
            orgStatusEl.className = 'badge';
            if (org.status === 'approved' || org.status === 'active') {
                orgStatusEl.classList.add('bg-success');
            } else if (org.status === 'pending') {
                orgStatusEl.classList.add('bg-warning', 'text-dark');
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
    requests.slice(0, 3).forEach(request => {
        const statusBadge = getStatusBadge(request.status);
        const date = new Date(request.submitted_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });

        html += `
        <div class="list-group-item">
            <div class="d-flex w-100 justify-content-between align-items-center">
                <div class="flex-grow-1">
                    <h6 class="mb-1">${request.subject || 'Partnership Request'}</h6>
                    <p class="mb-1 text-muted small">Submitted: ${date}</p>
                </div>
                <div class="d-flex align-items-center gap-2">
                    ${statusBadge}
                    <button class="btn btn-sm btn-outline-primary view-request-btn" data-id="${request.request_id}">
                        <i class="bi bi-eye"></i> View
                    </button>
                </div>
            </div>
        </div>
        `;
    });

    container.innerHTML = html;

    // Add event listeners to view buttons
    container.querySelectorAll('.view-request-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const requestId = this.getAttribute('data-id');
            viewRequestDetails(requestId);
        });
    });
}

// ============================================
// PARTNERSHIP REQUESTS (With Supabase Integration)
// ============================================

async function loadAllRequests() {
    console.log('Loading all requests from Supabase...');

    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;

    try {
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

        // Get current user
        const user = getUserData();
        if (!user) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger">
                        <i class="bi bi-exclamation-triangle"></i> User not logged in
                    </td>
                </tr>
            `;
            return;
        }

        // Get filter values
        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const searchQuery = document.getElementById('searchRequests')?.value || '';

        // Build query
        let query = supabase
            .from('partnership_requests')
            .select('*')
            .eq('user_id', user.user_id)
            .order('submitted_at', { ascending: false });

        // Apply status filter if selected
        if (statusFilter) {
            query = query.eq('status', statusFilter);
        }

        // Execute query
        const { data, error } = await query;

        if (error) {
            console.error('Error fetching partnership requests:', error);
            throw error;
        }

        // Start with the raw data
        let filteredRequests = data || [];

        // Limit to the current user if applicable
        if (user && user.email && filteredRequests.length > 0) {
            filteredRequests = filteredRequests.filter(req =>
                req.email === user.email
            );
        }

        // Apply search filter locally
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            filteredRequests = filteredRequests.filter(req =>
                (req.subject && req.subject.toLowerCase().includes(searchLower)) ||
                (req.org_name && req.org_name.toLowerCase().includes(searchLower)) ||
                (req.contact_person && req.contact_person.toLowerCase().includes(searchLower))
            );
        }

        // Render the table
        renderRequestsTable(filteredRequests);
        showStatus(`Loaded ${filteredRequests.length} request(s)`, 'success');

    } catch (error) {
        console.error('Error loading requests:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error loading requests
                    <br><small>${error.message}</small>
                </td>
            </tr>
        `;
        showStatus('Error loading requests: ' + error.message, 'error');
    }
}

function renderRequestsTable(requests) {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;

    if (!requests || requests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="bi bi-inbox"></i> No partnership requests found
                    <br><small>Click "New Request" to submit your first partnership request</small>
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
            day: 'numeric'
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
                <button class="btn btn-sm btn-outline-primary view-request-btn" data-id="${request.request_id}">
                    <i class="bi bi-eye"></i> View
                </button>
            </td>
        </tr>
        `;
    });

    tbody.innerHTML = html;

    // Add event listeners to view buttons
    tbody.querySelectorAll('.view-request-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const requestId = this.getAttribute('data-id');
            viewRequestDetails(requestId);
        });
    });
}

function getStatusBadge(status) {
    if (!status) return '<span class="badge bg-secondary">Unknown</span>';

    const statusText = status.charAt(0).toUpperCase() + status.slice(1);

    switch(status.toLowerCase()) {
        case 'pending':
            return '<span class="badge bg-warning text-dark"><i class="bi bi-clock"></i> Pending</span>';
        case 'reviewed':
            return '<span class="badge bg-info"><i class="bi bi-eye"></i> Reviewed</span>';
        case 'approved':
            return '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Approved</span>';
        case 'rejected':
            return '<span class="badge bg-danger"><i class="bi bi-x-circle"></i> Rejected</span>';
        default:
            return `<span class="badge bg-secondary">${statusText}</span>`;
    }
}

async function viewRequestDetails(requestId) {
    try {
        // Fetch request details from Supabase
        const { data: request, error } = await supabase
            .from('partnership_requests')
            .select('*')
            .eq('request_id', requestId)
            .single();

        if (error) {
            console.error('Error fetching request details:', error);
            showStatus('Error loading request details', 'error');
            return;
        }

        // Fetch attachments for this request
        const { data: attachments } = await supabase
            .from('uploaded_files')
            .select('*')
            .eq('partnership_request_id', requestId);

        displayRequestDetails(request, attachments || []);

        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
        modal.show();

    } catch (error) {
        console.error('Error loading request details:', error);
        showStatus('Error loading request details', 'error');
    }
}

function displayRequestDetails(request, attachments = []) {
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

    const letterDate = request.letter_date ? new Date(request.letter_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }) : 'N/A';

    let html = `
        <div class="row mb-3">
            <div class="col-md-6">
                <strong>Request ID:</strong> #${request.request_id}
            </div>
            <div class="col-md-6 text-end">
                ${statusBadge}
            </div>
        </div>

        <div class="mb-3">
            <strong>Date:</strong>
            <p>${letterDate}</p>
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
    `;

    if (request.outcomes) {
        html += `
        <div class="mb-3">
            <strong>Expected Outcomes:</strong>
            <p>${request.outcomes}</p>
        </div>
        `;
    }

    if (request.additional_info) {
        html += `
        <div class="mb-3">
            <strong>Additional Information:</strong>
            <p>${request.additional_info}</p>
        </div>
        `;
    }

    html += `
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
    `;

    // Add attachments section if there are attachments
    if (attachments.length > 0) {
        html += `
            <hr>
            <div class="mt-4">
                <h6>Attachments:</h6>
                <div class="list-group">
        `;

        attachments.forEach(attachment => {
            html += `
                <div class="list-group-item">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <i class="bi bi-file-earmark"></i>
                            ${attachment.original_name}
                            <small class="text-muted d-block">
                                ${formatFileSize(attachment.file_size)}
                            </small>
                        </div>
                        <a href="${attachment.public_url}" target="_blank" class="btn btn-sm btn-outline-primary">
                            <i class="bi bi-download"></i> Download
                        </a>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    } else {
        html += `
            <div class="mt-4">
                <p class="text-muted">No attachments for this request.</p>
            </div>
        `;
    }

    content.innerHTML = html;
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// ============================================
// SECTION DATA LOADING
// ============================================

function loadSectionData(sectionKey) {
    console.log('Loading section data for:', sectionKey);

    switch(sectionKey) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'requests':
            loadAllRequests();
            break;
        case 'projects':
            loadActiveProjects();
            break;
        case 'documents':
            loadDocuments();
            break;
        case 'profile':
            loadOrganizationProfile();
            break;
        case 'moa':
        case 'budget':
            // These sections are not implemented yet
            showSectionPlaceholder(sectionKey);
            break;
    }
}

function loadActiveProjects() {
    const container = document.getElementById('activeProjects');
    if (!container) return;

    container.innerHTML = `
        <div class="alert alert-info">
            <i class="bi bi-briefcase"></i>
            <h5 class="alert-heading">Active Projects</h5>
            <p class="mb-0">This section will display your active partnership projects. Coming soon!</p>
        </div>
    `;
}

function loadDocuments() {
    const container = document.getElementById('documentsList');
    if (!container) return;

    container.innerHTML = `
        <div class="alert alert-info">
            <i class="bi bi-folder"></i>
            <h5 class="alert-heading">Documents & Attachments</h5>
            <p class="mb-0">This section will display all your uploaded documents and attachments. Coming soon!</p>
        </div>
    `;
}

function loadOrganizationProfile() {
    const container = document.getElementById('orgProfile');
    if (!container) return;

    const user = getUserData();
    if (!user) return;

    container.innerHTML = `
        <div class="profile-info">
            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label"><strong>Full Name:</strong></label>
                    <p>${user.full_name || 'Not specified'}</p>
                </div>
                <div class="col-md-6">
                    <label class="form-label"><strong>Email Address:</strong></label>
                    <p>${user.email || 'Not specified'}</p>
                </div>
            </div>

            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label"><strong>Role:</strong></label>
                    <p><span class="badge bg-primary">${user.role || 'Partner'}</span></p>
                </div>
                <div class="col-md-6">
                    <label class="form-label"><strong>Account Status:</strong></label>
                    <p><span class="badge bg-success">Active</span></p>
                </div>
            </div>

            <div class="alert alert-info mt-4">
                <i class="bi bi-info-circle"></i>
                <h6 class="alert-heading">Organization Profile</h6>
                <p class="mb-0">Your organization profile will be automatically created when you submit your first partnership request.</p>
            </div>
        </div>
    `;
}

function showSectionPlaceholder(sectionKey) {
    const sectionTitles = {
        'moa': 'MOA Management',
        'budget': 'Budget Tracking'
    };

    const containerId = sectionKey + (sectionKey === 'moa' ? 'ManagementContent' : 'TrackingContent');
    const container = document.getElementById(containerId);

    if (container) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="bi bi-tools"></i>
                <h5 class="alert-heading">${sectionTitles[sectionKey] || 'Section'}</h5>
                <p class="mb-0">This section is currently under development. Check back soon!</p>
        </div>
        `;
    }
}

// ============================================
// MODAL FUNCTIONS
// ============================================

function openNewRequestModal() {
    console.log('Opening new request modal...');

    const modal = new bootstrap.Modal(document.getElementById('newRequestModal'));
    modal.show();

    // Reload iframe when modal is shown to ensure fresh form
    const iframe = document.getElementById('partnerFormIframe');
    if (iframe) {
        iframe.src = iframe.src; // Reload iframe
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getUserData() {
    try {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error getting user data:', error);
        return null;
    }
}

function showLoading(section) {
    const loadingMessages = {
        'dashboard': 'Loading dashboard data...',
        'requests': 'Loading partnership requests...',
        'default': 'Loading...'
    };

    showStatus(loadingMessages[section] || loadingMessages.default, 'info');
}

function showStatus(message, type = 'info') {
    const statusElement = document.getElementById('statusMessage');
    const alertElement = document.getElementById('statusAlert');

    if (!statusElement || !alertElement) return;

    statusElement.textContent = message;
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

    // Auto-hide info messages after 5 seconds
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
// GLOBAL FUNCTIONS (for external access)
// ============================================

// Make refreshDashboard available globally for the iframe message handler
window.refreshDashboard = function() {
    loadDashboardData();
    if (!document.getElementById('requests-section').classList.contains('d-none')) {
        loadAllRequests();
    }
};

// For backward compatibility with onclick handlers
window.openNewRequestModal = openNewRequestModal;
window.loadAllRequests = loadAllRequests;
window.viewRequestDetails = viewRequestDetails;

// Initialize Supabase client globally (without overwriting the library)
const SUPABASE_URL = 'https://fkdqenrxfanpgmtogiig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZHFlbnJ4ZmFucGdtdG9naWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDA1NzksImV4cCI6MjA4MDMxNjU3OX0.NSA57GQcxnCpLnqMVlDpf_lvfggb2H-IGGTBL_XYQ4I';

if (!window.supabase || !window.supabase.createClient) {
    console.error('Supabase JS library is not loaded. Please ensure the CDN script is included before Partner_Panel.js.');
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
window.supabaseClient = supabase;

console.log('Partner Panel loaded successfully!');