// =====================================================
// admin.js  —  Admin Panel Module
// Handles: login/logout, student table, edit/view/delete,
//          dashboard chart, auth state management, tabs
// =====================================================

import {
    db, auth, state, compressImage, generateQrCode,
    collection, onSnapshot, doc, deleteDoc, updateDoc,
    query, orderBy, addDoc, runTransaction, serverTimestamp,
    signInWithEmailAndPassword, onAuthStateChanged, signOut
} from './firebase-config.js';

export function initAdminModule() {

    const loginForm          = document.getElementById('loginForm');
    const logoutBtn          = document.getElementById('logoutBtn');
    const adminContainer     = document.getElementById('admin-container');
    const loginContainer     = document.getElementById('admin-login-container');
    const tableBody          = document.querySelector('#studentDataTable tbody');
    const loadingIndicator   = document.getElementById('loading-indicator');
    const searchInput        = document.getElementById('searchInput');
    const classFilterContainer = document.getElementById('class-filter-buttons');
    const sessionFilterSelect  = document.getElementById('sessionFilterSelect');
    const viewModal          = document.getElementById('view-modal');
    const editModal          = document.getElementById('edit-modal');
    const modalCardContainer = document.getElementById('modal-card-container');
    const editFormContainer  = document.getElementById('editForm');

    let studentDataUnsubscribe = null;

    // ── Tab Switching Logic ──
    const tabBtns     = document.querySelectorAll('.admin-tab-btn');
    const tabContents = document.querySelectorAll('.admin-tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-tab');
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === target) content.classList.add('active');
            });
        });
    });

    // ---- Auth State ----
    onAuthStateChanged(auth, user => {
        const isAdmin = !!user;

        loginContainer.style.display = isAdmin ? 'none' : 'block';
        adminContainer.style.display = isAdmin ? 'block' : 'none';

        document.getElementById('attendance-login-prompt').style.display = isAdmin ? 'none' : 'block';
        document.getElementById('attendance-content').style.display      = isAdmin ? 'block' : 'none';
        document.getElementById('reports-login-prompt').style.display    = isAdmin ? 'none' : 'block';
        document.getElementById('reports-content').style.display         = isAdmin ? 'block' : 'none';

        if (isAdmin) {
            listenForDataChanges();
        } else {
            if (studentDataUnsubscribe) studentDataUnsubscribe();
            state.allStudents = [];
            renderTable([]);
        }
    });

    // ---- Firestore Listener ----
    function listenForDataChanges() {
        if (studentDataUnsubscribe) return;

        loadingIndicator.style.display = 'block';
        const q = query(collection(db, 'students'), orderBy('createdAt', 'desc'));
        
        studentDataUnsubscribe = onSnapshot(q, snapshot => {
            state.allStudents = snapshot.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
            
            renderClassFilterButtons();
            applyFiltersAndRender();
            renderDashboardChart();
            
            loadingIndicator.style.display = 'none';
        }, err => {
            console.error(err);
            loadingIndicator.textContent = 'Error loading data.';
        });
    }

    // ---- Login / Logout ----
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const loginBtn = document.getElementById('loginBtn');
        loginBtn.disabled = true;
        loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
        signInWithEmailAndPassword(auth, loginForm.adminEmail.value, loginForm.adminPassword.value)
            .catch(err => alert(`Login Failed: ${err.message}`))
            .finally(() => { loginBtn.disabled = false; loginBtn.textContent = 'Login'; });
    });

    logoutBtn.addEventListener('click', () => signOut(auth));

    // ---- Dashboard Chart ----
    function renderDashboardChart() {
        if (!state.allStudents?.length) return;
        const classCounts = state.allStudents.reduce((acc, s) => {
            const key = `${s.class}th`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        const labels = Object.keys(classCounts).sort((a,b) => parseInt(a) - parseInt(b));
        const data   = labels.map(l => classCounts[l]);
        const ctx    = document.getElementById('classDistributionChart')?.getContext('2d');
        if (!ctx) return;
        if (state.classChart) state.classChart.destroy();
        state.classChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: '# of Students',
                    data,
                    backgroundColor: '#0d2c54',
                    borderRadius: 5
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    // ---- Filters ----
    function renderClassFilterButtons() {
        const classes = [...new Set(state.allStudents.map(s => s.class))].sort((a,b) => a - b);
        const currentActive = document.querySelector('.class-filter-buttons .btn.active')?.dataset.class || 'All';
        classFilterContainer.innerHTML = `<button class="btn ${currentActive === 'All' ? 'active' : ''}" data-class="All">All Classes</button>`;
        classes.forEach(c => {
            classFilterContainer.innerHTML += `<button class="btn ${currentActive === c ? 'active' : ''}" data-class="${c}">${c}th</button>`;
        });
    }

    classFilterContainer.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            document.querySelectorAll('.class-filter-buttons .btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            applyFiltersAndRender();
        }
    });

    sessionFilterSelect.addEventListener('change', applyFiltersAndRender);
    searchInput.addEventListener('keyup', applyFiltersAndRender);

    function applyFiltersAndRender() {
        const selectedClass = document.querySelector('.class-filter-buttons .btn.active')?.dataset.class || 'All';
        const selectedSession = sessionFilterSelect.value;
        const term = searchInput.value.toLowerCase().trim();

        let data = state.allStudents;
        if (selectedClass !== 'All') data = data.filter(s => s.class === selectedClass);
        if (selectedSession !== 'All') data = data.filter(s => s.session === selectedSession);
        if (term) {
            data = data.filter(s =>
                (s.name || '').toLowerCase().includes(term) || 
                (s.customId || '').toLowerCase().includes(term) ||
                (s.roll || '').toLowerCase().includes(term)
            );
        }
        renderTable(data);
    }

    function renderTable(dataToRender) {
        tableBody.innerHTML = '';
        if (!dataToRender.length) {
            tableBody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:40px; color:#999;">No records found.</td></tr>`;
            return;
        }
        dataToRender.forEach(student => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${student.customId || 'N/A'}</td>
                <td><img src="${student.photo || ''}" class="table-photo" onerror="this.onerror=null;this.src='profile.png';"></td>
                <td>${student.name}</td>
                <td>${student.parentage}</td>
                <td>${student.class}th</td>
                <td>${student.stream || student.gender || '--'}</td>
                <td>${student.roll}</td>
                <td>
                    <button class="action-btn view-card-btn"   data-id="${student.firestoreId}" title="View"><i class="fa-solid fa-eye"></i></button>
                    <button class="action-btn edit-card-btn"   data-id="${student.firestoreId}" title="Edit"><i class="fa-solid fa-pencil"></i></button>
                    <button class="action-btn delete-card-btn" data-id="${student.firestoreId}" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
                </td>`;
        });
    }

    // ---- View Card Modal ----
    function populateCardInModal(student) {
        modalCardContainer.innerHTML = document.getElementById('student-card-preview').innerHTML;
        const card = modalCardContainer.querySelector('#idCard');
        card.querySelector('.displayPhoto').src          = student.photo || 'profile.png';
        card.querySelector('.displayName').textContent   = student.name;
        card.querySelector('.displayParentage').textContent = `: ${student.parentage}`;
        card.querySelector('.displayPhone').textContent  = student.phone;
        card.querySelector('.displayId').textContent     = student.customId || '';
        card.querySelector('.displayRoll').textContent   = student.roll;
        const classText = student.stream
            ? `${student.class}th (${student.stream})`
            : (student.gender ? `${student.class}th (${student.gender})` : `${student.class}th`);
        card.querySelector('.displayClass').textContent   = classText;
        card.querySelector('.displayAddress').textContent = student.address;
        const sessionEl = card.querySelector('.displaySession');
        if (sessionEl) sessionEl.textContent = student.session || '2025-26';
        generateQrCode(card.querySelector('.card-qr-code'), student.customId || student.roll || 'N/A');
        viewModal.style.display = 'block';
    }

    // ---- Edit Modal ----
    function openEditModal(student) {
        state.currentlyEditingId = student.firestoreId;
        state.editModalPhotoData = student.photo;
        editFormContainer.innerHTML = `
            <input type="hidden" name="firestoreId" value="${student.firestoreId}">
            <div class="form-group"><label>Full Name</label><input type="text" name="name" value="${student.name || ''}" required></div>
            <div class="form-group"><label>Parentage</label><input type="text" name="parentage" value="${student.parentage || ''}" required></div>
            <div class="form-group custom-select-wrapper">
                <label for="editClass">Class</label>
                <select id="editClass" name="class" required>
                    <option value="">-- Select Class --</option>
                    <option value="9">9th</option><option value="10">10th</option>
                    <option value="11">11th</option><option value="12">12th</option>
                </select>
            </div>
            <div class="form-group" id="edit-dynamic-group" style="display:none;">
                <label id="edit-dynamic-label"></label>
                <div class="custom-select-wrapper"><select id="edit-dynamic-select" name="dynamicField"></select></div>
            </div>
            <div class="form-group"><label>Roll No</label><input type="number" name="roll" value="${student.roll || ''}" required></div>
            <div class="form-group"><label>Phone</label><input type="number" name="phone" value="${student.phone || ''}" required></div>
            <div class="form-group"><label>Address</label><textarea name="address" rows="2" required>${student.address || ''}</textarea></div>
            <div class="form-group">
                <label>Academic Session</label>
                <div class="custom-select-wrapper">
                    <select name="session">
                        <option value="2024-25" ${(student.session||'') === '2024-25' ? 'selected' : ''}>2024-25</option>
                        <option value="2025-26" ${(!student.session || student.session === '2025-26') ? 'selected' : ''}>2025-26</option>
                        <option value="2026-27" ${(student.session||'') === '2026-27' ? 'selected' : ''}>2026-27</option>
                        <option value="2027-28" ${(student.session||'') === '2027-28' ? 'selected' : ''}>2027-28</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Current Photo</label>
                <div class="current-photo-preview"><img id="editPhotoPreview" src="${student.photo || 'profile.png'}" alt="Photo"></div>
                <label for="editPhoto">Upload New Photo</label>
                <input type="file" id="editPhoto" name="newPhoto" accept="image/jpeg, image/png">
            </div>
            <button type="submit" class="btn btn-primary" style="width:100%"><i class="fa-solid fa-save"></i> Save Changes</button>
        `;
        const editClassSelect  = editFormContainer.querySelector('#editClass');
        const editDynamicGroup = editFormContainer.querySelector('#edit-dynamic-group');
        const editDynamicLabel = editFormContainer.querySelector('#edit-dynamic-label');
        const editDynamicSelect= editFormContainer.querySelector('#edit-dynamic-select');
        const editPhotoInput   = editFormContainer.querySelector('#editPhoto');
        const editPhotoPreview = editFormContainer.querySelector('#editPhotoPreview');
        editClassSelect.value = student.class || '';
        const updateEditDynamicFields = () => {
            const sel = editClassSelect.value;
            editDynamicSelect.innerHTML = '';
            editDynamicGroup.style.display = 'none';
            if (['9','10'].includes(sel)) {
                editDynamicLabel.textContent = 'Gender';
                editDynamicSelect.innerHTML  = `<option value="">-- Select Gender --</option><option value="Boys">Boys</option><option value="Girls">Girls</option>`;
                if (student.gender) editDynamicSelect.value = student.gender;
                editDynamicGroup.style.display = 'block';
            } else if (['11','12'].includes(sel)) {
                editDynamicLabel.textContent = 'Stream';
                editDynamicSelect.innerHTML  = `<option value="">-- Select Stream --</option><option value="Arts">Arts</option><option value="Medical">Medical</option><option value="Non-Medical">Non-Medical</option>`;
                if (student.stream) editDynamicSelect.value = student.stream;
                editDynamicGroup.style.display = 'block';
            }
        };
        editClassSelect.addEventListener('change', updateEditDynamicFields);
        updateEditDynamicFields();
        editPhotoInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                compressImage(e.target.files[0], 400, (res) => {
                    state.editModalPhotoData = res;
                    editPhotoPreview.src = res;
                });
            }
        });
        editModal.style.display = 'block';
    }

    editFormContainer.addEventListener('submit', async (e) => {
        e.preventDefault();
        const updateBtn = e.target.querySelector('button');
        updateBtn.disabled = true;
        const formData    = new FormData(e.target);
        const updatedData = {
            name:formData.get('name'), parentage:formData.get('parentage'), class:formData.get('class'),
            roll:formData.get('roll'), phone:formData.get('phone'), address:formData.get('address'),
            session:formData.get('session') || '2025-26'
        };
        if (['9','10'].includes(updatedData.class)) { updatedData.gender = formData.get('dynamicField'); updatedData.stream = null; }
        else if (['11','12'].includes(updatedData.class)) { updatedData.stream = formData.get('dynamicField'); updatedData.gender = null; }
        if (state.editModalPhotoData) updatedData.photo = state.editModalPhotoData;
        try {
            await updateDoc(doc(db, 'students', formData.get('firestoreId')), updatedData);
            editModal.style.display = 'none';
        } catch (err) { alert(`Update failed: ${err.message}`); }
        finally { updateBtn.disabled = false; }
    });

    adminContainer.addEventListener('click', (e) => {
        const button = e.target.closest('button.action-btn');
        if (!button) return;
        const student = state.allStudents.find(s => s.firestoreId === button.dataset.id);
        if (!student) return;
        if (button.classList.contains('view-card-btn')) {
            document.getElementById('editFromViewBtn').dataset.id = button.dataset.id;
            document.getElementById('downloadFromViewBtn').dataset.id = button.dataset.id;
            populateCardInModal(student);
        } else if (button.classList.contains('edit-card-btn')) {
            openEditModal(student);
        } else if (button.classList.contains('delete-card-btn')) {
            if (confirm(`Delete record for ${student.name}?`)) deleteDoc(doc(db, 'students', button.dataset.id));
        }
    });

    document.getElementById('editFromViewBtn').onclick = (e) => {
        const student = state.allStudents.find(s => s.firestoreId === e.target.dataset.id);
        if (student) { viewModal.style.display = 'none'; openEditModal(student); }
    };

    document.getElementById('downloadFromViewBtn').onclick = (e) => {
        const student = state.allStudents.find(s => s.firestoreId === e.target.dataset.id);
        if (student) {
            html2canvas(document.querySelector('#modal-card-container #idCard'), { scale: 4, useCORS: true })
                .then(canvas => {
                    const link = document.createElement('a');
                    link.download = `ID-Card_${student.name.replace(/\s+/g,'_')}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                });
        }
    };
}