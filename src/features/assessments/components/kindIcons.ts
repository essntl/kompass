import type { AssessmentKind } from '@shared/types';
import { ClipboardList, FileUp, MessagesSquare, Mic, Wrench, type LucideIcon } from 'lucide-react';

/** One icon per kind of assessment, always shown next to its label. */
export const KIND_ICONS: Record<AssessmentKind, LucideIcon> = {
  prove: ClipboardList,
  innlevering: FileUp,
  muntlig: Mic,
  praktisk: Wrench,
  fagsamtale: MessagesSquare,
};
