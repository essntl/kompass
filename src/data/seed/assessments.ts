import { addDays } from 'date-fns';
import type { Assessment, AssessmentKind, AssessmentResult, Grade, ISODate } from '@shared/types';
import { addDaysISO, startOfWeekISO, toDate, toISODate } from '@/lib/date';
import { SUBJECT_IDS } from './subjects';
import { TEACHER_IDS } from './teachers';

/**
 * Assessments for the demo student (Vg1 Teknologi- og industrifag).
 *
 * Every date is placed on a school day relative to the week the app is opened in:
 * `week` 0 is the current week (Monday-based), `day` 0 is Monday. Upcoming ones sit in
 * weeks 1–4 so they are always in the future, whatever weekday it is today; past ones sit
 * in weeks −10 to −1. The times match the lessons in the seed timetable.
 */
interface SeedResult {
  grade?: Grade;
  feedback: string;
  nextSteps?: string;
  /** School days after the assessment that the result came back. */
  after: number;
}

interface SeedAssessment {
  id: string;
  subjectId: string;
  teacherId: string;
  title: string;
  kind: AssessmentKind;
  week: number;
  day: 0 | 1 | 2 | 3 | 4;
  time: string;
  description: string;
  goals: string[];
  submitted?: boolean;
  result?: SeedResult;
}

/** Hand-ins are due at the end of the day. */
const DUE = '23:59';

