// Admin_Panel.js - COMPLETE PROPOSAL MANAGEMENT VERSION
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

// Import the Statistics module
import {
    loadStatistics,
    updateStatisticsUI,
    drawCharts,
    refreshStatistics
} from './Statistics.js';

// Store proposals globally for modal access
window.adminProposals = [];

// ============================================
// PROPOSAL STATISTICS FUNCTIONS
// ============================================

function updateProposalStatistics(proposals) {
    if (!proposals) return;
    
    const total = proposals.length;
    const approved = proposals.filter(p => p.status === 'Approved').length;
    const pending = proposals.filter(p => p.status === 'Pending').length;
    const revision = proposals.filter(p => p.status === 'Revision Requested').length;
    const archived = proposals.filter(p => p.status === 'Archived').length;
    
    const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    updateElement('totalProposalsCount', total);
    updateElement('approvedProposalsCount', approved);
    updateElement('pendingProposalsCount', pending);
    updateElement('revisionProposalsCount', revision);
    
    const lastUpdatedEl = document.getElementById('proposalsLastUpdated');
    if (lastUpdatedEl) {
        const now = new Date();
        lastUpdatedEl.textContent = `Last updated: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    return { total, approved, pending, revision, archived };
}

// ============================================
// PROPOSAL MANAGEMENT FUNCTIONS
// ============================================

async function viewProposalDetails(index) {
    try {
        const proposal = window.adminProposals[index];
        if (!proposal) {
            alert('Proposal not found');
            return;
        }
        
        // Fetch data from related tables
        let logframe = null;
        let staff = null;
        
        try {
            const logframeResult = await supabase
                .from('faculty_proposal_logframe')
                .select('*')
                .eq('proposal_id', proposal.id);
            
            if (logframeResult.data && logframeResult.data.length > 0) {
                logframe = logframeResult.data[0];
            }
            
        } catch (err) {
            // Silent fail for logframe
        }
        
        try {
            const staffResult = await supabase
                .from('faculty_proposal_staff')
                .select('*')
                .eq('proposal_id', proposal.id);
            
            if (staffResult.data && staffResult.data.length > 0) {
                staff = staffResult.data[0];
            }
            
        } catch (err) {
            // Silent fail for staff
        }
        
        // Create modal with conditional rendering
        const modalHtml = `
            <div class="modal fade" id="proposalDetailsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-xl modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">
                                ${proposal.title || 'Untitled Proposal'}
                                <small class="text-light opacity-75">ID: ${proposal.id.substring(0, 8)}...</small>
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        
                        <div class="modal-body">
                            <!-- Status Alert -->
                            <div class="alert ${proposal.status === 'Revision Requested' ? 'alert-warning' : 'alert-info'}">
                                <div class="d-flex justify-content-between align-items-center">
                                    <div>
                                        <strong>Status:</strong> 
                                        <span class="badge ${getStatusBadgeClass(proposal.status)} ms-2">
                                            ${proposal.status}
                                        </span>
                                        ${proposal.revision_reason ? `
                                            <div class="mt-2">
                                                <strong>Revision Request:</strong> ${proposal.revision_reason}
                                            </div>
                                        ` : ''}
                                    </div>
                                    <div class="text-end">
                                        <small class="text-muted">
                                            Created: ${new Date(proposal.created_at).toLocaleDateString()}
                                        </small>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Data Availability Indicators -->
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-body text-center">
                                            <h6>Logframe Data</h6>
                                            ${logframe ? 
                                                '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Available</span>' : 
                                                '<span class="badge bg-warning"><i class="bi bi-exclamation-triangle"></i> Not Found</span>'}
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="card">
                                        <div class="card-body text-center">
                                            <h6>Staff Data</h6>
                                            ${staff ? 
                                                '<span class="badge bg-success"><i class="bi bi-check-circle"></i> Available</span>' : 
                                                '<span class="badge bg-warning"><i class="bi bi-exclamation-triangle"></i> Not Found</span>'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Main Content Tabs -->
                            <ul class="nav nav-tabs mb-3" id="proposalTabs" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="basic-tab" data-bs-toggle="tab" data-bs-target="#basic">
                                        <i class="bi bi-info-circle"></i> Basic Info
                                    </button>
                                </li>
                                ${logframe ? `
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="logframe-tab" data-bs-toggle="tab" data-bs-target="#logframe">
                                        <i class="bi bi-table"></i> Logframe Matrix
                                    </button>
                                </li>
                                ` : ''}
                                ${staff ? `
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="staff-tab" data-bs-toggle="tab" data-bs-target="#staff">
                                        <i class="bi bi-people"></i> Staff & Contacts
                                    </button>
                                </li>
                                ` : ''}
                            </ul>
                            
                            <div class="tab-content">
                                <!-- Tab 1: Basic Information -->
                                <div class="tab-pane fade show active" id="basic" role="tabpanel">
                                    ${renderBasicInfo(proposal)}
                                </div>
                                
                                <!-- Tab 2: Logframe Matrix (only if data exists) -->
                                ${logframe ? `
                                <div class="tab-pane fade" id="logframe" role="tabpanel">
                                    ${renderLogframeInfo(logframe)}
                                </div>
                                ` : ''}
                                
                                <!-- Tab 3: Staff Information (only if data exists) -->
                                ${staff ? `
                                <div class="tab-pane fade" id="staff" role="tabpanel">
                                    ${renderStaffInfo(staff)}
                                </div>
                                ` : ''}
                            </div>
                            
                            <!-- Missing Data Warning -->
                            ${(!logframe || !staff) ? `
                            <div class="alert alert-warning mt-4">
                                <h6><i class="bi bi-exclamation-triangle"></i> Missing Related Data</h6>
                                <p class="mb-1">This proposal is missing data in related tables:</p>
                                <ul>
                                    ${!logframe ? '<li><strong>Logframe Matrix</strong> - No data found</li>' : ''}
                                    ${!staff ? '<li><strong>Staff Information</strong> - No data found</li>' : ''}
                                </ul>
                                <small class="text-muted">
                                    The faculty member may need to complete these sections when submitting their proposal.
                                </small>
                            </div>
                            ` : ''}
                        </div>
                        
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal
        const existingModal = document.getElementById('proposalDetailsModal');
        if (existingModal) existingModal.remove();
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('proposalDetailsModal'));
        modal.show();
        
    } catch (error) {
        alert('Failed to load proposal details.');
    }
}

