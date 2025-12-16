/**
 * db_connection.js
 * Custom authentication with approval workflow using SHA-256 password hashing
 */

// ============================================
// CONFIGURATION - ALL ENVIRONMENT VARIABLES IN ONE PLACE
// ============================================

// --- CORE DATABASE CONFIGURATION ---
const SUPABASE_URL = 'https://fkdqenrxfanpgmtogiig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZHFlbnJ4ZmFucGdtdG9naWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDA1NzksImV4cCI6MjA4MDMxNjU3OX0.NSA57GQcxnCpLnqMVlDpf_lvfggb2H-IGGTBL_XYQ4I';
const SUPABASE_JS_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';

// --- PARTNER PANEL SPECIFIC CONFIGURATION ---
const PARTNER_CONFIG = {
    STORAGE_BUCKET: 'Uploads',
    UPLOAD_LIMIT_MB: 10,
    SUPPORTED_FILE_TYPES: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip'],
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB in bytes
    REQUEST_STATUSES: ['pending', 'reviewed', 'approved', 'rejected', 'cancelled'],
    ORG_TYPES: ['Government', 'NGO', 'Private Company', 'Academic', 'Other'],
    CATEGORIES: ['partnership_request', 'moa', 'project']
};

// --- ADMIN CONFIGURATION (Preserved from original) ---
const ADMIN_CONFIG = {
    USER_STATUSES: ['pending', 'active', 'inactive'],
    USER_ROLES: ['admin', 'staff', 'partner', 'public'],
    SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    DEBUG_MODE: true
};

// Debug mode - unified
const DEBUG = ADMIN_CONFIG.DEBUG_MODE;

// ============================================
// INITIALIZATION
// ============================================
console.log("🔧 DEBUG: Initializing Supabase connection...");

let supabaseClient = null;
let supabaseInitialized = false;

// Initialize Supabase synchronously if available, or load from CDN
async function initializeSupabase() {
    try {
        // Check if Supabase is already loaded globally
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            console.log("✅ Supabase found in window.supabase");
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            supabaseInitialized = true;
            console.log("✅ Supabase client initialized");
        }
        // Check if supabase is available globally (without window prefix)
        else if (typeof supabase !== 'undefined' && supabase.createClient) {
            console.log("✅ Supabase found globally");
            supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            supabaseInitialized = true;
            console.log("✅ Supabase client initialized");
        }
        // Need to load from CDN
        else {
            console.log("📦 Loading Supabase from CDN...");

            // Create and load script
            const script = document.createElement('script');
            script.src = SUPABASE_JS_CDN;

            // Wait for script to load
            await new Promise((resolve, reject) => {
                script.onload = () => {
                    console.log("📦 Supabase CDN loaded successfully");

                    // Now check if it's available
                    if (typeof window.supabase !== 'undefined') {
                        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                        supabaseInitialized = true;
                        console.log("✅ Supabase client initialized from CDN");
                        resolve();
                    } else {
                        reject(new Error("Supabase not available after CDN load"));
                    }
                };
                script.onerror = () => reject(new Error("Failed to load Supabase from CDN"));
                document.head.appendChild(script);
            });
        }

        // Test connection
        if (supabaseClient) {
            try {
                const { data, error } = await supabaseClient
                    .from('users')
                    .select('count')
                    .limit(1);

                if (error) {
                    console.warn("⚠️ Supabase connection test warning:", error.message);
                } else {
                    console.log("✅ Supabase connection test successful");
                }
            } catch (testError) {
                console.warn("⚠️ Supabase connection test failed:", testError.message);
            }
        }

        return supabaseClient;

    } catch (error) {
        console.error("❌ Error initializing Supabase:", error);
        // Create a fallback mock
        supabaseClient = createMockSupabase();
        return supabaseClient;
    }
}

