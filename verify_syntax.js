const fs = require('fs');
const vm = require('vm');

function extractScripts(html, label) {
  const errors = [];
  const regex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  let count = 0;
  while ((m = regex.exec(html)) !== null) {
    count++;
    const code = m[1].trim();
    if (!code) continue;
    try {
      new vm.Script(code);
    } catch (e) {
      const lineCtx = code.substring(Math.max(0, e.position - 100), (e.position || 0) + 100);
      errors.push(`[${label}] Script #${count} error: ${e.message} near: ${JSON.stringify(lineCtx)}`);
    }
  }
  console.log(`[${label}] Checked ${count} script blocks`);
  return errors;
}

const indexHtml = fs.readFileSync('index.html', 'utf8');
const assinarHtml = fs.readFileSync('assinar.html', 'utf8');

const errors1 = extractScripts(indexHtml, 'index.html');
const errors2 = extractScripts(assinarHtml, 'assinar.html');
const allErrors = [...errors1, ...errors2];

if (allErrors.length === 0) {
  console.log('\nAll syntax checks PASSED!');
} else {
  console.error('\nSyntax errors found:');
  allErrors.forEach(e => console.error(e));
  process.exit(1);
}
