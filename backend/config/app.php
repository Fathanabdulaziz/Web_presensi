<?php

declare(strict_types=1);

return [
    'db_host' => getenv('DB_HOST') ?: '127.0.0.1',
    'db_port' => (int) (getenv('DB_PORT') ?: 3306),
    'db_name' => getenv('DB_NAME') ?: 'web_presensi',
    'db_user' => getenv('DB_USER') ?: 'root',
    'db_pass' => getenv('DB_PASS') ?: '',
    'db_charset' => getenv('DB_CHARSET') ?: 'utf8mb4',
    'db_timezone' => getenv('DB_TIMEZONE') ?: '+07:00',
    'app_env' => getenv('APP_ENV') ?: 'development',
    'google_client_id' => getenv('GOOGLE_CLIENT_ID') ?: (getenv('APP_GOOGLE_CLIENT_ID') ?: '530836351055-rulnn3t6vgrn39rff1tk38n8em5ue2hj.apps.googleusercontent.com'),
    'allowed_origins' => array_values(array_filter(array_map('trim', explode(',', (string) (getenv('ALLOWED_ORIGINS') ?: 'http://127.0.0.1:5050,http://localhost:5050,http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:8080,http://localhost:8080'))))),
];
