// User Client Visits Page
document.addEventListener('DOMContentLoaded', async function () {
    // Check authentication
    checkAuthStatus();
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }

    // Set user avatar and name
    updateUserDisplay();

    // Initialize map
    initializeMap();

    if (typeof window.syncVisitsFromApi === 'function') {
        await window.syncVisitsFromApi().catch(() => { });
    }

    // Initialize face detection properties
    isVisitFaceCaptured = false;
    visitFaceDataUrl = '';
    isEditVisitFaceCaptured = false;
    editVisitFaceDataUrl = '';
    visitVideoStream = null;

    // Load client visit data
    loadClientVisits();

    // Set up camera buttons
    document.getElementById('startVisitCameraBtn')?.addEventListener('click', startVisitCamera);
    document.getElementById('captureVisitFaceBtn')?.addEventListener('click', captureVisitFace);
    document.getElementById('startEditVisitCameraBtn')?.addEventListener('click', startEditVisitCamera);
    document.getElementById('captureEditVisitFaceBtn')?.addEventListener('click', captureEditVisitFace);

    // Set up add visit button
    document.getElementById('addVisitBtn')?.addEventListener('click', addNewVisit);
    document.getElementById('getCurrentLocationBtn')?.addEventListener('click', getCurrentLocation);

    // Table search
    document.getElementById('searchMasukan')?.addEventListener('input', handleVisitSearch);

    // Set up modal event listeners
    setupModalListeners();

    window.addEventListener('appLanguageChanged', handleClientVisitLanguageChanged);
});

function handleClientVisitLanguageChanged() {
    loadClientVisits();
}

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





let map;
let selectedLatLng = null;
let editingVisitId = null;
let userVisitsCache = [];
let locationSelectionMode = 'map';
let activeMapMarker = null;
let visitVideoStream = null;
let isVisitFaceCaptured = false;
let visitFaceDataUrl = '';
let isEditVisitFaceCaptured = false;
let editVisitFaceDataUrl = '';
let visitGeoGuardResult = null;

const visitsTableSliderState = {
    items: [],
    start: 0,
    viewSize: 5
};
let visitsTableResizeTimer = null;

function initializeMap() {
    // Initialize Leaflet map
    map = L.map('map').setView([-6.2088, 106.8456], 10); // Default to Jakarta

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add click event to map
    map.on('click', function (e) {
        // In current-location mode, map click is ignored to keep marker fixed.
        if (locationSelectionMode !== 'map') {
            return;
        }

        selectedLatLng = e.latlng;
        setMapMarker(e.latlng, 'Lokasi terpilih');
    });
}

function setMapMarker(latLng, title) {
    if (activeMapMarker) {
        map.removeLayer(activeMapMarker);
    }

    activeMapMarker = L.marker(latLng).addTo(map)
        .bindPopup(`${title}: ${latLng.lat.toFixed(6)}, ${latLng.lng.toFixed(6)}`)
        .openPopup();
}

