// ==================== USER DASHBOARD ====================
const userDasborSliderState = {
    activityStart: 0,
    announcementsStart: 0,
    recentActivities: [],
    announcements: []
};

document.addEventListener('DOMContentLoaded', function() {
    initializeUserDasbor();
});

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

async function initializeUserDasbor() {
    if (typeof window.syncAttendanceFromApi === 'function') {
        await window.syncAttendanceFromApi().catch(() => {});
    }
    if (typeof window.syncLeavesFromApi === 'function') {
        await window.syncLeavesFromApi().catch(() => {});
    }
    if (typeof window.syncAnnouncementsFromApi === 'function') {
        await window.syncAnnouncementsFromApi().catch(() => {});
    }

    loadPresensiData();
    const storedLeaves = localStorage.getItem('leaves');
    if (storedLeaves) {
        leaves = JSON.parse(storedLeaves);
    }

    updateDateTime();
    loadUserData();
    setupUserDasborSliders();
    loadRecentActivity();
    loadAttendanceStatus();
    loadAnnouncements();
    updateLeaveBalanceSummary();
    showFlashNotification();

    window.addEventListener('resize', function() {
        renderRecentActivitySlider();
        renderAnnouncementsSlider();
    });

    window.addEventListener('appLanguageChanged', handleDasborLanguageChanged);
    
    // Update time every minute
    setInterval(updateDateTime, 60000);
}

function handleDasborLanguageChanged() {
    updateDateTime();
    loadRecentActivity();
    loadAttendanceStatus();
    loadAnnouncements();
    updateLeaveBalanceSummary();
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
            description: isEnLang()
                ? `Leave request ${leaveTypeLabel}<br>Date: ${leaveDateText}<br>Days: ${leaveDays} days`
                : `Pengajuan cuti ${leaveTypeLabel}<br>Tanggal: ${leaveDateText}<br>Hari: ${leaveDays} hari`,
            meta: isEnLang() ? `Created: ${createdAt}` : `Pembuatan: ${createdAt}`,
            icon: 'fas fa-calendar-times'
        });
    });
    
    // Sort by time (most recent first)
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    userDasborSliderState.recentActivities = activities;
    renderRecentActivitySlider();
}

function getUserDasborSliderViewSize() {
    return window.matchMedia('(max-width: 768px)').matches ? 1 : 3;
}

function setupUserDasborSliders() {
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
            shiftUserDasborSlider('activity', -getUserDasborSliderViewSize());
        });
        document.getElementById('userActivityNextBtn')?.addEventListener('click', function() {
            shiftUserDasborSlider('activity', getUserDasborSliderViewSize());
        });
    }

    const announcementsHeader = document.querySelector('.announcements-card .card-header');
    if (announcementsHeader && !document.getElementById('userAnnouncementsSliderNav')) {
        const nav = document.createElement('div');
        nav.className = 'dashboard-slider-nav';
        nav.id = 'userAnnouncementsSliderNav';
        nav.innerHTML = `
            <button type="button" class="dashboard-slider-btn" id="userAnnouncementsPrevBtn" aria-label="${t('Pengumuman sebelumnya', 'Previous announcement')}"><i class="fas fa-chevron-left"></i></button>
            <span class="dashboard-slider-indicator" id="userAnnouncementsIndicator">1/1</span>
            <button type="button" class="dashboard-slider-btn" id="userAnnouncementsNextBtn" aria-label="${t('Pengumuman berikutnya', 'Next announcement')}"><i class="fas fa-chevron-right"></i></button>
        `;

        announcementsHeader.appendChild(nav);

        document.getElementById('userAnnouncementsPrevBtn')?.addEventListener('click', function() {
            shiftUserDasborSlider('announcements', -getUserDasborSliderViewSize());
        });
        document.getElementById('userAnnouncementsNextBtn')?.addEventListener('click', function() {
            shiftUserDasborSlider('announcements', getUserDasborSliderViewSize());
        });
    }
}

