let adminAttendanceChart = null;
const dashboardSliderState = {
    announcementsStart: 0,
    clockinsStart: 0,
    kpiStart: 0
};

const ANNOUNCEMENT_MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;
const ANNOUNCEMENT_MAX_ATTACHMENTS = 5;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '../index.html';
        return;
    }

    updateUserDisplay();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => logout(e));
    }

    const pageDate = document.querySelector('.page-date');
    if (pageDate) {
        const today = new Date();
        pageDate.textContent = `Ringkasan real-time status tenaga kerja per ${today.toLocaleDateString('id-ID', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }

    setupSidebarNav();
    loadPresensiData();
    loadDashboardData();
    setupDashboardSliders();
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
        notify('Laporan ringkasan sedang disiapkan.', 'info');
    });
});

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

function loadDashboardData() {
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

function getDashboardSliderViewSize(section) {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) return 1;
    if (section === 'clockins') return 3;
    if (section === 'announcements') return 3;
    return 3;
}

function setupDashboardSliders() {
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
            shiftDashboardSlider('kpi', -1);
        });

        document.getElementById('kpiNextBtn')?.addEventListener('click', function() {
            shiftDashboardSlider('kpi', 1);
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
            shiftDashboardSlider('clockins', -getDashboardSliderViewSize('clockins'));
        });
        document.getElementById('clockinsNextBtn')?.addEventListener('click', function() {
            shiftDashboardSlider('clockins', getDashboardSliderViewSize('clockins'));
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
            shiftDashboardSlider('announcements', -getDashboardSliderViewSize('announcements'));
        });
        document.getElementById('announcementsNextBtn')?.addEventListener('click', function() {
            shiftDashboardSlider('announcements', getDashboardSliderViewSize('announcements'));
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

function shiftDashboardSlider(section, delta) {
    if (section === 'kpi') {
        const cards = Array.from(document.querySelectorAll('.attendance-section .kpi-cards .kpi-card'));
        const maxStart = Math.max(0, cards.length - 1);
        dashboardSliderState.kpiStart = Math.min(maxStart, Math.max(0, dashboardSliderState.kpiStart + delta));
        renderKpiCards();
        return;
    }

    if (section === 'clockins') {
        const records = getRecentClockinRecords();
        const viewSize = getDashboardSliderViewSize('clockins');
        dashboardSliderState.clockinsStart = shiftPagedSliderStart(records.length, viewSize, dashboardSliderState.clockinsStart, delta);
        renderRecentClockins();
        return;
    }

    if (section === 'announcements') {
        const records = readAnnouncements().slice().reverse();
        const viewSize = getDashboardSliderViewSize('announcements');
        dashboardSliderState.announcementsStart = shiftPagedSliderStart(records.length, viewSize, dashboardSliderState.announcementsStart, delta);
        renderAdminAnnouncements();
    }
}

function getRecentClockinRecords() {
    const list = (Array.isArray(presensiData) ? presensiData : [])
        .filter(record => normalizeType(record.type) === 'checkin')
        .sort((a, b) => new Date(b.timestamp || `${b.date}T${b.time || '00:00'}`) - new Date(a.timestamp || `${a.date}T${a.time || '00:00'}`));

    return list.map(record => {
        const fullName = record.employeeName || record.username || 'Karyawan';
        const initials = fullName.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'KR';
        const workLocation = record.workLocation || '-';
        const timeText = record.time || (record.timestamp ? new Date(record.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-');

        return {
            initials,
            fullName,
            locationLabel: `Presensi Masuk - ${workLocation}`,
            timeText
        };
    });
}

function renderRecentClockins() {
    const listContainer = document.querySelector('.clock-ins-list');
    if (!listContainer) return;

    const records = getRecentClockinRecords();
    const viewSize = getDashboardSliderViewSize('clockins');
    const pagination = getPagedSliderMeta(records.length, viewSize, dashboardSliderState.clockinsStart);
    dashboardSliderState.clockinsStart = pagination.startIndex;

    const visible = records.slice(pagination.startIndex, pagination.startIndex + viewSize);

    listContainer.innerHTML = visible.length
        ? visible.map((item, index) => `
            <div class="clock-in-item dashboard-slide-item" style="--slide-index:${index};">
                <div class="clock-in-avatar">${item.initials}</div>
                <div class="clock-in-details">
                    <div class="clock-in-name">${item.fullName}</div>
                    <div class="clock-in-location">${item.locationLabel}</div>
                </div>
                <div class="clock-in-time">${item.timeText}</div>
            </div>
        `).join('')
        : '<div class="clock-in-item"><div class="clock-in-details"><div class="clock-in-name">Belum ada presensi terbaru</div></div></div>';

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
        const departments = Array.from(new Set((Array.isArray(employees) ? employees : [])
            .map(emp => String(emp.department || '').trim())
            .filter(Boolean)));

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
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.14)',
                tension: 0.35,
                fill: true,
                pointBackgroundColor: '#10b981',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 4
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
        const defaults = getDefaultAnnouncements();
        localStorage.setItem('announcements', JSON.stringify(defaults));
        return defaults;
    }

    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length === 0) {
            const defaults = getDefaultAnnouncements();
            localStorage.setItem('announcements', JSON.stringify(defaults));
            return defaults;
        }
        return parsed;
    } catch (error) {
        const defaults = getDefaultAnnouncements();
        localStorage.setItem('announcements', JSON.stringify(defaults));
        return defaults;
    }
}

function renderAdminAnnouncements() {
    const grid = document.querySelector('.announcements-grid');
    if (!grid) return;

    const items = readAnnouncements().slice().reverse();
    const viewSize = getDashboardSliderViewSize('announcements');
    const pagination = getPagedSliderMeta(items.length, viewSize, dashboardSliderState.announcementsStart);
    dashboardSliderState.announcementsStart = pagination.startIndex;

    const visible = items.slice(
        pagination.startIndex,
        pagination.startIndex + viewSize
    );

    grid.innerHTML = visible.map((ann, index) => {
        const categoryClass = String(ann.category || 'umum').toLowerCase().replace(/\s+/g, '');
        const categoryIcon = getCategoryIcon(ann.category);
        const attachmentsCount = Array.isArray(ann.attachments) ? ann.attachments.length : 0;
        return `
            <button type="button" class="announcement-item dashboard-slide-item announcement-clickable" data-announcement-id="${ann.id}" style="--slide-index:${index};">
                <div class="announcement-badge ${categoryClass}">${categoryIcon} ${ann.category || 'Umum'}</div>
                <div class="announcement-date">${formatAnnouncementDate(ann.date || new Date().toISOString().split('T')[0])}</div>
                <h3>${escapeHtml(ann.title || 'Pengumuman')}</h3>
                <p>${escapeHtml(ann.content || '-')}</p>
                ${attachmentsCount > 0 ? `<small class="announcement-attachment-hint"><i class="fas fa-paperclip"></i> ${attachmentsCount} lampiran</small>` : ''}
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
        notify('Detail pengumuman tidak ditemukan.', 'warning');
        return;
    }

    const attachments = Array.isArray(announcement.attachments) ? announcement.attachments : [];
    const attachmentMarkup = attachments.length
        ? `
            <div class="announcement-detail-section">
                <h4><i class="fas fa-paperclip"></i> Lampiran</h4>
                <div class="announcement-attachment-list">
                    ${attachments.map(att => {
                        const safeName = escapeHtml(att.storedName || att.name || 'lampiran');
                        const href = String(att.dataUrl || '#');
                        const isImage = String(att.mimeType || '').startsWith('image/');

                        if (isImage) {
                            return `
                                <div class="announcement-image-item">
                                    <img src="${href}" alt="${safeName}">
                                    <a class="btn secondary" href="${href}" download="${safeName}"><i class="fas fa-download"></i> Unduh ${safeName}</a>
                                </div>
                            `;
                        }

                        return `
                            <a class="announcement-file-link" href="${href}" download="${safeName}">
                                <i class="fas fa-file-arrow-down"></i>
                                <span>${safeName}</span>
                            </a>
                        `;
                    }).join('')}
                </div>
            </div>
        `
        : '<p class="announcement-detail-empty">Tidak ada lampiran.</p>';

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 760px; width: min(760px, 96vw);">
            <div class="modal-header">
                <h3><i class="fas fa-bullhorn"></i> Detail Pengumuman</h3>
                <button type="button" class="modal-close" id="closeAnnouncementDetailModal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="announcement-detail-meta">
                    <span class="announcement-badge">${getCategoryIcon(announcement.category)} ${escapeHtml(announcement.category || 'Umum')}</span>
                    <span>${formatAnnouncementDate(announcement.date || new Date().toISOString().split('T')[0])}</span>
                    <span>Prioritas: ${escapeHtml(announcement.priority || 'Normal')}</span>
                    <span>Divisi: ${escapeHtml(announcement.targetDivision || 'Semua Divisi')}</span>
                </div>
                <h2 class="announcement-detail-title">${escapeHtml(announcement.title || 'Pengumuman')}</h2>
                <p class="announcement-detail-content">${escapeHtml(announcement.content || '-').replace(/\n/g, '<br>')}</p>
                ${attachmentMarkup}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" id="editAnnouncementFromDetailBtn"><i class="fas fa-pen"></i> Edit</button>
                <button type="button" class="btn btn-danger" id="deleteAnnouncementFromDetailBtn"><i class="fas fa-trash"></i> Hapus</button>
                <button type="button" class="btn secondary" id="closeAnnouncementDetailFooterBtn">Tutup</button>
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
        showEditAnnouncementModal(announcement.id);
    });
    modal.querySelector('#deleteAnnouncementFromDetailBtn')?.addEventListener('click', async function() {
        const ok = await askAppConfirm({
            title: 'Hapus Pengumuman?',
            message: 'Pengumuman ini akan dihapus permanen dan tidak dapat dikembalikan.',
            confirmText: 'Ya, Hapus',
            cancelText: 'Batal',
            variant: 'danger'
        });
        if (!ok) return;

        const announcements = readAnnouncements().filter((item) => Number(item.id) !== Number(announcement.id));
        localStorage.setItem('announcements', JSON.stringify(announcements));
        close();
        renderAdminAnnouncements();
        notify('Pengumuman berhasil dihapus.', 'success');
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });
}