async function getCurrentLocation() {
    const locationPreview = document.getElementById('locationPreview');
    const checkoutPreview = document.getElementById('checkoutLocationPreview');

    if (locationPreview) locationPreview.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Menverifikasi lokasi GPS (Anti-Fake GPS)...</p>';
    if (checkoutPreview) checkoutPreview.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> Menverifikasi lokasi GPS (Anti-Fake GPS)...</p>';

    if (typeof GeoGuard !== 'undefined') {
        try {
            const result = await GeoGuard.collectAndAnalyze({
                onProgress: (count, total) => {
                    const pct = Math.round((count / total) * 100);
                    if (locationPreview) locationPreview.innerHTML = `<p><i class="fas fa-search"></i> Mengumpulkan sampel GPS: ${count}/${total} (${pct}%)</p>`;
                    if (checkoutPreview) checkoutPreview.innerHTML = `<p><i class="fas fa-search"></i> Mengumpulkan sampel GPS: ${count}/${total} (${pct}%)</p>`;
                }
            });

            visitGeoGuardResult = result;
            selectedLatLng = { lat: result.position.latitude, lng: result.position.longitude };
            window.currentPosition = selectedLatLng;

            const accuracy = result.position.accuracy.toFixed(1);
            const statusHtml = `
                <div style="text-align: left; background: rgba(16, 185, 129, 0.1); padding: 8px; border-radius: 8px; border-left: 4px solid #10b981;">
                    <strong><i class="fas fa-check-circle"></i> Lokasi Berhasil Diverifikasi</strong><br>
                    <small>Lat: ${selectedLatLng.lat.toFixed(6)}, Lng: ${selectedLatLng.lng.toFixed(6)}</small><br>
                    <small>Akurasi: ${accuracy} meter | ${result.isSuspicious ? '⚠ Perlu validasi server' : '✅ Aman'}</small>
                </div>
            `;

            if (locationPreview) locationPreview.innerHTML = statusHtml;
            if (checkoutPreview) checkoutPreview.innerHTML = statusHtml;

            // Center map
            if (map) map.setView([selectedLatLng.lat, selectedLatLng.lng], 15);
            setMapMarker(selectedLatLng, 'Lokasi saat ini');

            return result;
        } catch (error) {
            const errHtml = `<p class="error" style="color:#ef4444;"><i class="fas fa-times-circle"></i> ${error.message}</p>`;
            if (locationPreview) locationPreview.innerHTML = errHtml;
            if (checkoutPreview) checkoutPreview.innerHTML = errHtml;
            throw error;
        }
    }

    // Fallback to basic geolocation
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            const msg = 'Geolocation tidak didukung oleh browser ini.';
            alert(msg);
            return reject(new Error(msg));
        }

        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            selectedLatLng = { lat, lng };
            window.currentPosition = selectedLatLng;

            if (map) map.setView([lat, lng], 15);
            setMapMarker({ lat, lng }, 'Lokasi saat ini');

            if (locationPreview) updateLocationPreview();
            if (checkoutPreview) checkoutPreview.innerHTML = `<small>Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}</small>`;

            resolve({ position: { latitude: lat, longitude: lng, accuracy: position.coords.accuracy } });
        }, error => {
            const msg = 'Error mendapatkan lokasi: ' + error.message;
            alert(msg);
            reject(error);
        }, { enableHighAccuracy: true });
    });
}

function loadClientVisits() {
    // Load visits from localStorage
    const visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const userVisits = visits
        .filter(visit => visit.userId === currentUser.id)
        .map(visit => ({
            ...visit,
            status: visit.status || 'Aktif',
            checkOutTime: visit.checkOutTime || '',
            duration: visit.duration || calculateDurationLabel(visit.checkInTime, visit.checkOutTime) || ''
        }));

    userVisitsCache = userVisits;

    // Update stats
    document.getElementById('visitsCount').textContent = userVisits.length;
    document.getElementById('activeVisitsCount').textContent = userVisits.filter(v => v.status === 'Aktif').length;
    document.getElementById('completedVisitsCount').textContent = userVisits.filter(v => v.status === 'Selesai').length;
    document.getElementById('uniqueClientsCount').textContent = new Set(userVisits.map(v => v.clientName)).size;

    renderVisitsTable(userVisits);
}

function getVisitsTableViewSize() {
    return window.innerWidth <= 768 ? 3 : 5;
}

