// JS/inquiries-manager.js
import { supabase } from './db_connection.js';

class InquiriesManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.totalInquiries = 0;
        this.inquiries = [];
        this.initialize();
    }

    async initialize() {
        console.log('📋 Inquiries Manager initialized');
        
        // Create inquiries section in admin panel if it doesn't exist
        this.createInquiriesSection();
        
        // Load inquiries on page load
        await this.loadInquiries();
        
        // Set up event listeners
        this.setupEventListeners();
    }

    createInquiriesSection() {
        // Check if inquiries section already exists
        if (document.getElementById('inquiries-section')) {
            return;
        }

        // Get the main content area
        const mainContent = document.querySelector('main');
        const analyticsSection = document.getElementById('analytics-section');
        
        // Create inquiries section HTML
        const inquiriesSection = document.createElement('div');
        inquiriesSection.id = 'inquiries-section';
        inquiriesSection.className = 'section-content d-none';
        inquiriesSection.innerHTML = `
            <div class="card shadow-sm border-0">
                <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                    <h5 class="mb-0"><i class="bi bi-envelope me-2"></i> Contact Inquiries</h5>
                    <div class="btn-group">
                        <button class="btn btn-light btn-sm" id="refreshInquiriesBtn">
                            <i class="bi bi-arrow-clockwise"></i> Refresh
                        </button>
                        <button class="btn btn-light btn-sm dropdown-toggle" type="button" 
                                data-bs-toggle="dropdown" aria-expanded="false">
                            <i class="bi bi-filter"></i> Filter
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end">
                            <li><a class="dropdown-item" href="#" data-filter="all">All Inquiries</a></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><a class="dropdown-item" href="#" data-filter="pending">Pending</a></li>
                            <li><a class="dropdown-item" href="#" data-filter="read">Read</a></li>
                            <li><a class="dropdown-item" href="#" data-filter="replied">Replied</a></li>
                            <li><a class="dropdown-item" href="#" data-filter="closed">Closed</a></li>
                        </ul>
                    </div>
                </div>
                <div class="card-body">
                    <!-- Stats Cards -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card stat-card bg-primary text-white">
                                <div class="card-body text-center p-3">
                                    <h4 id="totalInquiriesCount">0</h4>
                                    <p class="mb-0">Total Inquiries</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card bg-warning text-dark">
                                <div class="card-body text-center p-3">
                                    <h4 id="pendingInquiriesCount">0</h4>
                                    <p class="mb-0">Pending</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card bg-success text-white">
                                <div class="card-body text-center p-3">
                                    <h4 id="repliedInquiriesCount">0</h4>
                                    <p class="mb-0">Replied</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card stat-card bg-secondary text-white">
                                <div class="card-body text-center p-3">
                                    <h4 id="closedInquiriesCount">0</h4>
                                    <p class="mb-0">Closed</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Search and Filters -->
                    <div class="row mb-4">
                        <div class="col-md-8">
                            <div class="input-group">
                                <span class="input-group-text"><i class="bi bi-search"></i></span>
                                <input type="text" class="form-control" id="inquirySearch" 
                                       placeholder="Search by name, email, or subject...">
                                <button class="btn btn-outline-secondary" type="button" id="clearSearch">
                                    Clear
                                </button>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <select class="form-select" id="inquirySort">
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                                <option value="pending_first">Pending First</option>
                            </select>
                        </div>
                    </div>

                    <!-- Inquiries Table -->
                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead class="table-light">
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Subject</th>
                                    <th>Status</th>
                                    <th>Date</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody id="inquiriesTableBody">
                                <tr>
                                    <td colspan="7" class="text-center py-4">
                                        <div class="spinner-border spinner-border-sm" role="status"></div>
                                        <p class="mt-2 mb-0">Loading inquiries...</p>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <nav aria-label="Inquiries navigation" class="mt-4">
                        <ul class="pagination justify-content-center" id="inquiriesPagination">
                            <li class="page-item disabled">
                                <a class="page-link" href="#" tabindex="-1">Previous</a>
                            </li>
                            <li class="page-item"><a class="page-link" href="#">1</a></li>
                            <li class="page-item">
                                <a class="page-link" href="#">Next</a>
                            </li>
                        </ul>
                    </nav>
                </div>
            </div>
        `;

        // Insert after content section
        if (analyticsSection) {
            analyticsSection.parentNode.insertBefore(inquiriesSection, analyticsSection.nextSibling);
        } else {
            mainContent.appendChild(inquiriesSection);
        }

        // Add to sidebar navigation
        this.addInquiriesToSidebar();
    }

    addInquiriesToSidebar() {
        const sidebar = document.querySelector('.sidebar .nav');
        
        // Check if already exists
        if (document.querySelector('[data-section="inquiries"]')) {
            return;
        }

        const inquiriesNavItem = document.createElement('li');
        inquiriesNavItem.className = 'nav-item';
        inquiriesNavItem.innerHTML = `
            <a class="nav-link" href="#" data-section="inquiries">
                <i class="bi bi-envelope"></i> Inquiries
                <span class="badge bg-danger ms-1 d-none" id="inquiryBadge">0</span>
            </a>
        `;

        // Insert after approvals section
        const approvalsItem = document.querySelector('[data-section="approvals"]');
        if (approvalsItem) {
            approvalsItem.parentNode.insertBefore(inquiriesNavItem, approvalsItem.nextSibling);
        } else {
            sidebar.appendChild(inquiriesNavItem);
        }
    }

    setupEventListeners() {
        // Event delegation for sidebar clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-section="inquiries"]')) {
                e.preventDefault();
                this.showInquiriesSection();
            }
        });

        // Refresh button
        document.addEventListener('click', (e) => {
            if (e.target.closest('#refreshInquiriesBtn')) {
                this.loadInquiries();
            }
        });

        // Search input
        const searchInput = document.getElementById('inquirySearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterInquiries();
            });
        }

        // Clear search
        document.addEventListener('click', (e) => {
            if (e.target.closest('#clearSearch')) {
                if (searchInput) searchInput.value = '';
                this.filterInquiries();
            }
        });

        // Sort select
        const sortSelect = document.getElementById('inquirySort');
        if (sortSelect) {
            sortSelect.addEventListener('change', () => {
                this.sortInquiries();
            });
        }

        // Filter dropdown
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-filter]')) {
                e.preventDefault();
                const filter = e.target.dataset.filter;
                this.filterByStatus(filter);
            }
        });
    }

    showInquiriesSection() {
        // Hide all sections
        document.querySelectorAll('.section-content').forEach(section => {
            section.classList.add('d-none');
        });

        // Show inquiries section
        const inquiriesSection = document.getElementById('inquiries-section');
        if (inquiriesSection) {
            inquiriesSection.classList.remove('d-none');
            document.getElementById('sectionTitle').textContent = 'Contact Inquiries';
            
            // Load fresh data
            this.loadInquiries();
        }

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector('[data-section="inquiries"]').classList.add('active');
    }

    async loadInquiries() {
        try {
            console.log('📥 Loading inquiries from database...');
            
            // Show loading state
            this.showLoading(true);

            // Fetch inquiries from Supabase
            const { data: inquiries, error, count } = await supabase
                .from('inquiries')
                .select('*', { count: 'exact' })
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Error loading inquiries:', error);
                
                // Try loading from localStorage as fallback
                const localInquiries = JSON.parse(localStorage.getItem('contact_inquiries') || '[]');
                this.inquiries = localInquiries.map(inquiry => ({
                    ...inquiry,
                    id: inquiry.id || inquiry.local_id,
                    status: inquiry.status || 'pending'
                }));
                
                console.log('📂 Loaded from localStorage:', this.inquiries.length);
            } else {
                this.inquiries = inquiries || [];
                console.log('✅ Loaded from database:', this.inquiries.length);
                
                // Also check localStorage for any unsynced inquiries
                this.checkLocalStorageInquiries();
            }

            this.totalInquiries = this.inquiries.length;
            
            // Update stats
            this.updateStats();
            
            // Display inquiries
            this.displayInquiries();
            
            // Update badge
            this.updateBadge();
            
        } catch (error) {
            console.error('❌ Unexpected error loading inquiries:', error);
            this.showError('Failed to load inquiries');
        } finally {
            this.showLoading(false);
        }
    }

    async checkLocalStorageInquiries() {
        try {
            const localInquiries = JSON.parse(localStorage.getItem('contact_inquiries') || '[]');
            
            if (localInquiries.length > 0) {
                console.log('🔍 Found', localInquiries.length, 'inquiries in localStorage');
                
                // Try to sync to database
                for (const localInquiry of localInquiries) {
                    if (localInquiry.local_storage) {
                        try {
                            const { error } = await supabase
                                .from('inquiries')
                                .insert({
                                    name: localInquiry.name,
                                    email: localInquiry.email,
                                    subject: localInquiry.subject,
                                    message: localInquiry.message,
                                    status: 'pending'
                                });
                            
                            if (!error) {
                                console.log('✅ Synced local inquiry to database');
                                
                                // Remove from localStorage after successful sync
                                localInquiries.splice(localInquiries.indexOf(localInquiry), 1);
                                localStorage.setItem('contact_inquiries', JSON.stringify(localInquiries));
                            }
                        } catch (syncError) {
                            console.warn('⚠️ Failed to sync local inquiry:', syncError);
                        }
                    }
                }
            }
        } catch (error) {
            console.warn('⚠️ Error checking localStorage:', error);
        }
    }

    updateStats() {
        const total = this.inquiries.length;
        const pending = this.inquiries.filter(i => i.status === 'pending').length;
        const replied = this.inquiries.filter(i => i.status === 'replied').length;
        const closed = this.inquiries.filter(i => i.status === 'closed').length;
        
        // Update counters
        const updateCounter = (elementId, count) => {
            const element = document.getElementById(elementId);
            if (element) {
                element.textContent = count;
            }
        };
        
        updateCounter('totalInquiriesCount', total);
        updateCounter('pendingInquiriesCount', pending);
        updateCounter('repliedInquiriesCount', replied);
        updateCounter('closedInquiriesCount', closed);
    }

    displayInquiries() {
        const tbody = document.getElementById('inquiriesTableBody');
        if (!tbody) return;

        if (this.inquiries.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="text-muted">
                            <i class="bi bi-inbox fs-1"></i>
                            <p class="mt-2">No inquiries found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        
        this.inquiries.forEach(inquiry => {
            const date = new Date(inquiry.created_at);
            const formattedDate = date.toLocaleDateString();
            const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Status badge color
            let statusClass = 'badge ';
            switch(inquiry.status) {
                case 'pending': statusClass += 'bg-warning'; break;
                case 'read': statusClass += 'bg-info'; break;
                case 'replied': statusClass += 'bg-success'; break;
                case 'closed': statusClass += 'bg-secondary'; break;
                default: statusClass += 'bg-light text-dark';
            }
            
            // Truncate message preview
            const messagePreview = inquiry.message.length > 100 
                ? inquiry.message.substring(0, 100) + '...' 
                : inquiry.message;
            
            html += `
                <tr data-inquiry-id="${inquiry.id}">
                    <td><small class="text-muted">#${inquiry.id}</small></td>
                    <td>
                        <div class="fw-bold">${inquiry.name}</div>
                    </td>
                    <td>
                        <a href="mailto:${inquiry.email}" class="text-decoration-none">
                            <small>${inquiry.email}</small>
                        </a>
                    </td>
                    <td>${inquiry.subject}</td>
                    <td>
                        <span class="${statusClass}">${inquiry.status}</span>
                    </td>
                    <td>
                        <small>${formattedDate}</small><br>
                        <small class="text-muted">${formattedTime}</small>
                    </td>
                    <td>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-primary" onclick="window.inquiriesManager.viewInquiry(${inquiry.id})">
                                <i class="bi bi-eye"></i>
                            </button>
                            <button class="btn btn-outline-success" onclick="window.inquiriesManager.updateStatus(${inquiry.id}, 'replied')">
                                <i class="bi bi-reply"></i>
                            </button>
                            <button class="btn btn-outline-secondary" onclick="window.inquiriesManager.updateStatus(${inquiry.id}, 'closed')">
                                <i class="bi bi-check-circle"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    async viewInquiry(inquiryId) {
        try {
            const inquiry = this.inquiries.find(i => i.id == inquiryId);
            if (!inquiry) {
                this.showError('Inquiry not found');
                return;
            }

            // Format dates
            const createdDate = new Date(inquiry.created_at);
            const formattedDate = createdDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Create modal HTML
            const modalHtml = `
                <div class="modal fade" id="inquiryModal" tabindex="-1" aria-hidden="true">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title">Inquiry Details</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row mb-4">
                                    <div class="col-md-6">
                                        <h6 class="text-muted">From</h6>
                                        <p class="h5">${inquiry.name}</p>
                                        <a href="mailto:${inquiry.email}" class="text-decoration-none">
                                            ${inquiry.email}
                                        </a>
                                    </div>
                                    <div class="col-md-6">
                                        <h6 class="text-muted">Submitted</h6>
                                        <p>${formattedDate}</p>
                                        <span class="badge ${this.getStatusClass(inquiry.status)}">
                                            ${inquiry.status}
                                        </span>
                                    </div>
                                </div>
                                
                                <div class="mb-4">
                                    <h6 class="text-muted">Subject</h6>
                                    <p class="h6">${inquiry.subject}</p>
                                </div>
                                
                                <div class="mb-4">
                                    <h6 class="text-muted">Message</h6>
                                    <div class="card bg-light">
                                        <div class="card-body">
                                            <p class="mb-0">${inquiry.message.replace(/\n/g, '<br>')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <div class="btn-group">
                                    <button type="button" class="btn btn-success" 
                                            onclick="window.inquiriesManager.updateStatus(${inquiry.id}, 'replied')">
                                        <i class="bi bi-reply"></i> Mark as Replied
                                    </button>
                                    <button type="button" class="btn btn-secondary" 
                                            onclick="window.inquiriesManager.updateStatus(${inquiry.id}, 'closed')">
                                        <i class="bi bi-check-circle"></i> Close Inquiry
                                    </button>
                                </div>
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Remove existing modal
            const existingModal = document.getElementById('inquiryModal');
            if (existingModal) existingModal.remove();

            // Add new modal to body
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Show modal
            const modal = new bootstrap.Modal(document.getElementById('inquiryModal'));
            modal.show();

            // Mark as read if pending
            if (inquiry.status === 'pending') {
                await this.updateStatus(inquiry.id, 'read');
            }

        } catch (error) {
            console.error('❌ Error viewing inquiry:', error);
            this.showError('Failed to load inquiry details');
        }
    }

    async updateStatus(inquiryId, newStatus) {
        try {
            console.log(`🔄 Updating inquiry ${inquiryId} to ${newStatus}`);
            
            // Update in database
            const { error } = await supabase
                .from('inquiries')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', inquiryId);
            
            if (error) {
                throw error;
            }
            
            // Update local array
            const inquiryIndex = this.inquiries.findIndex(i => i.id == inquiryId);
            if (inquiryIndex !== -1) {
                this.inquiries[inquiryIndex].status = newStatus;
            }
            
            // Update display
            this.displayInquiries();
            this.updateStats();
            this.updateBadge();
            
            // Show success message
            this.showSuccess(`Inquiry marked as ${newStatus}`);
            
            // Close modal if open
            const modal = bootstrap.Modal.getInstance(document.getElementById('inquiryModal'));
            if (modal) {
                modal.hide();
            }
            
        } catch (error) {
            console.error('❌ Error updating status:', error);
            this.showError('Failed to update status');
        }
    }

    filterInquiries() {
        const searchInput = document.getElementById('inquirySearch');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.toLowerCase();
        
        const filtered = this.inquiries.filter(inquiry => 
            inquiry.name.toLowerCase().includes(searchTerm) ||
            inquiry.email.toLowerCase().includes(searchTerm) ||
            inquiry.subject.toLowerCase().includes(searchTerm) ||
            inquiry.message.toLowerCase().includes(searchTerm)
        );
        
        this.displayFilteredInquiries(filtered);
    }

    filterByStatus(status) {
        if (status === 'all') {
            this.displayInquiries();
            return;
        }
        
        const filtered = this.inquiries.filter(inquiry => inquiry.status === status);
        this.displayFilteredInquiries(filtered);
    }

    sortInquiries() {
        const sortSelect = document.getElementById('inquirySort');
        if (!sortSelect) return;
        
        const sortValue = sortSelect.value;
        let sorted = [...this.inquiries];
        
        switch(sortValue) {
            case 'newest':
                sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'oldest':
                sorted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'pending_first':
                sorted.sort((a, b) => {
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;
                    return new Date(b.created_at) - new Date(a.created_at);
                });
                break;
        }
        
        this.displayFilteredInquiries(sorted);
    }

    displayFilteredInquiries(filteredInquiries) {
        const tbody = document.getElementById('inquiriesTableBody');
        if (!tbody) return;

        if (filteredInquiries.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-5">
                        <div class="text-muted">
                            <i class="bi bi-search fs-1"></i>
                            <p class="mt-2">No matching inquiries found</p>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        let html = '';
        
        filteredInquiries.forEach(inquiry => {
            const date = new Date(inquiry.created_at);
            const formattedDate = date.toLocaleDateString();
            
            html += `
                <tr data-inquiry-id="${inquiry.id}">
                    <td><small class="text-muted">#${inquiry.id}</small></td>
                    <td>${inquiry.name}</td>
                    <td><small>${inquiry.email}</small></td>
                    <td>${inquiry.subject}</td>
                    <td><span class="${this.getStatusClass(inquiry.status)}">${inquiry.status}</span></td>
                    <td><small>${formattedDate}</small></td>
                    <td>
                        <button class="btn btn-sm btn-outline-primary" 
                                onclick="window.inquiriesManager.viewInquiry(${inquiry.id})">
                            View
                        </button>
                    </td>
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    getStatusClass(status) {
        switch(status) {
            case 'pending': return 'badge bg-warning';
            case 'read': return 'badge bg-info';
            case 'replied': return 'badge bg-success';
            case 'closed': return 'badge bg-secondary';
            default: return 'badge bg-light text-dark';
        }
    }

    updateBadge() {
        const pendingCount = this.inquiries.filter(i => i.status === 'pending').length;
        const badge = document.getElementById('inquiryBadge');
        
        if (badge) {
            if (pendingCount > 0) {
                badge.textContent = pendingCount;
                badge.classList.remove('d-none');
            } else {
                badge.classList.add('d-none');
            }
        }
    }

    showLoading(show) {
        const tbody = document.getElementById('inquiriesTableBody');
        if (!tbody) return;
        
        if (show) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center py-4">
                        <div class="spinner-border spinner-border-sm" role="status"></div>
                        <p class="mt-2 mb-0">Loading inquiries...</p>
                    </td>
                </tr>
            `;
        }
    }

    showError(message) {
        this.showNotification(message, 'danger');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Remove existing notification
        const existing = document.getElementById('inquiryNotification');
        if (existing) existing.remove();
        
        const alertClass = type === 'success' ? 'alert-success' : 
                          type === 'danger' ? 'alert-danger' : 'alert-info';
        
        const notification = document.createElement('div');
        notification.id = 'inquiryNotification';
        notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
        notification.style.cssText = `
            top: 80px;
            right: 20px;
            z-index: 9999;
            min-width: 300px;
        `;
        
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initializing Inquiries Manager...');
    window.inquiriesManager = new InquiriesManager();
});

// Export for module usage
export default InquiriesManager;