// Admin Employee Management Page
let adminUbahingEmployeeId = null;
const kpiSliderState = {
    start: 0
};
let employeesCurrentPage = 1;
const employeesPerPage = 5;

function isEnLang() {
    return document.documentElement.getAttribute('lang') === 'en';
}

function t(idText, enText) {
    return isEnLang() ? enText : idText;
}

function appLocale() {
    return isEnLang() ? 'en-US' : 'id-ID';
}

document.addEventListener('DOMContentLoaded', async function() {
    // Check authentication
    checkAuthStatus();
    if (!currentUser || !['admin', 'hr', 'manager', 'finance', 'bod'].includes(currentUser?.role)) {
        window.location.href = '../index.html';
        return;
    }

    // Set user avatar and name
    updateUserDisplay();
    
    // Set up logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            logout(e);
        });
    }

    // Set up sidebar navigation
    setupSidebarNav();

    if (typeof window.syncEmployeesFromApi === 'function') {
        await window.syncEmployeesFromApi().catch(() => {});
    }
    if (typeof window.syncLeavesFromApi === 'function') {
        await window.syncLeavesFromApi().catch(() => {});
    }

    // Load employee data
    loadEmployeeData();

    // Set up add employee button
    document.getElementById('addEmployeeBtn')?.addEventListener('click', addNewEmployee);

    // Set up filters
    document.getElementById('filterDepartment')?.addEventListener('change', () => {
        employeesCurrentPage = 1;
        loadEmployeeData();
    });
    document.getElementById('filterStatus')?.addEventListener('change', () => {
        employeesCurrentPage = 1;
        loadEmployeeData();
    });

    window.addEventListener('appLanguageChanged', () => {
        loadEmployeeData();
        renderKpiSlider();
    });

    window.addEventListener('resize', renderKpiSlider);
    setupKpiSlider();
});

