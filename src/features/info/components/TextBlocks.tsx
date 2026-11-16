import type { ReactNode } from 'react';
import { cn } from '@/components/ui';
import type { AnswerBlock } from '../logic/answerText';

export interface TextBlocksProps {
  blocks: AnswerBlock[];
  /** Rendered inline after the last character (the typing caret and the hidden word tail). */
  trailing?: ReactNode;
  className?: string;
}

/**
 * Paragraphs and simple bullet lists as React elements. Text is always rendered as text,
 * never as HTML, so model output cannot inject markup.
 */
export function TextBlocks({ blocks, trailing, className }: TextBlocksProps) {
  const lastIndex = blocks.length - 1;
  return (
    <div className={cn('flex flex-col gap-3 text-body text-ink', className)}>
      {blocks.map((block, index) => {
        const tail = index === lastIndex ? trailing : null;
        if (block.kind === 'paragraph') {
          return (
            <p key={index} className="text-pretty">
              {block.text}
              {tail}
            </p>
          );
        }
        const lastItem = block.items.length - 1;
        return (
          <ul key={index} className="flex flex-col gap-1.5">
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex} className="flex gap-2.5">
                <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0 text-pretty">
                  {item}
                  {itemIndex === lastItem ? tail : null}
                </span>
              </li>
            ))}
          </ul>
        );
      })}
      {blocks.length === 0 && trailing ? <p>{trailing}</p> : null}
    </div>
  );
}
