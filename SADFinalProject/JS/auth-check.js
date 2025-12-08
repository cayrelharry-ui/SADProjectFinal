/**
 * auth-check.js
 * Global authentication check - Add this to ALL protected pages
 */

import { getCurrentUser } from './db_connection.js';

(function() {
    console.log("🔒 Global Authentication Check Running...");

    // Get current page
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop().toLowerCase();

    // List of pages that don't require authentication
    const PUBLIC_PAGES = [
        'login.html',
        'login',
        'index.html',
        'home.html',
        'about.html',
        'contact.html',
        'register.html',
        'signup.html'
    ];

    // Check if current page is public
    const isPublicPage = PUBLIC_PAGES.some(page =>
        currentPage.includes(page.toLowerCase())
    );

    // If it's a public page, don't check auth
    if (isPublicPage) {
        console.log(`✅ ${currentPage} is a public page, no auth required`);
        return;
    }

    // Check if user is logged in
    const user = getCurrentUser();

    if (!user) {
        console.log('❌ No user session found, redirecting to login...');

        // Store the attempted page for redirect after login
        if (currentPage && !currentPage.includes('login')) {
            sessionStorage.setItem('redirectAfterLogin', window.location.href);
        }

        // Redirect to login page
        window.location.href = '../HTML/LogIn.html';
        return;
    }

    console.log(`✅ User authenticated: ${user.email} (${user.role})`);

    // Optional: Role-based page access control
    const currentPageName = currentPage.replace('.html', '').toLowerCase();

    // Define which pages each role can access
    const rolePermissions = {
        'admin': ['admin_panel', 'admin', 'dashboard', 'user-management', 'content', 'analytics', 'settings'],
        'faculty': ['faculty_dashboard', 'dashboard', 'profile'],
        'coordinator': ['partner_dashboard', 'dashboard', 'profile'],
        'public': ['public_dashboard', 'dashboard', 'profile', 'home', 'index']
    };

    const userRole = user.role.toLowerCase();
    const allowedPages = rolePermissions[userRole] || rolePermissions['public'];
    const hasAccess = allowedPages.some(page => currentPageName.includes(page));

    // If user doesn't have access to this page
    if (!hasAccess && !isPublicPage) {
        console.warn(`User ${user.role} doesn't have access to ${currentPage}`);

        // Redirect to their appropriate dashboard
        const redirectMap = {
            'admin': '../HTML/Admin_Panel.html',
            'faculty': '../HTML/Faculty_Dashboard.html',
            'coordinator': '../HTML/Partner_Panel.html',
            'public': '../HTML/Public_Dashboard.html',
            'partner':'../HTML/Partner_Panel.html'
        };

        const redirectUrl = redirectMap[userRole] || '../index.html';

        // Only redirect if not already on the correct page
        if (!currentPath.includes(redirectUrl.replace('../', '').replace('.html', ''))) {
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1500);
        }
        return;
    }

    // Display user info if elements exist
    setTimeout(() => {
        const userElements = {
            'userInfo': `Logged in as: ${user.full_name || user.email} (${user.role})`,
            'userName': user.full_name || user.email,
            'adminName': `Welcome, ${user.full_name || user.email}`,
            'currentUserRole': user.role,
            'userRoleDisplay': user.role
        };

        for (const [id, value] of Object.entries(userElements)) {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        }

        // Set data attribute for CSS/styling
        document.body.setAttribute('data-user-role', user.role);
    }, 100);

})();