// Helper Functions
function renderBasicInfo(proposal) {
    return `
        <div class="row">
            <div class="col-md-6">
                <h6 class="border-bottom pb-2">Proposal Information</h6>
                <table class="table table-sm">
                    <tr><td><strong>Proponents:</strong></td><td>${proposal.proponents || 'N/A'}</td></tr>
                    <tr><td><strong>Project Type:</strong></td><td>${proposal.project_type || 'N/A'}</td></tr>
                    <tr><td><strong>User ID:</strong></td><td>${proposal.user_id || 'N/A'}</td></tr>
                    <tr><td><strong>Date Started:</strong></td><td>${proposal.date_started || 'N/A'}</td></tr>
                </table>
            </div>
            
            <div class="col-md-6">
                <h6 class="border-bottom pb-2">Project Details</h6>
                <table class="table table-sm">
                    <tr><td><strong>Budget:</strong></td><td>${proposal.budget_requirement ? '$' + parseFloat(proposal.budget_requirement).toLocaleString() : 'N/A'}</td></tr>
                    <tr><td><strong>Implementation Days:</strong></td><td>${proposal.implementation_days || 'N/A'}</td></tr>
                    <tr><td><strong>Metric Value:</strong></td><td>${proposal.matric_value || 'N/A'}</td></tr>
                    <tr><td><strong>Last Updated:</strong></td><td>${proposal.updated_at ? new Date(proposal.updated_at).toLocaleDateString() : 'Never'}</td></tr>
                </table>
            </div>
        </div>
        
        <div class="row mt-3">
            <div class="col-md-6">
                <h6 class="border-bottom pb-2">Beneficiaries</h6>
                <table class="table table-sm">
                    <tr><td><strong>Count:</strong></td><td>${proposal.beneficiaries_count || 'N/A'}</td></tr>
                    <tr><td><strong>Type:</strong></td><td>${proposal.beneficiaries_type || 'N/A'}</td></tr>
                    <tr><td><strong>Location:</strong></td><td>${proposal.beneficiaries_location || 'N/A'}</td></tr>
                </table>
            </div>
            
            <div class="col-md-6">
                <h6 class="border-bottom pb-2">Additional Info</h6>
                <table class="table table-sm">
                    <tr><td><strong>Attachment Unit:</strong></td><td>${proposal.attachment_unit || 'N/A'}</td></tr>
                    <tr><td><strong>Created:</strong></td><td>${new Date(proposal.created_at).toLocaleString()}</td></tr>
                </table>
            </div>
        </div>
        
        <div class="mt-4">
            <h6 class="border-bottom pb-2">Rationale</h6>
            <div class="p-3 bg-light rounded">
                ${proposal.rationale || 'No rationale provided.'}
            </div>
        </div>
    `;
}

