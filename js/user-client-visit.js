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
    
    // Set up modal event listeners
    setupModalListeners();
});

let map;
let selectedLatLng = null;

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
    const userVisits = visits.filter(visit => visit.userId === currentUser.id);
    
    // Update stats
    document.getElementById('visitsCount').textContent = userVisits.length;
    document.getElementById('activeVisitsCount').textContent = userVisits.filter(v => v.status === 'Aktif').length;
    document.getElementById('completedVisitsCount').textContent = userVisits.filter(v => v.status === 'Selesai').length;
    document.getElementById('uniqueClientsCount').textContent = new Set(userVisits.map(v => v.clientName)).size;

    // Load table data
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (userVisits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Belum ada catatan kunjungan</td></tr>';
        return;
    }

    // Sort by date (newest first)
    userVisits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    tbody.innerHTML = userVisits.map((visit) => `
        <tr>
            <td>${visit.clientName}</td>
            <td>${visit.clientLocation}</td>
            <td>${new Date(visit.visitDate).toLocaleDateString('id-ID')}</td>
            <td>${visit.checkInTime}</td>
            <td>-</td>
            <td>-</td>
            <td><span class="badge badge-${visit.status === 'Aktif' ? 'warning' : 'success'}">${visit.status}</span></td>
            <td>
                <button class="btn btn-sm" onclick="editVisit(${visit.id})">Edit</button>
            </td>
        </tr>
    `).join('');
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
    const currentTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('checkInTime').value = currentTime;
    
    // Update location preview
    updateLocationPreview();
    
    // Focus on first input
    document.getElementById('clientName').focus();
}

function editVisit(visitId) {
    alert(`Edit kunjungan ${visitId}`);
    // TODO: Implement edit modal
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
    
    // Close modal events
    closeBtn?.addEventListener('click', () => modal.style.display = 'none');
    cancelBtn?.addEventListener('click', () => modal.style.display = 'none');
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Form submission
    form?.addEventListener('submit', handleAddVisitForm);
    
    // Location type change
    const locationRadios = document.querySelectorAll('input[name="locationType"]');
    locationRadios.forEach(radio => {
        radio.addEventListener('change', updateLocationPreview);
    });
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

function saveVisitData(data) {
    let visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    
    // Add user ID and ID
    data.userId = currentUser.id;
    data.id = Date.now();
    data.status = 'Aktif';
    
    visits.push(data);
    
    // Keep only last 100 visits
    if (visits.length > 100) {
        visits = visits.slice(-100);
    }
    
    localStorage.setItem('userClientVisits', JSON.stringify(visits));
}