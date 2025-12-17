/**
 * Partner_Panel.js
 * Handles partner dashboard functionality using Supabase
 */

// ============================================
// CONFIGURATION
// ============================================

// Get configuration from db_connection.js
const PARTNER_CONFIG = window.getPartnerConfig ? window.getPartnerConfig() : {
    // Fallback in case db_connection.js isn't loaded
    SUPABASE_URL: 'https://fkdqenrxfanpgmtogiig.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZHFlbnJ4ZmFucGdtdG9naWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDA1NzksImV4cCI6MjA4MDMxNjU3OX0.NSA57GQcxnCpLnqMVlDpf_lvfggb2H-IGGTBL_XYQ4I',
    STORAGE_BUCKET: 'Uploads',
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    UPLOAD_LIMIT_MB: 10,
    SUPPORTED_FILE_TYPES: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip'],
    REQUEST_STATUSES: ['pending', 'reviewed', 'approved', 'rejected', 'cancelled'],
    ORG_TYPES: ['Government', 'NGO', 'Private Company', 'Academic', 'Other'],
    CATEGORIES: ['partnership_request', 'moa', 'project']
};

// Initialize Supabase client using the global supabaseClient from db_connection.js
let supabase;
if (window.supabaseClient && window.supabaseInitialized) {
    supabase = window.supabaseClient;
    console.log("✅ Using Supabase client from db_connection.js");
} else if (window.supabase && window.supabase.createClient) {
    supabase = window.supabase.createClient(PARTNER_CONFIG.SUPABASE_URL, PARTNER_CONFIG.SUPABASE_ANON_KEY);
    console.log("⚠️ Created new Supabase client");
} else {
    console.error("❌ Supabase not available. Please ensure db_connection.js is loaded first.");
}

// ============================================
// STORAGE BUCKET CHECK & INITIALIZATION
// ============================================

async function checkBucketsAndFix() {
    try {
        console.log("🔍 Checking available storage buckets...");
        const { data: buckets, error } = await supabase.storage.listBuckets();

        if (error) {
            console.error('❌ Error listing buckets:', error);
            return 'Uploads';
        }

        console.log('📦 Available buckets:', buckets);
        const uploadsBucket = buckets.find(b =>
            b.name === 'Uploads' || b.name.toLowerCase() === 'uploads'
        );

        if (!uploadsBucket) {
            console.warn('⚠️ No bucket named "Uploads" found');
            return 'Uploads';
        }

        console.log(`✅ Found bucket: ${uploadsBucket.name}`);
        return uploadsBucket.name;
    } catch (error) {
        console.error('❌ Error checking buckets:', error);
        return 'Uploads';
    }
}

// ============================================
// CORE FILE HANDLING FUNCTIONS
// ============================================

/**
 * Get file URL from storage path
 */
function getFileUrl(storagePath, requestId, fileName) {
    console.log("🔄 Constructing file URL from:");
    console.log("  - Storage Path:", storagePath);
    console.log("  - Request ID:", requestId);
    console.log("  - File Name:", fileName);

    if (!storagePath && (!requestId || !fileName)) {
        console.error('❌ Cannot construct file URL: insufficient data');
        return null;
    }

    let finalPath = '';

    // Priority 1: Use storage_path if available
    if (storagePath) {
        let path = storagePath.trim();

        // Remove bucket prefix if present
        if (path.startsWith('Uploads/')) {
            path = path.substring('Uploads/'.length);
            console.log("📝 Removed 'Uploads/' prefix");
        } else if (path.startsWith('uploads/')) {
            path = path.substring('uploads/'.length);
            console.log("📝 Removed 'uploads/' prefix");
        }

        finalPath = path;
        console.log("✅ Using path from storage_path:", finalPath);
    }
    // Priority 2: Construct from request_id and filename
    else if (requestId && fileName) {
        const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
        finalPath = `${requestId}/${cleanFileName}`;
        console.log("✅ Constructed path from request_id/filename:", finalPath);
    }

    if (!finalPath) {
        console.error('❌ Could not determine file path');
        return null;
    }

    // Construct final URL
    const finalUrl = `https://fkdqenrxfanpgmtogiig.supabase.co/storage/v1/object/public/Uploads/${finalPath}`;
    console.log("🔗 Final URL:", finalUrl);

    return finalUrl;
}

/**
 * Universal file preview function
 */
async function previewFileUniversal(attachment) {
    try {
        console.log("📄 Previewing attachment:", attachment);

        // Get the file URL
        const fileUrl = getFileUrl(
            attachment.storage_path,
            attachment.request_id || attachment.partnership_request_id,
            attachment.original_name
        );

        if (!fileUrl) {
            throw new Error("Could not determine file URL");
        }

        console.log("🔗 Opening URL:", fileUrl);

        // Open in new tab
        window.open(fileUrl, '_blank');
        showNotification(`Opening "${attachment.original_name}"...`, 'success');

    } catch (error) {
        console.error("❌ Preview failed:", error);
        showNotification(`Cannot preview file: ${error.message}`, 'danger');
    }
}

/**
 * Helper function to trigger file download
 */
function triggerFileDownload(blobData, fileName) {
    try {
        const url = window.URL.createObjectURL(blobData);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        }, 100);

        showNotification(`Downloading "${fileName}"...`, 'success');
        return { success: true, message: `File "${fileName}" downloaded successfully` };
    } catch (error) {
        console.error('Trigger download error:', error);
        throw error;
    }
}

/**
 * Download a single document from uploaded_files table
 */
async function downloadDocument(documentId) {
    try {
        showNotification('Preparing download...', 'info');

        const { data: document, error } = await supabase
            .from('uploaded_files')
            .select('original_name, storage_path, file_type')
            .eq('id', documentId)
            .single();

        if (error || !document) {
            throw new Error('Document not found');
        }

        console.log('Document storage_path:', document.storage_path);

        // Extract bucket name and file path
        const bucketName = PARTNER_CONFIG.STORAGE_BUCKET;
        let filePath = document.storage_path;

        // Debug logging
        console.log('Bucket name:', bucketName);
        console.log('Storage path from DB:', filePath);

        if (filePath.toLowerCase().startsWith(`${bucketName.toLowerCase()}/`)) {
            filePath = filePath.substring(bucketName.length + 1);
            console.log('Trimmed path:', filePath);
        } else if (filePath.toLowerCase().startsWith('uploads/')) {
            filePath = filePath.substring('uploads'.length + 1);
            console.log('Trimmed lowercase path:', filePath);
        }

        console.log('Attempting download from bucket:', bucketName, 'path:', filePath);

        const { data: fileData, error: downloadError } = await supabase.storage
            .from(bucketName)
            .download(filePath);

        if (downloadError) {
            console.error('First download attempt failed:', downloadError);

            console.log('Trying with bucket: uploads');
            const { data: altData, error: altError } = await supabase.storage
                .from('uploads')
                .download(filePath);

            if (altError) {
                console.error('Alternative download failed:', altError);

                console.log('Trying exact path from DB:', document.storage_path);
                const { data: finalData, error: finalError } = await supabase.storage
                    .from(bucketName)
                    .download(document.storage_path);

                if (finalError) {
                    console.error('Final attempt failed:', finalError);

                    // Check if bucket exists
                    const { data: buckets } = await supabase.storage.listBuckets();
                    console.log('Available buckets:', buckets);

                    throw new Error(`File not found. Check bucket name and path. Available buckets: ${buckets?.map(b => b.name).join(', ')}`);
                }
                return triggerFileDownload(finalData, document.original_name);
            }
            return triggerFileDownload(altData, document.original_name);
        }

        return triggerFileDownload(fileData, document.original_name);

    } catch (error) {
        console.error('Download document error:', error);
        showNotification(`Download failed: ${error.message}`, 'danger');
        return { success: false, message: error.message };
    }
}