const ASSESSMENTS: SeedAssessment[] = [
  // ------------------------------------------------------------ upcoming
  {
    id: 'a-matte-likninger',
    subjectId: SUBJECT_IDS.matematikk,
    teacherId: TEACHER_IDS.amir,
    title: 'Prøve i likninger og formler',
    kind: 'prove',
    week: 1,
    day: 0,
    time: '12:00',
    description:
      'Prøven varer i 90 minutter. Du får oppgaver der du løser likninger og bruker formler fra verkstedet, for eksempel for areal og volum. Ett A4-ark med egne notater er lov, og du kan bruke kalkulator.',
    goals: [
      'Løse likninger og bruke formler i praktiske situasjoner',
      'Bruke regnestrategier og vurdere om svaret er rimelig',
    ],
  },
  {
    id: 'a-pt-loggbok',
    subjectId: SUBJECT_IDS.pt,
    teacherId: TEACHER_IDS.hilde,
    title: 'Loggbok fra sveiseperioden',
    kind: 'innlevering',
    week: 1,
    day: 2,
    time: DUE,
    description:
      'Lever loggboken fra de tre siste ukene i verkstedet. Beskriv hva du gjorde, hvilket verneutstyr du brukte, og hva du ville gjort annerledes neste gang. Legg ved minst to bilder.',
    goals: [
      'Dokumentere eget arbeid og vurdere kvaliteten på det',
      'Følge regler for helse, miljø og sikkerhet i verkstedet',
    ],
    submitted: true,
  },
  {
    id: 'a-engelsk-presentasjon',
    subjectId: SUBJECT_IDS.engelsk,
    teacherId: TEACHER_IDS.ingrid,
    title: 'Muntlig presentasjon om et yrke',
    kind: 'muntlig',
    week: 2,
    day: 1,
    time: '09:55',
    description:
      'Hold en presentasjon på engelsk på 4–5 minutter om et yrke du er nysgjerrig på. Fortell hva jobben går ut på, hvilken utdanning som trengs, og hvorfor du synes den er spennende. Etterpå får du et par spørsmål fra læreren.',
    goals: [
      'Presentere et faglig tema muntlig på engelsk',
      'Bruke fagord fra eget utdanningsprogram',
      'Svare på spørsmål og holde en samtale i gang',
    ],
  },
  {
    id: 'a-kst-relestyring',
    subjectId: SUBJECT_IDS.kst,
    teacherId: TEACHER_IDS.morten,
    title: 'Praktisk prøve: styrekrets med relé',
    kind: 'praktisk',
    week: 2,
    day: 4,
    time: '08:15',
    description:
      'Du kobler opp en enkel styrekrets med start- og stoppknapp og et relé etter skjemaet du får utdelt. Du tester kretsen selv og forklarer for læreren hvordan den virker. Ta med vernebriller.',
    goals: [
      'Koble og teste enkle elektriske styringer etter koblingsskjema',
      'Måle spenning og strøm og forklare resultatene',
      'Arbeide sikkert med elektrisk utstyr',
    ],
  },
  {
    id: 'a-norsk-novelle',
    subjectId: SUBJECT_IDS.norsk,
    teacherId: TEACHER_IDS.ingrid,
    title: 'Novelle om en arbeidsdag',
    kind: 'innlevering',
    week: 3,
    day: 0,
    time: DUE,
    description:
      'Skriv en novelle på 600–900 ord som foregår i løpet av én arbeidsdag. Bruk minst to av virkemidlene vi har jobbet med, for eksempel tilbakeblikk og åpen slutt. Leveres i Word eller PDF.',
    goals: [
      'Skrive fortellende tekster og bruke litterære virkemidler',
      'Planlegge, skrive og bearbeide egne tekster',
    ],
  },
  {
    id: 'a-yff-fagsamtale',
    subjectId: SUBJECT_IDS.yff,
    teacherId: TEACHER_IDS.morten,
    title: 'Fagsamtale om utplasseringen',
    kind: 'fagsamtale',
    week: 3,
    day: 3,
    time: '14:00',
    description:
      'En samtale på cirka 20 minutter ute hos Tellverk Mekaniske, sammen med veilederen din der. Ta med loggboken og fortell om oppgavene du har hatt, hva du har lært og hvilket lærefag du vurderer.',
    goals: [
      'Beskrive arbeidsoppgaver i et lærefag og hvilke krav de stiller',
      'Reflektere over egen læring i arbeidslivet',
    ],
  },

  // ------------------------------------------------------------ overdue
  {
    id: 'a-naturfag-labrapport',
    subjectId: SUBJECT_IDS.naturfag,
    teacherId: TEACHER_IDS.amir,
    title: 'Labrapport: energi og effekt',
    kind: 'innlevering',
    week: -1,
    day: 2,
    time: DUE,
    description:
      'Skriv rapport fra forsøket der vi målte effekten til en vannkoker. Rapporten skal ha hypotese, utstyrsliste, framgangsmåte, resultater i tabell og en kort drøfting av feilkilder.',
    goals: [
      'Planlegge og gjennomføre forsøk og skrive rapport',
      'Gjøre rede for energi, effekt og virkningsgrad',
    ],
  },

  // ------------------------------------------------------------ held, not assessed yet
  {
    id: 'a-kst-ohm',
    subjectId: SUBJECT_IDS.kst,
    teacherId: TEACHER_IDS.morten,
    title: 'Fagsamtale: Ohms lov og måling',
    kind: 'fagsamtale',
    week: -1,
    day: 4,
    time: '08:15',
    description:
      'En kort samtale ved arbeidsbenken der du forklarer sammenhengen mellom spenning, strøm og motstand, og viser hvordan du måler med multimeter.',
    goals: [
      'Forklare sammenhengen mellom spenning, strøm og motstand',
      'Bruke multimeter riktig og sikkert',
    ],
  },

  // ------------------------------------------------------------ assessed
  {
    id: 'a-pt-dreiing',
    subjectId: SUBJECT_IDS.pt,
    teacherId: TEACHER_IDS.hilde,
    title: 'Dreiing av aksling etter tegning',
    kind: 'praktisk',
    week: -2,
    day: 2,
    time: '12:05',
    description:
      'Drei en aksling i stål etter arbeidstegningen. Du blir vurdert på mål og toleranser, overflate, orden rundt maskinen og hvordan du bruker verneutstyret.',
    goals: [
      'Lese arbeidstegninger og produsere etter mål og toleranser',
      'Bruke maskiner og verktøy på en sikker måte',
    ],
    result: {
      grade: 6,
      feedback:
        'Alle mål var innenfor toleransen, og overflaten ble jevn og fin. Du planla arbeidet godt, målte underveis og holdt det ryddig rundt dreiebenken hele tiden.',
      nextSteps:
        'Neste steg er å jobbe litt raskere uten å miste presisjonen. Prøv å lage en egen plan for rekkefølgen før du starter, så sparer du tid på verktøybytter.',
      after: 2,
    },
  },
  {
    id: 'a-kroppsoving-kondisjon',
    subjectId: SUBJECT_IDS.kroppsoving,
    teacherId: TEACHER_IDS.kristian,
    title: 'Kondisjon og samarbeid i lagidrett',
    kind: 'praktisk',
    week: -2,
    day: 2,
    time: '09:55',
    description:
      'Vurdering gjennom en hel økt med innebandy. Det handler om innsats, samarbeid med laget og hvordan du bruker reglene, ikke om hvem som scorer mest.',
    goals: [
      'Samarbeide med andre og vise fair play i lagidrett',
      'Planlegge og gjennomføre aktivitet som gir bedre kondisjon',
    ],
    result: {
      grade: 5,
      feedback:
        'Du var aktiv hele økta og tok ansvar for å få med deg de andre på laget. Du følger reglene og er god til å oppmuntre medelever.',
      nextSteps: 'Jobb med å ta flere initiativ i oppvarmingen, for eksempel ved å lede en øvelse selv.',
      after: 0,
    },
  },
  {
    id: 'a-matte-maling',
    subjectId: SUBJECT_IDS.matematikk,
    teacherId: TEACHER_IDS.amir,
    title: 'Prøve i måling og enheter',
    kind: 'prove',
    week: -3,
    day: 0,
    time: '12:00',
    description:
      'Prøve i måling, omgjøring mellom enheter og målestokk. Oppgavene er hentet fra verkstedet og tegningene vi har brukt i programfagene.',
    goals: [
      'Gjøre om mellom enheter og bruke målestokk',
      'Bruke regnestrategier og vurdere om svaret er rimelig',
    ],
    result: {
      grade: 4,
      feedback:
        'Et tydelig løft fra forrige prøve. Du gjør om mellom enheter sikkert og viser utregningene ryddig, så det er lett å følge tankegangen din.',
      nextSteps:
        'Sjekk svaret ditt mot virkeligheten: Er en bolt på 3 meter rimelig? En slik kontroll hadde fanget opp to av feilene på prøven.',
      after: 4,
    },
  },
  {
    id: 'a-norsk-muntlig',
    subjectId: SUBJECT_IDS.norsk,
    teacherId: TEACHER_IDS.ingrid,
    title: 'Gruppesamtale om en novelle',
    kind: 'muntlig',
    week: -4,
    day: 0,
    time: '13:40',
    description:
      'Gruppesamtale der dere tolker novellen og diskuterer hvilke virkemidler forfatteren bruker. Hver elev får også ett spørsmål alene.',
    goals: [
      'Lese og tolke skjønnlitteratur',
      'Lytte til andre og bygge videre på det de sier i en samtale',
    ],
    result: {
      grade: 3,
      feedback:
        'Du hadde lest novellen godt og kom med en god tolkning av slutten. I gruppa lyttet du til de andre og holdt deg til temaet.',
      nextSteps:
        'Prøv å begrunne meningene dine med eksempler fra teksten. Når du sier hva du mener, si også hvor i novellen du ser det.',
      after: 1,
    },
  },
  {
    id: 'a-engelsk-tekst',
    subjectId: SUBJECT_IDS.engelsk,
    teacherId: TEACHER_IDS.ingrid,
    title: 'Tekst: My dream job',
    kind: 'innlevering',
    week: -4,
    day: 3,
    time: DUE,
    description:
      'Skriv en tekst på engelsk på cirka 400 ord om drømmejobben din. Bruk avsnitt, og ta med minst fem fagord fra ditt eget utdanningsprogram.',
    goals: [
      'Skrive sammenhengende tekster på engelsk med god struktur',
      'Bruke fagord fra eget utdanningsprogram',
    ],
    submitted: true,
    result: {
      grade: 5,
      feedback:
        'Teksten er personlig og lett å lese, og du bruker fagord som «lathe» og «welding» på riktig måte. Avsnittene har en tydelig rød tråd.',
      nextSteps: 'Varier setningene mer. Mange setninger starter med «I», prøv å begynne noen med tid eller sted.',
      after: 5,
    },
  },
  {
    id: 'a-pt-sveis',
    subjectId: SUBJECT_IDS.pt,
    teacherId: TEACHER_IDS.hilde,
    title: 'Sveiseprøve: kilsveis i stål',
    kind: 'praktisk',
    week: -5,
    day: 0,
    time: '08:15',
    description:
      'Sveis en kilsveis med MAG på stålplate. Vi ser på innbrenning, jevnhet og at du stiller inn apparatet og bruker verneutstyret riktig.',
    goals: [
      'Bruke sveiseutstyr etter gjeldende regler for sikkerhet',
      'Vurdere kvaliteten på eget arbeid',
    ],
    result: {
      grade: 4,
      feedback:
        'God innbrenning og riktig innstilling på apparatet. Du brukte verneutstyret riktig hele tiden og ryddet godt etter deg.',
      nextSteps:
        'Sveisen ble litt ujevn mot slutten. Øv på å holde samme fart og vinkel hele veien, gjerne på restbiter før neste prøve.',
      after: 1,
    },
  },
  {
    id: 'a-naturfag-stoffer',
    subjectId: SUBJECT_IDS.naturfag,
    teacherId: TEACHER_IDS.amir,
    title: 'Prøve i stoffer og kjemiske reaksjoner',
    kind: 'prove',
    week: -5,
    day: 2,
    time: '08:15',
    description: 'Skriftlig prøve om grunnstoffer, kjemiske forbindelser og reaksjoner vi møter i verkstedet, som rust og sveiserøyk.',
    goals: [
      'Gjøre rede for kjemiske reaksjoner i hverdagen og i yrket',
      'Vurdere risiko ved bruk av kjemikalier',
    ],
    result: {
      grade: 3,
      feedback:
        'Du forklarer godt hvorfor stål ruster og hva vi kan gjøre for å hindre det. Svarene om verneutstyr og sveiserøyk var gode.',
      nextSteps:
        'Øv på å skrive enkle reaksjonslikninger. Start med de tre eksemplene i kapittel 4 og sjekk at det er like mange atomer på hver side.',
      after: 4,
    },
  },
  {
    id: 'a-yff-refleksjon',
    subjectId: SUBJECT_IDS.yff,
    teacherId: TEACHER_IDS.morten,
    title: 'Refleksjonslogg fra første utplassering',
    kind: 'innlevering',
    week: -6,
    day: 3,
    time: DUE,
    description:
      'Skriv en kort logg om de første ukene ute i bedrift: hva du har gjort, hva som var vanskelig, og hva du vil lære mer om.',
    goals: ['Reflektere over egen læring i arbeidslivet'],
    submitted: true,
    result: {
      feedback:
        'En ærlig og godt skrevet logg. Det er tydelig at du har vært aktiv og spurt mye. Veilederen din i bedriften sier det samme.',
      nextSteps: 'Skriv neste logg med konkrete eksempler på oppgaver, og hvilke verktøy og maskiner du brukte.',
      after: 3,
    },
  },
  {
    id: 'a-matte-prosent',
    subjectId: SUBJECT_IDS.matematikk,
    teacherId: TEACHER_IDS.amir,
    title: 'Prøve i prosent og forhold',
    kind: 'prove',
    week: -7,
    day: 0,
    time: '12:00',
    description: 'Prøve i prosentregning, forhold og blandinger, med oppgaver fra verksted og privatøkonomi.',
    goals: ['Regne med prosent og forhold i praktiske situasjoner'],
    result: {
      grade: 2,
      feedback:
        'Du får til de enkle prosentoppgavene, og du viser utregningen din. Det gjør det lett å se hvor det går galt.',
      nextSteps:
        'Øv på å finne «hvor mange prosent» med vekstfaktor. Kom gjerne på leksehjelp tirsdag, så går vi gjennom oppgavene fra prøven sammen.',
      after: 4,
    },
  },
  {
    id: 'a-kst-cad',
    subjectId: SUBJECT_IDS.kst,
    teacherId: TEACHER_IDS.morten,
    title: 'Arbeidstegning av brakett i CAD',
    kind: 'praktisk',
    week: -7,
    day: 1,
    time: '12:05',
    description: 'Lag en arbeidstegning i CAD av braketten vi produserer i verkstedet, med riktige mål, snitt og tittelfelt.',
    goals: [
      'Lage enkle arbeidstegninger med digitale verktøy',
      'Bruke standarder for målsetting',
    ],
    result: {
      grade: 3,
      feedback: 'Tegningen har riktig form og de viktigste målene. Tittelfeltet er fylt ut riktig.',
      nextSteps:
        'Noen mål står dobbelt, og to mangler. Gå gjennom tegningen og spør deg selv: Kan noen lage delen bare ut fra dette arket?',
      after: 3,
    },
  },
  {
    id: 'a-norsk-fagartikkel',
    subjectId: SUBJECT_IDS.norsk,
    teacherId: TEACHER_IDS.ingrid,
    title: 'Fagartikkel om et lærefag',
    kind: 'innlevering',
    week: -8,
    day: 4,
    time: DUE,
    description: 'Skriv en fagartikkel på 500–700 ord om et lærefag i ditt utdanningsprogram. Bruk minst to kilder og oppgi dem.',
    goals: [
      'Skrive saktekster med kilder og tydelig struktur',
      'Vurdere og bruke kilder på en kritisk måte',
    ],
    submitted: true,
    result: {
      grade: 4,
      feedback:
        'Artikkelen gir et godt bilde av hvordan det er å være industrimekaniker. Innledningen fanger interessen, og kildene er oppgitt riktig.',
      nextSteps: 'Avslutningen er litt brå. Prøv å runde av med å svare på spørsmålet du stilte i innledningen.',
      after: 5,
    },
  },
  {
    id: 'a-pt-hms',
    subjectId: SUBJECT_IDS.pt,
    teacherId: TEACHER_IDS.hilde,
    title: 'Fagsamtale om HMS i verkstedet',
    kind: 'fagsamtale',
    week: -9,
    day: 2,
    time: '12:05',
    description: 'Samtale om sikkerhet i verkstedet: verneutstyr, risikovurdering og hva du gjør hvis det skjer en ulykke.',
    goals: [
      'Gjøre rede for regler for helse, miljø og sikkerhet',
      'Gjennomføre en enkel risikovurdering',
    ],
    result: {
      grade: 5,
      feedback:
        'Du kan reglene for verneutstyr godt og forklarer hvorfor de finnes. Risikovurderingen av slipemaskinen var grundig.',
      nextSteps: 'Lær deg hvor nødstopp, førstehjelpsutstyr og øyeskylling står i begge verkstedene.',
      after: 0,
    },
  },
];

