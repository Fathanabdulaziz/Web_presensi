// ==================== USER DASHBOARD ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeUserDashboard();
});

function initializeUserDashboard() {
    updateDateTime();
    loadUserData();
    loadRecentActivity();
    loadAttendanceStatus();
    
    // Update time every minute
    setInterval(updateDateTime, 60000);
}

function updateDateTime() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('id-ID', options);
}

function loadUserData() {
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
    }
}

function loadRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    
    // Get today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = presensiData.filter(p => 
        p.employeeId === currentUser.id && 
        p.date.startsWith(today)
    );
    
    // Get recent leaves
    const recentLeaves = leaves.filter(l => 
        l.employeeId === currentUser.id
    ).slice(-3);
    
    let activities = [];
    
    // Add attendance activities
    todayAttendance.forEach(attendance => {
        activities.push({
            type: 'attendance',
            time: attendance.timestamp,
            description: `${attendance.type === 'checkin' ? 'Check-in' : 'Check-out'} pada ${new Date(attendance.timestamp).toLocaleTimeString('id-ID')}`,
            icon: attendance.type === 'checkin' ? 'fas fa-sign-in-alt' : 'fas fa-sign-out-alt'
        });
    });
    
    // Add leave activities
    recentLeaves.forEach(leave => {
        activities.push({
            type: 'leave',
            time: leave.submittedDate,
            description: `Pengajuan cuti ${leave.type} dari ${leave.startDate} sampai ${leave.endDate}`,
            icon: 'fas fa-calendar-times'
        });
    });
    
    // Sort by time (most recent first)
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    
    if (activities.length === 0) {
        activityList.innerHTML = '<p class="no-activity">Belum ada aktivitas hari ini</p>';
        return;
    }
    
    activityList.innerHTML = activities.slice(0, 5).map(activity => `
        <div class="activity-item">
            <div class="activity-icon">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <p class="activity-description">${activity.description}</p>
                <span class="activity-time">${new Date(activity.time).toLocaleString('id-ID')}</span>
            </div>
        </div>
    `).join('');
}

function loadAttendanceStatus() {
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = presensiData.filter(p => 
        p.employeeId === currentUser.id && 
        p.date === today
    );
    
    const checkIn = todayAttendance.find(a => a.type === 'checkin');
    const checkOut = todayAttendance.find(a => a.type === 'checkout');
    
    document.getElementById('checkInTime').textContent = 
        checkIn ? new Date(checkIn.timestamp).toLocaleTimeString('id-ID') : '-';
    
    document.getElementById('checkOutTime').textContent = 
        checkOut ? new Date(checkOut.timestamp).toLocaleTimeString('id-ID') : '-';
    
    // Location status (simplified - in real app would check if within office radius)
    const locationStatus = checkIn ? 'Di dalam area kantor' : 'Belum check-in';
    document.getElementById('locationStatus').textContent = locationStatus;
}