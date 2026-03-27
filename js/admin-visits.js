let adminVisitRecords = [];
let adminUbahingVisitKey = null;
let adminVisitMap = null;
let adminVisitMarker = null;
let adminSelectedLatLng = null;
let adminCurrentPosition = null;
let adminLocationSelectionMode = 'map';

function isEnLang() {
    return document.documentElement.getAttribute('lang') === 'en';
}

function t(idText, enText) {
    return isEnLang() ? enText : idText;
}

function appLocale() {
    return isEnLang() ? 'en-US' : 'id-ID';
}

function mapVisitStatusLabel(status) {
    if (status === 'Aktif') return t('Aktif', 'Active');
    if (status === 'Selesai') return t('Selesai', 'Completed');
    if (status === 'Dibatalkan') return t('Dibatalkan', 'Cancelled');
    return status || '-';
}

document.addEventListener('DOMContentLoaded', async function() {
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

    setupSidebarNav();
    if (typeof window.syncVisitsFromApi === 'function') {
        await window.syncVisitsFromApi().catch(() => {});
    }
    loadClientVisits();

    document.getElementById('addVisitBtn')?.addEventListener('click', addNewVisit);
    document.querySelector('.download-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        exportVisitsCSV();
    });

    document.getElementById('searchMasukan')?.addEventListener('input', handleVisitSearch);
    window.addEventListener('appLanguageChanged', handleAdminVisitLanguageChanged);
});

function handleAdminVisitLanguageChanged() {
    loadClientVisits();
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

function loadClientVisits() {
    const visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');

    adminVisitRecords = visits.map(visit => {
        return {
            ...visit,
            employeeName: resolveVisitEmployeeName(visit),
            status: visit.status || (visit.checkOutTime ? 'Selesai' : 'Aktif'),
            duration: visit.duration || calculateDurationLabel(visit.checkInTime, visit.checkOutTime) || '-'
        };
    }).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    updateVisitStats(adminVisitRecords);
    renderVisitsTable(adminVisitRecords);
}

function updateVisitStats(visits) {
    const today = new Date().toISOString().split('T')[0];

    document.getElementById('visitsCount').textContent = String(visits.filter(v => String(v.visitDate || '').slice(0, 10) === today).length);
    document.getElementById('activeVisitsCount').textContent = String(visits.filter(v => v.status === 'Aktif').length);
    document.getElementById('completedVisitsCount').textContent = String(visits.filter(v => v.status === 'Selesai').length);
    document.getElementById('uniqueClientsCount').textContent = String(new Set(visits.map(v => v.clientName)).size);
}

function renderVisitsTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (!visits.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center">${t('Tidak ada catatan kunjungan ditemukan', 'No visit records found')}</td></tr>`;
        return;
    }

    tbody.innerHTML = visits.map((visit) => `
        <tr>
            <td>${escapeHtml(visit.employeeName || '-')}</td>
            <td>${escapeHtml(visit.clientName || '-')}</td>
            <td>${escapeHtml(visit.clientLocation || '-')}</td>
            <td>${formatDate(visit.visitDate)}</td>
            <td>${visit.checkInTime || '-'}</td>
            <td>${visit.checkOutTime || '-'}</td>
            <td>${visit.duration || '-'}</td>
            <td><span class="badge badge-${getStatusClass(visit.status)}">${mapVisitStatusLabel(visit.status || 'Aktif')}</span></td>
            <td>
                <button class="btn btn-sm" onclick="editVisit(${visit.id}, ${visit.userId})">${t('Ubah', 'Ubah')}</button>
                <button class="btn btn-sm btn-danger" onclick="deleteVisit(${visit.id}, ${visit.userId})">${t('Hapus', 'Delete')}</button>
            </td>
        </tr>
    `).join('');
}

function getStatusClass(status) {
    if (status === 'Selesai') return 'success';
    if (status === 'Dibatalkan') return 'danger';
    return 'warning';
}

