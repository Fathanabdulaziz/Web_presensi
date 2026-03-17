// Admin Employee Management Page
let adminEditingEmployeeId = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check authentication
    checkAuthStatus();
    if (!currentUser || currentUser.role !== 'admin') {
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

    // Load employee data
    loadEmployeeData();

    // Set up add employee button
    document.getElementById('addEmployeeBtn')?.addEventListener('click', addNewEmployee);

    // Set up filters
    document.getElementById('filterDepartment')?.addEventListener('change', loadEmployeeData);
    document.getElementById('filterStatus')?.addEventListener('change', loadEmployeeData);
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
    // Load from localStorage
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

    // Load table data
    const tbody = document.getElementById('employeeTableBody');
    if (!tbody) return;

    if (filteredEmployees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No employees found</td></tr>';
        return;
    }

    tbody.innerHTML = filteredEmployees.map((emp, idx) => `
        <tr>
            <td>${idx + 1}</td>
            <td>${emp.name}</td>
            <td>${emp.email || '-'}</td>
            <td>${emp.department || '-'}</td>
            <td>${emp.position || '-'}</td>
            <td>${formatEmployeeJoinDate(emp.joinDate)}</td>
            <td>
                <span class="badge badge-${getStatusClass(emp.displayStatus)}">${getStatusLabel(emp.displayStatus)}</span>
                ${emp.displayStatus === 'Inactive' && emp.inactiveReason ? `<div style="margin-top:4px; font-size:0.75rem; color:#6b7280;">Alasan: ${emp.inactiveReason}</div>` : ''}
            </td>
            <td>
                <button class="btn btn-sm" onclick="editEmployee(${emp.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEmployeeConfirm(${emp.id})">Delete</button>
            </td>
        </tr>
    `).join('');
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
    const isEnglish = document.documentElement.getAttribute('lang') === 'en';
    if (status === 'Active') return isEnglish ? 'Active' : 'Aktif';
    if (status === 'On Leave') return isEnglish ? 'On Leave' : 'Sedang Cuti';
    if (status === 'Inactive') return isEnglish ? 'Inactive' : 'Tidak Aktif';
    return status || '-';
}

async function addNewEmployee() {
    const name = await askAppPrompt({
        title: 'Tambah Karyawan',
        message: 'Masukkan nama karyawan:',
        placeholder: 'Contoh: Andi Saputra',
        confirmText: 'Lanjut'
    });
    if (!name) return;

    const email = await askAppPrompt({
        title: 'Tambah Karyawan',
        message: 'Masukkan email karyawan:',
        placeholder: 'nama@email.com',
        confirmText: 'Lanjut'
    });
    if (!email) return;

    const department = await askAppPrompt({
        title: 'Tambah Karyawan',
        message: 'Masukkan departemen (AM, FA-Proc, MFG-HRGA, Project Implementation, Project Management):',
        placeholder: 'Contoh: AM',
        confirmText: 'Lanjut'
    });
    if (!department) return;

    const position = await askAppPrompt({
        title: 'Tambah Karyawan',
        message: 'Masukkan jabatan:',
        placeholder: 'Contoh: Software Engineer',
        confirmText: 'Lanjut'
    });
    if (!position) return;

    const joinDate = await askAppPrompt({
        title: 'Tambah Karyawan',
        message: 'Masukkan tanggal join (YYYY-MM-DD):',
        placeholder: '2026-03-13',
        confirmText: 'Simpan'
    });
    if (!joinDate) return;

    const newEmployee = {
        id: Math.max(...employees.map(e => e.id || 0), 0) + 1,
        name,
        email,
        department,
        position,
        joinDate,
        status: 'Active',
        inactiveReason: ''
    };

    employees.push(newEmployee);
    localStorage.setItem('employees', JSON.stringify(employees));
    alert('Employee added successfully!');
    loadEmployeeData();
}

function editEmployee(empId) {
    const emp = employees.find(e => e.id === empId);
    if (!emp) return;

    openEmployeeEditModal(emp);
}

