/**
 * Partner_Dashboard.js
 * Handles partner dashboard functionality using Supabase
 */

import { supabase, getCurrentUser } from './db_connection.js';

// ============================================
// FUNCTION: Get Partner Statistics
// ============================================
export async function getPartnerStats(email) {
    if (!email) {
        return { status: 'error', message: 'Email parameter is required' };
    }

    try {
        // Total requests
        const { count: totalRequests, error: totalError } = await supabase
            .from('partnership_requests')
            .select('*', { count: 'exact', head: true })
            .eq('email', email);

        // Approved requests
        const { count: approvedRequests, error: approvedError } = await supabase
            .from('partnership_requests')
            .select('*', { count: 'exact', head: true })
            .eq('email', email)
            .eq('status', 'approved');

        // Pending requests
        const { count: pendingRequests, error: pendingError } = await supabase
            .from('partnership_requests')
            .select('*', { count: 'exact', head: true })
            .eq('email', email)
            .eq('status', 'pending');

        // Get most recent organization info
        const { data: organizationData, error: orgError } = await supabase
            .from('partnership_requests')
            .select('org_name, org_type, email, status, updated_at, submitted_at')
            .eq('email', email)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single();

        const stats = {
            total_requests: totalRequests || 0,
            approved_requests: approvedRequests || 0,
            pending_requests: pendingRequests || 0,
            active_projects: 0
        };

        return {
            status: 'success',
            stats,
            organization: organizationData || null
        };
    } catch (error) {
        console.error('Error getting partner stats:', error);
        return { status: 'error', message: 'Server error: ' + error.message };
    }
}

