/**
 * Curated sources for the info corner ("Info-hjørnet").
 *
 * Every URL below was fetched and read on 2026-11-16 (HTTP 200, content matches the
 * summary). The summaries are our own wording of what each page covers; they are sent to
 * the model so it can pick sources, and they are never shown as quotes.
 *
 * Rules when editing this list:
 * - Never add a URL you have not opened and read yourself.
 * - Keep `id`s stable: the server validates the model's picks against them, and the
 *   mock answers in server/mock/info.ts refer to them.
 * - Every `InfoTopicId` must be covered by at least one source (see infoSources.test.ts).
 */
import type { InfoSource, InfoTopicId } from './types';

export const INFO_SOURCES: InfoSource[] = [
  // ------------------------------------------------------------ vilbli.no
  {
    id: 'vilbli-laerling',
    title: 'Lærling',
    url: 'https://www.vilbli.no/nb/no/a/laerling-6',
    publisher: 'vilbli.no (fylkeskommunene)',
    summary:
      'Forklarer hva det vil si å være lærling: du får opplæring og praksis i en bedrift, skriver lærekontrakt og har krav på en skriftlig arbeidsavtale. Siden går gjennom rettigheter og plikter i læretiden, at du er arbeidstaker med regler for arbeidstid og ferie, og at læretiden avsluttes med fag- eller svenneprøve.',
    topics: ['laerling', 'rettigheter'],
  },
  {
    id: 'vilbli-soke-laereplass',
    title: 'Hvordan søker du læreplass?',
    url: 'https://www.vilbli.no/nb/no/a/hvordan-soker-du-laereplass-6',
    publisher: 'vilbli.no (fylkeskommunene)',
    summary:
      'Viser hvordan du søker formidling til læreplass på vigo.no med MinID eller BankID, og at søknadsfristen for lærlinger er 1. mars. Forklarer også hvordan søknaden behandles: fylkeskommunen prøver å formidle deg, men det er bedriften som velger hvem som får plass, ofte etter et intervju.',
    topics: ['soke', 'laerling'],
  },
  {
    id: 'vilbli-opplaeringskontor',
    title: 'Om lærebedrifter og samarbeidsorgan for lærebedrifter (opplæringskontor)',
    url: 'https://www.vilbli.no/nb/no/a/om-laerebedrifter-og-samarbeidsorgan-for-laerebedrifter-opplaeringskontor-6',
    publisher: 'vilbli.no (fylkeskommunene)',
    summary:
      'Forklarer hva en lærebedrift er, og hva et opplæringskontor (samarbeidsorgan for lærebedrifter) gjør: det er et bindeledd mellom bedriftene og fylkeskommunen som hjelper til med å rekruttere og følge opp lærlinger. Beskriver også opplæringsring og hvilke plikter lærebedriften har overfor deg.',
    topics: ['opplaeringskontor', 'laerling'],
  },
  {
    id: 'vilbli-opplaering-i-bedrift',
    title: 'Hvordan foregår opplæring i bedrift?',
    url: 'https://www.vilbli.no/nb/no/a/hvordan-foregar-opplaering-i-bedrift-6',
    publisher: 'vilbli.no (fylkeskommunene)',
    summary:
      'Beskriver hovedmodellen i yrkesfag: to år på skole (Vg1 og Vg2) og deretter to år i bedrift, der det ene året regnes som opplæring og det andre som verdiskaping. Nevner også fag som følger andre løp, for eksempel særløp og fag med Vg3 i skole.',
    topics: ['veier', 'laerling'],
  },
  {
    id: 'vilbli-fagprove',
    title: 'Fag- eller svenneprøve',
    url: 'https://www.vilbli.no/nb/no/a/fag-eller-svenneprove-6',
    publisher: 'vilbli.no (fylkeskommunene)',
    summary:
      'Forklarer fag- eller svenneprøven som avslutter læretiden: den bygger på kompetansemålene i læreplanen og har fire deler – planlegging, gjennomføring, vurdering og dokumentasjon. Sier også hva som skjer hvis du ikke består, og at du som hovedregel må ha bestått fagene fra Vg1 og Vg2 først.',
    topics: ['fagbrev'],
  },
  {
    id: 'vilbli-pabygg',
    title: 'Påbygging til generell studiekompetanse',
    url: 'https://www.vilbli.no/nb/no/a/pabygging-til-generell-studiekompetanse-6',
    publisher: 'vilbli.no (fylkeskommunene)',
    summary:
      'Forklarer hvordan du kan få generell studiekompetanse med Vg3 påbygging, enten etter Vg1 og Vg2 på yrkesfag eller etter at du har fått yrkeskompetanse. Lister opp hvilke fag og timer påbygging består av i de to tilfellene.',
    topics: ['veier'],
  },
  {
    id: 'vilbli-rett-til-vgo',
    title: 'Rett til videregående opplæring',
    url: 'https://www.vilbli.no/nb/no/a/rett-til-videregaende-opplaering-6',
    publisher: 'vilbli.no (fylkeskommunene)',
    summary:
      'Forklarer retten til videregående opplæring: alle som har fullført grunnskolen, har rett til opplæring helt til de har oppnådd studie- eller yrkeskompetanse. Tar også for seg retten til inntak på ett av tre ønskede utdanningsprogram, retten til omvalg og retten til yrkesfaglig rekvalifisering.',
    topics: ['rettigheter', 'veier'],
  },

  // ------------------------------------------------------------ utdanning.no
  {
    id: 'utdanning-finn-laerebedrift',
    title: 'Slik kan du finne en lærebedrift selv',
    url: 'https://utdanning.no/tema/slik_kan_du_finne_en_laerebedrift_selv',
    publisher: 'Utdanning.no',
    summary:
      'Viser steg for steg hvordan du bruker tjenesten Finn lærebedrift til å finne godkjente og mulige lærebedrifter der du bor. Forklarer at du bør kontakte opplæringskontoret hvis bedriften er medlem av et, og ellers bedriften direkte, og hva du bør si når du tar kontakt.',
    topics: ['soke', 'opplaeringskontor'],
  },
  {
    id: 'utdanning-laerlinglonn',
    title: 'Hva får jeg i lønn som lærling?',
    url: 'https://utdanning.no/tema/laerlinger_og_lonn',
    publisher: 'Utdanning.no',
    summary:
      'Forklarer hva du kan forvente i lønn som lærling. I hovedmodellen øker lønnen vanligvis fra 30 prosent av begynnerlønn i første halvår til 80 prosent i fjerde halvår, men den varierer med fag og tariffavtale.',
    topics: ['okonomi', 'laerling'],
  },
  {
    id: 'utdanning-kontrakt',
    title: 'Lærlinger skal ha kontrakt',
    url: 'https://utdanning.no/tema/laerlinger_skal_ha_kontrakt',
    publisher: 'Utdanning.no',
    summary:
      'Forklarer at alle lærlinger skal ha to skriftlige avtaler: en lærekontrakt som fylkeskommunen godkjenner, og en arbeidsavtale med lærebedriften. Tar også opp heving av kontrakten, permisjon og lærlingens plikter og rettigheter.',
    topics: ['laerling', 'rettigheter'],
  },
  {
    id: 'utdanning-yrkesfaghandboka',
    title: 'Yrkesfaghåndboka',
    url: 'https://utdanning.no/yrkesfag',
    publisher: 'Utdanning.no',
    summary:
      'En samleside for deg som går eller vurderer yrkesfag, delt inn etter hvor du er i løpet: vurderer yrkesfag, går Vg1 eller Vg2, er lærling eller har fullført. Lenker videre til verktøy som viser hva du kan bli med ditt utdanningsprogram, og hvor du finner lærebedrifter.',
    topics: ['veier', 'laerling', 'soke'],
  },
  {
    id: 'utdanning-ikke-laereplass',
    title: 'Hva skjer hvis jeg ikke får læreplass?',
    url: 'https://utdanning.no/yrkesfag/gar-du-vg1-eller-vg2-yrkesfag/forbered-deg-pa-laeretiden/hva-hvis-du-ikke-far-laereplass',
    publisher: 'Utdanning.no',
    summary:
      'Forklarer hva du har krav på hvis du har rett til videregående opplæring, men ikke får læreplass: et alternativt opplæringstilbud, ofte Vg3 i skole med praksis i bedrift. Du må ha registrert søknaden i Vigo innen fristen, og fylkeskommunen har ansvaret for opplæringen din.',
    topics: ['veier', 'soke', 'rettigheter'],
  },
  {
    id: 'utdanning-y-veien',
    title: 'Y-veien',
    url: 'https://utdanning.no/tema/yrkesfag_universitet_og_hogskole/y-veien',
    publisher: 'Utdanning.no',
    summary:
      'Om Y-veien, som lar deg søke enkelte studier på universitet og høgskole med yrkesfag fra videregående, uten påbygging eller forkurs. Du må ha relevant yrkeskompetanse, og studiene er oftest innen ingeniørfag, realfag og maritime fag.',
    topics: ['veier'],
  },

  // ------------------------------------------------------------ Utdanningsdirektoratet
  {
    id: 'udir-fravaersgrensen',
    title: 'Rundskriv om fraværsgrensen',
    url: 'https://www.udir.no/regelverk-og-tilsyn/skole-og-opplaring/rundskriv-om-fravarsgrensen/',
    publisher: 'Utdanningsdirektoratet',
    summary:
      'Utdanningsdirektoratets rundskriv om fraværsgrensen i videregående skole. Hovedregelen er at du ikke får karakter i et fag hvis du har mer enn ti prosent fravær i faget. Rundskrivet forklarer hvem grensen gjelder for, hvilket fravær som kan unntas, og hva som skjer hvis du går over grensen.',
    topics: ['fravaer', 'rettigheter'],
  },

  // ------------------------------------------------------------ Oslo kommune
  {
    id: 'oslo-fravaersregler',
    title: 'Fraværsregler i videregående skole',
    url: 'https://www.oslo.kommune.no/skole-og-utdanning/videregaende-skole/fravarsregler/',
    publisher: 'Oslo kommune',
    summary:
      'Oslo kommunes forklaring av fraværsreglene i videregående skole, skrevet for elever. Går gjennom tiprosentgrensen i hvert fag, hvilket fravær som ikke teller med når det er dokumentert, og at rektor i helt spesielle tilfeller kan godta inntil 15 prosent.',
    topics: ['fravaer'],
  },
  {
    id: 'oslo-laerling',
    title: 'Lærling i Oslo',
    url: 'https://www.oslo.kommune.no/skole-og-utdanning/opplaring-i-bedrift/larling/',
    publisher: 'Oslo kommune',
    summary:
      'Oslo kommunes samleside for lærlinger. Herfra kommer du til sider om å søke læreplass, godkjente lærebedrifter og opplæringskontor, lærekontrakt, lønn og arbeidsavtale, fag- og svenneprøven og rådgivningstjenesten for lærlinger.',
    topics: ['laerling', 'soke', 'opplaeringskontor', 'fagbrev'],
  },

  // ------------------------------------------------------------ Lånekassen
  {
    id: 'lanekassen-vgs',
    title: 'Stipend for elever under 21 år i videregående skole',
    url: 'https://lanekassen.no/nb-NO/stipend-og-lan/norge/videregaende-skole/videregaende-skole/',
    publisher: 'Lånekassen',
    summary:
      'Lånekassens side for elever under 21 år i videregående skole. Forklarer stipendene du kan søke om – utstyrsstipend, borteboerstipend og inntektsavhengig stipend – og at du må ha skoleplass før du søker. Er du under 18 år, må en forelder eller verge signere avtalen.',
    topics: ['okonomi'],
  },
  {
    id: 'lanekassen-laerling',
    title: 'Stipend for lærlinger under 21 år',
    url: 'https://lanekassen.no/nb-NO/stipend-og-lan/norge/larling/larling/',
    publisher: 'Lånekassen',
    summary:
      'Lånekassens side for lærlinger under 21 år. Du kan søke stipend etter de samme reglene som elever i videregående, med noen unntak: borteboerstipendet blir redusert hvis lærlinglønnen er over en fastsatt grense, og du må oppfylle krav til avstand eller reisetid.',
    topics: ['okonomi', 'laerling'],
  },

  // ------------------------------------------------------------ Elevorganisasjonen
  {
    id: 'elev-rettighetshjelpen',
    title: 'Rettighetshjelpen',
    url: 'https://elev.no/vi-tilbyr/rettighetshjelpen/',
    publisher: 'Elevorganisasjonen',
    summary:
      'Elevorganisasjonens rådgivningstilbud for elever og lærlinger som lurer på hvilke rettigheter og plikter de har. Du kan ta kontakt på telefon, e-post eller melding, også anonymt, og få råd om neste steg og hvilke regler som gjelder.',
    topics: ['rettigheter', 'fravaer'],
  },

  // ------------------------------------------------------------ Nav
  {
    id: 'nav-ung-jobb',
    title: 'Jobb for deg som er ung',
    url: 'https://arbeidsplassen.nav.no/ung',
    publisher: 'Nav (arbeidsplassen.no)',
    summary:
      'Navs jobbside for unge på arbeidsplassen.no. Her finner du ledige stillinger for deg som leter etter første jobb, deltidsjobb eller lærlingplass, og tips om jobbsøking, for eksempel hvordan du søker uten erfaring.',
    topics: ['soke'],
  },
];

/** Every topic id, in the order the info corner presents them. */
export const INFO_TOPIC_IDS: InfoTopicId[] = [
  'laerling',
  'soke',
  'opplaeringskontor',
  'fagbrev',
  'veier',
  'rettigheter',
  'fravaer',
  'okonomi',
];

const SOURCES_BY_ID = new Map(INFO_SOURCES.map((source) => [source.id, source]));

export function getInfoSource(id: string): InfoSource | undefined {
  return SOURCES_BY_ID.get(id);
}

export function infoSourcesForTopic(topic: InfoTopicId): InfoSource[] {
  return INFO_SOURCES.filter((source) => source.topics.includes(topic));
}
