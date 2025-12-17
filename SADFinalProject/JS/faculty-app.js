// faculty-app.js - UI and App Logic Only

// App scaffold for UI interaction
const App = {
    // Debounce function for search
    debounce(fn, delay) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => fn.apply(this, args), delay);
        };
    },

    // Toggle sidebar for mobile/desktop
    toggleSidebar() {
        const body = document.body;
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');

        if (window.innerWidth < 1024) { // Mobile/Tablet
            body.classList.toggle('sidebar-open');
            sidebarOverlay.classList.toggle('hidden');
        } else { // Desktop
            body.classList.toggle('sidebar-collapsed');
            document.getElementById('main-content').classList.toggle('lg:ml-64');
            sidebar.classList.toggle('w-64');
            sidebar.classList.toggle('w-0');
        }
    },

    // Toggle mobile search bar
    toggleMobileSearch() {
        const el = document.getElementById('mobile-search-bar');
        if (el) el.classList.toggle('hidden');
    },

    // Refresh dashboard data
    refresh() {
        const icon = document.getElementById('refresh-icon');
        if (icon) {
            icon.classList.add('animate-spin');
            fetchDashboardData();
            setTimeout(() => icon.classList.remove('animate-spin'), 800);
        }
    },

    // Toggle dropdown menus
    toggleDropdown(id) {
        // Close all other dropdowns first
        document.querySelectorAll('.dropdown').forEach(d => {
            if (d.id !== id) d.classList.remove('open');
        });
        const dd = document.getElementById(id);
        if (dd) dd.classList.toggle('open');
    },

    // Switch between dashboard views
    showView(view) {
        // Update sidebar active state
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-view') === view) {
                btn.classList.add('active');
            }
        });

        // Hide all views
        document.querySelectorAll('#content-area > .view-container, #content-area > div[id^="view-"]').forEach(v => {
            v.classList.add('hidden');
        });

        // Show selected view
        const el = document.getElementById(`view-${view}`);
        if (el) {
            el.classList.remove('hidden');

            // Add fade-in animation
            el.classList.add('fade-in');
            setTimeout(() => el.classList.remove('fade-in'), 400);
        }

        // Update page title
        const titleMap = {
            dashboard: 'Dashboard',
            opportunities: 'Partner Proposals',
            'partnership-requests': 'Partnership Requests',
            proposals: 'My Proposals',
            handled: 'Handled Projects',
            completed: 'Completed',
            profile: 'My Profile',
            settings: 'Settings',
            notifications: 'Notifications'
        };
        const pageTitle = document.getElementById('page-title');
        if (pageTitle && titleMap[view]) {
            pageTitle.textContent = titleMap[view];
        }

        // Load data for the activated view
        switch(view) {
            case 'dashboard':
                fetchDashboardData();
                break;
            case 'opportunities':
                fetchPartnerOpps();
                break;
            case 'partnership-requests':
                fetchPartnershipRequests();
                break;
            case 'proposals':
                fetchMyProposals();
                break;
            case 'handled':
                fetchHandledProjects();
                break;
            case 'completed':
                fetchCompletedProjects();
                break;
        }
    },

    // Open create proposal modal
    openCreateModal() {
        window.location.href = 'SubmitProposal.html';
    },

    // Toggle dark mode
    toggleDarkMode() {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('darkMode', isDark);

        // Update theme icon in account card
        const themeIcon = document.getElementById('theme-icon-card');
        if (themeIcon) {
            if (isDark) {
                themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />`;
            } else {
                themeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />`;
            }
        }
    },

    // Handle global search
    handleSearch(query) {
        console.log('Searching for:', query);
        // Implement search functionality based on current view
        const currentView = document.querySelector('[data-view].active')?.getAttribute('data-view');

        switch(currentView) {
            case 'opportunities':
                filterPartnerOpps(query);
                break;
            case 'partnership-requests':
                filterPartnershipRequests(query);
                break;
            case 'proposals':
                filterMyProposals(query);
                break;
            // Add more cases for other views
        }
    },

    // Logout function
    logout() {
        if (confirm('Are you sure you want to sign out?')) {
            // Clear local storage
            localStorage.removeItem('darkMode');
            localStorage.removeItem('userData');

            // Redirect to login page
            window.location.href = '../HTML/LogIn.html';
        }
    }
};

