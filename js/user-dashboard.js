// ==================== USER DASHBOARD ====================
const userDashboardSliderState = {
    activityStart: 0,
    announcementsStart: 0,
    recentActivities: [],
    announcements: []
};

document.addEventListener('DOMContentLoaded', function() {
    initializeUserDashboard();
});

function initializeUserDashboard() {
    updateDateTime();
    loadUserData();
    setupUserDashboardSliders();
    loadRecentActivity();
    loadAttendanceStatus();
    loadAnnouncements();
    updateLeaveBalanceSummary();
    showFlashNotification();

    window.addEventListener('resize', function() {
        renderRecentActivitySlider();
        renderAnnouncementsSlider();
    });
    
    // Update time every minute
    setInterval(updateDateTime, 60000);
}

function showFlashNotification() {
    const raw = localStorage.getItem('flashNotification');
    if (!raw) return;

    localStorage.removeItem('flashNotification');

    try {
        const payload = JSON.parse(raw);
        if (!payload || !payload.message) return;

        if (typeof notify === 'function') {
            notify(payload.message, payload.type || 'info');
        } else {
            alert(payload.message);
        }
    } catch (error) {
        // Ignore invalid notification payload.
    }
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('id-ID', options);
}

function loadUserData() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
    }
}

function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    
    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = presensiData.filter(p => 
        p.employeeId === currentUser.id && 
        p.date.startsWith(today)
    );
    
    // Get recent leaves
    const recentLeaves = leaves.filter(l => 
        l.employeeId === currentUser.id
    ).slice(-3);
    
    let activities = [];
    
    // Add attendance activities
    todayAttendance.forEach(attendance => {
        activities.push({
            type: 'attendance',
            time: attendance.timestamp,
            description: `${attendance.type === 'checkin' ? 'Check-in' : 'Check-out'} pada ${new Date(attendance.timestamp).toLocaleTimeString('id-ID')}`,
            icon: attendance.type === 'checkin' ? 'fas fa-sign-in-alt' : 'fas fa-sign-out-alt'
        });
    });
    
    // Add leave activities
    recentLeaves.forEach(leave => {
        const leaveTypeLabel = getLeaveTypeIndonesia(leave.typeLabel || leave.type);
        const leaveDateText = getLeaveDateText(leave.startDate, leave.endDate);
        const leaveDays = leave.daysRequested || getLeaveDuration(leave.startDate, leave.endDate);
        const createdAt = new Date(leave.submittedDate).toLocaleString('id-ID');

        activities.push({
            type: 'leave',
            time: leave.submittedDate,
            description: `Pengajuan cuti ${leaveTypeLabel}<br>Tanggal: ${leaveDateText}<br>Hari: ${leaveDays} hari`,
            meta: `Pembuatan: ${createdAt}`,
            icon: 'fas fa-calendar-times'
        });
    });
    
    // Sort by time (most recent first)
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    userDashboardSliderState.recentActivities = activities;
    renderRecentActivitySlider();
}

function getUserDashboardSliderViewSize() {
    return window.matchMedia('(max-width: 768px)').matches ? 1 : 3;
}

function setupUserDashboardSliders() {
    const recentActivityHeader = document.querySelector('#recentActivity')?.closest('.card')?.querySelector('.card-header');
    if (recentActivityHeader && !document.getElementById('userActivitySliderNav')) {
        const nav = document.createElement('div');
        nav.className = 'dashboard-slider-nav';
        nav.id = 'userActivitySliderNav';
        nav.innerHTML = `
            <button type="button" class="dashboard-slider-btn" id="userActivityPrevBtn" aria-label="Aktivitas sebelumnya"><i class="fas fa-chevron-left"></i></button>
            <span class="dashboard-slider-indicator" id="userActivityIndicator">1/1</span>
            <button type="button" class="dashboard-slider-btn" id="userActivityNextBtn" aria-label="Aktivitas berikutnya"><i class="fas fa-chevron-right"></i></button>
        `;

        recentActivityHeader.appendChild(nav);

        document.getElementById('userActivityPrevBtn')?.addEventListener('click', function() {
            shiftUserDashboardSlider('activity', -getUserDashboardSliderViewSize());
        });
        document.getElementById('userActivityNextBtn')?.addEventListener('click', function() {
            shiftUserDashboardSlider('activity', getUserDashboardSliderViewSize());
        });
    }

    const announcementsHeader = document.querySelector('.announcements-card .card-header');
    if (announcementsHeader && !document.getElementById('userAnnouncementsSliderNav')) {
        const nav = document.createElement('div');
        nav.className = 'dashboard-slider-nav';
        nav.id = 'userAnnouncementsSliderNav';
        nav.innerHTML = `
            <button type="button" class="dashboard-slider-btn" id="userAnnouncementsPrevBtn" aria-label="Pengumuman sebelumnya"><i class="fas fa-chevron-left"></i></button>
            <span class="dashboard-slider-indicator" id="userAnnouncementsIndicator">1/1</span>
            <button type="button" class="dashboard-slider-btn" id="userAnnouncementsNextBtn" aria-label="Pengumuman berikutnya"><i class="fas fa-chevron-right"></i></button>
        `;

        announcementsHeader.appendChild(nav);

        document.getElementById('userAnnouncementsPrevBtn')?.addEventListener('click', function() {
            shiftUserDashboardSlider('announcements', -getUserDashboardSliderViewSize());
        });
        document.getElementById('userAnnouncementsNextBtn')?.addEventListener('click', function() {
            shiftUserDashboardSlider('announcements', getUserDashboardSliderViewSize());
        });
    }
}

