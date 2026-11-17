import type { Assessment, AssessmentKind, Grade } from '@shared/types';
import { daysUntil, formatDayShort, formatDaysUntil, isoWeek, startOfWeekISO } from '@/lib/date';
import { assessmentStatus, isHandIn, isPast, type AssessmentStatus } from './status';

export const KIND_LABELS: Record<AssessmentKind, string> = {
  prove: 'Prøve',
  innlevering: 'Innlevering',
  muntlig: 'Muntlig',
  praktisk: 'Praktisk arbeid',
  fagsamtale: 'Fagsamtale',
};

/** The official wording of the grade scale (Bokmål). */
export const GRADE_DESCRIPTIONS: Record<Grade, string> = {
  6: 'Fremragende kompetanse',
  5: 'Meget god kompetanse',
  4: 'God kompetanse',
  3: 'Nokså god kompetanse',
  2: 'Lav kompetanse',
  1: 'Svært lav kompetanse',
};

export const STATUS_LABELS: Record<AssessmentStatus, string> = {
  upcoming: 'Kommende',
  submitted: 'Levert',
  overdue: 'Ikke levert',
  awaiting: 'Venter på vurdering',
  assessed: 'Vurdert',
};

/** "Karakter 5" or "Uten karakter". */
export function gradeLabel(grade: Grade | undefined): string {
  return grade === undefined ? 'Uten karakter' : `Karakter ${grade}`;
}

/** "man. 23. nov. kl. 12:00", or "Frist man. 23. nov. kl. 23:59" for a hand-in. */
export function whenLabel(assessment: Assessment): string {
  const day = formatDayShort(assessment.date);
  const time = assessment.time ? ` kl. ${assessment.time}` : '';
  return isHandIn(assessment) ? `Frist ${day}${time}` : `${day}${time}`;
}

/** "i dag", "i morgen", "om 5 dager"; past dates read "for 2 dager siden". */
export function daysLeftLabel(assessment: Assessment, now: Date): string {
  return formatDaysUntil(assessment.date, now);
}

/** The week heading for the upcoming list: "Denne uken", "Neste uke", "Uke 50". */
export function weekLabel(date: string, now: Date): string {
  const weeks = Math.round(daysUntil(startOfWeekISO(date), startOfWeekISO(now)) / 7);
  if (weeks === 0) return 'Denne uken';
  if (weeks === 1) return 'Neste uke';
  return `Uke ${isoWeek(date)}`;
}

/** "1 vurdering", "3 vurderinger". */
export function formatAssessmentCount(count: number): string {
  return `${count} ${count === 1 ? 'vurdering' : 'vurderinger'}`;
}

/** Big line and one sentence for an assessment without a result. */
export function pendingText(assessment: Assessment, now: Date): { heading: string; body: string } {
  const status = assessmentStatus(assessment, now);
  const past = isPast(assessment, now);
  switch (status) {
    case 'overdue':
      return {
        heading: 'Fristen har gått ut',
        body: 'Innleveringen er ikke markert som levert. Lever så fort du kan, eller snakk med læreren om en ny frist.',
      };
    case 'awaiting':
      return {
        heading: 'Venter på vurdering',
        body: 'Læreren har ikke lagt inn vurderingen ennå. Den dukker opp her når den er klar.',
      };
    case 'submitted':
      return past
        ? { heading: 'Levert', body: 'Læreren har ikke vurdert innleveringen ennå. Den dukker opp her når den er klar.' }
        : { heading: daysLeftLabel(assessment, now), body: 'Du har markert innleveringen som levert. Bra jobba.' };
    default:
      return {
        heading: daysLeftLabel(assessment, now),
        body: isHandIn(assessment)
          ? 'Marker innleveringen som levert når du har levert den.'
          : 'Se under hva du blir vurdert på, så vet du hva du bør øve på.',
      };
  }
}
