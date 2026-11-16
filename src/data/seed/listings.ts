import { addDays } from 'date-fns';
import type { ISODate, Listing, SubjectColor } from '@shared/types';
import { toISODate } from '@/lib/date';

/**
 * Twenty fictional apprenticeship listings. Every company name is invented for the demo.
 * Deadlines, posting dates and start dates are placed relative to "now" by `buildSeedListings`.
 */
interface SeedListing {
  id: string;
  company: string;
  trade: string;
  programme: string;
  title: string;
  location: string;
  county: string;
  /** Days from "now" until the deadline (3–75). */
  deadlineIn: number;
  postedDaysAgo: number;
  /** Start day in August, e.g. 10 → 10 August. */
  startDay: number;
  positions: number;
  summary: string;
  description: string;
  tasks: string[];
  requirements: string[];
  offers: string[];
  contactName: string;
  contactRole: string;
  initials: string;
  color: SubjectColor;
}

const TIF = 'Teknologi- og industrifag';
const ELEKTRO = 'Elektro og datateknologi';
const BYGG = 'Bygg- og anleggsteknikk';
const MAT = 'Restaurant- og matfag';
const HELSE = 'Helse- og oppvekstfag';

const LISTINGS: SeedListing[] = [
  {
    id: 'l-granbru',
    company: 'Granbru Maskinering AS',
    trade: 'CNC-operatør',
    programme: TIF,
    title: 'Lærling i CNC-maskineringsfaget',
    location: 'Lillestrøm',
    county: 'Akershus',
    deadlineIn: 3,
    postedDaysAgo: 24,
    startDay: 10,
    positions: 2,
    summary:
      'Vi maskinerer deler i stål og aluminium for industri og energi. Nå søker vi to lærlinger som vil lære CNC fra bunnen.',
    description:
      'Granbru Maskinering er et verksted med 34 ansatte og en maskinpark med både dreiebenker og fleraksede fresemaskiner. Vi lager alt fra enkeltdeler til serier på noen tusen.\n\nSom lærling hos oss starter du ved en maskin sammen med en erfaren operatør. Etter hvert får du egne jobber, og du er innom både måling, programmering og avgrading før fagprøven.',
    tasks: [
      'Stille inn og kjøre CNC-styrte dreiebenker og fresemaskiner',
      'Lese tegninger og velge verktøy og skjæredata',
      'Måle og kontrollere deler med mikrometer, måleur og målemaskin',
      'Gjøre enkle endringer i programmer',
      'Daglig renhold og vedlikehold av maskinene',
    ],
    requirements: [
      'Fullført Vg2 industriteknologi innen oppstart',
      'Interesse for maskinering og nøyaktig arbeid',
      'Orden i oppmøte og lite fravær',
      'Du forstår og snakker norsk godt',
    ],
    offers: [
      'Egen fadder gjennom hele læretiden',
      'Arbeidstøy og verneutstyr',
      'Lønn etter tariff',
      'Gode muligheter for fast jobb etter fagprøven',
    ],
    contactName: 'Tone Brekke',
    contactRole: 'Produksjonsleder',
    initials: 'GM',
    color: 4,
  },
  {
    id: 'l-jernspira',
    company: 'Jernspira Sveis AS',
    trade: 'Sveiser',
    programme: TIF,
    title: 'Vil du bli sveiser? Vi har plass til én lærling',
    location: 'Drammen',
    county: 'Buskerud',
    deadlineIn: 9,
    postedDaysAgo: 20,
    startDay: 17,
    positions: 1,
    summary:
      'Sveiseverksted som bygger stålkonstruksjoner, trapper og rekkverk. Du får sveise mye, helt fra første uke.',
    description:
      'Vi er 12 ansatte og lager stålkonstruksjoner til bygg og industri. Det meste sveiser vi i verkstedet, men du blir også med ut på montasje.\n\nHos oss får du prøve MAG, TIG og elektrode på ulike materialer og tykkelser. Målet er at du tar sveisesertifikat underveis i læretiden.',
    tasks: [
      'Sveise konstruksjoner i stål, rustfritt og aluminium',
      'Kappe, slipe og klargjøre materialer',
      'Lese tegninger og sveisesymboler',
      'Kontrollere egne sveiser og rette feil',
      'Være med på montasje hos kunder',
    ],
    requirements: [
      'Fullført Vg2 industriteknologi innen oppstart',
      'Stødig hånd og tålmodighet',
      'Du møter presis og tar ansvar for egen sikkerhet',
    ],
    offers: [
      'Sveisesertifikat betalt av bedriften',
      'Variert arbeid i verksted og ute hos kunder',
      'Lønn etter tariff og fri annenhver fredag',
      'Verktøy, arbeidstøy og friskluftsmaske',
    ],
    contactName: 'Geir Haugland',
    contactRole: 'Verksmester',
    initials: 'JS',
    color: 3,
  },
  {
    id: 'l-rullebakken',
    company: 'Rullebakken Bilverksted AS',
    trade: 'Bilmekaniker, lette kjøretøy',
    programme: TIF,
    title: 'Lærling i bilfaget, lette kjøretøy',
    location: 'Oslo',
    county: 'Oslo',
    deadlineIn: 12,
    postedDaysAgo: 18,
    startDay: 10,
    positions: 1,
    summary:
      'Frittstående verksted på Grorud med mye elbil. Vi ser etter en lærling som liker feilsøking like godt som skruing.',
    description:
      'Rullebakken er et verksted med seks mekanikere. Vi tar service, EU-kontroll og reparasjoner på alle merker, og over halvparten av bilene vi får inn er elektriske.\n\nDu jobber sammen med en fast mekaniker og får prøve deg på stadig større jobber. Vi setter av tid til opplæring hver uke, og du får kurs i høyvoltsikkerhet tidlig i læretiden.',
    tasks: [
      'Service og vedlikehold etter produsentens program',
      'Feilsøking med diagnoseverktøy',
      'Bytte bremser, hjuloppheng og understellsdeler',
      'Klargjøring til EU-kontroll',
      'Dekkskift og hjulstilling i sesongen',
    ],
    requirements: [
      'Fullført Vg2 kjøretøy innen oppstart',
      'Nysgjerrig på teknikk og elektronikk',
      'Hyggelig mot kunder og kolleger',
      'Førerkort klasse B er en fordel, men ikke et krav',
    ],
    offers: [
      'Opplæring på både elbil og fossilbil',
      'Kurs i høyvoltsikkerhet',
      'Lønn etter tariff',
      'Støtte til verktøy og arbeidstøy',
    ],
    contactName: 'Farid Hosseini',
    contactRole: 'Verkstedleder',
    initials: 'RB',
    color: 2,
  },
  {
    id: 'l-lysloypa',
    company: 'Lysløypa Elektro AS',
    trade: 'Elektriker',
    programme: ELEKTRO,
    title: 'Elektrikerlærlinger til bolig og næring',
    location: 'Oslo',
    county: 'Oslo',
    deadlineIn: 14,
    postedDaysAgo: 25,
    startDay: 17,
    positions: 3,
    summary:
      'Installasjonsbedrift med oppdrag i hele Oslo. Vi tar inn tre lærlinger til høsten.',
    description:
      'Vi er 40 montører og lærlinger som jobber med rehabilitering, nybygg og service. Lærlingene våre bytter mellom avdelingene, slik at du får prøve alt fra sikringsskap til smarthus og ladeanlegg.\n\nHele utdanningen til elektriker tar 4,5 år. Etter to år på skolen er læretiden hos oss 2,5 år. Du følger en fast montør det første året og får gradvis mer ansvar.',
    tasks: [
      'Legge rør og trekke kabel',
      'Montere sikringsskap, brytere og stikkontakter',
      'Installere elbilladere og smarthusstyring',
      'Sluttkontroll og dokumentasjon',
      'Feilsøking og serviceoppdrag hos kunder',
    ],
    requirements: [
      'Fullført Vg2 elenergi og ekom innen oppstart',
      'Normalt fargesyn',
      'Du er ryddig, høflig og liker å jobbe hos kunder',
      'Karakterer og fravær blir lagt vekt på',
    ],
    offers: [
      'Fagsamlinger for lærlinger fire ganger i året',
      'Lønn etter tariff',
      'Verktøy, arbeidstøy og nettbrett',
      'Sosialt miljø med egen lærlinggruppe',
    ],
    contactName: 'Marte Lunde',
    contactRole: 'Lærlingansvarlig',
    initials: 'LE',
    color: 5,
  },
  {
    id: 'l-tellverk',
    company: 'Tellverk Mekaniske AS',
    trade: 'Industrimekaniker',
    programme: TIF,
    title: 'Lærling i industrimekanikerfaget',
    location: 'Oslo',
    county: 'Oslo',
    deadlineIn: 17,
    postedDaysAgo: 10,
    startDay: 10,
    positions: 2,
    summary:
      'Mekanisk verksted på Helsfyr som vedlikeholder og bygger om maskiner for næringsmiddelindustrien. To læreplasser fra august.',
    description:
      'Tellverk Mekaniske har 22 ansatte. Vi reparerer pumper, gir og transportbånd, og vi bygger om produksjonslinjer hos kunder på Østlandet.\n\nSom lærling jobber du både i verkstedet og ute hos kunder. Du lærer å demontere, måle opp, lage nye deler og sette maskiner i drift igjen. Flere av fagarbeiderne våre startet selv som lærlinger her.',
    tasks: [
      'Demontere, reparere og montere maskiner og utstyr',
      'Feilsøke på mekaniske, hydrauliske og pneumatiske anlegg',
      'Dreie, frese og sveise deler ved behov',
      'Forebyggende vedlikehold hos kunder',
      'Dokumentere arbeidet i vedlikeholdssystemet',
    ],
    requirements: [
      'Fullført Vg2 industriteknologi innen oppstart',
      'Praktisk anlagt og løsningsorientert',
      'Du trives med å jobbe sammen med andre',
      'Lite fravær og gode skussmål fra YFF',
    ],
    offers: [
      'Variert læretid med arbeid i verksted og hos kunder',
      'Fadderordning og faste opplæringsdager',
      'Lønn etter tariff',
      'Arbeidstøy, vernesko og verktøy',
      'Mulighet for fast jobb etter fagbrev',
    ],
    contactName: 'Bjørn Eikeland',
    contactRole: 'Verksmester og faglig leder',
    initials: 'TM',
    color: 1,
  },
  {
    id: 'l-blikkfjord',
    company: 'Blikkfjord Plate AS',
    trade: 'Platearbeider',
    programme: TIF,
    title: 'Lærling i platearbeiderfaget',
    location: 'Fredrikstad',
    county: 'Østfold',
    deadlineIn: 20,
    postedDaysAgo: 12,
    startDay: 17,
    positions: 1,
    summary:
      'Vi former og sveiser plater til tanker, kanaler og maskindeksler. Bli med på laget som lærling.',
    description:
      'Blikkfjord Plate leverer plateprodukter i stål, rustfritt og aluminium. Verkstedet har laserskjærer, knekkepresser og valser, og vi er 18 ansatte.\n\nDu lærer hele veien fra tegning og utfolding til ferdig sveiset produkt. Nøyaktig oppmerking er halve jobben, så vi bruker god tid på det i starten.',
    tasks: [
      'Merke opp og lage utfoldinger etter tegning',
      'Kappe, klippe og bøye plater',
      'Valse og forme deler',
      'Hefte og sveise sammen konstruksjoner',
      'Kontrollere mål og overflater',
    ],
    requirements: [
      'Fullført Vg2 industriteknologi innen oppstart',
      'Du liker geometri og praktisk regning',
      'Nøyaktig og tålmodig',
    ],
    offers: [
      'Opplæring på moderne maskiner',
      'Lønn etter tariff',
      'Arbeidstøy og verneutstyr',
      'Et lite og trygt arbeidsmiljø',
    ],
    contactName: 'Stine Aaberg',
    contactRole: 'Daglig leder',
    initials: 'BP',
    color: 7,
  },
  {
    id: 'l-saltstra',
    company: 'Restaurant Saltstrå',
    trade: 'Kokk',
    programme: MAT,
    title: 'Kokkelærling til sesongbasert kjøkken',
    location: 'Oslo',
    county: 'Oslo',
    deadlineIn: 23,
    postedDaysAgo: 8,
    startDay: 3,
    positions: 2,
    summary:
      'Restaurant med 60 plasser og meny som følger sesongen. Vi søker to kokkelærlinger som vil lære håndverket skikkelig.',
    description:
      'Saltstrå lager mat fra bunnen med råvarer fra norske produsenter. Kjøkkenet har åtte kokker, og lærlingene går gjennom alle stasjonene: kaldt, varmt, bakeri og dessert.\n\nVi jobber turnus med kvelder og annenhver helg. Til gjengjeld har vi faste fridager og spiser sammen før hver servering.',
    tasks: [
      'Forberede råvarer og mise en place',
      'Lage retter på kald og varm stasjon',
      'Bake brød og lage desserter',
      'Følge rutiner for hygiene og internkontroll',
      'Være med på menyutvikling og varebestilling',
    ],
    requirements: [
      'Fullført Vg2 kokk- og servitørfag innen oppstart',
      'Du er glad i mat og tåler høyt tempo',
      'Du kan jobbe kveld og helg',
    ],
    offers: [
      'Opplæring på alle stasjoner',
      'Personalmat og arbeidsklær',
      'Lønn etter tariff med tillegg for kveld og helg',
      'Studietur med kjøkkenet én gang i året',
    ],
    contactName: 'Emil Sandnes',
    contactRole: 'Kjøkkensjef',
    initials: 'RS',
    color: 6,
  },
  {
    id: 'l-nordpall',
    company: 'Nordpall Terminal AS',
    trade: 'Logistikkoperatør',
    programme: TIF,
    title: 'Lærling i logistikkfaget',
    location: 'Vestby',
    county: 'Akershus',
    deadlineIn: 26,
    postedDaysAgo: 15,
    startDay: 17,
    positions: 2,
    summary:
      'Lagerterminal med 30 000 palleplasser. Du lærer varemottak, plukk, truck og lagerstyring.',
    description:
      'Nordpall er et tredjepartslager for dagligvare og byggevarer. Hver dag går det rundt 90 trailere inn og ut av terminalen.\n\nSom lærling er du innom alle avdelingene, og du tar truckførerbevis de første månedene. Vi legger vekt på sikkerhet, orden og godt samarbeid på skiftet.',
    tasks: [
      'Ta imot og kontrollere varer',
      'Plukke og pakke ordre med håndterminal',
      'Kjøre truck og annet løfteutstyr',
      'Sikre last og klargjøre forsendelser',
      'Telle varer og registrere avvik i lagersystemet',
    ],
    requirements: [
      'Fullført Vg2 transport og logistikk innen oppstart',
      'Du er nøyaktig og liker å holde orden',
      'Du kan jobbe skift, dag og kveld',
    ],
    offers: [
      'Truckførerbevis betalt av bedriften',
      'Lønn etter tariff med skifttillegg',
      'Kantine og buss fra Vestby stasjon',
      'Gode muligheter for jobb etter læretiden',
    ],
    contactName: 'Hanne Kvam',
    contactRole: 'Terminalleder',
    initials: 'NT',
    color: 8,
  },
  {
    id: 'l-elvekjemi',
    company: 'Elvekjemi Industrier AS',
    trade: 'Kjemiprosess',
    programme: TIF,
    title: 'Lærlinger i kjemiprosessfaget',
    location: 'Porsgrunn',
    county: 'Telemark',
    deadlineIn: 29,
    postedDaysAgo: 21,
    startDay: 10,
    positions: 4,
    summary:
      'Prosessanlegg som lager bindemidler til maling og lim. Vi tar inn fire lærlinger som vil bli fagoperatører.',
    description:
      'Anlegget vårt går døgnet rundt og styres fra kontrollrom. Operatørene overvåker prosessen, tar prøver og går runder ute i anlegget.\n\nDu går dagtid det første halvåret og blir deretter med på skift. Opplæringen er lagt opp i moduler, og du får egen veileder på skiftlaget ditt.',
    tasks: [
      'Overvåke og styre prosessen fra kontrollrom',
      'Gå inspeksjonsrunder og lese av instrumenter',
      'Ta prøver og gjøre enkle analyser',
      'Klargjøre utstyr for vedlikehold',
      'Følge prosedyrer for sikkerhet og miljø',
    ],
    requirements: [
      'Fullført Vg2 kjemiprosess- og laboratoriefag innen oppstart',
      'Interesse for kjemi, fysikk og teknikk',
      'Du er rolig, nøyaktig og følger prosedyrer',
      'Du kan jobbe skift etter fylte 18 år',
    ],
    offers: [
      'Strukturert opplæring med egen veileder',
      'Lønn etter industriens tariff',
      'Bedriftskantine og treningsrom',
      'Lærlingtreff med andre bedrifter i industriparken',
    ],
    contactName: 'Anders Tveiten',
    contactRole: 'Opplæringsleder',
    initials: 'EI',
    color: 1,
  },
  {
    id: 'l-kvistfri',
    company: 'Kvistfri Bygg AS',
    trade: 'Tømrer',
    programme: BYGG,
    title: 'Tømrerlærling til rehabilitering og tilbygg',
    location: 'Asker',
    county: 'Akershus',
    deadlineIn: 32,
    postedDaysAgo: 6,
    startDay: 17,
    positions: 1,
    summary:
      'Tømrerfirma med ni ansatte. Vi bygger tilbygg og pusser opp eneboliger i Asker og Bærum.',
    description:
      'Hos Kvistfri jobber vi i lag på to–tre personer, og du er med på hele prosjektet fra grunnmur til listing. Det gir mye variasjon og god forståelse for faget.\n\nVi ser etter en lærling som møter presis, spør når noe er uklart og liker å se resultatet av eget arbeid.',
    tasks: [
      'Sette opp bindingsverk, bjelkelag og takkonstruksjoner',
      'Montere vinduer, dører og kledning',
      'Isolere og tette etter gjeldende krav',
      'Innvendig arbeid med gulv, vegger og listverk',
      'Holde orden på byggeplassen',
    ],
    requirements: [
      'Fullført Vg2 tømrer innen oppstart',
      'Du er i grei fysisk form og liker å jobbe ute',
      'Høflig og ryddig hos kunder',
    ],
    offers: [
      'Tett oppfølging i små arbeidslag',
      'Lønn etter tariff',
      'Arbeidstøy og grunnpakke med håndverktøy',
      'Medlemskap i opplæringskontor som følger deg opp',
    ],
    contactName: 'Lars Erik Moen',
    contactRole: 'Byggmester',
    initials: 'KB',
    color: 2,
  },
  {
    id: 'l-rorkraft',
    company: 'Rørkraft Industri AS',
    trade: 'Industrirørlegger',
    programme: TIF,
    title: 'Lærling i industrirørleggerfaget',
    location: 'Stavanger',
    county: 'Rogaland',
    deadlineIn: 35,
    postedDaysAgo: 14,
    startDay: 10,
    positions: 2,
    summary:
      'Vi prefabrikkerer og monterer rørsystemer for prosessindustri og havbruk. To læreplasser i verkstedet på Forus.',
    description:
      'Rørkraft bygger rørsystemer i karbonstål, rustfritt og titan. Du lærer å lese isometriske tegninger, kappe og tilpasse rør og gjøre klart for sveis.\n\nDet meste av læretiden er i verkstedet. Etter fylte 18 år kan du også bli med på oppdrag hos kunder.',
    tasks: [
      'Lese isometriske tegninger og lage kappelister',
      'Kappe, bøye og tilpasse rør',
      'Montere flenser, ventiler og rørstøtter',
      'Hefte rørdeler før sveising',
      'Trykkteste og kontrollere ferdige rørspoler',
    ],
    requirements: [
      'Fullført Vg2 industriteknologi innen oppstart',
      'God romforståelse og sans for nøyaktighet',
      'Du tar sikkerhet på alvor',
    ],
    offers: [
      'Fagopplæring med erfarne rørleggere',
      'Lønn etter tariff',
      'Kurs i varme arbeider og fallsikring',
      'Mulighet for fast ansettelse',
    ],
    contactName: 'Kjersti Rege',
    contactRole: 'HR- og opplæringsansvarlig',
    initials: 'RI',
    color: 4,
  },
  {
    id: 'l-kranfot',
    company: 'Kranfot Anleggsservice AS',
    trade: 'Anleggsmaskinmekaniker',
    programme: TIF,
    title: 'Lærling i anleggsmaskinmekanikerfaget',
    location: 'Lørenskog',
    county: 'Akershus',
    deadlineIn: 38,
    postedDaysAgo: 9,
    startDay: 17,
    positions: 1,
    summary:
      'Vi reparerer gravemaskiner, hjullastere og dumpere. Liker du store maskiner og hydraulikk, er dette plassen.',
    description:
      'Kranfot har verksted på Lørenskog og fire servicebiler på veien. Kundene er entreprenører som trenger maskinene raskt tilbake i arbeid.\n\nDu lærer feilsøking på motor, hydraulikk og elektriske anlegg. Etter hvert er du med servicebilen ut på anlegg.',
    tasks: [
      'Service og reparasjon av anleggsmaskiner',
      'Feilsøking på hydraulikk og elektriske anlegg',
      'Bytte slanger, sylindre og slitedeler',
      'Sveise og reparere skuffer og utstyr',
      'Være med på serviceoppdrag ute på anlegg',
    ],
    requirements: [
      'Fullført Vg2 arbeidsmaskiner innen oppstart',
      'Du er ikke redd for å bli skitten på hendene',
      'Selvstendig og lærevillig',
      'Førerkort klasse B i løpet av læretiden',
    ],
    offers: [
      'Opplæring på maskiner fra flere produsenter',
      'Lønn etter tariff',
      'Arbeidstøy, vernesko og verktøyvogn',
      'Støtte til førerkort etter første år',
    ],
    contactName: 'Ole Martin Sørum',
    contactRole: 'Verkstedleder',
    initials: 'KA',
    color: 2,
  },
  {
    id: 'l-stillevika',
    company: 'Stillevika omsorgssenter',
    trade: 'Helsefagarbeider',
    programme: HELSE,
    title: 'Lærling i helsearbeiderfaget',
    location: 'Bærum',
    county: 'Akershus',
    deadlineIn: 42,
    postedDaysAgo: 11,
    startDay: 17,
    positions: 3,
    summary:
      'Privat sykehjem med 48 beboere. Vi søker tre lærlinger som liker å jobbe med mennesker.',
    description:
      'På Stillevika er lærlingene en viktig del av laget. Du jobber på avdeling sammen med veilederen din og er innom både langtidsavdeling og demensavdeling.\n\nVi er opptatt av at beboerne skal ha gode dager. Da trenger vi folk som ser den enkelte og tar seg tid til en prat.',
    tasks: [
      'Hjelpe beboere med stell, måltider og aktivitet',
      'Observere og rapportere endringer i helsa',
      'Dokumentere i journalsystemet',
      'Delta i miljøarbeid og aktiviteter',
      'Samarbeide med sykepleiere og pårørende',
    ],
    requirements: [
      'Fullført Vg2 helsearbeiderfag innen oppstart',
      'Du er tålmodig, varm og til å stole på',
      'God muntlig norsk',
      'Politiattest må legges fram før oppstart',
    ],
    offers: [
      'Fast veileder og ukentlige veiledningssamtaler',
      'Lønn etter tariff med tillegg for kveld og helg',
      'Kurs i forflytning og demensomsorg',
      'Et arbeidsmiljø der lærlinger blir sett',
    ],
    contactName: 'Nina Fjeld',
    contactRole: 'Avdelingsleder',
    initials: 'SO',
    color: 6,
  },
  {
    id: 'l-dypvik',
    company: 'Dypvik Subsea Verksted AS',
    trade: 'Industrimekaniker',
    programme: TIF,
    title: 'Industrimekanikerlærling til subseaverksted',
    location: 'Bergen',
    county: 'Vestland',
    deadlineIn: 46,
    postedDaysAgo: 7,
    startDay: 10,
    positions: 2,
    summary:
      'Vi overhaler ventiler og verktøy som brukes under vann. To lærlinger får plass i verkstedet vårt på Ågotnes.',
    description:
      'Dypvik tar imot utstyr fra offshore, demonterer det, bytter slitedeler og tester alt før det sendes ut igjen. Kravene til renhold og dokumentasjon er høye.\n\nDu jobber i team med erfarne mekanikere. Læretida er lagt opp slik at du er innom montering, trykktesting og maskinering.',
    tasks: [
      'Demontere, rengjøre og inspisere utstyr',
      'Bytte pakninger, lagre og slitedeler',
      'Montere etter prosedyre og med riktig moment',
      'Trykkteste og funksjonsteste hydraulisk utstyr',
      'Dokumentere arbeidet i jobbpakker',
    ],
    requirements: [
      'Fullført Vg2 industriteknologi innen oppstart',
      'Nøyaktig og ryddig i arbeidet',
      'Du leser prosedyrer på norsk og enkel engelsk',
      'Interesse for hydraulikk',
    ],
    offers: [
      'Grundig opplæring med egen fadder',
      'Lønn etter tariff',
      'Buss fra Bergen sentrum',
      'Gode utsikter til fast jobb',
    ],
    contactName: 'Silje Tvedt',
    contactRole: 'Verkstedkoordinator',
    initials: 'DS',
    color: 4,
  },
  {
    id: 'l-mjosfres',
    company: 'Mjøsfres CNC AS',
    trade: 'CNC-operatør',
    programme: TIF,
    title: 'CNC-lærling til serieproduksjon',
    location: 'Raufoss',
    county: 'Innlandet',
    deadlineIn: 50,
    postedDaysAgo: 5,
    startDay: 17,
    positions: 1,
    summary:
      'Vi maskinerer aluminiumsdeler i store serier med robotbetjente maskiner. Én læreplass fra august.',
    description:
      'Mjøsfres leverer deler til bil- og sykkelindustrien. Produksjonen er automatisert, og operatørene våre har ansvar for innstilling, målekontroll og jevn kvalitet.\n\nSom lærling lærer du å stille om maskiner, bytte verktøy og følge med på målene gjennom et skift. Du får også prøve deg på robotcellene.',
    tasks: [
      'Stille om og starte opp CNC-maskiner',
      'Bytte og forhåndsinnstille verktøy',
      'Måle deler og føre målekort',
      'Betjene robotceller',
      'Foreslå forbedringer i produksjonen',
    ],
    requirements: [
      'Fullført Vg2 industriteknologi innen oppstart',
      'Du liker orden og faste rutiner',
      'Interesse for automasjon',
    ],
    offers: [
      'Opplæring i moderne, automatisert produksjon',
      'Lønn etter tariff',
      'Hjelp til å finne hybel',
      'Samarbeid med fagskolen om videre utdanning',
    ],
    contactName: 'Per Ivar Hagen',
    contactRole: 'Fabrikksjef',
    initials: 'MC',
    color: 5,
  },
  {
    id: 'l-bolgeblikk',
    company: 'Bølgeblikk Ventilasjon AS',
    trade: 'Ventilasjons- og blikkenslager',
    programme: BYGG,
    title: 'Lærling i ventilasjons- og blikkenslagerfaget',
    location: 'Oslo',
    county: 'Oslo',
    deadlineIn: 55,
    postedDaysAgo: 13,
    startDay: 17,
    positions: 2,
    summary:
      'Vi lager og monterer beslag, takrenner og ventilasjonskanaler. Verksted på Ensjø og oppdrag i hele byen.',
    description:
      'Bølgeblikk har 15 ansatte og holder til i et verksted med knekkemaskiner og falsemaskiner. Halve tida er du i verkstedet, resten ute på tak og i tekniske rom.\n\nFaget passer for deg som liker å forme ting med hendene og ikke har høydeskrekk.',
    tasks: [
      'Måle opp og lage beslag i verkstedet',
      'Montere takrenner, nedløp og beslag',
      'Montere ventilasjonskanaler og aggregater',
      'Lodde og false i sink, kobber og stål',
      'Sikre arbeidsplassen ved arbeid i høyden',
    ],
    requirements: [
      'Fullført Vg2 ventilasjon, membran og taktekking innen oppstart',
      'Du tåler å jobbe ute i all slags vær',
      'Praktisk og nøyaktig',
    ],
    offers: [
      'Variert arbeid ute og inne',
      'Lønn etter tariff',
      'Kurs i fallsikring og varme arbeider',
      'Arbeidstøy for alle årstider',
    ],
    contactName: 'Thomas Wiik',
    contactRole: 'Blikkenslagermester',
    initials: 'BV',
    color: 7,
  },
  {
    id: 'l-tindalu',
    company: 'Tindalu Profiler AS',
    trade: 'Produksjonsteknikk',
    programme: TIF,
    title: 'Lærling i produksjonsteknikkfaget',
    location: 'Kongsvinger',
    county: 'Innlandet',
    deadlineIn: 60,
    postedDaysAgo: 4,
    startDay: 10,
    positions: 2,
    summary:
      'Fabrikk som presser og bearbeider aluminiumsprofiler. Du lærer å kjøre og overvåke automatiserte linjer.',
    description:
      'Hos Tindalu går profilene gjennom pressing, kapping, bearbeiding og pakking. Operatørene styrer linjene, retter småfeil og sørger for at kvaliteten holder.\n\nDu får opplæring på én linje om gangen og blir med i forbedringsarbeid sammen med skiftlaget.',
    tasks: [
      'Starte opp, overvåke og stille om produksjonslinjer',
      'Kontrollere mål og overflater',
      'Enkelt vedlikehold og feilretting',
      'Registrere produksjon og avvik',
      'Delta i forbedringsmøter på skiftet',
    ],
    requirements: [
      'Fullført Vg2 industriteknologi innen oppstart',
      'Du følger med og sier fra når noe ikke stemmer',
      'Du kan jobbe toskift',
    ],
    offers: [
      'Opplæringsplan med tydelige delmål',
      'Lønn etter tariff med skifttillegg',
      'Bedriftshelsetjeneste og kantine',
      'Mulighet for fagbrev nummer to senere',
    ],
    contactName: 'Camilla Nordby',
    contactRole: 'Produksjonsleder',
    initials: 'TP',
    color: 8,
  },
  {
    id: 'l-skrogvik',
    company: 'Skrogvik Verft AS',
    trade: 'Sveiser',
    programme: TIF,
    title: 'Sveiselærling til skipsverft',
    location: 'Ålesund',
    county: 'Møre og Romsdal',
    deadlineIn: 65,
    postedDaysAgo: 6,
    startDay: 17,
    positions: 3,
    summary:
      'Verftet bygger og reparerer arbeidsbåter i aluminium og stål. Vi søker tre lærlinger i sveisefaget.',
    description:
      'På Skrogvik sveiser vi skrog, dekk og overbygg. Arbeidet skjer i hall, og du lærer å sveise i alle stillinger.\n\nVi har egen sveiseskole der lærlingene øver til sertifikat. Verftet hjelper deg med bolig hvis du flytter hit.',
    tasks: [
      'Sveise seksjoner i aluminium og stål',
      'Tilpasse og hefte plater og profiler',
      'Slipe og klargjøre sveisefuger',
      'Lese arbeidstegninger',
      'Følge rutiner for varme arbeider',
    ],
    requirements: [
      'Fullført Vg2 industriteknologi innen oppstart',
      'Du er utholdende og nøyaktig',
      'Du samarbeider godt med andre',
    ],
    offers: [
      'Egen sveiseskole og sertifikater',
      'Lønn etter tariff',
      'Hjelp til å finne bolig',
      'Godt miljø med mange unge fagarbeidere',
    ],
    contactName: 'Arne Vartdal',
    contactRole: 'Opplæringsansvarlig',
    initials: 'SV',
    color: 3,
  },
  {
    id: 'l-tungdrift',
    company: 'Tungdrift Lastebilservice AS',
    trade: 'Bilmekaniker, tunge kjøretøy',
    programme: TIF,
    title: 'Lærling i bilfaget, tunge kjøretøy',
    location: 'Trondheim',
    county: 'Trøndelag',
    deadlineIn: 70,
    postedDaysAgo: 3,
    startDay: 10,
    positions: 2,
    summary:
      'Verksted for lastebiler og busser på Tiller. Vi trenger to lærlinger som vil jobbe med store kjøretøy.',
    description:
      'Tungdrift har 25 mekanikere og holder åpent til kl. 22. Vi tar service, bremser, drivlinje og periodisk kontroll, og vi har egen avdeling for elektriske lastebiler.\n\nSom lærling følger du en mekaniker tett det første året. Etter det får du egne jobber med støtte fra formannen.',
    tasks: [
      'Service og vedlikehold på lastebiler og busser',
      'Feilsøking på motor, bremser og luftsystemer',
      'Reparasjon av drivlinje og hjuloppheng',
      'Klargjøring til periodisk kontroll',
      'Arbeid på elektriske drivlinjer etter opplæring',
    ],
    requirements: [
      'Fullført Vg2 kjøretøy innen oppstart',
      'Du liker tungt og variert arbeid',
      'Ansvarsbevisst og punktlig',
      'Interesse for diagnose og elektronikk',
    ],
    offers: [
      'Kurs hos leverandørene underveis',
      'Lønn etter tariff',
      'Støtte til førerkort klasse C',
      'Arbeidstøy og personlig verktøykasse',
    ],
    contactName: 'Ronny Solberg',
    contactRole: 'Verksmester',
    initials: 'TL',
    color: 5,
  },
  {
    id: 'l-sloyfe',
    company: 'Sløyfe Automasjon AS',
    trade: 'Automatiker',
    programme: ELEKTRO,
    title: 'Automatikerlærling til tavleverksted og service',
    location: 'Kongsberg',
    county: 'Buskerud',
    deadlineIn: 75,
    postedDaysAgo: 2,
    startDay: 17,
    positions: 1,
    summary:
      'Vi bygger styreskap og programmerer anlegg for vann, avløp og industri. Én læreplass for en som liker både kobling og koding.',
    description:
      'Sløyfe Automasjon er 20 ansatte, fordelt på tavleverksted, programmering og service. Lærlingen vår er innom alle tre.\n\nDu begynner med å koble styreskap etter skjema. Senere blir du med ut for å teste og sette anlegg i drift.',
    tasks: [
      'Montere og koble styreskap etter skjema',
      'Teste og feilsøke styringer',
      'Enkel programmering av PLS og skjermbilder',
      'Kalibrere givere og måleutstyr',
      'Være med på igangkjøring hos kunder',
    ],
    requirements: [
      'Fullført Vg2 automatisering innen oppstart',
      'Normalt fargesyn',
      'Strukturert og nysgjerrig',
      'Gode karakterer i programfagene',
    ],
    offers: [
      'Bred læretid med verksted, programmering og service',
      'Lønn etter tariff',
      'Bærbar PC og verktøy',
      'Fagkvelder med de andre teknikerne',
    ],
    contactName: 'Ida Skogen',
    contactRole: 'Teknisk leder',
    initials: 'SA',
    color: 1,
  },
];

