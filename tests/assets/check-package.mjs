import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * The package contract is deliberately kept here instead of inferred from the
 * directory.  An inferred list would let a partial migration pass by merely
 * renaming whatever files happen to be present.
 */
export const ENTRY_SKILLS = Object.freeze([
  'nimo-mode',
  'nimo-setup',
  'configure-nimo',
]);

export const TASK_SKILLS = Object.freeze([
  'nimo-how',
  'nimo-why',
  'nimo-architect',
  'nimo-arena',
  'nimo-swarm',
  'nimo-interrogate',
  'nimo-figure-it-out',
  'nimo-tdd',
  'nimo-unslop',
  'nimo-technical-writing',
  'nimo-no-comments',
  'nimo-show-me-your-work',
  'nimo-verification-create',
  'nimo-verification-maintain',
  'nimo-skill-evaluate',
  'nimo-skill-author',
  'nimo-deslop',
  'nimo-verify',
]);

export const PRINCIPLE_NAMES = Object.freeze([
  'attack-the-premise',
  'boundary-discipline',
  'build-the-lever',
  'encode-lessons-in-structure',
  'exhaust-the-design-space',
  'experience-first',
  'fix-root-causes',
  'foundational-thinking',
  'guard-the-context-window',
  'laziness-protocol',
  'make-operations-idempotent',
  'migrate-callers-then-delete-legacy-apis',
  'minimize-reader-load',
  'model-the-domain',
  'never-block-on-the-human',
  'outcome-oriented-execution',
  'prove-it-works',
  'redesign-from-first-principles',
  'separate-before-serializing-shared-state',
  'sequence-verifiable-units',
  'subtract-before-you-add',
  'test-behavior-not-implementation',
  'type-system-discipline',
]);

export const PRINCIPLE_SKILLS = Object.freeze(
  PRINCIPLE_NAMES.map((name) => `nimo-principle-${name}`),
);

export const PLAYBOOKS = Object.freeze([
  'feature.md',
  'bug-fix.md',
  'investigation.md',
  'refactoring.md',
  'prototype.md',
  'perf-issue.md',
  'hillclimb.md',
  'runtime-forensics.md',
  'trace-forensics.md',
  'visual-parity.md',
  'authoring-a-skill.md',
  'eval.md',
  'opening-a-pr.md',
  'babysit.md',
  'shipping.md',
  'multi-phase-plan.md',
  'autonomous-run.md',
  'orchestrate.md',
  'autopilot-full.md',
  'autopilot-stack.md',
  'session-pickup.md',
  'pause-safely.md',
  'worktree-cleanup.md',
]);

export const EXPECTED_SKILLS = Object.freeze([
  ...ENTRY_SKILLS,
  ...TASK_SKILLS,
  ...PRINCIPLE_SKILLS,
]);

assert.equal(ENTRY_SKILLS.length, 3, 'asset contract: three entry Skills');
assert.equal(TASK_SKILLS.length, 18, 'asset contract: eighteen task Skills');
assert.equal(PRINCIPLE_SKILLS.length, 23, 'asset contract: twenty-three principle Skills');
assert.equal(new Set(EXPECTED_SKILLS).size, 44, 'asset contract: Skill names must be unique');
assert.equal(PLAYBOOKS.length, 23, 'asset contract: twenty-three Playbooks');
assert.equal(new Set(PLAYBOOKS).size, 23, 'asset contract: Playbook names must be unique');

const EXPECTED_SKILL_SET = new Set(EXPECTED_SKILLS);
const SUPPORTED_REFERENCE_EXTENSIONS = new Set([
  '.cjs',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ps1',
  '.sh',
  '.toml',
  '.ts',
  '.yaml',
  '.yml',
]);

