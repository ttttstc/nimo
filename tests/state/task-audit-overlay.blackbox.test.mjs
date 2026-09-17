import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import test from 'node:test';

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const script = resolve(testsDirectory, '../../skills/nimo-show-me-your-work/scripts/audit.mjs');
const { run: audit } = await import(pathToFileURL(script).href);

async function fixture(label) {
  return mkdtemp(join(tmpdir(), `nimo-audit-${label}-`));
}

function base(root, overrides = {}) {
  return {
    projectRoot: root,
    taskId: 'feature-refund',
    ...overrides,
  };
}

async function init(root, overrides = {}) {
  return audit(base(root, {
    operation: 'init',
    title: '订单退款',
    goal: '支持用户申请订单退款',
    scope: ['order-service', 'order-web'],
    acceptance: [
      { id: 'AC-01', text: '用户可以申请退款' },
      { id: 'AC-02', text: '已退款订单不能再次退款' },
    ],
    nimoRevision: 'nimo@overlay-test',
    trace: { host: 'test-host', ref: 'session-1', observedBoundary: '当前审计执行与测试工具调用可观察' },
    time: '2026-09-17T00:00:00+08:00',
    ...overrides,
  }));
}

async function append(root, kind, values) {
  return audit(base(root, { operation: 'append', kind, ...values }));
}

async function closeVerified(root) {
  await append(root, 'artifact', {
    time: '2026-09-17T00:20:00+08:00', artifact: '退款实现', reference: 'commit:abc123', version: 'abc123',
  });
  await append(root, 'verification', {
    time: '2026-09-17T00:21:00+08:00', check: 'AC-01', source: 'AC-01', required: true,
    verification: '退款 API', evidence: 'evidence/refund.txt', result: 'PASS',
  });
  await append(root, 'verification', {
    time: '2026-09-17T00:22:00+08:00', check: 'AC-02', source: 'AC-02', required: true,
    verification: '重复退款 API', evidence: 'evidence/retry.txt', result: 'PASS',
  });
  await append(root, 'outcome', {
    time: '2026-09-17T00:23:00+08:00', execution: 'delivered', verdict: 'VERIFIED',
    artifactVersion: 'abc123', open: 'none', next: 'none',
  });
}

test('init creates one audit and is idempotent for the same contract', async () => {
  const root = await fixture('init');
  try {
    const first = await init(root);
    const second = await init(root);
    assert.equal(first.status, 'OK');
    assert.equal(first.changed, true);
    assert.equal(second.status, 'OK');
    assert.equal(second.changed, false);
    const content = await readFile(join(root, '.nimo/tasks/feature-refund/audit.md'), 'utf8');
    assert.match(content, /nimo-task-audit:v1/);
    assert.match(content, /nimo-show-me-your-work/);
    assert.match(content, /\| AC-01 \| 用户可以申请退款 \|/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('same task id cannot silently adopt a different contract boundary', async () => {
  const root = await fixture('contract');
  try {
    await init(root);
    const result = await init(root, {
      acceptance: [
        { id: 'AC-01', text: '用户可以申请退款' },
        { id: 'AC-03', text: '退款失败可重试' },
      ],
    });
    assert.equal(result.status, 'ERROR');
    assert.equal(result.errorCode, 'AUDIT_CONTRACT_MISMATCH');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('audited run records sparse decisions and closes with version-bound evidence', async () => {
  const root = await fixture('full');
  try {
    await init(root);
    const decision = await append(root, 'decision', {
      time: '2026-09-17T00:10:00+08:00', phase: 'design',
      decision: '退款进入订单状态机', reason: '现有订单生命周期统一由状态机管理',
      evidence: 'src/order/state.ts', result: 'accepted',
    });
    assert.equal(decision.status, 'OK');
    assert.equal(decision.data.id, 'D1');
    await closeVerified(root);
    const result = await audit(base(root, {
      operation: 'validate', final: true, expectedVerdict: 'VERIFIED', expectedArtifactVersion: 'abc123',
    }));
    assert.equal(result.status, 'OK', result.errors?.join('\n'));
    assert.equal(result.data.verdict, 'VERIFIED');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('final validation blocks when one acceptance has no required verification', async () => {
  const root = await fixture('missing');
  try {
    await init(root);
    await append(root, 'artifact', { artifact: '退款实现', reference: 'commit:abc123', version: 'abc123' });
    await append(root, 'verification', {
      check: 'AC-01', source: 'AC-01', required: true, verification: '退款 API', evidence: 'evidence/refund.txt', result: 'PASS',
    });
    await append(root, 'outcome', {
      execution: 'delivered', verdict: 'VERIFIED', artifactVersion: 'abc123', open: 'none', next: 'none',
    });
    const result = await audit(base(root, { operation: 'validate', final: true }));
    assert.equal(result.status, 'BLOCK');
    assert.ok(result.errors.some(error => error.includes('AC-02')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('verification retries cannot change source or requiredness to evade history', async () => {
  const root = await fixture('shape');
  try {
    await init(root);
    await append(root, 'verification', {
      check: 'AC-01', source: 'AC-01', required: true, verification: '退款 API', evidence: 'evidence/fail.txt', result: 'FAIL',
    });
    const downgraded = await append(root, 'verification', {
      check: 'AC-01', source: 'AC-01', required: false, verification: '退款 API', evidence: 'evidence/skip.txt', result: 'NOT_RUN',
    });
    assert.equal(downgraded.status, 'ERROR');
    assert.equal(downgraded.errorCode, 'CHECK_REQUIREDNESS_CHANGED');
    const retargeted = await append(root, 'verification', {
      check: 'AC-01', source: 'other', required: true, verification: '退款 API', evidence: 'evidence/other.txt', result: 'PASS',
    });
    assert.equal(retargeted.status, 'ERROR');
    assert.equal(retargeted.errorCode, 'CHECK_SOURCE_CHANGED');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('validate detects manual contract tampering', async () => {
  const root = await fixture('tamper');
  try {
    await init(root);
    const file = join(root, '.nimo/tasks/feature-refund/audit.md');
    const content = await readFile(file, 'utf8');
    await writeFile(file, content.replace('用户可以申请退款', '管理员可以退款'), 'utf8');
    const result = await audit(base(root, { operation: 'validate' }));
    assert.equal(result.status, 'BLOCK');
    assert.ok(result.errors.some(error => error.includes('Contract Hash')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('missing host trace is an explicit warning, not fabricated observation', async () => {
  const root = await fixture('trace');
  try {
    await init(root, { trace: { host: 'test-host', ref: 'UNAVAILABLE', observedBoundary: '仅本地 Artifact 与 Verification 可观察' } });
    const result = await audit(base(root, { operation: 'validate' }));
    assert.equal(result.status, 'OK');
    assert.ok(result.warnings.some(warning => warning.includes('Host Trace is unavailable')));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('learning stays candidate in v1', async () => {
  const root = await fixture('learning');
  try {
    await init(root);
    const accepted = await append(root, 'learning', {
      observation: '验收资产经常遗漏', candidate: '在审计层增加重复模式分析', status: 'candidate',
    });
    assert.equal(accepted.status, 'OK');
    const promoted = await append(root, 'learning', {
      observation: '验收资产经常遗漏', candidate: '自动修改 Feature', status: 'accepted',
    });
    assert.equal(promoted.status, 'ERROR');
    assert.equal(promoted.errorCode, 'INVALID_LEARNING_STATUS');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
