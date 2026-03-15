document.addEventListener('DOMContentLoaded', function() {
    initializeProfilePage();
});

let monthlyAttendanceChart = null;
let currentProfileData = {};
const MONTHLY_SUMMARY_VIEW_SIZE = 3;
const MONTHLY_SUMMARY_MOBILE_VIEW_SIZE = 2;
const monthlySummaryState = {
    startIndex: 0,
    stats: [],
    slideDirection: 'next'
};

function initializeProfilePage() {
    checkAuthStatus();

    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }

    loadPresensiData();
    initializeProfileIdentity();
    initializeYearFilter();
    initializeChartYearFilter();
    initializeMonthFilter();
    initializeWeekFilter();
    initializeChartTypeFilter();
    setupProfileEditForm();
    setupMonthlySummaryNavigation();
    renderYearlyStats(parseInt(document.getElementById('statsYear').value, 10));

    window.addEventListener('resize', handleMonthlySummaryViewportResize);
}

function getMonthlySummaryViewSize() {
    return window.matchMedia('(max-width: 768px)').matches
        ? MONTHLY_SUMMARY_MOBILE_VIEW_SIZE
        : MONTHLY_SUMMARY_VIEW_SIZE;
}

function handleMonthlySummaryViewportResize() {
    const viewSize = getMonthlySummaryViewSize();
    monthlySummaryState.startIndex = getPagedSliderMeta(
        monthlySummaryState.stats.length,
        viewSize,
        monthlySummaryState.startIndex
    ).startIndex;

    renderMonthlySummaryCards();
}

function setupMonthlySummaryNavigation() {
    const prevBtn = document.getElementById('monthlyPrevBtn');
    const nextBtn = document.getElementById('monthlyNextBtn');

    if (!prevBtn || !nextBtn) return;

    prevBtn.addEventListener('click', function() {
        shiftMonthlySummary(-getMonthlySummaryViewSize());
    });

    nextBtn.addEventListener('click', function() {
        shiftMonthlySummary(getMonthlySummaryViewSize());
    });
}

function shiftMonthlySummary(step) {
    const viewSize = getMonthlySummaryViewSize();
    const nextStart = shiftPagedSliderStart(
        monthlySummaryState.stats.length,
        viewSize,
        monthlySummaryState.startIndex,
        step
    );

    if (nextStart === monthlySummaryState.startIndex) return;

    monthlySummaryState.slideDirection = step > 0 ? 'next' : 'prev';
    monthlySummaryState.startIndex = nextStart;
    renderMonthlySummaryCards();
}

function initializeProfileIdentity() {
    const employeeData = findEmployeeData();

    const fullName = employeeData.name || currentUser.name || '-';
    const username = currentUser.username || '-';
    const employeeId = employeeData.employeeId || employeeData.companyId || employeeData.nik || '-';
    const email = employeeData.email || currentUser.email || usernameToEmail(username);
    const contact = employeeData.phone || employeeData.contact || employeeData.noHp || employeeData.noKontak || '-';
    const department = employeeData.department || employeeData.division || employeeData.divisi || '-';
    const gender = employeeData.gender || '-';
    const position = employeeData.position || '-';
    const joinDate = employeeData.joinDate || employeeData.tanggalBergabung || '';
    const maternityLeaveDetail = employeeData.maternityLeaveDetail || '-';

    currentProfileData = {
        name: fullName,
        username,
        employeeId: String(employeeId),
        email: email || '-',
        contact: contact || '-',
        department: department || '-',
        gender: gender || '-',
        position: position || '-',
        joinDate: joinDate || '',
        maternityLeaveDetail: maternityLeaveDetail || '-'
    };

    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileRole').textContent = formatRole(currentUser.role || 'user');
    document.getElementById('profileAvatar').textContent = fullName.charAt(0).toUpperCase();

    document.getElementById('profileContact').textContent = contact || '-';
    document.getElementById('profileEmail').textContent = email || '-';
    document.getElementById('profileEmployeeId').textContent = String(employeeId);
    document.getElementById('profileDepartment').textContent = department;
    document.getElementById('profileUsername').textContent = username;
    document.getElementById('profileGender').textContent = gender || '-';
    document.getElementById('profilePosition').textContent = position || '-';
        document.getElementById('profileJoinDate').textContent = joinDate ? formatDisplayDate(joinDate) : '-';

    const maternityRow = document.getElementById('profileMaternityDetailRow');
    const maternityValue = document.getElementById('profileMaternityDetail');
    const isFemale = String(gender || '').toLowerCase() === 'perempuan';
    if (maternityRow && maternityValue) {
        maternityRow.style.display = isFemale ? '' : 'none';
        maternityValue.textContent = isFemale ? (maternityLeaveDetail || '-') : '-';
    }
}

