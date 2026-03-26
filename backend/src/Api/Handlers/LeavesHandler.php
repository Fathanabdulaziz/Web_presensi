<?php

declare(strict_types=1);

function handleLeaves(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        $user = Auth::requireUser($db);

        $where = '';
        $params = [];

        if (($user['role'] ?? '') !== 'admin') {
            $where = 'WHERE l.user_id = :user_id';
            $params['user_id'] = (int) $user['id'];
        } elseif (isset($_GET['user_id'])) {
            $where = 'WHERE l.user_id = :user_id';
            $params['user_id'] = (int) $_GET['user_id'];
        }

        $stmt = $db->prepare('SELECT l.*, u.name AS employee_name, u.username
                              FROM leave_requests l
                              INNER JOIN users u ON u.id = l.user_id
                              ' . $where . '
                              ORDER BY l.created_at DESC');
        $stmt->execute($params);
        Http::ok(['leaves' => $stmt->fetchAll()]);
    }

    if ($method === 'POST' && count($segments) === 2) {
        $user = Auth::requireUser($db);
        $body = Http::body();

        $startDate = (string) ($body['start_date'] ?? $body['startDate'] ?? '');
        $endDate = (string) ($body['end_date'] ?? $body['endDate'] ?? '');
        $reason = trim((string) ($body['reason'] ?? ''));
        $contact = trim((string) ($body['contact_info'] ?? $body['contactInfo'] ?? ''));
        $address = trim((string) ($body['leave_address'] ?? $body['address'] ?? ''));

        if ($startDate === '' || $endDate === '' || $reason === '' || $contact === '' || $address === '') {
            Http::fail('Data pengajuan cuti belum lengkap.', 422);
        }

        validateAttachmentPayload([
            'attachment_name' => $body['attachment_name'] ?? null,
            'attachment_type' => $body['attachment_type'] ?? null,
            'attachment_size' => $body['attachment_size'] ?? null,
            'attachment_data' => $body['attachment_data'] ?? null,
        ], 'Lampiran cuti', 3_145_728);

        $daysRequested = isset($body['days_requested']) ? (int) $body['days_requested'] : countDateRangeDays($startDate, $endDate);

        $stmt = $db->prepare('INSERT INTO leave_requests
            (user_id, leave_type, type_label, days_requested, start_date, end_date, reason, contact_info, leave_address, status, comments, rejection_reason, attachment_name, attachment_type, attachment_size, attachment_data)
            VALUES
            (:user_id, :leave_type, :type_label, :days_requested, :start_date, :end_date, :reason, :contact_info, :leave_address, :status, :comments, :rejection_reason, :attachment_name, :attachment_type, :attachment_size, :attachment_data)');

        $stmt->execute([
            'user_id' => (int) $user['id'],
            'leave_type' => (string) ($body['leave_type'] ?? $body['type'] ?? 'annual'),
            'type_label' => nullableString($body['type_label'] ?? $body['typeLabel'] ?? null),
            'days_requested' => $daysRequested,
            'start_date' => nullableDate($startDate),
            'end_date' => nullableDate($endDate),
            'reason' => $reason,
            'contact_info' => $contact,
            'leave_address' => $address,
            'status' => 'pending',
            'comments' => nullableString($body['comments'] ?? null),
            'rejection_reason' => null,
            'attachment_name' => nullableString($body['attachment_name'] ?? null),
            'attachment_type' => nullableString($body['attachment_type'] ?? null),
            'attachment_size' => isset($body['attachment_size']) ? (int) $body['attachment_size'] : null,
            'attachment_data' => nullableString($body['attachment_data'] ?? null),
        ]);

        Http::ok(['leave_id' => (int) $db->lastInsertId()], 'Pengajuan cuti berhasil dibuat.');
    }

    if ($method === 'PATCH' && count($segments) === 4 && $segments[3] === 'status') {
        $admin = Auth::requireRole($db, 'admin');
        $id = (int) $segments[2];
        $body = Http::body();

        $status = strtolower((string) ($body['status'] ?? ''));
        if (!in_array($status, ['approved', 'rejected', 'pending'], true)) {
            Http::fail('Status cuti tidak valid.', 422);
        }

        $sql = 'UPDATE leave_requests SET
            status = :status,
            comments = :comments,
            rejection_reason = :rejection_reason,
            approved_by = :approved_by,
            approved_at = :approved_at,
            rejected_by = :rejected_by,
            rejected_at = :rejected_at
            WHERE id = :id';

        $now = date('Y-m-d H:i:s');

        $stmt = $db->prepare($sql);
        $stmt->execute([
            'status' => $status,
            'comments' => nullableString($body['comments'] ?? null),
            'rejection_reason' => nullableString($body['rejection_reason'] ?? null),
            'approved_by' => $status === 'approved' ? (int) $admin['id'] : null,
            'approved_at' => $status === 'approved' ? $now : null,
            'rejected_by' => $status === 'rejected' ? (int) $admin['id'] : null,
            'rejected_at' => $status === 'rejected' ? $now : null,
            'id' => $id,
        ]);

        Http::ok([], 'Status cuti diperbarui.');
    }

    if ($method === 'DELETE' && count($segments) === 3) {
        $user = Auth::requireUser($db);
        $id = (int) $segments[2];

        $stmt = $db->prepare('SELECT user_id, status FROM leave_requests WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $item = $stmt->fetch();
        if (!$item) {
            Http::fail('Data cuti tidak ditemukan.', 404);
        }

        $isOwner = (int) $item['user_id'] === (int) $user['id'];
        $isAdmin = ($user['role'] ?? '') === 'admin';

        if (!$isAdmin && !($isOwner && strtolower((string) $item['status']) === 'pending')) {
            Http::fail('Tidak punya akses menghapus data ini.', 403);
        }

        $del = $db->prepare('DELETE FROM leave_requests WHERE id = :id');
        $del->execute(['id' => $id]);

        Http::ok([], 'Data cuti dihapus.');
    }

    Http::fail('Route leaves tidak ditemukan.', 404);
}
