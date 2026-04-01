// ==================== USER DATA & INITIALIZATION ====================
let currentUser = null;

// Demo users with roles
const demoUsers = [
    { id: 1, username: 'admin', password: 'admin', name: 'Administrator', role: 'admin', sessionSource: 'local' },
    { id: 2, username: 'karyawan', password: 'karyawan', name: 'Karyawan Biasa', role: 'karyawan', sessionSource: 'local' },
    { id: 3, username: 'hr', password: 'hr', name: 'HR Admin', role: 'hr', sessionSource: 'local' },
    { id: 4, username: 'manager', password: 'manager', name: 'Manager Divisi', role: 'manager', sessionSource: 'local' },
    { id: 5, username: 'finance', password: 'finance', name: 'Staff Finance', role: 'finance', sessionSource: 'local' },
    { id: 6, username: 'bod', password: 'bod', name: 'Board of Directors', role: 'bod', sessionSource: 'local' }
];

const APP_LANGUAGE_STORAGE_KEY = 'appLanguage';
const APP_COOKIE_CONSENT_STORAGE_KEY = 'appCookieConsent';
const APP_COOKIE_CONSENT_ACCEPTED = 'accepted';
const APP_COOKIE_CONSENT_ESSENTIAL = 'essential';
const APP_SUPPORTED_LANGUAGES = ['id', 'en'];
const APP_I18N_PAIRS = [
    { id: 'Masuk', en: 'Sign In' },
    { id: 'Daftar', en: 'Sign Up' },
    { id: 'Logout', en: 'Log Out' },
    { id: 'Dashboard', en: 'Dashboard' },
    { id: 'Dashboard Admin', en: 'Admin Dashboard' },
    { id: 'Employee Portal', en: 'Employee Portal' },
    { id: 'Presensi', en: 'Attendance' },
    { id: 'Cuti', en: 'Leave' },
    { id: 'Kunjungan Klien', en: 'Client Visits' },
    { id: 'Karyawan', en: 'Employees' },
    { id: 'Profile', en: 'Profile' },
    { id: 'Profile User', en: 'User Profile' },
    { id: 'Ringkasan', en: 'Overview' },
    { id: 'Manajemen Cuti', en: 'Leave Management' },
    { id: 'Manajemen Presensi', en: 'Attendance Management' },
    { id: 'Manajemen Karyawan', en: 'Employee Management' },
    { id: 'Manajemen Kunjungan Klien', en: 'Client Visit Management' },
    { id: 'Sedang Cuti', en: 'On Leave' },
    { id: 'Aktif', en: 'Active' },
    { id: 'Tidak Aktif', en: 'Inactive' },
    { id: 'Selesai', en: 'Completed' },
    { id: 'Dibatalkan', en: 'Cancelled' },
    { id: 'Nama Lengkap', en: 'Full Name' },
    { id: 'Nama', en: 'Name' },
    { id: 'Username', en: 'Username' },
    { id: 'Email', en: 'Email' },
    { id: 'Alamat Email', en: 'Email Address' },
    { id: 'No Kontak', en: 'Contact Number' },
    { id: 'Nomor ID', en: 'ID Number' },
    { id: 'Departemen', en: 'Department' },
    { id: 'Divisi/Departemen', en: 'Division/Department' },
    { id: 'Posisi', en: 'Position' },
    { id: 'Gender', en: 'Gender' },
    { id: 'Tanggal Bergabung', en: 'Join Date' },
    { id: 'Status', en: 'Status' },
    { id: 'Aksi', en: 'Actions' },
    { id: 'Lokasi', en: 'Location' },
    { id: 'Tanggal', en: 'Date' },
    { id: 'Waktu', en: 'Time' },
    { id: 'Tanggal Mulai', en: 'Start Date' },
    { id: 'Tanggal Selesai', en: 'End Date' },
    { id: 'Alasan', en: 'Reason' },
    { id: 'Hari', en: 'Days' },
    { id: 'Jumlah Hari', en: 'Number of Days' },
    { id: 'Durasi', en: 'Duration' },
    { id: 'Jenis', en: 'Type' },
    { id: 'Simpan', en: 'Save' },
    { id: 'Batal', en: 'Cancel' },
    { id: 'Tutup', en: 'Close' },
    { id: 'Lanjut', en: 'Continue' },
    { id: 'Hapus', en: 'Delete' },
    { id: 'Edit', en: 'Edit' },
    { id: 'Lihat', en: 'View' },
    { id: 'Unduh', en: 'Download' },
    { id: 'Disetujui', en: 'Approved' },
    { id: 'Ditolak', en: 'Rejected' },
    { id: 'Pending', en: 'Pending' },
    { id: 'pending', en: 'pending' },
    { id: 'approved', en: 'approved' },
    { id: 'rejected', en: 'rejected' },
    { id: 'Approve', en: 'Approve' },
    { id: 'Reject', en: 'Reject' },
    { id: 'Approve All', en: 'Approve All' },
    { id: 'Reject All', en: 'Reject All' },
    { id: 'Menunggu Persetujuan', en: 'Pending Approval' },
    { id: 'Cari karyawan...', en: 'Search employees...' },
    { id: 'Cari klien...', en: 'Search clients...' },
    { id: 'Cari berdasarkan Nama atau ID Karyawan...', en: 'Search by Employee Name or ID...' },
    { id: 'Pilih gender', en: 'Select gender' },
    { id: 'Laki-laki', en: 'Male' },
    { id: 'Perempuan', en: 'Female' },
    { id: 'Semua Status', en: 'All Statuses' },
    { id: 'Semua Departemen', en: 'All Departments' },
    { id: 'Semua Divisi', en: 'All Divisions' },
    { id: 'Memuat karyawan...', en: 'Loading employees...' },
    { id: 'Memuat catatan presensi...', en: 'Loading attendance records...' },
    { id: 'Memuat catatan kunjungan...', en: 'Loading visit records...' },
    { id: 'Memuat permintaan cuti...', en: 'Loading leave requests...' },
    { id: 'No employees found', en: 'No employees found' },
    { id: 'No leave requests found', en: 'No leave requests found' },
    { id: 'Konfirmasi', en: 'Confirmation' },
    { id: 'Input', en: 'Input' },
    { id: 'Konfirmasi Logout', en: 'Logout Confirmation' },
    { id: 'Apakah anda yakin untuk logout', en: 'Are you sure you want to log out' },
    { id: 'Notifikasi', en: 'Notifications' },
    { id: 'Tandai dibaca', en: 'Mark as read' },
    { id: 'Bersihkan yang sudah dibaca', en: 'Clear read notifications' },
    { id: 'Buka notifikasi', en: 'Open notifications' },
    { id: 'Buka Profile', en: 'Open Profile' },
    { id: 'Aksi Cepat', en: 'Quick Actions' },
    { id: 'Presensi Sekarang', en: 'Check In Now' },
    { id: 'Ajukan Cuti', en: 'Request Leave' },
    { id: 'Status Hari Ini', en: 'Today Status' },
    { id: 'Aktivitas Terbaru', en: 'Recent Activity' },
    { id: 'Sisa Cuti', en: 'Leave Balance' },
    { id: 'Cuti Tahunan', en: 'Annual' },
    { id: 'Cuti Berbayar', en: 'Paid' },
    { id: 'Cuti Tidak Berbayar', en: 'Unpaid' },
    { id: 'Presensi Harian', en: 'Daily Attendance' },
    { id: 'Lokasi Anda', en: 'Your Location' },
    { id: 'Mengambil lokasi GPS...', en: 'Getting GPS location...' },
    { id: 'Dapatkan Lokasi', en: 'Get Location' },
    { id: 'Verifikasi Wajah', en: 'Face Verification' },
    { id: 'Mulai Kamera', en: 'Start Camera' },
    { id: 'Tangkap Wajah', en: 'Capture Face' },
    { id: 'Status: Kamera belum dimulai', en: 'Status: Camera not started' },
    { id: 'Tipe Presensi', en: 'Attendance Type' },
    { id: 'Pilih Tipe Presensi', en: 'Select Attendance Type' },
    { id: 'Lokasi Kerja', en: 'Work Location' },
    { id: 'Pilih Lokasi Kerja', en: 'Select Work Location' },
    { id: 'Nama Site', en: 'Site Name' },
    { id: 'Pilih Nama Site', en: 'Select Site Name' },
    { id: 'Uraian Pekerjaan', en: 'Work Description' },
    { id: 'Pilih Uraian Pekerjaan', en: 'Select Work Description' },
    { id: 'Catatan Driving', en: 'Driving Notes' },
    { id: 'Catatan (Opsional)', en: 'Notes (Optional)' },
    { id: 'Submit Presensi', en: 'Submit Attendance' },
    { id: 'Riwayat Presensi Hari Ini', en: 'Today Attendance History' },
    { id: 'Pengajuan Cuti', en: 'Leave Request' },
    { id: 'Sisa Cuti Anda', en: 'Your Leave Balance' },
    { id: 'Alasan Cuti', en: 'Leave Reason' },
    { id: 'Cuti Tahunan', en: 'Annual Leave' },
    { id: 'Cuti Berbayar', en: 'Paid Leave' },
    { id: 'Cuti Tidak Berbayar', en: 'Unpaid Leave' },
    { id: 'Karyawan menikah', en: 'Employee marriage' },
    { id: 'Menikahkan anaknya', en: 'Marriage of child' },
    { id: 'Mengkhitankan/membaptis anak', en: 'Circumcision/Baptism of child' },
    { id: 'Istri melahirkan/keguguran', en: 'Wife giving birth/miscarriage' },
    { id: 'Suami/istri, orang tua/mertua, anak meninggal', en: 'Spouse, parent/in-law, child passed away' },
    { id: 'Anggota keluarga serumah meninggal', en: 'Family member in same house passed away' },
    { id: 'Sisa cuti tahunan habis', en: 'Annual leave balance exhausted' },
    { id: 'Perpanjangan cuti melahirkan', en: 'Maternity leave extension' },
    { id: 'Alasan pribadi/keluarga mendesak', en: 'Urgent personal/family reason' },
    { id: 'Melanjutkan studi', en: 'Continuing studies' },
    { id: 'Informasi Kontak Selama Cuti', en: 'Contact Information During Leave' },
    { id: 'Alamat Selama Cuti', en: 'Address During Leave' },
    { id: 'Lampiran (Opsional)', en: 'Attachment (Optional)' },
    { id: 'Bersihkan', en: 'Clear' },
    { id: 'Riwayat Pengajuan Cuti', en: 'Leave Request History' },
    { id: 'Total Kunjungan Hari Ini', en: 'Total Visits Today' },
    { id: 'Kunjungan Aktif', en: 'Active Visits' },
    { id: 'Kunjungan Selesai', en: 'Completed Visits' },
    { id: 'Klien Unik', en: 'Unique Clients' },
    { id: 'Peta Lokasi Kunjungan', en: 'Visit Location Map' },
    { id: 'Catatan Kunjungan Klien', en: 'Client Visit Records' },
    { id: 'Tambah Kunjungan', en: 'Add Visit' },
    { id: 'Tambah Kunjungan Klien', en: 'Add Client Visit' },
    { id: 'Simpan Kunjungan', en: 'Save Visit' },
    { id: 'Edit Status Kunjungan', en: 'Edit Visit Status' },
    { id: 'Status Kunjungan', en: 'Visit Status' },
    { id: 'Simpan Perubahan', en: 'Save Changes' },
    { id: 'Informasi Profile', en: 'Profile Information' },
    { id: 'Statistik Presensi Tahunan', en: 'Yearly Attendance Statistics' },
    { id: 'Tahun', en: 'Year' },
    { id: 'Bulan', en: 'Month' },
    { id: 'Minggu', en: 'Week' },
    { id: 'Jenis Diagram', en: 'Chart Type' },
    { id: 'Edit Profile', en: 'Edit Profile' },
    { id: 'Data Akun', en: 'Account Data' },
    { id: 'Masukkan nomor ID perusahaan', en: 'Enter company ID number' },
    { id: 'Nomor telepon aktif', en: 'Active phone number' },
    { id: 'Contoh: Staff Finance', en: 'Example: Finance Staff' },
    { id: 'Contoh: Hak 90 hari, sudah terpakai 30 hari', en: 'Example: 90 days entitlement, 30 days already used' },
    { id: 'Secure Access', en: 'Secure Access' },
    { id: 'Masuk ke workspace presensi Anda', en: 'Sign in to your attendance workspace' },
    { id: 'Masukkan username', en: 'Enter username' },
    { id: 'Masukkan password', en: 'Enter password' },
    { id: 'Tampilkan password', en: 'Show password' },
    { id: 'Ingat username saya', en: 'Remember my username' },
    { id: 'Lupa password?', en: 'Forgot password?' },
    { id: 'Masuk dengan Google', en: 'Sign in with Google' },
    { id: 'Belum punya akun?', en: 'Do not have an account yet?' },
    { id: 'Buat akun', en: 'Create account' },
    { id: 'New Account Setup', en: 'New Account Setup' },
    { id: 'Buat Akun', en: 'Create Account' },
    { id: 'Daftar akun profesional untuk Employee Portal', en: 'Register a professional account for Employee Portal' },
    { id: 'Daftar dengan Google', en: 'Sign up with Google' },
    { id: 'atau daftar manual', en: 'or sign up manually' },
    { id: 'Masukkan nama lengkap', en: 'Enter full name' },
    { id: 'nama@email.com', en: 'name@email.com' },
    { id: 'Minimal 6 karakter', en: 'Minimum 6 characters' },
    { id: 'Gunakan kombinasi huruf, angka, dan simbol.', en: 'Use a combination of letters, numbers, and symbols.' },
    { id: 'Konfirmasi Password', en: 'Confirm Password' },
    { id: 'Ulangi password', en: 'Repeat password' },
    { id: 'Saya setuju dengan kebijakan privasi dan ketentuan penggunaan.', en: 'I agree with the privacy policy and terms of use.' },
    { id: 'Sudah punya akun?', en: 'Already have an account?' },
    { id: 'Kembali ke Login', en: 'Back to Login' },
    { id: 'Akun baru otomatis dibuat sebagai role karyawan.', en: 'New accounts are automatically created with employee role.' },
    { id: 'Menampilkan', en: 'Showing' },
    { id: 'sampai', en: 'to' },
    { id: 'dari', en: 'of' },
    { id: 'hasil', en: 'results' },
    { id: 'Lacak dan kelola kunjungan site klien', en: 'Track and manage client site visits' },
    { id: 'Ekspor Laporan Kunjungan', en: 'Export Visit Report' },
    { id: '📥 Ekspor Laporan Kunjungan', en: '📥 Export Visit Report' },
    { id: 'Sebelumnya', en: 'Previous' },
    { id: 'Selanjutnya', en: 'Next' },
    { id: 'Ringkasan Bulanan', en: 'Monthly Summary' },
    { id: 'Selamat Datang,', en: 'Welcome,' },
    { id: 'Ajukan permohonan cuti Anda dengan lengkap', en: 'Submit your leave request completely' },
    { id: 'Data akun dan statistik presensi tahunan', en: 'Account data and yearly attendance statistics' },
    { id: 'Belum check-in', en: 'Not checked in yet' },
    { id: 'Karyawan', en: 'Employee' },
    { id: 'hari', en: 'days' },
    { id: 'Kontak', en: 'Contact' },
    { id: 'Alamat', en: 'Address' },
    { id: 'Diajukan', en: 'Submitted' },
    { id: 'Ringkasan real-time status karyawan hari ini', en: 'Real-time summary of employee status today' },
    { id: 'Presensi Hari Ini', en: 'Today Attendance' },
    { id: 'Hadir', en: 'Present' },
    { id: 'Terlambat', en: 'Late' },
    { id: 'Minggu Ini', en: 'This Week' },
    { id: 'Minggu Lalu', en: 'Last Week' },
    { id: 'Bulan Ini', en: 'This Month' },
    { id: 'Lihat Semua →', en: 'View All →' },
    { id: 'Update Kebijakan', en: 'Policy Update' },
    { id: 'Acara', en: 'Event' },
    { id: 'Kesehatan & Keselamatan', en: 'Health & Safety' },
    { id: 'Panduan Kerja Remote Baru', en: 'New Remote Work Guidelines' },
    { id: 'Pedoman Kerja Remote Baru', en: 'New Remote Work Guidelines' },
    { id: 'Rapat Townhall Tahunan', en: 'Annual Townhall Meeting' },
    { id: 'Program Kesehatan Karyawan', en: 'Employee Health Program' },
    { id: 'Program Vaksinasi Flu', en: 'Flu Vaccination Program' },
    { id: 'Mulai bulan depan, pola hybrid 3:2 berlaku untuk seluruh divisi. Silakan cek detail jadwal di portal HR.', en: 'Starting next month, a 3:2 hybrid pattern applies to all divisions. Please check schedule details on the HR portal.' },
    { id: 'Townhall tahunan akan dilaksanakan Jumat pukul 15:30 WIB. Kehadiran seluruh karyawan diharapkan.', en: 'The annual townhall will be held on Friday at 15:30 WIB. Attendance from all employees is expected.' },
    { id: 'Mulai bulan depan, pola hybrid 3:2 berlaku untuk seluruh divisi. Cek detail jadwal tim di portal admin.', en: 'Starting next month, a 3:2 hybrid pattern applies to all divisions. Check team schedule details on the admin portal.' },
    { id: 'Townhall akan dilaksanakan Jumat pukul 15:30 WIB di Aula Utama dan live streaming internal.', en: 'The townhall will be held on Friday at 15:30 WIB in the Main Hall and via internal live streaming.' },
    { id: 'Pemeriksaan kesehatan berkala dibuka minggu ini. Silakan daftar melalui HR paling lambat Kamis.', en: 'Periodic health check registration opens this week. Please register through HR by Thursday at the latest.' },
    { id: 'Lihat dan kelola catatan presensi karyawan, lokasi GPS, dan verifikasi.', en: 'View and manage employee attendance logs, GPS location, and verification.' },
    { id: 'Log Presensi', en: 'Attendance Logs' },
    { id: 'Kelola Nama Site', en: 'Manage Site Names' },
    { id: 'Kelola daftar nama site yang dapat dipilih oleh karyawan saat presensi', en: 'Manage site names employees can choose during attendance' },
    { id: 'Masukkan nama site baru', en: 'Enter new site name' },
    { id: 'Tambah Site', en: 'Add Site' },
    { id: 'Menampilkan', en: 'Showing' },
    { id: 'sampai', en: 'to' },
    { id: 'dari', en: 'of' },
    { id: 'hasil', en: 'results' },
    { id: 'GlobalNine HR - Dashboard Admin', en: 'GlobalNine HR - Admin Dashboard' },
    { id: 'GlobalNine HR - Manajemen Karyawan', en: 'GlobalNine HR - Employee Management' },
    { id: 'GlobalNine HR - Manajemen Cuti', en: 'GlobalNine HR - Leave Management' },
    { id: 'GlobalNine HR - Manajemen Presensi', en: 'GlobalNine HR - Attendance Management' },
    { id: 'GlobalNine HR - Manajemen Kunjungan Klien', en: 'GlobalNine HR - Client Visit Management' },
    { id: 'GlobalNine - Presensi', en: 'GlobalNine - Attendance' },
    { id: 'GlobalNine - Pengajuan Cuti', en: 'GlobalNine - Leave Request' },
    { id: 'GlobalNine - Kunjungan Klien', en: 'GlobalNine - Client Visits' },
    { id: 'GlobalNine - Profile User', en: 'GlobalNine - User Profile' },
    { id: 'PT.GlobalNine - Login', en: 'PT.GlobalNine - Login' },
    { id: 'PT.GlobalNine - Buat Akun', en: 'PT.GlobalNine - Sign Up' },
    { id: 'GlobalNine HR', en: 'GlobalNine HR' },
    { id: 'Light', en: 'Light' },
    { id: 'Dark', en: 'Dark' },
    { id: 'Aktifkan tema terang', en: 'Enable light theme' },
    { id: 'Aktifkan tema gelap', en: 'Enable dark theme' }
];

