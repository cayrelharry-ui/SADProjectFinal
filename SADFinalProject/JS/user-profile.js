// user-profile.js - Dynamic user profile management for ALL pages
import { supabase } from './db_connection.js';

// DOM Elements - Support multiple page layouts
let currentUser = null;
let userRole = 'guest';

// Initialize user profile
export async function initUserProfile() {
    console.log("UserProfile: Initializing for all pages...");
    
    try {
        // Try Supabase Auth first
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.warn("Supabase auth error:", error.message);
            // Fall back to localStorage
            await checkLocalStorage();
        } else if (user) {
            // User is logged in via Supabase
            await loadUserData(user.id);
        } else {
            // No Supabase user, check localStorage
            await checkLocalStorage();
        }
        
        // Update UI on ALL pages
        updateUserInterface();
        
    } catch (error) {
        console.error("Failed to initialize user profile:", error);
        setGuestUser();
        updateUserInterface();
    }
}

// Check localStorage for user data (for your custom auth)
async function checkLocalStorage() {
    try {
        const storedUserRole = localStorage.getItem('userRole');
        const storedUser = localStorage.getItem('user');
        
        console.log("LocalStorage check - role:", storedUserRole, "user:", storedUser);
        
        if (storedUserRole && storedUser) {
            userRole = storedUserRole;
            currentUser = JSON.parse(storedUser);
            console.log(`Loaded from localStorage: ${currentUser.full_name}, Role: ${userRole}`);
        } else {
            // No user logged in
            setGuestUser();
        }
    } catch (error) {
        console.error("Error checking localStorage:", error);
        setGuestUser();
    }
}

// Load user data from database (for Supabase users)
async function loadUserData(userId) {
    try {
        // Fetch user details from your users table
        const { data, error } = await supabase
            .from('users')
            .select('full_name, email, role, status')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            console.warn("Could not fetch user data:", error.message);
            setGuestUser();
            return;
        }
        
        if (data) {
            currentUser = {
                id: userId,
                full_name: data.full_name || 'User',
                email: data.email || '',
                role: data.role || 'guest',
                status: data.status || 'active'
            };
            userRole = data.role || 'guest';
            
            console.log("User profile loaded from database:", currentUser);
        }
    } catch (error) {
        console.error("Error loading user data:", error);
        setGuestUser();
    }
}

// Set guest user display
function setGuestUser() {
    currentUser = null;
    userRole = 'guest';
    console.log("Set as guest user");
}

// Update the user interface on ALL pages
export function updateUserInterface() {
    console.log("UserProfile: Updating UI for role:", userRole, "User:", currentUser);
    
    // ==================== UPDATE USER STATUS TEXT ====================
    
    // 1. Update #user-status (News&Events page style)
    const userStatus = document.getElementById('user-status');
    if (userStatus) {
        if (userRole !== 'guest' && currentUser) {
            userStatus.textContent = currentUser.full_name || userRole.charAt(0).toUpperCase() + userRole.slice(1);
        } else {
            userStatus.textContent = 'Guest';
        }
    }
    
    // 2. Update #user-role-badge (News&Events page)
    const userRoleBadge = document.getElementById('user-role-badge');
    if (userRoleBadge) {
        if (userRole !== 'guest') {
            userRoleBadge.textContent = userRole;
            userRoleBadge.className = `user-role-indicator role-${userRole}`;
            userRoleBadge.classList.remove('hidden');
        } else {
            userRoleBadge.classList.add('hidden');
        }
    }
    
    // 3. Update #current-role (News&Events dropdown)
    const currentRole = document.getElementById('current-role');
    if (currentRole) {
        currentRole.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
    }
    
    // 4. Update traditional profile elements (Home page style)
    document.querySelectorAll('.text-sm.font-bold.text-gray-900').forEach(element => {
        if (element.closest('.relative.group') || element.closest('[id*="user"]')) {
            if (userRole !== 'guest' && currentUser) {
                element.textContent = currentUser.full_name || 'User';
            } else {
                element.textContent = 'Guest';
            }
        }
    });
    
    document.querySelectorAll('.text-xs.text-gray-500').forEach(element => {
        if (element.closest('.relative.group') || element.closest('[id*="user"]')) {
            let roleDisplay = userRole.charAt(0).toUpperCase() + userRole.slice(1);
            element.textContent = roleDisplay;
            
            // Add role-specific styling
            element.className = 'text-xs truncate';
            if (userRole === 'admin') {
                element.classList.add('text-purple-600', 'font-bold');
            } else if (userRole === 'coordinator') {
                element.classList.add('text-blue-600', 'font-semibold');
            } else if (userRole === 'faculty') {
                element.classList.add('text-green-600', 'font-semibold');
            } else if (userRole === 'guest') {
                element.classList.add('text-gray-500');
            }
        }
    });
    
    // ==================== UPDATE DROPDOWN CONTENT ====================
    updateDropdownContent();
    
    // Notify other scripts that user status has been updated
    document.dispatchEvent(new CustomEvent('userProfileLoaded', {
        detail: { user: currentUser, role: userRole }
    }));
    
    console.log("UserProfile: UI update complete");
}

