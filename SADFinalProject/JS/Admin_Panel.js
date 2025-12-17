// Admin_Panel.js - COMPLETE PROPOSAL MANAGEMENT VERSION WITH QUICK STATS
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
// PROPOSAL STATISTICS FUNCTIONS (ADDED NEW)
// ============================================

// Function to update proposal statistics
function updateProposalStatistics(proposals) {
    if (!proposals) return;
    
    // Calculate statistics
    const total = proposals.length;
    const approved = proposals.filter(p => p.status === 'Approved').length;
    const pending = proposals.filter(p => p.status === 'Pending').length;
    const revision = proposals.filter(p => p.status === 'Revision Requested').length;
    const archived = proposals.filter(p => p.status === 'Archived').length;
    
    // Update UI elements
    const updateElement = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    
    updateElement('totalProposalsCount', total);
    updateElement('approvedProposalsCount', approved);
    updateElement('pendingProposalsCount', pending);
    updateElement('revisionProposalsCount', revision);
    
    // Update last updated timestamp
    const lastUpdatedEl = document.getElementById('proposalsLastUpdated');
    if (lastUpdatedEl) {
        const now = new Date();
        lastUpdatedEl.textContent = `Last updated: ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    
    console.log(`📊 Proposal Stats: Total=${total}, Approved=${approved}, Pending=${pending}, Revision=${revision}, Archived=${archived}`);
    return { total, approved, pending, revision, archived };
}

// ============================================
// PROPOSAL MANAGEMENT FUNCTIONS (DEFINED FIRST)
// ============================================

// View proposal details
async function viewProposalDetails(index) {
    try {
        const proposal = window.adminProposals[index];
        if (!proposal) {
            alert('Proposal not found');
            return;
        }
        
        // Create modal HTML using existing columns
        const modalHtml = `
            <div class="modal fade" id="proposalDetailsModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-lg modal-dialog-scrollable">
                    <div class="modal-content">
                        <div class="modal-header bg-primary text-white">
                            <h5 class="modal-title">Proposal Details</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-8">
                                    <h4 class="fw-bold">${proposal.title || 'Untitled Proposal'}</h4>
                                    <span class="badge ${getStatusBadgeClass(proposal.status)}">${proposal.status}</span>
                                </div>
                                <div class="col-md-4 text-end">
                                    <small class="text-muted">Created: ${new Date(proposal.created_at).toLocaleString()}</small>
                                </div>
                            </div>
                            
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h6 class="fw-bold">Proposal Information</h6>
                                    <p><strong>Proponents:</strong> ${proposal.proponents || 'N/A'}</p>
                                    <p><strong>Project Type:</strong> ${proposal.project_type || 'N/A'}</p>
                                    <p><strong>User ID:</strong> ${proposal.user_id || 'N/A'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="fw-bold">Project Details</h6>
                                    <p><strong>Budget:</strong> ${proposal.budget_requirement ? '$' + parseFloat(proposal.budget_requirement).toLocaleString() : 'N/A'}</p>
                                    <p><strong>Implementation Days:</strong> ${proposal.implementation_days || 'N/A'}</p>
                                    <p><strong>Last Updated:</strong> ${proposal.updated_at ? new Date(proposal.updated_at).toLocaleString() : 'Never'}</p>
                                </div>
                            </div>
                            
                            <h6 class="fw-bold border-bottom pb-2">Rationale</h6>
                            <p class="mb-4">${proposal.rationale || 'No rationale provided.'}</p>
                            
                            <div class="row mb-4">
                                <div class="col-md-6">
                                    <h6 class="fw-bold border-bottom pb-2">Beneficiaries</h6>
                                    <p><strong>Count:</strong> ${proposal.beneficiaries_count || 'N/A'}</p>
                                    <p><strong>Type:</strong> ${proposal.beneficiaries_type || 'N/A'}</p>
                                    <p><strong>Location:</strong> ${proposal.beneficiaries_location || 'N/A'}</p>
                                </div>
                                <div class="col-md-6">
                                    <h6 class="fw-bold border-bottom pb-2">Additional Info</h6>
                                    <p><strong>Data Started:</strong> ${proposal.data_started || 'N/A'}</p>
                                    <p><strong>Metric Value:</strong> ${proposal.metric_value || 'N/A'}</p>
                                    <p><strong>Attachment Unit:</strong> ${proposal.attachment_unit || 'N/A'}</p>
                                </div>
                            </div>
                            
                            ${proposal.attachment_unit ? `
                            <h6 class="fw-bold border-bottom pb-2">Attachments</h6>
                            <p class="mb-4">${proposal.attachment_unit}</p>
                            ` : ''}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Remove existing modal if any
        const existingModal = document.getElementById('proposalDetailsModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // Show modal
        const modal = new bootstrap.Modal(document.getElementById('proposalDetailsModal'));
        modal.show();
        
    } catch (error) {
        console.error('Error viewing proposal:', error);
        alert('Failed to load proposal details: ' + error.message);
    }
}

// Approve proposal function
async function approveProposal(proposalId) {
    console.log('=== APPROVE PROPOSAL CALLED ===', proposalId);
    
    if (!confirm('Are you sure you want to approve this proposal?')) {
        return;
    }
    
    try {
        console.log('Making Supabase update request for ID:', proposalId);
        
        const { data, error } = await supabase
            .from('faculty_extension_proposals')
            .update({ 
                status: 'Approved'
            })
            .eq('id', proposalId)
            .select();
        
        if (error) {
            console.error('❌ Supabase error:', error);
            showStatus('Error: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ Update successful! Response:', data);
        showStatus('Proposal approved successfully!', 'success');
        
        // Force refresh the proposals
        await forceRefreshProposals();
        
    } catch (error) {
        console.error('❌ Full error:', error);
        showStatus('Failed to approve proposal: ' + error.message, 'error');
    }
}

// Request revision function
async function requestRevision(proposalId) {
    console.log('=== REQUEST REVISION CALLED ===', proposalId);
    
    const revisionReason = prompt('Please enter the reason for requesting revision:', '');
    
    if (revisionReason === null) {
        return;
    }
    
    if (!revisionReason.trim()) {
        alert('Please enter a reason for requesting revision.');
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('faculty_extension_proposals')
            .update({ 
                status: 'Revision Requested'
            })
            .eq('id', proposalId)
            .select();
        
        if (error) {
            console.error('❌ Supabase error:', error);
            showStatus('Error: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ Revision request successful! Response:', data);
        showStatus('Revision requested successfully!', 'success');
        
        // Force refresh the proposals
        await forceRefreshProposals();
        
    } catch (error) {
        console.error('❌ Full error:', error);
        showStatus('Failed to request revision: ' + error.message, 'error');
    }
}

// Delete proposal function
async function deleteProposal(proposalId) {
    console.log('=== DELETE PROPOSAL CALLED ===', proposalId);
    
    if (!confirm('⚠️ Are you sure you want to delete this proposal?\n\nThis action cannot be undone!')) {
        return;
    }
    
    try {
        const { data, error } = await supabase
            .from('faculty_extension_proposals')
            .delete()
            .eq('id', proposalId)
            .select();
        
        if (error) {
            console.error('❌ Supabase error:', error);
            showStatus('Error: ' + error.message, 'error');
            return;
        }
        
        console.log('✅ Delete successful! Response:', data);
        showStatus('Proposal deleted successfully!', 'success');
        
        // Force refresh the proposals
        await forceRefreshProposals();
        
    } catch (error) {
        console.error('❌ Full error:', error);
        showStatus('Failed to delete proposal: ' + error.message, 'error');
    }
}

// ============================================
// MODIFIED FORCE REFRESH PROPOSALS FUNCTION
// ============================================

async function forceRefreshProposals() {
    console.log('🔄 FORCE REFRESHING PROPOSALS...');
    
    const tbody = document.getElementById('filesTableBody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    // Show loading state in stats too
    document.querySelectorAll('#totalProposalsCount, #approvedProposalsCount, #pendingProposalsCount, #revisionProposalsCount').forEach(el => {
        if (el) el.innerHTML = '<i class="bi bi-hourglass-split"></i>';
    });
    
    // Clear the table immediately
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="spinner-border spinner-border-sm text-primary" role="status">
                    <span class="visually-hidden">Refreshing...</span>
                </div>
                <p class="mt-2">Refreshing proposals...</p>
            </td>
        </tr>
    `;
    
    try {
        // Add a small delay to ensure Supabase has time to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Clear any cached data
        window.adminProposals = [];
        
        // Force a fresh query with cache busting
        const { data: proposals, error } = await supabase
            .from('faculty_extension_proposals')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('Refresh error:', error);
            throw error;
        }
        
        // Update global store
        window.adminProposals = proposals || [];
        
        // Update statistics
        updateProposalStatistics(proposals || []);
        
        // Re-render table
        renderProposalsTable(proposals || []);
        
        console.log(`✅ Force refreshed ${proposals?.length || 0} proposal(s)`);
        
        // Show success message
        showStatus('Proposals refreshed successfully!', 'success');
        
    } catch (error) {
        console.error('Force refresh error:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error refreshing
                    <br><small>${error.message}</small>
                </td>
            </tr>
        `;
        showStatus('Failed to refresh proposals: ' + error.message, 'error');
    }
}

// Attach to window for debugging
window.forceRefreshProposals = forceRefreshProposals;

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
// ATTACH FUNCTIONS TO WINDOW OBJECT (IMMEDIATELY)
// ============================================

// Attach all proposal functions to window object immediately
window.viewProposalDetails = viewProposalDetails;
window.approveProposal = approveProposal;
window.requestRevision = requestRevision;
window.deleteProposal = deleteProposal;

console.log('✅ Proposal functions attached to window:', {
    viewProposalDetails: typeof window.viewProposalDetails,
    approveProposal: typeof window.approveProposal,
    requestRevision: typeof window.requestRevision,
    deleteProposal: typeof window.deleteProposal
});

// ============================================
// DOM CONTENT LOADED
// ============================================

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
    window.currentAdminName = user.full_name;
    
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
    await loadAllProposals(); // Load proposals
    
    // Setup navigation
    setupSectionNavigation();
    
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
        'content': { title: 'Proposals Management', element: 'content-section' },
        'project-management': { title: 'Project Management', element: 'project-management-section' },
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
                    loadAllProposals(); // This will load stats too
                } else if (sectionKey === 'user-management') {
                    loadAllUsers();
                } else if (sectionKey === 'approvals') {
                    loadPendingApprovals();
                } else if (sectionKey === 'dashboard') {
                    loadDashboardData();
                } else if (sectionKey === 'analytics') {
                    loadAnalyticsSection();
                } else if (sectionKey === 'project-management') {
                    loadAdminProjects();
                }
            }
        });
    });
}

