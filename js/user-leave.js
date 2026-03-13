// ==================== USER LEAVE REQUEST ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeLeavePage();
});

function getActiveLeaveUser() {
    if (currentUser && currentUser.id) {
        return currentUser;
    }

    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
        return null;
    }

    try {
        currentUser = JSON.parse(savedUser);
        return currentUser;
    } catch (error) {
        return null;
    }
}

function initializeLeavePage() {
    if (typeof checkAuthStatus === 'function') {
        checkAuthStatus();
    }

    const activeUser = getActiveLeaveUser();
    if (!activeUser) {
        alert('Sesi login tidak ditemukan. Silakan login kembali.');
        window.location.href = '../index.html';
        return;
    }

    loadLeaveBalances();
    loadLeaveHistory();
    setupFormValidation();
}

function loadLeaveBalances() {
    const activeUser = getActiveLeaveUser();
    if (!activeUser) {
        document.getElementById('annualBalance').textContent = '0 hari';
        document.getElementById('sickBalance').textContent = '0 hari';
        return;
    }

    const usage = getLeaveUsage(activeUser.id);
    const annualRemaining = Math.max(0, usage.annualQuota - usage.annualUsed);
    const sickRemaining = Math.max(0, usage.sickQuota - usage.sickUsed);

    document.getElementById('annualBalance').textContent = `${annualRemaining} hari`;
    document.getElementById('sickBalance').textContent = `${sickRemaining} hari`;
}

function getLeaveUsage(employeeId) {
    const annualQuota = 12;
    const sickQuota = 6;

    const ownLeaves = leaves.filter(leave =>
        String(leave.employeeId || '') === String(employeeId || '') &&
        String(leave.status || '').toLowerCase() !== 'rejected'
    );

    const annualUsed = ownLeaves.reduce((total, leave) => {
        const leaveType = String(leave.type || '').toLowerCase();
        const days = Number(leave.daysRequested) || 0;
        return (leaveType === 'personal' || leaveType === 'maternity' || leaveType === 'annual') ? total + days : total;
    }, 0);

    const sickUsed = ownLeaves.reduce((total, leave) => {
        const leaveType = String(leave.type || '').toLowerCase();
        const days = Number(leave.daysRequested) || 0;
        return leaveType === 'sick' ? total + days : total;
    }, 0);

    return { annualQuota, sickQuota, annualUsed, sickUsed };
}

function setupFormValidation() {
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const daysRequestedInput = document.getElementById('daysRequested');
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    startDateInput.min = today;
    endDateInput.min = today;
    
    // Auto-calculate days when dates change
    startDateInput.addEventListener('change', calculateDays);
    endDateInput.addEventListener('change', calculateDays);
    
    // Validate end date is after start date
    endDateInput.addEventListener('change', function() {
        const startDate = new Date(startDateInput.value);
        const endDate = new Date(endDateInput.value);
        
        if (endDate < startDate) {
            alert('Tanggal selesai harus setelah tanggal mulai.');
            endDateInput.value = '';
            daysRequestedInput.value = '';
        }
    });
}

function calculateDays() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const daysRequestedInput = document.getElementById('daysRequested');
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
        
        daysRequestedInput.value = diffDays;
    }
}

function hasOverlappingLeaveRequest(employeeId, startDate, endDate) {
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);

    return leaves.some(leave => {
        if (leave.employeeId !== employeeId) return false;
        if (leave.status === 'rejected') return false;

        const existingStart = new Date(leave.startDate);
        const existingEnd = new Date(leave.endDate);

        // Overlap exists when both ranges intersect.
        return newStart <= existingEnd && newEnd >= existingStart;
    });
}

function showErrorAlert(message) {
    if (typeof notify === 'function') {
        notify(message, 'error');
        return;
    }

    alert(message);
}