function addNewVisit() {
    notify(t('Penambahan kunjungan dilakukan dari portal user, data otomatis sinkron ke admin.', 'Visits are created from the user portal and synced automatically to admin.'), 'info');
}

async function editVisit(visitId, userId) {
    const all = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const index = all.findIndex(v => Number(v.id) === Number(visitId) && String(v.userId) === String(userId));
    if (index === -1) {
        notify(t('Data kunjungan tidak ditemukan.', 'Visit data not found.'), 'warning');
        return;
    }

    const current = all[index];
    const mappedVisit = adminVisitRecords.find(v => Number(v.id) === Number(visitId) && String(v.userId) === String(userId));
    openAdminVisitUbahModal({
        ...current,
        employeeName: mappedVisit?.employeeName || resolveVisitEmployeeName(current)
    }, userId);
}

function deleteVisit(visitId, userId) {
    showAppConfirm({
        title: t('Hapus Kunjungan', 'Delete Visit'),
        message: t('Yakin ingin menghapus catatan kunjungan ini?', 'Are you sure you want to delete this visit record?'),
        confirmText: t('Hapus', 'Delete'),
        cancelText: t('Batal', 'Cancel'),
        onConfirm: async () => {
            try {
                if (typeof apiRequest === 'function') {
                    await apiRequest(`/api/visits/${Number(visitId)}`, {
                        method: 'DELETE',
                    });
                    if (typeof window.syncVisitsFromApi === 'function') {
                        await window.syncVisitsFromApi().catch(() => {});
                    }
                } else {
                    const all = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
                    const next = all.filter(v => !(Number(v.id) === Number(visitId) && String(v.userId) === String(userId)));
                    localStorage.setItem('userClientVisits', JSON.stringify(next));
                }

                notify(t('Catatan kunjungan dihapus.', 'Visit record deleted.'), 'success');
                loadClientVisits();
            } catch (error) {
                notify(error?.message || t('Gagal menghapus kunjungan.', 'Failed to delete visit.'), 'error');
            }
        }
    });
}

function handleVisitSearch(e) {
    const keyword = String(e.target.value || '').toLowerCase().trim();
    if (!keyword) {
        renderVisitsTable(adminVisitRecords);
        return;
    }

    const filtered = adminVisitRecords.filter(visit => [
        visit.employeeName,
        visit.clientName,
        visit.clientLocation,
        visit.status,
        visit.visitPurpose,
        visit.visitNotes,
        visit.visitDate
    ].some(value => String(value || '').toLowerCase().includes(keyword)));

    renderVisitsTable(filtered);
}

function exportVisitsCSV() {
    if (!adminVisitRecords.length) {
        notify(t('Tidak ada data kunjungan untuk diekspor.', 'No visit data to export.'), 'warning');
        return;
    }

    const rows = [];
    rows.push(['Laporan Kunjungan Klien (Admin)']);
    rows.push(['Dibuat Pada', formatVisitsCsvDateTime(new Date())]);
    rows.push(['Dibuat Oleh', currentUser?.name || 'Admin']);
    rows.push(['Total Data', formatVisitsCsvNumber(adminVisitRecords.length)]);
    rows.push([]);

    rows.push(['Tanggal', 'Nama Karyawan', 'Nama Klien', 'Lokasi', 'Check In', 'Check Out', 'Durasi', 'Status', 'Tujuan', 'Catatan', 'Latitude', 'Longitude']);
    adminVisitRecords.forEach(visit => rows.push([
        formatDate(visit.visitDate),
        visit.employeeName || '-',
        visit.clientName || '-',
        visit.clientLocation || '-',
        visit.checkInTime || '-',
        visit.checkOutTime || '-',
        visit.duration || '-',
        mapVisitStatusLabel(visit.status || 'Aktif'),
        visit.visitPurpose || '-',
        String(visit.visitNotes || '-').replace(/\n/g, ' '),
        formatVisitCoordinate(visit.coordinates?.lat),
        formatVisitCoordinate(visit.coordinates?.lng)
    ]));

    const csv = rows
        .map(cols => cols.map(escapeVisitsCsvCell).join(','))
        .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client-visits-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    notify(t('Laporan kunjungan klien berhasil diunduh.', 'Client visit report downloaded successfully.'), 'success');
}