const APP_I18N_BY_ID = new Map(APP_I18N_PAIRS.map(pair => [pair.id, pair]));
const APP_I18N_BY_EN = new Map(APP_I18N_PAIRS.map(pair => [pair.en, pair]));
let appLanguageObserver = null;
let appLanguageTranslateTimer = null;
const appI18nTextOriginalMap = new WeakMap();
const appI18nAttrOriginalMap = new WeakMap();
const APP_API_BASE_URL = resolveApiBaseUrl();
window.__APP_API_BASE_URL = APP_API_BASE_URL;
let hasShownApiFallbackNotice = false;

let users = [...demoUsers];

function resolveApiBaseUrl() {
    function isPrivateIpv4Host(host) {
        const match = String(host || '').match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (!match) return false;

        const a = Number(match[1]);
        const b = Number(match[2]);
        if (Number.isNaN(a) || Number.isNaN(b)) return false;

        return a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
    }

    function normalizeLocalBackendUrl(rawUrl) {
        const fallback = 'http://localhost:8080';
        if (!rawUrl) return fallback;

        try {
            const parsed = new URL(String(rawUrl).trim());
            const hostName = parsed.hostname;
            const isLocalhost = hostName === 'localhost' || hostName === '127.0.0.1';
            const isPrivateIpv4 = isPrivateIpv4Host(hostName);

            if (parsed.port && parsed.port !== '8080' && (isLocalhost || isPrivateIpv4)) {
                return `${parsed.protocol}//${hostName}:8080`;
            }
            return `${parsed.protocol}//${parsed.host}`;
        } catch (error) {
            return fallback;
        }
    }

    if (typeof window !== 'undefined' && typeof window.APP_API_BASE === 'string' && window.APP_API_BASE.trim()) {
        return normalizeLocalBackendUrl(window.APP_API_BASE);
    }

    const storedBase = localStorage.getItem('apiBaseUrl');
    if (storedBase && String(storedBase).trim()) {
        const normalizedStored = normalizeLocalBackendUrl(storedBase);
        if (normalizedStored !== String(storedBase).trim().replace(/\/$/, '')) {
            localStorage.setItem('apiBaseUrl', normalizedStored);
        }
        return normalizedStored;
    }

    const fallback = 'http://localhost:8080';

    if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
        const hostname = window.location.hostname;
        const port = window.location.port;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
        const isPrivateIpv4 = isPrivateIpv4Host(hostname);

        // If frontend runs on static dev server in local/private network, direct API to backend :8080.
        if ((isLocalhost || isPrivateIpv4) && port && port !== '8080') {
            return `${window.location.protocol}//${hostname}:8080`;
        }

        return `${window.location.protocol}//${window.location.host}`;
    }

    return fallback;
}

async function apiRequest(path, options = {}) {
    const method = options.method || 'GET';
    const headers = { ...(options.headers || {}) };
    const init = {
        method,
        headers,
        credentials: 'include',
        keepalive: Boolean(options.keepalive),
    };

    let localSourceActive = false;
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.sessionSource === 'local') {
        localSourceActive = true;
    } else {
        try {
            const rawUser = localStorage.getItem('currentUser');
            if (rawUser && JSON.parse(rawUser)?.sessionSource === 'local') localSourceActive = true;
        } catch (e) {}
    }

    if (localSourceActive) {
        const requestError = new Error('Lokal fallback aktif.');
        requestError.code = 'API_UNAVAILABLE';
        throw requestError;
    }

    if (options.body !== undefined) {
        init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
        if (!headers['Content-Type']) {
            headers['Content-Type'] = 'application/json';
        }
    }

    const url = `${APP_API_BASE_URL}${path}`;
    let response;

    try {
        response = await fetch(url, init);
    } catch (error) {
        const requestError = new Error('Backend API tidak dapat diakses.');
        requestError.code = 'API_UNAVAILABLE';
        throw requestError;
    }

    let payload = null;
    try {
        payload = await response.json();
    } catch (error) {
        payload = null;
    }

    if (!response.ok || !payload?.success) {
        const message = payload?.message || `Request gagal (${response.status})`;
        const requestError = new Error(message);
        requestError.status = response.status;
        requestError.payload = payload;
        throw requestError;
    }

    return payload;
}

function mapBackendUserToAppUser(user) {
    if (!user) return null;

    return {
        id: Number(user.id),
        username: String(user.username || ''),
        name: String(user.name || user.username || ''),
        email: String(user.email || ''),
        role: String(user.role || 'user'),
        provider: String(user.provider || 'local'),
        isActive: Number(user.is_active ?? 1) === 1,
        sessionSource: 'api',
    };
}

function isLocalFallbackSession(user) {
    return String(user?.sessionSource || '').toLowerCase() === 'local';
}

function persistCurrentUser(user) {
    currentUser = user || null;
    if (user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    } else {
        localStorage.removeItem('currentUser');
    }
}

async function fetchSessionUserFromApi() {
    try {
        const payload = await apiRequest('/api/auth/me');
        const user = mapBackendUserToAppUser(payload?.data?.user);
        return { state: user ? 'authenticated' : 'unauthenticated', user };
    } catch (error) {
        if (error.status === 401) {
            return { state: 'unauthenticated', user: null };
        }

        if (error.code === 'API_UNAVAILABLE') {
            return { state: 'unavailable', user: null };
        }

        return { state: 'error', user: null };
    }
}

function showApiFallbackNotice() {
    if (hasShownApiFallbackNotice) return;
    hasShownApiFallbackNotice = true;
    notify('Backend API belum aktif, aplikasi memakai mode demo lokal.', 'info');
}

function isProtectedAppPage() {
    const currentPath = window.location.pathname;
    return currentPath.includes('dashboard.html') || currentPath.includes('admin/') || currentPath.includes('/user/');
}

function redirectByRole(user) {
    if (!user) return;
    if (['admin', 'hr', 'bod', 'manager', 'finance'].includes(user.role)) {
        window.location.href = 'admin/dashboard.html';
    } else {
        window.location.href = 'user/dashboard.html';
    }
}

function toIsoDate(value) {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) {
        const text = String(value);
        return text.includes('T') ? text.split('T')[0] : text;
    }
    return date.toISOString().split('T')[0];
}

function toTimeHm(value) {
    if (!value) return '';
    const text = String(value).trim();
    const match = text.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
        return `${match[1].padStart(2, '0')}:${match[2]}`;
    }

    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }

    return text;
}

function mapEmployeeFromApi(row) {
    return {
        id: Number(row?.user_id || row?.id || 0),
        employeeRowId: Number(row?.id || 0),
        userId: Number(row?.user_id || 0),
        name: String(row?.name || row?.username || ''),
        username: String(row?.username || ''),
        email: String(row?.email || ''),
        role: String(row?.role || 'karyawan'),
        employeeId: String(row?.employee_code || ''),
        department: String(row?.department || ''),
        position: String(row?.position || ''),
        gender: String(row?.gender || ''),
        phone: String(row?.phone || ''),
        joinDate: String(row?.join_date || ''),
        maternityLeaveDetail: String(row?.maternity_leave_detail || ''),
        status: String(row?.status || 'Active'),
        inactiveReason: String(row?.inactive_reason || ''),
        isActive: Number(row?.is_active ?? 1) === 1,
    };
}

function mapAttendanceFromApi(row, siteMap = new Map()) {
    const siteId = row?.site_id === null || row?.site_id === undefined ? null : Number(row.site_id);
    const timestamp = row?.event_at ? new Date(String(row.event_at).replace(' ', 'T')).toISOString() : '';
    return {
        id: Number(row?.id || 0),
        employeeId: Number(row?.user_id || 0),
        userId: Number(row?.user_id || 0),
        employeeName: String(row?.employee_name || row?.username || ''),
        username: String(row?.username || ''),
        type: String(row?.attendance_type || ''),
        workLocation: String(row?.work_location || ''),
        siteId,
        siteName: siteId !== null && siteMap.has(siteId) ? String(siteMap.get(siteId)) : '-',
        location: {
            latitude: row?.latitude === null || row?.latitude === undefined ? null : Number(row.latitude),
            longitude: row?.longitude === null || row?.longitude === undefined ? null : Number(row.longitude),
            accuracy: row?.accuracy_meters === null || row?.accuracy_meters === undefined ? null : Number(row.accuracy_meters),
        },
        timestamp,
        date: toIsoDate(timestamp || row?.event_at || ''),
        time: toTimeHm(row?.event_at || ''),
        notes: String(row?.notes || ''),
        status: String(row?.status || 'pending'),
        workDescription: String(row?.work_description || ''),
        overtimeHours: row?.overtime_hours === null || row?.overtime_hours === undefined ? '' : String(row.overtime_hours),
        prayerDhuhurStatus: String(row?.prayer_dhuhur_status || ''),
        prayerAsharStatus: String(row?.prayer_ashar_status || ''),
        drivingNotes: String(row?.driving_notes || ''),
        faceCaptured: Boolean(row?.face_image_data),
        faceVerified: Boolean(row?.face_image_data),
        faceImageFormat: String(row?.face_image_format || ''),
        faceImageWebp: String(row?.face_image_data || ''),
        faceImageSizeBytes: row?.face_image_size_bytes ? Number(row.face_image_size_bytes) : 0,
        attachment: row?.attachment_data ? {
            name: String(row?.attachment_name || 'attachment'),
            type: String(row?.attachment_type || 'application/octet-stream'),
            sizeBytes: row?.attachment_size ? Number(row.attachment_size) : 0,
            dataUrl: String(row?.attachment_data || ''),
        } : null,
    };
}

function mapLeaveFromApi(row) {
    return {
        id: Number(row?.id || 0),
        employeeId: Number(row?.user_id || 0),
        userId: Number(row?.user_id || 0),
        employeeName: String(row?.employee_name || row?.username || ''),
        username: String(row?.username || ''),
        type: String(row?.leave_type || 'annual'),
        typeLabel: String(row?.type_label || ''),
        daysRequested: Number(row?.days_requested || 0),
        startDate: String(row?.start_date || ''),
        endDate: String(row?.end_date || ''),
        reason: String(row?.reason || ''),
        contactInfo: String(row?.contact_info || ''),
        leaveAddress: String(row?.leave_address || ''),
        submittedDate: row?.created_at ? new Date(String(row.created_at).replace(' ', 'T')).toISOString() : '',
        status: String(row?.status || 'pending'),
        comments: String(row?.comments || ''),
        rejectionReason: String(row?.rejection_reason || ''),
        approvedBy: row?.approved_by ? String(row.approved_by) : null,
        approvedDate: row?.approved_at ? String(row.approved_at) : null,
        rejectedBy: row?.rejected_by ? String(row.rejected_by) : null,
        rejectedDate: row?.rejected_at ? String(row.rejected_at) : null,
        attachmentName: String(row?.attachment_name || ''),
        attachmentType: String(row?.attachment_type || ''),
        attachmentSize: row?.attachment_size ? Number(row.attachment_size) : 0,
        attachmentDataUrl: String(row?.attachment_data || ''),
    };
}

