import { useReducedMotion } from 'motion/react';
import { useRef } from 'react';
import { useSearchParams } from 'react-router';
import { Card, Page, PageHeader, useIsDesktop } from '@/components/ui';
import { PathDetail } from './components/PathDetail';
import { PathMap } from './components/PathMap';
import { getPathNode, type PathNodeId } from './data/paths';

const DETAIL_ID = 'veier-detalj';

/** /info/veier – the interactive map of paths from Vg1 onward. `?steg=<id>` selects a step. */
export function PathsPage() {
  const [params, setParams] = useSearchParams();
  const selected = getPathNode(params.get('steg'))?.id ?? null;
  const isDesktop = useIsDesktop();
  const reduce = useReducedMotion();
  const detailRef = useRef<HTMLDivElement>(null);

  function select(id: PathNodeId) {
    setParams(id === selected ? {} : { steg: id }, { replace: true, preventScrollReset: true });
    // On a phone the explanation sits under the map: bring its top into view if it is off screen.
    requestAnimationFrame(() => {
      const detail = detailRef.current;
      if (!detail) return;
      const { top } = detail.getBoundingClientRect();
      if (top > window.innerHeight - 160) {
        detail.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      }
    });
  }

  return (
    <Page width="wide">
      <PageHeader
        title="Utdanningsveier"
        subtitle="Veien fra Vg1 til fagbrev, og hva du kan gjøre etterpå."
        back="/info"
      />

      <Card padding="none" className="flex flex-col gap-6 p-4 desktop:p-6">
        <p className="text-small text-ink-2">
          Trykk på et steg for å lese mer. Den vanlige veien dit blir markert med tall. Det finnes
          også andre veier, og noen fag er lagt opp annerledes.
        </p>
        <div role="group" aria-label="Kart over utdanningsveier" className="pt-2">
          <PathMap
            selected={selected}
            onSelect={select}
            orientation={isDesktop ? 'horizontal' : 'vertical'}
            detailId={DETAIL_ID}
          />
        </div>
      </Card>

      <PathDetail id={DETAIL_ID} selected={selected} ref={detailRef} />
    </Page>
  );
}