function escapeVisitsCsvCell(value) {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
}

function formatVisitCoordinate(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(6) : '-';
}

function formatVisitsCsvDateTime(dateValue) {
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

function formatVisitsCsvNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString(appLocale()) : '-';
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    if (isNaN(date.getTime())) return String(value);

    return date.toLocaleDateString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}

function timeToMinutes(timeValue) {
    const match = String(timeValue || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    if (isNaN(hour) || isNaN(minute)) return null;

    return (hour * 60) + minute;
}

function calculateDurationLabel(checkInTime, checkOutTime) {
    if (!checkInTime || !checkOutTime) return '';

    const inMinutes = timeToMinutes(checkInTime);
    const outMinutes = timeToMinutes(checkOutTime);
    if (inMinutes === null || outMinutes === null) return '';

    let diff = outMinutes - inMinutes;
    if (diff < 0) diff += 24 * 60;

    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return isEnLang() ? `${hours} hours ${minutes} minutes` : `${hours} jam ${minutes} menit`;
}

function resolveVisitEmployeeName(visit) {
    const employeeId = String(visit?.userId ?? '');
    const employee = (Array.isArray(employees) ? employees : []).find(emp => String(emp?.id ?? '') === employeeId);
    if (employee?.name) {
        return employee.name;
    }

    const registeredUsers = getRegisteredUsersForVisits();
    const registeredUser = registeredUsers.find(user => String(user?.id ?? '') === employeeId);
    if (registeredUser?.name) {
        return registeredUser.name;
    }

    return visit?.employeeName || visit?.username || visit?.userName || `User #${visit?.userId ?? '-'}`;
}

function getRegisteredUsersForVisits() {
    const raw = localStorage.getItem('registeredUsers');
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        return [];
    }
}

