const fs = require('fs');
const zlib = require('node:zlib');
const file = process.argv[2];
const buf = fs.readFileSync(file);
const MAGIC = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const starts = [];
let i0 = buf.indexOf(MAGIC, 0);
while (i0 >= 0) { starts.push(i0); i0 = buf.indexOf(MAGIC, i0 + 4); }
const pieces = [];
for (let i = 0; i < starts.length; i++) {
  const end = i + 1 < starts.length ? starts[i + 1] : buf.length;
  try { pieces.push(zlib.zstdDecompressSync(buf.subarray(starts[i], end))); } catch {}
}
const text = Buffer.concat(pieces).toString('utf8');
const events = [];
for (const l of text.split('\n')) { if (!l.trim()) continue; try { events.push(JSON.parse(l)); } catch {} }
const wanted = process.argv.slice(3).map(Number);
for (const ev of events) {
  if (wanted.length && !wanted.includes(ev.seq)) continue;
  if (!wanted.length && ev.type !== 'agent/inbox/spliced' && ev.type !== 'session/title-llm-request') continue;
  const d = ev.data || {};
  const list = ev.type === 'agent/inbox/spliced' ? d.inserted : ev.type === 'session/title-llm-request' ? d.messages : null;
  console.log('=== seq', ev.seq, ev.type, 'keys=', Object.keys(d).join(','));
  if (Array.isArray(list)) {
    for (const m of list) {
      const src = m && m.source ? m.source : null;
      console.log('   msg role=', m && m.role, 'source=', JSON.stringify(src), 'contentTypes=', Array.isArray(m && m.content) ? m.content.map((c) => c.type).join('/') : typeof (m && m.content));
      if (!src || src.kind === 'plugin' || src.kind === undefined) console.log('   >>> RAW:', JSON.stringify(m).slice(0, 900));
    }
  } else {
    console.log('   RAW:', JSON.stringify(ev).slice(0, 900));
  }
}
