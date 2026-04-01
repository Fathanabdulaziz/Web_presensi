let workLocationsList = [];
let locationMap = null;
let locationMarker = null;

// Default view (Indonesia center)
const DEFAULT_LAT = -6.2088;
const DEFAULT_LNG = 106.8456;

document.addEventListener('DOMContentLoaded', async function() {
    checkAuthStatus();
    if (!currentUser || !['admin', 'bod'].includes(currentUser?.role)) {
        window.location.href = 'dashboard.html';
        return;
    }

    updateUserDisplay();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => logout(e));
    }

    // Load initial data
    await loadWorkLocations();

    // Modal logic
    const modal = document.getElementById('locationModal');
    const closeBtn = document.querySelector('.close-modal');
    const closeBtn2 = document.querySelector('.close-modal-btn');
    const addBtn = document.getElementById('addLocationBtn');
    const form = document.getElementById('locationForm');

    addBtn.onclick = () => {
        form.reset();
        document.getElementById('locationId').value = '';
        document.getElementById('modalTitle').textContent = 'Tambah Lokasi Kerja';
        modal.style.display = 'block';
        initMap(); // Ensure map is ready
    };

    closeBtn.onclick = closeBtn2.onclick = () => {
        modal.style.display = 'none';
    };

    window.onclick = (e) => {
        if (e.target == modal) modal.style.display = 'none';
    };

    form.onsubmit = handleSaveLocation;

    // Monitor manual coordinate changes to update map
    document.getElementById('locationLat').addEventListener('input', updateMarkerFromInputs);
    document.getElementById('locationLng').addEventListener('input', updateMarkerFromInputs);
});

function initMap(lat = DEFAULT_LAT, lng = DEFAULT_LNG) {
    // If already initialized, just update view and marker
    if (locationMap) {
        setTimeout(() => {
            locationMap.invalidateSize();
            const pos = [lat, lng];
            locationMap.setView(pos, 13);
            updateMarker(lat, lng);
        }, 100);
        return;
    }

    // Initialize map
    locationMap = L.map('locationMap').setView([lat, lng], 13);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(locationMap);

    // Initial marker
    locationMarker = L.marker([lat, lng], { draggable: true }).addTo(locationMap);

    // Handle map click
    locationMap.on('click', function(e) {
        const { lat, lng } = e.latlng;
        updateMarker(lat, lng);
        updateInputs(lat, lng);
    });

    // Handle marker drag
    locationMarker.on('dragend', function() {
        const pos = locationMarker.getLatLng();
        updateInputs(pos.lat, pos.lng);
    });
}

function updateMarker(lat, lng) {
    if (locationMarker) {
        locationMarker.setLatLng([lat, lng]);
    }
}

function updateInputs(lat, lng) {
    document.getElementById('locationLat').value = lat.toFixed(7);
    document.getElementById('locationLng').value = lng.toFixed(7);
}

function updateMarkerFromInputs() {
    const lat = parseFloat(document.getElementById('locationLat').value);
    const lng = parseFloat(document.getElementById('locationLng').value);
    if (!isNaN(lat) && !isNaN(lng)) {
        updateMarker(lat, lng);
        locationMap.panTo([lat, lng]);
    }
}

async function loadWorkLocations() {
    try {
        const payload = await apiRequest('/api/settings/work-locations');
        if (payload.success) {
            workLocationsList = payload.data.work_locations;
            renderLocationTable();
        }
    } catch (error) {
        console.error('Error loading work locations:', error);
    }
}

function renderLocationTable() {
    const tableBody = document.getElementById('locationTableBody');
    if (!tableBody) return;

    if (workLocationsList.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Belum ada data lokasi.</td></tr>';
        return;
    }

    tableBody.innerHTML = '';
    workLocationsList.forEach(loc => {
        const sitesList = loc.sites && loc.sites.length > 0
            ? loc.sites.map(s => s.name).join(', ')
            : '<em style="color: #64748b;">(Belum ada site)</em>';

        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${loc.code}</strong></td>
            <td>${loc.name}</td>
            <td>${loc.latitude}, ${loc.longitude}</td>
            <td>${loc.radius_meters}m</td>
            <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${sitesList}</td>
            <td>
                <span class="badge ${loc.is_active == 1 ? 'badge-success' : 'badge-danger'}">
                    ${loc.is_active == 1 ? 'Aktif' : 'Tidak Aktif'}
                </span>
            </td>
            <td class="table-actions">
                <button class="btn-icon edit-btn" onclick="openEditModal(${loc.id})" title="Edit"><i class="fas fa-edit"></i></button>
                <button class="btn-icon delete-btn" onclick="handleDeleteLocation(${loc.id}, '${loc.code}')" title="Hapus"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function openEditModal(id) {
    const loc = workLocationsList.find(l => l.id == id);
    if (!loc) return;

    document.getElementById('locationId').value = loc.id;
    document.getElementById('locationCode').value = loc.code;
    document.getElementById('locationName').value = loc.name;
    document.getElementById('locationLat').value = loc.latitude;
    document.getElementById('locationLng').value = loc.longitude;
    document.getElementById('locationRadius').value = loc.radius_meters;
    document.getElementById('locationActive').checked = loc.is_active == 1;

    // Load site names into textarea
    const siteNames = loc.sites ? loc.sites.map(s => s.name).join(', ') : '';
    document.getElementById('locationSites').value = siteNames;

    document.getElementById('modalTitle').textContent = 'Edit Lokasi Kerja';
    document.getElementById('locationModal').style.display = 'block';

    // Refresh map with this location's coordinates
    initMap(parseFloat(loc.latitude), parseFloat(loc.longitude));
}

async function handleSaveLocation(e) {
    e.preventDefault();
    const id = document.getElementById('locationId').value;
    const body = {
        code: document.getElementById('locationCode').value,
        name: document.getElementById('locationName').value,
        latitude: document.getElementById('locationLat').value,
        longitude: document.getElementById('locationLng').value,
        radius_meters: document.getElementById('locationRadius').value,
        is_active: document.getElementById('locationActive').checked ? 1 : 0,
        site_names: document.getElementById('locationSites').value
    };

    try {
        const method = id ? 'PUT' : 'POST';
        const url = `/api/settings/work-locations${id ? '/' + id : ''}`;
        const result = await apiRequest(url, {
            method: method,
            body: body
        });

        if (result.success) {
            notify(result.message, 'success');
            document.getElementById('locationModal').style.display = 'none';
            await loadWorkLocations();
        }
    } catch (error) {
        notify(error.message, 'error');
    }
}

async function handleDeleteLocation(id, code) {
    if (!confirm(`Hapus lokasi "${code}"? Data site terkait juga akan terhapus.`)) return;

    try {
        const result = await apiRequest(`/api/settings/work-locations/${id}`, { method: 'DELETE' });
        if (result.success) {
            notify(result.message, 'success');
            await loadWorkLocations();
        }
    } catch (error) {
        notify(error.message, 'error');
    }
}
