import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const execFileAsync = promisify(execFile);
const scriptPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../skills/nimo-mode/scripts/config.mjs');
const configModule = await import(pathToFileURL(scriptPath).href);
const { run } = configModule;

const allowedStatuses = new Set(['OK', 'WARN', 'BLOCK']);

function assertEnvelope(result) {
  assert.ok(result && typeof result === 'object', 'run() must return an object');
  assert.ok(allowedStatuses.has(result.status), `unexpected status: ${result.status}`);
  assert.equal(typeof result.changed, 'boolean');
  assert.ok(Array.isArray(result.diagnostics), 'diagnostics must be an array');
  assert.ok(result.data && typeof result.data === 'object', 'data must be an object');
}

function diagnosticText(result) {
  return JSON.stringify(result.diagnostics ?? []).toLowerCase();
}

function allStrings(value, output = []) {
  if (typeof value === 'string') output.push(value);
  else if (Array.isArray(value)) value.forEach((item) => allStrings(item, output));
  else if (value && typeof value === 'object') Object.values(value).forEach((item) => allStrings(item, output));
  return output;
}

function referenceList(result) {
  const principles = result?.data?.principles;
  const knowledge = result?.data?.knowledge;
  assert.ok(Array.isArray(principles), 'data.principles must be an array');
  assert.ok(Array.isArray(knowledge), 'data.knowledge must be an array');
  return [...principles, ...knowledge];
}

function referencePath(reference) {
  return reference.target ?? reference.actualPath ?? reference.resolvedPath ?? reference.path;
}

function referenceSources(reference) {
  return reference.sources ?? reference.source ?? [];
}

async function makeFixture(label) {
  const root = await mkdtemp(join(tmpdir(), `nimo-config-${label}-`));
  const projectRoot = join(root, 'project');
  const homeDir = join(root, 'home');
  const cwd = join(projectRoot, 'src');
  await mkdir(cwd, { recursive: true });
  await mkdir(homeDir, { recursive: true });
  return { root, projectRoot, homeDir, cwd };
}

async function writeConfig(baseDir, content) {
  const configPath = join(baseDir, '.nimo', 'nimo.yaml');
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(configPath, content, 'utf8');
  return configPath;
}

