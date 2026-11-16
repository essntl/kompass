/**
 * Mock-mode answers for the info corner: canned answers keyed by keywords, each with
 * sources from the curated list. The facts are taken from the pages in
 * shared/infoSources.ts (read 2026-11-16) and kept general on purpose.
 */
import type { RecommendedSource } from '../../shared/types';
import { fallbackSources, resolveSources, type SourcePick } from '../lib/sources';

interface CannedAnswer {
  id: string;
  /** Lower-case stems; a question matches when a word starts with one of them. */
  keywords: string[];
  /** Keywords that count double because they name the topic outright. */
  strong?: string[];
  text: string;
  sources: SourcePick[];
}

export const CANNED_ANSWERS: CannedAnswer[] = [
  {
    id: 'soke-laereplass',
    keywords: ['søke', 'søknad', 'søker', 'frist', 'søknadsfrist', 'vigo', 'formidling'],
    strong: ['læreplass', 'lærlingplass', 'lærebedrift'],
    text:
      'Du søker læreplass på vigo.no. Fristen for lærlinger er vanligvis 1. mars det året du går Vg2.\n\n' +
      'Slik går du fram:\n' +
      '- Logg inn på vigo.no med MinID eller BankID og søk om formidling til læreplass.\n' +
      '- Ta kontakt med bedrifter og opplæringskontor selv også. Send en kort søknad og CV.\n' +
      '- Vær tilgjengelig på telefon. Det er bedriften som velger hvem som får plassen, ofte etter et intervju.\n\n' +
      'Fylkeskommunen prøver å hjelpe deg til en plass, men du er ikke garantert læreplass, så det lønner seg å være tidlig ute.',
    sources: [
      { id: 'vilbli-soke-laereplass', why: 'Forklarer søknaden på vigo.no, fristen og hvordan formidlingen skjer.' },
      { id: 'utdanning-finn-laerebedrift', why: 'Viser hvordan du finner bedrifter du kan kontakte selv.' },
      { id: 'oslo-laerling', why: 'Samler det du trenger som læreplassøker i Oslo.' },
    ],
  },
  {
    id: 'ikke-laereplass',
    keywords: ['alternativ', 'alternativt', 'vg3 i skole', 'fagopplæringskontor', 'fagopplæringskontoret'],
    strong: [
      'ikke får læreplass',
      'ikke fikk læreplass',
      'ikke få læreplass',
      'får ikke læreplass',
      'fikk ikke læreplass',
      'uten læreplass',
      'mangler læreplass',
    ],
    text:
      'Hvis du har søkt læreplass, men ikke får det, har du rett til et annet opplæringstilbud. Ofte er det Vg3 i skole, der du tar det siste året på skolen, gjerne med praksis i en bedrift.\n\n' +
      'For å ha den retten må du ha registrert søknaden om læreplass i Vigo innen fristen, som vanligvis er 1. mars. Det er fylkeskommunen som har ansvaret for opplæringen din.\n\n' +
      '- Fortsett å kontakte bedrifter selv. Mange får læreplass også etter fristen.\n' +
      '- Ta kontakt med fagopplæringskontoret i fylket ditt. De kan fortelle hva som gjelder for faget ditt og hjelpe deg videre.',
    sources: [
      { id: 'utdanning-ikke-laereplass', why: 'Forklarer hva du har krav på hvis du ikke får læreplass.' },
      { id: 'vilbli-soke-laereplass', why: 'Forklarer søknaden i Vigo og fristen du må holde.' },
    ],
  },
  {
    id: 'y-veien',
    keywords: ['ingeniør', 'ingeniørfag', 'høgskole', 'høyskole', 'universitet', 'forkurs'],
    // "Uten påbygging" is the point of Y-veien, so it outweighs the påbygging answer.
    strong: ['y-veien', 'y-vei', 'yveien', 'uten påbygg', 'uten påbygging'],
    text:
      'Y-veien lar deg søke enkelte studier på universitet og høgskole med yrkesfag fra videregående, uten å ta påbygging eller forkurs først.\n\n' +
      'Du må ha relevant yrkeskompetanse, som regel et fagbrev som passer til studiet. Studiene er oftest innen ingeniørfag, realfag og maritime fag.\n\n' +
      'Hvilke studier som har Y-veien, og hvilke fagbrev som gir opptak, er ulikt fra sted til sted. Sjekk studiet du er interessert i, eller spør rådgiveren din.',
    sources: [
      { id: 'utdanning-y-veien', why: 'Forklarer hva Y-veien er og hvem som kan søke.' },
      { id: 'vilbli-pabygg', why: 'Viser den andre veien til studier: påbygging til studiekompetanse.' },
    ],
  },
  {
    id: 'intervju',
    keywords: ['intervju', 'cv', 'søknadstekst', 'presentere', 'ringe', 'kontakte', 'jobbsøk'],
    text:
      'Mange bedrifter kaller inn til intervju før de velger lærling. Det viktigste er å vise at du er interessert og til å stole på.\n\n' +
      '- Les litt om bedriften på forhånd, og tenk gjennom hvorfor du vil ha læreplass akkurat der.\n' +
      '- Ha klare to eller tre eksempler på ting du har laget eller lært. Porteføljen din er fin å vise fram.\n' +
      '- Forbered et par spørsmål du kan stille, for eksempel om arbeidsoppgaver og oppfølging.\n\n' +
      'Når du tar kontakt med en bedrift, sier du hvem du er, hvilket fag du vil bli lærling i, og at du gjerne kommer innom.',
    sources: [
      { id: 'vilbli-soke-laereplass', why: 'Forklarer at bedriften velger lærling selv, ofte etter intervju.' },
      { id: 'utdanning-finn-laerebedrift', why: 'Gir råd om hva du bør si når du kontakter en bedrift.' },
      { id: 'nav-ung-jobb', why: 'Har tips til jobbsøking for deg som mangler erfaring.' },
    ],
  },
  {
    id: 'opplaeringskontor',
    keywords: ['samarbeidsorgan', 'opplæringsring', 'medlemsbedrift'],
    strong: ['opplæringskontor', 'opplæringskontoret', 'opplæringskontorer'],
    text:
      'Et opplæringskontor er et samarbeid mellom flere lærebedrifter. Det offisielle navnet er samarbeidsorgan for lærebedrifter.\n\n' +
      'Kontoret hjelper bedriftene med å finne lærlinger og følger opp både deg og bedriften gjennom læretiden. Det fungerer som et bindeledd mellom bedriftene og fylkeskommunen.\n\n' +
      'Er bedriften du vil til, medlem av et opplæringskontor, er det ofte lurt å kontakte kontoret først. Lærekontrakten skriver du vanligvis med lærebedriften.',
    sources: [
      { id: 'vilbli-opplaeringskontor', why: 'Forklarer hva lærebedrifter og opplæringskontor gjør.' },
      { id: 'utdanning-finn-laerebedrift', why: 'Viser hvordan du ser om en bedrift er medlem av et opplæringskontor.' },
    ],
  },
  {
    id: 'fagbrev',
    keywords: ['fagarbeider', 'bestå', 'stryke', 'stryker'],
    strong: ['fagbrev', 'svennebrev', 'fagprøve', 'fagprøven', 'svenneprøve', 'svenneprøven'],
    text:
      'Fagbrev får du når du har bestått fagprøven på slutten av læretiden. I håndverksfag heter det svennebrev og svenneprøve.\n\n' +
      'Prøven har fire deler: du planlegger arbeidet, gjennomfører det, vurderer det selv og dokumenterer det. Lærebedriften melder deg opp når læretiden nærmer seg slutten.\n\n' +
      'Som hovedregel må du ha bestått fagene fra Vg1 og Vg2 først. Består du ikke prøven, kan du ta den på nytt.',
    sources: [
      { id: 'vilbli-fagprove', why: 'Forklarer hvordan fag- og svenneprøven er bygd opp.' },
      { id: 'vilbli-opplaering-i-bedrift', why: 'Viser hvordan årene på skole og i bedrift fører fram til fagbrev.' },
      { id: 'oslo-laerling', why: 'Lenker til praktisk informasjon om prøven for lærlinger i Oslo.' },
    ],
  },
  {
    id: 'veier',
    keywords: ['vg2', 'vg3', 'videre', 'studere', 'høyskole', 'universitet', 'fagskole', 'bytte', 'omvalg', 'utdanningsløp'],
    strong: ['påbygg', 'påbygging', 'studiekompetanse'],
    text:
      'Det vanlige løpet på yrkesfag er to år på skole (Vg1 og Vg2) og deretter to år som lærling i bedrift. Da ender du med fagbrev eller svennebrev.\n\n' +
      'Vil du studere videre, kan du ta påbygging til generell studiekompetanse. Det kan du gjøre etter Vg2, eller etter at du har fått fagbrev.\n\n' +
      'Noen fag har andre løp, for eksempel et tredje år på skole. Rådgiveren på skolen kan hjelpe deg med å se hva som gjelder for ditt programområde.',
    sources: [
      { id: 'vilbli-opplaering-i-bedrift', why: 'Forklarer løpet med to år på skole og to år i bedrift.' },
      { id: 'vilbli-pabygg', why: 'Viser hvordan du får studiekompetanse med påbygging.' },
      { id: 'utdanning-yrkesfaghandboka', why: 'Lar deg se mulighetene dine ut fra hvor du er i løpet.' },
    ],
  },
  {
    id: 'fravaer',
    keywords: ['borte', 'syk', 'prosent', 'grense', 'egenmelding', 'legeerklæring', 'udokumentert', 'dokumentert', 'skulk'],
    strong: ['fravær', 'fraværet', 'fraværsgrense', 'fraværsgrensen', 'fraværsregler'],
    text:
      'Hovedregelen er at du ikke får karakter i et fag hvis du har mer enn ti prosent fravær i faget. Grensen gjelder for hvert fag for seg, ikke for alt fraværet ditt samlet.\n\n' +
      'Noe fravær teller ikke med når du kan dokumentere det, for eksempel fravær som skyldes helse. Rektor kan i helt spesielle tilfeller godta inntil 15 prosent.\n\n' +
      'Skolen skal varsle deg hvis du står i fare for å miste en karakter. Snakk med kontaktlæreren din tidlig hvis fraværet begynner å bli høyt.',
    sources: [
      { id: 'oslo-fravaersregler', why: 'Forklarer reglene enkelt, med hva som teller og ikke teller.' },
      { id: 'udir-fravaersgrensen', why: 'Er det offisielle rundskrivet med alle detaljene om grensen.' },
      { id: 'elev-rettighetshjelpen', why: 'Kan gi deg råd hvis du mener fraværet er ført feil.' },
    ],
  },
  {
    id: 'lonn',
    keywords: ['betalt', 'betaling'],
    strong: ['lønn', 'lønna', 'lønnen', 'lærlinglønn', 'tjene', 'tjener'],
    text:
      'Som lærling får du lønn, og den øker utover i læretiden. I det vanlige løpet med to år i bedrift regnes den ofte slik, i prosent av begynnerlønnen i faget:\n\n' +
      '- første halvår: 30 prosent\n' +
      '- andre halvår: 40 prosent\n' +
      '- tredje halvår: 50 prosent\n' +
      '- fjerde halvår: 80 prosent\n\n' +
      'Hvor mye det blir i kroner, vet jeg ikke sikkert, for det varierer med fag og tariffavtale. Lønnen din skal stå i arbeidsavtalen.',
    sources: [
      { id: 'utdanning-laerlinglonn', why: 'Forklarer hvordan lærlinglønn vanligvis regnes ut.' },
      { id: 'utdanning-kontrakt', why: 'Forklarer arbeidsavtalen, der lønnen din skal stå.' },
      { id: 'lanekassen-laerling', why: 'Viser hva du kan få i stipend i tillegg til lønn.' },
    ],
  },
  {
    id: 'okonomi',
    keywords: ['lån', 'støtte', 'økonomi', 'utstyr', 'borteboer', 'hybel', 'flytte', 'kroner', 'penger'],
    strong: ['stipend', 'stipendet', 'lånekassen', 'utstyrsstipend', 'borteboerstipend'],
    text:
      'Som elev i videregående kan du søke stipend fra Lånekassen. De fleste får utstyrsstipend, som skal hjelpe med å dekke utstyret du trenger på linja di.\n\n' +
      'Bor du borte fra foreldrene dine på grunn av lang skolevei, kan du også få borteboerstipend. Noen får i tillegg stipend som avhenger av inntekten i familien.\n\n' +
      'Du må ha fått skoleplass før du søker, og er du under 18 år, må en forelder eller verge signere avtalen. Hvor mye du får, vet jeg ikke sikkert, for satsene endres hvert år.',
    sources: [
      { id: 'lanekassen-vgs', why: 'Viser hvilke stipend elever under 21 år kan få.' },
      { id: 'lanekassen-laerling', why: 'Forklarer hva som gjelder når du blir lærling.' },
      { id: 'utdanning-laerlinglonn', why: 'Forklarer lønnen du får i læretiden.' },
    ],
  },
  {
    id: 'kontrakt',
    keywords: ['avtale', 'signere', 'heve', 'si opp', 'oppsigelse', 'permisjon', 'prøvetid'],
    strong: ['lærekontrakt', 'lærekontrakten', 'kontrakt', 'kontrakten', 'arbeidsavtale', 'arbeidsavtalen'],
    text:
      'Som lærling skal du ha to skriftlige avtaler. Lærekontrakten gjelder opplæringen din og skal godkjennes av fylkeskommunen. Arbeidsavtalen gjelder jobben, blant annet lønn og arbeidstid.\n\n' +
      'Begge varer til læretiden er over. Skal lærekontrakten heves før den tid, må fylkeskommunen si ja til det.\n\n' +
      'Les gjennom begge avtalene før du signerer, og spør hvis det er noe du ikke forstår.',
    sources: [
      { id: 'utdanning-kontrakt', why: 'Forklarer forskjellen på lærekontrakt og arbeidsavtale.' },
      { id: 'vilbli-laerling', why: 'Går gjennom rettigheter og plikter i læretiden.' },
    ],
  },
  {
    id: 'rettigheter',
    keywords: ['rett', 'krav', 'klage', 'urettferdig', 'ombud', 'plikt', 'plikter', 'arbeidstid', 'ferie', 'overtid', 'mobbing', 'behandlet'],
    strong: ['rettighet', 'rettigheter', 'rettighetene'],
    text:
      'Du har rett til videregående opplæring helt til du har fullført og fått studie- eller yrkeskompetanse. Det gjelder også om du må ta et fag på nytt underveis.\n\n' +
      'Som lærling er du i tillegg arbeidstaker. Da gjelder vanlige regler i arbeidslivet for deg, for eksempel om arbeidstid og ferie, og du har krav på opplæringen som står i læreplanen.\n\n' +
      'Føler du deg urettferdig behandlet, kan du snakke med kontaktlæreren eller rådgiveren. Du kan også få råd hos Elevorganisasjonen.',
    sources: [
      { id: 'vilbli-rett-til-vgo', why: 'Forklarer retten til videregående opplæring og til omvalg.' },
      { id: 'elev-rettighetshjelpen', why: 'Gir råd til elever og lærlinger om rettigheter og plikter.' },
      { id: 'vilbli-laerling', why: 'Forklarer rettigheter og plikter når du er lærling.' },
    ],
  },
  {
    id: 'laerling',
    // The catch-all for apprentice questions: no strong keywords, so a more specific answer wins.
    keywords: ['lærling', 'læretid', 'læretiden', 'bedrift', 'bedriften', 'hverdag', 'hvordan er det'],
    text:
      'Som lærling får du opplæringen din i en bedrift i stedet for på skolen. Du jobber sammen med fagfolk og lærer faget mens du gjør ordentlige arbeidsoppgaver.\n\n' +
      'I starten er det mest opplæring. Etter hvert gjør du mer av arbeidet selv. Du er ansatt i bedriften, får lønn og har både en lærekontrakt og en arbeidsavtale.\n\n' +
      'Læretiden varer vanligvis to år og avsluttes med fag- eller svenneprøve.',
    sources: [
      { id: 'vilbli-laerling', why: 'Forklarer hva det vil si å være lærling.' },
      { id: 'vilbli-opplaering-i-bedrift', why: 'Viser hvordan opplæringen i bedrift er lagt opp.' },
      { id: 'utdanning-yrkesfaghandboka', why: 'Har en egen del for deg som snart skal ut i lære.' },
    ],
  },
];

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

