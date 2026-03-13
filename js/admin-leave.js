// Admin Leave Management Page
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

    // Load leave data
    loadLeaveRequests();
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

function loadLeaveRequests() {
    // Initialize leaves from localStorage if empty
    const stored = localStorage.getItem('leaves');
    if (stored) {
        leaves = JSON.parse(stored);
    }

    // Calculate statistics
    const pending = leaves.filter(l => l.status === 'pending').length;
    const approved = leaves.filter(l => l.status === 'approved').length;
    const rejected = leaves.filter(l => l.status === 'rejected').length;

    const today = new Date().toISOString().split('T')[0];
    const onLeaveToday = leaves.filter(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const now = new Date(today);
        return start <= now && now <= end;
    }).length;

    document.getElementById('pendingLeaveCount').textContent = pending;
    document.getElementById('approvedLeaveCount').textContent = approved;
    document.getElementById('rejectedLeaveCount').textContent = rejected;
    document.getElementById('onLeaveTodayCount').textContent = onLeaveToday;

    // Load table data
    const tbody = document.getElementById('leaveTableBody');
    if (!tbody) return;

    if (leaves.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">No leave requests found</td></tr>';
        return;
    }

    tbody.innerHTML = leaves.map((leave, idx) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

        return `
            <tr>
                <td>${leave.username}</td>
                <td>${leave.type || 'Vacation'}</td>
                <td>${leave.startDate}</td>
                <td>${leave.endDate}</td>
                <td>${days}</td>
                <td>${leave.reason}</td>
                <td><span class="badge badge-${leave.status}">${leave.status}</span></td>
                <td>
                    ${leave.status === 'pending' ? `
                        <button class="btn btn-sm btn-success" onclick="approveLeave(${leave.id})">Approve</button>
                        <button class="btn btn-sm btn-danger" onclick="rejectLeave(${leave.id})">Reject</button>
                    ` : `
                        <button class="btn btn-sm" onclick="viewLeave(${leave.id})">View</button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

function approveLeave(leaveId) {
    const leave = leaves.find(l => l.id === leaveId);
    if (leave) {
        leave.status = 'approved';
        leave.approvedBy = currentUser.username;
        leave.approvedDate = new Date().toISOString().split('T')[0];
        localStorage.setItem('leaves', JSON.stringify(leaves));
        alert('Leave request approved!');
        loadLeaveRequests();
    }
}

function rejectLeave(leaveId) {
    const reason = prompt('Enter rejection reason:');
    if (reason !== null) {
        const leave = leaves.find(l => l.id === leaveId);
        if (leave) {
            leave.status = 'rejected';
            leave.rejectionReason = reason;
            leave.rejectedBy = currentUser.username;
            leave.rejectedDate = new Date().toISOString().split('T')[0];
            localStorage.setItem('leaves', JSON.stringify(leaves));
            alert('Leave request rejected!');
            loadLeaveRequests();
        }
    }
}

function viewLeave(leaveId) {
    const leave = leaves.find(l => l.id === leaveId);
    if (leave) {
        alert(`Leave Details:\n\nEmployee: ${leave.username}\nFrom: ${leave.startDate}\nTo: ${leave.endDate}\nReason: ${leave.reason}\nStatus: ${leave.status}`);
    }
}

// Export leave data
document.querySelector('.download-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Exporting leave data...');
    // TODO: Implement actual export functionality
});
