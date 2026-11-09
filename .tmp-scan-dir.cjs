const fs = require('fs');
const path = require('path');
const root = process.argv[2];
const re1 = /kind\s*:\s*['"]plugin['"]/;
const re2 = /['"]kind['"]\s*:\s*['"]plugin['"]/;
const skip = /[\\/](\.git|test|tests|__tests__|node_modules[\\/]\.cache)[\\/]/;
let hits = 0;
const walk = (dir) => {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const e of ents) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!skip.test(p)) walk(p); continue; }
    if (!/\.(js|cjs|mjs|ts|tsx)$/.test(e.name)) continue;
    let st;
    try { st = fs.statSync(p); } catch { continue; }
    if (st.size > 4 * 1024 * 1024) continue;
    let text;
    try { text = fs.readFileSync(p, 'utf8'); } catch { continue; }
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (re1.test(lines[i]) || re2.test(lines[i])) {
        console.log(`${p}:${i + 1}: ${lines[i].trim().slice(0, 300)}`);
        if (++hits > 60) { console.log('TRUNCATED'); return; }
      }
    }
  }
};
walk(root);
console.log('hits', hits);
