# GlobalNine HR - Sistem Manajemen Presensi dan HR

Website sistem manajemen HR yang lengkap dan profesional dengan fitur presensi online canggih, manajemen cuti, face recognition, GPS tracking, dan panel terpisah untuk admin dan karyawan.

## Deskripsi Proyek

Sistem ini dirancang untuk memfasilitasi manajemen sumber daya manusia di perusahaan GlobalNine. Terdapat dua panel utama:

- **Panel Admin (HR)**: Untuk manajer HR mengelola data karyawan, memantau presensi, menyetujui cuti, dan melihat laporan.
- **Panel Karyawan (User)**: Untuk karyawan melakukan presensi, mengajukan cuti, dan melihat status pribadi.

Kedua panel saling terintegrasi dan sinkron, memastikan data yang konsisten dan real-time.

## Struktur Proyek

```
Web_presensi/
├── index.html                    # Halaman login utama (membedakan admin/user)
├── dashboard.html               # Halaman dashboard admin (legacy)
├── admin/                        # Folder panel admin HR
│   ├── dashboard.html           # Dashboard admin dengan statistik dan KPI
│   ├── attendance.html          # Manajemen presensi semua karyawan
│   ├── employees.html           # Manajemen data karyawan
│   ├── leave.html              # Manajemen pengajuan cuti
│   └── client_visit.html       # Catatan kunjungan klien
├── user/                        # Folder panel karyawan
│   ├── dashboard.html          # Dashboard karyawan dengan status pribadi
│   ├── attendance.html         # Presensi dengan GPS & face recognition
│   ├── leave.html             # Pengajuan dan riwayat cuti
│   ├── user-dashboard.js      # JavaScript untuk dashboard karyawan
│   ├── user-attendance.js     # JavaScript untuk fitur presensi
│   └── user-leave.js          # JavaScript untuk manajemen cuti
├── css/
│   └── style.css               # Styling responsif untuk seluruh website
├── js/
│   ├── script.js               # Logika utama, autentikasi, dan utility
│   ├── admin-dashboard.js     # JavaScript khusus dashboard admin
│   ├── admin-attendance.js    # JavaScript manajemen presensi admin
│   ├── admin-employees.js     # JavaScript manajemen karyawan
│   ├── admin-leave.js         # JavaScript manajemen cuti admin
│   └── admin-visits.js        # JavaScript kunjungan klien
└── assets/                     # Folder untuk gambar, ikon, dan asset lainnya
```

## Fitur Utama

### Panel Admin (HR Management)

#### 1. Dashboard Admin
- **Statistik Real-time**: Jumlah karyawan hadir, terlambat, cuti, dan kunjungan klien hari ini
- **Grafik Tren Mingguan**: Visualisasi tren presensi menggunakan Chart.js
- **Clock-ins Terbaru**: Daftar karyawan yang baru check-in dengan lokasi
- **Pengumuman Perusahaan**: Sistem pengumuman internal untuk komunikasi dengan karyawan
- **Download Laporan**: Ekspor data dalam format PDF atau CSV

#### 2. Manajemen Presensi
- **Monitoring Real-time**: Lihat status presensi semua karyawan
- **Filter Canggih**: Cari berdasarkan nama, departemen, tanggal, status
- **Verifikasi Lokasi**: Lihat koordinat GPS setiap presensi
- **Face Recognition Status**: Status verifikasi wajah untuk setiap presensi
- **Pagination**: Navigasi data dengan pagination untuk performa optimal

#### 3. Manajemen Karyawan
- **Database Karyawan**: Tambah, edit, hapus, dan cari data karyawan
- **Informasi Lengkap**: Nama, ID, departemen, posisi, kontak
- **Status Aktif**: Pantau status keaktifan karyawan

#### 4. Manajemen Cuti
- **Approval System**: Setujui atau tolak pengajuan cuti
- **Statistik Cuti**: Jumlah pending, approved, rejected, on leave today
- **Tabel Interaktif**: Lihat detail pengajuan dengan filter
- **Riwayat Lengkap**: Tracking semua pengajuan cuti

#### 5. Kunjungan Klien
- **Pencatatan Kunjungan**: Catat kunjungan ke klien dengan detail
- **Lokasi dan Waktu**: Track lokasi dan durasi kunjungan
- **Laporan Kunjungan**: Generate laporan untuk management

### Panel Karyawan (Employee Portal)

#### 1. Dashboard Karyawan
- **Aksi Cepat**: Tombol shortcut untuk presensi dan ajukan cuti
- **Status Hari Ini**: Check-in/out time, lokasi kerja
- **Aktivitas Terbaru**: Timeline aktivitas presensi
- **Saldo Cuti**: Sisa cuti tahunan dan sakit
- **Notifikasi**: Update status pengajuan cuti

#### 2. Presensi Canggih
- **GPS Tracking**: Otomatis capture lokasi koordinat saat presensi
- **Face Recognition**: Verifikasi wajah menggunakan face-api.js
- **Validasi Real-time**: Pastikan lokasi valid dan wajah terdeteksi
- **Riwayat Harian**: Lihat presensi hari ini
- **Catatan Tambahan**: Tambahkan notes pada setiap presensi

