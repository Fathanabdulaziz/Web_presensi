<?php

declare(strict_types=1);

date_default_timezone_set('Asia/Jakarta');

session_name('web_presensi_session');
session_start();

require_once __DIR__ . '/../src/Http.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Auth.php';

$config = require __DIR__ . '/../config/app.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $db = Database::connection($config);
} catch (Throwable $e) {
    Http::fail('Koneksi database gagal.', 500);
}

$method = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET'));
$route = resolveRoute();
$segments = $route === '' ? [] : explode('/', $route);

if ($route === '' || $route === 'health') {
    Http::ok([
        'service' => 'web_presensi_api',
        'time' => date(DATE_ATOM),
        'env' => $config['app_env'] ?? 'development',
    ], 'API ready');
}

try {
    dispatch($db, $method, $segments);
} catch (PDOException $e) {
    Http::fail('Operasi database gagal.', 500, ['detail' => $e->getMessage()]);
} catch (Throwable $e) {
    Http::fail('Server error.', 500, ['detail' => $e->getMessage()]);
}

function dispatch(PDO $db, string $method, array $segments): void
{
    if (($segments[0] ?? '') !== 'api') {
        Http::fail('Route tidak ditemukan.', 404);
    }

    $resource = $segments[1] ?? '';

    switch ($resource) {
        case 'auth':
            handleAuth($db, $method, $segments);
            return;
        case 'employees':
            handleEmployees($db, $method, $segments);
            return;
        case 'attendance':
            handleAttendance($db, $method, $segments);
            return;
        case 'leaves':
            handleLeaves($db, $method, $segments);
            return;
        case 'visits':
            handleVisits($db, $method, $segments);
            return;
        case 'announcements':
            handleAnnouncements($db, $method, $segments);
            return;
        case 'sites':
            handleSites($db, $method, $segments);
            return;
        case 'notifications':
            handleNotifications($db, $method, $segments);
            return;
        case 'dashboard':
            handleDashboard($db, $method, $segments);
            return;
        default:
            Http::fail('Resource tidak ditemukan.', 404);
    }
}

