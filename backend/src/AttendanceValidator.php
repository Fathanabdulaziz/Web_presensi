<?php
// AttendanceValidator.php
// Backend: PHP class for attendance validation (anti-fake GPS, speed trap, IP, role-based, etc.)

class AttendanceValidator {
    // Haversine formula to calculate distance (in meters)
    public static function haversine($lat1, $lon1, $lat2, $lon2) {
        $R = 6371000; // Earth radius in meters
        $phi1 = deg2rad($lat1);
        $phi2 = deg2rad($lat2);
        $deltaPhi = deg2rad($lat2 - $lat1);
        $deltaLambda = deg2rad($lon2 - $lon1);
        $a = sin($deltaPhi/2) * sin($deltaPhi/2) +
            cos($phi1) * cos($phi2) *
            sin($deltaLambda/2) * sin($deltaLambda/2);
        $c = 2 * atan2(sqrt($a), sqrt(1-$a));
        return $R * $c;
    }

    // Speed Trap: Check if movement is physically possible
    public static function isSpeedValid($lastLat, $lastLon, $lastTime, $newLat, $newLon, $newTime) {
        $distance = self::haversine($lastLat, $lastLon, $newLat, $newLon); // meters
        $timeDiff = max(1, $newTime - $lastTime); // seconds
        $speed = $distance / $timeDiff; // m/s
        // Example: 50km in 2min = 416 m/s (impossible)
        return $speed < 50; // 50 m/s ~180 km/h, adjust as needed
    }

    // Dummy IP geolocation (replace with real API)
    public static function getIpLocation($ip) {
        // Dummy: Jakarta for 127.0.0.1, Surabaya for 192.168.*
        if ($ip === '127.0.0.1') return ['lat'=>-6.2, 'lon'=>106.8];
        if (strpos($ip, '192.168.') === 0) return ['lat'=>-7.2, 'lon'=>112.7];
        // Default: Bandung
        return ['lat'=>-6.9, 'lon'=>107.6];
    }

    // IP vs GPS validation
    public static function isIpGpsValid($ip, $gpsLat, $gpsLon) {
        $ipLoc = self::getIpLocation($ip);
        $distance = self::haversine($ipLoc['lat'], $ipLoc['lon'], $gpsLat, $gpsLon);
        // If distance > 100km, flag as suspicious
        return $distance < 100000;
    }

    // Role-based validation
    public static function validateByRole($role, $dept, $ip, $gpsLat, $gpsLon, $accuracy, $lastLat, $lastLon, $lastTime, $newTime, $accuracyFlag, $photoUploaded) {
        if ($role === 'admin' || $dept === 'HR') {
            // Only check IP (must be office Wi-Fi)
            return self::isOfficeIp($ip);
        } elseif ($dept === 'Finance') {
            // Finance: require office IP + 2FA (dummy)
            return self::isOfficeIp($ip) && self::dummy2FA();
        } elseif ($dept === 'Sales' || $dept === 'Lapangan') {
            // Strict: all checks
            return self::isSpeedValid($lastLat, $lastLon, $lastTime, $gpsLat, $gpsLon, $newTime)
                && self::isIpGpsValid($ip, $gpsLat, $gpsLon)
                && !$accuracyFlag
                && $photoUploaded;
        }
        // Default: reject
        return false;
    }

    public static function isOfficeIp($ip) {
        // Dummy: 192.168.1.* is office
        return strpos($ip, '192.168.1.') === 0;
    }

    public static function dummy2FA() {
        // Dummy always true, replace with real 2FA
        return true;
    }
}
