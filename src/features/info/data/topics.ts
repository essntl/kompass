/**
 * The eight topics of the info corner, with a short explainer for each.
 *
 * Every concrete claim was checked on 2026-11-16 against the pages in shared/infoSources.ts
 * (the source id is noted next to each block). The wording is our own; where a detail varies
 * between counties, trades or school years, the text stays general and points to the source.
 */
import type { InfoTopicId, SubjectColor } from '@shared/types';
import {
  Award,
  Briefcase,
  CalendarX,
  Handshake,
  Route,
  Scale,
  Send,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

export type ExplainerBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

export interface InfoTopic {
  id: InfoTopicId;
  /** Card and page title. */
  title: string;
  /** One line for the topic card. */
  lead: string;
  icon: LucideIcon;
  color: SubjectColor;
  explainer: ExplainerBlock[];
  /** Starts the assistant with this question. */
  questions: string[];
}

export const INFO_TOPICS: InfoTopic[] = [
  {
    id: 'laerling',
    title: 'Hva er en lærling?',
    lead: 'Du lærer et yrke ved å jobbe i en bedrift.',
    icon: Briefcase,
    color: 1,
    explainer: [
      // vilbli-laerling, vilbli-opplaering-i-bedrift
      {
        kind: 'paragraph',
        text: 'Som lærling utdanner du deg til et yrke ved å jobbe i en bedrift. Du får både opplæring og praksis i faget du har valgt.',
      },
      {
        kind: 'paragraph',
        text: 'I de fleste fag går du to år på skole, Vg1 og Vg2. Etterpå er du to år i bedrift. Det ene året regnes som opplæring, det andre som arbeid du gjør for bedriften. Noen fag har et annet opplegg.',
      },
      {
        kind: 'paragraph',
        text: 'I starten går mest av tiden til opplæring. Etter hvert gjør du de vanlige arbeidsoppgavene i bedriften.',
      },
      // utdanning-kontrakt, vilbli-laerling
      {
        kind: 'list',
        items: [
          'Du skriver en lærekontrakt, som fylkeskommunen godkjenner.',
          'Du har også krav på en skriftlig arbeidsavtale med bedriften.',
          'Du er arbeidstaker, med regler for arbeidstid, ferie og fridager.',
        ],
      },
      { kind: 'paragraph', text: 'Læretiden avslutter du med en fag- eller svenneprøve.' },
    ],
    questions: ['Hva gjør en lærling på jobb?', 'Hva er en lærekontrakt?', 'Hvor lenge varer læretiden?'],
  },
  {
    id: 'soke',
    title: 'Slik søker du læreplass',
    lead: 'Søk på vigo.no innen 1. mars, og kontakt bedrifter selv.',
    icon: Send,
    color: 4,
    explainer: [
      // vilbli-soke-laereplass
      {
        kind: 'paragraph',
        text: 'Du søker om å bli formidlet til læreplass på vigo.no. Du logger inn med MinID eller BankID.',
      },
      {
        kind: 'paragraph',
        text: 'Fristen for lærlinger er 1. mars. Faller den på en lørdag eller søndag, flyttes den til mandagen etter.',
      },
      // vilbli-soke-laereplass, utdanning-finn-laerebedrift
      {
        kind: 'list',
        items: [
          'Ta kontakt med bedrifter selv også. Er bedriften med i et opplæringskontor, kontakter du kontoret.',
          'Si hvem du er, hvilket fag du vil bli lærling i, og spør om du kan komme innom.',
          'Les om kravene i yrket før du søker. Noen yrker krever for eksempel politiattest eller godt syn.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Fylkeskommunen prøver å finne en plass til deg, men det er bedriften som velger lærling. Ofte blir du kalt inn til intervju. Formidlingen varer til rundt 1. september, så vær lett å nå på telefon.',
      },
      {
        kind: 'paragraph',
        text: 'Takker du nei til en plass fylkeskommunen har formidlet deg til, har du ikke krav på flere tilbud.',
      },
    ],
    questions: ['Hvordan søker jeg lærlingplass?', 'Hva skal stå i en søknad om læreplass?', 'Hva skjer på et intervju?'],
  },
  {
    id: 'opplaeringskontor',
    title: 'Opplæringskontor',
    lead: 'Hjelper bedrifter med å ta inn og følge opp lærlinger.',
    icon: Handshake,
    color: 2,
    explainer: [
      // vilbli-opplaeringskontor
      {
        kind: 'paragraph',
        text: 'En lærebedrift er en bedrift som fylkeskommunen har godkjent for å ta inn lærlinger. Den må kunne gi deg opplæringen læreplanen krever, og ha en faglig leder som har ansvaret for den.',
      },
      {
        kind: 'paragraph',
        text: 'Et opplæringskontor er et samarbeid mellom flere godkjente lærebedrifter. Kontoret er et bindeledd mellom bedriftene og fylkeskommunen.',
      },
      {
        kind: 'list',
        items: [
          'Det hjelper bedriftene med å finne lærlinger.',
          'Det veileder både deg og bedriften gjennom læretiden.',
          'Du skriver kontrakten med lærebedriften, men kan få opplæring i én eller flere av medlemsbedriftene.',
        ],
      },
      // utdanning-finn-laerebedrift
      {
        kind: 'paragraph',
        text: 'Når du leter etter læreplass: Er bedriften medlem av et opplæringskontor, er det kontoret du skal ta kontakt med.',
      },
    ],
    questions: ['Hva er et opplæringskontor?', 'Hvordan finner jeg en godkjent lærebedrift?'],
  },
  {
    id: 'fagbrev',
    title: 'Fagbrev og svennebrev',
    lead: 'Det du får når du består fag- eller svenneprøven.',
    icon: Award,
    color: 5,
    explainer: [
      // vilbli-fagprove
      {
        kind: 'paragraph',
        text: 'Når læretiden er ferdig, tar du fag- eller svenneprøven. Består du, får du fagbrev eller svennebrev. Lærebedriften melder deg opp til prøven.',
      },
      {
        kind: 'paragraph',
        text: 'Prøven bygger på kompetansemålene i læreplanen for faget ditt. Den har fire deler:',
      },
      {
        kind: 'list',
        items: [
          'Du planlegger arbeidet og forklarer valgene dine.',
          'Du gjør et faglig arbeid.',
          'Du vurderer arbeidet ditt selv.',
          'Du dokumenterer det du har gjort.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Som hovedregel må du ha bestått fagene fra Vg1 og Vg2 før du kan ta prøven. I noen fag innen elektro og teknologi- og industrifag må du også ta en egen eksamen først.',
      },
      {
        kind: 'paragraph',
        text: 'Karakterene er «Bestått meget godt», «Bestått» og «Ikke bestått». Står du ikke, kan du ta prøven på nytt.',
      },
    ],
    questions: ['Hva er forskjellen på fagbrev og svennebrev?', 'Hva skjer hvis jeg ikke består fagprøven?'],
  },
  {
    id: 'veier',
    title: 'Utdanningsveier',
    lead: 'Fra Vg1 til fagbrev, og videre derfra.',
    icon: Route,
    color: 7,
    explainer: [
      // vilbli-opplaering-i-bedrift
      {
        kind: 'paragraph',
        text: 'Den vanligste veien på yrkesfag er to år på skole og to år i bedrift. Da tar det vanligvis fire år å få fagbrev eller svennebrev.',
      },
      {
        kind: 'paragraph',
        text: 'Får du ikke læreplass, har du krav på et annet opplegg i et fag som bygger på Vg2-en din. Ofte er det Vg3 i skole. Da må søknaden din være registrert på vigo.no.',
      },
      // vilbli-pabygg, vilbli-rett-til-vgo
      {
        kind: 'paragraph',
        text: 'Vil du studere senere, kan du ta påbygging til generell studiekompetanse. Det kan du gjøre rett etter Vg2 eller etter at du har fått fagbrev.',
      },
      {
        kind: 'paragraph',
        text: 'Med fagbrev kan du også gå videre på fagskole, eller søke enkelte studier på universitet og høgskole gjennom Y-veien.',
      },
      {
        kind: 'paragraph',
        text: 'Passer ikke programmet du har valgt, har du rett til å bytte. Det kalles omvalg.',
      },
    ],
    questions: ['Kan jeg ta påbygg etter fagbrev?', 'Hva skjer hvis jeg ikke får læreplass?', 'Hva er Y-veien?'],
  },
  {
    id: 'rettigheter',
    title: 'Rettighetene dine',
    lead: 'Som elev og som lærling har du rett på mye.',
    icon: Scale,
    color: 3,
    explainer: [
      // vilbli-rett-til-vgo
      {
        kind: 'list',
        items: [
          'Du har rett til videregående opplæring helt til du har fått studie- eller yrkeskompetanse, uansett hvor lang tid det tar.',
          'Når du søker Vg1, har du rett på plass på ett av de tre programmene du søker på.',
          'Du har rett til omvalg, altså å bytte program, så mange ganger du vil fram til søknadsfristen det året du fyller 19.',
          'Etter at du har fått yrkeskompetanse, har du rett til påbygging til generell studiekompetanse.',
        ],
      },
      // vilbli-laerling, utdanning-kontrakt
      {
        kind: 'paragraph',
        text: 'Som lærling har du rett til den opplæringen læreplanen sier, og du skal ha både lærekontrakt og arbeidsavtale. Du har også plikter: Du skal delta aktivt og bidra til et godt arbeidsmiljø.',
      },
      // elev-rettighetshjelpen
      {
        kind: 'paragraph',
        text: 'Er du usikker på hva som gjelder for deg, kan du spørre Rettighetshjelpen hos Elevorganisasjonen, også anonymt. Kontaktlæreren og rådgiveren din kan også hjelpe.',
      },
    ],
    questions: ['Hvilke rettigheter har jeg som lærling?', 'Kan jeg bytte utdanningsprogram?'],
  },
  {
    id: 'fravaer',
    title: 'Fraværsregler',
    lead: 'Over 10 prosent fravær i et fag kan koste deg karakteren.',
    icon: CalendarX,
    color: 6,
    explainer: [
      // oslo-fravaersregler, udir-fravaersgrensen
      {
        kind: 'paragraph',
        text: 'Har du mer enn 10 prosent fravær i et fag, kan du miste karakteren i faget for halvåret eller standpunktkarakteren. Grensen gjelder fravær du ikke har dokumentert, også når du har vært syk uten legeerklæring.',
      },
      {
        kind: 'paragraph',
        text: 'Rektor kan i helt spesielle tilfeller godta inntil 15 prosent. Det er et smalt unntak, ikke noe du har krav på.',
      },
      {
        kind: 'paragraph',
        text: 'Noe fravær teller ikke med hvis du dokumenterer det, for eksempel:',
      },
      {
        kind: 'list',
        items: [
          'Helsegrunner, dokumentert av lege eller annen helsebehandler.',
          'Velferdsgrunner, for eksempel en begravelse.',
          'Arbeid som tillitsvalgt eller politisk arbeid.',
          'Når du må møte etter lov, for eksempel på sesjon.',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Står du i fare for å miste karakteren, skal du få et skriftlig varsel først. Er du under 18, får foreldrene dine også beskjed.',
      },
    ],
    questions: ['Hva er fraværsgrensen?', 'Hvilket fravær teller ikke med?', 'Hva skjer hvis jeg går over 10 prosent?'],
  },
  {
    id: 'okonomi',
    title: 'Lønn og stipend',
    lead: 'Lærlinglønn og støtte fra Lånekassen.',
    icon: Wallet,
    color: 8,
    explainer: [
      // utdanning-laerlinglonn
      {
        kind: 'paragraph',
        text: 'Som lærling får du lønn. Den øker vanligvis for hvert halvår, fordi du gjør mer selvstendig arbeid etter hvert:',
      },
      {
        kind: 'list',
        items: [
          '1. halvår: rundt 30 prosent av lønnen til en nyutdannet fagarbeider',
          '2. halvår: rundt 40 prosent',
          '3. halvår: rundt 50 prosent',
          '4. halvår: rundt 80 prosent',
        ],
      },
      {
        kind: 'paragraph',
        text: 'Dette gjelder hovedmodellen med to år i skole og to år i bedrift. Lønnen kan variere med fag og tariffavtale. Du skal ikke betale for læremateriell eller kurs fram til fagprøven.',
      },
      // lanekassen-vgs
      {
        kind: 'paragraph',
        text: 'Går du på videregående og er under 21, kan du søke stipend fra Lånekassen. De fleste får utstyrsstipend, men du må søke selv. Bor du borte eller familien har lav inntekt, kan du få mer. Stipend trenger du ikke betale tilbake.',
      },
      // lanekassen-laerling
      {
        kind: 'paragraph',
        text: 'Som lærling får du som regel ikke utstyrsstipend lenger. Bor du borte og oppfyller kravene, kan du fortsatt få borteboerstipend. Det blir mindre hvis lønnen din er over en grense Lånekassen setter.',
      },
    ],
    questions: ['Hva tjener en lærling?', 'Hva er utstyrsstipend?', 'Kan jeg få stipend som lærling?'],
  },
];

const TOPICS_BY_ID = new Map(INFO_TOPICS.map((topic) => [topic.id, topic]));

export function getInfoTopic(id: string | undefined): InfoTopic | undefined {
  return id ? TOPICS_BY_ID.get(id as InfoTopicId) : undefined;
}

/** Starter questions shown under the empty question field. */
export const STARTER_QUESTIONS = [
  'Hvordan søker jeg lærlingplass?',
  'Hva er et opplæringskontor?',
  'Hva er fraværsgrensen?',
  'Kan jeg ta påbygg etter fagbrev?',
  'Hva tjener en lærling?',
];
