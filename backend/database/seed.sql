USE web_presensi;

INSERT INTO users (id, username, email, password_hash, name, role, provider, is_active)
VALUES
    (1, 'admin', 'admin@globalnine.local', '$2y$10$xkshwpN20hTdNzM3L9A7QOKYYf5ywA8z4Kp8vP8hP3qKo8h5M9mAu', 'Administrator', 'admin', 'local', 1),
    (2, 'user', 'user@globalnine.local', '$2y$10$9urLf35tW/BdzfU9OHZQp.n6oFWiX8cK.sI5iQxjQwv4XnW2mRy1W', 'Employee User', 'user', 'local', 1)
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    password_hash = VALUES(password_hash),
    name = VALUES(name),
    role = VALUES(role),
    provider = VALUES(provider),
    is_active = VALUES(is_active);

INSERT INTO employees (user_id, employee_code, department, position, gender, phone, join_date, status)
VALUES
    (1, 'ADM-001', 'Human Resource', 'HR Manager', 'Laki-laki', '081200000001', '2022-01-10', 'Active'),
    (2, 'EMP-001', 'Operation', 'Staff Operation', 'Perempuan', '081200000002', '2023-03-15', 'Active')
ON DUPLICATE KEY UPDATE
    employee_code = VALUES(employee_code),
    department = VALUES(department),
    position = VALUES(position),
    gender = VALUES(gender),
    phone = VALUES(phone),
    join_date = VALUES(join_date),
    status = VALUES(status);

INSERT INTO sites (name, created_by)
VALUES
    ('Head Office', 1),
    ('Site Karawang', 1),
    ('Site Cikarang', 1)
ON DUPLICATE KEY UPDATE
    created_by = VALUES(created_by);

INSERT INTO announcements (title, category, content, publish_date, author_user_id, priority, target_division)
VALUES
    ('Pedoman Kerja Remote Baru', 'Update Kebijakan', 'Mulai bulan depan, pola hybrid 3:2 berlaku untuk seluruh divisi. Silakan cek detail jadwal di portal HR.', CURDATE(), 1, 'Normal', 'Semua Divisi'),
    ('Rapat Townhall Tahunan', 'Acara', 'Townhall tahunan akan dilaksanakan Jumat pukul 15:30 WIB. Kehadiran seluruh karyawan diharapkan.', CURDATE(), 1, 'High', 'Semua Divisi')
ON DUPLICATE KEY UPDATE
    category = VALUES(category),
    content = VALUES(content),
    publish_date = VALUES(publish_date),
    priority = VALUES(priority),
    target_division = VALUES(target_division);

INSERT INTO user_notifications (user_id, title, message, notification_type)
VALUES
    (2, 'Selamat Datang', 'Akun Anda aktif. Silakan mulai presensi harian.', 'success'),
    (2, 'Info Cuti', 'Anda dapat mengajukan cuti langsung melalui portal user.', 'info')
ON DUPLICATE KEY UPDATE
    title = VALUES(title),
    message = VALUES(message),
    notification_type = VALUES(notification_type);

-- Password default:
-- admin / admin
-- user / user