function formatDisplayDate(dateValue) {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    }).toLowerCase();
}

function setupProfileEditForm() {
    const modal = document.getElementById('editProfileModal');
    const openBtn = document.getElementById('editProfileBtn');
    const closeBtn = document.getElementById('closeEditProfileModalBtn');
    const cancelBtn = document.getElementById('cancelEditProfileBtn');
    const form = document.getElementById('editProfileForm');

    if (!modal || !openBtn || !form) return;

    document.getElementById('editProfileGender')?.addEventListener('change', toggleMaternityDetailField);

    openBtn.addEventListener('click', () => {
        populateEditProfileForm();
        modal.style.display = 'block';
    });

    closeBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    cancelBtn?.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    form.addEventListener('submit', handleEditProfileSubmit);
}

function populateEditProfileForm() {
    const data = currentProfileData;
    const departmentSelect = document.getElementById('editProfileDepartment');

    document.getElementById('editProfileName').value = data.name || '';
    document.getElementById('editProfileUsername').value = data.username || '';
    document.getElementById('editProfileEmployeeId').value = data.employeeId || '';
    const currentDepartment = data.department && data.department !== '-' ? data.department : '';

    if (departmentSelect) {
        const hasOption = Array.from(departmentSelect.options).some(option => option.value === currentDepartment);
        if (currentDepartment && !hasOption) {
            const dynamicOption = document.createElement('option');
            dynamicOption.value = currentDepartment;
            dynamicOption.textContent = currentDepartment;
            departmentSelect.appendChild(dynamicOption);
        }

        departmentSelect.value = currentDepartment;
    }

    document.getElementById('editProfileEmail').value = data.email && data.email !== '-' ? data.email : '';
    document.getElementById('editProfileContact').value = data.contact && data.contact !== '-' ? data.contact : '';
    document.getElementById('editProfileGender').value = data.gender && data.gender !== '-' ? data.gender : '';
    document.getElementById('editProfilePosition').value = data.position && data.position !== '-' ? data.position : '';
    document.getElementById('editProfileJoinDate').value = data.joinDate || '';
    document.getElementById('editProfileMaternityDetail').value = data.maternityLeaveDetail && data.maternityLeaveDetail !== '-' ? data.maternityLeaveDetail : '';
    toggleMaternityDetailField();
}

function toggleMaternityDetailField() {
    const gender = document.getElementById('editProfileGender')?.value || '';
    const group = document.getElementById('editMaternityDetailGroup');
    if (!group) return;

    group.style.display = String(gender).toLowerCase() === 'perempuan' ? '' : 'none';
}

