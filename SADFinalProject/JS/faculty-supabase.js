// faculty-supabase.js - Supabase and Database Logic Only

const SUPABASE_URL = 'https://fkdqenrxfanpgmtogiig.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZHFlbnJ4ZmFucGdtdG9naWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDA1NzksImV4cCI6MjA4MDMxNjU3OX0.NSA57GQcxnCpLnqMVlDpf_lvfggb2H-IGGTBL_XYQ4I';

// Global Supabase client
let sbClient;

// Global state variables
let selectedProposalId = null;
let showArchived = false;
let searchTimer;
let activeCategory = 'Partner';
let currentProjectId = null;
let currentProfileDbId = null;
let currentUser = null;
let currentUserEmail = null;

// Partnership requests pagination
let currentPage = 1;
const itemsPerPage = 10;
let totalRequests = 0;

// Initialize Supabase
function initializeServices() {
    try {
        // Initialize Supabase using the same database as admin/partner
        sbClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

        console.log('Supabase client initialized for faculty dashboard');
        console.log('Using database:', SUPABASE_URL);

        // Test connection
        testConnection();

        // Initialize EmailJS
        if (typeof emailjs !== 'undefined') {
            emailjs.init("qRx5WRPit73IDD8Z4");
            console.log('EmailJS initialized successfully');
        }

        console.log('Services initialized successfully');
        return true;
    } catch (e) {
        console.error("Initialization Error:", e);
        alert("Failed to initialize app services. Check console.");
        return false;
    }
}

// Test connection
async function testConnection() {
    try {
        console.log('Testing Supabase connection...');

        // Test partnership_requests table
        const { data, error } = await sbClient
            .from('partnership_requests')
            .select('request_id, subject')
            .limit(2);

        if (error) {
            console.error('Error accessing partnership_requests:', error);

            // Check what tables exist
            console.log('Checking available tables...');
            await checkAvailableTables();
        } else {
            console.log('✓ partnership_requests table accessible');
            console.log('Sample data:', data);
        }

    } catch (error) {
        console.error('Connection test failed:', error);
    }
}

// Check available tables
async function checkAvailableTables() {
    try {
        // Try to get some data from other tables to see what exists
        const tablesToCheck = [
            'users',
            'faculty_profiles',
            'faculty_extension_proposals',
            'partner_opportunities',
            'partners_proposals'
        ];

        for (const table of tablesToCheck) {
            try {
                const { data, error } = await sbClient
                    .from(table)
                    .select('count')
                    .limit(1);

                if (!error) {
                    console.log(`✓ Table exists: ${table}`);
                } else {
                    console.log(`✗ Table not found: ${table}`);
                }
            } catch (err) {
                console.log(`✗ Error checking table ${table}:`, err.message);
            }
        }
    } catch (error) {
        console.error('Error checking tables:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded');
        alert('Supabase library not loaded. Please check your internet connection.');
        return;
    }

    if (initializeServices()) {
        // Start fetching data
        fetchUserProfileAndData();

        // Start notification polling
        fetchNotifications();
        setInterval(fetchNotifications, 30000);

        // Setup partnership filters
        setTimeout(() => {
            setupPartnershipFilters();
        }, 1000);
    }
});

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
        // First, check if we have a logged-in user from localStorage
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            currentUser = user.full_name;
            currentUserEmail = user.email;

            console.log('Using logged-in user:', currentUser, currentUserEmail);

            // Update UI with stored user data
            updateUIWithUserData(user);
            return;
        }

        // Try to get faculty profile
        const { data, error } = await sbClient.from('faculty_profiles').select('*').limit(1).single();

        if (error) {
            console.log('No faculty profile found, checking users table...');

            // Try to get from users table instead
            const { data: userData, error: userError } = await sbClient
                .from('users')
                .select('*')
                .eq('role', 'faculty')
                .limit(1)
                .single();

            if (userError) {
                console.error('Could not find any user data:', userError);
                // Create a default user
                createDefaultUser();
                return;
            }

            // Use user data
            currentUser = userData.full_name;
            currentUserEmail = userData.email;
            updateUIWithUserData(userData);
        } else {
            // Use faculty profile data
            currentProfileDbId = data.id;
            currentUser = data.full_name;
            currentUserEmail = data.email;
            updateUIWithUserData(data);
        }
    } catch (error) {
        console.error("Profile Load Error:", error);
        createDefaultUser();
    }
}

