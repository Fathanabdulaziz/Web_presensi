const fs = require('fs');

const injectionLogic = `
// Inject Admin Portal button into user sidebars
document.addEventListener('DOMContentLoaded', () => {
    if (!currentUser || !['admin', 'hr', 'manager', 'finance'].includes(currentUser?.role)) return;
    
    // Pastikan kita ada di folder user/
    if (!window.location.pathname.includes('/user/')) return;
    
    // Wait for a tiny bit so the DOM is fully constructed
    setTimeout(() => {
        const navs = document.querySelectorAll('nav.sidebar-nav');
        navs.forEach(nav => {
            if (nav.querySelector('.nav-admin-portal')) return;

            const adminBtn = document.createElement('a');
            adminBtn.href = '../admin/dashboard.html';
            adminBtn.className = 'nav-item nav-admin-portal';
            adminBtn.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
            adminBtn.style.color = '#3b82f6';
            adminBtn.style.fontWeight = 'bold';
            adminBtn.innerHTML = '<i class="fas fa-user-shield"></i> \n \xa0 Panel Manajemen';
            
            nav.insertBefore(adminBtn, nav.firstElementChild);
        });
    }, 100);
});
`;

fs.appendFileSync('js/script.js', '\n' + injectionLogic);
console.log('Appended navigation injector');
