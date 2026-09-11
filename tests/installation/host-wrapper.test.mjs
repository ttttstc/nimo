import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execute = promisify(execFile);
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SOURCE_ROOT = process.env.NIMO_TEST_SOURCE ? resolve(process.env.NIMO_TEST_SOURCE) : REPO_ROOT;
const HOSTS = [
  {
    name: 'Codex',
    powershellHome: '-CodexHome',
    powershellInstall: join(REPO_ROOT, 'integrations', 'codex', 'install.ps1'),
    powershellUninstall: join(REPO_ROOT, 'integrations', 'codex', 'uninstall.ps1'),
    bashInstall: join(REPO_ROOT, 'integrations', 'codex', 'install.sh'),
    bashUninstall: join(REPO_ROOT, 'integrations', 'codex', 'uninstall.sh'),
    bashHome: '--codex-home',
    skillsDir: (home) => join(home, 'skills'),
  },
  {
    name: 'Claude Code',
    powershellHome: '-ClaudeConfigDir',
    powershellInstall: join(REPO_ROOT, 'integrations', 'claude-code', 'install.ps1'),
    powershellUninstall: join(REPO_ROOT, 'integrations', 'claude-code', 'uninstall.ps1'),
    bashInstall: join(REPO_ROOT, 'integrations', 'claude-code', 'install.sh'),
    bashUninstall: join(REPO_ROOT, 'integrations', 'claude-code', 'uninstall.sh'),
    bashHome: '--claude-config-dir',
  },
  {
    name: 'OpenCode',
    powershellHome: '-ConfigDir',
    powershellInstall: join(REPO_ROOT, 'integrations', 'opencode', 'install.ps1'),
    powershellUninstall: join(REPO_ROOT, 'integrations', 'opencode', 'uninstall.ps1'),
    bashInstall: join(REPO_ROOT, 'integrations', 'opencode', 'install.sh'),
    bashUninstall: join(REPO_ROOT, 'integrations', 'opencode', 'uninstall.sh'),
    bashHome: '--config-dir',
    skillsDir: (home) => join(home, 'skills'),
  },
  {
    name: 'Cursor',
    powershellHome: '-CursorHome',
    powershellInstall: join(REPO_ROOT, 'integrations', 'cursor', 'install.ps1'),
    powershellUninstall: join(REPO_ROOT, 'integrations', 'cursor', 'uninstall.ps1'),
    bashInstall: join(REPO_ROOT, 'integrations', 'cursor', 'install.sh'),
    bashUninstall: join(REPO_ROOT, 'integrations', 'cursor', 'uninstall.sh'),
    bashHome: '--cursor-home',
    skillsDir: (home) => join(home, 'skills'),
  },
  {
    name: 'dsh',
    powershellHome: '-DshHome',
    powershellInstall: join(REPO_ROOT, 'integrations', 'dsh', 'install.ps1'),
    powershellUninstall: join(REPO_ROOT, 'integrations', 'dsh', 'uninstall.ps1'),
    bashInstall: join(REPO_ROOT, 'integrations', 'dsh', 'install.sh'),
    bashUninstall: join(REPO_ROOT, 'integrations', 'dsh', 'uninstall.sh'),
    bashHome: '--dsh-home',
    skillsDir: (home) => join(home, 'skills'),
  },
];

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function skillDirectories(skillsRoot) {
  const names = [];
  for (const entry of await readdir(skillsRoot, { withFileTypes: true })) {
    if (entry.isDirectory() && await exists(join(skillsRoot, entry.name, 'SKILL.md'))) names.push(entry.name);
  }
  return names.sort();
}

