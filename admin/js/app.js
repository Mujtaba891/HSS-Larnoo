import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, setPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { Router } from './router.js';

const firebaseConfig = { 
    apiKey: "AIzaSyBAUBnBW_wcY3evdk4ilKVyvufkkYo6rIU", 
    authDomain: "hss-larnoo-teachers.firebaseapp.com", 
    projectId: "hss-larnoo-teachers", 
    storageBucket: "hss-larnoo-teachers.appspot.com", 
    messagingSenderId: "143363278401", 
    appId: "1:143363278401:web:49d7fffbdf31ce073e68c0", 
    measurementId: "G-GHQLMME6PJ" 
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

const ADMIN_EMAIL = "hsslarnoo024@gmail.com";

// App State
export const state = {
    user: null,
    isInitialized: false
};

// Main App Logic
const App = {
    async init() {
        // Enforce Session Persistence (Logged out when browser closes)
        await setPersistence(auth, browserSessionPersistence);

        onAuthStateChanged(auth, (user) => {
            if (user) {
                if (user.email === ADMIN_EMAIL) {
                    state.user = user;
                    console.log("🛡️ Admin Authenticated");
                } else {
                    console.error("⛔ Unauthorized Access Attempt");
                    signOut(auth);
                    state.user = null;
                }
            } else {
                state.user = null;
            }
            
            this.renderLayout();
            if (state.user) {
                Router.init();
            }
            this.attachGlobalEvents();
        });
    },

    renderLayout() {
        const appDiv = document.getElementById('app');
        if (state.user) {
            appDiv.innerHTML = `
                <div class="spa-container">
                    <header class="gov-header">
                        <div class="brand">
                            <img src="../img/logo3.png" alt="Logo">
                            <h2>HSS Larnoo Admin Portal</h2>
                        </div>
                        <div class="user-info">
                            <span class="security-badge"><i class="fas fa-user-shield"></i> Authorized: ${state.user.email}</span>
                            <button id="logout-btn" class="gov-btn gov-btn-outline" style="color: white; border-color: white;">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </button>
                        </div>
                    </header>
                    <aside class="gov-sidebar" id="sidebar">
                        <nav class="sidebar-nav">
                            <a href="#dashboard" class="nav-link" id="link-dashboard"><i class="fas fa-tachometer-alt"></i> Dashboard</a>
                            
                            <div class="nav-heading">Content Management</div>
                            <a href="#blogs" class="nav-link" id="link-blogs"><i class="fas fa-pencil-alt"></i> Manage Blogs</a>
                            <a href="#events" class="nav-link" id="link-events"><i class="fas fa-calendar-alt"></i> Manage Events</a>
                            <a href="#programs" class="nav-link" id="link-programs"><i class="fas fa-book"></i> Manage Programs</a>
                            <a href="#notices" class="nav-link" id="link-notices"><i class="fas fa-bullhorn"></i> Manage Notices</a>
                            <a href="#gallery" class="nav-link" id="link-gallery"><i class="fas fa-images"></i> Gallery Upload</a>
                            
                            <hr>
                            <div class="nav-heading">Student Services</div>
                            <a href="/Card/index.html#admin" class="nav-link" id="link-students"><i class="fas fa-id-card"></i> Student ID Cards</a>
                            <a href="#messages" class="nav-link" id="link-messages"><i class="fas fa-envelope-open-text"></i> Messages</a>
                            <a href="#newsletter" class="nav-link" id="link-newsletter"><i class="fas fa-paper-plane"></i> Newsletter</a>
                        </nav>
                    </aside>
                    <main class="gov-main" id="main-content">
                        <!-- Content will be injected here by router -->
                    </main>

                    <!-- Mobile More Menu -->
                    <div class="gov-menu-overlay" id="menu-overlay"></div>
                    <div class="gov-more-menu" id="more-menu">
                        <a href="/Card/index.html#admin" class="more-menu-item" id="more-link-students"><i class="fas fa-id-card"></i> ID Cards</a>
                        <a href="/Card/index.html#attendance" class="more-menu-item" id="more-link-attendance"><i class="fas fa-id-badge"></i> Attendance</a>
                        <a href="#messages" class="more-menu-item" id="more-link-messages"><i class="fas fa-envelope-open-text"></i> Messages</a>
                        <a href="#newsletter" class="more-menu-item" id="more-link-newsletter"><i class="fas fa-paper-plane"></i> Newsletter</a>
                        <a href="#gallery" class="more-menu-item" id="more-link-gallery"><i class="fas fa-images"></i> Gallery</a>
                        
                    </div>

                    <nav class="gov-bottom-nav">
                        <a href="#dashboard" class="bottom-nav-item" id="bottom-link-dashboard">
                            <i class="fas fa-home"></i>
                            <span>Home</span>
                        </a>
                        <a href="#blogs" class="bottom-nav-item" id="bottom-link-blogs">
                            <i class="fas fa-pencil-alt"></i>
                            <span>Blogs</span>
                        </a>
                        <a href="#programs" class="bottom-nav-item" id="bottom-link-programs">
                            <i class="fas fa-book"></i>
                            <span>Programs</span>
                        </a>
                        <a href="#events" class="bottom-nav-item" id="bottom-link-events">
                            <i class="fas fa-images"></i>
                            <span>Events</span>
                        </a>
                        <a href="#notices" class="bottom-nav-item" id="bottom-link-notices">
                            <i class="fas fa-bullhorn"></i>
                            <span>Notices</span>
                        </a>
                        <a href="javascript:void(0)" class="bottom-nav-item" id="more-btn">
                            <i class="fas fa-ellipsis-h"></i>
                            <span>More</span>
                        </a>
                    </nav>
                </div>
            `;
            
            document.getElementById('logout-btn').onclick = () => signOut(auth);

            // Toggle More Menu Logic
            const moreBtn = document.getElementById('more-btn');
            const moreMenu = document.getElementById('more-menu');
            const overlay = document.getElementById('menu-overlay');

            const toggleMenu = () => {
                const isActive = moreMenu.classList.toggle('active');
                overlay.classList.toggle('active', isActive);
            };

            const closeMenu = () => {
                moreMenu.classList.remove('active');
                overlay.classList.remove('active');
            };

            if (moreBtn) {
                moreBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    toggleMenu();
                });
            }

            if (overlay) overlay.addEventListener('click', closeMenu);
            
            moreMenu.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', closeMenu);
            });

        } else {
            appDiv.innerHTML = `
                <div class="login-screen">
                    <div class="login-card">
                        <div class="security-seal">
                            <i class="fas fa-shield-alt"></i>
                        </div>
                        <img src="../img/logo3.png" alt="Logo">
                        <h2>Secure Admin Terminal</h2>
                        <p id="login-error" style="color: #ff4d4d; font-size: 0.85rem; margin-bottom: 15px; background: rgba(255,0,0,0.1); padding: 8px; border-radius: 4px; display:none;"></p>
                        <form id="login-form">
                            <div class="gov-form-group">
                                <label class="gov-label">Credential: Admin Email</label>
                                <input type="email" id="adminEmail" class="gov-input" placeholder="authorized@hss.edu" required autocomplete="username">
                            </div>
                            <div class="gov-form-group">
                                <label class="gov-label">Security Key: Password</label>
                                <input type="password" id="adminPassword" class="gov-input" placeholder="••••••••" required autocomplete="current-password">
                            </div>
                            <button type="submit" id="login-btn" class="gov-btn gov-btn-primary" style="width: 100%; height: 50px; font-size: 1.1rem;">
                                <i class="fas fa-key"></i> Authenticate & Decrypt
                            </button>
                        </form>
                        <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #eee;">
                            <p style="font-size: 0.7rem; color: #888; line-height: 1.5; text-align: left;">
                                🛡️ <strong>Cyber-Security Alert:</strong> This terminal is protected by Google Firebase Auth. 
                                Unsuccessful login attempts are logged with IP addresses and reported to school IT. 
                                Automated brute-force attacks will trigger a permanent account lockout.
                            </p>
                        </div>
                    </div>
                </div>
            `;
            document.getElementById('login-form').addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('adminEmail').value;
                const pass = document.getElementById('adminPassword').value;
                const btn = document.getElementById('login-btn');
                const errorEl = document.getElementById('login-error');

                if (email.toLowerCase().trim() !== ADMIN_EMAIL) {
                    errorEl.style.display = "block";
                    errorEl.textContent = "CRITICAL: Access Denied. Your identity is not in the authorized list.";
                    // Log the attempt silently (Firebase Auth logs it automatically as failed attempt)
                    return;
                }

                btn.classList.add('gov-btn-loading');
                btn.disabled = true;
                errorEl.style.display = "none";

                try {
                    await signInWithEmailAndPassword(auth, email, pass);
                } catch (err) {
                    errorEl.style.display = "block";
                    if (err.code === 'auth/too-many-requests') {
                        errorEl.textContent = "SECURITY LOCKOUT: Too many failed attempts. Try again later.";
                    } else {
                        errorEl.textContent = "AUTH FAILURE: Invalid Security Key.";
                    }
                    btn.classList.remove('gov-btn-loading');
                    btn.disabled = false;
                }
            });
        }
    },

    attachGlobalEvents() {
        // Modal Close logic
        const modal = document.getElementById('gov-modal');
        const closeBtn = document.querySelector('.close-modal');
        if (closeBtn) {
            closeBtn.onclick = () => { modal.style.display = 'none'; };
        }
        window.onclick = (event) => {
            if (event.target == modal) { modal.style.display = 'none'; }
        };
    }
};

// Modal Utility
export const Modal = {
    show(title, bodyHtml) {
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-body').innerHTML = bodyHtml;
        document.getElementById('gov-modal').style.display = 'block';
    },
    hide() {
        document.getElementById('gov-modal').style.display = 'none';
    }
};

App.init();