function renderLogframeInfo(logframe) {
    return `
        <div class="table-responsive">
            <table class="table table-bordered">
                <thead class="table-light">
                    <tr><th width="25%">Field</th><th>Details</th></tr>
                </thead>
                <tbody>
                    <tr><td><strong>Row Type</strong></td><td>${logframe.row_type || 'N/A'}</td></tr>
                    <tr><td><strong>Narrative Summary</strong></td><td>${logframe.narrative_summary || 'N/A'}</td></tr>
                    <tr><td><strong>Verifiable Indicators</strong></td><td>${logframe.verifiable_indicators || 'N/A'}</td></tr>
                    <tr><td><strong>Means of Verification</strong></td><td>${logframe.means_verification || 'N/A'}</td></tr>
                    <tr><td><strong>Assumptions</strong></td><td>${logframe.assumptions || 'N/A'}</td></tr>
                </tbody>
            </table>
        </div>
        <div class="mt-3 text-muted">
            <small><i class="bi bi-info-circle"></i> This data is from the faculty_proposal_logframe table</small>
        </div>
    `;
}

function renderStaffInfo(staff) {
    return `
        <div class="row">
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header"><strong>Office Staff</strong></div>
                    <div class="card-body">
                        <p>${staff.office_staff || 'N/A'}</p>
                    </div>
                </div>
                
                <div class="card mb-3">
                    <div class="card-header"><strong>Responsibilities</strong></div>
                    <div class="card-body">
                        <p>${staff.responseibilities || 'N/A'}</p>
                    </div>
                </div>
            </div>
            
            <div class="col-md-6">
                <div class="card mb-3">
                    <div class="card-header"><strong>Contact Person</strong></div>
                    <div class="card-body">
                        <p><i class="bi bi-person"></i> ${staff.contact_person || 'N/A'}</p>
                    </div>
                </div>
                
                <div class="card mb-3">
                    <div class="card-header"><strong>Contact Number</strong></div>
                    <div class="card-body">
                        <p><i class="bi bi-telephone"></i> ${staff.contact_number || 'N/A'}</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="mt-3 text-muted">
            <small><i class="bi bi-info-circle"></i> This data is from the faculty_proposal_staff table</small>
        </div>
    `;
}

// Approve proposal function
async function approveProposal(proposalId) {
    if (!confirm('Are you sure you want to approve this proposal?')) {
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('faculty_extension_proposals')
            .update({ 
                status: 'Approved',
                revision_reason: null,
                revision_requested_by: null
            })
            .eq('id', proposalId)
            .select();
        
        if (error) throw error;
        
        showStatus('Proposal approved successfully!', 'success');
        await forceRefreshProposals();
        
    } catch (error) {
        showStatus('Failed to approve proposal: ' + error.message, 'error');
    }
}

