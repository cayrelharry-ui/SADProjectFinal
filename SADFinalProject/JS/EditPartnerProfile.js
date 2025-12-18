// EditPartnerProfile.js - Profile Editing Module for Partner Dashboard

// Global variables for profile editing
let currentUserInfo = null;
let currentUserEmail = '';
let latestRequestId = null;
let supabaseInstance = null;
let isSupabaseInitialized = false;

// Initialize Supabase from db_connection.js
async function initializeSupabase() {
    try {
        if (window.supabaseAuth && window.supabaseAuth.supabase) {
            supabaseInstance = window.supabaseAuth.supabase;
            isSupabaseInitialized = true;
            console.log("✅ Supabase initialized from db_connection.js");
            return true;
        } else {
            console.warn("⚠️ Supabase not available from db_connection.js");

            // Try to initialize directly with environment variables or fallback
            try {
                // Check if supabase is globally available
                if (window.supabase && window.supabase.createClient) {
                    // Try to get credentials from environment or use defaults
                    const supabaseUrl = window.SUPABASE_URL || 'https://your-project.supabase.co';
                    const supabaseAnonKey = window.SUPABASE_ANON_KEY || 'your-anon-key';

                    supabaseInstance = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
                    isSupabaseInitialized = true;
                    console.log("✅ Supabase initialized directly");
                    return true;
                }
            } catch (directError) {
                console.error("❌ Failed to initialize Supabase directly:", directError);
            }

            isSupabaseInitialized = false;
            return false;
        }
    } catch (error) {
        console.error("❌ Error initializing Supabase:", error);
        isSupabaseInitialized = false;
        return false;
    }
}

// Initialize profile section functionality
export function initializeProfileSection() {
    // Initialize Supabase first
    initializeSupabase().then((initialized) => {
        if (!initialized) {
            console.warn("⚠️ Supabase not initialized, some features may be limited");
            showNotification('Some features may be limited due to connection issues', 'warning');
        }

        // Initialize profile section when shown
        const profileLink = document.getElementById('profile-link');
        if (profileLink) {
            profileLink.addEventListener('click', function() {
                setTimeout(() => {
                    loadOrganizationProfile();
                }, 100);
            });
        }

        // Profile refresh button
        const refreshBtn = document.getElementById('refresh-profile-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', loadOrganizationProfile);
        }

        // Edit profile button
        const editBtn = document.getElementById('edit-profile-btn');
        if (editBtn) {
            editBtn.addEventListener('click', showEditProfileModal);
        }

        // Change avatar button
        const changeAvatarBtn = document.getElementById('change-avatar-btn');
        if (changeAvatarBtn) {
            changeAvatarBtn.addEventListener('click', showChangeAvatarModal);
        }

        // Quick action buttons
        const newPartnershipBtn = document.getElementById('new-partnership-btn');
        if (newPartnershipBtn) {
            newPartnershipBtn.addEventListener('click', function() {
                document.getElementById('new-request-link').click();
                const modal = new bootstrap.Modal(document.getElementById('newRequestModal'));
                modal.show();
            });
        }

        const viewDocumentsBtn = document.getElementById('view-documents-btn');
        if (viewDocumentsBtn) {
            viewDocumentsBtn.addEventListener('click', function() {
                document.getElementById('documents-link').click();
            });
        }

        const viewProjectsBtn = document.getElementById('view-projects-btn');
        if (viewProjectsBtn) {
            viewProjectsBtn.addEventListener('click', function() {
                document.getElementById('projects-link').click();
            });
        }

        const exportProfileBtn = document.getElementById('export-profile-btn');
        if (exportProfileBtn) {
            exportProfileBtn.addEventListener('click', exportProfileData);
        }

        // Avatar option selection
        document.querySelectorAll('.avatar-option').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('.avatar-option').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const style = this.dataset.style;
                updateAvatarPreview(style);
            });
        });

        // Avatar upload
        const uploadAvatarBtn = document.getElementById('uploadAvatarBtn');
        if (uploadAvatarBtn) {
            uploadAvatarBtn.addEventListener('click', function() {
                document.getElementById('avatarUpload').click();
            });
        }

        const avatarUpload = document.getElementById('avatarUpload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', handleAvatarUpload);
        }

        // Save avatar
        const saveAvatarBtn = document.getElementById('saveAvatarBtn');
        if (saveAvatarBtn) {
            saveAvatarBtn.addEventListener('click', saveAvatar);
        }

        // Save profile
        const saveProfileBtn = document.getElementById('saveProfileBtn');
        if (saveProfileBtn) {
            saveProfileBtn.addEventListener('click', saveProfile);
        }

        // Filter partnership history
        document.querySelectorAll('[data-filter]').forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const filter = this.getAttribute('data-filter');
                filterPartnershipHistory(filter);
            });
        });

        // Initialize form validation
        initializeFormValidation();

        console.log("✅ Profile section initialized");

    }).catch(error => {
        console.error("❌ Failed to initialize profile section:", error);
        showNotification('Error initializing profile section: ' + error.message, 'error');
    });
}