// Update dropdown content (SIMPLIFIED - Only Admin Panel & Logout)
function updateDropdownContent() {
    console.log("UserProfile: Updating dropdown content...");
    
    // Find the main user dropdown
    let dropdown = document.getElementById('user-dropdown');
    
    if (!dropdown) {
        console.log("No #user-dropdown found, looking for alternatives...");
        // Try to find any dropdown in the user menu container
        const userContainer = document.getElementById('user-menu-container');
        if (userContainer) {
            dropdown = userContainer.querySelector('div:last-child');
        }
    }
    
    if (!dropdown) {
        console.warn("No dropdown found to update!");
        return;
    }
    
    // Ensure dropdown is visible and has proper classes
    dropdown.classList.add('absolute', 'right-0', 'mt-2', 'bg-white', 'border', 'border-gray-100', 'rounded-lg', 'shadow-xl', 'z-50');
    dropdown.classList.remove('opacity-0', 'invisible');
    
    // Clear and rebuild dropdown content
    dropdown.innerHTML = '';
    
    if (userRole !== 'guest' && currentUser) {
        // User is logged in - SIMPLIFIED: Only Admin Panel (if admin) + Logout
        const isAdmin = userRole === 'admin' || userRole === 'faculty';
        
        let dropdownHTML = `
            <div class="w-48">
                <div class="px-4 py-3 border-b border-gray-100">
                    <div class="text-sm font-medium text-gray-900">${currentUser.full_name || 'User'}</div>
                    <div class="text-xs text-gray-500 mt-1">${userRole.charAt(0).toUpperCase() + userRole.slice(1)}</div>
                </div>
                
                <div class="py-1">
        `;
        
        // Add Admin Panel button ONLY for admins/faculty
        if (isAdmin) {
            dropdownHTML += `
                    <a href="admin-dashboard.html" 
                       class="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                        <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        </svg>
                        Admin Panel
                    </a>
            `;
        }
        
        // SIMPLIFIED: Only Logout button (no My Profile, no Settings, no Community Forum)
        dropdownHTML += `
                </div>
                
                <div class="py-1 border-t border-gray-100">
                    <button onclick="window.userProfile?.logout()"
                            class="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors">
                        <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
                        </svg>
                        Logout
                    </button>
                </div>
            </div>
        `;
        
        dropdown.innerHTML = dropdownHTML;
        
    } else {
        // User is guest - SIMPLIFIED: Only Login button
        dropdown.innerHTML = `
            <div class="w-48">
                <div class="px-4 py-3 border-b border-gray-100">
                    <div class="text-sm font-medium text-gray-900">Guest User</div>
                    <div class="text-xs text-gray-500 mt-1">Not logged in</div>
                </div>
                
                <div class="py-1">
                    <button onclick="window.location.href='HTML/LogIn.html'"
                            class="flex items-center w-full px-4 py-2 text-sm text-[#5A2C9D] hover:bg-purple-50 transition-colors">
                        <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path>
                        </svg>
                        Login
                    </button>
                </div>
            </div>
        `;
    }
    
    // Setup dropdown toggle functionality
    setupDropdownToggle();
}

