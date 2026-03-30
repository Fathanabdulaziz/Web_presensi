<?php

declare(strict_types=1);

/**
 * GeoGuardService - Anti-Fake GPS (Heuristik) System
 * 
 * Lapisan Keamanan:
 * 1. Speed Trap (Haversine) - Validasi kecepatan perpindahan
 * 2. Cek Fluktuasi Akurasi - Deteksi akurasi GPS statis/terlalu sempurna
 * 3. Validasi IP vs GPS - Bandingkan lokasi IP dengan koordinat GPS
 * 4. Role-Based Validation - Aturan berbeda per departemen
 * 5. Frontend Risk Score - Validasi skor risiko dari 8 heuristik frontend
 * 6. Position Drift Server Check - Verifikasi ulang sampel posisi dari frontend
 */
final class GeoGuardService
{
    private PDO $db;

    // Batas kecepatan maksimal (km/h) - di atas ini dianggap fake GPS
    private const MAX_SPEED_KMH = 200;

    // Batas kecepatan mencurigakan (km/h)
    private const SUSPICIOUS_SPEED_KMH = 120;

    // Jarak maksimal antara IP location dan GPS (km)
    private const MAX_IP_GPS_DISTANCE_KM = 500;

    // Jarak mencurigakan antara IP location dan GPS (km)
    private const SUSPICIOUS_IP_GPS_DISTANCE_KM = 200;

    // Minimum variasi akurasi yang wajar (jika semua sampel identik = suspicious)
    private const MIN_ACCURACY_VARIANCE = 0.5;

    // Batas akurasi "terlalu sempurna"
    private const TOO_PERFECT_ACCURACY = 1.0;

    // Jumlah minimum sampel akurasi
    private const MIN_ACCURACY_SAMPLES = 3;

    // Risk score dari frontend di atas nilai ini = blokir
    private const RISK_SCORE_BLOCK_THRESHOLD = 50;

    // Risk score dari frontend di atas nilai ini = flagged/curiga
    private const RISK_SCORE_SUSPICIOUS_THRESHOLD = 20;

    public function __construct(PDO $db)
    {
        $this->db = $db;
    }

    // ═══════════════════════════════════════════════════════════════
    // MAIN VALIDATION ENTRY POINT
    // ═══════════════════════════════════════════════════════════════