// Initialize event listeners when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Sidebar toggle
    document.getElementById('menu-toggle')?.addEventListener('click', () => App.toggleSidebar());
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => App.toggleSidebar());

    // Mobile search toggle
    document.getElementById('mobile-search-btn')?.addEventListener('click', () => App.toggleMobileSearch());

    // Refresh button
    document.getElementById('refresh-btn')?.addEventListener('click', () => App.refresh());

    // Notification dropdown
    document.getElementById('notif-btn')?.addEventListener('click', () => App.toggleDropdown('notif-dropdown'));

    // Global search with debounce
    const globalSearch = document.getElementById('global-search');
    const mobileSearch = document.getElementById('mobile-search-input');

    if (globalSearch) {
        globalSearch.addEventListener('input', App.debounce(() => {
            App.handleSearch(globalSearch.value);
        }, 300));
    }

    if (mobileSearch) {
        mobileSearch.addEventListener('input', App.debounce(() => {
            App.handleSearch(mobileSearch.value);
        }, 300));
    }

    // View switching
    document.querySelectorAll('[data-view]').forEach(btn => {
        btn.addEventListener('click', function() {
            const view = this.getAttribute('data-view');
            App.showView(view);
        });
    });

    // Stat card clicks
    document.getElementById('stat-opps-card')?.addEventListener('click', () => App.showView('opportunities'));
    document.getElementById('stat-partnership-card')?.addEventListener('click', () => App.showView('partnership-requests'));
    document.getElementById('stat-props-card')?.addEventListener('click', () => App.showView('proposals'));
    document.getElementById('stat-hand-card')?.addEventListener('click', () => App.showView('handled'));
    document.getElementById('stat-comp-card')?.addEventListener('click', () => App.showView('completed'));

    // Create proposal buttons
    document.getElementById('create-proposal-btn')?.addEventListener('click', () => App.openCreateModal());
    document.getElementById('quick-create-btn')?.addEventListener('click', () => App.openCreateModal());
    document.getElementById('view-all-proposals-btn')?.addEventListener('click', () => App.showView('proposals'));

    // Account card
    document.getElementById('account-card-btn')?.addEventListener('click', openAccountCard);
    document.getElementById('close-account-card')?.addEventListener('click', closeAccountCard);
    document.getElementById('account-card-overlay')?.addEventListener('click', closeAccountCard);

    // Account card actions
    document.getElementById('open-profile-modal-btn')?.addEventListener('click', () => {
        closeAccountCard();
        openProfileModal();
    });

    document.getElementById('open-settings-btn')?.addEventListener('click', () => {
        closeAccountCard();
        openProfileModal('settings');
    });

    document.getElementById('toggle-dark-mode-btn')?.addEventListener('click', () => App.toggleDarkMode());
    document.getElementById('logout-btn')?.addEventListener('click', () => App.logout());

    // Notification actions
    document.getElementById('mark-all-read-btn')?.addEventListener('click', markAllAsRead);
    document.getElementById('view-all-notif-btn')?.addEventListener('click', () => App.showView('notifications'));

    // Partnership requests search and filter
    const partnershipSearch = document.getElementById('partnership-search');
    const statusFilter = document.getElementById('status-filter');

    if (partnershipSearch) {
        partnershipSearch.addEventListener('input', App.debounce(() => {
            filterPartnershipRequests(partnershipSearch.value);
        }, 300));
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            fetchPartnershipRequests();
        });
    }

    // Pagination buttons for partnership requests
    document.getElementById('prev-page-btn')?.addEventListener('click', () => {
        if (currentPage > 1) {
            fetchPartnershipRequests(currentPage - 1);
        }
    });

    document.getElementById('next-page-btn')?.addEventListener('click', () => {
        const totalPages = Math.ceil(totalRequests / itemsPerPage);
        if (currentPage < totalPages) {
            fetchPartnershipRequests(currentPage + 1);
        }
    });

    // Apply dark mode on load
    if (localStorage.getItem('darkMode') === 'true') {
        App.toggleDarkMode();
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.dropdown')) {
            document.querySelectorAll('.dropdown').forEach(d => d.classList.remove('open'));
        }
    });

    // Initialize app
    initializeApp();
});

// Initialize the application
function initializeApp() {
    console.log('Faculty Dashboard Initializing...');

    // Check if Supabase is loaded
    if (typeof supabase === 'undefined') {
        console.error('Supabase not loaded');
        return;
    }

    // Initialize user profile and data
    fetchUserProfileAndData();
}

// --- MODAL MANAGEMENT ---

// Open account card
function openAccountCard() {
    const overlay = document.getElementById('account-card-overlay');
    const card = document.getElementById('account-card');

    if (overlay && card) {
        overlay.classList.remove('hidden');
        card.classList.remove('hidden');
    }
}

// Close account card
function closeAccountCard() {
    const overlay = document.getElementById('account-card-overlay');
    const card = document.getElementById('account-card');

    if (overlay) overlay.classList.add('hidden');
    if (card) card.classList.add('hidden');
}