async function run(command, args, env = process.env) {
  try {
    return await execute(command, args, { cwd: REPO_ROOT, env, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`${command} ${args.join(' ')} failed (${error.code ?? error.status}): ${error.stderr || error.stdout || error.message}`);
  }
}

async function removeTemp(root) {
  const resolvedRoot = await (await import('node:fs/promises')).realpath(root);
  const resolvedTemp = await (await import('node:fs/promises')).realpath(tmpdir());
  const separator = resolve('/').includes('\\') ? '\\' : '/';
  const prefix = resolvedTemp.endsWith(separator) ? resolvedTemp : `${resolvedTemp}${separator}`;
  assert.ok(resolvedRoot.startsWith(prefix), `refusing to remove outside temporary directory: ${resolvedRoot}`);
  await rm(resolvedRoot, { recursive: true, force: true });
}

async function assertLifecycle(host, root, install, uninstall, homeArgs) {
  const home = join(root, `${host.name} home 中文 with spaces`);
  const skillsRoot = join(home, 'skills');
  const npmCache = join(root, `${host.name.replaceAll(' ', '-')}-npm-cache`);
  await mkdir(npmCache, { recursive: true });
  const env = { ...process.env, npm_config_cache: npmCache };
  await install(home, homeArgs, env);
  assert.equal((await skillDirectories(skillsRoot)).length, 44, `${host.name} wrapper installed all 44 Skills`);
  assert.equal(await exists(join(skillsRoot, '.nimo-manifest.json')), true, `${host.name} wrapper wrote the JSON manifest`);

  const modified = join(skillsRoot, 'nimo-mode', 'SKILL.md');
  await writeFile(modified, `${await readFile(modified, 'utf8')}\nwrapper user edit\n`, 'utf8');
  const custom = join(skillsRoot, 'user-skill', 'SKILL.md');
  await mkdir(dirname(custom), { recursive: true });
  await writeFile(custom, 'unrelated wrapper skill\n', 'utf8');
  const config = join(home, '.nimo', 'nimo.yaml');
  await mkdir(dirname(config), { recursive: true });
  await writeFile(config, 'user: true\n', 'utf8');

  await uninstall(home, homeArgs, env);
  assert.match(await readFile(modified, 'utf8'), /wrapper user edit/);
  assert.equal(await readFile(custom, 'utf8'), 'unrelated wrapper skill\n');
  assert.equal(await readFile(config, 'utf8'), 'user: true\n');
  assert.equal(await exists(join(skillsRoot, 'nimo-mode', 'scripts', 'config.mjs')), false, `${host.name} wrapper removed unmodified managed files`);
  assert.equal(await exists(join(skillsRoot, '.nimo-manifest.json')), true, `${host.name} wrapper kept a manifest for the modified file`);
}

async function powershellAvailable() {
  try {
    await execute('powershell.exe', ['-NoProfile', '-Command', 'exit 0'], { windowsHide: true });
    return true;
  } catch {
    return false;
  }
}

async function findGitBash() {
  if (process.platform !== 'win32') return 'bash';
  const candidates = [
    process.env.NIMO_GIT_BASH,
    'D:\\soft\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\bin\\bash.exe',
    'C:\\Program Files\\Git\\usr\\bin\\bash.exe',
  ].filter(Boolean);
  for (const command of ['where.exe']) {
    try {
      const result = await execute(command, ['bash.exe'], { windowsHide: true });
      candidates.push(...result.stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean));
    } catch { /* Try the known Git installations below. */ }
  }
  try {
    const result = await execute('where.exe', ['sh.exe'], { windowsHide: true });
    for (const sh of result.stdout.split(/\r?\n/).map(line => line.trim()).filter(Boolean)) {
      candidates.push(join(dirname(sh), 'bash.exe'));
    }
  } catch { /* Git Bash may not be on PATH. */ }
  for (const command of [...new Set(candidates)]) {
    if (!(await exists(command))) continue;
    try {
      const result = await execute(command, ['--version'], { windowsHide: true });
      if (/GNU bash/i.test(`${result.stdout}\n${result.stderr}`)) return command;
    } catch { /* This may be WSL's bash.exe or another incompatible shim. */ }
  }
  return undefined;
}

test('PowerShell host wrappers install and uninstall in isolated homes', async t => {
  if (!(await powershellAvailable())) {
    t.skip('PowerShell is unavailable on this platform');
    return;
  }
  for (const host of HOSTS) {
    const root = await mkdtemp(join(tmpdir(), 'nimo-wrapper-ps-'));
    try {
      const home = join(root, `${host.name} home 中文 with spaces`);
      const common = ['-Source', SOURCE_ROOT, host.powershellHome, home];
      await assertLifecycle(
        host,
        root,
        (homeDir, _homeArgs, env) => run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', host.powershellInstall, ...common], env),
        (homeDir, _homeArgs, env) => run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', host.powershellUninstall, ...common], env),
        host.powershellHome,
      );
    } finally {
      await removeTemp(root);
    }
  }
});

test('Bash wrappers pass syntax checks and smoke install/uninstall when Git Bash is available', async t => {
  const bash = await findGitBash();
  if (!bash) {
    t.skip('Bash is unavailable on this platform');
    return;
  }
  for (const host of HOSTS) {
    await run(bash, ['-n', host.bashInstall]);
    await run(bash, ['-n', host.bashUninstall]);
  }

  async function bashPath(path) {
    if (process.platform !== 'win32') return path;
    const result = await run(bash, ['-lc', 'cd "$1" && pwd', 'bash', path]);
    return result.stdout.trim();
  }

  for (const host of HOSTS) {
    const root = await mkdtemp(join(tmpdir(), 'nimo-wrapper-bash-'));
    try {
      const home = join(root, `${host.name} home 中文 with spaces`);
      const npmCache = join(root, `${host.name.replaceAll(' ', '-')}-npm-cache`);
      await mkdir(home, { recursive: true });
      await mkdir(npmCache, { recursive: true });
      const sourceArg = await bashPath(SOURCE_ROOT);
      const homeArg = await bashPath(home);
      const env = { ...process.env, npm_config_cache: npmCache };
      await run(bash, [host.bashInstall, '--source', sourceArg, host.bashHome, homeArg], env);
      const skillsRoot = join(home, 'skills');
      assert.equal((await skillDirectories(skillsRoot)).length, 44, `${host.name} Bash wrapper installed all 44 Skills`);
      await run(bash, [host.bashUninstall, '--source', sourceArg, host.bashHome, homeArg], env);
      assert.equal(await exists(join(skillsRoot, '.nimo-manifest.json')), false, `${host.name} Bash wrapper removed its manifest`);
    } finally {
      await removeTemp(root);
    }
  }
});
