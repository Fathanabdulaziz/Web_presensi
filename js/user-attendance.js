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
    // Check authentication first
    checkAuthStatus();
    
    // If no user is logged in, redirect to login
    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }
    
    // Load presensi data from localStorage
    loadPresensiData();
    
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
    const requiredFields = ['workLocation', 'siteName', 'workDescription', 'prayerDhuhurStatus', 'prayerAsharStatus'];
    requiredFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('change', validateForm);
        }
    });
    
    // Add form submission handler
    document.getElementById('attendanceForm').addEventListener('submit', handleAttendanceSubmit);

    updateAttendanceTypeAvailability();
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
    try {
        document.getElementById('faceStatus').textContent = 'Memuat model deteksi wajah...';
        
        // tracking.js doesn't need model loading, it's ready to use
        faceDetectionModelsLoaded = true;
        document.getElementById('faceStatus').textContent = 'Model wajah siap digunakan';
        console.log('Face detection ready');
    } catch (error) {
        console.error('Error initializing face detection:', error);
        document.getElementById('faceStatus').textContent = 'Gagal memuat model wajah - menggunakan mode demo';
        // Fallback to demo mode
        faceDetectionModelsLoaded = true;
    }
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
        startCameraBtn.disabled = false;
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
    
    // Simple face detection simulation - check if there's sufficient image data
    setTimeout(() => {
        try {
            // Get image data to check if there's content
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Simple check: if image has variation (not blank), consider it valid
            let hasContent = false;
            let totalBrightness = 0;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const brightness = (r + g + b) / 3;
                totalBrightness += brightness;
                
                // Check for variation
                if (Math.abs(brightness - 128) > 20) {
                    hasContent = true;
                }
            }
            
            const avgBrightness = totalBrightness / (data.length / 4);
            
            if (!hasContent || avgBrightness < 50) {
                document.getElementById('faceStatus').textContent = 'Gambar terlalu gelap atau kosong. Pastikan pencahayaan cukup dan wajah terlihat.';
                return;
            }
            
            // Simulate face detection box
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const boxSize = Math.min(canvas.width, canvas.height) * 0.6;
            
            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(centerX - boxSize/2, centerY - boxSize/2, boxSize, boxSize);
            
            // Add some "landmarks" simulation
            ctx.fillStyle = '#ff0000';
            ctx.beginPath();
            ctx.arc(centerX - boxSize/4, centerY - boxSize/4, 3, 0, 2 * Math.PI);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(centerX + boxSize/4, centerY - boxSize/4, 3, 0, 2 * Math.PI);
            ctx.fill();
            
            faceCaptured = true;
            document.getElementById('faceStatus').textContent = 'Wajah berhasil ditangkap dan diverifikasi (simulasi)';
            
            // Show captured image
            document.getElementById('video').style.display = 'none';
            document.getElementById('canvas').style.display = 'block';
            
            // Enable submit button if location is also obtained
            checkFormCompletion();
            
        } catch (error) {
            console.error('Error in face capture:', error);
            document.getElementById('faceStatus').textContent = 'Gagal menangkap wajah - coba lagi';
        }
    }, 1000);
}

function checkFormCompletion() {
    validateForm();
}

