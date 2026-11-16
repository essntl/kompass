import type { Subject } from '@shared/types';

/**
 * Subjects for VG1 Teknologi- og industrifag: the two programme subjects, YFF and the
 * common core subjects. Ids are stable: the timetable, teachers and portfolio refer to them.
 */
export const SUBJECT_IDS = {
  pt: 'subj-pt',
  kst: 'subj-kst',
  yff: 'subj-yff',
  norsk: 'subj-norsk',
  engelsk: 'subj-engelsk',
  matematikk: 'subj-matematikk',
  naturfag: 'subj-naturfag',
  kroppsoving: 'subj-kroppsoving',
} as const;

export const SEED_SUBJECTS: Subject[] = [
  { id: SUBJECT_IDS.pt, name: 'Produksjon og tjenester', short: 'Prod', color: 1, vocational: true },
  {
    id: SUBJECT_IDS.kst,
    name: 'Konstruksjons- og styringsteknikk',
    short: 'Konstr',
    color: 4,
    vocational: true,
  },
  { id: SUBJECT_IDS.yff, name: 'Yrkesfaglig fordypning', short: 'YFF', color: 2, vocational: true },
  { id: SUBJECT_IDS.norsk, name: 'Norsk', short: 'Norsk', color: 3, vocational: false },
  { id: SUBJECT_IDS.engelsk, name: 'Engelsk', short: 'Eng', color: 6, vocational: false },
  { id: SUBJECT_IDS.matematikk, name: 'Matematikk 1P-Y', short: 'Matte', color: 5, vocational: false },
  { id: SUBJECT_IDS.naturfag, name: 'Naturfag', short: 'Natf', color: 8, vocational: false },
  { id: SUBJECT_IDS.kroppsoving, name: 'Kroppsøving', short: 'Krø', color: 7, vocational: false },
];
