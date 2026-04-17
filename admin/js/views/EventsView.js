import { db, Modal } from '../app.js';
import { collection, getDocs, doc, addDoc, deleteDoc, updateDoc, getDoc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = 'events';

export const EventsView = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <h1>Event Management</h1>
            </div>

            <div class="gov-card">
                <h2><i class="fas fa-plus-circle"></i> Add New Event</h2>
                <form id="add-event-form">
                    <div class="gov-form-group">
                        <label class="gov-label">Event Title</label>
                        <input type="text" id="title" class="gov-input" required placeholder="e.g., Annual Sports Meet 2026">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="gov-form-group">
                            <label class="gov-label">Event Image (Compressed)</label>
                            <input type="file" id="imageUrl" class="gov-input" accept="image/*" required>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Status</label>
                            <input type="text" id="status" class="gov-input" required placeholder="e.g., Upcoming, Completed">
                        </div>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="gov-form-group">
                            <label class="gov-label">Schedule</label>
                            <input type="text" id="schedule" class="gov-input" required placeholder="e.g., 25 Dec, 2025">
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Location</label>
                            <input type="text" id="location" class="gov-input" required placeholder="e.g., School Main Ground">
                        </div>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Description</label>
                        <textarea id="description" class="gov-textarea" rows="4" required placeholder="Detailed event description..."></textarea>
                    </div>
                    <button type="submit" id="submit-btn" class="gov-btn gov-btn-primary">
                        <i class="fas fa-paper-plane"></i> Publish Event
                    </button>
                    <div id="add-feedback" class="gov-alert d-none" style="margin-top: 15px;"></div>
                </form>
            </div>

            <div class="gov-card">
                <h2><i class="fas fa-calendar-alt"></i> Existing Events</h2>
                <div id="manage-section">
                    <p class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading events...</p>
                </div>
            </div>
        `;

        this.attachEvents();
        this.fetchEvents();
    },

    attachEvents() {
        const form = document.getElementById('add-event-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-btn');
            const feedback = document.getElementById('add-feedback');
            
            btn.disabled = true;
            btn.classList.add('gov-btn-loading');
            feedback.className = 'gov-alert d-none';

            try {
                const imgBase64 = await this.resizeAndCompress(form.imageUrl.files[0], 1000, 0.7);

                await addDoc(collection(db, COLLECTION_NAME), {
                    title: form.title.value,
                    status: form.status.value,
                    schedule: form.schedule.value,
                    location: form.location.value,
                    description: form.description.value,
                    imageUrl: imgBase64,
                    createdAt: serverTimestamp()
                });

                feedback.textContent = "Event published successfully!";
                feedback.className = "gov-alert gov-alert-success";
                form.reset();
                this.fetchEvents();
            } catch (err) {
                feedback.textContent = `Error: ${err.message}`;
                feedback.className = "gov-alert gov-alert-danger";
            } finally {
                btn.disabled = false;
                btn.classList.remove('gov-btn-loading');
            }
        });
    },

    async fetchEvents() {
        const section = document.getElementById('manage-section');
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                section.innerHTML = '<p class="text-center">No events found.</p>';
                return;
            }

            let html = `
                <div class="gov-table-container">
                    <table class="gov-table">
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Event Details</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            snapshot.forEach(doc => {
                const event = doc.data();
                html += `
                    <tr>
                        <td style="width: 80px;"><img src="${event.imageUrl}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;"></td>
                        <td>
                            <strong>${event.title}</strong><br>
                            <small class="text-muted">${event.schedule} | ${event.location}</small>
                        </td>
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
        if (confirm("Permanently delete this event?")) {
            btn.classList.add('gov-btn-loading');
            try {
                await deleteDoc(doc(db, COLLECTION_NAME, id));
                this.fetchEvents();
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
            const event = docSnap.data();
            btn.classList.remove('gov-btn-loading');

            const editHtml = `
                <form id="edit-event-form">
                    <input type="hidden" id="edit-id" value="${id}">
                    <div class="gov-form-group">
                        <label class="gov-label">Title</label>
                        <input type="text" id="edit-title" class="gov-input" value="${event.title}" required>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">New Image (Optional)</label>
                        <input type="file" id="edit-imageUrl" class="gov-input" accept="image/*">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="gov-form-group">
                            <label class="gov-label">Status</label>
                            <input type="text" id="edit-status" class="gov-input" value="${event.status}" required>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Schedule</label>
                            <input type="text" id="edit-schedule" class="gov-input" value="${event.schedule}" required>
                        </div>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Location</label>
                        <input type="text" id="edit-location" class="gov-input" value="${event.location}" required>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Description</label>
                        <textarea id="edit-description" class="gov-textarea" rows="4" required>${event.description}</textarea>
                    </div>
                    <button type="submit" id="save-edit-btn" class="gov-btn gov-btn-primary" style="width: 100%;">Save Changes</button>
                    <div id="edit-feedback" class="gov-alert d-none" style="margin-top: 15px;"></div>
                </form>
            `;

            Modal.show("Edit Event", editHtml);

            const editForm = document.getElementById('edit-event-form');
            editForm.onsubmit = async (e) => {
                e.preventDefault();
                const saveBtn = document.getElementById('save-edit-btn');
                const feedback = document.getElementById('edit-feedback');
                
                saveBtn.disabled = true;
                saveBtn.classList.add('gov-btn-loading');

                try {
                    let imageUrl = event.imageUrl;
                    if (editForm['edit-imageUrl'].files[0]) {
                        imageUrl = await this.resizeAndCompress(editForm['edit-imageUrl'].files[0], 1000, 0.7);
                    }

                    await updateDoc(doc(db, COLLECTION_NAME, id), {
                        title: editForm['edit-title'].value,
                        status: editForm['edit-status'].value,
                        schedule: editForm['edit-schedule'].value,
                        location: editForm['edit-location'].value,
                        description: editForm['edit-description'].value,
                        imageUrl: imageUrl
                    });

                    feedback.textContent = "Updated successfully!";
                    feedback.className = "gov-alert gov-alert-success";
                    setTimeout(() => { Modal.hide(); this.fetchEvents(); }, 1000);
                } catch (err) {
                    feedback.textContent = err.message;
                    feedback.className = "gov-alert gov-alert-danger";
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('gov-btn-loading');
                }
            };
        } catch (e) {
            btn.classList.remove('gov-btn-loading');
            alert("Error loading event details.");
        }
    },

    resizeAndCompress(file, maxWidth, quality) {
        return new Promise((resolve, reject) => {
            if (!file) { resolve(null); return; }
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    if (width > maxWidth || height > maxWidth) {
                        if (width > height) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        } else {
                            width = Math.round((width * maxWidth) / height);
                            height = maxWidth;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
            };
            reader.onerror = reject;
        });
    }
};
