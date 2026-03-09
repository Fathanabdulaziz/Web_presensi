// Admin Dashboard Initialization
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

    // Set page date
    const pageDate = document.querySelector('.page-date');
    if (pageDate) {
        const today = new Date();
        pageDate.textContent = `Ringkasan real-time status tenaga kerja per ${today.toLocaleDateString('id-ID', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    }

    // Set up sidebar navigation
    setupSidebarNav();

    // Initialize chart
    initAttendanceChart();

    // Load data
    loadDashboardData();
});

function setupSidebarNav() {
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            // Allow normal navigation to other pages
            if (this.getAttribute('href') && !this.getAttribute('href').startsWith('#')) {
                return;
            }
            e.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function loadDashboardData() {
    loadPresensiData();
    
    // Calculate dashboard stats
    const today = new Date().toISOString().split('T')[0];
    const todayData = presensiData.filter(r => r.date === today);
    
    const presentCount = todayData.filter(r => r.type === 'Check In' && !todayData.find(x => x.username === r.username && x.type === 'Check Out' && new Date(x.time) - new Date(r.time) < 0)).length;
    const lateCount = Math.floor(Math.random() * 15) + 5;
    const leaveCount = leaves.filter(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const now = new Date(today);
        return start <= now && now <= end && l.status === 'approved';
    }).length;
    const visitCount = 24;

    document.getElementById('presentCount').textContent = presentCount || 145;
    document.getElementById('lateCount').textContent = lateCount;
    document.getElementById('leaveCount').textContent = leaveCount;
    document.getElementById('visitCount').textContent = visitCount;
}

function initAttendanceChart() {
    const ctx = document.getElementById('attendanceChart');
    if (!ctx) return;

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [
                {
                    label: 'Present',
                    data: [140, 145, 138, 150, 145, 120, 100],
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#10b981',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 180,
                    grid: {
                        drawBorder: false
                    }
                },
                x: {
                    grid: {
                        drawBorder: false,
                        display: false
                    }
                }
            }
        }
    });
}

// Download report functionality
document.querySelector('.download-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Preparing report download...');
    // TODO: Implement actual download functionality
});