function setupSidebarNav() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            if (this.getAttribute('href') && !this.getAttribute('href').startsWith('#')) {
                return;
            }
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function loadEmployeeData() {
    // Load from latest synced cache
    const stored = localStorage.getItem('employees');
    if (stored) {
        employees = JSON.parse(stored);
    }

    const storedLeaves = localStorage.getItem('leaves');
    if (storedLeaves) {
        leaves = JSON.parse(storedLeaves);
    }

    const activeLeaveEmployeeIds = getActiveLeaveEmployeeIds();
    const employeesWithDisplayStatus = employees.map(emp => ({
        ...emp,
        displayStatus: getEmployeeDisplayStatus(emp, activeLeaveEmployeeIds)
    }));

    // Apply filters
    const deptFilter = document.getElementById('filterDepartment')?.value || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';

    let filteredEmployees = employeesWithDisplayStatus;
    if (deptFilter) {
        filteredEmployees = filteredEmployees.filter(e => e.department === deptFilter);
    }
    if (statusFilter) {
        filteredEmployees = filteredEmployees.filter(e => e.displayStatus === statusFilter);
    }

    // Update stats
    const totalCount = employeesWithDisplayStatus.length;
    const activeCount = employeesWithDisplayStatus.filter(e => e.displayStatus === 'Active').length;
    const onLeaveCount = employeesWithDisplayStatus.filter(e => e.displayStatus === 'On Leave').length;
    const inactiveCount = employeesWithDisplayStatus.filter(e => e.displayStatus === 'Inactive').length;

    document.getElementById('totalEmployeeCount').textContent = totalCount;
    document.getElementById('activeEmployeeCount').textContent = activeCount;
    document.getElementById('onLeaveEmployeeCount').textContent = onLeaveCount;
    document.getElementById('inactiveEmployeeCount').textContent = inactiveCount;

    renderKpiSlider();

    // Load table data
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;

    // Pagination logic
    const totalPages = Math.ceil(filteredEmployees.length / employeesPerPage);
    if (employeesCurrentPage > totalPages && totalPages > 0) employeesCurrentPage = totalPages;
    
    const startIndex = (employeesCurrentPage - 1) * employeesPerPage;
    const displayedEmployees = filteredEmployees.slice(startIndex, startIndex + employeesPerPage);

    // Update info
    const limitInfo = document.getElementById('employeeLimitInfo');
    if (limitInfo) {
        if (filteredEmployees.length > 0) {
            const endNum = Math.min(startIndex + displayedEmployees.length, filteredEmployees.length);
            limitInfo.innerHTML = `<i class="fas fa-info-circle"></i> ${t('Menampilkan ' + (startIndex + 1) + '-' + endNum + ' dari ' + filteredEmployees.length + ' karyawan.', 'Showing ' + (startIndex + 1) + '-' + endNum + ' of ' + filteredEmployees.length + ' employees.')}`;
            limitInfo.style.display = 'block';
        } else {
            limitInfo.style.display = 'none';
        }
    }

    if (displayedEmployees.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">${t('Tidak ada data karyawan.', 'No employees found')}</td></tr>`;
        renderEmployeePagination(0);
        return;
    }

    tbody.innerHTML = displayedEmployees.map((emp, idx) => `
        <tr>
            <td data-label="${t('No', 'No')}"><div class="attendance-cell-content">${startIndex + idx + 1}</div></td>
            <td data-label="${t('Nama', 'Name')}"><div class="attendance-cell-content">${escapeEmployeeHtml(emp.name)}</div></td>
            <td data-label="${t('Email', 'Email')}"><div class="attendance-cell-content">${escapeEmployeeHtml(emp.email || '-')}</div></td>
            <td data-label="${t('Departemen', 'Department')}"><div class="attendance-cell-content">${escapeEmployeeHtml(emp.department || '-')}</div></td>
            <td data-label="${t('Jabatan', 'Position')}"><div class="attendance-cell-content">${escapeEmployeeHtml(emp.position || '-')}</div></td>
            <td data-label="${t('Join Date', 'Join Date')}"><div class="attendance-cell-content">${formatEmployeeJoinDate(emp.joinDate)}</div></td>
            <td data-label="${t('Status', 'Status')}">
                <div class="attendance-cell-content">
                    <span class="badge badge-${getStatusClass(emp.displayStatus)}">${getStatusLabel(emp.displayStatus)}</span>
                    ${emp.displayStatus === 'Inactive' && emp.inactiveReason ? `<div style="margin-top:4px; font-size:0.75rem; color:#6b7280;">${t('Alasan', 'Reason')}: ${escapeEmployeeHtml(emp.inactiveReason)}</div>` : ''}
                </div>
            </td>
            <td data-label="${t('Aksi', 'Actions')}">
                <div class="attendance-cell-content">
                    <button class="btn btn-sm" onclick="editEmployee(${emp.id})">${t('Ubah', 'Ubah')}</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteEmployeeConfirm(${emp.id})">${t('Hapus', 'Delete')}</button>
                </div>
            </td>
        </tr>
    `).join('');

    renderEmployeePagination(totalPages);
}

function renderEmployeePagination(totalPages) {
    const container = document.getElementById('employeePagination');
    if (!container) return;

    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="pagination-controls">
            <button class="btn btn-sm" ${employeesCurrentPage === 1 ? 'disabled' : ''} onclick="changeEmployeePage(-1)">
                <i class="fas fa-chevron-left"></i> ${t('Sebelumnya', 'Previous')}
            </button>
            <span class="page-indicator">${employeesCurrentPage} / ${totalPages}</span>
            <button class="btn btn-sm" ${employeesCurrentPage === totalPages ? 'disabled' : ''} onclick="changeEmployeePage(1)">
                ${t('Selanjutnya', 'Next')} <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
}

function changeEmployeePage(delta) {
    employeesCurrentPage += delta;
    loadEmployeeData();
    // Scroll to table top
    document.querySelector('.card-header h2')?.scrollIntoView({ behavior: 'smooth' });
}

function getActiveLeaveEmployeeIds() {
    if (!Array.isArray(leaves) || leaves.length === 0) {
        return new Set();
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return new Set(
        leaves
            .filter(leave => {
                if (String(leave.status || '').toLowerCase() !== 'approved') return false;

                const start = new Date(leave.startDate);
                const end = new Date(leave.endDate);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;

                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);

                return start <= today && today <= end;
            })
            .map(leave => String(leave.employeeId || ''))
            .filter(Boolean)
    );
}

