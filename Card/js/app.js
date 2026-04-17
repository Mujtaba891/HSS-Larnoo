// =====================================================
// app.js  —  Main Application Controller
// Orchestrates navigation and module initialization
// =====================================================

import { initStudentModule }    from './student.js';
import { initAdminModule }      from './admin.js';
import { initAttendanceModule } from './attendance.js';
import { initReportsModule }    from './reports.js';
import { initBulkModule }       from './bulk.js';

document.addEventListener('DOMContentLoaded', () => {

    // ---- PWA Service Worker Registration ----
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('Service Worker registered!'))
                .catch(err => console.log('SW registration failed:', err));
        });
    }

    // ---- Tab Navigation Logic (with Hash Persistence) ----
    const navLinks = document.querySelectorAll('.nav-link');
    const views    = document.querySelectorAll('.view');

    async function switchView(viewId) {
        // Stop scanners or listeners if moving away
        if (window.stopAttendanceScanner) await window.stopAttendanceScanner();

        views.forEach(v => v.classList.remove('active'));
        navLinks.forEach(l => l.classList.remove('active'));

        const targetView = document.getElementById(`${viewId}-view`);
        const targetNav  = document.getElementById(`nav-${viewId}`);

        if (targetView && targetNav) {
            targetView.classList.add('active');
            targetNav.classList.add('active');
            window.location.hash = viewId;
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Trigger module specific setups
            if (viewId === 'admin' && window.setupAdminView) window.setupAdminView();
            if (viewId === 'attendance' && window.setupAttendanceView) window.setupAttendanceView();
            if (viewId === 'reports' && window.setupReportsView) window.setupReportsView();
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const viewId = e.target.id.replace('nav-', '');
            switchView(viewId);
        });
    });

    function handleRouting() {
        const hash = window.location.hash.replace('#', '') || 'student';
        switchView(hash);
    }

    window.addEventListener('hashchange', handleRouting);
    
    // ---- Initialize Modules ----
    initStudentModule();
    initAdminModule();
    initAttendanceModule();
    initReportsModule();
    initBulkModule();

    // Initial Route
    setTimeout(handleRouting, 100); // Small delay to let modules init
    
    // ---- Modal Global Close Logic ----
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    };
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => {
            btn.closest('.modal').style.display = 'none';
        };
    });
});