document.getElementById('leaveForm').addEventListener('submit', function(e) {
    e.preventDefault();

    const activeUser = getActiveLeaveUser();
    if (!activeUser) {
        alert('Sesi login tidak valid. Silakan login ulang.');
        window.location.href = '../index.html';
        return;
    }
    
    const leaveType = document.getElementById('leaveType').value;
    const daysRequested = parseInt(document.getElementById('daysRequested').value);
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const reason = document.getElementById('reason').value.trim();
    const contactInfo = document.getElementById('contactInfo').value.trim();
    const leaveAddress = document.getElementById('leaveAddress').value.trim();
    
    // Validate required fields
    if (!leaveType || !daysRequested || !startDate || !endDate || !reason || !contactInfo || !leaveAddress) {
        alert('Harap lengkapi semua field yang wajib diisi.');
        return;
    }
    
    // Check leave balance (remaining quota).
    const usage = getLeaveUsage(activeUser.id);
    const remainingAnnual = Math.max(0, usage.annualQuota - usage.annualUsed);
    const remainingSick = Math.max(0, usage.sickQuota - usage.sickUsed);
    const maxDays = leaveType === 'sakit' ? remainingSick : (leaveType === 'personal' || leaveType === 'maternity') ? remainingAnnual : 30;
    if (daysRequested > maxDays) {
        const leaveBucketLabel = leaveType === 'sakit'
            ? 'sakit'
            : (leaveType === 'personal' || leaveType === 'maternity') ? 'tahunan (pribadi/melahirkan)' : 'lainnya';
        alert(`Jumlah hari cuti melebihi saldo cuti ${leaveBucketLabel} yang tersedia.`);
        return;
    }

    if (hasOverlappingLeaveRequest(activeUser.id, startDate, endDate)) {
        showErrorAlert('Tanggal cuti bentrok dengan pengajuan cuti yang sudah ada. Silakan pilih tanggal atau rentang tanggal lain.');
        return;
    }
    
    // Create leave request
    const leaveRequest = {
        id: Date.now(),
        employeeId: activeUser.id,
        employeeName: activeUser.name,
        type: leaveType,
        typeLabel: getLeaveTypeLabel(leaveType),
        daysRequested: daysRequested,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
        contactInfo: contactInfo,
        leaveAddress: leaveAddress,
        submittedDate: new Date().toISOString(),
        status: 'pending', // pending, approved, rejected
        approvedBy: null,
        approvedDate: null,
        comments: null
    };
    
    // Save to localStorage
    leaves.push(leaveRequest);
    localStorage.setItem('leaves', JSON.stringify(leaves));
    
    // Show success message on dashboard after redirect.
    localStorage.setItem('flashNotification', JSON.stringify({
        message: 'Pengajuan cuti berhasil dikirim! Menunggu persetujuan dari admin.',
        type: 'success'
    }));

    window.location.href = 'dashboard.html';
});

function getLeaveTypeLabel(type) {
    const labels = {
        'sick': 'Cuti Sakit',
        'personal': 'Cuti Pribadi',
        'maternity': 'Cuti Melahirkan',
        'other': 'Lainnya'
    };
    return labels[type] || type;
}

function clearForm() {
    document.getElementById('leaveForm').reset();
}

function loadLeaveHistory() {
    const activeUser = getActiveLeaveUser();
    const historyContainer = document.getElementById('leaveHistory');

    if (!activeUser) {
        historyContainer.innerHTML = '<p class="no-history">Silakan login untuk melihat riwayat cuti</p>';
        return;
    }

    const userLeaves = leaves.filter(l => l.employeeId === activeUser.id)
        .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));
    
    if (userLeaves.length === 0) {
        historyContainer.innerHTML = '<p class="no-history">Belum ada pengajuan cuti</p>';
        return;
    }
    
    historyContainer.innerHTML = userLeaves.map(leave => `
        <div class="leave-item ${leave.status}">
            <div class="leave-header">
                <div class="leave-type">${leave.typeLabel}</div>
                <div class="leave-status status-${leave.status}">
                    ${getStatusLabel(leave.status)}
                </div>
            </div>
            <div class="leave-details">
                <div class="leave-dates">
                    <i class="fas fa-calendar"></i>
                    ${formatDate(leave.startDate)} - ${formatDate(leave.endDate)}
                    <span class="leave-days">(${leave.daysRequested} hari)</span>
                </div>
                <div class="leave-reason">
                    <i class="fas fa-comment"></i>
                    ${leave.reason}
                </div>
                <div class="leave-contact">
                    <i class="fas fa-phone"></i>
                    Kontak: ${leave.contactInfo || '-'}
                </div>
                <div class="leave-address">
                    <i class="fas fa-map-marker-alt"></i>
                    Alamat: ${leave.leaveAddress || '-'}
                </div>
                <div class="leave-submitted">
                    <i class="fas fa-clock"></i>
                    Diajukan: ${new Date(leave.submittedDate).toLocaleDateString('id-ID')}
                </div>
            </div>
        </div>
    `).join('');
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'Menunggu Persetujuan',
        'approved': 'Disetujui',
        'rejected': 'Ditolak'
    };
    return labels[status] || status;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}