function mapVisitFromApi(row) {
    const createdAt = row?.created_at ? new Date(String(row.created_at).replace(' ', 'T')).toISOString() : new Date().toISOString();
    const durationMinutes = row?.duration_minutes === null || row?.duration_minutes === undefined
        ? null
        : Number(row.duration_minutes);

    const durationLabel = durationMinutes === null
        ? ''
        : `${Math.floor(durationMinutes / 60)} jam ${durationMinutes % 60} menit`;

    return {
        id: Number(row?.id || 0),
        userId: Number(row?.user_id || 0),
        employeeName: String(row?.employee_name || row?.username || ''),
        username: String(row?.username || ''),
        clientName: String(row?.client_name || ''),
        clientLocation: String(row?.client_location || ''),
        visitDate: String(row?.visit_date || ''),
        checkInTime: toTimeHm(row?.check_in_time || ''),
        checkOutTime: toTimeHm(row?.check_out_time || ''),
        duration: durationLabel,
        durationMinutes,
        visitPurpose: String(row?.visit_purpose || ''),
        visitNotes: String(row?.visit_notes || ''),
        locationType: String(row?.location_type || 'map'),
        coordinates: {
            lat: row?.latitude === null || row?.latitude === undefined ? null : Number(row.latitude),
            lng: row?.longitude === null || row?.longitude === undefined ? null : Number(row.longitude),
        },
        status: String(row?.status || 'Aktif'),
        timestamp: createdAt,
        // Flat coordinates for simpler use
        latitude: row?.latitude || (row?.coordinates?.lat ?? null),
        longitude: row?.longitude || (row?.coordinates?.lng ?? null),
        // Added for face & GPS security
        face_image_data: row?.face_image_data || null,
        accuracy_meters: row?.accuracy_meters || null,
        geo_risk_score: row?.geo_risk_score || 0,
        geo_flags: row?.geo_flags || null,
        position_samples: row?.position_samples || null,
        checkout_latitude: row?.checkout_latitude || null,
        checkout_longitude: row?.checkout_longitude || null,
        checkout_accuracy_meters: row?.checkout_accuracy_meters || null,
        checkout_geo_risk_score: row?.checkout_geo_risk_score || 0,
        checkout_geo_flags: row?.checkout_geo_flags || null,
        checkout_position_samples: row?.checkout_position_samples || null,
        checkout_face_image_data: row?.checkout_face_image_data || null,
    };
}

function mapAnnouncementFromApi(row) {
    const createdAt = row?.created_at ? new Date(String(row.created_at).replace(' ', 'T')).toISOString() : '';
    const attachments = Array.isArray(row?.attachments)
        ? row.attachments.map((att) => ({
            id: Number(att?.id || 0),
            name: String(att?.name || 'attachment'),
            storedName: String(att?.stored_name || att?.name || 'attachment'),
            mimeType: String(att?.mime_type || ''),
            sizeBytes: att?.size_bytes ? Number(att.size_bytes) : 0,
            dataUrl: String(att?.data_url || ''),
            convertedToWebp: Number(att?.converted_to_webp || 0) === 1,
        }))
        : [];

    return {
        id: Number(row?.id || 0),
        title: String(row?.title || ''),
        category: String(row?.category || 'Umum'),
        content: String(row?.content || ''),
        date: String(row?.publish_date || toIsoDate(createdAt)),
        author: String(row?.author_name || row?.author || 'Admin'),
        priority: String(row?.priority || 'Normal'),
        targetDivision: String(row?.target_division || 'Semua Divisi'),
        createdAt,
        attachments,
    };
}

function mapNotificationFromApi(row) {
    return {
        id: Number(row?.id || 0),
        title: String(row?.title || 'Info'),
        message: String(row?.message || ''),
        type: String(row?.notification_type || 'info'),
        read: Number(row?.is_read || 0) === 1,
        time: row?.created_at ? new Date(String(row.created_at).replace(' ', 'T')).toLocaleString() : 'Baru saja',
        createdAt: row?.created_at ? new Date(String(row.created_at).replace(' ', 'T')).toISOString() : '',
    };
}

async function syncSitesFromApi() {
    const payload = await apiRequest('/api/sites');
    const items = Array.isArray(payload?.data?.sites) ? payload.data.sites : [];
    const mapped = items.map((site) => ({
        id: Number(site?.id || 0),
        name: String(site?.name || ''),
    })).filter(site => site.id > 0 && site.name);

    localStorage.setItem('siteNames', JSON.stringify(mapped));
    return mapped;
}

async function syncEmployeesFromApi() {
    const payload = await apiRequest('/api/employees');
    const rows = Array.isArray(payload?.data?.employees) ? payload.data.employees : [];
    employees = rows.map(mapEmployeeFromApi);
    localStorage.setItem('employees', JSON.stringify(employees));
    return employees;
}

async function syncAttendanceFromApi() {
    let sites = [];
    try {
        sites = await syncSitesFromApi();
    } catch (error) {
        sites = JSON.parse(localStorage.getItem('siteNames') || '[]');
    }

    const siteMap = new Map((Array.isArray(sites) ? sites : []).map((site) => [Number(site.id), site.name]));
    const payload = await apiRequest('/api/attendance');
    const rows = Array.isArray(payload?.data?.attendance) ? payload.data.attendance : [];
    presensiData = rows.map((row) => mapAttendanceFromApi(row, siteMap));
    localStorage.setItem('presensiData', JSON.stringify(presensiData));
    return presensiData;
}

async function syncLeavesFromApi() {
    const payload = await apiRequest('/api/leaves');
    const rows = Array.isArray(payload?.data?.leaves) ? payload.data.leaves : [];
    leaves = rows.map(mapLeaveFromApi);
    localStorage.setItem('leaves', JSON.stringify(leaves));
    return leaves;
}

async function syncVisitsFromApi() {
    const payload = await apiRequest('/api/visits');
    const rows = Array.isArray(payload?.data?.visits) ? payload.data.visits : [];
    const mapped = rows.map(mapVisitFromApi);
    localStorage.setItem('userClientVisits', JSON.stringify(mapped));
    return mapped;
}

async function syncAnnouncementsFromApi() {
    const payload = await apiRequest('/api/announcements');
    const rows = Array.isArray(payload?.data?.announcements) ? payload.data.announcements : [];
    const mapped = rows.map(mapAnnouncementFromApi);
    localStorage.setItem('announcements', JSON.stringify(mapped));
    return mapped;
}

async function syncNotificationsFromApi() {
    const payload = await apiRequest('/api/notifications');
    const rows = Array.isArray(payload?.data?.notifications) ? payload.data.notifications : [];
    const mapped = rows.map(mapNotificationFromApi);
    localStorage.setItem(getNotificationStorageKey(), JSON.stringify(mapped));
    return mapped;
}

async function syncCoreDataFromApi() {
    try {
        await Promise.all([
            syncEmployeesFromApi(),
            syncSitesFromApi(),
            syncAttendanceFromApi(),
            syncLeavesFromApi(),
            syncVisitsFromApi(),
            syncAnnouncementsFromApi(),
            syncNotificationsFromApi(),
        ]);
        return true;
    } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
            return false;
        }

        if (error.code === 'API_UNAVAILABLE') {
            showApiFallbackNotice();
            return false;
        }

        console.error('Failed to sync core data from API', error);
        return false;
    }
}

window.syncSitesFromApi = syncSitesFromApi;
window.syncEmployeesFromApi = syncEmployeesFromApi;
window.syncAttendanceFromApi = syncAttendanceFromApi;
window.syncLeavesFromApi = syncLeavesFromApi;
window.syncVisitsFromApi = syncVisitsFromApi;
window.syncAnnouncementsFromApi = syncAnnouncementsFromApi;
window.syncNotificationsFromApi = syncNotificationsFromApi;
window.syncCoreDataFromApi = syncCoreDataFromApi;

// Data storage
let employees = [];
let presensiData = [];
let leaves = [];
let schedules = [];
let announcements = [];
let reports = [];
let permissions = [];

// ==================== GLOBAL POPUP NOTIFICATION ====================
const nativeAlert = window.alert.bind(window);

function ensureToastContainer() {
    let container = document.getElementById('appToastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'appToastContainer';
        container.className = 'app-toast-container';
        document.body.appendChild(container);
    }
    return container;
}

function showAppPopup(message, type = 'info') {
    if (typeof document === 'undefined' || !document.body) {
        nativeAlert(message);
        return;
    }

    const container = ensureToastContainer();
    const toast = document.createElement('div');
    toast.className = `app-toast ${type}`;

    const iconMap = {
        success: 'fa-check',
        warning: 'fa-triangle-exclamation',
        error: 'fa-circle-xmark',
        info: 'fa-bell'
    };
    const iconClass = iconMap[type] || iconMap.info;

    const icon = document.createElement('div');
    icon.className = 'app-toast-icon';
    icon.innerHTML = `<i class="fas ${iconClass}"></i>`;

    const text = document.createElement('div');
    text.className = 'app-toast-text';
    text.textContent = String(message || 'Pemberitahuan');

    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 250);
    }, 4000);
}

