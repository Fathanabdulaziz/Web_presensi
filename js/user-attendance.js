// ==================== USER ATTENDANCE ====================
let currentLocation = null;
let faceDetectionModelsLoaded = false;
let videoStream = null;
let map = null;

// Work location coordinates (latitude, longitude)
const workLocations = {
    'B': { name: 'Bekasi/HO', lat: -6.272475, lng: 107.049876 },
    'O': { name: 'Jakarta, Bogor, Depok, Tangerang', lat: -6.2088, lng: 106.8456 },
    'O1': { name: 'Jawa Tengah dan Jawa Timur', lat: -7.7956, lng: 110.3695 },
    'O2': { name: 'Sumatra, Bali dan Nusa Tenggara Barat', lat: 3.5952, lng: 98.6722 },
    'O3': { name: 'Kalimantan dan Sulawesi', lat: -0.0263, lng: 109.3425 },
    'O4': { name: 'Maluku dan Papua', lat: -3.6547, lng: 128.1906 }
};

document.addEventListener('DOMContentLoaded', function() {
    initializeAttendance();
});

async function initializeAttendance() {
    updateDateTime();
    loadAttendanceHistory();
    loadSiteNames();
    
    // Update time every second
    setInterval(updateDateTime, 1000);
    
    // Load face detection models
    await loadFaceDetectionModels();
    
    // Add event listener for work location change
    document.getElementById('workLocation').addEventListener('change', function() {
        showWorkLocationInfo();
        validateWorkLocationDistance();
    });
    
    // Add event listener for attendance type change
    document.getElementById('attendanceType').addEventListener('change', function() {
        toggleCheckoutFields();
        validateForm();
    });
    
    // Add event listeners for form validation
    const requiredFields = ['workLocation', 'siteName'];
    requiredFields.forEach(fieldId => {
        document.getElementById(fieldId).addEventListener('change', validateForm);
    });
    
    // Add form submission handler
    document.getElementById('attendanceForm').addEventListener('submit', handleAttendanceSubmit);
}

function loadSiteNames() {
    const siteNameSelect = document.getElementById('siteName');
    const siteNames = JSON.parse(localStorage.getItem('siteNames') || '[]');
    
    // Clear existing options except the first one
    siteNameSelect.innerHTML = '<option value="">Pilih Nama Site</option>';
    
    // Add site names from localStorage
    siteNames.forEach(site => {
        const option = document.createElement('option');
        option.value = site.id;
        option.textContent = site.name;
        siteNameSelect.appendChild(option);
    });
}

function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDateTime').textContent = 
        now.toLocaleString('id-ID', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    
    document.getElementById('currentTime').value = now.toLocaleTimeString('id-ID');
}

async function loadFaceDetectionModels() {
    // For demo purposes, skip loading models and use mock detection
    console.log('Using mock face detection for demo');
    faceDetectionModelsLoaded = true;
    document.getElementById('faceStatus').textContent = 'Model wajah siap digunakan (demo mode)';
}

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lng2 - lng1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
}

function showWorkLocationInfo() {
    const workLocationSelect = document.getElementById('workLocation');
    const selectedLocation = workLocationSelect.value;
    const workLocationInfo = document.getElementById('workLocationInfo');
    
    if (!selectedLocation) {
        workLocationInfo.style.display = 'none';
        return;
    }
    
    const workLoc = workLocations[selectedLocation];
    workLocationInfo.style.display = 'block';
    workLocationInfo.innerHTML = `
        <strong>Titik Utama:</strong> ${workLoc.name}<br>
        <strong>Koordinat:</strong> ${workLoc.lat}, ${workLoc.lng}<br>
        <em>Maksimal jarak presensi: 200 meter dari titik utama</em>
    `;
}

