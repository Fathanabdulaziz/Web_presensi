<?php

declare(strict_types=1);

function handleEmployees(PDO $db, string $method, array $segments): void
{
    if ($method === 'GET' && count($segments) === 2) {
        $authUser = Auth::requireUser($db);

        $isAdmin = ($authUser['role'] ?? '') === 'admin';
        $sql = 'SELECT e.id, e.user_id, e.employee_code, e.department, e.position, e.gender, e.phone, e.join_date, e.maternity_leave_detail, e.status, e.inactive_reason,
                       u.username, u.email, u.name, u.role, u.is_active
                FROM employees e
                INNER JOIN users u ON u.id = e.user_id';

        if ($isAdmin) {
            $stmt = $db->prepare($sql . ' ORDER BY u.name ASC');
            $stmt->execute();
        } else {
            $stmt = $db->prepare($sql . ' WHERE e.user_id = :user_id ORDER BY u.name ASC');
            $stmt->execute(['user_id' => (int) $authUser['id']]);
        }

        $rows = $stmt->fetchAll();
        Http::ok(['employees' => $rows]);
    }

    if ($method === 'GET' && count($segments) === 3) {
        $authUser = Auth::requireUser($db);
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

        $isAdmin = ($authUser['role'] ?? '') === 'admin';
        $isOwner = (int) $item['user_id'] === (int) ($authUser['id'] ?? 0);
        if (!$isAdmin && !$isOwner) {
            Http::fail('Tidak punya akses melihat data karyawan ini.', 403);
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

        try {
            $db->beginTransaction();

            $insertUser = $db->prepare('INSERT INTO users (username, email, password_hash, name, role, provider, is_active) VALUES (:username, :email, :password_hash, :name, :role, :provider, :is_active)');
            $insertUser->execute([
                'username' => $username,
                'email' => $email,
                'password_hash' => password_hash($password, PASSWORD_DEFAULT),
                'name' => $name,
                'role' => (string) ($body['role'] ?? 'karyawan'),
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
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }

        Http::ok(['employee_id' => $employeeId, 'user_id' => $userId], 'Karyawan berhasil ditambahkan.');
    }

    if ($method === 'PUT' && count($segments) === 3) {
        $authUser = Auth::requireUser($db);
        $employeeId = (int) $segments[2];
        $body = Http::body();

        $stmt = $db->prepare('SELECT e.id, e.user_id, u.role, u.name, u.email, u.username, u.is_active FROM employees e INNER JOIN users u ON u.id = e.user_id WHERE e.id = :id LIMIT 1');
        $stmt->execute(['id' => $employeeId]);
        $target = $stmt->fetch();
        if (!$target) {
            Http::fail('Karyawan tidak ditemukan.', 404);
        }

        $canEdit = ($authUser['role'] ?? '') === 'admin' || (int) $authUser['id'] === (int) $target['user_id'];
        if (!$canEdit) {
            Http::fail('Tidak punya akses edit karyawan ini.', 403);
        }

        $isAdmin = ($authUser['role'] ?? '') === 'admin';

        $nextName = trim((string) ($body['name'] ?? $target['name'] ?? ''));
        $nextEmail = array_key_exists('email', $body)
            ? strtolower(trim((string) $body['email']))
            : strtolower(trim((string) ($target['email'] ?? '')));
        $nextUsername = array_key_exists('username', $body)
            ? trim((string) $body['username'])
            : trim((string) ($target['username'] ?? ''));

        if ($nextName === '' || $nextEmail === '' || $nextUsername === '') {
            Http::fail('Nama, username, email wajib diisi.', 422);
        }

        if (!filter_var($nextEmail, FILTER_VALIDATE_EMAIL)) {
            Http::fail('Email tidak valid.', 422);
        }

        $dup = $db->prepare('SELECT id FROM users WHERE (username = :username OR email = :email) AND id <> :id LIMIT 1');
        $dup->execute([
            'username' => $nextUsername,
            'email' => $nextEmail,
            'id' => (int) $target['user_id'],
        ]);
        if ($dup->fetch()) {
            Http::fail('Username atau email sudah digunakan.', 409);
        }

        $nextRole = $isAdmin
            ? (string) ($body['role'] ?? $target['role'] ?? 'karyawan')
            : (string) ($target['role'] ?? 'karyawan');
        $nextIsActive = $isAdmin
            ? (int) (($body['is_active'] ?? $target['is_active'] ?? 1) ? 1 : 0)
            : (int) ($target['is_active'] ?? 1);

        $updateUser = $db->prepare('UPDATE users SET name = :name, email = :email, username = :username, role = :role, is_active = :is_active WHERE id = :id');
        $updateUser->execute([
            'id' => (int) $target['user_id'],
            'name' => $nextName,
            'email' => $nextEmail,
            'username' => $nextUsername,
            'role' => $nextRole,
            'is_active' => $nextIsActive,
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
