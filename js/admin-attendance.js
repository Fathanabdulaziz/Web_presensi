// Admin Attendance Page
// Dummy attendance data
const dummyAttendanceData = [
    { id: 1, employee: 'Sarah Jenkins', department: 'HR', date: '2024-01-15', checkIn: '08:45', checkOut: '17:30', status: 'Present', initials: 'SJ' },
    { id: 2, employee: 'Michael Chen', department: 'IT', date: '2024-01-15', checkIn: '09:05', checkOut: '17:45', status: 'Late', initials: 'MC' },
    { id: 3, employee: 'Emily Davis', department: 'Finance', date: '2024-01-15', checkIn: '08:30', checkOut: '17:00', status: 'Present', initials: 'ED' },
    { id: 4, employee: 'David Wilson', department: 'Operations', date: '2024-01-15', checkIn: null, checkOut: null, status: 'Absent', initials: 'DW' },
    { id: 5, employee: 'Jessica Lee', department: 'Marketing', date: '2024-01-15', checkIn: '08:50', checkOut: '17:15', status: 'Present', initials: 'JL' },
    { id: 6, employee: 'James Brown', department: 'HR', date: '2024-01-15', checkIn: '09:20', checkOut: '17:35', status: 'Late', initials: 'JB' },
    { id: 7, employee: 'Anna Martinez', department: 'IT', date: '2024-01-15', checkIn: '08:55', checkOut: '17:45', status: 'Present', initials: 'AM' },
    { id: 8, employee: 'Robert Taylor', department: 'Finance', date: '2024-01-15', checkIn: '08:40', checkOut: '16:50', status: 'Present', initials: 'RT' },
    { id: 9, employee: 'Susan Anderson', department: 'Operations', date: '2024-01-14', checkIn: '08:45', checkOut: '17:30', status: 'Present', initials: 'SA' },
    { id: 10, employee: 'Thomas White', department: 'Marketing', date: '2024-01-14', checkIn: '09:30', checkOut: '17:50', status: 'Late', initials: 'TW' },
];

let attendanceRecords = [];
let filteredAttendance = [];
let currentPage = 1;
const itemsPerPage = 4;

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
            e.preventDefault();
            if (confirm('Apakah Anda yakin ingin logout?')) {
                logout();
            }
        });
    }

    // Set up sidebar navigation
    setupSidebarNav();

    // Load attendance data
    loadAttendanceData();

    // Set up filter event listeners
    document.getElementById('filterEmployee')?.addEventListener('input', filterAttendanceRecords);
    document.getElementById('filterDepartment')?.addEventListener('change', filterAttendanceRecords);
    document.getElementById('filterDate')?.addEventListener('change', filterAttendanceRecords);
    document.getElementById('filterStatus')?.addEventListener('change', filterAttendanceRecords);

    // Set up pagination buttons
    document.getElementById('prevBtn')?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderAttendanceList();
        }
    });
    document.getElementById('nextBtn')?.addEventListener('click', () => {
        const maxPage = Math.ceil(filteredAttendance.length / itemsPerPage);
        if (currentPage < maxPage) {
            currentPage++;
            renderAttendanceList();
        }
    });

    // Export CSV functionality
    document.querySelector('.download-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        exportAttendanceCSV();
    });
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

function loadAttendanceData() {
    // Use dummy data instead of presensiData
    attendanceRecords = dummyAttendanceData.map(record => ({
        username: record.employee,
        date: record.date,
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        department: record.department,
        initials: record.initials,
        status: record.status
    }));

    filterAttendanceRecords();
}

function loadAttendanceRecords() {
    loadAttendanceData();
}

function filterAttendanceRecords() {
    const employeeFilter = document.getElementById('filterEmployee')?.value.toLowerCase() || '';
    const departmentFilter = document.getElementById('filterDepartment')?.value || '';
    const dateFilter = document.getElementById('filterDate')?.value || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';

    filteredAttendance = attendanceRecords.filter(record => {
        // Apply employee filter
        if (employeeFilter && !record.username.toLowerCase().includes(employeeFilter)) {
            return false;
        }

        // Apply department filter
        if (departmentFilter && record.department !== departmentFilter) {
            return false;
        }

        // Apply date filter
        if (dateFilter && record.date !== dateFilter) {
            return false;
        }

        // Apply status filter
        if (statusFilter) {
            const checkInTime = record.checkIn ? parseInt(record.checkIn.split(':')[0]) : null;
            if (statusFilter === 'Late' && (!checkInTime || checkInTime <= 9)) {
                return false;
            }
            if (statusFilter === 'Present' && (!record.checkIn || !record.checkOut)) {
                return false;
            }
            if (statusFilter === 'Absent' && (record.checkIn || record.checkOut)) {
                return false;
            }
        }

        return true;
    });

    currentPage = 1;
    renderAttendanceList();
}

