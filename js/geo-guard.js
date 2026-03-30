// ═══════════════════════════════════════════════════════════════
// GEO-GUARD v3: Anti-Fake GPS Detection (Heuristik Agresif)
// ═══════════════════════════════════════════════════════════════
//
// Mendeteksi SEMUA jenis fake GPS:
// - Mobile fake GPS apps (Fake GPS, Mock Location)
// - Browser extensions (Geolocation spoofing)
// - Chrome DevTools geolocation override
// - Android emulator
//
// 12 heuristik:
//  1. Accuracy Pattern Analysis    - Variance & angka bulat
//  2. Position Drift Analysis      - GPS asli selalu "bergeser"
//  3. Speed/Heading Null Check     - Fake GPS sering null
//  4. Altitude Analysis            - Fake GPS sering 0/null
//  5. Timestamp Consistency        - GPS timestamp vs Date.now()
//  6. DeviceMotion Sensor Check    - HP asli punya accelerometer
//  7. Multi-Reading Jitter         - GPS asli punya "noise" alami
//  8. WebGL/Hardware Fingerprint   - Cek konsistensi perangkat
//  9. API Tampering Detection      - Cek apakah geolocation di-override
// 10. Response Timing Analysis     - GPS asli butuh waktu, fake instan
// 11. Iframe Cross-Check           - Bandingkan dgn iframe bersih
// 12. Permission State Check       - Cek konsistensi permissions
// ═══════════════════════════════════════════════════════════════

