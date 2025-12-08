/**
 * UploadFile.js - Upload files to Supabase Storage bucket "Uploads"
 * Also manages file metadata in 'uploaded_files' table
 */

import { supabase } from './db_connection.js';

// Configuration
const STORAGE_BUCKET = 'Uploads';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_FILE_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/zip', 'application/x-rar-compressed',
    'video/mp4', 'video/mpeg',
    'audio/mpeg', 'audio/wav'
];

// Allowed file extensions (for files without proper MIME types)
const ALLOWED_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf',
    '.doc', '.docx',
    '.xls', '.xlsx',
    '.txt', '.csv',
    '.zip', '.rar',
    '.mp4', '.mpeg',
    '.mp3', '.wav'
];

// ============================================
// FILE UPLOAD FUNCTIONS
// ============================================

/**
 * Initialize file upload form with validation and upload handling
 */
export function initializeFileUploadForm(formId) {
    const form = document.getElementById(formId);
    if (!form) {
        console.error('Upload form not found:', formId);
        return;
    }

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const fileInput = document.getElementById('fileInput');
        const categorySelect = document.getElementById('fileCategory');
        const accessLevelSelect = document.getElementById('accessLevel');
        const descriptionInput = document.getElementById('fileDescription');
        
        if (!fileInput || !fileInput.files.length) {
            showUploadStatus('Please select at least one file', 'error');
            return;
        }

        const files = Array.from(fileInput.files);
        const category = categorySelect ? categorySelect.value : 'general';
        const accessLevel = accessLevelSelect ? accessLevelSelect.value : 'private';
        const description = descriptionInput ? descriptionInput.value : '';

        console.log('Upload metadata:', { category, accessLevel, description }); // Debug log

        // Validate files
        const validation = validateFiles(files);
        if (!validation.valid) {
            showUploadStatus(validation.message, 'error');
            return;
        }

        // Show upload progress
        const progressContainer = document.getElementById('uploadProgressContainer');
        const progressBar = document.getElementById('uploadProgressBar');
        if (progressContainer && progressBar) {
            progressContainer.style.display = 'block';
            progressBar.style.width = '0%';
            progressBar.textContent = '0%';
        }

        // Disable upload button during upload
        const uploadButton = document.getElementById('uploadButton');
        const originalButtonText = uploadButton ? uploadButton.innerHTML : '';
        if (uploadButton) {
            uploadButton.disabled = true;
            uploadButton.innerHTML = '<i class="bi bi-upload"></i> Uploading...';
        }

        try {
            const result = await uploadFiles(files, {
                category: category,
                access_level: accessLevel,
                description: description
            });

            if (result.success) {
                showUploadStatus(`Successfully uploaded ${result.uploadedCount} file(s)`, 'success');
                
                // Reset form
                form.reset();
                const filePreview = document.getElementById('filePreview');
                if (filePreview) filePreview.style.display = 'none';
                const selectedFilesList = document.getElementById('selectedFilesList');
                if (selectedFilesList) selectedFilesList.innerHTML = '';
                
                // Hide progress bar
                if (progressContainer) progressContainer.style.display = 'none';
                
                // Reload files list if function exists
                if (typeof window.loadUploadedFiles === 'function') {
                    setTimeout(() => window.loadUploadedFiles(), 1000);
                }
            } else {
                showUploadStatus(`Upload failed: ${result.message}`, 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showUploadStatus(`Upload error: ${error.message}`, 'error');
        } finally {
            // Re-enable upload button
            if (uploadButton) {
                uploadButton.disabled = false;
                uploadButton.innerHTML = originalButtonText;
            }
        }
    });

    console.log('File upload form initialized:', formId);
}

/**
 * Validate files before upload
 */
function validateFiles(files) {
    if (!files || files.length === 0) {
        return { valid: false, message: 'No files selected' };
    }

    // Check file count
    if (files.length > 10) {
        return { valid: false, message: 'Maximum 10 files allowed per upload' };
    }

    // Check each file
    for (const file of files) {
        // Check file size
        if (file.size > MAX_FILE_SIZE) {
            return { valid: false, message: `File "${file.name}" exceeds 50MB limit` };
        }

        // Get file extension
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();
        
        // Check file type by MIME type or extension
        const isValidType = ALLOWED_FILE_TYPES.includes(file.type) || 
                           ALLOWED_EXTENSIONS.includes(fileExt);
        
        if (!isValidType) {
            return { valid: false, message: `File type not allowed for "${file.name}". Allowed types: PDF, Images, Documents, Spreadsheets, Archives, Audio, Video` };
        }
    }

    return { valid: true, message: 'Files validated successfully' };
}

/**
 * Upload files to Supabase Storage
 */