/**
 * Download all attachments for a partnership request
 */
async function downloadAllRequestAttachments(requestId) {
    try {
        const { data: attachments, error } = await supabase
            .from('uploaded_files')
            .select('id, original_name')
            .eq('partnership_request_id', requestId)
            .eq('category', 'partnership_request');

        if (error) {
            console.error('Error fetching attachments:', error);
            return { success: false, message: 'Failed to fetch attachments' };
        }

        if (!attachments || attachments.length === 0) {
            return {
                success: false,
                message: 'No attachments found',
                attachmentsCount: 0
            };
        }

        if (attachments.length === 1) {
            return await downloadDocument(attachments[0].id);
        }

        if (confirm(`Download all ${attachments.length} attachments for this request?`)) {
            return await downloadDocument(attachments[0].id);
        }

        return {
            success: false,
            message: 'Download cancelled',
            attachmentsCount: attachments.length
        };

    } catch (error) {
        console.error('Download attachments error:', error);
        return {
            success: false,
            message: `Failed to download attachments: ${error.message}`
        };
    }
}

async function downloadRequestDocuments(requestId) {
    try {
        const result = await downloadAllRequestAttachments(requestId);

        // Only show notification for actual errors, not for "no attachments"
        if (!result.success &&
            result.message !== 'Download cancelled' &&
            result.message !== 'No attachments found') {
            showNotification(result.message, 'info');
        }
        // Silently ignore "No attachments found"
    } catch (error) {
        console.error('Error downloading documents:', error);
        showNotification('Failed to download documents', 'danger');
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function getCurrentUser() {
    try {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffDay > 0) return `${diffDay} day${diffDay !== 1 ? 's' : ''} ago`;
    if (diffHour > 0) return `${diffHour} hour${diffHour !== 1 ? 's' : ''} ago`;
    if (diffMin > 0) return `${diffMin} minute${diffMin !== 1 ? 's' : ''} ago`;
    return 'Just now';
}

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

function getFileTypeBadge(fileType) {
    if (!fileType) return 'Unknown';

    const type = fileType.toLowerCase();
    if (type.includes('pdf')) return 'PDF';
    if (type.includes('word') || type.includes('doc')) return 'DOC';
    if (type.includes('excel') || type.includes('xls')) return 'Excel';
    if (type.includes('image')) return 'Image';
    if (type.includes('text')) return 'Text';
    if (type.includes('zip') || type.includes('rar') || type.includes('7z')) return 'Archive';

    return 'File';
}

function getStatusBadgeClass(status) {
    const statusMap = {
        'approved': 'bg-success',
        'pending': 'bg-warning',
        'reviewed': 'bg-info',
        'rejected': 'bg-danger',
        'cancelled': 'bg-secondary'
    };
    return statusMap[status?.toLowerCase()] || 'bg-secondary';
}

function getStatusIcon(status) {
    const iconMap = {
        'approved': 'bi-check-circle',
        'pending': 'bi-clock',
        'reviewed': 'bi-search',
        'rejected': 'bi-x-circle',
        'cancelled': 'bi-x-octagon'
    };
    return iconMap[status?.toLowerCase()] || 'bi-question-circle';
}

function capitalizeFirst(string) {
    return string ? string.charAt(0).toUpperCase() + string.slice(1) : '';
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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

function showNotification(message, type = 'info') {
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
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;

    toastContainer.appendChild(toast);

    const bsToast = new bootstrap.Toast(toast, { delay: 5000 });
    bsToast.show();

    toast.addEventListener('hidden.bs.toast', function () {
        toast.remove();
    });
}

// ============================================
// DATA FETCHING FUNCTIONS
// ============================================

async function getPartnerStats(email) {
    if (!email) {
        return { status: 'error', message: 'Email parameter is required' };
    }

    try {
        const { data, error } = await supabase
            .from('partnership_requests')
            .select('status')
            .eq('email', email);

        if (error) throw error;

        const counts = {
            total_requests: data.length,
            approved_requests: 0,
            pending_requests: 0,
            reviewed_requests: 0,
            rejected_requests: 0,
            cancelled_requests: 0,
            active_projects: 0
        };

        data.forEach(item => {
            const status = item.status.toLowerCase();
            if (counts[`${status}_requests`] !== undefined) {
                counts[`${status}_requests`]++;
            }
        });

        counts.active_projects = counts.approved_requests;

        return {
            status: 'success',
            stats: counts,
            email: email
        };
    } catch (error) {
        console.error('Error getting partner stats:', error);
        return { status: 'error', message: 'Server error: ' + error.message };
    }
}

async function getPartnerRequests(email, filters = {}) {
    if (!email) {
        return { status: 'error', message: 'Email parameter is required' };
    }

    const { status, search, limit } = filters;

    try {
        let query = supabase
            .from('partnership_requests')
            .select('*')
            .eq('email', email);

        if (status && status !== 'all') {
            query = query.eq('status', status);
        }

        if (search) {
            query = query.or(`subject.ilike.%${search}%,org_name.ilike.%${search}%,collaboration.ilike.%${search}%`);
        }

        query = query.order('submitted_at', { ascending: false });

        if (limit && limit > 0) {
            query = query.limit(limit);
        }

        const { data: requests, error } = await query;

        if (error) throw error;

        return {
            status: 'success',
            requests: requests || []
        };
    } catch (error) {
        console.error('Error getting partner requests:', error);
        return { status: 'error', message: 'Query failed: ' + error.message };
    }
}

async function getAllApprovedRequests(filters = {}) {
    const { search, orgType } = filters;

    try {
        let query = supabase
            .from('partnership_requests')
            .select('*')
            .eq('status', 'approved');

        if (search) {
            query = query.or(`subject.ilike.%${search}%,org_name.ilike.%${search}%,collaboration.ilike.%${search}%`);
        }

        if (orgType) {
            query = query.eq('org_type', orgType);
        }

        query = query.order('submitted_at', { ascending: false });

        const { data: requests, error } = await query;

        if (error) throw error;

        return {
            status: 'success',
            requests: requests || []
        };
    } catch (error) {
        console.error('Error getting approved requests:', error);
        return { status: 'error', message: 'Query failed: ' + error.message };
    }
}

async function getRequestDetails(requestId) {
    if (!requestId) {
        return { status: 'error', message: 'Request ID is required' };
    }

    try {
        const { data: request, error: requestError } = await supabase
            .from('partnership_requests')
            .select('*')
            .eq('request_id', requestId)
            .single();

        if (requestError || !request) {
            return { status: 'error', message: 'Request not found' };
        }

        const { data: attachments } = await supabase
            .from('uploaded_files')
            .select('*')
            .eq('partnership_request_id', requestId)
            .eq('category', 'partnership_request');

        return {
            status: 'success',
            request,
            attachments: attachments || []
        };
    } catch (error) {
        console.error('Error getting request details:', error);
        return { status: 'error', message: 'Failed to load request details' };
    }
}

async function getPartnerDocumentsFromUploadedFiles(email) {
    if (!email) {
        return { success: false, message: 'Email parameter is required' };
    }

    try {
        const { data: userRequests, error: requestsError } = await supabase
            .from('partnership_requests')
            .select('request_id')
            .eq('email', email);

        if (requestsError) {
            console.error('Error fetching user requests:', requestsError);
            return { success: false, message: 'Failed to load user requests' };
        }

        const userRequestIds = userRequests.map(req => req.request_id);

        if (userRequestIds.length === 0) {
            return { success: true, documents: [], count: 0 };
        }

        const { data: documents, error } = await supabase
            .from('uploaded_files')
            .select(`
                id,
                original_name,
                storage_path,
                file_type,
                file_size,
                public_url,
                uploaded_at,
                description,
                category,
                partnership_request_id
            `)
            .eq('category', 'partnership_request')
            .in('partnership_request_id', userRequestIds)
            .order('uploaded_at', { ascending: false });

        if (error) {
            console.error('Error fetching documents:', error);
            return { success: false, message: 'Failed to load documents: ' + error.message };
        }

        const formattedDocs = (documents || []).map(doc => ({
            id: doc.id,
            original_name: doc.original_name,
            storage_path: doc.storage_path,
            file_type: doc.file_type,
            file_size: doc.file_size,
            public_url: doc.public_url,
            uploaded_at: doc.uploaded_at,
            description: doc.description,
            request_id: doc.partnership_request_id || 'N/A',
            file_icon: getFileIcon(doc.file_type)
        }));

        return {
            success: true,
            documents: formattedDocs,
            count: formattedDocs.length
        };

    } catch (error) {
        console.error('Error getting partner documents:', error);
        return { success: false, message: 'Failed to load documents' };
    }
}

// ============================================
// PARTNERSHIP REQUESTS FUNCTIONALITY
// ============================================

async function loadPartnershipRequests() {
    try {
        const user = getCurrentUser();
        if (!user?.email) {
            showNotification('Please log in to view requests', 'warning');
            return;
        }

        showRequestsLoading(true);

        const statusFilter = document.getElementById('statusFilter')?.value || '';
        const searchTerm = document.getElementById('searchRequests')?.value || '';

        const result = await getPartnerRequests(user.email, {
            status: statusFilter || undefined,
            search: searchTerm || undefined
        });

        if (result.status === 'success') {
            renderRequestsTable(result.requests);
            updateRequestsCount(result.requests.length);
        } else {
            showNotification(result.message, 'danger');
            renderRequestsTable([]);
        }
    } catch (error) {
        console.error('Error loading partnership requests:', error);
        showNotification('Failed to load requests', 'danger');
        renderRequestsTable([]);
    } finally {
        showRequestsLoading(false);
    }
}

function renderRequestsTable(requests) {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;

    if (!requests || requests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted py-5">
                    <i class="bi bi-file-earmark-x fs-1"></i>
                    <p class="mt-3">No partnership requests found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = requests.map(request => `
        <tr>
            <td>
                <strong>#${request.request_id}</strong>
                ${request.status === 'pending' ?
                    '<span class="badge bg-warning ms-2"><i class="bi bi-clock"></i></span>' :
                    ''}
            </td>
            <td>
                <div class="fw-semibold text-truncate" style="max-width: 300px;" title="${escapeHtml(request.subject)}">
                    ${escapeHtml(request.subject)}
                </div>
                <small class="text-muted text-truncate d-block" style="max-width: 300px;" title="${escapeHtml(request.org_name)}">
                    ${escapeHtml(request.org_name)}
                </small>
            </td>
            <td>
                <div>${formatDate(request.submitted_at)}</div>
                <small class="text-muted">${formatRelativeTime(request.submitted_at)}</small>
            </td>
            <td>
                <span class="badge ${getStatusBadgeClass(request.status)}">
                    <i class="bi ${getStatusIcon(request.status)}"></i>
                    ${capitalizeFirst(request.status)}
                </span>
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-primary" onclick="viewRequestDetails(${request.request_id})"
                        title="View Details">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="btn btn-outline-info" onclick="viewRequestAttachments(${request.request_id})"
                        title="View Attachments">
                        <i class="bi bi-paperclip"></i>
                    </button>
                    <button class="btn btn-outline-success" onclick="downloadRequestDocuments(${request.request_id})"
                        title="Download Documents">
                        <i class="bi bi-download"></i>
                    </button>
                    ${request.status === 'pending' ? `
                        <button class="btn btn-outline-warning" onclick="editRequest(${request.request_id})"
                            title="Edit Request">
                            <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-outline-danger" onclick="cancelRequest(${request.request_id})"
                            title="Cancel Request">
                            <i class="bi bi-x-circle"></i>
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

// ============================================
// APPROVED REQUESTS FUNCTIONALITY
// ============================================

async function loadApprovedRequests() {
    try {
        showApprovedRequestsLoading(true);

        const searchTerm = document.getElementById('searchApprovedRequests')?.value || '';
        const orgTypeFilter = document.getElementById('orgTypeFilter')?.value || '';

        const result = await getAllApprovedRequests({
            search: searchTerm || undefined,
            orgType: orgTypeFilter || undefined
        });

        if (result.status === 'success') {
            renderApprovedRequestsTable(result.requests);
            updateApprovedRequestsCount(result.requests.length);

            // Show/hide no results message
            const noRequestsMsg = document.getElementById('noApprovedRequestsMessage');
            if (noRequestsMsg) {
                noRequestsMsg.classList.toggle('d-none', result.requests.length > 0);
            }
        } else {
            showNotification(result.message, 'danger');
            renderApprovedRequestsTable([]);
        }
    } catch (error) {
        console.error('Error loading approved requests:', error);
        showNotification('Failed to load approved requests', 'danger');
        renderApprovedRequestsTable([]);
    } finally {
        showApprovedRequestsLoading(false);
    }
}

function renderApprovedRequestsTable(requests) {
    const tbody = document.getElementById('approvedRequestsTableBody');
    if (!tbody) return;

    if (!requests || requests.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-5">
                    <i class="bi bi-check-circle fs-1"></i>
                    <p class="mt-3">No approved partnership requests found</p>
                    <p class="text-muted small">Approved requests from all organizations will appear here.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = requests.map(request => `
        <tr>
            <td>
                <span class="badge bg-secondary">#${request.request_id}</span>
            </td>
            <td>
                <div class="fw-semibold">${escapeHtml(request.org_name)}</div>
                <small class="text-muted">${escapeHtml(request.org_type)}</small>
            </td>
            <td>
                <div class="fw-medium" title="${escapeHtml(request.subject)}">
                    ${escapeHtml(request.subject)}
                </div>
                <small class="text-muted">${formatRelativeTime(request.submitted_at)}</small>
            </td>
            <td>
                <div class="text-truncate" style="max-width: 200px;" title="${escapeHtml(request.collaboration)}">
                    ${escapeHtml(request.collaboration.length > 100 ? request.collaboration.substring(0, 100) + '...' : request.collaboration)}
                </div>
            </td>
            <td>
                ${formatDate(request.submitted_at)}
            </td>
            <td>
                <div class="btn-group btn-group-sm" role="group">
                    <button class="btn btn-outline-primary" onclick="viewApprovedRequestDetails(${request.request_id})"
                        title="View Details">
                        <i class="bi bi-eye"></i> Details
                    </button>
                    <button class="btn btn-success" onclick="submitProposal(${request.request_id})"
                        title="Submit Proposal">
                        <i class="bi bi-send-check"></i> Submit Proposal
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function viewApprovedRequestDetails(requestId) {
    try {
        const result = await getRequestDetails(requestId);

        if (result.status === 'success') {
            const request = result.request;
            const attachments = result.attachments;

            let content = `
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="text-muted">Request Information</h6>
                        <table class="table table-sm">
                            <tr><th>Request ID:</th><td>#${request.request_id}</td></tr>
                            <tr><th>Status:</th>
                                <td><span class="badge bg-success">
                                    <i class="bi bi-check-circle"></i>
                                    Approved
                                </span></td>
                            </tr>
                            <tr><th>Submitted:</th><td>${formatDate(request.submitted_at)}</td></tr>
                            <tr><th>Last Updated:</th><td>${formatDate(request.updated_at)}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-muted">Organization Details</h6>
                        <table class="table table-sm">
                            <tr><th>Organization:</th><td>${escapeHtml(request.org_name)}</td></tr>
                            <tr><th>Type:</th><td>${escapeHtml(request.org_type)}</td></tr>
                            <tr><th>Contact Person:</th><td>${escapeHtml(request.contact_person)}</td></tr>
                            <tr><th>Position:</th><td>${escapeHtml(request.position || 'Not specified')}</td></tr>
                        </table>
                    </div>
                </div>

                <div class="row mt-3">
                    <div class="col-12">
                        <h6 class="text-muted">Contact Information</h6>
                        <table class="table table-sm">
                            <tr><th>Email:</th><td>${escapeHtml(request.email)}</td></tr>
                            <tr><th>Phone:</th><td>${escapeHtml(request.phone)}</td></tr>
                            <tr><th>Address:</th><td>${escapeHtml(request.address)}</td></tr>
                        </table>
                    </div>
                </div>

                <div class="row mt-3">
                    <div class="col-12">
                        <h6 class="text-muted">Request Details</h6>
                        <div class="card">
                            <div class="card-body">
                                <h6>Subject: ${escapeHtml(request.subject)}</h6>
                                <hr>
                                <h6>Collaboration Areas:</h6>
                                <p>${escapeHtml(request.collaboration).replace(/\n/g, '<br>')}</p>
                                ${request.outcomes ? `
                                    <h6 class="mt-3">Expected Outcomes:</h6>
                                    <p>${escapeHtml(request.outcomes).replace(/\n/g, '<br>')}</p>
                                ` : ''}
                                ${request.additional_info ? `
                                    <h6 class="mt-3">Additional Information:</h6>
                                    <p>${escapeHtml(request.additional_info).replace(/\n/g, '<br>')}</p>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if (attachments.length > 0) {
                content += `
                    <div class="row mt-3">
                        <div class="col-12">
                            <h6 class="text-muted mb-3">Attachments (${attachments.length})</h6>
                            <div class="list-group">
                                ${attachments.map(attachment => `
                                    <div class="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <i class="bi ${getFileIcon(attachment.file_type)} me-2"></i>
                                            ${escapeHtml(attachment.original_name)}
                                            <small class="text-muted d-block">${formatFileSize(attachment.file_size)}</small>
                                        </div>
                                        <div class="btn-group">
                                            <button class="btn btn-sm btn-outline-primary"
                                                    onclick="downloadDocument(${attachment.id})">
                                                <i class="bi bi-download"></i> Download
                                            </button>
                                            <button class="btn btn-sm btn-outline-info"
                                                    onclick="previewFileUniversal(${JSON.stringify({
                                                        id: attachment.id,
                                                        original_name: attachment.original_name,
                                                        storage_path: attachment.storage_path,
                                                        public_url: attachment.public_url,
                                                        request_id: request.request_id,
                                                        partnership_request_id: attachment.partnership_request_id
                                                    }).replace(/"/g, '&quot;')})">
                                                <i class="bi bi-eye"></i> Preview
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            }

            // Add proposal button
            content += `
                <div class="row mt-4">
                    <div class="col-12">
                        <div class="alert alert-success">
                            <i class="bi bi-info-circle"></i>
                            This request has been approved. You can now submit a proposal for collaboration.
                        </div>
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-secondary" data-bs-dismiss="modal">
                                Close
                            </button>
                            <button class="btn btn-success" onclick="submitProposal(${request.request_id})">
                                <i class="bi bi-send-check"></i> Submit Proposal
                            </button>
                        </div>
                    </div>
                </div>
            `;

            const modalContent = document.getElementById('requestDetailsContent');
            if (modalContent) {
                modalContent.innerHTML = content;
                const modal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
                modal.show();
            }
        } else {
            showNotification(result.message, 'warning');
        }
    } catch (error) {
        console.error('Error viewing approved request details:', error);
        showNotification('Failed to load request details', 'danger');
    }
}

// In Partner_Panel.js, update the submitProposal function to pass request data:

function submitProposal(requestId) {
    try {
        // Get request details to pass to the proposal form
        getRequestDetails(requestId).then(result => {
            if (result.status === 'success') {
                const request = result.request;

                // Prepare data to pass to the proposal form
                const proposalData = {
                    requestId: requestId,
                    request_subject: request.subject,
                    organization_name: request.org_name,
                    organization_type: request.org_type,
                    collaboration_areas: request.collaboration,
                    request_description: request.additional_info,
                    partnership_outcomes: request.outcomes,
                    contact_person: request.contact_person,
                    contact_email: request.email,
                    contact_phone: request.phone
                };

                // Encode the data for URL
                const encodedData = encodeURIComponent(JSON.stringify(proposalData));

                // Set the iframe source to SubmitProposal.html with the request data
                const iframe = document.getElementById('proposalFormIframe');
                if (iframe) {
                    iframe.src = `SubmitProposal.html?requestId=${requestId}&data=${encodedData}`;
                }

                // Show the modal
                const modal = new bootstrap.Modal(document.getElementById('submitProposalModal'));
                modal.show();

                // Close any open details modal
                const detailsModal = bootstrap.Modal.getInstance(document.getElementById('requestDetailsModal'));
                if (detailsModal) {
                    detailsModal.hide();
                }

            } else {
                // Fallback: open proposal form without request data
                const iframe = document.getElementById('proposalFormIframe');
                if (iframe) {
                    iframe.src = `SubmitProposal.html?requestId=${requestId}`;
                }

                const modal = new bootstrap.Modal(document.getElementById('submitProposalModal'));
                modal.show();
            }
        }).catch(error => {
            console.error('Error fetching request details:', error);
            // Fallback: open proposal form without request data
            const iframe = document.getElementById('proposalFormIframe');
            if (iframe) {
                iframe.src = `SubmitProposal.html?requestId=${requestId}`;
            }

            const modal = new bootstrap.Modal(document.getElementById('submitProposalModal'));
            modal.show();
        });

    } catch (error) {
        console.error('Error opening proposal form:', error);
        showNotification('Failed to open proposal form', 'danger');
    }
}

function showApprovedRequestsLoading(isLoading) {
    const tbody = document.getElementById('approvedRequestsTableBody');
    const noRequestsMsg = document.getElementById('noApprovedRequestsMessage');

    if (isLoading && tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-success" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading approved requests...</p>
                </td>
            </tr>
        `;
        if (noRequestsMsg) noRequestsMsg.classList.add('d-none');
    }
}

function updateApprovedRequestsCount(count) {
    // You can update a counter element if needed
    console.log(`Total approved requests: ${count}`);
}

// ============================================
// REQUEST DETAILS VIEWING
// ============================================

async function viewRequestDetails(requestId) {
    try {
        const result = await getRequestDetails(requestId);

        if (result.status === 'success') {
            const request = result.request;
            const attachments = result.attachments;

            let content = `
                <div class="row">
                    <div class="col-md-6">
                        <h6 class="text-muted">Request Information</h6>
                        <table class="table table-sm">
                            <tr><th>Request ID:</th><td>#${request.request_id}</td></tr>
                            <tr><th>Status:</th>
                                <td><span class="badge ${getStatusBadgeClass(request.status)}">
                                    ${capitalizeFirst(request.status)}
                                </span></td>
                            </tr>
                            <tr><th>Submitted:</th><td>${formatDate(request.submitted_at)}</td></tr>
                            <tr><th>Last Updated:</th><td>${formatDate(request.updated_at)}</td></tr>
                        </table>
                    </div>
                    <div class="col-md-6">
                        <h6 class="text-muted">Organization Details</h6>
                        <table class="table table-sm">
                            <tr><th>Organization:</th><td>${escapeHtml(request.org_name)}</td></tr>
                            <tr><th>Type:</th><td>${escapeHtml(request.org_type)}</td></tr>
                            <tr><th>Contact Person:</th><td>${escapeHtml(request.contact_person)}</td></tr>
                            <tr><th>Position:</th><td>${escapeHtml(request.position || 'Not specified')}</td></tr>
                        </table>
                    </div>
                </div>

                <div class="row mt-3">
                    <div class="col-12">
                        <h6 class="text-muted">Contact Information</h6>
                        <table class="table table-sm">
                            <tr><th>Email:</th><td>${escapeHtml(request.email)}</td></tr>
                            <tr><th>Phone:</th><td>${escapeHtml(request.phone)}</td></tr>
                            <tr><th>Address:</th><td>${escapeHtml(request.address)}</td></tr>
                        </table>
                    </div>
                </div>

                <div class="row mt-3">
                    <div class="col-12">
                        <h6 class="text-muted">Request Details</h6>
                        <div class="card">
                            <div class="card-body">
                                <h6>Subject: ${escapeHtml(request.subject)}</h6>
                                <hr>
                                <h6>Collaboration Areas:</h6>
                                <p>${escapeHtml(request.collaboration).replace(/\n/g, '<br>')}</p>
                                ${request.outcomes ? `
                                    <h6 class="mt-3">Expected Outcomes:</h6>
                                    <p>${escapeHtml(request.outcomes).replace(/\n/g, '<br>')}</p>
                                ` : ''}
                                ${request.additional_info ? `
                                    <h6 class="mt-3">Additional Information:</h6>
                                    <p>${escapeHtml(request.additional_info).replace(/\n/g, '<br>')}</p>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;

            if (attachments.length > 0) {
                content += `
                    <div class="row mt-3">
                        <div class="col-12">
                            <h6 class="text-muted mb-3">Attachments (${attachments.length})</h6>
                            <div class="list-group">
                                ${attachments.map(attachment => `
                                    <div class="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <i class="bi ${getFileIcon(attachment.file_type)} me-2"></i>
                                            ${escapeHtml(attachment.original_name)}
                                            <small class="text-muted d-block">${formatFileSize(attachment.file_size)}</small>
                                        </div>
                                        <div class="btn-group">
                                            <button class="btn btn-sm btn-outline-primary"
                                                    onclick="downloadDocument(${attachment.id})">
                                                <i class="bi bi-download"></i> Download
                                            </button>
                                            <button class="btn btn-sm btn-outline-info"
                                                    onclick="previewFileUniversal(${JSON.stringify({
                                                        id: attachment.id,
                                                        original_name: attachment.original_name,
                                                        storage_path: attachment.storage_path,
                                                        public_url: attachment.public_url,
                                                        request_id: request.request_id,
                                                        partnership_request_id: attachment.partnership_request_id
                                                    }).replace(/"/g, '&quot;')})">
                                                <i class="bi bi-eye"></i> Preview
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
            } else {
                content += `
                    <div class="row mt-3">
                        <div class="col-12">
                            <div class="alert alert-info">
                                <i class="bi bi-info-circle"></i> No attachments found for this request.
                            </div>
                        </div>
                    </div>
                `;
            }

            // Add action buttons for pending requests
            if (request.status === 'pending') {
                content += `
                    <div class="row mt-4">
                        <div class="col-12">
                            <div class="d-flex justify-content-end gap-2">
                                <button class="btn btn-warning" onclick="editRequest(${request.request_id})">
                                    <i class="bi bi-pencil"></i> Edit Request
                                </button>
                                <button class="btn btn-danger" onclick="cancelRequestFromModal(${request.request_id})">
                                    <i class="bi bi-x-circle"></i> Cancel Request
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }

            const modalContent = document.getElementById('requestDetailsContent');
            if (modalContent) {
                modalContent.innerHTML = content;
                const modal = new bootstrap.Modal(document.getElementById('requestDetailsModal'));
                modal.show();
            }
        } else {
            showNotification(result.message, 'warning');
        }
    } catch (error) {
        console.error('Error viewing request details:', error);
        showNotification('Failed to load request details', 'danger');
    }
}

async function viewRequestAttachments(requestId) {
    try {
        const result = await getRequestDetails(requestId);

        if (result.status === 'success' && result.attachments.length > 0) {
            const attachments = result.attachments;

            let content = `
                <div class="alert alert-info">
                    <i class="bi bi-info-circle"></i>
                    Found ${attachments.length} attachment(s) for Request #${requestId}
                </div>

                <div class="row">
                    ${attachments.map(attachment => `
                        <div class="col-md-6 mb-3">
                            <div class="card h-100">
                                <div class="card-body">
                                    <div class="d-flex align-items-center mb-3">
                                        <div class="bg-primary bg-opacity-10 rounded p-2 me-3">
                                            <i class="bi ${getFileIcon(attachment.file_type)} fs-4"></i>
                                        </div>
                                        <div class="flex-grow-1" style="min-width: 0;">
                                            <h6 class="card-title mb-1 text-truncate" title="${escapeHtml(attachment.original_name)}">
                                                ${escapeHtml(attachment.original_name)}
                                            </h6>
                                            <small class="text-muted">${formatFileSize(attachment.file_size)} • ${getFileTypeBadge(attachment.file_type)}</small>
                                        </div>
                                    </div>
                                    <div class="btn-group w-100">
                                        <button class="btn btn-outline-primary btn-sm"
                                                onclick="downloadDocument(${attachment.id})">
                                            <i class="bi bi-download"></i> Download
                                        </button>
                                        <button class="btn btn-outline-secondary btn-sm"
                                                onclick="previewFileUniversal(${JSON.stringify({
                                                    id: attachment.id,
                                                    original_name: attachment.original_name,
                                                    storage_path: attachment.storage_path,
                                                    public_url: attachment.public_url,
                                                    request_id: requestId,
                                                    partnership_request_id: attachment.partnership_request_id
                                                }).replace(/"/g, '&quot;')})">
                                            <i class="bi bi-eye"></i> Preview
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            const modalHtml = `
                <div class="modal fade" id="attachmentsModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header bg-info text-white">
                                <h5 class="modal-title">Attachments for Request #${requestId}</h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                            </div>
                            <div class="modal-body">
                                ${content}
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const existingModal = document.getElementById('attachmentsModal');
            if (existingModal) existingModal.remove();

            document.body.insertAdjacentHTML('beforeend', modalHtml);
            const modal = new bootstrap.Modal(document.getElementById('attachmentsModal'));
            modal.show();
        } else {
            showNotification('No attachments found for this request', 'info');
        }
    } catch (error) {
        console.error('Error viewing attachments:', error);
        showNotification('Failed to load attachments', 'danger');
    }
}

// ============================================
// EDIT FUNCTIONALITY
// ============================================

async function editRequest(requestId) {
    try {
        const user = getCurrentUser();
        if (!user?.email) {
            showNotification('Please log in to edit requests', 'danger');
            return;
        }

        const { data: request, error: requestError } = await supabase
            .from('partnership_requests')
            .select('*')
            .eq('request_id', requestId)
            .single();

        if (requestError || !request) {
            showNotification('Request not found', 'danger');
            return;
        }

        if (request.email !== user.email) {
            showNotification('You can only edit your own requests', 'danger');
            return;
        }

        if (request.status !== 'pending') {
            showNotification(`Cannot edit request with status: ${request.status}. Only pending requests can be edited.`, 'warning');
            return;
        }

        const { data: attachments } = await supabase
            .from('uploaded_files')
            .select('*')
            .eq('partnership_request_id', requestId)
            .eq('category', 'partnership_request');

        showEditModal(request, attachments || []);

    } catch (error) {
        console.error('Error in editRequest:', error);
        showNotification('Failed to load request for editing', 'danger');
    }
}

function showEditModal(request, attachments) {
    const letterDate = request.letter_date ? new Date(request.letter_date).toISOString().split('T')[0] : '';

    const modalHtml = `
        <div class="modal fade" id="editModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-scrollable">
                <div class="modal-content">
                    <div class="modal-header bg-warning text-dark">
                        <h5 class="modal-title">
                            <i class="bi bi-pencil-square"></i> Edit Partnership Request #${request.request_id}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="editForm">
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
                                        ${PARTNER_CONFIG.ORG_TYPES.map(type => `
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

                            <div class="row mb-3">
                                <div class="col-12">
                                    <label class="form-label">Collaboration Areas *</label>
                                    <textarea class="form-control" name="collaboration" rows="3" required>${escapeHtml(request.collaboration)}</textarea>
                                </div>
                            </div>

                            <div class="row mb-3">
                                <div class="col-12">
                                    <label class="form-label">Expected Outcomes</label>
                                    <textarea class="form-control" name="outcomes" rows="3">${escapeHtml(request.outcomes || '')}</textarea>
                                </div>
                            </div>

                            <div class="row mb-3">
                                <div class="col-12">
                                    <label class="form-label">Additional Information</label>
                                    <textarea class="form-control" name="additional_info" rows="3">${escapeHtml(request.additional_info || '')}</textarea>
                                </div>
                            </div>

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
                                                    '<div class="alert alert-light mb-0"><i class="bi bi-info-circle"></i> No files attached</div>'
                                                }
                                            </div>

                                            <div id="newAttachments">
                                                <h6 class="text-muted mb-3">Add New Files:</h6>
                                                <div class="mb-3">
                                                    <input type="file" class="form-control" id="newFiles" multiple
                                                           accept="${PARTNER_CONFIG.SUPPORTED_FILE_TYPES.join(',')}">
                                                    <small class="text-muted">Max ${PARTNER_CONFIG.UPLOAD_LIMIT_MB}MB per file. Supported: ${PARTNER_CONFIG.SUPPORTED_FILE_TYPES.join(', ')}</small>
                                                </div>
                                                <div id="filePreview" class="mt-3"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

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

    const existingModal = document.getElementById('editModal');
    if (existingModal) existingModal.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    const form = document.getElementById('editForm');
    form.addEventListener('submit', (e) => handleEditSubmit(e, request.request_id, modal));

    const fileInput = document.getElementById('newFiles');
    fileInput.addEventListener('change', handleFilePreview);

    modal.show();
}

async function handleEditSubmit(e, requestId, modal) {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Updating...';

        const formData = new FormData(form);
        const requestData = Object.fromEntries(formData.entries());

        const requiredFields = ['letter_date', 'subject', 'org_name', 'org_type', 'address',
                              'contact_person', 'email', 'phone', 'collaboration'];
        for (const field of requiredFields) {
            if (!requestData[field]?.trim()) {
                throw new Error(`Please fill in the ${field.replace('_', ' ')} field`);
            }
        }

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

        const { error: updateError } = await supabase
            .from('partnership_requests')
            .update(updateData)
            .eq('request_id', requestId);

        if (updateError) throw new Error(`Failed to update request: ${updateError.message}`);

        const fileInput = document.getElementById('newFiles');
        if (fileInput.files.length > 0) {
            await uploadNewFiles(requestId, fileInput.files);
        }

        modal.hide();
        showNotification('Partnership request updated successfully!', 'success');

        setTimeout(() => {
            loadPartnershipRequests();
            const user = getCurrentUser();
            if (user?.email) {
                loadDashboardData(user.email);
                loadRecentRequests(user.email);
            }
        }, 1000);

    } catch (error) {
        console.error('Error updating request:', error);
        showNotification(error.message, 'danger');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

function handleFilePreview(e) {
    const fileList = e.target.files;
    const previewDiv = document.getElementById('filePreview');

    if (!previewDiv) return;
    previewDiv.innerHTML = '';

    if (fileList.length === 0) return;

    const maxSize = PARTNER_CONFIG.MAX_FILE_SIZE;
    const validFiles = [];
    const invalidFiles = [];

    Array.from(fileList).forEach(file => {
        if (file.size > maxSize) {
            invalidFiles.push(file.name);
        } else {
            validFiles.push(file);
        }
    });

    if (invalidFiles.length > 0) {
        const warningDiv = document.createElement('div');
        warningDiv.className = 'alert alert-warning';
        warningDiv.innerHTML = `
            <i class="bi bi-exclamation-triangle"></i>
            <strong>The following files exceed ${PARTNER_CONFIG.UPLOAD_LIMIT_MB}MB limit and will not be uploaded:</strong>
            <ul class="mb-0">
                ${invalidFiles.map(name => `<li>${escapeHtml(name)}</li>`).join('')}
            </ul>
        `;
        previewDiv.appendChild(warningDiv);
    }

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

async function uploadNewFiles(requestId, files) {
    const user = getCurrentUser();
    if (!user?.email) throw new Error('User not authenticated');

    const maxSize = PARTNER_CONFIG.MAX_FILE_SIZE;
    const validFiles = Array.from(files).filter(file => file.size <= maxSize);

    if (validFiles.length === 0) return;

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
            const timestamp = Date.now();
            const uniqueName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = `${requestId}/${uniqueName}`;

            const { error: uploadError } = await supabase.storage
                .from(PARTNER_CONFIG.STORAGE_BUCKET)
                .upload(filePath, file);

            if (uploadError) throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);

            const { data: { publicUrl } } = supabase.storage
                .from(PARTNER_CONFIG.STORAGE_BUCKET)
                .getPublicUrl(filePath);

            const { error: dbError } = await supabase
                .from('uploaded_files')
                .insert({
                    original_name: file.name,
                    storage_path: `${PARTNER_CONFIG.STORAGE_BUCKET}/${filePath}`,
                    file_type: file.type || 'application/octet-stream',
                    file_size: file.size,
                    public_url: publicUrl,
                    category: 'partnership_request',
                    partnership_request_id: requestId,
                    uploaded_by: user.user_id || null,
                    description: `Uploaded with request #${requestId}`
                });

            if (dbError) {
                await supabase.storage.from(PARTNER_CONFIG.STORAGE_BUCKET).remove([filePath]);
                throw new Error(`Failed to save file metadata for ${file.name}`);
            }

        } catch (error) {
            console.error(`Error uploading ${file.name}:`, error);
            showNotification(`Failed to upload ${file.name}: ${error.message}`, 'warning');
        }
    }
}

async function removeAttachment(fileId, fileName, requestId) {
    if (!confirm(`Are you sure you want to remove "${fileName}"? This will permanently delete the file.`)) {
        return;
    }

    try {
        // Use central delete function if available
        if (window.supabaseAuth && window.supabaseAuth.partner && window.supabaseAuth.partner.deletePartnerFile) {
            const result = await window.supabaseAuth.partner.deletePartnerFile(fileId);
            if (result.success) {
                showNotification(`File "${fileName}" removed successfully`, 'success');

                // Refresh the modal
                setTimeout(async () => {
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
                        const existingModal = document.getElementById('editModal');
                        if (existingModal) {
                            const modal = bootstrap.Modal.getInstance(existingModal);
                            if (modal) modal.hide();
                            existingModal.remove();
                        }
                        showEditModal(request, attachments || []);
                    }
                }, 500);
            } else {
                throw new Error(result.message);
            }
            return;
        }

        // Fallback to local implementation
        const { data: file, error: fetchError } = await supabase
            .from('uploaded_files')
            .select('storage_path')
            .eq('id', fileId)
            .single();

        if (fetchError) throw new Error('File not found');

        const filePath = file.storage_path.replace(`${PARTNER_CONFIG.STORAGE_BUCKET}/`, '');
        await supabase.storage.from(PARTNER_CONFIG.STORAGE_BUCKET).remove([filePath]);

        const { error: dbError } = await supabase
            .from('uploaded_files')
            .delete()
            .eq('id', fileId);

        if (dbError) throw new Error(`Failed to delete file record: ${dbError.message}`);

        showNotification(`File "${fileName}" removed successfully`, 'success');

        setTimeout(async () => {
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
                const existingModal = document.getElementById('editModal');
                if (existingModal) {
                    const modal = bootstrap.Modal.getInstance(existingModal);
                    if (modal) modal.hide();
                    existingModal.remove();
                }
                showEditModal(request, attachments || []);
            }
        }, 500);

    } catch (error) {
        console.error('Error removing attachment:', error);
        showNotification(`Failed to remove file: ${error.message}`, 'danger');
    }
}

// ============================================
// CANCEL REQUEST FUNCTIONALITY
// ============================================

async function cancelRequest(requestId) {
    if (!confirm('Are you sure you want to cancel this partnership request? This action cannot be undone.')) {
        return;
    }

    try {
        const user = getCurrentUser();
        if (!user?.email) {
            showNotification('Please log in to cancel requests', 'danger');
            return;
        }

        // Verify request belongs to user
        const { data: request, error: fetchError } = await supabase
            .from('partnership_requests')
            .select('email, status')
            .eq('request_id', requestId)
            .single();

        if (fetchError || !request) {
            showNotification('Request not found', 'danger');
            return;
        }

        if (request.email !== user.email) {
            showNotification('You can only cancel your own requests', 'danger');
            return;
        }

        if (request.status !== 'pending') {
            showNotification(`Cannot cancel request with status: ${request.status}. Only pending requests can be cancelled.`, 'warning');
            return;
        }

        // Update request status to cancelled
        const { error: updateError } = await supabase
            .from('partnership_requests')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString()
            })
            .eq('request_id', requestId);

        if (updateError) {
            throw new Error(`Failed to cancel request: ${updateError.message}`);
        }

        showNotification('Partnership request cancelled successfully!', 'success');

        // Refresh the UI
        setTimeout(() => {
            loadPartnershipRequests();
            const user = getCurrentUser();
            if (user?.email) {
                loadDashboardData(user.email);
                loadRecentRequests(user.email);
            }

            // Close any open modals
            const modal = bootstrap.Modal.getInstance(document.getElementById('requestDetailsModal'));
            if (modal) modal.hide();
        }, 1000);

    } catch (error) {
        console.error('Error cancelling request:', error);
        showNotification(`Failed to cancel request: ${error.message}`, 'danger');
    }
}

async function cancelRequestFromModal(requestId) {
    // Close the current modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('requestDetailsModal'));
    if (modal) modal.hide();

    // Call cancel function
    await cancelRequest(requestId);
}

// ============================================
// DOCUMENTS SECTION FUNCTIONS
// ============================================

async function loadDocumentsSection() {
    try {
        const user = getCurrentUser();
        const userEmail = user?.email;

        if (!userEmail) {
            showNotification('Please log in to view documents', 'warning');
            return;
        }

        showDocumentsLoading(true);
        const result = await getPartnerDocumentsFromUploadedFiles(userEmail);

        if (result.success) {
            updateDocumentsCount(result.count);
            renderDocumentsTable(result.documents);
            const noDocsMsg = document.getElementById('noDocumentsMessage');
            if (noDocsMsg) noDocsMsg.classList.toggle('d-none', result.count > 0);
        } else {
            showNotification(result.message, 'danger');
            renderDocumentsTable([]);
        }
    } catch (error) {
        console.error('Error loading documents:', error);
        showNotification('Failed to load documents', 'danger');
        renderDocumentsTable([]);
    } finally {
        showDocumentsLoading(false);
    }
}

function renderDocumentsTable(documents) {
    const tbody = document.getElementById('documentsTableBody');
    if (!tbody) return;

    if (!documents || documents.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center text-muted py-5">
                    <i class="bi bi-folder-x fs-1"></i>
                    <p class="mt-3">No documents found</p>
                    <p class="text-muted small">Documents will appear here after you submit partnership requests.</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = documents.map(doc => `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    <i class="bi ${doc.file_icon} fs-4 me-3"></i>
                    <div class="flex-grow-1" style="min-width: 0;">
                        <strong class="d-block text-truncate" title="${escapeHtml(doc.original_name)}" style="max-width: 250px;">
                            ${escapeHtml(doc.original_name)}
                        </strong>
                        <small class="text-muted">${escapeHtml(doc.description || 'No description')}</small>
                    </div>
                </div>
            </td>
            <td><span class="badge bg-light text-dark">${getFileTypeBadge(doc.file_type)}</span></td>
            <td>${formatFileSize(doc.file_size)}</td>
            <td>${doc.request_id === 'N/A' ? '<span class="text-muted">N/A</span>' : `<span class="badge bg-secondary">#${doc.request_id}</span>`}</td>
            <td>${formatDate(doc.uploaded_at)}</td>
            <td>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-primary" onclick="downloadDocument(${doc.id})" title="Download">
                        <i class="bi bi-download"></i>
                    </button>
                    <button class="btn btn-outline-info"
                            onclick="previewFileUniversal(${JSON.stringify({
                                id: doc.id,
                                original_name: doc.original_name,
                                storage_path: doc.storage_path,
                                public_url: doc.public_url,
                                request_id: doc.request_id
                            }).replace(/"/g, '&quot;')})"
                            title="Preview">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function updateDocumentsCount(count) {
    const countElement = document.getElementById('documentsCount');
    if (countElement) {
        countElement.innerHTML = `
            <i class="bi bi-folder"></i>
            <strong>${count}</strong> document${count !== 1 ? 's' : ''} found
            ${count > 0 ? ` • Last updated: ${new Date().toLocaleTimeString()}` : ''}
        `;
    }
}

function showDocumentsLoading(isLoading) {
    const tbody = document.getElementById('documentsTableBody');
    const noDocsMsg = document.getElementById('noDocumentsMessage');

    if (isLoading && tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading documents...</p>
                </td>
            </tr>
        `;
        if (noDocsMsg) noDocsMsg.classList.add('d-none');
    }
}

// ============================================
// DASHBOARD FUNCTIONS
// ============================================

async function loadDashboardData(email) {
    try {
        const result = await getPartnerStats(email);

        if (result.status === 'success') {
            document.getElementById('totalRequestsCount').textContent = result.stats.total_requests;
            document.getElementById('approvedRequestsCount').textContent = result.stats.approved_requests;
            document.getElementById('pendingRequestsCount').textContent = result.stats.pending_requests;
            document.getElementById('activeProjectsCount').textContent = result.stats.active_projects;

            const recentRequests = await getPartnerRequests(email, { limit: 1 });
            if (recentRequests.status === 'success' && recentRequests.requests.length > 0) {
                const recentRequest = recentRequests.requests[0];
                document.getElementById('orgNameDisplay').textContent = recentRequest.org_name;
                document.getElementById('orgTypeDisplay').textContent = recentRequest.org_type;
                document.getElementById('orgEmailDisplay').textContent = recentRequest.email;
            }
        }
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

async function loadRecentRequests(email) {
    try {
        const result = await getPartnerRequests(email, { limit: 5 });
        if (result.status === 'success') {
            renderRecentRequests(result.requests);
        }
    } catch (error) {
        console.error('Error loading recent requests:', error);
    }
}

function renderRecentRequests(requests) {
    const container = document.getElementById('recentRequests');
    if (!container) return;

    if (!requests || requests.length === 0) {
        container.innerHTML = `
            <div class="list-group-item text-center text-muted py-4">
                <i class="bi bi-file-earmark-text fs-1"></i>
                <p class="mt-2">No requests yet</p>
                <button class="btn btn-sm btn-primary" onclick="showNewRequestModal()">
                    Create your first request
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = requests.map(request => `
        <div class="list-group-item list-group-item-action">
            <div class="d-flex w-100 justify-content-between">
                <h6 class="mb-1 text-truncate" style="max-width: 70%;" title="${escapeHtml(request.subject)}">
                    ${escapeHtml(request.subject)}
                </h6>
                <small class="text-muted">${formatRelativeTime(request.submitted_at)}</small>
            </div>
            <p class="mb-1 small text-muted text-truncate" style="max-width: 90%;" title="${escapeHtml(request.org_name)}">
                ${escapeHtml(request.org_name)}
            </p>
            <div class="d-flex justify-content-between align-items-center">
                <span class="badge ${getStatusBadgeClass(request.status)}">${capitalizeFirst(request.status)}</span>
                <div class="btn-group btn-group-sm">
                    <button class="btn btn-sm btn-outline-primary" onclick="viewRequestDetails(${request.request_id})">View</button>
                </div>
            </div>
        </div>
    `).join('');
}

// ============================================
// UI HELPER FUNCTIONS
// ============================================

function showRequestsLoading(isLoading) {
    const tbody = document.getElementById('requestsTableBody');
    if (!tbody) return;

    if (isLoading) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <p class="mt-2">Loading partnership requests...</p>
                </td>
            </tr>
        `;
    }
}

function updateRequestsCount(count) {
    const countElement = document.getElementById('totalRequestsCount');
    if (countElement) {
        countElement.textContent = count;
    }
}

function showNewRequestModal() {
    const modal = new bootstrap.Modal(document.getElementById('newRequestModal'));
    modal.show();
}

// ============================================
// NAVIGATION FUNCTIONS
// ============================================

function showSection(sectionName) {
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('d-none');
    });

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });

    const sectionElement = document.getElementById(`${sectionName}-section`);
    if (sectionElement) {
        sectionElement.classList.remove('d-none');
    }

    const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    const sectionTitle = document.getElementById('sectionTitle');
    if (sectionTitle) {
        sectionTitle.textContent = getSectionTitle(sectionName);
    }

    loadSectionData(sectionName);
}

function getSectionTitle(sectionName) {
    const titles = {
        'dashboard': 'Partner Dashboard',
        'requests': 'Partnership Requests',
        'approved-requests': 'Approved Requests',
        'projects': 'Active Projects',
        'documents': 'Documents & Attachments',
        'profile': 'Organization Profile'
    };
    return titles[sectionName] || 'Partner Panel';
}

function loadSectionData(sectionName) {
    const user = getCurrentUser();
    const userEmail = user?.email;

    if (!userEmail) {
        showNotification('Please log in to view data', 'warning');
        return;
    }

    switch (sectionName) {
        case 'dashboard':
            loadDashboardData(userEmail);
            loadRecentRequests(userEmail);
            break;
        case 'requests':
            loadPartnershipRequests();
            break;
        case 'approved-requests':
            loadApprovedRequests();
            break;
        case 'documents':
            loadDocumentsSection();
            break;
        default:
            loadDashboardData(userEmail);
            loadRecentRequests(userEmail);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

function initializeEventListeners() {
    document.querySelectorAll('.nav-link[data-section]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
        });
    });

    const documentsLink = document.getElementById('documents-link');
    if (documentsLink) {
        documentsLink.addEventListener('click', function(e) {
            e.preventDefault();
            loadDocumentsSection();
        });
    }

    const approvedRequestsLink = document.getElementById('approved-requests-link');
    if (approvedRequestsLink) {
        approvedRequestsLink.addEventListener('click', function(e) {
            e.preventDefault();
            loadApprovedRequests();
        });
    }

    const refreshDocsBtn = document.getElementById('refresh-documents-btn');
    if (refreshDocsBtn) {
        refreshDocsBtn.addEventListener('click', loadDocumentsSection);
    }

    const refreshApprovedBtn = document.getElementById('refresh-approved-requests-btn');
    if (refreshApprovedBtn) {
        refreshApprovedBtn.addEventListener('click', loadApprovedRequests);
    }

    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', loadPartnershipRequests);
    }

    const searchRequests = document.getElementById('searchRequests');
    if (searchRequests) {
        searchRequests.addEventListener('input', debounce(function() {
            loadPartnershipRequests();
        }, 300));
    }

    const searchApprovedRequests = document.getElementById('searchApprovedRequests');
    if (searchApprovedRequests) {
        searchApprovedRequests.addEventListener('input', debounce(function() {
            loadApprovedRequests();
        }, 300));
    }

    const orgTypeFilter = document.getElementById('orgTypeFilter');
    if (orgTypeFilter) {
        orgTypeFilter.addEventListener('change', loadApprovedRequests);
    }

    const refreshRequestsBtn = document.getElementById('refresh-requests-btn');
    if (refreshRequestsBtn) {
        refreshRequestsBtn.addEventListener('click', loadPartnershipRequests);
    }

    const newRequestBtn = document.getElementById('new-request-btn');
    if (newRequestBtn) {
        newRequestBtn.addEventListener('click', showNewRequestModal);
    }

    const quickActionBtn = document.getElementById('quick-action-new-request');
    if (quickActionBtn) {
        quickActionBtn.addEventListener('click', showNewRequestModal);
    }

    const newRequestLink = document.getElementById('new-request-link');
    if (newRequestLink) {
        newRequestLink.addEventListener('click', function(e) {
            e.preventDefault();
            showNewRequestModal();
        });
    }

    const refreshRecentBtn = document.getElementById('refresh-recent-requests');
    if (refreshRecentBtn) {
        refreshRecentBtn.addEventListener('click', function() {
            const user = getCurrentUser();
            if (user?.email) loadRecentRequests(user.email);
        });
    }

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'partnershipSubmitted' && event.data.success) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('newRequestModal'));
            if (modal) modal.hide();

            const user = getCurrentUser();
            if (user?.email) {
                loadDashboardData(user.email);
                loadRecentRequests(user.email);
                loadPartnershipRequests();
                loadDocumentsSection();
            }
        }
    });
}

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', async function() {
    const user = getCurrentUser();

    if (!user) {
        window.location.href = '../HTML/LogIn.html';
        return;
    }

    // Check and set correct bucket name
    console.log("🚀 Initializing Partner Panel...");
    const bucketName = await checkBucketsAndFix();
    PARTNER_CONFIG.STORAGE_BUCKET = bucketName || 'Uploads';
    console.log(`✅ Storage bucket set to: ${PARTNER_CONFIG.STORAGE_BUCKET}`);

    const userWelcome = document.getElementById('userWelcome');
    if (userWelcome) {
        userWelcome.textContent = `Welcome back, ${user.username || user.email}!`;
    }

    initializeEventListeners();
    showSection('dashboard');
});

function logout() {
    // Show confirmation dialog
    if (confirm('Are you sure you want to logout?')) {
        // Clear all local storage items
        localStorage.removeItem('user');
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('sessionExpiry');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userId');
        localStorage.removeItem('username');
        localStorage.removeItem('lastLogin');

        // Show logout notification
        showNotification('Logged out successfully!', 'info');

        // Redirect to login page after a short delay
        setTimeout(() => {
            window.location.href = '../HTML/LogIn.html';
        }, 1000);
    }
}

// ============================================
// GLOBAL EXPORTS
// ============================================

window.downloadDocument = downloadDocument;
window.downloadAllRequestAttachments = downloadAllRequestAttachments;
window.downloadRequestDocuments = downloadRequestDocuments;
window.viewRequestDetails = viewRequestDetails;
window.viewApprovedRequestDetails = viewApprovedRequestDetails;
window.viewRequestAttachments = viewRequestAttachments;
window.editRequest = editRequest;
window.removeAttachment = removeAttachment;
window.cancelRequest = cancelRequest;
window.cancelRequestFromModal = cancelRequestFromModal;
window.showNewRequestModal = showNewRequestModal;
window.submitProposal = submitProposal;
window.showNotification = showNotification;
window.logout = logout;
window.loadPartnershipRequests = loadPartnershipRequests;
window.loadApprovedRequests = loadApprovedRequests;
window.loadDocumentsSection = loadDocumentsSection;
window.getCurrentUser = getCurrentUser;
window.escapeHtml = escapeHtml;
window.formatFileSize = formatFileSize;
window.previewFileUniversal = previewFileUniversal;
window.getFileUrl = getFileUrl;