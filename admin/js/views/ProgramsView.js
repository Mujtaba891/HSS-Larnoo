import { db, Modal } from '../app.js';
import { collection, getDocs, doc, addDoc, deleteDoc, updateDoc, getDoc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = 'programs';

export const ProgramsView = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <h1>Program Management</h1>
            </div>

            <div class="gov-card">
                <h2><i class="fas fa-plus-circle"></i> Add New Program</h2>
                <form id="add-program-form">
                    <div class="gov-form-group">
                        <label class="gov-label">Program Title</label>
                        <input type="text" id="title" class="gov-input" required placeholder="e.g., Higher Secondary Education">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="gov-form-group">
                            <label class="gov-label">Main Image (Compressed)</label>
                            <input type="file" id="imageUrl" class="gov-input" accept="image/*" required>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Tagline</label>
                            <input type="text" id="tagline" class="gov-input" required placeholder="e.g., Empowering Futures">
                        </div>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Description</label>
                        <textarea id="description" class="gov-textarea" rows="3" required placeholder="Detailed program description..."></textarea>
                    </div>

                    <div class="gov-section-divider">Teacher Details</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="gov-form-group">
                            <label class="gov-label">Teacher Name</label>
                            <input type="text" id="teacherName" class="gov-input" required>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Teacher Role</label>
                            <input type="text" id="teacherRole" class="gov-input" required placeholder="e.g., Head of Department">
                        </div>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Teacher Image (Compressed)</label>
                        <input type="file" id="teacherImageUrl" class="gov-input" accept="image/*" required>
                    </div>

                    <div class="gov-section-divider">Features / Footer Tags</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px;">
                        <div class="gov-form-group">
                            <label class="gov-label">Feature 1</label>
                            <input type="text" id="footer1" class="gov-input" required placeholder="e.g., Grade 11-12">
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Feature 2</label>
                            <input type="text" id="footer2" class="gov-input" required placeholder="e.g., Science Stream">
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Feature 3</label>
                            <input type="text" id="footer3" class="gov-input" required placeholder="e.g., Co-ed">
                        </div>
                    </div>

                    <button type="submit" id="submit-btn" class="gov-btn gov-btn-primary">
                        <i class="fas fa-paper-plane"></i> Publish Program
                    </button>
                    <div id="add-feedback" class="gov-alert d-none" style="margin-top: 15px;"></div>
                </form>
            </div>

            <div class="gov-card">
                <h2><i class="fas fa-book"></i> Existing Programs</h2>
                <div id="manage-section">
                    <p class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading programs...</p>
                </div>
            </div>
        `;

        this.attachEvents();
        this.fetchPrograms();
    },

    attachEvents() {
        const form = document.getElementById('add-program-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-btn');
            const feedback = document.getElementById('add-feedback');
            
            btn.disabled = true;
            btn.classList.add('gov-btn-loading');
            feedback.className = 'gov-alert d-none';

            try {
                const mainImg = await this.resizeAndCompress(form.imageUrl.files[0], 1000, 0.7);
                const teacherImg = await this.resizeAndCompress(form.teacherImageUrl.files[0], 400, 0.6);

                await addDoc(collection(db, COLLECTION_NAME), {
                    title: form.title.value,
                    tagline: form.tagline.value,
                    description: form.description.value,
                    teacherName: form.teacherName.value,
                    teacherRole: form.teacherRole.value,
                    footer1: form.footer1.value,
                    footer2: form.footer2.value,
                    footer3: form.footer3.value,
                    imageUrl: mainImg,
                    teacherImageUrl: teacherImg,
                    createdAt: serverTimestamp()
                });

                feedback.textContent = "Program published successfully!";
                feedback.className = "gov-alert gov-alert-success";
                form.reset();
                this.fetchPrograms();
            } catch (err) {
                feedback.textContent = `Error: ${err.message}`;
                feedback.className = "gov-alert gov-alert-danger";
            } finally {
                btn.disabled = false;
                btn.classList.remove('gov-btn-loading');
            }
        });
    },

    async fetchPrograms() {
        const section = document.getElementById('manage-section');
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                section.innerHTML = '<p class="text-center">No programs found.</p>';
                return;
            }

            let html = `
                <div class="gov-table-container">
                    <table class="gov-table">
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Program Details</th>
                                <th>Teacher</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            snapshot.forEach(doc => {
                const program = doc.data();
                html += `
                    <tr>
                        <td style="width: 80px;"><img src="${program.imageUrl}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;"></td>
                        <td>
                            <strong>${program.title}</strong><br>
                            <small class="text-muted">${program.tagline}</small>
                        </td>
                        <td>
                            ${program.teacherName}<br>
                            <small class="text-muted">${program.teacherRole}</small>
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
        if (confirm("Permanently delete this program?")) {
            btn.classList.add('gov-btn-loading');
            try {
                await deleteDoc(doc(db, COLLECTION_NAME, id));
                this.fetchPrograms();
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
            const program = docSnap.data();
            btn.classList.remove('gov-btn-loading');

            const editHtml = `
                <form id="edit-program-form">
                    <input type="hidden" id="edit-id" value="${id}">
                    <div class="gov-form-group">
                        <label class="gov-label">Program Title</label>
                        <input type="text" id="edit-title" class="gov-input" value="${program.title}" required>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">New Program Image (Optional)</label>
                        <input type="file" id="edit-imageUrl" class="gov-input" accept="image/*">
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Tagline</label>
                        <input type="text" id="edit-tagline" class="gov-input" value="${program.tagline}" required>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Description</label>
                        <textarea id="edit-description" class="gov-textarea" rows="3" required>${program.description}</textarea>
                    </div>
                    <div class="gov-section-divider">Teacher Details</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div class="gov-form-group">
                            <label class="gov-label">Teacher Name</label>
                            <input type="text" id="edit-teacherName" class="gov-input" value="${program.teacherName}" required>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Teacher Role</label>
                            <input type="text" id="edit-teacherRole" class="gov-input" value="${program.teacherRole}" required>
                        </div>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">New Teacher Image (Optional)</label>
                        <input type="file" id="edit-teacherImageUrl" class="gov-input" accept="image/*">
                    </div>
                    <div class="gov-section-divider">Features</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
                        <div class="gov-form-group">
                            <label class="gov-label">F1</label>
                            <input type="text" id="edit-footer1" class="gov-input" value="${program.footer1}" required>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">F2</label>
                            <input type="text" id="edit-footer2" class="gov-input" value="${program.footer2}" required>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">F3</label>
                            <input type="text" id="edit-footer3" class="gov-input" value="${program.footer3}" required>
                        </div>
                    </div>
                    <button type="submit" id="save-edit-btn" class="gov-btn gov-btn-primary" style="width: 100%;">Save Changes</button>
                    <div id="edit-feedback" class="gov-alert d-none" style="margin-top: 15px;"></div>
                </form>
            `;

            Modal.show("Edit Program", editHtml);

            const editForm = document.getElementById('edit-program-form');
            editForm.onsubmit = async (e) => {
                e.preventDefault();
                const saveBtn = document.getElementById('save-edit-btn');
                const feedback = document.getElementById('edit-feedback');
                
                saveBtn.disabled = true;
                saveBtn.classList.add('gov-btn-loading');

                try {
                    let imageUrl = program.imageUrl;
                    if (editForm['edit-imageUrl'].files[0]) {
                        imageUrl = await this.resizeAndCompress(editForm['edit-imageUrl'].files[0], 1000, 0.7);
                    }

                    let teacherImageUrl = program.teacherImageUrl;
                    if (editForm['edit-teacherImageUrl'].files[0]) {
                        teacherImageUrl = await this.resizeAndCompress(editForm['edit-teacherImageUrl'].files[0], 400, 0.6);
                    }

                    await updateDoc(doc(db, COLLECTION_NAME, id), {
                        title: editForm['edit-title'].value,
                        tagline: editForm['edit-tagline'].value,
                        description: editForm['edit-description'].value,
                        teacherName: editForm['edit-teacherName'].value,
                        teacherRole: editForm['edit-teacherRole'].value,
                        footer1: editForm['edit-footer1'].value,
                        footer2: editForm['edit-footer2'].value,
                        footer3: editForm['edit-footer3'].value,
                        imageUrl: imageUrl,
                        teacherImageUrl: teacherImageUrl
                    });

                    feedback.textContent = "Updated successfully!";
                    feedback.className = "gov-alert gov-alert-success";
                    setTimeout(() => { Modal.hide(); this.fetchPrograms(); }, 1000);
                } catch (err) {
                    feedback.textContent = err.message;
                    feedback.className = "gov-alert gov-alert-danger";
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('gov-btn-loading');
                }
            };
        } catch (e) {
            btn.classList.remove('gov-btn-loading');
            alert("Error loading program details.");
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
