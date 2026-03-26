<?php

declare(strict_types=1);

function handleAttendance(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        $user = Auth::requireUser($db);

        $where = '';
        $params = [];

        $userIdFilter = isset($_GET['user_id']) ? (int) $_GET['user_id'] : null;
        if (($user['role'] ?? '') !== 'admin') {
            $where = 'WHERE a.user_id = :self_id';
            $params['self_id'] = (int) $user['id'];
        } elseif ($userIdFilter) {
            $where = 'WHERE a.user_id = :user_id';
            $params['user_id'] = $userIdFilter;
        }

        $sql = 'SELECT a.*, u.name AS employee_name, u.username
                FROM attendance_records a
                INNER JOIN users u ON u.id = a.user_id
                ' . $where . '
                ORDER BY a.event_at DESC';

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Http::ok(['attendance' => $rows]);
    }

    if ($method === 'POST' && count($segments) === 2) {
        $user = Auth::requireUser($db);
        $body = Http::body();

        $type = (string) ($body['attendance_type'] ?? $body['type'] ?? '');
        $workLocation = trim((string) ($body['work_location'] ?? $body['workLocation'] ?? ''));

        if (!in_array($type, ['checkin', 'checkout'], true)) {
            Http::fail('attendance_type harus checkin atau checkout.', 422);
        }

        if ($workLocation === '') {
            Http::fail('Lokasi kerja wajib diisi.', 422);
        }

        $siteId = isset($body['site_id']) ? (int) $body['site_id'] : null;
        $eventAt = nullableDateTime($body['event_at'] ?? $body['timestamp'] ?? date('Y-m-d H:i:s'));

        validateAttachmentPayload([
            'attachment_name' => $body['attachment_name'] ?? null,
            'attachment_type' => $body['attachment_type'] ?? null,
            'attachment_size' => $body['attachment_size'] ?? null,
            'attachment_data' => $body['attachment_data'] ?? null,
        ], 'Lampiran presensi', 3_145_728);

        $stmt = $db->prepare('INSERT INTO attendance_records
            (user_id, attendance_type, work_location, site_id, latitude, longitude, accuracy_meters, event_at, notes, status, work_description, overtime_hours, prayer_dhuhur_status, prayer_ashar_status, driving_notes, face_image_data, face_image_format, face_image_size_bytes, attachment_name, attachment_type, attachment_size, attachment_data)
            VALUES
            (:user_id, :attendance_type, :work_location, :site_id, :latitude, :longitude, :accuracy_meters, :event_at, :notes, :status, :work_description, :overtime_hours, :prayer_dhuhur_status, :prayer_ashar_status, :driving_notes, :face_image_data, :face_image_format, :face_image_size_bytes, :attachment_name, :attachment_type, :attachment_size, :attachment_data)');

        $stmt->execute([
            'user_id' => (int) $user['id'],
            'attendance_type' => $type,
            'work_location' => $workLocation,
            'site_id' => $siteId,
            'latitude' => isset($body['latitude']) ? (float) $body['latitude'] : null,
            'longitude' => isset($body['longitude']) ? (float) $body['longitude'] : null,
            'accuracy_meters' => isset($body['accuracy_meters']) ? (float) $body['accuracy_meters'] : null,
            'event_at' => $eventAt,
            'notes' => nullableString($body['notes'] ?? null),
            'status' => 'pending',
            'work_description' => nullableString($body['work_description'] ?? $body['workDescription'] ?? null),
            'overtime_hours' => isset($body['overtime_hours']) ? (float) $body['overtime_hours'] : null,
            'prayer_dhuhur_status' => nullableString($body['prayer_dhuhur_status'] ?? null),
            'prayer_ashar_status' => nullableString($body['prayer_ashar_status'] ?? null),
            'driving_notes' => nullableString($body['driving_notes'] ?? $body['drivingNotes'] ?? null),
            'face_image_data' => nullableString($body['face_image_data'] ?? null),
            'face_image_format' => nullableString($body['face_image_format'] ?? null),
            'face_image_size_bytes' => isset($body['face_image_size_bytes']) ? (int) $body['face_image_size_bytes'] : null,
            'attachment_name' => nullableString($body['attachment_name'] ?? null),
            'attachment_type' => nullableString($body['attachment_type'] ?? null),
            'attachment_size' => isset($body['attachment_size']) ? (int) $body['attachment_size'] : null,
            'attachment_data' => nullableString($body['attachment_data'] ?? null),
        ]);

        Http::ok(['attendance_id' => (int) $db->lastInsertId()], 'Presensi berhasil dikirim.');
    }

    if ($method === 'PATCH' && count($segments) === 4 && $segments[3] === 'status') {
        $admin = Auth::requireRole($db, 'admin');
        $id = (int) $segments[2];
        $body = Http::body();

        $status = strtolower((string) ($body['status'] ?? ''));
        if (!in_array($status, ['approved', 'rejected', 'pending'], true)) {
            Http::fail('Status tidak valid.', 422);
        }

        $fields = ['status = :status'];
        $params = [
            'status' => $status,
            'id' => $id,
            'admin_id' => (int) $admin['id'],
            'now' => date('Y-m-d H:i:s'),
        ];

        if ($status === 'approved') {
            $fields[] = 'approved_by = :admin_id';
            $fields[] = 'approved_at = :now';
            $fields[] = 'rejected_by = NULL';
            $fields[] = 'rejected_at = NULL';
        } elseif ($status === 'rejected') {
            $fields[] = 'rejected_by = :admin_id';
            $fields[] = 'rejected_at = :now';
            $fields[] = 'approved_by = NULL';
            $fields[] = 'approved_at = NULL';
        } else {
            $fields[] = 'approved_by = NULL';
            $fields[] = 'approved_at = NULL';
            $fields[] = 'rejected_by = NULL';
            $fields[] = 'rejected_at = NULL';
        }

        $sql = 'UPDATE attendance_records SET ' . implode(', ', $fields) . ' WHERE id = :id';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        Http::ok([], 'Status presensi diperbarui.');
    }

    Http::fail('Route attendance tidak ditemukan.', 404);
}