function openEmployeeEditModal(emp) {
    closeEmployeeEditModal();

    adminEditingEmployeeId = emp.id;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'adminEmployeeEditModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 900px; width: min(900px, 96vw);">
            <div class="modal-header">
                <h3><i class="fas fa-user-edit"></i> Edit Karyawan</h3>
                <button type="button" class="modal-close" data-employee-edit-close>&times;</button>
            </div>
            <div class="modal-body">
                <form id="adminEmployeeEditForm" class="elegant-form">
                    <div class="form-section">
                        <h3><i class="fas fa-id-card"></i> Data Akun</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminEditEmployeeName">Nama Lengkap *</label>
                                <input type="text" id="adminEditEmployeeName" value="${escapeEmployeeHtml(emp.name || '')}" required>
                            </div>
                            <div class="form-group">
                                <label for="adminEditEmployeeUsername">Username *</label>
                                <input type="text" id="adminEditEmployeeUsername" value="${escapeEmployeeHtml(emp.username || '')}" required>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminEditEmployeeId">Nomor ID</label>
                                <input type="text" id="adminEditEmployeeId" value="${escapeEmployeeHtml(emp.employeeId || emp.companyId || emp.nik || '')}" placeholder="Masukkan nomor ID perusahaan">
                            </div>
                            <div class="form-group">
                                <label for="adminEditEmployeeDepartment">Divisi/Departemen</label>
                                <select id="adminEditEmployeeDepartment">
                                    ${buildEmployeeDepartmentOptions(emp.department || emp.division || emp.divisi || '')}
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminEditEmployeeEmail">Alamat Email *</label>
                                <input type="email" id="adminEditEmployeeEmail" value="${escapeEmployeeHtml(emp.email || '')}" required>
                            </div>
                            <div class="form-group">
                                <label for="adminEditEmployeeContact">No Kontak</label>
                                <input type="text" id="adminEditEmployeeContact" value="${escapeEmployeeHtml(emp.phone || emp.contact || emp.noHp || emp.noKontak || '')}" placeholder="Nomor telepon aktif">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminEditEmployeeGender">Gender</label>
                                <select id="adminEditEmployeeGender">
                                    <option value="" ${!(emp.gender) ? 'selected' : ''}>Pilih gender</option>
                                    <option value="Laki-laki" ${emp.gender === 'Laki-laki' ? 'selected' : ''}>Laki-laki</option>
                                    <option value="Perempuan" ${emp.gender === 'Perempuan' ? 'selected' : ''}>Perempuan</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="adminEditEmployeePosition">Posisi</label>
                                <input type="text" id="adminEditEmployeePosition" value="${escapeEmployeeHtml(emp.position || '')}" placeholder="Contoh: Staff Finance">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminEditEmployeeJoinDate">Tanggal Bergabung</label>
                                <input type="date" id="adminEditEmployeeJoinDate" value="${escapeEmployeeHtml(normalizeEmployeeDate(emp.joinDate || emp.tanggalBergabung || ''))}">
                            </div>
                            <div class="form-group" id="adminEditMaternityDetailGroup" style="display:none;">
                                <label for="adminEditEmployeeMaternityDetail">Detail Cuti Melahirkan</label>
                                <textarea id="adminEditEmployeeMaternityDetail" rows="2" placeholder="Contoh: Hak 90 hari, sudah terpakai 30 hari">${escapeEmployeeHtml(emp.maternityLeaveDetail || '')}</textarea>
                            </div>
                        </div>
                    </div>

                    <div class="form-section">
                        <h3><i class="fas fa-user-check"></i> Status Karyawan</h3>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="adminEditEmployeeStatus">Status *</label>
                                <select id="adminEditEmployeeStatus" required>
                                    <option value="Active" ${emp.status === 'Active' ? 'selected' : ''}>Aktif</option>
                                    <option value="On Leave" ${emp.status === 'On Leave' ? 'selected' : ''}>Sedang Cuti</option>
                                    <option value="Inactive" ${emp.status === 'Inactive' ? 'selected' : ''}>Tidak Aktif</option>
                                </select>
                            </div>
                            <div class="form-group" id="adminEditInactiveReasonGroup" style="display:none;">
                                <label for="adminEditEmployeeInactiveReason">Alasan Tidak Aktif</label>
                                <input type="text" id="adminEditEmployeeInactiveReason" value="${escapeEmployeeHtml(emp.inactiveReason || '')}" placeholder="Contoh: kontrak selesai">
                            </div>
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" data-employee-edit-close>
                    <i class="fas fa-times"></i> Batal
                </button>
                <button type="submit" form="adminEmployeeEditForm" class="btn primary">
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
        button.addEventListener('click', closeEmployeeEditModal);
    });
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeEmployeeEditModal();
        }
    });
    modal.querySelector('#adminEmployeeEditForm')?.addEventListener('submit', handleEmployeeEditSubmit);
    modal.querySelector('#adminEditEmployeeGender')?.addEventListener('change', toggleAdminMaternityField);
    modal.querySelector('#adminEditEmployeeStatus')?.addEventListener('change', toggleAdminInactiveReasonField);

    toggleAdminMaternityField();
    toggleAdminInactiveReasonField();
}

function closeEmployeeEditModal() {
    const modal = document.getElementById('adminEmployeeEditModal');
    if (!modal) return;

    adminEditingEmployeeId = null;
    if (typeof closeOverlayModal === 'function') {
        closeOverlayModal(modal);
        return;
    }
    modal.remove();
}

function toggleAdminMaternityField() {
    const gender = document.getElementById('adminEditEmployeeGender')?.value || '';
    const group = document.getElementById('adminEditMaternityDetailGroup');
    if (!group) return;

    group.style.display = String(gender).toLowerCase() === 'perempuan' ? '' : 'none';
}

function toggleAdminInactiveReasonField() {
    const status = document.getElementById('adminEditEmployeeStatus')?.value || 'Active';
    const group = document.getElementById('adminEditInactiveReasonGroup');
    const input = document.getElementById('adminEditEmployeeInactiveReason');
    if (!group || !input) return;

    const isInactive = status === 'Inactive';
    group.style.display = isInactive ? '' : 'none';
    input.required = isInactive;
}