const FORBIDDEN_EXECUTION_PATTERNS = Object.freeze([
  {
    id: 'cursor-private-api',
    pattern: /(?:cloud_base_branch|\.cursor(?:[\\/]|$)|cursor[-_](?:agent|task)|\bcursor\s+(?:task|agent|cloud|run)\b|\bTask\s*\()/i,
  },
  {
    id: 'bun-bootstrap',
    pattern: /(?:^|[\s`"'=])bun\s+(?:add|create|install|link|pm|remove|run|upgrade|x)\b|(?:^|["'`])bun:/i,
  },
  {
    id: 'graphite-command',
    pattern: /(?:^|[\s`"'=])(?:gt|graphite)\s+(?:branch|checkout|create|down|land|merge|restack|stack|submit|sync|track|up)\b/i,
  },
  {
    id: 'fixed-model-option',
    pattern: /(?:--model(?:[=\s]+)|\bmodel\s*[:=]\s*["'`]?|\b模型\s*[:=]\s*)\s*(?:glm[- ]?5(?:\.3)?|gpt[- ]?\d+(?:\.\d+)?|claude[- ]?\d+(?:\.\d+)?|gemini[- ]?\d+(?:\.\d+)?|luna(?:\s+max)?)\b/i,
  },
  {
    id: 'fixed-model-name',
    pattern: /\b(?:GLM[- ]?5(?:\.3)?|GPT[- ]?\d+(?:\.\d+)?|Claude[- ]?\d+(?:\.\d+)?|Gemini[- ]?\d+(?:\.\d+)?|Luna\s+Max)\b/i,
  },
]);

const NEGATIVE_OR_SOURCE_CONTEXT = /(?:avoid|authorized|authorization|example|explicitly\s+(?:requested|allowed)|if\s+(?:the\s+)?user|negative|never|not\s+(?:use|require|depend|call|run)|only\s+when|permission|permitted|without|do\s+not|must\s+not|source|reference|upstream|pstack|user\s+(?:can|may|explicitly)|when\s+(?:the\s+)?user|许可|授权|允许|上游|改编|迁移|禁止|不使用|不要求|不依赖|不调用|不运行|不得|不要|不能|无需|来源|示例|指定|宿主)/i;

function readDirectoryNames(directory, { files = false, directories = false } = {}) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => (files && entry.isFile()) || (directories && entry.isDirectory()))
    .map((entry) => entry.name);
}

function relativePath(from, to) {
  return path.relative(from, to).split(path.sep).join('/');
}

function addError(result, code, message, details = {}) {
  result.errors.push({ code, message, ...details });
}

function addWarning(result, code, message, details = {}) {
  result.warnings.push({ code, message, ...details });
}

function parseFrontMatter(text) {
  const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---\s*(?:\r?\n|$)/);
  if (!match) return { error: 'missing YAML front matter' };

  const header = match[1];
  const nameMatch = header.match(/^\s*name\s*:\s*(.+?)\s*$/m);
  const descriptionMatch = header.match(/^\s*description\s*:\s*(.*?)\s*$/m);
  const unquote = (value) => {
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    return value;
  };
  const name = nameMatch ? unquote(nameMatch[1].trim()) : '';
  let description = descriptionMatch ? descriptionMatch[1].trim() : '';
  if (/^[>|][+-]?$/.test(description)) {
    const descriptionStart = descriptionMatch.index + descriptionMatch[0].length;
    const remainder = header.slice(descriptionStart);
    description = remainder
      .split(/\r?\n/)
      .filter((line) => /^\s+/.test(line) && line.trim())
      .map((line) => line.trim())
      .join(' ');
  }
  return { name, description, body: text.slice(match[0].length) };
}

function isUrlOrAnchor(value) {
  return value.startsWith('#') || /^[a-z][a-z\d+.-]*:/i.test(value);
}

function stripReferenceSuffix(value) {
  return value.replace(/[?#].*$/, '').replace(/[\\/]$/, '');
}

function isLikelyRelativePath(value) {
  const normalized = value.trim().replace(/^<|>$/g, '').replaceAll('\\', '/');
  if (!normalized || isUrlOrAnchor(normalized) || normalized.startsWith('/')) return false;
  if (/[${}*]/.test(normalized) || /<[^>]+>/.test(normalized)) return false;
  if (normalized.startsWith('./') || normalized.startsWith('../')) return true;
  return /\.(?:cjs|js|json|md|mjs|ps1|sh|toml|ts|ya?ml)$/i.test(stripReferenceSuffix(normalized));
}

function markdownReferences(text) {
  const references = [];
  const markdownLink = /!?\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+[^)]*)?\)/g;
  for (const match of text.matchAll(markdownLink)) {
    const value = match[1].trim();
    if (isLikelyRelativePath(value)) references.push({ value, kind: 'markdown-link' });
  }
  return references;
}

function lineNumberAt(text, offset) {
  return text.slice(0, offset).split(/\r?\n/).length;
}

function isExplanatoryContext(text, offset) {
  const lines = text.split(/\r?\n/);
  const line = lineNumberAt(text, offset) - 1;
  return NEGATIVE_OR_SOURCE_CONTEXT.test(lines[line] ?? '');
}

function checkRelativeReferences(result, root, files) {
  let count = 0;
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const reference of markdownReferences(text)) {
      count += 1;
      const raw = reference.value.replace(/^<|>$/g, '');
      const target = stripReferenceSuffix(raw).replaceAll('/', path.sep);
      const resolved = path.resolve(path.dirname(file), target);
      const relativeToRoot = path.relative(root, resolved);
      if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
        addError(result, 'reference-outside-package', `${relativePath(root, file)} references a path outside the package`, {
          file: relativePath(root, file),
          reference: raw,
        });
      } else if (!fs.existsSync(resolved)) {
        addError(result, 'missing-reference', `${relativePath(root, file)} references missing path ${raw}`, {
          file: relativePath(root, file),
          reference: raw,
        });
      }
    }
  }
  return count;
}

