USE web_presensi;

INSERT INTO users (id, username, email, password_hash, name, role, provider, is_active)
VALUES
    (1, 'admin', 'admin@globalnine.local', '$2y$10$a.tFesmrjQk9JsjFj9Oc9ezv/BpnWKuVe.M0tYK8KUu2FoQPuVd22', 'Administrator', 'admin', 'local', 1),
    (2, 'user', 'user@globalnine.local', '$2y$10$pa0G.d1QeM/qrVDCPka0zO22OxeLydD2SyNxs/hLe8Mt7lH2bed4O', 'Employee User', 'karyawan', 'local', 1),
    (3, 'hr', 'hr@globalnine.local', '$2y$10$pa0G.d1QeM/qrVDCPka0zO22OxeLydD2SyNxs/hLe8Mt7lH2bed4O', 'HR Admin', 'hr', 'local', 1),
    (4, 'manager', 'manager@globalnine.local', '$2y$10$pa0G.d1QeM/qrVDCPka0zO22OxeLydD2SyNxs/hLe8Mt7lH2bed4O', 'Manager Divisi', 'manager', 'local', 1),
    (5, 'finance', 'finance@globalnine.local', '$2y$10$pa0G.d1QeM/qrVDCPka0zO22OxeLydD2SyNxs/hLe8Mt7lH2bed4O', 'Staff Finance', 'finance', 'local', 1),
    (6, 'bod', 'bod@globalnine.local', '$2y$10$pa0G.d1QeM/qrVDCPka0zO22OxeLydD2SyNxs/hLe8Mt7lH2bed4O', 'Board of Directors', 'bod', 'local', 1),
    (7, 'itstaff', 'itstaff@globalnine.local', '$2y$10$pa0G.d1QeM/qrVDCPka0zO22OxeLydD2SyNxs/hLe8Mt7lH2bed4O', 'IT Support Employee', 'karyawan', 'local', 1),
    (8, 'security', 'security@globalnine.local', '$2y$10$pa0G.d1QeM/qrVDCPka0zO22OxeLydD2SyNxs/hLe8Mt7lH2bed4O', 'Operation Security', 'karyawan', 'local', 1)
ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    password_hash = VALUES(password_hash),
    name = VALUES(name),
    role = VALUES(role),
    provider = VALUES(provider),
    is_active = VALUES(is_active);

INSERT INTO employees (user_id, employee_code, department, position, gender, phone, join_date, status)
VALUES
    (1, 'ADM-001', 'Human Resource', 'Administrator', 'Laki-laki', '081200000001', '2022-01-10', 'Active'),
    (2, 'EMP-001', 'Operation', 'Staff Operation', 'Perempuan', '081200000002', '2023-03-15', 'Active'),
    (3, 'HR-002', 'Human Resource', 'HR Officer', 'Perempuan', '081200000003', '2023-05-20', 'Active'),
    (4, 'MGR-001', 'IT', 'IT Manager', 'Laki-laki', '081200000004', '2021-11-01', 'Active'),
    (5, 'FIN-001', 'Finance', 'Finance Staff', 'Perempuan', '081200000005', '2022-08-10', 'Active'),
    (6, 'BOD-001', 'Board', 'Director', 'Laki-laki', '081200000006', '2020-01-01', 'Active'),
    (7, 'IT-001', 'IT', 'IT Support', 'Laki-laki', '081200000007', '2024-01-01', 'Active'),
    (8, 'OPS-002', 'Operation', 'Security', 'Laki-laki', '081200000008', '2024-01-01', 'Active')
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
-- user / user (Karyawan)
-- hr / hr
-- manager / manager
-- finance / finance