function resetAttendanceForm() {
    currentLocation = null;
    faceCaptured = false;
    
    document.getElementById('locationInfo').innerHTML = '<p>Klik "Dapatkan Lokasi" untuk mendapatkan koordinat GPS Anda.</p>';
    document.getElementById('faceStatus').textContent = 'Kamera belum dimulai';
    document.getElementById('workLocation').value = '';
    document.getElementById('siteName').value = '';
    document.getElementById('attendanceType').value = '';
    document.getElementById('workDescription').value = '';
    document.getElementById('prayerDhuhurStatus').value = '';
    document.getElementById('prayerAsharStatus').value = '';
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
    // Ensure currentUser is available
    if (!currentUser) {
        console.warn('currentUser not available, skipping attendance history load');
        return;
    }
    
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

function normalizeAttendanceType(type) {
    if (!type) return '';
    const normalized = String(type).toLowerCase().replace(/\s+/g, '');

    if (normalized === 'checkin' || normalized === 'check-in') return 'checkin';
    if (normalized === 'checkout' || normalized === 'check-out') return 'checkout';
    return '';
}

function getAttendanceFlowState() {
    const userAttendance = presensiData
        .filter(p => p.employeeId === currentUser.id)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    let openCheckinCount = 0;

    userAttendance.forEach(item => {
        const type = normalizeAttendanceType(item.type);

        if (type === 'checkin') {
            openCheckinCount += 1;
        } else if (type === 'checkout' && openCheckinCount > 0) {
            openCheckinCount -= 1;
        }
    });

    return {
        hasPendingCheckout: openCheckinCount > 0,
        openCheckinCount
    };
}

function updateAttendanceTypeAvailability() {
    const attendanceTypeSelect = document.getElementById('attendanceType');
    const checkinOption = attendanceTypeSelect.querySelector('option[value="checkin"]');
    const checkoutOption = attendanceTypeSelect.querySelector('option[value="checkout"]');
    const { hasPendingCheckout } = getAttendanceFlowState();

    if (checkinOption) {
        checkinOption.disabled = hasPendingCheckout;
    }

    if (checkoutOption) {
        checkoutOption.disabled = !hasPendingCheckout;
    }

    if (hasPendingCheckout && attendanceTypeSelect.value === 'checkin') {
        attendanceTypeSelect.value = '';
    }

    if (!hasPendingCheckout && attendanceTypeSelect.value === 'checkout') {
        attendanceTypeSelect.value = '';
    }
}

// Toggle checkout fields visibility based on attendance type
function toggleCheckoutFields() {
    const attendanceType = document.getElementById('attendanceType').value;
    const checkoutFields = document.getElementById('checkoutFields');
    const attendanceTypeSelect = document.getElementById('attendanceType');
    const workDescription = document.getElementById('workDescription');
    const prayerDhuhurStatus = document.getElementById('prayerDhuhurStatus');
    const prayerAsharStatus = document.getElementById('prayerAsharStatus');
    const { hasPendingCheckout } = getAttendanceFlowState();

    // A new check-in is blocked while there is an open check-in without check-out.
    if (attendanceType === 'checkin' && hasPendingCheckout) {
        alert('Anda masih memiliki check-in yang belum check-out. Silakan check-out terlebih dahulu.');
        attendanceTypeSelect.value = '';
        checkoutFields.style.display = 'none';
        workDescription.required = false;
        prayerDhuhurStatus.required = false;
        prayerAsharStatus.required = false;
        return;
    }

    if (attendanceType === 'checkout' && !hasPendingCheckout) {
        alert('Belum ada check-in aktif yang perlu di-check-out. Silakan check-in terlebih dahulu.');
        attendanceTypeSelect.value = '';
        checkoutFields.style.display = 'none';
        workDescription.required = false;
        prayerDhuhurStatus.required = false;
        prayerAsharStatus.required = false;
        return;
    }
    
    if (attendanceType === 'checkout') {
        checkoutFields.style.display = 'block';
        workDescription.required = true;
        prayerDhuhurStatus.required = true;
        prayerAsharStatus.required = true;
    } else {
        checkoutFields.style.display = 'none';
        workDescription.required = false;
        prayerDhuhurStatus.required = false;
        prayerAsharStatus.required = false;
        prayerDhuhurStatus.value = '';
        prayerAsharStatus.value = '';
    }
}

// Validate form and enable/disable submit button
function validateForm() {
    updateAttendanceTypeAvailability();

    const attendanceType = document.getElementById('attendanceType').value;
    const workLocation = document.getElementById('workLocation').value;
    const siteName = document.getElementById('siteName').value;
    const workDescription = document.getElementById('workDescription');
    const prayerDhuhurStatus = document.getElementById('prayerDhuhurStatus');
    const prayerAsharStatus = document.getElementById('prayerAsharStatus');
    const submitBtn = document.getElementById('submitBtn');
    const { hasPendingCheckout } = getAttendanceFlowState();
    
    let isValid = attendanceType && workLocation && siteName;
    
    if (attendanceType === 'checkout' && workDescription) {
        isValid = isValid && workDescription.value;
    }

    if (attendanceType === 'checkout') {
        isValid = isValid && prayerDhuhurStatus.value && prayerAsharStatus.value;
    }
    
    // Also check location and face capture status
    const locationValid = currentLocation && currentLocation.isValidDistance;
    const faceValid = faceCaptured;

    // Business rule: check-in disabled when a previous check-in has not been closed by check-out.
    if (attendanceType === 'checkin' && hasPendingCheckout) {
        isValid = false;
    }
    if (attendanceType === 'checkout' && !hasPendingCheckout) {
        isValid = false;
    }
    
    submitBtn.disabled = !(isValid && locationValid && faceValid);
    
    if (submitBtn.disabled) {
        if (attendanceType === 'checkin' && hasPendingCheckout) {
            submitBtn.textContent = 'Check-out dulu sebelum check-in lagi';
        } else if (attendanceType === 'checkout' && !hasPendingCheckout) {
            submitBtn.textContent = 'Belum ada check-in aktif';
        } else if (!attendanceType) {
            submitBtn.textContent = 'Pilih tipe presensi';
        } else if (!locationValid) {
            submitBtn.textContent = 'Lokasi tidak valid (terlalu jauh)';
        } else if (!faceValid) {
            submitBtn.textContent = 'Wajah belum ditangkap';
        } else if (!workLocation) {
            submitBtn.textContent = 'Pilih lokasi kerja';
        } else if (!siteName) {
            submitBtn.textContent = 'Pilih nama site';
        } else if (attendanceType === 'checkout' && workDescription && !workDescription.value) {
            submitBtn.textContent = 'Pilih uraian pekerjaan';
        } else if (attendanceType === 'checkout' && !prayerDhuhurStatus.value) {
            submitBtn.textContent = 'Pilih status sholat Dzuhur';
        } else if (attendanceType === 'checkout' && !prayerAsharStatus.value) {
            submitBtn.textContent = 'Pilih status sholat Ashar';
        }
    } else {
        submitBtn.innerHTML = '<i class="fas fa-check"></i> Submit Presensi';
    }
}

// Handle attendance form submission
function handleAttendanceSubmit(e) {
    e.preventDefault();
    
    // Ensure currentUser is available
    if (!currentUser) {
        alert('Sesi login telah berakhir. Silakan login kembali.');
        window.location.href = '../index.html';
        return;
    }
    
    const attendanceType = document.getElementById('attendanceType').value;
    const workLocation = document.getElementById('workLocation').value;
    const siteName = document.getElementById('siteName').value;
    const currentTime = document.getElementById('currentTime').value;
    const notes = document.getElementById('notes').value;
    const { hasPendingCheckout } = getAttendanceFlowState();

    if (attendanceType === 'checkin' && hasPendingCheckout) {
        alert('Anda masih memiliki check-in yang belum check-out. Silakan check-out terlebih dahulu.');
        return;
    }

    if (attendanceType === 'checkout' && !hasPendingCheckout) {
        alert('Belum ada check-in aktif yang perlu di-check-out.');
        return;
    }
    
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
        attendanceRecord.prayerDhuhurStatus = document.getElementById('prayerDhuhurStatus').value;
        attendanceRecord.prayerAsharStatus = document.getElementById('prayerAsharStatus').value;
        attendanceRecord.drivingNotes = document.getElementById('drivingNotes').value;
    }
    
    // Save to localStorage
    presensiData.push(attendanceRecord);
    localStorage.setItem('presensiData', JSON.stringify(presensiData));

    // Save one-time notification to show on dashboard after redirect.
    localStorage.setItem('flashNotification', JSON.stringify({
        message: `Presensi ${attendanceType === 'checkin' ? 'check-in' : 'check-out'} berhasil dicatat!`,
        type: 'success'
    }));

    window.location.href = 'dashboard.html';
}

window.addEventListener('beforeunload', function() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
    }
});