function ensureAppConfirmOverlay() {
    let overlay = document.getElementById('appConfirmOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'appConfirmOverlay';
    overlay.className = 'app-confirm-overlay';
    overlay.innerHTML = `
        <div class="app-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="appConfirmTitle">
            <div class="app-confirm-title" id="appConfirmTitle">Konfirmasi</div>
            <div class="app-confirm-message" id="appConfirmMessage">Apakah anda yakin untuk logout</div>
            <div class="app-confirm-input-wrap" id="appConfirmInputWrap" hidden>
                <input type="text" id="appConfirmInput" class="app-confirm-input" autocomplete="off">
            </div>
            <div class="app-confirm-actions">
                <button type="button" class="app-confirm-btn cancel" id="appConfirmCancelBtn">Batal</button>
                <button type="button" class="app-confirm-btn confirm" id="appConfirmConfirmBtn">Oke</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
}

function showAppConfirm(options = {}) {
    if (typeof document === 'undefined' || !document.body) {
        const approved = confirm(options.message || 'Apakah anda yakin untuk logout');
        if (approved) {
            if (typeof options.onConfirm === 'function') options.onConfirm();
        } else if (typeof options.onCancel === 'function') {
            options.onCancel();
        }
        return;
    }

    const overlay = ensureAppConfirmOverlay();
    const titleEl = overlay.querySelector('#appConfirmTitle');
    const messageEl = overlay.querySelector('#appConfirmMessage');
    const inputWrapEl = overlay.querySelector('#appConfirmInputWrap');
    const inputEl = overlay.querySelector('#appConfirmInput');
    const cancelBtn = overlay.querySelector('#appConfirmCancelBtn');
    const confirmBtn = overlay.querySelector('#appConfirmConfirmBtn');

    titleEl.textContent = options.title || 'Konfirmasi Logout';
    messageEl.textContent = options.message || 'Apakah anda yakin untuk logout';
    cancelBtn.textContent = options.cancelText || 'Batal';
    confirmBtn.textContent = options.confirmText || 'Oke';
    inputWrapEl.hidden = true;
    inputEl.value = '';
    inputEl.type = 'text';
    inputEl.placeholder = '';
    confirmBtn.classList.toggle('danger', options.variant === 'danger');

    const finish = () => {
        overlay.classList.remove('open');
        overlay.classList.add('closing');
        confirmBtn.classList.remove('danger');

        window.setTimeout(() => {
            overlay.classList.remove('closing');
        }, 160);
    };

    const cleanup = () => {
        finish();
        cancelBtn.removeEventListener('click', handleCancel);
        confirmBtn.removeEventListener('click', handleConfirm);
        overlay.removeEventListener('click', handleOverlayClick);
        document.removeEventListener('keydown', handleEsc);
    };

    const handleCancel = () => {
        cleanup();
        if (typeof options.onCancel === 'function') options.onCancel();
    };

    const handleConfirm = () => {
        cleanup();
        if (typeof options.onConfirm === 'function') options.onConfirm();
    };

    const handleOverlayClick = (event) => {
        if (event.target === overlay) {
            handleCancel();
        }
    };

    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            handleCancel();
        }
    };

    cancelBtn.addEventListener('click', handleCancel);
    confirmBtn.addEventListener('click', handleConfirm);
    overlay.addEventListener('click', handleOverlayClick);
    document.addEventListener('keydown', handleEsc);

    overlay.classList.add('open');
}

function askAppConfirm(options = {}) {
    return new Promise((resolve) => {
        showAppConfirm({
            ...options,
            onConfirm: () => resolve(true),
            onCancel: () => resolve(false)
        });
    });
}

function showAppPrompt(options = {}) {
    if (typeof document === 'undefined' || !document.body) {
        const answer = prompt(options.message || 'Masukkan nilai:', options.defaultValue || '');
        if (answer === null) {
            if (typeof options.onCancel === 'function') options.onCancel();
            return;
        }
        if (typeof options.onConfirm === 'function') options.onConfirm(answer);
        return;
    }

    const overlay = ensureAppConfirmOverlay();
    const titleEl = overlay.querySelector('#appConfirmTitle');
    const messageEl = overlay.querySelector('#appConfirmMessage');
    const inputWrapEl = overlay.querySelector('#appConfirmInputWrap');
    const inputEl = overlay.querySelector('#appConfirmInput');
    const cancelBtn = overlay.querySelector('#appConfirmCancelBtn');
    const confirmBtn = overlay.querySelector('#appConfirmConfirmBtn');

    titleEl.textContent = options.title || 'Input';
    messageEl.textContent = options.message || 'Masukkan nilai:';
    cancelBtn.textContent = options.cancelText || 'Batal';
    confirmBtn.textContent = options.confirmText || 'Simpan';
    confirmBtn.classList.toggle('danger', options.variant === 'danger');

    inputWrapEl.hidden = false;
    inputEl.type = options.inputType || 'text';
    inputEl.placeholder = options.placeholder || '';
    inputEl.value = options.defaultValue ?? '';

    const finish = () => {
        overlay.classList.remove('open');
        overlay.classList.add('closing');
        confirmBtn.classList.remove('danger');
        inputWrapEl.hidden = true;
        inputEl.value = '';

        window.setTimeout(() => {
            overlay.classList.remove('closing');
        }, 160);
    };

    const cleanup = () => {
        finish();
        cancelBtn.removeEventListener('click', handleCancel);
        confirmBtn.removeEventListener('click', handleConfirm);
        overlay.removeEventListener('click', handleOverlayClick);
        inputEl.removeEventListener('keydown', handleInputEnter);
        document.removeEventListener('keydown', handleEsc);
    };

    const handleCancel = () => {
        cleanup();
        if (typeof options.onCancel === 'function') options.onCancel();
    };

    const handleConfirm = () => {
        const value = inputEl.value;
        cleanup();
        if (typeof options.onConfirm === 'function') options.onConfirm(value);
    };

    const handleOverlayClick = (event) => {
        if (event.target === overlay) handleCancel();
    };

    const handleInputEnter = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleConfirm();
        }
    };

    const handleEsc = (event) => {
        if (event.key === 'Escape') {
            handleCancel();
        }
    };

    cancelBtn.addEventListener('click', handleCancel);
    confirmBtn.addEventListener('click', handleConfirm);
    overlay.addEventListener('click', handleOverlayClick);
    inputEl.addEventListener('keydown', handleInputEnter);
    document.addEventListener('keydown', handleEsc);

    overlay.classList.add('open');
    window.setTimeout(() => {
        inputEl.focus();
        inputEl.select();
    }, 30);
}

function askAppPrompt(options = {}) {
    return new Promise((resolve) => {
        showAppPrompt({
            ...options,
            onConfirm: (value) => resolve(value),
            onCancel: () => resolve(null)
        });
    });
}

function getPagedSliderMeta(totalItems, viewSize, startIndex = 0) {
    const safeTotal = Math.max(0, Number(totalItems) || 0);
    const safeViewSize = Math.max(1, Number(viewSize) || 1);
    const totalPages = Math.max(1, Math.ceil(safeTotal / safeViewSize));
    const maxStartIndex = Math.max(0, (totalPages - 1) * safeViewSize);
    const boundedStart = Math.min(Math.max(0, Number(startIndex) || 0), maxStartIndex);
    const currentPage = Math.min(totalPages - 1, Math.floor(boundedStart / safeViewSize));

    return {
        totalItems: safeTotal,
        viewSize: safeViewSize,
        totalPages,
        currentPage,
        startIndex: currentPage * safeViewSize,
        maxStartIndex,
        hasPrev: currentPage > 0,
        hasNext: currentPage < totalPages - 1
    };
}

function shiftPagedSliderStart(totalItems, viewSize, startIndex, direction) {
    const meta = getPagedSliderMeta(totalItems, viewSize, startIndex);
    const stepDirection = direction < 0 ? -1 : direction > 0 ? 1 : 0;
    if (stepDirection === 0) return meta.startIndex;

    const nextPage = Math.min(meta.totalPages - 1, Math.max(0, meta.currentPage + stepDirection));
    return nextPage * meta.viewSize;
}

function openOverlayModal(modalEl) {
    if (!modalEl || !modalEl.classList || !modalEl.classList.contains('modal-overlay')) return;

    modalEl.classList.remove('closing');
    window.requestAnimationFrame(() => {
        modalEl.classList.add('open');
    });
}

function closeOverlayModal(modalEl) {
    if (!modalEl || !modalEl.classList || !modalEl.classList.contains('modal-overlay')) {
        return;
    }

    modalEl.classList.remove('open');
    modalEl.classList.add('closing');

    window.setTimeout(() => {
        if (modalEl.parentNode) {
            modalEl.parentNode.removeChild(modalEl);
        }
    }, 190);
}

function initializeOverlayModalAnimationObserver() {
    if (window.__overlayModalObserverReady) return;
    if (typeof document === 'undefined' || !document.body || typeof MutationObserver === 'undefined') return;

    window.__overlayModalObserverReady = true;

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (!(node instanceof Element)) return;

                if (node.classList?.contains('modal-overlay')) {
                    openOverlayModal(node);
                }

                node.querySelectorAll?.('.modal-overlay').forEach((overlay) => openOverlayModal(overlay));
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function setupGlobalPopupOverride() {
    if (window.__popupAlertInstalled) return;
    window.__popupAlertInstalled = true;

    // Keep default confirm() behavior, replace only alert() with elegant popup.
    window.alert = function(message) {
        showAppPopup(message, 'info');
    };

    window.notify = function(message, type = 'info') {
        showAppPopup(message, type);
    };
}

setupGlobalPopupOverride();

// Load data from localStorage on boot
function initializeData() {
    const stored = {
        employees: localStorage.getItem('employees'),
        presensi: localStorage.getItem('presensiData'),
        leaves: localStorage.getItem('leaves'),
        schedules: localStorage.getItem('schedules'),
        announcements: localStorage.getItem('announcements'),
        reports: localStorage.getItem('reports'),
        permissions: localStorage.getItem('permissions')
    };
    
    if (stored.employees) employees = JSON.parse(stored.employees);
    if (stored.presensi) presensiData = JSON.parse(stored.presensi);
    if (stored.leaves) leaves = JSON.parse(stored.leaves);
    if (stored.schedules) schedules = JSON.parse(stored.schedules);
    if (stored.announcements) announcements = JSON.parse(stored.announcements);
    if (stored.reports) reports = JSON.parse(stored.reports);
    if (stored.permissions) permissions = JSON.parse(stored.permissions);

    initializeUserAccounts();
}

function initializeUserAccounts() {
    const storedUsersRaw = localStorage.getItem('registeredUsers');
    let storedUsers = [];

    if (storedUsersRaw) {
        try {
            const parsed = JSON.parse(storedUsersRaw);
            if (Array.isArray(parsed)) {
                storedUsers = parsed
                    .filter(user => user && user.username && user.password && user.name)
                    .map(user => ({ ...user, sessionSource: 'local' }));
            }
        } catch (error) {
            storedUsers = [];
        }
    }

    const mergedByUsername = new Map();
    demoUsers.forEach(user => mergedByUsername.set(String(user.username).toLowerCase(), user));
    storedUsers.forEach(user => mergedByUsername.set(String(user.username).toLowerCase(), user));

    users = Array.from(mergedByUsername.values());
}

function persistRegisteredUsers() {
    const customUsers = users.filter(user => !demoUsers.some(demo => String(demo.username).toLowerCase() === String(user.username).toLowerCase()));
    localStorage.setItem('registeredUsers', JSON.stringify(customUsers));
}

// ==================== LOGIN & AUTHENTICATION ====================
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberLogin = document.getElementById('rememberLogin');

    if (!username || !password) {
        alert('Username dan password wajib diisi.');
        return;
    }

    let backendErrorMessage = '';
    let shouldTryLocalFallback = false;

    try {
        const payload = await apiRequest('/api/auth/login', {
            method: 'POST',
            body: { username, password },
        });

        const user = mapBackendUserToAppUser(payload?.data?.user);
        if (!user) {
            alert('Data user dari server tidak valid.');
            return;
        }

        if (rememberLogin?.checked) {
            localStorage.setItem('lastLoginUsername', username);
        } else {
            localStorage.removeItem('lastLoginUsername');
        }

        persistCurrentUser(user);
        redirectByRole(user);
        return;
    } catch (error) {
        backendErrorMessage = String(error.message || 'Login gagal.');
        const status = Number(error.status || 0);
        const backendUnavailable = error.code === 'API_UNAVAILABLE';
        const backendAuthRejected = status === 401;
        const backendServerIssue = status >= 500;

        shouldTryLocalFallback = backendUnavailable || backendAuthRejected || backendServerIssue;

        if (!shouldTryLocalFallback) {
            alert(backendErrorMessage);
            document.getElementById('loginForm').reset();
            return;
        }

        if (backendUnavailable) {
            showApiFallbackNotice();
        } else if (backendAuthRejected) {
            notify('Akun backend tidak cocok, mencoba akun lokal/demo.', 'info');
        } else {
            notify('Login backend gagal, mencoba akun lokal/demo.', 'info');
        }
    }

    const user = users.find(u => String(u.username).toLowerCase() === String(username).toLowerCase() && u.password === password);

    if (user) {
        if (rememberLogin?.checked) {
            localStorage.setItem('lastLoginUsername', username);
        } else {
            localStorage.removeItem('lastLoginUsername');
        }

        persistCurrentUser({ ...user, sessionSource: 'local' });
        
        // Route based on role
        redirectByRole(user);
    } else {
        if (backendErrorMessage) {
            alert(`${backendErrorMessage}\nAkun lokal/demo juga tidak cocok.`);
        } else {
            alert('Username atau password salah!');
        }
        document.getElementById('loginForm').reset();
    }
}

async function handleSignUp(e) {
    e.preventDefault();

    const name = document.getElementById('signupName')?.value.trim();
    const username = document.getElementById('signupUsername')?.value.trim();
    const email = document.getElementById('signupEmail')?.value.trim().toLowerCase();
    const password = document.getElementById('signupPassword')?.value;
    const confirmPassword = document.getElementById('signupConfirmPassword')?.value;

    if (!name || !username || !email || !password || !confirmPassword) {
        alert('Semua field wajib diisi.');
        return;
    }

    if (password.length < 6) {
        alert('Password minimal 6 karakter.');
        return;
    }

    if (password !== confirmPassword) {
        alert('Konfirmasi password tidak sama.');
        return;
    }

    try {
        await apiRequest('/api/auth/register', {
            method: 'POST',
            body: { name, username, email, password },
        });

        const sessionResult = await fetchSessionUserFromApi();
        if (sessionResult.state === 'authenticated' && sessionResult.user) {
            persistCurrentUser(sessionResult.user);
            alert('Akun berhasil dibuat. Anda otomatis login.');
            redirectByRole(sessionResult.user);
            return;
        }

        alert('Akun berhasil dibuat. Silakan login.');
        window.location.href = 'index.html';
        return;
    } catch (error) {
        if (error.code !== 'API_UNAVAILABLE') {
            alert(error.message || 'Registrasi gagal.');
            return;
        }

        showApiFallbackNotice();
    }

    const usernameUsed = users.some(user => String(user.username).toLowerCase() === username.toLowerCase());
    if (usernameUsed) {
        alert('Username sudah digunakan, silakan pilih username lain.');
        return;
    }

    const emailUsed = users.some(user => String(user.email || '').toLowerCase() === email);
    if (emailUsed) {
        alert('Email sudah terdaftar, silakan gunakan email lain.');
        return;
    }

    const newUser = {
        id: getNextUserId(),
        username,
        password,
        name,
        email,
        role: 'karyawan',
        provider: 'local'
    };

    users.push(newUser);
    persistRegisteredUsers();
    upsertEmployeeRecordForUser(newUser);

    alert('Akun berhasil dibuat. Silakan login.');
    window.location.href = 'index.html';
}

const GOOGLE_GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
let googleGsiScriptPromise = null;
let googleIdentityInitializedClientId = '';
let activeGoogleCredentialRequest = null;
let googleAuthInProgress = false;

function getGoogleClientId() {
    const configured = typeof window.APP_GOOGLE_CLIENT_ID === 'string'
        ? window.APP_GOOGLE_CLIENT_ID.trim()
        : '';
    if (configured) return configured;

    const stored = String(localStorage.getItem('googleClientId') || '').trim();
    return stored;
}

async function ensureGoogleClientId() {
    const existing = getGoogleClientId();
    if (existing) return existing;

    throw new Error('Google belum dikonfigurasi. Isi window.APP_GOOGLE_CLIENT_ID di js/app-config.js terlebih dulu.');
}

function ensureGoogleGsiScript() {
    if (window.google?.accounts?.id) {
        return Promise.resolve();
    }

    if (googleGsiScriptPromise) {
        return googleGsiScriptPromise;
    }

    googleGsiScriptPromise = new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${GOOGLE_GSI_SCRIPT_URL}"]`);
        if (existing) {
            existing.addEventListener('load', () => resolve(), { once: true });
            existing.addEventListener('error', () => reject(new Error('Gagal memuat Google Identity script.')), { once: true });
            return;
        }

        const script = document.createElement('script');
        script.src = GOOGLE_GSI_SCRIPT_URL;
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Gagal memuat Google Identity script.'));
        document.head.appendChild(script);
    });

    return googleGsiScriptPromise;
}

function supportsFedCm() {
    return window.isSecureContext && typeof window.IdentityCredential !== 'undefined';
}

async function handleGoogleCallback(response, mode) {
    if (googleAuthInProgress) return;
    googleAuthInProgress = true;

    try {
        const idToken = String(response?.credential || '');
        if (!idToken) throw new Error('Google tidak mengembalikan credential.');

        let user;
        let isLocalFallback = false;

        try {
            const payload = await apiRequest('/api/auth/google', {
                method: 'POST',
                body: { id_token: idToken, mode }
            });
            user = mapBackendUserToAppUser(payload?.data?.user);
        } catch (apiError) {
            if (apiError.code === 'API_UNAVAILABLE') {
                isLocalFallback = true;
                const decodedToken = decodeJwt(idToken);
                if (!decodedToken || !decodedToken.email) {
                    throw new Error('Token Google tidak valid untuk mode lokal.');
                }
                const email = String(decodedToken.email).toLowerCase();
                const defaultName = decodedToken.name || email.split('@')[0] || 'Google User';

                user = users.find(u => String(u.email || '').toLowerCase() === email);

                if (!user) {
                    const nextId = getNextUserId();
                    user = {
                        id: nextId,
                        username: makeUniqueUsername(defaultName.split(' ')[0].toLowerCase() + Math.floor(Math.random() * 1000)),
                        name: defaultName,
                        email: email,
                        role: 'karyawan',
                        provider: 'google',
                        sessionSource: 'local'
                    };
                    users.push(user);
                    persistRegisteredUsers();
                    upsertEmployeeRecordForUser(user);
                } else {
                    user = { ...user, sessionSource: 'local' };
                }
            } else {
                throw apiError;
            }
        }

        if (!user) {
            alert('Data user Google dari server tidak valid.');
            return;
        }

        persistCurrentUser(user);
        const suffix = isLocalFallback ? ' (Mode Demo)' : '';
        notify(mode === 'signup' ? 'Akun Google berhasil dibuat' + suffix : 'Login Google berhasil' + suffix, 'success');
        redirectByRole(user);
    } catch (error) {
        alert(error?.message || 'Login Google gagal. Coba memuat ulang halaman.');
    } finally {
        googleAuthInProgress = false;
    }
}

async function renderGoogleAuthButtons() {
    const buttons = document.querySelectorAll('.google-auth-btn');
    if (buttons.length === 0) return;

    if (!isTrustworthyBrowserContext()) {
        console.warn('Google Sign-In membutuhkan HTTPS atau localhost.');
        return;
    }

    try {
        const clientId = await ensureGoogleClientId();
        await ensureGoogleGsiScript();
        
        const mode = window.location.pathname.includes('signup') ? 'signup' : 'signin';

        window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => handleGoogleCallback(response, mode),
            auto_select: false,
            cancel_on_tap_outside: true
        });

        googleIdentityInitializedClientId = clientId;

        buttons.forEach((wrapper) => {
            wrapper.innerHTML = '';
            wrapper.style.padding = '0';
            wrapper.style.border = 'none';
            wrapper.style.background = 'transparent';
            wrapper.style.boxShadow = 'none';
            wrapper.style.display = 'flex';
            wrapper.style.justifyContent = 'center';

            window.google.accounts.id.renderButton(wrapper, {
                theme: 'outline',
                size: 'large',
                text: mode === 'signup' ? 'signup_with' : 'signin_with',
                logo_alignment: 'left',
            });
        });
    } catch (error) {
        console.error('Gagal memuat Google Sign-in API:', error);
    }
}

