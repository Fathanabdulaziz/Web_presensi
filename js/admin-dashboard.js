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
            logout(e);
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
    loadAnnouncements();
    
    // Set up create announcement button
    const createBtn = document.querySelector('.create-btn');
    if (createBtn) {
        createBtn.addEventListener('click', showCreateAnnouncementModal);
    }
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

// Create announcement modal
function showCreateAnnouncementModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal">
            <div class="modal-header">
                <h3>Buat Pengumuman Baru</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="announcementForm">
                    <div class="form-group">
                        <label for="announcementTitle">Judul</label>
                        <input type="text" id="announcementTitle" required>
                    </div>
                    <div class="form-group">
                        <label for="announcementCategory">Kategori</label>
                        <select id="announcementCategory" required>
                            <option value="Kebijakan">Kebijakan</option>
                            <option value="Acara">Acara</option>
                            <option value="Kesehatan">Kesehatan</option>
                            <option value="Umum">Umum</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="announcementContent">Isi Pengumuman</label>
                        <textarea id="announcementContent" rows="4" required></textarea>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="btn secondary" onclick="this.closest('.modal-overlay').remove()">Batal</button>
                <button class="btn primary" onclick="createAnnouncement()">Buat Pengumuman</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function createAnnouncement() {
    const title = document.getElementById('announcementTitle').value;
    const category = document.getElementById('announcementCategory').value;
    const content = document.getElementById('announcementContent').value;
    
    if (!title || !category || !content) {
        alert('Semua field harus diisi!');
        return;
    }
    
    const announcement = {
        id: Date.now(),
        title: title,
        category: category,
        content: content,
        date: new Date().toISOString().split('T')[0],
        author: currentUser.name
    };
    
    // Load existing announcements
    const stored = localStorage.getItem('announcements');
    const announcements = stored ? JSON.parse(stored) : [];
    
    // Add new announcement
    announcements.push(announcement);
    
    // Save to localStorage
    localStorage.setItem('announcements', JSON.stringify(announcements));
    
    // Close modal
    document.querySelector('.modal-overlay').remove();
    
    // Reload announcements in admin dashboard
    loadAnnouncements();
    
    alert('Pengumuman berhasil dibuat!');
}
