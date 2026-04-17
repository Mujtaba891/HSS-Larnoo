import { db } from '../app.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const COLLECTION_NAME = 'galleryImages';
const DEFAULT_CATEGORIES = [
    "Campus Views", "Debates & School Events", "Campus Beautification", "Morning Assembly & Prayer", 
    "Environmental Activities", "International Day Against Drug Abuse", "Campus Gardening", "ICT Lab", 
    "Tourism Lab", "Industrial Visits", "Sports & Athletics", "Picnics & Excursions", 
    "Plantation Drives", "Run For Unity", "Student Life", "Nurturing Nature", "International Yoga Day"
];

export const GalleryView = {
    async render(container) {
        container.innerHTML = `
            <div class="page-header">
                <h1>Gallery Management</h1>
            </div>

            <div class="gov-card">
                <h2><i class="fas fa-upload"></i> Batch Upload Images</h2>
                <form id="gallery-form">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                        <div class="gov-form-group">
                            <label class="gov-label">Select Category</label>
                            <select id="imageCategory" class="gov-input" required>
                                ${DEFAULT_CATEGORIES.sort().map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                                <option value="Other">Other (Create New)</option>
                            </select>
                        </div>
                        <div class="gov-form-group d-none" id="custom-category-group">
                            <label class="gov-label">New Category Name</label>
                            <input type="text" id="customCategory" class="gov-input">
                        </div>
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Batch Caption Prefix (Optional)</label>
                        <input type="text" id="batchCaption" class="gov-input" placeholder="e.g., Annual Sports Day">
                    </div>
                    <div class="gov-form-group">
                        <label class="gov-label">Select Images (Multiple Supported)</label>
                        <input type="file" id="imageFiles" class="gov-input" accept="image/jpeg, image/png" required multiple>
                    </div>

                    <div id="image-previews" style="display: flex; flex-wrap: wrap; gap: 10px; margin-top: 15px;"></div>

                    <div id="progress-container" class="d-none" style="margin-top: 20px;">
                        <div style="height: 10px; background: #eee; border-radius: 5px; overflow: hidden; margin-bottom: 10px;">
                            <div id="progressBar" style="width: 0%; height: 100%; background: var(--gov-orange); transition: width 0.3s;"></div>
                        </div>
                        <div id="upload-log" style="background: #f8f9fa; border: 1px solid #ddd; padding: 10px; border-radius: 4px; font-size: 0.85rem; max-height: 150px; overflow-y: auto;"></div>
                    </div>

                    <button type="submit" id="submit-btn" class="gov-btn gov-btn-primary" style="margin-top: 20px;">
                        <i class="fas fa-cloud-upload-alt"></i> Start Batch Upload
                    </button>
                    <div id="add-feedback" class="gov-alert d-none" style="margin-top: 15px;"></div>
                </form>
            </div>
        `;

        this.attachEvents();
    },

    attachEvents() {
        const form = document.getElementById('gallery-form');
        const fileInput = document.getElementById('imageFiles');
        const categoryDropdown = document.getElementById('imageCategory');
        const customGroup = document.getElementById('custom-category-group');

        categoryDropdown.onchange = () => {
            customGroup.classList.toggle('d-none', categoryDropdown.value !== 'Other');
            document.getElementById('customCategory').required = (categoryDropdown.value === 'Other');
        };

        fileInput.onchange = (e) => {
            const previews = document.getElementById('image-previews');
            previews.innerHTML = '';
            Array.from(e.target.files).slice(0, 10).forEach(file => {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const img = document.createElement('img');
                    img.src = ev.target.result;
                    img.style = "width: 60px; height: 60px; object-fit: cover; border-radius: 4px; border: 1px solid #ddd;";
                    previews.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
            if (e.target.files.length > 10) {
                const span = document.createElement('span');
                span.textContent = `+ ${e.target.files.length - 10} more...`;
                span.style = "align-self: center; font-size: 0.8rem; color: #666;";
                previews.appendChild(span);
            }
        };

        form.onsubmit = async (e) => {
            e.preventDefault();
            const btn = document.getElementById('submit-btn');
            const log = document.getElementById('upload-log');
            const progressContainer = document.getElementById('progress-container');
            const progressBar = document.getElementById('progressBar');
            const feedback = document.getElementById('add-feedback');

            btn.disabled = true;
            btn.classList.add('gov-btn-loading');
            progressContainer.classList.remove('d-none');
            log.innerHTML = '';
            feedback.className = 'gov-alert d-none';

            let category = categoryDropdown.value === 'Other' ? form.customCategory.value.trim() : categoryDropdown.value;
            const prefix = form.batchCaption.value.trim();
            const files = fileInput.files;

            let success = 0, failed = 0;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileName = file.name.split('.')[0].replace(/[-_]/g, ' ');
                const caption = prefix ? `${prefix} - ${fileName}` : fileName;

                try {
                    this.log(log, `Resizing ${file.name}...`);
                    const imageBase64 = await this.resizeAndCompress(file, 1200, 0.7);
                    const thumbBase64 = await this.resizeAndCompress(file, 400, 0.5);

                    await addDoc(collection(db, COLLECTION_NAME), {
                        caption,
                        category,
                        imageBase64,
                        thumbnailBase64: thumbBase64,
                        timestamp: serverTimestamp()
                    });

                    success++;
                    this.log(log, `✅ ${file.name} uploaded`, 'text-success');
                } catch (err) {
                    failed++;
                    this.log(log, `❌ ${file.name}: ${err.message}`, 'text-danger');
                }

                const pct = Math.round(((i + 1) / files.length) * 100);
                progressBar.style.width = `${pct}%`;
            }

            feedback.textContent = `Batch complete. ${success} succeeded, ${failed} failed.`;
            feedback.className = `gov-alert gov-alert-${failed === 0 ? 'success' : 'warning'}`;
            btn.disabled = false;
            btn.classList.remove('gov-btn-loading');
            if (failed === 0) {
                form.reset();
                document.getElementById('image-previews').innerHTML = '';
            }
        };
    },

    log(container, msg, type = '') {
        const p = document.createElement('p');
        p.style.margin = "2px 0";
        p.className = type;
        p.textContent = msg;
        container.appendChild(p);
        container.scrollTop = container.scrollHeight;
    },

    resizeAndCompress(file, maxWidth, quality) {
        return new Promise((resolve, reject) => {
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