function setupSearchAndFilters() {
    // File search (we'll repurpose this for proposals)
    const searchInput = document.getElementById('searchFiles');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadAllProposals, 300));
    }
    
    // File filter (we'll repurpose this for proposals)
    const filterSelect = document.getElementById('filterCategory');
    if (filterSelect) {
        filterSelect.addEventListener('change', loadAllProposals);
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
    
    // Add refresh button for proposals in content section
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
// DATA LOADING FUNCTIONS (UPDATED)
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
        
        // Get proposals count
        const { count: totalProposals, error: proposalsError } = await supabase
            .from('faculty_extension_proposals')
            .select('*', { count: 'exact', head: true });
        
        if (usersError || activeError || pendingError || inactiveError || proposalsError) {
            throw new Error('Failed to load dashboard stats');
        }
        
        // Update dashboard stats
        updateDashboardStats({
            total_users: totalUsers || 0,
            active_users: activeUsers || 0,
            pending_users: pendingUsers || 0,
            inactive_users: inactiveUsers || 0,
            total_proposals: totalProposals || 0
        });
        
        console.log("Dashboard data loaded");
        
    } catch (error) {
        console.error('Dashboard error:', error);
        showStatus('Error loading dashboard data: ' + error.message, 'error');
    }
}

// ============================================
// MODIFIED LOAD ALL PROPOSALS FUNCTION
// ============================================