function getEmployeeDisplayStatus(employee, activeLeaveEmployeeIds) {
    if (employee.status === 'Inactive') return 'Inactive';

    const employeeId = String(employee.id || employee.employeeId || '');
    if (activeLeaveEmployeeIds.has(employeeId)) {
        return 'On Leave';
    }

    return employee.status === 'On Leave' ? 'Active' : (employee.status || 'Active');
}

function getStatusClass(status) {
    if (status === 'Active') return 'success';
    if (status === 'On Leave') return 'warning';
    if (status === 'Inactive') return 'danger';
    return 'secondary';
}

function getStatusLabel(status) {
    if (status === 'Active') return t('Aktif', 'Active');
    if (status === 'On Leave') return t('Sedang Cuti', 'On Leave');
    if (status === 'Inactive') return t('Tidak Aktif', 'Inactive');
    return status || '-';
}

async function addNewEmployee() {
    const name = await askAppPrompt({
        title: t('Tambah Karyawan', 'Add Employee'),
        message: t('Masukkan nama karyawan:', 'Enter employee name:'),
        placeholder: t('Contoh: Andi Saputra', 'Example: John Smith'),
        confirmText: t('Lanjut', 'Next')
    });
    if (!name) return;

    const email = await askAppPrompt({
        title: t('Tambah Karyawan', 'Add Employee'),
        message: t('Masukkan email karyawan:', 'Enter employee email:'),
        placeholder: 'nama@email.com',
        confirmText: t('Lanjut', 'Next')
    });
    if (!email) return;

    const department = await askAppPrompt({
        title: t('Tambah Karyawan', 'Add Employee'),
        message: t('Masukkan departemen (AM, FA-Proc, MFG, HRGA, Project Implementation, Project Management):', 'Enter department (AM, FA-Proc, MFG, HRGA, Project Implementation, Project Management):'),
        placeholder: 'Contoh: AM',
        confirmText: t('Lanjut', 'Next')
    });
    if (!department) return;

    const position = await askAppPrompt({
        title: t('Tambah Karyawan', 'Add Employee'),
        message: t('Masukkan jabatan:', 'Enter position:'),
        placeholder: t('Contoh: Software Engineer', 'Example: Software Engineer'),
        confirmText: t('Lanjut', 'Next')
    });
    if (!position) return;

    const joinDate = await askAppPrompt({
        title: t('Tambah Karyawan', 'Add Employee'),
        message: t('Masukkan tanggal join (YYYY-MM-DD):', 'Enter join date (YYYY-MM-DD):'),
        placeholder: '2026-03-13',
        confirmText: t('Simpan', 'Save')
    });
    if (!joinDate) return;

    const baseUsername = String(email || '').split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase() || `user${Date.now()}`;
    const username = `${baseUsername}${Math.floor(Math.random() * 1000)}`;

    try {
        if (typeof apiRequest === 'function') {
            await apiRequest('/api/employees', {
                method: 'POST',
                body: {
                    name,
                    username,
                    email,
                    department,
                    position,
                    join_date: joinDate,
                    status: 'Active',
                },
            });

            if (typeof window.syncEmployeesFromApi === 'function') {
                await window.syncEmployeesFromApi().catch(() => {});
            }
        } else {
            const newEmployee = {
                id: Math.max(...employees.map(e => e.id || 0), 0) + 1,
                name,
                username,
                email,
                department,
                position,
                joinDate,
                status: 'Active',
                inactiveReason: ''
            };

            employees.push(newEmployee);
            localStorage.setItem('employees', JSON.stringify(employees));
        }

        alert(t('Data karyawan berhasil ditambahkan!', 'Employee added successfully!'));
        loadEmployeeData();
    } catch (error) {
        notify(error?.message || t('Gagal menambahkan karyawan.', 'Failed to add employee.'), 'error');
    }
}

function editEmployee(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    openEmployeeUbahModal(emp);
}

