import type { Assessment } from '@shared/types';
import { Check, Undo2 } from 'lucide-react';
import { Button, toast } from '@/components/ui';
import { useAssessmentStore } from '@/stores/assessments';

export interface SubmitToggleProps {
  assessment: Assessment;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
}

/** "Marker som levert" / "Angre levert" for a hand-in, with an undo in the toast. */
export function SubmitToggle({ assessment, size = 'sm', fullWidth, className }: SubmitToggleProps) {
  const setSubmitted = useAssessmentStore((s) => s.setSubmitted);
  const submitted = !!assessment.submitted;
  const { id, title } = assessment;

  function toggle() {
    setSubmitted(id, !submitted);
    if (submitted) {
      toast('Ikke markert som levert lenger', { id: `submit-${id}`, description: title });
    } else {
      toast.success('Markert som levert', {
        id: `submit-${id}`,
        description: title,
        action: { label: 'Angre', onClick: () => setSubmitted(id, false) },
      });
    }
  }

  return submitted ? (
    <Button
      variant="ghost"
      size={size}
      icon={<Undo2 />}
      onClick={toggle}
      fullWidth={fullWidth}
      aria-label={`Angre at «${title}» er levert`}
      className={className}
    >
      Angre levert
    </Button>
  ) : (
    <Button
      variant="soft"
      size={size}
      icon={<Check />}
      onClick={toggle}
      fullWidth={fullWidth}
      aria-label={`Marker «${title}» som levert`}
      className={className}
    >
      Marker som levert
    </Button>
  );
}
