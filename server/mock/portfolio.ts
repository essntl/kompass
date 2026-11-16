/**
 * Mock-mode competence description: a template filled from the entry's title, note and
 * programme. No image analysis – the photo is ignored in mock mode.
 */
import type { PortfolioDescribeRequest } from '../../shared/api';
import type { CompetenceDescription, SuggestedGoal } from '../../shared/types';
import { asFirstPerson, joinList, leadSentences, lowerFirst } from './text';

/** Stems found in the title or note → the skill they point to. Order = priority. */
const SKILL_RULES: Array<[RegExp, string]> = [
  [/sveis/u, 'Sveising'],
  [/lodd(?:e|et|ing)/u, 'Lodding'],
  [/(?<!\p{L})(?:drei|fres)|maskiner/u, 'Maskinering'],
  [/tegning|skisse/u, 'Tegningslesing'],
  [/(?<!\p{L})mål(?:te|e|ing|t)(?!\p{L})|oppmerk|skyvelære|vater/u, 'Måling og oppmerking'],
  [/(?<!\p{L})(?:kapp|sag(?:et|de|ing)(?!\p{L})|kutt|klipp)/u, 'Kapping og tilpasning'],
  [/(?<!\p{L})bor(?:et|ing|e)(?!\p{L})|gjeng(?:e|et|ing)/u, 'Boring og gjenging'],
  [/(?<!\p{L})(?:slip|puss|fil(?:te|ing)(?!\p{L}))/u, 'Sliping og etterarbeid'],
  [/monter|sammenstill|(?<!\p{L})skru/u, 'Montering'],
  [/kobl|ledning|krets|elektri/u, 'Kobling av kretser'],
  [/feilsøk|feilret/u, 'Feilsøking'],
  [/vedlikehold|(?<!\p{L})service|oljeskift|smør(?:e|ing)/u, 'Vedlikehold'],
  [/snekr|treverk|reisverk|panel|listverk/u, 'Trearbeid'],
  [/(?<!\p{L})mur|betong|forskal/u, 'Mur og betong'],
  [/(?<!\p{L})rør|kobberrør|pex/u, 'Rørarbeid'],
  [/(?<!\p{L})mal(?:te|ing|e)(?!\p{L})|lakk|overflate|grunn(?:et|ing)(?!\p{L})/u, 'Overflatebehandling'],
  [/(?<!\p{L})(?:kok|stek|bak(?:te|ing|e)(?!\p{L}))|meny|råvare/u, 'Tilberedning av mat'],
  [/hygiene|renhold|(?<!\p{L})vask/u, 'Hygiene og renhold'],
  [/(?<!\p{L})kunde|(?<!\p{L})salg|butikk|resepsjon/u, 'Kundeservice'],
  [/pasient|beboer|(?<!\p{L})stell|omsorg/u, 'Omsorg og kommunikasjon'],
  [/(?<!\p{L})cad(?!\p{L})|3d|programmer|(?<!\p{L})kode|digital/u, 'Digitale verktøy'],
  [/kontroll|toleranse|kvalitet/u, 'Kvalitetskontroll'],
  [/dokument|rapport|(?<!\p{L})logg/u, 'Dokumentasjon'],
  [/planla|planlegg|planen|rekkefølge/u, 'Planlegging av arbeid'],
  [/(?<!\p{L})hms(?!\p{L})|verneutstyr|vernebriller|sikkerhet|hørselvern/u, 'HMS og verneutstyr'],
  [/samarbeid|gruppe|sammen med|makker/u, 'Samarbeid'],
];

const GENERIC_SKILLS = ['Praktisk arbeid', 'Nøyaktighet', 'Arbeid etter beskrivelse', 'Egenvurdering'];

interface GoalTemplate {
  text: string;
  /** Conditional on purpose: the mock cannot know what the student actually did. */
  why: string;
}

