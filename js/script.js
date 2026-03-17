// ==================== USER DATA & INITIALIZATION ====================
let currentUser = null;

// Demo users with roles
const demoUsers = [
    { id: 1, username: 'admin', password: 'admin', name: 'Administrator', role: 'admin' },
    { id: 2, username: 'user', password: 'user', name: 'Employee User', role: 'user' }
];

const APP_LANGUAGE_STORAGE_KEY = 'appLanguage';
const APP_SUPPORTED_LANGUAGES = ['id', 'en'];
const APP_I18N_PAIRS = [
    { id: 'Masuk', en: 'Sign In' },
    { id: 'Daftar', en: 'Sign Up' },
    { id: 'Logout', en: 'Log Out' },
    { id: 'Dashboard', en: 'Dashboard' },
    { id: 'Dashboard Admin', en: 'Admin Dashboard' },
    { id: 'Presensi', en: 'Attendance' },
    { id: 'Cuti', en: 'Leave' },
    { id: 'Kunjungan Klien', en: 'Client Visits' },
    { id: 'Karyawan', en: 'Employees' },
    { id: 'Manajemen Cuti', en: 'Leave Management' },
    { id: 'Manajemen Karyawan', en: 'Employee Management' },
    { id: 'Sedang Cuti', en: 'On Leave' },
    { id: 'Aktif', en: 'Active' },
    { id: 'Tidak Aktif', en: 'Inactive' },
    { id: 'Nama Lengkap', en: 'Full Name' },
    { id: 'Nama', en: 'Name' },
    { id: 'Email', en: 'Email' },
    { id: 'Departemen', en: 'Department' },
    { id: 'Posisi', en: 'Position' },
    { id: 'Status', en: 'Status' },
    { id: 'Aksi', en: 'Actions' },
    { id: 'Tanggal Mulai', en: 'Start Date' },
    { id: 'Tanggal Selesai', en: 'End Date' },
    { id: 'Alasan', en: 'Reason' },
    { id: 'Hari', en: 'Days' },
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
    { id: 'Menunggu Persetujuan', en: 'Pending Approval' },
    { id: 'Cari karyawan...', en: 'Search employees...' },
    { id: 'Pilih gender', en: 'Select gender' },
    { id: 'Laki-laki', en: 'Male' },
    { id: 'Perempuan', en: 'Female' },
    { id: 'Semua Status', en: 'All Statuses' },
    { id: 'Semua Departemen', en: 'All Departments' },
    { id: 'Memuat karyawan...', en: 'Loading employees...' },
    { id: 'Memuat permintaan cuti...', en: 'Loading leave requests...' },
    { id: 'No employees found', en: 'No employees found' },
    { id: 'No leave requests found', en: 'No leave requests found' },
    { id: 'Konfirmasi', en: 'Confirmation' },
    { id: 'Input', en: 'Input' },
    { id: 'Konfirmasi Logout', en: 'Logout Confirmation' },
    { id: 'Apakah anda yakin untuk logout', en: 'Are you sure you want to log out' },
    { id: 'GlobalNine HR - Manajemen Karyawan', en: 'GlobalNine HR - Employee Management' },
    { id: 'GlobalNine HR - Manajemen Cuti', en: 'GlobalNine HR - Leave Management' },
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

let users = [...demoUsers];

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
                storedUsers = parsed.filter(user => user && user.username && user.password && user.name);
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
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const rememberLogin = document.getElementById('rememberLogin');

    const user = users.find(u => String(u.username).toLowerCase() === String(username).toLowerCase() && u.password === password);

    if (user) {
        if (rememberLogin?.checked) {
            localStorage.setItem('lastLoginUsername', username);
        } else {
            localStorage.removeItem('lastLoginUsername');
        }

        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        
        // Route based on role
        if (user.role === 'admin') {
            window.location.href = 'admin/dashboard.html';
        } else if (user.role === 'user') {
            window.location.href = 'user/dashboard.html';
        }
    } else {
        alert('Username atau password salah!');
        document.getElementById('loginForm').reset();
    }
}

function handleSignUp(e) {
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
        role: 'user',
        provider: 'local'
    };

    users.push(newUser);
    persistRegisteredUsers();
    upsertEmployeeRecordForUser(newUser);

    alert('Akun berhasil dibuat. Silakan login.');
    window.location.href = 'index.html';
}

