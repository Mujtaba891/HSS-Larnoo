// =====================================================
// attendance.js  —  Attendance Module
// Handles: QR scanner, date navigation, attendance lists
// =====================================================

import {
    db, auth, state,
    collection, query, where, getDocs, addDoc, serverTimestamp, limit, onSnapshot
} from './firebase-config.js';

export function initAttendanceModule() {

    const attendanceDateEl       = document.getElementById('attendance-date');
    const attendancePercentageEl = document.getElementById('attendance-percentage');
    const listsContainer         = document.getElementById('attendance-lists-container');
    const scannerContainer       = document.getElementById('scanner-container');
    const scanResultEl           = document.getElementById('scan-result');

    let qrScanner = null;

    // ---- Setup (called when switching to this view) ----
    async function setupAttendanceView() {
        if (!auth.currentUser) return;
        renderAttendanceForSelectedDate();
        await startScanner();
    }

    // Expose so app.js can call it
    window.setupAttendanceView = setupAttendanceView;

    // ---- Date Navigation ----
    function changeDate(days) {
        state.selectedDate.setDate(state.selectedDate.getDate() + days);
        renderAttendanceForSelectedDate();
    }

    document.getElementById('prev-day-btn').addEventListener('click', () => changeDate(-1));
    document.getElementById('next-day-btn').addEventListener('click', () => changeDate(1));

    // ---- Render Attendance for Selected Date ----
    function renderAttendanceForSelectedDate() {
        if (state.attendanceListener) state.attendanceListener();

        const dateStr = state.selectedDate.toISOString().split('T')[0];
        attendanceDateEl.textContent = state.selectedDate.toLocaleDateString('en-US', {
            weekday: 'long', month: 'long', day: 'numeric'
        });

        const q = query(collection(db, 'attendance'), where('date', '==', dateStr));
        state.attendanceListener = onSnapshot(q, (snapshot) => {
            const totalStudents = state.allStudents.length;
            const presentCount  = snapshot.size;
            const percentage    = totalStudents > 0 ? ((presentCount / totalStudents) * 100).toFixed(0) : 0;
            attendancePercentageEl.textContent = `${percentage}% Attended`;
            renderAttendanceLists(snapshot.docs);
        }, (error) => {
            console.error('Attendance listener error:', error);
            listsContainer.innerHTML = `<p style="text-align:center; color:var(--danger-color); padding:20px;">Error loading attendance.</p>`;
        });
    }

    // ---- Render Attendance Lists ----
    function renderAttendanceLists(attendanceDocs) {
        listsContainer.innerHTML = '';
        const presentMap      = new Map(attendanceDocs.map(d => [d.data().customId, d.data()]));
        const presentStudents = state.allStudents.filter(s => presentMap.has(s.customId));

        if (!presentStudents.length) {
            listsContainer.innerHTML = '<p style="text-align:center; padding:20px;">No attendance recorded for this day.</p>';
            return;
        }

        const sections = {};
        presentStudents.forEach(student => {
            const key = student.stream
                ? `${student.class}th ${student.stream}`
                : (student.gender ? `${student.class}th ${student.gender}` : `${student.class}th`);
            if (!sections[key]) sections[key] = [];
            sections[key].push(student);
        });

        const sortedSections = Object.keys(sections).sort((a,b) => a.localeCompare(b, undefined, { numeric: true }));

        sortedSections.forEach(sectionKey => {
            const students    = sections[sectionKey].sort((a,b) => a.roll - b.roll);
            const studentRows = students.map(student => {
                const record = presentMap.get(student.customId);
                const time   = record.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || '';
                return `<tr>
                    <td>${student.customId}</td>
                    <td><img src="${student.photo}" class="table-photo" onerror="this.onerror=null;this.src='profile.png';"></td>
                    <td>${student.name}</td>
                    <td>${student.roll}</td>
                    <td>${time}</td>
                </tr>`;
            }).join('');

            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'attendance-class-section';
            sectionDiv.innerHTML = `
                <h3>${sectionKey} (${students.length})</h3>
                <div class="table-container">
                    <table class="data-table">
                        <thead><tr><th>ID</th><th>Photo</th><th>Name</th><th>Roll No</th><th>Time</th></tr></thead>
                        <tbody>${studentRows}</tbody>
                    </table>
                </div>`;
            listsContainer.appendChild(sectionDiv);
        });
    }

    // ---- QR Scan Handler ----
    async function onScanSuccess(decodedText) {
        if (decodedText === state.lastScannedId) return;
        if (!state.allStudents.length) {
            scanResultEl.className   = 'result-error';
            scanResultEl.textContent = 'Student data not loaded. Please wait.';
            return;
        }

        state.lastScannedId = decodedText;
        clearTimeout(state.scanTimeout);

        scannerContainer.classList.remove('scanner-success', 'scanner-error');
        scanResultEl.className   = 'result-info';
        scanResultEl.textContent = `Processing: ${decodedText}...`;

        const student = state.allStudents.find(s => s.customId === decodedText);
        let feedbackClass = 'result-error';
        let feedbackText  = `Error: ID ${decodedText} not found.`;

        if (student) {
            const today = new Date().toISOString().split('T')[0];
            const q     = query(
                collection(db, 'attendance'),
                where('customId', '==', decodedText),
                where('date', '==', today),
                limit(1)
            );
            const snap = await getDocs(q);

            if (!snap.empty) {
                feedbackText = `${student.name} already marked present.`;
            } else {
                try {
                    await addDoc(collection(db, 'attendance'), {
                        customId:  student.customId,
                        date:      today,
                        timestamp: serverTimestamp()
                    });
                    feedbackClass = 'result-success';
                    feedbackText  = `Welcome, ${student.name}!`;
                } catch (error) {
                    feedbackText = 'Error saving attendance.';
                }
            }
        }

        scannerContainer.classList.add(feedbackClass === 'result-success' ? 'scanner-success' : 'scanner-error');
        scanResultEl.className   = feedbackClass;
        scanResultEl.textContent = feedbackText;

        state.scanTimeout = setTimeout(() => {
            state.lastScannedId = null;
            scannerContainer.classList.remove('scanner-success', 'scanner-error');
            scanResultEl.className   = 'result-info';
            scanResultEl.textContent = 'Awaiting Scan...';
        }, 3000);
    }

    // ---- Start QR Scanner ----
    async function startScanner() {
        const qrReaderElement = document.getElementById('qr-reader');
        if (!qrReaderElement) return;

        // If scanner instance already exists, check its state
        if (qrScanner) {
            const scannerState = qrScanner.getState();
            if (scannerState === 2) { // 2 means SCANNING
                return; // Already running, no need to start again
            }
            // If it's in another state (stopped/paused), we might need to clear it or restart
            try { await qrScanner.stop(); } catch(e) {}
        } else {
            qrScanner = new Html5Qrcode("qr-reader");
        }

        const config = { fps: 10, qrbox: { width: 250, height: 250 } };

        try {
            await qrScanner.start({ facingMode: "environment" }, config, onScanSuccess);
            scanResultEl.textContent = 'Scanner Ready. Please point at QR Code.';
            scanResultEl.className = 'result-info';
        } catch (err) {
            console.error("Camera start error:", err);
            scanResultEl.className = 'result-error';
            scanResultEl.textContent = 'Camera permission denied or camera already in use.';
        }
    }

    // Stop scanner when leaving view
    window.stopAttendanceScanner = async () => {
        if (qrScanner) {
            try {
                const scannerState = qrScanner.getState();
                if (scannerState === 2) { // SCANNING
                    await qrScanner.stop();
                }
                // We keep the instance but it's stopped
            } catch(e) {
                console.error("Error stopping scanner:", e);
            }
        }
    };
}