function openAdminVisitUbahModal(visit, userId) {
    closeAdminVisitUbahModal();

    adminUbahingVisitKey = {
        visitId: Number(visit.id),
        userId: String(userId)
    };

    const employeeName = escapeHtml(visit.employeeName || visit.username || visit.userName || `User #${userId}`);
    const coordinateSummary = formatCoordinateSummary(visit.coordinates);
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'adminVisitUbahModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 860px; width: min(860px, 96vw);">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> ${t('Ubah Kunjungan Klien', 'Ubah Client Visit')}</h3>
                <button type="button" class="modal-close" data-visit-edit-close>&times;</button>
            </div>
            <div class="modal-body">
                <form id="adminVisitUbahForm" class="elegant-form">
                    <div class="form-section">
                        <h3><i class="fas fa-user-tie"></i> ${t('Informasi Karyawan', 'Employee Information')}</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label>${t('Nama Karyawan', 'Employee Name')}</label>
                                <input type="text" value="${employeeName}" readonly>
                            </div>
                            <div class="form-group">
                                <label>${t('Status Kunjungan *', 'Visit Status *')}</label>
                                <select id="adminUbahVisitStatus" required>
                                    <option value="Aktif" ${String(visit.status || 'Aktif') === 'Aktif' ? 'selected' : ''}>${t('Aktif', 'Active')}</option>
                                    <option value="Selesai" ${String(visit.status || '') === 'Selesai' ? 'selected' : ''}>${t('Selesai', 'Completed')}</option>
                                    <option value="Dibatalkan" ${String(visit.status || '') === 'Dibatalkan' ? 'selected' : ''}>${t('Dibatalkan', 'Cancelled')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3><i class="fas fa-building"></i> Informasi Klien</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminUbahClientName">Nama Klien *</label>
                                <input type="text" id="adminUbahClientName" value="${escapeHtml(visit.clientName || '')}" required>
                            </div>
                            <div class="form-group">
                                <label for="adminUbahClientLocation">Lokasi Klien *</label>
                                <input type="text" id="adminUbahClientLocation" value="${escapeHtml(visit.clientLocation || '')}" required>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3><i class="fas fa-clock"></i> Waktu Kunjungan</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminUbahVisitDate">Tanggal Kunjungan *</label>
                                <input type="date" id="adminUbahVisitDate" value="${escapeAttribute(visit.visitDate || '')}" required>
                            </div>
                            <div class="form-group">
                                <label for="adminUbahCheckInTime">Waktu Check-in *</label>
                                <input type="time" id="adminUbahCheckInTime" value="${escapeAttribute(normalizeTimeValue(visit.checkInTime || ''))}" required>
                            </div>
                            <div class="form-group">
                                <label for="adminUbahCheckOutTime">Waktu Check-out</label>
                                <input type="time" id="adminUbahCheckOutTime" value="${escapeAttribute(normalizeTimeValue(visit.checkOutTime || ''))}">
                            </div>
                            <div class="form-group">
                                <label for="adminUbahVisitDuration">Durasi</label>
                                <input type="text" id="adminUbahVisitDuration" value="${escapeAttribute(visit.duration || calculateDurationLabel(visit.checkInTime, visit.checkOutTime) || '')}" readonly>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3><i class="fas fa-tasks"></i> Detail Kunjungan</h3>
                        <div class="form-group">
                            <label for="adminUbahVisitPurpose">Tujuan Kunjungan *</label>
                            <select id="adminUbahVisitPurpose" required>
                                ${buildVisitPurposeOptions(visit.visitPurpose)}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="adminUbahVisitNotes">Catatan Kunjungan</label>
                            <textarea id="adminUbahVisitNotes" rows="4" placeholder="Tambahkan catatan detail tentang kunjungan ini...">${escapeHtml(visit.visitNotes || '')}</textarea>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3><i class="fas fa-map-marker-alt"></i> Lokasi Tercatat</h3>
                        <div class="location-selector">
                            <div class="location-option">
                                <input type="radio" id="adminUseMapLocation" name="adminLocationType" value="map" checked>
                                <label for="adminUseMapLocation">
                                    <i class="fas fa-mouse-pointer"></i>
                                    <span>Gunakan titik di peta</span>
                                </label>
                            </div>
                            <div class="location-option">
                                <input type="radio" id="adminUseCurrentLocation" name="adminLocationType" value="current">
                                <label for="adminUseCurrentLocation">
                                    <i class="fas fa-location-arrow"></i>
                                    <span>Gunakan lokasi saat ini</span>
                                </label>
                            </div>
                        </div>
                        <div class="location-preview" id="adminVisitLocationPreview" style="margin-bottom:1rem; text-align:left;">${coordinateSummary}</div>
                        <div id="adminVisitMap" style="height:320px; border-radius:0.8rem; overflow:hidden; border:1px solid var(--border-color); margin-bottom:1rem;"></div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminUbahLatitude">Latitude</label>
                                <input type="number" id="adminUbahLatitude" step="0.000001" value="${escapeAttribute(formatCoordinateMasukan(visit.coordinates?.lat))}" placeholder="-6.208800">
                            </div>
                            <div class="form-group">
                                <label for="adminUbahLongitude">Longitude</label>
                                <input type="number" id="adminUbahLongitude" step="0.000001" value="${escapeAttribute(formatCoordinateMasukan(visit.coordinates?.lng))}" placeholder="106.845600">
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" data-visit-edit-close>${t('Batal', 'Cancel')}</button>
                <button type="submit" form="adminVisitUbahForm" class="btn primary">${t('Simpan Perubahan', 'Save Changes')}</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (typeof openOverlayModal === 'function') {
        openOverlayModal(modal);
    } else {
        modal.classList.add('open');
    }

    modal.querySelectorAll('[data-visit-edit-close]').forEach(button => {
        button.addEventListener('click', closeAdminVisitUbahModal);
    });
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeAdminVisitUbahModal();
        }
    });

    modal.querySelector('#adminUbahCheckInTime')?.addEventListener('change', updateAdminVisitDurationField);
    modal.querySelector('#adminUbahCheckOutTime')?.addEventListener('change', updateAdminVisitDurationField);
    modal.querySelector('#adminUbahVisitStatus')?.addEventListener('change', syncAdminVisitStatusFields);
    modal.querySelector('#adminVisitUbahForm')?.addEventListener('submit', handleAdminVisitUbahSubmit);
    modal.querySelector('#adminUbahLatitude')?.addEventListener('change', syncAdminMapFromCoordinateFields);
    modal.querySelector('#adminUbahLongitude')?.addEventListener('change', syncAdminMapFromCoordinateFields);
    modal.querySelectorAll('input[name="adminLocationType"]').forEach(radio => {
        radio.addEventListener('change', updateAdminVisitLocationPreview);
    });

    initializeAdminVisitMap(visit.coordinates);
    syncAdminVisitStatusFields();
}

