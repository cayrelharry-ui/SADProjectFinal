/**
 * DeleteFile.js - Handle file deletion from Supabase Storage and Database
 */

import { supabase } from './db_connection.js';

const STORAGE_BUCKET = 'Uploads';

/**
 * Delete a single file from storage and database
 */
export async function deleteFile(fileId) {
    try {
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUserId = currentUser.user_id;
        const currentUserRole = currentUser.role;

        // Get file info first
        const { data: file, error: fetchError } = await supabase
            .from('uploaded_files')
            .select('storage_path, original_name, uploaded_by')
            .eq('id', fileId)
            .single();

        if (fetchError) {
            throw new Error(`File not found: ${fetchError.message}`);
        }

        // Check permissions (admin can delete any file, users can only delete their own)
        if (currentUserRole !== 'admin' && file.uploaded_by !== currentUserId) {
            throw new Error('You do not have permission to delete this file');
        }

        // Delete from storage
        const { error: storageError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([file.storage_path]);

        if (storageError) {
            console.warn('Storage delete error (file may not exist):', storageError);
            // Continue with database delete even if storage delete fails
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from('uploaded_files')
            .delete()
            .eq('id', fileId);

        if (dbError) {
            throw new Error(`Failed to delete file metadata: ${dbError.message}`);
        }

        console.log(`File deleted successfully: ${file.original_name}`);

        return {
            success: true,
            message: `File "${file.original_name}" deleted successfully`
        };

    } catch (error) {
        console.error('Delete file error:', error);
        return {
            success: false,
            message: error.message || 'Delete failed'
        };
    }
}

/**
 * Delete multiple files
 */
export async function deleteMultipleFiles(fileIds) {
    try {
        const results = [];
        let successCount = 0;
        let failCount = 0;

        for (const fileId of fileIds) {
            const result = await deleteFile(fileId);
            results.push({ fileId, ...result });

            if (result.success) {
                successCount++;
            } else {
                failCount++;
            }
        }

        return {
            success: successCount > 0,
            successCount,
            failCount,
            totalCount: fileIds.length,
            results,
            message: `Deleted ${successCount} of ${fileIds.length} files${failCount > 0 ? `, ${failCount} failed` : ''}`
        };

    } catch (error) {
        console.error('Delete multiple files error:', error);
        return {
            success: false,
            message: error.message || 'Failed to delete files'
        };
    }
}

/**
 * Show delete confirmation modal
 */
export function showDeleteConfirmation(fileName, onConfirm) {
    const modalHtml = `
        <div class="modal fade" id="deleteConfirmModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Confirm Delete</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete <strong>${fileName}</strong>?</p>
                        <p class="text-danger"><i class="bi bi-exclamation-triangle"></i> This action cannot be undone.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger" id="confirmDeleteBtn">
                            <i class="bi bi-trash"></i> Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('deleteConfirmModal');
    if (existingModal) {
        existingModal.remove();
    }

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Get modal element
    const modalElement = document.getElementById('deleteConfirmModal');
    const modal = new bootstrap.Modal(modalElement);

    // Handle confirm button
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    confirmBtn.addEventListener('click', async () => {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Deleting...';

        await onConfirm();

        modal.hide();
    });

    // Cleanup modal after it's hidden
    modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
    });

    modal.show();
}

/**
 * Delete all user's files (admin function or user cleanup)
 */
export async function deleteAllUserFiles(userId) {
    try {
        // Get current user
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUserRole = currentUser.role;

        // Only admin can delete other users' files
        if (currentUserRole !== 'admin' && currentUser.user_id !== userId) {
            throw new Error('You do not have permission to delete these files');
        }

        // Get all user's files
        const { data: files, error: fetchError } = await supabase
            .from('uploaded_files')
            .select('id, storage_path, original_name')
            .eq('uploaded_by', userId);

        if (fetchError) {
            throw new Error(`Failed to fetch files: ${fetchError.message}`);
        }

        if (!files || files.length === 0) {
            return {
                success: true,
                message: 'No files to delete',
                deletedCount: 0
            };
        }

        // Delete all files
        const fileIds = files.map(f => f.id);
        const result = await deleteMultipleFiles(fileIds);

        return result;

    } catch (error) {
        console.error('Delete all user files error:', error);
        return {
            success: false,
            message: error.message || 'Failed to delete files'
        };
    }
}