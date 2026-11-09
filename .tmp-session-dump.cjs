const fs = require('fs');
const zlib = require('node:zlib');
const file = process.argv[2];
const buf = fs.readFileSync(file);

function tryFrameDecompress(chunk) {
  try { return zlib.zstdDecompressSync(chunk); } catch { return null; }
}

const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const starts = [];
let idx = buf.indexOf(MAGIC, 0);
while (idx >= 0) { starts.push(idx); idx = buf.indexOf(MAGIC, idx + 4); }
const pieces = [];
if (starts.length <= 1) {
  const r = tryFrameDecompress(buf);
  if (r) pieces.push(r);
} else {
  for (let i = 0; i < starts.length; i++) {
    const end = i + 1 < starts.length ? starts[i + 1] : buf.length;
    const r = tryFrameDecompress(buf.subarray(starts[i], end));
    if (r) pieces.push(r);
    else {
      // retry extending into next chunk (false magic inside payload)
      const r2 = tryFrameDecompress(buf.subarray(starts[i], Math.min(buf.length, end + 4096)));
      if (r2) pieces.push(r2);
    }
  }
}
const text = Buffer.concat(pieces).toString('utf8');
const lines = text.split('\n').filter((l) => l.trim().length);
console.log('frames', pieces.length, 'lines', lines.length, 'bytes', text.length);
const events = [];
for (const l of lines) { try { events.push(JSON.parse(l)); } catch {} }
const info = (ev) => {
  const d = ev.data || {};
  const msg = d.message && typeof d.message === 'object' ? d.message : null;
  const src = msg ? msg.source : (d.source && typeof d.source === 'object' ? d.source : null);
  return { seq: ev.seq, type: ev.type, role: msg ? msg.role : undefined, srcKind: src ? src.kind : undefined, plugin: src ? src.plugin : undefined };
};
const kinds = new Map();
for (const ev of events) { const i = info(ev); const k = `${i.type}|src=${i.srcKind}|plugin=${i.plugin}`; kinds.set(k, (kinds.get(k) || 0) + 1); }
console.log('\n=== distribution ===');
for (const [k, v] of [...kinds.entries()].sort((a, b) => b[1] - a[1])) console.log(String(v).padStart(5), k);
console.log('\n=== suspicious message events ===');
let n = 0;
for (const ev of events) {
  const i = info(ev);
  if (/message|inbox|title-llm/.test(i.type || '') && (i.srcKind === 'plugin' || !i.srcKind)) { console.log(JSON.stringify(i)); if (++n > 25) break; }
}
console.log('\n=== last 6 ===');
for (const ev of events.slice(-6)) console.log(JSON.stringify(info(ev)));
