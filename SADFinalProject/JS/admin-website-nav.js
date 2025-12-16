// admin-website-nav.js - Simple navigation script (non-module)

document.addEventListener('DOMContentLoaded', function() {
    console.log("Admin website navigation script loaded");
    
    // Set admin redirect flag before going to website
    document.addEventListener('click', function(e) {
        if (e.target.closest('#goToWebsiteBtn')) {
            console.log("Go to Website button clicked");
            
            // Set a flag that we're coming from admin
            localStorage.setItem('adminRedirect', 'true');
            localStorage.setItem('adminRedirectTime', new Date().toISOString());
            
            // Optional: Set a timeout to clear the flag (5 minutes)
            setTimeout(() => {
                localStorage.removeItem('adminRedirect');
                localStorage.removeItem('adminRedirectTime');
            }, 5 * 60 * 1000);
            
            // Let the normal link navigation happen
            return true;
        }
    });
    
    // Add keyboard shortcut (Ctrl+G)
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'g') {
            e.preventDefault();
            const button = document.getElementById('goToWebsiteBtn');
            if (button) {
                button.click();
            }
        }
    });
    
    console.log("Admin navigation initialized");
});