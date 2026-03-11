document.addEventListener('DOMContentLoaded', function() {
    initializeProfilePage();
});

function initializeProfilePage() {
    checkAuthStatus();

    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }

    loadPresensiData();
    initializeProfileIdentity();
    initializeYearFilter();
    renderYearlyStats(parseInt(document.getElementById('statsYear').value, 10));
}

function initializeProfileIdentity() {
    const employeeData = findEmployeeData();

    const fullName = employeeData.name || currentUser.name || '-';
    const username = currentUser.username || '-';
    const employeeId = employeeData.employeeId || employeeData.nik || employeeData.id || currentUser.id || '-';
    const email = employeeData.email || currentUser.email || usernameToEmail(username);
    const contact = employeeData.phone || employeeData.contact || employeeData.noHp || employeeData.noKontak || '-';

    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileRole').textContent = formatRole(currentUser.role || 'user');
    document.getElementById('profileAvatar').textContent = fullName.charAt(0).toUpperCase();

    document.getElementById('profileContact').textContent = contact || '-';
    document.getElementById('profileEmail').textContent = email || '-';
    document.getElementById('profileEmployeeId').textContent = String(employeeId);
    document.getElementById('profileUsername').textContent = username;
}

function findEmployeeData() {
    if (!Array.isArray(employees) || employees.length === 0) {
        return {};
    }

    const byId = employees.find(emp => String(emp.id) === String(currentUser.id));
    if (byId) return byId;

    const byUsername = employees.find(emp => String(emp.username || '').toLowerCase() === String(currentUser.username || '').toLowerCase());
    if (byUsername) return byUsername;

    const byName = employees.find(emp => String(emp.name || '').toLowerCase() === String(currentUser.name || '').toLowerCase());
    return byName || {};
}

function usernameToEmail(username) {
    if (!username || username === '-') return '-';
    return username + '@globalnine.local';
}

function formatRole(role) {
    if (role === 'admin') return 'Administrator';
    if (role === 'user') return 'Karyawan';
    return role;
}

function initializeYearFilter() {
    const yearSelect = document.getElementById('statsYear');
    const years = getAvailableYears();

    yearSelect.innerHTML = years
        .map(year => `<option value="${year}">${year}</option>`)
        .join('');

    yearSelect.addEventListener('change', function() {
        renderYearlyStats(parseInt(this.value, 10));
    });
}

function getAvailableYears() {
    const ownRecords = getOwnAttendanceRecords();
    const extractedYears = ownRecords
        .map(record => {
            const date = parseDateFromRecord(record);
            return date ? date.getFullYear() : null;
        })
        .filter(Boolean);

    const currentYear = new Date().getFullYear();
    const uniqueYears = Array.from(new Set(extractedYears));

    if (!uniqueYears.includes(currentYear)) {
        uniqueYears.push(currentYear);
    }

    return uniqueYears.sort((a, b) => b - a);
}

function getOwnAttendanceRecords() {
    if (!Array.isArray(presensiData)) return [];

    return presensiData.filter(record => {
        const sameEmployeeId = String(record.employeeId || '') === String(currentUser.id);
        const sameUsername = String(record.username || '').toLowerCase() === String(currentUser.username || '').toLowerCase();
        const sameName = String(record.employeeName || '').toLowerCase() === String(currentUser.name || '').toLowerCase();
        return sameEmployeeId || sameUsername || sameName;
    });
}

function parseDateFromRecord(record) {
    if (record.timestamp) {
        const timestampDate = new Date(record.timestamp);
        if (!isNaN(timestampDate.getTime())) return timestampDate;
    }

    if (record.date) {
        const dateOnly = new Date(record.date);
        if (!isNaN(dateOnly.getTime())) return dateOnly;
    }

    return null;
}

function normalizeAttendanceType(type) {
    const value = String(type || '').toLowerCase();

    if (value === 'checkin' || value === 'check in') return 'checkin';
    if (value === 'checkout' || value === 'check out') return 'checkout';

    return 'unknown';
}

function renderYearlyStats(year) {
    const ownRecords = getOwnAttendanceRecords();
    const recordsInYear = ownRecords.filter(record => {
        const date = parseDateFromRecord(record);
        return date && date.getFullYear() === year;
    });

    const totalRecords = recordsInYear.length;
    const totalCheckin = recordsInYear.filter(r => normalizeAttendanceType(r.type) === 'checkin').length;
    const totalCheckout = recordsInYear.filter(r => normalizeAttendanceType(r.type) === 'checkout').length;

    const dayMap = new Map();
    recordsInYear.forEach(record => {
        const dateObj = parseDateFromRecord(record);
        if (!dateObj) return;

        const dayKey = dateObj.toISOString().split('T')[0];
        if (!dayMap.has(dayKey)) {
            dayMap.set(dayKey, { hasCheckin: false, hasCheckout: false });
        }

        const type = normalizeAttendanceType(record.type);
        const dayStatus = dayMap.get(dayKey);
        if (type === 'checkin') dayStatus.hasCheckin = true;
        if (type === 'checkout') dayStatus.hasCheckout = true;
    });

    const uniqueDays = dayMap.size;
    const completeDays = Array.from(dayMap.values()).filter(day => day.hasCheckin && day.hasCheckout).length;
    const consistency = uniqueDays > 0 ? Math.round((completeDays / uniqueDays) * 100) : 0;

    document.getElementById('statTotalRecords').textContent = String(totalRecords);
    document.getElementById('statCheckin').textContent = String(totalCheckin);
    document.getElementById('statCheckout').textContent = String(totalCheckout);
    document.getElementById('statUniqueDays').textContent = String(uniqueDays);
    document.getElementById('statCompleteDays').textContent = String(completeDays);
    document.getElementById('statConsistency').textContent = consistency + '%';

    renderMonthlySummary(recordsInYear, year);
}

function renderMonthlySummary(recordsInYear, year) {
    const monthlyStats = new Array(12).fill(0).map((_, index) => ({
        monthIndex: index,
        checkin: 0,
        checkout: 0,
        records: 0
    }));

    recordsInYear.forEach(record => {
        const dateObj = parseDateFromRecord(record);
        if (!dateObj || dateObj.getFullYear() !== year) return;

        const monthIndex = dateObj.getMonth();
        monthlyStats[monthIndex].records += 1;

        const type = normalizeAttendanceType(record.type);
        if (type === 'checkin') monthlyStats[monthIndex].checkin += 1;
        if (type === 'checkout') monthlyStats[monthIndex].checkout += 1;
    });

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthlySummaryContainer = document.getElementById('monthlySummary');

    monthlySummaryContainer.innerHTML = monthlyStats.map(month => `
        <div class="month-item">
            <div class="month-name">${monthNames[month.monthIndex]}</div>
            <div class="month-values">
                <span>Record: ${month.records}</span>
                <span>In: ${month.checkin}</span>
                <span>Out: ${month.checkout}</span>
            </div>
        </div>
    `).join('');
}