async function loadAllProposals() {
    console.log("🔄 Loading all proposals...");
    
    const tbody = document.getElementById('filesTableBody');
    if (!tbody) {
        console.error("Proposals table body not found");
        return;
    }
    
    // Show loading in stats too
    document.querySelectorAll('#totalProposalsCount, #approvedProposalsCount, #pendingProposalsCount, #revisionProposalsCount').forEach(el => {
        if (el) el.innerHTML = '<i class="bi bi-hourglass-split"></i>';
    });
    
    // Show loading
    tbody.innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="spinner-border spinner-border-sm" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <p class="mt-2">Loading proposals...</p>
            </td>
        </tr>
    `;
    
    try {
        // Get filter values
        const category = document.getElementById('filterCategory')?.value || 'all';
        const search = document.getElementById('searchFiles')?.value || '';
        
        // Build query
        let query = supabase
            .from('faculty_extension_proposals')
            .select('*')
            .order('created_at', { ascending: false });
        
        // Apply status filter
        if (category !== 'all') {
            query = query.eq('status', category);
        }
        
        // Apply search filter
        if (search) {
            query = query.or(`title.ilike.%${search}%,proponents.ilike.%${search}%,project_type.ilike.%${search}%,rationale.ilike.%${search}%`);
        }
        
        const { data: proposals, error } = await query;
        
        if (error) {
            throw error;
        }
        
        // Store globally for modal access
        window.adminProposals = proposals || [];
        
        // Update statistics BEFORE rendering table
        updateProposalStatistics(proposals || []);
        
        // Render table
        renderProposalsTable(proposals || []);
        
        console.log(`✅ Loaded ${proposals?.length || 0} proposal(s)`);
        
    } catch (error) {
        console.error('❌ Error loading proposals:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-danger">
                    <i class="bi bi-exclamation-triangle"></i> Error loading proposals
                    <br><small>${error.message}</small>
                </td>
            </tr>
        `;
        
        // Reset stats to 0 on error
        updateProposalStatistics([]);
    }
}

