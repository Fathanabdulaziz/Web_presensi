// Admin Employee Management Page
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

    // Apply filters
    const deptFilter = document.getElementById('filterDepartment')?.value || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';

    let filteredEmployees = employees;
    if (deptFilter) {
        filteredEmployees = filteredEmployees.filter(e => e.department === deptFilter);
    }
    if (statusFilter) {
        filteredEmployees = filteredEmployees.filter(e => e.status === statusFilter);
    }

    // Update stats
    const totalCount = employees.length;
    const activeCount = employees.filter(e => e.status === 'Active').length;
    const onLeaveCount = employees.filter(e => e.status === 'On Leave').length;
    const inactiveCount = employees.filter(e => e.status === 'Inactive').length;

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
                <span class="badge badge-${getStatusClass(emp.status)}">${emp.status}</span>
                ${emp.status === 'Inactive' && emp.inactiveReason ? `<div style="margin-top:4px; font-size:0.75rem; color:#6b7280;">Alasan: ${emp.inactiveReason}</div>` : ''}
            </td>
            <td>
                <button class="btn btn-sm" onclick="editEmployee(${emp.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteEmployeeConfirm(${emp.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function getStatusClass(status) {
    if (status === 'Active') return 'success';
    if (status === 'On Leave') return 'warning';
    if (status === 'Inactive') return 'danger';
    return 'secondary';
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

    editEmployeeFlow(emp);
}

async function editEmployeeFlow(emp) {
    const name = await askAppPrompt({
        title: 'Edit Karyawan',
        message: 'Edit nama karyawan:',
        defaultValue: emp.name || '',
        confirmText: 'Lanjut'
    });
    if (name === null) return;

    const email = await askAppPrompt({
        title: 'Edit Karyawan',
        message: 'Edit email:',
        defaultValue: emp.email || '',
        confirmText: 'Lanjut'
    });
    if (email === null) return;

    const department = await askAppPrompt({
        title: 'Edit Karyawan',
        message: 'Edit departemen (AM, FA-Proc, MFG-HRGA, Project Implementation, Project Management):',
        defaultValue: emp.department || '',
        confirmText: 'Lanjut'
    });
    if (department === null) return;

    const position = await askAppPrompt({
        title: 'Edit Karyawan',
        message: 'Edit jabatan:',
        defaultValue: emp.position || '',
        confirmText: 'Lanjut'
    });
    if (position === null) return;

    const status = await askAppPrompt({
        title: 'Edit Karyawan',
        message: 'Edit status (Active, Inactive, On Leave):',
        defaultValue: emp.status || 'Active',
        confirmText: 'Lanjut'
    });
    if (status === null) return;

    let inactiveReason = emp.inactiveReason || '';
    if (status === 'Inactive') {
        const reasonInput = await askAppPrompt({
            title: 'Alasan Tidak Aktif',
            message: 'Isi alasan tidak aktif (keluar, pensiun, kontrak selesai, lainnya):',
            defaultValue: inactiveReason || 'keluar',
            confirmText: 'Simpan'
        });
        if (reasonInput === null) return;
        inactiveReason = String(reasonInput).trim() || 'lainnya';
    } else {
        inactiveReason = '';
    }

    emp.name = name;
    emp.email = email;
    emp.department = department;
    emp.position = position;
    emp.status = status;
    emp.inactiveReason = inactiveReason;

    localStorage.setItem('employees', JSON.stringify(employees));
    alert('Employee updated successfully!');
    loadEmployeeData();
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