// Update UI with user data
function updateUIWithUserData(user) {
    const timestamp = '?t=' + new Date().getTime();
    const avatarSrc = user.avatar_url ? user.avatar_url + timestamp :
        `https://ui-avatars.com/api/?name=${encodeURIComponent(user.full_name)}&background=5A2C9D&color=fff`;

    // Update sidebar profile
    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userAvatarEl = document.getElementById('user-avatar');

    if (userNameEl) userNameEl.textContent = user.full_name;
    if (userRoleEl) userRoleEl.textContent = user.role || 'Faculty';
    if (userAvatarEl) userAvatarEl.src = avatarSrc;

    // Update account card
    const accountNameEl = document.getElementById('account-name');
    const accountEmailEl = document.getElementById('account-email');
    const accountAvatarEl = document.getElementById('account-avatar');

    if (accountNameEl) accountNameEl.textContent = user.full_name;
    if (accountEmailEl) accountEmailEl.textContent = user.email;
    if (accountAvatarEl) accountAvatarEl.src = avatarSrc;

    // Update profile modal
    const inputNameEl = document.getElementById('input-name');
    const inputEmailEl = document.getElementById('input-email');
    const modalProfileImgEl = document.getElementById('modal-profile-img');
    const profileModalNameEl = document.getElementById('profile-modal-name');

    if (inputNameEl) inputNameEl.value = user.full_name;
    if (inputEmailEl) inputEmailEl.value = user.email;
    if (modalProfileImgEl) modalProfileImgEl.src = avatarSrc;
    if (profileModalNameEl) profileModalNameEl.textContent = user.full_name;
}

// Create default user for testing
function createDefaultUser() {
    console.log('Creating default user for testing...');
    currentUser = 'Faculty User';
    currentUserEmail = 'faculty@cnsc.edu.ph';

    const defaultUser = {
        full_name: currentUser,
        email: currentUserEmail,
        role: 'Faculty'
    };

    updateUIWithUserData(defaultUser);
}