async function handleGoogleAuth(event) {
    const trigger = event.currentTarget;
    const mode = trigger?.dataset?.authMode || 'signin';

    const emailInput = await askAppPrompt({
        title: 'Login Google',
        message: 'Masukkan email Google Anda:',
        placeholder: 'nama@email.com',
        confirmText: 'Lanjut',
        cancelText: 'Batal'
    });
    const email = String(emailInput || '').trim().toLowerCase();
    if (!email) return;

    if (!isValidEmail(email)) {
        alert('Format email tidak valid.');
        return;
    }

    let user = users.find(item => String(item.email || '').toLowerCase() === email);

    if (!user) {
        const suggestedName = email.split('@')[0].replace(/[._-]/g, ' ');
        const nameInput = await askAppPrompt({
            title: 'Lengkapi Profil',
            message: 'Nama lengkap untuk akun ini:',
            defaultValue: toTitleCase(suggestedName),
            confirmText: 'Simpan',
            cancelText: 'Batal'
        });
        const name = String(nameInput || '').trim();

        if (!name) {
            alert('Nama tidak boleh kosong.');
            return;
        }

        const baseUsername = slugifyUsername(email.split('@')[0] || 'googleuser');
        const uniqueUsername = makeUniqueUsername(baseUsername);

        user = {
            id: getNextUserId(),
            username: uniqueUsername,
            password: `google-${Date.now()}`,
            name,
            email,
            role: 'user',
            provider: 'google'
        };

        users.push(user);
        persistRegisteredUsers();
        upsertEmployeeRecordForUser(user);
    }

    currentUser = user;
    localStorage.setItem('currentUser', JSON.stringify(user));

    if (mode === 'signup') {
        notify(`Akun Google berhasil dibuat. Selamat datang, ${user.name}!`, 'success');
    } else {
        notify(`Berhasil masuk dengan Google sebagai ${user.name}.`, 'success');
    }

    window.location.href = 'user/dashboard.html';
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

function setupForgotPasswordHint() {
    const forgotBtn = document.getElementById('forgotPasswordBtn');
    if (!forgotBtn) return;

    forgotBtn.addEventListener('click', function() {
        notify('Fitur reset password akan tersedia di tahap berikutnya. Saat ini gunakan akun demo atau daftar akun baru.', 'info');
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
        showAppConfirm({
            title: 'Konfirmasi Logout',
            message: 'Apakah anda yakin untuk logout',
            confirmText: 'Oke',
            cancelText: 'Batal',
            onConfirm: () => logout({ skipConfirm: true }),
            onCancel: () => {}
        });
        return false;
    }

    localStorage.removeItem('currentUser');
    currentUser = null;
    window.location.href = '/index.html';
    return true;
}

function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        
        // Validate user still exists in system
        const userExists = users.find(u => u.id === currentUser.id);
        if (!userExists) {
            logout(false);
            return;
        }
        
        // Route protection: admin can only view their dashboard
        if (currentUser.role === 'admin' && window.location.pathname.includes('dashboard.html') && !window.location.pathname.includes('admin')) {
            window.location.href = '../admin/dashboard.html';
            return;
        }
        
        // Route protection: user can only view user pages
        if (currentUser.role === 'user' && window.location.pathname.includes('admin')) {
            window.location.href = '../user/dashboard.html';
            return;
        }

        // Keep user role inside user pages (avoid landing on legacy root dashboard)
        if (currentUser.role === 'user' && !window.location.pathname.includes('/user/')) {
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

    markAllReadBtn?.addEventListener('click', function() {
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

    listEl?.addEventListener('click', function(event) {
        const markButton = event.target.closest('.notification-mark-read');
        if (!markButton) return;

        const id = markButton.getAttribute('data-id');
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
    document.body.classList.toggle('theme-dark', activeTheme === 'dark');
    document.body.classList.toggle('theme-light', activeTheme === 'light');
    document.body.setAttribute('data-theme', activeTheme);
    document.documentElement.style.colorScheme = activeTheme;

    const themeToggleButton = document.getElementById('themeToggleBtn');
    if (themeToggleButton) {
        const icon = themeToggleButton.querySelector('.theme-toggle-icon');
        const label = themeToggleButton.querySelector('.theme-toggle-label');

        if (icon) icon.textContent = activeTheme === 'dark' ? '☀' : '☾';
        if (label) label.textContent = activeTheme === 'dark' ? 'Light' : 'Dark';
        themeToggleButton.setAttribute('aria-label', activeTheme === 'dark' ? 'Aktifkan tema terang' : 'Aktifkan tema gelap');
        themeToggleButton.setAttribute('title', activeTheme === 'dark' ? 'Aktifkan tema terang' : 'Aktifkan tema gelap');
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

function translateKnownText(text, language) {
    const raw = String(text || '');
    const trimmed = raw.trim();
    if (!trimmed) return raw;

    const fromId = APP_I18N_BY_ID.get(trimmed);
    const fromEn = APP_I18N_BY_EN.get(trimmed);
    const pair = fromId || fromEn;
    if (!pair) return raw;

    const translated = language === 'en' ? pair.en : pair.id;
    if (!translated) return raw;

    const leading = raw.match(/^\s*/)?.[0] || '';
    const trailing = raw.match(/\s*$/)?.[0] || '';
    return `${leading}${translated}${trailing}`;
}

function translatePage(language) {
    const lang = APP_SUPPORTED_LANGUAGES.includes(language) ? language : 'id';
    if (!document.body) return;

    if (document.title) {
        document.title = translateKnownText(document.title, lang);
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            const parent = node.parentElement;
            if (!parent) return NodeFilter.FILTER_REJECT;
            if (parent.closest('#appLanguageSwitcher')) return NodeFilter.FILTER_REJECT;
            if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE') return NodeFilter.FILTER_REJECT;
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
        const nextText = translateKnownText(node.textContent, lang);
        if (nextText !== node.textContent) {
            node.textContent = nextText;
        }
    });

    const translatableAttrElements = document.querySelectorAll('[placeholder], [title], [aria-label], input[type="submit"], input[type="button"]');
    translatableAttrElements.forEach(el => {
        if (el.closest('#appLanguageSwitcher')) return;

        ['placeholder', 'title', 'aria-label', 'value'].forEach(attr => {
            if (!el.hasAttribute(attr)) return;
            const value = el.getAttribute(attr);
            const nextValue = translateKnownText(value, lang);
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

    const switcher = document.getElementById('appLanguageSwitcherSelect');
    if (switcher && switcher.value !== lang) {
        switcher.value = lang;
    }

    translatePage(lang);
}

function createLanguageSwitcher() {
    if (document.getElementById('appLanguageSwitcher')) return;

    const wrap = document.createElement('div');
    wrap.id = 'appLanguageSwitcher';
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '0.4rem';
    wrap.style.padding = '0.3rem 0.45rem';
    wrap.style.border = '1px solid var(--border-color, #d1d5db)';
    wrap.style.borderRadius = '999px';
    wrap.style.background = 'var(--card-bg, #ffffff)';

    const label = document.createElement('label');
    label.htmlFor = 'appLanguageSwitcherSelect';
    label.textContent = 'Lang';
    label.style.fontSize = '0.78rem';
    label.style.fontWeight = '700';
    label.style.color = 'var(--text-secondary, #6b7280)';

    const select = document.createElement('select');
    select.id = 'appLanguageSwitcherSelect';
    select.setAttribute('aria-label', 'Pilih bahasa');
    select.style.border = 'none';
    select.style.background = 'transparent';
    select.style.fontWeight = '600';
    select.style.fontSize = '0.83rem';
    select.style.color = 'var(--text-primary, #111827)';
    select.style.outline = 'none';
    select.style.cursor = 'pointer';

    const optId = document.createElement('option');
    optId.value = 'id';
    optId.textContent = 'ID';

    const optEn = document.createElement('option');
    optEn.value = 'en';
    optEn.textContent = 'EN';

    select.appendChild(optId);
    select.appendChild(optEn);

    wrap.appendChild(label);
    wrap.appendChild(select);

    const actionHost = document.querySelector('.header-actions')
        || document.querySelector('.top-bar-right')
        || document.querySelector('.login-header')
        || document.querySelector('.login-card')
        || document.querySelector('.main-content');

    if (actionHost) {
        actionHost.insertAdjacentElement('afterbegin', wrap);
    } else {
        wrap.style.position = 'fixed';
        wrap.style.top = '1rem';
        wrap.style.right = '1rem';
        wrap.style.zIndex = '60';
        document.body.appendChild(wrap);
    }

    select.addEventListener('change', (event) => {
        setLanguage(String(event.target.value || 'id'));
    });
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
document.addEventListener('DOMContentLoaded', function() {
    initializeThemeSwitcher();
    initializeLanguageSystem();
    initializeData();
    setupResponsiveSidebarMenu();
    initializeUnifiedNotificationCenter();
    initializeOverlayModalAnimationObserver();
    
    // Check existing session
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('index.html') || currentPath.endsWith('/')) {
        initializeAuthExperience();

        // Login page
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }

        document.querySelectorAll('.google-auth-btn').forEach((button) => {
            button.addEventListener('click', handleGoogleAuth);
        });
        
        // If already logged in, redirect
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            if (currentUser.role === 'admin') {
                window.location.href = 'admin/dashboard.html';
            } else if (currentUser.role === 'user') {
                window.location.href = 'user/dashboard.html';
            }
        }
    } else if (currentPath.includes('signup.html')) {
        initializeAuthExperience();

        const signupForm = document.getElementById('signupForm');
        if (signupForm) {
            signupForm.addEventListener('submit', handleSignUp);
        }

        document.querySelectorAll('.google-auth-btn').forEach((button) => {
            button.addEventListener('click', handleGoogleAuth);
        });

        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
            currentUser = JSON.parse(savedUser);
            if (currentUser.role === 'admin') {
                window.location.href = 'admin/dashboard.html';
            } else if (currentUser.role === 'user') {
                window.location.href = 'user/dashboard.html';
            }
        }
    } else if (currentPath.includes('dashboard.html') && !currentPath.includes('admin')) {
        // User dashboard
        checkAuthStatus();
        if (currentUser && currentUser.role === 'user') {
            initDashboard();
            loadPresensiData();
            updatePresensiList();
            updateButtons();
            updateLeaveList();
        }
    } else if (currentPath.includes('admin')) {
        // Admin dashboard/pages
        checkAuthStatus();
        if (currentUser && currentUser.role === 'admin') {
            // Admin pages will initialize themselves via their specific JS files
        }
    }
});