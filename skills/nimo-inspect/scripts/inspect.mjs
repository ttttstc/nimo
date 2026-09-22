import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  absoluteProjectRoot,
  atomicWrite,
  captureSnapshot,
  fail,
  hashFile,
  isObject,
  outputPath,
  readJsonFile,
  readTextFile,
  requiredText,
  serializeError,
  taskPaths,
} from '../../nimo-mode/scripts/lib/task-records.mjs';
import { currentContract, validateAnchor } from '../../nimo-mode/scripts/task-anchor.mjs';
import { evaluateRecord, loadVerification } from '../../nimo-verify/scripts/record.mjs';
import { readCodexSource } from './hosts/codex.mjs';

const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;
const ACTIVITY_KINDS = new Map([
  ['inspect', 'inspect/read'],
  ['read', 'inspect/read'],
  ['change', 'change'],
  ['edit', 'change'],
  ['execute', 'execute/check'],
  ['check', 'execute/check'],
  ['test', 'execute/check'],
  ['git', 'git/delivery'],
  ['delivery', 'git/delivery'],
  ['commit', 'git/delivery'],
]);

function text(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function redact(value) {
  let result = text(value);
  for (const candidate of [process.env.USERPROFILE, process.env.HOME, process.env.HOMEDRIVE && process.env.HOMEPATH].filter(Boolean)) {
    result = result.replaceAll(candidate, '[home]');
  }
  return result.replaceAll(/(?:[A-Za-z]:)?[\\/]Users[\\/][^\\/\s]+/g, '[home]');
}

function html(value) {
  return redact(typeof value === 'number' ? String(value) : value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function array(value) {
  return Array.isArray(value) ? value : [];
}

function statusLabel(value) {
  const labels = {
    VERIFIED: '已验证', PASS_WITH_SKIPS: '经声明跳过后通过', UNVERIFIED: '未验证通过', BLOCKED: '受阻',
    PASS: '通过', FAIL: '失败', NOT_RUN: '未执行', NOT_APPLICABLE: '不适用',
    MATCH: '适用', STALE: '已过期', UNKNOWN: '未知', MISSING: '缺失',
    INVALID_REFERENCE: '无效引用', REMOTE_UNCHECKED: '远程证据未检查', UNSAFE_PROTOCOL: '不安全的链接协议',
    UNSAFE_PATH: '不安全的路径', SYMLINK_REFUSED: '已拒绝符号链接', UNSUPPORTED: '不支持',
    TOO_LARGE_TO_CHECK: '超过检查上限', CHANGED: '内容已变化', REFERENCED_ONLY: '仅有引用',
    BOUND: '内容已绑定', CLAIM_DECLARED: '生产者已声明支持结论', UNAVAILABLE: '不可用',
    UNOBSERVED: '未观测', UNMAPPED: '未关联', DECLARED: '明确声明', DECLARED_UNBOUNDED: '已声明但范围未定',
    INVALID_BOUNDARY: '无效范围', SOURCE_MISMATCH: '来源不匹配', PROJECTED: '已展示', NO_EVENTS_IN_BOUNDARY: '范围内无活动',
  };
  return labels[value] ? `${labels[value]}（${value}）` : value;
}

function projectContract(contract) {
  if (!contract) return null;
  return {
    revision: contract.revision,
    goal: redact(contract.goal),
    scope: array(contract.scope).map(redact),
    acceptance: array(contract.acceptance).map(item => ({ id: redact(item.id), text: redact(item.text), required: item.required === true })),
    confirmedBy: redact(contract.confirmedBy),
    confirmedAt: redact(contract.confirmedAt),
  };
}

function projectVerification(record, validation, contract) {
  if (!record) return null;
  const requiredAcceptance = new Set(array(contract?.acceptance).filter(item => item.required).map(item => item.id));
  return {
    taskId: record.taskId,
    contractRevision: record.contractRevision,
    artifactVersion: redact(record.artifactVersion),
    environment: redact(record.environment),
    verifiedAt: redact(record.verifiedAt),
    executor: typeof record.executor === 'string' ? redact(record.executor) : '记录中的执行者',
    independent: record.independent === true,
    recordedVerdict: record.recordedVerdict,
    checks: array(record.checks).filter(isObject).map(check => ({
      checkId: redact(check.checkId),
      acceptanceIds: array(check.acceptanceIds).map(redact),
      required: array(check.acceptanceIds).some(id => requiredAcceptance.has(id)) || (array(check.acceptanceIds).length === 0 && check.required === true),
      source: redact(check.source),
      operation: redact(check.operation),
      result: check.result,
      reason: redact(check.reason),
    })),
    skipDeclarations: array(record.skipDeclarations).filter(isObject).map(skip => ({
      checkId: redact(skip.checkId),
      source: redact(skip.source),
      reason: redact(skip.reason),
      taskId: redact(skip.taskId),
      artifactVersion: redact(skip.artifactVersion),
      environment: redact(skip.environment),
    })),
    unresolvedFailures: array(record.unresolvedFailures).filter(isObject).map(failure => ({
      checkId: redact(failure.checkId),
      reason: redact(failure.reason),
      firstSeenAt: redact(failure.firstSeenAt),
      lastSeenAt: redact(failure.lastSeenAt),
    })),
    validation: { ok: validation.ok, errors: validation.errors.map(redact), warnings: validation.warnings.map(redact), derivedVerdict: validation.derivedVerdict },
  };
}

function parseMarkdownTable(content, heading) {
  const start = content.indexOf(`## ${heading}`);
  if (start < 0) return [];
  const rest = content.slice(start + heading.length + 3);
  const end = rest.search(/\n##\s+/);
  const block = rest.slice(0, end < 0 ? rest.length : end);
  const rows = block.split(/\r?\n/).filter(line => line.trim().startsWith('|'));
  if (rows.length < 2) return [];
  const parse = line => line.trim().slice(1, -1).split('|').map(value => value.trim().replaceAll('&#124;', '|').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&'));
  return rows.slice(2).filter(line => !/^\|\s*:?-{2,}/.test(line.trim())).map(parse);
}

function latestBy(rows, index) {
  const result = new Map();
  for (const row of rows) if (row[index]) result.set(row[index], row);
  return result;
}

async function listAnchors(projectRoot) {
  const root = path.join(projectRoot, '.nimo', 'tasks');
  const stat = await fs.lstat(root).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!stat) return [];
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail('INVALID_TASK_ROOT', '任务记录路径不是普通目录');
  const entries = await fs.readdir(root, { withFileTypes: true });
  const candidates = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const taskId = entry.name;
    const paths = await taskPaths(projectRoot, taskId);
    const anchor = await readJsonFile(paths.anchor);
    if (anchor === null) continue;
    validateAnchor(anchor, taskId);
    candidates.push(anchor);
  }
  return candidates.sort((left, right) => {
    const leftTime = Date.parse(left.createdAt) || 0;
    const rightTime = Date.parse(right.createdAt) || 0;
    return rightTime - leftTime || left.taskId.localeCompare(right.taskId);
  });
}

async function selectTask(request, projectRoot) {
  if (request.taskId !== undefined) {
    const taskId = requiredText(request.taskId, 'taskId');
    const paths = await taskPaths(projectRoot, taskId);
    const anchor = await readJsonFile(paths.anchor);
    return {
      taskId,
      paths,
      anchor: anchor === null ? null : validateAnchor(anchor, taskId),
      reason: '按指定任务标识选择',
    };
  }
  const anchors = await listAnchors(projectRoot);
  if (anchors.length === 0) {
    return { taskId: null, paths: null, anchor: null, reason: '当前工作区没有任务记录' };
  }
  const anchor = anchors[0];
  return {
    taskId: anchor.taskId,
    paths: await taskPaths(projectRoot, anchor.taskId),
    anchor,
    reason: '按创建时间选择当前工作区最新任务；同一时间按任务标识排序',
  };
}

function inside(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function localReference(projectRoot, location) {
  const target = path.isAbsolute(location) ? path.resolve(location) : path.resolve(projectRoot, location);
  if (!inside(projectRoot, target)) return { safe: false, status: 'UNSAFE_PATH', display: '[项目外路径]' };
  const relative = path.relative(projectRoot, target).replaceAll('\\', '/') || '.';
  let current = projectRoot;
  for (const part of path.relative(projectRoot, target).split(path.sep)) {
    if (!part) continue;
    current = path.join(current, part);
    const stat = await fs.lstat(current).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!stat) return { safe: true, status: 'MISSING', display: relative, target };
    if (stat.isSymbolicLink()) return { safe: false, status: 'SYMLINK_REFUSED', display: relative };
  }
  const stat = await fs.lstat(target).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!stat) return { safe: true, status: 'MISSING', display: relative, target };
  if (!stat.isFile()) return { safe: true, status: 'UNSUPPORTED', display: relative, target, size: stat.size };
  return { safe: true, status: 'PRESENT', display: relative, target, size: stat.size };
}

function isRemote(location) {
  return /^https?:\/\//i.test(location);
}

function unsafeProtocol(location) {
  return !path.isAbsolute(location) && /^[a-z][a-z\d+.-]*:/i.test(location) && !isRemote(location);
}

async function inspectEvidence(projectRoot, record) {
  const result = [];
  for (const check of array(record?.checks).filter(isObject)) {
    for (const evidence of array(check.evidence)) {
      const source = text(evidence?.source, 'unknown');
      const location = text(evidence?.location);
      const item = { checkId: check.checkId, source: redact(source), location: redact(location), referenced: Boolean(source && location), bound: false, supportsClaim: false, status: 'INVALID_REFERENCE', reason: '' };
      if (!source || !location) {
        item.reason = '必须提供证据来源和位置';
        result.push(item);
        continue;
      }
      if (isRemote(location)) {
        item.status = 'REMOTE_UNCHECKED';
        item.reason = '报告不联网读取远程证据';
        result.push(item);
        continue;
      }
      if (unsafeProtocol(location)) {
        item.status = 'UNSAFE_PROTOCOL';
        item.reason = '只允许展示 HTTP 和 HTTPS 链接';
        result.push(item);
        continue;
      }
      const local = await localReference(projectRoot, location);
      item.location = local.display;
      item.status = local.status;
      if (!local.safe) {
        item.reason = '已拒绝项目外路径或经过符号链接的路径';
        result.push(item);
        continue;
      }
      if (local.status === 'MISSING') {
        item.reason = '引用的文件不存在';
        result.push(item);
        continue;
      }
      if (local.status !== 'PRESENT') {
        item.reason = '引用路径不是普通文件';
        result.push(item);
        continue;
      }
      if (local.size > MAX_EVIDENCE_BYTES) {
        item.status = 'TOO_LARGE_TO_CHECK';
        item.reason = `文件超过 ${MAX_EVIDENCE_BYTES} 字节的检查上限`;
        result.push(item);
        continue;
      }
      const actualDigest = await hashFile(local.target);
      const expectedDigest = text(evidence.sha256);
      const expectedVersion = text(evidence.version);
      const recordVersion = text(record.artifactVersion);
      if (expectedDigest && expectedDigest !== actualDigest) {
        item.status = 'CHANGED';
        item.reason = '文件内容摘要与证据记录不一致';
        item.actualSha256 = actualDigest;
        result.push(item);
        continue;
      }
      if (expectedVersion && expectedVersion !== recordVersion && expectedVersion !== text(record.artifactSnapshot?.gitHead)) {
        item.status = 'CHANGED';
        item.reason = '证据版本与被验证产物不一致';
        result.push(item);
        continue;
      }
      if (!expectedDigest) {
        item.status = 'REFERENCED_ONLY';
        item.reason = '仅凭路径或声明的版本无法确认当前内容，需提供内容摘要';
        result.push(item);
        continue;
      }
      item.bound = true;
      item.status = 'BOUND';
      item.reason = '本地文件存在，且内容摘要一致';
      const explicitClaim = evidence.claim === 'machine-result' || evidence.supportsClaim === true;
      if (explicitClaim && text(evidence.summary)) {
        item.status = 'CLAIM_DECLARED';
        item.reason += '；生产者已声明证据支持结论，但报告未独立复核该声明';
      } else {
        item.reason += '；未提供明确的机器结果声明';
      }
      result.push(item);
    }
  }
  return result;
}

function compareSnapshots(recordSnapshot, currentSnapshot) {
  if (!isObject(recordSnapshot) || !isObject(currentSnapshot)) return { status: 'UNKNOWN', reasons: ['产物快照不可用'] };
  if ([recordSnapshot.snapshotStatus, currentSnapshot.snapshotStatus].includes('UNKNOWN')) return { status: 'UNKNOWN', reasons: ['未能完整读取产物快照'] };
  const reasons = [];
  if (recordSnapshot.gitHead && currentSnapshot.gitHead && recordSnapshot.gitHead !== currentSnapshot.gitHead) reasons.push(`Git 提交已从 ${recordSnapshot.gitHead} 变为 ${currentSnapshot.gitHead}`);
  if (recordSnapshot.dirtyHash && currentSnapshot.dirtyHash && recordSnapshot.dirtyHash !== currentSnapshot.dirtyHash) reasons.push('工作区未提交内容的指纹已变化');
  if (recordSnapshot.indexHash && currentSnapshot.indexHash && recordSnapshot.indexHash !== currentSnapshot.indexHash) reasons.push('Git 暂存区已变化');
  for (const [file, recorded] of Object.entries(recordSnapshot.fileHashes ?? {})) {
    const current = currentSnapshot.fileHashes?.[file];
    if (!current || current.sha256 !== recorded.sha256 || current.status !== recorded.status) reasons.push(`产物文件已变化：${file}`);
  }
  if (reasons.length) return { status: 'STALE', reasons };
  const comparable = recordSnapshot.gitHead
    ? Boolean(currentSnapshot.gitHead && recordSnapshot.dirtyHash && currentSnapshot.dirtyHash)
    : Object.values(recordSnapshot.fileHashes ?? {}).length > 0 && Object.values(recordSnapshot.fileHashes).every(file => file.status === 'PRESENT' && file.sha256);
  return comparable ? { status: 'MATCH', reasons: ['记录中的产物快照与当前工作区一致'] } : { status: 'UNKNOWN', reasons: ['没有可比较的产物版本或文件指纹'] };
}

async function applicability(projectRoot, anchor, record, request) {
  if (!record) return { status: 'UNKNOWN', reasons: ['缺少最终验证记录'] };
  const reasons = [];
  if (record.contractRevision !== anchor.contractRevision) reasons.push(`验证记录引用合同修订 ${record.contractRevision}，当前修订为 ${anchor.contractRevision}`);
  if (typeof request.currentArtifactVersion === 'string' && request.currentArtifactVersion !== record.artifactVersion) reasons.push(`记录中的产物版本为 ${record.artifactVersion}，当前为 ${request.currentArtifactVersion}`);
  if (typeof request.environment === 'string' && request.environment !== record.environment) reasons.push(`记录中的环境为 ${record.environment}，当前为 ${request.environment}`);
  const artifactSnapshot = request.currentSnapshot ?? await captureSnapshot(projectRoot, { artifactFiles: Object.keys(record.artifactSnapshot?.fileHashes ?? {}) });
  const snapshot = compareSnapshots(record.artifactSnapshot, artifactSnapshot);
  if (snapshot.status === 'STALE') reasons.push(...snapshot.reasons);
  if (reasons.length) return { status: 'STALE', reasons, observedSnapshot: artifactSnapshot };
  if (snapshot.status === 'UNKNOWN') return { status: 'UNKNOWN', reasons: snapshot.reasons, observedSnapshot: artifactSnapshot };
  if (typeof request.environment !== 'string' || !request.environment.trim()) return { status: 'UNKNOWN', reasons: ['未提供目标环境，不能用历史环境证明当前环境'], observedSnapshot: artifactSnapshot };
  return { status: 'MATCH', reasons: ['合同修订、产物快照和目标环境均一致'], observedSnapshot: artifactSnapshot };
}

function boundaryContains(ref, event) {
  if (Number.isSafeInteger(ref.turnStart) && Number.isSafeInteger(ref.turnEnd) && Number.isSafeInteger(event.turn)) return event.turn >= ref.turnStart && event.turn <= ref.turnEnd;
  if (ref.eventStart && ref.eventEnd && (event.eventId || event.id)) {
    const id = String(event.eventId ?? event.id);
    return id >= String(ref.eventStart) && id <= String(ref.eventEnd);
  }
  if (ref.eventStart && ref.eventEnd && event.timestamp) return String(event.timestamp) >= String(ref.eventStart) && String(event.timestamp) <= String(ref.eventEnd);
  return false;
}

function activity(event) {
  const rawKind = text(event?.kind).toLowerCase();
  return {
    kind: ACTIVITY_KINDS.get(rawKind) ?? 'UNOBSERVED',
    eventId: text(event?.eventId ?? event?.id, 'unknown'),
    turn: Number.isSafeInteger(event?.turn) ? event.turn : undefined,
    timestamp: text(event?.timestamp),
  };
}

async function projectSessions(anchor, projectRoot) {
  const refs = array(anchor?.sessionRefs);
  if (refs.length === 0) return { status: 'UNMAPPED', refs: [], message: '此任务记录未附带明确声明的会话引用' };
  const projected = await Promise.all(refs.map(async ref => {
    const base = { host: ref.host, sessionId: ref.sessionId, basis: ref.basis, boundary: null, activities: [] };
    const hasTurnBoundary = Number.isSafeInteger(ref.turnStart) && Number.isSafeInteger(ref.turnEnd);
    const hasEventBoundary = Boolean(ref.eventStart && ref.eventEnd);
    if (hasTurnBoundary) base.boundary = { type: 'turn', start: ref.turnStart, end: ref.turnEnd };
    else if (hasEventBoundary) base.boundary = { type: 'event', start: ref.eventStart, end: ref.eventEnd };
    if (base.boundary) base.message = `${base.boundary.type === 'turn' ? '轮次' : '事件'} ${base.boundary.start} 至 ${base.boundary.end}，包含两端`;
    if (!base.boundary) {
      base.status = 'DECLARED_UNBOUNDED';
      base.message = '已明确引用会话，但无法确定任务内的事件范围';
      return base;
    }
    if (ref.host !== 'codex') return { ...base, status: 'UNSUPPORTED', message: '第一版仅支持 Codex 会话' };
    const source = await readCodexSource(ref, projectRoot);
    if (source.status !== 'OK') return { ...base, status: source.status, message: source.message };
    const events = source.events;
    let selected;
    if (hasTurnBoundary) {
      if (ref.turnStart > ref.turnEnd || !events.some(event => event.turn === ref.turnStart) || !events.some(event => event.turn === ref.turnEnd)) return { ...base, status: 'INVALID_BOUNDARY', message: '源记录中不存在指定的轮次范围' };
      selected = events.filter(event => boundaryContains(ref, event));
    } else {
      const start = events.findIndex(event => String(event.eventId) === String(ref.eventStart));
      const end = events.findIndex(event => String(event.eventId) === String(ref.eventEnd));
      if (start < 0 || end < start) return { ...base, status: 'INVALID_BOUNDARY', message: '事件端点缺失或起止顺序相反' };
      selected = events.slice(start, end + 1);
    }
    base.activities = selected.filter(event => event.activity).map(activity);
    base.status = base.activities.length ? 'PROJECTED' : 'NO_EVENTS_IN_BOUNDARY';
    if (base.activities.some(item => item.kind === 'UNOBSERVED')) base.message += '；未知事件格式保留为未观测（UNOBSERVED）';
    return base;
  }));
  return { status: 'DECLARED', refs: projected, message: '仅展示明确声明的会话引用' };
}

async function auditSummary(paths, record, contract) {
  if (!paths) return { present: false, status: 'MISSING', extras: [], conflicts: [] };
  const content = await readTextFile(paths.audit);
  if (content === null) return { present: false, status: 'MISSING', extras: [], conflicts: [] };
  const decisions = parseMarkdownTable(content, 'Decisions');
  const harness = parseMarkdownTable(content, 'Harness');
  const artifacts = parseMarkdownTable(content, 'Artifacts');
  const verification = parseMarkdownTable(content, 'Verification');
  const outcomes = parseMarkdownTable(content, 'Outcome');
  const learning = parseMarkdownTable(content, 'Learning');
  const auditChecks = latestBy(verification, 1);
  const conflicts = [];
  const auditTask = content.match(/^- Task ID: (.+)$/m)?.[1]?.trim();
  if (auditTask && auditTask !== paths.taskId) conflicts.push('审计记录的任务标识与所选任务不一致');
  const auditGoal = content.match(/### Goal\r?\n([^\r\n]+)/)?.[1]?.replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  if (auditGoal && contract?.goal && auditGoal !== contract.goal) conflicts.push('审计记录的目标与当前合同不一致');
  const auditAcceptance = parseMarkdownTable(content, 'Contract');
  if (auditAcceptance.length && contract?.acceptance) {
    for (const item of contract.acceptance) {
      if (!auditAcceptance.some(row => row[0] === item.id && row[1] === item.text)) conflicts.push(`审计记录的验收项与当前合同不一致：${item.id}`);
    }
  }
  for (const check of array(record?.checks).filter(isObject)) {
    const auditCheck = auditChecks.get(check.checkId);
    if (auditCheck && auditCheck[6] && auditCheck[6] !== check.result) conflicts.push(`检查 ${check.checkId} 的审计结果为 ${auditCheck[6]}，结构化验证结果为 ${check.result}`);
  }
  const auditVerdict = outcomes.at(-1)?.[2];
  const auditVersion = outcomes.at(-1)?.[3];
  if (auditVersion && record?.artifactVersion && auditVersion !== record.artifactVersion) conflicts.push('审计记录的产物版本与结构化验证记录不一致');
  if (auditVerdict && record?.recordedVerdict && auditVerdict !== record.recordedVerdict) conflicts.push(`审计结论为 ${auditVerdict}，结构化验证结论为 ${record.recordedVerdict}`);
  return {
    present: true,
    status: conflicts.length ? 'CONFLICT' : 'OK',
    format: content.match(/<!--\s*([^>]+)\s*-->/)?.[1] ?? '旧版审计记录',
    trace: {
      host: redact(content.match(/^- Host: (.+)$/m)?.[1] ?? '未知'),
      reference: redact(content.match(/^- Reference: (.+)$/m)?.[1] ?? '未知'),
      observedBoundary: redact(content.match(/^- Observed Boundary: (.+)$/m)?.[1] ?? '未知'),
    },
    extras: {
      decisions: decisions.length,
      harness: harness.length,
      artifacts: artifacts.length,
      verification: verification.length,
      outcomes: outcomes.length,
      learning: learning.length,
    },
    conflicts,
    details: { decisions, harness, learning },
  };
}

function safeLink(location) {
  if (isRemote(location)) return `<a href="${html(location)}" rel="noreferrer">${html(location)}</a>`;
  return `<code>${html(location)}</code>`;
}

function renderChecks(report) {
  const checks = array(report.verification?.checks);
  if (!checks.length) return '<p>暂无结构化检查记录。</p>';
  const rows = checks.map(check => {
    const evidence = array(report.evidence).filter(item => item.checkId === check.checkId).map(item => `${html(statusLabel(item.status))}${item.bound ? '（已绑定）' : ''}${item.supportsClaim ? '（支持结论）' : ''}`).join('<br>') || '无';
    return `<tr><td>${html(check.checkId)}<br>${html(check.operation)}</td><td>${html(array(check.acceptanceIds).join(', ') || '关键不变量')}</td><td>${html(statusLabel(check.result))}</td><td>${check.required ? '是' : '否'}</td><td>${evidence}</td><td>${html(check.reason || '')}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>检查项</th><th>验收项</th><th>结果</th><th>必需</th><th>证据</th><th>说明</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderEvidence(report) {
  const evidence = array(report.evidence);
  if (!evidence.length) return '<p>暂无证据引用。</p>';
  const rows = evidence.map(item => `<tr><td>${html(item.checkId)}</td><td>${html(item.source)}</td><td>${safeLink(item.location)}</td><td>${html(statusLabel(item.status))}</td><td>${item.referenced ? '是' : '否'}</td><td>${item.bound ? '是' : '否'}</td><td>${item.supportsClaim ? '是' : '否'}</td><td>${html(item.reason)}</td></tr>`).join('');
  return `<table><thead><tr><th>检查项</th><th>来源</th><th>位置</th><th>状态</th><th>引用完整</th><th>内容已绑定</th><th>支持结论</th><th>说明</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function renderSessions(report) {
  const refs = array(report.sessions?.refs);
  if (!refs.length) return `<p>${html(report.sessions?.message || '暂无会话引用。')}</p>`;
  const rows = refs.map(ref => `<tr><td>${html(ref.host)}</td><td>${html(ref.sessionId)}</td><td>${html(ref.basis === 'declared' ? '明确声明' : ref.basis)}</td><td>${html(statusLabel(ref.status))}</td><td>${html(ref.message || '')}</td><td>${array(ref.activities).map(item => html(`${({ 'inspect/read': '检查与读取', change: '修改', 'execute/check': '执行与检查', 'git/delivery': '版本管理与交付', UNOBSERVED: '未观测' })[item.kind] || item.kind}：${item.eventId}`)).join('<br>')}</td></tr>`).join('');
  return `<table><thead><tr><th>宿主</th><th>会话</th><th>关联依据</th><th>状态</th><th>观测范围</th><th>已观测活动</th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderHtml(report) {
  const contract = report.contract;
  const acceptance = array(contract?.acceptance).map(item => `<tr><td>${html(item.id)}</td><td>${html(item.text)}</td><td>${item.required ? '是' : '否'}</td></tr>`).join('');
  const audit = report.audit;
  const auditText = audit.present
    ? `<p>格式：<code>${html(audit.format)}</code>。决策数：${audit.extras.decisions}。执行工具记录数：${audit.extras.harness}。产物数：${audit.extras.artifacts}。验证记录数：${audit.extras.verification}。经验记录数：${audit.extras.learning}.</p>${audit.conflicts.length ? `<ul>${audit.conflicts.map(item => `<li>${html(item)}</li>`).join('')}</ul>` : '<p>未发现审计记录冲突。</p>'}`
    : '<p>暂无审计记录。任务合同和验证信息仍可查看。</p>';
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Nimo Inspector: ${html(report.taskId || '缺少任务')}</title>
<style>body{font:15px/1.5 system-ui,sans-serif;max-width:1180px;margin:2rem auto;padding:0 1rem;color:#1f2937}h1{margin-bottom:.25rem}h2{margin-top:2rem;border-bottom:1px solid #d1d5db;padding-bottom:.25rem}table{border-collapse:collapse;width:100%;margin:.75rem 0 1.25rem}th,td{border:1px solid #d1d5db;padding:.45rem;text-align:left;vertical-align:top}th{background:#f3f4f6}code{background:#f3f4f6;padding:.1rem .25rem} .status{font-weight:700} .stale{color:#b91c1c}.match{color:#047857}.unknown{color:#92400e}small{color:#6b7280}</style></head>
<body><h1>Nimo 任务检查报告</h1><p>任务：<code>${html(report.taskId || '缺失')}</code>。选择依据：${html(report.selection.reason)}.</p>
<p>生成时间：<code>${html(report.generatedAt)}</code>。这是离线快照，不会自动更新。</p>
<h2>历史结论</h2><p>记录结论：<span class="status">${html(statusLabel(report.verification?.recordedVerdict || 'MISSING'))}</span>。当前适用性：<span class="status ${html((report.applicability?.status || '').toLowerCase())}">${html(statusLabel(report.applicability?.status || 'UNKNOWN'))}</span>.</p><p>${html(array(report.applicability?.reasons).join(' ') || '未记录适用性说明。')}</p>
<h2>当前结论</h2><p class="status">${html(statusLabel(report.currentVerdict || 'UNVERIFIED'))}</p><ul>${array(report.currentReasons).map(reason => `<li>${html(reason)}</li>`).join('')}</ul>
<p>产物版本：<code>${html(report.verification?.artifactVersion || '未知')}</code>。记录环境：${html(report.verification?.environment || '未知')}。验证时间：${html(report.verification?.verifiedAt || '未知')}.</p>
<p>观测时的 Git 提交：<code>${html(report.applicability?.observedSnapshot?.gitHead || '不可用')}</code>。未提交内容指纹：<code>${html(report.applicability?.observedSnapshot?.dirtyHash || '不可用')}</code>.</p>
<h2>合同修订 ${html(contract?.revision ?? '未知')}</h2><p>${html(contract?.goal || '缺少任务记录。')}</p><p>范围：${html(array(contract?.scope).join(', '))}。验证引用的合同修订：${html(report.verification?.contractRevision ?? '未知')}.</p><table><thead><tr><th>验收项</th><th>要求</th><th>必需</th></tr></thead><tbody>${acceptance || '<tr><td colspan="3">暂无任务合同。</td></tr>'}</tbody></table>
<h2>验证检查</h2>${renderChecks(report)}
<h2>用户跳过声明</h2><ul>${array(report.verification?.skipDeclarations).map(skip => `<li>${html(skip.checkId)}: ${html(skip.reason)}。来源：${html(skip.source)}。任务：${html(skip.taskId)}。产物版本：${html(skip.artifactVersion)}。环境：${html(skip.environment)}.</li>`).join('') || '<li>无</li>'}</ul>
<h2>证据状态</h2>${renderEvidence(report)}
<h2>Codex 会话</h2>${renderSessions(report)}
<h2>补充审计记录</h2>${auditText}
${audit.present ? `<p>执行记录宿主：${html(audit.trace?.host)}。引用：${html(audit.trace?.reference)}。观测范围：${html(audit.trace?.observedBoundary)}.</p>` : ''}
${audit.present ? Object.entries(audit.details ?? {}).map(([kind, rows]) => `<h3>${html(({ decisions: '关键决策', harness: '执行工具', learning: '经验记录' })[kind] || kind)}</h3><ul>${rows.map(row => `<li>${row.map(html).join(' | ')}</li>`).join('')}</ul>`).join('') : ''}
<h2>观测边界</h2><p>${html(report.sessions?.message || '未观测到会话源。')}</p><small>本报告读取已有的结构化记录与元数据，不重跑验证，不复制完整会话、工具载荷或内部推理。</small>
</body></html>`;
}

export async function inspect(request) {
  const projectRoot = absoluteProjectRoot(request.projectRoot);
  const selection = await selectTask(request, projectRoot);
  const generatedAt = text(request.generatedAt, new Date().toISOString());
  let report = {
    schemaVersion: 1,
    generatedAt,
    projectRoot: '[project root]',
    taskId: selection.taskId,
    selection: { reason: selection.reason },
    status: selection.anchor ? 'OK' : 'MISSING_ANCHOR',
    contract: null,
    verification: null,
    applicability: { status: 'UNKNOWN', reasons: ['缺少任务记录'] },
    evidence: [],
    sessions: { status: 'UNMAPPED', refs: [], message: '缺少任务记录' },
    audit: { present: false, status: 'MISSING', extras: {}, conflicts: [] },
  };
  if (selection.anchor) {
    const contract = currentContract(selection.anchor);
    const record = selection.paths ? await loadVerification(projectRoot, selection.taskId) : null;
    const validation = record ? evaluateRecord(record, selection.anchor) : { ok: false, errors: ['缺少最终验证记录'], warnings: [], derivedVerdict: 'UNVERIFIED' };
    report.contract = projectContract(contract);
    const recordContract = selection.anchor.contractRevisions.find(item => item.revision === record?.contractRevision) ?? contract;
    report.verification = projectVerification(record, validation, recordContract);
    report.evidence = await inspectEvidence(projectRoot, record);
    report.applicability = await applicability(projectRoot, selection.anchor, record, request);
    report.sessions = await projectSessions(selection.anchor, projectRoot);
    try { report.audit = await auditSummary(selection.paths, record, contract); }
    catch { report.audit = { present: false, status: 'UNAVAILABLE', extras: {}, conflicts: [] }; }
    if (!validation.ok) report.status = ['VERIFIED', 'PASS_WITH_SKIPS'].includes(record?.recordedVerdict) ? 'INVALID_RECORD' : 'UNVERIFIED';
    const evidenceMissing = array(record?.checks).filter(isObject).filter(check => check.result === 'PASS').some(check => !report.evidence.some(item => item.checkId === check.checkId && item.bound));
    report.currentVerdict = report.applicability.status === 'MATCH' && validation.ok && !evidenceMissing ? record.recordedVerdict : 'UNVERIFIED';
    report.currentReasons = [...validation.errors, ...(evidenceMissing ? ['至少一项通过检查缺少当前可访问且内容已绑定的证据'] : [])];
  }
  const target = await outputPath(projectRoot, request.output, `.nimo/inspector/${selection.taskId || '缺失'}.html`);
  const reportRoot = path.join(projectRoot, '.nimo', 'inspector');
  if (!inside(reportRoot, target) || path.extname(target).toLowerCase() !== '.html') fail('INVALID_REPORT_OUTPUT', '报告必须输出为 .nimo/inspector 内的 HTML 文件');
  report.htmlPath = target;
  await atomicWrite(target, renderHtml(report));
  return { status: report.status === 'OK' ? 'OK' : 'WARN', changed: true, data: report, diagnostics: report.status === 'OK' ? [] : [{ code: report.status, message: '报告已生成，但存在缺失或无效数据', severity: 'WARN' }] };
}

export async function run(request) {
  try {
    return await inspect(request);
  } catch (error) {
    return { status: 'ERROR', changed: false, data: null, diagnostics: [serializeError(error)], errorCode: error.code ?? 'UNEXPECTED_ERROR' };
  }
}

async function cli() {
  const index = process.argv.indexOf('--input');
  if (index < 0 || !process.argv[index + 1]) {
    process.stdout.write(JSON.stringify({ status: 'ERROR', changed: false, data: null, diagnostics: [{ code: 'USAGE', message: '请使用 --input <request.json> 指定请求文件' }] }) + '\n');
    process.exitCode = 2;
    return;
  }
  const request = JSON.parse(await fs.readFile(path.resolve(process.argv[index + 1]), 'utf8'));
  const result = await run(request);
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === 'OK' || result.status === 'WARN' ? 0 : 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await cli();
