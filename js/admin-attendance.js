let attendanceRecords = [];
let filteredAttendance = [];
let currentPage = 1;
const itemsPerPage = 6;
let siteCurrentPage = 1;
const siteItemsPerPage = 5;

document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '../index.html';
        return;
    }

    updateUserDisplay();

    document.getElementById('logoutBtn')?.addEventListener('click', (e) => logout(e));

    setupSidebarNav();
    loadAttendanceData();
    loadSiteNames();

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
            status: status
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
        return { label: 'Approved', className: 'approved' };
    }
    if (status === 'rejected') {
        return { label: 'Rejected', className: 'rejected' };
    }
    return { label: 'Pending', className: 'pending' };
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
        container.innerHTML = '<div class="attendance-empty">Tidak ada data presensi untuk filter saat ini.</div>';
        updatePagination();
        return;
    }

    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredAttendance.slice(start, start + itemsPerPage);

    container.innerHTML = `
        <div class="attendance-table-wrap">
            <div class="attendance-table-header attendance-grid-row">
                <div>Karyawan</div>
                <div>Tanggal & Jam</div>
                <div>Tipe</div>
                <div>Lokasi Kerja</div>
                <div>Lokasi GPS</div>
                <div>Face Recognition</div>
                <div>Status</div>
                <div>Aksi</div>
            </div>
            ${pageItems.map(record => {
                const statusMeta = getStatusMeta(record.status);
                const gpsHtml = record.location && typeof record.location.latitude === 'number' && typeof record.location.longitude === 'number'
                    ? `<button type="button" class="attendance-link-btn" onclick="openLocationMap(${record.id})"><i class="fas fa-map-marked-alt"></i> Lihat Peta</button>`
                    : '<span class="attendance-muted">-</span>';

                const facePreviewHtml = record.faceImageWebp
                    ? `<button type="button" class="attendance-link-btn" onclick="showFacePreview(${record.id})"><i class="fas fa-image"></i> Lihat Wajah</button>`
                    : (record.faceVerified ? '<span class="attendance-pill verified">Terverifikasi</span>' : '<span class="attendance-pill unverified">Belum</span>');

                const actionHtml = record.status === 'pending'
                    ? `
                        <div class="attendance-actions">
                            <button type="button" class="attendance-action-btn approve" onclick="approveAttendance(${record.id})"><i class="fas fa-check"></i> Approve</button>
                            <button type="button" class="attendance-action-btn reject" onclick="rejectAttendance(${record.id})"><i class="fas fa-times"></i> Reject</button>
                        </div>
                    `
                    : `<span class="attendance-final attendance-final-${statusMeta.className}">${statusMeta.label}</span>`;

                return `
                    <div class="attendance-table-row attendance-grid-row">
                        <div>
                            <div class="attendance-employee">${escapeHtml(record.employee)}</div>
                            <div class="attendance-meta">ID: ${escapeHtml(record.employeeId || '-')} | ${escapeHtml(record.department || '-')}</div>
                        </div>
                        <div>
                            <div>${formatDate(record.date)}</div>
                            <div class="attendance-meta">${escapeHtml(record.time || '-')}</div>
                        </div>
                        <div>
                            <span class="attendance-type ${record.type === 'checkin' ? 'checkin' : 'checkout'}">${record.type === 'checkin' ? 'Check-in' : 'Check-out'}</span>
                        </div>
                        <div>
                            <div>${escapeHtml(record.workLocation || '-')}</div>
                            <div class="attendance-meta">Site: ${escapeHtml(record.siteName || '-')}</div>
                        </div>
                        <div>
                            ${gpsHtml}
                            ${record.location && typeof record.location.latitude === 'number' ? `<div class="attendance-meta">${record.location.latitude.toFixed(5)}, ${record.location.longitude.toFixed(5)}</div>` : ''}
                        </div>
                        <div>
                            ${facePreviewHtml}
                            ${record.attachment ? `<div class="attendance-meta"><button type="button" class="attendance-link-btn" onclick="downloadAttachment(${record.id})"><i class="fas fa-paperclip"></i> Lampiran</button></div>` : ''}
                        </div>
                        <div>
                            <span class="attendance-status ${statusMeta.className}">${statusMeta.label}</span>
                        </div>
                        <div>
                            ${actionHtml}
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

    return date.toLocaleDateString('id-ID', {
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
            return date.toLocaleTimeString('id-ID', {
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

function updatePresensiRecordStatus(recordId, status) {
    const raw = JSON.parse(localStorage.getItem('presensiData') || '[]');
    const idx = raw.findIndex(item => Number(item.id) === Number(recordId));
    if (idx >= 0) {
        raw[idx].status = status;
        raw[idx].approved = status === 'approved';
        raw[idx].rejected = status === 'rejected';
        localStorage.setItem('presensiData', JSON.stringify(raw));
    }
}

function approveAttendance(id) {
    const record = attendanceRecords.find(item => Number(item.id) === Number(id));
    if (!record) return;

    record.status = 'approved';
    record.approved = true;
    updatePresensiRecordStatus(id, 'approved');

    notify('Presensi berhasil di-approve.', 'success');
    filterAttendanceRecords();
}

function rejectAttendance(id) {
    const record = attendanceRecords.find(item => Number(item.id) === Number(id));
    if (!record) return;

    record.status = 'rejected';
    record.approved = false;
    updatePresensiRecordStatus(id, 'rejected');

    notify('Presensi ditandai reject.', 'warning');
    filterAttendanceRecords();
}

function approveAllAttendance() {
    let changed = 0;
    attendanceRecords.forEach(record => {
        if (record.status === 'pending') {
            record.status = 'approved';
            record.approved = true;
            updatePresensiRecordStatus(record.id, 'approved');
            changed += 1;
        }
    });

    notify(`${changed} data presensi di-approve.`, 'success');
    filterAttendanceRecords();
}

function rejectAllAttendance() {
    let changed = 0;
    attendanceRecords.forEach(record => {
        if (record.status === 'pending') {
            record.status = 'rejected';
            record.approved = false;
            updatePresensiRecordStatus(record.id, 'rejected');
            changed += 1;
        }
    });

    notify(`${changed} data presensi di-reject.`, 'warning');
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
        notify('Koordinat tidak tersedia.', 'warning');
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
            <div style="font-size:0.92rem; color:#334155;">
                <strong>Koordinat:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}<br>
                <strong>Akurasi:</strong> ${Number(record.location.accuracy || 0).toFixed(1)} meter
            </div>
            <iframe src="${mapUrl}" style="width:100%; height:380px; border:1px solid #cbd5e1; border-radius:0.7rem;" loading="lazy"></iframe>
            <a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener" class="btn primary" style="width:max-content;">Buka di Google Maps</a>
        </div>
    `;

    showMapModal('Detail Lokasi Presensi', html);
}

function showFacePreview(recordId) {
    const record = attendanceRecords.find(item => Number(item.id) === Number(recordId));
    if (!record || !record.faceImageWebp) {
        notify('Foto wajah belum tersedia.', 'warning');
        return;
    }

    const sizeKb = record.faceImageSizeBytes ? `${(record.faceImageSizeBytes / 1024).toFixed(1)} KB` : '-';
    const html = `
        <div style="display:grid; gap:0.85rem;">
            <div style="font-size:0.92rem; color:#334155;">
                <strong>Format:</strong> WEBP<br>
                <strong>Ukuran:</strong> ${sizeKb}
            </div>
            <img src="${record.faceImageWebp}" alt="Face Capture" style="width:100%; max-height:420px; object-fit:contain; border:1px solid #cbd5e1; border-radius:0.7rem; background:#f8fafc;" />
        </div>
    `;

    showMapModal('Face Recognition Preview', html);
}

function downloadAttachment(recordId) {
    const record = attendanceRecords.find(item => Number(item.id) === Number(recordId));
    if (!record || !record.attachment || !record.attachment.dataUrl) {
        notify('Lampiran tidak tersedia.', 'warning');
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

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}

function formatAttendanceCsvDateTime(dateValue) {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString('id-ID', {
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
    return Number.isFinite(num) ? num.toLocaleString('id-ID') : '-';
}

function loadSiteNames() {
    let siteNames = JSON.parse(localStorage.getItem('siteNames') || '[]');

    if (siteNames.length === 0) {
        siteNames = [
            { id: 1, name: 'Kantor Pusat Bekasi' },
            { id: 2, name: 'Kantor Cabang Jakarta' },
            { id: 3, name: 'Site Project A' },
            { id: 4, name: 'Site Project B' },
            { id: 5, name: 'Kantor Client X' }
        ];
        localStorage.setItem('siteNames', JSON.stringify(siteNames));
    }

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
            <button onclick="deleteSite(${site.id})" style="background: #ef4444; color: white; border: none; padding: 0.25rem 0.5rem; border-radius: 0.25rem; cursor: pointer; font-size: 0.8rem;">Hapus</button>
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

function addSite() {
    const input = document.getElementById('newSiteName');
    if (!input) return;

    const siteName = String(input.value || '').trim();
    if (!siteName) {
        notify('Silakan masukkan nama site.', 'warning');
        return;
    }

    const siteNames = JSON.parse(localStorage.getItem('siteNames') || '[]');
    if (siteNames.some(site => String(site.name).toLowerCase() === siteName.toLowerCase())) {
        notify('Nama site sudah ada.', 'warning');
        return;
    }

    const newSite = { id: Date.now(), name: siteName };
    siteNames.push(newSite);
    localStorage.setItem('siteNames', JSON.stringify(siteNames));

    siteCurrentPage = Math.max(1, Math.ceil(siteNames.length / siteItemsPerPage));

    input.value = '';
    loadSiteNames();
    notify('Site berhasil ditambahkan.', 'success');
}

function deleteSite(siteId) {
    showAppConfirm({
        title: 'Hapus Site',
        message: 'Apakah Anda yakin ingin menghapus site ini?',
        confirmText: 'Hapus',
        cancelText: 'Batal',
        onConfirm: function() {
            const siteNames = JSON.parse(localStorage.getItem('siteNames') || '[]');
            const next = siteNames.filter(site => Number(site.id) !== Number(siteId));
            localStorage.setItem('siteNames', JSON.stringify(next));
            siteCurrentPage = Math.min(siteCurrentPage, Math.max(1, Math.ceil(next.length / siteItemsPerPage)));
            loadSiteNames();
            notify('Site berhasil dihapus.', 'success');
        }
    });
}

window.approveAttendance = approveAttendance;
window.rejectAttendance = rejectAttendance;
window.openLocationMap = openLocationMap;
window.showFacePreview = showFacePreview;
window.downloadAttachment = downloadAttachment;
window.deleteSite = deleteSite;
