let attendanceRecords = [];
let filteredAttendance = [];
let currentPage = 1;
const itemsPerPage = 6;
let siteCurrentPage = 1;
const siteItemsPerPage = 5;

function isEnLang() {
    return document.documentElement.getAttribute('lang') === 'en';
}

function t(idText, enText) {
    return isEnLang() ? enText : idText;
}

function appLocale() {
    return isEnLang() ? 'en-US' : 'id-ID';
}

document.addEventListener('DOMContentLoaded', async function() {
    checkAuthStatus();
    if (!currentUser || !['admin', 'hr', 'bod', 'manager', 'finance'].includes(currentUser?.role)) {
        window.location.href = '../index.html';
        return;
    }

    updateUserDisplay();

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => logout(e));

    setupSidebarNav();
    if (typeof window.syncSitesFromApi === 'function') {
        await window.syncSitesFromApi().catch(() => {});
    }
    if (typeof window.syncAttendanceFromApi === 'function') {
        await window.syncAttendanceFromApi().catch(() => {});
    }
    loadAttendanceData();
    await loadSiteNames();

    document.getElementById('filterEmployee')?.addEventListener('input', filterAttendanceRecords);
    document.getElementById('filterDepartment')?.addEventListener('change', filterAttendanceRecords);
    document.getElementById('filterDate')?.addEventListener('change', filterAttendanceRecords);
    document.getElementById('filterStatus')?.addEventListener('change', filterAttendanceRecords);

    document.getElementById('attendancePrevBtn')?.addEventListener('click', function() {
        if (currentPage > 1) {
            currentPage -= 1;
            renderAttendanceList();
        }
    });

    document.getElementById('attendanceNextBtn')?.addEventListener('click', function() {
        const maxPage = Math.ceil(filteredAttendance.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage += 1;
            renderAttendanceList();
        }
    });

    document.getElementById('sitePrevBtn')?.addEventListener('click', function() {
        if (siteCurrentPage > 1) {
            siteCurrentPage -= 1;
            loadSiteNames();
        }
    });

    document.getElementById('siteNextBtn')?.addEventListener('click', function() {
        const siteNames = JSON.parse(localStorage.getItem('siteNames') || '[]');
        const maxPage = Math.ceil(siteNames.length / siteItemsPerPage);
        if (siteCurrentPage < maxPage) {
            siteCurrentPage += 1;
            loadSiteNames();
        }
    });

    document.getElementById('approveAllBtn')?.addEventListener('click', approveAllAttendance);
    document.getElementById('rejectAllBtn')?.addEventListener('click', rejectAllAttendance);

    document.querySelector('.download-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        exportAttendanceCSV();
    });

    document.getElementById('addSiteBtn')?.addEventListener('click', addSite);
    document.getElementById('newSiteName')?.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') addSite();
    });

    window.addEventListener('appLanguageChanged', handleAttendanceLanguageChanged);
});

