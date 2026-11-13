// node tools/code.js CODE '{"coins":500}'   -> prints the line to paste into DL.CODES in js/codes.js
// rewards: {coins:N}  {car:'random'|'<id>'}  {item:'random', cat:'decal'|'finish'|...}  {coins:N, car:'random'}  optional {until:'YYYYMMDD'}
const crypto = require('crypto');
const code = (process.argv[2] || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
const rw = process.argv[3] || '{"coins":500}';
const h = crypto.createHash('sha256').update('dayline:' + code).digest('hex');
console.log(`    '${h}': ${rw},`);
