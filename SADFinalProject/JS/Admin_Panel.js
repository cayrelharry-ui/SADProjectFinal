// Admin_Panel.js - COMPLETE VERSION WITH ALL FUNCTIONALITIES
// NOTE: Uses global Supabase/auth helpers initialized in db_connection.js

const supabase = window.supabaseClient;
const supabaseAuth = window.supabaseAuth;
const getCurrentUser = window.getCurrentUser || (() => null);

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

// Store proposals globally for modal access
window.adminProposals = [];
window.adminProjects = [];

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
    
    // Setup navigation
    setupSectionNavigation();
    
    // Initialize file upload form
    initializeFileUploadForm('fileUploadForm');
    
    // Setup file preview on selection
    setupFilePreview();
    
    // Initialize project form
    initializeProjectForm();
    
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
        'analytics': { title: 'Analytics & Statistics', element: 'analytics-section' }
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
                    loadAllProposals();
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

// ============================================
// PROJECT MANAGEMENT FUNCTIONS
// ============================================

// Initialize project form handling
function initializeProjectForm() {
    const projectForm = document.getElementById('projectForm');
    const addProponentBtn = document.getElementById('addProponentBtn');

    if (!projectForm) return;

    // Add proponent button handler
    if (addProponentBtn) {
        addProponentBtn.addEventListener('click', function() {
            const container = document.getElementById('proponents-container');
            const newEntry = document.createElement('div');
            newEntry.className = 'input-group mb-2 proponent-entry';
            newEntry.innerHTML = `
                <span class="input-group-text bg-white"><i class="bi bi-person"></i></span>
                <input type="text" class="form-control" name="proponent[]" placeholder="Enter team member name" required>
                <button type="button" class="btn btn-outline-danger remove-proponent" onclick="this.parentElement.remove()">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            container.appendChild(newEntry);
        });
    }

    // Form submission handler - UPDATED FOR YOUR TABLE SCHEMA
    projectForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const saveBtn = document.getElementById('saveBtn');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';
        saveBtn.disabled = true;

        try {
            // Collect form data - MATCHING YOUR DATABASE COLUMNS EXACTLY
            const proponents = Array.from(document.getElementsByName('proponent[]'))
                .map(input => input.value.trim())
                .filter(value => value !== '');

            // Get form values
            const formData = {
                // In the formData object:
category: document.getElementById('pCategory').value,
                title: document.getElementById('pTitle').value.trim(),
                description: document.getElementById('pDesc').value.trim(),
                objectives: document.getElementById('pObjectives').value.trim(),
                
                // Project details
                start_date: document.getElementById('pStartDate').value || null,
                end_date: document.getElementById('pEndDate').value || null,
                beneficiaries: document.getElementById('pBeneficiaries').value.trim() || 'Not specified',
                location: document.getElementById('pLocation').value.trim() || 'Not specified',
                funding_agency: document.getElementById('pFunding').value.trim() || 'Not specified',
                status: document.getElementById('pStatus').value || 'Proposed',
                
                // JSON fields
                proponents: proponents, // This will be automatically converted to JSONB by Supabase
                
                
                category: 'project', 
                budget: 0,
                keywords: '', // Empty string for keywords
                created_by: window.currentAdminId, // Assuming this is the user_id
                created_at: new Date().toISOString()
            };

            console.log('📝 Form data for database:', formData);

            // Validate required fields
            if (!formData.title) {
                throw new Error('Project title is required');
            }

            // Upload image if exists
            const imageFile = document.getElementById('pImage').files[0];
            if (imageFile) {
                console.log('📤 Uploading image...');
                
                // Create a unique filename
                const fileName = `project-${Date.now()}-${imageFile.name.replace(/\s+/g, '-')}`;
                
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('project-images')
                    .upload(fileName, imageFile);
                
                if (uploadError) {
                    console.error('❌ Image upload error:', uploadError);
                    throw new Error('Failed to upload image: ' + uploadError.message);
                }
                
                // Get public URL
                const { data: urlData } = supabase.storage
                    .from('project-images')
                    .getPublicUrl(fileName);
                
                formData.image_url = urlData.publicUrl;
                console.log('✅ Image uploaded:', urlData.publicUrl);
            }

            // Save to database
            console.log('💾 Saving project to database...');
            const { data, error } = await supabase
                .from('projects')
                .insert([formData])
                .select();

            if (error) {
                console.error('❌ Database error:', error);
                throw error;
            }

            console.log('✅ Project saved:', data);
            showStatus('Project created successfully!', 'success');
            
            // Reset form
            projectForm.reset();
            
            // Clear dynamic proponents (keep first one)
            const proponentsContainer = document.getElementById('proponents-container');
            const firstEntry = proponentsContainer.querySelector('.proponent-entry');
            if (firstEntry) {
                proponentsContainer.innerHTML = '';
                proponentsContainer.appendChild(firstEntry);
                firstEntry.querySelector('input').value = '';
            }
            
            // Refresh project list
            await loadAdminProjects();

        } catch (error) {
            console.error('❌ Project creation error:', error);
            showStatus('Error creating project: ' + error.message, 'error');
        } finally {
            saveBtn.innerHTML = originalText;
            saveBtn.disabled = false;
        }
    });
}

// Load admin projects (for project-management section)
window.loadAdminProjects = async function() {
    console.log("📁 Loading admin projects...");
    
    const container = document.getElementById('admin-projects-grid');
    if (!container) {
        console.error("Projects container not found");
        return;
    }

    try {
        // Show loading
        container.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <div class="spinner-border spinner-border-sm" role="status"></div>
                Loading projects...
            </div>
        `;

        // Fetch projects from database
        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Project fetch error:', error);
            throw error;
        }

        console.log(`✅ Loaded ${projects?.length || 0} project(s)`);

        // Store globally
        window.adminProjects = projects || [];
        
        // Check if we have projects
        if (!projects || projects.length === 0) {
            container.innerHTML = `
                <div class="col-12 text-center text-muted py-5">
                    <i class="bi bi-folder-x fs-1"></i>
                    <h5 class="mt-3">No projects found</h5>
                    <p class="text-muted">Create your first project using the form above.</p>
                </div>
            `;
            return;
        }

        // Render projects
        let html = '';
        projects.forEach((proj, index) => {
            // Determine badge color based on status
            let badgeClass = 'bg-primary';
            if (proj.status === 'Ongoing') badgeClass = 'bg-success';
            if (proj.status === 'Proposed') badgeClass = 'bg-warning text-dark';
            if (proj.status === 'Completed') badgeClass = 'bg-secondary';

            // Format dates
            const startDate = proj.start_date ? new Date(proj.start_date).toLocaleDateString() : 'Not set';
            const endDate = proj.end_date ? new Date(proj.end_date).toLocaleDateString() : 'Not set';
            
            // Default image if none
            const image = proj.image_url || 'https://via.placeholder.com/400x200?text=No+Image';

            html += `
            <div class="col-md-6 col-xl-4">
                <div class="card h-100 shadow-sm border-0 hover-shadow transition">
                    <div class="position-relative" style="height: 200px; overflow: hidden;">
                        <img src="${image}" class="w-100 h-100 object-fit-cover" alt="${proj.title}">
                        <span class="position-absolute top-0 end-0 m-3 badge ${badgeClass} text-uppercase shadow-sm">
                            ${proj.status || 'Unknown'}
                        </span>
                        <div class="position-absolute bottom-0 start-0 w-100 p-3" 
                             style="background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);">
                            <span class="badge bg-light text-dark">${proj.location || 'Location not set'}</span>
                        </div>
                    </div>

                    <div class="card-body d-flex flex-column">
                        <h5 class="card-title fw-bold text-dark mb-2">${proj.title || 'Untitled Project'}</h5>
                        <p class="card-text text-muted small mb-4 flex-fill" style="min-height: 60px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;">
                            ${proj.description || 'No description available.'}
                        </p>

                        <div class="border-top pt-3 mt-auto">
                            <div class="d-flex justify-content-between small text-muted mb-3">
                                <span><strong>Start:</strong> ${startDate}</span>
                                <span><strong>End:</strong> ${endDate}</span>
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
        });

        container.innerHTML = html;
        console.log('✅ Projects rendered successfully');

    } catch (err) {
        console.error('❌ Error loading projects:', err);
        container.innerHTML = `
            <div class="col-12 text-center text-danger py-5">
                <i class="bi bi-exclamation-triangle fs-1"></i>
                <h5 class="mt-3">Error loading projects</h5>
                <p class="text-muted">${err.message}</p>
                <button class="btn btn-outline-primary btn-sm" onclick="loadAdminProjects()">
                    <i class="bi bi-arrow-clockwise"></i> Retry
                </button>
            </div>
        `;
    }
};

// Open admin project modal
window.openAdminModal = function(index) {
    const project = window.adminProjects[index];
    if (!project) {
        alert('Project not found');
        return;
    }

    // Format dates
    const startDate = project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set';
    const endDate = project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set';
    
    // Determine status badge color
    let badgeClass = 'bg-primary';
    if (project.status === 'Ongoing') badgeClass = 'bg-success';
    if (project.status === 'Proposed') badgeClass = 'bg-warning text-dark';
    if (project.status === 'Completed') badgeClass = 'bg-secondary';

    // Set modal content
    document.getElementById('adm-modal-title').textContent = project.title || 'Untitled Project';
    document.getElementById('adm-modal-desc').textContent = project.description || 'No description available.';
    document.getElementById('adm-modal-objectives').textContent = project.objectives || 'No objectives specified.';
    document.getElementById('adm-modal-status').className = `badge ${badgeClass} text-uppercase`;
    document.getElementById('adm-modal-status').textContent = project.status || 'Unknown';
    document.getElementById('adm-modal-timeline').textContent = `${startDate} to ${endDate}`;
    document.getElementById('adm-modal-location').textContent = project.location || 'Location not specified';
    document.getElementById('adm-modal-funding').textContent = project.funding_agency || 'Not specified';
    document.getElementById('adm-modal-beneficiaries').textContent = project.beneficiaries || 'Not specified';
    
    // Set image
    const modalImage = document.getElementById('adm-modal-image');
    modalImage.src = project.image_url || 'https://via.placeholder.com/800x400?text=No+Image';
    modalImage.alt = project.title || 'Project Image';

    // Set proponents (from JSONB field)
    const proponentsContainer = document.getElementById('adm-modal-proponents');
    proponentsContainer.innerHTML = '';
    
    try {
        // Handle proponents (could be array or JSON string)
        let proponents = [];
        if (Array.isArray(project.proponents)) {
            proponents = project.proponents;
        } else if (typeof project.proponents === 'string') {
            try {
                proponents = JSON.parse(project.proponents);
            } catch (e) {
                proponents = [];
            }
        }
        
        if (proponents.length > 0) {
            proponents.forEach(proponent => {
                if (proponent && proponent.trim()) {
                    const proponentHTML = `
                        <div class="col-md-6">
                            <div class="card border-0 bg-light">
                                <div class="card-body py-2">
                                    <i class="bi bi-person-circle me-2"></i>
                                    ${proponent}
                                </div>
                            </div>
                        </div>
                    `;
                    proponentsContainer.insertAdjacentHTML('beforeend', proponentHTML);
                }
            });
        } else {
            proponentsContainer.innerHTML = '<p class="text-muted">No proponents listed.</p>';
        }
    } catch (error) {
        console.error('Error parsing proponents:', error);
        proponentsContainer.innerHTML = '<p class="text-muted">Error loading proponents.</p>';
    }

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('adminProjectModal'));
    modal.show();
};

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

// Delete project function
window.deleteProject = async function(projectId) {
    if (!confirm('⚠️ Are you sure you want to delete this project?\n\nThis action cannot be undone!')) {
        return;
    }

    try {
        // Use project_id column instead of id
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('project_id', projectId);

        if (error) throw error;

        showStatus('Project deleted successfully!', 'success');
        await loadAdminProjects(); // Refresh the list
        
    } catch (error) {
        console.error('❌ Error deleting project:', error);
        showStatus('Failed to delete project: ' + error.message, 'error');
    }
};

// ============================================
// PROPOSAL MANAGEMENT FUNCTIONS
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

// ============================================
// FILE MANAGEMENT FUNCTIONS
// ============================================

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

// ============================================
// BUTTON HANDLER FUNCTIONS FOR PROPOSALS
// ============================================

// Button handler functions for proposals
window.handleApprove = async function(proposalId) {
    console.log('Handling approve for:', proposalId);
    
    try {
        await approveProposal(proposalId);
    } catch (error) {
        console.error('Approve handler error:', error);
    }
};

window.handleRevision = async function(proposalId) {
    console.log('Handling revision for:', proposalId);
    
    try {
        await requestRevision(proposalId);
    } catch (error) {
        console.error('Revision handler error:', error);
    }
};

window.handleDelete = async function(proposalId) {
    console.log('Handling delete for:', proposalId);
    
    if (!confirm('Are you sure you want to delete this proposal?')) return;
    
    try {
        await deleteProposal(proposalId);
    } catch (error) {
        console.error('Delete handler error:', error);
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
// OTHER DATA LOADING FUNCTIONS
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

function updateDashboardStats(stats) {
    const update = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || 0;
    };
    
    update('activeUsersCount', stats.active_users);
    update('pendingUsersCount', stats.pending_users);
    update('totalUsersCount', stats.total_users);
    update('inactiveUsersCount', stats.inactive_users);
    update('totalProposalsCount', stats.total_proposals);
}

async function loadAllUsers() {
    console.log("Loading all users...");
    
    try {
        const { users, error } = await supabaseAuth.getAllUsers();
        
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

async function loadPendingApprovals() {
    console.log("Loading pending approvals...");
    
    try {
        const { users, error } = await supabaseAuth.getPendingUsers();
        
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

function updatePendingCount(count) {
    const badge = document.getElementById('pendingCountBadge');
    if (badge) {
        badge.textContent = count;
        badge.classList.toggle('d-none', count === 0);
    }
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

// In your Admin_Panel.js loadAnalyticsSection function
async function loadAnalyticsSection() {
    try {
        console.log("Loading analytics section...");
        
        // Make sure the section is visible first
        const analyticsSection = document.getElementById('analytics-section');
        if (!analyticsSection) {
            console.error("❌ Analytics section element not found!");
            return;
        }
        
        // Now load statistics
        const result = await loadStatistics();
        if (result.success) {
            updateStatisticsUI(result.data);
            drawCharts(result.data.users, result.data.files);
            
            // Update last updated time
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
// UTILITY FUNCTIONS
// ============================================

function setupSearchAndFilters() {
    // File search (for proposals)
    const searchInput = document.getElementById('searchFiles');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(loadAllProposals, 300));
    }
    
    // File filter (for proposals)
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
    
    // Refresh proposals button
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

function filterUsersTable() {
    const searchTerm = document.getElementById('searchUsers')?.value.toLowerCase() || '';
    const rows = document.querySelectorAll('#usersTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
}

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
            if (supabaseAuth && typeof supabaseAuth.logout === 'function') {
                await supabaseAuth.logout();
            }
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
// GLOBAL FUNCTIONS FOR HTML ONCLICK
// ============================================

// Approval functions using the new db_connection.js functions
window.approveUserAccount = async function(userId) {
    if (!confirm('Approve this user account?')) return;
    
    try {
        const result = await supabaseAuth.approveUser(userId, window.currentAdminId);
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
        const result = await supabaseAuth.rejectUser(userId, window.currentAdminId);
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
        const result = await supabaseAuth.updateUserStatus(userId, 'active', window.currentAdminId);
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
        const result = await supabaseAuth.updateUserStatus(userId, 'inactive', window.currentAdminId);
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

// Global delete function for files
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

// Global download function for files
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

window.refreshUserData = async function() {
    showStatus('Refreshing...', 'info');
    await loadDashboardData();
    await loadAllUsers();
    await loadPendingApprovals();
    await loadAllProposals();
    showStatus('Data refreshed', 'success');
};

window.loadAnalyticsSection = loadAnalyticsSection;
window.loadAllProposals = loadAllProposals;
window.loadAdminProjects = loadAdminProjects;