function handleEmployeeEditSubmit(event) {
    event.preventDefault();

    const emp = employees.find(item => item.id === adminEditingEmployeeId);
    if (!emp) {
        notify('Data karyawan tidak ditemukan.', 'warning');
        closeEmployeeEditModal();
        return;
    }

    const name = String(document.getElementById('adminEditEmployeeName')?.value || '').trim();
    const username = String(document.getElementById('adminEditEmployeeUsername')?.value || '').trim();
    const employeeId = String(document.getElementById('adminEditEmployeeId')?.value || '').trim();
    const department = String(document.getElementById('adminEditEmployeeDepartment')?.value || '').trim();
    const email = String(document.getElementById('adminEditEmployeeEmail')?.value || '').trim();
    const contact = String(document.getElementById('adminEditEmployeeContact')?.value || '').trim();
    const gender = String(document.getElementById('adminEditEmployeeGender')?.value || '').trim();
    const position = String(document.getElementById('adminEditEmployeePosition')?.value || '').trim();
    const joinDate = String(document.getElementById('adminEditEmployeeJoinDate')?.value || '').trim();
    const maternityLeaveDetail = String(document.getElementById('adminEditEmployeeMaternityDetail')?.value || '').trim();
    const status = String(document.getElementById('adminEditEmployeeStatus')?.value || 'Active').trim();
    const inactiveReason = String(document.getElementById('adminEditEmployeeInactiveReason')?.value || '').trim();

    if (!name || !username || !email) {
        notify('Nama, username, dan email wajib diisi.', 'warning');
        return;
    }

    const usernameTaken = users.some(user => String(user.id) !== String(emp.id) && String(user.username || '').toLowerCase() === username.toLowerCase());
    if (usernameTaken) {
        notify('Username sudah digunakan oleh akun lain.', 'warning');
        return;
    }

    const emailTaken = users.some(user => String(user.id) !== String(emp.id) && String(user.email || '').toLowerCase() === email.toLowerCase());
    if (emailTaken) {
        notify('Email sudah digunakan oleh akun lain.', 'warning');
        return;
    }

    if (status === 'Inactive' && !inactiveReason) {
        notify('Alasan tidak aktif wajib diisi.', 'warning');
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
        inactiveReason: status === 'Inactive' ? inactiveReason : ''
    };

    const employeeIndex = employees.findIndex(item => item.id === emp.id);
    employees[employeeIndex] = nextEmployee;
    localStorage.setItem('employees', JSON.stringify(employees));

    syncEmployeeEditToUserAccount(nextEmployee);

    closeEmployeeEditModal();
    notify('Data karyawan berhasil diperbarui.', 'success');
    loadEmployeeData();
}

function syncEmployeeEditToUserAccount(employee) {
    if (!employee) return;

    const userIndex = users.findIndex(user => String(user.id) === String(employee.id));
    if (userIndex >= 0) {
        users[userIndex] = {
            ...users[userIndex],
            name: employee.name || users[userIndex].name,
            username: employee.username || users[userIndex].username,
            email: employee.email || users[userIndex].email
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
                    email: employee.email || parsed.email
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
        'MFG-HRGA',
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
        title: 'Hapus Karyawan',
        message: 'Yakin ingin menghapus karyawan ini?',
        confirmText: 'Hapus',
        cancelText: 'Batal',
        variant: 'danger',
        onConfirm: () => {
            employees = employees.filter(e => e.id !== empId);
            localStorage.setItem('employees', JSON.stringify(employees));
            alert('Employee deleted successfully!');
            loadEmployeeData();
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
        notify('Tidak ada data karyawan untuk diekspor.', 'warning');
        return;
    }

    const exportRows = [...employees].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'id-ID'));

    const rows = [];
    rows.push(['Laporan Data Karyawan']);
    rows.push(['Dibuat Pada', formatEmployeeCsvDateTime(new Date())]);
    rows.push(['Dibuat Oleh', currentUser?.name || 'Admin']);
    rows.push(['Total Data', formatEmployeeCsvNumber(exportRows.length)]);
    rows.push([]);

    rows.push(['Tanggal Bergabung', 'Nama', 'Email', 'Departemen', 'Posisi', 'Status', 'Alasan Tidak Aktif']);
    exportRows.forEach(emp => rows.push([
        formatEmployeeJoinDate(emp.joinDate),
        emp.name || '-',
        emp.email || '-',
        emp.department || '-',
        emp.position || '-',
        emp.status || '-',
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

    notify('Laporan data karyawan berhasil diunduh.', 'success');
}

function escapeEmployeesCsvCell(value) {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
}

function formatEmployeeCsvDateTime(dateValue) {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString('id-ID', {
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
    return Number.isFinite(num) ? num.toLocaleString('id-ID') : '-';
}

// Search functionality
document.getElementById('searchInput')?.addEventListener('input', function(e) {
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

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}
