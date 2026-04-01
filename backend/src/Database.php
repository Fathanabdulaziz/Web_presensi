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

        // Auto-migration for new tables missing in the database
        try { self::$connection->exec('CREATE TABLE IF NOT EXISTS system_settings (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, setting_key VARCHAR(100) NOT NULL UNIQUE, setting_value TEXT NULL, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB'); } catch (PDOException $e) { }
        try { self::$connection->exec('CREATE TABLE IF NOT EXISTS work_locations (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, code VARCHAR(50) NOT NULL UNIQUE, name VARCHAR(190) NOT NULL, latitude DECIMAL(11, 8) NOT NULL, longitude DECIMAL(11, 8) NOT NULL, radius_meters INT NOT NULL DEFAULT 200, is_active TINYINT(1) NOT NULL DEFAULT 1, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP) ENGINE=InnoDB'); } catch (PDOException $e) { }
        
        // Add work_location_id to sites if not exists
        try { self::$connection->exec('ALTER TABLE sites ADD COLUMN work_location_id BIGINT UNSIGNED NULL AFTER id'); } catch (PDOException $e) { }
        try { self::$connection->exec('ALTER TABLE sites ADD CONSTRAINT fk_sites_work_location FOREIGN KEY (work_location_id) REFERENCES work_locations(id) ON DELETE SET NULL'); } catch (PDOException $e) { }

        // Initial Seed for work_locations if table is empty
        $count = self::$connection->query('SELECT COUNT(*) FROM work_locations')->fetchColumn();
        if ($count == 0) {
            $seeds = [
                ['B', 'Bekasi/HO', -6.272475, 107.049876, 200],
                ['O', 'Jakarta, Bogor, Depok, Tangerang', -6.2088, 106.8456, 200],
                ['O1', 'Jawa Tengah dan Jawa Timur', -7.7956, 110.3695, 200],
                ['O2', 'Sumatra, Bali dan Nusa Tenggara Barat', 3.5952, 98.6722, 200],
                ['O3', 'Kalimantan dan Sulawesi', -0.0263, 109.3425, 200],
                ['O4', 'Maluku dan Papua', -3.6547, 128.1906, 200]
            ];
            $stmt = self::$connection->prepare('INSERT IGNORE INTO work_locations (code, name, latitude, longitude, radius_meters) VALUES (?, ?, ?, ?, ?)');
            foreach ($seeds as $s) { $stmt->execute($s); }
        }

        return self::$connection;
    }
}