function shiftUserDasborSlider(section, delta) {
    const viewSize = getUserDasborSliderViewSize();
    const direction = delta < 0 ? -1 : 1;

    if (section === 'activity') {
        const items = userDasborSliderState.recentActivities;
        userDasborSliderState.activityStart = shiftPagedSliderStart(items.length, viewSize, userDasborSliderState.activityStart, direction);
        renderRecentActivitySlider();
        return;
    }

    const announcements = userDasborSliderState.announcements;
    userDasborSliderState.announcementsStart = shiftPagedSliderStart(announcements.length, viewSize, userDasborSliderState.announcementsStart, direction);
    renderAnnouncementsSlider();
}

function renderRecentActivitySlider() {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;

    const activities = userDasborSliderState.recentActivities;
    const viewSize = getUserDasborSliderViewSize();
    const pagination = getPagedSliderMeta(activities.length, viewSize, userDasborSliderState.activityStart);
    userDasborSliderState.activityStart = pagination.startIndex;

    if (activities.length === 0) {
        activityList.innerHTML = `<p class="no-activity">${t('Belum ada aktivitas hari ini', 'No activity today')}</p>`;
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
        annual: t('tahunan', 'annual'),
        sick: t('sakit', 'sick'),
        personal: t('pribadi', 'personal'),
        maternity: t('melahirkan', 'maternity'),
        other: t('lainnya', 'other'),
        'Cuti Tahunan': t('tahunan', 'annual'),
        'Cuti Sakit': t('sakit', 'sick'),
        'Cuti Pribadi': t('pribadi', 'personal'),
        'Cuti Melahirkan': t('melahirkan', 'maternity'),
        Lainnya: t('lainnya', 'other')
    };

    return labels[type] || String(type || t('lainnya', 'other')).toLowerCase();
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
    const locationStatus = checkIn
        ? t('Di dalam area kantor', 'Inside office area')
        : t('Belum check-in', 'Not checked in yet');
    document.getElementById('locationStatus').textContent = locationStatus;
}

function loadAnnouncements() {
    const grid = document.querySelector('.announcements-grid');
    if (!grid) return;

    // Load announcements from localStorage
    const storedAnnouncements = localStorage.getItem('announcements');
    let announcements = storedAnnouncements ? JSON.parse(storedAnnouncements) : [];

    if (!Array.isArray(announcements)) {
        announcements = [];
    }

    userDasborSliderState.announcements = getSortedAnnouncementsForDisplay(announcements);
    renderAnnouncementsSlider();
}