function openEmployeeUbahModal(emp) {
    closeEmployeeUbahModal();

    adminUbahingEmployeeId = emp.id;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'adminEmployeeUbahModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; width: min(900px, 96vw);">
            <div class="modal-header">
                <h3><i class="fas fa-user-edit"></i> Ubah Karyawan</h3>
                <button type="button" class="modal-close" data-employee-edit-close>&times;</button>
            </div>
            <div class="modal-body">
                <form id="adminEmployeeUbahForm" class="elegant-form">
                    <div class="form-section">
                        <h3><i class="fas fa-id-card"></i> Informasi Akun</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminUbahEmployeeName">Nama Lengkap *</label>
                                <input type="text" id="adminUbahEmployeeName" value="${escapeEmployeeHtml(emp.name || '')}" required>
                            </div>
                            <div class="form-group">
                                <label for="adminUbahEmployeeUsername">Username *</label>
                                <input type="text" id="adminUbahEmployeeUsername" value="${escapeEmployeeHtml(emp.username || '')}" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminUbahEmployeeId">Nomor ID</label>
                                <input type="text" id="adminUbahEmployeeId" value="${escapeEmployeeHtml(emp.employeeId || emp.companyId || emp.nik || '')}" placeholder="Masukkan nomor ID perusahaan">
                            </div>
                            <div class="form-group">
                                <label for="adminUbahEmployeeDepartment">Divisi/Departemen</label>
                                <select id="adminUbahEmployeeDepartment">
                                    ${buildEmployeeDepartmentOptions(emp.department || emp.division || emp.divisi || '')}
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminUbahEmployeeEmail">Alamat Email *</label>
                                <input type="email" id="adminUbahEmployeeEmail" value="${escapeEmployeeHtml(emp.email || '')}" required>
                            </div>
                            <div class="form-group">
                                <label for="adminUbahEmployeeContact">Nomor Kontak</label>
                                <input type="text" id="adminUbahEmployeeContact" value="${escapeEmployeeHtml(emp.phone || emp.contact || emp.noHp || emp.noKontak || '')}" placeholder="Nomor telepon aktif">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminUbahEmployeeJenis Kelamin">Jenis Kelamin</label>
                                <select id="adminUbahEmployeeJenis Kelamin">
                                    <option value="" ${!(emp.gender) ? 'selected' : ''}>Pilih gender</option>
                                    <option value="Laki-laki" ${emp.gender === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                                    <option value="Perempuan" ${emp.gender === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="adminUbahEmployeePosition">Posisi</label>
                                <input type="text" id="adminUbahEmployeePosition" value="${escapeEmployeeHtml(emp.position || '')}" placeholder="Contoh: Staff Finance">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminUbahEmployeeJoinDate">Tanggal Bergabung</label>
                                <input type="date" id="adminUbahEmployeeJoinDate" value="${escapeEmployeeHtml(normalizeEmployeeDate(emp.joinDate || emp.tanggalBergabung || ''))}">
                            </div>
                            <div class="form-group" id="adminUbahMaternityDetailGroup" style="display:none;">
                                <label for="adminUbahEmployeeMaternityDetail">Detail Cuti Melahirkan</label>
                                <textarea id="adminUbahEmployeeMaternityDetail" rows="2" placeholder="Contoh: Hak 90 hari, sudah terpakai 30 hari">${escapeEmployeeHtml(emp.maternityLeaveDetail || '')}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3><i class="fas fa-user-check"></i> Peran & Status</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminUbahEmployeeRole">Hak Akses (Role) *</label>
                                <select id="adminUbahEmployeeRole" required>
                                    <option value="karyawan" ${['karyawan', 'user'].includes(emp.role) ? 'selected' : ''}>Karyawan</option>
                                    <option value="hr" ${emp.role === 'hr' ? 'selected' : ''}>HR Admin</option>
                                    <option value="manager" ${emp.role === 'manager' ? 'selected' : ''}>Manager</option>
                                    <option value="finance" ${emp.role === 'finance' ? 'selected' : ''}>Finance</option>
                                    <option value="bod" ${emp.role === 'bod' ? 'selected' : ''}>Board of Directors (BOD)</option>
                                    <option value="admin" ${emp.role === 'admin' ? 'selected' : ''}>Administrator</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="adminUbahEmployeeStatus">Status *</label>
                                <select id="adminUbahEmployeeStatus" required>
                                    <option value="Active" ${emp.status === 'Active' ? 'selected' : ''}>Aktif</option>
                                    <option value="On Leave" ${emp.status === 'On Leave' ? 'selected' : ''}>Sedang Cuti</option>
                                    <option value="Inactive" ${emp.status === 'Inactive' ? 'selected' : ''}>Tidak Aktif</option>
                                </select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminUbahEmployeePassword">Password Baru <small style="color:#6b7280;font-weight:normal;">(kosongkan jika tidak diubah)</small></label>
                                <input type="password" id="adminUbahEmployeePassword" placeholder="Biarkan kosong jika tetap">
                            </div>
                            <div class="form-group" id="adminUbahInactiveReasonGroup" style="display:none;">
                                <label for="adminUbahEmployeeInactiveReason">Alasan Tidak Aktif</label>
                                <input type="text" id="adminUbahEmployeeInactiveReason" value="${escapeEmployeeHtml(emp.inactiveReason || '')}" placeholder="Contoh: kontrak selesai">
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" data-employee-edit-close>
                    <i class="fas fa-times"></i> Batal
                </button>
                <button type="submit" form="adminEmployeeUbahForm" class="btn primary">
                    <i class="fas fa-save"></i> Simpan Perubahan
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (typeof openOverlayModal === 'function') {
        openOverlayModal(modal);
    } else {
        modal.classList.add('open');
    }

    modal.querySelectorAll('[data-employee-edit-close]').forEach(button => {
        button.addEventListener('click', closeEmployeeUbahModal);
    });
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeEmployeeUbahModal();
        }
    });
    modal.querySelector('#adminEmployeeUbahForm')?.addEventListener('submit', handleEmployeeUbahSubmit);
    modal.querySelector('#adminUbahEmployeeJenis Kelamin')?.addEventListener('change', toggleAdminMaternityField);
    modal.querySelector('#adminUbahEmployeeStatus')?.addEventListener('change', toggleAdminInactiveReasonField);

    toggleAdminMaternityField();
    toggleAdminInactiveReasonField();
}

