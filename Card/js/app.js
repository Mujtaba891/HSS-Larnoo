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

    // ---- Tab Navigation Logic ----
    const navLinks = document.querySelectorAll('.nav-link');
    const views    = document.querySelectorAll('.view');

    function switchView(viewId) {
        views.forEach(v => v.classList.remove('active'));
        navLinks.forEach(l => l.classList.remove('active'));

        document.getElementById(`${viewId}-view`).classList.add('active');
        document.getElementById(`nav-${viewId}`).classList.add('active');

        // Scroll to top on switch
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const viewId = e.target.id.replace('nav-', '');
            switchView(viewId);
        });
    });

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

    // ---- Initialize Modules ----
    initStudentModule();
    initAdminModule();
    initAttendanceModule();
    initReportsModule();
    initBulkModule();
});