const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./js');
let updatedCount = 0;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let original = content;
    
    // Replace the inequality checks config for user
    content = content.replace(/currentUser\.role !== 'user'/g, "currentUser?.role !== 'karyawan'");
    
    // Replace the equality checks config for user
    content = content.replace(/currentUser\.role === 'user'/g, "currentUser?.role === 'karyawan'");

    // Handle any missing 'user' string matches for hardcoded UI roles
    content = content.replace(/'role': 'user'/g, "'role': 'karyawan'");

    if (original !== content) {
        fs.writeFileSync(f, content);
        updatedCount++;
        console.log('Updated user checks in ' + f);
    }
});

console.log('Total files patched: ' + updatedCount);
