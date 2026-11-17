import type { Assessment, Grade, ISODate } from '@shared/types';

/** Always shown next to an average: it is not a term grade. */
export const UNOFFICIAL_AVERAGE_NOTE =
  'Snitt av vurderingene dine så langt, ikke en offisiell karakter.';

export interface GradePoint {
  id: string;
  date: ISODate;
  grade: Grade;
}

/** The graded results, oldest first. Assessments without a grade are left out. */
export function gradeHistory(assessments: Assessment[]): GradePoint[] {
  const points: GradePoint[] = [];
  for (const a of assessments) {
    const grade = a.result?.grade;
    if (grade !== undefined) points.push({ id: a.id, date: a.date, grade });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

/** Plain mean of the graded assessments, or null when there are none. */
export function averageGrade(assessments: Assessment[]): number | null {
  const grades = gradeHistory(assessments).map((p) => p.grade);
  if (grades.length === 0) return null;
  return grades.reduce<number>((sum, g) => sum + g, 0) / grades.length;
}

/** One decimal with a Norwegian decimal comma: 4.25 → "4,3", 4 → "4,0". */
export function formatAverage(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1).replace('.', ',');
}