function validateWorkLocationDistance() {
    const workLocationSelect = document.getElementById('workLocation');
    const selectedLocation = workLocationSelect.value;
    const distanceInfo = document.getElementById('distanceInfo');
    
    if (!currentLocation || !selectedLocation) {
        distanceInfo.style.display = 'none';
        return;
    }
    
    const workLoc = workLocations[selectedLocation];
    const distance = calculateDistance(
        currentLocation.latitude, 
        currentLocation.longitude, 
        workLoc.lat, 
        workLoc.lng
    );
    
    const isValid = distance <= 200; // 200 meters
    
    distanceInfo.style.display = 'block';
    distanceInfo.innerHTML = `
        <div class="distance-details ${isValid ? 'valid' : 'invalid'}">
            <p><strong>Lokasi Kerja:</strong> ${workLoc.name}</p>
            <p><strong>Jarak:</strong> ${distance.toFixed(1)} meter</p>
            <p class="${isValid ? 'success' : 'error'}">
                <i class="fas fa-${isValid ? 'check-circle' : 'exclamation-triangle'}"></i> 
                ${isValid ? 'Lokasi valid untuk presensi' : 'Lokasi terlalu jauh (max 200m)'}
            </p>
        </div>
    `;
    
    // Store validation result
    currentLocation.isValidDistance = isValid;
    currentLocation.distance = distance;
    currentLocation.workLocation = selectedLocation;
    
    // Update form completion
    checkFormCompletion();
}


function getLocation() {
    const locationInfo = document.getElementById('locationInfo');
    const getLocationBtn = document.getElementById('getLocationBtn');
    
    if (!navigator.geolocation) {
        locationInfo.innerHTML = '<p class="error">Geolokasi tidak didukung oleh browser ini</p>';
        return;
    }
    
    getLocationBtn.disabled = true;
    getLocationBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengambil lokasi...';
    
    navigator.geolocation.getCurrentPosition(
        function(position) {
            currentLocation = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy
            };
            
            locationInfo.innerHTML = `
                <div class="location-details">
                    <p><strong>Latitude:</strong> ${currentLocation.latitude.toFixed(6)}</p>
                    <p><strong>Longitude:</strong> ${currentLocation.longitude.toFixed(6)}</p>
                    <p><strong>Akurasi:</strong> ${currentLocation.accuracy.toFixed(1)} meter</p>
                    <p class="success"><i class="fas fa-check-circle"></i> Lokasi berhasil didapatkan</p>
                </div>
            `;
            
            // Show map with location
            showMap(currentLocation.latitude, currentLocation.longitude);
            
            getLocationBtn.disabled = false;
            getLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Dapatkan Lokasi';
            
            // Validate work location distance if location is selected
            validateWorkLocationDistance();
            
            // Enable submit button if face is also captured
            checkFormCompletion();
        },
        function(error) {
            let errorMessage = 'Gagal mendapatkan lokasi';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage = 'Akses lokasi ditolak. Izinkan akses lokasi di browser.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage = 'Informasi lokasi tidak tersedia.';
                    break;
                case error.TIMEOUT:
                    errorMessage = 'Waktu permintaan lokasi habis.';
                    break;
            }
            
            locationInfo.innerHTML = `<p class="error"><i class="fas fa-exclamation-triangle"></i> ${errorMessage}</p>`;
            getLocationBtn.disabled = false;
            getLocationBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Dapatkan Lokasi';
            
            // Hide map on error
            document.getElementById('mapContainer').style.display = 'none';
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

function showMap(latitude, longitude) {
    const mapContainer = document.getElementById('mapContainer');
    const mapElement = document.getElementById('map');
    
    // Show map container
    mapContainer.style.display = 'block';
    
    // Initialize map if not already done
    if (!map) {
        map = L.map('map').setView([latitude, longitude], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(map);
    } else {
        // Update map view
        map.setView([latitude, longitude], 16);
    }
    
    // Add marker
    L.marker([latitude, longitude]).addTo(map)
        .bindPopup(`<b>Lokasi Anda</b><br>Lat: ${latitude.toFixed(6)}<br>Lng: ${longitude.toFixed(6)}`)
        .openPopup();
}

async function startCamera() {
    const video = document.getElementById('video');
    const startCameraBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 320, 
                height: 240,
                facingMode: 'user'
            } 
        });
        
        video.srcObject = videoStream;
        startCameraBtn.disabled = true;
        startCameraBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Kamera';
        startCameraBtn.onclick = stopCamera;
        
        captureBtn.disabled = false;
        document.getElementById('faceStatus').textContent = 'Kamera aktif - siap untuk menangkap wajah';
        
        // Ensure video is visible and canvas is hidden
        document.getElementById('video').style.display = 'block';
        document.getElementById('canvas').style.display = 'none';
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        document.getElementById('faceStatus').textContent = 'Gagal mengakses kamera';
        alert('Tidak dapat mengakses kamera. Pastikan izin kamera diberikan.');
    }
}

function stopCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    const video = document.getElementById('video');
    video.srcObject = null;
    
    const startCameraBtn = document.getElementById('startCameraBtn');
    startCameraBtn.disabled = false;
    startCameraBtn.innerHTML = '<i class="fas fa-play"></i> Mulai Kamera';
    startCameraBtn.onclick = startCamera;
    
    document.getElementById('captureBtn').disabled = true;
    document.getElementById('faceStatus').textContent = 'Kamera berhenti';
    
    // Reset to show video if face not captured yet
    if (!faceCaptured) {
        document.getElementById('video').style.display = 'block';
        document.getElementById('canvas').style.display = 'none';
    }
}

let faceCaptured = false;

async function captureFace() {
    if (!faceDetectionModelsLoaded) {
        alert('Model deteksi wajah belum dimuat. Silakan tunggu.');
        return;
    }
    
    const video = document.getElementById('video');
    
    // Check if video is streaming
    if (!video.srcObject || video.readyState < 2) {
        document.getElementById('faceStatus').textContent = 'Kamera belum aktif. Klik "Mulai Kamera" terlebih dahulu.';
        return;
    }
    
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    document.getElementById('faceStatus').textContent = 'Mendeteksi wajah...';
    
    // Mock face detection for demo
    setTimeout(() => {
        // Simulate successful detection
        // Draw mock detection box
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.strokeRect(80, 60, 160, 120); // Mock face box
        
        faceCaptured = true;
        document.getElementById('faceStatus').textContent = 'Wajah berhasil ditangkap dan diverifikasi (demo)';
        
        // Show captured image
        document.getElementById('video').style.display = 'none';
        document.getElementById('canvas').style.display = 'block';
        
        // Enable submit button if location is also obtained
        validateForm();
    }, 1000); // Simulate 1 second detection time
}

function checkFormCompletion() {
    const workLocation = document.getElementById('workLocation').value;
    const siteName = document.getElementById('siteName').value;
    const submitBtn = document.getElementById('submitBtn');
    
    // Check if all required conditions are met
    const locationValid = currentLocation && currentLocation.isValidDistance;
    const faceValid = faceCaptured;
    const workLocationValid = workLocation !== '';
    const siteNameValid = siteName !== '';
    
    submitBtn.disabled = !(locationValid && faceValid && workLocationValid && siteNameValid);
    
    // Update button text to show status
    if (submitBtn.disabled) {
        if (!locationValid) {
            submitBtn.textContent = 'Lokasi tidak valid (terlalu jauh)';
        } else if (!faceValid) {
            submitBtn.textContent = 'Wajah belum ditangkap';
        } else if (!workLocationValid) {
            submitBtn.textContent = 'Pilih lokasi kerja';
        } else if (!siteNameValid) {
            submitBtn.textContent = 'Pilih nama site';
        }
    } else {
        submitBtn.textContent = 'Kirim Presensi';
    }
}

function resetAttendanceForm() {
    currentLocation = null;
    faceCaptured = false;
    
    document.getElementById('locationInfo').innerHTML = '<p>Klik "Dapatkan Lokasi" untuk mendapatkan koordinat GPS Anda.</p>';
    document.getElementById('faceStatus').textContent = 'Kamera belum dimulai';
    document.getElementById('workLocation').value = '';
    document.getElementById('siteName').value = '';
    document.getElementById('notes').value = '';
    document.getElementById('submitBtn').disabled = true;
    
    // Clear canvas
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Stop camera if running
    if (videoStream) {
        stopCamera();
    }
}

