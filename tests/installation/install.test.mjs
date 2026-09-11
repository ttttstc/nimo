import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { mkdtemp, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE_ROOT = process.env.NIMO_TEST_SOURCE ? resolve(process.env.NIMO_TEST_SOURCE) : REPO_ROOT;
const INSTALLER_URL = pathToFileURL(join(REPO_ROOT, 'skills', 'nimo-mode', 'scripts', 'install.mjs'));
const EXPECTED_SKILLS = [
  'configure-nimo', 'nimo-arena', 'nimo-architect', 'nimo-deslop', 'nimo-figure-it-out', 'nimo-how', 'nimo-interrogate',
  'nimo-mode', 'nimo-no-comments', 'nimo-setup', 'nimo-show-me-your-work', 'nimo-skill-author', 'nimo-skill-evaluate',
  'nimo-swarm', 'nimo-tdd', 'nimo-technical-writing', 'nimo-unslop', 'nimo-verification-create', 'nimo-verification-maintain', 'nimo-verify', 'nimo-why',
  'nimo-principle-attack-the-premise', 'nimo-principle-boundary-discipline', 'nimo-principle-build-the-lever', 'nimo-principle-encode-lessons-in-structure',
  'nimo-principle-exhaust-the-design-space', 'nimo-principle-experience-first', 'nimo-principle-fix-root-causes',
  'nimo-principle-foundational-thinking', 'nimo-principle-guard-the-context-window', 'nimo-principle-laziness-protocol',
  'nimo-principle-make-operations-idempotent', 'nimo-principle-migrate-callers-then-delete-legacy-apis',
  'nimo-principle-minimize-reader-load', 'nimo-principle-model-the-domain', 'nimo-principle-never-block-on-the-human',
  'nimo-principle-outcome-oriented-execution', 'nimo-principle-prove-it-works', 'nimo-principle-redesign-from-first-principles',
  'nimo-principle-separate-before-serializing-shared-state', 'nimo-principle-sequence-verifiable-units',
  'nimo-principle-subtract-before-you-add', 'nimo-principle-test-behavior-not-implementation', 'nimo-principle-type-system-discipline',
].sort();

const previousNpmCache = process.env.npm_config_cache;
const testNpmCache = await mkdtemp(join(tmpdir(), 'nimo-npm-cache-'));
process.env.npm_config_cache = testNpmCache;
after(async () => {
  if (previousNpmCache === undefined) delete process.env.npm_config_cache;
  else process.env.npm_config_cache = previousNpmCache;
  await rm(testNpmCache, { recursive: true, force: true });
});

const { install, uninstall } = await import(INSTALLER_URL);

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function makeTemp(name) {
  return mkdtemp(join(tmpdir(), `nimo-${name}-`));
}

async function copySourceFixture(root, label = 'source') {
  const source = join(root, `${label} with spaces 中文`);
  await mkdir(source, { recursive: true });
  await cp(join(SOURCE_ROOT, 'skills'), join(source, 'skills'), {
    recursive: true,
    filter: candidate => !candidate.split(/[\\/]/).includes('node_modules'),
  });
  if (await exists(join(SOURCE_ROOT, 'defaults'))) {
    await cp(join(SOURCE_ROOT, 'defaults'), join(source, 'defaults'), { recursive: true });
  }
  for (const name of ['VERSION', 'THIRD_PARTY_NOTICES.md']) {
    if (await exists(join(SOURCE_ROOT, name))) {
      await cp(join(SOURCE_ROOT, name), join(source, name));
    }
  }
  return source;
}

async function skillDirectories(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const names = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (await exists(join(root, entry.name, 'SKILL.md'))) names.push(entry.name);
  }
  return names.sort();
}

async function filesUnder(root) {
  const result = [];
  async function visit(current) {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) {
        await visit(path);
      } else {
        result.push(relative(root, path).replaceAll('\\', '/'));
      }
    }
  }
  if (await exists(root)) await visit(root);
  return result.sort();
}

