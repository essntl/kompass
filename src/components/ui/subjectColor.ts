import type { SubjectColor } from '@shared/types';

export interface SubjectColorClasses {
  /** Solid fill for bars and dots: `bg-subj-n`. */
  solid: string;
  /** Soft fill for cards and avatars: `bg-subj-n-soft`. */
  soft: string;
  /** Text colour that is AA on `soft`: `text-subj-n-ink`. */
  ink: string;
  /** Border in the solid colour: `border-subj-n`. */
  border: string;
  /** Hover fill for interactive soft surfaces: `hover:bg-subj-n-soft-hover`. */
  softHover: string;
  /** The solid colour as text/icon colour: `text-subj-n`. Not for body text. */
  text: string;
}

/*
 * Static class names on purpose: Tailwind only generates utilities it can find
 * as complete strings in the source.
 */
const SUBJECT_COLORS: Record<SubjectColor, SubjectColorClasses> = {
  1: { solid: 'bg-subj-1', soft: 'bg-subj-1-soft', ink: 'text-subj-1-ink', border: 'border-subj-1', softHover: 'hover:bg-subj-1-soft-hover', text: 'text-subj-1' },
  2: { solid: 'bg-subj-2', soft: 'bg-subj-2-soft', ink: 'text-subj-2-ink', border: 'border-subj-2', softHover: 'hover:bg-subj-2-soft-hover', text: 'text-subj-2' },
  3: { solid: 'bg-subj-3', soft: 'bg-subj-3-soft', ink: 'text-subj-3-ink', border: 'border-subj-3', softHover: 'hover:bg-subj-3-soft-hover', text: 'text-subj-3' },
  4: { solid: 'bg-subj-4', soft: 'bg-subj-4-soft', ink: 'text-subj-4-ink', border: 'border-subj-4', softHover: 'hover:bg-subj-4-soft-hover', text: 'text-subj-4' },
  5: { solid: 'bg-subj-5', soft: 'bg-subj-5-soft', ink: 'text-subj-5-ink', border: 'border-subj-5', softHover: 'hover:bg-subj-5-soft-hover', text: 'text-subj-5' },
  6: { solid: 'bg-subj-6', soft: 'bg-subj-6-soft', ink: 'text-subj-6-ink', border: 'border-subj-6', softHover: 'hover:bg-subj-6-soft-hover', text: 'text-subj-6' },
  7: { solid: 'bg-subj-7', soft: 'bg-subj-7-soft', ink: 'text-subj-7-ink', border: 'border-subj-7', softHover: 'hover:bg-subj-7-soft-hover', text: 'text-subj-7' },
  8: { solid: 'bg-subj-8', soft: 'bg-subj-8-soft', ink: 'text-subj-8-ink', border: 'border-subj-8', softHover: 'hover:bg-subj-8-soft-hover', text: 'text-subj-8' },
};

/** Class names for a subject colour. Falls back to colour 7 (slate) for unknown values. */
export function subjectColor(n: SubjectColor): SubjectColorClasses {
  return SUBJECT_COLORS[n] ?? SUBJECT_COLORS[7];
}