function closeAdminVisitUbahModal() {
    const modal = document.getElementById('adminVisitUbahModal');
    if (!modal) return;

    adminUbahingVisitKey = null;
    destroyAdminVisitMap();
    if (typeof closeOverlayModal === 'function') {
        closeOverlayModal(modal);
        return;
    }
    modal.remove();
}

function updateAdminVisitDurationField() {
    const modal = document.getElementById('adminVisitUbahModal');
    if (!modal) return;

    const checkIn = modal.querySelector('#adminUbahCheckInTime')?.value || '';
    const checkOut = modal.querySelector('#adminUbahCheckOutTime')?.value || '';
    const durationField = modal.querySelector('#adminUbahVisitDuration');
    if (durationField) {
        durationField.value = calculateDurationLabel(checkIn, checkOut) || '';
    }
}

function syncAdminVisitStatusFields() {
    const modal = document.getElementById('adminVisitUbahModal');
    if (!modal) return;

    const status = modal.querySelector('#adminUbahVisitStatus')?.value || 'Aktif';
    const checkOutMasukan = modal.querySelector('#adminUbahCheckOutTime');
    if (!checkOutMasukan) return;

    if (status === 'Aktif') {
        checkOutMasukan.required = false;
        return;
    }

    checkOutMasukan.required = status === 'Selesai';
}