function renderAnnouncementsSlider() {
    const grid = document.querySelector('.announcements-grid');
    if (!grid) return;

    const announcements = userDasborSliderState.announcements;
    const viewSize = getUserDasborSliderViewSize();
    const pagination = getPagedSliderMeta(announcements.length, viewSize, userDasborSliderState.announcementsStart);
    userDasborSliderState.announcementsStart = pagination.startIndex;

    const visible = announcements.slice(
        pagination.startIndex,
        pagination.startIndex + viewSize
    );

    grid.innerHTML = visible.map((ann, index) => {
        const categoryClass = getCategoryClass(ann.category);
        const categoryIcon = getCategoryIcon(ann.category);
        const attachmentsCount = Array.isArray(ann.attachments) ? ann.attachments.length : 0;
        const displayCategory = localizeAnnouncementText(ann.category || 'Umum');
        const displayTitle = localizeAnnouncementText(ann.title || 'Pengumuman');
        const displayContent = localizeAnnouncementText(ann.content || ann.description || t('Tidak ada deskripsi', 'No description'));
        
        return `
            <button type="button" class="announcement-item dashboard-slide-item announcement-clickable" data-announcement-id="${ann.id}" style="--slide-index:${index};">
                <div class="announcement-badge ${categoryClass}">${categoryIcon} ${escapeHtml(displayCategory)}</div>
                <div class="announcement-date">${formatDate(ann.date || new Date().toISOString().split('T')[0])}</div>
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
    const announcement = userDasborSliderState.announcements.find((item) => Number(item.id) === Number(announcementId));
    if (!announcement) {
        if (typeof notify === 'function') {
            notify(t('Detail pengumuman tidak ditemukan.', 'Announcement details not found.'), 'warning');
        }
        return;
    }

    const attachments = Array.isArray(announcement.attachments) ? announcement.attachments : [];
    const displayCategory = localizeAnnouncementText(announcement.category || 'Umum');
    const displayPriority = localizeAnnouncementText(announcement.priority || 'Normal');
    const displayDivision = localizeAnnouncementText(announcement.targetDivision || 'Semua Divisi');
    const displayTitle = localizeAnnouncementText(announcement.title || 'Pengumuman');
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
                <button type="button" class="modal-close" id="closeUserAnnouncementDetailModal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="announcement-detail-meta">
                    <span class="announcement-badge ${categoryClass}">${getCategoryIcon(announcement.category)} ${escapeHtml(displayCategory)}</span>
                    <span>${formatDate(announcement.date || new Date().toISOString().split('T')[0])}</span>
                    <span>${t('Prioritas', 'Priority')}: ${escapeHtml(displayPriority)}</span>
                    <span>${t('Divisi', 'Division')}: ${escapeHtml(displayDivision)}</span>
                </div>
                <h2 class="announcement-detail-title">${escapeHtml(displayTitle)}</h2>
                <p class="announcement-detail-content">${escapeHtml(displayContent).replace(/\n/g, '<br>')}</p>
                ${attachmentMarkup}
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" id="closeUserAnnouncementDetailFooterBtn">${t('Tutup', 'Close')}</button>
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
            const fileName = this.getAttribute('data-file-name') || t('lampiran', 'attachment');
            const mimeType = this.getAttribute('data-file-mime') || '';
            downloadAnnouncementAttachment(src, fileName, mimeType);
        });
    });
    modal.querySelectorAll('.announcement-preview-btn').forEach((button) => {
        button.addEventListener('click', function() {
            const src = this.getAttribute('data-preview-src') || '';
            const type = this.getAttribute('data-preview-type') || 'file';
            const title = this.getAttribute('data-preview-title') || t('lampiran', 'attachment');
            const mimeType = this.getAttribute('data-preview-mime') || '';

            if (!src || src === '#') {
                if (typeof notify === 'function') {
                    notify(t('Pratinjau lampiran tidak tersedia.', 'Attachment preview is not available.'), 'warning');
                }
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
                        <iframe class="announcement-file-preview" src="${href}" title="${t('Pratinjau', 'Preview')} ${safeName}"></iframe>
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
        return { icon: 'fa-file-image', label: t('Gambar', 'Image') };
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
        return { icon: 'fa-file-lines', label: t('Teks', 'Text') };
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
                <button type="button" class="btn secondary" id="openAnnouncementPreviewInNewTabBtn"><i class="fas fa-eye"></i> ${t('Buka Tab Baru', 'Open in New Tab')}</button>
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
        if (typeof notify === 'function') {
            notify(t('Lampiran tidak tersedia untuk dibuka.', 'Attachment is not available to open.'), 'warning');
        }
        return;
    }

    if (!isDataUrl(src)) {
        window.open(src, '_blank', 'noopener,noreferrer');
        return;
    }

    const blobUrl = dataUrlToBlobUrl(src, mimeType);
    if (!blobUrl) {
        if (typeof notify === 'function') {
            notify(t('Lampiran gagal dibuka di tab baru.', 'Failed to open attachment in a new tab.'), 'error');
        }
        return;
    }

    window.open(blobUrl, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60 * 1000);
}

function downloadAnnouncementAttachment(src, fileName, mimeType = '') {
    if (!src || src === '#') {
        if (typeof notify === 'function') {
            notify(t('Lampiran tidak tersedia untuk diunduh.', 'Attachment is not available for download.'), 'warning');
        }
        return;
    }

    let href = src;
    let revokeUrl = null;

    if (isDataUrl(src)) {
        const blobUrl = dataUrlToBlobUrl(src, mimeType);
        if (!blobUrl) {
            if (typeof notify === 'function') {
                notify(t('Lampiran gagal diunduh.', 'Failed to download attachment.'), 'error');
            }
            return;
        }
        href = blobUrl;
        revokeUrl = blobUrl;
    }

    const a = document.createElement('a');
    a.href = href;
    a.download = fileName || t('lampiran', 'attachment');
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

function formatDate(dateStr) {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString(appLocale(), {
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

    return date.toLocaleDateString(appLocale(), {
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

    return date.toLocaleTimeString(appLocale(), {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTimeNoMilliseconds(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return '-';
    }

    const datePart = date.toLocaleDateString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();

    const timePart = date.toLocaleTimeString(appLocale(), {
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