// Form validation initialization
function initializeFormValidation() {
    // Bootstrap form validation
    const forms = document.querySelectorAll('.needs-validation');

    Array.from(forms).forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }

            form.classList.add('was-validated');
        }, false);
    });

    // Custom validation for URL
    const urlInput = document.getElementById('editWebsite');
    if (urlInput) {
        urlInput.addEventListener('input', function() {
            if (this.value && !isValidUrl(this.value)) {
                this.setCustomValidity('Please enter a valid URL (e.g., https://example.com)');
            } else {
                this.setCustomValidity('');
            }
        });
    }

    // Custom validation for year
    const yearInput = document.getElementById('editYearEstablished');
    if (yearInput) {
        yearInput.addEventListener('input', function() {
            const year = parseInt(this.value);
            if (this.value && (year < 1900 || year > new Date().getFullYear())) {
                this.setCustomValidity(`Please enter a valid year between 1900 and ${new Date().getFullYear()}`);
            } else {
                this.setCustomValidity('');
            }
        });
    }

    // Custom validation for phone
    const phoneInput = document.getElementById('editContactPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function() {
            if (this.value && !isValidPhone(this.value)) {
                this.setCustomValidity('Please enter a valid phone number');
            } else {
                this.setCustomValidity('');
            }
        });
    }
}

function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
}

function isValidPhone(phone) {
    // Basic phone validation - accepts numbers, spaces, dashes, plus sign, parentheses
    const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
}

// Load organization profile
export async function loadOrganizationProfile() {
    try {
        // Get current user info
        currentUserInfo = await getCurrentUserInfo();
        if (!currentUserInfo || !currentUserInfo.success) {
            showNotification('Please login to view profile', 'error');
            return;
        }

        currentUserEmail = currentUserInfo.email;

        // Get partner statistics
        let statsResult;
        try {
            const { getPartnerStats } = await import('./Partner_Dashboard.js');
            statsResult = await getPartnerStats(currentUserEmail);
        } catch (statsError) {
            console.warn('Could not load partner stats:', statsError);
            statsResult = { status: 'error', message: 'Could not load statistics' };
        }

        // Get partner requests
        let requestsResult;
        try {
            const { getPartnerRequests } = await import('./Partner_Dashboard.js');
            requestsResult = await getPartnerRequests(currentUserEmail);
        } catch (requestsError) {
            console.warn('Could not load partner requests:', requestsError);
            requestsResult = { status: 'error', message: 'Could not load requests' };
        }

        const requestsData = requestsResult.requests || [];

        // Store latest request ID
        if (requestsData.length > 0) {
            latestRequestId = requestsData[0].request_id;
        }

        // Get partner profile
        let profileResult;
        try {
            const { getPartnerProfile } = await import('./Partner_Dashboard.js');
            profileResult = await getPartnerProfile(currentUserEmail);
        } catch (profileError) {
            console.warn('Could not load partner profile:', profileError);
            profileResult = { status: 'error', message: 'Could not load profile' };
        }

        let orgDetails = {};

        if (profileResult.status === 'success') {
            orgDetails = {
                name: profileResult.organization.org_name,
                type: profileResult.organization.org_type,
                address: profileResult.organization.address,
                contactName: profileResult.organization.contact_person,
                contactPosition: profileResult.organization.position,
                contactEmail: profileResult.organization.email,
                contactPhone: profileResult.organization.phone,
                // Use user's status from users table instead of partnership request status
                status: currentUserInfo.status || 'active',
                submitted_at: profileResult.organization.submitted_at,
                updated_at: profileResult.organization.updated_at
            };
        } else {
            // Use user data as fallback
            orgDetails = {
                name: currentUserInfo.full_name,
                type: 'Partner Organization',
                contactEmail: currentUserInfo.email,
                contactName: currentUserInfo.full_name,
                // Use user's status from users table
                status: currentUserInfo.status || 'active'
            };
        }

        // Calculate stats from partnership_requests table
        const totalRequests = requestsData.length;
        const approvedRequests = requestsData.filter(r => r.status === 'approved').length;
        const pendingRequests = requestsData.filter(r => r.status === 'pending').length;
        const activeProjects = requestsData.filter(r =>
            r.status === 'approved' &&
            new Date(r.letter_date) >= new Date(new Date().setFullYear(new Date().getFullYear() - 1))
        ).length;

        // Update stats
        updateElementText('totalProjectsCount', totalRequests);
        updateElementText('activeProjectsCountProfile', activeProjects);
        updateElementText('approvedRequestsCountProfile', approvedRequests);
        updateElementText('pendingRequestsCountProfile', pendingRequests);

        // Update profile display
        updateElementText('orgNameDisplayProfile', orgDetails.name);
        updateElementText('orgTypeDisplayProfile', orgDetails.type);
        updateElementText('memberSince', new Date(currentUserInfo.created_at || Date.now()).getFullYear());

        // Update avatar with organization type icon
        updateOrganizationAvatar(orgDetails.type);

        // Update status badge using user's status
        updateStatusBadge(orgDetails.status);

        // Render organization details
        renderOrganizationDetails(orgDetails, requestsData);

        // Render contact information
        renderContactInformation(orgDetails);

        // Render partnership history
        renderPartnershipHistory(requestsData);

        // Update dashboard stats too
        if (statsResult.status === 'success') {
            updateDashboardStats(statsResult);
        }

        showNotification('Profile loaded successfully', 'success');

    } catch (error) {
        console.error('Error loading organization profile:', error);
        showNotification('Error loading profile data: ' + error.message, 'error');
    }
}