function isTrustworthyBrowserContext() {
    const protocol = window.location.protocol;
    const host = window.location.hostname;
    const localhostHosts = ['localhost', '127.0.0.1', '::1'];
    return protocol === 'https:' || localhostHosts.includes(host);
}

function decodeJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}



function upsertEmployeeRecordForUser(user) {
    if (!user) return;
    if (!Array.isArray(employees)) employees = [];

    const existingIndex = employees.findIndex(emp => String(emp.id) === String(user.id));
    const payload = {
        id: user.id,
        name: user.name,
        username: user.username,
        email: user.email || '',
        department: '-',
        employeeId: `EMP-${String(user.id).padStart(4, '0')}`
    };

    if (existingIndex >= 0) {
        employees[existingIndex] = { ...employees[existingIndex], ...payload };
    } else {
        employees.push(payload);
    }

    localStorage.setItem('employees', JSON.stringify(employees));
}

function getNextUserId() {
    const ids = users.map(user => Number(user.id) || 0);
    return Math.max(0, ...ids) + 1;
}

function makeUniqueUsername(base) {
    let counter = 1;
    let candidate = base || 'user';

    while (users.some(user => String(user.username).toLowerCase() === candidate.toLowerCase())) {
        candidate = `${base}${counter}`;
        counter += 1;
    }

    return candidate;
}

function slugifyUsername(raw) {
    const clean = String(raw || '')
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 18);
    return clean || 'user';
}

function toTitleCase(text) {
    return String(text || '')
        .split(' ')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').toLowerCase());
}

function initializeAuthExperience() {
    setupPasswordToggles();
    setupSignupPasswordMeter();
    setupForgotPasswordHint();
    setupRememberedUsername();
}

function setupPasswordToggles() {
    document.querySelectorAll('[data-toggle-password]').forEach((button) => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;

            const icon = this.querySelector('i');
            const currentlyHidden = input.type === 'password';
            input.type = currentlyHidden ? 'text' : 'password';
            this.setAttribute('aria-label', currentlyHidden ? 'Sembunyikan password' : 'Tampilkan password');

            if (icon) {
                icon.classList.toggle('fa-eye', !currentlyHidden);
                icon.classList.toggle('fa-eye-slash', currentlyHidden);
            }
        });
    });
}

function setupSignupPasswordMeter() {
    const passwordInput = document.getElementById('signupPassword');
    const confirmInput = document.getElementById('signupConfirmPassword');
    const strengthBar = document.getElementById('signupPasswordStrengthBar');
    const strengthText = document.getElementById('signupPasswordStrengthText');

    if (!passwordInput || !confirmInput || !strengthBar || !strengthText) return;

    const updateStrength = () => {
        const value = passwordInput.value || '';
        const score = getPasswordStrengthScore(value);
        const labels = ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'];
        const colors = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#059669'];
        const width = Math.max(8, ((score + 1) / 5) * 100);

        strengthBar.style.width = `${width}%`;
        strengthBar.style.backgroundColor = colors[score];
        strengthText.textContent = `Kekuatan password: ${labels[score]}`;

        if (confirmInput.value && confirmInput.value !== value) {
            confirmInput.setCustomValidity('Konfirmasi password harus sama.');
        } else {
            confirmInput.setCustomValidity('');
        }
    };

    passwordInput.addEventListener('input', updateStrength);
    confirmInput.addEventListener('input', updateStrength);
    updateStrength();
}

function getPasswordStrengthScore(password) {
    const value = String(password || '');
    let score = 0;

    if (value.length >= 6) score += 1;
    if (value.length >= 10) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    return Math.max(0, Math.min(score - 1, 4));
}

function ensureResetPasswordOverlay() {
    let overlay = document.getElementById('resetPasswordOverlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'resetPasswordOverlay';
    overlay.className = 'app-confirm-overlay';
    overlay.innerHTML = buildResetPasswordHtml();
    document.body.appendChild(overlay);
    return overlay;
}

function buildResetPasswordHtml() {
    return '<div class="app-confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="resetPwdTitle" style="max-width:420px;width:92%;padding:0;overflow:hidden;border-radius:16px;">' +
        '<div style="background:linear-gradient(135deg,#1e3a5f,#2563eb);padding:24px 24px 20px;">' +
            '<div style="display:flex;align-items:center;gap:12px;">' +
                '<div style="width:40px;height:40px;background:rgba(255,255,255,.15);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px;">\uD83D\uDD11</div>' +
                '<div>' +
                    '<div id="resetPwdTitle" style="font-size:16px;font-weight:700;color:#fff;margin:0;">Reset Password</div>' +
                    '<div id="resetPwdSubtitle" style="font-size:12px;color:rgba(255,255,255,.7);margin-top:2px;">Langkah 1 dari 3</div>' +
                '</div>' +
            '</div>' +
            '<div style="background:rgba(255,255,255,.2);border-radius:99px;height:4px;margin-top:16px;">' +
                '<div id="resetPwdProgress" style="background:#fff;border-radius:99px;height:4px;width:33%;transition:width .35s ease;"></div>' +
            '</div>' +
        '</div>' +
        '<div style="padding:24px;">' +
            '<div id="resetStep1">' +
                '<p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">Masukkan email yang terdaftar. Kode OTP 6 digit akan dikirim ke email Anda.</p>' +
                '<div style="display:flex;flex-direction:column;gap:.25rem;margin-bottom:16px;">' +
                    '<label style="font-size:.85rem;font-weight:600;color:#374151;">Alamat Email</label>' +
                    '<input type="email" id="resetEmail" class="app-confirm-input" placeholder="nama@email.com" required autocomplete="email" style="width:100%;box-sizing:border-box;">' +
                '</div>' +
                '<div style="display:flex;gap:8px;margin-top:8px;">' +
                    '<button type="button" id="resetCancelBtn1" class="app-confirm-btn cancel" style="flex:1;">Batal</button>' +
                    '<button type="button" id="resetSendOtpBtn" class="app-confirm-btn confirm" style="flex:2;"><span id="resetSendOtpLabel">Kirim Kode OTP</span><span id="resetSendOtpSpinner" style="display:none;">Mengirim...</span></button>' +
                '</div>' +
            '</div>' +
            '<div id="resetStep2" style="display:none;">' +
                '<div id="resetUsernameHint" style="background:#f0f9ff;border-radius:8px;padding:10px 14px;font-size:13px;color:#1e3a5f;margin-bottom:16px;display:none;">Username Anda: <strong id="resetUsernameValue"></strong></div>' +
                '<p style="margin:0 0 16px;color:#6b7280;font-size:14px;line-height:1.6;">Masukkan kode 6 digit yang dikirim ke email Anda.<br>Berlaku: <strong id="resetOtpTimer" style="color:#2563eb;">10:00</strong></p>' +
                '<div style="display:flex;flex-direction:column;gap:.25rem;margin-bottom:16px;">' +
                    '<label style="font-size:.85rem;font-weight:600;color:#374151;">Kode OTP</label>' +
                    '<input type="text" id="resetOtp" class="app-confirm-input" placeholder="123456" maxlength="6" inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required style="width:100%;box-sizing:border-box;letter-spacing:6px;font-size:22px;text-align:center;font-weight:700;">' +
                '</div>' +
                '<div style="text-align:center;margin-bottom:16px;"><button type="button" id="resetResendBtn" style="background:none;border:none;cursor:pointer;font-size:13px;color:#6b7280;" disabled>Kirim ulang kode (<span id="resetResendCountdown">60</span>s)</button></div>' +
                '<div style="display:flex;gap:8px;">' +
                    '<button type="button" id="resetBackBtn2" class="app-confirm-btn cancel" style="flex:1;">&larr; Kembali</button>' +
                    '<button type="button" id="resetVerifyOtpBtn" class="app-confirm-btn confirm" style="flex:2;"><span id="resetVerifyLabel">Verifikasi Kode</span><span id="resetVerifySpinner" style="display:none;">Memeriksa...</span></button>' +
                '</div>' +
            '</div>' +
            '<div id="resetStep3" style="display:none;">' +
                '<div style="background:#f0fdf4;border-radius:8px;padding:10px 14px;font-size:13px;color:#15803d;margin-bottom:16px;">&#10003; Identitas terverifikasi. Buat password baru Anda.</div>' +
                '<div style="display:flex;flex-direction:column;gap:12px;margin-bottom:16px;">' +
                    '<div style="display:flex;flex-direction:column;gap:.25rem;"><label style="font-size:.85rem;font-weight:600;color:#374151;">Password Baru</label><input type="password" id="resetNewPassword" class="app-confirm-input" placeholder="Minimal 6 karakter" required minlength="6" autocomplete="new-password" style="width:100%;box-sizing:border-box;"></div>' +
                    '<div style="display:flex;flex-direction:column;gap:.25rem;"><label style="font-size:.85rem;font-weight:600;color:#374151;">Konfirmasi Password Baru</label><input type="password" id="resetConfirmPassword" class="app-confirm-input" placeholder="Ulangi password baru" required minlength="6" autocomplete="new-password" style="width:100%;box-sizing:border-box;"></div>' +
                '</div>' +
                '<div style="display:flex;gap:8px;">' +
                    '<button type="button" id="resetBackBtn3" class="app-confirm-btn cancel" style="flex:1;">&larr; Kembali</button>' +
                    '<button type="button" id="resetSaveBtn" class="app-confirm-btn confirm" style="flex:2;"><span id="resetSaveLabel">Simpan Password</span><span id="resetSaveSpinner" style="display:none;">Menyimpan...</span></button>' +
                '</div>' +
            '</div>' +
        '</div>' +
    '</div>';
}

function resetPasswordInLocalFallback(payload) {
    const email = String(payload?.email || '').toLowerCase();
    const newPassword = String(payload?.newPassword || '');
    if (!email || !newPassword) {
        throw new Error('Data reset password tidak lengkap.');
    }
    const userIndex = users.findIndex((u) => String(u?.email || '').toLowerCase() === email);
    if (userIndex < 0) {
        throw new Error('Akun tidak ditemukan untuk mode lokal/demo.');
    }
    users[userIndex] = { ...users[userIndex], password: newPassword };
    persistRegisteredUsers();
}

// OTP 3-step forgot password wizard
async function handleForgotPassword() {
    const overlay = ensureResetPasswordOverlay();
    // Destroy old overlay if re-opening to reset state
    overlay.remove();
    const fresh = ensureResetPasswordOverlay();
    fresh.classList.add('open');

    let verifiedEmail = '';
    let verifiedOtp   = '';
    let timerInterval  = null;
    let resendInterval = null;

    function setProgress(step) {
        const pct  = { 1: '33%', 2: '66%', 3: '100%' }[step] || '33%';
        const subs = {
            1: 'Langkah 1 dari 3 \u2013 Masukkan Email',
            2: 'Langkah 2 dari 3 \u2013 Verifikasi OTP',
            3: 'Langkah 3 dari 3 \u2013 Password Baru'
        };
        const prog = fresh.querySelector('#resetPwdProgress');
        const subt = fresh.querySelector('#resetPwdSubtitle');
        if (prog) prog.style.width = pct;
        if (subt) subt.textContent = subs[step];
        ['resetStep1','resetStep2','resetStep3'].forEach((id, i) => {
            const el = fresh.querySelector('#' + id);
            if (el) el.style.display = (i + 1 === step) ? '' : 'none';
        });
    }

    function closeOverlay() {
        clearInterval(timerInterval);
        clearInterval(resendInterval);
        fresh.classList.remove('open');
        fresh.classList.add('closing');
        window.setTimeout(() => fresh.classList.remove('closing'), 160);
    }

    function setBusy(btnId, lblId, spnId, busy) {
        const btn = fresh.querySelector('#' + btnId);
        const lbl = fresh.querySelector('#' + lblId);
        const spn = fresh.querySelector('#' + spnId);
        if (btn) btn.disabled = busy;
        if (lbl) lbl.style.display = busy ? 'none' : '';
        if (spn) spn.style.display = busy ? '' : 'none';
    }

    function startOtpTimer() {
        clearInterval(timerInterval);
        let sec = 600;
        const el = fresh.querySelector('#resetOtpTimer');
        timerInterval = setInterval(() => {
            sec--;
            if (el) {
                el.textContent = String(Math.floor(sec / 60)).padStart(2,'0') + ':' + String(sec % 60).padStart(2,'0');
            }
            if (sec <= 0) clearInterval(timerInterval);
        }, 1000);
    }

    function startResendCountdown() {
        clearInterval(resendInterval);
        let sec = 60;
        const btn = fresh.querySelector('#resetResendBtn');
        const cnt = fresh.querySelector('#resetResendCountdown');
        if (btn) btn.disabled = true;
        resendInterval = setInterval(() => {
            sec--;
            if (cnt) cnt.textContent = sec;
            if (sec <= 0) {
                clearInterval(resendInterval);
                if (btn) { btn.disabled = false; btn.textContent = 'Kirim ulang kode OTP'; }
            }
        }, 1000);
    }

    // Close on overlay click / ESC
    fresh.addEventListener('click', (e) => { if (e.target === fresh) closeOverlay(); });
    fresh.querySelector('#resetCancelBtn1')?.addEventListener('click', closeOverlay);
    document.addEventListener('keydown', function escH(e) {
        if (e.key === 'Escape') { closeOverlay(); document.removeEventListener('keydown', escH); }
    });

    // Step 1: send OTP
    fresh.querySelector('#resetSendOtpBtn')?.addEventListener('click', async function() {
        const email = (fresh.querySelector('#resetEmail')?.value || '').trim().toLowerCase();
        if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) { alert('Masukkan alamat email yang valid.'); return; }
        setBusy('resetSendOtpBtn','resetSendOtpLabel','resetSendOtpSpinner', true);
        try {
            const result = await apiRequest('/api/auth/forgot-password', {
                method: 'POST',
                body: { action: 'forgot-password', email },
            });
            verifiedEmail = email;
            const hint = result?.data?.username_hint || '';
            const hintBox = fresh.querySelector('#resetUsernameHint');
            const hintVal = fresh.querySelector('#resetUsernameValue');
            if (hint && hintBox && hintVal) { hintVal.textContent = hint; hintBox.style.display = ''; }
            setProgress(2);
            startOtpTimer();
            startResendCountdown();
            fresh.querySelector('#resetOtp')?.focus();
        } catch (err) {
            alert(err?.message || 'Gagal mengirim OTP. Coba lagi.');
        } finally {
            setBusy('resetSendOtpBtn','resetSendOtpLabel','resetSendOtpSpinner', false);
        }
    });

    // Step 2: verify OTP
    fresh.querySelector('#resetBackBtn2')?.addEventListener('click', () => setProgress(1));
    fresh.querySelector('#resetResendBtn')?.addEventListener('click', async function() {
        if (!verifiedEmail) return;
        this.disabled = true;
        try {
            await apiRequest('/api/auth/forgot-password', { method: 'POST', body: { action: 'forgot-password', email: verifiedEmail } });
            notify('Kode OTP baru telah dikirim.', 'success');
            startOtpTimer(); startResendCountdown();
            fresh.querySelector('#resetOtp').value = '';
        } catch (err) { alert(err?.message || 'Gagal kirim ulang OTP.'); this.disabled = false; }
    });
    fresh.querySelector('#resetVerifyOtpBtn')?.addEventListener('click', async function() {
        const otp = (fresh.querySelector('#resetOtp')?.value || '').trim();
        if (!/^[0-9]{6}$/.test(otp)) { alert('Kode OTP harus 6 angka.'); return; }
        setBusy('resetVerifyOtpBtn','resetVerifyLabel','resetVerifySpinner', true);
        try {
            await apiRequest('/api/auth/verify-otp', { method: 'POST', body: { action: 'verify-otp', email: verifiedEmail, otp } });
            verifiedOtp = otp;
            setProgress(3);
            fresh.querySelector('#resetNewPassword')?.focus();
        } catch (err) {
            alert(err?.message || 'Kode OTP tidak valid. Periksa kembali.');
        } finally {
            setBusy('resetVerifyOtpBtn','resetVerifyLabel','resetVerifySpinner', false);
        }
    });

    // Step 3: save new password
    fresh.querySelector('#resetBackBtn3')?.addEventListener('click', () => setProgress(2));
    fresh.querySelector('#resetSaveBtn')?.addEventListener('click', async function() {
        const newPwd = fresh.querySelector('#resetNewPassword')?.value || '';
        const conf   = fresh.querySelector('#resetConfirmPassword')?.value || '';
        if (newPwd.length < 6) { alert('Password minimal 6 karakter.'); return; }
        if (newPwd !== conf) { alert('Konfirmasi password tidak sama.'); return; }
        setBusy('resetSaveBtn','resetSaveLabel','resetSaveSpinner', true);
        try {
            await apiRequest('/api/auth/reset-with-otp', {
                method: 'POST',
                body: { action: 'reset-with-otp', email: verifiedEmail, otp: verifiedOtp, new_password: newPwd },
            });
            closeOverlay();
            notify('Password berhasil diubah. Silakan login dengan password baru.', 'success');
        } catch (err) {
            if (err?.code === 'API_UNAVAILABLE') {
                try { resetPasswordInLocalFallback({ email: verifiedEmail, newPassword: newPwd }); closeOverlay(); notify('Password akun lokal/demo berhasil diubah.', 'info'); } catch (fb) { alert(fb.message); }
                return;
            }
            alert(err?.message || 'Gagal menyimpan password baru.');
        } finally {
            setBusy('resetSaveBtn','resetSaveLabel','resetSaveSpinner', false);
        }
    });

    setProgress(1);
    window.setTimeout(() => fresh.querySelector('#resetEmail')?.focus(), 30);
}