/** Listings the student has saved on first launch (one with a deadline this week). */
export const SEED_SAVED_LISTING_IDS: string[] = ['l-granbru', 'l-tellverk'];

/** Apprenticeships start in August: the first August after the deadline. */
function startDateFor(deadline: Date, day: number): ISODate {
  const year = deadline.getMonth() >= 7 ? deadline.getFullYear() + 1 : deadline.getFullYear();
  return toISODate(new Date(year, 7, day));
}

/** The 20 listings with deadlines 3–75 days after `now`, soonest deadline first. */
export function buildSeedListings(now: Date = new Date()): Listing[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return LISTINGS.map((item) => {
    const deadline = addDays(today, item.deadlineIn);
    return {
      id: item.id,
      company: item.company,
      trade: item.trade,
      programme: item.programme,
      title: item.title,
      location: item.location,
      county: item.county,
      deadline: toISODate(deadline),
      positions: item.positions,
      startDate: startDateFor(deadline, item.startDay),
      postedAt: toISODate(addDays(today, -item.postedDaysAgo)),
      summary: item.summary,
      description: item.description,
      tasks: item.tasks,
      requirements: item.requirements,
      offers: item.offers,
      contactName: item.contactName,
      contactRole: item.contactRole,
      logo: { initials: item.initials, color: item.color },
    };
  });
}
