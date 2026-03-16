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
    document.getElementById('currentDate').textContent = formatDate(now);
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
            description: `${attendance.type === 'checkin' ? 'Check-in' : 'Check-out'} pada ${formatTimeNoMilliseconds(attendance.timestamp)}`,
            icon: attendance.type === 'checkin' ? 'fas fa-sign-in-alt' : 'fas fa-sign-out-alt'
        });
    });
    
    // Add leave activities
    recentLeaves.forEach(leave => {
        const leaveTypeLabel = getLeaveTypeIndonesia(leave.typeLabel || leave.type);
        const leaveDateText = getLeaveDateText(leave.startDate, leave.endDate);
        const leaveDays = leave.daysRequested || getLeaveDuration(leave.startDate, leave.endDate);
        const createdAt = formatCreatedAtDate(leave.submittedDate);

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
    const direction = delta < 0 ? -1 : 1;

    if (section === 'activity') {
        const items = userDashboardSliderState.recentActivities;
        userDashboardSliderState.activityStart = shiftPagedSliderStart(items.length, viewSize, userDashboardSliderState.activityStart, direction);
        renderRecentActivitySlider();
        return;
    }

    const announcements = userDashboardSliderState.announcements;
    userDashboardSliderState.announcementsStart = shiftPagedSliderStart(announcements.length, viewSize, userDashboardSliderState.announcementsStart, direction);
    renderAnnouncementsSlider();
}

function renderRecentActivitySlider() {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;

    const activities = userDashboardSliderState.recentActivities;
    const viewSize = getUserDashboardSliderViewSize();
    const pagination = getPagedSliderMeta(activities.length, viewSize, userDashboardSliderState.activityStart);
    userDashboardSliderState.activityStart = pagination.startIndex;

    if (activities.length === 0) {
        activityList.innerHTML = '<p class="no-activity">Belum ada aktivitas hari ini</p>';
    } else {
        const visible = activities.slice(pagination.startIndex, pagination.startIndex + viewSize);
        activityList.innerHTML = visible.map((activity, index) => `
        <div class="activity-item dashboard-slide-item" style="--slide-index:${index};">
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <p class="activity-description">${activity.description}</p>
                <span class="activity-time">${activity.meta || formatDateTimeNoMilliseconds(activity.time)}</span>
            </div>
        </div>
    `).join('');
    }

    const nav = document.getElementById('userActivitySliderNav');
    const prevBtn = document.getElementById('userActivityPrevBtn');
    const nextBtn = document.getElementById('userActivityNextBtn');
    const indicator = document.getElementById('userActivityIndicator');

    if (nav) nav.style.display = activities.length > viewSize ? 'inline-flex' : 'none';
    if (prevBtn) prevBtn.disabled = !pagination.hasPrev;
    if (nextBtn) nextBtn.disabled = !pagination.hasNext;
    if (indicator) indicator.textContent = `${pagination.currentPage + 1}/${pagination.totalPages}`;
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
            checkIn ? formatTimeNoMilliseconds(checkIn.timestamp) : '-';
    
        document.getElementById('checkOutTime').textContent = 
            checkOut ? formatTimeNoMilliseconds(checkOut.timestamp) : '-';
    
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
    const pagination = getPagedSliderMeta(announcements.length, viewSize, userDashboardSliderState.announcementsStart);
    userDashboardSliderState.announcementsStart = pagination.startIndex;

    const visible = announcements.slice(
        pagination.startIndex,
        pagination.startIndex + viewSize
    );

    grid.innerHTML = visible.map((ann, index) => {
        const categoryClass = ann.category ? ann.category.toLowerCase().replace(' ', '') : 'general';
        const categoryIcon = getCategoryIcon(ann.category);
        const attachmentsCount = Array.isArray(ann.attachments) ? ann.attachments.length : 0;
        
        return `
            <button type="button" class="announcement-item dashboard-slide-item announcement-clickable" data-announcement-id="${ann.id}" style="--slide-index:${index};">
                <div class="announcement-badge ${categoryClass}">${categoryIcon} ${ann.category || 'Umum'}</div>
                <div class="announcement-date">${formatDate(ann.date || new Date().toISOString().split('T')[0])}</div>
                <h3>${escapeHtml(ann.title || 'Pengumuman')}</h3>
                <p>${escapeHtml(ann.content || ann.description || 'Tidak ada deskripsi')}</p>
                ${attachmentsCount > 0 ? `<small class="announcement-attachment-hint"><i class="fas fa-paperclip"></i> ${attachmentsCount} lampiran</small>` : ''}
            </button>
        `;
    }).join('');

    grid.querySelectorAll('.announcement-clickable').forEach((itemEl) => {
        itemEl.addEventListener('click', function() {
            const id = Number(this.getAttribute('data-announcement-id'));
            if (!id) return;
            openUserAnnouncementDetailModal(id);
        });
    });

    const nav = document.getElementById('userAnnouncementsSliderNav');
    const prevBtn = document.getElementById('userAnnouncementsPrevBtn');
    const nextBtn = document.getElementById('userAnnouncementsNextBtn');
    const indicator = document.getElementById('userAnnouncementsIndicator');

    if (nav) nav.style.display = announcements.length > viewSize ? 'inline-flex' : 'none';
    if (prevBtn) prevBtn.disabled = !pagination.hasPrev;
    if (nextBtn) nextBtn.disabled = !pagination.hasNext;
    if (indicator) indicator.textContent = `${pagination.currentPage + 1}/${pagination.totalPages}`;
}

function openUserAnnouncementDetailModal(announcementId) {
    const announcement = userDashboardSliderState.announcements.find((item) => Number(item.id) === Number(announcementId));
    if (!announcement) {
        if (typeof notify === 'function') {
            notify('Detail pengumuman tidak ditemukan.', 'warning');
        }
        return;
    }

    const attachments = Array.isArray(announcement.attachments) ? announcement.attachments : [];
    const attachmentMarkup = attachments.length
        ? `
            <div class="announcement-detail-section">
                <h4><i class="fas fa-paperclip"></i> Lampiran</h4>
                <div class="announcement-attachment-list">
                    ${renderAnnouncementAttachmentItems(attachments)}
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
                <button type="button" class="modal-close" id="closeUserAnnouncementDetailModal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="announcement-detail-meta">
                    <span class="announcement-badge">${getCategoryIcon(announcement.category)} ${escapeHtml(announcement.category || 'Umum')}</span>
                    <span>${formatDate(announcement.date || new Date().toISOString().split('T')[0])}</span>
                    <span>Prioritas: ${escapeHtml(announcement.priority || 'Normal')}</span>
                    <span>Divisi: ${escapeHtml(announcement.targetDivision || 'Semua Divisi')}</span>
                </div>
                <h2 class="announcement-detail-title">${escapeHtml(announcement.title || 'Pengumuman')}</h2>
                <p class="announcement-detail-content">${escapeHtml(announcement.content || '-').replace(/\n/g, '<br>')}</p>
                ${attachmentMarkup}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" id="closeUserAnnouncementDetailFooterBtn">Tutup</button>
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
    modal.querySelector('#closeUserAnnouncementDetailModal')?.addEventListener('click', close);
    modal.querySelector('#closeUserAnnouncementDetailFooterBtn')?.addEventListener('click', close);
    modal.querySelectorAll('.announcement-preview-btn').forEach((button) => {
        button.addEventListener('click', function() {
            const src = this.getAttribute('data-preview-src') || '';
            const type = this.getAttribute('data-preview-type') || 'file';
            const title = this.getAttribute('data-preview-title') || 'lampiran';

            if (!src || src === '#') {
                if (typeof notify === 'function') {
                    notify('Pratinjau lampiran tidak tersedia.', 'warning');
                }
                return;
            }

            openAnnouncementAttachmentPreviewModal({
                src,
                type,
                title
            });
        });
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) close();
    });
}

function renderAnnouncementAttachmentItems(attachments) {
    return attachments.map(att => {
        const safeName = escapeHtml(att.storedName || att.name || 'lampiran');
        const href = String(att.dataUrl || '#');
        const type = getAnnouncementAttachmentType(att.mimeType, href);
        const typeInfo = getAnnouncementAttachmentTypeInfo(att);

        if (type === 'image') {
            return `
                <div class="announcement-image-item">
                    <div class="announcement-file-header">
                        <span class="announcement-file-type-badge"><i class="fas ${typeInfo.icon}"></i> ${typeInfo.label}</span>
                        <span class="announcement-file-name">${safeName}</span>
                    </div>
                    <img src="${href}" alt="${safeName}">
                    <div class="announcement-attachment-actions">
                        <button type="button" class="btn secondary announcement-preview-btn" data-preview-src="${href}" data-preview-type="${type}" data-preview-title="${safeName}"><i class="fas fa-up-right-and-down-left-from-center"></i> Pratinjau</button>
                        <a class="btn secondary" href="${href}" target="_blank" rel="noopener noreferrer"><i class="fas fa-eye"></i> Lihat</a>
                        <a class="btn secondary" href="${href}" download="${safeName}"><i class="fas fa-download"></i> Unduh</a>
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
                        <button type="button" class="btn secondary announcement-preview-btn" data-preview-src="${href}" data-preview-type="${type}" data-preview-title="${safeName}"><i class="fas fa-up-right-and-down-left-from-center"></i> Pratinjau</button>
                        <a class="btn secondary" href="${href}" target="_blank" rel="noopener noreferrer"><i class="fas fa-eye"></i> Lihat</a>
                        <a class="btn secondary" href="${href}" download="${safeName}"><i class="fas fa-download"></i> Unduh</a>
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
                    <button type="button" class="btn secondary announcement-preview-btn" data-preview-src="${href}" data-preview-type="${type}" data-preview-title="${safeName}"><i class="fas fa-up-right-and-down-left-from-center"></i> Pratinjau</button>
                    <a class="btn secondary" href="${href}" target="_blank" rel="noopener noreferrer"><i class="fas fa-eye"></i> Lihat</a>
                    <a class="btn secondary" href="${href}" download="${safeName}"><i class="fas fa-download"></i> Unduh</a>
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
    const safeTitle = escapeHtml(payload?.title || 'lampiran');

    const content = (type === 'image')
        ? `<img src="${src}" alt="${safeTitle}" class="announcement-preview-image">`
        : `<iframe src="${src}" title="Pratinjau ${safeTitle}" class="announcement-preview-frame"></iframe>`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay announcement-preview-modal';
    modal.innerHTML = `
        <div class="modal-content announcement-preview-content">
            <div class="modal-header">
                <h3><i class="fas fa-expand"></i> Pratinjau Lampiran</h3>
                <button type="button" class="modal-close" id="closeAnnouncementPreviewModal">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
            <div class="modal-footer">
                <a class="btn secondary" href="${src}" target="_blank" rel="noopener noreferrer"><i class="fas fa-eye"></i> Buka Tab Baru</a>
                <a class="btn secondary" href="${src}" download="${safeTitle}"><i class="fas fa-download"></i> Unduh</a>
                <button type="button" class="btn secondary" id="closeAnnouncementPreviewFooterBtn">Tutup</button>
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
    modal.addEventListener('click', (event) => {
        if (event.target === modal) close();
    });
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
    if (isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    }).toLowerCase();
}

function formatCreatedAtDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}

function formatTimeNoMilliseconds(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTimeNoMilliseconds(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return '-';
    }

    const datePart = date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();

    const timePart = date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return `${datePart}, ${timePart}`;
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