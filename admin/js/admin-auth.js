/**
 * HSS Larnoo Admin Authentication & UI Script (Module Version)
 */

// Checks if the user is authenticated. If not, redirects to the login page.
function checkLogin() {
    if (sessionStorage.getItem('isAdminLoggedIn') !== 'true') {
        // Allow access to index.html (the login page itself)
        if (!window.location.pathname.endsWith('index.html')) {
            window.location.href = 'index.html';
        }
    }
}

// Logs the user out by clearing the session storage and redirecting.
function logout() {
    sessionStorage.removeItem('isAdminLoggedIn');
    window.location.href = 'index.html';
}

// Handles the mobile sidebar toggle functionality.
function handleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const overlay = document.getElementById('content-overlay');

    if (sidebar && menuToggle && overlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });

        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }
}

// Main object to be exported
export const Auth = {
    // Initializes the script for a page.
    init: function() {
        // Run checkLogin on all pages except the login page itself
        checkLogin(); 
        
        const logoutButton = document.getElementById('logout-btn');
        if (logoutButton) {
            logoutButton.addEventListener('click', logout);
        }
        
        handleSidebar();
    }
};