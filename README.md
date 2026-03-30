# GlobalNine HR Web Presensi

Platform manajemen presensi dan operasional HR berbasis web untuk kebutuhan internal perusahaan. Aplikasi menyediakan portal terpisah untuk admin HR dan karyawan.

## Ringkasan Fitur

- Presensi masuk dan pulang berbasis lokasi
- Monitoring presensi lintas karyawan oleh admin
- Pengajuan dan persetujuan cuti
- Pencatatan kunjungan klien
- Pengumuman internal perusahaan
- Dashboard ringkasan admin dan user
- Notifikasi in-app

## Teknologi

- Frontend: HTML5, CSS3, JavaScript (vanilla ES6+)
- Backend: PHP native (tanpa framework)
- Database: MySQL 8+
- Visualisasi: Chart.js
- Ikon: Font Awesome
- Peta/lokasi: Leaflet (modul tertentu)

## Struktur Folder

```text
Web_presensi/
|- index.html
|- signup.html
|- dashboard.html
|- admin/
|- user/
|- css/
|- js/
|- assets/
|- backend/
|  |- public/index.php
|  |- src/
|  |- config/app.php
|  |- database/schema.sql
|  |- database/seed.sql
```

## Setup Backend (PHP + MySQL)

### Prasyarat

- PHP 8.1+
- MySQL 8+

### 1. Buat Database dan Tabel

Jalankan file berikut ke MySQL:

- backend/database/schema.sql

### 2. Isi Data Awal

Jalankan file berikut ke MySQL:

- backend/database/seed.sql

**Data Akun Demo Tersedia (Sistem Multi-Role RBAC):**

Sistem presensi ini menggunakan pengaturan Role-Based Access Control untuk membagi hak akses secara ketat:
- **admin / admin** (Role: `admin`) -> Memiliki akses Superadmin ke seluruh fitur web.
- **hr / hr** (Role: `hr`) -> Memiliki akses ke Dashboard Admin untuk pengelolaan user, cuti, dan laporan.
- **manager / manager** (Role: `manager`) -> Memahami performa bawahan divisi. Diarahkan otomatis ke Dashboard Admin.
- **finance / finance** (Role: `finance`) -> Akses ekspor data rekap absensi untuk keperluan *payroll* gaji. Diarahkan otomatis ke Dashboard Admin.
- **karyawan / karyawan** (Role: `karyawan`) -> Pegawai reguler biasa (Default Role jika ada user mendaftar baru). Mengakses form kehadiran harian.

### 3. Konfigurasi Koneksi Database

Konfigurasi ada di `backend/config/app.php` dan bisa dioverride lewat environment variable:

- DB_HOST
- DB_PORT
- DB_NAME
- DB_USER
- DB_PASS
- DB_CHARSET
- DB_TIMEZONE

### 4. Jalankan API Backend

Jalankan dari root project:

```bash
php -S localhost:8080 -t backend/public
php -S 0.0.0.0:8080 -t backend/public backend/public/index.php
```

Health check:

- GET /health

## Endpoint API

### Auth

- POST /api/auth/login
- POST /api/auth/register
- POST /api/auth/logout
- GET /api/auth/me

### Employees

- GET /api/employees
- GET /api/employees/{id}
- POST /api/employees
- PUT /api/employees/{id}
- DELETE /api/employees/{id}

### Attendance

- GET /api/attendance
- POST /api/attendance
- PATCH /api/attendance/{id}/status

### Leave

- GET /api/leaves
- POST /api/leaves
- PATCH /api/leaves/{id}/status
- DELETE /api/leaves/{id}

### Visits

- GET /api/visits
- POST /api/visits
- PUT /api/visits/{id}
- DELETE /api/visits/{id}

### Announcements

- GET /api/announcements
- POST /api/announcements
- PUT /api/announcements/{id}
- DELETE /api/announcements/{id}

### Sites

- GET /api/sites
- POST /api/sites
- DELETE /api/sites/{id}

### Notifications

- GET /api/notifications
- POST /api/notifications
- PATCH /api/notifications/{id}/read

### Dashboard

- GET /api/dashboard/summary

## Catatan Integrasi Frontend

Frontend Anda sebelumnya memakai LocalStorage untuk mode demo. Untuk mode backend penuh, seluruh operasi data di file JavaScript perlu menggunakan fetch ke endpoint API di atas.

## Keamanan

- Jangan gunakan akun demo untuk produksi
- Gunakan HTTPS saat deploy
- Batasi CORS sesuai domain frontend produksi
- Simpan kredensial DB via environment variable

## Lisensi dan Penggunaan

Dokumen dan kode pada repositori ini ditujukan untuk kebutuhan internal perusahaan GlobalNine.
