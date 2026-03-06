// Admin Client Visits Page
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

    // Load client visit data
    loadClientVisits();

    // Set up add visit button
    document.getElementById('addVisitBtn')?.addEventListener('click', addNewVisit);
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

function loadClientVisits() {
    // Mock client visit data (in production, load from localStorage)
    const visits = [
        {
            id: 1,
            employee: 'Sarah Jenkins',
            client: 'PT Maju Jaya',
            location: 'Jakarta',
            date: new Date().toISOString().split('T')[0],
            checkIn: '08:30',
            checkOut: '11:45',
            duration: '3h 15m',
            status: 'Completed'
        },
        {
            id: 2,
            employee: 'Michael Chen',
            client: 'CV Tekno Indonesia',
            location: 'Bandung',
            date: new Date().toISOString().split('T')[0],
            checkIn: '09:00',
            checkOut: null,
            duration: 'In Progress',
            status: 'Active'
        },
        {
            id: 3,
            employee: 'Emily Davis',
            client: 'PT Global Services',
            location: 'Surabaya',
            date: new Date().toISOString().split('T')[0],
            checkIn: '07:00',
            checkOut: '16:30',
            duration: '9h 30m',
            status: 'Completed'
        }
    ];

    // Update stats
    document.getElementById('visitsCount').textContent = visits.length;
    document.getElementById('activeVisitsCount').textContent = visits.filter(v => v.status === 'Active').length;
    document.getElementById('completedVisitsCount').textContent = visits.filter(v => v.status === 'Completed').length;
    document.getElementById('uniqueClientsCount').textContent = new Set(visits.map(v => v.client)).size;

    // Load table data
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (visits.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No visit records found</td></tr>';
        return;
    }

    tbody.innerHTML = visits.map((visit, idx) => `
        <tr>
            <td>${visit.employee}</td>
            <td>${visit.client}</td>
            <td>${visit.location}</td>
            <td>${visit.date}</td>
            <td>${visit.checkIn}</td>
            <td>${visit.checkOut || '-'}</td>
            <td>${visit.duration}</td>
            <td><span class="badge badge-${visit.status === 'Active' ? 'warning' : 'success'}">${visit.status}</span></td>
            <td>
                <button class="btn btn-sm" onclick="editVisit(${visit.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteVisit(${visit.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function addNewVisit() {
    alert('Add new client visit form would open here');
    // TODO: Implement add visit modal
}

function editVisit(visitId) {
    alert(`Edit visit ${visitId}`);
    // TODO: Implement edit modal
}

function deleteVisit(visitId) {
    if (confirm('Are you sure you want to delete this visit record?')) {
        alert('Visit deleted');
        // TODO: Implement actual delete
        loadClientVisits();
    }
}

// Export visits data
document.querySelector('.download-btn')?.addEventListener('click', function(e) {
    e.preventDefault();
    alert('Exporting visit reports...');
    // TODO: Implement actual export functionality
});
