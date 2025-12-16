// faculty-modals.js

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