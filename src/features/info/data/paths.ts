/**
 * The "Utdanningsveier" map: steps from Vg1 onward and how they connect.
 *
 * Facts checked on 2026-11-16 against vilbli.no (opplæring i bedrift, fag-/svenneprøve,
 * påbygging, rett til videregående opplæring) and utdanning.no (Y-veien, "Hva skjer hvis jeg
 * ikke får læreplass?"). Links only point to curated sources in shared/infoSources.ts.
 *
 * Layout: every node sits on a grid of `stage` (1–5, time order) × `lane` (1–3). The map
 * runs top to bottom on mobile (stage = row) and left to right on desktop (stage = column).
 * Every edge joins neighbouring cells, so connectors never cross a node.
 */

export type PathNodeId =
  | 'vg1'
  | 'vg2'
  | 'laretid'
  | 'vg3skole'
  | 'fagbrev'
  | 'pabygg'
  | 'fagskole'
  | 'yvei'
  | 'hoyere';

export interface PathNode {
  id: PathNodeId;
  /** Short label on the map (fits a 110px wide button). */
  label: string;
  /** Second line on the map. */
  hint: string;
  stage: number;
  lane: number;
  /** The usual step before this one; used to highlight "the way here". */
  via?: PathNodeId;
  detail: {
    title: string;
    duration: string;
    what: string;
    gives: string;
    /** Extra notes, e.g. other ways to get here. */
    notes?: string[];
    /** Ids from shared/infoSources.ts. */
    sourceIds: string[];
  };
}

export interface PathEdge {
  from: PathNodeId;
  to: PathNodeId;
}