function handleAttendanceLanguageChanged() {
    renderAttendanceList();
    loadSiteNames();
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

function normalizeType(type) {
    const value = String(type || '').toLowerCase().replace(/\s+/g, '');
    if (value === 'checkin' || value === 'check-in') return 'checkin';
    if (value === 'checkout' || value === 'check-out') return 'checkout';
    return String(type || 'unknown');
}

function normalizeStatus(record) {
    if (record.status) return String(record.status).toLowerCase();
    if (record.approved === true) return 'approved';
    if (record.rejected === true) return 'rejected';
    return 'pending';
}

function getDepartmentByEmployeeId(employeeId) {
    const list = Array.isArray(employees) ? employees : [];
    const match = list.find(emp => String(emp.id) === String(employeeId));
    return match?.department || '-';
}

function loadAttendanceData() {
    const stored = localStorage.getItem('presensiData');
    const raw = stored ? JSON.parse(stored) : [];

    attendanceRecords = raw.map(record => {
        const normalizedType = normalizeType(record.type);
        const status = normalizeStatus(record);

        return {
            id: record.id,
            employee: record.employeeName || record.username || 'Unknown',
            employeeId: record.employeeId,
            department: record.department || getDepartmentByEmployeeId(record.employeeId),
            date: record.date,
            time: formatAttendanceTime(record.time, record.timestamp),
            timestamp: record.timestamp || '',
            type: normalizedType,
            workLocation: record.workLocation || '-',
            siteName: record.siteName || '-',
            location: record.location || null,
            faceVerified: Boolean(record.faceCaptured || record.faceVerified),
            faceImageWebp: record.faceImageWebp || '',
            faceImageSizeBytes: Number(record.faceImageSizeBytes || 0),
            attachment: record.attachment || null,
            notes: record.notes || '',
            approved: status === 'approved',
            status: status,
            geoStatus: record.geoStatus || ''
        };
    }).sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp) : new Date(`${a.date}T${a.time || '00:00'}`);
        const timeB = b.timestamp ? new Date(b.timestamp) : new Date(`${b.date}T${b.time || '00:00'}`);
        return timeB - timeA;
    });

    filteredAttendance = [...attendanceRecords];
    currentPage = 1;
    renderAttendanceList();
}

function filterAttendanceRecords() {
    const employeeFilter = String(document.getElementById('filterEmployee')?.value || '').toLowerCase().trim();
    const departmentFilter = document.getElementById('filterDepartment')?.value || '';
    const dateFilter = document.getElementById('filterDate')?.value || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';

    filteredAttendance = attendanceRecords.filter(record => {
        if (employeeFilter && !String(record.employee || '').toLowerCase().includes(employeeFilter) && !String(record.employeeId || '').toLowerCase().includes(employeeFilter)) {
            return false;
        }

        if (departmentFilter && String(record.department || '') !== departmentFilter) {
            return false;
        }

        if (dateFilter && record.date !== dateFilter) {
            return false;
        }

        if (statusFilter) {
            const key = String(statusFilter).toLowerCase();
            const status = normalizeStatus(record);
            if (['approved', 'pending', 'rejected'].includes(key) && status !== key) return false;
            if (key === 'present' && status !== 'approved') return false;
            if (key === 'late' && status !== 'pending') return false;
            if (key === 'absent' && status !== 'rejected') return false;
        }

        return true;
    });

    currentPage = 1;
    renderAttendanceList();
}

