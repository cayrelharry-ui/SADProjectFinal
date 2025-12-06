/**
 * auth-check.js
 * Add this to all protected pages (Admin_Panel.html, etc.)
 */

import { checkAuth } from './db_connection.js';

document.addEventListener('DOMContentLoaded', function() {
    console.log("🔒 Checking authentication...");
    
    const user = checkAuth();
    
    if (!user) {
        console.log("❌ No valid session, redirecting to login");
        // Use timeout to prevent redirect loops
        setTimeout(() => {
            if (!window.location.pathname.includes('LogIn.html')) {
                window.location.href = '../HTML/LogIn.html';
            }
        }, 100);
        return;
    }
    
    console.log("✅ User authenticated:", user.email);
    
    // Display user info
    const userInfoElement = document.getElementById('userInfo') || 
                           document.getElementById('userName') ||
                           document.querySelector('.user-info');
    
    if (userInfoElement) {
        userInfoElement.textContent = `Welcome, ${user.full_name || user.email}`;
    }
    
    // Set user role for page-specific features
    document.body.setAttribute('data-user-role', user.role);
    
    // Optional: Check if user has permission for this page
    const currentPage = window.location.pathname;
    const allowedPages = {
        'admin': ['admin_panel', 'admin'],
        'faculty': ['faculty', 'dashboard'],
        'coordinator': ['coordinator', 'dashboard'],
        'public': ['public', 'dashboard', 'index', 'home']
    };
    
    const userRole = user.role.toLowerCase();
    const allowed = allowedPages[userRole] || allowedPages['public'];
    const hasAccess = allowed.some(page => currentPage.toLowerCase().includes(page));
    
    if (!hasAccess && userRole !== 'admin') {
        console.warn("User doesn't have access to this page");
        // Redirect to their appropriate dashboard
        const redirectMap = {
            'admin': '../HTML/Admin_Panel.html',
            'faculty': '../HTML/Faculty_Dashboard.html',
            'coordinator': '../HTML/Coordinator_Dashboard.html',
            'public': '../HTML/Public_Dashboard.html'
        };
        
        const redirectUrl = redirectMap[userRole] || '../index.html';
        if (!window.location.pathname.includes(redirectUrl.replace('../', ''))) {
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);
        }
    }
});