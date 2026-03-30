// attendance.js
// Frontend: Absensi + Anti-Fake GPS heuristics

let lastPosition = null;
let accuracyFlag = false;
let accuracyHistory = [];

function checkAccuracyHeuristic(acc) {
    // Flag if accuracy is too perfect or static (e.g., always 5.0 or 10.0)
    accuracyHistory.push(acc);
    if (accuracyHistory.length > 5) accuracyHistory.shift();
    const allSame = accuracyHistory.every(a => a === accuracyHistory[0]);
    if (allSame && (accuracyHistory[0] === 5.0 || accuracyHistory[0] === 10.0)) {
        accuracyFlag = true;
        return true;
    }
    return false;
}

function handlePhotoInput() {
    const photoInput = document.getElementById('photo');
    return new Promise((resolve, reject) => {
        if (!photoInput.files || photoInput.files.length === 0) {
            reject('Foto wajib diambil langsung dari kamera!');
        } else {
            // Optionally: check file type/size
            resolve(true);
        }
    });
}

function submitAttendance(role, department) {
    if (!navigator.geolocation) {
        alert('Geolocation tidak didukung browser ini!');
        return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        checkAccuracyHeuristic(accuracy);
        let lastLat = lastPosition ? lastPosition.latitude : latitude;
        let lastLon = lastPosition ? lastPosition.longitude : longitude;
        let lastTimestamp = lastPosition ? lastPosition.timestamp : (Date.now()/1000|0);
        let timestamp = Date.now()/1000|0;
        try {
            await handlePhotoInput();
        } catch (e) {
            alert(e);
            return;
        }
        const photoUploaded = true; // Only allow if photo taken
        fetch('/backend/public/attendance.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                role, department,
                latitude, longitude, accuracy,
                lastLatitude: lastLat, lastLongitude: lastLon, lastTimestamp,
                timestamp,
                accuracyFlag,
                photoUploaded
            })
        })
        .then(r => r.json())
        .then(res => {
            alert(res.message);
            if (res.success) {
                lastPosition = { latitude, longitude, timestamp };
            }
        });
    }, (err) => {
        alert('Gagal mendapatkan lokasi: ' + err.message);
    }, { enableHighAccuracy: true });
}

document.getElementById('attendanceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const role = document.getElementById('role').value;
    const department = document.getElementById('department').value;
    submitAttendance(role, department);
});
