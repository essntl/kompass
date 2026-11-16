import type { Teacher } from '@shared/types';
import { SUBJECT_IDS } from './subjects';

/** Fictional teachers. Ids are stable: seed classes, threads and messages refer to them. */
export const TEACHER_IDS = {
  hilde: 't-hilde',
  morten: 't-morten',
  ingrid: 't-ingrid',
  amir: 't-amir',
  kristian: 't-kristian',
} as const;

/** The role text the absence logic looks for when it needs the contact teacher. */
export const CONTACT_TEACHER_ROLE = 'Kontaktlærer';

export const SEED_TEACHERS: Teacher[] = [
  {
    id: TEACHER_IDS.hilde,
    name: 'Hilde Bakken',
    role: CONTACT_TEACHER_ROLE,
    subjectIds: [SUBJECT_IDS.pt],
    color: 1,
  },
  {
    id: TEACHER_IDS.morten,
    name: 'Morten Aasen',
    role: 'Faglærer og YFF-ansvarlig',
    subjectIds: [SUBJECT_IDS.kst, SUBJECT_IDS.yff],
    color: 4,
  },
  {
    id: TEACHER_IDS.ingrid,
    name: 'Ingrid Solheim',
    role: 'Faglærer',
    subjectIds: [SUBJECT_IDS.norsk, SUBJECT_IDS.engelsk],
    color: 6,
  },
  {
    id: TEACHER_IDS.amir,
    name: 'Amir Rahimi',
    role: 'Faglærer',
    subjectIds: [SUBJECT_IDS.matematikk, SUBJECT_IDS.naturfag],
    color: 5,
  },
  {
    id: TEACHER_IDS.kristian,
    name: 'Kristian Dahl',
    role: 'Faglærer',
    subjectIds: [SUBJECT_IDS.kroppsoving],
    color: 7,
  },
];
