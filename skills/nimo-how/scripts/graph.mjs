/** @typedef {{ id: string, title: string }} GraphGroup */
/** @typedef {GraphGroup & { nodes: GraphNode[] }} GraphCluster */
/** @typedef {{ path: string, line?: number, symbol?: string }} GraphSource */
/** @typedef {{ id: string, title: string, kind: string, groupId?: string, description: string, certainty?: string, sources: GraphSource[] }} GraphNode */
/** @typedef {{ id: string, source: string, target: string, label: string, kind: string, certainty?: string }} GraphEdge */
/** @typedef {GraphNode & { componentId: string, memberNodeIds: string[] }} ComponentGraphNode */
/** @typedef {GraphEdge & { memberEdgeIds: string[], memberLabels: Array<{ edgeId: string, label: string }> }} ComponentGraphEdge */
/** @typedef {{ title: string, nodeIds: string[], edgeIds: string[] }} GraphStep */
/** @typedef {{ id: string, title: string, groups: GraphGroup[], nodes: GraphNode[], edges: GraphEdge[] }} GraphModel */
/** @typedef {{ nodes: GraphNode[], edges: GraphEdge[], groups: GraphGroup[], nodeOrder?: string[] }} GraphProjection */
/** @typedef {Omit<GraphProjection, 'nodes' | 'edges'> & { nodes: ComponentGraphNode[], edges: ComponentGraphEdge[], unmappedNodeIds: string[], unmappedEdgeIds: string[], internalEdgeIds: string[] }} ComponentGraphProjection */
/** @typedef {{ id: string, title: string, x: number, y: number, width: number, height: number, nodeIds: string[] }} PositionedGroup */
/** @typedef {{ node: GraphNode, x: number, y: number, width: number, height: number, centerY: number, titleLines: string[] }} PositionedNode */
/** @typedef {{ text: string, x: number, y: number, width: number, height: number }} RoutedLabel */
/** @typedef {{ edge: GraphEdge, points: Array<{ x: number, y: number }>, label: RoutedLabel, labelX: number, labelY: number, trackX?: number, trackY?: number }} RoutedEdge */
/** @typedef {{ width: number, height: number, groups: PositionedGroup[], nodes: PositionedNode[], edges: RoutedEdge[] }} GraphLayout */
/** @typedef {{ x: number, y: number, zoom: number }} GraphCamera */

const labelMaxCodePoints = 10;
const codePointWidth = 14;
const labelPadding = 10;
const labelHeight = 24;
const labelSpacing = labelHeight + 4;

/** @param {string} value */
function shortEdgeLabel(value) {
  const codePoints = Array.from(value || '关联');
  return codePoints.length > labelMaxCodePoints ? `${codePoints.slice(0, labelMaxCodePoints - 1).join('')}…` : codePoints.join('');
}

/** @param {GraphEdge} edge @param {number} textX @param {number} textY @param {boolean} centered @returns {RoutedLabel} */
function edgeLabelBox(edge, textX, textY, centered = false) {
  const text = shortEdgeLabel(edge.label || edge.kind);
  const width = Array.from(text).length * codePointWidth + labelPadding;
  return {
    text,
    x: centered ? textX - width / 2 : textX - labelPadding / 2,
    y: textY - 16,
    width,
    height: labelHeight,
  };
}

/** @param {{ x: number, y: number, width: number, height: number }} a @param {{ x: number, y: number, width: number, height: number }} b @param {number} [gap] */
function overlaps(a, b, gap = 4) {
  return a.x < b.x + b.width + gap && a.x + a.width + gap > b.x
    && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;
}

/** @param {GraphModel} model @returns {GraphProjection} */
export function projectOverviewGraph(model) {
  return { nodes: model.nodes, edges: model.edges, groups: model.groups };
}

const componentKindLabels = { call: '调用', async: '任务交接', data: '数据关系' };

/** @param {Array<string | undefined>} values */
function aggregateCertainty(values) {
  const certainty = values.map((value) => value || 'unknown');
  if (certainty.includes('unknown')) return 'unknown';
  if (certainty.includes('inferred')) return 'inferred';
  return 'confirmed';
}