async function handleAdminVisitUbahSubmit(event) {
    event.preventDefault();

    if (!adminUbahingVisitKey) {
        notify(t('Data kunjungan tidak dipilih.', 'No visit selected.'), 'warning');
        return;
    }

    const all = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const index = all.findIndex(v => Number(v.id) === adminUbahingVisitKey.visitId && String(v.userId) === adminUbahingVisitKey.userId);
    if (index === -1) {
        notify(t('Data kunjungan tidak ditemukan.', 'Visit data not found.'), 'warning');
        closeAdminVisitUbahModal();
        return;
    }

    const modal = document.getElementById('adminVisitUbahModal');
    const status = modal.querySelector('#adminUbahVisitStatus')?.value || 'Aktif';
    const clientName = String(modal.querySelector('#adminUbahClientName')?.value || '').trim();
    const clientLocation = String(modal.querySelector('#adminUbahClientLocation')?.value || '').trim();
    const visitDate = String(modal.querySelector('#adminUbahVisitDate')?.value || '').trim();
    const checkInTime = String(modal.querySelector('#adminUbahCheckInTime')?.value || '').trim();
    const checkOutTime = String(modal.querySelector('#adminUbahCheckOutTime')?.value || '').trim();
    const visitPurpose = String(modal.querySelector('#adminUbahVisitPurpose')?.value || '').trim();
    const visitNotes = String(modal.querySelector('#adminUbahVisitNotes')?.value || '').trim();
    const latitudeValue = String(modal.querySelector('#adminUbahLatitude')?.value || '').trim();
    const longitudeValue = String(modal.querySelector('#adminUbahLongitude')?.value || '').trim();

    if (!clientName || !clientLocation || !visitDate || !checkInTime || !visitPurpose) {
        notify(t('Mohon lengkapi semua field wajib.', 'Please complete all required fields.'), 'warning');
        return;
    }

    if (status === 'Selesai' && !checkOutTime) {
        notify(t('Waktu check-out wajib diisi saat status Selesai.', 'Check-out time is required when status is Completed.'), 'warning');
        return;
    }

    const duration = calculateDurationLabel(checkInTime, checkOutTime);
    const coordinates = buildVisitCoordinates(latitudeValue, longitudeValue, all[index].coordinates);

    const nextVisit = {
        ...all[index],
        clientName,
        clientLocation,
        visitDate,
        checkInTime,
        checkOutTime: status === 'Aktif' ? '' : checkOutTime,
        duration: status === 'Aktif' ? '' : (duration || all[index].duration || ''),
        visitPurpose,
        visitNotes,
        status,
        coordinates
    };

    try {
        if (typeof apiRequest === 'function') {
            const durationMinutes = (() => {
                if (!nextVisit.checkOutTime) return null;
                const inM = timeToMinutes(nextVisit.checkInTime);
                const outM = timeToMinutes(nextVisit.checkOutTime);
                if (inM === null || outM === null) return null;
                return Math.max(0, ((outM - inM) + 1440) % 1440);
            })();

            await apiRequest(`/api/visits/${Number(nextVisit.id)}`, {
                method: 'PUT',
                body: {
                    client_name: nextVisit.clientName,
                    client_location: nextVisit.clientLocation,
                    visit_date: nextVisit.visitDate,
                    check_in_time: nextVisit.checkInTime,
                    check_out_time: nextVisit.checkOutTime || null,
                    duration_minutes: durationMinutes,
                    visit_purpose: nextVisit.visitPurpose,
                    visit_notes: nextVisit.visitNotes,
                    location_type: nextVisit.locationType || 'map',
                    latitude: nextVisit.coordinates?.lat ?? null,
                    longitude: nextVisit.coordinates?.lng ?? null,
                    status: nextVisit.status,
                },
            });
            if (typeof window.syncVisitsFromApi === 'function') {
                await window.syncVisitsFromApi().catch(() => {});
            }
        } else {
            all[index] = nextVisit;
            localStorage.setItem('userClientVisits', JSON.stringify(all));
        }

        closeAdminVisitUbahModal();
        notify(t('Data kunjungan berhasil diperbarui.', 'Visit data updated successfully.'), 'success');
        loadClientVisits();
    } catch (error) {
        notify(error?.message || t('Gagal memperbarui kunjungan.', 'Failed to update visit.'), 'error');
    }
}

function buildVisitCoordinates(latitudeValue, longitudeValue, fallbackCoordinates) {
    const hasLatitude = latitudeValue !== '';
    const hasLongitude = longitudeValue !== '';
    if (!hasLatitude && !hasLongitude) {
        return fallbackCoordinates || null;
    }

    const lat = Number(latitudeValue);
    const lng = Number(longitudeValue);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return fallbackCoordinates || null;
    }

    return { lat, lng };
}

