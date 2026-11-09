const fs = require('fs');
const p = 'D:\\soft\\dsh-desktop\\DSH Desktop\\resources\\app.asar';
const fd = fs.openSync(p, 'r');
const head = Buffer.alloc(16);
fs.readSync(fd, head, 0, 16, 0);
const jsonLen = head.readUInt32LE(12);
const hbuf = Buffer.alloc(jsonLen);
fs.readSync(fd, hbuf, 0, jsonLen, 16);
const json = JSON.parse(hbuf.toString('utf8'));
const base = 16 + jsonLen;
console.log('base', base, 'jsonLen', jsonLen);

const files = [];
function walk(node, prefix) {
  for (const [k, v] of Object.entries(node.files || {})) {
    const path = prefix ? prefix + '/' + k : k;
    if (v.files) walk(v, path);
    else if (v.offset !== undefined) files.push({ path, offset: Number(v.offset), size: Number(v.size) });
  }
}
walk(json, '');
console.log('fileCount', files.length);

const needle = process.argv[2] || 'producer-owned';
const needles = needle.split('|');
const hits = [];
const chunk = 4 * 1024 * 1024;
for (const f of files) {
  if (f.size > 60 * 1024 * 1024) continue;
  let pos = 0;
  let tail = Buffer.alloc(0);
  while (pos < f.size) {
    const len = Math.min(chunk, f.size - pos);
    const buf = Buffer.alloc(len);
    fs.readSync(fd, buf, 0, len, base + f.offset + pos);
    const text = Buffer.concat([tail, buf]).toString('utf8');
    for (const nd of needles) {
      let idx = -1;
      while ((idx = text.indexOf(nd, idx + 1)) >= 0) {
        const lineStart = text.lastIndexOf('\n', idx) + 1;
        let lineEnd = text.indexOf('\n', idx);
        if (lineEnd < 0) lineEnd = Math.min(text.length, idx + 400);
        hits.push({ path: f.path, needle: nd, line: text.slice(lineStart, lineEnd).trim().slice(0, 700) });
        if (hits.length > 60) break;
      }
    }
    tail = buf.subarray(Math.max(0, buf.length - 200));
    pos += len;
  }
  if (hits.length > 60) break;
}
for (const h of hits) console.log(`\n[${h.needle}] ${h.path}\n    ${h.line}`);
console.log('\ntotalHits', hits.length);
fs.closeSync(fd);
