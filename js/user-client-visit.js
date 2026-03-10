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
                
            alert('Lokasi GPS berhasil didapatkan!');
        }, function(error) {
            alert('Error mendapatkan lokasi: ' + error.message);
        });
    } else {
        alert('Geolocation tidak didukung oleh browser ini.');
    }
}

function loadClientVisits() {
    // Mock client visit data for current user (in production, load from localStorage/API)
    const visits = [
        {
            id: 1,
            client: 'PT Maju Jaya',
            location: 'Jakarta',
            date: new Date().toISOString().split('T')[0],
            checkIn: '08:30',
            checkOut: '11:45',
            duration: '3h 15m',
            status: 'Selesai'
        },
        {
            id: 2,
            client: 'CV Tekno Indonesia',
            location: 'Bandung',
            date: new Date().toISOString().split('T')[0],
            checkIn: '09:00',
            checkOut: null,
            duration: 'Sedang Berlangsung',
            status: 'Aktif'
        },
        {
            id: 3,
            client: 'PT Global Services',
            location: 'Surabaya',
            date: new Date().toISOString().split('T')[0],
            checkIn: '07:00',
            checkOut: '16:30',
            duration: '9h 30m',
            status: 'Selesai'
        }
    ];

    // Update stats
    document.getElementById('visitsCount').textContent = visits.length;
    document.getElementById('activeVisitsCount').textContent = visits.filter(v => v.status === 'Aktif').length;
    document.getElementById('completedVisitsCount').textContent = visits.filter(v => v.status === 'Selesai').length;
    document.getElementById('uniqueClientsCount').textContent = new Set(visits.map(v => v.client)).size;

    // Load table data
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">Tidak ada catatan kunjungan ditemukan</td></tr>';
        return;
    }

    tbody.innerHTML = visits.map((visit, idx) => `
        <tr>
            <td>${visit.client}</td>
            <td>${visit.location}</td>
            <td>${visit.date}</td>
            <td>${visit.checkIn}</td>
            <td>${visit.checkOut || '-'}</td>
            <td>${visit.duration}</td>
            <td><span class="badge badge-${visit.status === 'Aktif' ? 'warning' : 'success'}">${visit.status}</span></td>
            <td>
                <button class="btn btn-sm" onclick="editVisit(${visit.id})">Edit</button>
            </td>
        </tr>
    `).join('');
}

function addNewVisit() {
    if (!selectedLatLng) {
        alert('Silakan pilih lokasi di peta terlebih dahulu atau gunakan lokasi saat ini.');
        return;
    }
    
    const clientName = prompt('Masukkan nama klien:');
    if (!clientName) return;
    
    const location = prompt('Masukkan lokasi detail:');
    if (!location) return;
    
    // Here you would typically send data to server
    alert(`Kunjungan ke ${clientName} di ${location} (${selectedLatLng.lat.toFixed(6)}, ${selectedLatLng.lng.toFixed(6)}) telah ditambahkan!`);
    
    // Reload visits
    loadClientVisits();
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