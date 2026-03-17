// Admin Leave Management Page
function isEnLang() {
    return document.documentElement.getAttribute('lang') === 'en';
}

function t(idText, enText) {
    return isEnLang() ? enText : idText;
}

function appLocale() {
    return isEnLang() ? 'en-US' : 'id-ID';
}

function mapLeaveStatusLabel(status) {
    const value = String(status || '').toLowerCase();
    if (value === 'pending') return t('Menunggu Persetujuan', 'Pending');
    if (value === 'approved') return t('Disetujui', 'Approved');
    if (value === 'rejected') return t('Ditolak', 'Rejected');
    return status || '-';
}

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

    document.querySelector('.download-btn')?.addEventListener('click', function(e) {
        e.preventDefault();
        exportLeaveCSV();
    });

    window.addEventListener('appLanguageChanged', loadLeaveRequests);
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
        tbody.innerHTML = `<tr><td colspan="8" class="text-center">${t('Tidak ada pengajuan cuti.', 'No leave requests found')}</td></tr>`;
        return;
    }

    tbody.innerHTML = leaves.map((leave, idx) => {
        const start = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        const days = Number(leave.daysRequested) || (Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
        const employeeName = leave.employeeName || leave.username || leave.name || '-';
        const leaveType = leave.typeLabel || getLeaveTypeLabel(leave.type);
        const status = String(leave.status || 'pending').toLowerCase();

        return `
            <tr>
                <td>${employeeName}</td>
                <td>${leaveType}</td>
                <td>${formatDisplayDate(leave.startDate)}</td>
                <td>${formatDisplayDate(leave.endDate)}</td>
                <td>${days}</td>
                <td>${leave.reason}</td>
                <td><span class="badge badge-${status}">${mapLeaveStatusLabel(status)}</span></td>
                <td>
                    ${status === 'pending' ? `
                        <button class="btn btn-sm" onclick="viewLeave(${leave.id})">${t('Lihat', 'View')}</button>
                        <button class="btn btn-sm btn-success" onclick="approveLeave(${leave.id})">${t('Setujui', 'Approve')}</button>
                        <button class="btn btn-sm btn-danger" onclick="rejectLeave(${leave.id})">${t('Tolak', 'Reject')}</button>
                    ` : `
                        <button class="btn btn-sm" onclick="viewLeave(${leave.id})">${t('Lihat', 'View')}</button>
                    `}
                </td>
            </tr>
        `;
    }).join('');
}

function getLeaveTypeLabel(type) {
    const isEnglish = isEnLang();
    const labels = {
        sick: isEnglish ? 'Sick Leave' : 'Cuti Sakit',
        personal: isEnglish ? 'Personal Leave' : 'Cuti Pribadi',
        maternity: isEnglish ? 'Maternity Leave' : 'Cuti Melahirkan',
        other: isEnglish ? 'Other' : 'Lainnya',
        annual: isEnglish ? 'Annual Leave' : 'Cuti Tahunan'
    };

    return labels[String(type || '').toLowerCase()] || (type || t('Lainnya', 'Other'));
}

function approveLeave(leaveId) {
    const leave = leaves.find(l => l.id === leaveId);
    if (leave) {
        leave.status = 'approved';
        leave.approvedBy = currentUser.username;
        leave.approvedDate = new Date().toISOString().split('T')[0];
        localStorage.setItem('leaves', JSON.stringify(leaves));
        alert(t('Pengajuan cuti disetujui!', 'Leave request approved!'));
        loadLeaveRequests();
    }
}

async function rejectLeave(leaveId) {
    const reason = await askAppPrompt({
        title: t('Tolak Cuti', 'Reject Leave'),
        message: t('Masukkan alasan penolakan:', 'Enter rejection reason:'),
        placeholder: t('Contoh: Kebutuhan operasional mendesak', 'Example: Urgent operational needs'),
        confirmText: t('Tolak', 'Reject'),
        cancelText: t('Batal', 'Cancel'),
        variant: 'danger'
    });

    if (reason === null) return;

    const leave = leaves.find(l => l.id === leaveId);
    if (leave) {
        leave.status = 'rejected';
        leave.rejectionReason = reason;
        leave.rejectedBy = currentUser.username;
        leave.rejectedDate = new Date().toISOString().split('T')[0];
        localStorage.setItem('leaves', JSON.stringify(leaves));
        alert(t('Pengajuan cuti ditolak!', 'Leave request rejected!'));
        loadLeaveRequests();
    }
}

