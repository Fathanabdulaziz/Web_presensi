<?php
// attendance.php
require_once __DIR__ . '/../src/AttendanceValidator.php';

header('Content-Type: application/json');

function getClientIp() {
    if (!empty($_SERVER['HTTP_CLIENT_IP'])) return $_SERVER['HTTP_CLIENT_IP'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) return $_SERVER['HTTP_X_FORWARDED_FOR'];
    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
}

$data = json_decode(file_get_contents('php://input'), true);
$role = $data['role'] ?? '';
$dept = $data['department'] ?? '';
$gpsLat = floatval($data['latitude'] ?? 0);
$gpsLon = floatval($data['longitude'] ?? 0);
$accuracy = floatval($data['accuracy'] ?? 0);
$accuracyFlag = boolval($data['accuracyFlag'] ?? false);
$lastLat = floatval($data['lastLatitude'] ?? 0);
$lastLon = floatval($data['lastLongitude'] ?? 0);
$lastTime = intval($data['lastTimestamp'] ?? 0);
$newTime = intval($data['timestamp'] ?? time());
$photoUploaded = boolval($data['photoUploaded'] ?? false);
$ip = getClientIp();

require_once __DIR__ . '/../src/AttendanceValidator.php';

$valid = AttendanceValidator::validateByRole($role, $dept, $ip, $gpsLat, $gpsLon, $accuracy, $lastLat, $lastLon, $lastTime, $newTime, $accuracyFlag, $photoUploaded);

if ($valid) {
    // TODO: Save attendance to DB
    echo json_encode(['success'=>true, 'message'=>'Absensi berhasil!']);
} else {
    echo json_encode(['success'=>false, 'message'=>'Absensi gagal: Deteksi anomali atau akses tidak sah.']);
}