function setupForgotPasswordHint() {
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    if (!forgotBtn) return;

    forgotBtn.addEventListener('click', async function() {
        try {
            await handleForgotPassword();
        } catch (error) {
            alert(error?.message || 'Reset password gagal.');
        }
    });
}

function setupRememberedUsername() {
    const usernameInput = document.getElementById('username');
    const rememberCheckbox = document.getElementById('rememberLogin');
    if (!usernameInput || !rememberCheckbox) return;

    const lastUsername = localStorage.getItem('lastLoginUsername');
    if (lastUsername) {
        usernameInput.value = lastUsername;
        rememberCheckbox.checked = true;
    }
}

function logout(eventOrForce = null) {
    if (eventOrForce && typeof eventOrForce.preventDefault === 'function') {
        eventOrForce.preventDefault();
    }

    const skipConfirm = eventOrForce === false || (typeof eventOrForce === 'object' && eventOrForce !== null && eventOrForce.skipConfirm === true);
    if (!skipConfirm) {
        const isEnglish = document.documentElement.getAttribute('lang') === 'en';
        showAppConfirm({
            title: isEnglish ? 'Logout Confirmation' : 'Konfirmasi Logout',
            message: isEnglish ? 'Are you sure you want to log out?' : 'Apakah anda yakin untuk logout',
            confirmText: isEnglish ? 'OK' : 'Oke',
            cancelText: isEnglish ? 'Cancel' : 'Batal',
            onConfirm: () => logout({ skipConfirm: true }),
            onCancel: () => {}
        });
        return false;
    }

    apiRequest('/api/auth/logout', {
        method: 'POST',
        keepalive: true,
    }).catch(() => {
        // Keep local logout working even if API is unavailable.
    });

    persistCurrentUser(null);
    window.location.href = '/index.html';
    return true;
}

function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);

        // Do not validate against demo/localStorage users here.
        // Real backend users may not exist in the local demo list.
        
        // Route protection: user can only view user pages
        if (currentUser.role === 'karyawan' && window.location.pathname.includes('admin')) {
            window.location.href = '../user/dashboard.html';
            return;
        }

        // Keep user role inside user pages (avoid landing on legacy root dashboard)
        if (currentUser.role === 'karyawan' && !window.location.pathname.includes('/user/')) {
            window.location.href = 'user/dashboard.html';
            return;
        }
        
        updateUserDisplay();
    } else {
        // If no user logged in, redirect to login page
        if (window.location.pathname.includes('dashboard.html') || window.location.pathname.includes('admin')) {
            window.location.href = '../index.html';
        }
    }

    fetchSessionUserFromApi().then((sessionResult) => {
        if (sessionResult.state === 'authenticated' && sessionResult.user) {
            persistCurrentUser(sessionResult.user);
            updateUserDisplay();
            return;
        }

        if (sessionResult.state === 'unauthenticated' && isProtectedAppPage()) {
            if (isLocalFallbackSession(currentUser)) {
                return;
            }
            persistCurrentUser(null);
            window.location.href = '../index.html';
        }
    });
}

function updateUserDisplay() {
    if (currentUser) {
        const avatar = document.getElementById('userAvatar');
        if (avatar) {
            avatar.textContent = currentUser.name.charAt(0).toUpperCase();
        }
        
        const userNameDisplay = document.getElementById('userName');
        if (userNameDisplay) {
            userNameDisplay.textContent = currentUser.name;
        }
    }
}

// ==================== SHARED NOTIFICATION CENTER ====================
function initializeUnifiedNotificationCenter() {
    const notificationBtn = document.getElementById('notificationBtn') || document.querySelector('.notification-btn');
    if (!notificationBtn || notificationBtn.dataset.notifReady === 'true') return;

    notificationBtn.dataset.notifReady = 'true';

    const host = notificationBtn.closest('.header-actions, .top-bar-right') || notificationBtn.parentElement;
    if (!host) return;

    let badgeEl = notificationBtn.querySelector('.notification-badge');
    if (!badgeEl) {
        badgeEl = document.createElement('span');
        badgeEl.className = 'notification-badge';
        notificationBtn.appendChild(badgeEl);
    }

    let panel = host.querySelector('.notification-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.className = 'notification-panel';
        panel.innerHTML = `
            <div class="notification-panel-header">
                <h4>Notifikasi</h4>
                <button type="button" data-action="mark-all">Tandai dibaca</button>
            </div>
            <div class="notification-list"></div>
            <div class="notification-panel-footer">
                <button type="button" data-action="clear-read">Bersihkan yang sudah dibaca</button>
            </div>
        `;
        host.appendChild(panel);
    }

    const listEl = panel.querySelector('.notification-list');
    const markAllReadBtn = panel.querySelector('#markAllReadBtn') || panel.querySelector('[data-action="mark-all"]');
    const clearReadBtn = panel.querySelector('#clearReadBtn') || panel.querySelector('[data-action="clear-read"]');

    notificationBtn.setAttribute('aria-expanded', 'false');
    panel.setAttribute('aria-hidden', 'true');

    let notificationItems = getOrCreateUserNotifications();

    function renderNotificationList() {
        if (!listEl) return;

        if (!notificationItems.length) {
            listEl.innerHTML = '<div class="notification-empty">Tidak ada notifikasi saat ini.</div>';
            return;
        }

        listEl.innerHTML = notificationItems.map((item, index) => {
            const readClass = item.read ? 'is-read' : '';
            const typeClass = `type-${item.type || 'info'}`;
            const actionButton = item.read
                ? ''
                : `<button type="button" class="notification-mark-read" data-id="${item.id}">Tandai dibaca</button>`;

            return `
                <article class="notification-item ${typeClass} ${readClass}" style="--notif-index:${index};">
                    <h5>${escapeHtmlNotification(item.title || 'Notifikasi')}</h5>
                    <p>${escapeHtmlNotification(item.message || '-')}</p>
                    <div class="notification-meta">
                        <span class="notification-time">${escapeHtmlNotification(item.time || 'Baru saja')}</span>
                        ${actionButton}
                    </div>
                </article>
            `;
        }).join('');
    }

    function updateBadge() {
        const unreadCount = notificationItems.filter(item => !item.read).length;
        badgeEl.textContent = String(unreadCount);
        badgeEl.classList.toggle('is-hidden', unreadCount === 0);
    }

    function persist() {
        localStorage.setItem(getNotificationStorageKey(), JSON.stringify(notificationItems));
    }

    renderNotificationList();
    updateBadge();

    notificationBtn.addEventListener('click', function() {
        const isOpen = panel.classList.toggle('open');
        notificationBtn.setAttribute('aria-expanded', String(isOpen));
        panel.setAttribute('aria-hidden', String(!isOpen));
    });

    markAllReadBtn?.addEventListener('click', async function() {
        const unread = notificationItems.filter(item => !item.read);

        for (const item of unread) {
            try {
                if (typeof apiRequest === 'function') {
                    await apiRequest(`/api/notifications/${Number(item.id)}/read`, {
                        method: 'PATCH',
                    });
                }
            } catch (error) {
                // Continue marking the rest even if one request fails.
            }
        }

        notificationItems = notificationItems.map(item => ({ ...item, read: true }));
        persist();
        renderNotificationList();
        updateBadge();
    });

    clearReadBtn?.addEventListener('click', function() {
        notificationItems = notificationItems.filter(item => !item.read);
        persist();
        renderNotificationList();
        updateBadge();
    });

    listEl?.addEventListener('click', async function(event) {
        const markButton = event.target.closest('.notification-mark-read');
        if (!markButton) return;

        const id = markButton.getAttribute('data-id');

        try {
            if (typeof apiRequest === 'function') {
                await apiRequest(`/api/notifications/${Number(id)}/read`, {
                    method: 'PATCH',
                });
            }
        } catch (error) {
            // Keep local UX responsive even when backend update fails.
        }

        notificationItems = notificationItems.map(item => String(item.id) === String(id) ? { ...item, read: true } : item);
        persist();
        renderNotificationList();
        updateBadge();
    });

    document.addEventListener('click', function(event) {
        const clickedInside = panel.contains(event.target) || notificationBtn.contains(event.target);
        if (clickedInside) return;

        panel.classList.remove('open');
        notificationBtn.setAttribute('aria-expanded', 'false');
        panel.setAttribute('aria-hidden', 'true');
    });
}

function getOrCreateUserNotifications() {
    const storageKey = getNotificationStorageKey();
    const saved = localStorage.getItem(storageKey);

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed)) return parsed;
        } catch (error) {
            // Ignore malformed payload and rebuild defaults.
        }
    }

    const defaultItems = buildDefaultNotificationItems();
    localStorage.setItem(storageKey, JSON.stringify(defaultItems));
    return defaultItems;
}

function buildDefaultNotificationItems() {
    const user = getStoredOrActiveUser();
    const records = getRecordsForUser(user);
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = records.filter(record => getRecordDateKey(record) === today);

    const hasCheckin = todayRecords.some(record => normalizeNotificationAttendanceType(record.type) === 'checkin');
    const hasCheckout = todayRecords.some(record => normalizeNotificationAttendanceType(record.type) === 'checkout');
    const latestLeave = getLatestLeaveForUser(user);

    return [
        {
            id: Date.now() + 1,
            type: hasCheckin ? 'success' : 'reminder',
            title: hasCheckin ? 'Check-in hari ini sudah tercatat' : 'Jangan lupa check-in pagi ini',
            message: hasCheckin ? 'Status kehadiran masuk hari ini sudah lengkap di sistem.' : 'Silakan lakukan check-in sebelum jam kerja agar tidak tercatat terlambat.',
            time: 'Hari ini',
            read: false
        },
        {
            id: Date.now() + 2,
            type: hasCheckout ? 'success' : 'warning',
            title: hasCheckout ? 'Check-out hari ini sudah tercatat' : 'Check-out belum tercatat',
            message: hasCheckout ? 'Waktu pulang hari ini sudah tersimpan.' : 'Selesaikan check-out setelah jam kerja untuk melengkapi presensi harian.',
            time: 'Hari ini',
            read: false
        },
        {
            id: Date.now() + 3,
            type: latestLeave ? 'info' : 'reminder',
            title: latestLeave ? 'Update pengajuan cuti tersedia' : 'Belum ada pengajuan cuti aktif',
            message: latestLeave ? 'Cek menu Cuti untuk status terbaru pengajuan Anda.' : 'Jika membutuhkan izin/cuti, buat pengajuan dari menu Cuti.',
            time: '2 jam lalu',
            read: false
        },
        {
            id: Date.now() + 4,
            type: 'info',
            title: 'Jadwal kunjungan klien',
            message: 'Pastikan agenda kunjungan klien minggu ini sudah diisi pada menu Kunjungan Klien.',
            time: 'Kemarin',
            read: true
        }
    ];
}

function getStoredOrActiveUser() {
    if (currentUser) return currentUser;

    const raw = localStorage.getItem('currentUser');
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (error) {
        return null;
    }
}

function getNotificationStorageKey() {
    const user = getStoredOrActiveUser();
    const userId = String(user?.id || user?.username || 'guest');
    return `userNotifications_${userId}`;
}

function getRecordsForUser(user) {
    if (!Array.isArray(presensiData) || !user) return [];

    return presensiData.filter(record => {
        const sameEmployeeId = String(record.employeeId || record.userId || '') === String(user.id || '');
        const sameUsername = String(record.username || '').toLowerCase() === String(user.username || '').toLowerCase();
        const sameName = String(record.employeeName || record.name || '').toLowerCase() === String(user.name || '').toLowerCase();
        return sameEmployeeId || sameUsername || sameName;
    });
}

function getLatestLeaveForUser(user) {
    if (!Array.isArray(leaves) || !user) return null;

    return leaves.find(item => {
        const sameUserId = String(item.userId || item.employeeId || '') === String(user.id || '');
        const sameUsername = String(item.username || '').toLowerCase() === String(user.username || '').toLowerCase();
        const sameName = String(item.employeeName || item.name || '').toLowerCase() === String(user.name || '').toLowerCase();
        return sameUserId || sameUsername || sameName;
    }) || null;
}

function getRecordDateKey(record) {
    if (!record) return '';

    if (record.timestamp) {
        const dateFromTimestamp = new Date(record.timestamp);
        if (!isNaN(dateFromTimestamp.getTime())) {
            return dateFromTimestamp.toISOString().split('T')[0];
        }
    }

    if (record.date) {
        const dateOnly = new Date(record.date);
        if (!isNaN(dateOnly.getTime())) {
            return dateOnly.toISOString().split('T')[0];
        }
    }

    return '';
}

function normalizeNotificationAttendanceType(type) {
    const value = String(type || '').toLowerCase();
    if (value === 'checkin' || value === 'check in') return 'checkin';
    if (value === 'checkout' || value === 'check out') return 'checkout';
    return 'unknown';
}

