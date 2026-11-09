const fs = require('fs');
const path = require('path');
const p = 'D:\\soft\\dsh-desktop\\DSH Desktop\\resources\\app.asar';
const fd = fs.openSync(p, 'r');
const head = Buffer.alloc(16);
fs.readSync(fd, head, 0, 16, 0);
const jsonLen = head.readUInt32LE(12);
const hbuf = Buffer.alloc(jsonLen);
fs.readSync(fd, hbuf, 0, jsonLen, 16);
const json = JSON.parse(hbuf.toString('utf8'));
const base = 16 + jsonLen;

const files = [];
function walk(node, prefix) {
  for (const [k, v] of Object.entries(node.files || {})) {
    const pth = prefix ? prefix + '/' + k : k;
    if (v.files) walk(v, pth);
    else if (v.offset !== undefined) files.push({ path: pth, offset: Number(v.offset), size: Number(v.size) });
  }
}
walk(json, '');

const mode = process.argv[2];

function readFile(f) {
  const buf = Buffer.alloc(f.size);
  fs.readSync(fd, buf, 0, f.size, base + f.offset);
  return buf;
}

if (mode === 'list') {
  const re = new RegExp(process.argv[3]);
  for (const f of files) if (re.test(f.path)) console.log(f.path, f.size);
} else if (mode === 'get') {
  const target = process.argv[3];
  const f = files.find((x) => x.path === target || x.path.endsWith('/' + target));
  if (!f) { console.log('not found'); process.exit(1); }
  const buf = readFile(f);
  process.stdout.write(buf.toString('utf8'));
} else if (mode === 'grep') {
  const needles = process.argv[3].split('|');
  const re = process.argv[4] ? new RegExp(process.argv[4]) : null;
  let hits = 0;
  for (const f of files) {
    if (re && !re.test(f.path)) continue;
    if (f.size > 30 * 1024 * 1024) continue;
    const text = readFile(f).toString('utf8');
    for (const nd of needles) {
      let idx = -1;
      while ((idx = text.indexOf(nd, idx + 1)) >= 0) {
        const lineStart = text.lastIndexOf('\n', idx) + 1;
        let lineEnd = text.indexOf('\n', idx);
        if (lineEnd < 0) lineEnd = Math.min(text.length, idx + 300);
        console.log(`${f.path}:${text.slice(0, idx).split('\n').length}: ${text.slice(lineStart, lineEnd).trim().slice(0, 400)}`);
        if (++hits > 200) { console.log('TRUNCATED'); process.exit(0); }
      }
    }
  }
  console.log('hits', hits);
}
fs.closeSync(fd);
