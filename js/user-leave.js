// ==================== USER LEAVE REQUEST ====================
document.addEventListener('DOMContentLoaded', function() {
    initializeLeavePage();
});

function isEnLang() {
    return document.documentElement.getAttribute('lang') === 'en';
}

function t(idText, enText) {
    return isEnLang() ? enText : idText;
}

function appLocale() {
    return isEnLang() ? 'en-US' : 'id-ID';
}

const leaveHistorySliderState = {
    items: [],
    start: 0,
    viewSize: 3
};

let leaveHistoryResizeTimer = null;

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

async function initializeLeavePage() {
    if (typeof checkAuthStatus === 'function') {
        checkAuthStatus();
    }

    const activeUser = getActiveLeaveUser();
    if (!activeUser) {
        alert('Sesi login tidak ditemukan. Silakan login kembali.');
        window.location.href = '../index.html';
        return;
    }

    if (typeof window.syncLeavesFromApi === 'function') {
        await window.syncLeavesFromApi().catch(() => {});
    }

    loadLeaveBalances();
    loadLeaveHistory();
    setupFormValidation();
    setupLeaveHistoryResizeHandler();
    window.addEventListener('appLanguageChanged', handleLeaveLanguageChanged);
}

function handleLeaveLanguageChanged() {
    loadLeaveBalances();
    loadLeaveHistory();
}

function getLeaveHistoryViewSize() {
    return window.innerWidth <= 768 ? 1 : 3;
}