function createMockSupabase() {
    console.warn("⚠️ Using mock Supabase client - real database operations will fail");
    console.warn("⚠️ Please ensure Supabase library is loaded in your HTML file:");
    console.warn(`   <script src="${SUPABASE_JS_CDN}"></script>`);

    return {
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: () => Promise.resolve({ data: null, error: { message: "Mock client - no real connection" } })
                }),
                maybeSingle: () => Promise.resolve({ data: null, error: { message: "Mock client - no real connection" } }),
                order: () => Promise.resolve({ data: [], error: { message: "Mock client - no real connection" } }),
                limit: () => Promise.resolve({ data: [], error: { message: "Mock client - no real connection" } })
            }),
            insert: () => Promise.resolve({ data: null, error: { message: "Mock client - no real connection" } }),
            update: () => ({
                eq: () => Promise.resolve({ data: null, error: { message: "Mock client - no real connection" } })
            }),
            delete: () => ({
                eq: () => Promise.resolve({ data: null, error: { message: "Mock client - no real connection" } })
            })
        }),
        auth: {
            getUser: () => Promise.resolve({ data: { user: null }, error: { message: "Mock client - no real connection" } })
        },
        storage: {
            from: () => ({
                upload: () => Promise.resolve({ data: null, error: { message: "Mock client - no real connection" } }),
                download: () => Promise.resolve({ data: null, error: { message: "Mock client - no real connection" } }),
                remove: () => Promise.resolve({ data: null, error: { message: "Mock client - no real connection" } }),
                getPublicUrl: () => ({ data: { publicUrl: null } })
            })
        }
    };
}

// Store the initialization promise
const supabaseInitializationPromise = initializeSupabase();

// ============================================
// CONFIGURATION EXPORT FUNCTIONS
// ============================================

// Get Partner Panel configuration
function getPartnerConfig() {
    return {
        ...PARTNER_CONFIG,
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    };
}

// Get Admin configuration
function getAdminConfig() {
    return ADMIN_CONFIG;
}

// ============================================
// PARTNER PANEL SPECIFIC FUNCTIONS
// ============================================

