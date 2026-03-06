// Admin Attendance Page
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
    loadAttendanceRecords();

    // Set up filter event listeners
    document.getElementById('filterFromDate')?.addEventListener('change', loadAttendanceRecords);
    document.getElementById('filterToDate')?.addEventListener('change', loadAttendanceRecords);
    document.getElementById('filterEmployee')?.addEventListener('input', loadAttendanceRecords);
    document.getElementById('filterStatus')?.addEventListener('change', loadAttendanceRecords);
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

function loadAttendanceRecords() {
    loadPresensiData();
    
    const fromDate = document.getElementById('filterFromDate')?.value || '';
    const toDate = document.getElementById('filterToDate')?.value || '';
    const employeeFilter = document.getElementById('filterEmployee')?.value.toLowerCase() || '';
    const statusFilter = document.getElementById('filterStatus')?.value || '';

    let filteredData = presensiData;

    // Apply date filters
    if (fromDate) {
        filteredData = filteredData.filter(r => r.date >= fromDate);
    }
    if (toDate) {
        filteredData = filteredData.filter(r => r.date <= toDate);
    }

    // Apply employee filter
    if (employeeFilter) {
        filteredData = filteredData.filter(r => r.username.toLowerCase().includes(employeeFilter));
    }

    // Apply status filter
    if (statusFilter) {
        filteredData = filteredData.filter(r => {
            if (statusFilter === 'Late') return r.time > '09:00';
            if (statusFilter === 'Present') return r.type === 'Check In';
            if (statusFilter === 'Absent') return !r.type || r.type === 'Absent';
            return true;
        });
    }

    // Group by employee and date for display
    const grouped = {};
    filteredData.forEach(record => {
        const key = `${record.username}-${record.date}`;
        if (!grouped[key]) {
            grouped[key] = { username: record.username, date: record.date, checkIn: null, checkOut: null };
        }
        if (record.type === 'Check In') grouped[key].checkIn = record.time;
        if (record.type === 'Check Out') grouped[key].checkOut = record.time;
    });

    const tbody = document.getElementById('attendanceTableBody');
    if (!tbody) return;

    if (Object.keys(grouped).length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No attendance records found</td></tr>';
        return;
    }

    tbody.innerHTML = Object.values(grouped).map((record, idx) => {
        const checkInTime = record.checkIn ? new Date(`2024-01-01 ${record.checkIn}`) : null;
        const isLate = checkInTime && checkInTime.getHours() > 9;
        const status = record.checkOut ? 'Present' : record.checkIn ? 'Checked In' : 'Absent';
        const hoursWorked = record.checkIn && record.checkOut ? calculateHours(record.checkIn, record.checkOut) : '-';

        return `
            <tr>
                <td>${record.username}</td>
                <td>${record.date}</td>
                <td>${record.checkIn || '-'}</td>
                <td>${record.checkOut || '-'}</td>
                <td><span class="badge badge-${isLate ? 'warning' : 'success'}">${isLate ? 'Late' : status}</span></td>
                <td>${hoursWorked}</td>
                <td>Office</td>
                <td>
                    <button class="btn btn-sm" onclick="editAttendance('${record.username}', '${record.date}')">Edit</button>
                </td>
            </tr>
        `;
    }).join('');
}

function calculateHours(checkIn, checkOut) {
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const diff = (outH * 60 + outM) - (inH * 60 + inM);
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m`;
}

function editAttendance(username, date) {
    alert(`Edit attendance for ${username} on ${date}`);
    // TODO: Implement edit modal
}

// Export attendance data
document.querySelector('.download-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Exporting attendance records...');
    // TODO: Implement actual export functionality
});