function ensureLeaveHistorySlider() {
    const historyContainer = document.getElementById('leaveHistory');
    if (!historyContainer) return;

    const card = historyContainer.closest('.card');
    const cardHeader = card ? card.querySelector('.card-header') : null;
    if (!cardHeader) return;

    let sliderNav = document.getElementById('leaveHistorySliderNav');
    if (!sliderNav) {
        sliderNav = document.createElement('div');
        sliderNav.id = 'leaveHistorySliderNav';
        sliderNav.className = 'dashboard-slider-nav';
        sliderNav.innerHTML = `
            <button type="button" id="leaveHistoryPrevBtn" class="dashboard-slider-btn" aria-label="Riwayat sebelumnya">
                <i class="fas fa-chevron-left"></i>
            </button>
            <span id="leaveHistoryIndicator" class="dashboard-slider-indicator">1/1</span>
            <button type="button" id="leaveHistoryNextBtn" class="dashboard-slider-btn" aria-label="Riwayat berikutnya">
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        cardHeader.appendChild(sliderNav);

        const prevBtn = document.getElementById('leaveHistoryPrevBtn');
        const nextBtn = document.getElementById('leaveHistoryNextBtn');

        prevBtn?.addEventListener('click', function() {
            shiftLeaveHistorySlider(-1);
        });
        nextBtn?.addEventListener('click', function() {
            shiftLeaveHistorySlider(1);
        });
    }

    const shouldShow = leaveHistorySliderState.items.length > leaveHistorySliderState.viewSize;
    sliderNav.style.display = shouldShow ? 'inline-flex' : 'none';
}

function updateLeaveHistorySliderControls() {
    const prevBtn = document.getElementById('leaveHistoryPrevBtn');
    const nextBtn = document.getElementById('leaveHistoryNextBtn');
    const indicator = document.getElementById('leaveHistoryIndicator');

    const pagination = getPagedSliderMeta(leaveHistorySliderState.items.length, leaveHistorySliderState.viewSize, leaveHistorySliderState.start);
    leaveHistorySliderState.start = pagination.startIndex;

    if (prevBtn) prevBtn.disabled = !pagination.hasPrev;
    if (nextBtn) nextBtn.disabled = !pagination.hasNext;
    if (indicator) indicator.textContent = `${pagination.currentPage + 1}/${pagination.totalPages}`;
}

function shiftLeaveHistorySlider(direction) {
    leaveHistorySliderState.start = shiftPagedSliderStart(
        leaveHistorySliderState.items.length,
        leaveHistorySliderState.viewSize,
        leaveHistorySliderState.start,
        direction
    );
    renderLeaveHistorySlider();
}

function renderLeaveHistorySlider() {
    const historyContainer = document.getElementById('leaveHistory');
    if (!historyContainer) return;

    const allLeaves = leaveHistorySliderState.items;
    const pagination = getPagedSliderMeta(allLeaves.length, leaveHistorySliderState.viewSize, leaveHistorySliderState.start);
    leaveHistorySliderState.start = pagination.startIndex;
    const start = pagination.startIndex;
    const end = start + leaveHistorySliderState.viewSize;
    const visibleLeaves = allLeaves.slice(start, end);

    historyContainer.innerHTML = visibleLeaves.map((leave, index) => `
        <div class="leave-item ${leave.status} ${getLeaveTypeClass(leave.type, leave.typeLabel)} dashboard-slide-item" style="--slide-index:${index};">
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
                    <span class="leave-days">(${leave.daysRequested} ${t('hari', 'days')})</span>
                </div>
                <div class="leave-reason">
                    <i class="fas fa-comment"></i>
                    ${leave.reason}
                </div>
                <div class="leave-contact">
                    <i class="fas fa-phone"></i>
                    ${t('Kontak', 'Contact')}: ${leave.contactInfo || '-'}
                </div>
                <div class="leave-address">
                    <i class="fas fa-map-marker-alt"></i>
                    ${t('Alamat', 'Address')}: ${leave.leaveAddress || '-'}
                </div>
                <div class="leave-submitted">
                    <i class="fas fa-clock"></i>
                    ${t('Diajukan', 'Submitted')}: ${formatCreatedAtDate(leave.submittedDate)}
                </div>
            </div>
        </div>
    `).join('');

    ensureLeaveHistorySlider();
    updateLeaveHistorySliderControls();
}

function setupLeaveHistoryResizeHandler() {
    window.addEventListener('resize', function() {
        clearTimeout(leaveHistoryResizeTimer);
        leaveHistoryResizeTimer = setTimeout(function() {
            const nextViewSize = getLeaveHistoryViewSize();
            if (leaveHistorySliderState.viewSize === nextViewSize) return;

            leaveHistorySliderState.viewSize = nextViewSize;
            leaveHistorySliderState.start = getPagedSliderMeta(
                leaveHistorySliderState.items.length,
                nextViewSize,
                leaveHistorySliderState.start
            ).startIndex;
            renderLeaveHistorySlider();
        }, 150);
    });
}

function loadLeaveBalances() {
    const activeUser = getActiveLeaveUser();
    if (!activeUser) {
        document.getElementById('annualBalance').textContent = `0 ${t('hari', 'days')}`;
        document.getElementById('sickBalance').textContent = `0 ${t('hari', 'days')}`;
        return;
    }

    const usage = getLeaveUsage(activeUser.id);
    const annualRemaining = Math.max(0, usage.annualQuota - usage.annualUsed);
    const sickRemaining = Math.max(0, usage.sickQuota - usage.sickUsed);

    document.getElementById('annualBalance').textContent = `${annualRemaining} ${t('hari', 'days')}`;
    document.getElementById('sickBalance').textContent = `${sickRemaining} ${t('hari', 'days')}`;
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
    const startDateMasukan = document.getElementById('startDate');
    const endDateMasukan = document.getElementById('endDate');
    const daysRequestedMasukan = document.getElementById('daysRequested');
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    startDateMasukan.min = today;
    endDateMasukan.min = today;
    
    // Auto-calculate days when dates change
    startDateMasukan.addEventListener('change', calculateDays);
    endDateMasukan.addEventListener('change', calculateDays);
    
    // Validate end date is after start date
    endDateMasukan.addEventListener('change', function() {
        const startDate = new Date(startDateMasukan.value);
        const endDate = new Date(endDateMasukan.value);
        
        if (endDate < startDate) {
            alert('Tanggal selesai harus setelah tanggal mulai.');
            endDateMasukan.value = '';
            daysRequestedMasukan.value = '';
        }
    });
}

function calculateDays() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const daysRequestedMasukan = document.getElementById('daysRequested');
    
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
        
        daysRequestedMasukan.value = diffDays;
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

    submitLeaveForm();
});

async function submitLeaveForm() {

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
    const attachmentMasukan = document.getElementById('attachment');
    const attachmentFile = attachmentMasukan && attachmentMasukan.files ? attachmentMasukan.files[0] : null;
    
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
    let attachmentData = null;
    if (attachmentFile) {
        try {
            attachmentData = await readLeaveAttachment(attachmentFile);
        } catch (error) {
            showErrorAlert('Lampiran gagal diproses. Silakan coba file lain.');
            return;
        }
    }

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
        comments: null,
        attachmentName: attachmentData ? attachmentData.name : null,
        attachmentType: attachmentData ? attachmentData.type : null,
        attachmentSize: attachmentData ? attachmentData.size : null,
        attachmentDataUrl: attachmentData ? attachmentData.dataUrl : null
    };
    
    try {
        if (typeof apiRequest === 'function') {
            await apiRequest('/api/leaves', {
                method: 'POST',
                body: {
                    leave_type: leaveType,
                    type_label: getLeaveTypeLabel(leaveType),
                    days_requested: daysRequested,
                    start_date: startDate,
                    end_date: endDate,
                    reason,
                    contact_info: contactInfo,
                    leave_address: leaveAddress,
                    attachment_name: attachmentData ? attachmentData.name : null,
                    attachment_type: attachmentData ? attachmentData.type : null,
                    attachment_size: attachmentData ? attachmentData.size : null,
                    attachment_data: attachmentData ? attachmentData.dataUrl : null,
                },
            });

            if (typeof window.syncLeavesFromApi === 'function') {
                await window.syncLeavesFromApi().catch(() => {});
            }
        } else {
            leaves.push(leaveRequest);
            localStorage.setItem('leaves', JSON.stringify(leaves));
        }
    } catch (error) {
        showErrorAlert(error?.message || 'Pengajuan cuti gagal dikirim ke server.');
        return;
    }
    
    // Show success message on dashboard after redirect.
    localStorage.setItem('flashNotification', JSON.stringify({
        message: 'Pengajuan cuti berhasil dikirim! Menunggu persetujuan dari admin.',
        type: 'success'
    }));

    window.location.href = 'dashboard.html';
}

function readLeaveAttachment(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            resolve({
                name: file.name,
                type: file.type || 'application/octet-stream',
                size: Number(file.size) || 0,
                dataUrl: event.target && event.target.result ? String(event.target.result) : ''
            });
        };
        reader.onerror = function() {
            reject(new Error('FileReader failed'));
        };
        reader.readAsDataURL(file);
    });
}

function getLeaveTypeLabel(type) {
    const labels = {
        'sick': 'Cuti Sakit',
        'personal': 'Cuti Pribadi',
        'maternity': 'Cuti Melahirkan',
        'other': 'Lainnya'
    };
    return labels[type] || type;
}

function getLeaveTypeClass(type, typeLabel) {
    const raw = String(type || typeLabel || '').toLowerCase().trim();

    if (raw.includes('sick') || raw.includes('sakit')) return 'leave-type-sick';
    if (raw.includes('personal') || raw.includes('pribadi')) return 'leave-type-personal';
    if (raw.includes('maternity') || raw.includes('melahirkan')) return 'leave-type-maternity';
    if (raw.includes('annual') || raw.includes('tahunan')) return 'leave-type-annual';
    return 'leave-type-other';
}

function clearForm() {
    document.getElementById('leaveForm').reset();
}

function loadLeaveHistory() {
    const activeUser = getActiveLeaveUser();
    const historyContainer = document.getElementById('leaveHistory');

    if (!activeUser) {
        historyContainer.innerHTML = `<p class="no-history">${t('Silakan login untuk melihat riwayat cuti', 'Please sign in to view leave history')}</p>`;
        return;
    }

    const userLeaves = leaves.filter(l => l.employeeId === activeUser.id)
        .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));
    
    if (userLeaves.length === 0) {
        historyContainer.innerHTML = `<p class="no-history">${t('Belum ada pengajuan cuti', 'No leave requests yet')}</p>`;
        const sliderNav = document.getElementById('leaveHistorySliderNav');
        if (sliderNav) sliderNav.style.display = 'none';
        return;
    }

    leaveHistorySliderState.items = userLeaves;
    leaveHistorySliderState.viewSize = getLeaveHistoryViewSize();
    leaveHistorySliderState.start = getPagedSliderMeta(
        leaveHistorySliderState.items.length,
        leaveHistorySliderState.viewSize,
        leaveHistorySliderState.start
    ).startIndex;
    renderLeaveHistorySlider();
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
    if (isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}

function formatCreatedAtDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}