function handleAuth(PDO $db, string $method, array $segments): void
{
    $action = $segments[2] ?? '';

    if ($method === 'POST' && $action === 'login') {
        $body = Http::body();
        $username = trim((string) ($body['username'] ?? ''));
        $password = (string) ($body['password'] ?? '');

        if ($username === '' || $password === '') {
            Http::fail('Username dan password wajib diisi.', 422);
        }

        $stmt = $db->prepare('SELECT id, username, name, email, role, provider, is_active, password_hash, created_at FROM users WHERE username = :username LIMIT 1');
        $stmt->execute(['username' => $username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, (string) $user['password_hash'])) {
            Http::fail('Username atau password salah.', 401);
        }

        if ((int) $user['is_active'] !== 1) {
            Http::fail('Akun tidak aktif.', 403);
        }

        Auth::login((int) $user['id']);

        unset($user['password_hash']);
        Http::ok(['user' => $user], 'Login berhasil.');
    }

    if ($method === 'POST' && $action === 'register') {
        $body = Http::body();
        $name = trim((string) ($body['name'] ?? ''));
        $username = trim((string) ($body['username'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? '');

        if ($name === '' || $username === '' || $email === '' || $password === '') {
            Http::fail('Nama, username, email, dan password wajib diisi.', 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Http::fail('Format email tidak valid.', 422);
        }

        if (strlen($password) < 6) {
            Http::fail('Password minimal 6 karakter.', 422);
        }

        $check = $db->prepare('SELECT id FROM users WHERE username = :username OR email = :email LIMIT 1');
        $check->execute(['username' => $username, 'email' => $email]);
        if ($check->fetch()) {
            Http::fail('Username atau email sudah digunakan.', 409);
        }

        $db->beginTransaction();

        $stmt = $db->prepare('INSERT INTO users (username, email, password_hash, name, role, provider, is_active) VALUES (:username, :email, :password_hash, :name, :role, :provider, 1)');
        $stmt->execute([
            'username' => $username,
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'name' => $name,
            'role' => 'user',
            'provider' => 'local',
        ]);

        $userId = (int) $db->lastInsertId();

        $emp = $db->prepare('INSERT INTO employees (user_id, status) VALUES (:user_id, :status)');
        $emp->execute([
            'user_id' => $userId,
            'status' => 'Active',
        ]);

        $db->commit();
        Auth::login($userId);

        Http::ok(['user_id' => $userId], 'Registrasi berhasil.');
    }

    if ($method === 'POST' && $action === 'logout') {
        Auth::logout();
        Http::ok([], 'Logout berhasil.');
    }

    if ($method === 'GET' && $action === 'me') {
        $user = Auth::requireUser($db);
        Http::ok(['user' => $user]);
    }

    Http::fail('Route auth tidak ditemukan.', 404);
}

function handleEmployees(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        Auth::requireUser($db);

        $sql = 'SELECT e.id, e.user_id, e.employee_code, e.department, e.position, e.gender, e.phone, e.join_date, e.maternity_leave_detail, e.status, e.inactive_reason,
                       u.username, u.email, u.name, u.role, u.is_active
                FROM employees e
                INNER JOIN users u ON u.id = e.user_id
                ORDER BY u.name ASC';

        $rows = $db->query($sql)->fetchAll();
        Http::ok(['employees' => $rows]);
    }

    if ($method === 'GET' && count($segments) === 3) {
        Auth::requireUser($db);
        $id = (int) $segments[2];

        $stmt = $db->prepare('SELECT e.id, e.user_id, e.employee_code, e.department, e.position, e.gender, e.phone, e.join_date, e.maternity_leave_detail, e.status, e.inactive_reason,
                                     u.username, u.email, u.name, u.role, u.is_active
                              FROM employees e
                              INNER JOIN users u ON u.id = e.user_id
                              WHERE e.id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $item = $stmt->fetch();

        if (!$item) {
            Http::fail('Data karyawan tidak ditemukan.', 404);
        }

        Http::ok(['employee' => $item]);
    }

    if ($method === 'POST' && count($segments) === 2) {
        Auth::requireRole($db, 'admin');
        $body = Http::body();

        $name = trim((string) ($body['name'] ?? ''));
        $username = trim((string) ($body['username'] ?? ''));
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $password = (string) ($body['password'] ?? 'ChangeMe123!');

        if ($name === '' || $username === '' || $email === '') {
            Http::fail('Nama, username, email wajib diisi.', 422);
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Http::fail('Email tidak valid.', 422);
        }

        $check = $db->prepare('SELECT id FROM users WHERE username = :username OR email = :email LIMIT 1');
        $check->execute(['username' => $username, 'email' => $email]);
        if ($check->fetch()) {
            Http::fail('Username atau email sudah digunakan.', 409);
        }

        $db->beginTransaction();

        $insertUser = $db->prepare('INSERT INTO users (username, email, password_hash, name, role, provider, is_active) VALUES (:username, :email, :password_hash, :name, :role, :provider, :is_active)');
        $insertUser->execute([
            'username' => $username,
            'email' => $email,
            'password_hash' => password_hash($password, PASSWORD_DEFAULT),
            'name' => $name,
            'role' => (string) ($body['role'] ?? 'user'),
            'provider' => 'local',
            'is_active' => (int) (($body['is_active'] ?? 1) ? 1 : 0),
        ]);

        $userId = (int) $db->lastInsertId();

        $insertEmployee = $db->prepare('INSERT INTO employees (user_id, employee_code, department, position, gender, phone, join_date, maternity_leave_detail, status, inactive_reason)
                                        VALUES (:user_id, :employee_code, :department, :position, :gender, :phone, :join_date, :maternity_leave_detail, :status, :inactive_reason)');
        $insertEmployee->execute([
            'user_id' => $userId,
            'employee_code' => nullableString($body['employee_code'] ?? null),
            'department' => nullableString($body['department'] ?? null),
            'position' => nullableString($body['position'] ?? null),
            'gender' => nullableString($body['gender'] ?? null),
            'phone' => nullableString($body['phone'] ?? null),
            'join_date' => nullableDate($body['join_date'] ?? null),
            'maternity_leave_detail' => nullableString($body['maternity_leave_detail'] ?? null),
            'status' => (string) ($body['status'] ?? 'Active'),
            'inactive_reason' => nullableString($body['inactive_reason'] ?? null),
        ]);

        $employeeId = (int) $db->lastInsertId();
        $db->commit();

        Http::ok(['employee_id' => $employeeId, 'user_id' => $userId], 'Karyawan berhasil ditambahkan.');
    }

    if ($method === 'PUT' && count($segments) === 3) {
        $authUser = Auth::requireUser($db);
        $employeeId = (int) $segments[2];
        $body = Http::body();

        $stmt = $db->prepare('SELECT e.id, e.user_id, u.role FROM employees e INNER JOIN users u ON u.id = e.user_id WHERE e.id = :id LIMIT 1');
        $stmt->execute(['id' => $employeeId]);
        $target = $stmt->fetch();
        if (!$target) {
            Http::fail('Karyawan tidak ditemukan.', 404);
        }

        $canEdit = ($authUser['role'] ?? '') === 'admin' || (int) $authUser['id'] === (int) $target['user_id'];
        if (!$canEdit) {
            Http::fail('Tidak punya akses edit karyawan ini.', 403);
        }

        $updateUser = $db->prepare('UPDATE users SET name = :name, email = :email, username = :username, role = :role, is_active = :is_active WHERE id = :id');
        $updateUser->execute([
            'id' => (int) $target['user_id'],
            'name' => trim((string) ($body['name'] ?? $authUser['name'] ?? '')),
            'email' => strtolower(trim((string) ($body['email'] ?? ''))),
            'username' => trim((string) ($body['username'] ?? '')),
            'role' => (string) ($body['role'] ?? $target['role'] ?? 'user'),
            'is_active' => (int) (($body['is_active'] ?? 1) ? 1 : 0),
        ]);

        $updateEmployee = $db->prepare('UPDATE employees SET
            employee_code = :employee_code,
            department = :department,
            position = :position,
            gender = :gender,
            phone = :phone,
            join_date = :join_date,
            maternity_leave_detail = :maternity_leave_detail,
            status = :status,
            inactive_reason = :inactive_reason
            WHERE id = :id');

        $updateEmployee->execute([
            'id' => $employeeId,
            'employee_code' => nullableString($body['employee_code'] ?? null),
            'department' => nullableString($body['department'] ?? null),
            'position' => nullableString($body['position'] ?? null),
            'gender' => nullableString($body['gender'] ?? null),
            'phone' => nullableString($body['phone'] ?? null),
            'join_date' => nullableDate($body['join_date'] ?? null),
            'maternity_leave_detail' => nullableString($body['maternity_leave_detail'] ?? null),
            'status' => (string) ($body['status'] ?? 'Active'),
            'inactive_reason' => nullableString($body['inactive_reason'] ?? null),
        ]);

        Http::ok([], 'Data karyawan diperbarui.');
    }

    if ($method === 'DELETE' && count($segments) === 3) {
        Auth::requireRole($db, 'admin');
        $employeeId = (int) $segments[2];

        $stmt = $db->prepare('SELECT user_id FROM employees WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $employeeId]);
        $target = $stmt->fetch();
        if (!$target) {
            Http::fail('Data tidak ditemukan.', 404);
        }

        $delete = $db->prepare('DELETE FROM users WHERE id = :id');
        $delete->execute(['id' => (int) $target['user_id']]);

        Http::ok([], 'Karyawan dihapus.');
    }

    Http::fail('Route employees tidak ditemukan.', 404);
}

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

function handleVisits(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        $user = Auth::requireUser($db);

        $where = '';
        $params = [];

        if (($user['role'] ?? '') !== 'admin') {
            $where = 'WHERE v.user_id = :user_id';
            $params['user_id'] = (int) $user['id'];
        } elseif (isset($_GET['user_id'])) {
            $where = 'WHERE v.user_id = :user_id';
            $params['user_id'] = (int) $_GET['user_id'];
        }

        $stmt = $db->prepare('SELECT v.*, u.name AS employee_name, u.username
                              FROM client_visits v
                              INNER JOIN users u ON u.id = v.user_id
                              ' . $where . '
                              ORDER BY v.visit_date DESC, v.check_in_time DESC');
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

function handleAnnouncements(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        Auth::requireUser($db);

        $stmt = $db->query('SELECT a.id, a.title, a.category, a.content, a.publish_date, a.priority, a.target_division, u.name AS author_name, a.created_at
                            FROM announcements a
                            LEFT JOIN users u ON u.id = a.author_user_id
                            ORDER BY a.publish_date DESC, a.created_at DESC');

        $items = $stmt->fetchAll();
        Http::ok(['announcements' => $items]);
    }

    if ($method === 'POST' && count($segments) === 2) {
        $admin = Auth::requireRole($db, 'admin');
        $body = Http::body();

        $title = trim((string) ($body['title'] ?? ''));
        $category = trim((string) ($body['category'] ?? 'General'));
        $content = trim((string) ($body['content'] ?? ''));

        if ($title === '' || $content === '') {
            Http::fail('Judul dan konten pengumuman wajib diisi.', 422);
        }

        $stmt = $db->prepare('INSERT INTO announcements (title, category, content, publish_date, author_user_id, priority, target_division)
                              VALUES (:title, :category, :content, :publish_date, :author_user_id, :priority, :target_division)');

        $stmt->execute([
            'title' => $title,
            'category' => $category,
            'content' => $content,
            'publish_date' => nullableDate($body['publish_date'] ?? $body['date'] ?? date('Y-m-d')),
            'author_user_id' => (int) $admin['id'],
            'priority' => (string) ($body['priority'] ?? 'Normal'),
            'target_division' => (string) ($body['target_division'] ?? 'Semua Divisi'),
        ]);

        $announcementId = (int) $db->lastInsertId();

        $attachments = $body['attachments'] ?? [];
        if (is_array($attachments)) {
            $insertAtt = $db->prepare('INSERT INTO announcement_attachments
                (announcement_id, name, stored_name, mime_type, size_bytes, data_url, converted_to_webp)
                VALUES
                (:announcement_id, :name, :stored_name, :mime_type, :size_bytes, :data_url, :converted_to_webp)');

            foreach ($attachments as $att) {
                if (!is_array($att)) {
                    continue;
                }

                $insertAtt->execute([
                    'announcement_id' => $announcementId,
                    'name' => (string) ($att['name'] ?? 'attachment'),
                    'stored_name' => (string) ($att['stored_name'] ?? $att['name'] ?? uniqid('att_', true)),
                    'mime_type' => nullableString($att['mime_type'] ?? null),
                    'size_bytes' => isset($att['size_bytes']) ? (int) $att['size_bytes'] : null,
                    'data_url' => (string) ($att['data_url'] ?? ''),
                    'converted_to_webp' => !empty($att['converted_to_webp']) ? 1 : 0,
                ]);
            }
        }

        Http::ok(['announcement_id' => $announcementId], 'Pengumuman berhasil dibuat.');
    }

    if ($method === 'PUT' && count($segments) === 3) {
        Auth::requireRole($db, 'admin');
        $id = (int) $segments[2];
        $body = Http::body();

        $stmt = $db->prepare('UPDATE announcements SET
            title = :title,
            category = :category,
            content = :content,
            publish_date = :publish_date,
            priority = :priority,
            target_division = :target_division
            WHERE id = :id');

        $stmt->execute([
            'id' => $id,
            'title' => trim((string) ($body['title'] ?? '')),
            'category' => trim((string) ($body['category'] ?? 'General')),
            'content' => trim((string) ($body['content'] ?? '')),
            'publish_date' => nullableDate($body['publish_date'] ?? $body['date'] ?? date('Y-m-d')),
            'priority' => (string) ($body['priority'] ?? 'Normal'),
            'target_division' => (string) ($body['target_division'] ?? 'Semua Divisi'),
        ]);

        Http::ok([], 'Pengumuman diperbarui.');
    }

    if ($method === 'DELETE' && count($segments) === 3) {
        Auth::requireRole($db, 'admin');
        $id = (int) $segments[2];

        $stmt = $db->prepare('DELETE FROM announcements WHERE id = :id');
        $stmt->execute(['id' => $id]);

        Http::ok([], 'Pengumuman dihapus.');
    }

    Http::fail('Route announcements tidak ditemukan.', 404);
}

function handleSites(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        Auth::requireUser($db);
        $stmt = $db->query('SELECT id, name, created_by, created_at FROM sites ORDER BY name ASC');
        Http::ok(['sites' => $stmt->fetchAll()]);
    }

    if ($method === 'POST' && count($segments) === 2) {
        $admin = Auth::requireRole($db, 'admin');
        $body = Http::body();

        $name = trim((string) ($body['name'] ?? ''));
        if ($name === '') {
            Http::fail('Nama site wajib diisi.', 422);
        }

        $stmt = $db->prepare('INSERT INTO sites (name, created_by) VALUES (:name, :created_by)');
        $stmt->execute([
            'name' => $name,
            'created_by' => (int) $admin['id'],
        ]);

        Http::ok(['site_id' => (int) $db->lastInsertId()], 'Site berhasil ditambahkan.');
    }

    if ($method === 'DELETE' && count($segments) === 3) {
        Auth::requireRole($db, 'admin');
        $id = (int) $segments[2];

        $stmt = $db->prepare('DELETE FROM sites WHERE id = :id');
        $stmt->execute(['id' => $id]);

        Http::ok([], 'Site dihapus.');
    }

    Http::fail('Route sites tidak ditemukan.', 404);
}

function handleNotifications(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        $user = Auth::requireUser($db);

        $stmt = $db->prepare('SELECT id, title, message, notification_type, is_read, created_at
                              FROM user_notifications
                              WHERE user_id = :user_id
                              ORDER BY created_at DESC');
        $stmt->execute(['user_id' => (int) $user['id']]);

        Http::ok(['notifications' => $stmt->fetchAll()]);
    }

    if ($method === 'POST' && count($segments) === 2) {
        $user = Auth::requireUser($db);
        $body = Http::body();

        $targetUserId = isset($body['user_id']) ? (int) $body['user_id'] : (int) $user['id'];
        if (($user['role'] ?? '') !== 'admin' && $targetUserId !== (int) $user['id']) {
            Http::fail('Tidak boleh membuat notifikasi untuk user lain.', 403);
        }

        $stmt = $db->prepare('INSERT INTO user_notifications (user_id, title, message, notification_type, is_read)
                              VALUES (:user_id, :title, :message, :notification_type, 0)');
        $stmt->execute([
            'user_id' => $targetUserId,
            'title' => trim((string) ($body['title'] ?? 'Info')),
            'message' => trim((string) ($body['message'] ?? '')),
            'notification_type' => trim((string) ($body['notification_type'] ?? 'info')),
        ]);

        Http::ok(['notification_id' => (int) $db->lastInsertId()], 'Notifikasi dibuat.');
    }

    if ($method === 'PATCH' && count($segments) === 4 && $segments[3] === 'read') {
        $user = Auth::requireUser($db);
        $id = (int) $segments[2];

        $stmt = $db->prepare('UPDATE user_notifications SET is_read = 1 WHERE id = :id AND user_id = :user_id');
        $stmt->execute([
            'id' => $id,
            'user_id' => (int) $user['id'],
        ]);

        Http::ok([], 'Notifikasi ditandai sudah dibaca.');
    }

    Http::fail('Route notifications tidak ditemukan.', 404);
}

function handleDashboard(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && ($segments[2] ?? '') === 'summary') {
        $user = Auth::requireUser($db);

        if (($user['role'] ?? '') === 'admin') {
            $totalEmployees = (int) $db->query("SELECT COUNT(*) FROM users WHERE role = 'user'")->fetchColumn();
            $pendingLeaves = (int) $db->query("SELECT COUNT(*) FROM leave_requests WHERE status = 'pending'")->fetchColumn();
            $pendingAttendance = (int) $db->query("SELECT COUNT(*) FROM attendance_records WHERE status = 'pending'")->fetchColumn();
            $activeVisits = (int) $db->query("SELECT COUNT(*) FROM client_visits WHERE status = 'Aktif'")->fetchColumn();

            Http::ok([
                'total_employees' => $totalEmployees,
                'pending_leaves' => $pendingLeaves,
                'pending_attendance' => $pendingAttendance,
                'active_visits' => $activeVisits,
            ]);
        }

        $uid = (int) $user['id'];

        $attendanceTodayStmt = $db->prepare('SELECT COUNT(*) FROM attendance_records WHERE user_id = :uid AND DATE(event_at) = CURDATE()');
        $attendanceTodayStmt->execute(['uid' => $uid]);
        $attendanceToday = (int) $attendanceTodayStmt->fetchColumn();

        $pendingLeaveStmt = $db->prepare("SELECT COUNT(*) FROM leave_requests WHERE user_id = :uid AND status = 'pending'");
        $pendingLeaveStmt->execute(['uid' => $uid]);
        $pendingLeaves = (int) $pendingLeaveStmt->fetchColumn();

        $activeVisitStmt = $db->prepare("SELECT COUNT(*) FROM client_visits WHERE user_id = :uid AND status = 'Aktif'");
        $activeVisitStmt->execute(['uid' => $uid]);
        $activeVisits = (int) $activeVisitStmt->fetchColumn();

        Http::ok([
            'attendance_today' => $attendanceToday,
            'pending_leaves' => $pendingLeaves,
            'active_visits' => $activeVisits,
        ]);
    }

    Http::fail('Route dashboard tidak ditemukan.', 404);
}

function resolveRoute(): string
{
    $route = trim((string) ($_GET['route'] ?? ''), '/');
    if ($route !== '') {
        return $route;
    }

    $path = trim((string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH), '/');

    if ($path === '') {
        return '';
    }

    $parts = explode('/', $path);
    $apiIndex = array_search('api', $parts, true);

    if ($apiIndex === false) {
        return $path;
    }

    return implode('/', array_slice($parts, $apiIndex));
}

function nullableString(mixed $value): ?string
{
    if ($value === null) {
        return null;
    }

    $text = trim((string) $value);
    return $text === '' ? null : $text;
}

function nullableDate(mixed $value): ?string
{
    $text = nullableString($value);
    if ($text === null) {
        return null;
    }

    $timestamp = strtotime($text);
    return $timestamp === false ? null : date('Y-m-d', $timestamp);
}

function nullableDateTime(mixed $value): ?string
{
    $text = nullableString($value);
    if ($text === null) {
        return null;
    }

    $timestamp = strtotime($text);
    return $timestamp === false ? null : date('Y-m-d H:i:s', $timestamp);
}

function nullableTime(mixed $value): ?string
{
    $text = nullableString($value);
    if ($text === null) {
        return null;
    }

    $timestamp = strtotime($text);
    return $timestamp === false ? null : date('H:i:s', $timestamp);
}

function assertVisitEditable(PDO $db, int $visitId, array $user): void
{
    $stmt = $db->prepare('SELECT user_id FROM client_visits WHERE id = :id LIMIT 1');
    $stmt->execute(['id' => $visitId]);
    $visit = $stmt->fetch();

    if (!$visit) {
        Http::fail('Kunjungan tidak ditemukan.', 404);
    }

    $isAdmin = ($user['role'] ?? '') === 'admin';
    $isOwner = (int) $visit['user_id'] === (int) $user['id'];

    if (!$isAdmin && !$isOwner) {
        Http::fail('Tidak punya akses data kunjungan ini.', 403);
    }
}

function countDateRangeDays(string $startDate, string $endDate): int
{
    $start = strtotime($startDate);
    $end = strtotime($endDate);

    if ($start === false || $end === false || $end < $start) {
        return 1;
    }

    return (int) floor(($end - $start) / 86400) + 1;
}
