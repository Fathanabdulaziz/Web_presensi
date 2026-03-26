<?php

declare(strict_types=1);

function handleAuth(PDO $db, string $method, array $segments): void
{
    $action = $segments[2] ?? '';
    $authBody = null;

    if ($method === 'POST') {
        $authBody = Http::body();

        if ($action === '') {
            $requestedAction = strtolower(trim((string) ($authBody['action'] ?? '')));
            if (in_array($requestedAction, ['login', 'register', 'logout', 'google'], true)) {
                $action = $requestedAction;
            } elseif (!empty($authBody['logout'])) {
                $action = 'logout';
            } elseif (isset($authBody['name']) || isset($authBody['email'])) {
                $action = 'register';
            } elseif (isset($authBody['id_token'])) {
                $action = 'google';
            } elseif (isset($authBody['username']) && isset($authBody['password'])) {
                $action = 'login';
            }
        }
    }

    if ($method === 'POST' && $action === 'login') {
        $body = $authBody ?? Http::body();
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
        $body = $authBody ?? Http::body();
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

        try {
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
        } catch (Throwable $e) {
            if ($db->inTransaction()) {
                $db->rollBack();
            }
            throw $e;
        }
        Auth::login($userId);

        Http::ok(['user_id' => $userId], 'Registrasi berhasil.');
    }

    if ($method === 'POST' && $action === 'logout') {
        Auth::logout();
        Http::ok([], 'Logout berhasil.');
    }

    if ($method === 'POST' && $action === 'google') {
        $body = $authBody ?? Http::body();
        $idToken = trim((string) ($body['id_token'] ?? ''));
        $mode = strtolower(trim((string) ($body['mode'] ?? 'signin')));

        if ($idToken === '') {
            Http::fail('Token Google wajib diisi.', 422);
        }
        if (!in_array($mode, ['signin', 'signup'], true)) {
            $mode = 'signin';
        }

        $googlePayload = googleVerifyIdToken($idToken);
        $email = strtolower(trim((string) ($googlePayload['email'] ?? '')));
        $name = trim((string) ($googlePayload['name'] ?? ''));
        $emailVerified = (string) ($googlePayload['email_verified'] ?? '') === 'true';

        if ($email === '' || !$emailVerified) {
            Http::fail('Akun Google tidak valid atau email belum terverifikasi.', 401);
        }

        $stmt = $db->prepare('SELECT id, username, name, email, role, provider, is_active, created_at FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        if (!$user) {
            if ($mode !== 'signup') {
                Http::fail('Akun belum terdaftar. Gunakan Daftar dengan Google terlebih dulu.', 404);
            }

            $preferredUsername = googleBuildUniqueUsername($db, (string) ($googlePayload['given_name'] ?? ''), $email);
            $displayName = $name !== '' ? $name : ucfirst(strtok($email, '@'));

            try {
                $db->beginTransaction();

                $insert = $db->prepare('INSERT INTO users (username, email, password_hash, name, role, provider, is_active) VALUES (:username, :email, :password_hash, :name, :role, :provider, 1)');
                $insert->execute([
                    'username' => $preferredUsername,
                    'email' => $email,
                    'password_hash' => password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT),
                    'name' => $displayName,
                    'role' => 'user',
                    'provider' => 'google',
                ]);

                $userId = (int) $db->lastInsertId();
                $emp = $db->prepare('INSERT INTO employees (user_id, status) VALUES (:user_id, :status)');
                $emp->execute([
                    'user_id' => $userId,
                    'status' => 'Active',
                ]);

                $db->commit();
            } catch (Throwable $e) {
                if ($db->inTransaction()) {
                    $db->rollBack();
                }
                throw $e;
            }

            $stmt->execute(['email' => $email]);
            $user = $stmt->fetch();
        }

        if (!$user) {
            Http::fail('Gagal mengambil data user Google.', 500);
        }

        if ((int) ($user['is_active'] ?? 0) !== 1) {
            Http::fail('Akun tidak aktif.', 403);
        }

        Auth::login((int) $user['id']);
        Http::ok(['user' => $user], 'Login Google berhasil.');
    }

    if ($method === 'GET' && $action === 'me') {
        $user = Auth::requireUser($db);
        Http::ok(['user' => $user]);
    }

    Http::fail('Route auth tidak ditemukan.', 404);
}

function googleVerifyIdToken(string $idToken): array
{
    $url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($idToken);
    $payload = googleHttpGetJson($url);

    if (!is_array($payload) || isset($payload['error_description']) || isset($payload['error'])) {
        Http::fail('Token Google tidak valid.', 401);
    }

    $aud = trim((string) ($payload['aud'] ?? ''));
    $iss = trim((string) ($payload['iss'] ?? ''));
    $allowedClientId = trim((string) (getenv('GOOGLE_CLIENT_ID') ?: ''));

    if ($allowedClientId === '') {
        Http::fail('Server Google OAuth belum dikonfigurasi.', 500);
    }

    if ($aud !== $allowedClientId) {
        Http::fail('Client Google tidak diizinkan.', 401);
    }

    if (!in_array($iss, ['accounts.google.com', 'https://accounts.google.com'], true)) {
        Http::fail('Issuer Google tidak valid.', 401);
    }

    return $payload;
}

function googleHttpGetJson(string $url): array
{
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_HTTPHEADER => ['Accept: application/json'],
        ]);
        $response = curl_exec($ch);
        curl_close($ch);
        if (is_string($response) && $response !== '') {
            $decoded = json_decode($response, true);
            return is_array($decoded) ? $decoded : [];
        }
        return [];
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 10,
            'header' => "Accept: application/json\r\n",
        ],
    ]);

    $response = @file_get_contents($url, false, $context);
    if (!is_string($response) || $response === '') {
        return [];
    }

    $decoded = json_decode($response, true);
    return is_array($decoded) ? $decoded : [];
}

function googleBuildUniqueUsername(PDO $db, string $hint, string $email): string
{
    $base = preg_replace('/[^a-z0-9]/', '', strtolower($hint));
    if (!is_string($base) || $base === '') {
        $base = preg_replace('/[^a-z0-9]/', '', strtolower((string) strtok($email, '@')));
    }
    if (!is_string($base) || $base === '') {
        $base = 'googleuser';
    }
    $base = substr($base, 0, 20);

    $candidate = $base;
    $counter = 1;
    $check = $db->prepare('SELECT id FROM users WHERE username = :username LIMIT 1');

    while (true) {
        $check->execute(['username' => $candidate]);
        if (!$check->fetch()) {
            return $candidate;
        }
        $candidate = substr($base, 0, max(1, 20 - strlen((string) $counter))) . $counter;
        $counter += 1;
    }
}