function ensureVisitsTableSlider() {
    const tableBody = document.getElementById('visitsTableBody');
    if (!tableBody) return;

    const card = tableBody.closest('.card');
    const cardHeader = card ? card.querySelector('.card-header') : null;
    if (!cardHeader) return;

    let sliderNav = document.getElementById('userVisitsSliderNav');
    if (!sliderNav) {
        sliderNav = document.createElement('div');
        sliderNav.id = 'userVisitsSliderNav';
        sliderNav.className = 'dashboard-slider-nav';
        sliderNav.innerHTML = `
            <button type="button" id="userVisitsPrevBtn" class="dashboard-slider-btn" aria-label="Kunjungan sebelumnya">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span id="userVisitsIndicator" class="dashboard-slider-indicator">1/1</span>
            <button type="button" id="userVisitsNextBtn" class="dashboard-slider-btn" aria-label="Kunjungan berikutnya">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        cardHeader.appendChild(sliderNav);

        document.getElementById('userVisitsPrevBtn')?.addEventListener('click', function () {
            shiftVisitsTableSlider(-1);
        });
        document.getElementById('userVisitsNextBtn')?.addEventListener('click', function () {
            shiftVisitsTableSlider(1);
        });
    }

    const shouldShow = visitsTableSliderState.items.length > visitsTableSliderState.viewSize;
    sliderNav.style.display = shouldShow ? 'inline-flex' : 'none';
}

function updateVisitsTableSliderControls() {
    const prevBtn = document.getElementById('userVisitsPrevBtn');
    const nextBtn = document.getElementById('userVisitsNextBtn');
    const indicator = document.getElementById('userVisitsIndicator');

    const pagination = getPagedSliderMeta(visitsTableSliderState.items.length, visitsTableSliderState.viewSize, visitsTableSliderState.start);
    visitsTableSliderState.start = pagination.startIndex;

    if (prevBtn) prevBtn.disabled = !pagination.hasPrev;
    if (nextBtn) nextBtn.disabled = !pagination.hasNext;
    if (indicator) indicator.textContent = `${pagination.currentPage + 1}/${pagination.totalPages}`;
}

function shiftVisitsTableSlider(direction) {
    visitsTableSliderState.start = shiftPagedSliderStart(
        visitsTableSliderState.items.length,
        visitsTableSliderState.viewSize,
        visitsTableSliderState.start,
        direction
    );
    renderVisitsTableWindow();
}

function renderVisitsTableWindow() {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    const allVisits = visitsTableSliderState.items;
    if (!allVisits.length) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">${t('Belum ada catatan kunjungan', 'No visit records yet')}</td></tr>`;
        const sliderNav = document.getElementById('userVisitsSliderNav');
        if (sliderNav) sliderNav.style.display = 'none';
        return;
    }

    const pagination = getPagedSliderMeta(allVisits.length, visitsTableSliderState.viewSize, visitsTableSliderState.start);
    visitsTableSliderState.start = pagination.startIndex;
    const start = pagination.startIndex;
    const end = start + visitsTableSliderState.viewSize;
    const visibleVisits = allVisits.slice(start, end);

    tbody.innerHTML = visibleVisits.map((visit, index) => {
        const statusClass = getStatusBadgeClass(visit.status || 'Aktif');
        const checkOutTime = visit.checkOutTime || '-';
        const duration = visit.duration || calculateDurationLabel(visit.checkInTime, visit.checkOutTime) || '-';

        return `
        <tr class="dashboard-slide-item" style="--slide-index:${index};">
            <td>${visit.clientName}</td>
            <td>${visit.clientLocation}</td>
            <td>${formatDisplayDate(visit.visitDate)}</td>
            <td>${visit.checkInTime}</td>
            <td>${checkOutTime}</td>
            <td>${duration}</td>
            <td><span class="badge badge-${statusClass}">${mapVisitStatusLabel(visit.status || 'Aktif')}</span></td>
            <td class="table-actions">
                <button class="btn btn-sm" onclick="editVisit(${visit.id})">${t('Ubah Status', 'Ubah Status')}</button>
                <button class="btn btn-sm btn-danger" onclick="deleteVisit(${visit.id})">${t('Hapus', 'Delete')}</button>
            </td>
        </tr>
    `;
    }).join('');

    ensureVisitsTableSlider();
    updateVisitsTableSliderControls();
}

function setupVisitsTableResizeHandler() {
    window.addEventListener('resize', function () {
        clearTimeout(visitsTableResizeTimer);
        visitsTableResizeTimer = setTimeout(function () {
            const nextViewSize = getVisitsTableViewSize();
            if (nextViewSize === visitsTableSliderState.viewSize) return;

            visitsTableSliderState.viewSize = nextViewSize;
            visitsTableSliderState.start = getPagedSliderMeta(
                visitsTableSliderState.items.length,
                nextViewSize,
                visitsTableSliderState.start
            ).startIndex;
            renderVisitsTableWindow();
        }, 150);
    });
}

function renderVisitsTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (!visits || visits.length === 0) {
        visitsTableSliderState.items = [];
        visitsTableSliderState.start = 0;
        renderVisitsTableWindow();
        return;
    }

    // Sort by date (newest first)
    const sortedVisits = [...visits].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    visitsTableSliderState.items = sortedVisits;
    visitsTableSliderState.viewSize = getVisitsTableViewSize();
    visitsTableSliderState.start = getPagedSliderMeta(
        visitsTableSliderState.items.length,
        visitsTableSliderState.viewSize,
        visitsTableSliderState.start
    ).startIndex;
    renderVisitsTableWindow();
}

function handleVisitSearch(e) {
    const keyword = String(e.target.value || '').toLowerCase().trim();
    if (!keyword) {
        renderVisitsTable(userVisitsCache);
        return;
    }

    const filtered = userVisitsCache.filter(visit => {
        const visitDate = visit.visitDate ? formatDisplayDate(visit.visitDate) : '';
        return [
            visit.clientName,
            visit.clientLocation,
            visit.status,
            visit.checkInTime,
            visit.checkOutTime,
            visitDate
        ].some(value => String(value || '').toLowerCase().includes(keyword));
    });

    renderVisitsTable(filtered);
}