function escapeHtmlNotification(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// ==================== DASHBOARD FUNCTIONS ====================
function initDashboard() {
    checkAuthStatus();
    if (!currentUser) return;
    
    const pageDate = document.querySelector('.page-date');
    if (pageDate) {
        const today = new Date();
        const formattedDate = today.toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        }).toLowerCase();
        pageDate.textContent = `Real-time overview of workforce status for ${formattedDate}`;
    }
    
    updateLogoutBtn();
}

function updateLogoutBtn() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            logout(e);
        });
    }
}

// ==================== EMPLOYEE MANAGEMENT ====================
function saveEmployees() {
    localStorage.setItem('employees', JSON.stringify(employees));
}

function addEmployee(employee) {
    employee.id = Math.max(...employees.map(e => e.id || 0), 0) + 1;
    employees.push(employee);
    saveEmployees();
}

function updateEmployee(id, employee) {
    const index = employees.findIndex(e => e.id === id);
    if (index !== -1) {
        employees[index] = { ...employees[index], ...employee };
        saveEmployees();
    }
}

function deleteEmployee(id) {
    employees = employees.filter(e => e.id !== id);
    saveEmployees();
}

// ==================== PRESENSI MANAGEMENT ====================
function loadPresensiData() {
    const stored = localStorage.getItem('presensiData');
    if (stored) {
        presensiData = JSON.parse(stored);
    }
}

function savePresensiData() {
    localStorage.setItem('presensiData', JSON.stringify(presensiData));
}

function recordAttendance(type, location = 'Office') {
    if (!currentUser) return;
    
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    const record = {
        id: Date.now(),
        username: currentUser.username,
        date: today,
        type: type,
        time: time,
        location: location
    };
    
    presensiData.push(record);
    savePresensiData();
    return record;
}

function checkIn() {
    const today = new Date().toISOString().split('T')[0];
    const hasCheckIn = presensiData.some(r => r.date === today && r.username === currentUser.username && r.type === 'Check In');
    
    if (hasCheckIn) {
        alert('Anda sudah melakukan check in hari ini!');
        return;
    }
    
    recordAttendance('Check In');
    alert('Check in berhasil!');
    updatePresensiList();
}

function checkOut() {
    const today = new Date().toISOString().split('T')[0];
    const hasCheckOut = presensiData.some(r => r.date === today && r.username === currentUser.username && r.type === 'Check Out');
    
    if (hasCheckOut) {
        alert('Anda sudah melakukan check out hari ini!');
        return;
    }
    
    recordAttendance('Check Out');
    alert('Check out berhasil!');
    updatePresensiList();
}

function updatePresensiList() {
    const list = document.getElementById('presensiList');
    if (!list) return;
    
    const today = new Date().toISOString().split('T')[0];
    const todayData = presensiData.filter(r => r.date === today && r.username === currentUser.username);
    
    if (todayData.length === 0) {
        list.innerHTML = '<p>Belum ada data presensi hari ini</p>';
        return;
    }
    
    list.innerHTML = todayData.map(r => `
        <div class=\"presensi-item\">
            <strong>${r.type}</strong>: ${r.time} - ${r.location}
        </div>
    `).join('');
}

// ==================== LEAVE MANAGEMENT ====================
function updateLeaveList() {
    const list = document.getElementById('leaveList');
    if (!list) return;
    
    const userLeaves = leaves.filter(l => l.username === currentUser.username);
    
    if (userLeaves.length === 0) {
        list.innerHTML = '<p>Belum ada pengajuan cuti</p>';
        return;
    }
    
    list.innerHTML = userLeaves.map(l => `
        <div class=\"leave-item\">
            <strong>${l.reason}</strong><br>
            ${l.startDate} - ${l.endDate}<br>
            Status: <span class=\"badge badge-${l.status.toLowerCase()}\">${l.status}</span>
        </div>
    `).join('');
}

// ==================== ADMIN FUNCTIONS ====================
function loadAdminData() {
    loadEmployees();
    updateEmployeeList();
    updatePresensiList();
    updateLeaveList();
}