async function sha256(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function invoke(fn, args) {
  try {
    return { threw: false, value: await fn(args) };
  } catch (error) {
    return { threw: true, error };
  }
}

function statusOf(outcome) {
  const value = outcome?.value;
  if (typeof value === 'string') return value;
  return value?.status ?? value?.result?.status ?? value?.data?.status;
}

function assertSuccessful(outcome, message) {
  assert.equal(outcome.threw, false, `${message}: ${outcome.error?.message ?? 'threw'}`);
  const status = statusOf(outcome);
  if (status !== undefined) assert.ok(!['BLOCK', 'FAILED', 'ERROR'].includes(status), `${message}: ${status}`);
}

async function findManifest(target) {
  const candidates = [
    join(target, '.nimo-manifest'),
    join(target, '.nimo-manifest.json'),
  ];
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  return undefined;
}

async function removeTemp(root) {
  if (process.env.NIMO_KEEP_FAILED === '1') return;
  const resolvedRoot = await realpath(root);
  const resolvedTemp = await realpath(tmpdir());
  const prefix = resolvedTemp.endsWith('/') || resolvedTemp.endsWith('\\') ? resolvedTemp : `${resolvedTemp}${resolve('/').includes('\\') ? '\\' : '/'}`;
  assert.ok(resolvedRoot.startsWith(prefix), `refusing to remove outside temporary directory: ${resolvedRoot}`);
  await rm(resolvedRoot, { recursive: true, force: true });
}

test('clean install contains all 44 Skills and remains runnable after source removal', async () => {
  const root = await makeTemp('install');
  try {
    const source = await copySourceFixture(root);
    const home = join(root, '目标 home with spaces 中文');
    const target = join(home, 'skills');
    const sourceSkills = await skillDirectories(join(source, 'skills'));
    assert.equal(sourceSkills.length, 44, 'the package source must contain exactly 44 Skills');
    assert.deepEqual(sourceSkills, EXPECTED_SKILLS, 'the package source must contain the specified Skill set');

    const outcome = await invoke(install, { source, target });
    assertSuccessful(outcome, 'clean install');
    assert.deepEqual(await skillDirectories(target), sourceSkills);
    const manifest = JSON.parse(await readFile(join(target, '.nimo-manifest.json'), 'utf8'));
    assert.equal(manifest.formatVersion, 1);
    assert.equal(manifest.version, (await readFile(join(source, 'VERSION'), 'utf8')).trim());
    assert.equal(typeof manifest.sourceCommit, 'string', 'manifest records the source revision or unknown');
    assert.equal(await exists(join(target, 'nimo-mode', 'VERSION')), true, 'installed package records VERSION inside nimo-mode');

    for (const skill of sourceSkills) {
      const sourceFiles = await filesUnder(join(source, 'skills', skill));
      for (const file of sourceFiles) {
        const sourceFile = join(source, 'skills', skill, file);
        const targetFile = join(target, skill, file);
        assert.equal(await exists(targetFile), true, `installed file is missing: ${skill}/${file}`);
        assert.equal(await sha256(targetFile), await sha256(sourceFile), `installed file changed: ${skill}/${file}`);
      }
    }

    const scriptsRoot = join(target, 'nimo-mode', 'scripts');
    const installedConfig = join(scriptsRoot, 'config.mjs');
    const installedPackage = join(target, 'nimo-mode', 'scripts', 'package.json');
    assert.equal(await exists(installedConfig), true, 'installed config script is self-contained');
    assert.equal(await exists(installedPackage), true, 'installed script package metadata is present');
    const packageJson = JSON.parse(await readFile(installedPackage, 'utf8'));
    if (Object.keys(packageJson.dependencies ?? {}).length > 0) {
      assert.equal(await exists(join(target, 'nimo-mode', 'scripts', 'node_modules')), true, 'production dependencies are copied into the install');
    }

    // Every installed production module must load without resolving anything from the checkout.
    const productionScripts = ['config.mjs', 'state.mjs', 'inspect-pr.mjs', 'audit-worktrees.mjs', 'check-plan.mjs', 'log.mjs', 'install.mjs'];
    for (const script of productionScripts) assert.equal(await exists(join(scriptsRoot, script)), true, `installed production script is missing: ${script}`);
    const importUrls = productionScripts.map(script => pathToFileURL(join(scriptsRoot, script)).href);
    const importProbe = `await Promise.all(${JSON.stringify(importUrls)}.map(url => import(url)))`;
    const probe = await import('node:child_process').then(({ execFile }) => new Promise((resolveProbe, reject) => {
      execFile(process.execPath, ['--input-type=module', '--eval', importProbe], { windowsHide: true }, (error, stdout, stderr) => {
        if (error) reject(new Error(`installed script import failed: ${stderr || stdout || error.message}`));
        else resolveProbe();
      });
    }));
    assert.equal(probe, undefined);

    await rm(source, { recursive: true, force: true });
    const afterSourceRemoval = await import(pathToFileURL(installedConfig).href);
    assert.ok(afterSourceRemoval, 'installed script still imports after the source is gone');
  } finally {
    await removeTemp(root);
  }
});

test('update preflight rejects a modified target without producing a mixed install', async () => {
  const root = await makeTemp('preflight');
  try {
    const source = await copySourceFixture(root);
    const collisionTarget = join(root, 'collision', 'skills');
    const collisionEntry = join(collisionTarget, 'nimo-mode', 'SKILL.md');
    await mkdir(dirname(collisionEntry), { recursive: true });
    await writeFile(collisionEntry, 'foreign skill must remain\n', 'utf8');
    const collisionBefore = await filesUnder(join(root, 'collision'));
    const collision = await invoke(install, { source, target: collisionTarget });
    assert.ok(collision.threw || !['OK', 'READY', 'COMPLETE'].includes(statusOf(collision)), 'an unowned target collision must fail before writing');
    assert.deepEqual(await filesUnder(join(root, 'collision')), collisionBefore, 'collision preflight must not produce a partial install');

    const brokenSource = await copySourceFixture(root, 'broken-source');
    await writeFile(join(brokenSource, 'skills', 'nimo-mode', 'scripts', 'package-lock.json'), '{ invalid lockfile\n', 'utf8');
    const brokenTarget = join(root, 'broken', 'skills');
    const broken = await invoke(install, { source: brokenSource, target: brokenTarget });
    assert.ok(broken.threw || !['OK', 'READY', 'COMPLETE'].includes(statusOf(broken)), 'dependency installation failure must fail before writing');
    assert.equal(await exists(brokenTarget), false, 'dependency failure must not create a target tree');

    const target = join(root, 'target', 'skills');
    const first = await invoke(install, { source, target });
    assertSuccessful(first, 'initial install');

    const brokenUpgradeSource = await copySourceFixture(root, 'broken-upgrade-source');
    await writeFile(join(brokenUpgradeSource, 'skills', 'nimo-mode', 'scripts', 'package-lock.json'), '{ invalid lockfile\n', 'utf8');
    const beforeDependencyFailure = await filesUnder(target);
    const beforeDependencyHashes = new Map(await Promise.all(beforeDependencyFailure.map(async file => [file, await sha256(join(target, file))])));
    const brokenUpgrade = await invoke(install, { source: brokenUpgradeSource, target });
    assert.ok(brokenUpgrade.threw || !['OK', 'READY', 'COMPLETE'].includes(statusOf(brokenUpgrade)), 'dependency failure during update must fail before writing');
    assert.deepEqual(await filesUnder(target), beforeDependencyFailure, 'dependency failure during update must not change the target file set');
    for (const file of beforeDependencyFailure) assert.equal(await sha256(join(target, file)), beforeDependencyHashes.get(file), `dependency failure changed ${file}`);

    const changedTarget = join(target, 'nimo-mode', 'SKILL.md');
    await writeFile(changedTarget, `${await readFile(changedTarget, 'utf8')}\nuser edit\n`, 'utf8');
    await writeFile(join(source, 'skills', 'nimo-mode', 'SKILL.md'), `${await readFile(join(source, 'skills', 'nimo-mode', 'SKILL.md'), 'utf8')}\nnew package\n`, 'utf8');
    const beforeFiles = await filesUnder(target);
    const beforeHashes = new Map(await Promise.all(beforeFiles.map(async file => [file, await sha256(join(target, file))])));

    const second = await invoke(install, { source, target });
    const status = statusOf(second);
    assert.ok(second.threw || status === undefined || !['OK', 'READY', 'COMPLETE'].includes(status), 'a modified managed file must fail the update preflight');
    assert.deepEqual(await filesUnder(target), beforeFiles, 'preflight failure must not add or remove target files');
    for (const file of beforeFiles) {
      assert.equal(await sha256(join(target, file)), beforeHashes.get(file), `preflight failure changed ${file}`);
    }
  } finally {
    await removeTemp(root);
  }
});

test('uninstall preserves user modifications, unrelated Skills, and nimo data', async () => {
  const root = await makeTemp('uninstall');
  try {
    const source = await copySourceFixture(root);
    const home = join(root, 'target');
    const target = join(home, 'skills');
    const installed = await invoke(install, { source, target });
    assertSuccessful(installed, 'initial install');

    const modified = join(target, 'nimo-mode', 'SKILL.md');
    await writeFile(modified, `${await readFile(modified, 'utf8')}\nuser customization\n`, 'utf8');
    const customSkill = join(target, 'my-unrelated-skill', 'SKILL.md');
    await mkdir(dirname(customSkill), { recursive: true });
    await writeFile(customSkill, 'unrelated skill', 'utf8');
    const userFile = join(target, 'nimo-mode', 'user-not-managed.txt');
    await writeFile(userFile, 'user data', 'utf8');
    const nimoConfig = join(home, '.nimo', 'nimo.yaml');
    await mkdir(dirname(nimoConfig), { recursive: true });
    await writeFile(nimoConfig, 'principles: []\n', 'utf8');

    const removed = await invoke(uninstall, { target });
    assertSuccessful(removed, 'uninstall');
    assert.equal(await readFile(modified, 'utf8').then(value => value.includes('user customization')), true);
    assert.equal(await readFile(customSkill, 'utf8'), 'unrelated skill');
    assert.equal(await readFile(userFile, 'utf8'), 'user data');
    assert.equal(await readFile(nimoConfig, 'utf8'), 'principles: []\n');

    const sourceSkills = await skillDirectories(join(source, 'skills'));
    for (const skill of sourceSkills) {
      const sourceFiles = await filesUnder(join(source, 'skills', skill));
      for (const file of sourceFiles) {
        const installedFile = join(target, skill, file);
        if (installedFile === modified) continue;
        assert.equal(await exists(installedFile), false, `uninstall left managed file ${skill}/${file}`);
      }
    }
  } finally {
    await removeTemp(root);
  }
});

test('install and uninstall enforce path boundaries for manifests and target links', async t => {
  const root = await makeTemp('boundary');
  try {
    const source = await copySourceFixture(root);
    const target = join(root, 'target', 'skills');
    const outside = join(root, 'outside.txt');
    await writeFile(outside, 'must survive', 'utf8');
    const installed = await invoke(install, { source, target });
    assertSuccessful(installed, 'initial install');
    const manifest = await findManifest(target);
    assert.ok(manifest, 'installation must produce a manifest');

    // The line is deliberately compatible with the historical text manifest and
    // invalid for JSON manifests, so both formats must fail closed.
    await writeFile(manifest, `${await readFile(manifest, 'utf8')}\n0 1 ../outside.txt\n`, 'utf8');
    const poisoned = await invoke(uninstall, { target });
    assert.equal(await readFile(outside, 'utf8'), 'must survive', 'manifest traversal must never delete outside files');
    assert.equal(await exists(manifest), true, 'a malformed or escaping manifest remains for inspection');
    if (!poisoned.threw) {
      const status = statusOf(poisoned);
      if (status !== undefined) assert.notEqual(status, 'OK', 'escaping manifest must not report a clean uninstall');
    }

    // A junction/symlink that would escape the target is an installation conflict.
    const linkedTarget = join(root, 'linked-target', 'skills');
    const linkedOutside = join(root, 'linked-outside');
    await mkdir(linkedOutside, { recursive: true });
    await writeFile(join(linkedOutside, 'sentinel.txt'), 'outside target', 'utf8');
    await mkdir(linkedTarget, { recursive: true });
    try {
      await symlink(linkedOutside, join(linkedTarget, 'nimo-mode'), process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
        t.skip(`symlink boundary unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    const linkedInstall = await invoke(install, { source, target: linkedTarget });
    assert.ok(linkedInstall.threw || !['OK', 'READY', 'COMPLETE'].includes(statusOf(linkedInstall)), 'a target link outside the install root must be rejected');
    assert.equal(await readFile(join(linkedOutside, 'sentinel.txt'), 'utf8'), 'outside target');
    assert.equal(await exists(join(linkedOutside, 'SKILL.md')), false, 'installer must not write through the target link');
  } finally {
    await removeTemp(root);
  }
});
