// --- USER PROFILE & DATA FETCHING ---

// Fetch user profile and dashboard data
async function fetchUserProfileAndData() {
    await fetchUserProfile();
    fetchDashboardData();
}

// Fetch user profile from Supabase
async function fetchUserProfile() {
    if (!sbClient) {
        console.error('Supabase client not initialized');
        return;
    }

    try {
        const { data, error } = await sbClient.from('faculty_profiles').select('*').limit(1).single();

        if (error) throw error;

        if (data) {
            currentProfileDbId = data.id;
            currentUser = data.full_name;
            currentUserEmail = data.email;

            // Update UI elements with user data
            const timestamp = '?t=' + new Date().getTime();
            const avatarSrc = data.avatar_url ? data.avatar_url + timestamp :
                `https://ui-avatars.com/api/?name=${encodeURIComponent(data.full_name)}&background=5A2C9D&color=fff`;

            // Update sidebar profile
            document.getElementById('user-name').textContent = data.full_name;
            document.getElementById('user-role').textContent = data.role || 'Faculty';
            document.getElementById('user-avatar').src = avatarSrc;

            // Update account card
            document.getElementById('account-name').textContent = data.full_name;
            document.getElementById('account-email').textContent = data.email;
            document.getElementById('account-avatar').src = avatarSrc;

            // Update profile modal
            document.getElementById('input-name').value = data.full_name;
            document.getElementById('input-email').value = data.email;
            document.getElementById('input-bio').value = data.bio || "";
            document.getElementById('modal-profile-img').src = avatarSrc;
            document.getElementById('profile-modal-name').textContent = data.full_name;
        }
    } catch (error) {
        console.error("Profile Load Error:", error);
        alert("Could not load user profile. Some features might be affected.");
    }
}