function formatDisplayDate(dateValue) {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}

function addNewVisit() {
    // Reset face capture state
    isVisitFaceCaptured = false;
    visitFaceDataUrl = '';

    const faceStatus = document.getElementById('visitFaceStatus');
    if (faceStatus) {
        faceStatus.textContent = 'Status: Kamera belum dimulai';
        faceStatus.style.color = '';
    }

    const video = document.getElementById('visitVideo');
    const canvas = document.getElementById('visitCanvas');
    if (video) video.style.display = 'block';
    if (canvas) canvas.style.display = 'none';

    // Show modal
    const modal = document.getElementById('addVisitModal');
    modal.style.display = 'block';

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('visitDate').value = today;

    // Set default time to current time
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    document.getElementById('checkInTime').value = currentTime;
    document.getElementById('checkOutTime').value = '';
    document.getElementById('visitDuration').value = '';

    // Update location preview
    updateLocationPreview();

    // Focus on first input
    document.getElementById('clientName').focus();
}

function editVisit(visitId) {
    // Reset face capture state
    isEditVisitFaceCaptured = false;
    editVisitFaceDataUrl = '';

    const faceStatus = document.getElementById('editVisitFaceStatus');
    if (faceStatus) {
        faceStatus.textContent = 'Status: Kamera belum dimulai';
        faceStatus.style.color = '';
    }

    const video = document.getElementById('editVisitVideo');
    const canvas = document.getElementById('editVisitCanvas');
    if (video) video.style.display = 'block';
    if (canvas) canvas.style.display = 'none';

    const visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const visit = visits.find(v => Number(v.id) === Number(visitId) && String(v.userId) === String(currentUser.id));

    if (!visit) {
        alert('Data kunjungan tidak ditemukan.');
        return;
    }

    editingVisitId = visitId;

    document.getElementById('editClientName').value = visit.clientName || '';
    document.getElementById('editVisitDate').value = visit.visitDate || '';
    document.getElementById('editVisitStatus').value = visit.status || 'Aktif';
    document.getElementById('editCheckOutTime').value = visit.checkOutTime || '';
    document.getElementById('editVisitDuration').value = visit.duration || calculateDurationLabel(visit.checkInTime, visit.checkOutTime) || '';

    document.getElementById('editVisitModal').style.display = 'block';
}

// Export visits data
document.querySelector('.download-btn')?.addEventListener('click', function (e) {
    e.preventDefault();
    exportClientVisitsCSV();
});

function exportClientVisitsCSV() {
    const allVisits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const ownVisits = allVisits
        .filter(visit => String(visit.userId) === String(currentUser?.id || ''))
        .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    if (!ownVisits.length) {
        notify('Belum ada catatan kunjungan untuk diekspor.', 'warning');
        return;
    }

    const header = [
        'Tanggal',
        'Nama Klien',
        'Lokasi Klien',
        'Check In',
        'Check Out',
        'Durasi',
        'Status',
        'Tujuan',
        'Catatan',
        'Latitude',
        'Longitude',
        'Dibuat Pada'
    ];

    const dataRows = ownVisits.map(visit => [
        formatDisplayDate(visit.visitDate),
        visit.clientName || '-',
        visit.clientLocation || '-',
        visit.checkInTime || '-',
        visit.checkOutTime || '-',
        visit.duration || calculateDurationLabel(visit.checkInTime, visit.checkOutTime) || '-',
        visit.status || '-',
        visit.visitPurpose || '-',
        visit.visitNotes || '-',
        formatCoordinate(visit.coordinates?.lat),
        formatCoordinate(visit.coordinates?.lng),
        formatCreatedAtDate(visit.timestamp)
    ]);

    const rows = [];
    rows.push(['Laporan Kunjungan Klien']);
    rows.push(['Dibuat Pada', formatCreatedAtDate(new Date())]);
    rows.push(['Dibuat Oleh', currentUser?.name || 'User']);
    rows.push(['Total Data', formatCsvNumber(ownVisits.length)]);
    rows.push([]);
    rows.push(header);
    rows.push(...dataRows);

    const csv = rows
        .map(cols => cols.map(value => escapeCsvValue(value)).join(','))
        .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kunjungan-klien-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    notify('Laporan kunjungan berhasil diekspor.', 'success');
}