function getStatusMeta(status) {
    if (status === 'approved') {
        return { label: t('Disetujui', 'Setujuid'), className: 'approved' };
    }
    if (status === 'rejected') {
        return { label: t('Ditolak', 'Tolaked'), className: 'rejected' };
    }
    return { label: t('Tertunda', 'Tertunda'), className: 'pending' };
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderAttendanceList() {
    const container = document.getElementById('attendanceListContainer');
    if (!container) return;

    if (!filteredAttendance.length) {
        container.innerHTML = `<div class="attendance-empty">${t('Tidak ada data presensi untuk filter saat ini.', 'No attendance records for the current filters.')}</div>`;
        updatePagination();
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredAttendance.slice(start, start + itemsPerPage);

    const showGeoColumn = currentUser && ['admin', 'hr'].includes(currentUser.role);
    const isBOD = currentUser?.role === 'bod';
    const gridClass = showGeoColumn ? 'with-security' : '';

    container.innerHTML = `
        <div class="attendance-table-wrap">
            <div class="attendance-table-header attendance-grid-row ${gridClass}">
                <div>${t('Karyawan', 'Employee')}</div>
                <div>${t('Tanggal & Jam', 'Date & Time')}</div>
                <div>${t('Tipe', 'Type')}</div>
                <div>${t('Lokasi Kerja', 'Work Location')}</div>
                <div>${t('Lokasi GPS', 'GPS Location')}</div>
                ${showGeoColumn ? `<div>Anti-Fake GPS</div>` : ''}
                <div>Face Recognition</div>
                <div>${t('Status', 'Status')}</div>
                <div>${t('Aksi', 'Actions')}</div>
            </div>
            ${pageItems.map(record => {
                const statusMeta = getStatusMeta(record.status);
                const gpsHtml = record.location && typeof record.location.latitude === 'number' && typeof record.location.longitude === 'number'
                    ? `<button type="button" class="attendance-link-btn" onclick="openLocationMap(${record.id})"><i class="fas fa-map-marked-alt"></i> ${t('Lihat Peta', 'View Map')}</button>`
                    : '<span class="attendance-muted">-</span>';

                const facePreviewHtml = record.faceImageWebp
                    ? `<button type="button" class="attendance-link-btn" onclick="showFacePreview(${record.id})"><i class="fas fa-image"></i> ${t('Lihat Wajah', 'View Face')}</button>`
                    : (record.faceVerified ? `<span class="attendance-pill verified">${t('Terverifikasi', 'Verified')}</span>` : `<span class="attendance-pill unverified">${t('Belum', 'Not Yet')}</span>`);

                let geoStatusHtml = '';
                if (showGeoColumn) {
                    const geo = String(record.geoStatus || '').toLowerCase();
                    const badgeClass = ['passed', 'flagged', 'blocked'].includes(geo) ? geo : 'unknown';
                    const icon = geo === 'passed' ? 'fa-check-circle' : (geo === 'flagged' ? 'fa-exclamation-triangle' : (geo === 'blocked' ? 'fa-ban' : 'fa-question-circle'));
                    const label = geo === 'passed' ? 'PASSED' : (geo === 'flagged' ? 'FLAGGED' : (geo === 'blocked' ? 'BLOCKED' : 'UNKNOWN'));
                    geoStatusHtml = `<div data-label="Anti-Fake GPS">
                        <div class="attendance-cell-content">
                            <span class="geo-status-badge ${badgeClass}"><i class="fas ${icon}"></i> ${label}</span>
                        </div>
                    </div>`;
                }

                const actionHtml = (record.status === 'pending' && !isBOD)
                    ? `
                        <div class="attendance-actions">
                            <button type="button" class="attendance-action-btn approve" onclick="approveAttendance(${record.id})"><i class="fas fa-check"></i> Setujui</button>
                            <button type="button" class="attendance-action-btn reject" onclick="rejectAttendance(${record.id})"><i class="fas fa-times"></i> Tolak</button>
                        </div>
                    `
                    : `<span class="attendance-final attendance-final-${statusMeta.className}">${statusMeta.label}</span>`;

                return `
                    <div class="attendance-table-row attendance-grid-row ${gridClass}">
                        <div data-label="${t('Karyawan', 'Employee')}">
                            <div class="attendance-cell-content">
                                <div class="attendance-employee">${escapeHtml(record.employee)}</div>
                                <div class="attendance-meta">ID: ${escapeHtml(record.employeeId || '-')} | ${escapeHtml(record.department || '-')}</div>
                            </div>
                        </div>
                        <div data-label="${t('Tanggal & Jam', 'Date & Time')}">
                            <div class="attendance-cell-content">
                                <div>${formatDate(record.date)}</div>
                                <div class="attendance-meta">${escapeHtml(record.time || '-')}</div>
                            </div>
                        </div>
                        <div data-label="${t('Tipe', 'Type')}">
                            <div class="attendance-cell-content">
                                <span class="attendance-type ${record.type === 'checkin' ? 'checkin' : 'checkout'}">${record.type === 'checkin' ? 'Check-in' : 'Check-out'}</span>
                            </div>
                        </div>
                        <div data-label="${t('Lokasi Kerja', 'Work Location')}">
                            <div class="attendance-cell-content">
                                <div>${escapeHtml(record.workLocation || '-')}</div>
                                <div class="attendance-meta">${t('Site', 'Site')}: ${escapeHtml(record.siteName || '-')}</div>
                            </div>
                        </div>
                        <div data-label="${t('Lokasi GPS', 'GPS Location')}">
                            <div class="attendance-cell-content">
                                ${gpsHtml}
                                ${record.location && typeof record.location.latitude === 'number' ? `<div class="attendance-meta">${record.location.latitude.toFixed(5)}, ${record.location.longitude.toFixed(5)}</div>` : ''}
                            </div>
                        </div>
                        ${geoStatusHtml}
                        <div data-label="Face Recognition">
                            <div class="attendance-cell-content">
                                ${facePreviewHtml}
                                ${record.attachment ? `<div class="attendance-meta"><button type="button" class="attendance-link-btn" onclick="downloadAttachment(${record.id})"><i class="fas fa-paperclip"></i> ${t('Lampiran', 'Attachment')}</button></div>` : ''}
                            </div>
                        </div>
                        <div data-label="${t('Status', 'Status')}">
                            <div class="attendance-cell-content">
                                <span class="attendance-status ${statusMeta.className}">${statusMeta.label}</span>
                            </div>
                        </div>
                        <div data-label="${t('Aksi', 'Actions')}">
                            <div class="attendance-cell-content">
                                ${actionHtml}
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    updatePagination();
}

function formatDate(dateStr) {
    const date = new Date(`${dateStr}T00:00:00`);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}

function formatAttendanceTime(timeValue, timestampValue) {
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

function updatePagination() {
    const total = filteredAttendance.length;
    const start = total ? ((currentPage - 1) * itemsPerPage) + 1 : 0;
    const end = Math.min(start + itemsPerPage - 1, total);

    document.getElementById('attendancePaginationStart').textContent = String(start);
    document.getElementById('attendancePaginationEnd').textContent = String(end);
    document.getElementById('attendancePaginationTotal').textContent = String(total);

    const maxPage = Math.max(1, Math.ceil(total / itemsPerPage));
    document.getElementById('attendancePrevBtn').disabled = currentPage <= 1;
    document.getElementById('attendanceNextBtn').disabled = currentPage >= maxPage;
}

async function updatePresensiRecordStatus(recordId, status) {
    if (typeof apiRequest !== 'function') {
        const raw = JSON.parse(localStorage.getItem('presensiData') || '[]');
        const idx = raw.findIndex(item => Number(item.id) === Number(recordId));
        if (idx >= 0) {
            raw[idx].status = status;
            raw[idx].approved = status === 'approved';
            raw[idx].rejected = status === 'rejected';
            localStorage.setItem('presensiData', JSON.stringify(raw));
        }
        return;
    }

    await apiRequest(`/api/attendance/${Number(recordId)}/status`, {
        method: 'PATCH',
        body: { status },
    });
}

async function approveAttendance(id) {
    const record = attendanceRecords.find(item => Number(item.id) === Number(id));
    if (!record) return;

    try {
        await updatePresensiRecordStatus(id, 'approved');
        record.status = 'approved';
        record.approved = true;
    } catch (error) {
        notify(error?.message || t('Gagal mengubah status presensi.', 'Failed to update attendance status.'), 'error');
        return;
    }

    notify(t('Presensi berhasil di-approve.', 'Attendance approved successfully.'), 'success');
    filterAttendanceRecords();
}

async function rejectAttendance(id) {
    const record = attendanceRecords.find(item => Number(item.id) === Number(id));
    if (!record) return;

    try {
        await updatePresensiRecordStatus(id, 'rejected');
        record.status = 'rejected';
        record.approved = false;
    } catch (error) {
        notify(error?.message || t('Gagal mengubah status presensi.', 'Failed to update attendance status.'), 'error');
        return;
    }

    notify(t('Presensi ditandai reject.', 'Attendance marked as rejected.'), 'warning');
    filterAttendanceRecords();
}

async function approveAllAttendance() {
    const pendingRecords = attendanceRecords.filter(record => record.status === 'pending');
    if (!pendingRecords.length) {
        notify(t('Tidak ada data pending.', 'No pending records.'), 'info');
        return;
    }

    let changed = 0;
    for (const record of pendingRecords) {
        try {
            await updatePresensiRecordStatus(record.id, 'approved');
            record.status = 'approved';
            record.approved = true;
            changed += 1;
        } catch (error) {
            console.error('Failed to approve attendance', error);
        }
    }

    notify(isEnLang() ? `${changed} attendance records approved.` : `${changed} data presensi di-approve.`, 'success');
    filterAttendanceRecords();
}

async function rejectAllAttendance() {
    const pendingRecords = attendanceRecords.filter(record => record.status === 'pending');
    if (!pendingRecords.length) {
        notify(t('Tidak ada data pending.', 'No pending records.'), 'info');
        return;
    }

    let changed = 0;
    for (const record of pendingRecords) {
        try {
            await updatePresensiRecordStatus(record.id, 'rejected');
            record.status = 'rejected';
            record.approved = false;
            changed += 1;
        } catch (error) {
            console.error('Failed to reject attendance', error);
        }
    }

    notify(isEnLang() ? `${changed} attendance records rejected.` : `${changed} data presensi di-reject.`, 'warning');
    filterAttendanceRecords();
}

function showMapModal(title, bodyHtml) {
    const existing = document.getElementById('attendanceDetailModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'attendanceDetailModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 760px; width: min(760px, 96vw);">
            <div class="modal-header">
                <h2><i class="fas fa-map"></i> ${escapeHtml(title)}</h2>
                <button type="button" class="modal-close" id="closeAttendanceModal">&times;</button>
            </div>
            <div class="modal-body">${bodyHtml}</div>
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
    modal.querySelector('#closeAttendanceModal')?.addEventListener('click', close);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) close();
    });
}

function openLocationMap(recordId) {
    const record = attendanceRecords.find(item => Number(item.id) === Number(recordId));
    if (!record || !record.location || typeof record.location.latitude !== 'number' || typeof record.location.longitude !== 'number') {
        notify(t('Koordinat tidak tersedia.', 'Coordinates are unavailable.'), 'warning');
        return;
    }

    const lat = record.location.latitude;
    const lng = record.location.longitude;
    const delta = 0.005;
    const bbox = `${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}`;
    const marker = `${lat}%2C${lng}`;
    const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`;

    const html = `
        <div style="display:grid; gap:0.85rem;">
            <div class="attendance-preview-meta" style="font-size:0.92rem;">
                <strong>${t('Koordinat', 'Coordinates')}:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
                <strong>${t('Akurasi', 'Accuracy')}:</strong> ${Number(record.location.accuracy || 0).toFixed(1)} ${t('meter', 'meters')}
            </div>
            <iframe src="${mapUrl}" style="width:100%; height:380px; border:1px solid var(--border-color); border-radius:0.7rem;" loading="lazy"></iframe>
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener" class="btn primary" style="width:max-content;">${t('Buka di Google Maps', 'Open in Google Maps')}</a>
        </div>
    `;

    showMapModal(t('Detail Lokasi Presensi', 'Attendance Location Details'), html);
}

function showFacePreview(recordId) {
    const record = attendanceRecords.find(item => Number(item.id) === Number(recordId));
    if (!record || !record.faceImageWebp) {
        notify(t('Foto wajah belum tersedia.', 'Face image is unavailable.'), 'warning');
        return;
    }

    const sizeKb = record.faceImageSizeBytes ? `${(record.faceImageSizeBytes / 1024).toFixed(1)} KB` : '-';
    const html = `
        <div style="display:grid; gap:0.85rem;">
            <div class="attendance-preview-meta" style="font-size:0.92rem;">
                <strong>${t('Format', 'Format')}:</strong> WEBP<br>
                <strong>${t('Ukuran', 'Size')}:</strong> ${sizeKb}
            </div>
            <img src="${record.faceImageWebp}" alt="Face Capture" style="width:100%; max-height:420px; object-fit:contain; border:1px solid var(--border-color); border-radius:0.7rem; background:var(--card-bg);" />
        </div>
    `;

    showMapModal(t('Pratinjau Face Recognition', 'Face Recognition Preview'), html);
}

function downloadAttachment(recordId) {
    const record = attendanceRecords.find(item => Number(item.id) === Number(recordId));
    if (!record || !record.attachment || !record.attachment.dataUrl) {
        notify(t('Lampiran tidak tersedia.', 'Attachment is unavailable.'), 'warning');
        return;
    }

    const a = document.createElement('a');
    a.href = record.attachment.dataUrl;
    a.download = record.attachment.name || `lampiran-${record.id}`;
    a.click();
}

function exportAttendanceCSV() {
    if (!filteredAttendance.length) {
        notify('Tidak ada data presensi untuk diekspor.', 'warning');
        return;
    }

    const rows = [];
    rows.push(['Laporan Presensi']);
    rows.push(['Dibuat Pada', formatAttendanceCsvDateTime(new Date())]);
    rows.push(['Dibuat Oleh', currentUser?.name || 'Admin']);
    rows.push(['Total Data', formatAttendanceCsvNumber(filteredAttendance.length)]);
    rows.push([]);

    rows.push(['Tanggal', 'Jam', 'Nama', 'ID', 'Departemen', 'Tipe', 'Lokasi Kerja', 'Site', 'Latitude', 'Longitude', 'Status', 'Face Verified']);
    filteredAttendance.forEach(record => rows.push([
        formatAttendanceDateForCsv(record.date),
        record.time || '-',
        record.employee || '-',
        record.employeeId || '-',
        record.department || '-',
        record.type || '-',
        record.workLocation || '-',
        record.siteName || '-',
        formatAttendanceCoordinate(record.location?.latitude),
        formatAttendanceCoordinate(record.location?.longitude),
        record.status || '-',
        record.faceVerified ? 'Ya' : 'Tidak'
    ]));

    const csv = rows
        .map(cols => cols.map(escapeAttendanceCsvCell).join(','))
        .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    notify('Laporan presensi berhasil diunduh.', 'success');
}

function escapeAttendanceCsvCell(value) {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
}

function formatAttendanceCoordinate(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(6) : '-';
}

function formatAttendanceDateForCsv(dateValue) {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);

    return date.toLocaleDateString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}

function formatAttendanceCsvDateTime(dateValue) {
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

function formatAttendanceCsvNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString(appLocale()) : '-';
}

async function loadSiteNames() {
    if (typeof window.syncSitesFromApi === 'function') {
        await window.syncSitesFromApi().catch(() => {});
    }

    let siteNames = JSON.parse(localStorage.getItem('siteNames') || '[]');

    const siteNamesList = document.getElementById('siteNamesList');
    if (!siteNamesList) return;

    const maxPage = Math.max(1, Math.ceil(siteNames.length / siteItemsPerPage));
    if (siteCurrentPage > maxPage) {
        siteCurrentPage = maxPage;
    }

    const startIndex = (siteCurrentPage - 1) * siteItemsPerPage;
    const visibleSites = siteNames.slice(startIndex, startIndex + siteItemsPerPage);

    siteNamesList.innerHTML = visibleSites.map(site => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.75rem; border: 1px solid #e5e7eb; border-radius: 0.5rem; background: #f9fafb;">
            <span>${escapeHtml(site.name)}</span>
            <button onclick="deleteSite(${site.id})" style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem;">${t('Hapus', 'Delete')}</button>
        </div>
    `).join('');

    updateSitePagination(siteNames.length);
}