// Request revision function with message storage
async function requestRevision(proposalId) {
    const proposal = window.adminProposals.find(p => p.id === proposalId);
    const currentMessage = proposal?.revision_reason || '';
    
    const revisionReason = prompt(
        `Request Revision for: "${proposal?.title || 'Proposal'}"\n\n` +
        `Please enter the reason for requesting revision:\n` +
        `(Previous: ${currentMessage.substring(0, 50)}${currentMessage.length > 50 ? '...' : ''})`,
        currentMessage
    );
    
    if (revisionReason === null) return;
    
    if (!revisionReason.trim()) {
        alert('Please enter a reason for requesting revision.');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('faculty_extension_proposals')
            .update({ 
                status: 'Revision Requested',
                revision_reason: revisionReason,
                revision_requested_at: new Date().toISOString(),
                revision_requested_by: window.currentAdminId
            })
            .eq('id', proposalId)
            .select();
        
        if (error) throw error;
        
        showStatus('Revision requested! Faculty will see your message.', 'success');
        await forceRefreshProposals();
        
    } catch (error) {
        showStatus('Failed to request revision: ' + error.message, 'error');
    }
}

// Delete proposal function
async function deleteProposal(proposalId) {
    if (!confirm('⚠️ Are you sure you want to delete this proposal?\n\nThis action cannot be undone!')) {
        return;
    }
    
    try {
        await Promise.all([
            supabase.from('faculty_proposal_logframe').delete().eq('proposal_id', proposalId),
            supabase.from('faculty_proposal_staff').delete().eq('proposal_id', proposalId)
        ]);
        
        const { data, error } = await supabase
            .from('faculty_extension_proposals')
            .delete()
            .eq('id', proposalId)
            .select();
        
        if (error) throw error;
        
        showStatus('Proposal deleted successfully!', 'success');
        await forceRefreshProposals();
        
    } catch (error) {
        showStatus('Failed to delete proposal: ' + error.message, 'error');
    }
}

// Force refresh proposals
async function forceRefreshProposals() {
    const tbody = document.getElementById('filesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </td>
        </tr>
    `;
    
    try {
        const { data: proposals, error } = await supabase
            .from('faculty_extension_proposals')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        window.adminProposals = proposals || [];
        updateProposalStatistics(proposals || []);
        renderProposalsTable(proposals || []);
        
    } catch (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    Error refreshing proposals
                </td>
            </tr>
        `;
    }
}

// Helper function for status badge classes
function getStatusBadgeClass(status) {
    switch(status) {
        case 'Approved': return 'bg-success';
        case 'Pending': return 'bg-warning text-dark';
        case 'Revision Requested': return 'bg-danger';
        case 'Archived': return 'bg-secondary';
        default: return 'bg-info';
    }
}

// ============================================
// ATTACH FUNCTIONS TO WINDOW
// ============================================

window.viewProposalDetails = viewProposalDetails;
window.approveProposal = approveProposal;
window.requestRevision = requestRevision;
window.deleteProposal = deleteProposal;

// ============================================
// DOM CONTENT LOADED
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    const user = getCurrentUser();
    
    if (!user) {
        window.location.href = '../HTML/LogIn.html';
        return;
    }
    
    if (user.role !== 'admin') {
        showStatus('Access denied. Admin privileges required.', 'error');
        setTimeout(() => {
            window.location.href = '../HTML/LogIn.html';
        }, 2000);
        return;
    }

    window.currentAdminId = user.user_id;
    window.currentAdminName = user.full_name;
    
    await initializeAdminPanel(user);
    setupLogoutButton();
});

// ============================================
// INITIALIZE ADMIN PANEL
// ============================================

