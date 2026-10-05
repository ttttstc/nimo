import assert from 'node:assert/strict';
import test from 'node:test';
import { layoutComponentGraph, layoutGraph, projectComponentGraph, projectComponentHighlight, projectOverviewGraph, projectSceneGraph, projectStepHighlight, zoomAtPoint } from '../../skills/nimo-how/scripts/graph.mjs';

function graphModel() {
  const nodes = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id, index) => ({
    id, title: id === 'd' ? '实体名称过长'.repeat(8) : `实体 ${id}`, kind: 'function',
    groupId: ['app', 'core', 'store', 'app', 'core', 'batch', 'telemetry'][index], description: '测试实体。', certainty: 'unknown', sources: [],
  }));
  return {
    id: 'graph-fixture', title: '图布局', groups: [{ id: 'app', title: '应用' }, { id: 'core', title: '核心' }, { id: 'store', title: '存储' }, { id: 'batch', title: '批处理' }, { id: 'telemetry', title: '遥测' }], nodes,
    edges: [
      { id: 'ab', source: 'a', target: 'b', label: '调用', kind: 'call', certainty: 'confirmed' },
      { id: 'ba', source: 'b', target: 'a', label: '返回', kind: 'async', certainty: 'inferred' },
      { id: 'loop', source: 'c', target: 'c', label: '递归', kind: 'call' },
      { id: 'hub-1', source: 'a', target: 'd', label: '写入RuntimeTask状态并保存完整执行结果', kind: 'data' },
      { id: 'hub-2', source: 'a', target: 'd', label: '刷新', kind: 'async' },
      { id: 'outside', source: 'e', target: 'c', label: '未关联', kind: 'call' },
      { id: 'cross-row-1', source: 'a', target: 'g', label: '跨行写入', kind: 'data' },
      { id: 'cross-row-2', source: 'e', target: 'g', label: '跨行通知', kind: 'async' },
    ],
  };
}

function componentModel() {
  const model = graphModel();
  model.nodes.find((node) => node.id === 'a').certainty = 'confirmed';
  model.nodes.find((node) => node.id === 'd').certainty = 'inferred';
  model.nodes.push({ id: 'orphan', title: '未归属实体', kind: 'note', description: '归属待明确。', certainty: 'unknown', sources: [] });
  model.edges.find((edge) => edge.id === 'hub-1').certainty = 'confirmed';
  model.edges.push(
    { id: 'hub-3', source: 'a', target: 'd', label: '保存结果', kind: 'data', certainty: 'confirmed' },
    { id: 'unmapped', source: 'orphan', target: 'a', label: '待映射', kind: 'call', certainty: 'unknown' },
    { id: 'reverse', source: 'c', target: 'e', label: '通知', kind: 'call', certainty: 'unknown' },
  );
  model.overview = { components: [
    { id: 'web', title: '网页', description: '接收用户请求。', nodeIds: ['a', 'b'] },
    { id: 'runner', title: 'Go执行器', description: '执行任务。', nodeIds: ['c', 'd'] },
    { id: 'db', title: '数据库', description: '保存任务状态。', nodeIds: ['e', 'f'] },
    { id: 'external', title: '外部服务', description: '响应外部请求。', nodeIds: ['g'] },
  ] };
  return model;
}

function sevenComponentModel() {
  const components = [
    ['browser', '浏览器'], ['hub', 'Agent Hub服务端'], ['runner', 'Go Runner进程'],
    ['agent-cli', 'Agent CLI子进程'], ['database', '数据库持久化'],
    ['artifact-storage', '技能包文件存储'], ['external-services', '外部服务'],
  ].map(([id, title]) => ({ id, title, description: `${title}职责。`, nodeIds: [`${id}-impl`] }));
  const nodes = components.map((component) => ({
    id: component.nodeIds[0], title: `${component.title}入口`, kind: 'function', description: component.description,
    certainty: 'confirmed', sources: [],
  }));
  const edges = [];
  const addEdges = (source, target, kind, labels) => labels.forEach((label, index) => edges.push({
    id: `${source}-${target}-${kind}-${index + 1}`,
    source: `${source}-impl`, target: `${target}-impl`, kind, label, certainty: 'confirmed',
  }));
  addEdges('browser', 'hub', 'call', ['POST']);
  addEdges('hub', 'database', 'data', Array.from({ length: 16 }, (_, index) => index % 2 ? `读取状态${index}` : `写入状态${index}`));
  addEdges('database', 'hub', 'data', ['读取任务', '读取状态', '读取结果']);
  addEdges('hub', 'runner', 'async', ['推送任务']);
  addEdges('runner', 'hub', 'async', ['回报进度', '回报完成']);
  addEdges('hub', 'artifact-storage', 'data', ['写入ZIP']);
  addEdges('hub', 'external-services', 'call', ['发送通知', '请求身份', '调用模型']);
  addEdges('external-services', 'hub', 'data', ['返回结果']);
  addEdges('runner', 'agent-cli', 'call', ['启动CLI', '传入参数']);
  return { id: 'seven-components', title: '七组件', nodes, edges, journeys: [], groups: [], overview: { components } };
}