/**
 * Collapse canonical leaf nodes and edges into the explicitly declared L0 components.
 * The returned synthetic edge IDs exist only in this projection; memberEdgeIds lead back to source facts.
 * @param {GraphModel & { overview?: { components?: Array<{ id: string, title: string, description: string, nodeIds: string[] }> } }} model
 * @returns {ComponentGraphProjection}
 */
export function projectComponentGraph(model) {
  const components = model.overview?.components ?? [];
  const nodeById = new Map(model.nodes.map((node) => [node.id, node]));
  const componentByNodeId = new Map();
  const componentNodes = components.map((component) => {
    const memberNodeIds = [...component.nodeIds];
    for (const id of memberNodeIds) componentByNodeId.set(id, component.id);
    const certainty = aggregateCertainty(memberNodeIds.map((id) => nodeById.get(id)?.certainty));
    return {
      id: component.id,
      componentId: component.id,
      memberNodeIds,
      title: component.title,
      kind: 'component',
      description: component.description,
      certainty,
      sources: [],
    };
  });
  const unmappedNodeIds = model.nodes.filter((node) => !componentByNodeId.has(node.id)).map((node) => node.id).sort();
  const groups = new Map();
  const unmappedEdgeIds = [];
  const internalEdgeIds = [];
  for (const edge of model.edges) {
    const source = componentByNodeId.get(edge.source);
    const target = componentByNodeId.get(edge.target);
    if (!source || !target) {
      unmappedEdgeIds.push(edge.id);
      continue;
    }
    if (source === target) {
      internalEdgeIds.push(edge.id);
      continue;
    }
    const key = JSON.stringify([source, target, edge.kind]);
    if (!groups.has(key)) groups.set(key, { source, target, kind: edge.kind, edges: [] });
    groups.get(key).edges.push(edge);
  }
  const groupedEdges = [...groups.values()].sort((a, b) => a.source.localeCompare(b.source)
    || a.target.localeCompare(b.target) || a.kind.localeCompare(b.kind));
  const componentEdges = groupedEdges.map((group, index) => {
    const certainty = aggregateCertainty(group.edges.flatMap((edge) => [
      edge.certainty,
      nodeById.get(edge.source)?.certainty,
      nodeById.get(edge.target)?.certainty,
    ]));
    const memberEdgeIds = group.edges.map((edge) => edge.id).sort();
    const labels = group.edges.map((edge) => edge.label || '');
    const uniqueLabels = new Set(labels);
    const kindLabel = componentKindLabels[group.kind] || group.kind;
    const label = uniqueLabels.size === 1 && labels[0]
      ? memberEdgeIds.length > 1 ? `${labels[0]} ×${memberEdgeIds.length}` : labels[0]
      : uniqueLabels.size === 1 && memberEdgeIds.length === 1
        ? kindLabel
      : `${kindLabel} · ${memberEdgeIds.length}条`;
    return {
      id: `l0-edge-${index + 1}`,
      source: group.source,
      target: group.target,
      kind: group.kind,
      label,
      certainty,
      memberEdgeIds,
      memberLabels: memberEdgeIds.map((edgeId) => ({ edgeId, label: group.edges.find((edge) => edge.id === edgeId)?.label ?? '' })),
    };
  });
  return {
    nodes: componentNodes,
    edges: componentEdges,
    groups: [],
    unmappedNodeIds,
    unmappedEdgeIds: unmappedEdgeIds.sort(),
    internalEdgeIds: internalEdgeIds.sort(),
  };
}

/** @param {ComponentGraphProjection} projection @param {{ steps: Array<{ edgeIds: string[] }> }} journey @returns {{ nodes: Set<string>, edges: Set<string> }} */
export function projectComponentHighlight(projection, journey) {
  const edgeIds = new Set(journey.steps.flatMap((step) => step.edgeIds ?? []));
  const edges = projection.edges.filter((edge) => edge.memberEdgeIds.some((id) => edgeIds.has(id)));
  return {
    nodes: new Set(edges.flatMap((edge) => [edge.source, edge.target])),
    edges: new Set(edges.map((edge) => edge.id)),
  };
}

function componentAnchor(position, direction) {
  const centerX = position.x + position.width / 2;
  const centerY = position.y + position.height / 2;
  const scale = Math.min(
    direction.x ? position.width / 2 / Math.abs(direction.x) : Infinity,
    direction.y ? position.height / 2 / Math.abs(direction.y) : Infinity,
  );
  return { x: centerX + direction.x * scale, y: centerY + direction.y * scale };
}

