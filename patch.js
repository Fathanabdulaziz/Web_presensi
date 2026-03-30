const fs = require('fs');
let code = fs.readFileSync('js/script.js', 'utf8');

const target = "    if (typeof currentUser !== 'undefined' && currentUser && currentUser.sessionSource === 'local') {\r\n        const requestError = new Error('Lokal fallback aktif.');\r\n        requestError.code = 'API_UNAVAILABLE';\r\n        throw requestError;\r\n    }";

const replacement = `    let localSourceActive = false;
    if (typeof currentUser !== 'undefined' && currentUser && currentUser.sessionSource === 'local') {
        localSourceActive = true;
    } else {
        try {
            const rawUser = localStorage.getItem('currentUser');
            if (rawUser && JSON.parse(rawUser)?.sessionSource === 'local') localSourceActive = true;
        } catch (e) {}
    }

    if (localSourceActive) {
        const requestError = new Error('Lokal fallback aktif.');
        requestError.code = 'API_UNAVAILABLE';
        throw requestError;
    }`;

if (code.includes(target)) {
    code = code.replace(target, replacement);
    fs.writeFileSync('js/script.js', code);
    console.log('Patch complete.');
} else {
    // Try without \r
    const target2 = "    if (typeof currentUser !== 'undefined' && currentUser && currentUser.sessionSource === 'local') {\n        const requestError = new Error('Lokal fallback aktif.');\n        requestError.code = 'API_UNAVAILABLE';\n        throw requestError;\n    }";
    if (code.includes(target2)) {
        code = code.replace(target2, replacement);
        fs.writeFileSync('js/script.js', code);
        console.log('Patch complete. (Unix newlines)');
    } else {
        console.log('Target string not found!');
    }
}