async function initializeAdminPanel(user) {
    displayUserInfo(user);
    setUserPermissions(user.role);
    
    await loadDashboardData();
    await loadAllUsers();
    await loadPendingApprovals();
    await loadAllProposals();
    
    setupSectionNavigation();
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
        if (element) element.textContent = value;
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
        'content': { title: 'Proposals Management', element: 'content-section' },
        'analytics': { title: 'Analytics & Statistics', element: 'analytics-section' }
    };

    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionKey = this.getAttribute('data-section');
            const section = sections[sectionKey];
            
            if (section) {
                document.getElementById('sectionTitle').textContent = section.title;
                
                document.querySelectorAll('.section-content').forEach(el => {
                    el.classList.add('d-none');
                });
                
                document.getElementById(section.element).classList.remove('d-none');
                
                document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
                this.classList.add('active');
                
                if (sectionKey === 'content') {
                    loadAllProposals();
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

function setupSearchAndFilters() {
    const searchInput = document.getElementById('searchFiles');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadAllProposals, 300));
    }
    
    const filterSelect = document.getElementById('filterCategory');
    if (filterSelect) {
        filterSelect.addEventListener('change', loadAllProposals);
    }
    
    const userSearch = document.getElementById('searchUsers');
    if (userSearch) {
        userSearch.addEventListener('input', debounce(filterUsersTable, 300));
    }
    
    const refreshProposalsBtn = document.querySelector('button[onclick="forceRefreshProposals()"]');
    if (refreshProposalsBtn) {
        refreshProposalsBtn.addEventListener('click', function(e) {
            e.preventDefault();
            forceRefreshProposals();
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
    try {
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });
        
        const { count: activeUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'active');
        
        const { count: pendingUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');
        
        const { count: totalProposals } = await supabase
            .from('faculty_extension_proposals')
            .select('*', { count: 'exact', head: true });
        
        updateDashboardStats({
            total_users: totalUsers || 0,
            active_users: activeUsers || 0,
            pending_users: pendingUsers || 0,
            total_proposals: totalProposals || 0
        });
        
    } catch (error) {
        showStatus('Error loading dashboard data: ' + error.message, 'error');
    }
}

async function loadAllProposals() {
    const tbody = document.getElementById('filesTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="spinner-border" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
            </td>
        </tr>
    `;
    
    try {
        const category = document.getElementById('filterCategory')?.value || 'all';
        const search = document.getElementById('searchFiles')?.value || '';
        
        let query = supabase
            .from('faculty_extension_proposals')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (category !== 'all') {
            query = query.eq('status', category);
        }
        
        if (search) {
            query = query.or(`title.ilike.%${search}%,proponents.ilike.%${search}%,project_type.ilike.%${search}%`);
        }
        
        const { data: proposals, error } = await query;
        
        if (error) throw error;
        
        window.adminProposals = proposals || [];
        updateProposalStatistics(proposals || []);
        renderProposalsTable(proposals || []);
        
    } catch (error) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    Error loading proposals
                </td>
            </tr>
        `;
    }
}

async function loadAllUsers() {
    try {
        const { users, error } = await getAllUsers();
        if (error) throw error;
        updateUsersTable(users || []);
    } catch (error) {
        showStatus('Error loading users: ' + error.message, 'error');
    }
}

async function loadPendingApprovals() {
    try {
        const { users, error } = await getPendingUsers();
        if (error) throw error;
        updatePendingApprovals(users || []);
        updatePendingCount(users?.length || 0);
    } catch (error) {
        showStatus('Error loading pending approvals: ' + error.message, 'error');
    }
}

async function loadAnalyticsSection() {
    try {
        const result = await loadStatistics();
        if (result.success) {
            updateStatisticsUI(result.data);
            drawCharts(result.data.users, result.data.files);
            
            const lastUpdated = document.getElementById('lastUpdated');
            if (lastUpdated) {
                lastUpdated.textContent = new Date().toLocaleString();
            }
        }
    } catch (error) {
        // Silent fail for analytics
    }
}

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
    update('totalProposalsCount', stats.total_proposals);
}

function updatePendingCount(count) {
    const badge = document.getElementById('pendingCountBadge');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('d-none', count === 0);
    }
}

