/**
 * Pure helpers for the "Utdanningsveier" map: which steps lead to a node, and how to draw
 * a connector between two measured node boxes.
 */
import { edgeKey, type PathEdge, type PathNode, type PathNodeId } from '../data/paths';

/** The usual way to `target`, oldest step first, following each node's `via`. */
export function pathTo(nodes: PathNode[], target: PathNodeId | null | undefined): PathNodeId[] {
  if (!target) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const path: PathNodeId[] = [];
  const seen = new Set<PathNodeId>();
  let current = byId.get(target);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current.id);
    current = current.via ? byId.get(current.via) : undefined;
  }
  return path;
}

/** Edges along `path`, in walking order. Missing edges are skipped. */
export function edgesOnPath(edges: PathEdge[], path: PathNodeId[]): PathEdge[] {
  const keys = new Set(edges.map(edgeKey));
  const result: PathEdge[] = [];
  for (let i = 1; i < path.length; i += 1) {
    const edge = { from: path[i - 1], to: path[i] };
    if (keys.has(edgeKey(edge))) result.push(edge);
  }
  return result;
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Orientation = 'vertical' | 'horizontal';

/**
 * SVG path from one node box to another. Edges between stages leave from the side facing
 * the next stage and curve into the other node; edges inside one stage (fagbrev → påbygg)
 * run straight across.
 */
export function connectorPath(
  from: Box,
  to: Box,
  orientation: Orientation,
  /**
   * Distance over which the connector bends into the target's lane. Pass the gap between
   * stages so an edge that skips a stage bends inside the gap and then runs straight
   * through the (empty) cell it passes. Defaults to the whole distance (one smooth curve).
   */
  bend?: number,
): string {
  const fromCx = from.x + from.width / 2;
  const fromCy = from.y + from.height / 2;
  const toCx = to.x + to.width / 2;
  const toCy = to.y + to.height / 2;

  // Same stage: the boxes share a row (vertical layout) or a column (horizontal layout).
  const sameStage =
    orientation === 'vertical' ? Math.abs(fromCy - toCy) < 1 : Math.abs(fromCx - toCx) < 1;

  if (sameStage) {
    if (orientation === 'vertical') {
      const leftToRight = toCx > fromCx;
      const x1 = leftToRight ? from.x + from.width : from.x;
      const x2 = leftToRight ? to.x : to.x + to.width;
      return `M ${round(x1)} ${round(fromCy)} L ${round(x2)} ${round(toCy)}`;
    }
    const downwards = toCy > fromCy;
    const y1 = downwards ? from.y + from.height : from.y;
    const y2 = downwards ? to.y : to.y + to.height;
    return `M ${round(fromCx)} ${round(y1)} L ${round(toCx)} ${round(y2)}`;
  }

  if (orientation === 'vertical') {
    const y1 = from.y + from.height;
    const y2 = to.y;
    const b = bendLength(y2 - y1, bend);
    const mid = y1 + b / 2;
    const curve = `M ${round(fromCx)} ${round(y1)} C ${round(fromCx)} ${round(mid)}, ${round(toCx)} ${round(mid)}, ${round(toCx)} ${round(y1 + b)}`;
    return b < y2 - y1 ? `${curve} L ${round(toCx)} ${round(y2)}` : curve;
  }
  const x1 = from.x + from.width;
  const x2 = to.x;
  const b = bendLength(x2 - x1, bend);
  const mid = x1 + b / 2;
  const curve = `M ${round(x1)} ${round(fromCy)} C ${round(mid)} ${round(fromCy)}, ${round(mid)} ${round(toCy)}, ${round(x1 + b)} ${round(toCy)}`;
  return b < x2 - x1 ? `${curve} L ${round(x2)} ${round(toCy)}` : curve;
}

function bendLength(distance: number, bend: number | undefined): number {
  if (bend === undefined || bend <= 0) return distance;
  return Math.min(distance, bend);
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
