<?php
require_once __DIR__ . '/../src/Database.php';

// Cek .env atau pakai default
$config = [
    'db_host' => '127.0.0.1',
    'db_port' => 3306,
    'db_name' => 'web_presensi',
    'db_user' => 'root',
    'db_pass' => '',
];

try {
    $db = Database::connection($config);
    
    $queries = [
        "ALTER TABLE client_visits ADD COLUMN accuracy_meters DECIMAL(10,2) NULL",
        "ALTER TABLE client_visits ADD COLUMN geo_risk_score INT DEFAULT 0",
        "ALTER TABLE client_visits ADD COLUMN geo_flags TEXT NULL",
        "ALTER TABLE client_visits ADD COLUMN position_samples LONGTEXT NULL",
        "ALTER TABLE client_visits ADD COLUMN face_image_data LONGTEXT NULL",
        "ALTER TABLE client_visits ADD COLUMN face_image_format VARCHAR(20) NULL",
        "ALTER TABLE client_visits ADD COLUMN face_image_size_bytes INT UNSIGNED NULL",
        "ALTER TABLE client_visits ADD COLUMN checkout_latitude DECIMAL(10,7) NULL",
        "ALTER TABLE client_visits ADD COLUMN checkout_longitude DECIMAL(10,7) NULL",
        "ALTER TABLE client_visits ADD COLUMN checkout_accuracy_meters DECIMAL(10,2) NULL",
        "ALTER TABLE client_visits ADD COLUMN checkout_geo_risk_score INT DEFAULT 0",
        "ALTER TABLE client_visits ADD COLUMN checkout_geo_flags TEXT NULL",
        "ALTER TABLE client_visits ADD COLUMN checkout_position_samples LONGTEXT NULL",
        "ALTER TABLE client_visits ADD COLUMN checkout_face_image_data LONGTEXT NULL",
        "ALTER TABLE client_visits ADD COLUMN checkout_face_image_format VARCHAR(20) NULL",
        "ALTER TABLE client_visits ADD COLUMN checkout_face_image_size_bytes INT UNSIGNED NULL",
    ];

    foreach ($queries as $sql) {
        try {
            $db->exec($sql);
            echo "Success: $sql\n";
        } catch (PDOException $e) {
            echo "Skipped/Error: $sql - " . $e->getMessage() . "\n";
        }
    }

    echo "\nMigration completed.\n";
    echo "PENTING: Jika muncul error 'Unknown column', pastikan Anda sudah menjalankan skrip ini melalui terminal dengan perintah: php backend/database/migration_visit_face_gps.php\n";
} catch (Exception $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
}