function renderAttendanceList() {
    const container = document.getElementById('attendanceListContainer');
    if (!container) return;

    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageItems = filteredAttendance.slice(start, end);

    if (filteredAttendance.length === 0) {
        container.innerHTML = '<div style="padding: 2rem; text-align: center; color: #6b7280;">No attendance records found</div>';
        updatePagination();
        return;
    }

    container.innerHTML = `
        <div>
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr; gap: 0; border-bottom: 2px solid #e5e7eb; padding: 1rem 1.5rem; font-weight: 700; font-size: 0.85rem; color: #6b7280; background: #f9fafb;">
                <div>Employee</div>
                <div>Date</div>
                <div>Clock-in</div>
                <div>Clock-out</div>
                <div>Total Hours</div>
                <div>GPS Location</div>
                <div>Face Verification</div>
            </div>
            ${pageItems.map(record => {
                const checkInTime = record.checkIn ? parseInt(record.checkIn.split(':')[0]) : null;
                const isLate = checkInTime && checkInTime > 9;
                const hoursWorked = record.checkIn && record.checkOut ? calculateHours(record.checkIn, record.checkOut) : '-';
                const statusText = !record.checkIn && !record.checkOut ? 'Absent - No clock-in record' : isLate ? `${record.checkIn}` : `${record.checkIn}`;
                const statusColor = !record.checkIn && !record.checkOut ? '#ef4444' : isLate ? '#f97316' : '#10b981';
                const statusBadge = !record.checkIn && !record.checkOut ? '' : isLate ? '🔔' : '✓';

                return `
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr; gap: 0; padding: 1rem 1.5rem; border-bottom: 1px solid #f3f4f6; align-items: center; background: #fff;">
                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.85rem;">${record.initials}</div>
                            <div>
                                <div style="font-weight: 600; color: #111827; font-size: 0.95rem;">${record.username}</div>
                                <div style="font-size: 0.8rem; color: #6b7280;">${record.department}</div>
                            </div>
                        </div>
                        <div style="color: #6b7280; font-size: 0.95rem;">${formatDate(record.date)}</div>
                        <div style="color: ${statusColor}; font-weight: 600; font-size: 0.95rem;">${statusText}</div>
                        <div style="color: #6b7280; font-size: 0.95rem;">${record.checkOut || '—'}</div>
                        <div style="font-weight: 600; color: #111827; font-size: 0.95rem;">${hoursWorked}</div>
                        <div style="text-align: center; font-size: 0.8rem; color: #6b7280;">
                            ${record.checkIn ? '📍 Office HQ' : '—'}
                        </div>
                        <div style="text-align: center;">
                            ${record.checkIn ? '<div style="width: 28px; height: 28px; border-radius: 50%; background: #dcfce7; border: 2px solid #16a34a; display: inline-flex; align-items: center; justify-content: center; font-size: 0.8rem;">✓</div>' : '—'}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;

    updatePagination();
}

function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calculateHours(checkIn, checkOut) {
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const diff = (outH * 60 + outM) - (inH * 60 + inM);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
}

function updatePagination() {
    const total = filteredAttendance.length;
    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(start + itemsPerPage - 1, total);

    document.getElementById('paginationStart').textContent = total > 0 ? start : 0;
    document.getElementById('paginationEnd').textContent = end;
    document.getElementById('paginationTotal').textContent = total;

    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = end >= total;
}

function exportAttendanceCSV() {
    if (filteredAttendance.length === 0) {
        alert('No records to export');
        return;
    }

    let csv = 'Employee,Date,Check In,Check Out,Total Hours,Department\n';
    
    filteredAttendance.forEach(record => {
        const hoursWorked = record.checkIn && record.checkOut ? calculateHours(record.checkIn, record.checkOut) : '-';
        csv += `"${record.username}",${record.date},${record.checkIn || '-'},${record.checkOut || '-'},${hoursWorked},${record.department}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}
