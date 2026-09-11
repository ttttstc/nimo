import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
export function checkPlan(markdown) {
  const lines = markdown.split(/\r?\n/);
  const issues = [];
  const units = [];
  let fence = false;
  for (const [index, line] of lines.entries()) {
    if (/^\s*```/.test(line)) fence = !fence;
    const heading = /^### (?:单元|Unit)\s+(\S+)/i.exec(line);
    if (!fence && heading) units.push({ id: heading[1], line: index + 1, text: line, body: '' });
    else if (!fence && units.length) units.at(-1).body += line + '\n';
  }
  if (!units.length) issues.push({ line: 1, message: 'Use ### 单元 <id> for each verifiable unit' });
  const fields = ['目标', '文件', '依赖', '可观察结果', '自动检查', '真实操作', '性能验证', '停止点'];
  for (const unit of units) for (const field of fields) {
    if (!new RegExp(`${field}[：:]\\s*\\S`).test(unit.body)) issues.push({ line: unit.line, message: `Missing ${field}` });
  }
  const ids = new Set(units.map(unit => unit.id));
  if (ids.size !== units.length) issues.push({ line: 1, message: 'Duplicate unit ids' });
  const dependencies = new Map();
  for (const unit of units) {
    const value = /依赖[：:]\s*([^\n]+)/.exec(unit.body)?.[1].trim() ?? '';
    const refs = /^(?:无[。.]?|无依赖[。.]?|none[.]?)$/i.test(value) ? [] : value.replaceAll('`', '').split(/[\s,，、]+/).filter(Boolean);
    dependencies.set(unit.id, refs);
    for (const ref of refs) if (!ids.has(ref)) issues.push({ line: unit.line, message: `Unknown dependency ${ref}` });
  }
  const visited = new Set();
  const visiting = new Set();
  function visit(id) {
    if (visiting.has(id)) { issues.push({ line: units.find(unit => unit.id === id)?.line ?? 1, message: 'Dependency cycle' }); return; }
    if (visited.has(id) || !ids.has(id)) return;
    visiting.add(id);
    for (const ref of dependencies.get(id) ?? []) visit(ref);
    visiting.delete(id); visited.add(id);
  }
  for (const id of ids) visit(id);
  if (/TODO|TBD|待填写|<placeholder>/i.test(markdown)) issues.push({ line: 1, message: 'Unresolved placeholders' });
  return issues;
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { const issues = checkPlan(await fs.readFile(process.argv[2], 'utf8')); console.log(JSON.stringify({ status: issues.length ? 'BLOCK' : 'OK', issues })); process.exitCode = issues.length ? 2 : 0; }
  catch (error) { console.error(error.message); process.exitCode = 2; }
}
