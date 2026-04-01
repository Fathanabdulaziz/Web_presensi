CREATE DATABASE IF NOT EXISTS web_presensi CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE web_presensi;

CREATE TABLE IF NOT EXISTS users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(190) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(150) NOT NULL,
    role ENUM('admin', 'karyawan', 'hr', 'manager', 'finance', 'bod') NOT NULL DEFAULT 'karyawan',
    provider VARCHAR(30) NOT NULL DEFAULT 'local',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS employees (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    employee_code VARCHAR(50) NULL,
    department VARCHAR(120) NULL,
    position VARCHAR(120) NULL,
    gender VARCHAR(30) NULL,
    phone VARCHAR(40) NULL,
    join_date DATE NULL,
    maternity_leave_detail VARCHAR(255) NULL,
    status ENUM('Active', 'On Leave', 'Inactive') NOT NULL DEFAULT 'Active',
    inactive_reason VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_employees_department (department),
    INDEX idx_employees_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS sites (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(190) NOT NULL UNIQUE,
    created_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sites_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    attendance_type ENUM('checkin', 'checkout') NOT NULL,
    work_location VARCHAR(120) NOT NULL,
    site_id BIGINT UNSIGNED NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    accuracy_meters DECIMAL(10,2) NULL,
    event_at DATETIME NOT NULL,
    notes TEXT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    approved_by BIGINT UNSIGNED NULL,
    approved_at DATETIME NULL,
    rejected_by BIGINT UNSIGNED NULL,
    rejected_at DATETIME NULL,
    work_description VARCHAR(190) NULL,
    overtime_hours DECIMAL(5,2) NULL,
    prayer_dhuhur_status VARCHAR(50) NULL,
    prayer_ashar_status VARCHAR(50) NULL,
    driving_notes TEXT NULL,
    face_image_data LONGTEXT NULL,
    face_image_format VARCHAR(20) NULL,
    face_image_size_bytes INT UNSIGNED NULL,
    attachment_name VARCHAR(255) NULL,
    attachment_type VARCHAR(120) NULL,
    attachment_size INT UNSIGNED NULL,
    attachment_data LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_attendance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_attendance_site FOREIGN KEY (site_id) REFERENCES sites(id) ON DELETE SET NULL,
    CONSTRAINT fk_attendance_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_attendance_rejected_by FOREIGN KEY (rejected_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_attendance_user_date (user_id, event_at),
    INDEX idx_attendance_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS leave_requests (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    leave_type ENUM('sick', 'personal', 'maternity', 'other', 'annual', 'paid', 'unpaid') NOT NULL,
    type_label VARCHAR(120) NULL,
    days_requested INT UNSIGNED NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    contact_info VARCHAR(190) NOT NULL,
    leave_address VARCHAR(255) NOT NULL,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    
    -- Step 1: Manager (for Emp) or BOD (for Manager)
    step1_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    step1_by BIGINT UNSIGNED NULL,
    step1_at DATETIME NULL,
    step1_reason TEXT NULL,
    
    -- Step 2: HR
    step2_status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    step2_by BIGINT UNSIGNED NULL,
    step2_at DATETIME NULL,
    step2_reason TEXT NULL,

    attachment_name VARCHAR(255) NULL,
    attachment_type VARCHAR(120) NULL,
    attachment_size INT UNSIGNED NULL,
    attachment_data LONGTEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_leave_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_leave_step1_by FOREIGN KEY (step1_by) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_leave_step2_by FOREIGN KEY (step2_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_leave_user_date (user_id, start_date, end_date),
    INDEX idx_leave_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS client_visits (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    client_name VARCHAR(190) NOT NULL,
    client_location VARCHAR(255) NOT NULL,
    visit_date DATE NOT NULL,
    check_in_time TIME NOT NULL,
    check_out_time TIME NULL,
    duration_minutes INT UNSIGNED NULL,
    visit_purpose VARCHAR(190) NOT NULL,
    visit_notes TEXT NULL,
    location_type ENUM('map', 'current') NOT NULL DEFAULT 'map',
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    status ENUM('Aktif', 'Selesai', 'Dibatalkan') NOT NULL DEFAULT 'Aktif',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_visits_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_visits_user_date (user_id, visit_date),
    INDEX idx_visits_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS announcements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(190) NOT NULL,
    category VARCHAR(120) NOT NULL,
    content TEXT NOT NULL,
    publish_date DATE NOT NULL,
    author_user_id BIGINT UNSIGNED NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'Normal',
    target_division VARCHAR(120) NOT NULL DEFAULT 'Semua Divisi',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_announcement_author FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_announcement_publish_date (publish_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS announcement_attachments (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    announcement_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    stored_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(120) NULL,
    size_bytes INT UNSIGNED NULL,
    data_url LONGTEXT NOT NULL,
    converted_to_webp TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_announcement_attachment FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
    INDEX idx_announcement_attachment_announcement (announcement_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_notifications (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(190) NOT NULL,
    message TEXT NOT NULL,
    notification_type VARCHAR(40) NOT NULL DEFAULT 'info',
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_notifications_user_read (user_id, is_read)
) ENGINE=InnoDB;
