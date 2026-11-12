const fs = require('fs');
let sw = fs.readFileSync('sw.js', 'utf8');
sw = sw.replace('v9.5.6', 'v9.5.7');
fs.writeFileSync('sw.js', sw, 'utf8');

let h = fs.readFileSync('index.html', 'utf8');
h = h.replace('sw.js?v=9.5.6', 'sw.js?v=9.5.7');
fs.writeFileSync('index.html', h, 'utf8');

console.log('SW 9.5.7:', fs.readFileSync('sw.js', 'utf8').includes('v9.5.7'));
console.log('index reg 9.5.7:', fs.readFileSync('index.html', 'utf8').includes('sw.js?v=9.5.7'));
