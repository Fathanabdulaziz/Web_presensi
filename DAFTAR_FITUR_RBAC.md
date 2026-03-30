# Dokumentasi Arsitektur RBAC "Pintu Ganda" (Double Door)

## 📌 Pendahuluan
Dokumentasi ini dibuat untuk mensinkronisasi pemahaman seluruh tim *Developer* mengenai algoritma **Role-Based Access Control (RBAC)** terbaru. Sistem ini mengubah tata cara masuk (Login) dan pemisahan hak akses (Admin vs Karyawan) untuk mencapai standar aplikasi HRIS modern (contoh: Talenta, LinovHR).

---

## 🏗️ Konsep Dasar ("Pintu Ganda")
Masalah yang sering dialami oleh aplikasi berjenjang adalah: *"Bagaimana caranya supaya Manager/HR/Finance tetap dapat mencetak Absensi setiap pagi (sebagai karyawan), namun mereka juga harus punya akses ke Panel Manajemen?"*

Konsep **Pintu Ganda** memecahkan masalah ini dengan cara:
1. Menaruh fitur **Absensi (Check-in/Check-out)** dan **Izin Cuti** SETARA untuk *SIAPAPUN*.
2. Memaksa seluruh pengguna masuk ke Pintu Utama yang sama (Dashboard Karyawan).
3. Menyediakan "Pintu Rahasia" (*Switch Account/Portal*) bagi pengguna yang diizinkan untuk melihat menu laporan.

---

## 🛠️ Implementasi Teknis (Frontend)

### 1. Titik Temu Otomatis pada Validasi Login
Di file `js/script.js`, function `redirectByRole(user)` **telah dirombak total**.
- *Sebelumnya:* Sistem mendeteksi role. Jika Manager, *redirect* ke `admin/dashboard.html`.
- *Sekarang:* Siapapun yang login (Apapun Jabatannya), **SEMUA DIARAHKAN PERTAMA KALI KE: `user/dashboard.html`**.

### 2. Injeksi Navigasi Spesial (Dashboard Karyawan)
Karena Pimpinan sekarang masuk ke `user/dashboard.html`, kita perlu membuatkan jalan pintas (*Shortcut*) ke Panel Manajemen.
- Di dalam `js/script.js` saya telah menambahkan blok `DOMContentLoaded` yang mendeteksi:
  *Jika Role == 'manager' / 'hr' / 'finance' / 'admin'*
- Maka sebuah elemen Navigasi spesial `<a class="nav-admin-portal">` secara dinamis disisipkan pada posisi TERATAS di Sidebar kiri (*Halaman Pribadi*). Elemen ini bertuliskan **"Panel Manajemen"**.

### 3. Pemisahan Hak Akses Hierarki Pimpinan (Panel Admin)
Saat salah satu Pimpinan (misal: *Finance*) masuk ke area Panel Manajemen, tampilan dan fitur sidebar akan **dipilah ulang secara otomatis**. Script injeksi RBAC yang berada di bagian terbawah `js/script.js` memastikan rute yang diizinkan:

#### Matrix Hak Akses (*Allowed Routes*):
* **HR** & **Admin** `['all']`
  Dapat melihat semua fitur (Dashboard, Absen, Cuti, Manajemen Pegawai, Pengumuman, Laporan).
* **Manager** `['dashboard.html', 'attendance.html', 'leave.html']`
  Disembunyikan menu *Kelola Pegawai* dan *Sebar Informasi*. Manager hanya fokus memantau anak buahnya bekerja dan mem-validasi *Cuti*.
* **Finance** `['dashboard.html', 'attendance.html']`
  Paling dibatasi eksklusif sesuai Flowchart! Menu Cuti, Pengumuman, dan Manajemen Pegawai **dihilangkan** karena Finance hanya berkepentingan untuk Ekspor Rekap Gaji/Absen.

### 4. Keamanan *Security Kick* (Lapis Kedua)
Sangat mungkin pengguna nakal (*Finance* yang pintar IT) sengaja mengetik URL di browser menuju `admin/employees.html` agar bisa mengintip atau mengubah data/gaji pegawai lain.
Sistem ini telah dilengkapi **Security Kick Loop**.
Apabila seseorang yang mengakses URL tidak memiliki alamat tujuan di dalam array *Matrix Hak Akses* miliknya, maka:
```javascript
if (!pageAllowed) {
    window.location.href = 'dashboard.html';
}
```
Si pengintip (Finance) akan **dikembalikan secara paksa** mental ke `dashboard.html` Admin secara kilat (*Instant Redirect*).

---

## 🔄 Alur Navigasi Pekerjaan Sehari-Hari

**Studi Kasus 1: Ibu Rina (Manager)**
1. Pagi datang ke kantor ➔ Login ➔ Tampil di Halaman Pribadi Karyawan.
2. Rina klik **Masuk Presensi** dan wajahnya di-scan kamera.
3. Rina ingin melihat apakah anak buahnya sudah masuk ➔ Klik *"Panel Manajemen"*.
4. Muncullah Halaman Admin (Menu *Kelola Karyawan* hilang dari pandangan Rina).
5. Rina meng-klik Persetujuan Cuti untuk anak buahnya.
6. Sore mau pulang ➔ Rina klik *"Halaman Pribadi (Absen)"* ➔ Selesai Absen Pulang.

**Studi Kasus 2: Pak Jono (Finance)**
1. Datang ke kantor ➔ Klik Login ➔ Absen Pagi (di Halaman Karyawan).
2. Sorenya mau merekap Payroll.
3. Jono klik *"Panel Manajemen"*.
4. Navigasi sangat terisolir: Yang ia lihat DIHILANGKAN tombol *Cuti*, *Bikin Pengumuman*.
5. Ia mem-filter kalender bulanan lalu klik **Download CSV/Excel**.
6. Kembali ke *Halaman Pribadi* lalu Jono klik Absen Pulang lewat HP nya.

---
*This architecture safely separates individual concerns from managerial overheads while sealing off URL-manipulation hacks completely.*
