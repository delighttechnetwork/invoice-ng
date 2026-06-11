const fs = require('fs');
const path = require('path');

function locateFiles(dir) {
    try {
        const files = fs.readdirSync(dir);
        console.log(`Directory: ${dir}`);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            let s;
            try {
                s = fs.statSync(fullPath);
            } catch (e) {
                console.log(`  [Error statting ${file}]: ${e.message}`);
                continue;
            }
            if (s.isDirectory()) {
                console.log(`  [DIR]  ${file}`);
                // Only recurse if it's not a huge system folder
                if (file !== 'node_modules' && file !== '.git' && file !== 'proc' && file !== 'sys' && file !== 'dev') {
                    locateFiles(fullPath);
                }
            } else {
                console.log(`  [FILE] ${file} (${s.size} bytes)`);
            }
        }
    } catch (e) {
        console.log(`Error reading ${dir}: ${e.message}`);
    }
}

console.log('Finding files in /app:');
locateFiles('/app');
console.log('--- Done finding files ---');