function matches(tokens: string[], question: string, keyword: string): boolean {
  // Phrases and hyphenated names ("ikke får læreplass", "y-veien") match as text.
  if (/[^\p{L}\p{N}]/u.test(keyword)) return question.includes(keyword);
  return tokens.some((token) => token === keyword || (keyword.length >= 5 && token.startsWith(keyword)));
}

/** How many words a keyword has: "ikke får læreplass" names a narrower topic than "læreplass". */
const wordCount = (keyword: string) => keyword.split(/[^\p{L}\p{N}]+/u).filter(Boolean).length;

/**
 * The canned answer with the most keyword hits, or `null` when nothing matches. On a tie
 * the most specific topic wins: the one whose best hit is the longest phrase.
 */
export function pickCannedAnswer(question: string): CannedAnswer | null {
  const lower = question.toLowerCase();
  const tokens = tokenize(question);

  let best: { answer: CannedAnswer; score: number; specificity: number } | null = null;
  for (const answer of CANNED_ANSWERS) {
    const strongHits = (answer.strong ?? []).filter((keyword) => matches(tokens, lower, keyword));
    const hits = answer.keywords.filter((keyword) => matches(tokens, lower, keyword));
    const score = strongHits.length * 3 + hits.length;
    if (score === 0) continue;
    const specificity = Math.max(...[...strongHits, ...hits].map(wordCount));
    if (
      !best ||
      score > best.score ||
      (score === best.score && specificity > best.specificity)
    ) {
      best = { answer, score, specificity };
    }
  }
  return best?.answer ?? null;
}

export const UNKNOWN_ANSWER_TEXT =
  'Det vet jeg ikke helt. Jeg kan best svare på spørsmål om læreplass og lærlingtid, opplæringskontor, fagbrev, veier videre, rettigheter, fravær og økonomi.\n\n' +
  'Prøv gjerne å spørre på en annen måte, eller ta det opp med kontaktlæreren eller rådgiveren din. Under finner du et sted å lete videre.';

export interface MockInfoAnswer {
  text: string;
  sources: RecommendedSource[];
}

export function buildMockInfoAnswer(question: string): MockInfoAnswer {
  const canned = pickCannedAnswer(question);
  if (!canned) return { text: UNKNOWN_ANSWER_TEXT, sources: fallbackSources(question) };
  return { text: canned.text, sources: resolveSources(canned.sources, question) };
}
