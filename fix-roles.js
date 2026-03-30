const fs = require('fs');

let authPhp = fs.readFileSync('backend/src/Api/Handlers/AuthHandler.php', 'utf8');
authPhp = authPhp.replace(/'role' \=> 'user'/g, "'role' => 'karyawan'");
fs.writeFileSync('backend/src/Api/Handlers/AuthHandler.php', authPhp);

let scriptJs = fs.readFileSync('js/script.js', 'utf8');
scriptJs = scriptJs.replace(/role: 'user'/g, "role: 'karyawan'");
scriptJs = scriptJs.replace(/role === 'user'/g, "role === 'karyawan'");
scriptJs = scriptJs.replace(/currentUser\.role === 'admin'/g, "['hr', 'finance', 'manager', 'admin'].includes(currentUser.role)");
fs.writeFileSync('js/script.js', scriptJs);

console.log('Update success');
