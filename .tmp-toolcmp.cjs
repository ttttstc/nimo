const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = 'C:\\Users\\泥巴猪\\AppData\\Roaming\\dsh-desktop\\harness\\sessions';
const bad = ['session-a999f1f6-da1e-4538-afff-71d6aec699de','session-82be41c2-be61-4ef6-9fca-495add15b220','session-ab2fdd92-81b8-40ce-ac68-850c3c912902','session-3f801721-ce3c-4292-a253-7552a55faed5','session-3b129f1e-9ece-4648-bc32-9c6b0a266a71','session-b49e8a9c-c0ef-49cc-9a1d-2f6f85f41e6d','session-3affae62-dfea-46bc-922b-cbe70b7d2771'];

function decompressAll(file) {
  const buf = fs.readFileSync(file);
  const magic = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
  const cuts = [];
  for (let i = 0; i + 4 <= buf.length; i++) if (buf.compare(magic, 0, 4, i, i + 4) === 0) cuts.push(i);
  let out = [];
  for (let i = 0; i < cuts.length; i++) {
    const end = i + 1 < cuts.length ? cuts[i + 1] : buf.length;
    try { out.push(zlib.zstdDecompressSync(buf.subarray(cuts[i], end)).toString('utf8')); } catch {}
  }
  return out.join('');
}
function findFiles(dir, acc) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) findFiles(p, acc);
    else if (e.name.endsWith('.zstd')) acc.push(p);
  }
  return acc;
}
const files = findFiles(ROOT, []);
const bySession = {};
for (const f of files) { const id = path.basename(path.dirname(f)); (bySession[id] = bySession[id] || []).push(f); }

const toolSets = {};
const headers = {};
for (const [id, list] of Object.entries(bySession)) {
  const tools = new Set();
  for (const f of list) {
    let text; try { text = decompressAll(f); } catch { continue; }
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      let ev; try { ev = JSON.parse(line); } catch { continue; }
      if (ev.type === 'session' && !headers[id]) headers[id] = ev.data;
      if (ev.type !== 'request/header') continue;
      const t = ev.data && ev.data.header && ev.data.header.tools;
      if (Array.isArray(t)) for (const x of t) if (x && x.name) tools.add(x.name);
    }
  }
  toolSets[id] = tools;
}
const badSet = new Set(bad);
const all = new Set();
for (const s of Object.values(toolSets)) for (const t of s) all.add(t);
const rows = [];
for (const t of [...all].sort()) {
  const b = bad.filter((id) => toolSets[id] && toolSets[id].has(t)).length;
  const g = Object.keys(toolSets).filter((id) => !badSet.has(id) && toolSets[id].has(t)).length;
  if (b > 0 && (b / bad.length) > (g / Math.max(1, Object.keys(toolSets).length - bad.length)) * 2) rows.push(`UNIQUE ${t}  bad=${b}/${bad.length} good=${g}`);
}
console.log(rows.join('\n') || '(no uniquely-bad tools)');
console.log('=== failing session headers ===');
for (const id of bad) if (headers[id]) console.log(id, JSON.stringify(headers[id]).slice(0, 700));
