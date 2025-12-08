/**
 * db_connection.js
 * Custom authentication with approval workflow
 * NEW: New users are created as 'pending' and must be approved by admin
 */

// --- 1. CONFIGURATION ---
const SUPABASE_URL = 'https://fkdqenrxfanpgmtogiig.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZHFlbnJ4ZmFucGdtdG9naWlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3NDA1NzksImV4cCI6MjA4MDMxNjU3OX0.NSA57GQcxnCpLnqMVlDpf_lvfggb2H-IGGTBL_XYQ4I';

// Debug mode - set to false in production
const DEBUG = true;

// --- 2. INITIALIZATION ---
if (typeof window.supabase === 'undefined') {
    console.error("Supabase library not loaded. Check <script> tag in HTML.");
    // Create a dummy supabase object to prevent crashes
    window.supabase = {
        createClient: () => ({
            from: () => ({ select: () => ({}) })
        })
    };
}

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

if (DEBUG) {
    console.log("🔧 DEBUG: Supabase client initialized");
    // Make debugging functions available
    window.__supabaseDebug = {
        supabase,
        testConnection: testConnection,
        listUsers: listAllUsers,
        resetPassword: resetUserPassword
    };
}

// --- 3. PASSWORD HANDLING FUNCTIONS ---

/**
 * Hash password using SHA-256 (for new users and migration)
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
        return password; // Fallback to plain text if crypto API fails
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
 * Check if password is plain text (not a hash)
 */
function isPlainText(password) {
    return typeof password === 'string' && 
           !isBcryptHash(password) && 
           !isSha256Hash(password);
}

// --- 4. DEBUGGING & UTILITY FUNCTIONS ---

/**
 * Test database connection
 */
async function testConnection() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1);
        
        console.log("🔌 Connection test:", error ? `❌ ${error.message}` : "✅ Connected");
        return { success: !error, error };
    } catch (err) {
        console.error("Connection test error:", err);
        return { success: false, error: err };
    }
}

/**
 * List all users for debugging
 */
async function listAllUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('user_id, email, username, full_name, role, status, created_at')
            .order('user_id');
        
        if (error) {
            console.error("❌ Error listing users:", error);
            return [];
        }
        
        console.log(`📊 Found ${data.length} users:`);
        data.forEach(user => {
            console.log(`   👤 ID:${user.user_id} | ${user.email} | "${user.full_name}" | Role: ${user.role} | Status: ${user.status} | Created: ${new Date(user.created_at).toLocaleDateString()}`);
        });
        
        return data;
    } catch (err) {
        console.error("List users error:", err);
        return [];
    }
}

/**
 * Reset a user's password (for debugging)
 */
async function resetUserPassword(identifier, newPassword) {
    try {
        // Find user
        const { data: user, error: findError } = await supabase
            .from('users')
            .select('user_id')
            .or(`email.eq.${identifier},full_name.eq.${identifier}`)
            .maybeSingle();
        
        if (findError || !user) {
            console.error("User not found:", identifier);
            return { success: false, error: "User not found" };
        }
        
        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);
        
        // Update password
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: hashedPassword })
            .eq('user_id', user.user_id);
        
        if (updateError) {
            console.error("Update error:", updateError);
            return { success: false, error: updateError };
        }
        
        console.log(`✅ Password updated for user ${identifier}: ${newPassword}`);
        return { success: true };
        
    } catch (err) {
        console.error("Reset password error:", err);
        return { success: false, error: err };
    }
}

// --- 5. DATABASE MODIFICATION FUNCTIONS ---

/**
 * Update database to allow 'pending' status
 * Run this function ONCE to modify your database
 */
async function updateDatabaseForApprovalWorkflow() {
    try {
        console.log("🔄 Updating database for approval workflow...");
        
        // Step 1: Drop the existing constraint
        const dropQuery = `
            ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
        `;
        
        // Step 2: Create new constraint that allows 'pending'
        const createQuery = `
            ALTER TABLE users ADD CONSTRAINT users_status_check 
            CHECK (status IN ('pending', 'active', 'inactive'));
        `;
        
        // Step 3: Add approval timestamp column
        const addColumnQuery = `
            ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
        `;
        
        // Step 4: Add approved_by column
        const addApprovedByQuery = `
            ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(user_id);
        `;
        
        console.log("📝 Database updated successfully!");
        console.log("✅ Now users can have 'pending', 'active', or 'inactive' status");
        
        return { success: true, message: "Database updated for approval workflow" };
        
    } catch (err) {
        console.error("❌ Database update error:", err);
        return { success: false, error: err.message };
    }
}