// Fetch dashboard data (statistics and recent activity)
async function fetchDashboardData() {
    if (!sbClient || !currentUser) {
        console.error('Supabase client or user not available');
        return;
    }

    try {
        // Fetch counts for stat cards including partnership requests
        const [
            { count: oppsCount },
            { count: partnershipCount },
            { count: propsCount },
            { count: handCount },
            { count: compCount },
            // Fetch total partnership requests for the badge
            { count: totalPartnershipCount }
        ] = await Promise.all([
            sbClient.from('partner_opportunities').select('*', { count: 'exact', head: true }).eq('status', 'New'),
            sbClient.from('partnership_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            sbClient.from('faculty_extension_proposals').select('*', { count: 'exact', head: true }).neq('status', 'Archived'),
            sbClient.from('partner_opportunities').select('*', { count: 'exact', head: true }).eq('claimed_by', currentUser).neq('status', 'Completed'),
            sbClient.from('partner_opportunities').select('*', { count: 'exact', head: true }).eq('status', 'Completed'),
            // Get total partnership requests (all statuses)
            sbClient.from('partnership_requests').select('*', { count: 'exact', head: true })
        ]);

        // Update the main dashboard stat cards
        document.getElementById('stat-opps').textContent = oppsCount || 0;
        document.getElementById('stat-partnership').textContent = partnershipCount || 0; // Pending only for dashboard
        document.getElementById('stat-props').textContent = propsCount || 0;
        document.getElementById('stat-hand').textContent = handCount || 0;
        document.getElementById('stat-comp').textContent = compCount || 0;

        // Update the sidebar badges
        // For partnership badge, show total count of all partnership requests
        document.getElementById('opp-badge').textContent = oppsCount || 0;
        document.getElementById('partnership-badge').textContent = totalPartnershipCount || 0; // Total count for badge
        document.getElementById('prop-badge').textContent = propsCount || 0;
        document.getElementById('hand-badge').textContent = handCount || 0;
        document.getElementById('comp-badge').textContent = compCount || 0;

        // Fetch recent activities
        await fetchRecentActivities();
    } catch (error) {
        console.error("Dashboard Data Error:", error);
        document.getElementById('recent-activity-list').innerHTML =
            `<div class="p-4 text-center text-red-500">Error loading data. Please refresh.</div>`;
    }
}

// Fetch recent activities
async function fetchRecentActivities() {
    try {
        const { data: activity, error } = await sbClient.from('faculty_extension_proposals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        const activityList = document.getElementById('recent-activity-list');

        if (error || !activity?.length) {
            activityList.innerHTML = `<div class="p-4 text-center text-gray-500">No recent activity.</div>`;
            return;
        }

        activityList.innerHTML = activity.map(item => {
            let statusClass = 'status-pending';
            if (item.status === 'Approved') statusClass = 'status-approved';
            if (item.status === 'Revision Requested') statusClass = 'status-revision';
            if (item.status === 'Completed') statusClass = 'status-completed';

            return `
                <div class="p-4 hover:bg-gray-50 transition cursor-pointer" onclick="openProjectModal('${encodeURIComponent(JSON.stringify(item))}')">
                    <div class="flex items-start gap-4">
                        <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <i class="bi bi-file-text text-gray-600"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center justify-between gap-2">
                                <p class="text-sm font-semibold text-gray-900 truncate">${item.title}</p>
                                <span class="status-badge ${statusClass} flex-shrink-0">${item.status}</span>
                            </div>
                            <p class="text-sm text-gray-500 mt-1 line-clamp-1">${item.description || 'No description available.'}</p>
                            <p class="text-xs text-gray-400 mt-2">${new Date(item.created_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (error) {
        console.error("Recent Activities Error:", error);
    }
}

// --- PARTNERSHIP REQUESTS FUNCTIONS ---

// Global variables for partnership requests
let currentPage = 1;
const itemsPerPage = 10;
let totalRequests = 0;

// Fetch partnership requests
async function fetchPartnershipRequests(page = 1, filterStatus = 'all', searchQuery = '') {
    const tbody = document.getElementById('partnership-requests-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-gray-400 animate-pulse">Loading partnership requests...</td></tr>`;

    try {
        let query = sbClient.from('partnership_requests')
            .select('*', { count: 'exact' })
            .order('submitted_at', { ascending: false });

        // Apply status filter
        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }

        // Apply search filter
        if (searchQuery) {
            query = query.or(`subject.ilike.%${searchQuery}%,org_name.ilike.%${searchQuery}%,contact_person.ilike.%${searchQuery}%`);
        }

        // Apply pagination
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;

        totalRequests = count || 0;
        currentPage = page;

        updatePaginationUI();

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-gray-500">No partnership requests found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(request => {
            const dateStr = new Date(request.submitted_at).toLocaleDateString();
            const safeData = encodeURIComponent(JSON.stringify(request));

            // Status badge styling
            let statusClass = 'bg-yellow-100 text-yellow-800';
            let statusText = 'Pending';

            switch(request.status) {
                case 'reviewed':
                    statusClass = 'bg-blue-100 text-blue-800';
                    statusText = 'Reviewed';
                    break;
                case 'approved':
                    statusClass = 'bg-green-100 text-green-800';
                    statusText = 'Approved';
                    break;
                case 'rejected':
                    statusClass = 'bg-red-100 text-red-800';
                    statusText = 'Rejected';
                    break;
            }

            return `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-4 font-bold text-gray-800" data-label="Subject">
                        <div class="flex items-start">
                            <div>
                                <p class="text-sm">${request.subject}</p>
                                <p class="text-xs text-gray-500 mt-1">${request.org_type}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4" data-label="Organization">
                        <p class="font-medium text-gray-700">${request.org_name}</p>
                        <p class="text-xs text-gray-500 mt-1 truncate max-w-xs">${request.address}</p>
                    </td>
                    <td class="px-6 py-4" data-label="Contact Person">
                        <p class="font-medium text-gray-700">${request.contact_person}</p>
                        <p class="text-xs text-gray-500">${request.position || ''}</p>
                        <p class="text-xs text-gray-400">${request.email}</p>
                    </td>
                    <td class="px-6 py-4 text-gray-500" data-label="Date Submitted">${dateStr}</td>
                    <td class="px-6 py-4" data-label="Status">
                        <span class="px-3 py-1 text-xs font-bold rounded-full ${statusClass}">${statusText}</span>
                    </td>
                    <td class="px-6 py-4 text-right" data-label="Actions">
                        <div class="flex items-center justify-end gap-2">
                            <!-- View Details Button -->
                            <button onclick="openPartnershipRequestModal('${safeData}')"
                                class="px-3 py-1.5 bg-cnsc-500 hover:bg-cnsc-600 text-white text-xs font-bold rounded shadow-sm transition flex items-center gap-1"
                                title="View Details">
                                <i class="bi bi-eye-fill"></i>
                            </button>

                            <!-- Status Buttons -->
                            <!-- Approve Button -->
                            <button onclick="updatePartnershipRequestStatus(${request.request_id}, 'approved')"
                                class="px-3 py-1.5 ${getStatusColor('approved')} text-xs font-bold rounded shadow-sm transition flex items-center gap-1"
                                title="Approve">
                                <i class="bi bi-check-lg"></i>
                            </button>

                            <!-- Reject Button -->
                            <button onclick="updatePartnershipRequestStatus(${request.request_id}, 'rejected')"
                                class="px-3 py-1.5 ${getStatusColor('rejected')} text-xs font-bold rounded shadow-sm transition flex items-center gap-1"
                                title="Reject">
                                <i class="bi bi-x-lg"></i>
                            </button>

                            <!-- Mark as Reviewed Button -->
                            <button onclick="updatePartnershipRequestStatus(${request.request_id}, 'reviewed')"
                                class="px-3 py-1.5 ${getStatusColor('reviewed')} text-xs font-bold rounded shadow-sm transition flex items-center gap-1"
                                title="Mark as Reviewed">
                                <i class="bi bi-pencil-square"></i>
                            </button>

                            <!-- Send Email Button -->
                            <button onclick="sendResponseEmail('${encodeURIComponent(JSON.stringify(request))}')"
                                class="px-3 py-1.5 text-cnsc-600 hover:text-cnsc-700 bg-cnsc-50 hover:bg-cnsc-100 border border-cnsc-200 text-xs font-bold rounded shadow-sm transition flex items-center gap-1"
                                title="Send Email">
                                <i class="bi bi-envelope-fill"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
    }).join('');

    } catch (error) {
        console.error("Partnership Requests Error:", error);
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-red-500"><strong>Error:</strong> ${error.message}</td></tr>`;
    }
}

// Update partnership request status (fixed version)
async function updatePartnershipRequestStatus(requestId, newStatus) {
    if (!confirm(`Are you sure you want to mark this as ${newStatus}?`)) return;

    try {
        // Convert requestId to number since it's an integer in the database
        const requestIdNum = parseInt(requestId);

        const updateData = {
            status: newStatus,
            updated_at: new Date().toISOString()
        };

        // Only add reviewed_by if the column exists
        if (currentUser) {
            updateData.reviewed_by = currentUser;
        }

        const { error } = await sbClient
            .from('partnership_requests')
            .update(updateData)
            .eq('request_id', requestIdNum);

        if (error) {
            console.error("Supabase Error Details:", error);
            throw new Error(`Database error: ${error.message}`);
        }

        // Show success message
        alert(`✓ Status updated to ${newStatus}!`);

        // Refresh the partnership requests view
        const searchInput = document.getElementById('partnership-search');
        const statusFilter = document.getElementById('status-filter');
        const query = searchInput?.value || '';
        const status = statusFilter?.value || 'all';
        fetchPartnershipRequests(currentPage, status, query);

        // Update dashboard stats (this will refresh the badge count)
        fetchDashboardData();

        // Close the modal if it's open
        closePartnershipModal();

    } catch (error) {
        console.error("Error updating status:", error);
        alert(`❌ Error updating status: ${error.message}`);
    }
}

// Open partnership request modal
function openPartnershipRequestModal(encodedData) {
    try {
        const request = JSON.parse(decodeURIComponent(encodedData));

        // Create modal HTML
        const modalHTML = `
            <div class="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60">
                <div class="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                    <div class="p-6 border-b border-gray-200 flex justify-between items-center">
                        <div>
                            <h3 class="text-xl font-bold text-gray-900">${request.subject}</h3>
                            <p class="text-sm text-gray-500">Partnership Request Details</p>
                        </div>
                        <button onclick="closePartnershipModal()" class="text-gray-400 hover:text-gray-600">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <div class="p-6 overflow-y-auto max-h-[70vh]">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div class="bg-gray-50 p-4 rounded-lg">
                                <h4 class="font-bold text-gray-700 mb-2">Organization Details</h4>
                                <p><strong>Name:</strong> ${request.org_name}</p>
                                <p><strong>Type:</strong> ${request.org_type}</p>
                                <p><strong>Letter Date:</strong> ${request.letter_date ? new Date(request.letter_date).toLocaleDateString() : 'N/A'}</p>
                                <p class="mt-2"><strong>Address:</strong></p>
                                <p class="text-sm text-gray-600 whitespace-pre-wrap">${request.address || 'No address provided'}</p>
                            </div>

                            <div class="bg-gray-50 p-4 rounded-lg">
                                <h4 class="font-bold text-gray-700 mb-2">Contact Information</h4>
                                <p><strong>Contact Person:</strong> ${request.contact_person || 'N/A'}</p>
                                <p><strong>Position:</strong> ${request.position || 'N/A'}</p>
                                <p><strong>Email:</strong> ${request.email || 'N/A'}</p>
                                <p><strong>Phone:</strong> ${request.phone || 'N/A'}</p>
                            </div>
                        </div>

                        <div class="space-y-6">
                            <div>
                                <h4 class="font-bold text-gray-700 mb-2">Proposed Collaboration Areas</h4>
                                <div class="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">${request.collaboration || 'No details provided.'}</div>
                            </div>

                            <div>
                                <h4 class="font-bold text-gray-700 mb-2">Expected Outcomes</h4>
                                <div class="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">${request.outcomes || 'No outcomes specified.'}</div>
                            </div>

                            ${request.additional_info ? `
                            <div>
                                <h4 class="font-bold text-gray-700 mb-2">Additional Information</h4>
                                <div class="bg-gray-50 p-4 rounded-lg whitespace-pre-wrap">${request.additional_info}</div>
                            </div>
                            ` : ''}
                        </div>

                        <div class="mt-6 pt-6 border-t border-gray-200">
                            <h4 class="font-bold text-gray-700 mb-2">Status & Timeline</h4>
                            <div class="flex flex-wrap gap-4">
                                <div>
                                    <p class="text-sm text-gray-500">Submitted</p>
                                    <p class="font-medium">${request.submitted_at ? new Date(request.submitted_at).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-500">Last Updated</p>
                                    <p class="font-medium">${request.updated_at ? new Date(request.updated_at).toLocaleDateString() : 'N/A'}</p>
                                </div>
                                <div>
                                    <p class="text-sm text-gray-500">Current Status</p>
                                    <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                        request.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                        request.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                                        request.status === 'approved' ? 'bg-green-100 text-green-800' :
                                        'bg-red-100 text-red-800'
                                    }">
                                        ${request.status === 'pending' ? 'Pending Review' :
                                          request.status === 'reviewed' ? 'Under Review' :
                                          request.status === 'approved' ? 'Approved' :
                                          request.status === 'rejected' ? 'Rejected' : request.status || 'Pending'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                        <div class="text-sm text-gray-500">
                            Request ID: ${request.request_id}
                        </div>
                        <div class="flex gap-2">
                            <button onclick="closePartnershipModal()"
                                class="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition flex items-center gap-2">
                                <i class="bi bi-x-lg"></i> Close
                            </button>

                            <!-- Status Action Buttons with Bootstrap Icons -->
                            <div class="flex gap-2">
                                <button onclick="updatePartnershipRequestStatus(${request.request_id}, 'approved')"
                                    class="px-4 py-2 ${getStatusColor('approved')} rounded-lg text-sm font-medium flex items-center gap-2 transition"
                                    title="Approve">
                                    <i class="bi bi-check-lg"></i> Approve
                                </button>
                                <button onclick="updatePartnershipRequestStatus(${request.request_id}, 'rejected')"
                                    class="px-4 py-2 ${getStatusColor('rejected')} rounded-lg text-sm font-medium flex items-center gap-2 transition"
                                    title="Reject">
                                    <i class="bi bi-x-lg"></i> Reject
                                </button>
                                <button onclick="updatePartnershipRequestStatus(${request.request_id}, 'reviewed')"
                                    class="px-4 py-2 ${getStatusColor('reviewed')} rounded-lg text-sm font-medium flex items-center gap-2 transition"
                                    title="Mark as Reviewed">
                                    <i class="bi bi-pencil-square"></i> Review
                                </button>
                            </div>

                            <button onclick="sendResponseEmail('${encodeURIComponent(JSON.stringify(request))}')"
                                class="px-4 py-2 bg-cnsc-500 hover:bg-cnsc-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition"
                                title="Send Response Email">
                                <i class="bi bi-envelope-fill"></i> Email
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('partnership-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to DOM
        const modalDiv = document.createElement('div');
        modalDiv.id = 'partnership-modal';
        modalDiv.innerHTML = modalHTML;
        document.body.appendChild(modalDiv);

        // Add smooth fade-in animation
        setTimeout(() => {
            modalDiv.style.opacity = '0';
            modalDiv.style.transition = 'opacity 0.2s ease-in-out';
            modalDiv.style.opacity = '1';
        }, 10);

    } catch (error) {
        console.error("Error opening partnership modal:", error);
        alert("Could not load partnership request details. Please try again.");
    }
}

// Close partnership modal
function closePartnershipModal() {
    const modal = document.getElementById('partnership-modal');
    if (modal) {
        modal.style.opacity = '0';
        setTimeout(() => {
            modal.remove();
        }, 200);
    }
}

// Send response email
function sendResponseEmail(encodedData) {
    try {
        const request = JSON.parse(decodeURIComponent(encodedData));

        const subject = `Response to Your Partnership Request: ${request.subject}`;
        const body = `Dear ${request.contact_person},\n\n` +
            `Thank you for your partnership request submitted on behalf of ${request.org_name}.\n\n` +
            `We have received your request and are currently reviewing it. Our team will contact you ` +
            `within the next 5-7 business days regarding next steps.\n\n` +
            `Request Details:\n` +
            `- Subject: ${request.subject}\n` +
            `- Organization: ${request.org_name}\n` +
            `- Submission Date: ${new Date(request.submitted_at).toLocaleDateString()}\n\n` +
            `If you have any immediate questions, please don't hesitate to reply to this email.\n\n` +
            `Sincerely,\n` +
            `The CNSC Extension Services Team\n` +
            `Camarines Norte State College`;

        const mailtoLink = `mailto:${request.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailtoLink;
    } catch (error) {
        console.error("Error preparing email:", error);
        alert("Could not prepare email. Please try again.");
    }
}

// Update pagination UI
function updatePaginationUI() {
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const countEl = document.getElementById('requests-count');

    if (countEl) {
        const start = totalRequests > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
        const end = Math.min(currentPage * itemsPerPage, totalRequests);
        countEl.textContent = `Showing ${start}-${end} of ${totalRequests} requests`;
    }

    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }

    if (nextBtn) {
        const totalPages = Math.ceil(totalRequests / itemsPerPage);
        nextBtn.disabled = currentPage === totalPages || totalPages === 0;
    }
}

// Search and filter handlers
function setupPartnershipFilters() {
    const searchInput = document.getElementById('partnership-search');
    const statusFilter = document.getElementById('status-filter');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            const query = searchInput.value;
            const status = statusFilter.value;
            currentPage = 1;
            fetchPartnershipRequests(currentPage, status, query);
        }, 500));
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            const query = searchInput?.value || '';
            const status = statusFilter.value;
            currentPage = 1;
            fetchPartnershipRequests(currentPage, status, query);
        });
    }

    // Pagination buttons
    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
        if (currentPage > 1) {
            const query = searchInput?.value || '';
            const status = statusFilter.value;
            fetchPartnershipRequests(currentPage - 1, status, query);
        }
    });

    document.getElementById('next-page-btn')?.addEventListener('click', () => {
        const query = searchInput?.value || '';
        const status = statusFilter.value;
        const totalPages = Math.ceil(totalRequests / itemsPerPage);
        if (currentPage < totalPages) {
            fetchPartnershipRequests(currentPage + 1, status, query);
        }
    });
}

// Debounce utility function
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

// Get status color class (for button styling)
function getStatusColor(status) {
    switch(status) {
        case 'approved':
            return 'bg-green-50 hover:bg-green-100 border border-green-200 text-green-600 hover:text-green-700';
        case 'rejected':
            return 'bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 hover:text-red-700';
        case 'reviewed':
            return 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-600 hover:text-blue-700';
        case 'pending':
            return 'bg-yellow-50 hover:bg-yellow-100 border border-yellow-200 text-yellow-600 hover:text-yellow-700';
        case 'in progress':
            return 'bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-600 hover:text-purple-700';
        case 'completed':
            return 'bg-green-100 hover:bg-green-200 border border-green-300 text-green-700 hover:text-green-800';
        case 'archived':
            return 'bg-gray-100 hover:bg-gray-200 border border-gray-300 text-gray-600 hover:text-gray-700';
        default:
            return 'bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 hover:text-gray-700';
    }
}

// --- EXISTING FUNCTIONS (keep these as they are) ---

// Fetch partner proposals/opportunities
async function fetchPartnerOpps() {
    const tbody = document.getElementById('partner-opps-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-gray-400 animate-pulse">Loading partner proposals...</td></tr>`;

    try {
        const { data, error } = await sbClient.from('partners_proposals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-gray-500">No partner proposals found.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(sub => {
            const dateStr = new Date(sub.created_at).toLocaleDateString();
            const safeData = encodeURIComponent(JSON.stringify(sub));

            const actionsHtml = `
                <div class="flex items-center justify-end gap-4">
                    <button onclick="openProjectModal('${safeData}')" class="font-bold text-gray-500 hover:underline text-xs uppercase">Details</button>
                    <a href="SubmitProposal.html?data=${safeData}" class="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white font-bold text-xs rounded shadow-md">Draft Proposal</a>
                </div>
            `;

            return `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-4 font-bold text-gray-800">${sub.subject}</td>
                    <td class="px-6 py-4 text-gray-600">${sub.organization_name}</td>
                    <td class="px-6 py-4 text-gray-500">${dateStr}</td>
                    <td class="px-6 py-4"><span class="px-3 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">${sub.status}</span></td>
                    <td class="px-6 py-4 text-right">${actionsHtml}</td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error("Partner Proposals Error:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500"><strong>Error:</strong> ${error.message}</td></tr>`;
    }
}

// Fetch my proposals
async function fetchMyProposals() {
    const tbody = document.getElementById('my-proposals-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-400 animate-pulse">Loading proposals...</td></tr>`;

    try {
        let query = sbClient.from('faculty_extension_proposals')
            .select('*')
            .order('created_at', { ascending: false });

        query = showArchived ? query.eq('status', 'Archived') : query.neq('status', 'Archived');

        const { data, error } = await query;

        if (error) throw error;

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">${
                showArchived ? "Archive is empty." : "No active proposals found."
            }</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(proposal => {
            const dateStr = new Date(proposal.created_at).toLocaleDateString();
            let statusClass = 'bg-yellow-100 text-yellow-800';
            if (proposal.status === 'Approved') statusClass = 'bg-green-100 text-green-800';
            if (proposal.status === 'Revision Requested') statusClass = 'bg-red-100 text-red-800';

            const safeData = encodeURIComponent(JSON.stringify(proposal));
            let actionsHtml = '';

            if (showArchived) {
                actionsHtml = `
                    <button onclick="restoreProposal('${proposal.id}')" class="inline-flex items-center gap-2 text-sm font-bold text-green-600 hover:text-green-800 transition mr-2" title="Restore">
                        <i class="bi bi-arrow-counterclockwise"></i>
                        Restore
                    </button>
                    <button onclick="openDeleteModal('${proposal.id}')" class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600 transition" title="Delete Permanently">
                        <i class="bi bi-trash-fill"></i>
                    </button>`;
            } else {
                actionsHtml = `
                    <button onclick="openProjectModal('${safeData}')" class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition" title="View Details">
                        <i class="bi bi-eye-fill"></i>
                    </button>
                    <a href="SubmitProposal.html?id=${proposal.id}" class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-cnsc-500 transition" title="Edit Proposal">
                        <i class="bi bi-pencil-fill"></i>
                    </a>
                    <button onclick="openDeleteModal('${proposal.id}')" class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600 transition" title="Archive or Delete">
                        <i class="bi bi-archive-fill"></i>
                    </button>`;
            }

            return `
                <tr class="border-b hover:bg-gray-50 transition">
                    <td class="px-6 py-4 font-bold text-gray-900">${proposal.title}</td>
                    <td class="px-6 py-4">${dateStr}</td>
                    <td class="px-6 py-4"><span class="px-3 py-1 text-xs font-bold rounded-full ${statusClass}">${proposal.status}</span></td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex justify-end items-center gap-2">${actionsHtml}</div>
                    </td>
                </tr>`;
        }).join('');
    } catch (error) {
        console.error("My Proposals Error:", error);
        tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-red-500 bg-red-50"><strong>Error:</strong> ${error.message}</td></tr>`;
    }
}

// Fetch handled projects
async function fetchHandledProjects() {
    const grid = document.getElementById('handled-cards-grid');
    if (!grid || !currentUser) return;

    grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-10 animate-pulse">Loading your projects...</div>`;

    try {
        const { data, error } = await sbClient.from('partner_opportunities')
            .select('*, attachment_urls')
            .eq('claimed_by', currentUser)
            .order('created_at', { ascending: false });

        if (error || !data?.length) {
            grid.innerHTML = `<div class="col-span-full flex flex-col items-center justify-center text-gray-500 py-10">
                <p>No projects found for <strong>${currentUser}</strong>.</p>
            </div>`;
            return;
        }

        grid.innerHTML = data.map(item => {
            const safeItem = encodeURIComponent(JSON.stringify(item));
            let badgeColor = 'bg-yellow-500';
            if (item.status === 'Completed') badgeColor = 'bg-green-500';
            if (item.status === 'In Progress') badgeColor = 'bg-blue-500';

            // Set cover image
            let coverImageUrl = `https://source.unsplash.com/random/400x300?work&sig=${item.id}`;
            if (item.attachment_urls && item.attachment_urls.length > 0) {
                const firstImage = item.attachment_urls.find(url =>
                    url && url.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i)
                );
                if (firstImage) {
                    coverImageUrl = firstImage;
                }
            }

            return `
                <div class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition border border-gray-100 flex flex-col h-full group">
                    <div class="relative h-48">
                        <img src="${coverImageUrl}" class="w-full h-full object-cover transition group-hover:scale-110" alt="Project Cover">
                        <div class="absolute top-4 right-4 ${badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full uppercase shadow-sm">${item.status}</div>
                    </div>
                    <div class="p-6 flex-1 flex flex-col">
                        <h3 class="text-xl font-bold text-gray-900 mb-2 line-clamp-1">${item.title}</h3>
                        <p class="text-gray-600 text-sm line-clamp-3 mb-4">${item.description || 'No description.'}</p>
                        <div class="mt-auto pt-4 border-t border-gray-100">
                            <div class="flex justify-between items-center text-xs text-gray-500 mb-4">
                                <span><strong>Lead:</strong> You</span>
                                <span><strong>Partner:</strong> ${item.partner_organization}</span>
                            </div>
                            <button onclick="openProjectModal('${safeItem}')" class="w-full py-2.5 rounded-lg border-2 border-cnsc-500 text-cnsc-600 font-bold text-sm hover:bg-cnsc-500 hover:text-white transition">Manage Project</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (error) {
        console.error("Handled Projects Error:", error);
        grid.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">Error loading projects.</div>`;
    }
}

// Fetch completed projects
async function fetchCompletedProjects() {
    const grid = document.getElementById('completed-cards-grid');
    if (!grid) return;

    grid.innerHTML = `<div class="col-span-full text-center text-gray-400 py-10 animate-pulse">Loading archive...</div>`;

    try {
        const { data, error } = await sbClient.from('partner_opportunities')
            .select('*, attachment_urls')
            .eq('status', 'Completed')
            .order('created_at', { ascending: false });

        if (error || !data?.length) {
            grid.innerHTML = `<div class="col-span-full text-center text-gray-500 py-10">No completed projects found.</div>`;
            return;
        }

        grid.innerHTML = data.map(item => {
            const safeItem = encodeURIComponent(JSON.stringify(item));

            // Set cover image
            let coverImageUrl = `https://source.unsplash.com/random/400x300?success&sig=${item.id}`;
            if (item.attachment_urls && item.attachment_urls.length > 0) {
                const firstImage = item.attachment_urls.find(url =>
                    url && url.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i)
                );
                if (firstImage) {
                    coverImageUrl = firstImage;
                }
            }

            return `
                <div class="bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition border border-emerald-100 flex flex-col h-full group">
                    <div class="relative h-48">
                        <img src="${coverImageUrl}" class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition" alt="Project Cover">
                        <div class="absolute top-4 right-4 bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase shadow-sm">Completed</div>
                    </div>
                    <div class="p-6 flex-1 flex flex-col">
                        <h3 class="text-xl font-bold text-gray-900 mb-2 line-clamp-1">${item.title}</h3>
                        <p class="text-gray-600 text-sm line-clamp-3 mb-4">${item.description || 'Project successfully implemented.'}</p>
                        <div class="mt-auto pt-4 border-t border-gray-100">
                            <div class="flex justify-between items-center text-xs text-gray-500 mb-4">
                                <span><strong>Handled By:</strong> ${item.claimed_by || 'Team'}</span>
                                <span><strong>Date:</strong> ${new Date(item.created_at).toLocaleDateString()}</span>
                            </div>
                            <button onclick="openProjectModal('${safeItem}')" class="w-full py-2.5 rounded-lg border-2 border-emerald-600 text-emerald-600 font-bold text-sm hover:bg-emerald-600 hover:text-white transition">View Outcome</button>
                        </div>
                    </div>
                </div>`;
        }).join('');
    } catch (error) {
        console.error("Completed Projects Error:", error);
        grid.innerHTML = `<div class="col-span-full text-center text-red-500 py-10">Error loading completed projects.</div>`;
    }
}

// --- NOTIFICATIONS ---

// Fetch notifications
async function fetchNotifications() {
    if (!sbClient || !currentUser) return;

    try {
        const { data, error } = await sbClient.from('faculty_notifications')
            .select('*')
            .eq('recipient', currentUser)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.error("Notifications Error:", error);
            return;
        }

        renderNotificationsUI(data);
    } catch (error) {
        console.error("Fetch Notifications Error:", error);
    }
}

// Render notifications UI
function renderNotificationsUI(data) {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');

    if (!list) return;

    list.innerHTML = '';

    const unreadCount = data?.filter(n => !n.is_read)?.length || 0;

    if (unreadCount > 0) {
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    if (!data || data.length === 0) {
        list.innerHTML = `<div class="p-4 text-center text-gray-400 text-xs italic">No new notifications</div>`;
        return;
    }

    data.forEach(n => {
        const bgClass = n.is_read ? 'bg-white' : 'bg-purple-50';
        list.innerHTML += `
            <div class="p-3 ${bgClass} border-b border-gray-50 flex gap-3 hover:bg-gray-100 transition cursor-pointer">
                <div class="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></div>
                <div>
                    <p class="text-sm text-gray-800">${n.message}</p>
                    <p class="text-[10px] text-gray-400 mt-1">${new Date(n.created_at).toLocaleString()}</p>
                </div>
            </div>`;
    });
}

// Mark all notifications as read
async function markAllAsRead() {
    if (!sbClient || !currentUser) return;

    try {
        await sbClient.from('notifications')
            .update({ is_read: true })
            .eq('recipient', currentUser);

        fetchNotifications();
    } catch (error) {
        console.error("Mark All Read Error:", error);
    }
}

// Send system notification
async function sendSystemNotification(recipientName, message, type = 'info') {
    if (!sbClient) return;

    try {
        await sbClient.from('notifications')
            .insert({
                recipient: recipientName,
                message: message,
                type: type
            });

        simulateEmailSending(recipientName, message);
        fetchNotifications();
    } catch (error) {
        console.error("Send Notification Error:", error);
    }
}

// Simulate email sending with EmailJS
function simulateEmailSending(name, msg) {
    if (!currentUserEmail || typeof emailjs === 'undefined') return;

    const toast = document.createElement('div');
    toast.className = "fixed bottom-5 right-5 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 z-[200] animate-pulse";
    toast.innerHTML = `<span><i class="bi bi-clock"></i></span><div><p class="font-bold text-sm">Sending Email...</p></div>`;
    document.body.appendChild(toast);

    const templateParams = {
        name: name,
        to_email: currentUserEmail,
        message: msg,
        subject: "Project Update"
    };

    emailjs.send('service_gyl0q9g', 'template_q40yoyg', templateParams)
        .then(function(response) {
            toast.classList.remove('animate-pulse');
            toast.innerHTML = `<span><i class="bi bi-check-circle-fill"></i></span><div><p class="font-bold text-sm">Email Sent Successfully!</p></div>`;
            setTimeout(() => toast.remove(), 5000);
        }, function(error) {
            toast.innerHTML = `<p class="text-red-400 font-bold">Email Failed: ${error.text}</p>`;
            setTimeout(() => toast.remove(), 5000);
        });
}

// Initialize partnership requests when the view loads
function initializePartnershipRequestsView() {
    // Setup event listeners for filters and pagination
    setupPartnershipFilters();

    // Fetch initial data
    const searchInput = document.getElementById('partnership-search');
    const statusFilter = document.getElementById('status-filter');
    const query = searchInput?.value || '';
    const status = statusFilter?.value || 'all';

    fetchPartnershipRequests(1, status, query);
}


// Update the main initialization to include partnership requests
document.addEventListener('DOMContentLoaded', function() {
    // ... existing initialization code ...

    // Setup partnership filters after a short delay to ensure DOM is ready
    setTimeout(() => {
        if (document.getElementById('partnership-search')) {
            setupPartnershipFilters();
        }
    }, 100);
});