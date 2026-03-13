let adminVisitRecords = [];

document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '../index.html';
        return;
    }

    updateUserDisplay();

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => logout(e));
    }

    setupSidebarNav();
    loadClientVisits();

    document.getElementById('addVisitBtn')?.addEventListener('click', addNewVisit);
    document.querySelector('.download-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        exportVisitsCSV();
    });

    document.getElementById('searchInput')?.addEventListener('input', handleVisitSearch);
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
    const visits = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const employeeMap = new Map((Array.isArray(employees) ? employees : []).map(emp => [String(emp.id), emp]));

    adminVisitRecords = visits.map(visit => {
        const employee = employeeMap.get(String(visit.userId));
        return {
            ...visit,
            employeeName: employee?.name || visit.employeeName || visit.username || `User #${visit.userId}`,
            status: visit.status || (visit.checkOutTime ? 'Selesai' : 'Aktif'),
            duration: visit.duration || calculateDurationLabel(visit.checkInTime, visit.checkOutTime) || '-'
        };
    }).sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

    updateVisitStats(adminVisitRecords);
    renderVisitsTable(adminVisitRecords);
}

function updateVisitStats(visits) {
    const today = new Date().toISOString().split('T')[0];

    document.getElementById('visitsCount').textContent = String(visits.filter(v => String(v.visitDate || '').slice(0, 10) === today).length);
    document.getElementById('activeVisitsCount').textContent = String(visits.filter(v => v.status === 'Aktif').length);
    document.getElementById('completedVisitsCount').textContent = String(visits.filter(v => v.status === 'Selesai').length);
    document.getElementById('uniqueClientsCount').textContent = String(new Set(visits.map(v => v.clientName)).size);
}

function renderVisitsTable(visits) {
    const tbody = document.getElementById('visitsTableBody');
    if (!tbody) return;

    if (!visits.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">Tidak ada catatan kunjungan ditemukan</td></tr>';
        return;
    }

    tbody.innerHTML = visits.map((visit) => `
        <tr>
            <td>${visit.employeeName || '-'}</td>
            <td>${visit.clientName || '-'}</td>
            <td>${visit.clientLocation || '-'}</td>
            <td>${formatDate(visit.visitDate)}</td>
            <td>${visit.checkInTime || '-'}</td>
            <td>${visit.checkOutTime || '-'}</td>
            <td>${visit.duration || '-'}</td>
            <td><span class="badge badge-${getStatusClass(visit.status)}">${visit.status || '-'}</span></td>
            <td>
                <button class="btn btn-sm" onclick="editVisit(${visit.id}, ${visit.userId})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteVisit(${visit.id}, ${visit.userId})">Hapus</button>
            </td>
        </tr>
    `).join('');
}

function getStatusClass(status) {
    if (status === 'Selesai') return 'success';
    if (status === 'Dibatalkan') return 'danger';
    return 'warning';
}

function addNewVisit() {
    notify('Penambahan kunjungan dilakukan dari portal user, data otomatis sinkron ke admin.', 'info');
}

function editVisit(visitId, userId) {
    const all = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
    const index = all.findIndex(v => Number(v.id) === Number(visitId) && String(v.userId) === String(userId));
    if (index === -1) {
        notify('Data kunjungan tidak ditemukan.', 'warning');
        return;
    }

    const current = all[index];
    const nextStatus = prompt('Update status kunjungan (Aktif, Selesai, Dibatalkan):', current.status || 'Aktif');
    if (nextStatus === null) return;

    const normalized = String(nextStatus).trim();
    if (!['Aktif', 'Selesai', 'Dibatalkan'].includes(normalized)) {
        notify('Status tidak valid.', 'warning');
        return;
    }

    let checkOutTime = current.checkOutTime || '';
    if (normalized === 'Selesai' && !checkOutTime) {
        checkOutTime = prompt('Masukkan jam check-out (HH:MM):', '') || '';
    }

    all[index] = {
        ...current,
        status: normalized,
        checkOutTime,
        duration: calculateDurationLabel(current.checkInTime, checkOutTime) || current.duration || '-'
    };

    localStorage.setItem('userClientVisits', JSON.stringify(all));
    notify('Data kunjungan berhasil diperbarui.', 'success');
    loadClientVisits();
}

function deleteVisit(visitId, userId) {
    showAppConfirm({
        title: 'Hapus Kunjungan',
        message: 'Yakin ingin menghapus catatan kunjungan ini?',
        confirmText: 'Hapus',
        cancelText: 'Batal',
        onConfirm: () => {
            const all = JSON.parse(localStorage.getItem('userClientVisits') || '[]');
            const next = all.filter(v => !(Number(v.id) === Number(visitId) && String(v.userId) === String(userId)));
            localStorage.setItem('userClientVisits', JSON.stringify(next));
            notify('Catatan kunjungan dihapus.', 'success');
            loadClientVisits();
        }
    });
}

function handleVisitSearch(e) {
    const keyword = String(e.target.value || '').toLowerCase().trim();
    if (!keyword) {
        renderVisitsTable(adminVisitRecords);
        return;
    }

    const filtered = adminVisitRecords.filter(visit => [
        visit.employeeName,
        visit.clientName,
        visit.clientLocation,
        visit.status,
        visit.visitPurpose,
        visit.visitNotes,
        visit.visitDate
    ].some(value => String(value || '').toLowerCase().includes(keyword)));

    renderVisitsTable(filtered);
}

function exportVisitsCSV() {
    if (!adminVisitRecords.length) {
        notify('Tidak ada data kunjungan untuk diekspor.', 'warning');
        return;
    }

    const header = ['Nama Karyawan', 'Nama Klien', 'Lokasi', 'Tanggal', 'Check In', 'Check Out', 'Durasi', 'Tujuan', 'Status', 'Catatan'];
    const rows = adminVisitRecords.map(visit => [
        visit.employeeName || '-',
        visit.clientName || '-',
        visit.clientLocation || '-',
        visit.visitDate || '-',
        visit.checkInTime || '-',
        visit.checkOutTime || '-',
        visit.duration || '-',
        visit.visitPurpose || '-',
        visit.status || '-',
        String(visit.visitNotes || '-').replace(/\n/g, ' ')
    ]);

    const csv = [header, ...rows]
        .map(cols => cols.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client-visits-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
}

function formatDate(value) {
    if (!value) return '-';
    const date = new Date(value);
    return isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('id-ID');
}

function timeToMinutes(timeValue) {
    const match = String(timeValue || '').match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    if (isNaN(hour) || isNaN(minute)) return null;

    return (hour * 60) + minute;
}

function calculateDurationLabel(checkInTime, checkOutTime) {
    if (!checkInTime || !checkOutTime) return '';

    const inMinutes = timeToMinutes(checkInTime);
    const outMinutes = timeToMinutes(checkOutTime);
    if (inMinutes === null || outMinutes === null) return '';

    let diff = outMinutes - inMinutes;
    if (diff < 0) diff += 24 * 60;

    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours} jam ${minutes} menit`;
}