/** Cautiously worded goal suggestions per programme. Paraphrases, never curriculum quotes. */
const PROGRAMME_GOALS: Array<[RegExp, GoalTemplate[]]> = [
  [
    /teknologi|industri|tip\b|tif\b/u,
    [
      {
        text: 'Kan handle om å planlegge og gjennomføre et arbeid etter tegninger og beskrivelser.',
        why: 'Hvis du fulgte en tegning eller arbeidsbeskrivelse her, kan det passe med dette målet.',
      },
      {
        text: 'Kan handle om å bruke verktøy, maskiner og måleutstyr på en trygg måte.',
        why: 'Hvis du brukte verktøy eller maskiner i verkstedet, kan det henge sammen med dette.',
      },
      {
        text: 'Kan handle om å vurdere kvaliteten på eget arbeid og foreslå forbedringer.',
        why: 'Hvis du så over resultatet etterpå, kan det passe her.',
      },
    ],
  ],
  [
    /bygg|anlegg/u,
    [
      {
        text: 'Kan handle om å planlegge og utføre et arbeid etter tegninger og arbeidsbeskrivelser.',
        why: 'Hvis du bygde etter en tegning eller plan, kan det passe med dette målet.',
      },
      {
        text: 'Kan handle om å velge og bruke materialer og verktøy som passer til oppgaven.',
        why: 'Hvis du valgte verktøy og materialer selv, kan det henge sammen med dette.',
      },
      {
        text: 'Kan handle om å arbeide i tråd med regler for helse, miljø og sikkerhet.',
        why: 'Praktisk arbeid i verkstedet handler også om sikkerhet, så det kan passe her.',
      },
    ],
  ],
  [
    /elektro|data/u,
    [
      {
        text: 'Kan handle om å planlegge, koble og kontrollere enkle elektriske anlegg eller systemer.',
        why: 'Hvis du koblet og testet det du laget, kan det passe med dette målet.',
      },
      {
        text: 'Kan handle om å måle og feilsøke på en trygg og systematisk måte.',
        why: 'Hvis du kontrollerte at arbeidet virket, kan det henge sammen med dette.',
      },
      {
        text: 'Kan handle om å dokumentere arbeidet med tegninger, skjemaer eller bilder.',
        why: 'Du har lagt arbeidet inn i porteføljen, og det kan passe her.',
      },
    ],
  ],
  [
    /helse|oppvekst/u,
    [
      {
        text: 'Kan handle om å kommunisere og samhandle med mennesker i ulike situasjoner.',
        why: 'Hvis oppføringen handler om et møte med andre mennesker, kan det passe med dette målet.',
      },
      {
        text: 'Kan handle om å følge regler for hygiene og sikkerhet i arbeidet.',
        why: 'Hvis du måtte tenke på hygiene eller sikkerhet, kan det henge sammen med dette.',
      },
    ],
  ],
  [
    /restaurant|mat/u,
    [
      {
        text: 'Kan handle om å planlegge og tilberede mat etter oppskrift og med gode råvarer.',
        why: 'Hvis du laget en rett eller et produkt selv, kan det passe med dette målet.',
      },
      {
        text: 'Kan handle om å følge regler for hygiene og mattrygghet.',
        why: 'Arbeid på kjøkkenet handler også om hygiene, så det kan passe her.',
      },
    ],
  ],
  [
    /salg|service|reiseliv/u,
    [
      {
        text: 'Kan handle om å møte kunder på en profesjonell måte og finne ut hva de trenger.',
        why: 'Hvis oppføringen handler om kunder eller gjester, kan det passe med dette målet.',
      },
      {
        text: 'Kan handle om å planlegge og gjennomføre en arbeidsoppgave og vurdere resultatet.',
        why: 'Hvis du gjennomførte oppgaven og så på hvordan det gikk, kan det henge sammen med dette.',
      },
    ],
  ],
];

const DEFAULT_GOALS: GoalTemplate[] = [
  {
    text: 'Kan handle om å planlegge, gjennomføre og dokumentere en praktisk arbeidsoppgave.',
    why: 'Oppføringen beskriver en praktisk oppgave, og det kan passe med dette målet.',
  },
  {
    text: 'Kan handle om å vurdere eget arbeid og hva som kan gjøres bedre neste gang.',
    why: 'Når du beskriver arbeidet ditt i porteføljen, kan det henge sammen med dette.',
  },
];

export function detectSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const skills = SKILL_RULES.filter(([pattern]) => pattern.test(lower)).map(([, skill]) => skill);
  for (const generic of GENERIC_SKILLS) {
    if (skills.length >= 3) break;
    skills.push(generic);
  }
  return [...new Set(skills)].slice(0, 6);
}

function goalsFor(programme: string): SuggestedGoal[] {
  const lower = programme.toLowerCase();
  const match = PROGRAMME_GOALS.find(([pattern]) => pattern.test(lower));
  return (match?.[1] ?? DEFAULT_GOALS).slice(0, 2).map(({ text, why }) => ({ text, why }));
}

/** The note's first sentences; a first sentence without a subject ("Sveiset …") gets "Jeg". */
function notePart(note: string): string {
  const [first = '', ...rest] = leadSentences(note, 3).split(/(?<=[.!?])\s+/);
  return [asFirstPerson(first) || first, ...rest].join(' ');
}

export function buildMockCompetence(request: PortfolioDescribeRequest): CompetenceDescription {
  const title = request.title.trim();
  const note = request.note.trim();
  const skills = detectSkills(`${title} ${note}`);
  const area = request.subject?.trim() || request.programme.trim() || 'yrkesfag';

  const summary =
    `Arbeidet «${title}» viser at jeg kan gjennomføre en praktisk oppgave i ${lowerFirst(area)}, ` +
    `med vekt på ${joinList(skills.slice(0, 2).map(lowerFirst))}.`;

  // Only the student's own words: the mock must not add steps the student never described.
  const whatWasDone = note
    ? `Jeg jobbet med oppgaven «${title}». ${notePart(note)}`
    : `Jeg jobbet med oppgaven «${title}». Legg til et notat om hva du gjorde, så blir beskrivelsen mer presis.`;

  return {
    summary,
    whatWasDone,
    skills,
    suggestedGoals: goalsFor(request.programme),
    generatedAt: new Date().toISOString(),
    mock: true,
  };
}