function updateSitePagination(totalSites) {
    const start = totalSites ? ((siteCurrentPage - 1) * siteItemsPerPage) + 1 : 0;
    const end = totalSites ? Math.min(start + siteItemsPerPage - 1, totalSites) : 0;
    const maxPage = Math.max(1, Math.ceil(totalSites / siteItemsPerPage));

    document.getElementById('sitePaginationStart').textContent = String(start);
    document.getElementById('sitePaginationEnd').textContent = String(end);
    document.getElementById('sitePaginationTotal').textContent = String(totalSites);
    document.getElementById('sitePrevBtn').disabled = siteCurrentPage <= 1;
    document.getElementById('siteNextBtn').disabled = siteCurrentPage >= maxPage;
}

async function addSite() {
    const input = document.getElementById('newSiteName');
    if (!input) return;

    const siteName = String(input.value || '').trim();
    if (!siteName) {
        notify(t('Silakan masukkan nama site.', 'Please enter a site name.'), 'warning');
        return;
    }

    const siteNames = JSON.parse(localStorage.getItem('siteNames') || '[]');
    if (siteNames.some(site => String(site.name).toLowerCase() === siteName.toLowerCase())) {
        notify(t('Nama site sudah ada.', 'Site name already exists.'), 'warning');
        return;
    }

    try {
        if (typeof apiRequest === 'function') {
            await apiRequest('/api/sites', {
                method: 'POST',
                body: { name: siteName },
            });
            if (typeof window.syncSitesFromApi === 'function') {
                await window.syncSitesFromApi().catch(() => {});
            }
        } else {
            const newSite = { id: Date.now(), name: siteName };
            siteNames.push(newSite);
            localStorage.setItem('siteNames', JSON.stringify(siteNames));
        }
    } catch (error) {
        notify(error?.message || t('Gagal menambahkan site.', 'Failed to add site.'), 'error');
        return;
    }

    const refreshedSites = JSON.parse(localStorage.getItem('siteNames') || '[]');

    siteCurrentPage = Math.max(1, Math.ceil(refreshedSites.length / siteItemsPerPage));

    input.value = '';
    await loadSiteNames();
    notify(t('Site berhasil ditambahkan.', 'Site added successfully.'), 'success');
}

