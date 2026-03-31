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
            (user_id, client_name, client_location, visit_date, check_in_time, check_out_time, duration_minutes, visit_purpose, visit_notes, location_type, latitude, longitude, status)
            VALUES
            (:user_id, :client_name, :client_location, :visit_date, :check_in_time, :check_out_time, :duration_minutes, :visit_purpose, :visit_notes, :location_type, :latitude, :longitude, :status)');

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
            status = :status
            WHERE id = :id');

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
