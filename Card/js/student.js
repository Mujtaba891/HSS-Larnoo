// =====================================================
// student.js  —  Student Portal Module
// Handles: live card preview, form submit, download, persistence, edit
// =====================================================

import {
    db, state, compressImage, generateQrCode,
    collection, addDoc, runTransaction, doc, serverTimestamp,
    query, where, getDocs, updateDoc
} from './firebase-config.js';

export function initStudentModule() {

    const form              = document.getElementById('studentForm');
    const classSelect       = document.getElementById('studentClass');
    const dynamicGroup      = document.getElementById('dynamic-group');
    const dynamicLabel      = document.getElementById('dynamic-label');
    const dynamicSelect     = document.getElementById('dynamic-select');
    const formContainer     = document.getElementById('student-form-container');
    const welcomeContainer  = document.getElementById('student-welcome-container');
    const downloadBtn       = document.getElementById('studentDownloadBtn');
    const editBtn           = document.getElementById('studentEditBtn');
    const registerNewBtn    = document.getElementById('registerNewBtn');
    const findMyIdBtn       = document.getElementById('findMyIdBtn');
    const findIdModal       = document.getElementById('find-id-modal');
    const searchIdBtn       = document.getElementById('searchIdBtn');
    const findIdInput       = document.getElementById('find-id-input');

    const cardPreview = {
        photo:    document.querySelector('#student-card-preview .displayPhoto'),
        name:     document.querySelector('#student-card-preview .displayName'),
        parentage:document.querySelector('#student-card-preview .displayParentage'),
        phone:    document.querySelector('#student-card-preview .displayPhone'),
        id:       document.querySelector('#student-card-preview .displayId'),
        roll:     document.querySelector('#student-card-preview .displayRoll'),
        class:    document.querySelector('#student-card-preview .displayClass'),
        address:  document.querySelector('#student-card-preview .displayAddress'),
        qrCode:   document.querySelector('#student-card-preview .card-qr-code'),
        session:  document.querySelector('#student-card-preview .displaySession'),
    };

    let currentStudentData = null;

    // ---- Live Card Preview ----
    function updateCardPreview(data = null) {
        if (data) {
            cardPreview.name.textContent      = data.name;
            cardPreview.parentage.textContent = `: ${data.parentage}`;
            cardPreview.phone.textContent     = data.phone;
            cardPreview.roll.textContent      = data.roll;
            cardPreview.address.textContent   = data.address;
            cardPreview.id.textContent        = data.customId;
            cardPreview.photo.src             = data.photo || 'profile.png';
            if (cardPreview.session) cardPreview.session.textContent = data.session || '2025-26';

            const classText = data.stream
                ? `${data.class}th (${data.stream})`
                : (data.gender ? `${data.class}th (${data.gender})` : `${data.class}th`);
            cardPreview.class.textContent = classText;
            generateQrCode(cardPreview.qrCode, data.customId);
            return;
        }

        const name        = form.studentName.value    || 'Student Name';
        const parentage   = form.studentParentage.value || '';
        const phone       = form.studentPhone.value   || '';
        const studentId   = cardPreview.id.textContent || 'Not Assigned';
        const roll        = form.studentRoll.value    || '';
        const className   = classSelect.options[classSelect.selectedIndex]?.text || '';
        const dynamicVal  = dynamicSelect.options[dynamicSelect.selectedIndex]?.text || '';
        const address     = form.studentAddress.value || '';
        const session     = document.getElementById('studentSession').value || '2025-26';

        cardPreview.name.textContent      = name;
        cardPreview.parentage.textContent = `: ${parentage}`;
        cardPreview.phone.textContent     = phone;
        cardPreview.roll.textContent      = roll;
        cardPreview.address.textContent   = address;
        cardPreview.photo.src             = state.compressedPhotoBase64 || 'profile.png';
        if (cardPreview.session) cardPreview.session.textContent = session;

        const isDynValid = dynamicVal && !dynamicVal.startsWith('-- Select');
        if (['9','10'].includes(classSelect.value) && isDynValid) {
            cardPreview.class.textContent = `${className} (${dynamicVal})`;
        } else if (['11','12'].includes(classSelect.value) && isDynValid) {
            cardPreview.class.textContent = `${className} (${dynamicVal})`;
        } else {
            cardPreview.class.textContent = className;
        }

        generateQrCode(cardPreview.qrCode, studentId);
    }

    // ---- UI Switching ----
    function showWelcomeView(studentData) {
        currentStudentData = studentData;
        formContainer.style.display = 'none';
        welcomeContainer.style.display = 'block';
        updateCardPreview(studentData);
        localStorage.setItem('hss_registered_id', studentData.customId);
    }

    function showFormView() {
        currentStudentData = null;
        formContainer.style.display = 'block';
        welcomeContainer.style.display = 'none';
        resetStudentFormAndPreview();
    }

    // ---- Startup Check ----
    async function checkExistingRegistration() {
        const savedId = localStorage.getItem('hss_registered_id');
        if (savedId) {
            const q = query(collection(db, 'students'), where('customId', '==', savedId));
            const snap = await getDocs(q);
            if (!snap.empty) {
                showWelcomeView({ id: snap.docs[0].id, ...snap.docs[0].data() });
            } else {
                localStorage.removeItem('hss_registered_id');
            }
        }
    }

    // ---- Class → dynamic Gender/Stream select ----
    classSelect.addEventListener('change', () => {
        const sel = classSelect.value;
        dynamicSelect.innerHTML = '';
        if (['9','10'].includes(sel)) {
            dynamicLabel.textContent = 'Gender';
            dynamicSelect.innerHTML  = `<option value="">-- Select Gender --</option><option value="Boys">Boys</option><option value="Girls">Girls</option>`;
            dynamicGroup.style.display = 'block';
        } else if (['11','12'].includes(sel)) {
            dynamicLabel.textContent = 'Stream';
            dynamicSelect.innerHTML  = `<option value="">-- Select Stream --</option><option value="Arts">Arts</option><option value="Medical">Medical</option><option value="Non-Medical">Non-Medical</option>`;
            dynamicGroup.style.display = 'block';
        } else {
            dynamicGroup.style.display = 'none';
        }
        updateCardPreview();
    });

    form.addEventListener('input', updateCardPreview);

    document.getElementById('studentPhoto').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            compressImage(e.target.files[0], 400, (res) => {
                state.compressedPhotoBase64 = res;
                updateCardPreview();
            });
        } else {
            state.compressedPhotoBase64 = '';
            updateCardPreview();
        }
    });

    // ---- Reset ----
    function resetStudentFormAndPreview() {
        form.reset();
        dynamicGroup.style.display = 'none';
        state.compressedPhotoBase64 = '';
        cardPreview.id.textContent    = 'Not Assigned';
        cardPreview.photo.src         = 'profile.png';
        cardPreview.qrCode.innerHTML  = '';
        updateCardPreview();
    }

    // ---- Form Submit → Save to Firestore ----
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submitBtn');

        if (!dynamicSelect.value && dynamicGroup.style.display === 'block') {
            alert(`Please select a ${dynamicLabel.textContent.toLowerCase()}.`);
            return;
        }
        if (!state.compressedPhotoBase64) { alert('Please upload a photo.'); return; }

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing...`;

        try {
            // Duplicate Check (Name + Parentage + Class)
            const qDup = query(collection(db, 'students'),
                where('name', '==', form.studentName.value.trim()),
                where('parentage', '==', form.studentParentage.value.trim()),
                where('class', '==', form.studentClass.value)
            );
            const dupSnap = await getDocs(qDup);
            if (!dupSnap.empty) {
                const existing = { id: dupSnap.docs[0].id, ...dupSnap.docs[0].data() };
                alert('You are already registered! Loading your existing ID card.');
                showWelcomeView(existing);
                return;
            }

            const studentData = {
                name:      form.studentName.value.trim(),
                parentage: form.studentParentage.value.trim(),
                class:     form.studentClass.value,
                roll:      form.studentRoll.value.trim(),
                phone:     form.studentPhone.value.trim(),
                address:   form.studentAddress.value.trim(),
                photo:     state.compressedPhotoBase64,
                createdAt: serverTimestamp(),
                stream:    ['11','12'].includes(form.studentClass.value) ? dynamicSelect.value : null,
                gender:    ['9','10'].includes(form.studentClass.value)  ? dynamicSelect.value : null,
                session:   document.getElementById('studentSession').value || '2025-26',
            };

            const newId = await runTransaction(db, async (transaction) => {
                const year          = new Date().getFullYear().toString().slice(-2);
                const counterRef    = doc(db, 'id_counters', `${year}-${studentData.class}`);
                const counterDoc    = await transaction.get(counterRef);
                const newSerial     = (counterDoc.exists() ? counterDoc.data().lastSerial : 0) + 1;
                transaction.set(counterRef, { lastSerial: newSerial });
                return `${year}${studentData.class.padStart(2,'0')}${newSerial.toString().padStart(3,'0')}`;
            });

            studentData.customId = newId;
            const docRef = await addDoc(collection(db, 'students'), studentData);
            studentData.id = docRef.id;

            alert(`Success! Your ID Number is: ${newId}.`);
            showWelcomeView(studentData);

        } catch (error) {
            console.error('Error:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fa-solid fa-cogs"></i> Generate & Submit`;
        }
    });

    // ---- Download Card ----
    downloadBtn.addEventListener('click', () => {
        html2canvas(document.querySelector('#student-card-preview #idCard'), { scale: 4, useCORS: true, backgroundColor: null })
            .then(canvas => {
                const name = currentStudentData ? currentStudentData.name : 'student';
                const link = document.createElement('a');
                link.download = `ID-Card_${name.replace(/\s+/g,'_')}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
    });

    // ---- Edit Details (Student Side) ----
    editBtn.addEventListener('click', () => {
        if (!currentStudentData) return;
        const modal = document.getElementById('edit-modal');
        const eForm = document.getElementById('editForm');

        const cls = currentStudentData.class;
        const dynType  = ['11','12'].includes(cls) ? 'Stream' : (['9','10'].includes(cls) ? 'Gender' : null);
        const dynValue = currentStudentData.stream || currentStudentData.gender || '';

        let dynHtml = '';
        if (dynType === 'Stream') {
            dynHtml = `
                <div class="form-group custom-select-wrapper">
                    <label>Stream</label>
                    <select name="stream" required>
                        <option value="Arts" ${dynValue==='Arts'?'selected':''}>Arts</option>
                        <option value="Medical" ${dynValue==='Medical'?'selected':''}>Medical</option>
                        <option value="Non-Medical" ${dynValue==='Non-Medical'?'selected':''}>Non-Medical</option>
                    </select>
                </div>`;
        } else if (dynType === 'Gender') {
            dynHtml = `
                <div class="form-group custom-select-wrapper">
                    <label>Gender</label>
                    <select name="gender" required>
                        <option value="Boys" ${dynValue==='Boys'?'selected':''}>Boys</option>
                        <option value="Girls" ${dynValue==='Girls'?'selected':''}>Girls</option>
                    </select>
                </div>`;
        }

        eForm.innerHTML = `
            <div class="current-photo-preview">
                <img src="${currentStudentData.photo || 'profile.png'}" id="edit-preview-img">
                <input type="file" id="edit-photo-input" accept="image/*" style="display:none;">
                <button type="button" class="btn btn-sm" onclick="document.getElementById('edit-photo-input').click()" style="margin-top:10px;">Change Photo</button>
            </div>
            <div class="form-group"><label>Full Name</label><input type="text" name="name" value="${currentStudentData.name}" required></div>
            <div class="form-group"><label>Parentage</label><input type="text" name="parentage" value="${currentStudentData.parentage}" required></div>
            ${dynHtml}
            <div class="form-group"><label>Roll Number</label><input type="number" name="roll" value="${currentStudentData.roll}" required></div>
            <div class="form-group"><label>Phone</label><input type="number" name="phone" value="${currentStudentData.phone}" required></div>
            <div class="form-group"><label>Address</label><textarea name="address" required>${currentStudentData.address}</textarea></div>
            <div class="modal-actions">
                <button type="submit" class="btn btn-primary">Update ID Card</button>
            </div>
        `;

        modal.style.display = 'block';

        let newPhotoBase64 = currentStudentData.photo;
        document.getElementById('edit-photo-input').addEventListener('change', (ev) => {
            if (ev.target.files[0]) {
                compressImage(ev.target.files[0], 400, (res) => {
                    newPhotoBase64 = res;
                    document.getElementById('edit-preview-img').src = res;
                });
            }
        });

        eForm.onsubmit = async (ev) => {
            ev.preventDefault();
            const formData = new FormData(eForm);
            const updated = {
                name:      formData.get('name'),
                parentage: formData.get('parentage'),
                roll:      formData.get('roll'),
                phone:     formData.get('phone'),
                address:   formData.get('address'),
                photo:     newPhotoBase64,
                stream:    formData.get('stream') || null,
                gender:    formData.get('gender') || null,
            };

            try {
                await updateDoc(doc(db, 'students', currentStudentData.id), updated);
                alert('ID Card updated successfully!');
                modal.style.display = 'none';
                showWelcomeView({ ...currentStudentData, ...updated });
            } catch (err) {
                alert('Update failed: ' + err.message);
            }
        };
    });

    // ---- Find My ID Logic ----
    findMyIdBtn.onclick = (e) => { e.preventDefault(); findIdModal.style.display = 'block'; };
    searchIdBtn.onclick = async () => {
        const id = findIdInput.value.trim();
        if (!id) return;
        searchIdBtn.disabled = true;
        searchIdBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Finding...';

        try {
            const q = query(collection(db, 'students'), where('customId', '==', id));
            const snap = await getDocs(q);
            if (snap.empty) {
                alert('No record found with this ID.');
            } else {
                findIdModal.style.display = 'none';
                showWelcomeView({ id: snap.docs[0].id, ...snap.docs[0].data() });
            }
        } catch (err) {
            alert('Error: ' + err.message);
        } finally {
            searchIdBtn.disabled = false;
            searchIdBtn.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i> Search & Load';
        }
    };

    // ---- Register Someone Else ----
    registerNewBtn.onclick = () => {
        if (confirm('This will clear your current view. You can always find your card later using your ID Number. Continue?')) {
            localStorage.removeItem('hss_registered_id');
            showFormView();
        }
    };

    // Initial render & Startup Check
    updateCardPreview();
    checkExistingRegistration();
}