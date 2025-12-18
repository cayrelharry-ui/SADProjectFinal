/**
 * CancelRequest.js
 * Handles partnership request cancellation functionality with file deletion
 */

// ============================================
// CONFIGURATION
// ============================================

// Get configuration from db_connection.js
const CANCEL_CONFIG = window.getPartnerConfig ? window.getPartnerConfig() : {
    STORAGE_BUCKET: 'Uploads'
};

// Get Supabase client (reuse global client from db_connection.js)
var supabase = window.supabaseClient || null;
if (!supabase && window.supabase && window.supabase.createClient && CANCEL_CONFIG.SUPABASE_URL && CANCEL_CONFIG.SUPABASE_ANON_KEY) {
    supabase = window.supabase.createClient(
        CANCEL_CONFIG.SUPABASE_URL,
        CANCEL_CONFIG.SUPABASE_ANON_KEY
    );
}

// ============================================
// FILE DELETION FUNCTIONS
// ============================================

/**
 * Delete a file from storage by its path
 * @param {string} storagePath - The storage path of the file
 * @param {string} bucketName - The bucket name (default: from config)
 * @returns {Promise<Object>} Result of the deletion
 */
async function deleteFileFromStorage(storagePath, bucketName = CANCEL_CONFIG.STORAGE_BUCKET) {
    try {
        console.log(`Deleting file from storage: ${storagePath} in bucket: ${bucketName}`);

        // Extract file path from storage path
        let filePath = storagePath;

        // Check if storage_path contains bucket name
        if (storagePath.includes('/')) {
            const possibleBuckets = [CANCEL_CONFIG.STORAGE_BUCKET, 'Uploads', 'uploads', 'project-images'];
            for (const bucket of possibleBuckets) {
                if (storagePath.startsWith(bucket + '/')) {
                    filePath = storagePath.substring(bucket.length + 1);
                    break;
                }
            }
        }

        // Delete from storage
        const { data, error } = await supabase.storage
            .from(bucketName)
            .remove([filePath]);

        if (error) {
            console.error('Error deleting file from storage:', error);

            const { data: altData, error: altError } = await supabase.storage
                .from(CANCEL_CONFIG.STORAGE_BUCKET)
                .remove([storagePath]);

            if (altError) {
                throw new Error(`Failed to delete file from storage: ${altError.message}`);
            }

            return {
                success: true,
                message: 'File deleted from storage'
            };
        }

        return {
            success: true,
            message: 'File deleted from storage'
        };
    } catch (error) {
        console.error('deleteFileFromStorage error:', error);
        return {
            success: false,
            message: error.message || 'Failed to delete file from storage'
        };
    }
}

/**
 * Delete all attachments for a partnership request
 * @param {number} requestId - The partnership request ID
 * @returns {Promise<Object>} Result of the deletion
 */
async function deleteRequestAttachments(requestId) {
    try {
        // Get all attachments for the request
        const { data: attachments, error } = await supabase
            .from('uploaded_files')
            .select('id, storage_path')
            .eq('partnership_request_id', requestId)
            .eq('category', 'partnership_request');

        if (error) {
            console.error('Error fetching attachments:', error);
            return {
                success: false,
                message: 'Failed to fetch attachments'
            };
        }

        if (!attachments || attachments.length === 0) {
            return {
                success: true,
                message: 'No attachments to delete',
                deletedCount: 0
            };
        }

        let deletedCount = 0;
        let errors = [];

        // Delete each file from storage
        for (const attachment of attachments) {
            try {
                const result = await deleteFileFromStorage(attachment.storage_path, CANCEL_CONFIG.STORAGE_BUCKET);
                if (result.success) {
                    deletedCount++;
                } else {
                    errors.push(`Failed to delete file: ${attachment.storage_path}`);
                }
            } catch (fileError) {
                console.error(`Error deleting file ${attachment.storage_path}:`, fileError);
                errors.push(`Error deleting file: ${attachment.storage_path}`);
            }
        }

        // Delete records from uploaded_files table
        const { error: deleteDbError } = await supabase
            .from('uploaded_files')
            .delete()
            .eq('partnership_request_id', requestId)
            .eq('category', 'partnership_request');

        if (deleteDbError) {
            console.error('Error deleting attachment records:', deleteDbError);
            errors.push('Failed to delete attachment records from database');
        }

        if (errors.length > 0) {
            return {
                success: false,
                message: `Partial success: ${deletedCount} files deleted, but encountered errors: ${errors.join(', ')}`,
                deletedCount,
                errors
            };
        }

        return {
            success: true,
            message: `Successfully deleted ${deletedCount} attachment(s)`,
            deletedCount
        };
    } catch (error) {
        console.error('deleteRequestAttachments error:', error);
        return {
            success: false,
            message: error.message || 'Failed to delete attachments'
        };
    }
}

