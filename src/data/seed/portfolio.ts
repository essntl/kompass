import { addDays, isWeekend } from 'date-fns';
import type { CompetenceDescription, PortfolioEntry } from '@shared/types';
import { toISODate } from '@/lib/date';
import { SUBJECT_IDS } from './subjects';

interface SeedEntry {
  id: string;
  title: string;
  note: string;
  /** Days before "now" the work was done. */
  daysAgo: number;
  subjectId: string;
  photo: string;
  tags: string[];
  competence: Omit<CompetenceDescription, 'generatedAt' | 'mock'>;
}

const ENTRIES: SeedEntry[] = [
  {
    id: 'pe-weld',
    title: 'Buttsveis med MAG',
    note: 'Sveiset sammen to stålplater på 5 mm med MAG. De første strengene ble ujevne fordi jeg førte pistolen for fort. På tredje forsøk holdt jeg jevn fart og fikk en streng uten porer. Hilde sjekket sveisen og sa den var godkjent.',
    daysAgo: 9,
    subjectId: SUBJECT_IDS.pt,
    photo: 'asset:/seed/portfolio/weld.svg',
    tags: ['sveising', 'MAG', 'HMS'],
    competence: {
      summary:
        'Jeg har sveiset en buttskjøt i 5 mm stålplate med MAG. Etter å ha justert farten fikk jeg en jevn og tett sveis.',
      whatWasDone:
        'Jeg klargjorde platene, heftet dem sammen og sveiset skjøten med MAG. Underveis justerte jeg farten og vinkelen på pistolen. Til slutt kontrollerte jeg sveisen sammen med læreren.',
      skills: ['MAG-sveising', 'Klargjøring og hefting', 'Visuell kontroll av sveis', 'Bruk av verneutstyr'],
      suggestedGoals: [
        {
          text: 'Bruke sammenføyningsmetoder som passer til materialet og oppdraget',
          why: 'Du valgte MAG og tilpasset teknikken til 5 mm stålplate.',
        },
        {
          text: 'Arbeide i tråd med regler for helse, miljø og sikkerhet',
          why: 'Du brukte sveisehjelm, hansker og avsug under arbeidet.',
        },
      ],
    },
  },
  {
    id: 'pe-circuit',
    title: 'Start/stopp-styring med kontaktor',
    note: 'Koblet en start/stopp-styring med kontaktor, to trykknapper og signallampe etter koblingsskjema. Lampa lyste ikke første gang. Jeg målte meg fram med multimeter og fant en løs leder på kontaktoren. Etterpå virket holdekretsen som den skulle.',
    daysAgo: 16,
    subjectId: SUBJECT_IDS.kst,
    photo: 'asset:/seed/portfolio/circuit.svg',
    tags: ['styring', 'kobling', 'feilsøking'],
    competence: {
      summary:
        'Jeg har koblet og testet en start/stopp-styring med kontaktor etter skjema. Da kretsen ikke virket, fant jeg feilen selv med multimeter.',
      whatWasDone:
        'Jeg leste koblingsskjemaet, monterte komponentene på skinne og koblet styrestrømmen. Da lampa ikke lyste, målte jeg spenningen punkt for punkt og fant en løs leder. Jeg rettet feilen og testet at start, stopp og holdekrets virket.',
      skills: ['Lese koblingsskjema', 'Koble styrestrømskrets', 'Feilsøking med multimeter', 'Funksjonstesting'],
      suggestedGoals: [
        {
          text: 'Koble og teste enkle styringssystemer etter skjema',
          why: 'Du bygde en styring med kontaktor, trykknapper og signallampe ut fra et koblingsskjema.',
        },
        {
          text: 'Feilsøke systematisk og rette feil',
          why: 'Du målte deg fram til den løse lederen i stedet for å koble alt på nytt.',
        },
      ],
    },
  },
  {
    id: 'pe-lathe',
    title: 'Dreid aksel med to diametre',
    note: 'På utplassering fikk jeg dreie en aksel i automatstål etter tegning. Jeg spente opp emnet, plandreide enden og dreide to diametre med ansats. Målte med skyvelære og mikrometer. Den minste diameteren ble 19,98 mm, og toleransen var ±0,05.',
    daysAgo: 24,
    subjectId: SUBJECT_IDS.yff,
    photo: 'asset:/seed/portfolio/lathe.svg',
    tags: ['dreiing', 'måling', 'toleranser'],
    competence: {
      summary:
        'Jeg har dreid en aksel med to diametre i dreiebenk etter tegning, og holdt målene innenfor toleransen på ±0,05 mm.',
      whatWasDone:
        'Jeg spente opp emnet i kjoksen, plandreide enden og lengdedreide to diametre med ansats. Underveis målte jeg med skyvelære, og til slutt kontrollerte jeg diametrene med mikrometer.',
      skills: [
        'Oppspenning i dreiebenk',
        'Plandreiing og lengdedreiing',
        'Måling med skyvelære og mikrometer',
        'Lese arbeidstegning',
      ],
      suggestedGoals: [
        {
          text: 'Bearbeide materialer med maskiner og verktøy etter tegning',
          why: 'Du dreide akselen etter mål og toleranser fra en arbeidstegning.',
        },
        {
          text: 'Måle og kontrollere eget arbeid mot krav og toleranser',
          why: 'Du brukte mikrometer og dokumenterte at diameteren ble 19,98 mm.',
        },
      ],
    },
  },
  {
    id: 'pe-box',
    title: 'Boks i tynnplate',
    note: 'Tegnet utfoldingen på en 1 mm stålplate, klipte ut og bøyde fire sider i knekkemaskinen. Hjørnene festet jeg med popnagler. Jeg bommet litt på bøyefradraget på den første siden, så jeg målte opp på nytt før jeg bøyde resten.',
    daysAgo: 38,
    subjectId: SUBJECT_IDS.pt,
    photo: 'asset:/seed/portfolio/box.svg',
    tags: ['platearbeid', 'bøying', 'oppmerking'],
    competence: {
      summary:
        'Jeg har laget en boks i 1 mm stålplate fra utfolding til ferdig naglet produkt, og rettet opp en målefeil underveis.',
      whatWasDone:
        'Jeg merket opp utfoldingen på plata, klipte den ut og bøyde sidene i knekkemaskin. Hjørnene ble boret og festet med popnagler. Etter den første bøyen kontrollmålte jeg og justerte for bøyefradraget.',
      skills: ['Oppmerking og utfolding', 'Klipping og bøying av tynnplate', 'Sammenføyning med popnagler', 'Kontrollmåling'],
      suggestedGoals: [
        {
          text: 'Planlegge og gjennomføre et arbeidsoppdrag etter tegning',
          why: 'Du gikk fra tegning og utfolding til et ferdig produkt.',
        },
        {
          text: 'Velge og bruke verktøy og maskiner til å forme materialer',
          why: 'Du brukte platesaks, knekkemaskin og popnagletang på riktig sted i jobben.',
        },
      ],
    },
  },
  {
    id: 'pe-vice',
    title: 'Filing av stålkloss til mål',
    note: 'Første oppgave i verkstedet. Jeg sagde av en kloss i flattstål, spente den i skrustikka og filte den til 60 × 40 mm. Sjekket vinklene med vinkelhake. Det tok lengre tid enn jeg trodde å få flatene helt plane.',
    daysAgo: 54,
    subjectId: SUBJECT_IDS.pt,
    photo: 'asset:/seed/portfolio/vice.svg',
    tags: ['håndverktøy', 'filing', 'måling'],
    competence: {
      summary:
        'Jeg har saget og filt en stålkloss til 60 × 40 mm med håndverktøy, og kontrollert mål og vinkler selv.',
      whatWasDone:
        'Jeg merket opp og sagde emnet med baufil, spente det i skrustikke og filte flatene plane. Målene sjekket jeg med skyvelære, og vinklene med vinkelhake.',
      skills: ['Saging og filing', 'Oppspenning i skrustikke', 'Måling med skyvelære og vinkelhake', 'Nøyaktighet'],
      suggestedGoals: [
        {
          text: 'Bruke håndverktøy på en sikker og riktig måte',
          why: 'Du brukte baufil og fil, og spente emnet forsvarlig før du begynte.',
        },
        {
          text: 'Vurdere kvaliteten på eget arbeid',
          why: 'Du kontrollerte mål og vinkler og jobbet videre til flatene var plane.',
        },
      ],
    },
  },
];

/** Asset refs used by the seed entries (handy for preloading and tests). */
export const SEED_PORTFOLIO_PHOTOS = ENTRIES.map((entry) => entry.photo);

/** Workshop work happens on school days: a Saturday or Sunday moves back to the Friday. */
function schoolDayOnOrBefore(date: Date): Date {
  let day = date;
  while (isWeekend(day)) day = addDays(day, -1);
  return day;
}

/** Five portfolio entries spread over the two months before `now`, newest first, on weekdays. */
export function buildSeedPortfolio(now: Date = new Date()): PortfolioEntry[] {
  return ENTRIES.map((entry) => {
    const day = schoolDayOnOrBefore(
      addDays(new Date(now.getFullYear(), now.getMonth(), now.getDate()), -entry.daysAgo),
    );
    const createdAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 15, 40).toISOString();
    return {
      id: entry.id,
      title: entry.title,
      note: entry.note,
      date: toISODate(day),
      subjectId: entry.subjectId,
      photo: entry.photo,
      tags: entry.tags,
      competence: { ...entry.competence, generatedAt: createdAt, mock: false },
      createdAt,
    };
  });
}
