// user-profile.js - Dynamic user profile management
import { supabase } from '../JS/db_connection.js'; // Adjust path as needed

// DOM Elements
const profileDropdown = document.querySelector('.relative.group');
const profileNameElement = profileDropdown?.querySelector('.text-sm.font-bold.text-gray-900');
const profileRoleElement = profileDropdown?.querySelector('.text-xs.text-gray-500');
const logoutLink = profileDropdown?.querySelector('a[href*="LogIn.html"]');

// User data cache
let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    await initUserProfile();
    
    // Dispatch event when profile is loaded
    const user = getCurrentUser();
    if (user) {
        document.dispatchEvent(new CustomEvent('userProfileLoaded', {
            detail: { user }
        }));
    }
});

// Initialize user profile
export async function initUserProfile() {
    console.log("Initializing user profile...");
    
    try {
        // Check if user is authenticated
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.warn("Auth check error:", error.message);
            setGuestUser();
            return;
        }
        
        if (user) {
            // User is logged in
            await loadUserData(user.id);
        } else {
            // No user logged in
            setGuestUser();
        }
    } catch (error) {
        console.error("Failed to initialize user profile:", error);
        setGuestUser();
    }
}

// Load user data from database
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
                name: data.full_name || 'User',
                email: data.email || '',
                role: data.role || 'guest',
                status: data.status || 'active'
            };
            
            updateProfileUI(currentUser);
            setupLogoutHandler();
            console.log("User profile loaded:", currentUser);
        }
    } catch (error) {
        console.error("Error loading user data:", error);
        setGuestUser();
    }
}

export function isUserAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Set guest user display
function setGuestUser() {
    currentUser = {
        id: null,
        name: 'Guest',
        email: '',
        role: 'guest',
        status: 'guest'
    };
    
    updateProfileUI(currentUser);
    setupGuestActions();
    console.log("Set as guest user");
}

// Update the profile dropdown UI
function updateProfileUI(user) {
    if (!profileNameElement || !profileRoleElement) {
        console.warn("Profile elements not found in the DOM");
        return;
    }
    
    // Update name
    profileNameElement.textContent = user.name;
    
    // Update role with proper formatting
    let roleDisplay = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    if (user.status === 'pending') {
        roleDisplay = 'Pending Approval';
    } else if (user.status === 'inactive') {
        roleDisplay = 'Inactive';
    }
    
    profileRoleElement.textContent = roleDisplay;
    
    // Add role-specific styling
    profileRoleElement.className = 'text-xs truncate';
    
    if (user.role === 'admin') {
        profileRoleElement.classList.add('text-purple-600', 'font-bold');
    } else if (user.role === 'coordinator') {
        profileRoleElement.classList.add('text-blue-600', 'font-semibold');
    } else if (user.role === 'faculty') {
        profileRoleElement.classList.add('text-green-600', 'font-semibold');
    } else if (user.role === 'guest') {
        profileRoleElement.classList.add('text-gray-500');
    } else {
        profileRoleElement.classList.add('text-gray-500');
    }
    
    // Update logout link text based on user status
    if (logoutLink) {
        if (user.role === 'guest') {
            logoutLink.innerHTML = `
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1">
                    </path>
                </svg>
                Login
            `;
            logoutLink.href = "HTML/LogIn.html";
        } else {
            logoutLink.innerHTML = `
                <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1">
                    </path>
                </svg>
                Logout
            `;
            logoutLink.href = "#";
        }
    }
}

// Setup logout functionality for logged-in users
function setupLogoutHandler() {
    if (!logoutLink) return;
    
    logoutLink.addEventListener('click', async (e) => {
        if (currentUser.role !== 'guest') {
            e.preventDefault();
            
            try {
                const { error } = await supabase.auth.signOut();
                if (error) {
                    console.error("Logout error:", error.message);
                    alert("Failed to logout. Please try again.");
                    return;
                }
                
                // Clear user data and refresh
                currentUser = null;
                window.location.href = "index.html";
            } catch (error) {
                console.error("Logout failed:", error);
            }
        }
    });
}

// Setup actions for guest users
function setupGuestActions() {
    // Guest users just follow the link to login page
    if (logoutLink) {
        logoutLink.href = "HTML/LogIn.html";
    }
}

export function getUserDisplayName() {
    const user = getCurrentUser();
    return user ? user.name : 'Guest';
}

// Get current user data
export function getCurrentUser() {
    return currentUser;
}

// Check if user is logged in
export function isUserLoggedIn() {
    const user = getCurrentUser();
    return user && user.role !== 'guest';
}

// Check if user has specific role
export function hasRole(role) {
    return currentUser && currentUser.role === role;
}

// Check if user has any of the specified roles
export function hasAnyRole(roles) {
    return currentUser && roles.includes(currentUser.role);
}

export function getUserRole() {
    return currentUser ? currentUser.role : 'guest';
}

function dispatchProfileUpdateEvent() {
    document.dispatchEvent(new CustomEvent('userProfileUpdated', {
        detail: { user: currentUser }
    }));
}
// Refresh user data
export async function refreshUserProfile() {
    console.log("Refreshing user profile...");
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
            setGuestUser();
            return;
        }
        
        await loadUserData(user.id);
    } catch (error) {
        console.error("Failed to refresh user profile:", error);
    }
}



// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure DOM is fully ready
    setTimeout(() => {
        initUserProfile();
    }, 100);
});

// Make functions available globally if needed
window.userProfile = {
    initUserProfile,
    getCurrentUser,
    isUserLoggedIn,
    hasRole,
    hasAnyRole,
    refreshUserProfile
};