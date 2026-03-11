document.addEventListener('DOMContentLoaded', function() {
    initializeProfilePage();
});

let monthlyAttendanceChart = null;

function initializeProfilePage() {
    checkAuthStatus();

    if (!currentUser) {
        window.location.href = '../index.html';
        return;
    }

    loadPresensiData();
    initializeProfileIdentity();
    initializeYearFilter();
    initializeMonthFilter();
    initializeWeekFilter();
    initializeChartTypeFilter();
    renderYearlyStats(parseInt(document.getElementById('statsYear').value, 10));
}

function initializeProfileIdentity() {
    const employeeData = findEmployeeData();

    const fullName = employeeData.name || currentUser.name || '-';
    const username = currentUser.username || '-';
    const employeeId = employeeData.employeeId || employeeData.nik || employeeData.id || currentUser.id || '-';
    const email = employeeData.email || currentUser.email || usernameToEmail(username);
    const contact = employeeData.phone || employeeData.contact || employeeData.noHp || employeeData.noKontak || '-';
    const department = employeeData.department || employeeData.division || employeeData.divisi || '-';

    document.getElementById('profileName').textContent = fullName;
    document.getElementById('profileRole').textContent = formatRole(currentUser.role || 'user');
    document.getElementById('profileAvatar').textContent = fullName.charAt(0).toUpperCase();

    document.getElementById('profileContact').textContent = contact || '-';
    document.getElementById('profileEmail').textContent = email || '-';
    document.getElementById('profileEmployeeId').textContent = String(employeeId);
    document.getElementById('profileDepartment').textContent = department;
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
        const selectedYear = parseInt(this.value, 10);
        const selectedMonth = parseInt(document.getElementById('statsMonth').value, 10);
        populateWeekFilter(selectedYear, selectedMonth);
        renderYearlyStats(selectedYear);
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
        const year = parseInt(document.getElementById('statsYear').value, 10);
        populateWeekFilter(year, parseInt(this.value, 10));
        renderMonthlyDailyChart(year);
    });
}

function initializeWeekFilter() {
    const year = parseInt(document.getElementById('statsYear').value, 10);
    const month = parseInt(document.getElementById('statsMonth').value, 10);
    populateWeekFilter(year, month);

    document.getElementById('statsWeek').addEventListener('change', function() {
        const selectedYear = parseInt(document.getElementById('statsYear').value, 10);
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
        const year = parseInt(document.getElementById('statsYear').value, 10);
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
    const averageCheckin = calculateAverageCheckinTime(recordsInYear);

    document.getElementById('statTotalRecords').textContent = String(totalRecords);
    document.getElementById('statCheckin').textContent = String(totalCheckin);
    document.getElementById('statCheckout').textContent = String(totalCheckout);
    document.getElementById('statUniqueDays').textContent = String(uniqueDays);
    document.getElementById('statCompleteDays').textContent = String(completeDays);
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
