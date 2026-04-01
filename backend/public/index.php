<?php

declare(strict_types=1);

date_default_timezone_set('Asia/Jakarta');

// ── Load .env file jika ada ──────────────────────────────────────────────────
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $envLines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($envLines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (str_contains($line, '=')) {
            [$key, $value] = explode('=', $line, 2);
            $key   = trim($key);
            $value = trim($value);
            if ($key !== '') {
                putenv("$key=$value");
                $_ENV[$key] = $value;
            }
        }
    }
}

$config = require __DIR__ . '/../config/app.php';

$configuredGoogleClientId = trim((string) ($config['google_client_id'] ?? ''));
if ($configuredGoogleClientId !== '' && trim((string) (getenv('GOOGLE_CLIENT_ID') ?: '')) === '') {
    putenv('GOOGLE_CLIENT_ID=' . $configuredGoogleClientId);
    $_ENV['GOOGLE_CLIENT_ID'] = $configuredGoogleClientId;
}

$isHttps = !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off';
ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_set_cookie_params([
    'lifetime' => 0,
    'path' => '/',
    'domain' => '',
    'secure' => $isHttps,
    'httponly' => true,
    'samesite' => 'Lax',
]);

session_name('web_presensi_session');
session_start();

require_once __DIR__ . '/../src/Http.php';
require_once __DIR__ . '/../src/Database.php';
require_once __DIR__ . '/../src/Auth.php';
require_once __DIR__ . '/../src/Mailer.php';

require_once __DIR__ . '/../src/Api/Helpers.php';
require_once __DIR__ . '/../src/Api/Route.php';
require_once __DIR__ . '/../src/Api/Handlers/AuthHandler.php';
require_once __DIR__ . '/../src/Api/Handlers/EmployeesHandler.php';
require_once __DIR__ . '/../src/Api/Handlers/AttendanceHandler.php';
require_once __DIR__ . '/../src/Api/Handlers/LeavesHandler.php';
require_once __DIR__ . '/../src/Api/Handlers/VisitsHandler.php';
require_once __DIR__ . '/../src/Api/Handlers/AnnouncementsHandler.php';
require_once __DIR__ . '/../src/Api/Handlers/SitesHandler.php';
require_once __DIR__ . '/../src/Api/Handlers/SettingsHandler.php';
require_once __DIR__ . '/../src/Api/Handlers/NotificationsHandler.php';
require_once __DIR__ . '/../src/Api/Handlers/DashboardHandler.php';
require_once __DIR__ . '/../src/Api/Services/GeoGuardService.php';
require_once __DIR__ . '/../src/Api/Dispatcher.php';

$origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
$allowedOrigins = is_array($config['allowed_origins'] ?? null) ? $config['allowed_origins'] : [];

if ($origin !== '') {
    $originHost = parse_url($origin, PHP_URL_HOST);
    $requestScheme = $isHttps ? 'https' : 'http';
    $requestHost = parse_url($requestScheme . '://' . (string) ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST);
    $isSameHostOrigin = is_string($originHost) && is_string($requestHost) && strcasecmp($originHost, $requestHost) === 0;

    if (!in_array($origin, $allowedOrigins, true) && !$isSameHostOrigin) {
        Http::fail('Origin tidak diizinkan.', 403);
    }
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Credentials: true');
    header('Vary: Origin');
} else {
    header('Access-Control-Allow-Origin: *');
}
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
    error_log('[PDOException] ' . $e->getMessage());
    Http::fail('Operasi database gagal.', 500);
} catch (Throwable $e) {
    error_log('[Throwable] ' . $e->getMessage());
    Http::fail('Server error.', 500);
}
