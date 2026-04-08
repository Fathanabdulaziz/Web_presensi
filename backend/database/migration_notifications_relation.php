<?php
require_once __DIR__ . '/../src/Database.php';

// Konfigurasi DB
$config = [
    'db_host' => '127.0.0.1',
    'db_port' => 3306,
    'db_name' => 'web_presensi',
    'db_user' => 'root',
    'db_pass' => '',
];

try {
    $db = Database::connection($config);
    
    echo "Starting notification database migration...\n";

    $queries = [
        "ALTER TABLE user_notifications ADD COLUMN related_type VARCHAR(50) NULL AFTER notification_type",
        "ALTER TABLE user_notifications ADD COLUMN related_id BIGINT UNSIGNED NULL AFTER related_type",
    ];

    foreach ($queries as $sql) {
        try {
            $db->exec($sql);
            echo "Success: $sql\n";
        } catch (PDOException $e) {
            // Check if column already exists
            if (strpos($e->getMessage(), 'Duplicate column name') !== false) {
                echo "Skipped: Column already exists for '$sql'\n";
            } else {
                echo "Error: $sql - " . $e->getMessage() . "\n";
            }
        }
    }

    echo "\nMigration completed successfully.\n";
} catch (Exception $e) {
    echo "Connection failed: " . $e->getMessage() . "\n";
    exit(1);
}