function viewLeave(leaveId) {
    const leave = leaves.find(l => l.id === leaveId);
    if (!leave) {
        notify(t('Detail cuti tidak ditemukan.', 'Leave details not found.'), 'warning');
        return;
    }

    const employeeName = leave.employeeName || leave.username || leave.name || '-';
    const leaveType = leave.typeLabel || getLeaveTypeLabel(leave.type);
    const status = String(leave.status || 'pending').toLowerCase();
    const start = new Date(leave.startDate);
    const end = new Date(leave.endDate);
    const days = Number(leave.daysRequested) || (Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1);
    const hasAttachment = !!(leave.attachmentDataUrl && leave.attachmentName);

    const statusInfo = {
        pending: t('Menunggu Persetujuan', 'Pending'),
        approved: t('Disetujui', 'Approved'),
        rejected: t('Ditolak', 'Rejected')
    };

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 740px; width: min(740px, 96vw);">
            <div class="modal-header">
                <h3><i class="fas fa-file-lines"></i> Detail Pengajuan Cuti</h3>
                <button type="button" class="modal-close" id="closeLeaveDetailModalBtn">&times;</button>
            </div>
            <div class="modal-body">
                <div class="announcement-detail-meta">
                    <span><strong>Status:</strong> ${escapeHtml(statusInfo[status] || status)}</span>
                    <span><strong>Jenis:</strong> ${escapeHtml(leaveType)}</span>
                    <span><strong>Jumlah Hari:</strong> ${escapeHtml(String(days))}</span>
                </div>

                <div class="table-responsive" style="border:1px solid var(--border-color); border-radius:0.7rem;">
                    <table class="data-table" style="margin:0;">
                        <tbody>
                            <tr><td><strong>Karyawan</strong></td><td>${escapeHtml(employeeName)}</td></tr>
                            <tr><td><strong>Tanggal Mulai</strong></td><td>${escapeHtml(formatDisplayDate(leave.startDate))}</td></tr>
                            <tr><td><strong>Tanggal Selesai</strong></td><td>${escapeHtml(formatDisplayDate(leave.endDate))}</td></tr>
                            <tr><td><strong>Diajukan Pada</strong></td><td>${escapeHtml(formatDisplayDate(leave.submittedDate))}</td></tr>
                            <tr><td><strong>Kontak Selama Cuti</strong></td><td>${escapeHtml(leave.contactInfo || '-')}</td></tr>
                            <tr><td><strong>Alamat Selama Cuti</strong></td><td>${escapeHtml(leave.leaveAddress || '-')}</td></tr>
                            <tr><td><strong>Alasan Cuti</strong></td><td>${escapeHtml(leave.reason || '-').replace(/\n/g, '<br>')}</td></tr>
                            <tr><td><strong>Lampiran</strong></td><td>${hasAttachment ? `
                                <div class="announcement-attachment-actions" style="justify-content:flex-start;">
                                    <span class="announcement-attachment-name" style="display:block; max-width:100%;">${escapeHtml(leave.attachmentName)}</span>
                                    <button type="button" class="btn btn-sm" data-leave-action="open-attachment">Lihat</button>
                                    <button type="button" class="btn btn-sm secondary" data-leave-action="download-attachment">Unduh</button>
                                </div>
                            ` : '-'}</td></tr>
                            <tr><td><strong>Alasan Penolakan</strong></td><td>${escapeHtml(leave.rejectionReason || '-')}</td></tr>
                            <tr><td><strong>Diproses Oleh</strong></td><td>${escapeHtml(leave.approvedBy || leave.rejectedBy || '-')}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn secondary" id="closeLeaveDetailFooterBtn">Tutup</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    if (typeof openOverlayModal === 'function') {
        openOverlayModal(modal);
    } else {
        modal.classList.add('open');
    }

    const close = () => {
        if (typeof closeOverlayModal === 'function') {
            closeOverlayModal(modal);
            return;
        }
        modal.remove();
    };

    modal.querySelector('#closeLeaveDetailModalBtn')?.addEventListener('click', close);
    modal.querySelector('#closeLeaveDetailFooterBtn')?.addEventListener('click', close);

    if (hasAttachment) {
        const openBtn = modal.querySelector('[data-leave-action="open-attachment"]');
        const downloadBtn = modal.querySelector('[data-leave-action="download-attachment"]');

        openBtn?.addEventListener('click', () => {
            openLeaveAttachment(leave);
        });
        downloadBtn?.addEventListener('click', () => {
            downloadLeaveAttachment(leave);
        });
    }

    modal.addEventListener('click', (event) => {
        if (event.target === modal) close();
    });
}