function showEditAnnouncementModal(announcementId) {
    const announcement = readAnnouncements().find((item) => Number(item.id) === Number(announcementId));
    if (!announcement) {
        notify('Data pengumuman tidak ditemukan.', 'warning');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 680px; width: min(680px, 96vw);">
            <div class="modal-header">
                <h3><i class="fas fa-pen"></i> Edit Pengumuman Perusahaan</h3>
                <button type="button" class="modal-close" id="closeEditAnnouncementModal">&times;</button>
            </div>
            <div class="modal-body">
                <form id="editAnnouncementForm" class="elegant-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editAnnouncementTitle">Judul Pengumuman *</label>
                            <input type="text" id="editAnnouncementTitle" required value="${escapeHtml(announcement.title || '')}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editAnnouncementCategory">Kategori *</label>
                            <select id="editAnnouncementCategory" required>
                                <option value="Kebijakan" ${announcement.category === 'Kebijakan' ? 'selected' : ''}>Kebijakan</option>
                                <option value="Acara" ${announcement.category === 'Acara' ? 'selected' : ''}>Acara</option>
                                <option value="Kesehatan" ${announcement.category === 'Kesehatan' ? 'selected' : ''}>Kesehatan</option>
                                <option value="Umum" ${announcement.category === 'Umum' ? 'selected' : ''}>Umum</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editAnnouncementDate">Tanggal *</label>
                            <input type="date" id="editAnnouncementDate" required value="${escapeHtml(announcement.date || new Date().toISOString().split('T')[0])}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editAnnouncementPriority">Prioritas</label>
                            <select id="editAnnouncementPriority">
                                <option value="Normal" ${announcement.priority === 'Normal' ? 'selected' : ''}>Normal</option>
                                <option value="Penting" ${announcement.priority === 'Penting' ? 'selected' : ''}>Penting</option>
                                <option value="Mendesak" ${announcement.priority === 'Mendesak' ? 'selected' : ''}>Mendesak</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editAnnouncementDivision">Target Divisi</label>
                            <select id="editAnnouncementDivision">
                                <option value="Semua Divisi" ${announcement.targetDivision === 'Semua Divisi' ? 'selected' : ''}>Semua Divisi</option>
                                ${Array.from(new Set((Array.isArray(employees) ? employees : []).map(emp => String(emp.department || '').trim()).filter(Boolean)))
                                    .map(dept => `<option value="${dept}" ${announcement.targetDivision === dept ? 'selected' : ''}>${dept}</option>`)
                                    .join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editAnnouncementContent">Isi Pengumuman *</label>
                            <textarea id="editAnnouncementContent" rows="5" required>${escapeHtml(announcement.content || '')}</textarea>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editAnnouncementAttachments">Lampiran Baru (Opsional, max 5 file, max 2MB/file)</label>
                            <input type="file" id="editAnnouncementAttachments" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt">
                            <small class="form-help">Kosongkan jika ingin mempertahankan lampiran lama. Jika diisi, lampiran lama akan diganti.</small>
                            <div id="editAnnouncementAttachmentPreview" class="announcement-attachment-preview"></div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" id="cancelEditAnnouncementBtn">Batal</button>
                <button type="submit" form="editAnnouncementForm" class="btn primary">Simpan Perubahan</button>
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
    modal.querySelector('#closeEditAnnouncementModal')?.addEventListener('click', close);
    modal.querySelector('#cancelEditAnnouncementBtn')?.addEventListener('click', close);
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
            return `<div class="attachment-preview-chip"><i class="fas fa-paperclip"></i> Lampiran saat ini: ${safeName}</div>`;
        }).join('');
    }

    modal.querySelector('#editAnnouncementForm')?.addEventListener('submit', async function(event) {
        event.preventDefault();
        const saved = await saveEditedAnnouncement(announcement.id);
        if (!saved) return;

        close();
        renderAdminAnnouncements();
        notify('Pengumuman berhasil diperbarui.', 'success');
    });
}

function showCreateAnnouncementModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 680px; width: min(680px, 96vw);">
            <div class="modal-header">
                <h3><i class="fas fa-bullhorn"></i> Buat Pengumuman Perusahaan</h3>
                <button type="button" class="modal-close" id="closeAnnouncementModal">&times;</button>
            </div>
            <div class="modal-body">
                <form id="announcementForm" class="elegant-form">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="announcementTitle">Judul Pengumuman *</label>
                            <input type="text" id="announcementTitle" required placeholder="Contoh: Jadwal Maintenance Sistem">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="announcementCategory">Kategori *</label>
                            <select id="announcementCategory" required>
                                <option value="Kebijakan">Kebijakan</option>
                                <option value="Acara">Acara</option>
                                <option value="Kesehatan">Kesehatan</option>
                                <option value="Umum">Umum</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="announcementDate">Tanggal *</label>
                            <input type="date" id="announcementDate" required value="${new Date().toISOString().split('T')[0]}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="announcementPriority">Prioritas</label>
                            <select id="announcementPriority">
                                <option value="Normal">Normal</option>
                                <option value="Penting">Penting</option>
                                <option value="Mendesak">Mendesak</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="announcementDivision">Target Divisi</label>
                            <select id="announcementDivision">
                                <option value="Semua Divisi">Semua Divisi</option>
                                ${Array.from(new Set((Array.isArray(employees) ? employees : []).map(emp => String(emp.department || '').trim()).filter(Boolean)))
                                    .map(dept => `<option value="${dept}">${dept}</option>`)
                                    .join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="announcementContent">Isi Pengumuman *</label>
                            <textarea id="announcementContent" rows="5" required placeholder="Tulis pengumuman dengan jelas dan ringkas..."></textarea>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="announcementAttachments">Lampiran (Opsional, max 5 file, masing-masing max 2MB)</label>
                            <input type="file" id="announcementAttachments" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt">
                            <small class="form-help">Gambar otomatis dikonversi ke WEBP. File non-gambar disimpan sesuai format asli.</small>
                            <div id="announcementAttachmentPreview" class="announcement-attachment-preview"></div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" id="cancelAnnouncementBtn">Batal</button>
                <button type="submit" form="announcementForm" class="btn primary">Simpan Pengumuman</button>
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
    const targetDivision = document.getElementById('announcementDivision')?.value || 'Semua Divisi';
    const attachmentFiles = Array.from(document.getElementById('announcementAttachments')?.files || []);

    if (!title || !category || !date || !content) {
        notify('Semua field bertanda * wajib diisi.', 'warning');
        return false;
    }

    if (attachmentFiles.length > ANNOUNCEMENT_MAX_ATTACHMENTS) {
        notify(`Maksimal ${ANNOUNCEMENT_MAX_ATTACHMENTS} lampiran per pengumuman.`, 'warning');
        return false;
    }

    let attachments = [];
    try {
        attachments = await processAnnouncementAttachments(attachmentFiles);
    } catch (error) {
        notify(error?.message || 'Gagal memproses lampiran pengumuman.', 'error');
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
        author: currentUser?.name || 'Admin',
        attachments
    };

    const announcements = readAnnouncements();
    announcements.push(next);
    localStorage.setItem('announcements', JSON.stringify(announcements));

    renderAdminAnnouncements();
    notify('Pengumuman perusahaan berhasil dibuat.', 'success');
    return true;
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

async function saveEditedAnnouncement(announcementId) {
    const title = document.getElementById('editAnnouncementTitle')?.value.trim();
    const category = document.getElementById('editAnnouncementCategory')?.value;
    const date = document.getElementById('editAnnouncementDate')?.value;
    const content = document.getElementById('editAnnouncementContent')?.value.trim();
    const priority = document.getElementById('editAnnouncementPriority')?.value || 'Normal';
    const targetDivision = document.getElementById('editAnnouncementDivision')?.value || 'Semua Divisi';
    const attachmentFiles = Array.from(document.getElementById('editAnnouncementAttachments')?.files || []);

    if (!title || !category || !date || !content) {
        notify('Semua field bertanda * wajib diisi.', 'warning');
        return false;
    }

    if (attachmentFiles.length > ANNOUNCEMENT_MAX_ATTACHMENTS) {
        notify(`Maksimal ${ANNOUNCEMENT_MAX_ATTACHMENTS} lampiran per pengumuman.`, 'warning');
        return false;
    }

    const announcements = readAnnouncements();
    const index = announcements.findIndex((item) => Number(item.id) === Number(announcementId));
    if (index === -1) {
        notify('Pengumuman tidak ditemukan.', 'warning');
        return false;
    }

    let attachments = Array.isArray(announcements[index].attachments) ? announcements[index].attachments : [];
    if (attachmentFiles.length) {
        try {
            attachments = await processAnnouncementAttachments(attachmentFiles);
        } catch (error) {
            notify(error?.message || 'Gagal memproses lampiran pengumuman.', 'error');
            return false;
        }
    }

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
    return true;
}

async function processAnnouncementAttachments(files) {
    const output = [];

    for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        if (!file) continue;

        if (file.size > ANNOUNCEMENT_MAX_ATTACHMENT_BYTES) {
            throw new Error(`File ${file.name} melebihi batas 2MB.`);
        }

        const isImage = String(file.type || '').startsWith('image/');
        if (isImage) {
            const converted = await convertImageFileToWebp(file, ANNOUNCEMENT_MAX_ATTACHMENT_BYTES);
            if (!converted) {
                throw new Error(`Gambar ${file.name} gagal dikonversi ke WEBP di bawah 2MB.`);
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
        reader.onerror = () => reject(new Error('Gagal membaca file lampiran.'));
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
            reject(new Error('Gagal memuat gambar lampiran.'));
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
        throw new Error('Canvas tidak tersedia untuk konversi gambar.');
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

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getCategoryIcon(category) {
    const icons = {
        Kebijakan: '📋',
        Acara: '🎉',
        Kesehatan: '💚',
        Umum: '📢'
    };

    return icons[category] || '📢';
}

function formatAnnouncementDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
