import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../../', import.meta.url));
const createPath = 'skills/nimo-verification-create/SKILL.md';
const protocolPath = 'skills/nimo-verification-create/references/performance-testing.md';
const examplePath = 'skills/nimo-verification-create/references/performance-case-example.md';
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('full coverage and performance permission remain separate decisions', () => {
  const create = read(createPath);
  assert.match(create, /补全量场景/);
  assert.match(create, /不能用 3–5 条代表路径宣称全量完成/);
  assert.match(create, /“补全测试”“全量验收”不构成性能授权/);
  assert.match(create, /未确认的性能建议不进入必要验收项/);
  assert.match(create, /记录授权来源与场景，不重复询问/);
  assert.match(create, /没有性能授权时，不加载上述测量协议/);
});

test('construction routes to optimization only within scope and returns without recursion', () => {
  const create = read(createPath);
  assert.match(create, /发现慢不自动修改产品/);
  assert.match(create, /只补资产并返回原调用方，不再次路由同一优化请求/);
  for (const name of ['perf-issue', 'hillclimb']) {
    assert.ok(create.includes(`../nimo-mode/playbooks/${name}.md`));
    const playbook = read(`skills/nimo-mode/playbooks/${name}.md`);
    assert.ok(playbook.includes('../../nimo-verification-create/references/performance-testing.md'));
    assert.ok(playbook.includes('../../nimo-verification-create/SKILL.md#0-确定建设范围与性能授权'));
  }
  const verify = read('skills/nimo-verify/SKILL.md');
  assert.match(verify, /已确认且与本次相关的性能场景不得静默省略/);
  assert.match(verify, /缺少协议或资产时返回 Create，已有口径漂移时返回 Maintain/);
  const maintain = read('skills/nimo-verification-maintain/SKILL.md');
  assert.match(maintain, /不把同一无效资产反复交回 Verify/);
  assert.match(maintain, /不拿旧阈值判新环境通过/);
  const hillclimb = read('skills/nimo-mode/playbooks/hillclimb.md');
  assert.match(hillclimb, /最低尝试次数仅在用户已约定时适用/);
  assert.match(hillclimb, /预算耗尽或用户停止优先于最低轮数/);
});

test('measurement rules reject false gains and implicit threshold updates', () => {
  const protocol = read(protocolPath);
  assert.match(protocol, /不编造 A\/B 对比或改善百分比/);
  assert.match(protocol, /不能宣称性能达标/);
  assert.match(protocol, /保留超时、错误和失败样本及顺序/);
  assert.match(protocol, /检查只读；更新阈值单独进行/);
  assert.match(protocol, /旧基线不再可比/);
  assert.match(protocol, /性能改善但护栏失败时仍不能通过/);
  assert.match(protocol, /代理变好但用户耗时未改善，不宣称提速/);
});

test('shared references resolve and example preserves the four-section feature contract', () => {
  const files = [createPath, protocolPath, examplePath,
    'skills/nimo-verification-maintain/SKILL.md', 'skills/nimo-verify/SKILL.md',
    'skills/nimo-mode/playbooks/perf-issue.md', 'skills/nimo-mode/playbooks/hillclimb.md'];
  for (const file of files) {
    for (const match of read(file).matchAll(/\[[^\]]+\]\(([^\s)]+)\)/g)) {
      const href = match[1];
      if (/^https?:/.test(href)) continue;
      const [target, anchor] = href.split('#');
      const resolved = path.resolve(root, path.dirname(file), target);
      assert.ok(fs.existsSync(resolved), `${file}: missing ${href}`);
      if (anchor === '0-确定建设范围与性能授权') {
        assert.match(fs.readFileSync(resolved, 'utf8'), /^## 0\. 确定建设范围与性能授权$/m);
      }
    }
  }
  assert.deepEqual([...read(examplePath).matchAll(/^## (.+)$/gm)].map(match => match[1].trim()),
    ['子功能', '用户视角入口', '用 Playwright 驱动', '陷阱']);
});