function escapeCsvValue(value) {
    const text = String(value ?? '-').replace(/"/g, '""');
    return `"${text}"`;
}

function formatCreatedAtDate(dateValue) {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).toLowerCase();
}

function formatCoordinate(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toFixed(6) : '-';
}

function formatCsvNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString(appLocale()) : '-';
}

function setupModalListeners() {
    const modal = document.getElementById('addVisitModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('addVisitForm');
    const checkInMasukan = document.getElementById('checkInTime');
    const checkOutMasukan = document.getElementById('checkOutTime');

    const editModal = document.getElementById('editVisitModal');
    const closeUbahBtn = document.getElementById('closeUbahModalBtn');
    const cancelUbahBtn = document.getElementById('cancelUbahBtn');
    const editForm = document.getElementById('editVisitForm');
    const editCheckOutMasukan = document.getElementById('editCheckOutTime');

    // Close modal events
    closeBtn?.addEventListener('click', () => modal.style.display = 'none');
    cancelBtn?.addEventListener('click', () => modal.style.display = 'none');

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
        if (e.target === editModal) {
            editModal.style.display = 'none';
        }
    });

    // Form submission
    form?.addEventListener('submit', handleAddVisitForm);

    // Auto duration field updates in add form
    checkInMasukan?.addEventListener('change', updateAddDurationField);
    checkOutMasukan?.addEventListener('change', updateAddDurationField);

    // Location type change
    const locationRadios = document.querySelectorAll('input[name="locationType"]');
    locationRadios.forEach(radio => {
        radio.addEventListener('change', updateLocationPreview);
    });

    // Ubah modal listeners
    closeUbahBtn?.addEventListener('click', () => editModal.style.display = 'none');
    cancelUbahBtn?.addEventListener('click', () => editModal.style.display = 'none');
    editForm?.addEventListener('submit', handleUbahVisitForm);
    editCheckOutMasukan?.addEventListener('change', updateUbahDurationField);
}

function updateAddDurationField() {
    const checkIn = document.getElementById('checkInTime').value;
    const checkOut = document.getElementById('checkOutTime').value;
    document.getElementById('visitDuration').value = calculateDurationLabel(checkIn, checkOut) || '';
}

function updateUbahDurationField() {
    const visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const visit = visits.find(v => Number(v.id) === Number(editingVisitId) && String(v.userId) === String(currentUser.id));
    const checkIn = visit ? visit.checkInTime : '';
    const checkOut = document.getElementById('editCheckOutTime').value;
    document.getElementById('editVisitDuration').value = calculateDurationLabel(checkIn, checkOut) || '';
}