/** `n` school days (Mon–Fri) after `date`. 0 gives the same day. */
function schoolDaysAfter(date: ISODate, n: number): ISODate {
  let current = toDate(date);
  let left = n;
  while (left > 0) {
    current = addDays(current, 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) left -= 1;
  }
  return toISODate(current);
}

/** Ids of the seeded hand-in that starts as overdue and the upcoming one that starts submitted. */
export const SEED_OVERDUE_ASSESSMENT_ID = 'a-naturfag-labrapport';
export const SEED_SUBMITTED_ASSESSMENT_ID = 'a-pt-loggbok';

/** The demo student's assessments, dated around the week of `now`. */
export function buildSeedAssessments(now: Date = new Date()): Assessment[] {
  const monday = startOfWeekISO(now);
  return ASSESSMENTS.map((seed) => {
    const date = addDaysISO(monday, seed.week * 7 + seed.day);
    const result: AssessmentResult | undefined = seed.result
      ? {
          ...(seed.result.grade ? { grade: seed.result.grade } : {}),
          feedback: seed.result.feedback,
          ...(seed.result.nextSteps ? { nextSteps: seed.result.nextSteps } : {}),
          assessedAt: schoolDaysAfter(date, seed.result.after),
        }
      : undefined;
    return {
      id: seed.id,
      subjectId: seed.subjectId,
      teacherId: seed.teacherId,
      title: seed.title,
      kind: seed.kind,
      date,
      time: seed.time,
      description: seed.description,
      goals: [...seed.goals],
      ...(seed.submitted !== undefined ? { submitted: seed.submitted } : {}),
      ...(result ? { result } : {}),
    };
  });
}