export async function uploadFiles(files, metadata = {}) {
    try {
        // Get current user info from localStorage
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        const userId = userData.user_id;
        
        if (!userId) {
            throw new Error('User not authenticated. Please log in again.');
        }

        console.log(`Uploading files for user ${userId}`);
        console.log('Metadata received:', metadata); // Debug log
        
        let uploadedCount = 0;
        const uploadedFiles = [];
        const errors = [];

        for (const [index, file] of files.entries()) {
            try {
                // Generate safe filename (remove special characters)
                const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
                const fileExt = safeFileName.split('.').pop();
                const timestamp = Date.now();
                const randomString = Math.random().toString(36).substring(2, 15);
                const fileName = `${timestamp}_${randomString}_${index}.${fileExt}`;
                
                // Create user-specific folder structure
                const filePath = `user_${userId}/${fileName}`;
                
                console.log(`Uploading file ${index + 1}/${files.length}:`, file.name, 'as', filePath);

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .upload(filePath, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Storage upload error:', uploadError);
                    
                    // Handle specific errors
                    if (uploadError.message?.includes('bucket')) {
                        throw new Error(`Storage bucket "${STORAGE_BUCKET}" not found. Please create it in Supabase Storage.`);
                    }
                    
                    throw new Error(`Failed to upload "${file.name}": ${uploadError.message}`);
                }

                // Get public URL
                const { data: urlData } = supabase.storage
                    .from(STORAGE_BUCKET)
                    .getPublicUrl(filePath);

                console.log('File uploaded, URL:', urlData.publicUrl);

                // Prepare database insert with CORRECT field name
                const insertData = {
                    original_name: file.name,
                    storage_path: filePath,
                    file_type: file.type || getFileTypeFromExtension(file.name),
                    file_size: file.size,
                    public_url: urlData.publicUrl,
                    uploaded_by: userId,
                    category: metadata.category || 'general',
                    access_level: metadata.access_level || 'private',
                    description: metadata.description || ''
                };

                console.log('Inserting into database:', insertData); // Debug log

                // Save file metadata to database
                const { data: dbData, error: dbError } = await supabase
                    .from('uploaded_files')
                    .insert([insertData])
                    .select()
                    .single();

                if (dbError) {
                    console.error('Database insert error:', dbError);
                    
                    // Try to delete the uploaded file from storage if DB insert failed
                    await supabase.storage
                        .from(STORAGE_BUCKET)
                        .remove([filePath])
                        .catch(err => console.warn('Could not delete failed upload:', err));
                    
                    // Check specific error types
                    if (dbError.code === '23503') { // Foreign key violation
                        throw new Error(`User not found. Please log in again.`);
                    } else if (dbError.code === '23505') { // Unique violation
                        throw new Error(`File "${file.name}" already exists in database.`);
                    } else {
                        throw new Error(`Failed to save file metadata: ${dbError.message}`);
                    }
                }

                console.log('File saved to database:', dbData); // Debug log

                uploadedFiles.push(dbData);
                uploadedCount++;
                
                console.log(`File ${index + 1} saved to database with ID:`, dbData.id);

                // Update progress bar
                updateProgressBar((uploadedCount / files.length) * 100);

            } catch (fileError) {
                console.error(`Error uploading ${file.name}:`, fileError);
                errors.push({ file: file.name, error: fileError.message });
                // Continue with other files
            }
        }

        // Prepare result message
        let message;
        if (uploadedCount === files.length) {
            message = 'All files uploaded successfully';
        } else if (uploadedCount > 0) {
            message = `${uploadedCount} of ${files.length} files uploaded successfully`;
            if (errors.length > 0) {
                message += `. Failed: ${errors.map(e => `${e.file}`).join(', ')}`;
            }
        } else {
            message = 'No files were uploaded';
            if (errors.length > 0) {
                message += `. Errors: ${errors.map(e => `${e.file}: ${e.error}`).join('; ')}`;
            }
        }

        return {
            success: uploadedCount > 0,
            uploadedCount: uploadedCount,
            totalCount: files.length,
            files: uploadedFiles,
            errors: errors,
            message: message
        };

    } catch (error) {
        console.error('Upload files error:', error);
        return {
            success: false,
            message: error.message || 'Upload failed',
            uploadedCount: 0,
            totalCount: files.length,
            errors: [{ file: 'All files', error: error.message }]
        };
    }
}

/**
 * Get uploaded files from database
 */