function handleEditProfileSubmit(e) {
    e.preventDefault();

    const name = document.getElementById('editProfileName').value.trim();
    const username = document.getElementById('editProfileUsername').value.trim();
    const employeeId = document.getElementById('editProfileEmployeeId').value.trim();
    const email = document.getElementById('editProfileEmail').value.trim();
    const contact = document.getElementById('editProfileContact').value.trim();
    const department = document.getElementById('editProfileDepartment').value.trim();
    const gender = document.getElementById('editProfileGender').value.trim();
    const position = document.getElementById('editProfilePosition').value.trim();
    const joinDate = document.getElementById('editProfileJoinDate').value;
    const maternityLeaveDetail = document.getElementById('editProfileMaternityDetail').value.trim();

    if (!name || !username || !email) {
        alert('Nama, username, dan email wajib diisi.');
        return;
    }

    const updatedUser = {
        ...currentUser,
        name,
        username,
        email
    };

    currentUser = updatedUser;
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));

    upsertEmployeeProfile({
        name,
        username,
        employeeId,
        companyId: employeeId,
        email,
        department,
        gender,
        position,
        joinDate,
        maternityLeaveDetail: String(gender).toLowerCase() === 'perempuan' ? maternityLeaveDetail : '',
        contact,
        noHp: contact,
        noKontak: contact,
        phone: contact
    });

    initializeProfileIdentity();
    updateUserDisplay();
    document.getElementById('editProfileModal').style.display = 'none';
    alert('Informasi profile berhasil diperbarui.');
}

function upsertEmployeeProfile(profileData) {
    if (!Array.isArray(employees)) {
        employees = [];
    }

    const index = employees.findIndex(emp => String(emp.id) === String(currentUser.id));
    if (index >= 0) {
        employees[index] = {
            ...employees[index],
            ...profileData
        };
    } else {
        employees.push({
            id: currentUser.id,
            ...profileData
        });
    }

    localStorage.setItem('employees', JSON.stringify(employees));
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
    const currentYear = new Date().getFullYear();

    yearSelect.innerHTML = years
        .map(year => `<option value="${year}">${year}</option>`)
        .join('');

    if (years.includes(currentYear)) {
        yearSelect.value = String(currentYear);
    }

    yearSelect.addEventListener('change', function() {
        const selectedYear = parseInt(this.value, 10);
        const chartYearSelect = document.getElementById('chartYear');
        if (chartYearSelect) {
            chartYearSelect.value = String(selectedYear);
        }
        const selectedMonth = parseInt(document.getElementById('statsMonth').value, 10);
        populateWeekFilter(selectedYear, selectedMonth);
        renderYearlyStats(selectedYear);
    });
}

function initializeChartYearFilter() {
    const yearSelect = document.getElementById('statsYear');
    const chartYearSelect = document.getElementById('chartYear');
    if (!yearSelect || !chartYearSelect) return;

    chartYearSelect.innerHTML = yearSelect.innerHTML;
    chartYearSelect.value = yearSelect.value;

    chartYearSelect.addEventListener('change', function() {
        const selectedYear = parseInt(this.value, 10);
        const selectedMonth = parseInt(document.getElementById('statsMonth').value, 10);
        populateWeekFilter(selectedYear, selectedMonth);
        renderMonthlyDailyChart(selectedYear);
    });
}

function initializeMonthFilter() {
    const monthSelect = document.getElementById('statsMonth');
    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

    monthSelect.innerHTML = monthNames
        .map((monthName, index) => `<option value="${index}">${monthName}</option>`)
        .join('');

    monthSelect.value = String(new Date().getMonth());

    monthSelect.addEventListener('change', function() {
        const year = parseInt(document.getElementById('chartYear').value || document.getElementById('statsYear').value, 10);
        populateWeekFilter(year, parseInt(this.value, 10));
        renderMonthlyDailyChart(year);
    });
}

function initializeWeekFilter() {
    const year = parseInt(document.getElementById('chartYear')?.value || document.getElementById('statsYear').value, 10);
    const month = parseInt(document.getElementById('statsMonth').value, 10);
    populateWeekFilter(year, month);

    document.getElementById('statsWeek').addEventListener('change', function() {
        const selectedYear = parseInt(document.getElementById('chartYear')?.value || document.getElementById('statsYear').value, 10);
        renderMonthlyDailyChart(selectedYear);
    });
}

