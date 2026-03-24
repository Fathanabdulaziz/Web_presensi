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
];