function closeEmployeeUbahModal() {
    const modal = document.getElementById('adminEmployeeUbahModal');
    if (!modal) return;

    adminUbahingEmployeeId = null;
    if (typeof closeOverlayModal === 'function') {
        closeOverlayModal(modal);
        return;
    }
    modal.remove();
}

function toggleAdminMaternityField() {
    const gender = document.getElementById('adminUbahEmployeeJenis Kelamin')?.value || '';
    const group = document.getElementById('adminUbahMaternityDetailGroup');
    if (!group) return;

    group.style.display = String(gender).toLowerCase() === 'perempuan' ? '' : 'none';
}

function toggleAdminInactiveReasonField() {
    const status = document.getElementById('adminUbahEmployeeStatus')?.value || 'Active';
    const group = document.getElementById('adminUbahInactiveReasonGroup');
    const input = document.getElementById('adminUbahEmployeeInactiveReason');
    if (!group || !input) return;

    const isInactive = status === 'Inactive';
    group.style.display = isInactive ? '' : 'none';
    input.required = isInactive;
}

async function handleEmployeeUbahSubmit(event) {
    event.preventDefault();

    const emp = employees.find(item => item.id === adminUbahingEmployeeId);
    if (!emp) {
        notify(t('Data karyawan tidak ditemukan.', 'Employee data not found.'), 'warning');
        closeEmployeeUbahModal();
        return;
    }

    const name = String(document.getElementById('adminUbahEmployeeName')?.value || '').trim();
    const username = String(document.getElementById('adminUbahEmployeeUsername')?.value || '').trim();
    const employeeId = String(document.getElementById('adminUbahEmployeeId')?.value || '').trim();
    const department = String(document.getElementById('adminUbahEmployeeDepartment')?.value || '').trim();
    const email = String(document.getElementById('adminUbahEmployeeEmail')?.value || '').trim();
    const contact = String(document.getElementById('adminUbahEmployeeContact')?.value || '').trim();
    const gender = String(document.getElementById('adminUbahEmployeeJenis Kelamin')?.value || '').trim();
    const position = String(document.getElementById('adminUbahEmployeePosition')?.value || '').trim();
    const joinDate = String(document.getElementById('adminUbahEmployeeJoinDate')?.value || '').trim();
    const maternityLeaveDetail = String(document.getElementById('adminUbahEmployeeMaternityDetail')?.value || '').trim();
    const status = String(document.getElementById('adminUbahEmployeeStatus')?.value || 'Active').trim();
    const role = String(document.getElementById('adminUbahEmployeeRole')?.value || 'karyawan').trim();
    const inactiveReason = String(document.getElementById('adminUbahEmployeeInactiveReason')?.value || '').trim();
    const newPassword = String(document.getElementById('adminUbahEmployeePassword')?.value || '').trim();

    if (!name || !username || !email) {
        notify(t('Nama, username, dan email wajib diisi.', 'Name, username, and email are required.'), 'warning');
        return;
    }

    const usernameTaken = users.some(user => String(user.id) !== String(emp.id) && String(user.username || '').toLowerCase() === username.toLowerCase());
    if (usernameTaken) {
        notify(t('Username sudah digunakan oleh akun lain.', 'Username is already used by another account.'), 'warning');
        return;
    }

    const emailTaken = users.some(user => String(user.id) !== String(emp.id) && String(user.email || '').toLowerCase() === email.toLowerCase());
    if (emailTaken) {
        notify(t('Email sudah digunakan oleh akun lain.', 'Email is already used by another account.'), 'warning');
        return;
    }

    if (status === 'Inactive' && !inactiveReason) {
        notify(t('Alasan tidak aktif wajib diisi.', 'Inactive reason is required.'), 'warning');
        return;
    }

    const nextEmployee = {
        ...emp,
        name,
        username,
        employeeId,
        companyId: employeeId,
        email,
        department,
        division: department,
        divisi: department,
        contact,
        phone: contact,
        noHp: contact,
        noKontak: contact,
        gender,
        position,
        joinDate,
        tanggalBergabung: joinDate,
        maternityLeaveDetail: String(gender).toLowerCase() === 'perempuan' ? maternityLeaveDetail : '',
        status,
        role,
        inactiveReason: status === 'Inactive' ? inactiveReason : '',
        password: newPassword ? newPassword : emp.password
    };

    try {
        if (typeof apiRequest === 'function' && nextEmployee.employeeRowId) {
            await apiRequest(`/api/employees/${Number(nextEmployee.employeeRowId)}`, {
                method: 'PUT',
                body: {
                    name: nextEmployee.name,
                    username: nextEmployee.username,
                    email: nextEmployee.email,
                    department: nextEmployee.department,
                    position: nextEmployee.position,
                    gender: nextEmployee.gender || null,
                    phone: nextEmployee.phone || null,
                    join_date: nextEmployee.joinDate || null,
                    maternity_leave_detail: nextEmployee.maternityLeaveDetail || null,
                    status: nextEmployee.status || 'Active',
                    role: nextEmployee.role || 'karyawan',
                    inactive_reason: nextEmployee.inactiveReason || null,
                    password: newPassword, // akan null/kosong jika tidak diubah
                },
            });

            if (typeof window.syncEmployeesFromApi === 'function') {
                await window.syncEmployeesFromApi().catch(() => {});
            }
        } else {
            const employeeIndex = employees.findIndex(item => item.id === emp.id);
            employees[employeeIndex] = nextEmployee;
            localStorage.setItem('employees', JSON.stringify(employees));
            syncEmployeeUbahToUserAccount(nextEmployee);
        }

        closeEmployeeUbahModal();
        notify(t('Data karyawan berhasil diperbarui.', 'Employee data updated successfully.'), 'success');
        loadEmployeeData();
    } catch (error) {
        notify(error?.message || t('Gagal memperbarui karyawan.', 'Failed to update employee.'), 'error');
    }
}

