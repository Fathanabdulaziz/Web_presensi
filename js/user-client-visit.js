// User Client Visits Page
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthStatus();
    if (!currentUser || currentUser.role !== 'user') {
        window.location.href = '../index.html';
        return;
    }

    // Set user avatar and name
    updateUserDisplay();
    
    // Set up logout button
    const logoutBtn = document.querySelector('a[onclick="logout()"]');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Apakah Anda yakin ingin logout?')) {
                logout();
            }
        });
    }

    // Initialize map
    initializeMap();

    // Load client visit data
    loadClientVisits();

    // Set up add visit button
    document.getElementById('addVisitBtn')?.addEventListener('click', addNewVisit);
    document.getElementById('getCurrentLocationBtn')?.addEventListener('click', getCurrentLocation);

    // Table search
    document.getElementById('searchInput')?.addEventListener('input', handleVisitSearch);
    
    // Set up modal event listeners
    setupModalListeners();
});

let map;
let selectedLatLng = null;
let editingVisitId = null;
let userVisitsCache = [];

function initializeMap() {
    // Initialize Leaflet map
    map = L.map('map').setView([-6.2088, 106.8456], 10); // Default to Jakarta

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Add click event to map
    map.on('click', function(e) {
        selectedLatLng = e.latlng;
        // Remove previous marker
        map.eachLayer(function(layer) {
            if (layer instanceof L.Marker) {
                map.removeLayer(layer);
            }
        });
        // Add new marker
        L.marker(e.latlng).addTo(map)
            .bindPopup('Lokasi terpilih: ' + e.latlng.lat.toFixed(6) + ', ' + e.latlng.lng.toFixed(6))
            .openPopup();
    });
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            selectedLatLng = { lat: lat, lng: lng };
            window.currentPosition = { lat: lat, lng: lng };
            
            // Center map on current location
            map.setView([lat, lng], 15);
            
            // Remove previous marker
            map.eachLayer(function(layer) {
                if (layer instanceof L.Marker) {
                    map.removeLayer(layer);
                }
            });
            
            // Add marker at current location
            L.marker([lat, lng]).addTo(map)
                .bindPopup('Lokasi saat ini: ' + lat.toFixed(6) + ', ' + lng.toFixed(6))
                .openPopup();
                
            // Update location preview if modal is open
            if (document.getElementById('addVisitModal').style.display === 'block') {
                updateLocationPreview();
            }
                
            alert('Lokasi GPS berhasil didapatkan!');
        }, function(error) {
            alert('Error mendapatkan lokasi: ' + error.message);
        });
    } else {
        alert('Geolocation tidak didukung oleh browser ini.');
    }
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

function renderVisitsTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (!visits || visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Belum ada catatan kunjungan</td></tr>';
        return;
    }

    // Sort by date (newest first)
    const sortedVisits = [...visits].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    tbody.innerHTML = sortedVisits.map((visit) => {
        const statusClass = getStatusBadgeClass(visit.status || 'Aktif');
        const checkOutTime = visit.checkOutTime || '-';
        const duration = visit.duration || calculateDurationLabel(visit.checkInTime, visit.checkOutTime) || '-';

        return `
        <tr>
            <td>${visit.clientName}</td>
            <td>${visit.clientLocation}</td>
            <td>${new Date(visit.visitDate).toLocaleDateString('id-ID')}</td>
            <td>${visit.checkInTime}</td>
            <td>${checkOutTime}</td>
            <td>${duration}</td>
            <td><span class="badge badge-${statusClass}">${visit.status || 'Aktif'}</span></td>
            <td class="table-actions">
                <button class="btn btn-sm" onclick="editVisit(${visit.id})">Edit Status</button>
                <button class="btn btn-sm btn-danger" onclick="deleteVisit(${visit.id})">Hapus</button>
            </td>
        </tr>
    `;
    }).join('');
}

