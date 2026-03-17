# GlobalNine HR Web Presensi

Platform manajemen presensi dan operasional HR berbasis web untuk kebutuhan internal perusahaan. Aplikasi menyediakan portal terpisah untuk admin HR dan karyawan, dengan fokus pada kecepatan operasional, keterlacakan data, dan kemudahan penggunaan di desktop maupun mobile.

## Ringkasan

GlobalNine HR Web Presensi membantu tim HR dan karyawan dalam proses harian berikut:

- Presensi masuk dan pulang berbasis lokasi
- Monitoring presensi lintas karyawan oleh admin
- Pengajuan dan persetujuan cuti
- Pencatatan kunjungan klien
- Pengumuman internal perusahaan
- Dashboard ringkasan untuk pengambilan keputusan cepat

## Fitur Utama

### Portal Admin

- Dashboard KPI presensi harian
- Manajemen data karyawan
- Validasi dan tindak lanjut data presensi
- Persetujuan atau penolakan pengajuan cuti
- Monitoring kunjungan klien
- Pengelolaan pengumuman perusahaan
- Export data laporan (sesuai modul)

### Portal Karyawan

- Dashboard status personal
- Presensi harian
- Pengajuan cuti dan pelacakan status
- Pencatatan kunjungan klien
- Lihat pengumuman perusahaan
- Profil pengguna

### Pengalaman Pengguna

- Multi-bahasa: Indonesia dan English
- Tema terang dan gelap
- Responsif untuk desktop dan mobile
- Notifikasi in-app

## Arsitektur dan Teknologi

- Frontend: HTML5, CSS3, JavaScript (vanilla ES6+)
- Visualisasi: Chart.js
- Ikon: Font Awesome
- Peta/lokasi: Leaflet (modul tertentu)
- Penyimpanan data: LocalStorage (mode demo/prototipe)

## Struktur Folder

```text
Web_presensi/
|- index.html
|- signup.html
|- dashboard.html
|- admin/
|  |- dashboard.html
|  |- attendance.html
|  |- employees.html
|  |- leave.html
|  |- client_visit.html
|- user/
|  |- dashboard.html
|  |- attendance.html
|  |- leave.html
|  |- client_visit.html
|  |- profile.html
|- css/
|  |- style.css
|- js/
|  |- script.js
|  |- admin-dashboard.js
|  |- admin-attendance.js
|  |- admin-employees.js
|  |- admin-leave.js
|  |- admin-visits.js
|  |- user-dashboard.js
|  |- user-attendance.js
|  |- user-leave.js
|  |- user-client-visit.js
|  |- user-profile.js
|- assets/
```

## Menjalankan Aplikasi

### Prasyarat

- Browser modern (Chrome, Edge, Firefox, Safari versi terbaru)
- Disarankan menjalankan lewat local web server (mis. Five Server / Live Server)

### Langkah Cepat

1. Buka folder proyek di editor.
2. Jalankan local server pada root proyek.
3. Akses halaman login dari browser.
4. Masuk menggunakan akun demo.

## Akun Demo

### Admin

- Username: admin
- Password: admin

### Karyawan

- Username: user
- Password: user

## Catatan Penting untuk Publikasi

- Proyek saat ini menggunakan LocalStorage untuk penyimpanan data.
- Implementasi ini cocok untuk demo, PoC, dan validasi alur bisnis.
- Untuk produksi perusahaan skala penuh, direkomendasikan menambahkan backend API, database terpusat, dan hardening keamanan.

## Rekomendasi Sebelum Go-Live Produksi

- Integrasi backend (REST API) dan database terpusat
- Otentikasi aman (hashing password, session/token management)
- Otorisasi berbasis peran lebih granular
- Audit log aktivitas pengguna
- Backup dan recovery data
- Monitoring aplikasi dan error tracking

## Keamanan dan Kepatuhan

Perhatian:

- Jangan gunakan akun demo untuk lingkungan produksi.
- Jangan menyimpan data sensitif di LocalStorage untuk deployment produksi.
- Terapkan kebijakan keamanan perusahaan (enkripsi, kontrol akses, dan retensi data) pada tahap implementasi server-side.

## Roadmap

- Integrasi backend dan database
- SSO/Google Sign-In produksi
- Notifikasi email/push
- Reporting lanjutan
- Penguatan kontrol keamanan dan audit

## Lisensi dan Penggunaan

Dokumen dan kode pada repositori ini ditujukan untuk kebutuhan internal perusahaan GlobalNine.
Hak penggunaan, distribusi, dan modifikasi mengikuti kebijakan internal perusahaan.

## Kontak Internal

Untuk kebutuhan perubahan fitur, perbaikan bug, atau rollout produksi, silakan koordinasi dengan tim pengembang/internal IT perusahaan.