function shiftUserDashboardSlider(section, delta) {
    const viewSize = getUserDashboardSliderViewSize();

    if (section === 'activity') {
        const items = userDashboardSliderState.recentActivities;
        const maxStart = Math.max(0, items.length - viewSize);
        userDashboardSliderState.activityStart = Math.min(maxStart, Math.max(0, userDashboardSliderState.activityStart + delta));
        renderRecentActivitySlider();
        return;
    }

    const announcements = userDashboardSliderState.announcements;
    const maxStart = Math.max(0, announcements.length - viewSize);
    userDashboardSliderState.announcementsStart = Math.min(maxStart, Math.max(0, userDashboardSliderState.announcementsStart + delta));
    renderAnnouncementsSlider();
}

function renderRecentActivitySlider() {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;

    const activities = userDashboardSliderState.recentActivities;
    const viewSize = getUserDashboardSliderViewSize();
    const maxStart = Math.max(0, activities.length - viewSize);
    if (userDashboardSliderState.activityStart > maxStart) {
        userDashboardSliderState.activityStart = maxStart;
    }

    if (activities.length === 0) {
        activityList.innerHTML = '<p class="no-activity">Belum ada aktivitas hari ini</p>';
    } else {
        const visible = activities.slice(userDashboardSliderState.activityStart, userDashboardSliderState.activityStart + viewSize);
        activityList.innerHTML = visible.map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <p class="activity-description">${activity.description}</p>
                <span class="activity-time">${activity.meta || new Date(activity.time).toLocaleString('id-ID')}</span>
            </div>
        </div>
    `).join('');

        activityList.querySelectorAll('.activity-item').forEach(item => item.classList.add('dashboard-slide-item'));
    }

    const nav = document.getElementById('userActivitySliderNav');
    const prevBtn = document.getElementById('userActivityPrevBtn');
    const nextBtn = document.getElementById('userActivityNextBtn');
    const indicator = document.getElementById('userActivityIndicator');
    const page = Math.floor(userDashboardSliderState.activityStart / Math.max(1, viewSize)) + 1;
    const totalPages = Math.max(1, Math.ceil(activities.length / Math.max(1, viewSize)));

    if (nav) nav.style.display = activities.length > viewSize ? 'inline-flex' : 'none';
    if (prevBtn) prevBtn.disabled = userDashboardSliderState.activityStart === 0;
    if (nextBtn) nextBtn.disabled = userDashboardSliderState.activityStart >= maxStart;
    if (indicator) indicator.textContent = `${page}/${totalPages}`;
}

function getLeaveTypeIndonesia(type) {
    const labels = {
        annual: 'tahunan',
        sick: 'sakit',
        personal: 'pribadi',
        maternity: 'melahirkan',
        other: 'lainnya',
        'Cuti Tahunan': 'tahunan',
        'Cuti Sakit': 'sakit',
        'Cuti Pribadi': 'pribadi',
        'Cuti Melahirkan': 'melahirkan',
        Lainnya: 'lainnya'
    };

    return labels[type] || String(type || 'lainnya').toLowerCase();
}

function getLeaveDateText(startDate, endDate) {
    if (!startDate || !endDate) {
        return '-';
    }

    const start = formatDate(startDate);
    const end = formatDate(endDate);
    return startDate === endDate ? start : `${start} - ${end}`;
}

function getLeaveDuration(startDate, endDate) {
    if (!startDate || !endDate) {
        return 1;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function loadAttendanceStatus() {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = presensiData.filter(p => 
        p.employeeId === currentUser.id && 
        p.date === today
    );
    
    const checkIn = todayAttendance.find(a => a.type === 'checkin');
    const checkOut = todayAttendance.find(a => a.type === 'checkout');
    
    document.getElementById('checkInTime').textContent = 
        checkIn ? new Date(checkIn.timestamp).toLocaleTimeString('id-ID') : '-';
    
    document.getElementById('checkOutTime').textContent = 
        checkOut ? new Date(checkOut.timestamp).toLocaleTimeString('id-ID') : '-';
    
    // Location status (simplified - in real app would check if within office radius)
    const locationStatus = checkIn ? 'Di dalam area kantor' : 'Belum check-in';
    document.getElementById('locationStatus').textContent = locationStatus;
}

function loadAnnouncements() {
    const grid = document.querySelector('.announcements-grid');
    if (!grid) return;

    // Load announcements from localStorage
    const storedAnnouncements = localStorage.getItem('announcements');
    let announcements = storedAnnouncements ? JSON.parse(storedAnnouncements) : [];

    if (announcements.length === 0) {
        announcements = [
            {
                id: Date.now() - 3,
                title: 'Pedoman Kerja Remote Baru',
                category: 'Kebijakan',
                content: 'Mulai bulan depan, pola hybrid 3:2 berlaku untuk seluruh divisi. Cek detail jadwal tim di portal admin.',
                date: new Date().toISOString().split('T')[0]
            },
            {
                id: Date.now() - 2,
                title: 'Rapat Townhall Tahunan',
                category: 'Acara',
                content: 'Townhall akan dilaksanakan Jumat pukul 15:30 WIB di Aula Utama dan live streaming internal.',
                date: new Date().toISOString().split('T')[0]
            },
            {
                id: Date.now() - 1,
                title: 'Program Kesehatan Karyawan',
                category: 'Kesehatan',
                content: 'Pemeriksaan kesehatan berkala dibuka minggu ini. Silakan daftar melalui HR paling lambat Kamis.',
                date: new Date().toISOString().split('T')[0]
            }
        ];

        localStorage.setItem('announcements', JSON.stringify(announcements));
    }

    userDashboardSliderState.announcements = announcements.slice().reverse();
    renderAnnouncementsSlider();
}

function renderAnnouncementsSlider() {
    const grid = document.querySelector('.announcements-grid');
    if (!grid) return;

    const announcements = userDashboardSliderState.announcements;
    const viewSize = getUserDashboardSliderViewSize();
    const maxStart = Math.max(0, announcements.length - viewSize);
    if (userDashboardSliderState.announcementsStart > maxStart) {
        userDashboardSliderState.announcementsStart = maxStart;
    }

    const visible = announcements.slice(
        userDashboardSliderState.announcementsStart,
        userDashboardSliderState.announcementsStart + viewSize
    );

    grid.innerHTML = visible.map(ann => {
        const categoryClass = ann.category ? ann.category.toLowerCase().replace(' ', '') : 'general';
        const categoryIcon = getCategoryIcon(ann.category);
        
        return `
            <div class="announcement-item dashboard-slide-item">
                <div class="announcement-badge ${categoryClass}">${categoryIcon} ${ann.category || 'Umum'}</div>
                <div class="announcement-date">${formatDate(ann.date || new Date().toISOString().split('T')[0])}</div>
                <h3>${ann.title || 'Pengumuman'}</h3>
                <p>${ann.content || ann.description || 'Tidak ada deskripsi'}</p>
            </div>
        `;
    }).join('');

    const nav = document.getElementById('userAnnouncementsSliderNav');
    const prevBtn = document.getElementById('userAnnouncementsPrevBtn');
    const nextBtn = document.getElementById('userAnnouncementsNextBtn');
    const indicator = document.getElementById('userAnnouncementsIndicator');
    const page = Math.floor(userDashboardSliderState.announcementsStart / Math.max(1, viewSize)) + 1;
    const totalPages = Math.max(1, Math.ceil(announcements.length / Math.max(1, viewSize)));

    if (nav) nav.style.display = announcements.length > viewSize ? 'inline-flex' : 'none';
    if (prevBtn) prevBtn.disabled = userDashboardSliderState.announcementsStart === 0;
    if (nextBtn) nextBtn.disabled = userDashboardSliderState.announcementsStart >= maxStart;
    if (indicator) indicator.textContent = `${page}/${totalPages}`;
}

function getCategoryIcon(category) {
    const icons = {
        'Policy': '📋',
        'Kebijakan': '📋',
        'Event': '🎉',
        'Acara': '🎉',
        'Health': '💚',
        'Kesehatan': '💚',
        'General': '📢',
        'Umum': '📢'
    };
    return icons[category] || '📢';
}

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
    });
}

function updateLeaveBalanceSummary() {
    const annualEl = document.getElementById('annualLeave');
    const sickEl = document.getElementById('sickLeave');
    if (!annualEl || !sickEl || !currentUser) return;

    const annualQuota = 12;
    const sickQuota = 6;

    const ownLeaves = (Array.isArray(leaves) ? leaves : []).filter(leave =>
        String(leave.employeeId || '') === String(currentUser.id || '') &&
        String(leave.status || '').toLowerCase() !== 'rejected'
    );

    const annualUsed = ownLeaves.reduce((sum, leave) => {
        const type = String(leave.type || '').toLowerCase();
        const days = Number(leave.daysRequested) || getLeaveDuration(leave.startDate, leave.endDate);
        return (type === 'personal' || type === 'maternity' || type === 'annual') ? sum + days : sum;
    }, 0);

    const sickUsed = ownLeaves.reduce((sum, leave) => {
        const type = String(leave.type || '').toLowerCase();
        const days = Number(leave.daysRequested) || getLeaveDuration(leave.startDate, leave.endDate);
        return type === 'sick' ? sum + days : sum;
    }, 0);

    annualEl.textContent = String(Math.max(0, annualQuota - annualUsed));
    sickEl.textContent = String(Math.max(0, sickQuota - sickUsed));
}