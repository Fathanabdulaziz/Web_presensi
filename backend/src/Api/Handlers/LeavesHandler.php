<?php

declare(strict_types=1);

function handleLeaves(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        $user = Auth::requireUser($db);

        $where = 'WHERE 1=1';
        $join = 'INNER JOIN employees e ON e.user_id = l.user_id';
        $params = [];

        $userIdFilter = isset($_GET['user_id']) ? (int) $_GET['user_id'] : null;

        if (in_array($user['role'], ['admin', 'hr', 'bod'], true)) {
            if ($userIdFilter) {
                $where .= ' AND l.user_id = :user_id';
                $params['user_id'] = $userIdFilter;
            }
        } elseif ($user['role'] === 'manager' && !empty($user['department'])) {
            $where .= ' AND e.department = :dept';
            $params['dept'] = $user['department'];
            if ($userIdFilter) {
                $where .= ' AND l.user_id = :user_id';
                $params['user_id'] = $userIdFilter;
            }
        } else {
            $where .= ' AND l.user_id = :self_id';
            $params['self_id'] = (int) $user['id'];
        }

        $sql = 'SELECT l.*, u.name AS employee_name, u.username, u.role AS employee_role
                FROM leave_requests l
                INNER JOIN users u ON u.id = l.user_id
                ' . $join . '
                ' . $where . '
                ORDER BY l.created_at DESC';

        $stmt = $db->prepare($sql);
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
            (user_id, leave_type, type_label, days_requested, start_date, end_date, reason, contact_info, leave_address, 
             status, step1_status, step2_status, attachment_name, attachment_type, attachment_size, attachment_data)
            VALUES
            (:user_id, :leave_type, :type_label, :days_requested, :start_date, :end_date, :reason, :contact_info, :leave_address, 
             :status, :step1_status, :step2_status, :attachment_name, :attachment_type, :attachment_size, :attachment_data)');

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
            'step1_status' => 'pending',
            'step2_status' => 'pending',
            'attachment_name' => nullableString($body['attachment_name'] ?? null),
            'attachment_type' => nullableString($body['attachment_type'] ?? null),
            'attachment_size' => isset($body['attachment_size']) ? (int) $body['attachment_size'] : null,
            'attachment_data' => nullableString($body['attachment_data'] ?? null),
        ]);

        Http::ok(['leave_id' => (int) $db->lastInsertId()], 'Pengajuan cuti berhasil dibuat.');
    }

    if ($method === 'PATCH' && count($segments) === 4 && $segments[3] === 'status') {
        $actor = Auth::requireRoles($db, ['admin', 'hr', 'bod', 'manager']);
        $id = (int) $segments[2];
        $body = Http::body();

        $status = strtolower((string) ($body['status'] ?? ''));
        $reason = nullableString($body['rejection_reason'] ?? $body['reason'] ?? null);
        
        if (!in_array($status, ['approved', 'rejected'], true)) {
            Http::fail('Status cuti tidak valid.', 422);
        }

        // Get request details including role of applicant
        $stmt = $db->prepare('SELECT l.*, u.role as applicant_role FROM leave_requests l JOIN users u ON u.id = l.user_id WHERE l.id = :id');
        $stmt->execute(['id' => $id]);
        $leave = $stmt->fetch();

        if (!$leave) {
            Http::fail('Data cuti tidak ditemukan.', 404);
        }

        $now = date('Y-m-d H:i:s');
        $updateFields = [];
        $params = ['id' => $id];

        if ($actor['role'] === 'manager' || $actor['role'] === 'bod') {
            // STEP 1 APPROVAL
            if ($leave['applicant_role'] === 'karyawan' && $actor['role'] !== 'manager' && $actor['role'] !== 'admin' && $actor['role'] !== 'hr') {
                 Http::fail('Persetujuan awal harus dilakukan oleh Manager.', 403);
            }
            if ($leave['applicant_role'] === 'manager' && $actor['role'] !== 'bod' && $actor['role'] !== 'admin' && $actor['role'] !== 'hr') {
                 Http::fail('Persetujuan awal manager harus dilakukan oleh BOD.', 403);
            }

            $updateFields[] = 'step1_status = :s1_status';
            $updateFields[] = 'step1_by = :s1_by';
            $updateFields[] = 'step1_at = :s1_at';
            $updateFields[] = 'step1_reason = :s1_reason';
            
            $params['s1_status'] = $status;
            $params['s1_by'] = (int) $actor['id'];
            $params['s1_at'] = $now;
            $params['s1_reason'] = $reason;

            // If rejected at step 1, final status is rejected
            if ($status === 'rejected') {
                $updateFields[] = 'status = "rejected"';
            }
        } elseif ($actor['role'] === 'hr' || $actor['role'] === 'admin') {
            // STEP 2 APPROVAL (HR)
            if ($leave['step1_status'] !== 'approved' && $leave['applicant_role'] !== 'hr' && $leave['applicant_role'] !== 'admin') {
                Http::fail('Menunggu persetujuan Tahap 1 (Manager/BOD).', 400);
            }

            $updateFields[] = 'step2_status = :s2_status';
            $updateFields[] = 'step2_by = :s2_by';
            $updateFields[] = 'step2_at = :s2_at';
            $updateFields[] = 'step2_reason = :s2_reason';
            $updateFields[] = 'status = :final_status';

            $params['s2_status'] = $status;
            $params['s2_by'] = (int) $actor['id'];
            $params['s2_at'] = $now;
            $params['s2_reason'] = $reason;
            $params['final_status'] = $status; // HR determines the final status if Step 1 is done
        }

        if (empty($updateFields)) {
            Http::fail('Peran Anda tidak memiliki otoritas untuk memproses ini.', 403);
        }

        $sql = 'UPDATE leave_requests SET ' . implode(', ', $updateFields) . ' WHERE id = :id';
        $stmt = $db->prepare($sql);
        $stmt->execute($params);

        Http::ok([], 'Persetujuan cuti berhasil diproses.');
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
        $canDelete = in_array($user['role'] ?? '', ['admin', 'hr', 'bod'], true);

        if (!$canDelete && !($isOwner && strtolower((string) $item['status']) === 'pending')) {
            Http::fail('Tidak punya akses menghapus data ini.', 403);
        }

        $del = $db->prepare('DELETE FROM leave_requests WHERE id = :id');
        $del->execute(['id' => $id]);

        Http::ok([], 'Data cuti dihapus.');
    }

    Http::fail('Route leaves tidak ditemukan.', 404);
}
