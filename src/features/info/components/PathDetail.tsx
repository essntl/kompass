import { getInfoSource } from '@shared/infoSources';
import { Clock, MousePointerClick } from 'lucide-react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import type { Ref } from 'react';
import { Badge, Card } from '@/components/ui';
import { tween } from '@/lib/motion';
import { getPathNode, PATH_NODES, type PathNodeId } from '../data/paths';
import { pathTo } from '../logic/paths';
import { SourceCard } from './SourceCard';
import { TextBlocks } from './TextBlocks';

export interface PathDetailProps {
  id: string;
  selected: PathNodeId | null;
  ref?: Ref<HTMLDivElement>;
}

/** Swapping one step's text for another: quick fade out, short rise in. */
const swap: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: tween.base },
  exit: { opacity: 0, transition: tween.fast },
};

/** The explanation for the selected step: what it is, how long, what it gives, where to read more. */
export function PathDetail({ id, selected, ref }: PathDetailProps) {
  const node = getPathNode(selected);
  const route = pathTo(PATH_NODES, selected)
    .map((step) => getPathNode(step)?.label)
    .filter(Boolean)
    .join(' → ');

  return (
    <Card ref={ref} id={id} padding="lg" className="scroll-mt-24">
      <AnimatePresence mode="wait" initial={false}>
        {node ? (
          <motion.div key={node.id} variants={swap} initial="hidden" animate="show" exit="exit" className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h2 className="font-display text-title font-semibold tracking-tight text-ink">{node.detail.title}</h2>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary" icon={<Clock />}>
                  {node.detail.duration}
                </Badge>
                {route.includes('→') ? <span className="text-small text-ink-2">Vanlig vei hit: {route}</span> : null}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-small font-semibold text-ink-2">Hva er det?</h3>
              <p className="text-body text-ink">{node.detail.what}</p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-small font-semibold text-ink-2">Hva gir det deg?</h3>
              <p className="text-body text-ink">{node.detail.gives}</p>
            </div>
            {node.detail.notes?.length ? (
              <div className="flex flex-col gap-1.5">
                <h3 className="text-small font-semibold text-ink-2">Greit å vite</h3>
                <TextBlocks blocks={[{ kind: 'list', items: node.detail.notes }]} />
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <h3 className="text-small font-semibold text-ink-2">Les mer</h3>
              <ul className="grid grid-cols-1 gap-2 desktop:grid-cols-2">
                {node.detail.sourceIds.map((sourceId) => {
                  const source = getInfoSource(sourceId);
                  return source ? (
                    <li key={sourceId}>
                      <SourceCard title={source.title} url={source.url} publisher={source.publisher} />
                    </li>
                  ) : null;
                })}
              </ul>
            </div>
          </motion.div>
        ) : (
          <motion.div key="empty" variants={swap} initial="hidden" animate="show" exit="exit" className="flex items-start gap-3">
            <MousePointerClick aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" />
            <p className="text-body text-ink-2">
              Trykk på et steg i kartet for å lese hva det er, hvor lenge det varer og hva det gir deg.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