function overlaps(a, b, gap = 4) {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x
    && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

function segmentTouchesRect(a, b, rect) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let min = 0;
  let max = 1;
  for (const [p, q] of [[-dx, a.x - rect.x], [dx, rect.x + rect.width - a.x], [-dy, a.y - rect.y], [dy, rect.y + rect.height - a.y]]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const ratio = q / p;
    if (p < 0) min = Math.max(min, ratio);
    else max = Math.min(max, ratio);
    if (min > max) return false;
  }
  return true;
}

function labelCrossings(layout, gap = 8) {
  const crossings = [];
  for (const label of layout.edges) for (const route of layout.edges) {
    if (label === route) continue;
    const rect = { x: label.label.x - gap, y: label.label.y - gap, width: label.label.width + gap * 2, height: label.label.height + gap * 2 };
    if (route.points.some((point, index) => index > 0 && segmentTouchesRect(route.points[index - 1], point, rect))) {
      crossings.push({ label: label.edge.label, route: route.edge.label });
    }
  }
  return crossings;
}

test('scene projection uses explicit step references and edge endpoints only', () => {
  const model = graphModel();
  const journey = { steps: [
    { title: '先做 A', nodeIds: ['a'], edgeIds: [] },
    { title: '再做 C', nodeIds: ['c'], edgeIds: ['ab', 'hub-2'] },
  ] };
  const scene = projectSceneGraph(model, journey);
  assert.deepEqual(scene.nodes.map((node) => node.id), ['a', 'b', 'c', 'd']);
  assert.deepEqual(scene.edges.map((edge) => edge.id), ['ab', 'hub-2']);
  assert.deepEqual([...projectStepHighlight(journey, 0, model.edges).nodes], ['a']);
  assert.deepEqual([...projectStepHighlight(journey, 0, model.edges).edges], []);
  assert.deepEqual([...projectStepHighlight(journey, 1, model.edges).nodes].sort(), ['a', 'b', 'c', 'd']);
});

test('scene reading order follows first step association without inventing calls or moving on step selection', () => {
  const nodes = ['z-entry', 'a-store'].map((id) => ({ id, title: id, kind: 'component', groupId: 'same', description: '场景实体', certainty: 'unknown', sources: [] }));
  const model = { id: 'reading-order', title: '阅读顺序', groups: [{ id: 'same', title: '同一职责' }], nodes, edges: [{ id: 'write', source: 'z-entry', target: 'a-store', label: '写入', kind: 'data' }] };
  const journey = { steps: [{ title: '接收', nodeIds: ['z-entry'], edgeIds: [] }, { title: '写入', nodeIds: ['a-store'], edgeIds: ['write'] }] };
  const projection = projectSceneGraph(model, journey);
  const graph = layoutGraph(projection);
  assert.deepEqual(graph.groups[0].nodeIds, ['z-entry', 'a-store']);
  assert.deepEqual(layoutGraph(projectOverviewGraph(model)).groups[0].nodeIds, ['a-store', 'z-entry'], 'overview keeps its existing order');
  assert.deepEqual(projection.edges.map((edge) => edge.id), ['write'], 'numbered order adds no relation');
  const before = JSON.stringify(graph);
  projectStepHighlight(journey, 1, model.edges);
  assert.equal(JSON.stringify(layoutGraph(projection)), before, 'highlighting does not change the complete scene layout');
  assert.equal(nodes[0].id, 'z-entry', 'canonical entities are not reordered');
});

