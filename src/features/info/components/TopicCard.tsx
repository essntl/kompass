import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Card, cn, subjectColor } from '@/components/ui';
import type { InfoTopic } from '../data/topics';

/** A topic on /info, linking to its page. */
export function TopicCard({ topic }: { topic: InfoTopic }) {
  const color = subjectColor(topic.color);
  const Icon = topic.icon;
  return (
    <Card as={Link} to={`/info/tema/${topic.id}`} interactive className="flex h-full items-center gap-3">
      <span aria-hidden className={cn('grid size-11 shrink-0 place-items-center rounded-md', color.soft, color.ink)}>
        <Icon className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-ink">{topic.title}</span>
        <span className="mt-0.5 block text-small text-ink-2">{topic.lead}</span>
      </span>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-ink-3" />
    </Card>
  );
}
