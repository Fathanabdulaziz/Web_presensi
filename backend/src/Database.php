<?php

declare(strict_types=1);

final class Database
{
    private static ?PDO $connection = null;

    public static function connection(array $config): PDO
    {
        if (self::$connection instanceof PDO) {
            return self::$connection;
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%d;dbname=%s;charset=%s',
            $config['db_host'],
            $config['db_port'],
            $config['db_name'],
            $config['db_charset'] ?? 'utf8mb4'
        );

        self::$connection = new PDO(
            $dsn,
            $config['db_user'],
            $config['db_pass'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );

        $timezone = $config['db_timezone'] ?? '+07:00';
        $stmt = self::$connection->prepare('SET time_zone = :timezone');
        $stmt->execute(['timezone' => $timezone]);

        return self::$connection;
    }
}