async function fileHash(path) {
  try {
    return createHash('sha256').update(await readFile(path)).digest('hex');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

async function removeFixture(fixture) {
  await rm(fixture.root, { recursive: true, force: true });
}

test('inspect returns the public envelope and does not create zero-configuration files', async () => {
  const fixture = await makeFixture('zero');
  try {
    const result = await run({
      operation: 'inspect',
      scope: 'all',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });

    assertEnvelope(result);
    assert.equal(result.status, 'OK');
    assert.equal(result.changed, false);
    assert.deepEqual(referenceList(result), []);
    assert.equal(await stat(join(fixture.projectRoot, '.nimo')).catch(() => null), null);
    assert.equal(await stat(join(fixture.homeDir, '.nimo')).catch(() => null), null);
    const serialized = JSON.stringify(result.data);
    assert.match(serialized, /\.nimo.*nimo\.yaml/i);
  } finally {
    await removeFixture(fixture);
  }
});

test('A05 resolves dialog-relative team paths against the project root and preserves canonical identity', async () => {
  const fixture = await makeFixture('path-equivalence');
  const docs = join(fixture.projectRoot, 'docs');
  await mkdir(docs, { recursive: true });
  await writeFile(join(docs, 'guide.md'), '# guide\n', 'utf8');
  try {
    const added = await run({
      operation: 'add',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: join(fixture.projectRoot, 'src'),
      collection: 'knowledge',
      entry: '../docs',
    });

    assertEnvelope(added);
    assert.equal(added.status, 'OK');
    assert.equal(added.changed, true);
    const configPath = join(fixture.projectRoot, '.nimo', 'nimo.yaml');
    const configText = await readFile(configPath, 'utf8');
    assert.match(configText, /["']?\.\/?docs["']?/);
    assert.doesNotMatch(configText, /\.nimo[\\/]docs/);

    const inspected = await run({
      operation: 'inspect',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });
    assertEnvelope(inspected);
    const refs = referenceList(inspected);
    assert.equal(refs.length, 1);
    assert.equal(await realpath(referencePath(refs[0])), await realpath(docs));
    assert.equal(refs[0].raw, './docs');

    await writeConfig(fixture.projectRoot, 'knowledge:\n  - ./docs\n');
    const handEdited = await run({
      operation: 'inspect',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });
    assertEnvelope(handEdited);
    const handEditedRefs = referenceList(handEdited);
    assert.equal(handEditedRefs.length, 1);
    assert.equal(await realpath(referencePath(handEditedRefs[0])), await realpath(referencePath(refs[0])));
  } finally {
    await removeFixture(fixture);
  }
});

test('A05 resolves hand-edited personal relative paths from homeDir', async () => {
  const fixture = await makeFixture('personal-path');
  const knowledge = join(fixture.homeDir, 'personal knowledge');
  await mkdir(knowledge, { recursive: true });
  try {
    await writeConfig(fixture.homeDir, 'knowledge:\n  - ./personal knowledge\n');
    const inspected = await run({
      operation: 'inspect',
      scope: 'personal',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });
    assert.equal(referenceList(inspected).length, 1);
    assert.equal(await realpath(referencePath(referenceList(inspected)[0])), await realpath(knowledge));
  } finally {
    await removeFixture(fixture);
  }
});

test('A05 personal add resolves a home tilde path and stores it as a home-relative entry', async () => {
  const fixture = await makeFixture('personal-add-tilde');
  const knowledge = join(fixture.homeDir, 'personal knowledge');
  await mkdir(knowledge, { recursive: true });
  try {
    const added = await run({
      operation: 'add',
      scope: 'personal',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: join(fixture.projectRoot, 'src'),
      collection: 'knowledge',
      entry: '~/personal knowledge',
    });
    assertEnvelope(added);
    assert.equal(added.status, 'OK');
    assert.equal(added.changed, true);
    const configText = await readFile(join(fixture.homeDir, '.nimo', 'nimo.yaml'), 'utf8');
    assert.match(configText, /\.\/?personal knowledge/);
    const inspected = await run({
      operation: 'inspect',
      scope: 'personal',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });
    assert.equal(referenceList(inspected).length, 1);
    assert.equal(await realpath(referencePath(referenceList(inspected)[0])), await realpath(knowledge));
  } finally {
    await removeFixture(fixture);
  }
});

test('principle path entries use the same path identity contract as knowledge entries', async () => {
  const fixture = await makeFixture('principle-path');
  const principle = join(fixture.projectRoot, 'principle.md');
  await writeFile(principle, '# Principle\n', 'utf8');
  try {
    const added = await run({
      operation: 'add',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
      collection: 'principles',
      entry: { path: '../principle.md' },
    });
    assertEnvelope(added);
    assert.equal(added.status, 'OK');
    assert.equal(added.changed, true);
    const inspected = await run({
      operation: 'inspect',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });
    assert.equal(inspected.data.knowledge.length, 0);
    assert.equal(inspected.data.principles.length, 1);
    const [ref] = inspected.data.principles;
    assert.equal(ref.kind, 'path');
    assert.equal(ref.raw, './principle.md');
    assert.equal(ref.available, true);
    assert.equal(await realpath(ref.target), await realpath(principle));
  } finally {
    await removeFixture(fixture);
  }
});

test('A06 deduplicates team and personal references while retaining every source', async () => {
  const fixture = await makeFixture('dedupe');
  const docs = join(fixture.projectRoot, 'docs');
  await mkdir(docs, { recursive: true });
  try {
    await writeConfig(fixture.projectRoot, 'knowledge:\n  - ./docs\n');
    await writeConfig(fixture.homeDir, `knowledge:\n  - ${docs.replaceAll('\\', '/')}\n`);
    const result = await run({
      operation: 'inspect',
      scope: 'all',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });
    assertEnvelope(result);
    const refs = referenceList(result);
    assert.equal(refs.length, 1);
    assert.equal(await realpath(referencePath(refs[0])), await realpath(docs));
    const sources = referenceSources(refs[0]);
    assert.ok(Array.isArray(sources));
    const sourceText = JSON.stringify(sources);
    assert.match(sourceText, /team/i);
    assert.match(sourceText, /personal/i);
  } finally {
    await removeFixture(fixture);
  }
});

test('A07 rejects malformed YAML forms without changing the source file', async (t) => {
  const invalidDocuments = [
    ['duplicate-key', 'knowledge:\n  - ./docs\nknowledge:\n  - ./other\n', /duplicate/i],
    ['unknown-field', 'unexpected: true\n', /unknown|field/i],
    ['null-root-field', 'knowledge: null\n', /null|required|type/i],
    ['wrong-type', 'principles: nope\n', /type|array|sequence/i],
    ['custom-tag', 'knowledge: !include ./docs\n', /tag|include|unsupported/i],
    ['alias', 'base: &base\n  - ./docs\nknowledge: *base\n', /alias|merge|unknown/i],
    ['multi-document', 'knowledge:\n  - ./docs\n---\nknowledge:\n  - ./other\n', /document|multiple|multi/i],
  ];

  for (const [name, content, diagnosticPattern] of invalidDocuments) {
    await t.test(name, async () => {
      const fixture = await makeFixture(`invalid-${name}`);
      try {
        const configPath = await writeConfig(fixture.projectRoot, content);
        const before = await fileHash(configPath);
        const result = await run({
          operation: 'validate',
          scope: 'team',
          projectRoot: fixture.projectRoot,
          homeDir: fixture.homeDir,
          cwd: fixture.cwd,
        });
        assertEnvelope(result);
        assert.equal(result.status, 'BLOCK');
        assert.ok(result.diagnostics.length > 0);
        assert.match(diagnosticText(result), diagnosticPattern);
        assert.equal(await fileHash(configPath), before);
      } finally {
        await removeFixture(fixture);
      }
    });
  }
});

test('A08 separates Skill discovery from file readability and handles ambiguity', async () => {
  const fixture = await makeFixture('skill-discovery');
  try {
    const configPath = await writeConfig(fixture.projectRoot, 'principles:\n  - skill: external-principle\n');
    const baseRequest = {
      operation: 'inspect',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    };
    const unknown = await run(baseRequest);
    assertEnvelope(unknown);
    assert.ok(['WARN', 'BLOCK'].includes(unknown.status));
    assert.match(diagnosticText(unknown), /skill|discover|confirm|visible/i);
    const unknownBytes = await readFile(configPath);

    const visible = await run({
      ...baseRequest,
      discoveredSkills: [{ name: 'external-principle', path: join(fixture.root, 'skill.md') }],
    });
    assertEnvelope(visible);
    assert.deepEqual(await readFile(configPath), unknownBytes);
    const visibleSerialized = JSON.stringify(visible.data);
    assert.match(visibleSerialized, /external-principle/);
    assert.match(visibleSerialized, /available|visible|confirmed/i);

    const ambiguous = await run({
      ...baseRequest,
      discoveredSkills: [
        { name: 'external-principle', path: join(fixture.root, 'one.md') },
        { name: 'external-principle', path: join(fixture.root, 'two.md') },
      ],
    });
    assertEnvelope(ambiguous);
    assert.ok(['WARN', 'BLOCK'].includes(ambiguous.status));
    assert.match(diagnosticText(ambiguous), /ambig|multiple|disambigu/i);
  } finally {
    await removeFixture(fixture);
  }
});

test('A08 does not persist an external Skill when current host cannot confirm it', async () => {
  const fixture = await makeFixture('skill-add');
  try {
    const result = await run({
      operation: 'add',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
      collection: 'principles',
      entry: 'external-principle',
    });
    assertEnvelope(result);
    assert.ok(['WARN', 'BLOCK'].includes(result.status));
    assert.equal(result.changed, false);
    assert.equal(await stat(join(fixture.projectRoot, '.nimo', 'nimo.yaml')).catch(() => null), null);
    assert.match(diagnosticText(result), /skill|discover|confirm|visible/i);
  } finally {
    await removeFixture(fixture);
  }
});

test('A09 reports missing principle as a blocking reference and missing knowledge as a warning', async () => {
  const fixture = await makeFixture('lifecycle');
  const principle = join(fixture.projectRoot, 'principle.md');
  const knowledge = join(fixture.projectRoot, 'knowledge');
  await mkdir(knowledge, { recursive: true });
  await writeFile(principle, '# Principle\n', 'utf8');
  try {
    await writeConfig(fixture.projectRoot, `principles:\n  - path: ${principle.replaceAll('\\', '/')}\nknowledge:\n  - ./knowledge\n`);
    const before = await run({
      operation: 'inspect',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });
    assert.equal(before.status, 'OK');
    await rm(principle);
    const missingPrinciple = await run({
      operation: 'inspect',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });
    assert.equal(missingPrinciple.status, 'BLOCK');
    assert.match(diagnosticText(missingPrinciple), /principle|missing|read/i);

    await writeFile(principle, '# Principle\n', 'utf8');
    await rm(knowledge, { recursive: true, force: true });
    const missingKnowledge = await run({
      operation: 'inspect',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });
    assert.equal(missingKnowledge.status, 'WARN');
    assert.match(diagnosticText(missingKnowledge), /knowledge|missing|read/i);
  } finally {
    await removeFixture(fixture);
  }
});

test('A10 repeated edits and removal of a non-existent entry are no-ops and preserve comments', async () => {
  const fixture = await makeFixture('idempotence');
  const docs = join(fixture.projectRoot, 'docs');
  await mkdir(docs, { recursive: true });
  try {
    const configPath = await writeConfig(fixture.projectRoot, '# keep this comment\nknowledge:\n  - ./docs\n');
    const before = await readFile(configPath, 'utf8');
    const repeated = await run({
      operation: 'add',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
      collection: 'knowledge',
      entry: '../docs',
    });
    assertEnvelope(repeated);
    assert.equal(repeated.status, 'OK');
    assert.equal(repeated.changed, false);
    assert.equal(await readFile(configPath, 'utf8'), before);

    const absent = await run({
      operation: 'remove',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
      collection: 'knowledge',
      entry: '../not-present',
    });
    assertEnvelope(absent);
    assert.equal(absent.status, 'OK');
    assert.equal(absent.changed, false);
    assert.equal(await readFile(configPath, 'utf8'), before);

    const removed = await run({
      operation: 'remove',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
      collection: 'knowledge',
      entry: '../docs',
    });
    assertEnvelope(removed);
    assert.equal(removed.status, 'OK');
    assert.equal(removed.changed, true);
    assert.deepEqual(referenceList(removed), []);
    assert.match(await readFile(configPath, 'utf8'), /keep this comment/);
  } finally {
    await removeFixture(fixture);
  }
});

test('A10 stale expectedHash blocks an edit and preserves the newer file', async () => {
  const fixture = await makeFixture('hash-conflict');
  try {
    const configPath = await writeConfig(fixture.projectRoot, 'knowledge:\n  - ./old\n');
    const staleHash = await fileHash(configPath);
    await writeFile(configPath, 'knowledge:\n  - ./new\n', 'utf8');
    const newerBytes = await readFile(configPath);
    const result = await run({
      operation: 'add',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
      collection: 'knowledge',
      entry: './another',
      expectedHash: staleHash,
    });
    assertEnvelope(result);
    assert.equal(result.status, 'BLOCK');
    assert.equal(result.changed, false);
    assert.match(diagnosticText(result), /hash|changed|concurrent|conflict/i);
    assert.deepEqual(await readFile(configPath), newerBytes);
  } finally {
    await removeFixture(fixture);
  }
});

test('expectedHash also guards idempotent add and remove branches', async () => {
  const fixture = await makeFixture('hash-idempotent');
  const docs = join(fixture.projectRoot, 'docs');
  await mkdir(docs, { recursive: true });
  try {
    const configPath = await writeConfig(fixture.projectRoot, 'knowledge:\n  - ./docs\n');
    const staleHash = await fileHash(configPath);
    await writeFile(configPath, 'knowledge:\n  - ./docs\n# newer manual edit\n', 'utf8');
    const newerBytes = await readFile(configPath);

    const duplicate = await run({
      operation: 'add',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
      collection: 'knowledge',
      entry: '../docs',
      expectedHash: staleHash,
    });
    assertEnvelope(duplicate);
    assert.equal(duplicate.status, 'BLOCK');
    assert.equal(duplicate.changed, false);
    assert.match(diagnosticText(duplicate), /hash|changed|conflict/i);
    assert.deepEqual(await readFile(configPath), newerBytes);

    const absent = await run({
      operation: 'remove',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
      collection: 'knowledge',
      entry: '../missing',
      expectedHash: staleHash,
    });
    assertEnvelope(absent);
    assert.equal(absent.status, 'BLOCK');
    assert.equal(absent.changed, false);
    assert.match(diagnosticText(absent), /hash|changed|conflict/i);
    assert.deepEqual(await readFile(configPath), newerBytes);
  } finally {
    await removeFixture(fixture);
  }
});

test('malformed discoveredSkills and exclusions return structured input diagnostics', async () => {
  const fixture = await makeFixture('input-validation');
  const docs = join(fixture.projectRoot, 'docs');
  await mkdir(docs, { recursive: true });
  try {
    await writeConfig(fixture.projectRoot, 'knowledge:\n  - ./docs\n');
    const discoveryCases = [
      null,
      {},
      { name: '' },
      { name: 42 },
      { name: null },
      { name: 'skill', id: null },
      { name: 'skill', path: null },
      { name: 'skill', id: 42 },
      { name: 'skill', path: 42 },
      { name: 'skill', id: '' },
      { name: 'skill', path: '' },
      { name: 'skill', extra: 'unsupported' },
    ];
    for (const discoveredSkills of discoveryCases) {
      const result = await run({
        operation: 'inspect',
        scope: 'all',
        projectRoot: fixture.projectRoot,
        homeDir: fixture.homeDir,
        cwd: fixture.cwd,
        discoveredSkills: [discoveredSkills],
      });
      assertEnvelope(result);
      assert.equal(result.status, 'BLOCK', `invalid discoveredSkills accepted: ${JSON.stringify(discoveredSkills)}`);
      assert.equal(result.diagnostics[0].code, 'INVALID_DISCOVERY', `wrong diagnostic for ${JSON.stringify(discoveredSkills)}`);
    }

    for (const exclusion of [null, { identity: 'x', extra: 'unsupported' }]) {
      const invalidExclusions = await run({
        operation: 'inspect',
        scope: 'all',
        projectRoot: fixture.projectRoot,
        homeDir: fixture.homeDir,
        cwd: fixture.cwd,
        exclusions: [exclusion],
      });
      assertEnvelope(invalidExclusions);
      assert.equal(invalidExclusions.status, 'BLOCK', `invalid exclusion accepted: ${JSON.stringify(exclusion)}`);
      assert.equal(invalidExclusions.diagnostics[0].code, 'INVALID_EXCLUSIONS', `wrong diagnostic for ${JSON.stringify(exclusion)}`);
    }
  } finally {
    await removeFixture(fixture);
  }
});

test('config writes refuse to replace a symlinked nimo.yaml', async (t) => {
  const fixture = await makeFixture('symlink-write');
  const docs = join(fixture.projectRoot, 'docs');
  const configPath = join(fixture.projectRoot, '.nimo', 'nimo.yaml');
  const targetPath = join(fixture.root, 'real-nimo.yaml');
  await mkdir(docs, { recursive: true });
  await mkdir(dirname(configPath), { recursive: true });
  await writeFile(targetPath, 'knowledge:\n  - ./docs\n', 'utf8');
  try {
    try {
      await symlink(targetPath, configPath, 'file');
    } catch (error) {
      if (['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) {
        t.skip(`symlink creation unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    const before = await fileHash(targetPath);
    const result = await run({
      operation: 'add',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
      collection: 'knowledge',
      entry: '../docs',
    });
    assertEnvelope(result);
    assert.equal(result.status, 'BLOCK');
    assert.equal(result.changed, false);
    assert.equal(result.diagnostics[0].code, 'CONFIG_SYMLINK');
    assert.equal(await fileHash(targetPath), before);
  } finally {
    await removeFixture(fixture);
  }
});

test('config writes refuse to pass through a linked .nimo directory', async (t) => {
  const fixture = await makeFixture('linked-directory');
  const docs = join(fixture.projectRoot, 'docs');
  const linkedDirectory = join(fixture.root, 'outside', '.nimo');
  const linkPath = join(fixture.projectRoot, '.nimo');
  const targetConfig = join(linkedDirectory, 'nimo.yaml');
  await mkdir(docs, { recursive: true });
  await mkdir(linkedDirectory, { recursive: true });
  await writeFile(targetConfig, 'knowledge: []\n', 'utf8');
  try {
    try {
      await symlink(linkedDirectory, linkPath, 'junction');
    } catch (error) {
      if (['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) {
        t.skip(`junction creation unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    const before = await fileHash(targetConfig);
    const result = await run({
      operation: 'add',
      scope: 'team',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
      collection: 'knowledge',
      entry: '../docs',
    });
    assertEnvelope(result);
    assert.equal(result.status, 'BLOCK');
    assert.equal(result.changed, false);
    assert.equal(result.diagnostics[0].code, 'LINKED_DIRECTORY');
    assert.equal(await fileHash(targetConfig), before);
  } finally {
    await removeFixture(fixture);
  }
});

test('A11 exclusions affect only the current inspect and never rewrite YAML', async () => {
  const fixture = await makeFixture('exclusion');
  const knowledge = join(fixture.homeDir, 'private-knowledge');
  await mkdir(knowledge, { recursive: true });
  try {
    const configPath = await writeConfig(fixture.homeDir, 'knowledge:\n  - ./private-knowledge\n');
    const beforeHash = await fileHash(configPath);
    const initial = await run({
      operation: 'inspect',
      scope: 'personal',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });
    const exclusionIdentity = referenceList(initial)[0].identity;
    const excluded = await run({
      operation: 'inspect',
      scope: 'personal',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
      exclusions: [exclusionIdentity],
    });
    assertEnvelope(excluded);
    assert.equal(referenceList(excluded).length, 0);
    assert.equal(await fileHash(configPath), beforeHash);

    const freshSession = await run({
      operation: 'inspect',
      scope: 'personal',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    });
    assert.equal(referenceList(freshSession).length, 1);
    assert.equal(await realpath(referencePath(referenceList(freshSession)[0])), await realpath(knowledge));
  } finally {
    await removeFixture(fixture);
  }
});

test('A13 handles Unicode and spaces and does not read another project configuration', async () => {
  const fixture = await makeFixture('path-boundary');
  const unicodeRoot = join(fixture.projectRoot, '中文 project');
  const unicodeDocs = join(unicodeRoot, 'docs with spaces');
  const otherProject = join(fixture.root, 'other-project');
  await mkdir(unicodeDocs, { recursive: true });
  await mkdir(otherProject, { recursive: true });
  try {
    await writeConfig(otherProject, 'knowledge:\n  - ./should-not-be-read\n');
    const result = await run({
      operation: 'add',
      scope: 'team',
      projectRoot: unicodeRoot,
      homeDir: fixture.homeDir,
      cwd: join(unicodeRoot, 'src'),
      collection: 'knowledge',
      entry: '../docs with spaces',
    });
    assertEnvelope(result);
    assert.equal(result.status, 'OK');
    const inspected = await run({
      operation: 'inspect',
      scope: 'team',
      projectRoot: unicodeRoot,
      homeDir: fixture.homeDir,
      cwd: join(unicodeRoot, 'src'),
    });
    const refs = referenceList(inspected);
    assert.equal(refs.length, 1);
    assert.equal(await realpath(referencePath(refs[0])), await realpath(unicodeDocs));
    assert.doesNotMatch(JSON.stringify(inspected.data), /should-not-be-read/);
  } finally {
    await removeFixture(fixture);
  }
});

test('config.mjs --input emits one JSON result on stdout', async () => {
  const fixture = await makeFixture('cli');
  try {
    const inputPath = join(fixture.root, 'request.json');
    await writeFile(inputPath, JSON.stringify({
      operation: 'inspect',
      scope: 'all',
      projectRoot: fixture.projectRoot,
      homeDir: fixture.homeDir,
      cwd: fixture.cwd,
    }), 'utf8');
    const { stdout, stderr } = await execFileAsync(process.execPath, [scriptPath, '--input', inputPath], {
      cwd: fixture.projectRoot,
      windowsHide: true,
    });
    const lines = stdout.trim().split(/\r?\n/).filter(Boolean);
    assert.equal(lines.length, 1, `stdout must contain one JSON document; stderr=${stderr}`);
    const result = JSON.parse(lines[0]);
    assertEnvelope(result);
    assert.equal(result.status, 'OK');
  } finally {
    await removeFixture(fixture);
  }
});
