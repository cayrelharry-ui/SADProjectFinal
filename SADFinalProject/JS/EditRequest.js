/**
 * EditRequest.js
 * Handles partnership request editing functionality using Supabase
 */

// ============================================
// CONFIGURATION (Now from db_connection.js)
// ============================================

// Get configuration from db_connection.js
const EDIT_REQ_CONFIG = window.getPartnerConfig ? window.getPartnerConfig() : {
    SUPABASE_URL: 'https://fkdqenrxfanpgmtogiig.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZHFlbnJ4ZmFucGdtdG9naWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDA1NzksImV4cCI6MjA4MDMxNjU3OX0.NSA57GQcxnCpLnqMVlDpf_lvfggb2H-IGGTBL_XYQ4I',
    STORAGE_BUCKET: 'Uploads',
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    UPLOAD_LIMIT_MB: 10,
    SUPPORTED_FILE_TYPES: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip']
};

// Initialize Supabase client using the global supabaseClient from db_connection.js
var supabase;
if (window.supabaseClient && window.supabaseInitialized) {
    supabase = window.supabaseClient;
    console.log("✅ Using Supabase client from db_connection.js");
} else if (window.supabase && window.supabase.createClient && EDIT_REQ_CONFIG.SUPABASE_URL && EDIT_REQ_CONFIG.SUPABASE_ANON_KEY) {
    // Fallback: create client directly if config is available
    supabase = window.supabase.createClient(EDIT_REQ_CONFIG.SUPABASE_URL, EDIT_REQ_CONFIG.SUPABASE_ANON_KEY);
    console.log("⚠️ Created new Supabase client (db_connection.js not initialized)");
} else {
    console.error("❌ Supabase not available. Please ensure db_connection.js is loaded first.");
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Get current user from localStorage
function getCurrentUser() {
    try {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Get file icon based on file type
function getFileIcon(fileType) {
    if (!fileType) return 'bi-file-earmark';

    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return 'bi-file-pdf text-danger';
    if (type.includes('word') || type.includes('doc')) return 'bi-file-word text-primary';
    if (type.includes('excel') || type.includes('xls')) return 'bi-file-excel text-success';
    if (type.includes('image')) return 'bi-file-image text-info';
    if (type.includes('text')) return 'bi-file-text text-secondary';
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'bi-file-zip text-warning';

    return 'bi-file-earmark text-muted';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show toast notification
function showToast(title, message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1060';
        document.body.appendChild(toastContainer);
    }

    // Create toast
    const toastId = 'toast-' + Date.now();
    const toast = document.createElement('div');
    toast.id = toastId;
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <strong>${title}</strong><br>
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Show toast
    const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
    bsToast.show();

    // Remove toast after it's hidden
    toast.addEventListener('hidden.bs.toast', function () {
        toast.remove();
    });
}

// ============================================
// EDIT REQUEST FUNCTIONS
// ============================================

/**
 * Edit Partnership Request - Main Entry Point
 */
async function editRequest(requestId) {
    console.log('✏️ editRequest called for ID:', requestId);

    try {
        const user = getCurrentUser();
        if (!user?.email) {
            showToast('Error', 'Please log in to edit requests', 'danger');
            return;
        }

        // Get request details
        const { data: request, error: requestError } = await supabase
            .from('partnership_requests')
            .select('*')
            .eq('request_id', requestId)
            .single();

        if (requestError || !request) {
            showToast('Error', 'Request not found', 'danger');
            return;
        }

        // Check if request belongs to current user
        if (request.email !== user.email) {
            showToast('Error', 'You can only edit your own requests', 'danger');
            return;
        }

        // Check if request can be edited
        if (request.status !== 'pending') {
            showToast('Error', `Cannot edit request with status: ${request.status}. Only pending requests can be edited.`, 'warning');
            return;
        }

        // Get attachments for this request
        const { data: attachments, error: attachmentsError } = await supabase
            .from('uploaded_files')
            .select('*')
            .eq('partnership_request_id', requestId)
            .eq('category', 'partnership_request');

        if (attachmentsError) {
            console.error('Error fetching attachments:', attachmentsError);
        }

        // Show edit modal
        showEditModal(request, attachments || []);

    } catch (error) {
        console.error('Error in editRequest:', error);
        showToast('Error', 'Failed to load request for editing', 'danger');
    }
}

/**
 * Show Edit Modal
 */
function showEditModal(request, attachments) {
    console.log('📋 Showing edit modal for request:', request.request_id);

    // Format date for input field
    const letterDate = request.letter_date ? new Date(request.letter_date).toISOString().split('T')[0] : '';

    // Get organization types from config
    const orgTypes = EDIT_REQ_CONFIG.ORG_TYPES || ['Government', 'NGO', 'Private Company', 'Academic', 'Other'];

    // Modal HTML
    const modalHtml = `
        <div class="modal fade" id="editRequestModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title">
                            <i class="bi bi-pencil-square"></i> Edit Partnership Request #${request.request_id}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editRequestForm">
                            <!-- Request Details -->
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Letter Date *</label>
                                    <input type="date" class="form-control" name="letter_date"
                                           value="${letterDate}" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Subject *</label>
                                    <input type="text" class="form-control" name="subject"
                                           value="${escapeHtml(request.subject)}" required>
                                </div>
                            </div>

                            <!-- Organization Details -->
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Organization Name *</label>
                                    <input type="text" class="form-control" name="org_name"
                                           value="${escapeHtml(request.org_name)}" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Organization Type *</label>
                                    <select class="form-select" name="org_type" required>
                                        <option value="">Select Type</option>
                                        ${orgTypes.map(type => `
                                            <option value="${type}" ${request.org_type === type ? 'selected' : ''}>${type}</option>
                                        `).join('')}
                                    </select>
                                </div>
                            </div>

                            <div class="row mb-3">
                                <div class="col-12">
                                    <label class="form-label">Organization Address *</label>
                                    <textarea class="form-control" name="address" rows="2" required>${escapeHtml(request.address)}</textarea>
                                </div>
                            </div>

                            <!-- Contact Information -->
                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Contact Person *</label>
                                    <input type="text" class="form-control" name="contact_person"
                                           value="${escapeHtml(request.contact_person)}" required>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Position</label>
                                    <input type="text" class="form-control" name="position"
                                           value="${escapeHtml(request.position || '')}">
                                </div>
                            </div>

                            <div class="row mb-3">
                                <div class="col-md-6">
                                    <label class="form-label">Email *</label>
                                    <input type="email" class="form-control" name="email"
                                           value="${escapeHtml(request.email)}" required readonly>
                                    <small class="text-muted">Email cannot be changed</small>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label">Phone *</label>
                                    <input type="text" class="form-control" name="phone"
                                           value="${escapeHtml(request.phone)}" required>
                                </div>
                            </div>

                            <!-- Collaboration Areas -->
                            <div class="row mb-3">
                                <div class="col-12">
                                    <label class="form-label">Collaboration Areas *</label>
                                    <textarea class="form-control" name="collaboration" rows="3" required>${escapeHtml(request.collaboration)}</textarea>
                                    <small class="text-muted">Describe the areas of collaboration</small>
                                </div>
                            </div>

                            <!-- Expected Outcomes -->
                            <div class="row mb-3">
                                <div class="col-12">
                                    <label class="form-label">Expected Outcomes</label>
                                    <textarea class="form-control" name="outcomes" rows="3">${escapeHtml(request.outcomes || '')}</textarea>
                                </div>
                            </div>

                            <!-- Additional Information -->
                            <div class="row mb-3">
                                <div class="col-12">
                                    <label class="form-label">Additional Information</label>
                                    <textarea class="form-control" name="additional_info" rows="3">${escapeHtml(request.additional_info || '')}</textarea>
                                </div>
                            </div>

                            <!-- File Attachments Section -->
                            <div class="row mb-4">
                                <div class="col-12">
                                    <div class="card">
                                        <div class="card-header bg-light">
                                            <h6 class="mb-0">
                                                <i class="bi bi-paperclip"></i> File Attachments
                                                <small class="text-muted ms-2">(${attachments.length} file(s) attached)</small>
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <!-- Current Attachments -->
                                            <div id="currentAttachments" class="mb-4">
                                                <h6 class="text-muted mb-3">Current Files:</h6>
                                                ${attachments.length > 0 ?
                                                    attachments.map(att => `
                                                        <div class="d-flex justify-content-between align-items-center mb-2 p-2 border rounded">
                                                            <div>
                                                                <i class="bi ${getFileIcon(att.file_type)} me-2"></i>
                                                                ${escapeHtml(att.original_name)}
                                                                <small class="text-muted d-block">${formatFileSize(att.file_size)}</small>
                                                            </div>
                                                            <div>
                                                                <button type="button" class="btn btn-sm btn-outline-danger"
                                                                        onclick="removeAttachment(${att.id}, '${escapeHtml(att.original_name)}', ${request.request_id})">
                                                                    <i class="bi bi-trash"></i> Remove
                                                                </button>
                                                            </div>
                                                        </div>
                                                    `).join('') :
                                                    '<p class="text-muted">No files attached</p>'
                                                }
                                            </div>

                                            <!-- New File Upload -->
                                            <div id="newAttachments">
                                                <h6 class="text-muted mb-3">Add New Files:</h6>
                                                <div class="mb-3">
                                                    <input type="file" class="form-control" id="newFiles" multiple
                                                           accept="${EDIT_REQ_CONFIG.SUPPORTED_FILE_TYPES.join(',')}">
                                                    <small class="text-muted">Max ${EDIT_REQ_CONFIG.UPLOAD_LIMIT_MB}MB per file. Supported: ${EDIT_REQ_CONFIG.SUPPORTED_FILE_TYPES.join(', ')})</small>
                                                </div>
                                                <div id="filePreview" class="mt-3"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Status Display -->
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle"></i>
                                This request is currently <strong>${request.status}</strong>.
                                Editing will update the request but maintain its current status.
                            </div>

                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                                <button type="submit" class="btn btn-warning">
                                    <i class="bi bi-check-circle"></i> Update Request
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('editRequestModal');
    if (existingModal) existingModal.remove();

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Initialize modal
    const modal = new bootstrap.Modal(document.getElementById('editRequestModal'));

    // Handle form submission
    const form = document.getElementById('editRequestForm');
    form.addEventListener('submit', (e) => handleEditSubmit(e, request.request_id, modal));

    // Handle file preview
    const fileInput = document.getElementById('newFiles');
    fileInput.addEventListener('change', handleFilePreview);

    // Show modal
    modal.show();

    console.log('✅ Edit modal shown successfully');
}

/**
 * Handle Edit Form Submission
 */
async function handleEditSubmit(e, requestId, modal) {
    e.preventDefault();
    console.log('📝 Handling edit form submit for request:', requestId);

    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    try {
        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Updating...';

        // Get form data
        const formData = new FormData(form);
        const requestData = Object.fromEntries(formData.entries());

        console.log('📋 Form data:', requestData);

        // Validate required fields
        const requiredFields = ['letter_date', 'subject', 'org_name', 'org_type', 'address',
                              'contact_person', 'email', 'phone', 'collaboration'];
        for (const field of requiredFields) {
            if (!requestData[field]?.trim()) {
                throw new Error(`Please fill in the ${field.replace('_', ' ')} field`);
            }
        }

        // Prepare update data
        const updateData = {
            letter_date: requestData.letter_date,
            subject: requestData.subject.trim(),
            org_name: requestData.org_name.trim(),
            org_type: requestData.org_type,
            address: requestData.address.trim(),
            collaboration: requestData.collaboration.trim(),
            outcomes: requestData.outcomes?.trim() || null,
            additional_info: requestData.additional_info?.trim() || null,
            contact_person: requestData.contact_person.trim(),
            position: requestData.position?.trim() || null,
            phone: requestData.phone.trim(),
            updated_at: new Date().toISOString()
        };

        console.log('📤 Updating request with data:', updateData);

        // Update partnership request
        const { error: updateError } = await supabase
            .from('partnership_requests')
            .update(updateData)
            .eq('request_id', requestId);

        if (updateError) {
            console.error('❌ Update error:', updateError);
            throw new Error(`Failed to update request: ${updateError.message}`);
        }

        // Upload new files if any
        const fileInput = document.getElementById('newFiles');
        if (fileInput.files.length > 0) {
            console.log('📁 Uploading new files...');
            await uploadFiles(requestId, fileInput.files);
        }

        // Close modal
        modal.hide();

        // Show success message
        showToast('Success', 'Partnership request updated successfully!', 'success');
        console.log('✅ Request updated successfully');

        // Refresh data in parent window
        if (window.parent && window.parent.loadPartnershipRequests) {
            window.parent.loadPartnershipRequests();
        }

        // Dispatch custom event to notify parent
        const event = new CustomEvent('requestUpdated', {
            detail: { requestId: requestId, action: 'update' }
        });
        window.dispatchEvent(event);

    } catch (error) {
        console.error('❌ Error updating request:', error);
        showToast('Error', error.message, 'danger');
    } finally {
        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

/**
 * Handle File Preview
 */
function handleFilePreview(e) {
    const fileList = e.target.files;
    const previewDiv = document.getElementById('filePreview');

    if (!previewDiv) return;

    previewDiv.innerHTML = '';

    if (fileList.length === 0) {
        return;
    }

    // Validate file sizes
    const maxSize = EDIT_REQ_CONFIG.MAX_FILE_SIZE;
    const validFiles = [];
    const invalidFiles = [];

    Array.from(fileList).forEach(file => {
        if (file.size > maxSize) {
            invalidFiles.push(file.name);
        } else {
            validFiles.push(file);
        }
    });

    // Show invalid files warning
    if (invalidFiles.length > 0) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'alert alert-warning';
        warningDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle"></i>
            <strong>The following files exceed ${EDIT_REQ_CONFIG.UPLOAD_LIMIT_MB}MB limit and will not be uploaded:</strong>
            <ul class="mb-0">
                ${invalidFiles.map(name => `<li>${escapeHtml(name)}</li>`).join('')}
            </ul>
        `;
        previewDiv.appendChild(warningDiv);
    }

    // Show valid files
    if (validFiles.length > 0) {
        const listDiv = document.createElement('div');
        listDiv.className = 'mt-3';
        listDiv.innerHTML = `
            <h6>Files to be uploaded (${validFiles.length}):</h6>
            <div class="list-group">
                ${validFiles.map(file => `
                    <div class="list-group-item">
                        <i class="bi bi-file-earmark me-2"></i>
                        ${escapeHtml(file.name)}
                        <span class="badge bg-secondary float-end">${formatFileSize(file.size)}</span>
                    </div>
                `).join('')}
            </div>
        `;
        previewDiv.appendChild(listDiv);
    }
}

/**
 * Upload New Files
 */
async function uploadFiles(requestId, files) {
    const user = getCurrentUser();
    if (!user?.email) {
        throw new Error('User not authenticated');
    }

    // Filter files by size
    const maxSize = EDIT_REQ_CONFIG.MAX_FILE_SIZE;
    const validFiles = Array.from(files).filter(file => file.size <= maxSize);

    if (validFiles.length === 0) {
        return;
    }

    console.log(`📤 Uploading ${validFiles.length} files for request ${requestId}`);

    // Use central upload function if available
    if (window.supabaseAuth && window.supabaseAuth.partner && window.supabaseAuth.partner.uploadPartnerFile) {
        for (const file of validFiles) {
            await window.supabaseAuth.partner.uploadPartnerFile(requestId, file, 'partnership_request');
        }
        return;
    }

    // Fallback to local implementation
    for (const file of validFiles) {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const uniqueName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = `${requestId}/${uniqueName}`;

            console.log(`📁 Uploading: ${file.name} as ${uniqueName}`);

            // Upload to storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from(EDIT_REQ_CONFIG.STORAGE_BUCKET)
                .upload(filePath, file);

            if (uploadError) {
                console.error('❌ Upload error:', uploadError);
                throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(EDIT_REQ_CONFIG.STORAGE_BUCKET)
                .getPublicUrl(filePath);

            // Insert into uploaded_files table
            const { error: dbError } = await supabase
                .from('uploaded_files')
                .insert({
                    original_name: file.name,
                    storage_path: `${EDIT_REQ_CONFIG.STORAGE_BUCKET}/${filePath}`,
                    file_type: file.type || 'application/octet-stream',
                    file_size: file.size,
                    public_url: publicUrl,
                    category: 'partnership_request',
                    partnership_request_id: requestId,
                    uploaded_by: user.user_id || null,
                    description: `Uploaded with request #${requestId}`
                });

            if (dbError) {
                console.error('❌ Database insert error:', dbError);
                // Try to delete the uploaded file if database insert fails
                await supabase.storage.from(EDIT_REQ_CONFIG.STORAGE_BUCKET).remove([filePath]);
                throw new Error(`Failed to save file metadata for ${file.name}`);
            }

            console.log(`✅ File uploaded successfully: ${file.name}`);

        } catch (error) {
            console.error(`❌ Error uploading ${file.name}:`, error);
            showToast('Warning', `Failed to upload ${file.name}: ${error.message}`, 'warning');
        }
    }
}

/**
 * Remove Attachment
 */
async function removeAttachment(fileId, fileName, requestId) {
    if (!confirm(`Are you sure you want to remove "${fileName}"? This will permanently delete the file.`)) {
        return;
    }

    try {
        console.log(`🗑️ Removing attachment ${fileId}: ${fileName}`);

        // Use central delete function if available
        if (window.supabaseAuth && window.supabaseAuth.partner && window.supabaseAuth.partner.deletePartnerFile) {
            const result = await window.supabaseAuth.partner.deletePartnerFile(fileId);
            if (result.success) {
                showToast('Success', `File "${fileName}" removed successfully`, 'success');
                console.log(`✅ Attachment removed: ${fileName}`);

                // Refresh the modal by re-opening it
                setTimeout(async () => {
                    try {
                        // Get updated request and attachments
                        const { data: request } = await supabase
                            .from('partnership_requests')
                            .select('*')
                            .eq('request_id', requestId)
                            .single();

                        const { data: attachments } = await supabase
                            .from('uploaded_files')
                            .select('*')
                            .eq('partnership_request_id', requestId)
                            .eq('category', 'partnership_request');

                        if (request) {
                            // Close existing modal
                            const existingModal = document.getElementById('editRequestModal');
                            if (existingModal) {
                                const modal = bootstrap.Modal.getInstance(existingModal);
                                if (modal) modal.hide();
                                existingModal.remove();
                            }

                            // Show updated modal
                            showEditModal(request, attachments || []);
                        }
                    } catch (error) {
                        console.error('Error refreshing modal:', error);
                    }
                }, 500);
            } else {
                throw new Error(result.message);
            }
            return;
        }

        // Fallback to local implementation
        // Get file info
        const { data: file, error: fetchError } = await supabase
            .from('uploaded_files')
            .select('storage_path')
            .eq('id', fileId)
            .single();

        if (fetchError) {
            throw new Error('File not found');
        }

        // Delete from storage
        const filePath = file.storage_path.replace(`${EDIT_REQ_CONFIG.STORAGE_BUCKET}/`, '');
        const { error: storageError } = await supabase.storage
            .from(EDIT_REQ_CONFIG.STORAGE_BUCKET)
            .remove([filePath]);

        if (storageError) {
            console.warn('Storage delete error:', storageError);
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from('uploaded_files')
            .delete()
            .eq('id', fileId);

        if (dbError) {
            throw new Error(`Failed to delete file record: ${dbError.message}`);
        }

        // Show success message
        showToast('Success', `File "${fileName}" removed successfully`, 'success');
        console.log(`✅ Attachment removed: ${fileName}`);

        // Refresh the modal by re-opening it
        setTimeout(async () => {
            try {
                // Get updated request and attachments
                const { data: request } = await supabase
                    .from('partnership_requests')
                    .select('*')
                    .eq('request_id', requestId)
                    .single();

                const { data: attachments } = await supabase
                    .from('uploaded_files')
                    .select('*')
                    .eq('partnership_request_id', requestId)
                    .eq('category', 'partnership_request');

                if (request) {
                    // Close existing modal
                    const existingModal = document.getElementById('editRequestModal');
                    if (existingModal) {
                        const modal = bootstrap.Modal.getInstance(existingModal);
                        if (modal) modal.hide();
                        existingModal.remove();
                    }

                    // Show updated modal
                    showEditModal(request, attachments || []);
                }
            } catch (error) {
                console.error('Error refreshing modal:', error);
            }
        }, 500);

    } catch (error) {
        console.error('❌ Error removing attachment:', error);
        showToast('Error', `Failed to remove file: ${error.message}`, 'danger');
    }
}

// ============================================
// CANCEL REQUEST FUNCTION
// ============================================

/**
 * Cancel Partnership Request
 */
async function cancelRequest(requestId, showConfirm = true) {
    try {
        const user = getCurrentUser();
        if (!user?.email) {
            showToast('Error', 'Please log in to cancel requests', 'danger');
            return;
        }

        // Check if request exists and belongs to user
        const { data: request, error } = await supabase
            .from('partnership_requests')
            .select('*')
            .eq('request_id', requestId)
            .eq('email', user.email)
            .single();

        if (error || !request) {
            showToast('Error', 'Request not found or you do not have permission to cancel it', 'danger');
            return;
        }

        // Check if request can be cancelled
        if (request.status !== 'pending') {
            showToast('Error', `Cannot cancel request with status: ${request.status}. Only pending requests can be cancelled.`, 'warning');
            return;
        }

        // Ask for confirmation
        if (showConfirm) {
            const confirmCancel = confirm(`Are you sure you want to cancel request #${requestId}?\n\nSubject: ${request.subject}\nOrganization: ${request.org_name}\n\nThis action cannot be undone.`);
            if (!confirmCancel) return;
        }

        // Update request status to cancelled
        const { error: updateError } = await supabase
            .from('partnership_requests')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
                cancellation_date: new Date().toISOString(),
                cancellation_reason: 'Cancelled by user'
            })
            .eq('request_id', requestId);

        if (updateError) {
            throw new Error(`Failed to cancel request: ${updateError.message}`);
        }

        // Show success message
        showToast('Success', `Request #${requestId} has been cancelled`, 'success');

        // Refresh data in parent window
        if (window.parent && window.parent.loadPartnershipRequests) {
            window.parent.loadPartnershipRequests();
        }

        // Dispatch custom event to notify parent
        const event = new CustomEvent('requestCancelled', {
            detail: { requestId: requestId, action: 'cancel' }
        });
        window.dispatchEvent(event);

        // Close details modal if open
        const detailsModal = document.getElementById('requestDetailsModal');
        if (detailsModal) {
            const modal = bootstrap.Modal.getInstance(detailsModal);
            if (modal) modal.hide();
        }

    } catch (error) {
        console.error('Error cancelling request:', error);
        showToast('Error', error.message || 'Failed to cancel request', 'danger');
    }
}

// ============================================
// INITIALIZATION
// ============================================

// Check if Bootstrap is available
function checkBootstrap() {
    if (typeof bootstrap === 'undefined') {
        console.warn('Bootstrap not loaded. EditRequest.js requires Bootstrap 5.');
        return false;
    }
    return true;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('EditRequest.js loaded successfully');

    if (!checkBootstrap()) {
        console.error('Bootstrap not found. Please ensure Bootstrap 5 is loaded before EditRequest.js');
    }
});

// ============================================
// EXPORT FUNCTIONS TO WINDOW
// ============================================

window.editRequest = editRequest;
window.cancelRequest = cancelRequest;
window.removeAttachment = removeAttachment;
window.handleFilePreview = handleFilePreview;

console.log('✅ EditRequest.js loaded - All edit functions available');