function syncEmployeeUbahToUserAccount(employee) {
    if (!employee) return;

    const userIndex = users.findIndex(user => String(user.id) === String(employee.id));
    if (userIndex >= 0) {
        users[userIndex] = {
            ...users[userIndex],
            name: employee.name || users[userIndex].name,
            username: employee.username || users[userIndex].username,
            email: employee.email || users[userIndex].email,
            password: employee.password || users[userIndex].password
        };
        persistRegisteredUsers();
    }

    const savedCurrentUser = localStorage.getItem('currentUser');
    if (savedCurrentUser) {
        try {
            const parsed = JSON.parse(savedCurrentUser);
            if (String(parsed.id) === String(employee.id)) {
                const updatedCurrentUser = {
                    ...parsed,
                    name: employee.name || parsed.name,
                    username: employee.username || parsed.username,
                    email: employee.email || parsed.email,
                    password: employee.password || parsed.password
                };
                localStorage.setItem('currentUser', JSON.stringify(updatedCurrentUser));
            }
        } catch (error) {
            // Ignore malformed saved current user.
        }
    }
}

function buildEmployeeDepartmentOptions(selectedValue) {
    const departments = [
        '',
        'AM',
        'FA-Proc',
        'MFG',
        'HRGA',
        'Project Implementation',
        'Project Management'
    ];

    const values = new Set(departments);
    if (selectedValue) values.add(selectedValue);

    return Array.from(values).map(value => {
        const label = value || 'Pilih Divisi/Departemen';
        return `<option value="${escapeEmployeeAttribute(value)}" ${value === selectedValue ? 'selected' : ''}>${escapeEmployeeHtml(label)}</option>`;
    }).join('');
}