async function loadAllUsers() {
    console.log("Loading all users...");
    
    try {
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
    try {
        console.log("Loading analytics section...");
        
        const analyticsSection = document.getElementById('analytics-section');
        if (!analyticsSection) {
            console.error("❌ Analytics section element not found!");
            return;
        }
        
        const result = await loadStatistics();
        if (result.success) {
            updateStatisticsUI(result.data);
            drawCharts(result.data.users, result.data.files);
            
            const lastUpdated = document.getElementById('lastUpdated');
            if (lastUpdated) {
                lastUpdated.textContent = new Date().toLocaleString();
            }
        } else {
            console.error('Failed to load statistics:', result.error);
        }
    } catch (error) {
        console.error('Analytics section error:', error);
    }
}

// ============================================
// UI UPDATE FUNCTIONS (UPDATED)
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

function renderProposalsTable(proposals) {
    const tbody = document.getElementById('filesTableBody');
    if (!tbody) {
        console.error('Table body not found');
        return;
    }
    
    if (!proposals || proposals.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-1"></i>
                    <h5 class="mt-2">No proposals found</h5>
                    <p class="text-muted">Try changing your search or filter</p>
                </td>
            </tr>
        `;
        return;
    }
    
    console.log('📋 Rendering proposals table with', proposals.length, 'proposals');
    
    let html = '';
    proposals.forEach((proposal, index) => {
        // Format dates
        const createdDate = new Date(proposal.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Status badge with better color coding
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
            case 'archived':
                statusBadge = 'Archived';
                statusClass = 'bg-secondary text-white';
                break;
            default:
                statusBadge = statusText;
                statusClass = 'bg-info text-white';
        }
        
        // Use rationale as description
        const shortDesc = proposal.rationale ? 
            (proposal.rationale.length > 100 ? 
                proposal.rationale.substring(0, 100) + '...' : 
                proposal.rationale) : 
            'No description';
        
        // Use proponents as faculty name
        const facultyName = proposal.proponents || 'Unknown';
        
        // Use project_type as department
        const department = proposal.project_type || 'N/A';
        
        // Use budget_requirement as budget
        const budget = proposal.budget_requirement ? 
            '$' + parseFloat(proposal.budget_requirement).toLocaleString() : 
            'N/A';
        
        // Determine button states
        const isApproved = statusText.toLowerCase() === 'approved';
        const isRevision = statusText.toLowerCase() === 'revision requested' || statusText.toLowerCase() === 'revision';
        
        html += `
        <tr id="proposal-row-${proposal.id}">
            <td>
                <div class="fw-semibold">${proposal.title || 'Untitled Proposal'}</div>
                <small class="text-muted">${shortDesc}</small>
                <div class="mt-1">
                    <small class="text-muted">ID: ${proposal.id}</small>
                </div>
            </td>
            <td>${facultyName}</td>
            <td>${department}</td>
            <td>
                <span class="badge ${statusClass}" id="status-badge-${proposal.id}">
                    ${statusBadge}
                </span>
                <br>
                <small class="text-muted" id="status-text-${proposal.id}">${statusText}</small>
            </td>
            <td>${createdDate}</td>
            <td>${budget}</td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-primary" onclick="window.viewProposalDetails(${index})" title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-success" onclick="handleApprove('${proposal.id}')" 
                        ${isApproved ? 'disabled' : ''} 
                        id="approve-btn-${proposal.id}"
                        title="${isApproved ? 'Already Approved' : 'Approve'}">
                        <i class="bi bi-check-lg"></i>
                    </button>
                    <button class="btn btn-outline-warning" onclick="handleRevision('${proposal.id}')" 
                        ${isRevision ? 'disabled' : ''}
                        id="revision-btn-${proposal.id}"
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
    
    console.log('✅ Table rendered successfully');
}

// New handler functions for better UI updates
async function handleApprove(proposalId) {
    console.log('🎯 Handle Approve:', proposalId);
    
    // Update button immediately to show loading
    const approveBtn = document.getElementById(`approve-btn-${proposalId}`);
    const originalHTML = approveBtn.innerHTML;
    approveBtn.innerHTML = '<i class="bi bi-hourglass"></i>';
    approveBtn.disabled = true;
    
    try {
        await window.approveProposal(proposalId);
    } catch (error) {
        console.error('Approve handler error:', error);
        // Restore button
        approveBtn.innerHTML = originalHTML;
        approveBtn.disabled = false;
    }
}

async function handleRevision(proposalId) {
    console.log('🎯 Handle Revision:', proposalId);
    
    // Update button immediately to show loading
    const revisionBtn = document.getElementById(`revision-btn-${proposalId}`);
    const originalHTML = revisionBtn.innerHTML;
    revisionBtn.innerHTML = '<i class="bi bi-hourglass"></i>';
    revisionBtn.disabled = true;
    
    try {
        await window.requestRevision(proposalId);
    } catch (error) {
        console.error('Revision handler error:', error);
        // Restore button
        revisionBtn.innerHTML = originalHTML;
        revisionBtn.disabled = false;
    }
}

async function handleDelete(proposalId) {
    console.log('🎯 Handle Delete:', proposalId);
    
    // Update button immediately to show loading
    const deleteBtn = document.querySelector(`button[onclick*="${proposalId}"]`);
    if (deleteBtn) {
        const originalHTML = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '<i class="bi bi-hourglass"></i>';
        deleteBtn.disabled = true;
        
        try {
            await window.deleteProposal(proposalId);
        } catch (error) {
            console.error('Delete handler error:', error);
            // Restore button
            deleteBtn.innerHTML = originalHTML;
            deleteBtn.disabled = false;
        }
    }
}

// Attach to window
window.handleApprove = handleApprove;
window.handleRevision = handleRevision;
window.handleDelete = handleDelete;

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
// USER MANAGEMENT FUNCTIONS (GLOBAL)
// ============================================

window.approveUserAccount = async function(userId) {
    if (!confirm('Approve this user account? They will be able to login immediately.')) {
        return;
    }
    
    try {
        const result = await approveUser(userId, window.currentAdminId);
        
        if (result.success) {
            showStatus('User approved successfully!', 'success');
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
    await loadAllProposals();
    showStatus('Data refreshed', 'success');
};

window.refreshStatistics = async function() {
    showStatus('Refreshing statistics...', 'info');
    await loadAnalyticsSection();
};

window.deleteUserAccount = async function(userId, userName) {
    if (!confirm(`Are you sure you want to DELETE user "${userName}"?\n\n⚠️ This action cannot be undone!`)) {
        return;
    }
    
    try {
        showStatus('Deleting user...', 'warning');
        
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('user_id', userId);
        
        if (error) {
            throw new Error('Failed to delete user: ' + error.message);
        }
        
        showStatus(`User "${userName}" deleted successfully`, 'success');
        
        await loadDashboardData();
        await loadAllUsers();
        await loadPendingApprovals();
        
    } catch (error) {
        console.error('Delete user error:', error);
        showStatus('Delete failed: ' + error.message, 'error');
    }
};

// ============================================
// PROJECT MANAGEMENT FUNCTIONS
// ============================================

// Load admin projects (for project-management section)
window.loadAdminProjects = async function() {
    const container = document.getElementById('admin-projects-grid');
    if (!container) return;

    try {
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!projects || projects.length === 0) {
            container.innerHTML = '<div class="col-12 text-center text-muted py-5">No projects found. Create one above!</div>';
            return;
        }

        // Store globally
        window.adminProjects = projects;
        container.innerHTML = '';

        projects.forEach((proj, index) => {
            let badgeClass = 'bg-primary';
            if (proj.status === 'Ongoing') badgeClass = 'bg-success';
            if (proj.status === 'Proposed') badgeClass = 'bg-warning text-dark';

            const startYear = proj.start_date ? new Date(proj.start_date).getFullYear() : 'TBA';
            const image = proj.image_url || 'https://placehold.co/600x400?text=No+Image';

            const html = `
            <div class="col-md-6 col-xl-4">
                <div class="card h-100 shadow-sm border-0 hover-shadow transition">
                    <div class="position-relative" style="height: 200px; overflow: hidden;">
                        <img src="${image}" class="w-100 h-100 object-fit-cover">
                        <span class="position-absolute top-0 end-0 m-3 badge ${badgeClass} text-uppercase shadow-sm">
                            ${proj.status}
                        </span>
                        <div class="position-absolute bottom-0 start-0 w-100 p-3" 
                             style="background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);">
                            <span class="badge bg-primary">${proj.location || 'General'}</span>
                        </div>
                    </div>

                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold text-dark mb-2">${proj.title}</h5>
                        <p class="card-text text-muted small text-truncate-3 mb-4 flex-fill">
                            ${proj.description || 'No description.'}
                        </p>

                        <div class="border-top pt-3 mt-auto">
                            <div class="d-flex justify-content-between small text-muted mb-3">
                                <span><strong>Start:</strong> ${startYear}</span>
                                <span><strong>Fund:</strong> ${proj.funding_agency || 'N/A'}</span>
                            </div>
                            
                            <div class="d-grid gap-2 d-md-flex">
                                <button onclick="openAdminModal(${index})" class="btn btn-outline-primary btn-sm flex-grow-1">
                                    <i class="bi bi-eye"></i> View Details
                                </button>
                                <button onclick="deleteProject(${proj.project_id})" class="btn btn-danger btn-sm flex-grow-1">
                                    <i class="bi bi-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            `;
            container.insertAdjacentHTML('beforeend', html);
        });

    } catch (err) {
        console.error(err);
        container.innerHTML = `<div class="col-12 text-center text-danger">Error loading projects: ${err.message}</div>`;
    }
};

// ============================================
// FINAL EXPORTS AND WINDOW ATTACHMENTS
// ============================================

// Export for module system
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

// Additional window attachments
window.loadAnalyticsSection = loadAnalyticsSection;
window.refreshUserData = refreshUserData;
window.loadAllProposals = loadAllProposals;
window.loadAdminProjects = loadAdminProjects;
window.updateProposalStatistics = updateProposalStatistics;

console.log('🎯 Admin Panel fully initialized with working buttons and statistics!');