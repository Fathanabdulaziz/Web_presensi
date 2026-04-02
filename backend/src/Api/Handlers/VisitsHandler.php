<?php

declare(strict_types=1);

function handleVisits(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        $user = Auth::requireUser($db);

        $where = '';
        $join = '';
        $params = [];

        $userIdFilter = isset($_GET['user_id']) ? (int) $_GET['user_id'] : null;

        if (in_array(($user['role'] ?? ''), ['admin', 'hr', 'bod'], true)) {
            if ($userIdFilter) {
                $where = 'WHERE v.user_id = :user_id';
                $params['user_id'] = $userIdFilter;
            }
        } elseif ($user['role'] === 'manager' && !empty($user['department'])) {
            $join = 'INNER JOIN employees e ON e.user_id = v.user_id';
            $where = 'WHERE e.department = :dept';
            $params['dept'] = $user['department'];
            if ($userIdFilter) {
                $where .= ' AND v.user_id = :user_id';
                $params['user_id'] = $userIdFilter;
            }
        } else {
            $where = 'WHERE v.user_id = :self_id';
            $params['self_id'] = (int) $user['id'];
        }

        $sql = 'SELECT v.*, u.name AS employee_name, u.username
                FROM client_visits v
                INNER JOIN users u ON u.id = v.user_id
                ' . $join . '
                ' . $where . '
                ORDER BY v.visit_date DESC, v.check_in_time DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        Http::ok(['visits' => $stmt->fetchAll()]);
    }

    if ($method === 'POST' && count($segments) === 2) {
        $user = Auth::requireUser($db);
        $userRole = $user['role'] ?? 'karyawan';

        if (($user['emp_status'] ?? '') === 'Inactive' && !in_array($userRole, ['admin', 'hr', 'bod'], true)) {
            Http::fail('Akun Anda sedang ditangguhkan (Status: Tidak Aktif). Anda tidak dapat mencatat kunjungan klien sementara ini. Silakan hubungi Admin atau HR.', 403);
        }

        $body = Http::body();

        $clientName = trim((string) ($body['client_name'] ?? $body['clientName'] ?? ''));
        $clientLocation = trim((string) ($body['client_location'] ?? $body['location'] ?? ''));
        $visitDate = (string) ($body['visit_date'] ?? $body['date'] ?? '');
        $checkInTime = (string) ($body['check_in_time'] ?? $body['checkInTime'] ?? '');
        $purpose = trim((string) ($body['visit_purpose'] ?? $body['purpose'] ?? ''));

        if ($clientName === '' || $clientLocation === '' || $visitDate === '' || $checkInTime === '' || $purpose === '') {
            Http::fail('Data kunjungan belum lengkap.', 422);
        }

        $stmt = $db->prepare('INSERT INTO client_visits 
            (user_id, client_name, client_location, visit_date, check_in_time, check_out_time, duration_minutes, visit_purpose, visit_notes, location_type, latitude, longitude, status, face_image_data, face_image_format, face_image_size_bytes, accuracy_meters, geo_risk_score, geo_flags, position_samples)
            VALUES 
            (:user_id, :client_name, :client_location, :visit_date, :check_in_time, :check_out_time, :duration_minutes, :visit_purpose, :visit_notes, :location_type, :latitude, :longitude, :status, :face_image_data, :face_image_format, :face_image_size_bytes, :accuracy_meters, :geo_risk_score, :geo_flags, :position_samples)');

        $faceData = $body['face_image_data'] ?? $body['faceData'] ?? null;
        $faceFormat = null;
        $faceSize = null;

        if ($faceData && strpos($faceData, 'data:image/') === 0) {
            $parts = explode(';', $faceData);
            $faceFormat = str_replace('data:image/', '', $parts[0]);
            $faceSize = strlen(base64_decode(explode(',', $parts[1])[1]));
        }

        $stmt->execute([
            'user_id' => (int) $user['id'],
            'client_name' => $clientName,
            'client_location' => $clientLocation,
            'visit_date' => nullableDate($visitDate),
            'check_in_time' => nullableTime($checkInTime),
            'check_out_time' => nullableTime($body['check_out_time'] ?? $body['checkOutTime'] ?? null),
            'duration_minutes' => isset($body['duration_minutes']) ? (int) $body['duration_minutes'] : null,
            'visit_purpose' => $purpose,
            'visit_notes' => nullableString($body['visit_notes'] ?? $body['notes'] ?? null),
            'location_type' => (string) ($body['location_type'] ?? 'map'),
            'latitude' => isset($body['latitude']) ? (float) $body['latitude'] : null,
            'longitude' => isset($body['longitude']) ? (float) $body['longitude'] : null,
            'status' => (string) ($body['status'] ?? 'Aktif'),
            'face_image_data' => $faceData,
            'face_image_format' => $faceFormat,
            'face_image_size_bytes' => $faceSize,
            'accuracy_meters' => isset($body['accuracy_meters']) ? (float) $body['accuracy_meters'] : null,
            'geo_risk_score' => isset($body['geo_risk_score']) ? (int) $body['geo_risk_score'] : 0,
            'geo_flags' => nullableString($body['geo_flags'] ?? null),
            'position_samples' => nullableString($body['position_samples'] ?? null),
        ]);

        Http::ok(['visit_id' => (int) $db->lastInsertId()], 'Kunjungan berhasil ditambahkan.');
    }

    if ($method === 'PUT' && count($segments) === 3) {
        $user = Auth::requireUser($db);
        $id = (int) $segments[2];
        $body = Http::body();

        assertVisitEditable($db, $id, $user);

        $stmt = $db->prepare('UPDATE client_visits SET
            client_name = :client_name,
            client_location = :client_location,
            visit_date = :visit_date,
            check_in_time = :check_in_time,
            check_out_time = :check_out_time,
            duration_minutes = :duration_minutes,
            visit_purpose = :visit_purpose,
            visit_notes = :visit_notes,
            location_type = :location_type,
            latitude = :latitude,
            longitude = :longitude,
            status = :status,
            checkout_latitude = :checkout_lat,
            checkout_longitude = :checkout_lng,
            checkout_accuracy_meters = :checkout_acc,
            checkout_geo_risk_score = :checkout_geo_risk,
            checkout_geo_flags = :checkout_geo_flags,
            checkout_position_samples = :checkout_samples,
            checkout_face_image_data = :checkout_face,
            checkout_face_image_format = :checkout_face_fmt,
            checkout_face_image_size_bytes = :checkout_face_sz
            WHERE id = :id');

        $coFaceData = $body['checkout_face_image_data'] ?? null;
        $coFaceFormat = null;
        $coFaceSize = null;

        if ($coFaceData && strpos($coFaceData, 'data:image/') === 0) {
            $parts = explode(';', $coFaceData);
            $coFaceFormat = str_replace('data:image/', '', $parts[0]);
            $coFaceSize = strlen(base64_decode(explode(',', $parts[1])[1]));
        }

        $stmt->execute([
            'id' => $id,
            'client_name' => trim((string) ($body['client_name'] ?? $body['clientName'] ?? '')),
            'client_location' => trim((string) ($body['client_location'] ?? $body['location'] ?? '')),
            'visit_date' => nullableDate($body['visit_date'] ?? $body['date'] ?? null),
            'check_in_time' => nullableTime($body['check_in_time'] ?? $body['checkInTime'] ?? null),
            'check_out_time' => nullableTime($body['check_out_time'] ?? $body['checkOutTime'] ?? null),
            'duration_minutes' => isset($body['duration_minutes']) ? (int) $body['duration_minutes'] : null,
            'visit_purpose' => trim((string) ($body['visit_purpose'] ?? $body['purpose'] ?? '')),
            'visit_notes' => nullableString($body['visit_notes'] ?? $body['notes'] ?? null),
            'location_type' => (string) ($body['location_type'] ?? 'map'),
            'latitude' => isset($body['latitude']) ? (float) $body['latitude'] : null,
            'longitude' => isset($body['longitude']) ? (float) $body['longitude'] : null,
            'status' => (string) ($body['status'] ?? 'Aktif'),
            'checkout_lat' => isset($body['checkout_latitude']) ? (float) $body['checkout_latitude'] : null,
            'checkout_lng' => isset($body['checkout_longitude']) ? (float) $body['checkout_longitude'] : null,
            'checkout_acc' => isset($body['checkout_accuracy_meters']) ? (float) $body['checkout_accuracy_meters'] : null,
            'checkout_geo_risk' => isset($body['checkout_geo_risk_score']) ? (int) $body['checkout_geo_risk_score'] : 0,
            'checkout_geo_flags' => nullableString($body['checkout_geo_flags'] ?? null),
            'checkout_samples' => nullableString($body['checkout_position_samples'] ?? null),
            'checkout_face' => $coFaceData,
            'checkout_face_fmt' => $coFaceFormat,
            'checkout_face_sz' => $coFaceSize,
        ]);

        Http::ok([], 'Kunjungan berhasil diperbarui.');
    }

    if ($method === 'DELETE' && count($segments) === 3) {
        $user = Auth::requireUser($db);
        $id = (int) $segments[2];

        assertVisitEditable($db, $id, $user);

        $stmt = $db->prepare('DELETE FROM client_visits WHERE id = :id');
        $stmt->execute(['id' => $id]);

        Http::ok([], 'Kunjungan dihapus.');
    }

    Http::fail('Route visits tidak ditemukan.', 404);
}
