// ==================== USER DATA & INITIALIZATION ====================
let currentUser = null;

// Demo users with roles
const users = [
    { id: 1, username: 'admin', password: 'admin', name: 'Administrator', role: 'admin' },
    { id: 2, username: 'user', password: 'user', name: 'Employee User', role: 'user' }
];

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
    }, 3000);
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
}

// ==================== LOGIN & AUTHENTICATION ====================
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
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

function logout() {
    localStorage.removeItem('currentUser');
    currentUser = null;
    window.location.href = '/index.html';
}

function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        
        // Validate user still exists in system
        const userExists = users.find(u => u.id === currentUser.id);
        if (!userExists) {
            logout();
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

// ==================== DASHBOARD FUNCTIONS ====================
function initDashboard() {
    checkAuthStatus();
    if (!currentUser) return;
    
    const pageDate = document.querySelector('.page-date');
    if (pageDate) {
        const today = new Date();
        pageDate.textContent = `Real-time overview of workforce status for ${today.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    
    updateLogoutBtn();
}

function updateLogoutBtn() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Apakah Anda yakin ingin logout?')) {
                logout();
            }
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
    if (confirm('Hapus karyawan ini?')) {
        deleteEmployee(id);
        updateEmployeeList();
    }
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

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeData();
    
    // Check existing session
    const currentPath = window.location.pathname;
    
    if (currentPath.includes('index.html') || currentPath.endsWith('/')) {
        // Login page
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', handleLogin);
        }
        
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