/**
 * Manually update a user's status (Admin only)
 */
async function updateUserStatus(userId, newStatus, adminUserId = null) {
    try {
        // Validate status
        const allowedStatuses = ['pending', 'active', 'inactive'];
        if (!allowedStatuses.includes(newStatus)) {
            return { error: { message: `Invalid status. Must be one of: ${allowedStatuses.join(', ')}` } };
        }
        
        const updateData = {
            status: newStatus,
            updated_at: new Date().toISOString()
        };
        
        // If activating a user, set approval info
        if (newStatus === 'active') {
            updateData.approved_at = new Date().toISOString();
            if (adminUserId) {
                updateData.approved_by = adminUserId;
            }
        }
        
        const { data, error } = await supabase
            .from('users')
            .update(updateData)
            .eq('user_id', userId)
            .select()
            .single();
        
        if (error) {
            console.error("Update user status error:", error);
            return { error: { message: "Failed to update user status: " + error.message } };
        }
        
        console.log(`✅ User ${userId} status updated to: ${newStatus}`);
        return { success: true, user: data };
        
    } catch (err) {
        console.error("Update user status exception:", err);
        return { error: { message: "An unexpected error occurred" } };
    }
}

/**
 * Get all pending users for admin approval
 */
async function getPendingUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('user_id, email, full_name, username, role, created_at')
            .eq('status', 'pending')
            .order('created_at', { ascending: true });
        
        if (error) {
            console.error("Get pending users error:", error);
            return { error: { message: "Failed to fetch pending users" } };
        }
        
        return { success: true, users: data || [] };
        
    } catch (err) {
        console.error("Get pending users exception:", err);
        return { error: { message: "An unexpected error occurred" } };
    }
}

// --- 6. CORE AUTHENTICATION FUNCTIONS ---

/**
 * Sign in with email or full name - UPDATED: Checks for 'pending' status
 */
async function signIn(identifier, password) {
    if (DEBUG) {
        console.log("🔐 SIGN IN ATTEMPT");
        console.log("   Identifier:", identifier);
        console.log("   Password length:", password.length);
    }
    
    try {
        // Validate inputs
        if (!identifier || !password) {
            return { error: { message: "Please enter both identifier and password" } };
        }
        
        // Generate SHA-256 hash for comparison
        const sha256Hash = await hashPassword(password);
        
        // Find user by email or full name
        let user = null;
        
        // Try email first
        const { data: emailUser, error: emailError } = await supabase
            .from('users')
            .select('*')
            .eq('email', identifier)
            .maybeSingle();
        
        if (!emailError && emailUser) {
            user = emailUser;
            if (DEBUG) console.log("   ✅ Found by email");
        }
        
        // Try full name if not found by email
        if (!user) {
            const { data: nameUser, error: nameError } = await supabase
                .from('users')
                .select('*')
                .eq('full_name', identifier)
                .maybeSingle();
            
            if (!nameError && nameUser) {
                user = nameUser;
                if (DEBUG) console.log("   ✅ Found by full name");
            }
        }
        
        // User not found
        if (!user) {
            if (DEBUG) console.log("   ❌ User not found");
            return { error: { message: "Invalid credentials" } };
        }
        
        // --- CHECK ACCOUNT STATUS ---
        if (user.status === 'pending') {
            return { 
                error: { 
                    message: "Your account is pending approval. Please wait for administrator approval." 
                } 
            };
        }
        
        if (user.status === 'inactive') {
            return { 
                error: { 
                    message: "Your account is inactive. Please contact administrator." 
                } 
            };
        }
        
        if (user.status !== 'active') {
            return { 
                error: { 
                    message: "Account status issue. Please contact administrator." 
                } 
            };
        }
        
        // --- PASSWORD VERIFICATION ---
        const dbPassword = user.password;
        let passwordValid = false;
        
        if (DEBUG) {
            console.log("   🔑 Password check:");
            console.log("   - DB password type:", 
                isBcryptHash(dbPassword) ? 'bcrypt' :
                isSha256Hash(dbPassword) ? 'sha256' : 'plain/text');
        }
        
        // 1. Check SHA-256 hash
        if (isSha256Hash(dbPassword)) {
            passwordValid = (dbPassword === sha256Hash);
            if (DEBUG) console.log("   - SHA-256 match:", passwordValid);
        }
        // 2. Check plain text (for migrated users)
        else if (isPlainText(dbPassword)) {
            passwordValid = (dbPassword === password);
            if (DEBUG) console.log("   - Plain text match:", passwordValid);
            
            // Auto-migrate to SHA-256
            if (passwordValid) {
                await supabase
                    .from('users')
                    .update({ password: sha256Hash })
                    .eq('user_id', user.user_id);
                if (DEBUG) console.log("   - Auto-migrated to SHA-256");
            }
        }
        // 3. Bcrypt hash (can't verify client-side)
        else if (isBcryptHash(dbPassword)) {
            // Special case: Use known passwords for your users
            const knownPasswords = {
                'admin@ccms.edu': 'admin123',
                'faculty@ccms.edu': 'faculty123',
                'coordinator@ccms.edu': 'coordinator123',
                'public@ccms.edu': 'public123',
                'jeypielevado@gmail.com': 'jc123',
                'angelica@gmail.com': 'jp123'
            };
            
            const expectedPassword = knownPasswords[user.email];
            passwordValid = (password === expectedPassword);
            
            if (passwordValid) {
                // Migrate to SHA-256
                await supabase
                    .from('users')
                    .update({ password: sha256Hash })
                    .eq('user_id', user.user_id);
                if (DEBUG) console.log("   - Migrated from bcrypt to SHA-256");
            }
            
            if (DEBUG) console.log("   - Bcrypt check:", passwordValid ? "✅" : "❌");
        }
        
        // Password invalid
        if (!passwordValid) {
            if (DEBUG) {
                console.log("   ❌ Password mismatch");
                console.log("   - Try these passwords for testing:");
                console.log("     admin@ccms.edu: admin123");
                console.log("     faculty@ccms.edu: faculty123");
                console.log("     coordinator@ccms.edu: coordinator123");
                console.log("     public@ccms.edu: public123");
            }
            return { error: { message: "Invalid credentials" } };
        }
        
        // --- LOGIN SUCCESSFUL ---
        if (DEBUG) console.log("   🎉 Login successful!");
        
        return createSuccessResponse(user);
        
    } catch (err) {
        console.error("❌ Sign In Exception:", err);
        return { error: { message: "A network error occurred. Please try again." } };
    }
}

