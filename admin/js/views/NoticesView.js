import { db, Modal } from '../app.js';
import { collection, getDocs, doc, addDoc, deleteDoc, updateDoc, getDoc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = 'notices';

export const NoticesView = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <h1>Notice Management</h1>
            </div>

            <div class="gov-card">
                <h2><i class="fas fa-plus-circle"></i> Post New Notice</h2>
                <form id="add-notice-form">
                    <div class="gov-form-group">
                        <label class="gov-label">Notice Title</label>
                        <input type="text" id="title" class="gov-input" required placeholder="e.g., Winter Vacation Announcement">
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Notice Content</label>
                        <textarea id="content" class="gov-textarea" rows="5" required placeholder="Detailed notice content..."></textarea>
                    </div>
                    <button type="submit" id="submit-btn" class="gov-btn gov-btn-primary">
                        <i class="fas fa-paper-plane"></i> Post Notice
                    </button>
                    <div id="add-feedback" class="gov-alert d-none" style="margin-top: 15px;"></div>
                </form>
            </div>

            <div class="gov-card">
                <h2><i class="fas fa-bullhorn"></i> Existing Notices</h2>
                <div id="manage-section">
                    <p class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading notices...</p>
                </div>
            </div>
        `;

        this.attachEvents();
        this.fetchNotices();
    },

    attachEvents() {
        const form = document.getElementById('add-notice-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-btn');
            const feedback = document.getElementById('add-feedback');
            
            btn.disabled = true;
            btn.classList.add('gov-btn-loading');
            feedback.className = 'gov-alert d-none';

            try {
                await addDoc(collection(db, COLLECTION_NAME), {
                    title: form.title.value,
                    content: form.content.value,
                    timestamp: serverTimestamp()
                });

                feedback.textContent = "Notice posted successfully!";
                feedback.className = "gov-alert gov-alert-success";
                form.reset();
                this.fetchNotices();
            } catch (err) {
                feedback.textContent = `Error: ${err.message}`;
                feedback.className = "gov-alert gov-alert-danger";
            } finally {
                btn.disabled = false;
                btn.classList.remove('gov-btn-loading');
            }
        });
    },

    async fetchNotices() {
        const section = document.getElementById('manage-section');
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy("timestamp", "desc"));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                section.innerHTML = '<p class="text-center">No notices found.</p>';
                return;
            }

            let html = `
                <div class="gov-table-container">
                    <table class="gov-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Notice Title</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            snapshot.forEach(doc => {
                const notice = doc.data();
                const date = notice.timestamp ? notice.timestamp.toDate().toLocaleDateString() : 'N/A';
                html += `
                    <tr>
                        <td style="width: 120px;">${date}</td>
                        <td><strong>${notice.title}</strong></td>
                        <td>
                            <button class="gov-btn gov-btn-outline edit-btn" data-id="${doc.id}"><i class="fas fa-edit"></i></button>
                            <button class="gov-btn gov-btn-danger delete-btn" data-id="${doc.id}"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>
                `;
            });

            html += `</tbody></table></div>`;
            section.innerHTML = html;

            section.querySelectorAll('.delete-btn').forEach(btn => {
                btn.onclick = () => this.handleDelete(btn, btn.dataset.id);
            });
            section.querySelectorAll('.edit-btn').forEach(btn => {
                btn.onclick = () => this.handleEdit(btn, btn.dataset.id);
            });

        } catch (e) {
            section.innerHTML = `<p class="text-danger">Error: ${e.message}</p>`;
        }
    },

    async handleDelete(btn, id) {
        if (confirm("Permanently delete this notice?")) {
            btn.classList.add('gov-btn-loading');
            try {
                await deleteDoc(doc(db, COLLECTION_NAME, id));
                this.fetchNotices();
            } catch (e) {
                alert("Delete failed: " + e.message);
                btn.classList.remove('gov-btn-loading');
            }
        }
    },

    async handleEdit(btn, id) {
        btn.classList.add('gov-btn-loading');
        try {
            const docSnap = await getDoc(doc(db, COLLECTION_NAME, id));
            const notice = docSnap.data();
            btn.classList.remove('gov-btn-loading');

            const editHtml = `
                <form id="edit-notice-form">
                    <input type="hidden" id="edit-id" value="${id}">
                    <div class="gov-form-group">
                        <label class="gov-label">Notice Title</label>
                        <input type="text" id="edit-title" class="gov-input" value="${notice.title}" required>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Notice Content</label>
                        <textarea id="edit-content" class="gov-textarea" rows="8" required>${notice.content}</textarea>
                    </div>
                    <button type="submit" id="save-edit-btn" class="gov-btn gov-btn-primary" style="width: 100%;">Save Changes</button>
                    <div id="edit-feedback" class="gov-alert d-none" style="margin-top: 15px;"></div>
                </form>
            `;

            Modal.show("Edit Notice", editHtml);

            const editForm = document.getElementById('edit-notice-form');
            editForm.onsubmit = async (e) => {
                e.preventDefault();
                const saveBtn = document.getElementById('save-edit-btn');
                const feedback = document.getElementById('edit-feedback');
                
                saveBtn.disabled = true;
                saveBtn.classList.add('gov-btn-loading');

                try {
                    await updateDoc(doc(db, COLLECTION_NAME, id), {
                        title: editForm['edit-title'].value,
                        content: editForm['edit-content'].value
                    });

                    feedback.textContent = "Updated successfully!";
                    feedback.className = "gov-alert gov-alert-success";
                    setTimeout(() => { Modal.hide(); this.fetchNotices(); }, 1000);
                } catch (err) {
                    feedback.textContent = err.message;
                    feedback.className = "gov-alert gov-alert-danger";
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('gov-btn-loading');
                }
            };
        } catch (e) {
            btn.classList.remove('gov-btn-loading');
            alert("Error loading notice details.");
        }
    }
};
