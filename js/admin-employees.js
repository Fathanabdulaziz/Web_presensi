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
            <td>${emp.joinDate || '-'}</td>
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

function addNewEmployee() {
    const name = prompt('Enter employee name:');
    if (!name) return;

    const email = prompt('Enter employee email:');
    if (!email) return;

    const department = prompt('Enter department (HR, IT, Finance, Operations, Marketing):');
    if (!department) return;

    const position = prompt('Enter position:');
    if (!position) return;

    const joinDate = prompt('Enter join date (YYYY-MM-DD):');
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

    const name = prompt('Edit employee name:', emp.name);
    if (name === null) return;

    const email = prompt('Edit email:', emp.email);
    if (email === null) return;

    const department = prompt('Edit department:', emp.department);
    if (department === null) return;

    const position = prompt('Edit position:', emp.position);
    if (position === null) return;

    const status = prompt('Edit status (Active, Inactive, On Leave):', emp.status);
    if (status === null) return;

    let inactiveReason = emp.inactiveReason || '';
    if (status === 'Inactive') {
        const reasonInput = prompt('Alasan tidak aktif (keluar, pensiun, kontrak selesai, lainnya):', inactiveReason || 'keluar');
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
    if (confirm('Are you sure you want to delete this employee?')) {
        employees = employees.filter(e => e.id !== empId);
        localStorage.setItem('employees', JSON.stringify(employees));
        alert('Employee deleted successfully!');
        loadEmployeeData();
    }
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

    const header = ['Nama', 'Email', 'Departemen', 'Posisi', 'Tanggal Bergabung', 'Status', 'Alasan Tidak Aktif'];
    const rows = employees.map(emp => [
        emp.name || '-',
        emp.email || '-',
        emp.department || '-',
        emp.position || '-',
        emp.joinDate || '-',
        emp.status || '-',
        emp.inactiveReason || '-'
    ]);

    const csv = [header, ...rows]
        .map(cols => cols.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
