// ==================== ADMIN INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    if (!currentUser || !['admin', 'hr', 'manager', 'finance'].includes(currentUser?.role)) {
        window.location.href = 'index.html';
        return;
    }

    initializeSidebar();
    initializeModals();
    loadEmployees();
    setupEventListeners();
});

// ==================== SIDEBAR NAVIGATION ====================
function initializeSidebar() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.section');

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            // if the link points to a real page rather than an in-page section, let
            // the browser handle navigation (no preventDefault)
            if (href && !href.startsWith('#')) {
                return; // dashboard.html link should work normally
            }
            e.preventDefault();
            const section = href.substring(1);
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');

            // Show section
            sections.forEach(sec => sec.classList.remove('active'));
            const targetSection = document.getElementById(`${section}-section`);
            if (targetSection) {
                targetSection.classList.add('active');
                
                // Load data for section
                if (section === 'employees') loadEmployees();
                else if (section === 'attendance') loadAttendance();
                else if (section === 'leaves') loadLeaves();
                else if (section === 'announcements') loadAnnouncements();
                else if (section === 'reports') loadReports();
            }
        });
    });
}

// ==================== MODAL MANAGEMENT ====================
function initializeModals() {
    // Employee Modal
    const employeeModal = document.getElementById('employeeModal');
    const employeeForm = document.getElementById('employeeForm');
    const addEmployeeBtn = document.getElementById('addEmployeeBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const closeButtons = document.querySelectorAll('.close');

    if (addEmployeeBtn) {
        addEmployeeBtn.addEventListener('click', openEmployeeModal);
    }

    if (employeeForm) {
        employeeForm.addEventListener('submit', saveEmployee);
    }

    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeEmployeeModal);
    }

    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Announcement Modal
    const announcementModal = document.getElementById('announcementModal');
    const announcementForm = document.getElementById('announcementForm');
    const addAnnouncementBtn = document.getElementById('addAnnouncementBtn');
    const cancelAnnouncementBtn = document.getElementById('cancelAnnouncementBtn');

    if (addAnnouncementBtn) {
        addAnnouncementBtn.addEventListener('click', openAnnouncementModal);
    }

    if (announcementForm) {
        announcementForm.addEventListener('submit', saveAnnouncement);
    }

    if (cancelAnnouncementBtn) {
        cancelAnnouncementBtn.addEventListener('click', closeAnnouncementModal);
    }

    window.addEventListener('click', function(e) {
        if (e.target === employeeModal) {
            closeEmployeeModal();
        }
        if (e.target === announcementModal) {
            closeAnnouncementModal();
        }
    });
}

function openEmployeeModal() {
    document.getElementById('employeeId').value = '';
    document.getElementById('employeeForm').reset();
    document.getElementById('modalTitle').textContent = 'Add Employee';
    document.getElementById('employeeModal').style.display = 'block';
}

function closeEmployeeModal() {
    document.getElementById('employeeModal').style.display = 'none';
}

function openAnnouncementModal() {
    document.getElementById('announcementId').value = '';
    document.getElementById('announcementForm').reset();
    document.getElementById('announcementModal').style.display = 'block';
}

function closeAnnouncementModal() {
    document.getElementById('announcementModal').style.display = 'none';
}