function handleVisitSearch(e) {
    const keyword = String(e.target.value || '').toLowerCase().trim();
    if (!keyword) {
        renderVisitsTable(userVisitsCache);
        return;
    }

    const filtered = userVisitsCache.filter(visit => {
        const visitDate = visit.visitDate ? new Date(visit.visitDate).toLocaleDateString('id-ID') : '';
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

function addNewVisit() {
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
    const visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const visit = visits.find(v => v.id === visitId && v.userId === currentUser.id);

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
document.querySelector('.download-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Mengekspor laporan kunjungan...');
    // TODO: Implement actual export functionality
});

function setupModalListeners() {
    const modal = document.getElementById('addVisitModal');
    const closeBtn = document.getElementById('closeModalBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const form = document.getElementById('addVisitForm');
    const checkInInput = document.getElementById('checkInTime');
    const checkOutInput = document.getElementById('checkOutTime');

    const editModal = document.getElementById('editVisitModal');
    const closeEditBtn = document.getElementById('closeEditModalBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const editForm = document.getElementById('editVisitForm');
    const editCheckOutInput = document.getElementById('editCheckOutTime');
    
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
    checkInInput?.addEventListener('change', updateAddDurationField);
    checkOutInput?.addEventListener('change', updateAddDurationField);
    
    // Location type change
    const locationRadios = document.querySelectorAll('input[name="locationType"]');
    locationRadios.forEach(radio => {
        radio.addEventListener('change', updateLocationPreview);
    });

    // Edit modal listeners
    closeEditBtn?.addEventListener('click', () => editModal.style.display = 'none');
    cancelEditBtn?.addEventListener('click', () => editModal.style.display = 'none');
    editForm?.addEventListener('submit', handleEditVisitForm);
    editCheckOutInput?.addEventListener('change', updateEditDurationField);
}

function updateAddDurationField() {
    const checkIn = document.getElementById('checkInTime').value;
    const checkOut = document.getElementById('checkOutTime').value;
    document.getElementById('visitDuration').value = calculateDurationLabel(checkIn, checkOut) || '';
}

function updateEditDurationField() {
    const visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const visit = visits.find(v => v.id === editingVisitId && v.userId === currentUser.id);
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

function handleAddVisitForm(e) {
    e.preventDefault();
    
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
        locationType: document.querySelector('input[name="locationType"]:checked').value,
        timestamp: new Date().toISOString()
    };
    
    // Validate required fields
    if (!formData.clientName || !formData.clientLocation || !formData.visitDate || 
        !formData.checkInTime || !formData.visitPurpose) {
        alert('Mohon lengkapi semua field yang wajib diisi.');
        return;
    }
    
    // Get location coordinates
    let coordinates = null;
    if (formData.locationType === 'map' && selectedLatLng) {
        coordinates = { lat: selectedLatLng.lat, lng: selectedLatLng.lng };
    } else if (formData.locationType === 'current' && window.currentPosition) {
        coordinates = { lat: window.currentPosition.lat, lng: window.currentPosition.lng };
    }
    
    if (!coordinates) {
        alert('Lokasi belum tersedia. Silakan pilih lokasi di peta atau gunakan lokasi saat ini.');
        return;
    }
    
    // Add coordinates to form data
    formData.coordinates = coordinates;
    
    // Save visit data
    saveVisitData(formData);
    
    // Show success message
    alert(`Kunjungan ke ${formData.clientName} berhasil ditambahkan!`);
    
    // Close modal and reset form
    document.getElementById('addVisitModal').style.display = 'none';
    e.target.reset();
    
    // Reload visits
    loadClientVisits();
}

function handleEditVisitForm(e) {
    e.preventDefault();

    if (!editingVisitId) {
        alert('Tidak ada data kunjungan yang dipilih untuk diedit.');
        return;
    }

    const status = document.getElementById('editVisitStatus').value;
    const checkOutTime = document.getElementById('editCheckOutTime').value;

    let visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const index = visits.findIndex(v => v.id === editingVisitId && v.userId === currentUser.id);

    if (index === -1) {
        alert('Data kunjungan tidak ditemukan.');
        return;
    }

    const visit = visits[index];
    const duration = calculateDurationLabel(visit.checkInTime, checkOutTime);

    visits[index] = {
        ...visit,
        status: status,
        checkOutTime: checkOutTime || '',
        duration: duration || visit.duration || ''
    };

    localStorage.setItem('userClientVisits', JSON.stringify(visits));

    document.getElementById('editVisitModal').style.display = 'none';
    editingVisitId = null;
    alert('Status kunjungan berhasil diperbarui.');
    loadClientVisits();
}

function deleteVisit(visitId) {
    if (!confirm('Hapus catatan kunjungan ini?')) {
        return;
    }

    let visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const nextVisits = visits.filter(v => !(v.id === visitId && v.userId === currentUser.id));

    localStorage.setItem('userClientVisits', JSON.stringify(nextVisits));
    loadClientVisits();
}

function saveVisitData(data) {
    let visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    
    // Add user ID and ID
    data.userId = currentUser.id;
    data.id = Date.now();
    data.status = data.checkOutTime ? 'Selesai' : 'Aktif';
    data.duration = data.duration || calculateDurationLabel(data.checkInTime, data.checkOutTime);
    
    visits.push(data);
    
    // Keep only last 100 visits
    if (visits.length > 100) {
        visits = visits.slice(-100);
    }
    
    localStorage.setItem('userClientVisits', JSON.stringify(visits));
}