function renderProposalsTable(proposals) {
    const tbody = document.getElementById('filesTableBody');
    if (!tbody) return;
    
    if (!proposals || proposals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="bi bi-inbox"></i>
                    <h5 class="mt-2">No proposals found</h5>
                </td>
            </tr>
        `;
        return;
    }
    
    let html = '';
    proposals.forEach((proposal, index) => {
        const createdDate = new Date(proposal.created_at).toLocaleDateString();
        
        let statusBadge = '';
        let statusClass = '';
        let statusText = proposal.status || 'Unknown';
        
        switch(statusText.toLowerCase()) {
            case 'approved':
                statusBadge = 'Approved';
                statusClass = 'bg-success text-white';
                break;
            case 'pending':
                statusBadge = 'Pending';
                statusClass = 'bg-warning text-dark';
                break;
            case 'revision requested':
            case 'revision':
                statusBadge = 'Revision';
                statusClass = 'bg-danger text-white';
                break;
            default:
                statusBadge = statusText;
                statusClass = 'bg-info text-white';
        }
        
        const shortDesc = proposal.rationale ? 
            (proposal.rationale.length > 50 ? 
                proposal.rationale.substring(0, 50) + '...' : 
                proposal.rationale) : 
            'No description';
        
        const facultyName = proposal.proponents || 'Unknown';
        const department = proposal.project_type || 'N/A';
        const budget = proposal.budget_requirement ? 
            '$' + parseFloat(proposal.budget_requirement).toLocaleString() : 
            'N/A';
        
        const isApproved = statusText.toLowerCase() === 'approved';
        const isRevision = statusText.toLowerCase() === 'revision requested';
        
        const revisionIndicator = proposal.revision_reason ? 
            `<br><small class="text-danger"><i class="bi bi-chat-left"></i> Revision requested</small>` : '';
        
        html += `
        <tr id="proposal-row-${proposal.id}">
            <td>
                <div class="fw-semibold">${proposal.title || 'Untitled Proposal'}</div>
                <small class="text-muted">${shortDesc}</small>
            </td>
            <td>${facultyName}</td>
            <td>${department}</td>
            <td>
                <span class="badge ${statusClass}" id="status-badge-${proposal.id}">
                    ${statusBadge}
                </span>
                ${revisionIndicator}
            </td>
            <td>${createdDate}</td>
            <td>${budget}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="window.viewProposalDetails(${index})" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-success" onclick="handleApprove('${proposal.id}')" 
                        ${isApproved ? 'disabled' : ''}
                        title="${isApproved ? 'Already Approved' : 'Approve'}">
                        <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="btn btn-outline-warning" onclick="handleRevision('${proposal.id}')" 
                        ${isRevision ? 'disabled' : ''}
                        title="${isRevision ? 'Revision Already Requested' : 'Request Revision'}">
                        <i class="bi bi-arrow-clockwise"></i>
                    </button>
                    <button class="btn btn-outline-danger" onclick="handleDelete('${proposal.id}')" title="Delete">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
        `;
    });
    
    tbody.innerHTML = html;
}

// Button handler functions
async function handleApprove(proposalId) {
    const approveBtn = document.getElementById(`approve-btn-${proposalId}`);
    if (!approveBtn) return;
    
    const originalHTML = approveBtn.innerHTML;
    approveBtn.innerHTML = '<i class="bi bi-hourglass"></i>';
    approveBtn.disabled = true;
    
    try {
        await window.approveProposal(proposalId);
    } catch (error) {
        approveBtn.innerHTML = originalHTML;
        approveBtn.disabled = false;
    }
}

async function handleRevision(proposalId) {
    try {
        await window.requestRevision(proposalId);
    } catch (error) {
        // Silent fail
    }
}

async function handleDelete(proposalId) {
    if (!confirm('Are you sure you want to delete this proposal?')) return;
    
    try {
        await window.deleteProposal(proposalId);
    } catch (error) {
        // Silent fail
    }
}

// Attach handlers to window
window.handleApprove = handleApprove;
window.handleRevision = handleRevision;
window.handleDelete = handleDelete;

function updateUsersTable(users) {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>';
        return;
    }
    
    let html = '';
    users.forEach(user => {
        const statusBadge = user.status === 'active' 
            ? '<span class="badge bg-success">Active</span>' 
            : user.status === 'pending'
            ? '<span class="badge bg-warning">Pending</span>'
            : '<span class="badge bg-danger">Inactive</span>';
        
        html += `
        <tr>
            <td>${user.user_id}</td>
            <td>${user.full_name}</td>
            <td>${user.email}</td>
            <td><span class="badge bg-secondary">${user.role}</span></td>
            <td>${statusBadge}</td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    ${user.status === 'active' 
                        ? `<button class="btn btn-warning btn-sm" onclick="deactivateUser(${user.user_id})">Deactivate</button>`
                        : user.status === 'pending'
                        ? `<button class="btn btn-success btn-sm" onclick="approveUserAccount(${user.user_id})">Approve</button>
                           <button class="btn btn-danger btn-sm" onclick="rejectUserAccount(${user.user_id})">Reject</button>`
                        : `<button class="btn btn-success btn-sm" onclick="activateUser(${user.user_id})">Activate</button>`
                    }
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
            </div>
        `;
        return;
    }
    
    let html = '';
    accounts.forEach(account => {
        html += `
        <div class="card mb-3">
            <div class="card-body">
                <div class="row">
                    <div class="col-md-8">
                        <h6>${account.full_name}</h6>
                        <p class="mb-1"><i class="bi bi-envelope"></i> ${account.email}</p>
                        <p class="mb-1"><i class="bi bi-person-badge"></i> ${account.role}</p>
                        <small class="text-muted">Created: ${new Date(account.created_at).toLocaleDateString()}</small>
                    </div>
                    <div class="col-md-4 text-end">
                        <button class="btn btn-success btn-sm" onclick="approveUserAccount(${account.user_id})">
                            <i class="bi bi-check-lg"></i> Approve
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="rejectUserAccount(${account.user_id})">
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
            
            setTimeout(() => {
                window.location.href = '../HTML/LogIn.html';
            }, 1000);
            
        } catch (error) {
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
// USER MANAGEMENT FUNCTIONS
// ============================================

window.approveUserAccount = async function(userId) {
    if (!confirm('Approve this user account?')) return;
    
    try {
        const result = await approveUser(userId, window.currentAdminId);
        if (result.success) {
            showStatus('User approved!', 'success');
            await loadDashboardData();
            await loadAllUsers();
            await loadPendingApprovals();
        }
    } catch (error) {
        showStatus('Approval failed: ' + error.message, 'error');
    }
};

window.rejectUserAccount = async function(userId) {
    if (!confirm('Reject this user account?')) return;
    
    try {
        const result = await rejectUser(userId, window.currentAdminId);
        if (result.success) {
            showStatus('User rejected', 'success');
            await loadDashboardData();
            await loadAllUsers();
            await loadPendingApprovals();
        }
    } catch (error) {
        showStatus('Rejection failed: ' + error.message, 'error');
    }
};

window.activateUser = async function(userId) {
    if (!confirm('Activate this user account?')) return;
    
    try {
        const result = await updateUserStatus(userId, 'active', window.currentAdminId);
        if (result.success) {
            showStatus('User activated', 'success');
            await loadDashboardData();
            await loadAllUsers();
            await loadPendingApprovals();
        }
    } catch (error) {
        showStatus('Activation failed: ' + error.message, 'error');
    }
};

window.deactivateUser = async function(userId) {
    if (!confirm('Deactivate this user account?')) return;
    
    try {
        const result = await updateUserStatus(userId, 'inactive', window.currentAdminId);
        if (result.success) {
            showStatus('User deactivated', 'success');
            await loadDashboardData();
            await loadAllUsers();
            await loadPendingApprovals();
        }
    } catch (error) {
        showStatus('Deactivation failed: ' + error.message, 'error');
    }
};

// ============================================
// EXPORTS
// ============================================

export {
    approveProposal,
    requestRevision,
    deleteProposal,
    viewProposalDetails,
    loadAllProposals,
    loadDashboardData,
    loadAllUsers,
    loadPendingApprovals,
    loadAnalyticsSection,
    updateProposalStatistics,
    forceRefreshProposals
};

window.loadAnalyticsSection = loadAnalyticsSection;
window.loadAllProposals = loadAllProposals;
window.updateProposalStatistics = updateProposalStatistics;