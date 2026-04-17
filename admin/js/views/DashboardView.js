import { db } from '../app.js';
import { collection, getCountFromServer } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

export const DashboardView = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <h1>Administrative Control Center</h1>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="info">
                        <h3>Blog Posts</h3>
                        <div class="count" id="count-blogs">...</div>
                    </div>
                    <i class="fas fa-pencil-alt"></i>
                </div>
                <div class="stat-card">
                    <div class="info">
                        <h3>Live Events</h3>
                        <div class="count" id="count-events">...</div>
                    </div>
                    <i class="fas fa-calendar-alt"></i>
                </div>
                <div class="stat-card">
                    <div class="info">
                        <h3>Programs</h3>
                        <div class="count" id="count-programs">...</div>
                    </div>
                    <i class="fas fa-book"></i>
                </div>
                <div class="stat-card">
                    <div class="info">
                        <h3>Total Gallery</h3>
                        <div class="count" id="count-gallery">...</div>
                    </div>
                    <i class="fas fa-images"></i>
                </div>
            </div>

            <div style="display: flex; gap: 20px; margin-top: 30px; width: 100%;">
                <!-- Main Controls -->
                <div class="gov-card">
                    <h2><i class="fas fa-bolt"></i> Quick Actions</h2>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <a href="/Card/index.html#attendance" class="gov-btn gov-btn-outline" style="text-decoration:none; justify-content:center; padding:20px;">
                            <i class="fas fa-id-badge"></i> Student Attendence
                        </a>
                        <a href="#events" class="gov-btn gov-btn-outline" style="text-decoration:none; justify-content:center; padding:20px;">
                            <i class="fas fa-plus"></i> Add event
                        </a>
                        <a href="#blogs" class="gov-btn gov-btn-outline" style="text-decoration:none; justify-content:center; padding:20px;">
                            <i class="fas fa-plus"></i> New Blog Post
                        </a>
                        <a href="#gallery" class="gov-btn gov-btn-outline" style="text-decoration:none; justify-content:center; padding:20px;">
                            <i class="fas fa-upload"></i> Upload Photos
                        </a>
                        <a href="#newsletter" class="gov-btn gov-btn-outline" style="text-decoration:none; justify-content:center; padding:20px;">
                            <i class="fas fa-paper-plane"></i> Send Newsletter
                        </a>
                        <a href="#notices" class="gov-btn gov-btn-outline" style="text-decoration:none; justify-content:center; padding:20px;">
                            <i class="fas fa-bullhorn"></i> Post Notice
                        </a>
                    </div>

                    <h2 style="margin-top:40px;"><i class="fas fa-info-circle"></i> Admin Guide</h2>
                    <div style="line-height: 1.6; color: #444;">
                        <p><strong>1. Image Handling:</strong> You can upload any size. The system automatically compresses and resizes them for the best site performance.</p>
                        <p><strong>2. Blog Content:</strong> Supports HTML. You can use <code>&lt;b&gt;</code>, <code>&lt;i&gt;</code>, and <code>&lt;br&gt;</code> tags for formatting.</p>
                        <p><strong>3. Mobile Use:</strong> Use the "More" button in the bottom bar to access Programs, Notices, and Messaging tools on your phone.</p>
                    </div>
                </div>
            </div>
        `;

        this.fetchStats();
    },

    async fetchStats() {
        const collections = [
            { id: 'blogs', el: 'count-blogs' },
            { id: 'events', el: 'count-events' },
            { id: 'programs', el: 'count-programs' },
            { id: 'galleryImages', el: 'count-gallery' }
        ];

        await Promise.all(collections.map(async (col) => {
            try {
                const snapshot = await getCountFromServer(collection(db, col.id));
                const el = document.getElementById(col.el);
                if (el) el.textContent = snapshot.data().count.toLocaleString();
            } catch (e) {
                const el = document.getElementById(col.el);
                if (el) el.textContent = '0';
            }
        }));
    }
};
