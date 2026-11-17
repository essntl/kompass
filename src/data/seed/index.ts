/** Seed data for the demo. Everything dated is generated relative to a "now" passed in. */
export { SEED_HOME, SEED_PLACEMENT, SEED_SCHOOL, SEED_SCHOOL_NAME } from './places';
export { SEED_SUBJECTS, SUBJECT_IDS } from './subjects';
export { CONTACT_TEACHER_ROLE, SEED_TEACHERS, TEACHER_IDS } from './teachers';
export {
  SEED_PLACEMENT_NAME,
  SEED_WEEK,
  SEED_WEEKS_AHEAD,
  SEED_WEEKS_BEFORE,
  buildSeedClasses,
  buildSeedCustomEvents,
  buildSeedEvents,
  seedClassId,
  seedRangeEnd,
  seedRangeStart,
} from './timetable';
export { SEED_UNREAD_THREAD_ID, buildSeedMessages, threadIdFor } from './messages';
export { SEED_PORTFOLIO_PHOTOS, buildSeedPortfolio } from './portfolio';
export { SEED_SAVED_LISTING_IDS, buildSeedListings } from './listings';
export {
  SEED_OVERDUE_ASSESSMENT_ID,
  SEED_SUBMITTED_ASSESSMENT_ID,
  buildSeedAssessments,
} from './assessments';