    /**
     * Validasi utama anti-fake GPS.
     * Mengembalikan array ['passed' => bool, 'flags' => [...], 'block_reason' => string|null]
     */
    public function validateAttendance(
        int    $userId,
        string $userRole,
        float  $latitude,
        float  $longitude,
        ?float $accuracyMeters,
        ?array $accuracySamples,
        ?string $faceImageData,
        ?int   $frontendRiskScore = null,
        ?array $frontendFlags = null,
        ?array $positionSamples = null
    ): array {
        $result = [
            'passed'         => true,
            'flags'          => [],
            'block_reason'   => null,
            'speed_flag'     => 'normal',
            'accuracy_flag'  => 'normal',
            'ip_gps_flag'    => 'normal',
            'overall_status' => 'passed',
            'speed_kmh'      => null,
            'distance_km'    => null,
            'time_diff_sec'  => null,
            'client_ip'      => null,
            'ip_lat'         => null,
            'ip_lng'         => null,
            'ip_city'        => null,
            'ip_region'      => null,
            'ip_country'     => null,
        ];

        $clientIp = $this->getClientIp();
        $result['client_ip'] = $clientIp;

        // ─── Layer 4: Role-Based Validation ───
        $roleValidation = $this->validateByRole($userRole, $userId, $clientIp);
        if ($roleValidation['skip_gps']) {
            // HR/Admin: hanya cek IP kantor
            if (!$roleValidation['passed']) {
                $result['passed'] = false;
                $result['block_reason'] = $roleValidation['reason'];
                $result['overall_status'] = 'blocked';
                $result['flags'][] = 'role_ip_mismatch';
            }
            // Untuk HR/Admin, skip GPS check tapi tetap log
            $this->logGpsCheck($userId, $latitude, $longitude, $accuracyMeters, $accuracySamples, $result);
            return $result;
        }

        // HR/Admin sudah dihandle di atas. Finance & Karyawan lanjut ke bawah.

        // ─── Layer 5: Browser Extension / API Tampering Check ───
        // Jika frontend mendeteksi bahwa geolocation API di-tamper (extension/devtools),
        // LANGSUNG blokir tanpa perlu cek risk score
        if (is_array($frontendFlags)) {
            $criticalApiFlags = array_filter($frontendFlags, function($flag) {
                return strpos($flag, 'api_tampered_') === 0
                    || strpos($flag, 'iframe_') === 0
                    || $flag === 'api_extension_global_detected';
            });

            if (count($criticalApiFlags) > 0) {
                $flagsList = implode(', ', $criticalApiFlags);
                $result['passed'] = false;
                $result['block_reason'] = sprintf(
                    'Terdeteksi manipulasi API Geolocation browser! '
                    . 'Sistem mendeteksi bahwa browser Anda menggunakan extension atau tools yang mengubah data lokasi GPS. '
                    . 'Detail: %s. '
                    . 'Nonaktifkan extension fake GPS dan coba lagi.',
                    $flagsList
                );
                $result['overall_status'] = 'blocked';
                $result['flags'][] = 'api_tampering_blocked';
                $result['flags'] = array_merge($result['flags'], $criticalApiFlags);
                $this->logGpsCheck($userId, $latitude, $longitude, $accuracyMeters, $accuracySamples, $result);
                return $result;
            }
        }

        // ─── Layer 6: Frontend Risk Score (12 heuristik) ───
        if ($frontendRiskScore !== null && $frontendRiskScore >= self::RISK_SCORE_BLOCK_THRESHOLD) {
            $flagsList = is_array($frontendFlags) ? implode(', ', $frontendFlags) : 'unknown';
            $result['passed'] = false;
            $result['block_reason'] = sprintf(
                'Terdeteksi penggunaan fake GPS (skor risiko: %d/100). '
                . 'Flag: %s. Sistem mendeteksi pola heuristik yang tidak wajar dari perangkat Anda.',
                $frontendRiskScore,
                $flagsList
            );
            $result['overall_status'] = 'blocked';
            $result['flags'][] = 'frontend_risk_high';
            if (is_array($frontendFlags)) {
                $result['flags'] = array_merge($result['flags'], $frontendFlags);
            }
            $this->logGpsCheck($userId, $latitude, $longitude, $accuracyMeters, $accuracySamples, $result);
            return $result;
        }
        if ($frontendRiskScore !== null && $frontendRiskScore >= self::RISK_SCORE_SUSPICIOUS_THRESHOLD) {
            $result['flags'][] = 'frontend_risk_medium';
            if ($result['overall_status'] === 'passed') {
                $result['overall_status'] = 'flagged';
            }
        }

        // ─── Layer 6: Position Drift Server Check ───
        if (is_array($positionSamples) && count($positionSamples) >= 3) {
            $driftResult = $this->checkPositionDriftServerSide($positionSamples);
            if ($driftResult['flag'] === 'blocked') {
                $result['passed'] = false;
                $result['block_reason'] = $result['block_reason'] ?? $driftResult['reason'];
                $result['overall_status'] = 'blocked';
                $result['flags'][] = 'server_drift_blocked';
            } elseif ($driftResult['flag'] === 'suspicious') {
                $result['flags'][] = 'server_drift_suspicious';
                if ($result['overall_status'] === 'passed') {
                    $result['overall_status'] = 'flagged';
                }
            }
        }

        // ─── Layer 1: Speed Trap (Haversine) ───
        $speedResult = $this->checkSpeedTrap($userId, $latitude, $longitude);
        $result['speed_kmh']     = $speedResult['speed_kmh'];
        $result['distance_km']   = $speedResult['distance_km'];
        $result['time_diff_sec'] = $speedResult['time_diff_sec'];
        $result['speed_flag']    = $speedResult['flag'];

        if ($speedResult['flag'] === 'blocked') {
            $result['passed'] = false;
            $result['block_reason'] = $speedResult['reason'];
            $result['overall_status'] = 'blocked';
            $result['flags'][] = 'speed_impossible';
        } elseif ($speedResult['flag'] === 'suspicious') {
            $result['flags'][] = 'speed_suspicious';
            $result['overall_status'] = 'flagged';
        }

        // ─── Layer 2: Cek Fluktuasi Akurasi ───
        $accuracyResult = $this->checkAccuracyFluctuation($accuracyMeters, $accuracySamples);
        $result['accuracy_flag'] = $accuracyResult['flag'];

        if ($accuracyResult['flag'] === 'blocked') {
            $result['passed'] = false;
            $result['block_reason'] = $result['block_reason'] ?? $accuracyResult['reason'];
            $result['overall_status'] = 'blocked';
            $result['flags'][] = 'accuracy_static';
        } elseif ($accuracyResult['flag'] === 'suspicious') {
            $result['flags'][] = 'accuracy_suspicious';
            if ($result['overall_status'] === 'passed') {
                $result['overall_status'] = 'flagged';
            }
        }

        // ─── Layer 3: Validasi IP vs GPS ───
        $ipResult = $this->checkIpVsGps($clientIp, $latitude, $longitude);
        $result['ip_gps_flag'] = $ipResult['flag'];
        $result['ip_lat']     = $ipResult['ip_lat'];
        $result['ip_lng']     = $ipResult['ip_lng'];
        $result['ip_city']    = $ipResult['ip_city'];
        $result['ip_region']  = $ipResult['ip_region'];
        $result['ip_country'] = $ipResult['ip_country'];

        if ($ipResult['flag'] === 'blocked') {
            $result['passed'] = false;
            $result['block_reason'] = $result['block_reason'] ?? $ipResult['reason'];
            $result['overall_status'] = 'blocked';
            $result['flags'][] = 'ip_gps_mismatch';
        } elseif ($ipResult['flag'] === 'suspicious') {
            $result['flags'][] = 'ip_gps_suspicious';
            if ($result['overall_status'] === 'passed') {
                $result['overall_status'] = 'flagged';
            }
        }

        // ─── Finance tambahan: cek token 2FA ───
        if ($userRole === 'finance' && !$roleValidation['passed']) {
            $result['passed'] = false;
            $result['block_reason'] = $roleValidation['reason'];
            $result['overall_status'] = 'blocked';
            $result['flags'][] = 'finance_verification_failed';
        }

        // Log hasil pengecekan
        $this->logGpsCheck($userId, $latitude, $longitude, $accuracyMeters, $accuracySamples, $result);

        return $result;
    }