// ============================================
// FUNCTION: Get Partner Requests
// ============================================
export async function getPartnerRequests(email, filters = {}) {
    if (!email) {
        return { status: 'error', message: 'Email parameter is required' };
    }

    const { status, search, limit } = filters;

    try {
        let query = supabase
            .from('partnership_requests')
            .select('*')
            .eq('email', email);

        // Add status filter
        if (status) {
            query = query.eq('status', status);
        }

        // Add search filter
        if (search) {
            query = query.or(`subject.ilike.%${search}%,org_name.ilike.%${search}%,collaboration.ilike.%${search}%`);
        }

        // Order and limit
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

// ============================================
// FUNCTION: Get Request Details
// ============================================
export async function getRequestDetails(requestId) {
    if (!requestId) {
        return { status: 'error', message: 'Request ID is required' };
    }

    try {
        // Get request details
        const { data: request, error: requestError } = await supabase
            .from('partnership_requests')
            .select('*')
            .eq('request_id', requestId)
            .single();

        if (requestError || !request) {
            return { status: 'error', message: 'Request not found' };
        }

        // Get attachments (assuming you have a partnership_attachments table)
        const { data: attachments, error: attachmentsError } = await supabase
            .from('partnership_attachments')
            .select('*')
            .eq('request_id', requestId);

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

// ============================================
// FUNCTION: Get Partner Profile
// ============================================
export async function getPartnerProfile(email) {
    if (!email) {
        return { status: 'error', message: 'Email parameter is required' };
    }

    try {
        // Get most recent organization profile
        const { data: organization, error } = await supabase
            .from('partnership_requests')
            .select('org_name, org_type, address, contact_person, position, email, phone, status, submitted_at, updated_at')
            .eq('email', email)
            .order('submitted_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !organization) {
            return { status: 'error', message: 'Organization profile not found' };
        }

        return {
            status: 'success',
            organization
        };
    } catch (error) {
        console.error('Error getting partner profile:', error);
        return { status: 'error', message: 'Failed to load profile' };
    }
}

// ============================================
// FUNCTION: Get Partner Projects
// ============================================
export async function getPartnerProjects(email) {
    if (!email) {
        return { status: 'error', message: 'Email parameter is required' };
    }

    try {
        // Get approved partnership requests (these could be considered active projects)
        const { data: projects, error } = await supabase
            .from('partnership_requests')
            .select('request_id, subject, collaboration, status, submitted_at')
            .eq('email', email)
            .eq('status', 'approved')
            .order('submitted_at', { ascending: false });

        // Transform data to match expected format
        const formattedProjects = (projects || []).map(project => ({
            project_id: project.request_id,
            title: project.subject,
            description: project.collaboration,
            status: project.status,
            created_at: project.submitted_at
        }));

        return {
            status: 'success',
            projects: formattedProjects
        };
    } catch (error) {
        console.error('Error getting partner projects:', error);
        return { status: 'error', message: 'Failed to load projects' };
    }
}

// ============================================
// FUNCTION: Get Partner Documents
// ============================================
export async function getPartnerDocuments(email) {
    if (!email) {
        return { status: 'error', message: 'Email parameter is required' };
    }

    try {
        // Get all attachments for this partner's requests
        const { data: documents, error } = await supabase
            .from('partnership_attachments')
            .select(`
                attachment_id,
                original_name,
                stored_name,
                file_type,
                file_size,
                uploaded_at,
                partnership_requests!inner(request_id, email)
            `)
            .eq('partnership_requests.email', email)
            .order('uploaded_at', { ascending: false });

        // Transform the data to match the expected format
        const formattedDocs = (documents || []).map(doc => ({
            attachment_id: doc.attachment_id,
            original_name: doc.original_name,
            stored_name: doc.stored_name,
            file_type: doc.file_type,
            file_size: doc.file_size,
            uploaded_at: doc.uploaded_at
        }));

        return {
            status: 'success',
            documents: formattedDocs
        };
    } catch (error) {
        console.error('Error getting partner documents:', error);
        return { status: 'error', message: 'Failed to load documents' };
    }
}

// ============================================
// FUNCTION: Download Attachment
// ============================================
export async function downloadAttachment(attachmentId) {
    if (!attachmentId || attachmentId <= 0) {
        return { status: 'error', message: 'Invalid attachment ID' };
    }

    try {
        // Get attachment information
        const { data: attachment, error } = await supabase
            .from('partnership_attachments')
            .select('original_name, stored_name, public_url')
            .eq('attachment_id', attachmentId)
            .single();

        if (error || !attachment) {
            return { status: 'error', message: 'Attachment not found' };
        }

        // If we have a public URL, use it
        if (attachment.public_url) {
            window.open(attachment.public_url, '_blank');
            return { status: 'success', message: 'Download initiated' };
        }

        // Otherwise, try to download from Supabase Storage
        // Note: You'll need to set up proper bucket permissions
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('uploads') // Your bucket name
            .download(attachment.stored_name);

        if (downloadError) {
            console.error('Storage download error:', downloadError);
            return { status: 'error', message: 'File not found on server' };
        }

        // Create download link
        const url = URL.createObjectURL(fileData);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.original_name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return { status: 'success', message: 'Download completed' };
    } catch (error) {
        console.error('Error downloading attachment:', error);
        return { status: 'error', message: 'Download failed' };
    }
}

// ============================================
// FUNCTION: Get MOAs
// ============================================
export async function getMOAs(email = null) {
    const user = getCurrentUser();

    if (!user && !email) {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        let query;

        if (email) {
            // Get MOAs for specific partner by email
            query = supabase
                .from('moa_submissions')
                .select(`
                    moa_id,
                    moa_title,
                    moa_ref_number,
                    start_date,
                    end_date,
                    covered_programs,
                    org_name,
                    status,
                    submission_date
                `)
                .eq('rep_email', email);
        } else if (user.role === 'coordinator') {
            // Coordinator sees their MOAs
            query = supabase
                .from('moa_submissions')
                .select(`
                    moa_id,
                    moa_title,
                    moa_ref_number,
                    start_date,
                    end_date,
                    covered_programs,
                    org_name,
                    status,
                    submission_date
                `)
                .eq('coordinator_id', user.user_id);
        } else {
            // Admin sees all MOAs
            query = supabase
                .from('moa_submissions')
                .select(`
                    moa_id,
                    moa_title,
                    moa_ref_number,
                    start_date,
                    end_date,
                    covered_programs,
                    org_name,
                    status,
                    submission_date,
                    users!inner(full_name)
                `);
        }

        query = query.order('submission_date', { ascending: false });

        const { data: moas, error } = await query;

        if (error) throw error;

        // Calculate days remaining
        const moasWithDaysRemaining = (moas || []).map(moa => {
            const endDate = new Date(moa.end_date);
            const today = new Date();
            const daysRemaining = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

            return {
                ...moa,
                days_remaining: daysRemaining
            };
        });

        return {
            success: true,
            moas: moasWithDaysRemaining
        };
    } catch (error) {
        console.error('Error getting MOAs:', error);
        return {
            success: false,
            message: 'Failed to load MOA data',
            moas: []
        };
    }
}

// ============================================
// FUNCTION: Get Current User (Coordinator/All Roles)
// ============================================
export function getCurrentUserInfo() {
    const user = getCurrentUser();

    if (!user) {
        return { success: false, message: 'Unauthorized' };
    }

    return {
        success: true,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        user_id: user.user_id,
        status: user.status
    };
}

// ============================================
// FUNCTION: Get MOA Details
// ============================================
export async function getMOADetails(moaId, email = null) {
    if (!moaId || isNaN(moaId)) {
        return { success: false, message: 'Invalid MOA ID' };
    }

    const user = getCurrentUser();

    try {
        let query = supabase
            .from('moa_submissions')
            .select('*')
            .eq('moa_id', moaId);

        // Apply permissions
        if (user?.role === 'coordinator') {
            query = query.eq('coordinator_id', user.user_id);
        } else if (email) {
            query = query.eq('rep_email', email);
        }

        const { data: moa, error } = await query.single();

        if (error || !moa) {
            return { success: false, message: 'MOA not found' };
        }

        return {
            success: true,
            moa
        };
    } catch (error) {
        console.error('Error getting MOA details:', error);
        return { success: false, message: 'Failed to load MOA details' };
    }
}

// ============================================
// FUNCTION: Get MOA Statistics
// ============================================
export async function getMOAStats(email = null) {
    const user = getCurrentUser();

    try {
        let query;

        if (user?.role === 'coordinator') {
            query = supabase
                .from('moa_submissions')
                .select('status')
                .eq('coordinator_id', user.user_id);
        } else if (email) {
            query = supabase
                .from('moa_submissions')
                .select('status')
                .eq('rep_email', email);
        } else {
            query = supabase
                .from('moa_submissions')
                .select('status');
        }

        const { data: moas, error } = await query;

        if (error) throw error;

        // Calculate stats
        const stats = {
            active: 0,
            pending: 0,
            expired: 0,
            total: moas?.length || 0
        };

        (moas || []).forEach(moa => {
            if (moa.status === 'active') stats.active++;
            else if (moa.status === 'pending' || moa.status === 'under_review') stats.pending++;
            else if (moa.status === 'expired') stats.expired++;
        });

        return {
            success: true,
            stats
        };
    } catch (error) {
        console.error('Error getting MOA stats:', error);
        return {
            success: false,
            message: 'Failed to load statistics',
            stats: { active: 0, pending: 0, expired: 0, total: 0 }
        };
    }
}

// ============================================
// FUNCTION: Submit Partnership Request (NEW)
// ============================================
export async function submitPartnershipRequest(formData, attachments = []) {
    try {
        // Get current user
        const user = getCurrentUser();

        // If no user logged in, use form email
        const userEmail = user?.email || formData.email;

        // Validate required fields
        const requiredFields = [
            'letterDate', 'subject', 'orgName', 'orgType', 'address',
            'collaboration', 'contactPerson', 'email', 'phone'
        ];

        const missingFields = requiredFields.filter(field => !formData[field]?.trim());

        if (missingFields.length > 0) {
            return {
                status: 'error',
                message: `Please fill in all required fields: ${missingFields.join(', ')}`
            };
        }

        // Insert partnership request into Supabase
        const requestData = {
            letter_date: formData.letterDate,
            subject: formData.subject,
            org_name: formData.orgName,
            org_type: formData.orgType,
            address: formData.address,
            collaboration: formData.collaboration,
            outcomes: formData.outcomes || '',
            additional_info: formData.additionalInfo || '',
            contact_person: formData.contactPerson,
            position: formData.position || '',
            email: formData.email,
            phone: formData.phone,
            status: 'pending',
            submitted_at: new Date().toISOString()
        };

        const { data: newRequest, error: requestError } = await supabase
            .from('partnership_requests')
            .insert([requestData])
            .select()
            .single();

        if (requestError) {
            console.error('Supabase insert error:', requestError);
            throw new Error('Failed to save partnership request: ' + requestError.message);
        }

        // Handle file uploads to Supabase Storage
        const uploadedFiles = [];
        const failedFiles = [];
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'];

        if (attachments && attachments.length > 0) {
            const attachmentInserts = [];

            for (const file of attachments) {
                if (file.size > maxSize) {
                    failedFiles.push(`${file.name} (File too large)`);
                    continue;
                }

                const fileExt = file.name.toLowerCase().split('.').pop();
                if (!allowedTypes.includes(fileExt)) {
                    failedFiles.push(`${file.name} (Invalid file type)`);
                    continue;
                }

                // Generate unique filename
                const timestamp = Date.now();
                const randomString = Math.random().toString(36).substring(2, 15);
                const storedName = `partnership_requests/${timestamp}_${randomString}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

                // Upload to Supabase Storage
                const { error: uploadError } = await supabase.storage
                    .from('uploads')
                    .upload(storedName, file, {
                        cacheControl: '3600',
                        upsert: false
                    });

                if (uploadError) {
                    console.error('Upload error:', uploadError);
                    failedFiles.push(`${file.name} (Upload error: ${uploadError.message})`);
                    continue;
                }

                uploadedFiles.push(file.name);

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('uploads')
                    .getPublicUrl(storedName);

                // Prepare attachment metadata
                attachmentInserts.push({
                    request_id: newRequest.request_id,
                    original_name: file.name,
                    stored_name: storedName,
                    file_type: fileExt,
                    file_size: file.size,
                    public_url: publicUrl,
                    uploaded_at: new Date().toISOString()
                });
            }

            // Insert attachment metadata
            if (attachmentInserts.length > 0) {
                try {
                    const { error: attachError } = await supabase
                        .from('partnership_attachments')
                        .insert(attachmentInserts);

                    if (attachError) {
                        console.error('Attachment metadata insert error:', attachError);
                        failedFiles.push('Some files uploaded but metadata insertion failed');
                    }
                } catch (tableError) {
                    console.warn('Partnership attachments table might not exist. Skipping metadata storage.');
                    // Continue without storing metadata
                }
            }
        }

        // Prepare response
        let message = "Partnership request submitted successfully!";
        if (uploadedFiles.length > 0) {
            message += ` ${uploadedFiles.length} file(s) uploaded.`;
        }
        if (failedFiles.length > 0) {
            message += ` Note: ${failedFiles.length} file(s) failed to upload.`;
        }

        return {
            status: 'success',
            message,
            request_id: newRequest.request_id,
            uploaded_files: uploadedFiles,
            failed_files: failedFiles
        };

    } catch (error) {
        console.error('Error submitting partnership request:', error);
        return {
            status: 'error',
            message: 'Failed to submit partnership request: ' + error.message
        };
    }
}

// ============================================
// FUNCTION: Submit MOA
// ============================================
export async function submitMOA(formData, files) {
    const user = getCurrentUser();

    if (!user) {
        return { success: false, message: 'Unauthorized access' };
    }

    try {
        // Validate required fields
        const requiredFields = [
            'moa_title', 'moa_ref_number', 'start_date', 'end_date',
            'covered_programs', 'org_name', 'rep_name', 'rep_position',
            'rep_email', 'rep_phone', 'org_address'
        ];

        const missingFields = requiredFields.filter(field => !formData[field]?.trim());

        if (missingFields.length > 0) {
            throw new Error(`Required fields missing: ${missingFields.join(', ')}`);
        }

        // Validate dates
        const startDate = new Date(formData.start_date);
        const endDate = new Date(formData.end_date);

        if (isNaN(startDate) || isNaN(endDate)) {
            throw new Error('Invalid date format. Use YYYY-MM-DD');
        }

        if (startDate >= endDate) {
            throw new Error('End date must be after start date');
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.rep_email)) {
            throw new Error('Invalid email format');
        }

        // Check if reference number already exists
        const { data: existingMOA, error: checkError } = await supabase
            .from('moa_submissions')
            .select('moa_id')
            .eq('moa_ref_number', formData.moa_ref_number)
            .maybeSingle();

        if (checkError) throw checkError;
        if (existingMOA) {
            throw new Error('MOA reference number already exists');
        }

        // Handle file upload
        if (!files.moa_document) {
            throw new Error('MOA document is required');
        }

        const moaFile = files.moa_document;
        const maxSize = 10 * 1024 * 1024; // 10MB

        if (moaFile.size > maxSize) {
            throw new Error('MOA document must be less than 10MB');
        }

        // Check file type
        const allowedExtensions = ['pdf', 'doc', 'docx'];
        const fileExtension = moaFile.name.toLowerCase().split('.').pop();

        if (!allowedExtensions.includes(fileExtension)) {
            throw new Error('Only PDF, DOC, and DOCX files are allowed');
        }

        // Upload main MOA document to Supabase Storage
        const moaFileName = `moa_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`;
        const { data: moaUpload, error: moaUploadError } = await supabase.storage
            .from('moa_documents')
            .upload(moaFileName, moaFile);

        if (moaUploadError) throw moaUploadError;

        // Get public URL
        const { data: { publicUrl: moaPublicUrl } } = supabase.storage
            .from('moa_documents')
            .getPublicUrl(moaFileName);

        // Insert MOA record
        const moaData = {
            coordinator_id: user.user_id,
            moa_title: formData.moa_title,
            moa_ref_number: formData.moa_ref_number,
            start_date: formData.start_date,
            end_date: formData.end_date,
            covered_programs: formData.covered_programs,
            org_name: formData.org_name,
            rep_name: formData.rep_name,
            rep_position: formData.rep_position,
            rep_email: formData.rep_email,
            rep_phone: formData.rep_phone,
            org_address: formData.org_address,
            moa_document_path: moaPublicUrl,
            status: 'pending',
            submission_date: new Date().toISOString()
        };

        const { data: newMOA, error: insertError } = await supabase
            .from('moa_submissions')
            .insert([moaData])
            .select()
            .single();

        if (insertError) throw insertError;

        // Handle supporting documents
        const supportingDocs = [];
        if (files.supporting_documents && Array.isArray(files.supporting_documents)) {
            for (const supportFile of files.supporting_documents) {
                if (supportFile.size > 5 * 1024 * 1024) continue;

                const supportExtension = supportFile.name.toLowerCase().split('.').pop();
                const supportAllowed = [...allowedExtensions, 'jpg', 'jpeg', 'png', 'xls', 'xlsx'];

                if (supportAllowed.includes(supportExtension)) {
                    const supportFileName = `supporting_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${supportExtension}`;

                    const { error: supportUploadError } = await supabase.storage
                        .from('moa_documents/supporting')
                        .upload(supportFileName, supportFile);

                    if (!supportUploadError) {
                        const { data: { publicUrl: supportPublicUrl } } = supabase.storage
                            .from('moa_documents/supporting')
                            .getPublicUrl(supportFileName);

                        supportingDocs.push({
                            original_name: supportFile.name,
                            stored_name: supportFileName,
                            path: supportPublicUrl
                        });
                    }
                }
            }

            // Update MOA with supporting docs
            if (supportingDocs.length > 0) {
                await supabase
                    .from('moa_submissions')
                    .update({ supporting_docs: JSON.stringify(supportingDocs) })
                    .eq('moa_id', newMOA.moa_id);
            }
        }

        return {
            success: true,
            message: 'MOA submitted successfully for review',
            moa_id: newMOA.moa_id,
            file_path: moaPublicUrl
        };

    } catch (error) {
        console.error('Error submitting MOA:', error);
        return {
            success: false,
            message: error.message || 'Failed to submit MOA'
        };
    }
}

// ============================================
// FUNCTION: Track Template Download
// ============================================
export async function trackTemplateDownload(templateData) {
    const user = getCurrentUser();

    try {
        const downloadData = {
            template_name: templateData.template_name || 'unknown',
            page: templateData.page || 'unknown',
            user_id: user?.user_id || null,
            user_email: user?.email || null,
            user_role: user?.role || 'guest',
            downloaded_at: templateData.timestamp || new Date().toISOString(),
            ip_address: '', // Note: You can't get IP client-side
            user_agent: navigator.userAgent
        };

        // Insert into template_downloads table
        const { error } = await supabase
            .from('template_downloads')
            .insert([downloadData]);

        if (error) {
            console.warn('Template download tracking failed:', error);
            // Don't fail the download, just log the error
        }

        return {
            success: true,
            tracked: !error,
            message: error ? 'Download tracked (database error ignored)' : 'Template download tracked successfully'
        };

    } catch (error) {
        console.error('Template tracking error:', error);
        return {
            success: true, // Return success anyway to not break download
            tracked: false,
            message: 'Download tracked (tracking error ignored)'
        };
    }
}

// ============================================
// FUNCTION: Log Out
// ============================================
export function logout() {
    // Clear localStorage
    localStorage.removeItem('user');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('sessionExpiry');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
    localStorage.removeItem('username');
    localStorage.removeItem('lastLogin');

    // Redirect to login page
    window.location.href = '../HTML/LogIn.html';
}

// ============================================
// FUNCTION: Load Dashboard Stats (NEW)
// ============================================
export async function loadDashboardStats(userEmail) {
    return await getPartnerStats(userEmail);
}

// ============================================
// FUNCTION: Load All Requests (NEW)
// ============================================
export async function loadAllPartnerRequests(userEmail) {
    return await getPartnerRequests(userEmail);
}

// Export all functions
export default {
    getPartnerStats,
    getPartnerRequests,
    getRequestDetails,
    getPartnerProfile,
    getPartnerProjects,
    getPartnerDocuments,
    downloadAttachment,
    getMOAs,
    getCurrentUserInfo,
    getMOADetails,
    getMOAStats,
    submitMOA,
    trackTemplateDownload,
    submitPartnershipRequest,
    logout,
    loadDashboardStats,
    loadAllPartnerRequests
};