// ==================== EMPLOYEE FUNCTIONS ====================
function loadEmployees() {
    const tbody = document.getElementById('employeeTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (employees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No employees data</td></tr>';
        return;
    }

    employees.forEach((emp, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-searchable', emp.name + ' ' + emp.email + ' ' + emp.department);
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${emp.name}</td>
            <td>${emp.email}</td>
            <td>${emp.department}</td>
            <td>${emp.position}</td>
            <td>${formatDate(emp.joinDate)}</td>
            <td><span class="badge badge-${emp.status.toLowerCase()}">${emp.status}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="editEmployeeModal(${emp.id})">Ubah</button>
                <button class="btn btn-sm btn-danger" onclick="confirmDeleteEmployee(${emp.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editEmployeeModal(id) {
    const emp = employees.find(e => e.id === id);
    if (!emp) return;

    document.getElementById('employeeId').value = emp.id;
    document.getElementById('employeeName').value = emp.name;
    document.getElementById('employeeEmail').value = emp.email;
    document.getElementById('employeeDepartment').value = emp.department;
    document.getElementById('employeePosition').value = emp.position;
    document.getElementById('employeeJoinDate').value = emp.joinDate;
    document.getElementById('employeeStatus').value = emp.status;
    document.getElementById('modalTitle').textContent = 'Ubah Employee';
    document.getElementById('employeeModal').style.display = 'block';
}

function saveEmployee(e) {
    e.preventDefault();

    const id = document.getElementById('employeeId').value;
    const employee = {
        name: document.getElementById('employeeName').value,
        email: document.getElementById('employeeEmail').value,
        department: document.getElementById('employeeDepartment').value,
        position: document.getElementById('employeePosition').value,
        joinDate: document.getElementById('employeeJoinDate').value,
        status: document.getElementById('employeeStatus').value
    };

    if (id) {
        updateEmployee(parseInt(id), employee);
        alert('Employee updated successfully!');
    } else {
        addEmployee(employee);
        alert('Employee added successfully!');
    }

    closeEmployeeModal();
    loadEmployees();
}

function confirmDeleteEmployee(id) {
    if (confirm('Are you sure you want to delete this employee?')) {
        deleteEmployee(id);
        loadEmployees();
    }
}

// ==================== ATTENDANCE FUNCTIONS ====================
function loadAttendance() {
    const tbody = document.getElementById('attendanceTable');
    if (!tbody) return;

    const date = document.getElementById('attendanceDate')?.value || new Date().toISOString().split('T')[0];
    const dateAttendance = attendance.filter(a => a.date === date);

    tbody.innerHTML = '';

    if (dateAttendance.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No attendance data for this date</td></tr>';
        return;
    }

    dateAttendance.forEach(att => {
        const emp = employees.find(e => e.id === att.employeeId);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${emp ? emp.name : 'Unknown'}</td>
            <td>${att.checkIn || '-'}</td>
            <td>${att.checkOut || '-'}</td>
            <td><span class="badge badge-${getAttendanceStatus(att.checkIn, att.checkOut).toLowerCase()}">${getAttendanceStatus(att.checkIn, att.checkOut)}</span></td>
            <td>${calculateWorkingHours(att.checkIn, att.checkOut)}</td>
        `;
        tbody.appendChild(row);
    });
}

// ==================== LEAVE FUNCTIONS ====================
function loadLeaves() {
    const tbody = document.getElementById('leaveTable');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (leaves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No leave requests</td></tr>';
        return;
    }

    leaves.forEach(leave => {
        const emp = employees.find(e => e.id === leave.employeeId);
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${emp ? emp.name : 'Unknown'}</td>
            <td>${leave.type || 'Annual'}</td>
            <td>${formatDate(leave.startDate)}</td>
            <td>${formatDate(leave.endDate)}</td>
            <td>${leave.reason}</td>
            <td><span class="badge badge-${leave.status.toLowerCase()}">${leave.status}</span></td>
            <td>
                ${leave.status === 'Tertunda' ? `
                    <button class="btn btn-sm btn-success" onclick="approveLeaveRequest(${leave.id})">Setujui</button>
                    <button class="btn btn-sm btn-danger" onclick="rejectLeaveRequest(${leave.id})">Tolak</button>
                ` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

function approveLeaveRequest(leaveId) {
    approveLeave(leaveId);
    alert('Leave approved!');
    loadLeaves();
}

function rejectLeaveRequest(leaveId) {
    const reason = prompt('Tolakion reason:');
    if (reason) {
        rejectLeave(leaveId, reason);
        alert('Leave rejected!');
        loadLeaves();
    }
}

// ==================== ANNOUNCEMENT FUNCTIONS ====================
function loadAnnouncements() {
    const grid = document.getElementById('announcementsGrid');
    if (!grid) return;

    grid.innerHTML = '';

    if (announcements.length === 0) {
        grid.innerHTML = '<p class="text-center">No announcements yet</p>';
        return;
    }

    announcements.forEach(ann => {
        const categoryClass = ann.category.toLowerCase();
        const item = document.createElement('div');
        item.className = 'announcement-item';
        item.style.borderLeftColor = getCategoryColor(ann.category);
        item.innerHTML = `
            <div class="announcement-badge ${categoryClass}">📋 ${ann.category}</div>
            <div class="announcement-date">${formatDate(ann.date)}</div>
            <h3>${ann.title}</h3>
            <p>${ann.content}</p>
            <small>Posted by ${ann.author}</small>
            <br>
            <button class="btn btn-sm btn-danger" onclick="deleteAnnouncementConfirm(${ann.id})" style="margin-top: 10px;">Delete</button>
        `;
        grid.appendChild(item);
    });
}

function getCategoryColor(category) {
    const colors = {
        'Policy': '#3b82f6',
        'Event': '#a855f7',
        'Health': '#10b981',
        'General': '#f97316'
    };
    return colors[category] || '#3b82f6';
}

function saveAnnouncement(e) {
    e.preventDefault();

    const announcement = {
        title: document.getElementById('announcementTitle').value,
        category: document.getElementById('announcementCategory').value,
        content: document.getElementById('announcementContent').value,
        date: document.getElementById('announcementDate').value || new Date().toISOString().split('T')[0]
    };

    addAnnouncement(announcement);
    alert('Announcement posted successfully!');
    closeAnnouncementModal();
    loadAnnouncements();
}

function deleteAnnouncementConfirm(id) {
    if (confirm('Delete this announcement?')) {
        deleteAnnouncement(id);
        loadAnnouncements();
    }
}

// ==================== REPORTS FUNCTIONS ====================
function loadReports() {
    loadAttendanceSummary();
    loadLeaveSummary();
}

function loadAttendanceSummary() {
    const summary = document.getElementById('attendanceSummary');
    if (!summary) return;

    const present = attendance.filter(a => a.checkIn).length;
    const absent = employees.length - present;
    const onTime = attendance.filter(a => {
        const hour = parseInt(a.checkIn?.split(':')[0] || 24);
        return hour <= 9;
    }).length;
    const late = attendance.filter(a => {
        const hour = parseInt(a.checkIn?.split(':')[0] || 0);
        return hour > 9;
    }).length;

    summary.innerHTML = `
        <div class="report-stat">
            <span class="label">Total Employees:</span>
            <span class="value">${employees.length}</span>
        </div>
        <div class="report-stat">
            <span class="label">Present:</span>
            <span class="value" style="color: #10b981;">${present}</span>
        </div>
        <div class="report-stat">
            <span class="label">Absent:</span>
            <span class="value" style="color: #ef4444;">${absent}</span>
        </div>
        <div class="report-stat">
            <span class="label">On Time:</span>
            <span class="value" style="color: #3b82f6;">${onTime}</span>
        </div>
        <div class="report-stat">
            <span class="label">Late:</span>
            <span class="value" style="color: #f97316;">${late}</span>
        </div>
    `;
}

function loadLeaveSummary() {
    const summary = document.getElementById('leaveSummary');
    if (!summary) return;

    const pending = leaves.filter(l => l.status === 'Tertunda').length;
    const approved = leaves.filter(l => l.status === 'Setujuid').length;
    const rejected = leaves.filter(l => l.status === 'Tolaked').length;
    const total = leaves.length;

    summary.innerHTML = `
        <div class="report-stat">
            <span class="label">Total Requests:</span>
            <span class="value">${total}</span>
        </div>
        <div class="report-stat">
            <span class="label">Tertunda:</span>
            <span class="value" style="color: #f97316;">${pending}</span>
        </div>
        <div class="report-stat">
            <span class="label">Setujuid:</span>
            <span class="value" style="color: #10b981;">${approved}</span>
        </div>
        <div class="report-stat">
            <span class="label">Tolaked:</span>
            <span class="value" style="color: #ef4444;">${rejected}</span>
        </div>
    `;
}

// ==================== SETUP EVENT LISTENERS ====================
function setupEventListeners() {
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            logout(e);
        });
    }

    // Search functionality
    const searchMasukan = document.getElementById('searchMasukan');
    if (searchMasukan) {
        searchMasukan.addEventListener('input', function() {
            const activeSection = document.querySelector('.section.active');
            if (activeSection && activeSection.id === 'employees-section') {
                handleSearch(this.value, 'employees-section');
            }
        });
    }

    // Attendance date filter
    const attendanceDate = document.getElementById('attendanceDate');
    if (attendanceDate) {
        attendanceDate.addEventListener('change', loadAttendance);
    }
}

// ==================== BADGE STYLES ====================
const style = document.createElement('style');
style.textContent = `
    .badge {
        display: inline-block;
        padding: 0.375rem 0.75rem;
        border-radius: 0.375rem;
        font-size: 0.8rem;
        font-weight: 600;
    }

    .badge-active {
        background-color: rgba(16, 185, 129, 0.1);
        color: #10b981;
    }

    .badge-inactive {
        background-color: rgba(239, 68, 68, 0.1);
        color: #ef4444;
    }

    .badge-on-leave {
        background-color: rgba(59, 130, 246, 0.1);
        color: #3b82f6;
    }

    .badge-pending {
        background-color: rgba(249, 115, 22, 0.1);
        color: #f97316;
    }

    .badge-approved {
        background-color: rgba(16, 185, 129, 0.1);
        color: #10b981;
    }

    .badge-rejected {
        background-color: rgba(239, 68, 68, 0.1);
        color: #ef4444;
    }

    .badge-on-time {
        background-color: rgba(16, 185, 129, 0.1);
        color: #10b981;
    }

    .badge-late {
        background-color: rgba(249, 115, 22, 0.1);
        color: #f97316;
    }

    .badge-absent {
        background-color: rgba(239, 68, 68, 0.1);
        color: #ef4444;
    }

    .btn {
        padding: 0.5rem 1rem;
        border: none;
        border-radius: 0.375rem;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
        font-size: 0.9rem;
    }

    .btn-primary {
        background-color: #3b82f6;
        color: white;
    }

    .btn-primary:hover {
        background-color: #1e40af;
    }

    .btn-secondary {
        background-color: #6b7280;
        color: white;
    }

    .btn-success {
        background-color: #10b981;
        color: white;
    }

    .btn-danger {
        background-color: #ef4444;
        color: white;
    }

    .btn-info {
        background-color: #0ea5e9;
        color: white;
    }

    .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.8rem;
    }

    .text-center {
        text-align: center;
    }

    .report-stat {
        display: flex;
        justify-content: space-between;
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;
    }

    .report-stat:last-child {
        border-bottom: none;
    }

    .report-stat .label {
        font-weight: 600;
        color: #6b7280;
    }

    .report-stat .value {
        font-weight: 700;
        font-size: 1.25rem;
    }

    .form-group-stack {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .form-group {
        display: flex;
        flex-direction: column;
    }

    .form-group label {
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #374151;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.375rem;
        font-size: 0.95rem;
        font-family: inherit;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-actions {
        display: flex;
        gap: 1rem;
        justify-content: flex-end;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e5e7eb;
    }

    .modal {
        display: none;
        position: fixed;
        z-index: 2000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
    }

    .modal-content {
        background-color: white;
        margin: 5% auto;
        padding: 2rem;
        border-radius: 0.75rem;
        width: 90%;
        max-width: 600px;
        box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
    }

    .close {
        color: #6b7280;
        float: right;
        font-size: 1.5rem;
        font-weight: 700;
        cursor: pointer;
        transition: color 0.3s ease;
    }

    .close:hover {
        color: #111827;
    }

    .grid {
        display: grid;
        gap: 1.5rem;
    }

    .grid-2 {
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    }

    .section {
        display: none;
    }

    .section.active {
        display: block;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    .section-header h1 {
        font-size: 1.875rem;
        font-weight: 700;
    }

    .table-responsive {
        overflow-x: auto;
    }

    .data-table {
        width: 100%;
        border-collapse: collapse;
    }

    .data-table thead tr {
        background-color: #f9fafb;
        border-bottom: 2px solid #e5e7eb;
    }

    .data-table th {
        padding: 1rem;
        text-align: left;
        font-weight: 600;
        color: #374151;
    }

    .data-table td {
        padding: 1rem;
        border-bottom: 1px solid #e5e7eb;
    }

    .data-table tbody tr:hover {
        background-color: #f9fafb;
    }
`;
document.head.appendChild(style);