test('title wrapping budgets 14 pixels per code point for wide English, emoji, and Chinese', () => {
  const model = graphModel();
  const title = `${'W'.repeat(27)}🧑‍💻🚀${'中文'.repeat(14)}`;
  model.nodes[0].title = title;
  const layout = layoutGraph(projectOverviewGraph(model));
  const node = layout.nodes.find((positioned) => positioned.node.id === 'a');
  assert.equal(node.titleLines.join(''), title);
  assert.ok(node.titleLines.length > 1);
  for (const line of node.titleLines) assert.ok(Array.from(line).length * 14 <= 230, `title line exceeds conservative budget: ${line}`);
});

test('overview layout is deterministic, groups are disjoint, and routed ports stay outside nodes', () => {
  const model = graphModel();
  const projection = projectOverviewGraph(model);
  const first = layoutGraph(projection);
  const second = layoutGraph(projection);
  assert.deepEqual(first, second);
  assert.equal(first.edges.length, model.edges.length);
  assert.deepEqual(first.edges.filter((edge) => edge.trackY !== undefined).map((edge) => edge.edge.id), ['cross-row-1', 'cross-row-2']);
  assert.equal(new Set(first.groups.map((group) => group.x)).size, 3);
  assert.ok(first.nodes.find((node) => node.node.id === 'd').height > first.nodes.find((node) => node.node.id === 'a').height);
  for (const node of first.nodes) for (const line of node.titleLines) {
    const pixels = Array.from(line).length * 14;
    assert.ok(pixels <= 230, `title line exceeds card: ${line}`);
  }
  for (let i = 0; i < first.nodes.length; i++) for (let j = i + 1; j < first.nodes.length; j++) {
    const a = first.nodes[i], b = first.nodes[j];
    assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, `${a.node.id} overlaps ${b.node.id}`);
  }
  for (let i = 0; i < first.edges.length; i++) {
    const routed = first.edges[i];
    const label = routed.label;
    const codePoints = Array.from(label.text).length;
    assert.ok(codePoints <= 10, `${routed.edge.id} label exceeds 10 code points`);
    assert.equal(label.width, codePoints * 14 + 10);
    assert.equal(label.height, 24);
    assert.equal(routed.labelX, label.x + 5);
    assert.equal(routed.labelY, label.y + 16);
    assert.ok(label.x >= 0 && label.y >= 0 && label.x + label.width <= first.width && label.y + label.height <= first.height);
    for (const node of first.nodes) assert.ok(!overlaps(label, node), `${routed.edge.id} label covers node ${node.node.id}`);
    for (const group of first.groups) {
      assert.ok(!overlaps(label, { x: group.x, y: group.y, width: group.width, height: 40 }), `${routed.edge.id} label covers title ${group.id}`);
    }
    for (let j = i + 1; j < first.edges.length; j++) {
      assert.ok(!overlaps(label, first.edges[j].label), `${routed.edge.id} label overlaps ${first.edges[j].edge.id}`);
    }
  }
  for (const routed of first.edges) {
    const source = first.nodes.find((node) => node.node.id === routed.edge.source);
    const target = first.nodes.find((node) => node.node.id === routed.edge.target);
    assert.ok([source.x, source.x + source.width].includes(routed.points[0].x));
    assert.ok([target.x, target.x + target.width].includes(routed.points.at(-1).x));
    assert.ok(routed.points.every((point) => point.x >= 0 && point.x <= first.width && point.y >= 0 && point.y <= first.height));
    for (let i = 0; i < routed.points.length - 1; i++) {
      const a = routed.points[i], b = routed.points[i + 1];
      for (const node of first.nodes) {
        const horizontal = a.y === b.y && a.y > node.y && a.y < node.y + node.height && Math.max(a.x, b.x) > node.x && Math.min(a.x, b.x) < node.x + node.width;
        const vertical = a.x === b.x && a.x > node.x && a.x < node.x + node.width && Math.max(a.y, b.y) > node.y && Math.min(a.y, b.y) < node.y + node.height;
        assert.ok(!horizontal && !vertical, `${routed.edge.id} crosses ${node.node.id}`);
      }
    }
  }
  const hubOut = first.edges.filter((edge) => edge.edge.source === 'a').map((edge) => edge.points[0].y);
  const hubIn = first.edges.filter((edge) => edge.edge.target === 'd').map((edge) => edge.points.at(-1).y);
  assert.equal(new Set(hubOut).size, hubOut.length);
  assert.equal(new Set(hubIn).size, hubIn.length);
  const byId = new Map(first.edges.map((edge) => [edge.edge.id, edge]));
  const fullLongLabel = model.edges.find((edge) => edge.id === 'hub-1').label;
  assert.equal(byId.get('hub-1').edge.label, fullLongLabel);
  assert.equal(byId.get('hub-1').label.text, `${Array.from(fullLongLabel).slice(0, 9).join('')}…`);
  assert.notEqual(byId.get('ab').trackX, byId.get('ba').trackX, 'reciprocal routes use distinct tracks');
  assert.notEqual(byId.get('hub-1').trackX, byId.get('hub-2').trackX, 'parallel routes use distinct tracks');
  assert.ok(byId.get('loop').trackX > first.nodes.find((node) => node.node.id === 'c').x + first.nodes.find((node) => node.node.id === 'c').width, 'self-loop uses an outside track');
});

