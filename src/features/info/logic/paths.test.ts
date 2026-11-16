import { describe, expect, it } from 'vitest';
import { getInfoSource } from '@shared/infoSources';
import { PATH_EDGES, PATH_NODES } from '../data/paths';
import { connectorPath, edgesOnPath, pathTo } from './paths';

describe('pathTo', () => {
  it('follows the usual route back to Vg1', () => {
    expect(pathTo(PATH_NODES, 'fagbrev')).toEqual(['vg1', 'vg2', 'laretid', 'fagbrev']);
    expect(pathTo(PATH_NODES, 'hoyere')).toEqual(['vg1', 'vg2', 'pabygg', 'hoyere']);
    expect(pathTo(PATH_NODES, 'vg1')).toEqual(['vg1']);
    expect(pathTo(PATH_NODES, null)).toEqual([]);
  });

  it('every step on a path is joined by a real edge', () => {
    for (const node of PATH_NODES) {
      const path = pathTo(PATH_NODES, node.id);
      expect(edgesOnPath(PATH_EDGES, path)).toHaveLength(path.length - 1);
    }
  });
});

describe('map data', () => {
  it('links only to curated sources', () => {
    for (const node of PATH_NODES) {
      expect(node.detail.sourceIds.length).toBeGreaterThan(0);
      for (const id of node.detail.sourceIds) expect(getInfoSource(id), `${node.id} → ${id}`).toBeDefined();
    }
  });

  it('puts every node in its own cell, with edges going forward in time', () => {
    const cells = new Set(PATH_NODES.map((node) => `${node.stage}:${node.lane}`));
    expect(cells.size).toBe(PATH_NODES.length);
    const byId = new Map(PATH_NODES.map((node) => [node.id, node]));
    for (const edge of PATH_EDGES) {
      expect(byId.get(edge.to)!.stage).toBeGreaterThanOrEqual(byId.get(edge.from)!.stage);
    }
  });
});

describe('connectorPath', () => {
  const a = { x: 100, y: 0, width: 100, height: 40 };
  const b = { x: 0, y: 100, width: 100, height: 40 };

  it('curves from the bottom of one box to the top of the next in the vertical layout', () => {
    expect(connectorPath(a, b, 'vertical')).toBe('M 150 40 C 150 70, 50 70, 50 100');
  });

  it('bends early and runs straight when a bend length is given', () => {
    const far = { x: 0, y: 200, width: 100, height: 40 };
    expect(connectorPath(a, far, 'vertical', 40)).toBe('M 150 40 C 150 60, 50 60, 50 80 L 50 200');
  });

  it('runs straight across between boxes in the same row', () => {
    const right = { x: 300, y: 0, width: 100, height: 40 };
    expect(connectorPath(a, right, 'vertical')).toBe('M 200 20 L 300 20');
  });

  it('runs left to right in the horizontal layout', () => {
    const next = { x: 300, y: 100, width: 100, height: 40 };
    expect(connectorPath(a, next, 'horizontal')).toBe('M 200 20 C 250 20, 250 120, 300 120');
  });
});
