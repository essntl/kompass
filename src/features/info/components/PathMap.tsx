import { motion, useReducedMotion } from 'motion/react';
import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { cn } from '@/components/ui';
import { EASE_OUT } from '@/lib/motion';
import { edgeKey, PATH_EDGES, PATH_NODES, type PathNodeId } from '../data/paths';
import { connectorPath, edgesOnPath, pathTo, type Box, type Orientation } from '../logic/paths';

export interface PathMapProps {
  selected: PathNodeId | null;
  onSelect: (id: PathNodeId) => void;
  orientation: Orientation;
  /** Id of the detail panel the nodes control. */
  detailId: string;
}

/** Gap between stages in px; must match the grid classes below (gap-y-10 / gap-x-12). */
const STAGE_GAP: Record<Orientation, number> = { vertical: 40, horizontal: 48 };

const GRID: Record<Orientation, string> = {
  vertical: 'grid-cols-3 gap-x-3 gap-y-10',
  horizontal: 'grid-cols-5 grid-rows-3 gap-x-12 gap-y-4',
};

function cellStyle(stage: number, lane: number, orientation: Orientation): CSSProperties {
  return orientation === 'vertical'
    ? { gridRow: stage, gridColumn: lane }
    : { gridColumn: stage, gridRow: lane };
}

/**
 * The clickable map of education paths. Nodes are real buttons laid out on a grid; the
 * connectors are an SVG drawn behind them from the measured button boxes. Selecting a
 * node highlights the usual way there: the steps get numbers and the connectors draw in,
 * one after the other, in walking order.
 */
export function PathMap({ selected, onSelect, orientation, detailId }: PathMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef(new Map<PathNodeId, HTMLButtonElement>());
  const [boxes, setBoxes] = useState<Map<PathNodeId, Box> | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const reduce = useReducedMotion();

  const path = pathTo(PATH_NODES, selected);
  const pathEdges = edgesOnPath(PATH_EDGES, path);
  const onPath = new Set(path);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const measure = () => {
      const origin = container.getBoundingClientRect();
      const next = new Map<PathNodeId, Box>();
      for (const [id, element] of nodeRefs.current) {
        const rect = element.getBoundingClientRect();
        next.set(id, { x: rect.left - origin.left, y: rect.top - origin.top, width: rect.width, height: rect.height });
      }
      setBoxes(next);
      setSize({ width: origin.width, height: origin.height });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    for (const element of nodeRefs.current.values()) observer.observe(element);
    return () => observer.disconnect();
  }, [orientation]);

  const stageOf = new Map(PATH_NODES.map((node) => [node.id, node.stage]));
  const d = (from: PathNodeId, to: PathNodeId) => {
    const a = boxes?.get(from);
    const b = boxes?.get(to);
    if (!a || !b) return null;
    const span = (stageOf.get(to) ?? 0) - (stageOf.get(from) ?? 0);
    return connectorPath(a, b, orientation, span > 1 ? STAGE_GAP[orientation] : undefined);
  };

  return (
    <div ref={containerRef} className={cn('relative grid', GRID[orientation])}>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-visible"
        width={size.width}
        height={size.height}
        fill="none"
      >
        {PATH_EDGES.map((edge) => {
          const path = d(edge.from, edge.to);
          return path ? (
            <path key={edgeKey(edge)} d={path} className="stroke-line-strong" strokeWidth={2} strokeLinecap="round" />
          ) : null;
        })}
        {pathEdges.map((edge, index) => {
          const path = d(edge.from, edge.to);
          return path ? (
            <motion.path
              key={`${selected}:${edgeKey(edge)}`}
              d={path}
              className="stroke-primary"
              strokeWidth={3}
              strokeLinecap="round"
              initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 0 : 1 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={
                reduce
                  ? { duration: 0.2 }
                  : { duration: 0.22, ease: EASE_OUT, delay: 0.05 + index * 0.06 }
              }
            />
          ) : null;
        })}
      </svg>

      {PATH_NODES.map((node) => {
        const isSelected = node.id === selected;
        const step = path.indexOf(node.id);
        const isOnPath = onPath.has(node.id);
        return (
          <button
            key={node.id}
            ref={(element) => {
              if (element) nodeRefs.current.set(node.id, element);
              else nodeRefs.current.delete(node.id);
            }}
            type="button"
            style={cellStyle(node.stage, node.lane, orientation)}
            aria-expanded={isSelected}
            aria-controls={detailId}
            aria-current={isSelected ? 'step' : undefined}
            onClick={() => onSelect(node.id)}
            className={cn(
              'relative flex min-h-16 flex-col items-center justify-center rounded-lg border px-2 py-2 text-center',
              'transition-[scale,background-color,border-color,color] duration-200 ease-out active:scale-[0.97]',
              isSelected
                ? 'border-primary bg-primary text-primary-ink'
                : isOnPath
                  ? 'border-primary bg-primary-soft text-primary-soft-ink hover:bg-primary-soft-hover'
                  : 'border-line-strong bg-surface text-ink hover:bg-surface-hover',
            )}
          >
            {isOnPath ? (
              <span
                aria-hidden
                className={cn(
                  'absolute -top-2.5 -left-2.5 grid size-6 place-items-center rounded-full border-2 border-bg text-caption font-semibold tabular-nums',
                  isSelected ? 'bg-accent text-accent-ink' : 'bg-primary text-primary-ink',
                )}
              >
                {step + 1}
              </span>
            ) : null}
            <span className="text-small font-semibold text-balance">{node.label}</span>
            <span
              className={cn(
                'mt-0.5 text-caption text-balance',
                isSelected ? 'text-primary-ink' : isOnPath ? 'text-primary-soft-ink' : 'text-ink-2',
              )}
            >
              {node.hint}
            </span>
            {isOnPath && !isSelected ? <span className="sr-only">, steg {step + 1} på veien hit</span> : null}
          </button>
        );
      })}
    </div>
  );
}
