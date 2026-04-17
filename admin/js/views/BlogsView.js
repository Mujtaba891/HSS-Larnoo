import { db, Modal } from '../app.js';
import { collection, getDocs, doc, addDoc, deleteDoc, updateDoc, getDoc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = 'blogs';

export const BlogsView = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <h1>Blog Management</h1>
            </div>

            <div class="gov-card">
                <h2><i class="fas fa-plus-circle"></i> Create New Post</h2>
                <form id="add-blog-form">
                    <div class="gov-form-group">
                        <label class="gov-label">Blog Title</label>
                        <input type="text" id="title" class="gov-input" required placeholder="e.g., Annual Sports Day 2026">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="gov-form-group">
                            <label class="gov-label">Main Image (Compressed)</label>
                            <input type="file" id="imageUrl" class="gov-input" accept="image/*" required>
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Author Name</label>
                            <input type="text" id="author" class="gov-input" required placeholder="Full Name">
                        </div>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Short Description</label>
                        <textarea id="shortDesc" class="gov-textarea" rows="2" required placeholder="Brief summary for list view..."></textarea>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Full Content (HTML Supported)</label>
                        <textarea id="fullContent" class="gov-textarea" rows="6" required placeholder="Detailed blog content..."></textarea>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="gov-form-group">
                            <label class="gov-label">Author Role</label>
                            <input type="text" id="authorRole" class="gov-input" required placeholder="e.g., Senior Teacher">
                        </div>
                        <div class="gov-form-group">
                            <label class="gov-label">Author Profile Image</label>
                            <input type="file" id="authorImage" class="gov-input" accept="image/*" required>
                        </div>
                    </div>
                    <button type="submit" id="submit-btn" class="gov-btn gov-btn-primary">
                        <i class="fas fa-paper-plane"></i> Publish Blog Post
                    </button>
                    <div id="add-feedback" class="gov-alert d-none" style="margin-top: 15px;"></div>
                </form>
            </div>

            <div class="gov-card">
                <h2><i class="fas fa-list"></i> Existing Blog Posts</h2>
                <div id="manage-section">
                    <p class="text-center"><i class="fas fa-spinner fa-spin"></i> Loading posts...</p>
                </div>
            </div>
        `;

        this.attachEvents();
        this.fetchBlogs();
    },

    attachEvents() {
        const form = document.getElementById('add-blog-form');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-btn');
            const feedback = document.getElementById('add-feedback');
            
            btn.disabled = true;
            btn.classList.add('gov-btn-loading');
            feedback.className = 'gov-alert d-none';

            try {
                const mainImg = await this.resizeAndCompress(form.imageUrl.files[0], 1000, 0.7);
                const authorImg = await this.resizeAndCompress(form.authorImage.files[0], 400, 0.6);

                await addDoc(collection(db, COLLECTION_NAME), {
                    title: form.title.value,
                    shortDesc: form.shortDesc.value,
                    fullContent: form.fullContent.value,
                    author: form.author.value,
                    authorRole: form.authorRole.value,
                    imageUrl: mainImg,
                    authorImage: authorImg,
                    createdAt: serverTimestamp()
                });

                feedback.textContent = "Blog post published successfully!";
                feedback.className = "gov-alert gov-alert-success";
                form.reset();
                this.fetchBlogs();
            } catch (err) {
                feedback.textContent = `Error: ${err.message}`;
                feedback.className = "gov-alert gov-alert-danger";
            } finally {
                btn.disabled = false;
                btn.classList.remove('gov-btn-loading');
            }
        });
    },

    async fetchBlogs() {
        const section = document.getElementById('manage-section');
        try {
            const q = query(collection(db, COLLECTION_NAME), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                section.innerHTML = '<p class="text-center">No blog posts found.</p>';
                return;
            }

            let html = `
                <div class="gov-table-container">
                    <table class="gov-table">
                        <thead>
                            <tr>
                                <th>Image</th>
                                <th>Title & Author</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            snapshot.forEach(doc => {
                const blog = doc.data();
                html += `
                    <tr>
                        <td style="width: 80px;"><img src="${blog.imageUrl}" style="width: 60px; height: 40px; object-fit: cover; border-radius: 4px;"></td>
                        <td>
                            <strong>${blog.title}</strong><br>
                            <small class="text-muted">By ${blog.author} (${blog.authorRole})</small>
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

            // Attach action events
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
        if (confirm("Permanently delete this blog post?")) {
            btn.classList.add('gov-btn-loading');
            try {
                await deleteDoc(doc(db, COLLECTION_NAME, id));
                this.fetchBlogs();
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
            const blog = docSnap.data();
            btn.classList.remove('gov-btn-loading');

            const editHtml = `
                <form id="edit-blog-form">
                    <input type="hidden" id="edit-id" value="${id}">
                    <div class="gov-form-group">
                        <label class="gov-label">Title</label>
                        <input type="text" id="edit-title" class="gov-input" value="${blog.title}" required>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">New Image (Optional)</label>
                        <input type="file" id="edit-imageUrl" class="gov-input" accept="image/*">
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Short Description</label>
                        <textarea id="edit-shortDesc" class="gov-textarea" rows="2" required>${blog.shortDesc}</textarea>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Full Content</label>
                        <textarea id="edit-fullContent" class="gov-textarea" rows="8" required>${blog.fullContent}</textarea>
                    </div>
                    <button type="submit" id="save-edit-btn" class="gov-btn gov-btn-primary" style="width: 100%;">Save Changes</button>
                    <div id="edit-feedback" class="gov-alert d-none" style="margin-top: 15px;"></div>
                </form>
            `;

            Modal.show("Edit Blog Post", editHtml);

            const editForm = document.getElementById('edit-blog-form');
            editForm.onsubmit = async (e) => {
                e.preventDefault();
                const saveBtn = document.getElementById('save-edit-btn');
                const feedback = document.getElementById('edit-feedback');
                
                saveBtn.disabled = true;
                saveBtn.classList.add('gov-btn-loading');
                
                try {
                    let imageUrl = blog.imageUrl;
                    if (editForm['edit-imageUrl'].files[0]) {
                        imageUrl = await this.resizeAndCompress(editForm['edit-imageUrl'].files[0], 1000, 0.7);
                    }

                    await updateDoc(doc(db, COLLECTION_NAME, id), {
                        title: editForm['edit-title'].value,
                        shortDesc: editForm['edit-shortDesc'].value,
                        fullContent: editForm['edit-fullContent'].value,
                        imageUrl: imageUrl
                    });

                    feedback.textContent = "Updated successfully!";
                    feedback.className = "gov-alert gov-alert-success";
                    setTimeout(() => { Modal.hide(); this.fetchBlogs(); }, 1000);
                } catch (err) {
                    feedback.textContent = err.message;
                    feedback.className = "gov-alert gov-alert-danger";
                    saveBtn.disabled = false;
                    saveBtn.classList.remove('gov-btn-loading');
                }
            };
        } catch (e) {
            btn.classList.remove('gov-btn-loading');
            alert("Error loading blog details.");
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