// Helper function to safely update element text
function updateElementText(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

function updateDashboardStats(statsResult) {
    if (statsResult.status === 'success') {
        const stats = statsResult.stats;
        const organization = statsResult.organization;

        // Update dashboard stats
        updateElementText('totalRequestsCount', stats.total_requests || 0);
        updateElementText('approvedRequestsCount', stats.approved_requests || 0);
        updateElementText('pendingRequestsCount', stats.pending_requests || 0);
        updateElementText('activeProjectsCount', stats.active_projects || 0);

        // Update organization info in dashboard
        if (organization) {
            updateElementText('orgNameDisplay', organization.org_name || 'Partner Organization');
            updateElementText('orgTypeDisplay', organization.org_type || '');
            updateElementText('orgEmailDisplay', organization.email || '');
            // Use user's status from users table instead
            updateElementText('orgStatusDisplay', currentUserInfo?.status || 'Active');
        }
    }
}

function updateOrganizationAvatar(orgType) {
    const avatar = document.getElementById('orgAvatar');
    if (!avatar) return;

    let icon = 'building';

    // Map organization types to icons
    const iconMap = {
        'Government': 'building',
        'NGO': 'people',
        'Private Company': 'briefcase',
        'Academic': 'mortarboard',
        'Community-Based': 'house',
        'Other': 'building'
    };

    icon = iconMap[orgType] || 'building';
    avatar.innerHTML = `<i class="bi bi-${icon}"></i>`;
}

function updateStatusBadge(status) {
    const badge = document.getElementById('orgStatusBadge');
    if (!badge) return;

    // Updated status mapping based on users table status values
    const statusMap = {
        'active': { class: 'bg-success', text: 'Active Partner', icon: 'check-circle' },
        'pending': { class: 'bg-warning', text: 'Pending Approval', icon: 'clock' },
        'inactive': { class: 'bg-secondary', text: 'Inactive', icon: 'pause-circle' },
        'suspended': { class: 'bg-danger', text: 'Suspended', icon: 'slash-circle' },
        'approved': { class: 'bg-success', text: 'Active Partner', icon: 'check-circle' },
        'reviewed': { class: 'bg-info', text: 'Under Review', icon: 'eye' },
        'rejected': { class: 'bg-danger', text: 'Rejected', icon: 'x-circle' },
        'cancelled': { class: 'bg-secondary', text: 'Cancelled', icon: 'slash-circle' }
    };

    const statusInfo = statusMap[status] || { class: 'bg-secondary', text: 'Unknown', icon: 'question-circle' };

    badge.className = `badge ${statusInfo.class} p-2`;
    badge.innerHTML = `<i class="bi bi-${statusInfo.icon} me-1"></i> ${statusInfo.text}`;
}

function renderOrganizationDetails(orgDetails, requests) {
    const container = document.getElementById('orgDetailsContent');
    if (!container) return;

    // Get the latest request for more details
    const latestRequest = requests.length > 0 ? requests[0] : null;

    // Calculate additional statistics
    const completedRequests = requests.filter(r =>
        r.status === 'approved' &&
        new Date(r.letter_date) < new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    ).length;

    const successRate = requests.length > 0
        ? Math.round((requests.filter(r => r.status === 'approved').length / requests.length) * 100)
        : 0;

    const html = `
        <div class="profile-details">
            <div class="profile-field d-flex align-items-start mb-3">
                <span class="field-label me-3">Organization Type:</span>
                <span class="field-value">
                    <span class="badge bg-cnsc-100 text-cnsc-800">${escapeHtml(orgDetails.type || 'Not specified')}</span>
                </span>
            </div>

            <div class="profile-field d-flex align-items-start mb-3">
                <span class="field-label me-3">Organization Address:</span>
                <span class="field-value">${escapeHtml(orgDetails.address || 'Not specified')}</span>
            </div>

            ${latestRequest ? `
            <div class="profile-field d-flex align-items-start mb-3">
                <span class="field-label me-3">Latest Request Subject:</span>
                <span class="field-value">${escapeHtml(latestRequest.subject || 'No subject')}</span>
            </div>

            <div class="profile-field d-flex align-items-start mb-3">
                <span class="field-label me-3">Collaboration Areas:</span>
                <span class="field-value">${formatCollaborationAreas(latestRequest.collaboration) || 'Not specified'}</span>
            </div>

            <div class="profile-field d-flex align-items-start mb-3">
                <span class="field-label me-3">Expected Outcomes:</span>
                <span class="field-value">${escapeHtml(latestRequest.outcomes || 'Not specified')}</span>
            </div>
            ` : ''}

            <div class="profile-field d-flex align-items-start mb-3">
                <span class="field-label me-3">Additional Information:</span>
                <span class="field-value">${escapeHtml(latestRequest?.additional_info || 'None provided')}</span>
            </div>

            <hr class="my-4">

            <div class="row">
                <div class="col-md-6">
                    <div class="profile-field d-flex align-items-start mb-3">
                        <span class="field-label me-3">Total Submissions:</span>
                        <span class="field-value">
                            <span class="badge bg-primary">${requests.length} requests</span>
                        </span>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="profile-field d-flex align-items-start mb-3">
                        <span class="field-label me-3">Success Rate:</span>
                        <span class="field-value">
                            <span class="badge ${successRate >= 50 ? 'bg-success' : 'bg-warning'}">
                                ${successRate}% approved
                            </span>
                        </span>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6">
                    <div class="profile-field d-flex align-items-start mb-3">
                        <span class="field-label me-3">Completed Projects:</span>
                        <span class="field-value">
                            <span class="badge bg-secondary">${completedRequests} projects</span>
                        </span>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="profile-field d-flex align-items-start mb-3">
                        <span class="field-label me-3">Latest Submission:</span>
                        <span class="field-value">
                            ${latestRequest?.submitted_at ? new Date(latestRequest.submitted_at).toLocaleDateString() : 'No submissions'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCollaborationAreas(collaborationText) {
    if (!collaborationText) return '';

    // Split by common delimiters and create badges
    const areas = collaborationText.split(/[,\n]/).map(area => area.trim()).filter(area => area);

    if (areas.length === 0) return escapeHtml(collaborationText);

    return areas.map(area =>
        `<span class="badge bg-light text-dark border me-1 mb-1">${escapeHtml(area)}</span>`
    ).join('');
}

function renderContactInformation(orgDetails) {
    const container = document.getElementById('contactInfoContent');
    if (!container) return;

    const html = `
        <div class="contact-info">
            <div class="mb-3">
                <h6 class="fw-bold text-cnsc-700">Primary Contact Person</h6>
                <p class="mb-1">
                    <i class="bi bi-person me-2 text-muted"></i>
                    ${escapeHtml(orgDetails.contactName || 'Not specified')}
                </p>
                <p class="mb-1">
                    <i class="bi bi-briefcase me-2 text-muted"></i>
                    ${escapeHtml(orgDetails.contactPosition || 'Not specified')}
                </p>
            </div>

            <div class="mb-3">
                <h6 class="fw-bold text-cnsc-700">Contact Details</h6>
                <p class="mb-1">
                    <i class="bi bi-envelope me-2 text-muted"></i>
                    ${escapeHtml(orgDetails.contactEmail || 'Not specified')}
                </p>
                <p class="mb-1">
                    <i class="bi bi-telephone me-2 text-muted"></i>
                    ${escapeHtml(orgDetails.contactPhone || 'Not specified')}
                </p>
            </div>

            <div class="mb-3">
                <h6 class="fw-bold text-cnsc-700">Account Status</h6>
                <p class="mb-1">
                    <i class="bi bi-shield-check me-2 text-muted"></i>
                    Status: <span class="badge ${getStatusBadgeClass(orgDetails.status)} ms-1">${orgDetails.status}</span>
                </p>
                <p class="mb-1">
                    <i class="bi bi-calendar me-2 text-muted"></i>
                    Account Created: ${orgDetails.submitted_at ? new Date(orgDetails.submitted_at).toLocaleDateString() : 'Not specified'}
                </p>
            </div>

            <div class="mb-3">
                <h6 class="fw-bold text-cnsc-700">Latest Activity</h6>
                <p class="mb-1">
                    <i class="bi bi-clock me-2 text-muted"></i>
                    Last Updated: ${orgDetails.updated_at ? new Date(orgDetails.updated_at).toLocaleDateString() : 'Not specified'}
                </p>
            </div>

            <div class="alert alert-light border small mt-3">
                <i class="bi bi-info-circle me-2 text-cnsc-500"></i>
                This information is used for partnership communication and documentation.
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderPartnershipHistory(requests) {
    const container = document.getElementById('partnershipHistoryContent');
    if (!container) return;

    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="bi bi-clock-history fs-1 text-muted"></i>
                <h5 class="mt-3">No partnership history</h5>
                <p class="text-muted">Start by submitting your first partnership request.</p>
                <button class="btn btn-cnsc mt-2" onclick="document.getElementById('new-request-link').click()">
                    <i class="bi bi-plus-circle me-2"></i>Submit First Request
                </button>
            </div>
        `;
        return;
    }

    const html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Request ID</th>
                        <th>Subject</th>
                        <th>Date Submitted</th>
                        <th>Letter Date</th>
                        <th>Request Status</th>
                        <th>Reviewed By</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${requests.map(request => `
                        <tr>
                            <td>
                                <span class="fw-medium">PR-${request.request_id.toString().padStart(4, '0')}</span>
                            </td>
                            <td>
                                <div class="text-truncate" style="max-width: 200px;" title="${escapeHtml(request.subject)}">
                                    ${escapeHtml(request.subject)}
                                </div>
                            </td>
                            <td>
                                <span class="text-nowrap">
                                    ${new Date(request.submitted_at).toLocaleDateString()}
                                </span>
                            </td>
                            <td>
                                <span class="text-nowrap">
                                    ${request.letter_date ? new Date(request.letter_date).toLocaleDateString() : 'N/A'}
                                </span>
                            </td>
                            <td>
                                <span class="badge ${getRequestStatusBadgeClass(request.status)}">
                                    ${request.status}
                                </span>
                            </td>
                            <td>
                                ${request.reviewed_by ?
                                    `<span class="text-muted small">${escapeHtml(request.reviewed_by)}</span>` :
                                    '<span class="text-muted small">Not reviewed</span>'
                                }
                            </td>
                            <td>
                                <div class="btn-group btn-group-sm" role="group">
                                    <button class="btn btn-outline-primary" onclick="window.viewProfileRequestDetails(${request.request_id})" title="View Details">
                                        <i class="bi bi-eye"></i>
                                    </button>
                                    ${request.status === 'pending' ? `
                                        <button class="btn btn-outline-warning" onclick="window.editProfileRequest(${request.request_id})" title="Edit Request">
                                            <i class="bi bi-pencil"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" onclick="window.cancelProfileRequest(${request.request_id})" title="Cancel Request">
                                            <i class="bi bi-x-circle"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="row mt-3">
            <div class="col-md-6">
                <div class="alert alert-light border">
                    <small>
                        <i class="bi bi-info-circle me-2"></i>
                        Showing ${requests.length} partnership request${requests.length !== 1 ? 's' : ''}
                    </small>
                </div>
            </div>
            <div class="col-md-6 text-end">
                <small class="text-muted">
                    Last updated: ${new Date().toLocaleDateString()}
                </small>
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function filterPartnershipHistory(filter) {
    const rows = document.querySelectorAll('#partnershipHistoryContent tbody tr');
    rows.forEach(row => {
        const status = row.querySelector('.badge').textContent.toLowerCase();
        let show = true;

        switch(filter) {
            case 'active':
                show = status === 'approved';
                break;
            case 'completed':
                const dateCell = row.cells[3];
                const letterDate = new Date(dateCell.textContent);
                const oneYearAgo = new Date(new Date().setFullYear(new Date().getFullYear() - 1));
                show = status === 'approved' && letterDate < oneYearAgo;
                break;
            case 'year':
                const submitDateCell = row.cells[2];
                const submitDate = new Date(submitDateCell.textContent);
                show = submitDate.getFullYear() === new Date().getFullYear();
                break;
            default:
                show = true;
        }

        row.style.display = show ? '' : 'none';
    });
}

function getStatusBadgeClass(status) {
    // For user account status
    const statusClasses = {
        'active': 'bg-success',
        'pending': 'bg-warning text-dark',
        'inactive': 'bg-secondary',
        'suspended': 'bg-danger',
        'approved': 'bg-success',
        'reviewed': 'bg-info',
        'rejected': 'bg-danger',
        'cancelled': 'bg-secondary'
    };
    return statusClasses[status] || 'bg-secondary';
}

function getRequestStatusBadgeClass(status) {
    // For partnership request status (kept separate)
    const statusClasses = {
        'pending': 'bg-warning text-dark',
        'approved': 'bg-success',
        'reviewed': 'bg-info',
        'rejected': 'bg-danger',
        'cancelled': 'bg-secondary'
    };
    return statusClasses[status] || 'bg-secondary';
}

// Get current user info with better error handling
async function getCurrentUserInfo() {
    try {
        const { getCurrentUserInfo } = await import('./Partner_Dashboard.js');
        return getCurrentUserInfo();
    } catch (error) {
        console.error('Error getting user info:', error);
        // Return fallback user info
        return {
            success: false,
            email: 'user@example.com',
            full_name: 'Demo User',
            status: 'active',
            created_at: new Date().toISOString()
        };
    }
}

// Show edit profile modal
export async function showEditProfileModal() {
    try {
        // Get current user info
        currentUserInfo = await getCurrentUserInfo();
        if (!currentUserInfo || !currentUserInfo.success) {
            showNotification('Please login to edit profile', 'error');
            return;
        }

        // Get partner requests to get latest data
        let requestsResult;
        try {
            const { getPartnerRequests } = await import('./Partner_Dashboard.js');
            requestsResult = await getPartnerRequests(currentUserInfo.email);
        } catch (error) {
            console.warn('Could not load partner requests:', error);
            requestsResult = { requests: [] };
        }

        const requestsData = requestsResult.requests || [];
        const latestRequest = requestsData.length > 0 ? requestsData[0] : {};

        // Pre-fill form with data
        const formFields = {
            'editOrgName': latestRequest.org_name || currentUserInfo.full_name || '',
            'editOrgType': latestRequest.org_type || '',
            'editOrgAddress': latestRequest.address || '',
            'editOrgDescription': latestRequest.additional_info || '',
            'editContactName': latestRequest.contact_person || currentUserInfo.full_name || '',
            'editContactPosition': latestRequest.position || '',
            'editContactEmail': latestRequest.email || currentUserInfo.email || '',
            'editContactPhone': latestRequest.phone || '',
            'editAdditionalInfo': latestRequest.additional_info || ''
        };

        // Set form values
        Object.entries(formFields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.value = value;
        });

        // Pre-fill expertise checkboxes
        if (latestRequest.collaboration) {
            const expertiseAreas = ['Education', 'Research', 'Community', 'Environment', 'Health', 'Technology'];
            expertiseAreas.forEach(area => {
                const checkbox = document.getElementById(`expertise${area}`);
                if (checkbox && latestRequest.collaboration.toLowerCase().includes(area.toLowerCase())) {
                    checkbox.checked = true;
                }
            });
        }

        // Store current user email for saving
        currentUserEmail = currentUserInfo.email;
        latestRequestId = latestRequest.request_id || null;

        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('editProfileModal'));
        modal.show();

        // Add listener for modal hidden event
        modal._element.addEventListener('hidden.bs.modal', function () {
            // Reset form validation
            const form = document.getElementById('editProfileForm');
            if (form) form.classList.remove('was-validated');

            // Enable save button
            const saveButton = document.getElementById('saveProfileBtn');
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = '<i class="bi bi-check-circle me-1"></i> Save Changes';
            }
        });

    } catch (error) {
        console.error('Error loading edit profile data:', error);
        showNotification('Error loading profile data for editing: ' + error.message, 'error');
    }
}

// Show change avatar modal
export function showChangeAvatarModal() {
    const modalElement = document.getElementById('changeAvatarModal');
    if (!modalElement) return;

    const modal = new bootstrap.Modal(modalElement);
    modal.show();
}

function updateAvatarPreview(style) {
    const preview = document.getElementById('avatarPreview');
    if (preview) {
        preview.innerHTML = `<i class="bi bi-${style}"></i>`;
    }
}

function handleAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.match('image.*')) {
        showNotification('Please select an image file (JPEG, PNG, etc.)', 'error');
        return;
    }

    if (file.size > 2 * 1024 * 1024) {
        showNotification('Image size should be less than 2MB', 'error');
        return;
    }

    // Preview image
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('avatarPreview');
        if (preview) {
            preview.innerHTML = '';
            preview.style.backgroundImage = `url(${e.target.result})`;
            preview.style.backgroundSize = 'cover';
            preview.style.backgroundPosition = 'center';
        }
    };
    reader.readAsDataURL(file);
}

// Save avatar function
export async function saveAvatar() {
    try {
        // Get the selected avatar style or uploaded image
        const selectedOption = document.querySelector('.avatar-option.active');
        const avatarStyle = selectedOption ? selectedOption.dataset.style : 'building';

        // Update the organization avatar display
        const avatar = document.getElementById('orgAvatar');
        if (avatar) {
            avatar.innerHTML = `<i class="bi bi-${avatarStyle}"></i>`;
        }

        // If there's an uploaded image, you could save it to storage here
        const fileInput = document.getElementById('avatarUpload');
        if (fileInput && fileInput.files.length > 0) {
            // In a real application, you would upload the file to your server
            console.log('Avatar file selected (would be uploaded in production)');
        }

        showNotification('Avatar updated successfully', 'success');

        const modalElement = document.getElementById('changeAvatarModal');
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }

    } catch (error) {
        console.error('Error saving avatar:', error);
        showNotification('Error saving avatar: ' + error.message, 'error');
    }
}

// Save profile function (main editing function)
export async function saveProfile() {
    const form = document.getElementById('editProfileForm');
    if (!form) {
        showNotification('Edit form not found', 'error');
        return;
    }

    // First, validate the form
    if (!form.checkValidity()) {
        // Add Bootstrap validation classes
        form.classList.add('was-validated');

        // Scroll to first invalid field
        const firstInvalid = form.querySelector(':invalid');
        if (firstInvalid) {
            firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
            firstInvalid.focus();
        }

        return;
    }

    try {
        // Get current user info
        currentUserInfo = await getCurrentUserInfo();
        if (!currentUserInfo) {
            showNotification('Unable to get user information', 'error');
            return;
        }

        // Get form data
        const formData = {
            org_name: getFormValue('editOrgName').trim(),
            org_type: getFormValue('editOrgType'),
            address: getFormValue('editOrgAddress').trim(),
            contact_person: getFormValue('editContactName').trim(),
            position: getFormValue('editContactPosition').trim(),
            email: getFormValue('editContactEmail').trim(),
            phone: getFormValue('editContactPhone').trim(),
            additional_info: getFormValue('editAdditionalInfo').trim(),
            updated_at: new Date().toISOString()
        };

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            showNotification('Please enter a valid email address', 'error');
            document.getElementById('editContactEmail').focus();
            return;
        }

        // Validate phone number (basic validation)
        const cleanPhone = formData.phone.replace(/\s/g, '');
        if (!cleanPhone.match(/^[\d\-\+\(\)]{7,20}$/)) {
            showNotification('Please enter a valid phone number (7-20 digits)', 'error');
            document.getElementById('editContactPhone').focus();
            return;
        }

        // Show loading state
        const saveButton = document.getElementById('saveProfileBtn');
        if (!saveButton) {
            showNotification('Save button not found', 'error');
            return;
        }

        const originalText = saveButton.innerHTML;
        saveButton.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';
        saveButton.disabled = true;

        let updateSuccessful = false;
        let errorMessage = 'Database update failed';

        // Only attempt database updates if Supabase is initialized
        if (isSupabaseInitialized && supabaseInstance) {
            // Method 1: Update the latest partnership request
            if (latestRequestId) {
                try {
                    const { data, error } = await supabaseInstance
                        .from('partnership_requests')
                        .update(formData)
                        .eq('request_id', latestRequestId)
                        .eq('email', currentUserEmail);

                    if (error) throw error;

                    if (data) {
                        updateSuccessful = true;
                        console.log('Successfully updated partnership request:', data);
                    }
                } catch (error) {
                    console.error('Error updating partnership request:', error);
                    errorMessage = error.message;
                }
            }

            // Method 2: Update all partnership requests with the same email
            if (!updateSuccessful && currentUserEmail) {
                try {
                    const { data, error } = await supabaseInstance
                        .from('partnership_requests')
                        .update(formData)
                        .eq('email', currentUserEmail);

                    if (error) throw error;

                    if (data) {
                        updateSuccessful = true;
                        console.log('Successfully updated all partnership requests');
                    }
                } catch (error) {
                    console.error('Error updating all partnership requests:', error);
                    errorMessage = error.message;
                }
            }

            // Method 3: Create a new partnership request if none exists
            if (!updateSuccessful) {
                console.log('No existing requests found, creating new profile placeholder...');
                try {
                    const newRequestId = await createProfilePlaceholderRequest(formData);
                    if (newRequestId) {
                        latestRequestId = newRequestId;
                        updateSuccessful = true;
                        console.log('Created new profile placeholder request:', newRequestId);
                    }
                } catch (error) {
                    console.error('Error creating placeholder request:', error);
                    errorMessage = 'Failed to create new profile entry: ' + error.message;
                }
            }

            // Method 4: Update users table (including updating full_name and email)
            try {
                const updateData = {
                    full_name: formData.contact_person,
                    email: formData.email,
                    updated_at: new Date().toISOString()
                };

                const { error: userError } = await supabaseInstance
                    .from('users')
                    .update(updateData)
                    .eq('email', currentUserEmail);

                if (userError) throw userError;

                console.log('Successfully updated user record');
                if (!updateSuccessful) updateSuccessful = true;

                // Update currentUserInfo with new email if it changed
                if (formData.email !== currentUserEmail) {
                    currentUserEmail = formData.email;
                    currentUserInfo.email = formData.email;
                    currentUserInfo.full_name = formData.contact_person;
                }

            } catch (userError) {
                console.error('Error updating user record:', userError);
                if (!updateSuccessful) {
                    errorMessage = userError.message;
                }
            }
        } else {
            // Supabase not initialized - use localStorage as fallback
            console.warn('Supabase not initialized, using localStorage fallback');
            try {
                localStorage.setItem('partner_profile_draft', JSON.stringify(formData));
                updateSuccessful = true;
                console.log('Profile saved to localStorage (draft)');
            } catch (storageError) {
                console.error('Error saving to localStorage:', storageError);
                errorMessage = 'Failed to save profile locally';
            }
        }

        // Restore button state
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;

        if (updateSuccessful) {
            showNotification('Profile updated successfully!', 'success');
            const modalElement = document.getElementById('editProfileModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }

            // Clear form validation
            form.classList.remove('was-validated');

            // Refresh profile data
            await loadOrganizationProfile();

        } else {
            showNotification(`Error saving profile: ${errorMessage}`, 'error');
        }

    } catch (error) {
        console.error('Error saving profile:', error);

        // Restore button state
        const saveButton = document.getElementById('saveProfileBtn');
        if (saveButton) {
            saveButton.innerHTML = '<i class="bi bi-check-circle me-1"></i> Save Changes';
            saveButton.disabled = false;
        }

        showNotification('Error saving profile: ' + error.message, 'error');
    }
}

// Helper function to get form values
function getFormValue(elementId) {
    const element = document.getElementById(elementId);
    return element ? element.value : '';
}

// Create a new partnership request if none exists
async function createProfilePlaceholderRequest(formData) {
    try {
        if (!isSupabaseInitialized || !supabaseInstance) {
            console.error('Supabase not initialized');
            return null;
        }

        const userInfo = await getCurrentUserInfo();
        if (!userInfo || !userInfo.success) return null;

        // Get selected expertise areas
        const expertiseAreas = [];
        const checkboxes = document.querySelectorAll('.form-check-input:checked');
        checkboxes.forEach(checkbox => {
            if (checkbox.checked) {
                expertiseAreas.push(checkbox.value);
            }
        });

        const placeholderData = {
            letter_date: new Date().toISOString().split('T')[0],
            subject: 'Organization Profile Information',
            org_name: formData.org_name,
            org_type: formData.org_type,
            address: formData.address,
            collaboration: expertiseAreas.length > 0 ? expertiseAreas.join(', ') : 'Profile information for partnership consideration',
            outcomes: 'Profile maintenance and updates',
            additional_info: formData.additional_info,
            contact_person: formData.contact_person,
            position: formData.position,
            email: formData.email,
            phone: formData.phone,
            status: 'pending',
            submitted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: userInfo.user_id || null
        };

        const { data, error } = await supabaseInstance
            .from('partnership_requests')
            .insert([placeholderData])
            .select()
            .single();

        if (error) {
            console.error('Error creating placeholder request:', error);
            return null;
        }

        return data.request_id;
    } catch (error) {
        console.error('Error in createProfilePlaceholderRequest:', error);
        return null;
    }
}

// Export profile data function
export async function exportProfileData() {
    try {
        const userInfo = await getCurrentUserInfo();
        if (!userInfo || !userInfo.success) {
            showNotification('Please login to export data', 'error');
            return;
        }

        const userEmail = userInfo.email;

        // Get all partner requests
        let requestsResult;
        try {
            const { getPartnerRequests } = await import('./Partner_Dashboard.js');
            requestsResult = await getPartnerRequests(userEmail);
        } catch (error) {
            console.error('Error getting partner requests:', error);
            requestsResult = { requests: [] };
        }

        // Get partner profile
        let profileResult;
        try {
            const { getPartnerProfile } = await import('./Partner_Dashboard.js');
            profileResult = await getPartnerProfile(userEmail);
        } catch (error) {
            console.error('Error getting partner profile:', error);
            profileResult = { status: 'error' };
        }

        // Create comprehensive export data
        const exportData = {
            exported_at: new Date().toISOString(),
            organization_profile: {
                user_details: userInfo,
                organization_details: profileResult.status === 'success' ? profileResult.organization : null,
                statistics: {
                    total_requests: requestsResult.requests?.length || 0,
                    approved_requests: requestsResult.requests?.filter(r => r.status === 'approved').length || 0,
                    pending_requests: requestsResult.requests?.filter(r => r.status === 'pending').length || 0,
                    reviewed_requests: requestsResult.requests?.filter(r => r.status === 'reviewed').length || 0,
                    rejected_requests: requestsResult.requests?.filter(r => r.status === 'rejected').length || 0,
                    cancelled_requests: requestsResult.requests?.filter(r => r.status === 'cancelled').length || 0
                }
            },
            partnership_history: requestsResult.requests || [],
            export_metadata: {
                format_version: '1.0',
                generated_by: 'CNSC Partner Dashboard',
                data_source: 'partnership_requests table'
            }
        };

        // Create and download JSON file
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `cnsc-partner-profile-${userEmail.split('@')[0]}-${new Date().toISOString().split('T')[0]}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        document.body.appendChild(linkElement);
        linkElement.click();
        document.body.removeChild(linkElement);

        showNotification('Profile data exported successfully', 'success');

    } catch (error) {
        console.error('Error exporting profile:', error);
        showNotification('Error exporting profile data: ' + error.message, 'error');
    }
}

// Helper function for notifications
export function showNotification(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1060';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.setAttribute('role', 'alert');

    // Map type to icon
    const iconMap = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    const icon = iconMap[type] || 'info-circle';

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body d-flex align-items-center">
                <i class="bi bi-${icon} me-2"></i>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    toastContainer.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, {
        delay: 5000,
        animation: true
    });
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', function () {
        if (toast.parentNode === toastContainer) {
            toastContainer.removeChild(toast);
        }
    });
}

// Make profile-history helpers available globally for HTML onclick handlers
// They DELEGATE to the main Partner_Panel.js handlers if available,
// without overwriting them.
window.viewProfileRequestDetails = function(requestId) {
    if (typeof window.viewRequestDetails === 'function') {
        window.viewRequestDetails(requestId);
    } else {
        showNotification(`Viewing request PR-${requestId.toString().padStart(4, '0')}`, 'info');
    }
};

window.editProfileRequest = function(requestId) {
    if (typeof window.editRequest === 'function') {
        window.editRequest(requestId);
    } else {
        showNotification('Edit functionality not available', 'warning');
    }
};

window.cancelProfileRequest = function(requestId) {
    if (typeof window.cancelRequest === 'function') {
        window.cancelRequest(requestId);
    } else {
        if (confirm('Are you sure you want to cancel this request?')) {
            showNotification('Request cancellation initiated', 'info');
        }
    }
};