function deleteSite(siteId) {
    showAppConfirm({
        title: t('Hapus Site', 'Delete Site'),
        message: t('Apakah Anda yakin ingin menghapus site ini?', 'Are you sure you want to delete this site?'),
        confirmText: t('Hapus', 'Delete'),
        cancelText: t('Batal', 'Cancel'),
        onConfirm: async function() {
            try {
                if (typeof apiRequest === 'function') {
                    await apiRequest(`/api/sites/${Number(siteId)}`, {
                        method: 'DELETE',
                    });
                    if (typeof window.syncSitesFromApi === 'function') {
                        await window.syncSitesFromApi().catch(() => {});
                    }
                } else {
                    const siteNames = JSON.parse(localStorage.getItem('siteNames') || '[]');
                    const next = siteNames.filter(site => Number(site.id) !== Number(siteId));
                    localStorage.setItem('siteNames', JSON.stringify(next));
                }

                const nextSites = JSON.parse(localStorage.getItem('siteNames') || '[]');
                siteCurrentPage = Math.min(siteCurrentPage, Math.max(1, Math.ceil(nextSites.length / siteItemsPerPage)));
                await loadSiteNames();
                notify(t('Site berhasil dihapus.', 'Site deleted successfully.'), 'success');
            } catch (error) {
                notify(error?.message || t('Gagal menghapus site.', 'Failed to delete site.'), 'error');
            }
        }
    });
}

window.approveAttendance = approveAttendance;
window.rejectAttendance = rejectAttendance;
window.openLocationMap = openLocationMap;
window.showFacePreview = showFacePreview;
window.downloadAttachment = downloadAttachment;
window.deleteSite = deleteSite;
