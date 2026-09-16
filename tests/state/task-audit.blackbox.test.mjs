import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const scriptDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../../skills/nimo-mode/scripts');
const { run: audit } = await import(pathToFileURL(join(scriptDirectory, 'audit.mjs')).href);

async function fixture(label) {
  return await mkdtemp(join(tmpdir(), `nimo-audit-${label}-`));
}

function base(root, overrides = {}) {
  return {
    projectRoot: root,
    taskId: 'feature-refund',
    ...overrides,
  };
}

async function init(root, overrides = {}) {
  return await audit(base(root, {
    operation: 'init',
    title: '订单退款',
    goal: '支持用户申请订单退款',
    scope: ['order-service', 'order-web'],
    acceptance: [
      { id: 'AC-01', text: '用户可以申请退款' },
      { id: 'AC-02', text: '已退款订单不能再次退款' },
    ],
    playbook: 'feature',
    nimoRevision: 'nimo@abc123',
    trace: { host: 'codex', ref: 'session-1', observedBoundary: '当前任务执行、验证与本地工具调用可观察' },
    time: '2026-09-17T00:00:00+08:00',
    ...overrides,
  }));
}

async function append(root, kind, values) {
  return await audit(base(root, { operation: 'append', kind, ...values }));
}

test('audit init creates one task audit and is idempotent', async () => {
  const root = await fixture('init');
  try {
    const first = await init(root);
    assert.equal(first.status, 'OK');
    assert.equal(first.changed, true);
    const second = await init(root);
    assert.equal(second.status, 'OK');
    assert.equal(second.changed, false);
    const content = await readFile(join(root, '.nimo/tasks/feature-refund/audit.md'), 'utf8');
    assert.match(content, /nimo-task-audit:v1/);
    assert.match(content, /\| AC-01 \| 用户可以申请退款 \|/);
    assert.match(content, /\| feature \| route:feature \|/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('audit append records sparse decisions and verification history safely', async () => {
  const root = await fixture('append');
  try {
    await init(root);
    const decision = await append(root, 'decision', {
      time: '2026-09-17T00:10:00+08:00',
      phase: 'design',
      decision: '退款进入订单状态机 | 保持单一生命周期',
      reason: '现有生命周期已集中管理',
      evidence: 'src/order/state.ts',
      result: 'accepted',
    });
    assert.equal(decision.status, 'OK');
    assert.equal(decision.data.id, 'D1');
    const second = await append(root, 'decision', {
      time: '2026-09-17T00:11:00+08:00',
      phase: 'verification',
      decision: 'API 与 UI 共同覆盖验收',
      reason: 'AC-02 是接口负例，页面结果需要真实 UI',
      evidence: 'AC-01,AC-02',
      result: 'accepted',
    });
    assert.equal(second.data.id, 'D2');
    await append(root, 'verification', {
      time: '2026-09-17T00:20:00+08:00',
      check: 'AC-01', source: 'AC-01', required: true,
      verification: '真实退款 API', evidence: 'evidence/refund.txt', result: 'FAIL',
    });
    await append(root, 'verification', {
      time: '2026-09-17T00:30:00+08:00',
      check: 'AC-01', source: 'AC-01', required: true,
      verification: '真实退款 API', evidence: 'evidence/refund-fixed.txt', result: 'PASS',
    });
    const content = await readFile(join(root, '.nimo/tasks/feature-refund/audit.md'), 'utf8');
    assert.match(content, /D1 \| design/);
    assert.match(content, /状态机 &#124; 保持单一生命周期/);
    assert.equal((content.match(/\| AC-01 \| AC-01 \| yes \|/g) ?? []).length, 2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('audit validate fails closed when acceptance evidence is missing', async () => {
  const root = await fixture('missing');
  try {
    await init(root);
    await append(root, 'artifact', { artifact: '退款实现', reference: 'commit:abc123' });
    await append(root, 'verification', {
      check: 'AC-01', source: 'AC-01', required: true,
      verification: '退款 API', evidence: 'evidence/refund.txt', result: 'PASS',
    });
    await append(root, 'outcome', {
      execution: 'running', verdict: 'VERIFIED', artifactVersion: 'commit:abc123', open: 'none', next: 'open PR',
    });
    const result = await audit(base(root, { operation: 'validate', final: true, expectedArtifactVersion: 'commit:abc123' }));
    assert.equal(result.status, 'BLOCK');
    assert.ok(result.diagnostics.some(item => item.code === 'MISSING_ACCEPTANCE_VERIFICATION' && /AC-02/.test(item.message)));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('audit full chain validates a verified task and preserves retry history', async () => {
  const root = await fixture('full');
  try {
    await init(root);
    await append(root, 'harness', { name: 'nimo-architect', evidence: 'D1' });
    await append(root, 'decision', {
      phase: 'design', decision: '退款状态进入现有订单状态机', reason: '避免非法状态组合', evidence: 'src/order/state.ts', result: 'accepted',
    });
    await append(root, 'artifact', { id: 'A1', artifact: '退款 API 与页面', reference: 'commit:abc123' });
    await append(root, 'verification', {
      check: 'AC-01', source: 'AC-01', required: true,
      verification: '真实退款 API', evidence: 'evidence/ac01.txt', result: 'PASS',
    });
    await append(root, 'verification', {
      check: 'AC-02', source: 'AC-02', required: true,
      verification: '重复退款负例', evidence: 'evidence/ac02.txt', result: 'PASS',
    });
    await append(root, 'verification', {
      check: 'INV-01', source: '订单状态不变量', required: true,
      verification: '退款后状态读回', evidence: 'evidence/inv01.txt', result: 'PASS',
    });
    await append(root, 'learning', {
      observation: '退款状态路径此前没有验证资产', candidate: '后续同类状态变更复用退款状态驱动', status: 'candidate',
    });
    await append(root, 'outcome', {
      execution: 'running', verdict: 'VERIFIED', artifactVersion: 'commit:abc123', open: 'none', next: 'open PR',
    });
    const result = await audit(base(root, {
      operation: 'validate', final: true, expectedArtifactVersion: 'commit:abc123', expectedVerdict: 'VERIFIED',
    }));
    assert.equal(result.status, 'OK');
    assert.equal(result.data.acceptanceCount, 2);
    assert.equal(result.data.decisionCount, 1);
    assert.equal(result.data.verificationCount, 3);
    assert.deepEqual(result.data.currentOutcome, { execution: 'running', verdict: 'VERIFIED', artifactVersion: 'commit:abc123' });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('audit validate allows missing host trace only as an explicit warning', async () => {
  const root = await fixture('trace');
  try {
    await init(root, { trace: { host: 'unknown-host', ref: 'UNAVAILABLE', observedBoundary: '仅当前产物和本地验证可观察' } });
    const result = await audit(base(root, { operation: 'validate' }));
    assert.equal(result.status, 'WARN');
    assert.ok(result.diagnostics.some(item => item.code === 'TRACE_UNAVAILABLE'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('audit validation blocks verification shape downgrade across retries', async () => {
  const root = await fixture('shape');
  try {
    await init(root);
    await append(root, 'verification', {
      check: 'AC-01', source: 'AC-01', required: true, verification: '真实退款 API', evidence: 'evidence/ac01-fail.txt', result: 'FAIL',
    });
    await append(root, 'verification', {
      check: 'AC-01', source: 'AC-01', required: false, verification: '真实退款 API', evidence: 'evidence/ac01-skip.txt', result: 'NOT_RUN',
    });
    const result = await audit(base(root, { operation: 'validate' }));
    assert.equal(result.status, 'BLOCK');
    assert.ok(result.diagnostics.some(item => item.code === 'CHECK_SHAPE_CHANGED'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('audit init blocks silent reuse when the task contract boundary changes', async () => {
  const root = await fixture('contract');
  try {
    await init(root);
    const result = await init(root, {
      acceptance: [
        { id: 'AC-01', text: '用户可以申请退款' },
        { id: 'AC-02', text: '已退款订单不能再次退款' },
        { id: 'AC-03', text: '页面显示退款状态' },
      ],
    });
    assert.equal(result.status, 'BLOCK');
    assert.ok(result.diagnostics.some(item => item.code === 'AUDIT_CONTRACT_MISMATCH'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('audit validate blocks direct contract tampering after initialization', async () => {
  const root = await fixture('tamper');
  try {
    await init(root);
    const file = join(root, '.nimo/tasks/feature-refund/audit.md');
    const content = await readFile(file, 'utf8');
    const { writeFile } = await import('node:fs/promises');
    await writeFile(file, content.replace('已退款订单不能再次退款', '已退款订单允许再次退款'));
    const result = await audit(base(root, { operation: 'validate' }));
    assert.equal(result.status, 'BLOCK');
    assert.ok(result.diagnostics.some(item => item.code === 'CONTRACT_HASH_MISMATCH'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
