const fs = require('fs');
const zlib = require('node:zlib');
const file = process.argv[2];
const buf = fs.readFileSync(file);
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const starts = [];
let i0 = buf.indexOf(MAGIC, 0);
while (i0 >= 0) { starts.push(i0); i0 = buf.indexOf(MAGIC, i0 + 4); }
const pieces = [];
let failed = 0;
for (let i = 0; i < starts.length; i++) {
  const end = i + 1 < starts.length ? starts[i + 1] : buf.length;
  try { pieces.push(zlib.zstdDecompressSync(buf.subarray(starts[i], end))); } catch { failed++; }
}
const text = Buffer.concat(pieces).toString('utf8');
console.log('frames', starts.length, 'failed', failed, 'chars', text.length);
console.log('literal kind:plugin count =', (text.match(/"kind":"plugin"/g) || []).length);

const events = [];
for (const l of text.split('\n')) { if (!l.trim()) continue; try { events.push(JSON.parse(l)); } catch {} }

// deep scan: any object that looks like a message (has role+content+source, or has source)
const problems = [];
function scan(node, pathIn, ownerSeq, ownerType) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((v, i) => scan(v, `${pathIn}[${i}]`, ownerSeq, ownerType)); return; }
  if (Object.prototype.hasOwnProperty.call(node, 'source')) {
    const src = node.source;
    const bad = !src || typeof src !== 'object' || Array.isArray(src) || typeof src.kind !== 'string' || src.kind.length === 0 || src.kind === 'plugin';
    if (bad) problems.push({ seq: ownerSeq, type: ownerType, path: pathIn, source: src, role: node.role, snippet: JSON.stringify(node).slice(0, 300) });
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === 'source') continue;
    scan(v, `${pathIn}.${k}`, ownerSeq, ownerType);
  }
}
for (const ev of events) scan(ev.data, 'data', ev.seq, ev.type);
console.log('objects with bad/missing source =', problems.length);
for (const p of problems.slice(0, 10)) console.log(JSON.stringify(p));