#### 3. Pengajuan Cuti
- **Form Lengkap**: Pilih jenis cuti, tanggal, alasan, kontak darurat
- **Validasi Otomatis**: Cek saldo cuti dan tanggal yang valid
- **Upload Dokumen**: Lampirkan surat dokter atau dokumen pendukung
- **Riwayat Pengajuan**: Lihat status semua pengajuan cuti
- **Notifikasi Status**: Update otomatis saat disetujui/ditolak

## Teknologi yang Digunakan

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Styling**: CSS Grid dan Flexbox untuk layout responsif
- **Libraries**:
  - Chart.js untuk grafik dan visualisasi data
  - Font Awesome untuk ikon
  - Face-api.js untuk face recognition
- **Browser APIs**: Geolocation API untuk GPS tracking
- **Architecture**: Modular JavaScript dengan separation of concerns

## Cara Menjalankan Proyek

1. **Clone atau Download**: Pastikan semua file dalam folder `Web_presensi`
2. **Buka di Browser**: 
   - Untuk development, gunakan live server (misal: VS Code Live Server extension)
   - Atau buka `index.html` langsung di browser modern
3. **Login**:
   - **Admin**: Gunakan kredensial admin untuk akses panel HR
   - **Karyawan**: Gunakan kredensial karyawan untuk akses portal

## Akun Demo

### Admin (HR)
- Username: admin
- Password: admin123
- Akses: Semua fitur manajemen HR

### Karyawan
- Username: employee1
- Password: pass123
- Akses: Presensi, cuti, dashboard pribadi

## Sinkronisasi Admin dan User

Sistem ini dirancang dengan sinkronisasi penuh antara panel admin dan user:

- **Data Presensi**: Presensi user langsung tercatat di database admin
- **Pengajuan Cuti**: Ajuan user langsung muncul di panel admin untuk approval
- **Status Update**: Perubahan di admin langsung terlihat di user (dan sebaliknya)
- **Real-time Sync**: Semua perubahan tersimpan dan di-sync secara real-time

## Keamanan dan Validasi

- **Face Recognition**: Mencegah presensi tanpa verifikasi wajah
- **GPS Validation**: Pastikan presensi dari lokasi yang benar
- **Input Validation**: Validasi form di frontend dan backend
- **Session Management**: Sistem login/logout dengan session tracking

## Pengembangan Selanjutnya

- [ ] Integrasi dengan database (MySQL/PostgreSQL)
- [ ] API backend untuk data persistence
- [ ] Mobile app companion
- [ ] Advanced reporting dengan export Excel
- [ ] Email notifications untuk approvals
- [ ] Multi-language support
- [ ] Role-based access control yang lebih granular

## Kontribusi

Untuk berkontribusi pada proyek ini:
1. Fork repository
2. Buat branch fitur baru
3. Commit perubahan
4. Push ke branch
5. Buat Pull Request

## Lisensi

Proyek ini untuk keperluan edukasi dan demonstrasi. Gunakan dengan bijak.

---

**GlobalNine HR System** - Membuat manajemen HR lebih efisien dan modern.

### Admin
- Username: `admin`
- Password: `admin`

### User/Karyawan
- Username: `user`
- Password: `user`

## Cara Menjalankan

1. Buka file `index.html` di browser web modern
2. Login menggunakan akun demo di atas
3. Admin akan diarahkan ke `admin/dashboard.html`
4. User akan diarahkan ke `user/dashboard.html`

## Teknologi yang Digunakan

- **HTML5**: Struktur halaman web
- **CSS3**: Styling modern dengan CSS Variables dan Grid/Flexbox
- **JavaScript (ES6+)**: Logika aplikasi, face recognition, GPS
- **Face API**: Library JavaScript untuk deteksi wajah
- **LocalStorage**: Penyimpanan data lokal (untuk demo)

## Fitur Khusus

### Face Recognition
- Menggunakan face-api.js untuk deteksi wajah
- Model TinyFaceDetector untuk performa optimal
- Verifikasi wajah sebelum presensi dicatat
- Mendukung kamera depan/handphone

### GPS Tracking
- Menggunakan Geolocation API browser
- Mendapatkan koordinat latitude/longitude
- Akurasi tinggi dengan timeout handling
- Validasi lokasi sebelum presensi

### Form Cuti
- Validasi tanggal otomatis
- Kalkulasi jumlah hari cuti
- Upload lampiran (surat dokter, dll)
- Status tracking (pending/approved/rejected)

## Browser Support

- Chrome 70+
- Firefox 65+
- Safari 12+
- Edge 79+

## Catatan Penggunaan

1. **Face Recognition**: Pastikan memberikan izin kamera ke browser
2. **GPS**: Pastikan memberikan izin lokasi ke browser
3. **Data Storage**: Semua data disimpan di localStorage browser
4. **Responsive**: Website dioptimalkan untuk desktop dan mobile

## Pengembangan Lanjutan

Website ini dapat dikembangkan lebih lanjut dengan:
- Backend server (Node.js, PHP, Python)
- Database (MySQL, MongoDB)
- Real-time notifications
- Integration dengan mobile apps
- Advanced face recognition dengan database wajah
- GPS geofencing untuk area kantor

## Lisensi

Proyek ini dibuat untuk tujuan edukasi dan demonstrasi.
