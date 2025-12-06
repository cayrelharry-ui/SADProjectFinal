/**
 * DownloadFile.js - Handle file downloads from Supabase Storage
 */

import { supabase } from './db_connection.js';

const STORAGE_BUCKET = 'Uploads';

/**
 * Download file from Supabase Storage
 * Forces download instead of opening in browser
 */
export async function downloadFile(fileId, fileName, storagePath) {
    try {
        console.log('Downloading file:', fileName);

        // Download the file as blob
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .download(storagePath);

        if (error) {
            console.error('Download error:', error);
            throw new Error(`Failed to download file: ${error.message}`);
        }

        // Create blob URL and trigger download
        const url = window.URL.createObjectURL(data);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName; // This forces download with original filename
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        console.log('File downloaded successfully:', fileName);
        
        return {
            success: true,
            message: `File "${fileName}" downloaded successfully`
        };

    } catch (error) {
        console.error('Download file error:', error);
        return {
            success: false,
            message: error.message || 'Download failed'
        };
    }
}

/**
 * Download multiple files as a zip
 * Note: This requires JSZip library to be included
 */
export async function downloadMultipleFiles(files) {
    try {
        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            throw new Error('JSZip library not loaded. Please include it in your HTML.');
        }

        const zip = new JSZip();
        let successCount = 0;

        // Download each file and add to zip
        for (const file of files) {
            try {
                const { data, error } = await supabase.storage
                    .from(STORAGE_BUCKET)
                    .download(file.storage_path);

                if (!error && data) {
                    zip.file(file.original_name, data);
                    successCount++;
                }
            } catch (err) {
                console.warn(`Failed to add ${file.original_name} to zip:`, err);
            }
        }

        if (successCount === 0) {
            throw new Error('No files could be downloaded');
        }

        // Generate zip file
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Trigger download
        const url = window.URL.createObjectURL(zipBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `files_${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        return {
            success: true,
            message: `Downloaded ${successCount} of ${files.length} files`
        };

    } catch (error) {
        console.error('Download multiple files error:', error);
        return {
            success: false,
            message: error.message || 'Failed to download files'
        };
    }
}

/**
 * View file in new tab (for images, PDFs, etc.)
 */
export function viewFile(publicUrl) {
    if (!publicUrl) {
        console.error('No public URL provided');
        return {
            success: false,
            message: 'No file URL available'
        };
    }

    window.open(publicUrl, '_blank');
    
    return {
        success: true,
        message: 'File opened in new tab'
    };
}

/**
 * Get file download URL
 */
export async function getDownloadUrl(storagePath) {
    try {
        const { data, error } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(storagePath, 60); // URL valid for 60 seconds

        if (error) {
            throw error;
        }

        return {
            success: true,
            url: data.signedUrl
        };

    } catch (error) {
        console.error('Get download URL error:', error);
        return {
            success: false,
            message: error.message || 'Failed to get download URL'
        };
    }
}