// Setup dropdown show/hide functionality
function setupDropdownToggle() {
    const userMenuButton = document.getElementById('user-menu-button');
    const dropdown = document.getElementById('user-dropdown');
    
    if (!userMenuButton || !dropdown) {
        console.warn("Dropdown toggle elements not found");
        return;
    }
    
    // Remove existing event listeners
    userMenuButton.replaceWith(userMenuButton.cloneNode(true));
    const newButton = document.getElementById('user-menu-button');
    
    // Add click handler
    newButton.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = !dropdown.classList.contains('opacity-0');
        
        if (isVisible) {
            dropdown.classList.add('opacity-0', 'invisible');
        } else {
            dropdown.classList.remove('opacity-0', 'invisible');
        }
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!newButton.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('opacity-0', 'invisible');
        }
    });
}

// Logout function
export async function logout() {
    try {
        // Try Supabase logout first
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.warn("Supabase logout error:", error.message);
        }
        
        // Clear localStorage
        localStorage.removeItem('userRole');
        localStorage.removeItem('user');
        
        // Reset user state
        currentUser = null;
        userRole = 'guest';
        
        // Reload page to update UI
        window.location.reload();
        
    } catch (error) {
        console.error("Logout failed:", error);
        window.location.reload(); // Force reload anyway
    }
}

// Login function for testing
export function login(role = 'student', userData = null) {
    const user = userData || {
        full_name: role.charAt(0).toUpperCase() + role.slice(1) + ' User',
        email: `${role}@cnsc.edu.ph`,
        role: role,
        status: 'active'
    };
    
    localStorage.setItem('userRole', role);
    localStorage.setItem('user', JSON.stringify(user));
    
    currentUser = user;
    userRole = role;
    
    console.log(`UserProfile: Logged in as ${role}`);
    
    // Update UI immediately
    updateUserInterface();
    
    // Reload to ensure all scripts see the new user state
    setTimeout(() => window.location.reload(), 100);
}

// ==================== UTILITY FUNCTIONS ====================
export function isUserAdmin() {
    return userRole === 'admin' || userRole === 'faculty';
}

export function getUserDisplayName() {
    return currentUser ? currentUser.full_name : 'Guest';
}

export function getCurrentUser() {
    return currentUser;
}

export function isUserLoggedIn() {
    return userRole !== 'guest';
}

export function hasRole(role) {
    return userRole === role;
}

export function hasAnyRole(roles) {
    return roles.includes(userRole);
}

export function getUserRole() {
    return userRole;
}

export async function refreshUserProfile() {
    console.log("Refreshing user profile...");
    await initUserProfile();
}

// ==================== INITIALIZATION ====================
// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => initUserProfile(), 100);
    });
} else {
    setTimeout(() => initUserProfile(), 100);
}

// Make functions available globally
window.userProfile = {
    initUserProfile,
    getCurrentUser,
    isUserLoggedIn,
    hasRole,
    hasAnyRole,
    getUserRole,
    isUserAdmin,
    getUserDisplayName,
    login,
    logout,
    refreshUserProfile,
    updateUserInterface
};

// Simple global functions for other scripts
window.isUserAdmin = () => userRole === 'admin' || userRole === 'faculty';
window.getCurrentUser = () => currentUser;
window.getUserRole = () => userRole;

// Debug function
window.showUserState = () => {
    console.log("=== USER PROFILE STATE ===");
    console.log("User Role:", userRole);
    console.log("Current User:", currentUser);
    console.log("Is Admin?", isUserAdmin());
    console.log("LocalStorage userRole:", localStorage.getItem('userRole'));
    console.log("==========================");
};