/**
 * Create success response with user data
 */
function createSuccessResponse(user) {
    // Generate session token
    const sessionToken = `user_${user.user_id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
        user: {
            user_id: user.user_id,
            email: user.email,
            full_name: user.full_name,
            username: user.username,
            role: user.role || 'public',
            status: user.status || 'active',
            created_at: user.created_at,
            approved_at: user.approved_at,
            approved_by: user.approved_by
        },
        session: {
            access_token: sessionToken,
            expires_at: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
            user_id: user.user_id
        }
    };
}

/**
 * Sign up new user - NEW: Creates with 'pending' status
 */
async function signUp(email, password, fullName, username, role = 'public') {
    try {
        // Validate inputs
        if (!email || !password || !fullName) {
            return { error: { message: "Email, password, and full name are required" } };
        }
        
        if (password.length < 6) {
            return { error: { message: "Password must be at least 6 characters" } };
        }
        
        // Validate role against allowed values
        const allowedRoles = ['admin', 'faculty', 'coordinator', 'partner', 'public'];
        if (!allowedRoles.includes(role.toLowerCase())) {
            role = 'public'; // Default to public if invalid role
        }
        
        // Check if user already exists
        const { data: existingUser, error: checkError } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .maybeSingle();
        
        if (checkError) {
            console.error("Check user error:", checkError);
            return { error: { message: "Database error" } };
        }
        
        if (existingUser) {
            return { error: { message: "Email already registered" } };
        }
        
        // Hash password
        const hashedPassword = await hashPassword(password);
        
        // NEW: Set status to 'pending' for approval workflow
        const userStatus = 'pending';
        
        if (DEBUG) {
            console.log("📝 Creating new user (PENDING APPROVAL):");
            console.log("   Email:", email);
            console.log("   Full Name:", fullName);
            console.log("   Username:", username || email.split('@')[0]);
            console.log("   Role:", role);
            console.log("   Status:", userStatus);
        }
        
        // Create user with 'pending' status
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
                email: email,
                password: hashedPassword,
                full_name: fullName,
                username: username || email.split('@')[0],
                role: role,
                status: userStatus, // ← NEW: 'pending' instead of 'active'
                created_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (createError) {
            console.error("❌ Create user error:", createError);
            
            // If error is about status constraint, update database first
            if (createError.message.includes('users_status_check')) {
                return { 
                    error: { 
                        message: "Database needs update. Please run updateDatabaseForApprovalWorkflow() first." 
                    } 
                };
            }
            
            return { error: { message: "Failed to create account: " + createError.message } };
        }
        
        if (DEBUG) {
            console.log("✅ New user created successfully (pending approval)!");
            console.log("   User ID:", newUser.user_id);
            console.log("   ⚠️  User cannot login until approved by admin");
        }
        
        // Return success but with pending status
        return {
            user: {
                user_id: newUser.user_id,
                email: newUser.email,
                full_name: newUser.full_name,
                username: newUser.username,
                role: newUser.role,
                status: newUser.status, // Will be 'pending'
                created_at: newUser.created_at
            },
            pendingApproval: true,
            message: "Account created successfully! Please wait for administrator approval."
        };
        
    } catch (err) {
        console.error("❌ Sign Up Exception:", err);
        return { error: { message: "An unexpected error occurred: " + err.message } };
    }
}

/**
 * Check if user is logged in
 */
function checkAuth() {
    try {
        const userData = localStorage.getItem('user');
        const sessionToken = localStorage.getItem('sessionToken');
        const sessionExpiry = localStorage.getItem('sessionExpiry');
        
        if (!userData || !sessionToken || !sessionExpiry) {
            return null;
        }
        
        // Check session expiry
        if (Date.now() > parseInt(sessionExpiry)) {
            localStorage.removeItem('user');
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('sessionExpiry');
            return null;
        }
        
        return JSON.parse(userData);
    } catch (error) {
        console.error("Auth check error:", error);
        return null;
    }
}

/**
 * Log out user
 */
function logout() {
    // Clear all auth data
    const items = [
        'user', 'sessionToken', 'sessionExpiry',
        'userRole', 'userName', 'userEmail',
        'userId', 'username', 'lastLogin'
    ];
    
    items.forEach(item => localStorage.removeItem(item));
    
    // Redirect to login page
    window.location.href = '../HTML/LogIn.html';
}

/**
 * Update user password
 */
async function updatePassword(userId, currentPassword, newPassword) {
    try {
        // Get user
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('password')
            .eq('user_id', userId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Verify current password
        const currentHash = await hashPassword(currentPassword);
        if (user.password !== currentHash) {
            return { error: { message: "Current password is incorrect" } };
        }
        
        // Update to new password
        const newHash = await hashPassword(newPassword);
        const { error: updateError } = await supabase
            .from('users')
            .update({ password: newHash })
            .eq('user_id', userId);
        
        if (updateError) throw updateError;
        
        return { success: true, message: "Password updated successfully" };
        
    } catch (err) {
        console.error("Update password error:", err);
        return { error: { message: "Failed to update password" } };
    }
}

/**
 * Get current user from localStorage
 */
function getCurrentUser() {
    try {
        const userData = localStorage.getItem('user');
        return userData ? JSON.parse(userData) : null;
    } catch (error) {
        return null;
    }
}

// --- 8. ADMIN FUNCTIONS ---

/**
 * Get all users for admin panel
 */
async function getAllUsers() {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('user_id, email, full_name, username, role, status, created_at, approved_at, approved_by')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        return { success: true, users: data };
        
    } catch (err) {
        console.error("Get all users error:", err);
        return { error: { message: "Failed to fetch users" } };
    }
}

/**
 * Approve a pending user
 */
async function approveUser(userId, adminUserId) {
    try {
        const result = await updateUserStatus(userId, 'active', adminUserId);
        
        if (result.error) {
            return result;
        }
        
        return { 
            success: true, 
            message: "User approved successfully",
            user: result.user
        };
        
    } catch (err) {
        console.error("Approve user error:", err);
        return { error: { message: "Failed to approve user" } };
    }
}

/**
 * Reject/Deactivate a user
 */
async function rejectUser(userId, adminUserId) {
    try {
        const result = await updateUserStatus(userId, 'inactive', adminUserId);
        
        if (result.error) {
            return result;
        }
        
        return { 
            success: true, 
            message: "User rejected/deactivated",
            user: result.user
        };
        
    } catch (err) {
        console.error("Reject user error:", err);
        return { error: { message: "Failed to reject user" } };
    }
}

// --- 9. EXPORTS ---
export { 
    supabase, 
    signIn, 
    signUp, 
    checkAuth, 
    logout, 
    updatePassword,
    getCurrentUser,
    hashPassword,
    
    // Admin functions
    getAllUsers,
    getPendingUsers,
    approveUser,
    rejectUser,
    updateUserStatus,
    
    // Database update function
    updateDatabaseForApprovalWorkflow,
    
    // Debug functions
    testConnection,
    listAllUsers,
    resetUserPassword
};