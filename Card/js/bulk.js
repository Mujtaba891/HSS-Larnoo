// =====================================================
// bulk.js  —  Bulk Features Module
// Handles: Excel Export, Excel Import, Bulk PDF Print
// =====================================================

import {
    db, auth, state, generateQrCode,
    collection, addDoc, runTransaction, doc, serverTimestamp
} from './firebase-config.js';

export function initBulkModule() {

    // =====================================================
    // EXCEL EXPORT
    // =====================================================
    document.getElementById('exportExcelBtn').addEventListener('click', () => {
        if (!state.allStudents.length) { alert('No data to export.'); return; }

        const exportData = state.allStudents.map(s => ({
            'ID':       s.customId   || '',
            'Name':     s.name       || '',
            'Parentage':s.parentage  || '',
            'Class':    s.class ? `${s.class}th` : '',
            'Gender':   s.gender     || '',
            'Stream':   s.stream     || '',
            'Roll No':  s.roll       || '',
            'Phone':    s.phone      || '',
            'Address':  s.address    || '',
            'Session':  s.session    || '',
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Students');
        XLSX.writeFile(wb, `HSS-Larnoo-Students-${new Date().toISOString().split('T')[0]}.xlsx`);
    });

    // =====================================================
    // EXCEL TEMPLATE DOWNLOAD
    // =====================================================
    function downloadTemplate() {
        const templateData = [{
            name: 'Mohammad Ali', parentage: 'Abdul Rashid', class: '10',
            gender: 'Boys', stream: '', roll: '1', phone: '9876543210',
            address: 'Larnoo, Anantnag', session: '2025-26'
        }];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Students');
        XLSX.writeFile(wb, 'Import-Template.xlsx');
    }

    document.getElementById('downloadTemplateBtn').addEventListener('click', (e) => {
        e.preventDefault();
        downloadTemplate();
    });

    // =====================================================
    // EXCEL IMPORT
    // =====================================================
    const importModal          = document.getElementById('import-modal');
    const importDropzone       = document.getElementById('import-dropzone');
    const importFileInput      = document.getElementById('import-file-input');
    const startImportBtn       = document.getElementById('startImportBtn');
    const importProgress       = document.getElementById('import-progress');
    const importProgressBar    = document.getElementById('import-progress-bar');
    const importProgressLabel  = document.getElementById('import-progress-label');
    const importProgressPercent= document.getElementById('import-progress-percent');
    const importLog            = document.getElementById('import-log');
    const importFileName       = document.getElementById('import-file-name');

    // Open import modal
    document.getElementById('importExcelBtn').addEventListener('click', () => {
        if (!auth.currentUser) { alert('Please login as admin first.'); return; }
        state.importFileData = null;
        startImportBtn.disabled = true;
        importProgress.style.display = 'none';
        importLog.innerHTML = '';
        importFileName.textContent = '';
        importModal.style.display = 'block';
    });

    // Template link inside modal
    document.getElementById('dlTemplateLink').addEventListener('click', (e) => {
        e.preventDefault();
        downloadTemplate();
    });

    // Dropzone interactions
    importDropzone.addEventListener('click',    () => importFileInput.click());
    importDropzone.addEventListener('dragover', (e) => { e.preventDefault(); importDropzone.classList.add('dragover'); });
    importDropzone.addEventListener('dragleave', () => importDropzone.classList.remove('dragover'));
    importDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        importDropzone.classList.remove('dragover');
        if (e.dataTransfer.files[0]) handleImportFile(e.dataTransfer.files[0]);
    });
    importFileInput.addEventListener('change', (e) => {
        if (e.target.files[0]) handleImportFile(e.target.files[0]);
    });

    function handleImportFile(file) {
        if (!file.name.endsWith('.xlsx')) { alert('Only .xlsx files are supported.'); return; }
        importFileName.textContent = `📄 ${file.name} (${(file.size/1024).toFixed(1)} KB)`;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb   = XLSX.read(e.target.result, { type: 'array' });
                const ws   = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                state.importFileData = rows;
                importFileName.textContent += ` — ${rows.length} rows found`;
                startImportBtn.disabled = rows.length === 0;
            } catch (err) {
                alert('Could not read Excel file: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // Start Import
    startImportBtn.addEventListener('click', async () => {
        if (!state.importFileData?.length) return;
        const rows = state.importFileData;
        startImportBtn.disabled = true;
        importProgress.style.display = 'block';
        importLog.innerHTML = '';

        let successCount = 0, errorCount = 0;

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const pct = Math.round(((i + 1) / rows.length) * 100);
            importProgressBar.style.width      = pct + '%';
            importProgressPercent.textContent  = pct + '%';
            importProgressLabel.textContent    = `Importing row ${i + 1} of ${rows.length}...`;

            try {
                const cls = String(row.class || '').replace('th', '').trim();
                if (!row.name || !cls) throw new Error('Missing name or class');

                const newId = await runTransaction(db, async (transaction) => {
                    const year       = new Date().getFullYear().toString().slice(-2);
                    const counterRef = doc(db, 'id_counters', `${year}-${cls}`);
                    const counterDoc = await transaction.get(counterRef);
                    const newSerial  = (counterDoc.exists() ? counterDoc.data().lastSerial : 0) + 1;
                    transaction.set(counterRef, { lastSerial: newSerial });
                    return `${year}${cls.padStart(2,'0')}${newSerial.toString().padStart(3,'0')}`;
                });

                await addDoc(collection(db, 'students'), {
                    customId:  newId,
                    name:      String(row.name      || '').trim(),
                    parentage: String(row.parentage || '').trim(),
                    class:     cls,
                    gender:    ['9','10'].includes(cls)  ? String(row.gender || '').trim() : null,
                    stream:    ['11','12'].includes(cls) ? String(row.stream || '').trim() : null,
                    roll:      String(row.roll      || '').trim(),
                    phone:     String(row.phone     || '').trim(),
                    address:   String(row.address   || '').trim(),
                    session:   String(row.session   || '2025-26').trim(),
                    photo:     'profile.png',
                    createdAt: serverTimestamp(),
                });

                successCount++;
                importLog.innerHTML += `<p class="log-ok">✓ Row ${i+1}: ${row.name} → ID: ${newId}</p>`;

            } catch (err) {
                errorCount++;
                importLog.innerHTML += `<p class="log-error">✗ Row ${i+1}: ${row.name || '?'} — ${err.message}</p>`;
            }

            importLog.scrollTop = importLog.scrollHeight;
            await new Promise(r => setTimeout(r, 50)); // small delay to avoid Firestore throttle
        }

        importProgressLabel.textContent = `Done! ✅ ${successCount} imported, ❌ ${errorCount} errors.`;
        startImportBtn.disabled = false;
    });

    // =====================================================
    // BULK PDF PRINT
    // =====================================================
    const printModal = document.getElementById('print-modal');

    document.getElementById('bulkPrintBtn').addEventListener('click', () => {
        if (!auth.currentUser)          { alert('Please login as admin first.'); return; }
        if (!state.allStudents.length)  { alert('No students loaded.');           return; }
        printModal.style.display = 'block';
    });

    document.getElementById('generatePdfBtn').addEventListener('click', async () => {
        const selectedClass  = document.getElementById('print-class-select').value;
        const cardsPerPage   = parseInt(document.getElementById('print-cards-per-page').value);

        const students = selectedClass === 'all'
            ? state.allStudents
            : state.allStudents.filter(s => s.class === selectedClass);

        if (!students.length) { alert('No students found for selected class.'); return; }

        printModal.style.display = 'none';

        const overlay       = document.getElementById('pdf-progress-overlay');
        const progressBar   = document.getElementById('pdf-progress-bar');
        const progressLabel = document.getElementById('pdf-progress-label');
        overlay.classList.add('active');

        // A4 portrait: 210×297 mm
        const { jsPDF } = window.jspdf;
        const pdf     = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW   = 210, pageH = 297;
        const cols    = 2;
        const rows    = cardsPerPage / cols;
        const marginX = 10, marginY = 10;
        const cardW   = (pageW - (marginX * 2)) / cols;
        const cardH   = (pageH - (marginY * 2)) / rows;

        // Render a single student card to a canvas
        async function renderCardToCanvas(student) {
            const tempDiv = document.createElement('div');
            tempDiv.style.cssText = 'position:absolute; left:-9999px; top:-9999px; width:380px;';
            tempDiv.innerHTML = document.getElementById('student-card-preview').outerHTML;
            document.body.appendChild(tempDiv);

            const card = tempDiv.querySelector('#idCard');
            card.querySelector('.displayPhoto').src          = student.photo || 'profile.png';
            card.querySelector('.displayName').textContent   = student.name;
            card.querySelector('.displayParentage').textContent = `: ${student.parentage || ''}`;
            card.querySelector('.displayPhone').textContent  = student.phone || '';
            card.querySelector('.displayId').textContent     = student.customId || '';
            card.querySelector('.displayRoll').textContent   = student.roll || '';

            const classText = student.stream
                ? `${student.class}th (${student.stream})`
                : (student.gender ? `${student.class}th (${student.gender})` : `${student.class}th`);
            card.querySelector('.displayClass').textContent   = classText;
            card.querySelector('.displayAddress').textContent = student.address || '';

            const sessionEl = card.querySelector('.displaySession');
            if (sessionEl) sessionEl.textContent = student.session || '2025-26';

            generateQrCode(card.querySelector('.card-qr-code'), student.customId || student.roll || 'N/A');

            await new Promise(r => setTimeout(r, 120)); // wait for QR to render

            const canvas = await html2canvas(card, {
                scale: 2, useCORS: true, backgroundColor: '#eef2f9', logging: false
            });
            document.body.removeChild(tempDiv);
            return canvas;
        }

        for (let i = 0; i < students.length; i++) {
            const posInPage = i % cardsPerPage;
            if (posInPage === 0 && i > 0) pdf.addPage();

            const col = posInPage % cols;
            const row = Math.floor(posInPage / cols);
            const x   = marginX + col * cardW;
            const y   = marginY + row * cardH;

            progressBar.style.width = `${Math.round(((i+1)/students.length)*100)}%`;
            progressLabel.textContent = `Processing card ${i+1} of ${students.length}: ${students[i].name}`;

            try {
                const canvas  = await renderCardToCanvas(students[i]);
                const imgData = canvas.toDataURL('image/jpeg', 0.85);
                pdf.addImage(imgData, 'JPEG', x + 1, y + 1, cardW - 2, cardH - 2);
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(0.3);
                pdf.rect(x, y, cardW, cardH);
            } catch (err) {
                console.error('Card render error:', err);
            }
        }

        overlay.classList.remove('active');
        const classLabel = selectedClass === 'all' ? 'All' : `Class-${selectedClass}`;
        pdf.save(`ID-Cards-${classLabel}-${new Date().toISOString().split('T')[0]}.pdf`);
    });
}