-- =====================================================
-- Migration: Anti-Fake GPS (Heuristik) Security System
-- =====================================================

USE web_presensi;

-- Tabel untuk menyimpan log GPS setiap absensi (untuk Speed Trap)
CREATE TABLE IF NOT EXISTS gps_attendance_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    attendance_id BIGINT UNSIGNED NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    accuracy_meters DECIMAL(10,2) NULL,
    client_ip VARCHAR(45) NULL,
    ip_estimated_lat DECIMAL(10,7) NULL,
    ip_estimated_lng DECIMAL(10,7) NULL,
    ip_city VARCHAR(120) NULL,
    ip_region VARCHAR(120) NULL,
    ip_country VARCHAR(10) NULL,
    speed_kmh DECIMAL(10,2) NULL COMMENT 'Kecepatan perpindahan dari titik sebelumnya (km/h)',
    distance_from_prev_km DECIMAL(10,4) NULL COMMENT 'Jarak dari titik absen sebelumnya (km)',
    time_diff_seconds INT UNSIGNED NULL COMMENT 'Selisih waktu dari absen sebelumnya (detik)',
    accuracy_samples JSON NULL COMMENT 'Array sampel akurasi GPS dari frontend',
    accuracy_flag ENUM('normal', 'suspicious', 'blocked') NOT NULL DEFAULT 'normal',
    speed_flag ENUM('normal', 'suspicious', 'blocked') NOT NULL DEFAULT 'normal',
    ip_gps_flag ENUM('normal', 'suspicious', 'blocked') NOT NULL DEFAULT 'normal',
    overall_status ENUM('passed', 'flagged', 'blocked') NOT NULL DEFAULT 'passed',
    block_reason TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gps_log_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_gps_log_attendance FOREIGN KEY (attendance_id) REFERENCES attendance_records(id) ON DELETE SET NULL,
    INDEX idx_gps_log_user_time (user_id, created_at),
    INDEX idx_gps_log_status (overall_status)
) ENGINE=InnoDB;

-- Tabel konfigurasi jaringan kantor (untuk validasi IP HR/Admin)
CREATE TABLE IF NOT EXISTS office_networks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    network_name VARCHAR(120) NOT NULL,
    ip_range_start VARCHAR(45) NOT NULL COMMENT 'IP awal range (misal 192.168.1.0)',
    ip_range_end VARCHAR(45) NOT NULL COMMENT 'IP akhir range (misal 192.168.1.255)',
    subnet_cidr VARCHAR(50) NULL COMMENT 'Notasi CIDR (misal 192.168.1.0/24)',
    department_target ENUM('all', 'hr_admin', 'finance') NOT NULL DEFAULT 'all',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_office_net_dept (department_target),
    INDEX idx_office_net_active (is_active)
) ENGINE=InnoDB;

-- Tabel token verifikasi 2 langkah untuk Finance
CREATE TABLE IF NOT EXISTS finance_verification_tokens (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at DATETIME NOT NULL,
    is_used TINYINT(1) NOT NULL DEFAULT 0,
    used_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_fin_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_fin_token_user (user_id, is_used),
    INDEX idx_fin_token_expires (expires_at)
) ENGINE=InnoDB;

-- Seed data: jaringan kantor default
INSERT INTO office_networks (network_name, ip_range_start, ip_range_end, subnet_cidr, department_target, is_active)
VALUES
    ('WiFi Kantor Utama', '192.168.1.0', '192.168.1.255', '192.168.1.0/24', 'all', 1),
    ('WiFi HR & Admin', '192.168.2.0', '192.168.2.255', '192.168.2.0/24', 'hr_admin', 1),
    ('WiFi Finance (Terpisah)', '10.10.10.0', '10.10.10.255', '10.10.10.0/24', 'finance', 1),
    ('Localhost Development', '127.0.0.1', '127.0.0.1', '127.0.0.1/32', 'all', 1);