test('layout without edges packs groups without reserving route margins', () => {
  const model = graphModel();
  model.edges = [];
  const layout = layoutGraph(projectOverviewGraph(model));
  const right = Math.max(...layout.groups.map((group) => group.x + group.width));
  const bottom = Math.max(...layout.groups.map((group) => group.y + group.height));
  assert.equal(layout.groups[0].x, 16);
  assert.equal(layout.groups[0].y, 20);
  assert.equal(layout.width, right + 16);
  assert.equal(layout.height, bottom + 16);
  assert.equal(layout.edges.length, 0);
});

test('component projection aggregates only explicit cross-component edges and keeps leaf provenance', () => {
  const model = componentModel();
  const projection = projectComponentGraph(model);
  assert.deepEqual(projection.nodes.map((node) => node.id), ['web', 'runner', 'db', 'external']);
  assert.equal(projection.groups.length, 0);
  assert.deepEqual(projection.unmappedNodeIds, ['orphan']);
  assert.deepEqual(projection.unmappedEdgeIds, ['unmapped']);
  assert.deepEqual(projection.internalEdgeIds, ['ab', 'ba', 'loop']);

  const relation = projection.edges.find((edge) => edge.source === 'web' && edge.target === 'runner' && edge.kind === 'data');
  assert.ok(relation);
  assert.deepEqual(relation.memberEdgeIds, ['hub-1', 'hub-3']);
  assert.deepEqual(relation.memberLabels, [
    { edgeId: 'hub-1', label: '写入RuntimeTask状态并保存完整执行结果' },
    { edgeId: 'hub-3', label: '保存结果' },
  ]);
  assert.equal(relation.label, '数据关系 · 2条', 'mixed labels summarize only kind and count');
  assert.equal(relation.certainty, 'inferred', 'inferred endpoint certainty propagates');
  assert.ok(projection.edges.some((edge) => edge.source === 'runner' && edge.target === 'db' && edge.kind === 'call'));
  assert.ok(projection.edges.some((edge) => edge.source === 'db' && edge.target === 'runner' && edge.kind === 'call'));
  assert.equal(projection.edges.some((edge) => edge.source === 'web' && edge.target === 'runner' && edge.kind === 'async'), true);
  assert.equal(projection.edges.find((edge) => edge.memberEdgeIds.includes('outside')).certainty, 'unknown');
  assert.ok(projection.edges.every((edge) => edge.memberEdgeIds.length > 0));
});

test('flow highlight uses only listed leaf edges and never joins numbered steps', () => {
  const projection = projectComponentGraph(componentModel());
  const highlight = projectComponentHighlight(projection, { steps: [
    { edgeIds: ['hub-3'] },
    { edgeIds: [] },
  ] });
  const expected = projection.edges.find((edge) => edge.memberEdgeIds.includes('hub-3'));
  assert.deepEqual([...highlight.edges], [expected.id]);
  assert.deepEqual([...highlight.nodes].sort(), ['runner', 'web']);
});

