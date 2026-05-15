const fs = require('fs');
const content = fs.readFileSync('d:\\VSCODE\\photo-viewer-scaffold-app (1)\\mobile-app\\screens\\HomeScreen.tsx', 'utf8');

let openBraces = 0;
let closeBraces = 0;
let lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    let open = (line.match(/\{/g) || []).length;
    let close = (line.match(/\}/g) || []).length;
    openBraces += open;
    closeBraces += close;
    if (closeBraces > openBraces) {
        console.log(`Mismatch at line ${i + 1}: open=${openBraces}, close=${closeBraces}`);
        console.log(`Line content: ${line}`);
        // break;
    }
}

console.log(`Total: open=${openBraces}, close=${closeBraces}`);