function formatDisplayDate(dateValue) {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}

function exportLeaveCSV() {
    if (!Array.isArray(leaves) || leaves.length === 0) {
        notify(t('Tidak ada data cuti untuk diekspor.', 'No leave data to export.'), 'warning');
        return;
    }

    const sortedLeaves = [...leaves].sort((a, b) => new Date(b.submittedDate || 0) - new Date(a.submittedDate || 0));

    const rows = [];
    rows.push(['Laporan Pengajuan Cuti']);
    rows.push(['Dibuat Pada', formatLeaveCsvDateTime(new Date())]);
    rows.push(['Dibuat Oleh', currentUser?.name || 'Admin']);
    rows.push(['Total Data', formatLeaveCsvNumber(sortedLeaves.length)]);
    rows.push([]);

    rows.push(['Diajukan Pada', 'Nama Karyawan', 'Jenis Cuti', 'Tanggal Mulai', 'Tanggal Selesai', 'Jumlah Hari', 'Status', 'Alasan']);
    sortedLeaves.forEach(leave => {
        const days = Number(leave.daysRequested) || 1;
        rows.push([
            formatDisplayDate(leave.submittedDate),
            leave.employeeName || leave.username || leave.name || '-',
            leave.typeLabel || getLeaveTypeLabel(leave.type),
            formatDisplayDate(leave.startDate),
            formatDisplayDate(leave.endDate),
            formatLeaveCsvNumber(days),
            leave.status || 'pending',
            String(leave.reason || '-').replace(/\n/g, ' ')
        ]);
    });

    const csv = rows
        .map(cols => cols.map(escapeLeaveCsvCell).join(','))
        .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leave-report-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    notify(t('Laporan cuti berhasil diunduh.', 'Leave report downloaded successfully.'), 'success');
}

function escapeLeaveCsvCell(value) {
    const text = String(value ?? '').replace(/"/g, '""');
    return `"${text}"`;
}

function formatLeaveCsvDateTime(dateValue) {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString(appLocale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).toLowerCase();
}

function formatLeaveCsvNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num.toLocaleString(appLocale()) : '-';
}

function openLeaveAttachment(leave) {
    const prepared = prepareLeaveAttachmentUrl(leave);
    if (!prepared) {
        notify(t('Lampiran tidak tersedia.', 'Attachment is not available.'), 'warning');
        return;
    }

    const newWindow = window.open(prepared.url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
        notify(t('Popup diblokir browser. Izinkan popup untuk melihat lampiran.', 'Popup blocked by browser. Allow popups to view the attachment.'), 'warning');
    }

    if (prepared.shouldRevoke) {
        setTimeout(() => URL.revokeObjectURL(prepared.url), 60 * 1000);
    }
}

function downloadLeaveAttachment(leave) {
    const prepared = prepareLeaveAttachmentUrl(leave);
    if (!prepared) {
        notify(t('Lampiran tidak tersedia.', 'Attachment is not available.'), 'warning');
        return;
    }

    const link = document.createElement('a');
    link.href = prepared.url;
    link.download = leave.attachmentName || `lampiran-cuti-${leave.id}`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    if (prepared.shouldRevoke) {
        setTimeout(() => URL.revokeObjectURL(prepared.url), 2000);
    }
}

function prepareLeaveAttachmentUrl(leave) {
    const dataUrl = leave && leave.attachmentDataUrl ? String(leave.attachmentDataUrl) : '';
    if (!dataUrl) return null;

    const blob = dataUrlToBlob(dataUrl);
    if (!blob) return null;

    return {
        url: URL.createObjectURL(blob),
        shouldRevoke: true
    };
}

function dataUrlToBlob(dataUrl) {
    if (!dataUrl || !dataUrl.includes(',')) return null;

    const parts = dataUrl.split(',');
    const meta = parts[0] || '';
    const base64 = parts[1] || '';
    const mimeMatch = meta.match(/data:([^;]+)/i);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

    try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
            bytes[i] = binary.charCodeAt(i);
        }
        return new Blob([bytes], { type: mime });
    } catch (error) {
        return null;
    }
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