function quadraticPoints(start, control, end, steps = 16) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const inverse = 1 - t;
    return {
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
    };
  });
}

function segmentTouchesRect(a, b, rect) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let min = 0;
  let max = 1;
  for (const [p, q] of [
    [-dx, a.x - rect.x], [dx, rect.x + rect.width - a.x],
    [-dy, a.y - rect.y], [dy, rect.y + rect.height - a.y],
  ]) {
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

function routeTouchesNode(points, sourceId, targetId, nodes) {
  for (const node of nodes) {
    if (node.node.id === sourceId || node.node.id === targetId) continue;
    for (let index = 1; index < points.length; index++) {
      if (segmentTouchesRect(points[index - 1], points[index], node)) return true;
    }
  }
  return false;
}

/**
 * Lay out only the declared runtime components. Node positions are a stable ring; leaf member counts do not affect geometry.
 * @param {ComponentGraphProjection} projection
 * @returns {GraphLayout}
 */
export function layoutComponentGraph(projection) {
  const nodeWidth = 220;
  const padding = 40;
  /** @type {PositionedNode[]} */
  const nodes = projection.nodes.map((node) => {
    const titleLines = wrapTitle(node.title, nodeWidth - 28);
    return {
      node,
      x: 0,
      y: 0,
      width: nodeWidth,
      height: Math.max(82 + titleLines.length * 18, 94),
      centerY: 0,
      titleLines,
    };
  });
  const count = nodes.length;
  if (!count) return { width: 0, height: 0, groups: [], nodes: [], edges: [] };
  const maxHeight = Math.max(...nodes.map((node) => node.height));
  const radiusX = count === 1 ? 0 : Math.max(nodeWidth * 1.42, (nodeWidth + 16) / (2 * Math.sin(Math.PI / count)));
  const radiusY = count === 1 ? 0 : Math.max(maxHeight + 34, radiusX * 0.72);
  const centerX = radiusX + nodeWidth / 2 + padding;
  const centerY = radiusY + maxHeight / 2 + padding;
  nodes.forEach((node, index) => {
    const angle = count === 1 ? 0 : -Math.PI / 2 + index * Math.PI * 2 / count;
    node.x = centerX + radiusX * Math.cos(angle) - node.width / 2;
    node.y = centerY + radiusY * Math.sin(angle) - node.height / 2;
    node.centerY = node.y + node.height / 2;
  });
  const nodeById = new Map(nodes.map((node) => [node.node.id, node]));
  const edgesByPair = new Map();
  for (const edge of projection.edges) {
    const pair = [edge.source, edge.target].sort().join('\0');
    if (!edgesByPair.has(pair)) edgesByPair.set(pair, []);
    edgesByPair.get(pair).push(edge);
  }
  for (const edges of edgesByPair.values()) edges.sort((a, b) => a.kind.localeCompare(b.kind) || a.id.localeCompare(b.id));
  const routed = [];
  for (const edge of projection.edges) {
    const source = nodeById.get(edge.source);
    const target = nodeById.get(edge.target);
    if (!source || !target) continue;
    const dx = target.x + target.width / 2 - (source.x + source.width / 2);
    const dy = target.centerY - source.centerY;
    const length = Math.max(1, Math.hypot(dx, dy));
    const direction = { x: dx / length, y: dy / length };
    const normal = { x: -direction.y, y: direction.x };
    const start = componentAnchor(source, direction);
    const end = componentAnchor(target, { x: -direction.x, y: -direction.y });
    const siblings = edgesByPair.get([edge.source, edge.target].sort().join('\0'));
    const kindIndex = siblings.findIndex((item) => item.id === edge.id);
    const preferred = 22 + Math.max(0, kindIndex) * 20;
    const offsets = [preferred, -preferred, preferred + 34, -preferred - 34, preferred + 68, -preferred - 68, preferred + 110, -preferred - 110];
    let points = null;
    for (const offset of offsets) {
      const control = { x: (start.x + end.x) / 2 + normal.x * offset, y: (start.y + end.y) / 2 + normal.y * offset };
      const candidate = quadraticPoints(start, control, end);
      if (!routeTouchesNode(candidate, edge.source, edge.target, nodes)) {
        points = candidate;
        break;
      }
    }
    if (!points) points = quadraticPoints(start, { x: (start.x + end.x) / 2 + normal.x * preferred, y: (start.y + end.y) / 2 + normal.y * preferred }, end);
    const label = edgeLabelBox(edge, 0, 0, true);
    routed.push({ edge, points, label, labelX: 0, labelY: 0 });
  }
  const labelBlockers = nodes.map(({ x, y, width, height }) => ({ x, y, width, height }));
  const placedLabels = [];
  const labelOffsets = [0, 24, -24, 48, -48, 72, -72, 96, -96, 128, -128, 160, -160, 192, -192, 240, -240, 288, -288, 336, -336, 384, -384];
  const labelTangents = [0, 32, -32, 64, -64];
  const labelPathClearance = 8;
  const routeRight = Math.max(...nodes.map((node) => node.x + node.width), ...routed.flatMap((edge) => edge.points.map((point) => point.x)));
  const routeBottom = Math.max(...nodes.map((node) => node.y + node.height), ...routed.flatMap((edge) => edge.points.map((point) => point.y)));
  let fallbackCount = 0;
  const findLabelPosition = (item, offsets) => {
    for (const fraction of [0.5, 0.35, 0.65, 0.2, 0.8]) {
      const anchorIndex = Math.round((item.points.length - 1) * fraction);
      const anchor = item.points[anchorIndex];
      const before = item.points[Math.max(0, anchorIndex - 1)];
      const after = item.points[Math.min(item.points.length - 1, anchorIndex + 1)];
      const dx = after.x - before.x;
      const dy = after.y - before.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const tangentDirection = { x: dx / length, y: dy / length };
      const normal = { x: -tangentDirection.y, y: tangentDirection.x };
      for (const offset of offsets) {
        for (const tangent of labelTangents) {
          const candidate = {
            ...item.label,
            x: anchor.x + normal.x * offset + tangentDirection.x * tangent - item.label.width / 2,
            y: anchor.y + normal.y * offset + tangentDirection.y * tangent - item.label.height / 2,
          };
          const guarded = { x: candidate.x - labelPathClearance, y: candidate.y - labelPathClearance, width: candidate.width + labelPathClearance * 2, height: candidate.height + labelPathClearance * 2 };
          if (labelBlockers.some((blocker) => overlaps(candidate, blocker)) || placedLabels.some((other) => overlaps(candidate, other))) continue;
          if (routed.some((other) => other !== item && other.points.some((point, index) => index > 0 && segmentTouchesRect(other.points[index - 1], point, guarded)))) continue;
          return candidate;
        }
      }
    }
    return undefined;
  };
  for (const item of routed) {
    let placed = findLabelPosition(item, labelOffsets);
    if (!placed) {
      const maximumOffset = Math.ceil(Math.hypot(routeRight, routeBottom) / 24) * 24 + Math.max(item.label.width, item.label.height);
      const extendedOffsets = [];
      for (let offset = 408; offset <= maximumOffset; offset += 24) extendedOffsets.push(offset, -offset);
      placed = findLabelPosition(item, extendedOffsets);
    }
    if (!placed) {
      const rightOfPriorLabels = Math.max(0, ...placedLabels.map((label) => label.x + label.width));
      const bottomOfPriorLabels = Math.max(0, ...placedLabels.map((label) => label.y + label.height));
      placed = { ...item.label, x: Math.max(routeRight, rightOfPriorLabels) + 12, y: Math.max(routeBottom, bottomOfPriorLabels) + fallbackCount * (item.label.height + 8) + 12 };
      fallbackCount++;
    }
    item.label = placed;
    item.labelX = item.label.x + 5;
    item.labelY = item.label.y + 16;
    placedLabels.push(item.label);
  }
  const allPoints = routed.flatMap((edge) => edge.points);
  const minX = Math.min(0, ...nodes.map((node) => node.x), ...placedLabels.map((label) => label.x), ...allPoints.map((point) => point.x));
  const minY = Math.min(0, ...nodes.map((node) => node.y), ...placedLabels.map((label) => label.y), ...allPoints.map((point) => point.y));
  const shiftX = padding - minX;
  const shiftY = padding - minY;
  for (const node of nodes) { node.x += shiftX; node.y += shiftY; node.centerY += shiftY; }
  for (const edge of routed) {
    edge.points = edge.points.map((point) => ({ x: point.x + shiftX, y: point.y + shiftY }));
    edge.label.x += shiftX;
    edge.label.y += shiftY;
    edge.labelX += shiftX;
    edge.labelY += shiftY;
  }
  const right = Math.max(...nodes.map((node) => node.x + node.width), ...routed.flatMap((edge) => [...edge.points.map((point) => point.x), edge.label.x + edge.label.width])) + padding;
  const bottom = Math.max(...nodes.map((node) => node.y + node.height), ...routed.flatMap((edge) => [...edge.points.map((point) => point.y), edge.label.y + edge.label.height])) + padding;
  return { width: right, height: bottom, groups: [], nodes, edges: routed };
}

/**
 * @param {GraphModel} model
 * @param {{ steps: GraphStep[] }} journey
 * @returns {GraphProjection}
 */
export function projectSceneGraph(model, journey) {
  const nodeIds = new Set();
  const edgeIds = new Set();
  const edgeById = new Map(model.edges.map((edge) => [edge.id, edge]));
  for (const step of journey.steps) {
    for (const id of step.nodeIds) nodeIds.add(id);
    for (const id of step.edgeIds) {
      const edge = edgeById.get(id);
      if (!edge) continue;
      edgeIds.add(id);
      nodeIds.add(edge.source);
      nodeIds.add(edge.target);
    }
  }
  return {
    nodes: model.nodes.filter((node) => nodeIds.has(node.id)),
    edges: model.edges.filter((edge) => edgeIds.has(edge.id)),
    groups: model.groups,
    nodeOrder: [...nodeIds],
  };
}

/** @param {{ steps: GraphStep[] }} journey @param {number} index @param {GraphEdge[]} edges @returns {{ nodes: Set<string>, edges: Set<string> }} */
export function projectStepHighlight(journey, index, edges = []) {
  const step = journey.steps[index];
  const highlightedNodes = new Set(step?.nodeIds ?? []);
  const highlightedEdges = new Set(step?.edgeIds ?? []);
  for (const edge of edges) if (highlightedEdges.has(edge.id)) {
    highlightedNodes.add(edge.source);
    highlightedNodes.add(edge.target);
  }
  return { nodes: highlightedNodes, edges: highlightedEdges };
}

/** @param {GraphCamera} camera @param {{ x: number, y: number }} point @param {number} zoom @returns {GraphCamera} */
export function zoomAtPoint(camera, point, zoom) {
  const worldX = camera.x + point.x / camera.zoom;
  const worldY = camera.y + point.y / camera.zoom;
  return { x: worldX - point.x / zoom, y: worldY - point.y / zoom, zoom };
}

function wrapTitle(value, maxWidth = 230) {
  const chars = Array.from(value || '未命名实体');
  const lines = [];
  let line = '';
  let width = 0;
  for (const char of chars) {
    const glyphWidth = codePointWidth;
    if (line && width + glyphWidth > maxWidth) {
      lines.push(line);
      line = '';
      width = 0;
    }
    line += char;
    width += glyphWidth;
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * @param {GraphProjection} projection
 * @returns {GraphLayout}
 */
export function layoutGraph(projection) {
  const nodeWidth = 264;
  const nodeGap = 16;
  const framePadding = 16;
  const groupWidth = nodeWidth + framePadding * 2;
  const hasEdges = projection.edges.length > 0;
  /** @type {Map<string, GraphCluster>} */
  const groupsById = new Map(projection.groups.map((group) => [group.id, { ...group, nodes: [] }]));
  for (const node of projection.nodes) {
    const key = node.groupId ?? '__unassigned__';
    if (!groupsById.has(key)) groupsById.set(key, { id: key, title: '其他实体', nodes: [] });
    groupsById.get(key)?.nodes.push(node);
  }
  const groups = [...groupsById.values()].filter((group) => group.nodes.length);
  if (!groups.length) return { width: 0, height: 0, groups: [], nodes: [], edges: [] };
  const orderedEdges = [...projection.edges].sort((a, b) => a.id.localeCompare(b.id));
  const nodeById = new Map(projection.nodes.map((node) => [node.id, node]));
  const nodeOrder = new Map((projection.nodeOrder ?? []).map((id, index) => [id, index]));
  for (const group of groups) group.nodes.sort((a, b) => (nodeOrder.get(a.id) ?? Infinity) - (nodeOrder.get(b.id) ?? Infinity) || a.id.localeCompare(b.id));
  const columns = Math.min(3, Math.max(1, Math.ceil(Math.sqrt(groups.length))));
  const rowCount = Math.ceil(groups.length / columns);
  const groupIndex = new Map(groups.map((group, index) => [group.id, index]));
  const groupOf = (nodeId) => nodeById.get(nodeId)?.groupId ?? '__unassigned__';
  /** @type {Map<string, string[]>} */
  const internalEdges = new Map(groups.map((group) => [group.id, []]));
  /** @type {Map<string, string[]>} */
  const perimeterOut = new Map(groups.map((group) => [group.id, []]));
  /** @type {Map<string, string[]>} */
  const perimeterIn = new Map(groups.map((group) => [group.id, []]));
  /** @type {Map<number, string[]>} */
  const adjacentEdges = new Map();
  /** @type {Map<string, string[]>} */
  const outgoingByNode = new Map(projection.nodes.map((node) => [node.id, []]));
  /** @type {Map<string, string[]>} */
  const incomingByNode = new Map(projection.nodes.map((node) => [node.id, []]));
  /** @type {Map<string, 'internal' | 'adjacent' | 'perimeter'>} */
  const edgeRoute = new Map();
  for (const edge of orderedEdges) {
    const sourceGroup = groupOf(edge.source);
    const targetGroup = groupOf(edge.target);
    const sourceIndex = groupIndex.get(sourceGroup) ?? 0;
    const targetIndex = groupIndex.get(targetGroup) ?? 0;
    const sourceCol = sourceIndex % columns;
    const targetCol = targetIndex % columns;
    const sameRow = Math.floor(sourceIndex / columns) === Math.floor(targetIndex / columns);
    outgoingByNode.get(edge.source)?.push(edge.id);
    incomingByNode.get(edge.target)?.push(edge.id);
    if (sourceGroup === targetGroup) {
      edgeRoute.set(edge.id, 'internal');
      internalEdges.get(sourceGroup)?.push(edge.id);
    } else if (sameRow && Math.abs(sourceCol - targetCol) === 1) {
      const boundary = Math.min(sourceCol, targetCol);
      edgeRoute.set(edge.id, 'adjacent');
      if (!adjacentEdges.has(boundary)) adjacentEdges.set(boundary, []);
      adjacentEdges.get(boundary)?.push(edge.id);
    } else {
      edgeRoute.set(edge.id, 'perimeter');
      perimeterOut.get(sourceGroup)?.push(edge.id);
      perimeterIn.get(targetGroup)?.push(edge.id);
    }
  }
  const rightRails = new Map(groups.map((group) => [group.id, [...(internalEdges.get(group.id) ?? []), ...(perimeterOut.get(group.id) ?? [])].sort()]));
  const leftRails = new Map(groups.map((group) => [group.id, [...(perimeterIn.get(group.id) ?? [])].sort()]));
  const rightRailMax = Array(columns).fill(0);
  const leftRailMax = Array(columns).fill(0);
  const adjacentMax = Array(Math.max(0, columns - 1)).fill(0);
  for (const [boundary, edges] of adjacentEdges) adjacentMax[boundary] = edges.length;
  const rightRailCount = (group) => rightRails.get(group.id)?.length ?? 0;
  const leftRailCount = (group) => leftRails.get(group.id)?.length ?? 0;
  /** @type {Map<string, string[]>} */
  const titleLines = new Map();
  /** @type {Map<string, number>} */
  const nodeHeights = new Map();
  for (const node of projection.nodes) {
    const lines = wrapTitle(node.title);
    titleLines.set(node.id, lines);
    const degree = Math.max(outgoingByNode.get(node.id)?.length ?? 0, incomingByNode.get(node.id)?.length ?? 0);
    nodeHeights.set(node.id, Math.max(64 + lines.length * 18, 32 + degree * 16));
  }
  /** @type {Map<string, number>} */
  const groupHeights = new Map();
  groups.forEach((group, index) => {
    const col = index % columns;
    rightRailMax[col] = Math.max(rightRailMax[col], rightRailCount(group));
    leftRailMax[col] = Math.max(leftRailMax[col], leftRailCount(group));
    groupHeights.set(group.id, 58 + group.nodes.reduce((height, node) => height + (nodeHeights.get(node.id) ?? 64) + nodeGap, 0));
  });
  const rowHeights = Array(rowCount).fill(0);
  groups.forEach((group, index) => {
    const row = Math.floor(index / columns);
    rowHeights[row] = Math.max(rowHeights[row], groupHeights.get(group.id) ?? 100);
  });
  const perimeterEdges = orderedEdges.filter((edge) => edgeRoute.get(edge.id) === 'perimeter');
  const edgeSpacing = 24;
  const edgeBandHeight = perimeterEdges.length ? 40 + perimeterEdges.length * edgeSpacing : 0;
  const leftMargin = hasEdges ? 48 + (leftRailMax[0] ?? 0) * 7 : 16;
  const columnX = [leftMargin];
  for (let col = 1; col < columns; col++) {
    const gutter = (hasEdges ? labelMaxCodePoints * codePointWidth + 60 : 24)
      + rightRailMax[col - 1] * 7 + leftRailMax[col] * 7 + adjacentMax[col - 1] * 8;
    columnX[col] = columnX[col - 1] + groupWidth + gutter;
  }
  const rowY = [edgeBandHeight + 20];
  for (let row = 1; row < rowCount; row++) rowY[row] = rowY[row - 1] + rowHeights[row - 1] + 32;
  /** @type {PositionedGroup[]} */
  const positionedGroups = [];
  /** @type {PositionedNode[]} */
  const positionedNodes = [];
  const nodePositions = new Map();
  const groupPositions = new Map();
  groups.forEach((group, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = columnX[col];
    const y = rowY[row];
    const height = groupHeights.get(group.id) ?? 100;
    const positioned = { id: group.id, title: group.title, x, y, width: groupWidth, height, nodeIds: group.nodes.map((node) => node.id) };
    positionedGroups.push(positioned);
    groupPositions.set(group.id, positioned);
    let nodeY = y + 48;
    for (const node of group.nodes) {
      const boxHeight = nodeHeights.get(node.id) ?? 64;
      const box = { node, x: x + framePadding, y: nodeY, width: nodeWidth, height: boxHeight, centerY: nodeY + boxHeight / 2, titleLines: titleLines.get(node.id) ?? [node.title] };
      positionedNodes.push(box);
      nodePositions.set(node.id, box);
      nodeY += boxHeight + nodeGap;
    }
  });
  /** @type {RoutedEdge[]} */
  const routedEdges = [];
  const portY = (node, edgeId, links) => {
    const edges = links.get(node.node.id) ?? [];
    const index = edges.indexOf(edgeId);
    return node.centerY + (index - (edges.length - 1) / 2) * 16;
  };
  for (const edge of orderedEdges) {
    const source = nodePositions.get(edge.source);
    const target = nodePositions.get(edge.target);
    if (!source || !target) continue;
    const sourceGroup = groupPositions.get(source.node.groupId ?? '__unassigned__');
    const targetGroup = groupPositions.get(target.node.groupId ?? '__unassigned__');
    if (!sourceGroup || !targetGroup) continue;
    let sourceY = portY(source, edge.id, outgoingByNode);
    let targetY = portY(target, edge.id, incomingByNode);
    if (edge.source === edge.target) {
      sourceY -= 8;
      targetY += 8;
    }
    if (edgeRoute.get(edge.id) === 'internal') {
      const railIndex = rightRails.get(sourceGroup.id)?.indexOf(edge.id) ?? 0;
      const trackX = sourceGroup.x + sourceGroup.width + 20 + railIndex * 7;
      routedEdges.push({ edge, trackX, labelX: trackX + 6, labelY: (sourceY + targetY) / 2 - 5, label: edgeLabelBox(edge, trackX + 6, (sourceY + targetY) / 2 - 5), points: [
        { x: source.x + source.width, y: sourceY }, { x: trackX, y: sourceY },
        { x: trackX, y: targetY }, { x: target.x + target.width, y: targetY },
      ] });
    } else if (edgeRoute.get(edge.id) === 'adjacent') {
      const sourceIndex = groupIndex.get(sourceGroup.id) ?? 0;
      const targetIndex = groupIndex.get(targetGroup.id) ?? 0;
      const sourceCol = sourceIndex % columns;
      const targetCol = targetIndex % columns;
      const boundary = Math.min(sourceCol, targetCol);
      const laneIndex = adjacentEdges.get(boundary)?.indexOf(edge.id) ?? 0;
      const trackX = columnX[boundary] + groupWidth + 20 + rightRailMax[boundary] * 7 + laneIndex * 8;
      const sourceRight = sourceCol < targetCol;
      const targetRight = !sourceRight;
      const sourceX = source.x + (sourceRight ? source.width : 0);
      const targetX = target.x + (targetRight ? target.width : 0);
      routedEdges.push({ edge, trackX, labelX: trackX + 6, labelY: (sourceY + targetY) / 2 - 5, label: edgeLabelBox(edge, trackX + 6, (sourceY + targetY) / 2 - 5), points: [
        { x: sourceX, y: sourceY }, { x: trackX, y: sourceY },
        { x: trackX, y: targetY }, { x: targetX, y: targetY },
      ] });
    } else {
      const sourceIndex = rightRails.get(sourceGroup.id)?.indexOf(edge.id) ?? 0;
      const targetIndex = leftRails.get(targetGroup.id)?.indexOf(edge.id) ?? 0;
      const sourceX = sourceGroup.x + sourceGroup.width + 20 + sourceIndex * 7;
      const targetX = targetGroup.x - 20 - targetIndex * 7;
      const trackY = 24 + perimeterEdges.indexOf(edge) * edgeSpacing;
      routedEdges.push({ edge, trackY, labelX: (sourceX + targetX) / 2, labelY: trackY - 6, label: edgeLabelBox(edge, (sourceX + targetX) / 2, trackY - 6, true), points: [
        { x: source.x + source.width, y: sourceY }, { x: sourceX, y: sourceY },
        { x: sourceX, y: trackY }, { x: targetX, y: trackY },
        { x: targetX, y: targetY }, { x: target.x, y: targetY },
      ] });
    }
  }
  const labelBlockers = [
    ...positionedNodes.map((node) => ({ x: node.x, y: node.y, width: node.width, height: node.height })),
    ...positionedGroups.map((group) => ({ x: group.x, y: group.y, width: group.width, height: 40 })),
  ];
  /** @type {RoutedLabel[]} */
  const placedLabels = [];
  const graphBottom = Math.max(...positionedGroups.map((group) => group.y + group.height));
  const searchSteps = Math.ceil((graphBottom + 240) / labelSpacing);
  for (const routed of routedEdges) {
    const base = routed.label;
    /** @type {RoutedLabel | undefined} */
    let placed;
    for (let step = 0; step <= searchSteps; step++) {
      const offsets = step === 0 ? [0] : [step * labelSpacing, -step * labelSpacing];
      for (const offset of offsets) {
        const candidate = { ...base, y: base.y + offset };
        if (candidate.y < 0) continue;
        if (labelBlockers.some((blocker) => overlaps(candidate, blocker))) continue;
        if (placedLabels.some((label) => overlaps(candidate, label))) continue;
        placed = candidate;
        break;
      }
      if (placed) break;
    }
    if (!placed) {
      let y = graphBottom + labelSpacing;
      placed = { ...base, y };
      while (labelBlockers.some((blocker) => overlaps(placed, blocker)) || placedLabels.some((label) => overlaps(placed, label))) {
        y += labelSpacing;
        placed = { ...base, y };
      }
    }
    routed.label = placed;
    routed.labelX = placed.x + 5;
    routed.labelY = placed.y + 16;
    placedLabels.push(placed);
  }
  const right = Math.max(
    ...positionedGroups.map((group) => group.x + group.width),
    ...routedEdges.flatMap((routed) => [...routed.points.map((point) => point.x), routed.label.x + routed.label.width]),
  );
  const bottom = Math.max(
    graphBottom,
    ...routedEdges.flatMap((routed) => [...routed.points.map((point) => point.y), routed.label.y + routed.label.height]),
  );
  const padding = 16;
  return { width: right + padding, height: bottom + padding, groups: positionedGroups, nodes: positionedNodes, edges: routedEdges };
}
