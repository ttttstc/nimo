#!/usr/bin/env node
// 上游漂移检测：每个落地文件都在「来源」行里写着自己取自哪个提交。
// 这个脚本把它们按提交分组，报告各组落后上游多少提交、哪些路径已在上游消失。
//
//   node skills/nimo-mode/scripts/upstream-drift.mjs --upstream <pstack 仓库路径>
//   node skills/nimo-mode/scripts/upstream-drift.mjs --upstream <path> --fail-if-behind 20
//
// 只读：不改文件、不联网、不写缓存。没有 --upstream 时只做本地分组。

import { execFileSync } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SKILLS_ROOT = resolve(fileURLToPath(new URL('../../', import.meta.url)));
const CITATION = /https:\/\/github\.com\/cursor\/plugins\/blob\/([0-9a-f]{7,40})\/(pstack\/[^\s)）]+)/g;

function parseArgs(argv) {
  const args = { upstream: null, failIfBehind: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--upstream') args.upstream = argv[++i];
    else if (argv[i] === '--fail-if-behind') args.failIfBehind = Number(argv[++i]);
    else if (argv[i] === '--json') args.json = true;
    else if (argv[i] === '--help' || argv[i] === '-h') args.help = true;
  }
  return args;
}

async function markdownFiles(root) {
  const found = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile() && entry.name.endsWith('.md')) found.push(full);
    }
  }
  await walk(root);
  return found.sort();
}

function git(upstream, argv) {
  try {
    return execFileSync('git', ['-C', upstream, ...argv], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

async function collect(root) {
  const groups = new Map();
  for (const file of await markdownFiles(root)) {
    const text = await readFile(file, 'utf8');
    const relativePath = relative(root, file).split('\\').join('/');
    for (const match of text.matchAll(CITATION)) {
      const [, sha, path] = match;
      if (!groups.has(sha)) groups.set(sha, []);
      groups.get(sha).push({ file: relativePath, path });
    }
  }
  return groups;
}

function summarize(groups, upstream) {
  const rows = [];
  for (const [sha, entries] of groups) {
    const row = { sha, files: entries.length, behind: null, oldest: null, missing: [], unknownSha: false };
    if (upstream) {
      if (git(upstream, ['cat-file', '-e', `${sha}^{commit}`]) === null) row.unknownSha = true;
      else {
        let worst = -1;
        for (const entry of entries) {
          const count = git(upstream, ['rev-list', '--count', `${sha}..HEAD`, '--', entry.path]);
          const behind = count === null ? 0 : Number(count);
          if (behind > worst) {
            worst = behind;
            row.oldest = entry.file;
          }
          if (git(upstream, ['cat-file', '-e', `HEAD:${entry.path}`]) === null) row.missing.push(entry.file);
        }
        row.behind = worst < 0 ? 0 : worst;
      }
    }
    rows.push(row);
  }
  return rows.sort((a, b) => (b.behind ?? -1) - (a.behind ?? -1) || b.files - a.files);
}

function print(rows, upstream) {
  const total = rows.reduce((sum, row) => sum + row.files, 0);
  console.log(`来源基线分组：${rows.length} 个提交，覆盖 ${total} 处引用`);
  if (!upstream) {
    console.log('（未提供 --upstream，只做本地分组）');
    for (const row of rows) console.log(`  ${row.sha}  ${row.files} 处`);
    return;
  }
  for (const row of rows) {
    if (row.unknownSha) {
      console.log(`  ${row.sha}  ${row.files} 处  上游不存在这个提交`);
      continue;
    }
    const parts = [`  ${row.sha}  ${row.files} 处  最落后 ${row.behind} 个提交`];
    if (row.oldest) parts.push(`   最落后：${row.oldest}`);
    if (row.missing.length) parts.push(`   上游已无此路径：${row.missing.join('、')}`);
    console.log(parts.join('\n'));
  }
  const stale = rows.filter((row) => row.behind > 0).length;
  console.log(`\n其中 ${stale} 组已有上游改动未吸收。漂移不是缺陷：它只说明这些文件需要重新对照一次。`);
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log('用法：node skills/nimo-mode/scripts/upstream-drift.mjs [--upstream <pstack 仓库路径>] [--fail-if-behind N] [--json]');
  process.exit(0);
}

const groups = await collect(SKILLS_ROOT);
const upstream = args.upstream ? resolve(args.upstream) : null;
if (upstream && git(upstream, ['rev-parse', '--verify', 'HEAD']) === null) {
  console.error(`不是 git 仓库或没有提交：${upstream}`);
  process.exit(2);
}

const rows = summarize(groups, upstream);
if (args.json) console.log(JSON.stringify({ rows }, null, 2));
else print(rows, upstream);

if (args.failIfBehind !== null) {
  const worst = Math.max(0, ...rows.map((row) => row.behind ?? 0));
  if (worst > args.failIfBehind) {
    console.error(`\n最落后 ${worst} 个提交，超过阈值 ${args.failIfBehind}`);
    process.exit(1);
  }
}