// Open project modal
function openProjectModal(encodedItem) {
    try {
        const data = JSON.parse(decodeURIComponent(encodedItem));
        currentProjectId = data.id;

        // Helper functions
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || "N/A";
        };

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || "";
        };

        // Populate read-only view
        setText('pm-title', data.title);
        setText('pm-desc', data.description || data.rationale);
        setText('pm-partner', data.partner_organization);
        setText('pm-lead', data.claimed_by || "Team");
        setText('pm-lead-3', data.claimed_by || "Team");

        // Format dates
        const rawDate = data.date_started || data.created_at;
        let dateStr = "N/A", dateInputVal = "";
        if (rawDate) {
            const d = new Date(rawDate);
            if (!isNaN(d.getTime())) {
                dateStr = d.toLocaleDateString();
                dateInputVal = d.toISOString().split('T')[0];
            }
        }
        setText('pm-date', dateStr);

        // Update status badge
        const statusEl = document.getElementById('pm-status');
        if (statusEl) {
            statusEl.textContent = data.status;
            statusEl.className = 'text-xs font-bold px-2 py-1 rounded uppercase text-white ';
            if (data.status === 'Completed') statusEl.classList.add('bg-green-500');
            else if (data.status === 'In Progress') statusEl.classList.add('bg-blue-500');
            else statusEl.classList.add('bg-gray-500');
        }

        // Populate edit form
        setVal('edit-title', data.title);
        setVal('edit-partner', data.partner_organization);
        setVal('edit-status', data.status);
        setVal('edit-desc', data.description || data.rationale);
        setVal('edit-date', dateInputVal);
        setVal('edit-date-completed', data.date_completed ? new Date(data.date_completed).toISOString().split('T')[0] : "");

        // Toggle completion date visibility
        toggleCompletionDate();

        // Access control
        const isOwner = data.claimed_by === currentUser;
        document.getElementById('btn-update-project').classList.toggle('hidden', !isOwner);
        document.getElementById('btn-manage-tab').classList.toggle('hidden', !isOwner);

        // Render attachments
        renderAttachments(data.attachment_urls, isOwner);

        // Switch to overview tab
        switchTab('overview');

        // Show modal
        document.getElementById('project-modal').classList.remove('hidden');

    } catch (error) {
        console.error("Error opening modal:", error);
        alert("Details could not be loaded.");
    }
}

// Close project modal
function closeProjectModal() {
    document.getElementById('project-modal').classList.add('hidden');
}

// Switch tabs in project modal
function switchTab(tabName) {
    // Hide all tab panes
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.add('hidden'));

    // Remove active class from all tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.classList.remove('border-cnsc-500', 'text-cnsc-500', 'font-bold');
        btn.classList.add('border-transparent', 'text-gray-500', 'font-medium');
    });

    // Show selected tab pane
    const tabPane = document.getElementById(`tab-${tabName}`);
    if (tabPane) {
        tabPane.classList.remove('hidden');
    }

    // Activate corresponding tab button
    const tabBtn = document.getElementById(`${tabName}-tab`);
    if (tabBtn) {
        tabBtn.classList.remove('border-transparent', 'text-gray-500', 'font-medium');
        tabBtn.classList.add('active', 'border-cnsc-500', 'text-cnsc-500', 'font-bold');
    }
}

// Switch to manage tab
function switchToManageTab() {
    switchTab('manage');
}

