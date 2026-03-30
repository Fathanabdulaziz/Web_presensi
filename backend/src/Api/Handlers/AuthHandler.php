<?php


declare(strict_types=1);
require_once __DIR__ . '/../../Http.php';
require_once __DIR__ . '/../../Auth.php';

function handleAuth(PDO $db, string $method, array $segments): void
{
    $action = $segments[2] ?? '';
    $authBody = null;

    if ($method === 'POST') {
        $authBody = Http::body();

        if ($action === '') {
            $requestedAction = strtolower(trim((string) ($authBody['action'] ?? '')));
            if (in_array($requestedAction, ['login', 'register', 'logout', 'google', 'forgot-password', 'verify-otp', 'reset-with-otp'], true)) {
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
                'role' => 'karyawan',
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

    // ─── Step 1: Request OTP – user hanya perlu email ───────────────────────
    if ($method === 'POST' && $action === 'forgot-password') {
        $body = $authBody ?? Http::body();
        $email = strtolower(trim((string) ($body['email'] ?? '')));

        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            Http::fail('Email wajib diisi dengan format yang valid.', 422);
        }

        $stmt = $db->prepare('SELECT id, name, username, provider, is_active FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        // Selalu balas sukses untuk mencegah email enumeration
        if (!$user || (int) ($user['is_active'] ?? 0) !== 1) {
            Http::ok([], 'Jika email terdaftar, kode OTP akan dikirim ke email tersebut.');
        }

        if (strtolower((string) ($user['provider'] ?? 'local')) === 'google') {
            Http::fail('Akun Google tidak dapat reset password lokal.', 409);
        }

        // Buat OTP 6 digit
        $otpCode = sprintf('%06d', random_int(0, 999999));
        $otpHash = password_hash($otpCode, PASSWORD_DEFAULT);
        $expiresAt = date('Y-m-d H:i:s', time() + 600); // 10 menit

        // Hapus OTP lama yang belum terpakai
        $del = $db->prepare('DELETE FROM password_reset_otps WHERE user_id = :uid AND is_used = 0');
        $del->execute(['uid' => (int) $user['id']]);

        // Simpan OTP baru
        $ins = $db->prepare('INSERT INTO password_reset_otps (user_id, otp_hash, expires_at) VALUES (:uid, :hash, :exp)');
        $ins->execute([
            'uid'  => (int) $user['id'],
            'hash' => $otpHash,
            'exp'  => $expiresAt,
        ]);

        // Kirim OTP via SMTP (PHPMailer)
        try {
            otpSendEmail($email, (string) ($user['name'] ?? 'Pengguna'), $otpCode, (string) ($user['username'] ?? ''));
        } catch (\Throwable $mailErr) {
            Http::fail('Kode OTP dibuat namun gagal terkirim ke email: ' . $mailErr->getMessage() . '. Pastikan konfigurasi SMTP sudah benar di file .env', 503);
        }

        Http::ok(['username_hint' => (string) ($user['username'] ?? '')], 'Kode OTP berhasil dikirim ke email Anda. Berlaku 10 menit.');
    }

    // ─── Step 2: Verifikasi OTP ──────────────────────────────────────────────
    if ($method === 'POST' && $action === 'verify-otp') {
        $body = $authBody ?? Http::body();
        $email = strtolower(trim((string) ($body['email'] ?? '')));
        $otp   = trim((string) ($body['otp'] ?? ''));

        if ($email === '' || $otp === '') {
            Http::fail('Email dan kode OTP wajib diisi.', 422);
        }

        $user = otpLookupActiveUser($db, $email);
        $record = otpGetLatestValid($db, (int) $user['id']);

        if (!password_verify($otp, (string) $record['otp_hash'])) {
            Http::fail('Kode OTP tidak valid atau sudah kadaluarsa.', 401);
        }

        Http::ok([], 'Kode OTP valid. Silakan buat password baru.');
    }

    // ─── Step 3: Reset Password dengan OTP ──────────────────────────────────
    if ($method === 'POST' && $action === 'reset-with-otp') {
        $body = $authBody ?? Http::body();
        $email       = strtolower(trim((string) ($body['email'] ?? '')));
        $otp         = trim((string) ($body['otp'] ?? ''));
        $newPassword = (string) ($body['new_password'] ?? '');

        if ($email === '' || $otp === '' || $newPassword === '') {
            Http::fail('Email, kode OTP, dan password baru wajib diisi.', 422);
        }

        if (strlen($newPassword) < 6) {
            Http::fail('Password baru minimal 6 karakter.', 422);
        }

        $user = otpLookupActiveUser($db, $email);
        $record = otpGetLatestValid($db, (int) $user['id']);

        if (!password_verify($otp, (string) $record['otp_hash'])) {
            Http::fail('Kode OTP tidak valid atau sudah kadaluarsa.', 401);
        }

        // Tandai OTP sebagai terpakai
        $markUsed = $db->prepare('UPDATE password_reset_otps SET is_used = 1, used_at = :now WHERE id = :id LIMIT 1');
        $markUsed->execute(['now' => date('Y-m-d H:i:s'), 'id' => (int) $record['id']]);

        // Update password
        $update = $db->prepare('UPDATE users SET password_hash = :hash WHERE id = :id LIMIT 1');
        $update->execute([
            'hash' => password_hash($newPassword, PASSWORD_DEFAULT),
            'id'   => (int) $user['id'],
        ]);

        Http::ok([], 'Password berhasil diperbarui. Silakan login dengan password baru.');
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

                // Daftar baru jika user belum ada
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
                        'role' => 'karyawan',
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
            } else if ($user['provider'] === 'google') {
                // Jika user sudah ada dan providernya google, selalu login saja
                $mode = 'signin';
            } else if ($mode === 'signup') {
                // Jika user sudah ada tapi bukan google, signup gagal
                Http::fail('Username atau email sudah digunakan.', 409);
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

// ─── OTP Helper Functions ────────────────────────────────────────────────────

function otpLookupActiveUser(PDO $db, string $email): array
{
    $stmt = $db->prepare('SELECT id, name, username, provider, is_active FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || (int) ($user['is_active'] ?? 0) !== 1) {
        Http::fail('Akun tidak ditemukan atau tidak aktif.', 404);
    }

    return $user;
}

function otpGetLatestValid(PDO $db, int $userId): array
{
    $stmt = $db->prepare(
        'SELECT id, otp_hash, expires_at FROM password_reset_otps
         WHERE user_id = :uid AND is_used = 0 AND expires_at > NOW()
         ORDER BY created_at DESC LIMIT 1'
    );
    $stmt->execute(['uid' => $userId]);
    $record = $stmt->fetch();

    if (!$record) {
        Http::fail('Kode OTP tidak ditemukan atau sudah kadaluarsa. Minta kode baru.', 410);
    }

    return $record;
}

function otpSendEmail(string $toEmail, string $toName, string $otpCode, string $username): void
{
    $subject = 'Kode OTP Reset Password - PT.GlobalNine';
    $year    = date('Y');

    $htmlBody = <<<HTML
<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Inter,Arial,sans-serif;">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">
    <div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:32px 24px;text-align:center;">
      <div style="font-size:22px;font-weight:700;color:#fff;letter-spacing:1px;">PT.GlobalNine</div>
      <div style="font-size:13px;color:rgba(255,255,255,.75);margin-top:4px;">Reset Password</div>
    </div>
    <div style="padding:32px 28px;">
      <p style="margin:0 0 8px;color:#374151;font-size:15px;">Halo, <strong>{$toName}</strong>!</p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6;">
        Kami menerima permintaan reset password untuk akun Anda. Gunakan kode OTP di bawah ini. Kode berlaku <strong>10 menit</strong>.
      </p>

      <div style="background:#f0f9ff;border:2px dashed #2563eb;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#6b7280;margin-bottom:8px;">Kode OTP Anda</div>
        <div style="font-size:40px;font-weight:800;letter-spacing:10px;color:#1e3a5f;">{$otpCode}</div>
      </div>

      <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Nama pengguna Anda: <strong style="color:#1e3a5f;">{$username}</strong></p>
      <p style="margin:0 0 24px;color:#6b7280;font-size:13px;">Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini.</p>

      <div style="background:#fef2f2;border-radius:8px;padding:12px 16px;">
        <p style="margin:0;color:#b91c1c;font-size:12px;">&#9888;&#65039; Jangan bagikan kode ini kepada siapapun. Tim kami tidak pernah meminta kode OTP Anda.</p>
      </div>
    </div>
    <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 28px;text-align:center;">
      <p style="margin:0;color:#9ca3af;font-size:12px;">&copy; {$year} PT.GlobalNine. Semua hak dilindungi.</p>
    </div>
  </div>
</body>
</html>
HTML;

    $subject = 'Kode OTP Reset Password - PT.GlobalNine';

    try {
        Mailer::send($toEmail, $toName, $subject, $htmlBody);
    } catch (\Throwable $e) {
        // Catat error tapi jangan crash request — OTP tetap tersimpan di DB
        error_log('[OTP Email Error] ' . $e->getMessage());
        // Lempar ulang agar controller bisa berikan pesan yang tepat ke frontend
        throw new \RuntimeException('Gagal mengirim email OTP: ' . $e->getMessage(), 0, $e);
    }
}