function loadAttendanceHistory() {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = presensiData.filter(p => 
        p.employeeId === currentUser.id && 
        p.date === today
    ).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    const historyContainer = document.getElementById('attendanceHistory');
    
    if (todayAttendance.length === 0) {
        historyContainer.innerHTML = '<p class="no-history">Belum ada presensi hari ini</p>';
        return;
    }
    
    historyContainer.innerHTML = todayAttendance.map(attendance => `
        <div class="history-item">
            <div class="history-icon">
                <i class="fas fa-${attendance.type === 'checkin' ? 'sign-in-alt' : 'sign-out-alt'}"></i>
            </div>
            <div class="history-content">
                <div class="history-type">${attendance.type === 'checkin' ? 'Check-in' : 'Check-out'}</div>
                <div class="history-time">${new Date(attendance.timestamp).toLocaleTimeString('id-ID')}</div>
                <div class="history-location">Lokasi: ${attendance.workLocation} | GPS: ${attendance.location.latitude.toFixed(4)}, ${attendance.location.longitude.toFixed(4)}</div>
                ${attendance.notes ? `<div class="history-notes">${attendance.notes}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// Toggle checkout fields visibility based on attendance type
function toggleCheckoutFields() {
    const attendanceType = document.getElementById('attendanceType').value;
    const checkoutFields = document.getElementById('checkoutFields');
    const workDescription = document.getElementById('workDescription');
    
    if (attendanceType === 'checkout') {
        checkoutFields.style.display = 'block';
        workDescription.required = true;
    } else {
        checkoutFields.style.display = 'none';
        workDescription.required = false;
    }
}

// Validate form and enable/disable submit button
function validateForm() {
    const attendanceType = document.getElementById('attendanceType').value;
    const workLocation = document.getElementById('workLocation').value;
    const siteName = document.getElementById('siteName').value;
    const workDescription = document.getElementById('workDescription');
    const submitBtn = document.getElementById('submitBtn');
    
    let isValid = workLocation && siteName;
    
    if (attendanceType === 'checkout' && workDescription) {
        isValid = isValid && workDescription.value;
    }
    
    // Also check location and face capture status
    const locationValid = currentLocation && currentLocation.isValidDistance;
    const faceValid = faceCaptured;
    
    submitBtn.disabled = !(isValid && locationValid && faceValid);
    
    if (submitBtn.disabled) {
        if (!locationValid) {
            submitBtn.textContent = 'Lokasi tidak valid (terlalu jauh)';
        } else if (!faceValid) {
            submitBtn.textContent = 'Wajah belum ditangkap';
        } else if (!workLocation) {
            submitBtn.textContent = 'Pilih lokasi kerja';
        } else if (!siteName) {
            submitBtn.textContent = 'Pilih nama site';
        } else if (attendanceType === 'checkout' && workDescription && !workDescription.value) {
            submitBtn.textContent = 'Pilih uraian pekerjaan';
        }
    } else {
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Submit Presensi';
    }
}

// Handle attendance form submission
function handleAttendanceSubmit(e) {
    e.preventDefault();
    
    const attendanceType = document.getElementById('attendanceType').value;
    const workLocation = document.getElementById('workLocation').value;
    const siteName = document.getElementById('siteName').value;
    const currentTime = document.getElementById('currentTime').value;
    const notes = document.getElementById('notes').value;
    
    // Create attendance record
    const attendanceRecord = {
        id: Date.now(),
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        type: attendanceType,
        workLocation: workLocation,
        siteName: siteName,
        location: currentLocation,
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        time: currentTime,
        notes: notes,
        faceCaptured: faceCaptured
    };
    
    // Add checkout-specific data
    if (attendanceType === 'checkout') {
        attendanceRecord.workDescription = document.getElementById('workDescription').value;
        attendanceRecord.overtimeHours = document.getElementById('overtimeHours').value;
        attendanceRecord.prayerDhuhur = document.getElementById('prayerDhuhur').checked;
        attendanceRecord.prayerAshar = document.getElementById('prayerAshar').checked;
        attendanceRecord.drivingNotes = document.getElementById('drivingNotes').value;
    }
    
    // Save to localStorage
    presensiData.push(attendanceRecord);
    localStorage.setItem('presensiData', JSON.stringify(presensiData));
    
    // Show success message
    alert(`Presensi ${attendanceType === 'checkin' ? 'check-in' : 'check-out'} berhasil dicatat!`);
    
    // Reset form
    resetAttendanceForm();
    
    // Reload history
    loadAttendanceHistory();
}

window.addEventListener('beforeunload', function() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
});