function populateWeekFilter(year, month) {
    const weekSelect = document.getElementById('statsWeek');
    const previousValue = weekSelect.value || 'all';
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const weekCount = Math.ceil(daysInMonth / 7);

    let options = '<option value="all">Semua Minggu</option>';
    for (let week = 1; week <= weekCount; week += 1) {
        options += `<option value="${week}">Minggu ${week}</option>`;
    }

    weekSelect.innerHTML = options;

    if (previousValue !== 'all' && parseInt(previousValue, 10) <= weekCount) {
        weekSelect.value = previousValue;
    } else {
        weekSelect.value = 'all';
    }
}

function initializeChartTypeFilter() {
    const chartTypeSelect = document.getElementById('chartType');
    chartTypeSelect.addEventListener('change', function() {
        const year = parseInt(document.getElementById('chartYear')?.value || document.getElementById('statsYear').value, 10);
        renderMonthlyDailyChart(year);
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
    const yearsSet = new Set(extractedYears);

    // Provide a continuous year list so options keep extending over time.
    const startYear = currentYear - 10;
    const endYear = currentYear + 10;
    for (let year = startYear; year <= endYear; year += 1) {
        yearsSet.add(year);
    }

    return Array.from(yearsSet).sort((a, b) => b - a);
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

function isSameUserRecord(record) {
    const sameEmployeeId = String(record.employeeId || record.userId || '') === String(currentUser.id || '');
    const sameUsername = String(record.username || '').toLowerCase() === String(currentUser.username || '').toLowerCase();
    const sameName = String(record.employeeName || record.name || '').toLowerCase() === String(currentUser.name || '').toLowerCase();
    return sameEmployeeId || sameUsername || sameName;
}

function getOwnLeaveRecords() {
    if (!Array.isArray(leaves)) return [];
    return leaves.filter(isSameUserRecord);
}

function getOwnPermissionRecords() {
    if (!Array.isArray(permissions)) return [];
    return permissions.filter(isSameUserRecord);
}

function parseDateFromFields(record, fieldNames) {
    for (let i = 0; i < fieldNames.length; i += 1) {
        const value = record[fieldNames[i]];
        if (!value) continue;

        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
            return parsed;
        }
    }

    return null;
}

function isRejected(record) {
    return String(record?.status || '').toLowerCase() === 'rejected';
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
    const averageCheckin = calculateAverageCheckinTime(recordsInYear);

    document.getElementById('statCheckin').textContent = String(totalCheckin);
    document.getElementById('statCheckout').textContent = String(totalCheckout);
    document.getElementById('statConsistency').textContent = consistency + '%';
    document.getElementById('statAverageCheckin').textContent = averageCheckin;

    renderMonthlySummary(recordsInYear, year);
    renderMonthlyDailyChart(year);
}

function calculateAverageCheckinTime(recordsInYear) {
    const checkinMinutes = recordsInYear
        .filter(record => normalizeAttendanceType(record.type) === 'checkin')
        .map(extractMinutesFromRecord)
        .filter(minutes => minutes !== null);

    if (checkinMinutes.length === 0) {
        return '-';
    }

    const total = checkinMinutes.reduce((sum, value) => sum + value, 0);
    const avgMinutes = Math.round(total / checkinMinutes.length);

    const hours = Math.floor(avgMinutes / 60) % 24;
    const minutes = avgMinutes % 60;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function extractMinutesFromRecord(record) {
    if (record.timestamp) {
        const date = new Date(record.timestamp);
        if (!isNaN(date.getTime())) {
            return date.getHours() * 60 + date.getMinutes();
        }
    }

    const timeText = String(record.time || '').trim();
    const matched = timeText.match(/(\d{1,2})[:.](\d{1,2})/);
    if (!matched) {
        return null;
    }

    const hours = parseInt(matched[1], 10);
    const minutes = parseInt(matched[2], 10);

    if (isNaN(hours) || isNaN(minutes)) {
        return null;
    }

    return (hours * 60) + minutes;
}

function extractDateTimeFromRecord(record) {
    if (record.timestamp) {
        const timestampDate = new Date(record.timestamp);
        if (!isNaN(timestampDate.getTime())) return timestampDate;
    }

    if (!record.date || !record.time) return null;

    const datePart = String(record.date).trim();
    const timePart = String(record.time).trim();
    const parsed = new Date(`${datePart}T${timePart}`);
    if (!isNaN(parsed.getTime())) return parsed;

    return null;
}

function renderMonthlySummary(recordsInYear, year) {
    const monthlyStats = new Array(12).fill(0).map((_, index) => ({
        monthIndex: index,
        checkin: 0,
        checkout: 0,
        hadir: 0,
        pulangCepat: 0,
        tidakHadir: 0,
        cuti: 0,
        izin: 0
    }));

    // Group by day first so each day can be evaluated with attendance duration rules.
    const dayBuckets = new Map();
    recordsInYear.forEach(record => {
        const dateObj = parseDateFromRecord(record);
        if (!dateObj || dateObj.getFullYear() !== year) return;

        const monthIndex = dateObj.getMonth();
        const dayKey = dateObj.toISOString().split('T')[0];
        const dateTimeObj = extractDateTimeFromRecord(record);

        if (!dayBuckets.has(dayKey)) {
            dayBuckets.set(dayKey, {
                monthIndex,
                checkin: 0,
                checkout: 0,
                earliestCheckin: null,
                latestCheckout: null
            });
        }

        const bucket = dayBuckets.get(dayKey);
        const type = normalizeAttendanceType(record.type);
        if (type === 'checkin') {
            bucket.checkin += 1;
            monthlyStats[monthIndex].checkin += 1;
            if (dateTimeObj && (!bucket.earliestCheckin || dateTimeObj < bucket.earliestCheckin)) {
                bucket.earliestCheckin = dateTimeObj;
            }
        }
        if (type === 'checkout') {
            bucket.checkout += 1;
            monthlyStats[monthIndex].checkout += 1;
            if (dateTimeObj && (!bucket.latestCheckout || dateTimeObj > bucket.latestCheckout)) {
                bucket.latestCheckout = dateTimeObj;
            }
        }
    });

    // Rules requested by user:
    // 1) Tidak hadir tidak dihitung otomatis (baseline 0).
    // 2) Pulang cepat jika check-out terakhir sebelum 17:00.
    // 3) Jika ada aktivitas presensi tapi belum check-out, tetap dihitung hadir.
    dayBuckets.forEach(day => {
        const monthStat = monthlyStats[day.monthIndex];
        const hasAttendance = day.checkin > 0 || day.checkout > 0;

        if (!hasAttendance) return;

        if (day.latestCheckout) {
            const checkoutHour = day.latestCheckout.getHours();
            if (checkoutHour < 17) {
                monthStat.pulangCepat += 1;
            } else {
                monthStat.hadir += 1;
            }
            return;
        }

        monthStat.hadir += 1;
    });

    const leaveRecords = getOwnLeaveRecords();
    leaveRecords.forEach(leave => {
        if (isRejected(leave)) return;

        const leaveDate = parseDateFromFields(leave, ['submittedDate', 'startDate', 'date', 'timestamp']);
        if (!leaveDate || leaveDate.getFullYear() !== year) return;

        monthlyStats[leaveDate.getMonth()].cuti += 1;
    });

    const permissionRecords = getOwnPermissionRecords();
    permissionRecords.forEach(permission => {
        if (isRejected(permission)) return;

        const permissionDate = parseDateFromFields(permission, ['submittedDate', 'requestDate', 'date', 'timestamp', 'startDate']);
        if (!permissionDate || permissionDate.getFullYear() !== year) return;

        monthlyStats[permissionDate.getMonth()].izin += 1;
    });

    monthlySummaryState.stats = monthlyStats;
    monthlySummaryState.startIndex = 0;
    monthlySummaryState.slideDirection = 'next';
    renderMonthlySummaryCards();
}

function buildMonthSparkline(month) {
    const series = [month.hadir, month.pulangCepat, month.tidakHadir, month.cuti, month.izin];
    const width = 100;
    const height = 50;
    const paddingX = 5;
    const paddingY = 6;
    const maxValue = Math.max(...series, 1);
    const usableWidth = width - (paddingX * 2);
    const usableHeight = height - (paddingY * 2);
    const stepX = usableWidth / (series.length - 1);

    const points = series.map((value, index) => {
        const x = paddingX + (index * stepX);
        const y = height - paddingY - ((value / maxValue) * usableHeight);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
    });

    const baselineY = height - paddingY;
    const areaPoints = `${paddingX},${baselineY} ${points.join(' ')} ${width - paddingX},${baselineY}`;

    return `
        <div class="month-sparkline" aria-hidden="true">
            <svg viewBox="0 0 ${width} ${height}" class="month-sparkline-svg" focusable="false">
                <polygon points="${areaPoints}" class="month-sparkline-area"></polygon>
                <polyline points="${points.join(' ')}" class="month-sparkline-line" pathLength="100"></polyline>
                ${points.map(point => `<circle cx="${point.split(',')[0]}" cy="${point.split(',')[1]}" r="2.3" class="month-sparkline-dot"></circle>`).join('')}
            </svg>
            <div class="month-sparkline-labels">
                <span>H</span>
                <span>P</span>
                <span>T</span>
                <span>C</span>
                <span>I</span>
            </div>
        </div>
    `;
}

function renderMonthlySummaryCards() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const monthlySummaryContainer = document.getElementById('monthlySummary');
    const rangeLabel = document.getElementById('monthlySummaryRange');
    const prevBtn = document.getElementById('monthlyPrevBtn');
    const nextBtn = document.getElementById('monthlyNextBtn');

    if (!monthlySummaryContainer) return;

    const viewSize = getMonthlySummaryViewSize();
    const pagination = getPagedSliderMeta(monthlySummaryState.stats.length, viewSize, monthlySummaryState.startIndex);
    monthlySummaryState.startIndex = pagination.startIndex;

    const visibleStats = monthlySummaryState.stats.slice(
        pagination.startIndex,
        pagination.startIndex + viewSize
    );

    const slideClass = monthlySummaryState.slideDirection === 'prev' ? 'slide-prev' : 'slide-next';

    monthlySummaryContainer.classList.remove('slide-next', 'slide-prev');
    void monthlySummaryContainer.offsetWidth;
    monthlySummaryContainer.classList.add(slideClass);

    monthlySummaryContainer.innerHTML = visibleStats.map((month, index) => `
        <article class="month-item ${slideClass}" style="animation-delay:${index * 0.05}s">
            <div class="month-item-head">
                <div class="month-name">${monthNames[month.monthIndex]}</div>
                <div class="month-checkio">${month.checkin} in • ${month.checkout} out</div>
            </div>
            ${buildMonthSparkline(month)}
            <div class="month-values">
                <span class="month-pill month-pill-success">Hadir ${month.hadir}</span>
                <span class="month-pill month-pill-warning">Pulang Cepat ${month.pulangCepat}</span>
                <span class="month-pill month-pill-danger">Tidak Hadir ${month.tidakHadir}</span>
                <span class="month-pill month-pill-leave">Cuti ${month.cuti}</span>
                <span class="month-pill month-pill-permit">Izin ${month.izin}</span>
            </div>
        </article>
    `).join('');

    const startMonth = visibleStats[0] ? monthNames[visibleStats[0].monthIndex] : '-';
    const endMonth = visibleStats[visibleStats.length - 1] ? monthNames[visibleStats[visibleStats.length - 1].monthIndex] : '-';

    if (rangeLabel) {
        rangeLabel.textContent = `${startMonth} - ${endMonth}`;
    }

    if (prevBtn) {
        prevBtn.disabled = !pagination.hasPrev;
    }

    if (nextBtn) {
        nextBtn.disabled = !pagination.hasNext;
    }
}

function renderMonthlyDailyChart(year) {
    const selectedMonth = parseInt(document.getElementById('statsMonth').value, 10);
    const selectedWeek = document.getElementById('statsWeek').value;
    const chartType = document.getElementById('chartType').value;
    const ownRecords = getOwnAttendanceRecords();

    const daysInMonth = new Date(year, selectedMonth + 1, 0).getDate();
    const startDay = selectedWeek === 'all' ? 1 : ((parseInt(selectedWeek, 10) - 1) * 7) + 1;
    const endDay = selectedWeek === 'all' ? daysInMonth : Math.min(startDay + 6, daysInMonth);

    const labels = [];
    for (let day = startDay; day <= endDay; day += 1) {
        labels.push(String(day));
    }

    const checkinValues = new Array(labels.length).fill(0);
    const checkoutValues = new Array(labels.length).fill(0);

    ownRecords.forEach(record => {
        const dateObj = parseDateFromRecord(record);
        if (!dateObj) return;

        if (dateObj.getFullYear() !== year || dateObj.getMonth() !== selectedMonth) {
            return;
        }

        const dayOfMonth = dateObj.getDate();
        if (dayOfMonth < startDay || dayOfMonth > endDay) {
            return;
        }

        const dayIndex = dayOfMonth - startDay;
        const type = normalizeAttendanceType(record.type);
        if (type === 'checkin') {
            checkinValues[dayIndex] += 1;
        }
        if (type === 'checkout') {
            checkoutValues[dayIndex] += 1;
        }
    });

    const canvas = document.getElementById('monthlyAttendanceChart');
    if (!canvas) return;

    if (monthlyAttendanceChart) {
        monthlyAttendanceChart.destroy();
    }

    const ctx = canvas.getContext('2d');
    const lineGradient = ctx.createLinearGradient(0, 0, 0, 320);
    lineGradient.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
    lineGradient.addColorStop(1, 'rgba(16, 185, 129, 0.08)');

    const isLineChart = chartType === 'line';
    const isRadarChart = chartType === 'radar';

    const checkinDataset = {
        label: 'Jumlah Check-in Harian',
        data: checkinValues,
        borderColor: isLineChart ? '#10b981' : '#10b981',
        backgroundColor: isLineChart ? lineGradient : (isRadarChart ? 'rgba(16, 185, 129, 0.25)' : 'rgba(16, 185, 129, 0.5)'),
        fill: isLineChart || isRadarChart,
        borderWidth: 2,
        tension: isLineChart ? 0.4 : 0.2,
        pointRadius: isLineChart ? 5 : 3,
        pointHoverRadius: isLineChart ? 6 : 4,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2
    };

    const checkoutDataset = {
        label: 'Jumlah Check-out Harian',
        data: checkoutValues,
        borderColor: '#f97316',
        backgroundColor: isRadarChart ? 'rgba(249, 115, 22, 0.22)' : 'rgba(249, 115, 22, 0.35)',
        fill: isRadarChart,
        borderWidth: 2,
        tension: isLineChart ? 0.35 : 0.2,
        pointRadius: isLineChart ? 5 : 3,
        pointHoverRadius: isLineChart ? 6 : 4,
        pointBackgroundColor: '#f97316',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        borderDash: isLineChart ? [5, 4] : []
    };

    monthlyAttendanceChart = new Chart(canvas, {
        type: chartType,
        data: {
            labels,
            datasets: [checkinDataset, checkoutDataset]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: isRadarChart ? {} : {
                x: {
                    grid: {
                        display: false
                    }
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    },
                    grid: {
                        color: 'rgba(107, 114, 128, 0.25)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8
                    }
                }
            }
        }
    });
}