function checkSkillNameTokens(result, root, files) {
  const tokenPattern = /(?<![\w-])nimo-[a-z0-9]+(?:-[a-z0-9]+)*/gi;
  const skillsRoot = `${path.join(root, 'skills')}${path.sep}`;
  for (const file of files) {
    if (!file.startsWith(skillsRoot)) continue;
    if (path.extname(file).toLowerCase() !== '.md') continue;
    const text = fs.readFileSync(file, 'utf8');
    for (const match of text.matchAll(tokenPattern)) {
      const token = match[0].toLowerCase();
      if (EXPECTED_SKILL_SET.has(token) || isExplanatoryContext(text, match.index)) continue;
      addError(result, 'unknown-skill-reference', `${relativePath(root, file)} names an unknown nimo Skill ${token}`, {
        file: relativePath(root, file),
        reference: token,
        line: lineNumberAt(text, match.index),
      });
    }
  }
}

function checkForbiddenExecution(result, root, files) {
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const entry of FORBIDDEN_EXECUTION_PATTERNS) {
      for (const match of text.matchAll(new RegExp(entry.pattern.source, entry.pattern.flags.includes('g') ? entry.pattern.flags : `${entry.pattern.flags}g`))) {
        if (isExplanatoryContext(text, match.index)) continue;
        addError(result, 'forbidden-execution-dependency', `${relativePath(root, file)} contains ${entry.id}`, {
          file: relativePath(root, file),
          pattern: entry.id,
          line: lineNumberAt(text, match.index),
          excerpt: text.split(/\r?\n/)[lineNumberAt(text, match.index) - 1]?.trim(),
        });
      }
    }
  }
}

function packageFiles(root) {
  const result = [];
  const pending = ['skills', 'integrations']
    .map((directory) => path.join(root, directory))
    .filter((directory) => fs.existsSync(directory));
  while (pending.length > 0) {
    const directory = pending.pop();
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory() && (entry.name === 'node_modules' || entry.name === '.git' || entry.name === 'coverage' || entry.name === 'dist')) continue;
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) pending.push(fullPath);
      else if (SUPPORTED_REFERENCE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) result.push(fullPath);
    }
  }
  return result;
}

/**
 * Check the installable nimo package without loading or executing any Skill.
 *
 * @param {string} packageRoot repository/package root
 * @returns {{ok: boolean, root: string, errors: Array<object>, warnings: Array<object>, counts: object}}
 */