function setupKpiSlider() {
    const kpiSection = document.querySelector('.kpi-cards')?.parentElement;
    if (kpiSection && !document.getElementById('employeeKpiSliderNav')) {
        const nav = document.createElement('div');
        nav.className = 'dashboard-slider-nav kpi-slider-nav';
        nav.id = 'employeeKpiSliderNav';
        nav.innerHTML = `
            <button type="button" class="dashboard-slider-btn" id="employeeKpiPrevBtn" aria-label="KPI sebelumnya"><i class="fas fa-chevron-left"></i></button>
            <span class="dashboard-slider-indicator" id="employeeKpiSliderIndicator">1/1</span>
            <button type="button" class="dashboard-slider-btn" id="employeeKpiNextBtn" aria-label="KPI berikutnya"><i class="fas fa-chevron-right"></i></button>
        `;

        const kpiCards = document.querySelector('.kpi-cards');
        if (kpiCards) {
            kpiCards.insertAdjacentElement('beforebegin', nav);
        }

        document.getElementById('employeeKpiPrevBtn')?.addEventListener('click', () => {
            shiftKpiSlider(-1);
        });

        document.getElementById('employeeKpiNextBtn')?.addEventListener('click', () => {
            shiftKpiSlider(1);
        });
    }
    renderKpiSlider();
}

function renderKpiSlider() {
    const cards = Array.from(document.querySelectorAll('.kpi-cards .kpi-card'));
    if (!cards.length) return;

    const isMobile = window.matchMedia('(max-width: 480px)').matches;
    const nav = document.getElementById('employeeKpiSliderNav');
    const prevBtn = document.getElementById('employeeKpiPrevBtn');
    const nextBtn = document.getElementById('employeeKpiNextBtn');
    const indicator = document.getElementById('employeeKpiSliderIndicator');

    if (!isMobile) {
        cards.forEach(card => {
            card.style.display = 'block';
            card.classList.remove('dashboard-slide-item');
        });
        if (nav) nav.style.display = 'none';
        kpiSliderState.start = 0;
        return;
    }

    const viewSize = 1;
    const maxStart = Math.max(0, cards.length - viewSize);
    if (kpiSliderState.start > maxStart) kpiSliderState.start = maxStart;

    cards.forEach((card, index) => {
        const isVisible = index >= kpiSliderState.start && index < kpiSliderState.start + viewSize;
        card.style.display = isVisible ? 'block' : 'none';
        card.classList.toggle('dashboard-slide-item', isVisible);
        if (isVisible) {
            card.style.setProperty('--slide-index', String(index - kpiSliderState.start));
        }
    });

    if (nav) nav.style.display = cards.length > 1 ? 'inline-flex' : 'none';
    if (prevBtn) prevBtn.disabled = kpiSliderState.start === 0;
    if (nextBtn) nextBtn.disabled = kpiSliderState.start >= maxStart;
    if (indicator) indicator.textContent = `${kpiSliderState.start + 1}/${cards.length}`;
}

