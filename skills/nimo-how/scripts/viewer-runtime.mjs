import { layoutComponentGraph, layoutGraph, projectComponentGraph, projectComponentHighlight, projectSceneGraph, projectStepHighlight, zoomAtPoint } from './graph.mjs';

export function startViewer() {
  const $ = (id) => document.getElementById(id);
  const button = (id) => /** @type {HTMLButtonElement} */ ($(id));
  let model;
  try {
    model = JSON.parse($('model')?.textContent ?? '{}');
    if (!Array.isArray(model.nodes) || !Array.isArray(model.edges) || !Array.isArray(model.journeys)) throw new Error('invalid canvas model');
  } catch {
    $('app').hidden = true;
    $('model-error').hidden = false;
    return;
  }

  const nodes = new Map(model.nodes.map((node) => [node.id, node]));
  const edges = new Map(model.edges.map((edge) => [edge.id, edge]));
  const journeys = new Map(model.journeys.map((journey) => [journey.id, journey]));
  const certaintyLabels = { confirmed: '来源已记录', inferred: '推断', unknown: '待明确' };
  const statusLabels = { confirmed: '', 'needs-validation': '链路存在缺口', 'not-investigated': '尚未梳理', 'out-of-scope': '范围外' };
  const nodeKindLabels = { component: '组件', function: '函数', data: '数据', resource: '资源', decision: '决策', note: '说明' };
  const edgeKindLabels = { call: '调用', async: '任务交接', data: '数据关系' };
  const groupToneCount = 8;
  const groups = Array.isArray(model.groups) ? model.groups : [];
  const groupToneById = new Map(groups.map((group, index) => [group.id, index % (groupToneCount - 1)]));
  const components = Array.isArray(model.overview?.components) ? model.overview.components : [];
  const componentProjection = projectComponentGraph({ ...model, groups });
  const componentById = new Map(componentProjection.nodes.map((component) => [component.id, component]));
  const canonicalEdgesById = edges;
  const allowedFlowIds = Array.isArray(model.overview?.flowJourneyIds)
    ? model.overview.flowJourneyIds.filter((id) => journeys.has(id)).slice(0, 3) : [];
  const scopeStates = new Map();
  const toolbarBindings = new WeakMap();
  let activeGraph = null;
  let overviewGraph = null;
  let overviewInspectorDisclosure = null;
  let sceneGraph = null;
  let sceneGraphDetails = null;
  let renderedSceneId = null;
  let view = 'overview';
  let perspective = 'runtime';
  let activeFlowId = allowedFlowIds[0] ?? '';
  let sceneId = model.journeys[0]?.id ?? '';
  let deepNodeId = null;

  const element = (tag, className, value) => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (value !== undefined) item.textContent = String(value);
    return item;
  };
  const svgElement = (tag, attrs = {}, value) => {
    const item = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, attribute] of Object.entries(attrs)) item.setAttribute(key, String(attribute));
    if (value !== undefined) item.textContent = String(value);
    return item;
  };
  const readable = (value, fallback = '模型未提供') => Array.isArray(value) ? value.length ? value.join('；') : fallback : typeof value === 'string' && value.trim() ? value : fallback;
  const badge = (certainty) => element('span', `badge ${certainty || 'unknown'}`, certaintyLabels[certainty] || certaintyLabels.unknown);
  const appendCaution = (container, certainty) => { if (certainty !== 'confirmed') container.append(badge(certainty)); };
  const relationText = (edge) => `${nodes.get(edge.source)?.title ?? edge.source} → ${nodes.get(edge.target)?.title ?? edge.target} · ${edge.label || edgeKindLabels[edge.kind]}（${edgeKindLabels[edge.kind]}）`;

  function stepCertainty(step) {
    const certainty = [];
    for (const id of step.nodeIds ?? []) {
      const node = nodes.get(id);
      if (node) certainty.push(node.certainty || 'unknown');
    }
    for (const id of step.edgeIds ?? []) {
      const edge = edges.get(id);
      if (!edge) continue;
      certainty.push(edge.certainty || 'unknown');
      certainty.push(nodes.get(edge.source)?.certainty || 'unknown', nodes.get(edge.target)?.certainty || 'unknown');
    }
    if (certainty.includes('unknown')) return 'unknown';
    if (certainty.includes('inferred')) return 'inferred';
    return null;
  }

  function overviewSections() {
    if (model.overview?.sections?.length) return model.overview.sections;
    const sections = groups.map((group) => ({
      title: group.title,
      description: '',
      nodeIds: model.nodes.filter((node) => node.groupId === group.id).map((node) => node.id),
    })).filter((section) => section.nodeIds.length);
    const grouped = new Set(sections.flatMap((section) => section.nodeIds));
    const ungrouped = model.nodes.filter((node) => !grouped.has(node.id));
    if (ungrouped.length) sections.push({ title: '其他源码实体', description: '', nodeIds: ungrouped.map((node) => node.id) });
    if (!sections.length && model.nodes.length) sections.push({ title: '源码实体', description: '', nodeIds: model.nodes.map((node) => node.id) });
    return sections;
  }

  function appendSources(container, sourceNodes) {
    container.replaceChildren();
    const seen = new Set();
    for (const node of sourceNodes) for (const source of node?.sources ?? []) {
      const location = `${node.title} · ${source.path}${source.line ? `:${source.line}` : ''}${source.symbol ? ` · ${source.symbol}` : ''}`;
      if (!seen.has(location)) {
        seen.add(location);
        container.append(element('p', 'source', location));
      }
    }
    if (!seen.size) container.append(element('p', 'source', '模型未记录源码位置。'));
    return seen.size;
  }

  function appendEvidence(container, sourceNodes, certainty) {
    const details = element('details', 'evidence');
    details.append(element('summary', '', '查看实现依据'));
    details.append(badge(certainty));
    const sources = element('div');
    appendSources(sources, sourceNodes);
    details.append(sources);
    container.append(details);
  }

  function renderStepRelations(container, step, hasSceneEdges) {
    container.replaceChildren(element('h4', '', '本步已记录的交接'));
    const list = element('ul', 'handoff-list');
    for (const id of step.edgeIds ?? []) {
      const edge = edges.get(id);
      if (!edge) continue;
      const source = nodes.get(edge.source);
      const target = nodes.get(edge.target);
      const row = element('li', 'handoff-card');
      const route = element('div', 'handoff-route');
      route.append(element('span', 'handoff-endpoint', source?.title ?? edge.source));
      route.append(element('span', 'handoff-arrow', '→'));
      route.append(element('span', 'handoff-endpoint handoff-target', target?.title ?? edge.target));
      const metadata = element('div', 'handoff-meta');
      metadata.append(element('span', 'handoff-label', edge.label || '关系未命名'));
      metadata.append(element('span', 'graph-kind', edgeKindLabels[edge.kind] || edge.kind || '关系类型未标注'));
      const certainty = [edge.certainty || 'unknown', source?.certainty || 'unknown', target?.certainty || 'unknown'];
      if (certainty.includes('unknown')) appendCaution(metadata, 'unknown');
      else if (certainty.includes('inferred')) appendCaution(metadata, 'inferred');
      row.append(route, metadata);
      list.append(row);
    }
    if (list.children.length) container.append(list);
    else container.append(element('p', 'gap-notice handoff-gap', hasSceneEdges
      ? '模型没有为本步记录调用或读写关系。编号只表示讲解顺序；等待条件和后续触发请看步骤说明。'
      : '模型没有为本场景记录调用或读写关系。编号只表示讲解顺序；等待条件和后续触发请看步骤说明。'));
  }

  function stateForScope(key) {
    if (!scopeStates.has(key)) scopeStates.set(key, { camera: null, index: 0, inspection: { kind: 'step', value: null } });
    return scopeStates.get(key);
  }

  const stateForScene = (id) => stateForScope(`scene:${id}`);

  function renderOverview() {
    const target = $('view-overview');
    target.replaceChildren();
    const intro = element('div', 'view-intro');
    const summary = model.summary?.trim() || '';
    const overviewDescription = model.overview?.description?.trim() || '';
    intro.append(element('h2', '', '系统概览'));
    if (summary) intro.append(element('p', 'overview-summary', summary));
    if (overviewDescription && overviewDescription !== summary) intro.append(element('p', 'muted', overviewDescription));
    const pendingCount = model.nodes.filter((node) => node.certainty !== 'confirmed').length
      + model.edges.filter((edge) => edge.certainty !== 'confirmed').length
      + model.journeys.filter((journey) => journey.status === 'needs-validation' || journey.status === 'not-investigated').length;
    if (pendingCount) intro.append(element('p', 'uncertainty-note', `尚待确认的 ${pendingCount} 项实体、关系或场景状态；具体依据见对应说明。`));
    target.append(intro);

    const tabs = element('nav', 'perspective-tabs');
    tabs.setAttribute('aria-label', '系统视角');
    for (const [value, label] of [['runtime', '运行协作'], ['logical', '逻辑职责'], ['development', '开发视图'], ['physical', '物理视图']]) {
      const item = element('button', '', label);
      item.type = 'button';
      item.dataset.perspective = value;
      item.setAttribute('aria-pressed', String(value === perspective));
      item.addEventListener('click', () => setPerspective(value));
      tabs.append(item);
    }
    const panel = element('div', 'perspective-panel');
    panel.id = 'overview-perspective-panel';
    target.append(tabs, panel);
    renderPerspectivePanel();
  }

  function renderPerspectivePanel() {
    const panel = $('overview-perspective-panel');
    if (!panel) return;
    panel.replaceChildren();
    if (perspective === 'logical') renderSectionCards(panel, overviewSections(), '逻辑职责');
    else if (perspective === 'development') renderSectionCards(panel, model.overview?.development ?? [], '开发视图');
    else if (perspective === 'physical') renderSectionCards(panel, model.overview?.physical ?? [], '物理视图');
    else renderRuntimeOverview(panel);
  }

  function renderSectionCards(target, sections, label) {
    if (!sections.length) {
      target.append(element('p', 'gap-notice', `模型没有提供${label}说明。`));
      return;
    }
    const cards = element('div', 'overview-grid');
    for (const section of sections) {
      const card = element('section', 'overview-section');
      const sectionNodes = (section.nodeIds ?? []).map((id) => nodes.get(id)).filter(Boolean);
      card.append(element('h3', '', section.title));
      if (section.description) card.append(element('p', 'muted', section.description));
      if (sectionNodes.length) {
        const details = element('details', 'overview-section-entities');
        details.append(element('summary', '', `查看相关实体（${sectionNodes.length}）`));
        const entities = element('div', 'overview-entities');
        for (const node of sectionNodes) {
          const link = element('button', 'overview-entity', node.title);
          link.type = 'button';
          appendCaution(link, node.certainty);
          link.addEventListener('click', () => openNode(node.id));
          entities.append(link);
        }
        details.append(entities);
        card.append(details);
      }
      cards.append(card);
    }
    target.append(cards);
  }

  function renderRuntimeOverview(target) {
    if (!components.length) {
      target.append(element('p', 'gap-notice', '当前模型没有声明运行组件，无法绘制系统级 L0 关系图。可切换到“逻辑职责”查看已有分组说明。'));
      if (model.nodes.length === 1) {
        const node = model.nodes[0];
        const local = element('section', 'local-implementation');
        local.append(element('p', 'eyebrow', '局部实现 · 不代表系统运行架构'), element('h3', '', node.title), element('p', 'muted', node.description || model.overview?.description || '模型未提供局部实现说明。'));
        appendCaution(local, node.certainty);
        const action = element('button', 'local-implementation-link', '查看实体说明与源码位置');
        action.type = 'button';
        action.addEventListener('click', () => openNode(node.id));
        local.append(action);
        target.append(local);
      }
      return;
    }

    target.append(element('p', 'component-boundary muted', '组件表示运行职责协作，不代表每个组件各自是一台机器或独立进程。'));
    if (componentProjection.unmappedNodeIds.length || componentProjection.unmappedEdgeIds.length) {
      target.append(element('p', 'gap-notice', `${componentProjection.unmappedNodeIds.length} 个实体、${componentProjection.unmappedEdgeIds.length} 条关系尚未映射到组件；图中不补造“其他”组件。`));
    }
    overviewInspectorDisclosure = null;
    const panel = element('section', 'component-graph-panel graph-panel');
    panel.setAttribute('aria-label', '运行组件关系图');
    const toolbar = buildToolbar('overview', false);
    toolbar.id = 'overview-toolbar';
    const host = element('div', 'graph-host component-graph-host');
    host.id = 'overview-graph';
    panel.append(toolbar, host);
    panel.append(element('p', 'canvas-note', '箭头方向来自源码关系。调用与任务交接表示执行方向；数据箭头表示实体间的数据关系，具体读写动作看原始关系明细。琥珀色为推断，灰色点线为待明确。选择组件或关系查看职责、来源和相关场景。'));
    const inspectorDisclosure = element('details', 'graph-inspector-disclosure component-inspector-disclosure');
    inspectorDisclosure.id = 'overview-inspector-disclosure';
    inspectorDisclosure.append(element('summary', '', '选择组件或关系查看细节'));
    const inspector = element('aside', 'graph-inspector component-inspector');
    inspector.id = 'overview-inspector';
    inspector.append(element('p', 'muted', '点击图中的组件或连线，查看说明、原始关系和相关场景。'));
    inspectorDisclosure.append(inspector);
    panel.append(inspectorDisclosure);
    target.append(panel);
    overviewInspectorDisclosure = inspectorDisclosure;
    inspectorDisclosure.addEventListener('toggle', () => {
      if (inspectorDisclosure.open && view === 'overview' && perspective === 'runtime') {
        const selection = stateForScope(`overview:l0:${model.id}`).inspection;
        if (selection.kind === 'component' || selection.kind === 'component-edge') renderComponentInspector(inspector, selection);
      }
    });
    renderRuntimeFlows(target);
  }

  function renderRuntimeFlows(target) {
    const section = element('section', 'runtime-flows');
    section.append(element('h3', '', '已选主流程'));
    if (!allowedFlowIds.length) {
      section.append(element('p', 'muted', '模型没有标记主流程；可从左侧场景目录打开完整场景。'));
      target.append(section);
      return;
    }
    const controls = element('div', 'flow-controls');
    const label = element('label', '', '选择流程');
    const select = element('select', 'flow-select');
    select.id = 'overview-flow-select';
    for (const id of allowedFlowIds) {
      const journey = journeys.get(id);
      const option = element('option', '', journey.title);
      option.value = id;
      option.selected = id === activeFlowId;
      select.append(option);
    }
    label.append(select);
    controls.append(label);
    section.append(controls);
    const display = element('div', 'flow-display');
    display.id = 'overview-flow-display';
    section.append(display);
    target.append(section);
    select.addEventListener('change', () => {
      activeFlowId = allowedFlowIds.includes(select.value) ? select.value : allowedFlowIds[0];
      renderActiveFlow();
      overviewGraph?.updateHighlights(projectComponentHighlight(componentProjection, journeys.get(activeFlowId)));
      writeHash();
    });
    renderActiveFlow();
  }

  function renderActiveFlow() {
    const display = $('overview-flow-display');
    const journey = journeys.get(activeFlowId);
    if (!display || !journey) return;
    display.replaceChildren();
    const intro = element('div', 'flow-intro');
    intro.append(element('h4', '', journey.title));
    if (journey.status !== 'confirmed') {
      const status = element('span', `badge ${journey.status || 'unknown'}`, statusLabels[journey.status] || '范围未标注');
      intro.append(status);
    }
    intro.append(element('p', 'muted', journey.description || '模型未提供流程说明。'));
    intro.append(element('p', 'small muted', `触发 / 前提：${readable(journey.preconditions, '前提未标注')} · 结束：${readable(journey.completion, '结束条件未标注')}`));
    if (journey.reason) intro.append(element('p', 'uncertainty-note', journey.reason));
    const flowEdgeIds = new Set(journey.steps.flatMap((step) => step.edgeIds ?? []));
    const displayedEdgeIds = new Set(componentProjection.edges.flatMap((edge) => edge.memberEdgeIds));
    const internalEdgeIds = new Set(componentProjection.internalEdgeIds);
    const unmappedFlowEdges = [...flowEdgeIds].filter((id) => !displayedEdgeIds.has(id) && !internalEdgeIds.has(id));
    const internalFlowEdges = [...flowEdgeIds].filter((id) => internalEdgeIds.has(id));
    if (internalFlowEdges.length || unmappedFlowEdges.length) {
      intro.append(element('p', 'small muted', `${internalFlowEdges.length} 条流程关系属于组件内部，${unmappedFlowEdges.length} 条流程关系未映射到组件；这些关系不作为跨组件箭头高亮。`));
    }
    const chapter = element('button', 'flow-chapter-link', '打开完整场景章节');
    chapter.type = 'button';
    chapter.addEventListener('click', () => { openScene(journey.id); writeHash(false); });
    intro.append(chapter);
    display.append(intro);
    if (!journey.steps.length) {
      display.append(element('p', 'gap-notice', '该流程没有已记录步骤。'));
      return;
    }
    const list = element('ol', 'flow-step-cards');
    for (const [index, step] of journey.steps.entries()) {
      const item = element('li', 'flow-step-card');
      const heading = element('div', 'flow-step-heading');
      heading.append(element('span', 'step-card-number', String(index + 1)), element('strong', '', step.title));
      const certainty = stepCertainty(step);
      if (certainty) appendCaution(heading, certainty);
      const actor = element('p', 'flow-step-actor', `执行者：${step.actor || '角色未标注'}`);
      const explanation = element('p', 'muted', step.description || '步骤说明未提供。');
      const facts = element('dl', 'flow-step-facts');
      facts.append(element('dt', '', '收到'), element('dd', '', readable(step.input, '输入未标注')), element('dt', '', '产出'), element('dd', '', readable(step.output, '输出未标注')));
      item.append(heading, actor, explanation, facts);
      list.append(item);
    }
    display.append(element('p', 'small muted', '步骤按讲解顺序排列，不表示相邻步骤之间存在连线。图中只高亮各步骤明确引用的关系。'), list);
  }

  function destroyOverviewGraph() {
    overviewGraph?.destroy();
    overviewGraph = null;
    $('overview-graph')?.replaceChildren();
    if (view === 'overview') activeGraph = null;
  }

  function scheduleOverviewGraph() {
    requestAnimationFrame(() => {
      const host = $('overview-graph');
      if (overviewGraph || view !== 'overview' || perspective !== 'runtime' || $('view-overview').hidden || !components.length || !host || host.getBoundingClientRect().width <= 1) return;
      const highlight = projectComponentHighlight(componentProjection, journeys.get(activeFlowId) ?? { steps: [] });
      overviewGraph = createGraphView(host, componentProjection, `overview:l0:${model.id}`, highlight, (selection) => {
        stateForScope(`overview:l0:${model.id}`).inspection = selection;
        if (overviewInspectorDisclosure) overviewInspectorDisclosure.open = true;
        renderComponentInspector($('overview-inspector'), selection);
      }, {
        layout: layoutComponentGraph,
        ariaLabel: '运行组件关系图',
        selectionKinds: { node: 'component', edge: 'component-edge' },
        describeNode: (node) => `${node.title} · ${node.description}`,
        describeEdge: (edge) => `${componentById.get(edge.source)?.title ?? edge.source} → ${componentById.get(edge.target)?.title ?? edge.target} · ${edge.label}（${edgeKindLabels[edge.kind] || edge.kind}）`,
      });
      bindToolbar($('overview-toolbar'), overviewGraph, null);
      const selection = stateForScope(`overview:l0:${model.id}`).inspection;
      if (selection.kind === 'component' || selection.kind === 'component-edge') {
        if (overviewInspectorDisclosure) overviewInspectorDisclosure.open = true;
        renderComponentInspector($('overview-inspector'), selection);
      }
      if (view === 'overview' && perspective === 'runtime') activeGraph = overviewGraph;
    });
  }

  function relatedJourneyIds(nodeIds, edgeIds = []) {
    const nodeSet = new Set(nodeIds);
    const edgeSet = new Set(edgeIds);
    const incident = new Set(model.edges.filter((edge) => nodeSet.has(edge.source) || nodeSet.has(edge.target)).map((edge) => edge.id));
    return model.journeys.filter((journey) => journey.steps.some((step) =>
      (step.nodeIds ?? []).some((id) => nodeSet.has(id))
      || (step.edgeIds ?? []).some((id) => edgeSet.has(id) || incident.has(id)))).map((journey) => journey.id);
  }

  function appendRelatedChapters(container, journeyIds) {
    const valid = [...new Set(journeyIds)].map((id) => journeys.get(id)).filter(Boolean);
    const block = element('section', 'component-related-chapters');
    block.append(element('h4', '', '相关场景章节'));
    if (!valid.length) block.append(element('p', 'muted', '模型没有关联到场景章节。'));
    else {
      const preferred = allowedFlowIds.map((id) => valid.find((journey) => journey.id === id)).filter(Boolean);
      const quick = [...preferred, ...valid.filter((journey) => !preferred.some((item) => item.id === journey.id))].slice(0, 3);
      const quickIds = new Set(quick.map((journey) => journey.id));
      const appendLinks = (target, items) => {
        const list = element('div', 'chapter-links');
        for (const journey of items) {
          const link = element('button', 'chapter-link', journey.title);
          link.type = 'button';
          link.addEventListener('click', () => { openScene(journey.id); writeHash(false); });
          list.append(link);
        }
        target.append(list);
      };
      appendLinks(block, quick);
      const remaining = valid.filter((journey) => !quickIds.has(journey.id));
      if (remaining.length) {
        const details = element('details', 'additional-chapters');
        details.append(element('summary', '', `查看其余相关章节（${remaining.length}）`));
        appendLinks(details, remaining);
        block.append(details);
      }
    }
    container.append(block);
  }

  function renderComponentInspector(container, selection) {
    if (!container) return;
    container.replaceChildren();
    if (selection.kind === 'component') {
      const component = componentById.get(selection.value.id);
      if (!component) return;
      container.append(element('h3', '', component.title));
      appendCaution(container, component.certainty);
      container.append(element('p', 'muted', component.description || '模型未提供职责说明。'));
      const members = component.memberNodeIds.map((id) => nodes.get(id)).filter(Boolean);
      const details = element('details', 'component-members');
      details.append(element('summary', '', `查看相关源码实体（${members.length}）`));
      const list = element('ul', 'component-member-list');
      for (const node of members) {
        const row = element('li', 'component-member');
        const open = element('button', 'component-member-link', node.title);
        open.type = 'button';
        appendCaution(open, node.certainty);
        open.addEventListener('click', () => openNode(node.id));
        const sourceDetails = element('details');
        sourceDetails.append(element('summary', '', '源码位置'));
        const sources = element('div');
        appendSources(sources, [node]);
        sourceDetails.append(sources);
        row.append(open, sourceDetails);
        list.append(row);
      }
      details.append(list);
      container.append(details);
      appendRelatedChapters(container, relatedJourneyIds(component.memberNodeIds));
      return;
    }
    if (selection.kind === 'component-edge') {
      const edge = selection.value;
      const source = componentById.get(edge.source);
      const target = componentById.get(edge.target);
      const certainty = edge.certainty || 'unknown';
      container.append(element('h3', '', edge.label || edgeKindLabels[edge.kind] || '组件关系'));
      container.append(element('p', 'component-route', `${source?.title ?? edge.source} → ${target?.title ?? edge.target}`));
      container.append(element('p', 'muted', edgeKindLabels[edge.kind] || edge.kind));
      appendCaution(container, certainty);
      if (edge.kind === 'data') container.append(element('p', 'small muted', '方向表示已记录的数据关系；具体读写动作以原始实体关系为准。'));
      else container.append(element('p', 'small muted', '方向表示源码中记录的执行调用或任务交接。'));
      const details = element('details', 'component-members');
      details.append(element('summary', '', `查看原始关系与来源（${edge.memberEdgeIds.length}）`));
      const list = element('ul', 'handoff-list');
      const memberEdges = edge.memberEdgeIds.map((id) => canonicalEdgesById.get(id)).filter(Boolean);
      for (const member of memberEdges) {
        const sourceNode = nodes.get(member.source);
        const targetNode = nodes.get(member.target);
        const row = element('li', 'handoff-card');
        const route = element('div', 'handoff-route');
        route.append(element('span', 'handoff-endpoint', sourceNode?.title ?? member.source), element('span', 'handoff-arrow', '→'), element('span', 'handoff-endpoint handoff-target', targetNode?.title ?? member.target));
        const meta = element('div', 'handoff-meta');
        meta.append(element('span', 'handoff-label', member.label || '关系未命名'), element('span', 'graph-kind', edgeKindLabels[member.kind] || member.kind));
        const memberCertainty = [member.certainty || 'unknown', sourceNode?.certainty || 'unknown', targetNode?.certainty || 'unknown'];
        if (memberCertainty.includes('unknown')) appendCaution(meta, 'unknown');
        else if (memberCertainty.includes('inferred')) appendCaution(meta, 'inferred');
        row.append(route, meta);
        appendEvidence(row, [sourceNode, targetNode], memberCertainty.includes('unknown') ? 'unknown' : memberCertainty.includes('inferred') ? 'inferred' : 'confirmed');
        list.append(row);
      }
      details.append(list);
      container.append(details);
      const nodeIds = memberEdges.flatMap((member) => [member.source, member.target]);
      appendRelatedChapters(container, relatedJourneyIds(nodeIds, edge.memberEdgeIds));
    }
  }

  function buildToolbar(scope, locate) {
    const toolbar = element('div', 'canvas-tools');
    const controls = element('div', 'zoom-controls');
    for (const [action, label, aria] of [['zoom-out', '−', '缩小画布'], ['zoom-in', '+', '放大画布'], ['fit', '适配画布', '适配画布'], ['reset', '恢复视图', '恢复画布视图']]) {
      const button = element('button', '', label);
      button.type = 'button';
      button.dataset.graphAction = action;
      button.setAttribute('aria-label', aria);
      controls.append(button);
    }
    const percent = element('span', 'zoom-value', '100%');
    percent.dataset.zoomValue = scope;
    controls.insertBefore(percent, controls.children[2] ?? null);
    toolbar.append(controls);
    if (locate) {
      const button = element('button', '', '定位当前实体');
      button.type = 'button';
      button.dataset.graphAction = 'locate';
      toolbar.prepend(button);
    }
    return toolbar;
  }

  function bindToolbar(toolbar, graph, locate) {
    toolbarBindings.set(toolbar, { graph, locate });
    if (toolbar.dataset.controlsBound) return;
    toolbar.dataset.controlsBound = 'true';
    toolbar.querySelectorAll('[data-graph-action]').forEach((button) => button.addEventListener('click', () => {
      const binding = toolbarBindings.get(toolbar);
      const action = button.getAttribute('data-graph-action');
      if (action === 'zoom-in') binding.graph.zoomBy(0.1);
      else if (action === 'zoom-out') binding.graph.zoomBy(-0.1);
      else if (action === 'fit') binding.graph.fit();
      else if (action === 'reset') binding.graph.reset();
      else if (action === 'locate') binding.locate?.();
    }));
  }

  let graphSequence = 0;
  function createGraphView(host, projection, scope, initialHighlight, onInspect, options = {}) {
    const layout = (options.layout ?? layoutGraph)(projection);
    const viewport = element('div', 'graph-viewport');
    viewport.tabIndex = 0;
    viewport.setAttribute('aria-label', `可平移和缩放的${options.ariaLabel || '实体关系图'}`);
    const svg = svgElement('svg', { class: 'graph-svg', role: 'group', 'aria-label': options.ariaLabel || '实体关系图' });
    const graphId = `nimo-graph-${++graphSequence}`;
    viewport.append(svg);
    host.replaceChildren(viewport);
    const defs = svgElement('defs');
    for (const [suffix, color] of [['normal', '#71829a'], ['current', '#245fc4']]) {
      const marker = svgElement('marker', { id: `${graphId}-${suffix}`, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto' });
      marker.append(svgElement('path', { d: 'M0 0 L10 5 L0 10 z', fill: color }));
      defs.append(marker);
    }
    const groupLayer = svgElement('g');
    const edgeLayer = svgElement('g');
    const nodeLayer = svgElement('g');
    const labelLayer = svgElement('g');
    svg.append(defs, groupLayer, edgeLayer, nodeLayer, labelLayer);
    const nodeElements = new Map();
    const edgeElements = new Map();
    const edgeLabelElements = new Map();
    const zoomValue = document.querySelector(`[data-zoom-value="${scope.split(':')[0]}"]`) ?? (scope.startsWith('scene:') ? $('zoom-value') : null);
    for (const group of layout.groups) {
      const tone = groupToneById.get(group.id) ?? groupToneCount - 1;
      groupLayer.append(svgElement('rect', { class: `group-frame group-tone-${tone}`, x: group.x, y: group.y, width: group.width, height: group.height, rx: 10 }));
      const fullTitle = `${group.title} · ${group.nodeIds.length}`;
      const titlePoints = Array.from(fullTitle);
      const titleBudget = Math.max(1, Math.floor((group.width - 32) / 16));
      const displayTitle = titlePoints.length > titleBudget ? `${titlePoints.slice(0, titleBudget - 1).join('')}…` : fullTitle;
      const groupTitle = svgElement('text', { class: 'group-title', x: group.x + 16, y: group.y + 29, 'aria-label': fullTitle }, displayTitle);
      groupTitle.append(svgElement('title', {}, fullTitle));
      groupLayer.append(groupTitle);
    }
    for (const routed of layout.edges) {
      const edge = routed.edge;
      const certainty = edge.certainty || 'unknown';
      const labelBox = routed.label;
      const edgeText = options.describeEdge?.(edge) ?? relationText(edge);
      const fullLabel = `${edgeText}${certainty === 'confirmed' ? '' : ` · ${certaintyLabels[certainty] || certaintyLabels.unknown}`}`;
      const route = routed.points.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(' ');
      const item = svgElement('g', { class: 'graph-edge-wrap', tabindex: 0, role: 'button', 'aria-label': fullLabel, 'data-selectable': '' });
      const line = svgElement('path', { class: `graph-edge kind-${edge.kind} certainty-${certainty}`, d: route, 'marker-end': `url(#${graphId}-normal)` });
      line.append(svgElement('title', {}, fullLabel));
      item.append(line, svgElement('path', { class: 'graph-edge-hit', d: route }));
      item.addEventListener('click', () => onInspect({ kind: options.selectionKinds?.edge ?? 'edge', value: edge }));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onInspect({ kind: options.selectionKinds?.edge ?? 'edge', value: edge });
        }
      });
      edgeLayer.append(item);
      edgeElements.set(edge.id, { item, line });
      const labelItem = svgElement('g', { class: 'edge-label-wrap', tabindex: 0, role: 'button', 'aria-label': fullLabel, 'data-selectable': '' });
      labelItem.append(svgElement('rect', { class: 'edge-label-bg', x: labelBox.x, y: labelBox.y, width: labelBox.width, height: labelBox.height, rx: 4 }));
      labelItem.append(svgElement('text', { class: 'edge-label', x: labelBox.x + 5, y: labelBox.y + 16 }, labelBox.text));
      labelItem.addEventListener('click', () => onInspect({ kind: options.selectionKinds?.edge ?? 'edge', value: edge }));
      labelItem.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onInspect({ kind: options.selectionKinds?.edge ?? 'edge', value: edge });
        }
      });
      labelLayer.append(labelItem);
      edgeLabelElements.set(edge.id, labelItem);
    }
    for (const positioned of layout.nodes) {
      const node = positioned.node;
      const nodeText = options.describeNode?.(node) ?? `${node.title} · ${node.description}`;
      const item = svgElement('g', { class: 'graph-node', tabindex: 0, role: 'button', 'aria-label': `${nodeText}${node.certainty === 'confirmed' ? '' : ` · ${certaintyLabels[node.certainty] || certaintyLabels.unknown}`}`, 'data-selectable': '' });
      item.append(svgElement('rect', { class: 'node-card', x: positioned.x, y: positioned.y, width: positioned.width, height: positioned.height, rx: 8 }));
      item.append(svgElement('text', { class: 'node-kind', x: positioned.x + 12, y: positioned.y + 20 }, nodeKindLabels[node.kind] || node.kind));
      const title = svgElement('text', { class: 'node-title', x: positioned.x + 12, y: positioned.y + 40 });
      positioned.titleLines.forEach((line, index) => title.append(svgElement('tspan', { x: positioned.x + 12, dy: index ? 17 : 0 }, line)));
      item.append(title);
      const roleText = `${node.certainty === 'confirmed' ? '' : `${certaintyLabels[node.certainty] || certaintyLabels.unknown} · `}${node.description}`;
      const rolePoints = Array.from(roleText);
      const roleBudget = Math.max(1, Math.floor((positioned.width - 24) / 14));
      const roleLabel = svgElement('text', { class: 'node-role', x: positioned.x + 12, y: positioned.y + positioned.height - 10 }, rolePoints.length > roleBudget ? `${rolePoints.slice(0, roleBudget - 1).join('')}…` : roleText);
      roleLabel.append(svgElement('title', {}, roleText));
      item.append(roleLabel);
      for (const routed of layout.edges) {
        if (routed.edge.source === node.id) item.append(svgElement('circle', { class: 'node-port', cx: routed.points[0].x, cy: routed.points[0].y, r: 4 }));
        if (routed.edge.target === node.id) item.append(svgElement('circle', { class: 'node-port', cx: routed.points.at(-1).x, cy: routed.points.at(-1).y, r: 4 }));
      }
      item.addEventListener('click', () => onInspect({ kind: options.selectionKinds?.node ?? 'node', value: node }));
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onInspect({ kind: options.selectionKinds?.node ?? 'node', value: node });
        }
      });
      nodeLayer.append(item);
      nodeElements.set(node.id, item);
    }
    const scopedState = stateForScope(scope);
    let camera = scopedState.camera ? { ...scopedState.camera } : null;
    let initialCamera = camera ? { ...camera } : null;
    const minFitZoom = 6 / 7;
    const minManualZoom = 0.1;
    const maxZoom = 1.8;
    const clampManualZoom = (zoom) => Math.max(minManualZoom, Math.min(maxZoom, zoom));
    function updateCamera() {
      const width = Math.max(1, viewport.clientWidth);
      const height = Math.max(1, viewport.clientHeight);
      if (!camera) {
        const fittingZoom = Math.min(1, width / Math.max(1, layout.width), height / Math.max(1, layout.height));
        const zoom = Math.max(minFitZoom, fittingZoom);
        camera = { x: (layout.width - width / zoom) / 2, y: (layout.height - height / zoom) / 2, zoom };
        if (scope.startsWith('scene:') && zoom > fittingZoom) {
          const entry = layout.nodes.find((node) => node.node.id === projection.nodeOrder?.[0]);
          if (entry) {
            if (layout.width > width / zoom) camera.x = Math.max(0, entry.x - 24);
            if (layout.height > height / zoom) camera.y = Math.max(0, entry.y - 60);
          }
        }
        initialCamera = { ...camera };
      }
      svg.setAttribute('viewBox', `${camera.x} ${camera.y} ${width / camera.zoom} ${height / camera.zoom}`);
      if (zoomValue) zoomValue.textContent = `${Math.round(camera.zoom * 100)}%`;
      scopedState.camera = { ...camera };
    }
    function fit() {
      camera = null;
      updateCamera();
      initialCamera = { ...camera };
    }
    function reset() {
      camera = { ...(initialCamera ?? { x: 0, y: 0, zoom: 1 }) };
      updateCamera();
    }
    function zoomBy(delta, point = { x: viewport.clientWidth / 2, y: viewport.clientHeight / 2 }) {
      const zoom = clampManualZoom(camera.zoom + delta);
      camera = zoomAtPoint(camera, point, zoom);
      updateCamera();
    }
    function locate(ids) {
      const selected = layout.nodes.filter((node) => ids.has(node.node.id));
      if (!selected.length) return;
      const left = Math.min(...selected.map((node) => node.x));
      const top = Math.min(...selected.map((node) => node.y));
      const right = Math.max(...selected.map((node) => node.x + node.width));
      const bottom = Math.max(...selected.map((node) => node.y + node.height));
      camera.x = (left + right) / 2 - viewport.clientWidth / camera.zoom / 2;
      camera.y = (top + bottom) / 2 - viewport.clientHeight / camera.zoom / 2;
      updateCamera();
    }
    function updateHighlights(highlight) {
      const active = highlight.nodes.size > 0 || highlight.edges.size > 0;
      for (const [id, item] of nodeElements) {
        item.classList.toggle('is-current', highlight.nodes.has(id));
        item.classList.toggle('is-dimmed', active && !highlight.nodes.has(id));
      }
      for (const [id, item] of edgeElements) {
        const current = highlight.edges.has(id);
        item.item.classList.toggle('is-current', current);
        item.item.classList.toggle('is-dimmed', active && !current);
        item.line.classList.toggle('is-current', current);
        item.line.classList.toggle('is-dimmed', active && !current);
        edgeLabelElements.get(id)?.classList.toggle('is-current', current);
        edgeLabelElements.get(id)?.classList.toggle('is-dimmed', active && !current);
        item.line.setAttribute('marker-end', `url(#${graphId}-${current ? 'current' : 'normal'})`);
      }
    }
    updateHighlights(initialHighlight);
    updateCamera();
    let drag = null;
    viewport.addEventListener('pointerdown', (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (drag || !['mouse', 'touch'].includes(event.pointerType) || event.button !== 0 || target?.closest('[data-selectable]')) return;
      drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, camera: { ...camera } };
      viewport.classList.add('panning');
      viewport.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    viewport.addEventListener('pointermove', (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      camera = { ...drag.camera, x: drag.camera.x - (event.clientX - drag.x) / drag.camera.zoom, y: drag.camera.y - (event.clientY - drag.y) / drag.camera.zoom };
      updateCamera();
    });
    const stopDrag = (event) => {
      if (!drag || drag.pointerId !== event.pointerId) return;
      drag = null;
      viewport.classList.remove('panning');
    };
    viewport.addEventListener('pointerup', stopDrag);
    viewport.addEventListener('pointercancel', stopDrag);
    viewport.addEventListener('wheel', (event) => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) {
        const rect = viewport.getBoundingClientRect();
        const zoom = clampManualZoom(camera.zoom * (event.deltaY < 0 ? 1.1 : 1 / 1.1));
        camera = zoomAtPoint(camera, { x: event.clientX - rect.left, y: event.clientY - rect.top }, zoom);
      } else {
        camera.x += event.deltaX / camera.zoom;
        camera.y += event.deltaY / camera.zoom;
      }
      updateCamera();
    }, { passive: false });
    const resizeObserver = new ResizeObserver(updateCamera);
    resizeObserver.observe(viewport);
    return { layout, viewport, fit, reset, zoomBy, locate, updateHighlights, destroy: () => resizeObserver.disconnect() };
  }

  function destroySceneGraph() {
    sceneGraph?.destroy();
    sceneGraph = null;
    $('scene-graph')?.replaceChildren();
    if (view === 'scenes') activeGraph = null;
  }

  function scheduleSceneGraph(id) {
    requestAnimationFrame(() => {
      const journey = journeys.get(id);
      const host = $('scene-graph');
      if (!journey?.steps.length || sceneGraph || sceneId !== id || view !== 'scenes' || $('scene-layout').hidden || !sceneGraphDetails?.open || host.clientWidth <= 1) return;
      const state = stateForScene(id);
      const highlight = projectStepHighlight(journey, state.index, model.edges);
      sceneGraph = createGraphView(host, projectSceneGraph({ ...model, groups }, journey), `scene:${id}`, highlight, (selection) => {
        stateForScene(id).inspection = selection;
        if (selection.kind === 'node' || selection.kind === 'edge') $('scene-inspector').closest('details').open = true;
        renderInspector($('scene-inspector'), selection);
      });
      bindToolbar(document.querySelector('#scene-layout .canvas-tools'), sceneGraph, () => {
        const current = stateForScene(sceneId);
        sceneGraph?.locate(projectStepHighlight(journeys.get(sceneId), current.index, model.edges).nodes);
      });
      activeGraph = sceneGraph;
      button('locate-current').disabled = highlight.nodes.size === 0;
      if (state.inspection?.value) {
        if (state.inspection.kind === 'node' || state.inspection.kind === 'edge') $('scene-inspector').closest('details').open = true;
        renderInspector($('scene-inspector'), state.inspection);
      }
    });
  }

  function renderInspector(container, selection) {
    container.replaceChildren();
    if (selection.kind === 'step') {
      const { journey, index } = selection.value;
      const next = journey.steps[index + 1];
      container.append(element('h3', '', next ? '接下来读什么' : '到哪里结束'));
      if (next) {
        container.append(element('p', '', `${next.actor || '执行者未标注'} · ${next.title}`));
        container.append(element('p', 'muted', `接收：${readable(next.input, '输入未标注')}`));
        container.append(element('p', 'small muted', '这是场景的讲解顺序；具体调用和等待条件看本步链路与步骤说明。'));
      } else container.append(element('p', '', readable(journey.completion, '结束条件未标注')));
      return;
    }
    if (selection.kind === 'node') {
      const node = selection.value;
      container.append(element('h3', '', node.title));
      appendCaution(container, node.certainty);
      container.append(element('p', 'muted', node.description || '模型未提供实体说明。'));
      const scopeEdges = view === 'scenes' ? sceneGraph?.layout.edges.map((route) => route.edge) ?? [] : model.edges;
      const related = scopeEdges.filter((edge) => edge.source === node.id || edge.target === node.id);
      if (related.length) {
        const list = element('ul', 'handoff-list');
        for (const edge of related) {
          const row = element('li', '', relationText(edge));
          appendCaution(row, edge.certainty);
          list.append(row);
        }
        container.append(element('h4', '', '上下游关系'), list);
      }
      appendEvidence(container, [node], node.certainty);
      return;
    }
    if (selection.kind === 'edge') {
      const edge = selection.value;
      const source = nodes.get(edge.source);
      const target = nodes.get(edge.target);
      const certainty = edge.certainty || 'unknown';
      container.append(element('h3', '', edge.label || `${source?.title ?? edge.source} → ${target?.title ?? edge.target}`));
      container.append(element('p', '', relationText(edge)));
      appendCaution(container, certainty);
      appendEvidence(container, [source, target], certainty);
      return;
    }
    container.append(element('h3', '', '作用与上下游'), element('p', 'muted', '点击实体看它的作用与上下游，点击连线看调用或交接内容。'));
  }

  function renderObjects() {
    const target = $('view-objects');
    target.replaceChildren();
    const intro = element('div', 'view-intro');
    intro.append(element('h2', '', '核心对象与上下游'), element('p', 'muted', '看对象承担什么作用、由谁产生或使用，再展开实现位置。'));
    target.append(intro);
    let ids = model.objectNodeIds ?? model.nodes.filter((node) => node.kind === 'data' || node.kind === 'resource').map((node) => node.id);
    if (model.objectNodeIds === undefined && !ids.length) ids = model.nodes.map((node) => node.id);
    if (deepNodeId && !ids.includes(deepNodeId)) ids = [...ids, deepNodeId];
    const grid = element('div', 'objects-grid');
    for (const id of ids) {
      const node = nodes.get(id);
      if (!node) continue;
      const card = element('article', 'object-card');
      card.dataset.node = id;
      card.tabIndex = -1;
      const heading = element('div', 'object-title');
      heading.append(element('h3', '', node.title));
      appendCaution(heading, node.certainty);
      card.append(heading, element('p', 'muted', node.description));
      const relations = model.edges.filter((edge) => edge.source === id || edge.target === id);
      if (relations.length) {
        const details = element('details');
        details.append(element('summary', '', '上下游关系'));
        const list = element('ul', 'object-relations');
        for (const edge of relations) {
          const row = element('li', '', relationText(edge));
          appendCaution(row, edge.certainty);
          list.append(row);
        }
        details.append(list);
        card.append(details);
      }
      appendEvidence(card, [node], node.certainty);
      grid.append(card);
    }
    if (!grid.children.length) target.append(element('p', 'empty', '模型未列出核心对象。'));
    else target.append(grid);
  }

  function renderDirectory() {
    const query = /** @type {HTMLInputElement} */ ($('search')).value.trim().toLocaleLowerCase();
    const target = $('scene-directory');
    target.replaceChildren();
    let count = 0;
    const seen = new Set();
    const categories = (model.categories ?? []).map((category) => ({
      title: category.title,
      journeys: model.journeys.filter((journey) => journey.categoryId === category.id && (seen.add(journey.id), true)),
    }));
    const rest = model.journeys.filter((journey) => !seen.has(journey.id));
    if (rest.length) categories.push({ title: '其他场景', journeys: rest });
    for (const category of categories) {
      const matching = category.journeys.filter((journey) => `${journey.id} ${journey.title} ${journey.description}`.toLocaleLowerCase().includes(query));
      if (!matching.length) continue;
      const section = element('details', 'category');
      section.open = Boolean(query) || (view === 'scenes' && category.journeys.some((journey) => journey.id === sceneId));
      section.append(element('summary', '', category.title));
      for (const journey of matching) {
        const button = element('button', 'scene-link');
        button.type = 'button';
        button.setAttribute('aria-current', view === 'scenes' && sceneId === journey.id ? 'page' : 'false');
        button.append(element('span', '', journey.title), element('span', 'scene-meta', `${journey.steps.length} 个动作${journey.status === 'confirmed' ? '' : ` · ${statusLabels[journey.status] || '范围未标注'}`}`));
        button.addEventListener('click', () => {
          openScene(journey.id, 0, true);
          writeHash(false);
          closeDirectory();
        });
        section.append(button);
        count++;
      }
      target.append(section);
    }
    $('directory-count').textContent = `${count} / ${model.journeys.length} 个场景`;
    if (!count) target.append(element('p', 'muted', model.journeys.length ? '没有匹配的场景。' : '当前为局部源码导览。请查看系统概览或源码实体。'));
  }

  function closeDirectory() {
    if (innerWidth > 760) return;
    $('directory-body').classList.add('mobile-closed');
    $('directory-toggle').setAttribute('aria-expanded', 'false');
    $('directory-toggle').textContent = '展开目录';
  }

  function setView(next) {
    if (view !== next) {
      if (view === 'overview') destroyOverviewGraph();
      if (view === 'scenes') destroySceneGraph();
    }
    view = next;
    for (const name of ['overview', 'objects', 'scenes']) $('view-' + name).hidden = name !== view;
    activeGraph = view === 'overview' && perspective === 'runtime' ? overviewGraph : view === 'scenes' ? sceneGraph : null;
    document.querySelectorAll('[data-view]').forEach((item) => item.setAttribute('aria-pressed', String(item.getAttribute('data-view') === view)));
    renderDirectory();
    if (view === 'overview' && perspective === 'runtime') scheduleOverviewGraph();
    if (view === 'scenes' && sceneGraphDetails?.open && journeys.get(sceneId)?.steps.length) scheduleSceneGraph(sceneId);
  }

  function setPerspective(value, persist = true) {
    if (!['runtime', 'logical', 'development', 'physical'].includes(value)) return;
    if (view !== 'overview') setView('overview');
    if (perspective === value) {
      if (persist) writeHash();
      return;
    }
    if (perspective === 'runtime' && value !== 'runtime') destroyOverviewGraph();
    perspective = value;
    renderOverview();
    activeGraph = perspective === 'runtime' && view === 'overview' ? overviewGraph : null;
    if (perspective === 'runtime' && view === 'overview') scheduleOverviewGraph();
    if (persist) writeHash();
  }

  function writeHash(replace = true) {
    const params = new URLSearchParams({ view });
    if (view === 'overview') {
      if (perspective !== 'runtime') params.set('perspective', perspective);
      if (allowedFlowIds.includes(activeFlowId)) params.set('flow', activeFlowId);
    } else if (view === 'scenes' && sceneId) {
      params.set('scene', sceneId);
      const state = stateForScene(sceneId);
      if (journeys.get(sceneId)?.steps.length) params.set('step', String(state.index + 1));
    } else if (view === 'objects' && deepNodeId) params.set('node', deepNodeId);
    const hash = '#' + params.toString();
    if (location.hash !== hash) history[replace ? 'replaceState' : 'pushState'](null, '', hash);
  }

  function openNode(id, persist = true) {
    if (!nodes.has(id)) return;
    deepNodeId = id;
    renderObjects();
    setView('objects');
    const card = [...$('view-objects').querySelectorAll('[data-node]')].find((item) => item.getAttribute('data-node') === id);
    card?.scrollIntoView({ block: 'nearest' });
    (card instanceof HTMLElement ? card : null)?.focus({ preventScroll: true });
    closeDirectory();
    if (persist) writeHash(false);
  }

  function readHash() {
    const raw = location.hash.slice(1);
    const legacyJourney = raw.match(/^journey\/([^/]+)(?:\/(\d+))?$/);
    const legacyNode = raw.match(/^node\/([^/]+)$/);
    if (legacyJourney && journeys.has(legacyJourney[1])) {
      openScene(legacyJourney[1], Number(legacyJourney[2] || 1) - 1);
      return;
    }
    if (legacyNode && nodes.has(legacyNode[1])) {
      openNode(legacyNode[1], false);
      return;
    }
    const params = new URLSearchParams(raw);
    const nodeId = params.get('node');
    const id = params.get('scene') || params.get('journey');
    const next = params.get('view');
    const step = Number(params.get('step'));
    if (nodeId && nodes.has(nodeId)) openNode(nodeId, false);
    else if (id && journeys.has(id)) openScene(id, Number.isFinite(step) ? step - 1 : 0);
    else if (next === 'scenes' && sceneId) openScene(sceneId);
    else {
      setView(next === 'objects' ? 'objects' : 'overview');
      if (view === 'overview') {
        const requestedPerspective = params.get('perspective');
        const requestedFlow = params.get('flow');
        const nextPerspective = ['logical', 'development', 'physical'].includes(requestedPerspective) ? requestedPerspective : 'runtime';
        const nextFlow = allowedFlowIds.includes(requestedFlow) ? requestedFlow : allowedFlowIds[0] ?? '';
        if (nextPerspective !== perspective) {
          if (perspective === 'runtime') destroyOverviewGraph();
          perspective = nextPerspective;
          activeFlowId = nextFlow;
          renderOverview();
          if (perspective === 'runtime') scheduleOverviewGraph();
        } else if (nextFlow !== activeFlowId) {
          activeFlowId = nextFlow;
          const select = $('overview-flow-select');
          if (select instanceof HTMLSelectElement) select.value = activeFlowId;
          renderActiveFlow();
          overviewGraph?.updateHighlights(projectComponentHighlight(componentProjection, journeys.get(activeFlowId) ?? { steps: [] }));
        }
      }
    }
  }

  function renderTour(journey) {
    const list = $('tour-list');
    list.replaceChildren();
    journey.steps.forEach((step, index) => {
      const item = element('li');
      const button = element('button', 'step-card');
      button.type = 'button';
      button.dataset.stepIndex = String(index);
      button.setAttribute('aria-current', index === stateForScene(journey.id).index ? 'step' : 'false');
      const number = element('span', 'step-card-number', String(index + 1));
      const content = element('span', 'step-card-content');
      const heading = element('span', 'step-card-heading');
      heading.append(element('strong', 'step-card-title', step.title));
      const certainty = stepCertainty(step);
      if (certainty) appendCaution(heading, certainty);
      const meta = element('span', 'step-card-meta', step.actor || '角色未标注');
      const explanation = step.description || (Array.isArray(step.output) ? step.output.join('；') : step.output) || '步骤说明未提供。';
      content.append(heading, meta, element('span', 'step-card-explanation', explanation));
      button.append(number, content);
      button.addEventListener('click', () => selectStep(index));
      item.append(button);
      list.append(item);
    });
  }

  function openScene(id, requestedStep, resetIndex = false) {
    const journey = journeys.get(id);
    if (!journey) return;
    const changed = renderedSceneId !== id;
    if (changed) destroySceneGraph();
    sceneId = id;
    const state = stateForScene(id);
    if (resetIndex) {
      state.index = 0;
      state.inspection = { kind: 'step', value: null };
    }
    else if (Number.isFinite(requestedStep)) state.index = Math.max(0, Math.min(journey.steps.length - 1, Math.trunc(requestedStep)));
    setView('scenes');
    $('scene-title').textContent = journey.title;
    $('scene-description').textContent = journey.description;
    $('scene-preconditions').textContent = readable(journey.preconditions, '前提未标注');
    $('scene-completion').textContent = readable(journey.completion, '结束条件未标注');
    $('scene-status').className = `badge ${journey.status || 'unknown'}`;
    $('scene-status').hidden = journey.status === 'confirmed';
    $('scene-status').textContent = statusLabels[journey.status] || '范围未标注';
    $('scene-reason').hidden = !journey.reason;
    $('scene-reason').textContent = journey.reason || '';
    const empty = journey.steps.length === 0;
    $('empty-scene').hidden = !empty;
    $('empty-scene').textContent = journey.reason || '当前场景没有已调查步骤。';
    $('scene-layout').hidden = empty;
    if (empty) {
      destroySceneGraph();
      $('tour-list').replaceChildren();
      activeGraph = null;
      renderedSceneId = id;
      return;
    }
    renderTour(journey);
    renderedSceneId = id;
    selectStep(state.index, false, false, true);
    if (sceneGraphDetails?.open) scheduleSceneGraph(id);
  }

  function selectStep(next, persist = true, revealTour = false, preserveInspection = false) {
    const journey = journeys.get(sceneId);
    if (!journey?.steps.length) return;
    const state = stateForScene(sceneId);
    state.index = Math.max(0, Math.min(journey.steps.length - 1, Math.trunc(next)));
    if (!preserveInspection || state.inspection.kind === 'step') state.inspection = { kind: 'step', value: { journey, index: state.index } };
    const step = journey.steps[state.index];
    const metadata = step;
    const highlight = projectStepHighlight(journey, state.index, model.edges);
    const items = [...highlight.nodes].map((id) => nodes.get(id)).filter(Boolean);
    $('position').textContent = `第 ${state.index + 1} / ${journey.steps.length} 步`;
    const detailPosition = $('detail-position');
    detailPosition.replaceChildren(element('span', '', `当前讲解 · 第 ${state.index + 1} 步`));
    const certainty = stepCertainty(step);
    if (certainty) appendCaution(detailPosition, certainty);
    $('detail-title').textContent = step.title;
    $('detail-description').textContent = step.description;
    $('detail-actor').textContent = metadata.actor || '角色未标注';
    $('detail-input').textContent = readable(metadata.input, '输入未标注');
    $('detail-output').textContent = readable(metadata.output, '输出未标注');
    const hasSceneEdges = journey.steps.some((item) => (item.edgeIds ?? []).some((id) => edges.has(id)));
    renderStepRelations($('detail-status'), step, hasSceneEdges);
    $('participants').replaceChildren();
    $('participants-summary').textContent = items.length ? `查看本步涉及的源码实体（${items.length}）` : '查看源码依据（本步未关联实体）';
    for (const node of items) {
      const participant = element('div', 'participant');
      participant.append(element('span', '', node.title));
      appendCaution(participant, node.certainty);
      $('participants').append(participant);
    }
    if (!items.length) $('participants').append(element('p', 'muted', '步骤未引用源码实体。'));
    const sourceCount = appendSources($('sources'), items);
    $('source-summary').textContent = `查看源码位置${sourceCount ? `（${sourceCount}）` : ''}`;
    button('prev').disabled = state.index === 0;
    button('next').disabled = state.index === journey.steps.length - 1;
    $('tour-list').querySelectorAll('[data-step-index]').forEach((item) => item.setAttribute('aria-current', Number(item.getAttribute('data-step-index')) === state.index ? 'step' : 'false'));
    if (revealTour) $('tour-list').querySelector(`[data-step-index="${state.index}"]`)?.scrollIntoView({ block: 'nearest' });
    sceneGraph?.updateHighlights(highlight);
    button('locate-current').disabled = highlight.nodes.size === 0;
    if (sceneGraph) renderInspector($('scene-inspector'), state.inspection);
    if (persist) writeHash();
  }

  function initialize() {
    $('model-title').textContent = model.title || '源码导览';
    document.title = `${model.title || '源码导览'} · 源码导览`;
    const version = element('details');
    version.append(element('summary', '', '版本与实现依据'));
    version.append(element('p', '', `源码快照${model.snapshot?.head ? ` · HEAD ${model.snapshot.head.slice(0, 10)}` : ''}${model.generatedAt ? ` · 生成于 ${model.generatedAt}` : ''} · ${model.nodes.length} 个实体 / ${model.journeys.length} 个场景。本图说明机制，不代表实际任务的运行状态。`));
    $('snapshot').replaceChildren(version);
    renderOverview();
    sceneGraphDetails = $('scene-graph-details');
    sceneGraphDetails.addEventListener('toggle', () => {
      if (sceneGraphDetails.open) scheduleSceneGraph(sceneId);
      else destroySceneGraph();
    });
    renderObjects();
    renderDirectory();
    /** @type {HTMLButtonElement} */ (document.querySelector('button[data-view="scenes"]')).disabled = model.journeys.length === 0;
    document.querySelectorAll('[data-view]').forEach((item) => item.addEventListener('click', () => {
      const nextView = item.getAttribute('data-view');
      if (nextView === 'scenes' && sceneId) openScene(sceneId);
      else {
        if (nextView === 'objects') renderObjects();
        if (nextView) setView(nextView);
      }
      writeHash(false);
    }));
    $('search').addEventListener('input', renderDirectory);
    $('directory-toggle').addEventListener('click', () => {
      const open = $('directory-body').classList.toggle('mobile-closed') === false;
      $('directory-toggle').setAttribute('aria-expanded', String(open));
      $('directory-toggle').textContent = open ? '收起目录' : '展开目录';
    });
    $('prev').addEventListener('click', () => selectStep(stateForScene(sceneId).index - 1, true, true));
    $('next').addEventListener('click', () => selectStep(stateForScene(sceneId).index + 1, true, true));
    $('locate-current').addEventListener('click', () => {
      const journey = journeys.get(sceneId);
      if (journey) sceneGraph?.locate(projectStepHighlight(journey, stateForScene(sceneId).index, model.edges).nodes);
    });
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable=true]'))) return;
      if (view === 'scenes' && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        event.preventDefault();
        selectStep(stateForScene(sceneId).index + (event.key === 'ArrowRight' ? 1 : -1), true, true);
      }
      if (event.key === '+' || event.key === '=') { event.preventDefault(); activeGraph?.zoomBy(0.1); }
      if (event.key === '-') { event.preventDefault(); activeGraph?.zoomBy(-0.1); }
      if (event.key.toLocaleLowerCase() === 'f') { event.preventDefault(); activeGraph?.fit(); }
      if (event.key === '0') { event.preventDefault(); activeGraph?.reset(); }
      if (event.key === 'Escape') { setView('overview'); writeHash(false); }
    });
    window.addEventListener('hashchange', readHash);
    window.addEventListener('popstate', readHash);
    readHash();
  }

  initialize();
}