function timeToMinutes(timeValue) {
    const match = String(timeValue || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;

    return (hours * 60) + minutes;
}

function calculateDurationLabel(checkInTime, checkOutTime) {
    if (!checkInTime || !checkOutTime) return '';

    const inMinutes = timeToMinutes(checkInTime);
    const outMinutes = timeToMinutes(checkOutTime);
    if (inMinutes === null || outMinutes === null) return '';

    let diff = outMinutes - inMinutes;
    if (diff < 0) {
        diff += 24 * 60;
    }

    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours} jam ${minutes} menit`;
}

function getStatusBadgeClass(status) {
    if (status === 'Selesai') return 'success';
    if (status === 'Dibatalkan') return 'danger';
    return 'warning';
}

function updateLocationPreview() {
    const preview = document.getElementById('locationPreview');
    const selectedType = document.querySelector('input[name="locationType"]:checked').value;
    const mapContainer = map?.getContainer();

    locationSelectionMode = selectedType;

    if (mapContainer) {
        mapContainer.style.cursor = selectedType === 'map' ? 'crosshair' : 'not-allowed';
    }

    if (selectedType === 'map') {
        if (selectedLatLng) {
            preview.innerHTML = `
                <div style="text-align: left;">
                    <strong>Lokasi dari Peta:</strong><br>
                    <small>Latitude: ${selectedLatLng.lat.toFixed(6)}</small><br>
                    <small>Longitude: ${selectedLatLng.lng.toFixed(6)}</small>
                </div>
            `;
        } else {
            preview.innerHTML = '<small>Klik pada peta untuk memilih lokasi</small>';
        }
    } else {
        if (window.currentPosition) {
            selectedLatLng = { lat: window.currentPosition.lat, lng: window.currentPosition.lng };
            setMapMarker(selectedLatLng, 'Lokasi saat ini');

            preview.innerHTML = `
                <div style="text-align: left;">
                    <strong>Lokasi Saat Ini:</strong><br>
                    <small>Latitude: ${window.currentPosition.lat.toFixed(6)}</small><br>
                    <small>Longitude: ${window.currentPosition.lng.toFixed(6)}</small>
                </div>
            `;
        } else {
            preview.innerHTML = '<small>Mengambil lokasi saat ini...</small>';
            getCurrentLocation();
        }
    }
}

async function handleAddVisitForm(e) {
    e.preventDefault();

    // Validate face capture
    if (!isVisitFaceCaptured || !visitFaceDataUrl) {
        alert('Foto wajah wajib diambil untuk verifikasi check-in.');
        return;
    }

    // Ensure we have fresh location
    if (!visitGeoGuardResult) {
        try {
            await getCurrentLocation();
        } catch (err) {
            alert('Gagal mendapatkan lokasi GPS: ' + err.message);
            return;
        }
    }

    // Get form data
    const formData = {
        clientName: document.getElementById('clientName').value.trim(),
        clientLocation: document.getElementById('clientLocation').value.trim(),
        visitDate: document.getElementById('visitDate').value,
        checkInTime: document.getElementById('checkInTime').value,
        checkOutTime: document.getElementById('checkOutTime').value,
        duration: document.getElementById('visitDuration').value,
        visitPurpose: document.getElementById('visitPurpose').value,
        visitNotes: document.getElementById('visitNotes').value.trim(),
        locationType: 'current',
        timestamp: new Date().toISOString(),
        faceData: visitFaceDataUrl,
        geoRiskScore: visitGeoGuardResult?.riskScore,
        geoFlags: visitGeoGuardResult?.flags,
        positionSamples: visitGeoGuardResult?.accuracySamples,
        accuracy: visitGeoGuardResult?.position?.accuracy
    };

    // Validate required fields
    if (!formData.clientName || !formData.clientLocation || !formData.visitDate ||
        !formData.checkInTime || !formData.visitPurpose) {
        alert('Mohon lengkapi semua field yang wajib diisi.');
        return;
    }

    // Get location coordinates
    const coordinates = selectedLatLng;

    if (!coordinates) {
        alert('Lokasi belum tersedia. Silakan dapatkan lokasi saat ini.');
        return;
    }

    // Add coordinates to form data
    formData.coordinates = coordinates;

    // Save visit data
    const saved = await saveVisitData(formData);
    if (!saved) return;

    // Show success message
    alert(`Kunjungan ke ${formData.clientName} berhasil ditambahkan!`);

    // Close modal and reset form
    document.getElementById('addVisitModal').style.display = 'none';
    e.target.reset();
    stopVisitCamera();

    // Reload visits
    loadClientVisits();
}

async function handleUbahVisitForm(e) {
    e.preventDefault();

    if (!editingVisitId) {
        alert('Tidak ada data kunjungan yang dipilih untuk diedit.');
        return;
    }

    const status = document.getElementById('editVisitStatus').value;
    const checkOutTime = document.getElementById('editCheckOutTime').value;

    // Check if status is Selesai, if so, face and location are mandatory
    if (status === 'Selesai') {
        if (!isEditVisitFaceCaptured || !editVisitFaceDataUrl) {
            alert('Foto wajah wajib diambil untuk verifikasi check-out (penyelesaian kunjungan).');
            return;
        }

        try {
            await getCurrentLocation();
        } catch (err) {
            alert('Gagal mendapatkan lokasi GPS check-out: ' + err.message);
            return;
        }
    }

    let visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const index = visits.findIndex(v => Number(v.id) === Number(editingVisitId) && String(v.userId) === String(currentUser.id));

    if (index === -1) {
        alert('Data kunjungan tidak ditemukan.');
        return;
    }

    const visit = visits[index];
    const durationLabel = calculateDurationLabel(visit.checkInTime, checkOutTime);
    const durationMinutes = durationLabel ? Math.max(0, Math.round((timeToMinutes(checkOutTime) - timeToMinutes(visit.checkInTime) + 1440) % 1440)) : null;

    try {
        if (typeof apiRequest === 'function') {
            await apiRequest(`/api/visits/${Number(visit.id)}`, {
                method: 'PUT',
                body: {
                    client_name: visit.clientName,
                    client_location: visit.clientLocation,
                    visit_date: visit.visitDate,
                    check_in_time: visit.checkInTime,
                    check_out_time: checkOutTime || null,
                    duration_minutes: durationMinutes,
                    visit_purpose: visit.visitPurpose,
                    visit_notes: visit.visitNotes,
                    location_type: visit.locationType || 'map',
                    latitude: visit.coordinates?.lat ?? null,
                    longitude: visit.coordinates?.lng ?? null,
                    status: status,
                    // New fields for checkout
                    checkout_latitude: selectedLatLng?.lat || null,
                    checkout_longitude: selectedLatLng?.lng || null,
                    checkout_accuracy_meters: visitGeoGuardResult?.position?.accuracy || null,
                    checkout_geo_risk_score: visitGeoGuardResult?.geoRiskScore || 0,
                    checkout_geo_flags: visitGeoGuardResult?.geoFlags ? JSON.stringify(visitGeoGuardResult.geoFlags) : null,
                    checkout_position_samples: visitGeoGuardResult?.positionSamples ? JSON.stringify(visitGeoGuardResult.positionSamples) : null,
                    checkout_face_image_data: editVisitFaceDataUrl || null,
                },
            });
            if (typeof window.syncVisitsFromApi === 'function') {
                await window.syncVisitsFromApi().catch(() => { });
            }
        } else {
            visits[index] = {
                ...visit,
                status,
                checkOutTime: checkOutTime || '',
                duration: durationLabel || visit.duration || ''
            };
            localStorage.setItem('userClientVisits', JSON.stringify(visits));
        }
    } catch (error) {
        alert(error?.message || 'Gagal memperbarui kunjungan.');
        return;
    }

    document.getElementById('editVisitModal').style.display = 'none';
    editingVisitId = null;
    stopEditVisitCamera();
    alert('Status kunjungan berhasil diperbarui.');
    loadClientVisits();
}

function deleteVisit(visitId) {
    showAppConfirm({
        title: 'Hapus Catatan Kunjungan',
        message: 'Yakin ingin menghapus catatan kunjungan ini?',
        confirmText: 'Hapus',
        cancelText: 'Batal',
        variant: 'danger',
        onConfirm: async () => {
            try {
                if (typeof apiRequest === 'function') {
                    await apiRequest(`/api/visits/${Number(visitId)}`, {
                        method: 'DELETE',
                    });
                    if (typeof window.syncVisitsFromApi === 'function') {
                        await window.syncVisitsFromApi().catch(() => { });
                    }
                } else {
                    let visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
                    const nextVisits = visits.filter(v => !(Number(v.id) === Number(visitId) && String(v.userId) === String(currentUser.id)));
                    localStorage.setItem('userClientVisits', JSON.stringify(nextVisits));
                }

                loadClientVisits();
            } catch (error) {
                notify(error?.message || 'Gagal menghapus kunjungan.', 'error');
            }
        }
    });
}

async function saveVisitData(data) {
    let visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');

    // Add user ID and ID
    data.userId = currentUser.id;
    data.id = Date.now();
    data.status = data.checkOutTime ? 'Selesai' : 'Aktif';
    data.duration = data.duration || calculateDurationLabel(data.checkInTime, data.checkOutTime);

    try {
        if (typeof apiRequest === 'function') {
            const durationMinutes = (() => {
                if (!data.checkOutTime) return null;
                const inM = timeToMinutes(data.checkInTime);
                const outM = timeToMinutes(data.checkOutTime);
                if (inM === null || outM === null) return null;
                return Math.max(0, ((outM - inM) + 1440) % 1440);
            })();

            await apiRequest('/api/visits', {
                method: 'POST',
                body: {
                    client_name: data.clientName,
                    client_location: data.clientLocation,
                    visit_date: data.visitDate,
                    check_in_time: data.checkInTime,
                    check_out_time: data.checkOutTime || null,
                    duration_minutes: durationMinutes,
                    visit_purpose: data.visitPurpose,
                    visit_notes: data.visitNotes || null,
                    location_type: data.locationType,
                    latitude: data.coordinates?.lat ?? null,
                    longitude: data.coordinates?.lng ?? null,
                    status: data.status,
                    face_image_data: data.faceData || null,
                    accuracy_meters: data.accuracy || null,
                    geo_risk_score: data.geoRiskScore,
                    geo_flags: data.geoFlags ? JSON.stringify(data.geoFlags) : null,
                    position_samples: data.positionSamples ? JSON.stringify(data.positionSamples) : null,
                },
            });
            if (typeof window.syncVisitsFromApi === 'function') {
                await window.syncVisitsFromApi().catch(() => { });
            }
            return true;
        }

        visits.push(data);
        if (visits.length > 100) {
            visits = visits.slice(-100);
        }
        localStorage.setItem('userClientVisits', JSON.stringify(visits));
        return true;
    } catch (error) {
        notify(error?.message || 'Gagal menyimpan kunjungan.', 'error');
        return false;
    }
}

setupVisitsTableResizeHandler();

// ==================== CAMERA FUNCTIONS ====================
async function startVisitCamera() {
    const video = document.getElementById('visitVideo');
    const startBtn = document.getElementById('startVisitCameraBtn');
    const captureBtn = document.getElementById('captureVisitFaceBtn');
    const statusText = document.getElementById('visitFaceStatus');

    try {
        visitVideoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' }
        });
        video.srcObject = visitVideoStream;
        video.style.display = 'block';
        document.getElementById('visitCanvas').style.display = 'none';

        startBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Kamera';
        startBtn.onclick = stopVisitCamera;
        captureBtn.style.display = 'inline-block';
        statusText.textContent = 'Status: Kamera aktif - siap menangkap wajah';
        statusText.style.color = '';
    } catch (err) {
        console.error('Camera error:', err);
        alert('Gagal mengakses kamera: ' + err.message);
    }
}

function stopVisitCamera() {
    if (visitVideoStream) {
        visitVideoStream.getTracks().forEach(track => track.stop());
        visitVideoStream = null;
    }
    const video = document.getElementById('visitVideo');
    video.srcObject = null;

    const startBtn = document.getElementById('startVisitCameraBtn');
    startBtn.innerHTML = '<i class="fas fa-play"></i> Mulai Kamera';
    startBtn.onclick = startVisitCamera;
    document.getElementById('captureVisitFaceBtn').style.display = 'none';
    document.getElementById('visitFaceStatus').textContent = 'Status: Kamera berhenti';
}

async function captureVisitFace() {
    const video = document.getElementById('visitVideo');
    const canvas = document.getElementById('visitCanvas');
    const statusText = document.getElementById('visitFaceStatus');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/webp', 0.82);
    visitFaceDataUrl = dataUrl;
    isVisitFaceCaptured = true;

    video.style.display = 'none';
    canvas.style.display = 'block';
    statusText.textContent = 'Status: Wajah berhasil ditangkap';
    statusText.style.color = '#10b981';
}

async function startEditVisitCamera() {
    const video = document.getElementById('editVisitVideo');
    const startBtn = document.getElementById('startEditVisitCameraBtn');
    const captureBtn = document.getElementById('captureEditVisitFaceBtn');
    const statusText = document.getElementById('editVisitFaceStatus');

    try {
        visitVideoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: 'user' }
        });
        video.srcObject = visitVideoStream;
        video.style.display = 'block';
        document.getElementById('editVisitCanvas').style.display = 'none';

        startBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Kamera';
        startBtn.onclick = stopEditVisitCamera;
        captureBtn.style.display = 'inline-block';
        statusText.textContent = 'Status: Kamera aktif - siap menangkap wajah';
        statusText.style.color = '';
    } catch (err) {
        console.error('Camera error:', err);
        alert('Gagal mengakses kamera: ' + err.message);
    }
}

function stopEditVisitCamera() {
    if (visitVideoStream) {
        visitVideoStream.getTracks().forEach(track => track.stop());
        visitVideoStream = null;
    }
    const video = document.getElementById('editVisitVideo');
    video.srcObject = null;

    const startBtn = document.getElementById('startEditVisitCameraBtn');
    startBtn.innerHTML = '<i class="fas fa-play"></i> Mulai Kamera';
    startBtn.onclick = startEditVisitCamera;
    document.getElementById('captureEditVisitFaceBtn').style.display = 'none';
    document.getElementById('editVisitFaceStatus').textContent = 'Status: Kamera berhenti';
}

async function captureEditVisitFace() {
    const video = document.getElementById('editVisitVideo');
    const canvas = document.getElementById('editVisitCanvas');
    const statusText = document.getElementById('editVisitFaceStatus');

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const dataUrl = canvas.toDataURL('image/webp', 0.82);
    editVisitFaceDataUrl = dataUrl;
    isEditVisitFaceCaptured = true;

    video.style.display = 'none';
    canvas.style.display = 'block';
    statusText.textContent = 'Status: Wajah berhasil ditangkap';
    statusText.style.color = '#10b981';
}