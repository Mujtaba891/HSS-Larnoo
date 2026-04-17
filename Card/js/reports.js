// =====================================================
// reports.js  —  Reports & Analytics Module
// Handles: student monthly report, pie chart,
//          class attendance bars
// =====================================================

import {
    db, state,
    collection, query, where, getDocs
} from './firebase-config.js';

export function initReportsModule() {

    // ---- Setup (called when switching to this view or on auth change) ----
    async function setupReportsView() {
        initReportDropdowns();
        await renderTodayPieChart();
        await renderClassMonthlyBars();
    }

    // Expose so admin.js can call on auth change
    window.setupReportsView = setupReportsView;

    // ---- Month/Year Dropdown Initialization ----
    function initReportDropdowns() {
        const monthSel = document.getElementById('report-month-select');
        const yearSel  = document.getElementById('report-year-select');

        const months = ['January','February','March','April','May','June','July',
                        'August','September','October','November','December'];
        const curMonth = new Date().getMonth() + 1;
        monthSel.innerHTML = months.map((m, i) =>
            `<option value="${i+1}" ${i+1 === curMonth ? 'selected' : ''}>${m}</option>`
        ).join('');

        const yr = new Date().getFullYear();
        yearSel.innerHTML = [yr-1, yr, yr+1].map(y =>
            `<option value="${y}" ${y === yr ? 'selected' : ''}>${y}</option>`
        ).join('');
    }

    // =====================================================
    // STUDENT MONTHLY ATTENDANCE SEARCH
    // =====================================================
    document.getElementById('report-search-btn').addEventListener('click', async () => {
        const term      = document.getElementById('report-search-input').value.trim().toLowerCase();
        const month     = parseInt(document.getElementById('report-month-select').value);
        const year      = parseInt(document.getElementById('report-year-select').value);
        const resultDiv = document.getElementById('report-student-result');

        if (!term) {
            resultDiv.innerHTML = '<p style="color:#aaa;">Please enter a name or roll number.</p>';
            return;
        }
        if (!state.allStudents.length) {
            resultDiv.innerHTML = '<p style="color:#aaa;">Student data not loaded yet.</p>';
            return;
        }

        const student = state.allStudents.find(s =>
            (s.name || '').toLowerCase().includes(term) ||
            String(s.roll     || '').toLowerCase() === term ||
            String(s.customId || '').toLowerCase() === term
        );

        if (!student) {
            resultDiv.innerHTML = `<p style="color:var(--danger-color); font-weight:600;">No student found matching "<em>${term}</em>".</p>`;
            return;
        }

        resultDiv.innerHTML = '<p style="color:#aaa; font-style:italic;">Loading attendance data...</p>';

        // Fetch all attendance for this student in the selected month
        const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
        const lastDay   = new Date(year, month, 0).getDate();
        const endDate   = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

        const q    = query(
            collection(db, 'attendance'),
            where('customId', '==', student.customId),
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );
        const snap         = await getDocs(q);
        const presentDates = new Set(snap.docs.map(d => d.data().date));

        // Count working days (Mon–Sat, skip Sundays)
        let workingDays = 0;
        for (let d = 1; d <= lastDay; d++) {
            if (new Date(year, month - 1, d).getDay() !== 0) workingDays++;
        }

        const presentCount = presentDates.size;
        const absentCount  = Math.max(0, workingDays - presentCount);
        const pct          = workingDays > 0 ? ((presentCount / workingDays) * 100).toFixed(1) : 0;
        const monthName    = document.getElementById('report-month-select')
                                .options[document.getElementById('report-month-select').selectedIndex].text;

        resultDiv.innerHTML = `
            <div style="display:flex; align-items:center; gap:15px; margin-bottom:15px; flex-wrap:wrap;">
                <img src="${student.photo || 'profile.png'}"
                     style="width:60px;height:60px;border-radius:50%;object-fit:cover;border:3px solid var(--primary-color);"
                     onerror="this.src='profile.png'">
                <div>
                    <h3 style="margin:0; color:var(--primary-color);">${student.name}</h3>
                    <p style="margin:2px 0; font-size:13px; color:#666;">
                        ${student.class}th ${student.stream || student.gender || ''} |
                        Roll: ${student.roll} | ID: ${student.customId}
                    </p>
                </div>
            </div>
            <div class="report-stats-grid">
                <div class="stat-box"><h3>${presentCount}</h3><p>Days Present</p></div>
                <div class="stat-box absent"><h3>${absentCount}</h3><p>Days Absent</p></div>
                <div class="stat-box percent"><h3>${pct}%</h3><p>Attendance</p></div>
                <div class="stat-box" style="border-left-color:var(--accent-color);">
                    <h3>${workingDays}</h3><p>Working Days</p>
                </div>
            </div>
            <p style="font-size:13px; color:#666; margin-top:15px;">
                Monthly Calendar — <strong>${monthName} ${year}</strong> (Sundays excluded)
            </p>
            <div id="report-monthly-calendar">
                ${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => `<div class="cal-header">${d}</div>`).join('')}
                ${buildCalendarHTML(year, month, presentDates)}
            </div>
        `;
    });

    // ---- Build calendar day tiles ----
    function buildCalendarHTML(year, month, presentDates) {
        const firstDay = new Date(year, month - 1, 1).getDay();
        const lastDay  = new Date(year, month, 0).getDate();
        const today    = new Date();
        let html = '';

        // Empty cells before the 1st
        for (let i = 0; i < firstDay; i++) html += `<div class="cal-day cal-holiday"></div>`;

        for (let d = 1; d <= lastDay; d++) {
            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const dayObj  = new Date(year, month - 1, d);
            let cls = '';
            if (dayObj.getDay() === 0)               cls = 'cal-holiday';
            else if (dayObj > today)                  cls = 'cal-future';
            else if (presentDates.has(dateStr))       cls = 'cal-present';
            else                                      cls = 'cal-absent';
            html += `<div class="cal-day ${cls}" title="${dateStr}">${d}</div>`;
        }
        return html;
    }

    // =====================================================
    // TODAY'S ATTENDANCE PIE CHART
    // =====================================================
    async function renderTodayPieChart() {
        const today = new Date().toISOString().split('T')[0];
        const q     = query(collection(db, 'attendance'), where('date', '==', today));
        const snap  = await getDocs(q);
        const presentIds = new Set(snap.docs.map(d => d.data().customId));

        const classCounts = {};
        state.allStudents.forEach(s => {
            const key = `${s.class}th`;
            if (!classCounts[key]) classCounts[key] = { present: 0, total: 0 };
            classCounts[key].total++;
            if (presentIds.has(s.customId)) classCounts[key].present++;
        });

        const labels = Object.keys(classCounts).sort((a,b) => parseInt(a) - parseInt(b));
        const data   = labels.map(k => classCounts[k].present);
        const colors = ['#0d2c54','#1a535c','#f7b801','#d90429','#28a745','#17a2b8'];

        const ctx = document.getElementById('reportPieChart')?.getContext('2d');
        if (!ctx) return;

        if (state.reportPieChart) state.reportPieChart.destroy();

        state.reportPieChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors.slice(0, labels.length),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { font: { size: 12 } } }
                }
            }
        });
    }

    // =====================================================
    // CLASS ATTENDANCE % THIS MONTH (Bar list)
    // =====================================================
    async function renderClassMonthlyBars() {
        const now       = new Date();
        const year      = now.getFullYear();
        const month     = now.getMonth() + 1;
        const startDate = `${year}-${String(month).padStart(2,'0')}-01`;
        const lastDay   = new Date(year, month, 0).getDate();
        const endDate   = `${year}-${String(month).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`;

        // Working days elapsed so far
        let workingDays = 0;
        for (let d = 1; d <= Math.min(now.getDate(), lastDay); d++) {
            if (new Date(year, month - 1, d).getDay() !== 0) workingDays++;
        }

        const q    = query(collection(db, 'attendance'), where('date', '>=', startDate), where('date', '<=', endDate));
        const snap = await getDocs(q);

        // Days attended per student
        const attendedDays = {};
        snap.docs.forEach(d => {
            const id = d.data().customId;
            attendedDays[id] = (attendedDays[id] || 0) + 1;
        });

        // Aggregate by class
        const classData = {};
        state.allStudents.forEach(s => {
            const key = `${s.class}th`;
            if (!classData[key]) classData[key] = { total: 0, presentDays: 0 };
            classData[key].total++;
            classData[key].presentDays += (attendedDays[s.customId] || 0);
        });

        const listEl = document.getElementById('class-attendance-list');
        if (!listEl) return;

        const sorted = Object.entries(classData).sort((a,b) => parseInt(a[0]) - parseInt(b[0]));

        listEl.innerHTML = sorted.map(([cls, data]) => {
            const maxPossible = data.total * workingDays;
            const pct   = maxPossible > 0 ? Math.min(100, ((data.presentDays / maxPossible) * 100).toFixed(1)) : 0;
            const color = pct >= 75 ? 'var(--success-color)' : pct >= 50 ? 'var(--accent-color)' : 'var(--danger-color)';
            return `<div class="class-att-row">
                <span style="width:55px; font-weight:700; color:var(--primary-color);">${cls}</span>
                <div class="class-att-bar-wrap">
                    <div class="class-att-bar" style="width:${pct}%; background:${color};"></div>
                </div>
                <span style="width:45px; font-weight:700; color:${color};">${pct}%</span>
            </div>`;
        }).join('') || '<p style="color:#aaa; font-size:13px;">No attendance recorded this month.</p>';
    }
}