function shiftKpiSlider(delta) {
    const cards = document.querySelectorAll('.kpi-cards .kpi-card');
    const maxStart = Math.max(0, cards.length - 1);
    kpiSliderState.start = Math.min(maxStart, Math.max(0, kpiSliderState.start + delta));
    renderKpiSlider();
}

function normalizeEmployeeDate(dateValue) {
    if (!dateValue) return '';

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return String(dateValue).match(/^\d{4}-\d{2}-\d{2}$/) ? String(dateValue) : '';
    }

    return date.toISOString().split('T')[0];
}

function escapeEmployeeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function escapeEmployeeAttribute(value) {
    return escapeEmployeeHtml(value).replace(/`/g, '&#96;');
}

function deleteEmployeeConfirm(empId) {
    showAppConfirm({
        title: t('Hapus Karyawan', 'Delete Employee'),
        message: t('Yakin ingin menghapus karyawan ini?', 'Are you sure you want to delete this employee?'),
        confirmText: t('Hapus', 'Delete'),
        cancelText: t('Batal', 'Cancel'),
        variant: 'danger',
        onConfirm: async () => {
            const target = employees.find(e => Number(e.id) === Number(empId));

            try {
                if (typeof apiRequest === 'function' && target?.employeeRowId) {
                    await apiRequest(`/api/employees/${Number(target.employeeRowId)}`, {
                        method: 'DELETE',
                    });
                    if (typeof window.syncEmployeesFromApi === 'function') {
                        await window.syncEmployeesFromApi().catch(() => {});
                    }
                } else {
                    employees = employees.filter(e => e.id !== empId);
                    localStorage.setItem('employees', JSON.stringify(employees));
                }

                alert(t('Data karyawan berhasil dihapus!', 'Employee deleted successfully!'));
                loadEmployeeData();
            } catch (error) {
                notify(error?.message || t('Gagal menghapus karyawan.', 'Failed to delete employee.'), 'error');
            }
        }
    });
}

// Export employee list
document.querySelector('.download-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    exportEmployeesCSV();
});

function exportEmployeesCSV() {
    if (!Array.isArray(employees) || employees.length === 0) {
        notify(t('Tidak ada data karyawan untuk diekspor.', 'No employee data to export.'), 'warning');
        return;
    }

    const exportRows = [...employees].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), appLocale()));

    const rows = [];
    rows.push([t('Laporan Data Karyawan', 'Employee Data Report')]);
    rows.push([t('Dibuat Pada', 'Created At'), formatEmployeeCsvDateTime(new Date())]);
    rows.push([t('Dibuat Oleh', 'Created By'), currentUser?.name || 'Admin']);
    rows.push([t('Total Data', 'Total Data'), formatEmployeeCsvNumber(exportRows.length)]);
    rows.push([]);

    rows.push([
        t('Tanggal Bergabung', 'Join Date'),
        t('Nama', 'Name'),
        t('Email', 'Email'),
        t('Departemen', 'Department'),
        t('Posisi', 'Position'),
        t('Status', 'Status'),
        t('Alasan Tidak Aktif', 'Inactive Reason')
    ]);
    exportRows.forEach(emp => rows.push([
        formatEmployeeJoinDate(emp.joinDate),
        emp.name || '-',
        emp.email || '-',
        emp.department || '-',
        emp.position || '-',
        getStatusLabel(emp.status || '-'),
        emp.inactiveReason || '-'
    ]));

    const csv = rows
        .map(cols => cols.map(escapeEmployeesCsvCell).join(','))
        .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    notify(t('Laporan data karyawan berhasil diunduh.', 'Employee report downloaded successfully.'), 'success');
}

function escapeEmployeesCsvCell(value) {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
}

function formatEmployeeCsvDateTime(dateValue) {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).toLowerCase();
}

function formatEmployeeCsvNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString(appLocale()) : '-';
}

// Search functionality
document.getElementById('searchMasukan')?.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const rows = document.querySelectorAll('#employeeTableBody tr');
    
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(searchTerm) ? '' : 'none';
    });
});

function formatEmployeeJoinDate(dateValue) {
    if (!dateValue) return '-';

    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return String(dateValue);
    }

    return date.toLocaleDateString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}