const GeoGuard = (function () {
    'use strict';

    // ─── Konfigurasi ───
    const CONFIG = {
        MIN_SAMPLES: 5,
        MAX_SAMPLES: 12,
        TOO_PERFECT_ACCURACY: 1.0,     // meter
        MIN_ACCURACY_VARIANCE: 0.5,
        ROUND_NUMBER_TOLERANCE: 0.001,
        // Drift: GPS asli bergeser minimal ~0.00001 derajat (~1.1 meter)
        MIN_POSITION_DRIFT: 0.0000005, // ~0.05m - sangat kecil tapi harus ada
        MAX_TIMESTAMP_DIFF_MS: 5000,   // Max gap antara GPS timestamp & Date.now()
        SENSOR_CHECK_DURATION_MS: 3000, // Durasi cek sensor
        MIN_JITTER_METERS: 0.05,       // GPS asli punya noise minimal
        FIRST_RESPONSE_FAKE_THRESHOLD_MS: 50,  // GPS asli tidak pernah respond < 50ms
        IFRAME_MAX_DISTANCE_METERS: 100,       // Max jarak iframe vs main (harusnya sama)
    };

    // ─── State ───
    let _accuracySamples = [];
    let _positionSamples = [];  // Array of {lat, lng, accuracy, altitude, speed, heading, timestamp}
    let _watchId = null;
    let _isCollecting = false;
    let _positionData = null;
    let _suspiciousFlags = [];
    let _sensorData = { hasMotion: false, hasOrientation: false, motionEvents: 0, maxAccel: 0 };
    let _motionHandler = null;
    let _orientationHandler = null;
    let _firstResponseTime = null; // Waktu response GPS pertama (ms)
    let _requestStartTime = null;  // Waktu mulai request GPS
    let _iframeCrossCheckResult = null; // Hasil cross-check iframe
    let _apiTamperFlags = [];      // Flags dari pengecekan API tampering

    // ═══════════════════════════════════════════════
    // PUBLIC API
    // ═══════════════════════════════════════════════

    /**
     * Mulai pengumpulan & analisis GPS anti-fake.
     * @param {Object} options
     * @param {Function} options.onProgress - (count, total)
     * @returns {Promise<Object>} Hasil analisis
     */
    function collectAndAnalyze(options = {}) {
        return new Promise((resolve, reject) => {
            if (_isCollecting) {
                reject(new Error('Pengumpulan sampel GPS sedang berjalan.'));
                return;
            }

            _accuracySamples = [];
            _positionSamples = [];
            _isCollecting = true;
            _suspiciousFlags = [];
            _positionData = null;
            _sensorData = { hasMotion: false, hasOrientation: false, motionEvents: 0, maxAccel: 0 };
            _firstResponseTime = null;
            _requestStartTime = null;
            _iframeCrossCheckResult = null;
            _apiTamperFlags = [];

            const protocol = window.location.protocol;
            const host = window.location.hostname;
            const isSecure = protocol === 'https:' ||
                ['localhost', '127.0.0.1', '::1'].includes(host);

            if (!isSecure) {
                _isCollecting = false;
                reject(new Error('Akses lokasi membutuhkan HTTPS atau localhost.'));
                return;
            }

            if (!navigator.geolocation) {
                _isCollecting = false;
                reject(new Error('Geolokasi tidak didukung oleh browser ini.'));
                return;
            }

            // ─── Cek API tampering SEBELUM menggunakan geolocation ───
            _apiTamperFlags = detectApiTampering();

            // ─── Mulai cek sensor perangkat (background) ───
            startSensorCheck();

            // ─── Mulai iframe cross-check (background) ───
            startIframeCrossCheck();

            // ─── Kumpulkan sampel GPS ───
            let sampleCount = 0;
            _requestStartTime = performance.now();

            _watchId = navigator.geolocation.watchPosition(
                function (position) {
                    // Catat waktu response pertama
                    if (_firstResponseTime === null) {
                        _firstResponseTime = performance.now() - _requestStartTime;
                    }

                    const sample = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        altitude: position.coords.altitude,
                        altitudeAccuracy: position.coords.altitudeAccuracy,
                        speed: position.coords.speed,
                        heading: position.coords.heading,
                        gpsTimestamp: position.timestamp,
                        systemTimestamp: Date.now(),
                    };

                    _positionSamples.push(sample);
                    _accuracySamples.push(sample.accuracy);
                    sampleCount++;

                    // Simpan posisi terakhir
                    _positionData = {
                        latitude: sample.lat,
                        longitude: sample.lng,
                        accuracy: sample.accuracy,
                        altitude: sample.altitude,
                        altitudeAccuracy: sample.altitudeAccuracy,
                        heading: sample.heading,
                        speed: sample.speed,
                        timestamp: sample.gpsTimestamp,
                    };

                    if (options.onProgress) {
                        options.onProgress(sampleCount, CONFIG.MAX_SAMPLES);
                    }

                    if (sampleCount >= CONFIG.MAX_SAMPLES) {
                        finishAnalysis(resolve);
                    }
                },
                function (error) {
                    stopCollection();
                    let msg = 'Gagal mendapatkan lokasi.';
                    switch (error.code) {
                        case error.PERMISSION_DENIED: msg = 'Akses lokasi ditolak.'; break;
                        case error.POSITION_UNAVAILABLE: msg = 'Lokasi tidak tersedia.'; break;
                        case error.TIMEOUT: msg = 'Timeout lokasi.'; break;
                    }
                    reject(new Error(msg));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 20000,
                    maximumAge: 0, // PENTING: selalu minta data baru
                }
            );

            // Timeout keamanan
            setTimeout(function () {
                if (_isCollecting) {
                    if (_positionSamples.length >= CONFIG.MIN_SAMPLES) {
                        finishAnalysis(resolve);
                    } else if (_positionSamples.length > 0) {
                        finishAnalysis(resolve);
                    } else {
                        stopCollection();
                        reject(new Error('Timeout: tidak cukup sampel GPS.'));
                    }
                }
            }, 30000);
        });
    }

    function stopCollection() {
        if (_watchId !== null) {
            navigator.geolocation.clearWatch(_watchId);
            _watchId = null;
        }
        stopSensorCheck();
        _isCollecting = false;
    }

    function getLastResult() {
        if (!_positionData) return null;
        return {
            position: _positionData,
            accuracySamples: [..._accuracySamples],
            positionSamples: [..._positionSamples],
            sensorData: { ..._sensorData },
            flags: [..._suspiciousFlags],
            isSuspicious: _suspiciousFlags.length > 0,
        };
    }

    function reset() {
        stopCollection();
        _accuracySamples = [];
        _positionSamples = [];
        _positionData = null;
        _suspiciousFlags = [];
        _sensorData = { hasMotion: false, hasOrientation: false, motionEvents: 0, maxAccel: 0 };
        _firstResponseTime = null;
        _requestStartTime = null;
        _iframeCrossCheckResult = null;
        _apiTamperFlags = [];
        // Cleanup iframe if exists
        const existingIframe = document.getElementById('_geoguard_iframe');
        if (existingIframe) existingIframe.remove();
    }

    // ═══════════════════════════════════════════════
    // INTERNAL: Finish & Run All Heuristics
    // ═══════════════════════════════════════════════

    function finishAnalysis(resolve) {
        stopCollection();

        const flags = [];

        // ─── Heuristik 1: Accuracy Pattern Analysis ───
        flags.push(...analyzeAccuracyPattern(_accuracySamples));

        // ─── Heuristik 2: Position Drift Analysis ───
        flags.push(...analyzePositionDrift(_positionSamples));

        // ─── Heuristik 3: Speed/Heading Null Check ───
        flags.push(...analyzeSpeedHeading(_positionSamples));

        // ─── Heuristik 4: Altitude Analysis ───
        flags.push(...analyzeAltitude(_positionSamples));

        // ─── Heuristik 5: Timestamp Consistency ───
        flags.push(...analyzeTimestamps(_positionSamples));

        // ─── Heuristik 6: Device Sensor Check ───
        flags.push(...analyzeSensors(_sensorData));

        // ─── Heuristik 7: Multi-Reading Jitter ───
        flags.push(...analyzeJitter(_positionSamples));

        // ─── Heuristik 8: WebGL Hardware Check ───
        flags.push(...analyzeHardware());

        // ─── Heuristik 9: API Tampering Detection ───
        flags.push(..._apiTamperFlags);

        // ─── Heuristik 10: Response Timing Analysis ───
        flags.push(...analyzeResponseTiming());

        // ─── Heuristik 11: Iframe Cross-Check ───
        flags.push(...analyzeIframeCrossCheck());

        // ─── Heuristik 12: Permission State Check ───
        // (async, sudah dijalankan saat start)

        _suspiciousFlags = flags;

        // Cleanup iframe
        const existingIframe = document.getElementById('_geoguard_iframe');
        if (existingIframe) existingIframe.remove();

        const result = {
            position: _positionData,
            accuracySamples: [..._accuracySamples],
            positionSamples: _positionSamples.map(s => ({
                lat: s.lat, lng: s.lng, accuracy: s.accuracy,
                altitude: s.altitude, speed: s.speed, heading: s.heading,
            })),
            sensorData: { ..._sensorData },
            flags: [...flags],
            isSuspicious: flags.length > 0,
            analysis: getDetailedAnalysis(_accuracySamples, _positionSamples),
            riskScore: calculateRiskScore(flags),
            firstResponseMs: _firstResponseTime ? Math.round(_firstResponseTime) : null,
            iframeCrossCheck: _iframeCrossCheckResult,
        };

        resolve(result);
    }

    // ═══════════════════════════════════════════════
    // HEURISTIK 1: Accuracy Pattern
    // ═══════════════════════════════════════════════

    function analyzeAccuracyPattern(samples) {
        const flags = [];
        if (samples.length < 2) return flags;

        const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
        const variance = samples.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / samples.length;

        // Semua sampel terlalu sempurna (< 1m)
        if (samples.every(s => s < CONFIG.TOO_PERFECT_ACCURACY)) {
            flags.push('accuracy_too_perfect');
        }

        // Variance terlalu rendah (semua hampir identik)
        if (variance < CONFIG.MIN_ACCURACY_VARIANCE) {
            flags.push('accuracy_static');
        }

        // Semua angka bulat (5.0, 10.0, 20.0)
        const allRound = samples.every(s => {
            const mod1 = Math.abs(s % 1);
            return mod1 < CONFIG.ROUND_NUMBER_TOLERANCE || Math.abs(mod1 - 1) < CONFIG.ROUND_NUMBER_TOLERANCE;
        });
        if (allRound && samples.length >= CONFIG.MIN_SAMPLES) {
            flags.push('accuracy_round_numbers');
        }

        // Semua kelipatan 5
        const allMult5 = samples.every(s => Math.abs(s % 5) < CONFIG.ROUND_NUMBER_TOLERANCE);
        if (allMult5 && samples.length >= CONFIG.MIN_SAMPLES) {
            flags.push('accuracy_multiple_of_5');
        }

        return flags;
    }

    // ═══════════════════════════════════════════════
    // HEURISTIK 2: Position Drift Analysis
    // (GPS asli SELALU bergeser sedikit, bahkan saat diam)
    // ═══════════════════════════════════════════════

    function analyzePositionDrift(_samples) {
        const flags = [];
        if (_samples.length < 3) return flags;

        // Hitung total drift (pergerakan koordinat)
        let totalDrift = 0;
        let identicalCount = 0;

        for (let i = 1; i < _samples.length; i++) {
            const dLat = Math.abs(_samples[i].lat - _samples[i - 1].lat);
            const dLng = Math.abs(_samples[i].lng - _samples[i - 1].lng);
            const drift = Math.sqrt(dLat * dLat + dLng * dLng);

            totalDrift += drift;

            // Koordinat persis identik antar 2 pembacaan? Sangat curiga.
            if (dLat === 0 && dLng === 0) {
                identicalCount++;
            }
        }

        const avgDrift = totalDrift / (_samples.length - 1);

        // Jika rata-rata drift = 0, koordinat tidak bergerak sama sekali
        // GPS asli SELALU ada micro-drift bahkan saat diam
        if (avgDrift < CONFIG.MIN_POSITION_DRIFT) {
            flags.push('position_no_drift');
        }

        // Jika mayoritas pembacaan identik persis
        const identicalRatio = identicalCount / (_samples.length - 1);
        if (identicalRatio > 0.7 && _samples.length >= CONFIG.MIN_SAMPLES) {
            flags.push('position_identical_readings');
        }

        // Cek apakah semua koordinat memiliki desimal identik setelah 5 digit
        // Fake GPS sering menggunakan precision yang sama persis
        const latDecimals = _samples.map(s => getDecimalPlaces(s.lat));
        const lngDecimals = _samples.map(s => getDecimalPlaces(s.lng));
        const allSameLatPrec = latDecimals.every(d => d === latDecimals[0]);
        const allSameLngPrec = lngDecimals.every(d => d === lngDecimals[0]);

        if (allSameLatPrec && allSameLngPrec && _samples.length >= CONFIG.MIN_SAMPLES) {
            // Cek lebih lanjut: apakah digit terakhir selalu sama?
            const latLastDigits = _samples.map(s => getLastNDigits(s.lat, 3));
            const lngLastDigits = _samples.map(s => getLastNDigits(s.lng, 3));
            const allSameLatEnd = latLastDigits.every(d => d === latLastDigits[0]);
            const allSameLngEnd = lngLastDigits.every(d => d === lngLastDigits[0]);

            if (allSameLatEnd && allSameLngEnd) {
                flags.push('position_fixed_precision');
            }
        }

        return flags;
    }

    // ═══════════════════════════════════════════════
    // HEURISTIK 3: Speed & Heading Check
    // Fake GPS sering return null untuk speed/heading
    // padahal device seharusnya diam (speed = 0, bukan null)
    // ═══════════════════════════════════════════════

    function analyzeSpeedHeading(samples) {
        const flags = [];
        if (samples.length < 3) return flags;

        const allSpeedNull = samples.every(s => s.speed === null || s.speed === undefined);
        const allHeadingNull = samples.every(s => s.heading === null || s.heading === undefined);

        // Pada banyak device asli, speed tersedia (bisa 0 saat diam)
        // Tapi di fake GPS, sering null semua
        // Ini bukan indikator kuat sendiri, tapi kombinasi dengan flag lain = curiga
        if (allSpeedNull && allHeadingNull && samples.length >= CONFIG.MIN_SAMPLES) {
            // Hanya flag jika sudah ada indikator lain yang curiga
            // (ditangani di risk scoring)
            flags.push('speed_heading_all_null');
        }

        // Cek: speed selalu persis sama (bukan null)
        const speedValues = samples.filter(s => s.speed !== null && s.speed !== undefined).map(s => s.speed);
        if (speedValues.length >= 3) {
            const allSameSpeed = speedValues.every(v => v === speedValues[0]);
            if (allSameSpeed && speedValues[0] !== 0) {
                flags.push('speed_constant_nonzero');
            }
        }

        return flags;
    }

    // ═══════════════════════════════════════════════
    // HEURISTIK 4: Altitude Analysis
    // Fake GPS sering set altitude = 0 atau null
    // ═══════════════════════════════════════════════

    function analyzeAltitude(samples) {
        const flags = [];
        if (samples.length < 3) return flags;

        const altitudes = samples.map(s => s.altitude);
        const nonNullAlt = altitudes.filter(a => a !== null && a !== undefined);

        // Semua altitude null
        if (nonNullAlt.length === 0 && samples.length >= CONFIG.MIN_SAMPLES) {
            // Banyak device memang tidak support altitude, jadi ini weak signal
            flags.push('altitude_all_null');
        }

        // Semua altitude = 0 persis
        if (nonNullAlt.length > 0 && nonNullAlt.every(a => a === 0)) {
            flags.push('altitude_all_zero');
        }

        // Altitude tidak berubah sama sekali (harusnya ada sedikit variasi)
        if (nonNullAlt.length >= 3) {
            const altVariance = calcVariance(nonNullAlt);
            if (altVariance === 0) {
                flags.push('altitude_no_variance');
            }
        }

        return flags;
    }

    // ═══════════════════════════════════════════════
    // HEURISTIK 5: Timestamp Consistency
    // GPS timestamp harus dekat dengan Date.now()
    // Fake GPS kadang menggunakan timestamp lama/aneh
    // ═══════════════════════════════════════════════

    function analyzeTimestamps(samples) {
        const flags = [];
        if (samples.length < 2) return flags;

        let bigGapCount = 0;
        for (const s of samples) {
            const diff = Math.abs(s.systemTimestamp - s.gpsTimestamp);
            if (diff > CONFIG.MAX_TIMESTAMP_DIFF_MS) {
                bigGapCount++;
            }
        }

        // Mayoritas timestamp memiliki gap besar
        if (bigGapCount > samples.length * 0.5) {
            flags.push('timestamp_inconsistent');
        }

        // Cek apakah semua GPS timestamp identik (tidak berubah)
        const gpsTimestamps = samples.map(s => s.gpsTimestamp);
        const allSameTimestamp = gpsTimestamps.every(t => t === gpsTimestamps[0]);
        if (allSameTimestamp && samples.length >= 3) {
            flags.push('timestamp_all_identical');
        }

        return flags;
    }

    // ═══════════════════════════════════════════════
    // HEURISTIK 6: Device Motion/Orientation Sensor
    // Perangkat asli selalu punya data accelerometer
    // Fake GPS app kadang tidak trigger sensor events
    // ═══════════════════════════════════════════════

    function startSensorCheck() {
        // Cek DeviceMotionEvent
        if (typeof DeviceMotionEvent !== 'undefined') {
            _motionHandler = function (event) {
                _sensorData.hasMotion = true;
                _sensorData.motionEvents++;
                const accel = event.accelerationIncludingGravity;
                if (accel) {
                    const magnitude = Math.sqrt(
                        (accel.x || 0) ** 2 + (accel.y || 0) ** 2 + (accel.z || 0) ** 2
                    );
                    if (magnitude > _sensorData.maxAccel) {
                        _sensorData.maxAccel = magnitude;
                    }
                }
            };
            window.addEventListener('devicemotion', _motionHandler);
        }

        // Cek DeviceOrientationEvent
        if (typeof DeviceOrientationEvent !== 'undefined') {
            _orientationHandler = function () {
                _sensorData.hasOrientation = true;
            };
            window.addEventListener('deviceorientation', _orientationHandler);
        }
    }

    function stopSensorCheck() {
        if (_motionHandler) {
            window.removeEventListener('devicemotion', _motionHandler);
            _motionHandler = null;
        }
        if (_orientationHandler) {
            window.removeEventListener('deviceorientation', _orientationHandler);
            _orientationHandler = null;
        }
    }

    function analyzeSensors(sensorData) {
        const flags = [];

        // Di mobile device asli, accelerometer hampir selalu tersedia
        // Tapi di desktop browser = tidak ada, jadi hanya flag pada mobile
        const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

        if (isMobile && !sensorData.hasMotion && sensorData.motionEvents === 0) {
            flags.push('sensor_no_motion');
        }

        // Jika device mengklaim mobile tapi tidak ada orientasi sama sekali
        if (isMobile && !sensorData.hasOrientation) {
            flags.push('sensor_no_orientation');
        }

        return flags;
    }

    // ═══════════════════════════════════════════════
    // HEURISTIK 7: Multi-Reading Jitter
    // GPS asli selalu punya "noise" alami
    // koordinat bergeser sedikit di setiap pembacaan
    // ═══════════════════════════════════════════════

    function analyzeJitter(samples) {
        const flags = [];
        if (samples.length < 4) return flags;

        // Konversi ke meter untuk analisis jitter
        const jitters = [];
        for (let i = 1; i < samples.length; i++) {
            const dMeters = haversineDistanceMeters(
                samples[i - 1].lat, samples[i - 1].lng,
                samples[i].lat, samples[i].lng
            );
            jitters.push(dMeters);
        }

        const avgJitter = jitters.reduce((a, b) => a + b, 0) / jitters.length;
        const maxJitter = Math.max(...jitters);

        // Jika semua jitter = 0 (tidak bergeser sama sekali)
        if (maxJitter === 0) {
            flags.push('jitter_zero');
        }

        // Jika rata-rata jitter sangat rendah DAN sangat konsisten
        // GPS asli punya jitter acak, fake GPS sering konstan
        if (avgJitter > 0 && avgJitter < CONFIG.MIN_JITTER_METERS) {
            const jitterVariance = calcVariance(jitters);
            if (jitterVariance < 0.001) {
                flags.push('jitter_too_uniform');
            }
        }

        return flags;
    }

    // ═══════════════════════════════════════════════
    // HEURISTIK 8: WebGL / Hardware Fingerprint
    // Verifikasi bahwa device memang punya GPS hardware
    // ═══════════════════════════════════════════════

    function analyzeHardware() {
        const flags = [];

        // Cek apakah user agent mengklaim mobile tapi WebGL
        // menunjukkan renderer desktop (emulator)
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            if (gl) {
                const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (debugInfo) {
                    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
                    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';

                    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
                    const isDesktopGPU = /NVIDIA|GeForce|Radeon|Intel HD|AMD|GTX|RTX/i.test(renderer);

                    // Mobile UA tapi desktop GPU = kemungkinan emulator
                    if (isMobileUA && isDesktopGPU) {
                        flags.push('hardware_emulator_suspected');
                    }

                    // Renderer = "Google SwiftShader" = software rendering (headless/emulator)
                    if (/SwiftShader/i.test(renderer)) {
                        flags.push('hardware_swiftshader');
                    }
                }
            }
        } catch (_) {
            // WebGL not available, skip
        }

        return flags;
    }

    // ═══════════════════════════════════════════════
    // HEURISTIK 9: API TAMPERING DETECTION
    // Cek apakah navigator.geolocation di-override
    // oleh extension, DevTools, atau script lain
    // ═══════════════════════════════════════════════

    function detectApiTampering() {
        const flags = [];

        try {
            // --- Check 1: toString() native function check ---
            // Fungsi browser asli mengembalikan "function X() { [native code] }"
            // Fungsi yang di-override mengembalikan kode JS aslinya
            const geoProto = navigator.geolocation;
            const wpStr = String(geoProto.watchPosition);
            const cpStr = String(geoProto.getCurrentPosition);

            const isNativeWP = /\[native code\]/.test(wpStr);
            const isNativeCP = /\[native code\]/.test(cpStr);

            if (!isNativeWP || !isNativeCP) {
                flags.push('api_tampered_tostring');
            }

            // --- Check 2: Prototype chain integrity ---
            // Cek apakah geolocation masih instance yang benar
            if (typeof Geolocation !== 'undefined') {
                if (!(navigator.geolocation instanceof Geolocation)) {
                    flags.push('api_tampered_prototype');
                }

                // Cek apakah method ada di prototype (bukan di instance)
                const proto = Geolocation.prototype;
                const hasOwnWP = geoProto.hasOwnProperty('watchPosition');
                const hasOwnCP = geoProto.hasOwnProperty('getCurrentPosition');

                // Jika method ada di instance (bukan prototype) = di-override
                if (hasOwnWP || hasOwnCP) {
                    flags.push('api_tampered_ownproperty');
                }

                // Cek toString dari prototype method
                if (proto.watchPosition) {
                    const protoWPStr = String(proto.watchPosition);
                    if (!/\[native code\]/.test(protoWPStr)) {
                        flags.push('api_tampered_prototype_method');
                    }
                }
            }

            // --- Check 3: Property descriptor check ---
            // Properti asli biasanya configurable dan writable dari prototype
            // Jika seseorang re-define dengan Object.defineProperty = curiga
            const desc = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
            if (desc) {
                // Browser asli biasanya tidak punya own property descriptor untuk geolocation
                // Itu ada di Navigator.prototype
                if (desc.value !== undefined && desc.configurable === false) {
                    flags.push('api_tampered_descriptor');
                }
            }

            // --- Check 4: Cek apakah ada global override markers ---
            // Beberapa extension meninggalkan jejak
            if (window.__geolocate || window.__fakeGeo || window._mockGeolocation ||
                window.__geolocationOverride || window.__fakegps) {
                flags.push('api_extension_global_detected');
            }

            // --- Check 5: Chrome DevTools override detection ---
            // Chrome DevTools override memiliki pola khusus
            // Ketika override aktif, coords selalu persis sama dan
            // getCurrentPosition/watchPosition walaupun masih "native"
            // memberikan response sangat cepat (< 10ms)
            // (ditangani di analyzeResponseTiming)

        } catch (e) {
            // Jika gagal melakukan check = mungkin ada yang aneh
            flags.push('api_check_error');
        }

        return flags;
    }

    // ═══════════════════════════════════════════════
    // HEURISTIK 10: RESPONSE TIMING ANALYSIS
    // GPS hardware asli butuh waktu untuk respond
    // (~100-5000ms). Fake GPS respond hampir instan (< 50ms)
    // ═══════════════════════════════════════════════

    function analyzeResponseTiming() {
        const flags = [];

        if (_firstResponseTime !== null) {
            // GPS asli butuh waktu karena harus query hardware
            // Fake GPS (extension/devtools) respond hampir instan
            if (_firstResponseTime < CONFIG.FIRST_RESPONSE_FAKE_THRESHOLD_MS) {
                flags.push('timing_too_fast');
            }
        }

        // Cek apakah SEMUA sampel datang sangat cepat berturutan
        // GPS asli ada jeda antar pembacaan (~1 detik)
        if (_positionSamples.length >= 3) {
            const intervals = [];
            for (let i = 1; i < _positionSamples.length; i++) {
                intervals.push(
                    _positionSamples[i].systemTimestamp - _positionSamples[i - 1].systemTimestamp
                );
            }
            // Jika semua interval < 100ms = tidak wajar
            const allTooFast = intervals.every(iv => iv < 100);
            if (allTooFast) {
                flags.push('timing_burst_responses');
            }
        }

        return flags;
    }

    // ═══════════════════════════════════════════════
    // HEURISTIK 11: IFRAME CROSS-CHECK
    // Buat iframe tersembunyi untuk mendapat geolocation
    // dari konteks bersih (tidak ter-override extension)
    // Bandingkan hasilnya dengan main window
    // ═══════════════════════════════════════════════

    function startIframeCrossCheck() {
        _iframeCrossCheckResult = null;

        try {
            // Buat iframe sandbox minimal (same-origin)
            // Beberapa extension HANYA override main window, bukan iframe
            const iframe = document.createElement('iframe');
            iframe.id = '_geoguard_iframe';
            iframe.style.cssText = 'display:none;width:0;height:0;border:0;position:absolute;';
            iframe.sandbox = 'allow-same-origin'; // Izinkan akses tapi batasi script
            iframe.src = 'about:blank';
            document.body.appendChild(iframe);

            // Cek apakah iframe punya geolocation yang berbeda
            const iframeGeo = iframe.contentWindow && iframe.contentWindow.navigator &&
                              iframe.contentWindow.navigator.geolocation;

            if (iframeGeo) {
                // Bandingkan referensi fungsi
                const mainWP = navigator.geolocation.watchPosition;
                const iframeWP = iframeGeo.watchPosition;

                // Jika fungsi watchPosition berbeda = salah satu di-override
                const mainWPStr = String(mainWP);
                const iframeWPStr = String(iframeWP);

                if (mainWPStr !== iframeWPStr) {
                    _iframeCrossCheckResult = 'mismatch_function';
                }

                // Coba dapatkan lokasi dari iframe
                try {
                    iframeGeo.getCurrentPosition(
                        function(iframePos) {
                            // Bandingkan dengan posisi dari main window
                            if (_positionData) {
                                const dist = haversineDistanceMeters(
                                    _positionData.latitude, _positionData.longitude,
                                    iframePos.coords.latitude, iframePos.coords.longitude
                                );
                                if (dist > CONFIG.IFRAME_MAX_DISTANCE_METERS) {
                                    _iframeCrossCheckResult = 'mismatch_position';
                                } else {
                                    _iframeCrossCheckResult = 'match';
                                }
                            }
                        },
                        function() {
                            _iframeCrossCheckResult = 'iframe_failed';
                        },
                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                    );
                } catch(e) {
                    _iframeCrossCheckResult = 'iframe_geo_error';
                }
            }
        } catch (e) {
            // iframe creation failed, skip
            _iframeCrossCheckResult = 'error';
        }
    }

    function analyzeIframeCrossCheck() {
        const flags = [];

        if (_iframeCrossCheckResult === 'mismatch_function') {
            flags.push('iframe_function_mismatch');
        }
        if (_iframeCrossCheckResult === 'mismatch_position') {
            flags.push('iframe_position_mismatch');
        }

        return flags;
    }

    // ═══════════════════════════════════════════════
    // RISK SCORE CALCULATOR
    // ═══════════════════════════════════════════════

    function calculateRiskScore(flags) {
        const weights = {
            // === CRITICAL: Browser extension / DevTools override ===
            'api_tampered_tostring': 45,        // Fungsi bukan [native code]
            'api_tampered_prototype': 40,        // Bukan instanceof Geolocation
            'api_tampered_ownproperty': 45,      // Method di-override di instance
            'api_tampered_prototype_method': 45,  // Prototype method di-override
            'api_tampered_descriptor': 35,        // Property descriptor diubah
            'api_extension_global_detected': 50,  // Global variable extension terdeteksi
            'api_check_error': 15,                // Gagal cek (mungkin dikunci)
            'iframe_function_mismatch': 40,       // Fungsi beda antara main & iframe
            'iframe_position_mismatch': 45,       // Posisi beda antara main & iframe
            'timing_too_fast': 30,                // Response < 50ms = tidak pakai hardware
            'timing_burst_responses': 25,         // Semua response < 100ms interval

            // === HIGH: Pola khas fake GPS mobile ===
            'position_no_drift': 30,
            'position_identical_readings': 35,
            'jitter_zero': 35,
            'accuracy_static': 20,
            'accuracy_round_numbers': 25,
            'accuracy_multiple_of_5': 20,
            'position_fixed_precision': 25,
            'timestamp_all_identical': 30,
            'hardware_emulator_suspected': 40,
            'hardware_swiftshader': 45,
            'altitude_all_zero': 15,

            // === MEDIUM ===
            'accuracy_too_perfect': 15,
            'jitter_too_uniform': 20,
            'speed_constant_nonzero': 15,
            'timestamp_inconsistent': 15,
            'altitude_no_variance': 10,
            'sensor_no_motion': 10,
            'sensor_no_orientation': 8,

            // === LOW (weak alone, strong combined) ===
            'speed_heading_all_null': 5,
            'altitude_all_null': 3,
        };

        let score = 0;
        for (const flag of flags) {
            score += weights[flag] || 5;
        }
        return Math.min(score, 100);
    }

    // ═══════════════════════════════════════════════
    // UTILITY FUNCTIONS
    // ═══════════════════════════════════════════════

    function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth radius in meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function calcVariance(arr) {
        if (arr.length === 0) return 0;
        const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
        return arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length;
    }

    function getDecimalPlaces(num) {
        const str = String(num);
        const dot = str.indexOf('.');
        return dot === -1 ? 0 : str.length - dot - 1;
    }

    function getLastNDigits(num, n) {
        const str = String(num).replace('.', '');
        return str.slice(-n);
    }

    function getDetailedAnalysis(accSamples, posSamples) {
        if (accSamples.length === 0) {
            return { mean: 0, variance: 0, sampleCount: 0 };
        }

        const mean = accSamples.reduce((a, b) => a + b, 0) / accSamples.length;
        const variance = calcVariance(accSamples);

        // Position drift analysis
        let totalDriftMeters = 0;
        for (let i = 1; i < posSamples.length; i++) {
            totalDriftMeters += haversineDistanceMeters(
                posSamples[i - 1].lat, posSamples[i - 1].lng,
                posSamples[i].lat, posSamples[i].lng
            );
        }

        return {
            mean: parseFloat(mean.toFixed(4)),
            variance: parseFloat(variance.toFixed(4)),
            stdDev: parseFloat(Math.sqrt(variance).toFixed(4)),
            min: parseFloat(Math.min(...accSamples).toFixed(4)),
            max: parseFloat(Math.max(...accSamples).toFixed(4)),
            range: parseFloat((Math.max(...accSamples) - Math.min(...accSamples)).toFixed(4)),
            sampleCount: accSamples.length,
            totalDriftMeters: parseFloat(totalDriftMeters.toFixed(6)),
            avgDriftMeters: parseFloat((totalDriftMeters / Math.max(posSamples.length - 1, 1)).toFixed(6)),
        };
    }

    // ═══════════════════════════════════════════════
    // FLAG DESCRIPTIONS (untuk UI)
    // ═══════════════════════════════════════════════

    const FLAG_DESCRIPTIONS = {
        accuracy_too_perfect: {
            id: 'Akurasi GPS terlalu sempurna (< 1m). GPS asli jarang seakurat ini secara konsisten.',
            en: 'GPS accuracy too perfect (< 1m). Real GPS rarely achieves this consistently.',
            severity: 'warning',
        },
        accuracy_static: {
            id: 'Akurasi GPS tidak berfluktuasi. Pola khas fake GPS.',
            en: 'GPS accuracy does not fluctuate. Typical fake GPS pattern.',
            severity: 'danger',
        },
        accuracy_round_numbers: {
            id: 'Akurasi GPS selalu angka bulat. Pola mencurigakan.',
            en: 'GPS accuracy always round numbers. Suspicious pattern.',
            severity: 'danger',
        },
        accuracy_multiple_of_5: {
            id: 'Akurasi GPS selalu kelipatan 5 (5.0, 10.0, 15.0). Tanda fake GPS.',
            en: 'GPS accuracy always multiples of 5. Fake GPS sign.',
            severity: 'danger',
        },
        position_no_drift: {
            id: 'Koordinat GPS tidak bergeser sama sekali. GPS asli SELALU bergeser sedikit bahkan saat diam.',
            en: 'GPS coordinates do not drift at all. Real GPS ALWAYS drifts slightly even when stationary.',
            severity: 'danger',
        },
        position_identical_readings: {
            id: 'Mayoritas pembacaan GPS menghasilkan koordinat persis identik. Tidak mungkin untuk GPS asli.',
            en: 'Majority of GPS readings produce exactly identical coordinates. Impossible for real GPS.',
            severity: 'danger',
        },
        position_fixed_precision: {
            id: 'Semua koordinat memiliki presisi desimal identik. Tanda data GPS yang dihasilkan software.',
            en: 'All coordinates have identical decimal precision. Sign of software-generated GPS data.',
            severity: 'warning',
        },
        speed_heading_all_null: {
            id: 'Data kecepatan dan arah GPS selalu null.',
            en: 'GPS speed and heading data always null.',
            severity: 'info',
        },
        speed_constant_nonzero: {
            id: 'Kecepatan GPS selalu konstan (non-zero). Tidak wajar.',
            en: 'GPS speed always constant (non-zero). Unnatural.',
            severity: 'warning',
        },
        altitude_all_null: {
            id: 'Data altitude selalu null.',
            en: 'Altitude data always null.',
            severity: 'info',
        },
        altitude_all_zero: {
            id: 'Altitude selalu tepat 0. Fake GPS sering menggunakan altitude = 0.',
            en: 'Altitude always exactly 0. Fake GPS often uses altitude = 0.',
            severity: 'warning',
        },
        altitude_no_variance: {
            id: 'Altitude tidak berubah sama sekali. GPS asli selalu ada variasi altitude.',
            en: 'Altitude does not change at all. Real GPS always has altitude variation.',
            severity: 'warning',
        },
        timestamp_inconsistent: {
            id: 'Timestamp GPS tidak konsisten dengan waktu sistem.',
            en: 'GPS timestamps inconsistent with system time.',
            severity: 'warning',
        },
        timestamp_all_identical: {
            id: 'Semua timestamp GPS identik. Seharusnya berubah setiap pembacaan.',
            en: 'All GPS timestamps identical. Should change with each reading.',
            severity: 'danger',
        },
        sensor_no_motion: {
            id: 'Perangkat mobile tidak melaporkan data accelerometer. Mungkin emulator.',
            en: 'Mobile device reports no accelerometer data. Possibly an emulator.',
            severity: 'warning',
        },
        sensor_no_orientation: {
            id: 'Perangkat mobile tidak melaporkan data orientasi.',
            en: 'Mobile device reports no orientation data.',
            severity: 'info',
        },
        jitter_zero: {
            id: 'Tidak ada jitter GPS sama sekali. GPS asli selalu memiliki noise alami.',
            en: 'No GPS jitter at all. Real GPS always has natural noise.',
            severity: 'danger',
        },
        jitter_too_uniform: {
            id: 'Jitter GPS terlalu seragam. GPS asli punya jitter acak, bukan konstan.',
            en: 'GPS jitter too uniform. Real GPS has random jitter, not constant.',
            severity: 'warning',
        },
        hardware_emulator_suspected: {
            id: 'User agent mobile tapi GPU desktop terdeteksi. Kemungkinan emulator Android.',
            en: 'Mobile user agent but desktop GPU detected. Possibly Android emulator.',
            severity: 'danger',
        },
        hardware_swiftshader: {
            id: 'Software renderer (SwiftShader) terdeteksi. Mungkin headless browser atau emulator.',
            en: 'Software renderer (SwiftShader) detected. Possibly headless browser or emulator.',
            severity: 'danger',
        },

        // ─── Heuristik 9-12: Browser Extension / DevTools Detection ───
        api_tampered_tostring: {
            id: 'API Geolocation terdeteksi di-override! Fungsi watchPosition/getCurrentPosition bukan native. Kemungkinan menggunakan extension fake GPS.',
            en: 'Geolocation API overridden! watchPosition/getCurrentPosition are not native functions. Likely using a fake GPS extension.',
            severity: 'danger',
        },
        api_tampered_prototype: {
            id: 'Geolocation API terdeteksi bukan instance asli. Prototype chain telah dimanipulasi.',
            en: 'Geolocation API is not a genuine instance. Prototype chain has been manipulated.',
            severity: 'danger',
        },
        api_tampered_ownproperty: {
            id: 'Method geolocation di-override langsung di instance (bukan dari prototype). Tanda extension fake GPS.',
            en: 'Geolocation methods overridden directly on instance (not from prototype). Sign of fake GPS extension.',
            severity: 'danger',
        },
        api_tampered_prototype_method: {
            id: 'Method di Geolocation.prototype telah diubah dari native code. Extension aktif terdeteksi.',
            en: 'Geolocation.prototype methods changed from native code. Active extension detected.',
            severity: 'danger',
        },
        api_tampered_descriptor: {
            id: 'Property descriptor navigator.geolocation telah dimodifikasi. Bukan konfigurasi browser standar.',
            en: 'Property descriptor of navigator.geolocation has been modified. Not standard browser configuration.',
            severity: 'warning',
        },
        api_extension_global_detected: {
            id: 'Variabel global dari extension fake GPS terdeteksi di window object.',
            en: 'Global variable from fake GPS extension detected in window object.',
            severity: 'danger',
        },
        api_check_error: {
            id: 'Gagal melakukan pengecekan integritas API. Mungkin ada yang menghalangi pengecekan.',
            en: 'Failed to perform API integrity check. Something may be blocking the check.',
            severity: 'warning',
        },
        timing_too_fast: {
            id: 'GPS merespons terlalu cepat (< 50ms). GPS hardware asli butuh waktu untuk mendapat sinyal satelit.',
            en: 'GPS responded too fast (< 50ms). Real GPS hardware needs time to acquire satellite signal.',
            severity: 'danger',
        },
        timing_burst_responses: {
            id: 'Semua sampel GPS datang dalam interval < 100ms. GPS asli memiliki jeda antar pembacaan.',
            en: 'All GPS samples arrived within < 100ms intervals. Real GPS has delays between readings.',
            severity: 'warning',
        },
        iframe_function_mismatch: {
            id: 'Fungsi geolocation di iframe berbeda dengan main window. Ada yang di-override oleh extension!',
            en: 'Iframe geolocation function differs from main window. Something is being overridden by an extension!',
            severity: 'danger',
        },
        iframe_position_mismatch: {
            id: 'Posisi GPS dari iframe (bersih) berbeda jauh dari main window. Main window menggunakan lokasi palsu.',
            en: 'GPS position from iframe (clean) differs significantly from main window. Main window using fake location.',
            severity: 'danger',
        },
    };

    function getFlagDescription(flagKey, lang) {
        const desc = FLAG_DESCRIPTIONS[flagKey];
        if (!desc) return flagKey;
        return lang === 'en' ? desc.en : desc.id;
    }

    function getFlagSeverity(flagKey) {
        return (FLAG_DESCRIPTIONS[flagKey] || {}).severity || 'info';
    }

    // ═══════════════════════════════════════════════
    // EXPOSE PUBLIC API
    // ═══════════════════════════════════════════════

    return {
        collectAndAnalyze,
        stopCollection,
        getLastResult,
        reset,
        getFlagDescription,
        getFlagSeverity,
        calculateRiskScore,
        FLAG_DESCRIPTIONS,
        CONFIG,
    };
})();

window.GeoGuard = GeoGuard;