// Fetch dashboard data (statistics and recent activity)
async function fetchDashboardData() {
    if (!sbClient || !currentUser) {
        console.error('Supabase client or user not available');
        return;
    }

    try {
        // Fetch counts for stat cards
        const counts = await Promise.all([
            sbClient.from('partner_opportunities').select('*', { count: 'exact', head: true }).eq('status', 'New'),
            sbClient.from('partnership_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            sbClient.from('faculty_extension_proposals').select('*', { count: 'exact', head: true }).neq('status', 'Archived'),
            sbClient.from('partner_opportunities').select('*', { count: 'exact', head: true }).eq('claimed_by', currentUser).neq('status', 'Completed'),
            sbClient.from('partner_opportunities').select('*', { count: 'exact', head: true }).eq('status', 'Completed')
        ]);

        // Update the main dashboard stat cards
        const statIds = ['stat-opps', 'stat-partnership', 'stat-props', 'stat-hand', 'stat-comp'];
        const badgeIds = ['opp-badge', 'partnership-badge', 'prop-badge', 'hand-badge', 'comp-badge'];

        counts.forEach((result, index) => {
            const count = result.count || 0;
            const statEl = document.getElementById(statIds[index]);
            const badgeEl = document.getElementById(badgeIds[index]);

            if (statEl) statEl.textContent = count;
            if (badgeEl) badgeEl.textContent = count;
        });

        // Fetch recent activities
        await fetchRecentActivities();
    } catch (error) {
        console.error("Dashboard Data Error:", error);
        const activityList = document.getElementById('recent-activity-list');
        if (activityList) {
            activityList.innerHTML = `<div class="p-4 text-center text-red-500">Error loading data. Please refresh.</div>`;
        }
    }
}

// Fetch recent activities
async function fetchRecentActivities() {
    try {
        // Try faculty proposals first
        const { data: activity, error } = await sbClient.from('faculty_extension_proposals')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

        const activityList = document.getElementById('recent-activity-list');

        if (error || !activity?.length) {
            // If no faculty proposals, try partner opportunities
            const { data: partnerActivity, error: partnerError } = await sbClient.from('partner_opportunities')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(5);

            if (partnerError || !partnerActivity?.length) {
                activityList.innerHTML = `<div class="p-4 text-center text-gray-500">No recent activity.</div>`;
                return;
            }

            // Use partner activities
            renderActivities(partnerActivity, activityList);
            return;
        }

        // Use faculty activities
        renderActivities(activity, activityList);
    } catch (error) {
        console.error("Recent Activities Error:", error);
    }
}

// Render activities to UI
function renderActivities(activities, container) {
    container.innerHTML = activities.map(item => {
        let statusClass = 'status-pending';
        if (item.status === 'Approved' || item.status === 'approved') statusClass = 'status-approved';
        if (item.status === 'Revision Requested') statusClass = 'status-revision';
        if (item.status === 'Completed' || item.status === 'completed') statusClass = 'status-completed';

        return `
            <div class="p-4 hover:bg-gray-50 transition cursor-pointer" onclick="openProjectModal('${encodeURIComponent(JSON.stringify(item))}')">
                <div class="flex items-start gap-4">
                    <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span>📄</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between gap-2">
                            <p class="text-sm font-semibold text-gray-900 truncate">${item.title || item.subject || 'Untitled'}</p>
                            <span class="status-badge ${statusClass} flex-shrink-0">${item.status}</span>
                        </div>
                        <p class="text-sm text-gray-500 mt-1 line-clamp-1">${item.description || 'No description available.'}</p>
                        <p class="text-xs text-gray-400 mt-2">${new Date(item.created_at).toLocaleString()}</p>
                    </div>
                </div>
            </div>`;
    }).join('');
}

// --- PARTNERSHIP REQUESTS FUNCTIONS ---

// Fetch partnership requests
async function fetchPartnershipRequests(page = 1, filterStatus = 'all', searchQuery = '') {
    const tbody = document.getElementById('partnership-requests-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-gray-400 animate-pulse">Loading partnership requests...</td></tr>`;

    try {
        console.log('Fetching partnership requests with:', { page, filterStatus, searchQuery });

        // Build query
        let query = sbClient
            .from('partnership_requests')
            .select('*', { count: 'exact' });

        // Apply status filter
        if (filterStatus !== 'all') {
            query = query.eq('status', filterStatus);
        }

        // Apply search filter
        if (searchQuery) {
            query = query.or(`subject.ilike.%${searchQuery}%,org_name.ilike.%${searchQuery}%,contact_person.ilike.%${searchQuery}%`);
        }

        // Apply ordering
        query = query.order('submitted_at', { ascending: false });

        // Apply pagination
        const from = (page - 1) * itemsPerPage;
        const to = from + itemsPerPage - 1;
        const { data, error, count } = await query.range(from, to);

        if (error) {
            console.error('Supabase query error:', error);
            throw error;
        }

        // Process the data
        processPartnershipRequests(data, count || 0, page);

    } catch (error) {
        console.error("Partnership Requests Error:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-8 text-center">
                    <div class="bg-red-50 p-6 rounded-lg">
                        <p class="text-red-600 font-bold mb-2">Error loading partnership requests</p>
                        <p class="text-red-500 text-sm mb-3">${error.message}</p>
                        <div class="text-xs text-gray-600 mt-4">
                            <p>Debug Info:</p>
                            <ul class="list-disc list-inside mt-2 text-left max-w-md mx-auto">
                                <li>Table: partnership_requests</li>
                                <li>Database: ${SUPABASE_URL}</li>
                                <li>Error Code: ${error.code || 'N/A'}</li>
                                <li>Error Details: ${error.details || 'N/A'}</li>
                            </ul>
                        </div>
                        <button onclick="fetchPartnershipRequests()" class="mt-4 px-4 py-2 bg-cnsc-500 text-white rounded hover:bg-cnsc-600">
                            Retry
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }
}

// Update request status
async function updateRequestStatus(requestId, newStatus) {
    if (!confirm(`Are you sure you want to mark this request as ${newStatus}?`)) return;

    try {
        const { error } = await sbClient.from('partnership_requests')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('request_id', requestId);

        if (error) throw error;

        // Refresh the view
        const filterStatus = document.getElementById('status-filter').value;
        const searchQuery = document.getElementById('partnership-search').value;
        fetchPartnershipRequests(currentPage, filterStatus, searchQuery);

        // Update dashboard stats
        fetchDashboardData();

        alert(`Request status updated to ${newStatus}`);
    } catch (error) {
        console.error("Update Status Error:", error);
        alert("Error updating status. Please try again.");
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

// Fetch partner proposals/opportunities
async function fetchPartnerOpps() {
    const tbody = document.getElementById('partner-opps-body');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-gray-400 animate-pulse">Loading partner proposals...</td></tr>`;

    try {
        // Try partners_proposals table
        const { data, error } = await sbClient.from('partners_proposals')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.log('partners_proposals not found, trying partnership_requests...');
            // Fallback to partnership_requests
            const { data: requestsData, error: requestsError } = await sbClient.from('partnership_requests')
                .select('*')
                .order('submitted_at', { ascending: false });

            if (requestsError) throw requestsError;

            // Transform partnership requests to partner proposals format
            const transformedData = requestsData.map(req => ({
                id: req.request_id,
                subject: req.subject,
                organization_name: req.org_name,
                created_at: req.submitted_at,
                status: req.status
            }));

            renderPartnerOpps(transformedData, tbody);
            return;
        }

        renderPartnerOpps(data, tbody);
    } catch (error) {
        console.error("Partner Proposals Error:", error);
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-8 text-center text-red-500"><strong>Error:</strong> ${error.message}</td></tr>`;
    }
}

// Render partner opportunities
function renderPartnerOpps(data, tbody) {
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

        if (error) {
            console.log('No faculty proposals, showing empty state');
            tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500">
                ${showArchived ? "Archive is empty." : "No active proposals found."}
            </td></tr>`;
            return;
        }

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
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l4-4m-4 4l4 4" />
                        </svg>
                        Restore
                    </button>
                    <button onclick="openDeleteModal('${proposal.id}')" class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600 transition" title="Delete Permanently">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                    </button>`;
            } else {
                actionsHtml = `
                    <button onclick="openProjectModal('${safeData}')" class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition" title="View Details">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                    </button>
                    <a href="SubmitProposal.html?id=${proposal.id}" class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-purple-50 hover:text-cnsc-500 transition" title="Edit Proposal">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
                        </svg>
                    </a>
                    <button onclick="openDeleteModal('${proposal.id}')" class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:bg-red-100 hover:text-red-600 transition" title="Archive or Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
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

// --- NOTIFICATIONS ---

// Fetch notifications
async function fetchNotifications() {
    if (!sbClient || !currentUser) return;

    try {
        // Try faculty_notifications first
        const { data, error } = await sbClient.from('faculty_notifications')
            .select('*')
            .eq('recipient', currentUser)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) {
            console.log('No faculty notifications, checking regular notifications...');
            const { data: generalData, error: generalError } = await sbClient.from('notifications')
                .select('*')
                .eq('recipient', currentUser)
                .order('created_at', { ascending: false })
                .limit(10);

            if (generalError || !generalData?.length) {
                renderNotificationsUI([]);
                return;
            }

            renderNotificationsUI(generalData);
            return;
        }

        renderNotificationsUI(data || []);
    } catch (error) {
        console.error("Fetch Notifications Error:", error);
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

// Helper function: Debounce
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