// Toggle completion date field
function toggleCompletionDate() {
    const wrapper = document.getElementById('completion-date-wrapper');
    const dateInput = document.getElementById('edit-date-completed');
    const statusSelect = document.getElementById('edit-status');

    if (statusSelect && statusSelect.value === 'Completed') {
        wrapper.classList.remove('hidden');
        if (!dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    } else {
        wrapper.classList.add('hidden');
        dateInput.value = '';
    }
}

// Save all changes to project
async function saveAllChanges() {
    const newTitle = document.getElementById('edit-title').value;
    const newPartner = document.getElementById('edit-partner').value;
    const newStatus = document.getElementById('edit-status').value;
    const newDesc = document.getElementById('edit-desc').value;
    const newDate = document.getElementById('edit-date').value;
    const completionDate = document.getElementById('edit-date-completed').value;

    if (newStatus === 'Completed' && !completionDate) {
        alert("Please enter the Date Finished.");
        return;
    }

    if (!currentProjectId) return;

    const btn = event.target;
    const originalText = btn.innerText;
    btn.innerText = "Saving...";
    btn.disabled = true;

    try {
        const { error } = await sbClient.from('partner_opportunities').update({
            title: newTitle,
            partner_organization: newPartner,
            status: newStatus,
            description: newDesc,
            date_started: newDate,
            date_completed: completionDate
        }).eq('id', currentProjectId);

        if (error) throw error;

        if (newStatus === 'Completed') {
            await sendSystemNotification(currentUser, `Project "${newTitle}" marked as Completed!`, 'success');
            alert("Project marked as completed! Notification sent.");
        } else {
            alert("Project updated successfully!");
        }

        closeProjectModal();
        fetchHandledProjects();
        fetchCompletedProjects();

    } catch (error) {
        console.error("Save Changes Error:", error);
        alert("Error: " + error.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

// --- FILE & ATTACHMENT MANAGEMENT ---

// Handle file upload
async function handleFileUpload(input) {
    if (!input.files.length || !currentProjectId) return;

    const status = document.getElementById('upload-status');
    status.innerHTML = '<span class="text-blue-500 animate-pulse">Uploading...</span>';

    try {
        const newUrls = [];
        for (const file of input.files) {
            const name = `${currentProjectId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
            await sbClient.storage.from('project-files').upload(name, file);
            const { data } = sbClient.storage.from('project-files').getPublicUrl(name);
            newUrls.push(data.publicUrl);
        }

        const { data: projectData } = await sbClient.from('partner_opportunities')
            .select('attachment_urls')
            .eq('id', currentProjectId)
            .single();

        const combined = [...(projectData.attachment_urls || []), ...newUrls];

        await sbClient.from('partner_opportunities')
            .update({ attachment_urls: combined })
            .eq('id', currentProjectId);

        status.innerHTML = '<span class="text-green-600 font-bold">Done!</span>';
        renderAttachments(combined, true);

        setTimeout(() => {
            switchTab('docs');
            status.innerHTML = '';
        }, 800);

    } catch (error) {
        console.error("File Upload Error:", error);
        status.innerHTML = `<span class="text-red-500">Error: ${error.message}</span>`;
    }
}

// Delete attachment
async function deleteAttachment(encodedUrl) {
    if (!confirm("Delete this file permanently?")) return;

    const urlToDelete = decodeURIComponent(encodedUrl);

    try {
        const { data } = await sbClient.from('partner_opportunities')
            .select('attachment_urls')
            .eq('id', currentProjectId)
            .single();

        if (!data) return;

        const updatedUrls = data.attachment_urls.filter(u => u !== urlToDelete);
        const { error } = await sbClient.from('partner_opportunities')
            .update({ attachment_urls: updatedUrls })
            .eq('id', currentProjectId);

        if (error) throw error;

        // Also delete from storage
        const filePath = urlToDelete.split('/project-files/')[1];
        if (filePath) {
            await sbClient.storage.from('project-files').remove([filePath]);
        }

        renderAttachments(updatedUrls, true);
    } catch (error) {
        console.error("Delete Attachment Error:", error);
        alert("Delete failed. Please try again.");
    }
}

// Render attachments
function renderAttachments(urls, isOwner = false) {
    const container = document.getElementById('pm-attachments');
    if (!container) return;

    container.innerHTML = '';

    if (urls && urls.length > 0) {
        urls.forEach((url, i) => {
            const isImg = url.match(/\.(jpeg|jpg|gif|png|webp|avif)$/i) != null;
            const deleteBtn = isOwner ?
                `<button onclick="deleteAttachment('${encodeURIComponent(url)}')" class="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full shadow-md hover:bg-red-700 transition opacity-0 group-hover:opacity-100 z-20" title="Delete">🗑️</button>` : '';

            const content = isImg ?
                `<img src="${url}" class="w-full h-32 object-cover transition group-hover:scale-110"><div class="p-2 bg-white text-xs font-bold text-gray-700">Image ${i + 1}</div>` :
                `<div class="flex items-center justify-center h-32 text-gray-400">📄</div><div class="p-2 bg-white text-xs font-bold text-center text-gray-700">Document ${i + 1}</div>`;

            container.innerHTML += `
                <div class="relative group block overflow-hidden rounded-lg border border-gray-200 hover:shadow-md transition bg-gray-100">
                    ${deleteBtn}
                    <a href="${url}" target="_blank" class="block h-full">${content}</a>
                </div>`;
        });
    } else {
        container.innerHTML = '<p class="col-span-full text-gray-400 italic text-sm text-center py-4">No files uploaded yet.</p>';
    }
}

// --- DELETE MODAL FUNCTIONS ---

// Open delete modal
function openDeleteModal(id) {
    selectedProposalId = id;
    const modal = document.getElementById('delete-modal');
    const content = document.getElementById('delete-modal-content');

    if (!modal || !content) return;

    modal.classList.remove('hidden');
    setTimeout(() => {
        content.classList.remove('scale-95', 'opacity-0');
        content.classList.add('scale-100', 'opacity-100');
    }, 10);
}

// Close delete modal
function closeDeleteModal() {
    const modal = document.getElementById('delete-modal');
    const content = document.getElementById('delete-modal-content');

    if (!modal || !content) return;

    content.classList.remove('scale-100', 'opacity-100');
    content.classList.add('scale-95', 'opacity-0');

    setTimeout(() => {
        modal.classList.add('hidden');
        selectedProposalId = null;
    }, 300);
}

// Confirm archive
async function confirmArchive() {
    if (!selectedProposalId) return;

    try {
        await sbClient.from('faculty_extension_proposals')
            .update({ status: 'Archived' })
            .eq('id', selectedProposalId);

        closeDeleteModal();
        fetchMyProposals();
    } catch (error) {
        console.error("Archive Error:", error);
        alert("Error archiving proposal. Please try again.");
    }
}

// Confirm hard delete
async function confirmHardDelete() {
    if (!selectedProposalId || !confirm("Are you sure? This action cannot be undone.")) return;

    try {
        await sbClient.from('faculty_extension_proposals')
            .delete()
            .eq('id', selectedProposalId);

        closeDeleteModal();
        fetchMyProposals();
    } catch (error) {
        console.error("Delete Error:", error);
        alert("Error deleting proposal. Please try again.");
    }
}

// Restore proposal
async function restoreProposal(id) {
    if (!confirm("Restore this proposal?")) return;

    try {
        await sbClient.from('faculty_extension_proposals')
            .update({ status: 'Pending' })
            .eq('id', id);

        fetchMyProposals();
    } catch (error) {
        console.error("Restore Error:", error);
        alert("Error restoring proposal. Please try again.");
    }
}

// --- PROFILE MODAL FUNCTIONS ---

// Open profile modal
function openProfileModal(section = 'general') {
    const modal = document.getElementById('profile-modal');
    if (!modal) return;

    modal.classList.remove('hidden');

    if (section === 'settings') {
        switchProfileTab('security');
    } else {
        switchProfileTab('general');
    }
}

// Close profile modal
function closeProfileModal() {
    const modal = document.getElementById('profile-modal');
    if (modal) modal.classList.add('hidden');
}

// Switch profile tabs
function switchProfileTab(which) {
    // Hide all tab panes
    document.querySelectorAll('[id^="ptab-"]').forEach(p => p.classList.add('hidden'));

    // Remove active class from all tabs
    document.querySelectorAll('.profile-tab').forEach(t => {
        t.classList.remove('active-tab', 'border-cnsc-500', 'text-cnsc-500', 'font-bold');
    });

    // Show selected tab pane
    const tabPane = document.getElementById(`ptab-${which}`);
    if (tabPane) {
        tabPane.classList.remove('hidden');
    }

    // Activate corresponding tab button
    const tabBtn = document.getElementById(`${which}-tab`);
    if (tabBtn) {
        tabBtn.classList.add('active-tab', 'border-cnsc-500', 'text-cnsc-500', 'font-bold');
    }
}

// Save profile changes
async function saveProfileChanges() {
    const newName = document.getElementById('input-name').value;
    const newEmail = document.getElementById('input-email').value;
    const newBio = document.getElementById('input-bio').value;
    const fileInput = document.getElementById('profile-upload');

    const saveBtn = event?.target || document.getElementById('save-profile-btn');
    const originalBtnText = saveBtn.innerHTML;
    saveBtn.innerHTML = "Saving...";
    saveBtn.disabled = true;

    try {
        let newAvatarUrl = null;
        if (fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const fileName = `${currentProfileDbId}-${Date.now()}.${file.name.split('.').pop()}`;
            const { error: uploadError } = await sbClient.storage.from('avatars')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = sbClient.storage.from('avatars').getPublicUrl(fileName);
            newAvatarUrl = urlData.publicUrl;
        }

        const updateData = {
            full_name: newName,
            email: newEmail,
            bio: newBio
        };

        if (newAvatarUrl) updateData.avatar_url = newAvatarUrl;

        const { error: dbError } = await sbClient.from('faculty_profiles')
            .update(updateData)
            .eq('id', currentProfileDbId);

        if (dbError) throw dbError;

        // Update user references if name changed
        if (newName !== currentUser) {
            await sbClient.from('partner_opportunities')
                .update({ claimed_by: newName })
                .eq('claimed_by', currentUser);
        }

        alert("Profile updated successfully!");
        await fetchUserProfileAndData();
        closeProfileModal();

    } catch (error) {
        console.error("Profile Update Error:", error);
        alert("Error updating profile: " + error.message);
    } finally {
        saveBtn.innerHTML = originalBtnText;
        saveBtn.disabled = false;
    }
}

// Preview profile image
function previewProfileImage(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('modal-profile-img').src = e.target.result;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

// --- EVENT LISTENER INITIALIZATION FOR MODALS ---

document.addEventListener('DOMContentLoaded', function() {
    // Project modal event listeners
    document.getElementById('close-project-modal')?.addEventListener('click', closeProjectModal);
    document.getElementById('project-modal-backdrop')?.addEventListener('click', closeProjectModal);
    document.getElementById('close-project-btn')?.addEventListener('click', closeProjectModal);

    // Project modal tabs
    document.getElementById('overview-tab')?.addEventListener('click', () => switchTab('overview'));
    document.getElementById('team-tab')?.addEventListener('click', () => switchTab('team'));
    document.getElementById('docs-tab')?.addEventListener('click', () => switchTab('docs'));
    document.getElementById('btn-manage-tab')?.addEventListener('click', () => switchTab('manage'));
    document.getElementById('btn-update-project')?.addEventListener('click', switchToManageTab);

    // Project modal form
    document.getElementById('edit-status')?.addEventListener('change', toggleCompletionDate);
    document.getElementById('save-changes-btn')?.addEventListener('click', saveAllChanges);

    // File upload
    document.getElementById('dropzone-file')?.addEventListener('change', function() {
        handleFileUpload(this);
    });

    // Delete modal
    document.getElementById('confirm-archive-btn')?.addEventListener('click', confirmArchive);
    document.getElementById('confirm-hard-delete-btn')?.addEventListener('click', confirmHardDelete);
    document.getElementById('cancel-delete-btn')?.addEventListener('click', closeDeleteModal);

    // Profile modal
    document.getElementById('close-profile-modal')?.addEventListener('click', closeProfileModal);
    document.getElementById('profile-modal-backdrop')?.addEventListener('click', closeProfileModal);
    document.getElementById('cancel-profile-btn')?.addEventListener('click', closeProfileModal);
    document.getElementById('save-profile-btn')?.addEventListener('click', saveProfileChanges);

    // Profile tabs
    document.getElementById('general-tab')?.addEventListener('click', () => switchProfileTab('general'));
    document.getElementById('security-tab')?.addEventListener('click', () => switchProfileTab('security'));

    // Profile image preview
    document.getElementById('profile-upload')?.addEventListener('change', function() {
        previewProfileImage(this);
    });

    // Search input for opportunities view
    document.getElementById('search-input')?.addEventListener('input', debounceSearch);

    // Toggle archives button
    const toggleArchivesBtn = document.getElementById('toggle-archives-btn');
    if (toggleArchivesBtn) {
        toggleArchivesBtn.addEventListener('click', toggleArchives);
    }
});

// Utility function for filtering partnership requests
function filterPartnershipRequests(query) {
    const rows = document.querySelectorAll('#partnership-requests-body tr');
    const statusFilter = document.getElementById('status-filter');
    const selectedStatus = statusFilter ? statusFilter.value : 'all';

    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        const status = row.querySelector('td:nth-child(5) span')?.textContent.toLowerCase() || '';
        const statusMatch = selectedStatus === 'all' || status.includes(selectedStatus);
        const searchMatch = text.includes(query.toLowerCase());

        row.style.display = (statusMatch && searchMatch) ? '' : 'none';
    });
}

// --- GLOBAL HELPER FUNCTIONS ---

// Filter partner opportunities
function filterPartnerOpps(query) {
    const rows = document.querySelectorAll('#partner-opps-body tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

// Filter my proposals
function filterMyProposals(query) {
    const rows = document.querySelectorAll('#my-proposals-body tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query.toLowerCase()) ? '' : 'none';
    });
}

// Search debounce for partner proposals
function debounceSearch() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
        const query = document.getElementById('search-input')?.value || '';
        filterPartnerOpps(query);
    }, 300);
}

// Toggle archives view
function toggleArchives() {
    showArchived = !showArchived;
    const btn = document.getElementById('toggle-archives-btn');
    if (showArchived) {
        btn.textContent = "Show Active";
        btn.classList.replace('bg-gray-200', 'bg-gray-800');
        btn.classList.replace('text-gray-700', 'text-white');
    } else {
        btn.textContent = "Show Archives";
        btn.classList.replace('bg-gray-800', 'bg-gray-200');
        btn.classList.replace('text-white', 'text-gray-700');
    }
    fetchMyProposals();
}

// Send manual email to partner
function sendManualEmail(encodedData) {
    try {
        const proposal = JSON.parse(decodeURIComponent(encodedData));

        // Check if the partner has an email address
        if (!proposal.contact_email) {
            alert("This proposal does not have a contact email address on file.");
            return;
        }

        // Prepare the email fields
        const to = proposal.contact_email;
        const subject = `Update on your CNSC Proposal: ${proposal.subject}`;
        const body = `Dear ${proposal.contact_full_name || 'Partner'},\n\n` +
            `Thank you for your proposal, "${proposal.subject}", submitted on behalf of ${proposal.organization_name}.\n\n` +
            `We are writing to inform you that your proposal status has been updated to: ${proposal.status || 'Reviewed'}.\n\n` +
            `Our team will be in touch if any further action is required from your side.\n\n` +
            `Sincerely,\n` +
            `The CNSC Extension Services Team`;

        // Create the mailto link
        const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // Open the email client
        window.location.href = mailtoLink;
    } catch (error) {
        console.error('Error sending email:', error);
        alert('Failed to prepare email. Please try again.');
    }
}

// Start drafting a proposal from partner opportunity
async function startDrafting(oppId) {
    if (!currentUser) {
        alert("Please wait for user profile to load.");
        return;
    }

    try {
        // Update the opportunity status
        await sbClient.from('partner_opportunities').update({
            status: 'In Progress',
            claimed_by: currentUser
        }).eq('id', oppId);

        // Redirect to proposal creation page
        window.location.href = "SubmitProposal.html";
    } catch (error) {
        console.error("Error starting draft:", error);
        alert("Error starting draft. Please try again.");
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

// Close partnership modal
function closePartnershipModal() {
    const modal = document.getElementById('partnership-modal');
    if (modal) {
        modal.remove();
    }
}

// Update pagination UI
function updatePaginationUI() {
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const countEl = document.getElementById('requests-count');

    if (countEl) {
        const start = (currentPage - 1) * itemsPerPage + 1;
        const end = Math.min(currentPage * itemsPerPage, totalRequests);
        countEl.textContent = `Showing ${start}-${end} of ${totalRequests} requests`;
    }

    if (prevBtn) {
        prevBtn.disabled = currentPage === 1;
    }

    if (nextBtn) {
        const totalPages = Math.ceil(totalRequests / itemsPerPage);
        nextBtn.disabled = currentPage === totalPages;
    }
}

// Process partnership requests with updated status buttons
// Process partnership requests with updated status buttons
function processPartnershipRequests(data, count, page) {
    const tbody = document.getElementById('partnership-requests-body');

    totalRequests = count || 0;
    currentPage = page;

    updatePaginationUI();

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-10 text-center text-gray-500">No partnership requests found.</td></tr>`;
        return;
    }

    console.log(`Processing ${data.length} partnership requests`);

    tbody.innerHTML = data.map(request => {
        const dateStr = new Date(request.submitted_at).toLocaleDateString();
        const safeData = encodeURIComponent(JSON.stringify(request));

        // Status badge styling
        let statusClass = 'bg-yellow-100 text-yellow-800';
        let statusText = request.status;

        switch(request.status) {
            case 'pending':
                statusClass = 'bg-yellow-100 text-yellow-800';
                statusText = 'Pending';
                break;
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
            default:
                statusClass = 'bg-gray-100 text-gray-800';
        }

        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4 font-bold text-gray-800">
                    <div class="flex items-start">
                        <div>
                            <p class="text-sm">${request.subject || 'No subject'}</p>
                            <p class="text-xs text-gray-500 mt-1">${request.org_type || 'N/A'}</p>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4">
                    <p class="font-medium text-gray-700">${request.org_name || 'No organization'}</p>
                    <p class="text-xs text-gray-500 mt-1 truncate max-w-xs">${request.address || 'No address'}</p>
                </td>
                <td class="px-6 py-4">
                    <p class="font-medium text-gray-700">${request.contact_person || 'No contact'}</p>
                    <p class="text-xs text-gray-500">${request.position || ''}</p>
                    <p class="text-xs text-gray-400">${request.email || 'No email'}</p>
                </td>
                <td class="px-6 py-4 text-gray-500">${dateStr}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 text-xs font-bold rounded-full ${statusClass}">${statusText}</span>
                </td>
                <td class="px-6 py-4 text-right">
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
}

// Open partnership request modal
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

// Update partnership request status
async function updatePartnershipRequestStatus(requestId, newStatus) {
    if (!confirm(`Are you sure you want to mark this as ${newStatus}?`)) return;

    try {
        // Convert requestId to number since it's an integer in the database
        const requestIdNum = parseInt(requestId);

        const { error } = await sbClient
            .from('partnership_requests')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
                reviewed_by: currentUser
            })
            .eq('request_id', requestIdNum); // Use the numeric ID

        if (error) {
            console.error("Supabase Error:", error);
            throw error;
        }

        // Show success message
        alert(`Status updated to ${newStatus}!`);

        // Refresh the partnership requests view
        fetchPartnershipRequests();

        // Update dashboard stats
        fetchDashboardData();

    } catch (error) {
        console.error("Error updating status:", error);
        alert("Error updating status: " + error.message);
    }
}

// Update partner proposal status
async function updatePartnerProposalStatus(proposalId, newStatus) {
    if (!confirm(`Are you sure you want to mark this as ${newStatus}?`)) return;

    try {
        const { error } = await sbClient
            .from('partner_opportunities')
            .update({
                status: newStatus,
                updated_at: new Date().toISOString(),
                reviewed_by: currentUser
            })
            .eq('id', proposalId);

        if (error) throw error;

        // Show success message
        alert(`Status updated to ${newStatus}!`);

        // Refresh the opportunities view
        fetchPartnerOpps();

        // Update dashboard stats
        fetchDashboardData();

    } catch (error) {
        console.error("Error updating status:", error);
        alert("Error updating status. Please try again.");
    }
}

// Get status icon based on status (Bootstrap Icons version)
function getStatusIcon(status) {
    switch(status) {
        case 'approved':
            return '<i class="bi bi-check-lg"></i>'; // Checkmark
        case 'rejected':
            return '<i class="bi bi-x-lg"></i>'; // X mark
        case 'reviewed':
            return '<i class="bi bi-pencil-square"></i>'; // Pencil/Edit
        case 'pending':
            return '<i class="bi bi-clock"></i>'; // Clock
        case 'in progress':
            return '<i class="bi bi-arrow-repeat"></i>'; // Refresh/Progress
        case 'completed':
            return '<i class="bi bi-check-circle-fill"></i>'; // Checkmark in circle
        case 'archived':
            return '<i class="bi bi-archive"></i>'; // Archive
        default:
            return '<i class="bi bi-file-text"></i>'; // Document
    }
}

// Get status color class
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

// Get status title text
function getStatusTitle(status) {
    switch(status) {
        case 'approved':
            return 'Approve';
        case 'rejected':
            return 'Reject';
        case 'reviewed':
            return 'Mark as Reviewed';
        case 'pending':
            return 'Mark as Pending';
        case 'in progress':
            return 'Mark as In Progress';
        case 'completed':
            return 'Mark as Completed';
        case 'archived':
            return 'Archive';
        default:
            return 'Update Status';
    }
}

// Process partner opportunities with status buttons
// Process partner opportunities with status buttons
function processPartnerOpportunities(data) {
    const tbody = document.getElementById('partner-opps-body');

    if (!data || data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-gray-400">No partner proposals found.</td></tr>`;
        return;
    }

    tbody.innerHTML = data.map(opportunity => {
        const safeData = encodeURIComponent(JSON.stringify(opportunity));

        return `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-4 font-bold text-gray-800">${opportunity.title}</td>
                <td class="px-6 py-4">${opportunity.partner_organization}</td>
                <td class="px-6 py-4 text-gray-500">${new Date(opportunity.created_at).toLocaleDateString()}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 text-xs font-bold rounded-full ${
                        opportunity.status === 'approved' ? 'bg-green-100 text-green-800' :
                        opportunity.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        opportunity.status === 'reviewed' ? 'bg-blue-100 text-blue-800' :
                        opportunity.status === 'in progress' ? 'bg-purple-100 text-purple-800' :
                        'bg-yellow-100 text-yellow-800'
                    }">
                        ${opportunity.status}
                    </span>
                </td>
                <td class="px-6 py-4 text-right">
                    <div class="flex items-center justify-end gap-2">
                        <button onclick="openProjectModal('${safeData}')"
                            class="px-3 py-1.5 bg-cnsc-500 hover:bg-cnsc-600 text-white text-xs font-bold rounded shadow-sm transition"
                            title="View Details">
                            <i class="bi bi-eye-fill"></i>
                        </button>
                        <button onclick="updatePartnerProposalStatus('${opportunity.id}', 'approved')"
                            class="px-3 py-1.5 ${getStatusColor('approved')} text-xs font-bold rounded shadow-sm transition"
                            title="${getStatusTitle('approved')}">
                            <i class="bi bi-check-lg"></i>
                        </button>
                        <button onclick="updatePartnerProposalStatus('${opportunity.id}', 'rejected')"
                            class="px-3 py-1.5 ${getStatusColor('rejected')} text-xs font-bold rounded shadow-sm transition"
                            title="${getStatusTitle('rejected')}">
                            <i class="bi bi-x-lg"></i>
                        </button>
                        <button onclick="updatePartnerProposalStatus('${opportunity.id}', 'reviewed')"
                            class="px-3 py-1.5 ${getStatusColor('reviewed')} text-xs font-bold rounded shadow-sm transition"
                            title="${getStatusTitle('reviewed')}">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button onclick="sendManualEmail('${safeData}')"
                            class="px-3 py-1.5 text-cnsc-600 hover:text-cnsc-700 bg-cnsc-50 hover:bg-cnsc-100 border border-cnsc-200 text-xs font-bold rounded shadow-sm transition"
                            title="Send Email">
                            <i class="bi bi-envelope-fill"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Simulate email sending with EmailJS
function simulateEmailSending(name, msg) {
    if (!currentUserEmail || typeof emailjs === 'undefined') return;

    const toast = document.createElement('div');
    toast.className = "fixed bottom-5 right-5 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-3 z-[200] animate-pulse";
    toast.innerHTML = `<span>⏳</span><div><p class="font-bold text-sm">Sending Email...</p></div>`;
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
            toast.innerHTML = `<span>✅</span><div><p class="font-bold text-sm">Email Sent Successfully!</p></div>`;
            setTimeout(() => toast.remove(), 5000);
        }, function(error) {
            toast.innerHTML = `<p class="text-red-400 font-bold">Email Failed: ${error.text}</p>`;
            setTimeout(() => toast.remove(), 5000);
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