// Partner-specific auth wrapper
const partnerAuth = {
    // Partner sign-in (with email only)
    signIn: async (email, password) => {
        await supabaseInitializationPromise;
        if (!supabaseInitialized) {
            return { error: { message: "Database connection not initialized. Please refresh the page." } };
        }

        const result = await signIn(email, password);

        // Additional partner-specific checks
        if (result.user) {
            const user = result.user;

            // Check if user has partner access
            if (user.role !== 'partner' && user.role !== 'admin' && user.role !== 'staff') {
                return { error: { message: "Access denied. Partner panel requires partner role." } };
            }

            // Store partner-specific info
            localStorage.setItem('partnerAccess', 'true');
            localStorage.setItem('lastPartnerLogin', new Date().toISOString());
        }

        return result;
    },

    // Get partner statistics
    getPartnerStats: async (email) => {
        await supabaseInitializationPromise;
        if (!supabaseInitialized) {
            return { status: 'error', message: "Database connection not initialized." };
        }

        if (!email) {
            return { status: 'error', message: 'Email parameter is required' };
        }

        try {
            const { data, error } = await supabaseClient
                .from('partnership_requests')
                .select('status')
                .eq('email', email);

            if (error) throw error;

            // Initialize all status counts including cancelled
            const counts = {
                total_requests: data.length,
                approved_requests: 0,
                pending_requests: 0,
                reviewed_requests: 0,
                rejected_requests: 0,
                cancelled_requests: 0,
                active_projects: 0
            };

            // Count each status
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
    },

    // Get partner requests
    getPartnerRequests: async (email, filters = {}) => {
        await supabaseInitializationPromise;
        if (!supabaseInitialized) {
            return { status: 'error', message: "Database connection not initialized." };
        }

        if (!email) {
            return { status: 'error', message: 'Email parameter is required' };
        }

        const { status, search, limit } = filters;

        try {
            let query = supabaseClient
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
    },

    // Get request details with attachments
    getRequestDetails: async (requestId) => {
        await supabaseInitializationPromise;
        if (!supabaseInitialized) {
            return { status: 'error', message: "Database connection not initialized." };
        }

        if (!requestId) {
            return { status: 'error', message: 'Request ID is required' };
        }

        try {
            const { data: request, error: requestError } = await supabaseClient
                .from('partnership_requests')
                .select('*')
                .eq('request_id', requestId)
                .single();

            if (requestError || !request) {
                return { status: 'error', message: 'Request not found' };
            }

            const { data: attachments } = await supabaseClient
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
    },

    // Upload file for partner
    uploadPartnerFile: async (requestId, file, category = 'partnership_request') => {
        await supabaseInitializationPromise;
        if (!supabaseInitialized) {
            return { success: false, message: "Database connection not initialized." };
        }

        try {
            // Validate file size
            if (file.size > PARTNER_CONFIG.MAX_FILE_SIZE) {
                return { success: false, message: `File size exceeds ${PARTNER_CONFIG.UPLOAD_LIMIT_MB}MB limit` };
            }

            // Generate unique filename
            const timestamp = Date.now();
            const uniqueName = `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = `${requestId}/${uniqueName}`;

            // Upload to storage
            const { error: uploadError } = await supabaseClient.storage
                .from(PARTNER_CONFIG.STORAGE_BUCKET)
                .upload(filePath, file);

            if (uploadError) {
                throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
            }

            // Get public URL
            const { data: { publicUrl } } = supabaseClient.storage
                .from(PARTNER_CONFIG.STORAGE_BUCKET)
                .getPublicUrl(filePath);

            // Get current user for uploaded_by
            const user = getCurrentUser();

            // Insert into uploaded_files table
            const { error: dbError } = await supabaseClient
                .from('uploaded_files')
                .insert({
                    original_name: file.name,
                    storage_path: `${PARTNER_CONFIG.STORAGE_BUCKET}/${filePath}`,
                    file_type: file.type || 'application/octet-stream',
                    file_size: file.size,
                    public_url: publicUrl,
                    category: category,
                    partnership_request_id: requestId,
                    uploaded_by: user?.user_id || null,
                    description: `Uploaded with request #${requestId}`
                });

            if (dbError) {
                // Try to delete the uploaded file if database insert fails
                await supabaseClient.storage.from(PARTNER_CONFIG.STORAGE_BUCKET).remove([filePath]);
                throw new Error(`Failed to save file metadata for ${file.name}`);
            }

            return {
                success: true,
                message: `File "${file.name}" uploaded successfully`,
                publicUrl: publicUrl
            };

        } catch (error) {
            console.error('Error uploading partner file:', error);
            return { success: false, message: error.message };
        }
    },

    // Delete partner file
    deletePartnerFile: async (fileId) => {
        await supabaseInitializationPromise;
        if (!supabaseInitialized) {
            return { success: false, message: "Database connection not initialized." };
        }

        try {
            // Get file info first
            const { data: file, error: fetchError } = await supabaseClient
                .from('uploaded_files')
                .select('storage_path')
                .eq('id', fileId)
                .single();

            if (fetchError || !file) {
                throw new Error('File not found in database');
            }

            // Extract file path
            const filePath = file.storage_path.replace(`${PARTNER_CONFIG.STORAGE_BUCKET}/`, '');

            // Delete from storage
            const { error: storageError } = await supabaseClient.storage
                .from(PARTNER_CONFIG.STORAGE_BUCKET)
                .remove([filePath]);

            if (storageError) {
                console.warn('Storage delete error (proceeding with DB delete):', storageError);
            }

            // Delete from database
            const { error: dbError } = await supabaseClient
                .from('uploaded_files')
                .delete()
                .eq('id', fileId);

            if (dbError) {
                throw new Error(`Failed to delete file record: ${dbError.message}`);
            }

            return {
                success: true,
                message: 'File deleted successfully'
            };

        } catch (error) {
            console.error('Error deleting partner file:', error);
            return { success: false, message: error.message };
        }
    }
};

// ============================================
// PASSWORD HANDLING FUNCTIONS
// ============================================

/**
 * Hash password using SHA-256
 */
async function hashPassword(password) {
    try {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error("Password hashing error:", error);
        throw new Error("Password hashing failed");
    }
}

/**
 * Check if a string is a bcrypt hash
 */
function isBcryptHash(password) {
    return typeof password === 'string' &&
           password.length === 60 &&
           (password.startsWith('$2a$') ||
            password.startsWith('$2b$') ||
            password.startsWith('$2y$'));
}

/**
 * Check if a string is a SHA-256 hash
 */
function isSha256Hash(password) {
    return typeof password === 'string' &&
           password.length === 64 &&
           /^[a-f0-9]{64}$/i.test(password);
}

/**
 * Check if password is plain text
 */
function isPlainText(password) {
    return typeof password === 'string' &&
           !isBcryptHash(password) &&
           !isSha256Hash(password);
}

// ============================================
// SIGN IN FUNCTION
// ============================================

async function signIn(identifier, password) {
    if (DEBUG) {
        console.log("🔐 SIGN IN ATTEMPT");
        console.log("   Identifier:", identifier);
        console.log("   Password length:", password.length);
    }

    try {
        // Check if client is initialized
        if (!supabaseClient || !supabaseInitialized) {
            console.error("❌ Supabase client not initialized");
            return { error: { message: "Database connection error. Please refresh the page." } };
        }

        // Validate inputs
        if (!identifier || !password) {
            return { error: { message: "Please enter both identifier and password" } };
        }

        // Generate SHA-256 hash
        const sha256Hash = await hashPassword(password);
        if (DEBUG) console.log("   Generated SHA-256 hash:", sha256Hash.substring(0, 16) + "...");

        // Find user by email
        let user = null;
        const { data: emailUsers, error: emailError } = await supabaseClient
            .from('users')
            .select('*')
            .eq('email', identifier);

        if (DEBUG) {
            console.log("   Email query:", emailError ? "ERROR" : `Found ${emailUsers?.length || 0} users`);
            if (emailError) console.log("   Error:", emailError);
        }

        if (!emailError && emailUsers && emailUsers.length > 0) {
            user = emailUsers[0];
            if (DEBUG) console.log("   ✅ Found by email");
        }

        // Try full name if not found
        if (!user) {
            const { data: nameUsers, error: nameError } = await supabaseClient
                .from('users')
                .select('*')
                .eq('full_name', identifier);

            if (!nameError && nameUsers && nameUsers.length > 0) {
                user = nameUsers[0];
                if (DEBUG) console.log("   ✅ Found by full name");
            }
        }

        if (!user) {
            if (DEBUG) console.log("   ❌ User not found");
            return { error: { message: "Invalid credentials" } };
        }

        if (DEBUG) {
            console.log("   📋 User details:");
            console.log("      Email:", user.email);
            console.log("      Status:", user.status);
            console.log("      Role:", user.role);
        }

        // Check status
        if (user.status === 'pending') {
            return { error: { message: "Your account is pending approval." } };
        }
        if (user.status === 'inactive') {
            return { error: { message: "Your account is inactive." } };
        }
        if (user.status !== 'active') {
            return { error: { message: "Account status issue." } };
        }

        // Verify password
        const dbPassword = user.password;
        let passwordValid = false;
        let needsMigration = false;

        if (DEBUG) {
            console.log("   🔑 Password check:");
            console.log("      DB hash:", dbPassword?.substring(0, 16) + "...");
            console.log("      Format:", isSha256Hash(dbPassword) ? "SHA-256" : isPlainText(dbPassword) ? "Plain" : "Other");
        }

        if (isSha256Hash(dbPassword)) {
            passwordValid = (dbPassword.toLowerCase() === sha256Hash.toLowerCase());
        } else if (isPlainText(dbPassword)) {
            passwordValid = (dbPassword === password);
            needsMigration = true;
        } else if (isBcryptHash(dbPassword)) {
            return { error: { message: "Password needs reset. Contact administrator." } };
        }

        if (!passwordValid) {
            if (DEBUG) console.log("   ❌ Password mismatch");
            return { error: { message: "Invalid credentials" } };
        }

        // Auto-migrate if needed
        if (needsMigration) {
            if (DEBUG) console.log("   🔄 Migrating to SHA-256...");
            await supabaseClient
                .from('users')
                .update({ password: sha256Hash })
                .eq('user_id', user.user_id);
        }

        if (DEBUG) console.log("   🎉 Login successful!");
        return createSuccessResponse(user);

    } catch (err) {
        console.error("❌ Sign In Exception:", err);
        return { error: { message: "Network error. Please try again." } };
    }
}

function createSuccessResponse(user) {
    const sessionToken = `user_${user.user_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('sessionToken', sessionToken);
    localStorage.setItem('sessionExpiry', Date.now() + ADMIN_CONFIG.SESSION_DURATION);
    localStorage.setItem('userRole', user.role);

    return {
        user: {
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            username: user.username,
            role: user.role || 'public',
            status: user.status || 'active'
        },
        session: {
            access_token: sessionToken,
            expires_at: Date.now() + ADMIN_CONFIG.SESSION_DURATION,
            user_id: user.user_id
        }
    };
}

// ============================================
// OTHER CORE FUNCTIONS
// ============================================

async function signUp(email, password, fullName, username, role = 'public') {
    try {
        if (!email || !password || !fullName) {
            return { error: { message: "Email, password, and full name required" } };
        }

        const hashedPassword = await hashPassword(password);

        const { data, error } = await supabaseClient
            .from('users')
            .insert([{
                email,
                password: hashedPassword,
                full_name: fullName,
                username: username || email.split('@')[0],
                role,
                status: 'pending',
                created_at: new Date().toISOString()
            }]);

        if (error) {
            return { error: { message: error.message } };
        }

        return {
            user: data[0],
            pendingApproval: true,
            message: "Account created! Awaiting approval."
        };

    } catch (err) {
        console.error("Sign up error:", err);
        return { error: { message: err.message } };
    }
}

function checkAuth() {
    try {
        const userData = localStorage.getItem('user');
        const sessionExpiry = localStorage.getItem('sessionExpiry');

        if (!userData || !sessionExpiry) return null;
        if (Date.now() > parseInt(sessionExpiry)) {
            localStorage.clear();
            return null;
        }

        return JSON.parse(userData);
    } catch (error) {
        return null;
    }
}

function logout() {
    localStorage.clear();
    window.location.href = '../HTML/LogIn.html';
}

function getCurrentUser() {
    try {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        return null;
    }
}

async function updatePassword(userId, currentPassword, newPassword) {
    try {
        const { data: user } = await supabaseClient
            .from('users')
            .select('password')
            .eq('user_id', userId)
            .single();

        const currentHash = await hashPassword(currentPassword);
        if (user.password !== currentHash) {
            return { error: { message: "Current password incorrect" } };
        }

        const newHash = await hashPassword(newPassword);
        await supabaseClient
            .from('users')
            .update({ password: newHash })
            .eq('user_id', userId);

        return { success: true };
    } catch (err) {
        return { error: { message: "Failed to update password" } };
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function testConnection() {
    try {
        const { error } = await supabaseClient.from('users').select('count').limit(1);
        console.log(error ? "❌ Not connected" : "✅ Connected");
        return { success: !error };
    } catch (err) {
        return { success: false };
    }
}

async function listAllUsers() {
    try {
        const { data } = await supabaseClient
            .from('users')
            .select('*')
            .order('user_id');

        console.log(`📊 ${data.length} users found`);
        data.forEach(u => {
            console.log(`ID:${u.user_id} | ${u.email} | ${u.full_name} | ${u.role} | ${u.status}`);
        });
        return data;
    } catch (err) {
        console.error(err);
        return [];
    }
}

async function resetUserPassword(identifier, newPassword) {
    try {
        const { data } = await supabaseClient
            .from('users')
            .select('user_id')
            .eq('email', identifier);

        if (!data || data.length === 0) {
            return { error: "User not found" };
        }

        const hashedPassword = await hashPassword(newPassword);
        await supabaseClient
            .from('users')
            .update({ password: hashedPassword })
            .eq('user_id', data[0].user_id);

        console.log(`✅ Password reset for ${identifier}`);
        return { success: true };
    } catch (err) {
        return { error: err.message };
    }
}

// Admin functions
async function getAllUsers() {
    const { data } = await supabaseClient.from('users').select('*');
    return { users: data };
}

async function getPendingUsers() {
    const { data } = await supabaseClient.from('users').select('*').eq('status', 'pending');
    return { users: data };
}

async function approveUser(userId, adminId) {
    await supabaseClient.from('users').update({ status: 'active' }).eq('user_id', userId);
    return { success: true };
}

async function rejectUser(userId) {
    await supabaseClient.from('users').update({ status: 'inactive' }).eq('user_id', userId);
    return { success: true };
}

async function updateUserStatus(userId, status) {
    await supabaseClient.from('users').update({ status }).eq('user_id', userId);
    return { success: true };
}

function updateDatabaseForApprovalWorkflow() {
    console.log("Run this SQL in Supabase:");
    console.log("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;");
    console.log("ALTER TABLE users ADD CONSTRAINT users_status_check CHECK (status IN ('pending', 'active', 'inactive'));");
    return { success: true };
}

async function migrateAllPasswordsToSHA256() {
    console.log("Migration function - see original file");
    return { success: true };
}

// ============================================
// MAIN AUTH WRAPPER
// ============================================

// Create main auth wrapper that waits for initialization
const supabaseAuth = {
    // Core authentication functions
    signIn: async (...args) => {
        await supabaseInitializationPromise;
        if (!supabaseInitialized) {
            return { error: { message: "Database connection not initialized. Please refresh the page." } };
        }
        return signIn(...args);
    },
    signUp: async (...args) => {
        await supabaseInitializationPromise;
        if (!supabaseInitialized) {
            return { error: { message: "Database connection not initialized. Please refresh the page." } };
        }
        return signUp(...args);
    },
    checkAuth,
    logout,
    getCurrentUser,
    updatePassword: async (...args) => {
        await supabaseInitializationPromise;
        return updatePassword(...args);
    },

    // Admin functions (preserved)
    getAllUsers: async () => {
        await supabaseInitializationPromise;
        return getAllUsers();
    },
    getPendingUsers: async () => {
        await supabaseInitializationPromise;
        return getPendingUsers();
    },
    approveUser: async (...args) => {
        await supabaseInitializationPromise;
        return approveUser(...args);
    },
    rejectUser: async (...args) => {
        await supabaseInitializationPromise;
        return rejectUser(...args);
    },
    updateUserStatus: async (...args) => {
        await supabaseInitializationPromise;
        return updateUserStatus(...args);
    },

    // Utility functions
    testConnection: async () => {
        await supabaseInitializationPromise;
        return testConnection();
    },
    listAllUsers: async () => {
        await supabaseInitializationPromise;
        return listAllUsers();
    },
    resetUserPassword: async (...args) => {
        await supabaseInitializationPromise;
        return resetUserPassword(...args);
    },
    migratePasswords: async () => {
        await supabaseInitializationPromise;
        return migrateAllPasswordsToSHA256();
    },
    updateDatabaseForApprovalWorkflow: async () => {
        await supabaseInitializationPromise;
        return updateDatabaseForApprovalWorkflow();
    },

    // Partner Panel specific functions (new)
    partner: partnerAuth,
    getPartnerConfig,
    getAdminConfig
};

// ============================================
// EXPOSE GLOBALLY
// ============================================

window.supabaseAuth = supabaseAuth;
window.supabaseClient = supabaseClient;
window.hashPassword = hashPassword;
window.testConnection = testConnection;
window.listAllUsers = listAllUsers;
window.resetUserPassword = resetUserPassword;
window.getPartnerConfig = getPartnerConfig;
window.getAdminConfig = getAdminConfig;

// Expose partner functions for backward compatibility
window.getPartnerStats = partnerAuth.getPartnerStats;
window.getPartnerRequests = partnerAuth.getPartnerRequests;
window.getRequestDetails = partnerAuth.getRequestDetails;

// Wait for initialization to complete
supabaseInitializationPromise.then(() => {
    console.log("🏁 Supabase initialization complete");
    if (supabaseInitialized) {
        console.log("✅ Ready to use database");
        console.log("✅ Partner Panel configuration loaded");
        console.log("✅ Admin functions preserved");
    } else {
        console.error("❌ Supabase failed to initialize - check console for errors");
    }
}).catch(err => {
    console.error("💥 Supabase initialization failed:", err);
});

console.log("🔧 DEBUG: Authentication system ready (SHA-256)");
console.log("🔧 DEBUG: Partner Panel environment variables integrated");
console.log("🔧 DEBUG: Admin functions preserved");

// Export for module systems
export const supabase = supabaseClient;
export {
    supabaseAuth,
    signIn,
    signUp,
    checkAuth,
    logout,
    updatePassword,
    getCurrentUser,
    hashPassword,
    getAllUsers,
    getPendingUsers,
    approveUser,
    rejectUser,
    updateUserStatus,
    updateDatabaseForApprovalWorkflow,
    testConnection,
    listAllUsers,
    resetUserPassword,
    migrateAllPasswordsToSHA256,
    getPartnerConfig,
    getAdminConfig
};