    // ═══════════════════════════════════════════════════════════════
    // LAYER 1: SPEED TRAP (HAVERSINE)
    // ═══════════════════════════════════════════════════════════════

    /**
     * Hitung jarak Haversine antara dua titik koordinat (dalam KM).
     */
    public function haversineDistance(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $earthRadiusKm = 6371.0;

        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);

        $a = sin($dLat / 2) * sin($dLat / 2)
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2))
            * sin($dLng / 2) * sin($dLng / 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return $earthRadiusKm * $c;
    }

    /**
     * Periksa kecepatan perpindahan dari titik absen terakhir.
     */
    private function checkSpeedTrap(int $userId, float $latitude, float $longitude): array
    {
        $result = [
            'flag'         => 'normal',
            'speed_kmh'    => null,
            'distance_km'  => null,
            'time_diff_sec'=> null,
            'reason'       => null,
        ];

        // Ambil titik absen terakhir user
        $stmt = $this->db->prepare(
            'SELECT latitude, longitude, created_at
             FROM gps_attendance_logs
             WHERE user_id = :user_id
             ORDER BY created_at DESC
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId]);
        $lastLog = $stmt->fetch();

        if (!$lastLog || $lastLog['latitude'] === null) {
            // Absen pertama, tidak ada data sebelumnya
            return $result;
        }

        $prevLat = (float) $lastLog['latitude'];
        $prevLng = (float) $lastLog['longitude'];
        $prevTime = strtotime($lastLog['created_at']);
        $currentTime = time();

        $timeDiffSec = $currentTime - $prevTime;
        $result['time_diff_sec'] = $timeDiffSec;

        // Minimal 10 detik untuk menghindari division by zero
        if ($timeDiffSec < 10) {
            $result['flag'] = 'blocked';
            $result['reason'] = 'Terlalu cepat melakukan absen ulang (kurang dari 10 detik).';
            return $result;
        }

        $distanceKm = $this->haversineDistance($prevLat, $prevLng, $latitude, $longitude);
        $result['distance_km'] = round($distanceKm, 4);

        // Hitung kecepatan dalam km/h
        $timeDiffHours = $timeDiffSec / 3600.0;
        $speedKmh = $distanceKm / $timeDiffHours;
        $result['speed_kmh'] = round($speedKmh, 2);

        if ($speedKmh > self::MAX_SPEED_KMH) {
            $result['flag'] = 'blocked';
            $result['reason'] = sprintf(
                'Kecepatan perpindahan tidak wajar: %.1f km/h (%.2f km dalam %d detik). '
                . 'Maksimal yang diizinkan: %d km/h. Kemungkinan menggunakan fake GPS.',
                $speedKmh,
                $distanceKm,
                $timeDiffSec,
                self::MAX_SPEED_KMH
            );
        } elseif ($speedKmh > self::SUSPICIOUS_SPEED_KMH) {
            $result['flag'] = 'suspicious';
            $result['reason'] = sprintf(
                'Kecepatan perpindahan mencurigakan: %.1f km/h.',
                $speedKmh
            );
        }

        return $result;
    }

    // ═══════════════════════════════════════════════════════════════
    // LAYER 2: CEK FLUKTUASI AKURASI
    // ═══════════════════════════════════════════════════════════════

    /**
     * Periksa apakah nilai akurasi GPS mencurigakan (terlalu sempurna/statis).
     */
    private function checkAccuracyFluctuation(?float $accuracyMeters, ?array $accuracySamples): array
    {
        $result = [
            'flag'   => 'normal',
            'reason' => null,
        ];

        // Jika tidak ada data sampel, hanya cek nilai tunggal
        if (empty($accuracySamples) || count($accuracySamples) < self::MIN_ACCURACY_SAMPLES) {
            // Cek akurasi tunggal
            if ($accuracyMeters !== null && $accuracyMeters < self::TOO_PERFECT_ACCURACY) {
                $result['flag'] = 'suspicious';
                $result['reason'] = sprintf(
                    'Akurasi GPS terlalu sempurna: %.2f meter. GPS asli jarang di bawah %.1f meter.',
                    $accuracyMeters,
                    self::TOO_PERFECT_ACCURACY
                );
            }
            return $result;
        }

        // Analisis sampel akurasi
        $numericSamples = array_map('floatval', $accuracySamples);
        $count = count($numericSamples);

        // Hitung mean
        $mean = array_sum($numericSamples) / $count;

        // Hitung variance
        $sumSquaredDiffs = 0;
        foreach ($numericSamples as $sample) {
            $sumSquaredDiffs += ($sample - $mean) ** 2;
        }
        $variance = $sumSquaredDiffs / $count;

        // Cek apakah semua sampel identik (variance = 0)
        if ($variance < self::MIN_ACCURACY_VARIANCE) {
            // Cek apakah ini angka bulat berulang (tanda khas fake GPS)
            $roundValues = array_filter($numericSamples, function ($v) {
                return fmod($v, 1.0) === 0.0 || fmod($v, 5.0) === 0.0;
            });

            if (count($roundValues) === $count) {
                $result['flag'] = 'blocked';
                $result['reason'] = sprintf(
                    'Akurasi GPS terdeteksi statis dan bulat berulang: semua sampel = [%s]. '
                    . 'Ini adalah pola khas aplikasi fake GPS.',
                    implode(', ', $numericSamples)
                );
            } else {
                $result['flag'] = 'suspicious';
                $result['reason'] = sprintf(
                    'Akurasi GPS hampir tidak berubah (variance: %.4f). Rata-rata: %.2f m. '
                    . 'GPS asli biasanya memiliki variasi akurasi yang lebih tinggi.',
                    $variance,
                    $mean
                );
            }
        }

        // Cek akurasi terlalu sempurna secara konsisten
        if ($result['flag'] === 'normal' && $mean < self::TOO_PERFECT_ACCURACY) {
            $result['flag'] = 'suspicious';
            $result['reason'] = sprintf(
                'Rata-rata akurasi GPS terlalu sempurna: %.2f meter secara konsisten.',
                $mean
            );
        }

        return $result;
    }

    // ═══════════════════════════════════════════════════════════════
    // LAYER 3: VALIDASI IP VS KOORDINAT GPS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Bandingkan estimasi lokasi IP dengan koordinat GPS dari browser.
     */
    private function checkIpVsGps(string $clientIp, float $gpsLat, float $gpsLng): array
    {
        $result = [
            'flag'       => 'normal',
            'reason'     => null,
            'ip_lat'     => null,
            'ip_lng'     => null,
            'ip_city'    => null,
            'ip_region'  => null,
            'ip_country' => null,
        ];

        // Skip untuk localhost / private IP
        if ($this->isPrivateIp($clientIp)) {
            return $result;
        }

        // Panggil IP Geolocation API
        $ipGeo = $this->getIpGeolocation($clientIp);
        if ($ipGeo === null) {
            // API gagal, skip pengecekan
            return $result;
        }

        $result['ip_lat']     = $ipGeo['lat'];
        $result['ip_lng']     = $ipGeo['lng'];
        $result['ip_city']    = $ipGeo['city'] ?? null;
        $result['ip_region']  = $ipGeo['region'] ?? null;
        $result['ip_country'] = $ipGeo['country'] ?? null;

        // Hitung jarak antara IP location dan GPS
        $distanceKm = $this->haversineDistance($ipGeo['lat'], $ipGeo['lng'], $gpsLat, $gpsLng);

        if ($distanceKm > self::MAX_IP_GPS_DISTANCE_KM) {
            $result['flag'] = 'blocked';
            $result['reason'] = sprintf(
                'Lokasi IP (%s, %s) sangat jauh dari GPS (%.4f, %.4f): %.1f km. '
                . 'IP terdeteksi di %s, %s (%s). Kemungkinan menggunakan VPN atau fake GPS.',
                $ipGeo['city'] ?? '?',
                $ipGeo['region'] ?? '?',
                $gpsLat,
                $gpsLng,
                $distanceKm,
                $ipGeo['city'] ?? '?',
                $ipGeo['region'] ?? '?',
                $ipGeo['country'] ?? '?'
            );
        } elseif ($distanceKm > self::SUSPICIOUS_IP_GPS_DISTANCE_KM) {
            $result['flag'] = 'suspicious';
            $result['reason'] = sprintf(
                'Lokasi IP dan GPS berbeda cukup jauh: %.1f km (batas: %d km).',
                $distanceKm,
                self::SUSPICIOUS_IP_GPS_DISTANCE_KM
            );
        }

        return $result;
    }

    /**
     * Ambil geolokasi dari IP menggunakan ip-api.com (gratis, tanpa API key).
     * Fallback ke data dummy jika API gagal.
     */
    private function getIpGeolocation(string $ip): ?array
    {
        $url = "http://ip-api.com/json/{$ip}?fields=status,lat,lon,city,regionName,countryCode";

        $context = stream_context_create([
            'http' => [
                'timeout' => 5,
                'method'  => 'GET',
                'header'  => "User-Agent: WebPresensi/1.0\r\n",
            ],
        ]);

        $response = @file_get_contents($url, false, $context);
        if ($response === false) {
            return null;
        }

        $data = json_decode($response, true);
        if (!is_array($data) || ($data['status'] ?? '') !== 'success') {
            return null;
        }

        return [
            'lat'     => (float) ($data['lat'] ?? 0),
            'lng'     => (float) ($data['lon'] ?? 0),
            'city'    => $data['city'] ?? null,
            'region'  => $data['regionName'] ?? null,
            'country' => $data['countryCode'] ?? null,
        ];
    }

    // ═══════════════════════════════════════════════════════════════
    // LAYER 4: ROLE-BASED VALIDATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Tentukan aturan validasi berdasarkan role user.
     *
     * - karyawan (Tim Lapangan/Sales): Semua validasi GPS ketat
     * - hr, admin: Skip GPS, cek IP kantor saja
     * - finance: Validasi GPS + IP kantor finance + token 2FA
     */
    private function validateByRole(string $role, int $userId, string $clientIp): array
    {
        switch ($role) {
            case 'admin':
            case 'hr':
                // HR & Admin: skip GPS, cek IP kantor saja
                $isOfficeIp = $this->isOfficeNetworkIp($clientIp, 'hr_admin');
                return [
                    'skip_gps' => true,
                    'passed'   => $isOfficeIp,
                    'reason'   => $isOfficeIp
                        ? null
                        : 'IP Address Anda tidak terdeteksi di jaringan Wi-Fi kantor. '
                          . 'Tim HR/Admin hanya bisa absen dari jaringan kantor.',
                ];

            case 'finance':
                // Finance: GPS tetap dicek + IP finance network + verifikasi 2 langkah
                $isFinanceIp = $this->isOfficeNetworkIp($clientIp, 'finance');
                $hasValidToken = $this->hasValidFinanceToken($userId);
                $passed = $isFinanceIp && $hasValidToken;
                $reason = null;

                if (!$isFinanceIp) {
                    $reason = 'IP Address Anda tidak terdeteksi di jaringan Finance. '
                        . 'Tim Finance wajib absen dari jaringan khusus Finance.';
                } elseif (!$hasValidToken) {
                    $reason = 'Token verifikasi 2 langkah tidak valid atau sudah kadaluarsa. '
                        . 'Tim Finance wajib melakukan verifikasi 2 langkah sebelum absen.';
                }

                return [
                    'skip_gps' => false, // Finance tetap dicek GPS
                    'passed'   => $passed,
                    'reason'   => $reason,
                ];

            case 'manager':
            case 'karyawan':
            default:
                // Tim Lapangan/Sales: semua validasi GPS ketat
                return [
                    'skip_gps' => false,
                    'passed'   => true,
                    'reason'   => null,
                ];
        }
    }

    /**
     * Cek apakah IP termasuk dalam jaringan kantor yang terdaftar.
     */
    private function isOfficeNetworkIp(string $clientIp, string $departmentTarget): bool
    {
        // Selalu izinkan localhost untuk development
        if ($this->isPrivateIp($clientIp) || $clientIp === '127.0.0.1' || $clientIp === '::1') {
            return true;
        }

        $stmt = $this->db->prepare(
            'SELECT ip_range_start, ip_range_end
             FROM office_networks
             WHERE is_active = 1
               AND (department_target = :dept OR department_target = "all")
             ORDER BY id'
        );
        $stmt->execute(['dept' => $departmentTarget]);
        $networks = $stmt->fetchAll();

        $clientLong = ip2long($clientIp);
        if ($clientLong === false) {
            return false;
        }

        foreach ($networks as $net) {
            $startLong = ip2long($net['ip_range_start']);
            $endLong   = ip2long($net['ip_range_end']);

            if ($startLong !== false && $endLong !== false
                && $clientLong >= $startLong && $clientLong <= $endLong) {
                return true;
            }
        }

        return false;
    }

    // ═══════════════════════════════════════════════════════════════
    // FINANCE 2-STEP VERIFICATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Generate token verifikasi 2 langkah untuk Finance.
     */
    public function generateFinanceToken(int $userId): string
    {
        $token = bin2hex(random_bytes(32));
        $hash = password_hash($token, PASSWORD_DEFAULT);
        $expiresAt = date('Y-m-d H:i:s', time() + 300); // Berlaku 5 menit

        $stmt = $this->db->prepare(
            'INSERT INTO finance_verification_tokens (user_id, token_hash, expires_at)
             VALUES (:user_id, :token_hash, :expires_at)'
        );
        $stmt->execute([
            'user_id'    => $userId,
            'token_hash' => $hash,
            'expires_at' => $expiresAt,
        ]);

        return $token;
    }

    /**
     * Validasi token verifikasi 2 langkah Finance.
     */
    public function verifyFinanceToken(int $userId, string $token): bool
    {
        $stmt = $this->db->prepare(
            'SELECT id, token_hash
             FROM finance_verification_tokens
             WHERE user_id = :user_id
               AND is_used = 0
               AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1'
        );
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();

        if (!$row || !password_verify($token, $row['token_hash'])) {
            return false;
        }

        // Tandai token sudah dipakai
        $update = $this->db->prepare(
            'UPDATE finance_verification_tokens SET is_used = 1, used_at = NOW() WHERE id = :id'
        );
        $update->execute(['id' => $row['id']]);

        return true;
    }

    /**
     * Cek apakah user Finance punya token valid (belum expired & belum dipakai).
     */
    private function hasValidFinanceToken(int $userId): bool
    {
        $stmt = $this->db->prepare(
            'SELECT COUNT(*) as cnt
             FROM finance_verification_tokens
             WHERE user_id = :user_id
               AND is_used = 1
               AND used_at > DATE_SUB(NOW(), INTERVAL 10 MINUTE)'
        );
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch();

        return ((int) ($row['cnt'] ?? 0)) > 0;
    }

    // ═══════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Dapatkan IP address client (handle proxy/load balancer).
     */
    private function getClientIp(): string
    {
        $headers = [
            'HTTP_CF_CONNECTING_IP',     // Cloudflare
            'HTTP_X_FORWARDED_FOR',      // Proxy umum
            'HTTP_X_REAL_IP',            // Nginx proxy
            'REMOTE_ADDR',
        ];

        foreach ($headers as $header) {
            $ip = $_SERVER[$header] ?? '';
            if ($ip !== '') {
                // X-Forwarded-For bisa berisi multiple IP
                $ip = explode(',', $ip)[0];
                $ip = trim($ip);
                if (filter_var($ip, FILTER_VALIDATE_IP)) {
                    return $ip;
                }
            }
        }

        return '0.0.0.0';
    }

    /**
     * Cek apakah IP adalah private/localhost.
     */
    private function isPrivateIp(string $ip): bool
    {
        return !filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
    }

    /**
     * Simpan log pengecekan GPS ke database.
     */
    private function logGpsCheck(
        int    $userId,
        float  $latitude,
        float  $longitude,
        ?float $accuracyMeters,
        ?array $accuracySamples,
        array  $result
    ): void {
        try {
            $stmt = $this->db->prepare(
                'INSERT INTO gps_attendance_logs
                 (user_id, latitude, longitude, accuracy_meters, client_ip,
                  ip_estimated_lat, ip_estimated_lng, ip_city, ip_region, ip_country,
                  speed_kmh, distance_from_prev_km, time_diff_seconds,
                  accuracy_samples, accuracy_flag, speed_flag, ip_gps_flag,
                  overall_status, block_reason)
                 VALUES
                 (:user_id, :lat, :lng, :accuracy, :client_ip,
                  :ip_lat, :ip_lng, :ip_city, :ip_region, :ip_country,
                  :speed_kmh, :distance_km, :time_diff,
                  :accuracy_samples, :accuracy_flag, :speed_flag, :ip_gps_flag,
                  :overall_status, :block_reason)'
            );

            $stmt->execute([
                'user_id'          => $userId,
                'lat'              => $latitude,
                'lng'              => $longitude,
                'accuracy'         => $accuracyMeters,
                'client_ip'        => $result['client_ip'],
                'ip_lat'           => $result['ip_lat'],
                'ip_lng'           => $result['ip_lng'],
                'ip_city'          => $result['ip_city'],
                'ip_region'        => $result['ip_region'],
                'ip_country'       => $result['ip_country'],
                'speed_kmh'        => $result['speed_kmh'],
                'distance_km'      => $result['distance_km'],
                'time_diff'        => $result['time_diff_sec'],
                'accuracy_samples' => $accuracySamples ? json_encode($accuracySamples) : null,
                'accuracy_flag'    => $result['accuracy_flag'],
                'speed_flag'       => $result['speed_flag'],
                'ip_gps_flag'      => $result['ip_gps_flag'],
                'overall_status'   => $result['overall_status'],
                'block_reason'     => $result['block_reason'],
            ]);
        } catch (\Throwable $e) {
            error_log('[GeoGuard] Failed to log GPS check: ' . $e->getMessage());
        }
    }

    /**
     * Update attendance_id pada log GPS setelah attendance record dibuat.
     */
    public function linkLogToAttendance(int $userId, int $attendanceId): void
    {
        try {
            $stmt = $this->db->prepare(
                'UPDATE gps_attendance_logs
                 SET attendance_id = :attendance_id
                 WHERE user_id = :user_id
                   AND attendance_id IS NULL
                 ORDER BY created_at DESC
                 LIMIT 1'
            );
            $stmt->execute([
                'attendance_id' => $attendanceId,
                'user_id'       => $userId,
            ]);
        } catch (\Throwable $e) {
            error_log('[GeoGuard] Failed to link log: ' . $e->getMessage());
        }
    }

    /**
     * Ambil riwayat log security GPS untuk admin dashboard.
     */
    public function getSecurityLogs(int $limit = 50, ?string $statusFilter = null): array
    {
        $where = '';
        $params = ['limit_val' => $limit];

        if ($statusFilter !== null) {
            $where = 'WHERE g.overall_status = :status';
            $params['status'] = $statusFilter;
        }

        $sql = "SELECT g.*, u.name AS user_name, u.username, u.role AS user_role
                FROM gps_attendance_logs g
                INNER JOIN users u ON u.id = g.user_id
                {$where}
                ORDER BY g.created_at DESC
                LIMIT :limit_val";

        $stmt = $this->db->prepare($sql);
        foreach ($params as $key => $val) {
            $stmt->bindValue($key, $val, is_int($val) ? PDO::PARAM_INT : PDO::PARAM_STR);
        }
        $stmt->execute();

        return $stmt->fetchAll();
    }

    // ═══════════════════════════════════════════════════════════════
    // LAYER 6: POSITION DRIFT SERVER-SIDE CHECK
    // ═══════════════════════════════════════════════════════════════

    /**
     * Verifikasi sampel posisi dari frontend di server side.
     * GPS asli SELALU bergeser sedikit bahkan saat perangkat diam.
     * Fake GPS mengirim koordinat identik berulang kali.
     */
    private function checkPositionDriftServerSide(array $positionSamples): array
    {
        $result = [
            'flag'   => 'normal',
            'reason' => null,
        ];

        $samples = [];
        foreach ($positionSamples as $s) {
            if (isset($s['lat']) && isset($s['lng'])) {
                $samples[] = [
                    'lat'      => (float) $s['lat'],
                    'lng'      => (float) $s['lng'],
                    'accuracy' => isset($s['accuracy']) ? (float) $s['accuracy'] : null,
                    'altitude' => isset($s['altitude']) ? $s['altitude'] : null,
                ];
            }
        }

        if (count($samples) < 3) {
            return $result;
        }

        // ─── Check 1: Semua koordinat persis identik ───
        $allIdentical = true;
        $firstLat = $samples[0]['lat'];
        $firstLng = $samples[0]['lng'];
        $identicalCount = 0;

        for ($i = 1; $i < count($samples); $i++) {
            if ($samples[$i]['lat'] === $firstLat && $samples[$i]['lng'] === $firstLng) {
                $identicalCount++;
            } else {
                $allIdentical = false;
            }
        }

        if ($allIdentical) {
            $result['flag'] = 'blocked';
            $result['reason'] = sprintf(
                'Semua %d sampel GPS menghasilkan koordinat persis identik (%.6f, %.6f). '
                . 'GPS asli selalu memiliki variasi posisi alami (micro-drift). '
                . 'Ini adalah indikator kuat penggunaan fake GPS.',
                count($samples),
                $firstLat,
                $firstLng
            );
            return $result;
        }

        // Jika mayoritas identik (> 70%)
        $identicalRatio = $identicalCount / (count($samples) - 1);
        if ($identicalRatio > 0.7) {
            $result['flag'] = 'blocked';
            $result['reason'] = sprintf(
                '%.0f%% sampel GPS menghasilkan koordinat identik. Pola ini khas fake GPS.',
                $identicalRatio * 100
            );
            return $result;
        }

        // ─── Check 2: Hitung total drift ───
        $totalDrift = 0;
        for ($i = 1; $i < count($samples); $i++) {
            $dLat = abs($samples[$i]['lat'] - $samples[$i - 1]['lat']);
            $dLng = abs($samples[$i]['lng'] - $samples[$i - 1]['lng']);
            $totalDrift += sqrt($dLat * $dLat + $dLng * $dLng);
        }
        $avgDrift = $totalDrift / (count($samples) - 1);

        // Drift terlalu rendah (kurang dari ~0.05 meter)
        if ($avgDrift < 0.0000005) {
            $result['flag'] = 'suspicious';
            $result['reason'] = sprintf(
                'Drift posisi GPS terlalu rendah (%.10f°). Perangkat GPS asli '
                . 'biasanya memiliki drift minimal meskipun diam.',
                $avgDrift
            );
        }

        // ─── Check 3: Semua altitude = 0 ───
        $altitudes = array_filter(array_column($samples, 'altitude'), function($v) {
            return $v !== null;
        });
        if (count($altitudes) > 0 && count(array_filter($altitudes, function($a) { return (float)$a === 0.0; })) === count($altitudes)) {
            if ($result['flag'] === 'normal') {
                $result['flag'] = 'suspicious';
            }
            // Append reason
            $result['reason'] = ($result['reason'] ? $result['reason'] . ' ' : '')
                . 'Semua altitude = 0, pola umum fake GPS.';
        }

        // ─── Check 4: Kombinasi akurasi statis + posisi tidak bergeser ───
        $accuracies = array_filter(array_column($samples, 'accuracy'), function($v) {
            return $v !== null;
        });
        if (count($accuracies) >= 3) {
            $accMean = array_sum($accuracies) / count($accuracies);
            $accVariance = 0;
            foreach ($accuracies as $acc) {
                $accVariance += ($acc - $accMean) ** 2;
            }
            $accVariance /= count($accuracies);

            // Kombinasi mematikan: akurasi statis + posisi hampir identik
            if ($accVariance < 0.5 && $identicalRatio > 0.5) {
                $result['flag'] = 'blocked';
                $result['reason'] = sprintf(
                    'Kombinasi akurasi GPS statis (variance: %.4f) dengan posisi yang hampir tidak berubah '
                    . '(%.0f%% identik). Ini sangat khas fake GPS.',
                    $accVariance,
                    $identicalRatio * 100
                );
            }
        }

        return $result;
    }
}
