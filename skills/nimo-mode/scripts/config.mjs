import fs from 'node:fs/promises';
import path from 'node:path';
import { parseAllDocuments, isAlias, visit } from 'yaml';
import { absolute, atomicWrite, fail, guarded, hash, main, readOptional, response, withLock } from './lib/common.mjs';

const collections = ['principles', 'knowledge'];
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonempty = value => typeof value === 'string' && value.trim().length > 0 && !value.includes('\0');

function parseConfig(text) {
  const docs = parseAllDocuments(text ?? '', { uniqueKeys: true, version: '1.2', prettyErrors: false });
  if (docs.length > 1) fail('INVALID_YAML', 'Only one YAML document is supported');
  const doc = docs[0] ?? parseAllDocuments('{}')[0];
  if (doc.errors.length) fail('INVALID_YAML', `${doc.errors[0].code} at offset ${doc.errors[0].pos?.[0] ?? 0}`);
  visit(doc, (_key, node) => {
    if (isAlias(node) || (node !== null && typeof node === 'object' && 'tag' in node && node.tag)) fail('INVALID_YAML', 'Aliases and explicit tags are unsupported');
  });
  let data = doc.toJS({ maxAliasCount: 0 });
  if (data == null && !(text ?? '').replace(/#[^\n]*/g, '').trim()) data = {};
  if (!plain(data) || Object.keys(data).some(key => !collections.includes(key))) fail('INVALID_CONFIG', 'Expected only principles and knowledge');
  for (const collection of collections) {
    if (data[collection] === undefined) continue;
    if (!Array.isArray(data[collection])) fail('INVALID_CONFIG', `${collection} must be an array`);
    for (const item of data[collection]) {
      if (collection === 'knowledge') {
        if (!nonempty(item)) fail('INVALID_CONFIG', 'Knowledge must be a nonempty path');
      } else if (!plain(item) || Object.keys(item).length !== 1 ||
        !['skill', 'path'].includes(Object.keys(item)[0]) || !nonempty(Object.values(item)[0])) {
        fail('INVALID_CONFIG', 'Each principle must contain one skill or path string');
      }
    }
  }
  if (doc.contents == null) doc.setIn([], doc.createNode({}));
  return { doc, data };
}

export function resolvePath(value, base, home) {
  if (!nonempty(value)) fail('INVALID_PATH', 'Expected a path');
  if (value === '~') return home;
  if (/^~[/\\]/.test(value)) return path.resolve(home, value.slice(2));
  if (value.startsWith('~')) fail('INVALID_PATH', '~user paths are unsupported');
  if (process.platform !== 'win32' && (/^[a-z]:[/\\]/i.test(value) || value.startsWith('\\\\'))) {
    fail('FOREIGN_PATH', 'This path belongs to another operating system');
  }
  return path.resolve(base, value);
}

async function reference(entry, collection, source, request) {
  const base = source === 'team' ? request.projectRoot : request.homeDir;
  const kind = collection === 'knowledge' ? 'path' : Object.keys(entry)[0];
  const raw = collection === 'knowledge' ? entry : entry[kind];
  let target;
  let identity;
  let available = false;
  let code;
  if (kind === 'skill') {
    const matches = (request.discoveredSkills ?? []).filter(item => item.name === raw);
    if (matches.length === 1 && nonempty(matches[0].id ?? matches[0].path)) {
      target = matches[0].path;
      identity = `skill:${matches[0].id ?? matches[0].path}`;
      available = true;
    } else { identity = `skill:${raw}`; code = matches.length > 1 ? 'AMBIGUOUS_SKILL' : 'SKILL_UNCONFIRMED'; }
  } else {
    target = resolvePath(raw, base, request.homeDir);
    identity = `path:${target}`;
    try {
      const real = await fs.realpath(target);
      const stat = await fs.stat(real);
      identity = `path:${real}`;
      target = real;
      if (collection === 'principles' && (!stat.isFile() || !/\.md(?:arkdown)?$/i.test(real))) code = 'INVALID_PRINCIPLE_FILE';
      else if (!stat.isFile() && !stat.isDirectory()) code = 'INVALID_FILE_TYPE';
      else { await fs.access(real, fs.constants.R_OK); available = true; }
    } catch (error) { code = error.code === 'ENOENT' ? 'MISSING_PATH' : 'UNREADABLE_PATH'; }
  }
  return { identity, kind, raw, target, available, code, sources: [source] };
}

async function readConfig(file, source) {
  const text = await readOptional(file);
  try { return { ...parseConfig(text), file, source, hash: text === null ? 'absent' : hash(text), text }; }
  catch (error) { error.message = `${source} (${file}): ${error.message}`; throw error; }
}

async function inspect(request, sources) {
  const data = { configurations: [], principles: [], knowledge: [] };
  const diagnostics = [];
  for (const source of sources) {
    const file = path.join(source === 'team' ? request.projectRoot : request.homeDir, '.nimo', 'nimo.yaml');
    const config = await readConfig(file, source);
    data.configurations.push({ source, path: file, hash: config.hash });
    for (const collection of collections) {
      for (const [index, entry] of (config.data[collection] ?? []).entries()) {
        const ref = await reference(entry, collection, source, request);
        const excluded = (request.exclusions ?? []).some(exclusion => {
          const value = typeof exclusion === 'string' ? exclusion : exclusion.identity ?? exclusion.reference;
          return [ref.identity, ref.raw, ref.target].includes(value) &&
            (typeof exclusion === 'string' || !exclusion.source || exclusion.source === source);
        });
        if (excluded) continue;
        const previous = data[collection].find(item => item.identity === ref.identity);
        if (previous) { if (!previous.sources.includes(source)) previous.sources.push(source); }
        else data[collection].push(ref);
        if (!ref.available) diagnostics.push({ code: ref.code, severity: collection === 'principles' ? 'BLOCK' : 'WARN', source, configPath: file, collection, index, reference: ref.raw, message: `Unavailable ${collection} reference` });
      }
    }
  }
  return response(data, diagnostics);
}

export async function run(input) {
  return guarded(async () => {
    if (!plain(input)) fail('INVALID_REQUEST', 'Expected a JSON object');
    const request = { ...input,
      projectRoot: absolute(input.projectRoot, 'projectRoot'),
      homeDir: absolute(input.homeDir, 'homeDir'),
      cwd: absolute(input.cwd ?? input.projectRoot, 'cwd'),
    };
    if (request.discoveredSkills !== undefined && (!Array.isArray(request.discoveredSkills) || request.discoveredSkills.some(item =>
      !plain(item) || !nonempty(item.name) || Object.keys(item).some(key => !['name', 'id', 'path'].includes(key)) ||
      ['id', 'path'].some(key => Object.hasOwn(item, key) && !nonempty(item[key]))))) fail('INVALID_DISCOVERY', 'Expected discoveredSkills with names and optional nonempty id/path');
    if (request.exclusions !== undefined && (!Array.isArray(request.exclusions) || request.exclusions.some(item =>
      !nonempty(item) && (!plain(item) || Object.keys(item).some(key => !['identity', 'reference', 'source'].includes(key)) || !nonempty(item.identity ?? item.reference) ||
        (item.source !== undefined && !['nimo', 'team', 'personal'].includes(item.source)))))) fail('INVALID_EXCLUSIONS', 'Expected exclusions with a reference and optional source');
    const operation = request.operation ?? 'inspect';
    const scope = request.scope ?? 'all';
    if (!['team', 'personal', 'all'].includes(scope)) fail('INVALID_SCOPE', 'Choose team, personal, or all');
    const sources = scope === 'all' ? ['team', 'personal'] : [scope];
    if (['inspect', 'validate'].includes(operation)) return inspect(request, sources);
    if (!['add', 'remove'].includes(operation) || scope === 'all') fail('INVALID_OPERATION', 'Editing requires add/remove and one scope');
    if (!collections.includes(request.collection)) fail('INVALID_COLLECTION', 'Choose principles or knowledge');
    parseConfig(JSON.stringify({ [request.collection]: [request.entry] }));
    const file = path.join(scope === 'team' ? request.projectRoot : request.homeDir, '.nimo', 'nimo.yaml');
    const fileStat = await fs.lstat(file).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (fileStat?.isSymbolicLink()) fail('CONFIG_SYMLINK', 'Refusing to edit a linked configuration', 3);
    const initial = await readConfig(file, scope);
    const expected = request.expectedHash ?? initial.hash;
    if (initial.hash !== expected) fail('WRITE_CONFLICT', 'Configuration changed; read it again before editing', 3);
    const kind = request.collection === 'knowledge' ? 'path' : Object.keys(request.entry)[0];
    let entry = request.entry;
    if (kind === 'path') {
      const raw = request.collection === 'knowledge' ? entry : entry.path;
      const target = resolvePath(raw, request.cwd, request.homeDir);
      const base = scope === 'team' ? request.projectRoot : request.homeDir;
      const relative = path.relative(base, target);
      const stored = path.isAbsolute(relative) ? target : (relative.startsWith('..') ? relative : `./${relative || '.'}`).replaceAll('\\', '/');
      entry = request.collection === 'knowledge' ? stored : { path: stored };
    }
    const desired = await reference(entry, request.collection, scope, request);
    if (operation === 'add' && !desired.available) return response({}, [{ code: desired.code, severity: 'BLOCK', source: scope, configPath: file, reference: desired.raw, message: 'Validate the reference before adding it' }]);
    const entries = initial.data[request.collection] ?? [];
    const matches = [];
    for (let index = 0; index < entries.length; index++) {
      const existing = await reference(entries[index], request.collection, scope, request);
      if (existing.identity === desired.identity || JSON.stringify(entries[index]) === JSON.stringify(entry)) matches.push(index);
    }
    if ((operation === 'add' && matches.length) || (operation === 'remove' && !matches.length)) return inspect(request, sources);
    if (operation === 'remove' && matches.length > 1) fail('AMBIGUOUS_REFERENCE', 'Multiple entries match; identify the exact entry before removal');
    await withLock(file, async () => {
      const current = await readConfig(file, scope);
      if (current.hash !== expected) fail('WRITE_CONFLICT', 'Configuration changed; read it again before editing', 3);
      if (operation === 'add') {
        if (!current.doc.has(request.collection)) current.doc.set(request.collection, current.doc.createNode([]));
        current.doc.addIn([request.collection], entry);
      } else current.doc.deleteIn([request.collection, matches[0]]);
      const text = current.doc.toString();
      parseConfig(text);
      await atomicWrite(file, text);
      if (await readOptional(file) !== text) fail('READBACK_FAILED', 'Configuration readback differs', 3);
    });
    return { ...await inspect(request, sources), changed: true };
  });
}
main(import.meta.url, run);
