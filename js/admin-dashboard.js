let adminAttendanceChart = null;

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
    initializeAttendanceFilters();
    renderAdminAttendanceChart();
    renderAdminAnnouncements();

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

    const items = readAnnouncements().slice(-3).reverse();

    grid.innerHTML = items.map(ann => {
        const categoryClass = String(ann.category || 'umum').toLowerCase().replace(/\s+/g, '');
        const categoryIcon = getCategoryIcon(ann.category);
        return `
            <div class="announcement-item">
                <div class="announcement-badge ${categoryClass}">${categoryIcon} ${ann.category || 'Umum'}</div>
                <div class="announcement-date">${formatAnnouncementDate(ann.date || new Date().toISOString().split('T')[0])}</div>
                <h3>${ann.title || 'Pengumuman'}</h3>
                <p>${ann.content || '-'}</p>
            </div>
        `;
    }).join('');
}

function showCreateAnnouncementModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 680px; width: min(680px, 96vw); margin: 2% auto;">
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
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" id="cancelAnnouncementBtn">Batal</button>
                <button type="submit" form="announcementForm" class="btn primary">Simpan Pengumuman</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const close = () => modal.remove();

    modal.querySelector('#closeAnnouncementModal')?.addEventListener('click', close);
    modal.querySelector('#cancelAnnouncementBtn')?.addEventListener('click', close);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });

    modal.querySelector('#announcementForm')?.addEventListener('submit', function(event) {
        event.preventDefault();
        createAnnouncementFromForm();
        close();
    });
}

function createAnnouncementFromForm() {
    const title = document.getElementById('announcementTitle')?.value.trim();
    const category = document.getElementById('announcementCategory')?.value;
    const date = document.getElementById('announcementDate')?.value;
    const content = document.getElementById('announcementContent')?.value.trim();
    const priority = document.getElementById('announcementPriority')?.value || 'Normal';
    const targetDivision = document.getElementById('announcementDivision')?.value || 'Semua Divisi';

    if (!title || !category || !date || !content) {
        notify('Semua field bertanda * wajib diisi.', 'warning');
        return;
    }

    const next = {
        id: Date.now(),
        title,
        category,
        date,
        content,
        priority,
        targetDivision,
        author: currentUser?.name || 'Admin'
    };

    const announcements = readAnnouncements();
    announcements.push(next);
    localStorage.setItem('announcements', JSON.stringify(announcements));

    renderAdminAnnouncements();
    notify('Pengumuman perusahaan berhasil dibuat.', 'success');
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