export function checkPackage(packageRoot) {
  const root = path.resolve(packageRoot);
  const result = {
    ok: true,
    root,
    errors: [],
    warnings: [],
    counts: {
      skills: 0,
      entrySkills: ENTRY_SKILLS.length,
      taskSkills: TASK_SKILLS.length,
      principleSkills: PRINCIPLE_SKILLS.length,
      playbooks: 0,
      references: 0,
    },
  };

  const skillsRoot = path.join(root, 'skills');
  if (!fs.existsSync(skillsRoot)) {
    addError(result, 'missing-skills-root', 'skills/ directory is missing');
    result.ok = false;
    return result;
  }

  const actualSkillDirectories = readDirectoryNames(skillsRoot, { directories: true });
  const actualSkillSet = new Set(actualSkillDirectories);
  result.counts.skills = actualSkillDirectories.length;
  if (actualSkillDirectories.length !== EXPECTED_SKILLS.length) {
    addError(result, 'skill-count', `expected ${EXPECTED_SKILLS.length} Skills, found ${actualSkillDirectories.length}`, {
      expected: EXPECTED_SKILLS.length,
      actual: actualSkillDirectories.length,
    });
  }
  for (const expected of EXPECTED_SKILLS) {
    if (!actualSkillSet.has(expected)) {
      addError(result, 'missing-skill-directory', `missing Skill directory ${expected}`, { skill: expected });
    }
  }
  for (const actual of actualSkillDirectories) {
    if (!EXPECTED_SKILL_SET.has(actual)) {
      addError(result, 'unexpected-skill-directory', `unexpected Skill directory ${actual}`, { skill: actual });
    }
  }

  const metadataNames = new Map();
  for (const skill of EXPECTED_SKILLS) {
    const skillPath = path.join(skillsRoot, skill, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      addError(result, 'missing-skill-entrypoint', `${skill}/SKILL.md is missing`, { skill });
      continue;
    }
    const text = fs.readFileSync(skillPath, 'utf8');
    const frontMatter = parseFrontMatter(text);
    if (frontMatter.error) {
      addError(result, 'invalid-skill-metadata', `${skill}/SKILL.md ${frontMatter.error}`, { skill });
    } else {
      if (frontMatter.name !== skill) {
        addError(result, 'skill-name-mismatch', `${skill}/SKILL.md name is ${frontMatter.name || '<empty>'}`, {
          skill,
          declaredName: frontMatter.name,
        });
      }
      if (!frontMatter.description || frontMatter.description === '>' || frontMatter.description === '|') {
        addError(result, 'missing-skill-description', `${skill}/SKILL.md description is empty`, { skill });
      }
      const previous = metadataNames.get(frontMatter.name);
      if (previous) {
        addError(result, 'duplicate-skill-name', `${skill}/SKILL.md duplicates ${previous}`, {
          skill,
          duplicateOf: previous,
        });
      } else if (frontMatter.name) {
        metadataNames.set(frontMatter.name, skill);
      }
      if (frontMatter.body.trim().length < 80) {
        addError(result, 'empty-skill-body', `${skill}/SKILL.md has no substantive body`, { skill });
      }
    }
  }

  const playbookRoot = path.join(skillsRoot, 'nimo-mode', 'playbooks');
  const actualPlaybooks = readDirectoryNames(playbookRoot, { files: true })
    .filter((name) => path.extname(name).toLowerCase() === '.md');
  const actualPlaybookSet = new Set(actualPlaybooks);
  result.counts.playbooks = actualPlaybooks.length;
  if (actualPlaybooks.length !== PLAYBOOKS.length) {
    addError(result, 'playbook-count', `expected ${PLAYBOOKS.length} Playbooks, found ${actualPlaybooks.length}`, {
      expected: PLAYBOOKS.length,
      actual: actualPlaybooks.length,
    });
  }
  for (const expected of PLAYBOOKS) {
    if (!actualPlaybookSet.has(expected)) {
      addError(result, 'missing-playbook', `missing Playbook ${expected}`, { playbook: expected });
      continue;
    }
    const file = path.join(playbookRoot, expected);
    const text = fs.readFileSync(file, 'utf8');
    const body = text.replace(/^\s*#+[^\r\n]*(?:\r?\n|$)/, '').trim();
    if (body.length < 180 || /^(?:todo|tbd|参考\s+pstack|see\s+pstack)\.?$/i.test(body)) {
      addError(result, 'placeholder-playbook', `${expected} is empty or placeholder text`, { playbook: expected });
    }
  }
  for (const actual of actualPlaybooks) {
    if (!new Set(PLAYBOOKS).has(actual)) {
      addError(result, 'unexpected-playbook', `unexpected Playbook ${actual}`, { playbook: actual });
    }
  }

  const packageAssetFiles = packageFiles(root);
  const modeFile = path.join(skillsRoot, 'nimo-mode', 'SKILL.md');
  if (fs.existsSync(modeFile)) {
    const modeText = fs.readFileSync(modeFile, 'utf8');
    const modeReferences = markdownReferences(modeText);
    for (const principle of PRINCIPLE_SKILLS) {
      const linksToPrinciple = modeReferences.some(({ value }) => value.includes(`${principle}/`) || value.includes(`${principle}\\`));
      if (!linksToPrinciple) {
        addError(result, 'principle-index-link', `nimo-mode/SKILL.md has no package link for ${principle}`, {
          skill: principle,
        });
      }
    }
  }

  result.counts.references = checkRelativeReferences(result, root, packageAssetFiles);
  checkSkillNameTokens(result, root, packageAssetFiles);
  checkForbiddenExecution(result, root, packageAssetFiles);

  if (result.warnings.length > 0) {
    addWarning(result, 'warnings-present', `${result.warnings.length} warning(s) require review`);
  }
  result.ok = result.errors.length === 0;
  return result;
}

function formatResult(result) {
  const lines = [];
  const status = result.ok ? 'PASS' : 'FAIL';
  lines.push(`${status} nimo package asset check: ${result.counts.skills} Skills (${result.counts.entrySkills} entry, ${result.counts.taskSkills} task, ${result.counts.principleSkills} principle), ${result.counts.playbooks} Playbooks`);
  for (const error of result.errors) {
    const location = error.file ? `${error.file}${error.line ? `:${error.line}` : ''}: ` : '';
    lines.push(`  ERROR ${location}${error.message}`);
  }
  for (const warning of result.warnings) lines.push(`  WARN ${warning.message}`);
  return lines.join('\n');
}

const scriptPath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  const json = process.argv.includes('--json');
  const rootArgument = process.argv.slice(2).find((argument) => !argument.startsWith('-'));
  const packageRoot = rootArgument ? path.resolve(rootArgument) : path.resolve(path.dirname(scriptPath), '../..');
  const result = checkPackage(packageRoot);
  process.stdout.write(`${json ? JSON.stringify(result, null, 2) : formatResult(result)}\n`);
  process.exitCode = result.ok ? 0 : 1;
}
