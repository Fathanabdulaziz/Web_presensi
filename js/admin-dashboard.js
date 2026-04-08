let adminAttendanceChart = null;
const dashboardSliderState = {
    announcementsStart: 0,
    clockinsStart: 0,
    kpiStart: 0
};

const ANNOUNCEMENT_MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const ANNOUNCEMENT_MAX_ATTACHMENTS = 5;
const KNOWN_DEPARTMENTS = [
    'AM',
    'FA-Proc',
    'MFG',
    'HRGA',
    'Project Implementation',
    'Project Management',
    'IT'
];

const USER_PROFILE_DEPARTMENTS = [
    'AM',
    'FA-Proc',
    'MFG',
    'HRGA',
    'Project Implementation',
    'Project Management'
];

function isEnLang() {
    return document.documentElement.getAttribute('lang') === 'en';
}

function t(idText, enText) {
    return isEnLang() ? enText : idText;
}

function appLocale() {
    return isEnLang() ? 'en-US' : 'id-ID';
}

function localizeAnnouncementText(value) {
    const raw = String(value ?? '');
    if (!raw) return raw;

    if (typeof translateKnownText === 'function') {
        return translateKnownText(raw, isEnLang() ? 'en' : 'id');
    }

    return raw;
}

function updateDasborPageDate() {
    const pageDate = document.querySelector('.page-date');
    if (!pageDate) return;

    const today = new Date();
    pageDate.textContent = isEnLang()
        ? `Real-time workforce status summary as of ${formatAnnouncementDate(today)}`
        : `Ringkasan real-time status tenaga kerja per ${formatAnnouncementDate(today)}`;
}

function updateAnnouncementSectionHeader() {
    const titleEl = document.querySelector('.announcements-card .card-header h2');
    if (titleEl) {
        titleEl.textContent = t('Pengumuman Perusahaan', 'Company Announcements');
    }

    const createBtn = document.querySelector('.announcements-card .card-header .create-btn');
    if (createBtn) {
        createBtn.textContent = `+ ${t('Buat Baru', 'Create New')}`;
        createBtn.setAttribute('aria-label', t('Buat Pengumuman Baru', 'Create New Announcement'));
    }
}

document.addEventListener('DOMContentLoaded', async function() {
    checkAuthStatus();
    if (!currentUser || !['admin', 'hr', 'manager', 'finance', 'bod'].includes(currentUser?.role)) {
        window.location.href = '../index.html';
        return;
    }

    updateUserDisplay();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => logout(e));
    }

    updateDasborPageDate();
    updateAnnouncementSectionHeader();

    setupSidebarNav();
    if (typeof window.syncCoreDataFromApi === 'function') {
        await window.syncCoreDataFromApi().catch(() => {});
    }
    loadPresensiData();
    loadDasborData();
    setupDasborSliders();
    renderRecentClockins();
    initializeAttendanceFilters();
    renderAdminAttendanceChart();
    renderAdminAnnouncements();

    window.addEventListener('resize', function() {
        renderKpiCards();
        renderRecentClockins();
        renderAdminAnnouncements();
    });

    const createBtn = document.querySelector('.create-btn');
    if (createBtn) {
        createBtn.addEventListener('click', showCreateAnnouncementModal);
    }

    document.querySelector('.download-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        exportAdminDasborReport();
    });

    window.addEventListener('appLanguageChanged', function() {
        updateDasborPageDate();
        updateAnnouncementSectionHeader();
        renderRecentClockins();
        renderAdminAnnouncements();
        renderKpiCards();
    });
});

function exportAdminDasborReport() {
    const today = new Date().toISOString().split('T')[0];
    const division = document.getElementById('attendanceDivisionFilter')?.value || '';
    const range = document.getElementById('attendanceRangeFilter')?.value || 'Minggu Ini';

    const records = Array.isArray(presensiData) ? presensiData : [];
    const todayRecords = records.filter(record => String(record.date || '') === today);

    const presentUsers = new Set();
    const lateUsers = new Set();

    todayRecords.forEach(record => {
        const type = normalizeType(record.type);
        const key = String(record.employeeId || record.username || record.employeeName || '');
        if (!key || type !== 'checkin') return;

        presentUsers.add(key);
        const hour = extractHour(record);
        if (hour !== null && hour > 9) {
            lateUsers.add(key);
        }
    });

    const approvedActiveLeaves = (Array.isArray(leaves) ? leaves : []).filter(leave => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const now = new Date(today);
        return String(leave.status || '').toLowerCase() === 'approved' && start <= now && now <= end;
    });

    const visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const visitTodayCount = visits.filter(v => String(v.visitDate || '').slice(0, 10) === today).length;

    const weekdayLabels = isEnLang() ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] : ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const dayKeyMap = [1, 2, 3, 4, 5, 6, 0];
    const trendValues = weekdayLabels.map((label, index) => ({
        day: label,
        total: getAttendanceCountByWeekday(dayKeyMap[index], division, range)
    }));

    const recentClockins = records
        .filter(record => normalizeType(record.type) === 'checkin')
        .sort((a, b) => new Date(b.timestamp || `${b.date}T${b.time || '00:00'}`) - new Date(a.timestamp || `${a.date}T${a.time || '00:00'}`))
        .slice(0, 30);

    const rows = [];
    rows.push(['Laporan Dasbor Admin']);
    rows.push(['Dibuat Pada', formatCsvDateTime(new Date())]);
    rows.push(['Dibuat Oleh', currentUser?.name || 'Admin']);
    rows.push([]);

    rows.push(['Ringkasan Hari Ini']);
    rows.push(['Hadir', formatCsvNumber(presentUsers.size)]);
    rows.push(['Terlambat', formatCsvNumber(lateUsers.size)]);
    rows.push(['Sedang Cuti (Setujuid)', formatCsvNumber(approvedActiveLeaves.length)]);
    rows.push(['Kunjungan Klien Hari Ini', formatCsvNumber(visitTodayCount)]);
    rows.push([]);

    rows.push(['Tren Presensi Mingguan']);
    rows.push(['Filter Divisi', division || 'Semua Divisi']);
    rows.push(['Filter Rentang', range]);
    rows.push(['Hari', 'Rata-rata Hadir']);
    trendValues.forEach(item => rows.push([item.day, formatCsvNumber(item.total)]));
    rows.push([]);

    rows.push(['Presensi Check-in Terbaru']);
    rows.push(['Nama', 'ID/Username', 'Divisi', 'Tanggal', 'Waktu', 'Lokasi Kerja']);
    recentClockins.forEach(record => {
        rows.push([
            record.employeeName || '-',
            record.employeeId || record.username || '-',
            record.department || '-',
            record.date || '-',
            formatClockinTime(record.time, record.timestamp),
            record.workLocation || '-'
        ]);
    });

    const csv = rows.map(cols => cols.map(escapeCsvCell).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-admin-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    notify(t('Laporan dashboard berhasil diunduh.', 'Dasbor report downloaded successfully.'), 'success');
}

function escapeCsvCell(value) {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
}

function formatCsvDateTime(dateValue) {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).toLowerCase();
}

function formatCsvNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString(appLocale()) : '-';
}

function setupSidebarNav() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (this.getAttribute('href') && !this.getAttribute('href').startsWith('#')) {
                return;
            }
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function loadDasborData() {
    const today = new Date().toISOString().split('T')[0];
    const todayData = Array.isArray(presensiData) ? presensiData.filter(r => r.date === today) : [];

    const presentUsers = new Set();
    const lateUsers = new Set();

    todayData.forEach(record => {
        const type = normalizeType(record.type);
        const identifier = String(record.employeeId || record.username || record.employeeName || '');
        if (!identifier) return;

        if (type === 'checkin') {
            presentUsers.add(identifier);

            const hour = extractHour(record);
            if (hour !== null && hour > 9) {
                lateUsers.add(identifier);
            }
        }
    });

    const leaveCount = (Array.isArray(leaves) ? leaves : []).filter(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const now = new Date(today);
        return start <= now && now <= end && String(l.status || '').toLowerCase() === 'approved';
    }).length;

    const visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');

    document.getElementById('presentCount').textContent = String(presentUsers.size);
    document.getElementById('lateCount').textContent = String(lateUsers.size);
    document.getElementById('leaveCount').textContent = String(leaveCount);
    document.getElementById('visitCount').textContent = String(visits.length);
}