test('component layout is compact, deterministic and independent of leaf member volume', () => {
  const model = componentModel();
  const projection = projectComponentGraph(model);
  const first = layoutComponentGraph(projection);
  assert.deepEqual(first, layoutComponentGraph(projection));
  assert.equal(first.nodes.length, model.overview.components.length);
  assert.equal(first.groups.length, 0);
  assert.ok(first.width < 1200 && first.height < 900, `component overview expanded to ${first.width}x${first.height}`);
  for (let i = 0; i < first.nodes.length; i++) for (let j = i + 1; j < first.nodes.length; j++) {
    assert.ok(!overlaps(first.nodes[i], first.nodes[j]), `${first.nodes[i].node.id} overlaps ${first.nodes[j].node.id}`);
  }
  for (const edge of first.edges) {
    const source = first.nodes.find((node) => node.node.id === edge.edge.source);
    const target = first.nodes.find((node) => node.node.id === edge.edge.target);
    assert.ok(edge.points.length > 2);
    assert.ok(edge.points[0].x >= source.x && edge.points[0].x <= source.x + source.width);
    assert.ok(edge.points.at(-1).x >= target.x && edge.points.at(-1).x <= target.x + target.width);
    assert.ok(edge.points.every((point) => point.x >= 0 && point.x <= first.width && point.y >= 0 && point.y <= first.height));
    assert.ok(edge.label.x >= 0 && edge.label.y >= 0 && edge.label.x + edge.label.width <= first.width && edge.label.y + edge.label.height <= first.height);
    for (const node of first.nodes) assert.ok(!overlaps(edge.label, node), `${edge.edge.id} label overlaps ${node.node.id}`);
  }

  const expanded = structuredClone(model);
  const web = expanded.overview.components.find((component) => component.id === 'web');
  const runner = expanded.overview.components.find((component) => component.id === 'runner');
  for (let index = 0; index < 40; index++) {
    const source = `member-${index}`;
    const target = `target-${index}`;
    expanded.nodes.push(
      { id: source, title: source, kind: 'function', description: '新增叶实体。', certainty: 'confirmed', sources: [] },
      { id: target, title: target, kind: 'function', description: '新增叶实体。', certainty: 'confirmed', sources: [] },
    );
    web.nodeIds.push(source);
    runner.nodeIds.push(target);
    expanded.edges.push({ id: `member-edge-${index}`, source, target, label: index % 2 ? '写入结果' : '保存状态', kind: 'data', certainty: 'confirmed' });
  }
  const larger = layoutComponentGraph(projectComponentGraph(expanded));
  assert.equal(larger.nodes.length, first.nodes.length);
  assert.equal(larger.edges.length, first.edges.length);
  assert.equal(larger.width, first.width);
  assert.equal(larger.height, first.height);
});

test('L0 labels use their short text width and stay clear of other lines in reciprocal multi-kind graphs', () => {
  const model = sevenComponentModel();
  const projection = projectComponentGraph(model);
  const layout = layoutComponentGraph(projection);
  assert.equal(layout.nodes.length, 7);
  assert.ok(projection.edges.some((edge) => edge.source === 'hub' && edge.target === 'database' && edge.kind === 'data'));
  assert.ok(projection.edges.some((edge) => edge.source === 'database' && edge.target === 'hub' && edge.kind === 'data'));
  assert.ok(projection.edges.some((edge) => edge.source === 'hub' && edge.target === 'runner' && edge.kind === 'async'));
  assert.ok(projection.edges.some((edge) => edge.source === 'runner' && edge.target === 'hub' && edge.kind === 'async'));
  assert.ok(new Set(projection.edges.map((edge) => edge.kind)).size > 1, 'fixture covers multiple relationship kinds');
  const hubDatabase = projection.edges.find((edge) => edge.source === 'hub' && edge.target === 'database' && edge.kind === 'data');
  assert.equal(hubDatabase.label, '数据关系 · 16条');
  assert.ok(layout.edges.some((edge) => Array.from(edge.label.text).length < 10), 'fixture includes short labels');
  for (const edge of layout.edges) assert.equal(edge.label.width, Array.from(edge.label.text).length * 14 + 10, `${edge.edge.label} uses its visible text width`);
  assert.deepEqual(labelCrossings(layout), [], 'a white label background must not cover another relationship line');
});

test('pointer-anchored zoom preserves the world point under the cursor', () => {
  const camera = { x: 80, y: 120, zoom: 1 };
  const point = { x: 260, y: 180 };
  const next = zoomAtPoint(camera, point, 1.5);
  assert.equal(next.x + point.x / next.zoom, camera.x + point.x / camera.zoom);
  assert.equal(next.y + point.y / next.zoom, camera.y + point.y / camera.zoom);
});