function updateEmployeeList() {
    const list = document.getElementById('employeeList');
    if (!list) return;
    
    if (employees.length === 0) {
        list.innerHTML = '<p>Belum ada data karyawan</p>';
        return;
    }
    
    list.innerHTML = employees.map((emp, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td>${emp.name}</td>
            <td>${emp.email || '-'}</td>
            <td>${emp.department || '-'}</td>
            <td>${emp.position || '-'}</td>
            <td>
                <button class=\"btn btn-sm\" onclick=\"editEmployee(${emp.id})\">Edit</button>
                <button class=\"btn btn-sm btn-danger\" onclick=\"deleteEmployeeConfirm(${emp.id})\">Delete</button>
            </td>
        </tr>
    `).join('');
}

function deleteEmployeeConfirm(id) {
    showAppConfirm({
        title: 'Hapus Karyawan',
        message: 'Yakin ingin menghapus karyawan ini?',
        confirmText: 'Hapus',
        cancelText: 'Batal',
        variant: 'danger',
        onConfirm: () => {
            deleteEmployee(id);
            updateEmployeeList();
        }
    });
}

function loadAttendance() {
    // Will be implemented for admin attendance view
}

function loadLeaves() {
    // Will be implemented for admin leave management
}

function loadAnnouncements() {
    // Will be implemented for admin announcements
}

function loadReports() {
    // Will be implemented for admin reports
}

function loadEmployees() {
    // Alias for consistency
    loadPresensiData();
}

function setSchedule(userId, schedule) {
    const existing = schedules.find(s => s.userId === userId);
    if (existing) {
        existing.schedule = schedule;
    } else {
        schedules.push({ userId, schedule });
    }
    localStorage.setItem('schedules', JSON.stringify(schedules));
}

function setPermission(userId, permission) {
    const existing = permissions.find(p => p.userId === userId);
    if (existing) {
        existing.permission = permission;
    } else {
        permissions.push({ userId, permission });
    }
    localStorage.setItem('permissions', JSON.stringify(permissions));
}

function updateButtons() {
    if (!currentUser) return;
    
    const checkInBtn = document.getElementById('checkInBtn');
    const checkOutBtn = document.getElementById('checkOutBtn');
    
    if (!checkInBtn || !checkOutBtn) return;
    
    const today = new Date().toISOString().split('T')[0];
    const hasCheckIn = presensiData.some(r => r.date === today && r.username === currentUser.username && r.type === 'Check In');
    const hasCheckOut = presensiData.some(r => r.date === today && r.username === currentUser.username && r.type === 'Check Out');
    
    checkInBtn.disabled = hasCheckIn;
    checkOutBtn.disabled = !hasCheckIn || hasCheckOut;
}

function setupResponsiveSidebarMenu() {
    if (document.body.dataset.sidebarMenuReady === 'true') return;

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    document.body.dataset.sidebarMenuReady = 'true';
    document.body.classList.add('sidebar-menu-enabled');

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'mobile-sidebar-toggle';
    toggleButton.setAttribute('aria-label', 'Buka menu navigasi');
    toggleButton.innerHTML = '<i class="fas fa-bars"></i><span>Menu</span>';

    const actionTarget = document.querySelector('.header-actions') || document.querySelector('.top-bar-right');
    const headerTarget = document.querySelector('.dashboard-header') || document.querySelector('.top-bar');
    const mainContent = document.querySelector('.main-content');
    if (actionTarget) {
        toggleButton.classList.add('in-action-row');
        actionTarget.insertAdjacentElement('afterbegin', toggleButton);
    } else if (headerTarget) {
        headerTarget.insertAdjacentElement('beforebegin', toggleButton);
    } else if (mainContent) {
        mainContent.insertAdjacentElement('afterbegin', toggleButton);
    }

    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);

    function closeSidebarMenu() {
        document.body.classList.remove('sidebar-menu-open');
    }

    function openSidebarMenu() {
        document.body.classList.add('sidebar-menu-open');
    }

    toggleButton.addEventListener('click', function() {
        if (document.body.classList.contains('sidebar-menu-open')) {
            closeSidebarMenu();
        } else {
            openSidebarMenu();
        }
    });

    overlay.addEventListener('click', closeSidebarMenu);

    sidebar.querySelectorAll('.nav-item, .settings-link').forEach((menuLink) => {
        menuLink.addEventListener('click', closeSidebarMenu);
    });

    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeSidebarMenu();
        }
    });

    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeSidebarMenu();
        }
    });
}

// ==================== GLOBAL THEME (LIGHT / DARK) ====================
const APP_THEME_STORAGE_KEY = 'appThemePreference';

function getPreferredTheme() {
    const storedTheme = localStorage.getItem(APP_THEME_STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
    }

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }

    return 'light';
}

function applyTheme(theme) {
    const activeTheme = theme === 'dark' ? 'dark' : 'light';
    const isEnglish = getCurrentLanguage() === 'en';
    document.body.classList.toggle('theme-dark', activeTheme === 'dark');
    document.body.classList.toggle('theme-light', activeTheme === 'light');
    document.body.setAttribute('data-theme', activeTheme);
    document.documentElement.style.colorScheme = activeTheme;

    const themeToggleButton = document.getElementById('themeToggleBtn');
    if (themeToggleButton) {
        const icon = themeToggleButton.querySelector('.theme-toggle-icon');
        const label = themeToggleButton.querySelector('.theme-toggle-label');

        if (icon) icon.textContent = activeTheme === 'dark' ? '☀' : '☾';
        if (label) {
            label.textContent = activeTheme === 'dark'
                ? (isEnglish ? 'Light' : 'Terang')
                : (isEnglish ? 'Dark' : 'Gelap');
        }

        const nextThemeLabel = activeTheme === 'dark'
            ? (isEnglish ? 'Enable light theme' : 'Aktifkan tema terang')
            : (isEnglish ? 'Enable dark theme' : 'Aktifkan tema gelap');

        themeToggleButton.setAttribute('aria-label', nextThemeLabel);
        themeToggleButton.setAttribute('title', nextThemeLabel);
    }
}

function toggleTheme() {
    const nextTheme = document.body.classList.contains('theme-dark') ? 'light' : 'dark';
    localStorage.setItem(APP_THEME_STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
}

function createThemeToggleButton() {
    if (document.getElementById('themeToggleBtn')) return;

    const button = document.createElement('button');
    button.type = 'button';
    button.id = 'themeToggleBtn';
    button.className = 'theme-toggle-btn';
    button.innerHTML = '<span class="theme-toggle-icon" aria-hidden="true">☾</span><span class="theme-toggle-label">Dark</span>';

    button.addEventListener('click', toggleTheme);

    const actionHost = document.querySelector('.header-actions')
        || document.querySelector('.top-bar-right')
        || document.querySelector('.login-header')
        || document.querySelector('.login-card')
        || document.querySelector('.main-content');

    if (actionHost) {
        button.classList.add('in-header');
        actionHost.insertAdjacentElement('afterbegin', button);
    } else {
        button.classList.add('floating');
        document.body.appendChild(button);
    }
}

function initializeThemeSwitcher() {
    if (!document.body) return;

    createThemeToggleButton();
    applyTheme(getPreferredTheme());
}

function getPreferredLanguage() {
    const saved = String(localStorage.getItem(APP_LANGUAGE_STORAGE_KEY) || '').toLowerCase();
    if (APP_SUPPORTED_LANGUAGES.includes(saved)) return saved;

    const browserLanguage = String(navigator.language || 'id').toLowerCase();
    return browserLanguage.startsWith('id') ? 'id' : 'en';
}

function getCurrentLanguage() {
    return document.documentElement.getAttribute('lang') === 'en' ? 'en' : 'id';
}

function getCookieConsentStatus() {
    const raw = String(localStorage.getItem(APP_COOKIE_CONSENT_STORAGE_KEY) || '').toLowerCase();
    if (raw === APP_COOKIE_CONSENT_ACCEPTED || raw === APP_COOKIE_CONSENT_ESSENTIAL) {
        return raw;
    }
    return '';
}

function getCookieConsentText(language) {
    if (language === 'en') {
        return {
            title: 'Cookie Preferences',
            description: 'We use essential cookies and local storage to keep login and core features working. Browser permissions like camera, location, and Google sign-in are managed separately in site settings.',
            acceptAll: 'Accept All',
            essentialOnly: 'Essential Only'
        };
    }

    return {
        title: 'Preferensi Cookie',
        description: 'Kami menggunakan cookie penting dan local storage untuk menjaga login dan fitur utama tetap berjalan. Izin browser seperti kamera, lokasi, dan Google sign-in diatur terpisah pada setelan situs.',
        acceptAll: 'Terima Semua',
        essentialOnly: 'Hanya Penting'
    };
}

function renderCookieConsentText() {
    const wrap = document.getElementById('appCookieConsent');
    if (!wrap) return;

    const lang = getCurrentLanguage();
    const text = getCookieConsentText(lang);
    const title = wrap.querySelector('[data-cookie-title]');
    const description = wrap.querySelector('[data-cookie-description]');
    const acceptButton = wrap.querySelector('[data-cookie-accept-all]');
    const essentialButton = wrap.querySelector('[data-cookie-essential-only]');

    if (title) title.textContent = text.title;
    if (description) description.textContent = text.description;
    if (acceptButton) acceptButton.textContent = text.acceptAll;
    if (essentialButton) essentialButton.textContent = text.essentialOnly;
}

function syncCookieConsentVisibility() {
    const wrap = document.getElementById('appCookieConsent');
    if (!wrap) return;

    const hasConsent = Boolean(getCookieConsentStatus());
    wrap.classList.toggle('is-hidden', hasConsent);
}

function setCookieConsent(status) {
    if (status !== APP_COOKIE_CONSENT_ACCEPTED && status !== APP_COOKIE_CONSENT_ESSENTIAL) {
        return;
    }

    localStorage.setItem(APP_COOKIE_CONSENT_STORAGE_KEY, status);
    syncCookieConsentVisibility();
}

function initializeCookieConsentBanner() {
    if (!document.body) return;
    if (document.getElementById('appCookieConsent')) return;

    const wrap = document.createElement('aside');
    wrap.id = 'appCookieConsent';
    wrap.className = 'cookie-consent';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', 'Cookie consent');
    wrap.innerHTML = [
        '<div class="cookie-consent-content">',
        '  <h3 class="cookie-consent-title" data-cookie-title></h3>',
        '  <p class="cookie-consent-description" data-cookie-description></p>',
        '  <div class="cookie-consent-actions">',
        '    <button type="button" class="btn secondary" data-cookie-essential-only></button>',
        '    <button type="button" class="btn primary" data-cookie-accept-all></button>',
        '  </div>',
        '</div>'
    ].join('');

    document.body.appendChild(wrap);
    renderCookieConsentText();
    syncCookieConsentVisibility();

    const acceptButton = wrap.querySelector('[data-cookie-accept-all]');
    const essentialButton = wrap.querySelector('[data-cookie-essential-only]');

    if (acceptButton) {
        acceptButton.addEventListener('click', () => {
            setCookieConsent(APP_COOKIE_CONSENT_ACCEPTED);
        });
    }

    if (essentialButton) {
        essentialButton.addEventListener('click', () => {
            setCookieConsent(APP_COOKIE_CONSENT_ESSENTIAL);
        });
    }

    window.addEventListener('appLanguageChanged', renderCookieConsentText);
}

function escapeI18nRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function translateKnownText(text, language) {
    const raw = String(text || '');
    const trimmed = raw.trim();
    if (!trimmed) return raw;

    const fromId = APP_I18N_BY_ID.get(trimmed);
    const fromEn = APP_I18N_BY_EN.get(trimmed);
    const pair = fromId || fromEn;
    if (pair) {
        const translated = language === 'en' ? pair.en : pair.id;
        if (translated) {
            const leading = raw.match(/^\s*/)?.[0] || '';
            const trailing = raw.match(/\s*$/)?.[0] || '';
            return `${leading}${translated}${trailing}`;
        }
    }

    let result = raw;
    const sortedPairs = [...APP_I18N_PAIRS].sort((a, b) => {
        const aLen = Math.max(String(a.id || '').length, String(a.en || '').length);
        const bLen = Math.max(String(b.id || '').length, String(b.en || '').length);
        return bLen - aLen;
    });

    sortedPairs.forEach((item) => {
        const target = language === 'en' ? item.en : item.id;
        if (!target) return;

        const sources = [item.id, item.en].filter(Boolean);
        sources.forEach((source) => {
            if (!source || source === target) return;
            let patStr = escapeI18nRegExp(source);
            if (/^\w/.test(source)) patStr = '\\b' + patStr;
            if (/\w$/.test(source)) patStr = patStr + '\\b';
            const pattern = new RegExp(patStr, 'g');
            result = result.replace(pattern, target);
        });
    });

    return result;
}

function translatePage(language) {
    const lang = APP_SUPPORTED_LANGUAGES.includes(language) ? language : 'id';
    if (!document.body) return;

    const skipSelector = [
        '#appLanguageSwitcher',
        '#appCookieConsent',
        'script',
        'style',
        'input',
        'textarea',
        '[contenteditable="true"]',
        '#leaveHistory',
        '#attendanceHistory',
        '#visitsTableBody',
        '#employeeTableBody',
        '#leaveTableBody',
        '#attendanceListContainer',
        '#notificationList',
        '#recentActivity',
        '.profile-info-value',
        '#userName',
        '#profileName',
        '#profileRole'
    ].join(',');

    if (document.title) {
        document.title = translateKnownText(document.title, lang);
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest(skipSelector)) return NodeFilter.FILTER_REJECT;
            if (!String(node.textContent || '').trim()) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });

    const textNodes = [];
    let currentNode = walker.nextNode();
    while (currentNode) {
        textNodes.push(currentNode);
        currentNode = walker.nextNode();
    }

    textNodes.forEach(node => {
        const originalText = appI18nTextOriginalMap.has(node)
            ? appI18nTextOriginalMap.get(node)
            : String(node.textContent || '');

        if (!appI18nTextOriginalMap.has(node)) {
            appI18nTextOriginalMap.set(node, originalText);
        }

        const nextText = translateKnownText(originalText, lang);
        if (nextText !== node.textContent) {
            node.textContent = nextText;
        }
    });

    const translatableAttrElements = document.querySelectorAll('[placeholder], [title], [aria-label], input[type="submit"], input[type="button"]');
    translatableAttrElements.forEach(el => {
        if (el.closest(skipSelector)) return;

        ['placeholder', 'title', 'aria-label'].forEach(attr => {
            if (!el.hasAttribute(attr)) return;

            let attrSnapshot = appI18nAttrOriginalMap.get(el);
            if (!attrSnapshot) {
                attrSnapshot = {};
                appI18nAttrOriginalMap.set(el, attrSnapshot);
            }

            if (typeof attrSnapshot[attr] !== 'string') {
                attrSnapshot[attr] = String(el.getAttribute(attr) || '');
            }

            const nextValue = translateKnownText(attrSnapshot[attr], lang);
            const value = el.getAttribute(attr);
            if (nextValue !== value) {
                el.setAttribute(attr, nextValue);
            }
        });
    });
}

function queueTranslatePage() {
    if (appLanguageTranslateTimer) {
        window.clearTimeout(appLanguageTranslateTimer);
    }

    appLanguageTranslateTimer = window.setTimeout(() => {
        appLanguageTranslateTimer = null;
        translatePage(getCurrentLanguage());
    }, 80);
}

function setLanguage(language) {
    const lang = APP_SUPPORTED_LANGUAGES.includes(language) ? language : 'id';
    localStorage.setItem(APP_LANGUAGE_STORAGE_KEY, lang);
    document.documentElement.setAttribute('lang', lang);

    syncLanguageSwitcherState(lang);
    applyTheme(document.body.classList.contains('theme-dark') ? 'dark' : 'light');

    translatePage(lang);
    window.dispatchEvent(new CustomEvent('appLanguageChanged', {
        detail: { language: lang }
    }));
}

function syncLanguageSwitcherState(lang) {
    const buttons = document.querySelectorAll('#appLanguageSwitcher [data-lang-option]');
    buttons.forEach((button) => {
        const isActive = button.getAttribute('data-lang-option') === lang;
        button.classList.toggle('active', isActive);
        button.setAttribute('aria-pressed', String(isActive));

        const option = button.getAttribute('data-lang-option');
        if (option === 'id') {
            button.setAttribute('title', lang === 'en' ? 'Use Indonesian' : 'Gunakan Bahasa Indonesia');
        } else if (option === 'en') {
            button.setAttribute('title', lang === 'en' ? 'Use English' : 'Gunakan Bahasa Inggris');
        }
    });

    const label = document.querySelector('#appLanguageSwitcher .lang-switcher-label');
    if (label) {
        label.textContent = lang === 'en' ? 'Language' : 'Bahasa';
    }

    const group = document.querySelector('#appLanguageSwitcher .lang-switcher-group');
    if (group) {
        group.setAttribute('aria-label', lang === 'en' ? 'Choose language' : 'Pilih bahasa');
    }
}

function getLanguageSwitcherDesktopHost() {
    return document.querySelector('.header-actions')
        || document.querySelector('.top-bar-right')
        || document.querySelector('.login-header')
        || document.querySelector('.login-card')
        || document.querySelector('.main-content');
}

function placeLanguageSwitcherNearThemeToggle(wrap, host) {
    if (!wrap || !host) return false;

    const themeToggle = host.querySelector('#themeToggleBtn');
    if (themeToggle) {
        themeToggle.insertAdjacentElement('afterend', wrap);
        return true;
    }

    host.appendChild(wrap);
    return true;
}

function moveLanguageSwitcherToBestHost() {
    const wrap = document.getElementById('appLanguageSwitcher');
    if (!wrap) return;

    const desktopHost = getLanguageSwitcherDesktopHost();
    if (desktopHost) {
        wrap.classList.remove('in-sidebar', 'floating');
        wrap.classList.add('in-header');
        placeLanguageSwitcherNearThemeToggle(wrap, desktopHost);
    } else {
        wrap.classList.remove('in-header', 'in-sidebar');
        wrap.classList.add('floating');
        if (wrap.parentElement !== document.body) {
            document.body.appendChild(wrap);
        }
    }
}

function createLanguageSwitcher() {
    if (document.getElementById('appLanguageSwitcher')) return;

    const wrap = document.createElement('div');
    wrap.id = 'appLanguageSwitcher';
    wrap.className = 'lang-switcher';

    const label = document.createElement('span');
    label.className = 'lang-switcher-label';
    label.textContent = 'Bahasa';

    const group = document.createElement('div');
    group.className = 'lang-switcher-group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-label', 'Pilih bahasa');

    const idBtn = document.createElement('button');
    idBtn.type = 'button';
    idBtn.className = 'lang-switcher-btn';
    idBtn.textContent = 'ID';
    idBtn.setAttribute('data-lang-option', 'id');
    idBtn.setAttribute('aria-pressed', 'false');

    const enBtn = document.createElement('button');
    enBtn.type = 'button';
    enBtn.className = 'lang-switcher-btn';
    enBtn.textContent = 'EN';
    enBtn.setAttribute('data-lang-option', 'en');
    enBtn.setAttribute('aria-pressed', 'false');

    group.appendChild(idBtn);
    group.appendChild(enBtn);

    wrap.appendChild(label);
    wrap.appendChild(group);

    const actionHost = getLanguageSwitcherDesktopHost();

    if (actionHost) {
        wrap.classList.add('in-header');
        placeLanguageSwitcherNearThemeToggle(wrap, actionHost);
    } else {
        wrap.classList.add('floating');
        document.body.appendChild(wrap);
    }

    group.addEventListener('click', (event) => {
        const button = event.target.closest('[data-lang-option]');
        if (!button) return;
        setLanguage(String(button.getAttribute('data-lang-option') || 'id'));
    });

    syncLanguageSwitcherState(getCurrentLanguage());
    moveLanguageSwitcherToBestHost();

    if (!window.__appLanguagePlacementBound) {
        window.__appLanguagePlacementBound = true;
        window.addEventListener('resize', moveLanguageSwitcherToBestHost);
    }
}

function initializeLanguageSystem() {
    if (!document.body) return;

    createLanguageSwitcher();
    setLanguage(getPreferredLanguage());

    if (!appLanguageObserver && typeof MutationObserver !== 'undefined') {
        appLanguageObserver = new MutationObserver(() => {
            queueTranslatePage();
        });

        appLanguageObserver.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    window.appI18n = {
        setLanguage,
        getCurrentLanguage,
        translatePage: () => translatePage(getCurrentLanguage())
    };
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', async function() {
    initializeThemeSwitcher();
    initializeLanguageSystem();
    initializeCookieConsentBanner();
    initializeData();
    setupResponsiveSidebarMenu();
    initializeUnifiedNotificationCenter();
    initializeOverlayModalAnimationObserver();
    
    // Check existing session
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.includes('index.html') || currentPath.endsWith('/') || currentPath.includes('signup.html');

    // Avoid calling protected APIs on auth pages before user is logged in.
    if (!isAuthPage) {
        await syncCoreDataFromApi();
    }
    
    if (currentPath.includes('index.html') || currentPath.endsWith('/')) {
        initializeAuthExperience();

        // Login page
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        renderGoogleAuthButtons();
        
        // If already logged in, redirect
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            redirectByRole(currentUser);
        }

    } else if (currentPath.includes('signup.html')) {
        initializeAuthExperience();

        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', handleSignUp);
        }

        renderGoogleAuthButtons();

        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            redirectByRole(currentUser);
        }

    } else if (currentPath.includes('dashboard.html') && !currentPath.includes('admin')) {
        // User dashboard
        const sessionResult = await fetchSessionUserFromApi();
        if (sessionResult.state === 'authenticated' && sessionResult.user) {
            persistCurrentUser(sessionResult.user);
        }

        checkAuthStatus();
        if (currentUser && currentUser.role === 'karyawan') {
            initDashboard();
            loadPresensiData();
            updatePresensiList();
            updateButtons();
            updateLeaveList();
        }
    } else if (currentPath.includes('admin')) {
        // Admin dashboard/pages
        const sessionResult = await fetchSessionUserFromApi();
        if (sessionResult.state === 'authenticated' && sessionResult.user) {
            persistCurrentUser(sessionResult.user);
        }

        checkAuthStatus();
        if (currentUser && ['hr', 'finance', 'manager', 'admin', 'bod'].includes(currentUser.role)) {
            // Admin pages will initialize themselves via their specific JS files
        }
    }
});

// Inject Admin Portal button into user sidebars
document.addEventListener('DOMContentLoaded', () => {
    const savedUserJson = localStorage.getItem('currentUser');
    if (!savedUserJson) return;
    
    let localUser = null;
    try {
        localUser = JSON.parse(savedUserJson);
    } catch (e) {}

    if (!localUser || !['admin', 'hr', 'manager', 'finance', 'bod'].includes(localUser?.role)) return;
    
    // Pastikan kita ada di folder user/
    if (!window.location.pathname.includes('/user/')) return;
    
    // Wait for a tiny bit so the DOM is fully constructed
    setTimeout(() => {
        const navs = document.querySelectorAll('nav.sidebar-nav');
        navs.forEach(nav => {
            if (nav.querySelector('.nav-admin-portal')) return;

            const adminBtn = document.createElement('a');
            adminBtn.href = '../admin/dashboard.html';
            adminBtn.className = 'nav-item nav-admin-portal';
            adminBtn.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            adminBtn.style.color = '#3b82f6';
            adminBtn.style.fontWeight = 'bold';
            adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> <span class="nav-text" style="margin-left:8px;">Panel Manajemen</span>';
            
            nav.insertBefore(adminBtn, nav.firstElementChild);
        });
    }, 100);
});


// Role-based Access Control for Admin Dashboard Sidebar
document.addEventListener('DOMContentLoaded', () => {
    const savedUserJson = localStorage.getItem('currentUser');
    if (!savedUserJson) return;
    
    let localUser = null;
    try {
        localUser = JSON.parse(savedUserJson);
    } catch (e) {}
    
    // Check if we are in admin section
    if (window.location.pathname.includes('/admin/')) {
        const role = localUser?.role || '';
        
        // Allowed paths for each role
        const permissions = {
            'admin': ['all'],
            'hr': ['all'],
            'bod': ['all'],
            'manager': ['dashboard.html', 'attendance.html', 'leave.html', 'client_visit.html', 'employees.html', 'index.html'],
            'finance': ['dashboard.html', 'attendance.html', 'client_visit.html', 'index.html'] // Added client_visit.html
        };
        
        const myPerms = permissions[role] || [];
        
        // Hide sidebar links
        setTimeout(() => {
            const navLinks = document.querySelectorAll('nav.sidebar-nav a.nav-item');
            navLinks.forEach(link => {
                const targetHref = link.getAttribute('href');
                if (myPerms.includes('all')) return; // Allow
                
                let isAllowed = false;
                myPerms.forEach(allowedHref => {
                    if (targetHref.includes(allowedHref)) isAllowed = true;
                });
                
                if (!isAllowed && targetHref !== '#') { // Hide unauthorized menus
                    link.style.display = 'none';
                }
            });
        }, 100);

        // Security Kick: if accessing unauthorized page, redirect to admin dashboard
        let currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        if (!myPerms.includes('all')) {
            let pageAllowed = false;
            myPerms.forEach(allowedHref => {
                if (currentPage.includes(allowedHref)) pageAllowed = true;
            });
            
            if (!pageAllowed) {
                window.location.href = 'dashboard.html';
            }
        }
        
        // Injection to go back to Employee panel
        setTimeout(() => {
            const navs = document.querySelectorAll('nav.sidebar-nav');
            navs.forEach(nav => {
                if (nav.querySelector('.nav-user-portal')) return;

                const userBtn = document.createElement('a');
                userBtn.href = '../user/dashboard.html';
                userBtn.className = 'nav-item nav-user-portal';
                userBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                userBtn.style.color = '#10b981';
                userBtn.style.fontWeight = 'bold';
                userBtn.innerHTML = '<i class="fas fa-user-circle"></i> <span class="nav-text" style="margin-left:8px;">Halaman Pribadi (Absen)</span>';
                
                const returnText = nav.appendChild(userBtn);
            });
        }, 110);
    }
});