function getDasborSliderViewSize(section) {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return 1;
    if (section === 'clockins') return 3;
    if (section === 'announcements') return 3;
    return 3;
}

function setupDasborSliders() {
    const attendanceSection = document.querySelector('.attendance-section');
    if (attendanceSection && !document.getElementById('kpiSliderNav')) {
        const nav = document.createElement('div');
        nav.className = 'dashboard-slider-nav kpi-slider-nav';
        nav.id = 'kpiSliderNav';
        nav.innerHTML = `
            <button type="button" class="dashboard-slider-btn" id="kpiPrevBtn" aria-label="KPI sebelumnya"><i class="fas fa-chevron-left"></i></button>
            <span class="dashboard-slider-indicator" id="kpiSliderIndicator">1/1</span>
            <button type="button" class="dashboard-slider-btn" id="kpiNextBtn" aria-label="KPI berikutnya"><i class="fas fa-chevron-right"></i></button>
        `;

        const kpiCards = attendanceSection.querySelector('.kpi-cards');
        if (kpiCards) {
            kpiCards.insertAdjacentElement('beforebegin', nav);
        } else {
            attendanceSection.appendChild(nav);
        }

        document.getElementById('kpiPrevBtn')?.addEventListener('click', function() {
            shiftDasborSlider('kpi', -1);
        });

        document.getElementById('kpiNextBtn')?.addEventListener('click', function() {
            shiftDasborSlider('kpi', 1);
        });
    }

    const clockinsHeader = document.querySelector('.clock-ins-card .card-header');
    if (clockinsHeader && !document.getElementById('clockinsSliderNav')) {
        const nav = document.createElement('div');
        nav.className = 'dashboard-slider-nav';
        nav.id = 'clockinsSliderNav';
        nav.innerHTML = `
            <button type="button" class="dashboard-slider-btn" id="clockinsPrevBtn" aria-label="Presensi terbaru sebelumnya"><i class="fas fa-chevron-left"></i></button>
            <span class="dashboard-slider-indicator" id="clockinsSliderIndicator">1/1</span>
            <button type="button" class="dashboard-slider-btn" id="clockinsNextBtn" aria-label="Presensi terbaru berikutnya"><i class="fas fa-chevron-right"></i></button>
        `;

        const viewAll = clockinsHeader.querySelector('.view-all');
        if (viewAll) {
            clockinsHeader.insertBefore(nav, viewAll);
        } else {
            clockinsHeader.appendChild(nav);
        }

        document.getElementById('clockinsPrevBtn')?.addEventListener('click', function() {
            shiftDasborSlider('clockins', -getDasborSliderViewSize('clockins'));
        });
        document.getElementById('clockinsNextBtn')?.addEventListener('click', function() {
            shiftDasborSlider('clockins', getDasborSliderViewSize('clockins'));
        });
    }

    const announcementsHeader = document.querySelector('.announcements-card .card-header');
    if (announcementsHeader && !document.getElementById('announcementsSliderNav')) {
        const nav = document.createElement('div');
        nav.className = 'dashboard-slider-nav';
        nav.id = 'announcementsSliderNav';
        nav.innerHTML = `
            <button type="button" class="dashboard-slider-btn" id="announcementsPrevBtn" aria-label="Pengumuman sebelumnya"><i class="fas fa-chevron-left"></i></button>
            <span class="dashboard-slider-indicator" id="announcementsSliderIndicator">1/1</span>
            <button type="button" class="dashboard-slider-btn" id="announcementsNextBtn" aria-label="Pengumuman berikutnya"><i class="fas fa-chevron-right"></i></button>
        `;

        const createBtn = announcementsHeader.querySelector('.create-btn');
        if (createBtn) {
            announcementsHeader.insertBefore(nav, createBtn);
        } else {
            announcementsHeader.appendChild(nav);
        }

        document.getElementById('announcementsPrevBtn')?.addEventListener('click', function() {
            shiftDasborSlider('announcements', -getDasborSliderViewSize('announcements'));
        });
        document.getElementById('announcementsNextBtn')?.addEventListener('click', function() {
            shiftDasborSlider('announcements', getDasborSliderViewSize('announcements'));
        });
    }

    renderKpiCards();
}

function renderKpiCards() {
    const cards = Array.from(document.querySelectorAll('.attendance-section .kpi-cards .kpi-card'));
    if (!cards.length) return;

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const nav = document.getElementById('kpiSliderNav');
    const prevBtn = document.getElementById('kpiPrevBtn');
    const nextBtn = document.getElementById('kpiNextBtn');
    const indicator = document.getElementById('kpiSliderIndicator');

    if (!isMobile) {
        cards.forEach((card) => {
            card.style.display = 'block';
            card.classList.remove('dashboard-slide-item');
        });

        if (nav) nav.style.display = 'none';
        dashboardSliderState.kpiStart = 0;
        return;
    }

    const viewSize = 1;
    const maxStart = Math.max(0, cards.length - viewSize);
    if (dashboardSliderState.kpiStart > maxStart) {
        dashboardSliderState.kpiStart = maxStart;
    }

    cards.forEach((card, index) => {
        const isVisible = index >= dashboardSliderState.kpiStart && index < dashboardSliderState.kpiStart + viewSize;
        card.style.display = isVisible ? 'block' : 'none';
        card.classList.toggle('dashboard-slide-item', isVisible);
        if (isVisible) {
            card.style.setProperty('--slide-index', String(index - dashboardSliderState.kpiStart));
        } else {
            card.style.removeProperty('--slide-index');
        }
    });

    if (nav) nav.style.display = cards.length > 1 ? 'inline-flex' : 'none';
    if (prevBtn) prevBtn.disabled = dashboardSliderState.kpiStart === 0;
    if (nextBtn) nextBtn.disabled = dashboardSliderState.kpiStart >= maxStart;
    if (indicator) indicator.textContent = `${Math.min(cards.length, dashboardSliderState.kpiStart + 1)}/${Math.max(1, cards.length)}`;
}

function shiftDasborSlider(section, delta) {
    if (section === 'kpi') {
        const cards = Array.from(document.querySelectorAll('.attendance-section .kpi-cards .kpi-card'));
        const maxStart = Math.max(0, cards.length - 1);
        dashboardSliderState.kpiStart = Math.min(maxStart, Math.max(0, dashboardSliderState.kpiStart + delta));
        renderKpiCards();
        return;
    }

    if (section === 'clockins') {
        const records = getRecentClockinRecords();
        const viewSize = getDasborSliderViewSize('clockins');
        dashboardSliderState.clockinsStart = shiftPagedSliderStart(records.length, viewSize, dashboardSliderState.clockinsStart, delta);
        renderRecentClockins();
        return;
    }

    if (section === 'announcements') {
        const records = getSortedAnnouncementsForDisplay(readAnnouncements());
        const viewSize = getDasborSliderViewSize('announcements');
        dashboardSliderState.announcementsStart = shiftPagedSliderStart(records.length, viewSize, dashboardSliderState.announcementsStart, delta);
        renderAdminAnnouncements();
    }
}

function getRecentClockinRecords() {
    const list = (Array.isArray(presensiData) ? presensiData : [])
        .filter(record => normalizeType(record.type) === 'checkin')
        .sort((a, b) => new Date(b.timestamp || `${b.date}T${b.time || '00:00'}`) - new Date(a.timestamp || `${a.date}T${a.time || '00:00'}`));

    return list.map(record => {
        const fullName = record.employeeName || record.username || t('Karyawan', 'Employee');
        const initials = fullName.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'KR';
        const workLocation = record.workLocation || '-';
        const timeText = formatClockinTime(record.time, record.timestamp);

        return {
            initials,
            fullName,
            locationLabel: isEnLang() ? `Check-in - ${workLocation}` : `Presensi Masuk - ${workLocation}`,
            timeText
        };
    });
}

