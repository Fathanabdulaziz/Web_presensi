const fs = require('fs');

const adminFilterLogic = `
// Role-based Access Control for Admin Dashboard Sidebar
document.addEventListener('DOMContentLoaded', () => {
    if (!currentUser) return;
    
    // Check if we are in admin section
    if (window.location.pathname.includes('/admin/')) {
        const role = currentUser?.role || '';
        
        // Allowed paths for each role
        const permissions = {
            'admin': ['all'],
            'hr': ['all'],
            'manager': ['dashboard.html', 'attendance.html', 'leave.html', 'index.html'],
            'finance': ['dashboard.html', 'attendance.html', 'index.html'] // Only Dasbor and Presensi
        };
        
        const myPerms = permissions[role] || [];
        
        // Hide sidebar links
        setTimeout(() => {
            const navLinks = document.querySelectorAll('nav.sidebar-nav a.nav-item');
            navLinks.forEach(link => {
                const targetHref = link.getAttribute('href');
                if (myPerms.includes('all')) return; // Allow
                
                let isAllowed = false;
                myPerms.forEach(allowedHref => {
                    if (targetHref.includes(allowedHref)) isAllowed = true;
                });
                
                if (!isAllowed && targetHref !== '#') { // Hide unauthorized menus
                    link.style.display = 'none';
                }
            });
        }, 100);

        // Security Kick: if accessing unauthorized page, redirect to admin dashboard
        let currentPage = window.location.pathname.split('/').pop() || 'dashboard.html';
        if (!myPerms.includes('all')) {
            let pageAllowed = false;
            myPerms.forEach(allowedHref => {
                if (currentPage.includes(allowedHref)) pageAllowed = true;
            });
            
            if (!pageAllowed) {
                window.location.href = 'dashboard.html';
            }
        }
        
        // Injection to go back to Employee panel
        setTimeout(() => {
            const navs = document.querySelectorAll('nav.sidebar-nav');
            navs.forEach(nav => {
                if (nav.querySelector('.nav-user-portal')) return;

                const userBtn = document.createElement('a');
                userBtn.href = '../user/dashboard.html';
                userBtn.className = 'nav-item nav-user-portal';
                userBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                userBtn.style.color = '#10b981';
                userBtn.style.fontWeight = 'bold';
                userBtn.innerHTML = '<i class="fas fa-user-circle"></i> \n \xa0 Halaman Pribadi (Absen)';
                
                const returnText = nav.appendChild(userBtn);
            });
        }, 110);
    }
});
`;

fs.appendFileSync('js/script.js', '\n' + adminFilterLogic);
console.log('Appended admin sidebar filter logic');