export async function getUploadedFiles(filters = {}) {
    try {
        // Get current user from localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const currentUserId = currentUser.user_id;
        const currentUserRole = currentUser.role;
        
        let query = supabase
            .from('uploaded_files')
            .select(`
                *,
                users:uploaded_by(full_name, email)
            `)
            .order('uploaded_at', { ascending: false });

        // Apply filters based on user role
        if (currentUserRole === 'admin') {
            // Admin can see all files
            if (filters.user_id) {
                query = query.eq('uploaded_by', filters.user_id);
            }
        } else {
            // Regular users can see their own files or public files
            query = query.or(`uploaded_by.eq.${currentUserId},access_level.eq.public`);
        }

        // Apply category filter
        if (filters.category && filters.category !== 'all') {
            query = query.eq('category', filters.category);
        }

        // Apply search filter
        if (filters.search && filters.search.trim() !== '') {
            query = query.or(
                `original_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
            );
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching files:', error);
            return [];
        }

        console.log('Fetched files:', data); // Debug log

        return data || [];

    } catch (error) {
        console.error('Get uploaded files error:', error);
        return [];
    }
}

/**
 * Delete file from storage and database
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
 * Download file from Supabase Storage
 */
export async function downloadFile(fileId, fileName) {
    try {
        // Get file info
        const { data: file, error } = await supabase
            .from('uploaded_files')
            .select('storage_path, public_url')
            .eq('id', fileId)
            .single();
        
        if (error) {
            throw new Error(`File not found: ${error.message}`);
        }
        
        // Create download link
        const link = document.createElement('a');
        link.href = file.public_url;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log(`Downloading: ${fileName}`);
        
        return {
            success: true,
            message: `Download started: ${fileName}`
        };
        
    } catch (error) {
        console.error('Download error:', error);
        return {
            success: false,
            message: error.message || 'Download failed'
        };
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format file size to human readable format
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    if (typeof bytes !== 'number') return 'Unknown';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Get file type from extension
 */
function getFileTypeFromExtension(filename) {
    if (!filename) return 'application/octet-stream';
    
    const extension = filename.split('.').pop().toLowerCase();
    const typeMap = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'txt': 'text/plain',
        'csv': 'text/csv',
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'mp4': 'video/mp4',
        'mpeg': 'video/mpeg',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav'
    };

    return typeMap[extension] || 'application/octet-stream';
}

/**
 * Update upload progress bar
 */
function updateProgressBar(percentage) {
    const progressBar = document.getElementById('uploadProgressBar');
    if (progressBar) {
        const roundedPercentage = Math.round(percentage);
        progressBar.style.width = `${roundedPercentage}%`;
        progressBar.textContent = `${roundedPercentage}%`;
        progressBar.setAttribute('aria-valuenow', roundedPercentage);
        
        // Update progress bar color based on percentage
        progressBar.className = 'progress-bar progress-bar-striped progress-bar-animated';
        if (percentage >= 100) {
            progressBar.classList.add('bg-success');
        } else if (percentage >= 70) {
            progressBar.classList.add('bg-info');
        } else if (percentage >= 40) {
            progressBar.classList.add('bg-primary');
        } else {
            progressBar.classList.add('bg-warning');
        }
    }
}

/**
 * Show upload status message
 */
function showUploadStatus(message, type = 'info') {
    const statusElement = document.getElementById('uploadStatus');
    if (!statusElement) {
        // Create status element if it doesn't exist
        const form = document.getElementById('fileUploadForm');
        if (form) {
            const newStatusElement = document.createElement('div');
            newStatusElement.id = 'uploadStatus';
            newStatusElement.className = `alert alert-${type} mt-3`;
            newStatusElement.textContent = message;
            newStatusElement.style.display = 'block';
            form.appendChild(newStatusElement);
        }
        return;
    }

    statusElement.textContent = message;
    statusElement.className = `alert alert-${type} mt-3`;
    statusElement.style.display = 'block';

    // Auto-hide success messages after 5 seconds, error after 10 seconds
    const hideDelay = type === 'success' ? 5000 : type === 'error' ? 10000 : 3000;
    setTimeout(() => {
        if (statusElement.textContent === message) {
            statusElement.style.display = 'none';
        }
    }, hideDelay);
}

/**
 * Get file icon class based on file type
 */
export function getFileIconClass(filename) {
    if (!filename) return 'bi-file-earmark text-secondary';
    
    const extension = filename.split('.').pop().toLowerCase();
    const iconMap = {
        'pdf': 'bi-file-pdf text-danger',
        'doc': 'bi-file-word text-primary',
        'docx': 'bi-file-word text-primary',
        'xls': 'bi-file-excel text-success',
        'xlsx': 'bi-file-excel text-success',
        'jpg': 'bi-file-image text-info',
        'jpeg': 'bi-file-image text-info',
        'png': 'bi-file-image text-info',
        'gif': 'bi-file-image text-info',
        'webp': 'bi-file-image text-info',
        'mp4': 'bi-file-play text-danger',
        'mpeg': 'bi-file-play text-danger',
        'mp3': 'bi-file-music text-success',
        'wav': 'bi-file-music text-success',
        'zip': 'bi-file-zip text-warning',
        'rar': 'bi-file-zip text-warning',
        '7z': 'bi-file-zip text-warning',
        'txt': 'bi-file-text text-secondary',
        'csv': 'bi-file-text text-secondary'
    };

    return iconMap[extension] || 'bi-file-earmark text-secondary';
}

/**
 * Get file icon for use in Admin_Panel.js
 */
export function getFileIcon(filename) {
    const iconClass = getFileIconClass(filename);
    return iconClass.split(' ')[0]; // Return just the icon class name without color
}

/**
 * Get file access badge HTML
 */
export function getFileAccessBadge(accessLevel) {
    if (accessLevel === 'public') {
        return '<span class="badge bg-success"><i class="bi bi-globe"></i> Public</span>';
    } else {
        return '<span class="badge bg-warning"><i class="bi bi-lock"></i> Private</span>';
    }
}