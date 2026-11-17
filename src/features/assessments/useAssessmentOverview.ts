import { useMemo } from 'react';
import { useNow } from '@/lib/timetable';
import { useAssessmentStore } from '@/stores/assessments';
import { useSubjectMap, useTimetableStore } from '@/stores/timetable';
import { groupAssessments, summarise, summariseSubjects } from './logic/groups';

/** Everything the overview page shows, derived from the stores and a once-a-minute clock. */
export function useAssessmentOverview() {
  const clock = useNow(60_000);
  const minute = Math.floor(clock.getTime() / 60_000);
  const assessments = useAssessmentStore((s) => s.assessments);
  const subjectList = useTimetableStore((s) => s.subjects);
  const subjects = useSubjectMap();

  return useMemo(() => {
    const now = new Date(minute * 60_000);
    return {
      now,
      subjects,
      groups: groupAssessments(assessments, now),
      summary: summarise(assessments, now),
      bySubject: summariseSubjects(assessments, subjectList, now),
    };
  }, [assessments, subjectList, subjects, minute]);
}