function initializeAdminVisitMap(existingCoordinates) {
    const mapContainer = document.getElementById('adminVisitMap');
    if (!mapContainer) return;

    if (typeof L === 'undefined') {
        const preview = document.getElementById('adminVisitLocationPreview');
        if (preview) {
            preview.innerHTML = `<small>${t('Peta tidak tersedia. Koordinat masih bisa diubah manual.', 'Map is not available. Coordinates can still be edited manually.')}</small>`;
        }
        return;
    }

    destroyAdminVisitMap();

    const startingCoordinates = getInitialAdminVisitCoordinates(existingCoordinates);
    adminSelectedLatLng = startingCoordinates;
    adminVisitMap = L.map(mapContainer).setView([startingCoordinates.lat, startingCoordinates.lng], 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(adminVisitMap);

    setAdminVisitMarker(startingCoordinates, 'Lokasi kunjungan');
    syncAdminCoordinateMasukans(startingCoordinates);

    adminVisitMap.on('click', function(event) {
        if (adminLocationSelectionMode !== 'map') {
            return;
        }

        adminSelectedLatLng = { lat: event.latlng.lat, lng: event.latlng.lng };
        setAdminVisitMarker(adminSelectedLatLng, 'Lokasi dipilih admin');
        syncAdminCoordinateMasukans(adminSelectedLatLng);
        updateAdminVisitLocationPreview();
    });

    setTimeout(() => {
        adminVisitMap?.invalidateSize();
    }, 120);

    updateAdminVisitLocationPreview();
}

function destroyAdminVisitMap() {
    if (adminVisitMap) {
        adminVisitMap.remove();
        adminVisitMap = null;
    }
    adminVisitMarker = null;
    adminSelectedLatLng = null;
    adminLocationSelectionMode = 'map';
}

function getInitialAdminVisitCoordinates(existingCoordinates) {
    const lat = Number(existingCoordinates?.lat);
    const lng = Number(existingCoordinates?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
    }

    return { lat: -6.2088, lng: 106.8456 };
}

function setAdminVisitMarker(latLng, title) {
    if (!adminVisitMap) return;

    if (adminVisitMarker) {
        adminVisitMap.removeLayer(adminVisitMarker);
    }

    adminVisitMarker = L.marker([latLng.lat, latLng.lng]).addTo(adminVisitMap)
        .bindPopup(`${title}: ${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`)
        .openPopup();
}

function getAdminCurrentLocation() {
    if (!navigator.geolocation) {
        notify(t('Browser tidak mendukung geolocation.', 'Browser does not support geolocation.'), 'warning');
        return;
    }

    notify(t('Mengambil lokasi saat ini...', 'Getting current location...'), 'info');
    navigator.geolocation.getCurrentPosition(
        function(position) {
            adminCurrentPosition = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            const currentRadio = document.getElementById('adminUseCurrentLocation');
            if (currentRadio) {
                currentRadio.checked = true;
            }

            adminLocationSelectionMode = 'current';
            adminSelectedLatLng = { ...adminCurrentPosition };
            syncAdminCoordinateMasukans(adminSelectedLatLng);
            if (adminVisitMap) {
                adminVisitMap.setView([adminSelectedLatLng.lat, adminSelectedLatLng.lng], 15);
            }
            setAdminVisitMarker(adminSelectedLatLng, 'Lokasi saat ini');
            updateAdminVisitLocationPreview();
            notify(t('Lokasi saat ini berhasil didapatkan.', 'Current location retrieved successfully.'), 'success');
        },
        function(error) {
            notify(`${t('Gagal mendapatkan lokasi saat ini', 'Failed to get current location')}: ${error.message}`, 'warning');
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
        }
    );
}

function updateAdminVisitLocationPreview() {
    const preview = document.getElementById('adminVisitLocationPreview');
    const checkedRadio = document.querySelector('input[name="adminLocationType"]:checked');
    if (!preview || !checkedRadio) return;

    adminLocationSelectionMode = checkedRadio.value;

    if (adminLocationSelectionMode === 'current') {
        if (adminCurrentPosition) {
            adminSelectedLatLng = { ...adminCurrentPosition };
            syncAdminCoordinateMasukans(adminSelectedLatLng);
            if (adminVisitMap) {
                adminVisitMap.setView([adminSelectedLatLng.lat, adminSelectedLatLng.lng], 15);
            }
            setAdminVisitMarker(adminSelectedLatLng, 'Lokasi saat ini');
            preview.innerHTML = buildLocationPreviewHtml('Lokasi Saat Ini', adminSelectedLatLng);
            return;
        }

        preview.innerHTML = '<small>Mengambil lokasi saat ini...</small>';
        getAdminCurrentLocation();
        return;
    }

    if (adminSelectedLatLng) {
        setAdminVisitMarker(adminSelectedLatLng, 'Lokasi di peta');
        preview.innerHTML = buildLocationPreviewHtml('Lokasi dari Peta', adminSelectedLatLng);
        return;
    }

    preview.innerHTML = '<small>Klik pada peta untuk memilih lokasi</small>';
}

function buildLocationPreviewHtml(title, latLng) {
    return `
        <div>
            <strong>${escapeHtml(title)}</strong><br>
            <small>Latitude: ${latLng.lat.toFixed(6)}</small><br>
            <small>Longitude: ${latLng.lng.toFixed(6)}</small>
        </div>
    `;
}

function syncAdminCoordinateMasukans(latLng) {
    const latMasukan = document.getElementById('adminUbahLatitude');
    const lngMasukan = document.getElementById('adminUbahLongitude');
    if (latMasukan) latMasukan.value = latLng.lat.toFixed(6);
    if (lngMasukan) lngMasukan.value = latLng.lng.toFixed(6);
}

function syncAdminMapFromCoordinateFields() {
    const latMasukan = document.getElementById('adminUbahLatitude');
    const lngMasukan = document.getElementById('adminUbahLongitude');
    if (!latMasukan || !lngMasukan) return;

    const lat = Number(latMasukan.value);
    const lng = Number(lngMasukan.value);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return;
    }

    adminSelectedLatLng = { lat, lng };
    const mapRadio = document.getElementById('adminUseMapLocation');
    if (mapRadio) {
        mapRadio.checked = true;
    }
    adminLocationSelectionMode = 'map';

    if (adminVisitMap) {
        adminVisitMap.setView([lat, lng], 14);
    }
    setAdminVisitMarker(adminSelectedLatLng, 'Lokasi diubah manual');
    updateAdminVisitLocationPreview();
}

