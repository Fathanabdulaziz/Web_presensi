// ==================== USER ATTENDANCE ====================
let currentLocation = null;
let faceDetectionModelsLoaded = false;
let videoStream = null;
let map = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeAttendance();
});

async function initializeAttendance() {
    updateDateTime();
    loadAttendanceHistory();
    
    // Update time every second
    setInterval(updateDateTime, 1000);
    
    // Load face detection models
    await loadFaceDetectionModels();
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
        checkFormCompletion();
    }, 1000); // Simulate 1 second detection time
}

function checkFormCompletion() {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = !(currentLocation && faceCaptured);
}

document.getElementById('attendanceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    if (!currentLocation) {
        alert('Silakan dapatkan lokasi GPS terlebih dahulu.');
        return;
    }
    
    if (!faceCaptured) {
        alert('Silakan tangkap wajah untuk verifikasi.');
        return;
    }
    
    const attendanceType = document.getElementById('attendanceType').value;
    const notes = document.getElementById('notes').value;
    const now = new Date();
    
    // Create attendance record
    const attendanceRecord = {
        id: Date.now(),
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        type: attendanceType,
        timestamp: now.toISOString(),
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        location: currentLocation,
        notes: notes,
        faceVerified: true,
        approved: false
    };
    
    // Save to localStorage
    presensiData.push(attendanceRecord);
    localStorage.setItem('presensiData', JSON.stringify(presensiData));
    
    // Show success message
    alert(`Presensi ${attendanceType === 'checkin' ? 'check-in' : 'check-out'} berhasil dicatat!`);
    
    // Reset form
    resetAttendanceForm();
    
    // Reload history
    loadAttendanceHistory();
});

function resetAttendanceForm() {
    currentLocation = null;
    faceCaptured = false;
    
    document.getElementById('locationInfo').innerHTML = '<p>Klik "Dapatkan Lokasi" untuk mendapatkan koordinat GPS Anda.</p>';
    document.getElementById('faceStatus').textContent = 'Kamera belum dimulai';
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
                <div class="history-location">Lat: ${attendance.location.latitude.toFixed(4)}, Lng: ${attendance.location.longitude.toFixed(4)}</div>
                ${attendance.notes ? `<div class="history-notes">${attendance.notes}</div>` : ''}
            </div>
        </div>
    `).join('');
}

// Cleanup on page unload
window.addEventListener('beforeunload', function() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
});