function formatClockinTime(timeValue, timestampValue) {
    const rawTime = String(timeValue || '').trim();
    const directMatch = rawTime.match(/^(\d{1,2})[:.](\d{2})/);
    if (directMatch) {
        const hour = directMatch[1].padStart(2, '0');
        const minute = directMatch[2];
        return `${hour}:${minute}`;
    }

    if (timestampValue) {
        const date = new Date(timestampValue);
        if (!isNaN(date.getTime())) {
            return date.toLocaleTimeString(appLocale(), {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    return rawTime || '-';
}

function renderRecentClockins() {
    const listContainer = document.querySelector('.clock-ins-list');
    if (!listContainer) return;

    const records = getRecentClockinRecords();
    const viewSize = getDasborSliderViewSize('clockins');
    const pagination = getPagedSliderMeta(records.length, viewSize, dashboardSliderState.clockinsStart);
    dashboardSliderState.clockinsStart = pagination.startIndex;

    const visible = records.slice(pagination.startIndex, pagination.startIndex + viewSize);

    listContainer.innerHTML = visible.length
        ? visible.map((item, index) => `
            <div class="clock-in-item dashboard-slide-item" style="--slide-index:${index};">
                <div class="clock-in-avatar">${escapeHtml(item.initials)}</div>
                <div class="clock-in-details">
                    <div class="clock-in-name">${escapeHtml(item.fullName)}</div>
                    <div class="clock-in-location">${escapeHtml(item.locationLabel)}</div>
                </div>
                <div class="clock-in-time">${escapeHtml(item.timeText)}</div>
            </div>
        `).join('')
        : `<div class="clock-in-item"><div class="clock-in-details"><div class="clock-in-name">${t('Belum ada presensi terbaru', 'No recent attendance yet')}</div></div></div>`;

    const prevBtn = document.getElementById('clockinsPrevBtn');
    const nextBtn = document.getElementById('clockinsNextBtn');
    const nav = document.getElementById('clockinsSliderNav');
    const indicator = document.getElementById('clockinsSliderIndicator');

    if (nav) {
        nav.style.display = records.length > viewSize ? 'inline-flex' : 'none';
    }

    if (prevBtn) prevBtn.disabled = !pagination.hasPrev;
    if (nextBtn) nextBtn.disabled = !pagination.hasNext;
    if (indicator) indicator.textContent = `${pagination.currentPage + 1}/${pagination.totalPages}`;
}

function initializeAttendanceFilters() {
    const divisionSelect = document.getElementById('attendanceDivisionFilter');
    const rangeSelect = document.getElementById('attendanceRangeFilter');

    if (divisionSelect) {
        const dynamicDepartments = (Array.isArray(employees) ? employees : [])
            .map(emp => String(emp.department || '').trim())
            .filter(Boolean);

        const departments = Array.from(new Set([
            ...KNOWN_DEPARTMENTS,
            ...dynamicDepartments
        ])).sort((a, b) => a.localeCompare(b, 'id-ID'));

        divisionSelect.innerHTML = '<option value="">Semua Divisi</option>' +
            departments.map(dept => `<option value="${dept}">${dept}</option>`).join('');

        divisionSelect.addEventListener('change', renderAdminAttendanceChart);
    }

    if (rangeSelect) {
        rangeSelect.addEventListener('change', renderAdminAttendanceChart);
    }
}

function renderAdminAttendanceChart() {
    const canvas = document.getElementById('attendanceChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const labels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
    const dayKeyMap = [1, 2, 3, 4, 5, 6, 0];

    const division = document.getElementById('attendanceDivisionFilter')?.value || '';
    const range = document.getElementById('attendanceRangeFilter')?.value || 'Minggu Ini';

    const dayCount = labels.map((_, index) => getAttendanceCountByWeekday(dayKeyMap[index], division, range));

    if (adminAttendanceChart) {
        adminAttendanceChart.destroy();
    }

    adminAttendanceChart = new Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: division ? `Hadir (${division})` : 'Hadir',
                data: dayCount,
                borderColor: '#3b82f6',
                backgroundColor: (context) => {
                    const canvas = context.chart.ctx;
                    const gradient = canvas.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
                    gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
                    return gradient;
                },
                tension: 0.45,
                fill: true,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
                borderWidth: 3,
                borderCapStyle: 'round',
                borderJoinStyle: 'round'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

function getAttendanceCountByWeekday(targetWeekday, division, range) {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);

    if (range === 'Minggu Lalu') {
        const mondayOffset = (now.getDay() + 6) % 7;
        start.setDate(now.getDate() - mondayOffset - 7);
        end.setDate(start.getDate() + 6);
    } else if (range === 'Minggu Ini') {
        const mondayOffset = (now.getDay() + 6) % 7;
        start.setDate(now.getDate() - mondayOffset);
        end.setDate(start.getDate() + 6);
    } else {
        start.setDate(1);
        end.setMonth(now.getMonth() + 1, 0);
    }

    const employeeMap = new Map((Array.isArray(employees) ? employees : []).map(emp => [String(emp.id), emp]));

    const groupedByDay = new Map();

    (Array.isArray(presensiData) ? presensiData : []).forEach(record => {
        const type = normalizeType(record.type);
        if (type !== 'checkin') return;

        const recordDate = parseAttendanceDate(record);
        if (!recordDate) return;
        if (recordDate < stripTime(start) || recordDate > stripTime(end)) return;

        if (recordDate.getDay() !== targetWeekday) return;

        const employeeId = String(record.employeeId || '');
        const employee = employeeMap.get(employeeId);
        const employeeDept = String(employee?.department || record.department || '').trim();
        if (division && employeeDept !== division) return;

        const dateKey = recordDate.toISOString().split('T')[0];
        if (!groupedByDay.has(dateKey)) {
            groupedByDay.set(dateKey, new Set());
        }

        const key = String(record.employeeId || record.username || record.employeeName || `${recordDate.getTime()}`);
        groupedByDay.get(dateKey).add(key);
    });

    let total = 0;
    groupedByDay.forEach(set => {
        total += set.size;
    });

    if (groupedByDay.size === 0) return 0;
    return Math.round(total / groupedByDay.size);
}

function stripTime(dateObj) {
    return new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
}

function parseAttendanceDate(record) {
    if (record.timestamp) {
        const byTimestamp = new Date(record.timestamp);
        if (!isNaN(byTimestamp.getTime())) return stripTime(byTimestamp);
    }

    if (record.date) {
        const byDate = new Date(record.date);
        if (!isNaN(byDate.getTime())) return stripTime(byDate);
    }

    return null;
}

function normalizeType(type) {
    const value = String(type || '').toLowerCase();
    if (value === 'check in' || value === 'checkin') return 'checkin';
    if (value === 'check out' || value === 'checkout') return 'checkout';
    return 'unknown';
}

function extractHour(record) {
    if (record.timestamp) {
        const timestampDate = new Date(record.timestamp);
        if (!isNaN(timestampDate.getTime())) return timestampDate.getHours();
    }

    const timeText = String(record.time || '').trim();
    const match = timeText.match(/^(\d{1,2})/);
    if (!match) return null;

    const hour = parseInt(match[1], 10);
    return isNaN(hour) ? null : hour;
}

function getDefaultAnnouncements() {
    const today = new Date().toISOString().split('T')[0];
    return [
        {
            id: Date.now() - 2,
            title: 'Pedoman Kerja Remote Baru',
            category: 'Kebijakan',
            content: 'Mulai bulan depan, pola hybrid 3:2 berlaku untuk seluruh divisi. Silakan cek detail jadwal di portal HR.',
            date: today,
            author: 'HR Admin',
            priority: 'Normal',
            targetDivision: 'Semua Divisi'
        },
        {
            id: Date.now() - 1,
            title: 'Rapat Townhall Tahunan',
            category: 'Acara',
            content: 'Townhall tahunan akan dilaksanakan Jumat pukul 15:30 WIB. Kehadiran seluruh karyawan diharapkan.',
            date: today,
            author: 'HR Admin',
            priority: 'Penting',
            targetDivision: 'Semua Divisi'
        }
    ];
}

function readAnnouncements() {
    const raw = localStorage.getItem('announcements');
    if (!raw) {
        return [];
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) {
            return [];
        }
        return parsed;
    } catch (error) {
        return [];
    }
}

function renderAdminAnnouncements() {
    const grid = document.querySelector('.announcements-grid');
    if (!grid) return;

    const items = getSortedAnnouncementsForDisplay(readAnnouncements());
    const viewSize = getDasborSliderViewSize('announcements');
    const pagination = getPagedSliderMeta(items.length, viewSize, dashboardSliderState.announcementsStart);
    dashboardSliderState.announcementsStart = pagination.startIndex;

    const visible = items.slice(
        pagination.startIndex,
        pagination.startIndex + viewSize
    );

    grid.innerHTML = visible.map((ann, index) => {
        const categoryClass = getCategoryClass(ann.category);
        const categoryIcon = getCategoryIcon(ann.category);
        const attachmentsCount = Array.isArray(ann.attachments) ? ann.attachments.length : 0;
        const displayCategory = localizeAnnouncementText(ann.category || t('Umum', 'General'));
        const displayTitle = localizeAnnouncementText(ann.title || t('Pengumuman', 'Announcement'));
        const displayContent = localizeAnnouncementText(ann.content || '-');
        return `
            <button type="button" class="announcement-item dashboard-slide-item announcement-clickable" data-announcement-id="${ann.id}" style="--slide-index:${index};">
                <div class="announcement-badge ${categoryClass}">${categoryIcon} ${escapeHtml(displayCategory)}</div>
                <div class="announcement-date">${formatAnnouncementDate(ann.date || new Date().toISOString().split('T')[0])}</div>
                <h3>${escapeHtml(displayTitle)}</h3>
                <p>${escapeHtml(displayContent)}</p>
                ${attachmentsCount > 0 ? `<small class="announcement-attachment-hint"><i class="fas fa-paperclip"></i> ${attachmentsCount} ${t('lampiran', 'attachments')}</small>` : ''}
            </button>
        `;
    }).join('');

    grid.querySelectorAll('.announcement-clickable').forEach((itemEl) => {
        itemEl.addEventListener('click', function() {
            const id = Number(this.getAttribute('data-announcement-id'));
            if (!id) return;
            openAnnouncementDetailModal(id);
        });
    });

    const prevBtn = document.getElementById('announcementsPrevBtn');
    const nextBtn = document.getElementById('announcementsNextBtn');
    const nav = document.getElementById('announcementsSliderNav');
    const indicator = document.getElementById('announcementsSliderIndicator');

    if (nav) {
        nav.style.display = items.length > viewSize ? 'inline-flex' : 'none';
    }

    if (prevBtn) prevBtn.disabled = !pagination.hasPrev;
    if (nextBtn) nextBtn.disabled = !pagination.hasNext;
    if (indicator) indicator.textContent = `${pagination.currentPage + 1}/${pagination.totalPages}`;
}

function openAnnouncementDetailModal(announcementId) {
    const announcement = readAnnouncements().find((item) => Number(item.id) === Number(announcementId));
    if (!announcement) {
        notify(t('Detail pengumuman tidak ditemukan.', 'Announcement details not found.'), 'warning');
        return;
    }

    const attachments = Array.isArray(announcement.attachments) ? announcement.attachments : [];
    const displayCategory = localizeAnnouncementText(announcement.category || t('Umum', 'General'));
    const displayPriority = localizeAnnouncementText(announcement.priority || t('Normal', 'Normal'));
    const displayDivision = localizeAnnouncementText(announcement.targetDivision || t('Semua Divisi', 'All Divisions'));
    const displayTitle = localizeAnnouncementText(announcement.title || t('Pengumuman', 'Announcement'));
    const displayContent = localizeAnnouncementText(announcement.content || '-');
    const attachmentMarkup = attachments.length
        ? `
            <div class="announcement-detail-section">
                <h4><i class="fas fa-paperclip"></i> ${t('Lampiran', 'Attachments')}</h4>
                <div class="announcement-attachment-list">
                    ${renderAnnouncementAttachmentItems(attachments)}
                </div>
            </div>
        `
        : `<p class="announcement-detail-empty">${t('Tidak ada lampiran.', 'No attachments.')}</p>`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    const categoryClass = getCategoryClass(announcement.category);
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 760px; width: min(760px, 96vw);">
            <div class="modal-header">
                <h3><i class="fas fa-bullhorn"></i> ${t('Detail Pengumuman', 'Announcement Details')}</h3>
                <button type="button" class="modal-close" id="closeAnnouncementDetailModal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="announcement-detail-meta">
                    <span class="announcement-badge ${categoryClass}">${getCategoryIcon(announcement.category)} ${escapeHtml(displayCategory)}</span>
                    <span>${formatAnnouncementDate(announcement.date || new Date().toISOString().split('T')[0])}</span>
                    <span>${t('Prioritas', 'Priority')}: ${escapeHtml(displayPriority)}</span>
                    <span>${t('Divisi', 'Division')}: ${escapeHtml(displayDivision)}</span>
                </div>
                <h2 class="announcement-detail-title">${escapeHtml(displayTitle)}</h2>
                <p class="announcement-detail-content">${escapeHtml(displayContent).replace(/\n/g, '<br>')}</p>
                ${attachmentMarkup}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" id="editAnnouncementFromDetailBtn"><i class="fas fa-pen"></i> ${t('Ubah', 'Ubah')}</button>
                <button type="button" class="btn btn-danger" id="deleteAnnouncementFromDetailBtn"><i class="fas fa-trash"></i> ${t('Hapus', 'Delete')}</button>
                <button type="button" class="btn secondary" id="closeAnnouncementDetailFooterBtn">${t('Tutup', 'Close')}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
        if (typeof closeOverlayModal === 'function') {
            closeOverlayModal(modal);
            return;
        }
        modal.remove();
    };
    modal.querySelector('#closeAnnouncementDetailModal')?.addEventListener('click', close);
    modal.querySelector('#closeAnnouncementDetailFooterBtn')?.addEventListener('click', close);
    modal.querySelector('#editAnnouncementFromDetailBtn')?.addEventListener('click', function() {
        close();
        showUbahAnnouncementModal(announcement.id);
    });
    modal.querySelector('#deleteAnnouncementFromDetailBtn')?.addEventListener('click', async function() {
        const ok = await askAppConfirm({
            title: t('Hapus Pengumuman?', 'Delete Announcement?'),
            message: t('Pengumuman ini akan dihapus permanen dan tidak dapat dikembalikan.', 'This announcement will be permanently deleted and cannot be restored.'),
            confirmText: t('Ya, Hapus', 'Yes, Delete'),
            cancelText: t('Batal', 'Cancel'),
            variant: 'danger'
        });
        if (!ok) return;

        try {
            if (typeof apiRequest === 'function') {
                await apiRequest(`/api/announcements/${Number(announcement.id)}`, {
                    method: 'DELETE',
                });
                if (typeof window.syncAnnouncementsFromApi === 'function') {
                    await window.syncAnnouncementsFromApi().catch(() => {});
                }
            } else {
                const announcements = readAnnouncements().filter((item) => Number(item.id) !== Number(announcement.id));
                localStorage.setItem('announcements', JSON.stringify(announcements));
            }

            close();
            renderAdminAnnouncements();
            notify(t('Pengumuman berhasil dihapus.', 'Announcement deleted successfully.'), 'success');
        } catch (error) {
            notify(error?.message || t('Gagal menghapus pengumuman.', 'Failed to delete announcement.'), 'error');
        }
    });
    modal.querySelectorAll('.announcement-open-tab-btn').forEach((button) => {
        button.addEventListener('click', function() {
            const src = this.getAttribute('data-file-src') || '';
            const mimeType = this.getAttribute('data-file-mime') || '';
            openAnnouncementAttachmentInNewTab(src, mimeType);
        });
    });
    modal.querySelectorAll('.announcement-download-btn').forEach((button) => {
        button.addEventListener('click', function() {
            const src = this.getAttribute('data-file-src') || '';
            const fileName = this.getAttribute('data-file-name') || 'lampiran';
            const mimeType = this.getAttribute('data-file-mime') || '';
            downloadAnnouncementAttachment(src, fileName, mimeType);
        });
    });
    modal.querySelectorAll('.announcement-preview-btn').forEach((button) => {
        button.addEventListener('click', function() {
            const src = this.getAttribute('data-preview-src') || '';
            const type = this.getAttribute('data-preview-type') || 'file';
            const title = this.getAttribute('data-preview-title') || 'lampiran';
            const mimeType = this.getAttribute('data-preview-mime') || '';
            if (!src || src === '#') {
                notify(t('Pratinjau lampiran tidak tersedia.', 'Attachment preview is not available.'), 'warning');
                return;
            }

            openAnnouncementAttachmentPreviewModal({
                src,
                type,
                title,
                mimeType
            });
        });
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });
}

function renderAnnouncementAttachmentItems(attachments) {
    return attachments.map(att => {
        const safeName = escapeHtml(att.storedName || att.name || t('lampiran', 'attachment'));
        const rawName = String(att.storedName || att.name || t('lampiran', 'attachment'));
        const href = String(att.dataUrl || '#');
        const type = getAnnouncementAttachmentType(att.mimeType, href);
        const typeInfo = getAnnouncementAttachmentTypeInfo(att);
        const safeMime = escapeHtml(String(att.mimeType || ''));
        const safeRawName = escapeHtml(rawName);

        if (type === 'image') {
            return `
                <div class="announcement-image-item">
                    <div class="announcement-file-header">
                        <span class="announcement-file-type-badge"><i class="fas ${typeInfo.icon}"></i> ${typeInfo.label}</span>
                        <span class="announcement-file-name">${safeName}</span>
                    </div>
                    <img src="${href}" alt="${safeName}">
                    <div class="announcement-attachment-actions">
                        <button type="button" class="btn secondary announcement-preview-btn" data-preview-src="${href}" data-preview-type="${type}" data-preview-title="${safeRawName}" data-preview-mime="${safeMime}"><i class="fas fa-up-right-and-down-left-from-center"></i> ${t('Pratinjau', 'Preview')}</button>
                        <button type="button" class="btn secondary announcement-open-tab-btn" data-file-src="${href}" data-file-mime="${safeMime}"><i class="fas fa-eye"></i> ${t('Lihat', 'View')}</button>
                        <button type="button" class="btn secondary announcement-download-btn" data-file-src="${href}" data-file-name="${safeRawName}" data-file-mime="${safeMime}"><i class="fas fa-download"></i> ${t('Unduh', 'Download')}</button>
                    </div>
                </div>
            `;
        }

        if (type === 'pdf' || type === 'text') {
            return `
                <div class="announcement-file-item">
                    <div class="announcement-file-header">
                        <span class="announcement-file-type-badge"><i class="fas ${typeInfo.icon}"></i> ${typeInfo.label}</span>
                        <span class="announcement-file-name">${safeName}</span>
                    </div>
                    <div class="announcement-file-preview-wrap">
                        <iframe class="announcement-file-preview" src="${href}" title="Pratinjau ${safeName}"></iframe>
                    </div>
                    <div class="announcement-attachment-actions">
                        <button type="button" class="btn secondary announcement-preview-btn" data-preview-src="${href}" data-preview-type="${type}" data-preview-title="${safeRawName}" data-preview-mime="${safeMime}"><i class="fas fa-up-right-and-down-left-from-center"></i> ${t('Pratinjau', 'Preview')}</button>
                        <button type="button" class="btn secondary announcement-open-tab-btn" data-file-src="${href}" data-file-mime="${safeMime}"><i class="fas fa-eye"></i> ${t('Lihat', 'View')}</button>
                        <button type="button" class="btn secondary announcement-download-btn" data-file-src="${href}" data-file-name="${safeRawName}" data-file-mime="${safeMime}"><i class="fas fa-download"></i> ${t('Unduh', 'Download')}</button>
                    </div>
                </div>
            `;
        }

        return `
            <div class="announcement-file-item">
                <div class="announcement-file-header">
                    <span class="announcement-file-type-badge"><i class="fas ${typeInfo.icon}"></i> ${typeInfo.label}</span>
                    <span class="announcement-file-name">${safeName}</span>
                </div>
                <div class="announcement-attachment-actions">
                    <button type="button" class="btn secondary announcement-preview-btn" data-preview-src="${href}" data-preview-type="${type}" data-preview-title="${safeRawName}" data-preview-mime="${safeMime}"><i class="fas fa-up-right-and-down-left-from-center"></i> ${t('Pratinjau', 'Preview')}</button>
                    <button type="button" class="btn secondary announcement-open-tab-btn" data-file-src="${href}" data-file-mime="${safeMime}"><i class="fas fa-eye"></i> ${t('Lihat', 'View')}</button>
                    <button type="button" class="btn secondary announcement-download-btn" data-file-src="${href}" data-file-name="${safeRawName}" data-file-mime="${safeMime}"><i class="fas fa-download"></i> ${t('Unduh', 'Download')}</button>
                </div>
            </div>
        `;
    }).join('');
}

function getAnnouncementAttachmentType(mimeType, href) {
    const mime = String(mimeType || '').toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime === 'application/pdf') return 'pdf';
    if (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml') return 'text';

    const value = String(href || '').toLowerCase();
    if (value.startsWith('data:image/')) return 'image';
    if (value.startsWith('data:application/pdf')) return 'pdf';
    if (value.startsWith('data:text/')) return 'text';
    return 'file';
}

function getAnnouncementAttachmentTypeInfo(attachment) {
    const mime = String(attachment?.mimeType || '').toLowerCase();
    const fileName = String(attachment?.storedName || attachment?.name || '').toLowerCase();
    const ext = fileName.includes('.') ? fileName.split('.').pop() : '';

    if (mime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) {
        return { icon: 'fa-file-image', label: 'Gambar' };
    }
    if (mime === 'application/pdf' || ext === 'pdf') {
        return { icon: 'fa-file-pdf', label: 'PDF' };
    }
    if (
        mime.includes('word') || ['doc', 'docx'].includes(ext)
    ) {
        return { icon: 'fa-file-word', label: 'Word' };
    }
    if (
        mime.includes('sheet') || mime.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)
    ) {
        return { icon: 'fa-file-excel', label: 'Excel' };
    }
    if (
        mime.includes('presentation') || mime.includes('powerpoint') || ['ppt', 'pptx'].includes(ext)
    ) {
        return { icon: 'fa-file-powerpoint', label: 'PowerPoint' };
    }
    if (mime.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'log'].includes(ext)) {
        return { icon: 'fa-file-lines', label: 'Teks' };
    }

    return { icon: 'fa-file', label: (ext || 'File').toUpperCase() };
}

function openAnnouncementAttachmentPreviewModal(payload) {
    const src = String(payload?.src || '');
    const type = String(payload?.type || 'file');
    const title = String(payload?.title || t('lampiran', 'attachment'));
    const safeTitle = escapeHtml(title);
    const mimeType = String(payload?.mimeType || '');

    const content = (type === 'image')
        ? `<img src="${src}" alt="${safeTitle}" class="announcement-preview-image">`
        : `<iframe src="${src}" title="${t('Pratinjau', 'Preview')} ${safeTitle}" class="announcement-preview-frame"></iframe>`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay announcement-preview-modal';
    modal.innerHTML = `
        <div class="modal-content announcement-preview-content">
            <div class="modal-header">
                <h3><i class="fas fa-expand"></i> ${t('Pratinjau Lampiran', 'Attachment Preview')}</h3>
                <button type="button" class="modal-close" id="closeAnnouncementPreviewModal">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" id="openAnnouncementPreviewInNewTabBtn"><i class="fas fa-eye"></i> ${t('Buka Tab Baru', 'Open New Tab')}</button>
                <button type="button" class="btn secondary" id="downloadAnnouncementPreviewBtn"><i class="fas fa-download"></i> ${t('Unduh', 'Download')}</button>
                <button type="button" class="btn secondary" id="closeAnnouncementPreviewFooterBtn">${t('Tutup', 'Close')}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
        if (typeof closeOverlayModal === 'function') {
            closeOverlayModal(modal);
            return;
        }
        modal.remove();
    };

    modal.querySelector('#closeAnnouncementPreviewModal')?.addEventListener('click', close);
    modal.querySelector('#closeAnnouncementPreviewFooterBtn')?.addEventListener('click', close);
    modal.querySelector('#openAnnouncementPreviewInNewTabBtn')?.addEventListener('click', function() {
        openAnnouncementAttachmentInNewTab(src, mimeType);
    });
    modal.querySelector('#downloadAnnouncementPreviewBtn')?.addEventListener('click', function() {
        downloadAnnouncementAttachment(src, title, mimeType);
    });
    modal.addEventListener('click', (event) => {
        if (event.target === modal) close();
    });
}

function openAnnouncementAttachmentInNewTab(src, mimeType = '') {
    if (!src || src === '#') {
        notify(t('Lampiran tidak tersedia untuk dibuka.', 'Attachment is not available to open.'), 'warning');
        return;
    }

    if (!isDataUrl(src)) {
        window.open(src, '_blank', 'noopener,noreferrer');
        return;
    }

    const blobUrl = dataUrlToBlobUrl(src, mimeType);
    if (!blobUrl) {
        notify(t('Lampiran gagal dibuka di tab baru.', 'Failed to open attachment in a new tab.'), 'error');
        return;
    }

    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);
}

function downloadAnnouncementAttachment(src, fileName, mimeType = '') {
    if (!src || src === '#') {
        notify(t('Lampiran tidak tersedia untuk diunduh.', 'Attachment is not available for download.'), 'warning');
        return;
    }

    let href = src;
    let revokeUrl = null;

    if (isDataUrl(src)) {
        const blobUrl = dataUrlToBlobUrl(src, mimeType);
        if (!blobUrl) {
            notify(t('Lampiran gagal diunduh.', 'Failed to download attachment.'), 'error');
            return;
        }
        href = blobUrl;
        revokeUrl = blobUrl;
    }

    const a = document.createElement('a');
    a.href = href;
    a.download = fileName || 'lampiran';
    document.body.appendChild(a);
    a.click();
    a.remove();

    if (revokeUrl) {
        setTimeout(() => URL.revokeObjectURL(revokeUrl), 60 * 1000);
    }
}

function isDataUrl(value) {
    return String(value || '').startsWith('data:');
}

function dataUrlToBlobUrl(dataUrl, fallbackMimeType = '') {
    try {
        const parts = String(dataUrl || '').split(',');
        if (parts.length < 2) return null;

        const header = parts[0];
        const body = parts.slice(1).join(',');
        const mimeMatch = header.match(/^data:([^;]+)(;base64)?/i);
        const mimeType = (mimeMatch && mimeMatch[1]) ? mimeMatch[1] : (fallbackMimeType || 'application/octet-stream');
        const isBase64 = /;base64/i.test(header);

        let bytes;
        if (isBase64) {
            const binary = atob(body);
            bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i += 1) {
                bytes[i] = binary.charCodeAt(i);
            }
        } else {
            const text = decodeURIComponent(body);
            bytes = new TextEncoder().encode(text);
        }

        const blob = new Blob([bytes], { type: mimeType });
        return URL.createObjectURL(blob);
    } catch (error) {
        return null;
    }
}

function showUbahAnnouncementModal(announcementId) {
    const announcement = readAnnouncements().find((item) => Number(item.id) === Number(announcementId));
    if (!announcement) {
        notify(t('Data pengumuman tidak ditemukan.', 'Announcement data not found.'), 'warning');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 680px; width: min(680px, 96vw);">
            <div class="modal-header">
                <h3><i class="fas fa-pen"></i> ${t('Ubah Pengumuman Perusahaan', 'Ubah Company Announcement')}</h3>
                <button type="button" class="modal-close" id="closeUbahAnnouncementModal">&times;</button>
            </div>
            <div class="modal-body">
                <form id="editAnnouncementForm" class="elegant-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editAnnouncementTitle">${t('Judul Pengumuman *', 'Announcement Title *')}</label>
                            <input type="text" id="editAnnouncementTitle" required value="${escapeHtml(announcement.title || '')}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editAnnouncementCategory">${t('Kategori *', 'Category *')}</label>
                            <select id="editAnnouncementCategory" required>
                                <option value="Kebijakan" ${announcement.category === 'Kebijakan' ? 'selected' : ''}>${t('Kebijakan', 'Policy')}</option>
                                <option value="Acara" ${announcement.category === 'Acara' ? 'selected' : ''}>${t('Acara', 'Event')}</option>
                                <option value="Kesehatan" ${announcement.category === 'Kesehatan' ? 'selected' : ''}>${t('Kesehatan', 'Health')}</option>
                                <option value="Umum" ${announcement.category === 'Umum' ? 'selected' : ''}>${t('Umum', 'General')}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editAnnouncementDate">${t('Tanggal *', 'Date *')}</label>
                            <input type="date" id="editAnnouncementDate" required value="${escapeHtml(announcement.date || new Date().toISOString().split('T')[0])}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editAnnouncementPriority">${t('Prioritas', 'Priority')}</label>
                            <select id="editAnnouncementPriority">
                                <option value="Normal" ${announcement.priority === 'Normal' ? 'selected' : ''}>${t('Normal', 'Normal')}</option>
                                <option value="Penting" ${announcement.priority === 'Penting' ? 'selected' : ''}>${t('Penting', 'Important')}</option>
                                <option value="Mendesak" ${announcement.priority === 'Mendesak' ? 'selected' : ''}>${t('Mendesak', 'Urgent')}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editAnnouncementDivision">${t('Target Divisi', 'Target Division')}</label>
                            <select id="editAnnouncementDivision">
                                ${buildAnnouncementDivisionOptions(announcement.targetDivision || t('Semua Divisi', 'All Divisions'))}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editAnnouncementContent">${t('Isi Pengumuman *', 'Announcement Content *')}</label>
                            <textarea id="editAnnouncementContent" rows="5" required>${escapeHtml(announcement.content || '')}</textarea>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editAnnouncementAttachments">${t('Lampiran Baru (Opsional, max 5 file, max 2MB/file)', 'New Attachments (Optional, max 5 files, max 2MB/file)')}</label>
                            <input type="file" id="editAnnouncementAttachments" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt">
                            <small class="form-help">${t('Kosongkan jika ingin mempertahankan lampiran lama. Jika diisi, lampiran lama akan diganti.', 'Leave empty to keep old attachments. If filled, old attachments will be replaced.')}</small>
                            <div id="editAnnouncementAttachmentPreview" class="announcement-attachment-preview"></div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" id="cancelUbahAnnouncementBtn">${t('Batal', 'Cancel')}</button>
                <button type="submit" form="editAnnouncementForm" class="btn primary">${t('Simpan Perubahan', 'Save Changes')}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
        if (typeof closeOverlayModal === 'function') {
            closeOverlayModal(modal);
            return;
        }
        modal.remove();
    };
    modal.querySelector('#closeUbahAnnouncementModal')?.addEventListener('click', close);
    modal.querySelector('#cancelUbahAnnouncementBtn')?.addEventListener('click', close);
    modal.querySelector('#editAnnouncementAttachments')?.addEventListener('change', function(event) {
        updateAnnouncementAttachmentPreview(event, 'editAnnouncementAttachmentPreview');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    const oldAttachments = Array.isArray(announcement.attachments) ? announcement.attachments : [];
    const previewContainer = modal.querySelector('#editAnnouncementAttachmentPreview');
    if (previewContainer && oldAttachments.length) {
        previewContainer.innerHTML = oldAttachments.map(att => {
            const safeName = escapeHtml(att.storedName || att.name || 'lampiran');
            return `<div class="attachment-preview-chip"><i class="fas fa-paperclip"></i> ${t('Lampiran saat ini', 'Current attachment')}: ${safeName}</div>`;
        }).join('');
    }

    modal.querySelector('#editAnnouncementForm')?.addEventListener('submit', async function(event) {
        event.preventDefault();
        const saved = await saveUbahedAnnouncement(announcement.id);
        if (!saved) return;

        close();
        renderAdminAnnouncements();
        notify(t('Pengumuman berhasil diperbarui.', 'Announcement updated successfully.'), 'success');
    });
}

function showCreateAnnouncementModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 680px; width: min(680px, 96vw);">
            <div class="modal-header">
                <h3><i class="fas fa-bullhorn"></i> ${t('Buat Pengumuman Perusahaan', 'Create Company Announcement')}</h3>
                <button type="button" class="modal-close" id="closeAnnouncementModal">&times;</button>
            </div>
            <div class="modal-body">
                <form id="announcementForm" class="elegant-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="announcementTitle">${t('Judul Pengumuman *', 'Announcement Title *')}</label>
                            <input type="text" id="announcementTitle" required placeholder="${t('Contoh: Jadwal Maintenance Sistem', 'Example: System Maintenance Schedule')}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="announcementCategory">${t('Kategori *', 'Category *')}</label>
                            <select id="announcementCategory" required>
                                <option value="Kebijakan">${t('Kebijakan', 'Policy')}</option>
                                <option value="Acara">${t('Acara', 'Event')}</option>
                                <option value="Kesehatan">${t('Kesehatan', 'Health')}</option>
                                <option value="Umum">${t('Umum', 'General')}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="announcementDate">${t('Tanggal *', 'Date *')}</label>
                            <input type="date" id="announcementDate" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="announcementPriority">${t('Prioritas', 'Priority')}</label>
                            <select id="announcementPriority">
                                <option value="Normal">${t('Normal', 'Normal')}</option>
                                <option value="Penting">${t('Penting', 'Important')}</option>
                                <option value="Mendesak">${t('Mendesak', 'Urgent')}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="announcementDivision">${t('Target Divisi', 'Target Division')}</label>
                            <select id="announcementDivision">
                                ${buildAnnouncementDivisionOptions(t('Semua Divisi', 'All Divisions'))}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="announcementContent">${t('Isi Pengumuman *', 'Announcement Content *')}</label>
                            <textarea id="announcementContent" rows="5" required placeholder="${t('Tulis pengumuman dengan jelas dan ringkas...', 'Write a clear and concise announcement...')}"></textarea>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="announcementAttachments">${t('Lampiran (Opsional, max 5 file, masing-masing max 2MB)', 'Attachments (Optional, max 5 files, each max 2MB)')}</label>
                            <input type="file" id="announcementAttachments" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt">
                            <small class="form-help">${t('Gambar otomatis dikonversi ke WEBP. File non-gambar disimpan sesuai format asli.', 'Images are automatically converted to WEBP. Non-image files are saved in original format.')}</small>
                            <div id="announcementAttachmentPreview" class="announcement-attachment-preview"></div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" id="cancelAnnouncementBtn">${t('Batal', 'Cancel')}</button>
                <button type="submit" form="announcementForm" class="btn primary">${t('Simpan Pengumuman', 'Save Announcement')}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => {
        if (typeof closeOverlayModal === 'function') {
            closeOverlayModal(modal);
            return;
        }
        modal.remove();
    };

    modal.querySelector('#closeAnnouncementModal')?.addEventListener('click', close);
    modal.querySelector('#cancelAnnouncementBtn')?.addEventListener('click', close);
    modal.querySelector('#announcementAttachments')?.addEventListener('change', updateAnnouncementAttachmentPreview);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    modal.querySelector('#announcementForm')?.addEventListener('submit', async function(event) {
        event.preventDefault();
        const created = await createAnnouncementFromForm();
        if (!created) return;
        close();
    });
}

async function createAnnouncementFromForm() {
    const title = document.getElementById('announcementTitle')?.value.trim();
    const category = document.getElementById('announcementCategory')?.value;
    const date = document.getElementById('announcementDate')?.value;
    const content = document.getElementById('announcementContent')?.value.trim();
    const priority = document.getElementById('announcementPriority')?.value || 'Normal';
    const targetDivision = document.getElementById('announcementDivision')?.value || t('Semua Divisi', 'All Divisions');
    const attachmentFiles = Array.from(document.getElementById('announcementAttachments')?.files || []);

    if (!title || !category || !date || !content) {
        notify(t('Semua field bertanda * wajib diisi.', 'All fields marked * are required.'), 'warning');
        return false;
    }

    if (attachmentFiles.length > ANNOUNCEMENT_MAX_ATTACHMENTS) {
        notify(t(`Maksimal ${ANNOUNCEMENT_MAX_ATTACHMENTS} lampiran per pengumuman.`, `Maximum ${ANNOUNCEMENT_MAX_ATTACHMENTS} attachments per announcement.`), 'warning');
        return false;
    }

    let attachments = [];
    try {
        attachments = await processAnnouncementAttachments(attachmentFiles);
    } catch (error) {
        notify(error?.message || t('Gagal memproses lampiran pengumuman.', 'Failed to process announcement attachments.'), 'error');
        return false;
    }

    const next = {
        id: Date.now(),
        title,
        category,
        date,
        content,
        priority,
        targetDivision,
        author: currentUser?.name || t('Admin', 'Admin'),
        attachments
    };

    try {
        if (typeof apiRequest === 'function') {
            await apiRequest('/api/announcements', {
                method: 'POST',
                body: {
                    title,
                    category,
                    content,
                    publish_date: date,
                    priority,
                    target_division: targetDivision,
                    attachments: attachments.map((att) => ({
                        name: att.name,
                        stored_name: att.storedName,
                        mime_type: att.mimeType,
                        size_bytes: att.sizeBytes,
                        data_url: att.dataUrl,
                        converted_to_webp: att.convertedToWebp,
                    })),
                },
            });
            if (typeof window.syncAnnouncementsFromApi === 'function') {
                await window.syncAnnouncementsFromApi().catch(() => {});
            }
        } else {
            const announcements = readAnnouncements();
            announcements.push(next);
            localStorage.setItem('announcements', JSON.stringify(announcements));
        }

        renderAdminAnnouncements();
        notify(t('Pengumuman perusahaan berhasil dibuat.', 'Company announcement created successfully.'), 'success');
        return true;
    } catch (error) {
        notify(error?.message || t('Gagal membuat pengumuman.', 'Failed to create announcement.'), 'error');
        return false;
    }
}

function updateAnnouncementAttachmentPreview(event, previewId = 'announcementAttachmentPreview') {
    const files = Array.from(event?.target?.files || []);
    const preview = document.getElementById(previewId);
    if (!preview) return;

    if (!files.length) {
        preview.innerHTML = '';
        return;
    }

    preview.innerHTML = files.map(file => {
        const isImage = String(file.type || '').startsWith('image/');
        return `<div class="attachment-preview-chip"><i class="fas ${isImage ? 'fa-image' : 'fa-file'}"></i> ${escapeHtml(file.name)} (${formatBytes(file.size)})</div>`;
    }).join('');
}

async function saveUbahedAnnouncement(announcementId) {
    const title = document.getElementById('editAnnouncementTitle')?.value.trim();
    const category = document.getElementById('editAnnouncementCategory')?.value;
    const date = document.getElementById('editAnnouncementDate')?.value;
    const content = document.getElementById('editAnnouncementContent')?.value.trim();
    const priority = document.getElementById('editAnnouncementPriority')?.value || 'Normal';
    const targetDivision = document.getElementById('editAnnouncementDivision')?.value || t('Semua Divisi', 'All Divisions');
    const attachmentFiles = Array.from(document.getElementById('editAnnouncementAttachments')?.files || []);

    if (!title || !category || !date || !content) {
        notify(t('Semua field bertanda * wajib diisi.', 'All fields marked * are required.'), 'warning');
        return false;
    }

    if (attachmentFiles.length > ANNOUNCEMENT_MAX_ATTACHMENTS) {
        notify(t(`Maksimal ${ANNOUNCEMENT_MAX_ATTACHMENTS} lampiran per pengumuman.`, `Maximum ${ANNOUNCEMENT_MAX_ATTACHMENTS} attachments per announcement.`), 'warning');
        return false;
    }

    const announcements = readAnnouncements();
    const index = announcements.findIndex((item) => Number(item.id) === Number(announcementId));
    if (index === -1) {
        notify(t('Pengumuman tidak ditemukan.', 'Announcement not found.'), 'warning');
        return false;
    }

    let attachments = Array.isArray(announcements[index].attachments) ? announcements[index].attachments : [];
    if (attachmentFiles.length) {
        try {
            attachments = await processAnnouncementAttachments(attachmentFiles);
        } catch (error) {
            notify(error?.message || t('Gagal memproses lampiran pengumuman.', 'Failed to process announcement attachments.'), 'error');
            return false;
        }
    }

    try {
        if (typeof apiRequest === 'function') {
            await apiRequest(`/api/announcements/${Number(announcementId)}`, {
                method: 'PUT',
                body: {
                    title,
                    category,
                    content,
                    publish_date: date,
                    priority,
                    target_division: targetDivision,
                    attachments: attachments.map((att) => ({
                        name: att.name,
                        stored_name: att.storedName,
                        mime_type: att.mimeType,
                        size_bytes: att.sizeBytes,
                        data_url: att.dataUrl,
                        converted_to_webp: att.convertedToWebp,
                    })),
                },
            });
            if (typeof window.syncAnnouncementsFromApi === 'function') {
                await window.syncAnnouncementsFromApi().catch(() => {});
            }
        } else {
            announcements[index] = {
                ...announcements[index],
                title,
                category,
                date,
                content,
                priority,
                targetDivision,
                attachments,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('announcements', JSON.stringify(announcements));
        }

        return true;
    } catch (error) {
        notify(error?.message || t('Gagal memperbarui pengumuman.', 'Failed to update announcement.'), 'error');
        return false;
    }
}

async function processAnnouncementAttachments(files) {
    const output = [];

    for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        if (!file) continue;

        if (file.size > ANNOUNCEMENT_MAX_ATTACHMENT_BYTES) {
            throw new Error(isEnLang() ? `File ${file.name} exceeds the 2MB limit.` : `File ${file.name} melebihi batas 2MB.`);
        }

        const isImage = String(file.type || '').startsWith('image/');
        if (isImage) {
            const converted = await convertImageFileToWebp(file, ANNOUNCEMENT_MAX_ATTACHMENT_BYTES);
            if (!converted) {
                throw new Error(isEnLang() ? `Image ${file.name} failed to convert to WEBP under 2MB.` : `Gambar ${file.name} gagal dikonversi ke WEBP di bawah 2MB.`);
            }

            output.push({
                id: `${Date.now()}-${index}`,
                name: file.name,
                storedName: `${stripFileExtension(file.name)}.webp`,
                mimeType: 'image/webp',
                sizeBytes: converted.sizeBytes,
                dataUrl: converted.dataUrl,
                convertedToWebp: true
            });
            continue;
        }

        const dataUrl = await readFileAsDataUrl(file);
        output.push({
            id: `${Date.now()}-${index}`,
            name: file.name,
            storedName: file.name,
            mimeType: file.type || 'application/octet-stream',
            sizeBytes: file.size,
            dataUrl,
            convertedToWebp: false
        });
    }

    return output;
}

function stripFileExtension(fileName) {
    const name = String(fileName || 'lampiran').trim();
    const dot = name.lastIndexOf('.');
    if (dot <= 0) return name;
    return name.slice(0, dot);
}

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(t('Gagal membaca file lampiran.', 'Failed to read attachment file.')));
        reader.readAsDataURL(file);
    });
}

function loadImageElement(file) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const image = new Image();
        image.onload = () => {
            URL.revokeObjectURL(url);
            resolve(image);
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error(t('Gagal memuat gambar lampiran.', 'Failed to load attachment image.')));
        };
        image.src = url;
    });
}

function canvasToWebpBlob(canvas, quality) {
    return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/webp', quality);
    });
}

async function convertImageFileToWebp(file, maxBytes) {
    const image = await loadImageElement(file);
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error(t('Canvas tidak tersedia untuk konversi gambar.', 'Canvas is not available for image conversion.'));
    }

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const qualitySteps = [0.92, 0.84, 0.76, 0.68, 0.58, 0.5, 0.42, 0.34, 0.28];
    for (let i = 0; i < qualitySteps.length; i += 1) {
        const blob = await canvasToWebpBlob(canvas, qualitySteps[i]);
        if (!blob) continue;
        if (blob.size <= maxBytes) {
            const dataUrl = await readFileAsDataUrl(blob);
            return { dataUrl, sizeBytes: blob.size };
        }
    }

    return null;
}

function formatBytes(bytes) {
    const size = Number(bytes) || 0;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function getAnnouncementDivisionValues() {
    const dynamic = (Array.isArray(employees) ? employees : [])
        .map(emp => String(emp.department || emp.division || emp.divisi || '').trim())
        .filter(Boolean);

    const values = [];
    const seen = new Set();

    const pushUnique = (value) => {
        const key = String(value || '').trim();
        if (!key || seen.has(key.toLowerCase())) return;
        seen.add(key.toLowerCase());
        values.push(key);
    };

    USER_PROFILE_DEPARTMENTS.forEach(pushUnique);
    dynamic.forEach(pushUnique);

    return values;
}

function buildAnnouncementDivisionOptions(selectedDivision) {
    const selected = String(selectedDivision || 'Semua Divisi');
    const options = ['Semua Divisi', ...getAnnouncementDivisionValues()];

    if (selected && !options.some(option => option.toLowerCase() === selected.toLowerCase())) {
        options.push(selected);
    }

    return options.map(option => {
        const isSelected = option.toLowerCase() === selected.toLowerCase();
        const safeOption = escapeHtml(option);
        return `<option value="${safeOption}" ${isSelected ? 'selected' : ''}>${safeOption}</option>`;
    }).join('');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getCategoryIcon(category) {
    const value = String(category || '').toLowerCase();
    if (value === 'kebijakan' || value === 'policy') return '<i class="fas fa-file-lines" aria-hidden="true"></i>';
    if (value === 'acara' || value === 'event') return '<i class="fas fa-calendar-check" aria-hidden="true"></i>';
    if (value === 'kesehatan' || value === 'health') return '<i class="fas fa-heart-pulse" aria-hidden="true"></i>';
    return '<i class="fas fa-bullhorn" aria-hidden="true"></i>';
}

function getCategoryClass(category) {
    const value = String(category || '').toLowerCase();
    if (value === 'kebijakan' || value === 'policy') return 'policy';
    if (value === 'acara' || value === 'event') return 'event';
    if (value === 'kesehatan' || value === 'health') return 'health';
    return 'general';
}

function getPriorityWeight(priority) {
    const value = String(priority || '').toLowerCase();
    if (value === 'mendesak') return 3;
    if (value === 'penting') return 2;
    return 1;
}

function getSortedAnnouncementsForDisplay(list) {
    return (Array.isArray(list) ? [...list] : [])
        .sort((a, b) => {
            const aDate = new Date(a?.date || 0);
            const bDate = new Date(b?.date || 0);
            const dateDiff = bDate - aDate;
            if (dateDiff !== 0) return dateDiff;

            const priorityDiff = getPriorityWeight(b?.priority) - getPriorityWeight(a?.priority);
            if (priorityDiff !== 0) return priorityDiff;

            return Number(b?.id || 0) - Number(a?.id || 0);
        });
}

function formatAnnouncementDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}
