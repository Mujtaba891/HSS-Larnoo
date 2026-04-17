import { db } from '../app.js';
import { collection, getDocs, addDoc, deleteDoc, doc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = 'newsletter_subscribers';

export const NewsletterView = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <h1>Newsletter Management</h1>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div class="gov-card" style="margin-bottom: 0;">
                    <h2><i class="fas fa-pen-to-square"></i> Newsletter Tools</h2>
                    <p class="text-muted">Use these advanced tools to design and send your emails.</p>
                    <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
                        <a href="canvas.html" target="_blank" class="gov-btn gov-btn-primary" style="text-align: center; text-decoration: none;">
                            <i class="fas fa-magic"></i> Open Newsletter Builder
                        </a>
                        <a href="event-sender.html" target="_blank" class="gov-btn gov-btn-outline" style="text-align: center; text-decoration: none;">
                            <i class="fas fa-paper-plane"></i> Open Email Sender
                        </a>
                    </div>
                </div>

                <div class="gov-card" style="margin-bottom: 0;">
                    <h2><i class="fas fa-user-plus"></i> Add Subscriber</h2>
                    <form id="add-subscriber-form">
                        <div class="gov-form-group">
                            <label class="gov-label">Email Address</label>
                            <input type="email" id="subscriber-email" class="gov-input" required placeholder="name@example.com">
                        </div>
                        <button type="submit" id="add-btn" class="gov-btn gov-btn-primary" style="width: 100%;">
                            <i class="fas fa-plus"></i> Add to List
                        </button>
                        <div id="add-feedback" class="gov-alert d-none" style="margin-top: 15px;"></div>
                    </form>
                </div>
            </div>

            <div class="gov-card">
                <h2><i class="fas fa-users"></i> Managed Subscribers</h2>
                <div id="subscribers-section">
                    <p class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading subscribers...</p>
                </div>
            </div>
        `;

        this.attachEvents();
        this.fetchSubscribers();
    },

    attachEvents() {
        const form = document.getElementById('add-subscriber-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('add-btn');
            const feedback = document.getElementById('add-feedback');
            const email = document.getElementById('subscriber-email').value.trim();

            btn.disabled = true;
            btn.classList.add('gov-btn-loading');
            feedback.className = 'gov-alert d-none';

            try {
                // Check if already exists (basic client-side check after fetch)
                await addDoc(collection(db, COLLECTION_NAME), {
                    email: email,
                    subscribedAt: serverTimestamp()
                });

                feedback.textContent = "Subscriber added successfully!";
                feedback.className = "gov-alert gov-alert-success";
                form.reset();
                this.fetchSubscribers();
            } catch (err) {
                feedback.textContent = `Error: ${err.message}`;
                feedback.className = "gov-alert gov-alert-danger";
            } finally {
                btn.disabled = false;
                btn.classList.remove('gov-btn-loading');
            }
        });
    },

    async fetchSubscribers() {
        const section = document.getElementById('subscribers-section');
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy("subscribedAt", "desc"));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                section.innerHTML = '<p class="text-center">No subscribers found.</p>';
                return;
            }

            let html = `
                <div class="gov-table-container">
                    <table class="gov-table">
                        <thead>
                            <tr>
                                <th>Subscribed Date</th>
                                <th>Email Address</th>
                                <th style="text-align: right;">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            snapshot.forEach(doc => {
                const sub = doc.data();
                const date = sub.subscribedAt ? sub.subscribedAt.toDate().toLocaleDateString() : 'N/A';
                html += `
                    <tr>
                        <td>${date}</td>
                        <td><strong>${sub.email}</strong></td>
                        <td style="text-align: right;">
                            <button class="gov-btn gov-btn-danger delete-btn" data-id="${doc.id}" data-email="${sub.email}">
                                <i class="fas fa-user-minus"></i> Remove
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            section.innerHTML = html;

            section.querySelectorAll('.delete-btn').forEach(btn => {
                btn.onclick = () => this.handleDelete(btn, btn.dataset.id, btn.dataset.email);
            });

        } catch (e) {
            section.innerHTML = `<p class="text-danger">Error: ${e.message}</p>`;
        }
    },

    async handleDelete(btn, id, email) {
        if (confirm(`Remove ${email} from the subscription list?`)) {
            btn.classList.add('gov-btn-loading');
            try {
                await deleteDoc(doc(db, COLLECTION_NAME, id));
                this.fetchSubscribers();
            } catch (e) {
                alert(`Error: ${e.message}`);
                btn.classList.remove('gov-btn-loading');
            }
        }
    }
};