function formatCoordinateSummary(coordinates) {
    const lat = Number(coordinates?.lat);
    const lng = Number(coordinates?.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return buildLocationPreviewHtml('Lokasi Tersimpan', { lat, lng });
    }

    return '<small>Belum ada koordinat. Klik pada peta atau gunakan lokasi saat ini.</small>';
}

function buildVisitPurposeOptions(selectedValue) {
    const options = [
        { value: '', label: 'Pilih tujuan kunjungan' },
        { value: 'meeting', label: 'Meeting dengan Klien' },
        { value: 'site_visit', label: 'Kunjungan Site' },
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'installation', label: 'Instalasi' },
        { value: 'training', label: 'Training' },
        { value: 'consultation', label: 'Konsultasi' },
        { value: 'survey', label: 'Survey' },
        { value: 'finance', label: 'Tujuan Keuangan' },
        { value: 'other', label: 'Lainnya' }
    ];

    return options.map(option => `
        <option value="${escapeAttribute(option.value)}" ${option.value === String(selectedValue || '') ? 'selected' : ''}>${escapeHtml(option.label)}</option>
    `).join('');
}

function normalizeTimeValue(timeValue) {
    const match = String(timeValue || '').match(/^(\d{1,2}:\d{2})/);
    return match ? match[1] : '';
}

function formatCoordinateMasukan(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(6) : '';
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#96;');
}