export const PATH_NODES: PathNode[] = [
  {
    id: 'vg1',
    label: 'Vg1',
    hint: 'Yrkesfag, 1 år',
    stage: 1,
    lane: 2,
    detail: {
      title: 'Vg1 på yrkesfag',
      duration: '1 år på skole',
      what: 'Det første året på et yrkesfaglig utdanningsprogram. Du får en bred start i programmet og har både fellesfag og programfag.',
      gives: 'Grunnlaget for å gå videre til Vg2 i et programområde som bygger på Vg1.',
      notes: [
        'Når du søker Vg1, har du rett på plass på ett av de tre programmene du ønsker.',
        'Passer ikke programmet, har du rett til omvalg.',
      ],
      sourceIds: ['vilbli-rett-til-vgo'],
    },
  },
  {
    id: 'vg2',
    label: 'Vg2',
    hint: '1 år',
    stage: 2,
    lane: 2,
    via: 'vg1',
    detail: {
      title: 'Vg2',
      duration: '1 år på skole',
      what: 'Du går dypere inn i et programområde og nærmer deg lærefaget du vil ta.',
      gives: 'Etter Vg2 kan du gå ut i lære, ta Vg3 i skole hvis du ikke får læreplass, eller ta påbygging.',
      notes: ['Mens du går Vg2, søker du læreplass på vigo.no. Fristen for lærlinger er 1. mars.'],
      sourceIds: ['vilbli-opplaering-i-bedrift', 'vilbli-soke-laereplass'],
    },
  },
  {
    id: 'laretid',
    label: 'Læretid',
    hint: 'I bedrift, ofte 2 år',
    stage: 3,
    lane: 1,
    via: 'vg2',
    detail: {
      title: 'Læretid i bedrift',
      duration: 'Vanligvis 2 år',
      what: 'Du jobber og får opplæring i en godkjent lærebedrift. I de fleste fag regnes det ene året som opplæring og det andre som arbeid for bedriften.',
      gives: 'Lærlinglønn, erfaring fra arbeidslivet og retten til å ta fag- eller svenneprøven.',
      notes: [
        'Du skal ha både lærekontrakt og arbeidsavtale.',
        'Noen fag har et annet opplegg, for eksempel lengre læretid eller Vg3 i skole før læretiden.',
      ],
      sourceIds: ['vilbli-opplaering-i-bedrift', 'utdanning-kontrakt', 'utdanning-laerlinglonn'],
    },
  },
  {
    id: 'vg3skole',
    label: 'Vg3 i skole',
    hint: 'Uten læreplass',
    stage: 3,
    lane: 2,
    via: 'vg2',
    detail: {
      title: 'Vg3 i skole',
      duration: '1 år',
      what: 'Får du ikke læreplass, har du krav på et annet opplegg i et fag som bygger på Vg2-en din. Ofte er det Vg3 i skole, gjerne med praksis i en bedrift.',
      gives: 'Året avsluttes med fag- eller svenneprøve. Består du, får du fagbrev eller svennebrev.',
      notes: [
        'For å ha krav på dette må søknaden om læreplass være registrert på vigo.no.',
        'Takker du nei til en læreplass, mister du retten til dette tilbudet.',
        'Får du læreplass etter at du har begynt, kan du bytte til vanlig læretid.',
        'Fylket ditt bestemmer hvordan tilbudet er lagt opp. Spør rådgiveren eller fagopplæringen i fylket.',
      ],
      sourceIds: ['utdanning-yrkesfaghandboka', 'vilbli-soke-laereplass'],
    },
  },
  {
    id: 'fagbrev',
    label: 'Fagbrev',
    hint: 'Eller svennebrev',
    stage: 4,
    lane: 1,
    via: 'laretid',
    detail: {
      title: 'Fagbrev eller svennebrev',
      duration: 'Etter bestått fag- eller svenneprøve',
      what: 'Prøven tar du når læretiden er ferdig. Den har fire deler: planlegging, gjennomføring, vurdering og dokumentasjon av arbeidet ditt.',
      gives: 'Yrkeskompetanse: du er faglært i yrket ditt. Med fagbrev kan du jobbe som fagarbeider, eller gå videre på fagskole, påbygging eller Y-veien.',
      notes: [
        'Med den vanlige modellen tar det rundt fire år fra Vg1 til fagbrev.',
        'Som hovedregel må du ha bestått fagene fra Vg1 og Vg2 først.',
      ],
      sourceIds: ['vilbli-fagprove', 'vilbli-opplaering-i-bedrift'],
    },
  },
  {
    id: 'pabygg',
    label: 'Påbygg',
    hint: '1 år på skole',
    stage: 4,
    lane: 3,
    via: 'vg2',
    detail: {
      title: 'Påbygging til generell studiekompetanse',
      duration: '1 år på skole (Vg3)',
      what: 'Et år med fellesfag som norsk, historie, matematikk og naturfag. Du kan ta det rett etter Vg2 eller etter at du har fått fagbrev.',
      gives: 'Generell studiekompetanse, som du trenger for å søke de fleste studier på universitet og høgskole.',
      notes: [
        'Tar du påbygg etter fagbrev, har du færre fag enn om du tar det rett etter Vg2.',
        'Har du fått yrkeskompetanse, har du rett til påbygging.',
      ],
      sourceIds: ['vilbli-pabygg', 'vilbli-rett-til-vgo'],
    },
  },
  {
    id: 'fagskole',
    label: 'Fagskole',
    hint: 'Etter fagbrev',
    stage: 5,
    lane: 1,
    via: 'fagbrev',
    detail: {
      title: 'Fagskole',
      duration: 'Varierer med studiet',
      what: 'Høyere yrkesfaglig utdanning som bygger videre på fagbrevet ditt. Studiene er praktiske og rettet mot arbeidslivet.',
      gives: 'Mer kompetanse innen faget ditt, i en utdanning som er laget for deg med yrkesfag.',
      notes: ['Opptakskravene varierer. Sjekk studiet du er interessert i.'],
      sourceIds: ['utdanning-yrkesfaghandboka'],
    },
  },
  {
    id: 'yvei',
    label: 'Y-veien',
    hint: 'Med fagbrev',
    stage: 5,
    lane: 2,
    via: 'fagbrev',
    detail: {
      title: 'Y-veien',
      duration: 'Varierer med studiet',
      what: 'En vei inn på enkelte studier på universitet og høgskole for deg med yrkesfag. Du trenger ikke påbygging, men du må ha yrkeskompetanse som passer studiet.',
      gives: 'En bachelorgrad, oftest innen ingeniørfag, realfag eller maritime fag.',
      notes: ['Noen studier krever også relevant praksis. Sjekk opptakskravene.'],
      sourceIds: ['utdanning-yrkesfaghandboka'],
    },
  },
  {
    id: 'hoyere',
    label: 'Høyere utdanning',
    hint: 'Universitet og høgskole',
    stage: 5,
    lane: 3,
    via: 'pabygg',
    detail: {
      title: 'Universitet og høgskole',
      duration: 'Ofte 3 år eller mer',
      what: 'Bachelor- og masterstudier. Med generell studiekompetanse fra påbygging kan du søke de fleste studier.',
      gives: 'En grad som kan føre til yrker som krever høyere utdanning.',
      notes: ['Med fagbrev kan du også komme inn på enkelte studier gjennom Y-veien.', 'Noen studier har ekstra krav, for eksempel bestemte realfag.'],
      sourceIds: ['vilbli-pabygg'],
    },
  },
];

export const PATH_EDGES: PathEdge[] = [
  { from: 'vg1', to: 'vg2' },
  { from: 'vg2', to: 'laretid' },
  { from: 'vg2', to: 'vg3skole' },
  { from: 'vg2', to: 'pabygg' },
  { from: 'laretid', to: 'fagbrev' },
  { from: 'vg3skole', to: 'fagbrev' },
  { from: 'fagbrev', to: 'pabygg' },
  { from: 'fagbrev', to: 'fagskole' },
  { from: 'fagbrev', to: 'yvei' },
  { from: 'pabygg', to: 'hoyere' },
  { from: 'yvei', to: 'hoyere' },
];

const NODES_BY_ID = new Map(PATH_NODES.map((node) => [node.id, node]));

export function getPathNode(id: string | null | undefined): PathNode | undefined {
  return id ? NODES_BY_ID.get(id as PathNodeId) : undefined;
}

export function edgeKey(edge: PathEdge): string {
  return `${edge.from}->${edge.to}`;
}