// ============================================
// CANCEL REQUEST FUNCTION
// ============================================

/**
 * Cancel a partnership request with file deletion
 * @param {number} requestId - The partnership request ID
 * @param {boolean} fromModal - Whether called from modal view
 * @returns {Promise<void>}
 */
async function cancelRequest(requestId, fromModal = false) {
    const warningMessage = `Are you sure you want to cancel Partnership Request #${requestId}?

⚠️ **WARNING: This action cannot be undone!**

This will:
1. **Cancel** the partnership request (status will be changed to "cancelled")
2. **Permanently delete** all associated attachments from storage
3. **Remove** attachment records from the database

Please ensure you have downloaded any important files before proceeding.`;

    if (!confirm(warningMessage)) {
        return;
    }

    try {
        // Show loading
        if (typeof showStatusMessage === 'function') {
            showStatusMessage('Cancelling request and deleting attachments...', 'info');
        }

        // If called from modal, show processing in modal
        if (fromModal && typeof viewRequestDetails === 'function') {
            const modalContent = document.getElementById('requestDetailsContent');
            if (modalContent) {
                modalContent.innerHTML = `
                    <div class="text-center py-4">
                        <div class="spinner-border text-warning" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-3">Cancelling request and deleting attachments...</p>
                        <small class="text-muted">Please wait while we process your request...</small>
                    </div>
                `;
            }
        }

        // Step 1: Delete all attachments from storage and database
        const deleteResult = await deleteRequestAttachments(requestId);

        if (!deleteResult.success) {
            console.warn('Attachment deletion had issues:', deleteResult.message);
            // Continue with request cancellation even if attachment deletion had issues
        }

        // Step 2: Get current request details to preserve additional_info
        const { data: currentRequest, error: fetchError } = await supabase
            .from('partnership_requests')
            .select('additional_info')
            .eq('request_id', requestId)
            .single();

        let updatedAdditionalInfo = `[Request cancelled by partner on ${new Date().toLocaleDateString()}]`;

        if (!fetchError && currentRequest && currentRequest.additional_info) {
            updatedAdditionalInfo = `${currentRequest.additional_info}\n\n${updatedAdditionalInfo}`;
        }

        // Step 3: Update request status to 'cancelled'
        const { error: updateError } = await supabase
            .from('partnership_requests')
            .update({
                status: 'cancelled',
                updated_at: new Date().toISOString(),
                additional_info: updatedAdditionalInfo
            })
            .eq('request_id', requestId);

        if (updateError) {
            throw new Error(`Failed to update request status: ${updateError.message}`);
        }

        // Show success message with details
        let successMessage = '✅ Request cancelled successfully!';
        if (deleteResult.success && deleteResult.deletedCount > 0) {
            successMessage += ` ${deleteResult.deletedCount} attachment(s) were deleted from storage.`;
        } else if (deleteResult.message && deleteResult.deletedCount > 0) {
            successMessage += ` ${deleteResult.message}`;
        } else if (deleteResult.message) {
            successMessage += ` Note: ${deleteResult.message}`;
        }

        if (typeof showToast === 'function') {
            showToast('Success', successMessage, 'success');
        }

        // Close modal if opened from modal
        if (fromModal) {
            const modal = bootstrap.Modal.getInstance(document.getElementById('requestDetailsModal'));
            if (modal) {
                modal.hide();
            }
        }

        // Refresh the requests table and dashboard
        setTimeout(() => {
            if (typeof loadPartnershipRequests === 'function') {
                loadPartnershipRequests();
            }

            // Also update dashboard stats
            if (typeof getCurrentUser === 'function') {
                const user = getCurrentUser();
                if (user?.email) {
                    if (typeof loadDashboardData === 'function') {
                        loadDashboardData(user.email);
                    }
                    if (typeof loadRecentRequests === 'function') {
                        loadRecentRequests(user.email);
                    }
                }
            }
        }, 1000);

    } catch (error) {
        console.error('Error cancelling request:', error);
        if (typeof showToast === 'function') {
            showToast('Error', `Failed to cancel request: ${error.message}`, 'danger');
        }

        // Restore modal content if error occurred
        if (fromModal && typeof viewRequestDetails === 'function') {
            setTimeout(() => {
                viewRequestDetails(requestId);
            }, 500);
        }
    }
}

// ============================================
// MAKE FUNCTIONS GLOBALLY AVAILABLE
// ============================================

window.deleteFileFromStorage = deleteFileFromStorage;
window.deleteRequestAttachments = deleteRequestAttachments;
window.cancelRequest = cancelRequest;

console.log('✅ CancelRequest.js loaded successfully');