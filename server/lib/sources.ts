/**
 * Source handling for the info corner. The model only ever hands us source *ids*; titles
 * and URLs always come from the curated list in shared/infoSources.ts.
 */
import { getInfoSource, INFO_SOURCES } from '../../shared/infoSources';
import type { InfoSource, InfoTopicId, RecommendedSource } from '../../shared/types';

export const MAX_SOURCES = 3;
const MAX_WHY_LENGTH = 220;

/** A source pick as it comes from the model or from a canned mock answer. */
export interface SourcePick {
  id: string;
  why?: string | null;
}

/**
 * Words that point to a topic. Used for the keyword fallback when the model returns no
 * usable sources, and by the mock answers. Stems are matched as prefixes of words.
 */
export const TOPIC_KEYWORDS: Record<InfoTopicId, string[]> = {
  laerling: ['lærling', 'læretid', 'lærekontrakt', 'lærebedrift', 'læreplass', 'lærekandidat'],
  soke: ['søke', 'søknad', 'søker', 'søknadsfrist', 'frist', 'vigo', 'intervju', 'cv', 'læreplass', 'formidling', 'jobb'],
  opplaeringskontor: ['opplæringskontor', 'samarbeidsorgan', 'opplæringsring', 'fagopplæring'],
  fagbrev: ['fagbrev', 'svennebrev', 'fagprøve', 'svenneprøve', 'fagarbeider', 'kompetansebevis'],
  veier: ['påbygg', 'studiekompetanse', 'vg2', 'vg3', 'programområde', 'utdanningsløp', 'utdanningsvei', 'videre', 'fagskole', 'høyskole', 'universitet', 'yrke', 'bli'],
  rettigheter: ['rettighet', 'rett', 'krav', 'klage', 'ombud', 'urettferdig', 'arbeidstid', 'ferie', 'omvalg', 'kontrakt', 'arbeidsavtale', 'plikt'],
  fravaer: ['fravær', 'fraværsgrense', 'prosent', 'borte', 'syk', 'egenmelding', 'legeerklæring', 'skulk', 'udokumentert', 'dokumentert'],
  okonomi: ['stipend', 'lån', 'lånekassen', 'penger', 'økonomi', 'lønn', 'tjene', 'tjener', 'utstyrsstipend', 'borteboer', 'betalt', 'kroner'],
};

/** Shown when nothing in the question points to a topic. A broad starting page. */
export const GENERAL_SOURCE_ID = 'utdanning-yrkesfaghandboka';

const TOPIC_WHY: Record<InfoTopicId, string> = {
  laerling: 'Forklarer hvordan det er å være lærling.',
  soke: 'Viser hvordan du går fram for å søke.',
  opplaeringskontor: 'Forklarer hva opplæringskontor og lærebedrifter gjør.',
  fagbrev: 'Handler om fag- og svenneprøven og veien til fagbrev.',
  veier: 'Viser hvilke veier du kan gå videre.',
  rettigheter: 'Forklarer hvilke rettigheter du har.',
  fravaer: 'Forklarer reglene for fravær.',
  okonomi: 'Handler om stipend, lån og lønn.',
};

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length >= 2);

/** How well each topic matches `text` (number of keyword hits). */
export function scoreTopics(text: string): Record<InfoTopicId, number> {
  const tokens = tokenize(text);
  const scores = {} as Record<InfoTopicId, number>;
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS) as Array<[InfoTopicId, string[]]>) {
    scores[topic] = keywords.reduce(
      (sum, keyword) => sum + (tokens.some((token) => token === keyword || (keyword.length >= 4 && token.startsWith(keyword))) ? 1 : 0),
      0,
    );
  }
  return scores;
}

function toRecommended(source: InfoSource, why: string): RecommendedSource {
  return { sourceId: source.id, title: source.title, url: source.url, why };
}

function defaultWhy(source: InfoSource, topicScores?: Record<InfoTopicId, number>): string {
  const best = [...source.topics].sort((a, b) => (topicScores?.[b] ?? 0) - (topicScores?.[a] ?? 0))[0];
  return TOPIC_WHY[best];
}

/**
 * Best keyword matches from the curated list for a question. Always returns at least one
 * source: when nothing matches, the general starting page.
 */
export function fallbackSources(question: string, max = 2): RecommendedSource[] {
  const topicScores = scoreTopics(question);
  const questionTokens = new Set(tokenize(question).filter((token) => token.length >= 4));

  const ranked = INFO_SOURCES.map((source) => {
    const topicScore = source.topics.reduce((sum, topic) => sum + topicScores[topic], 0);
    // A small bonus when words from the question appear in the source's own title.
    const titleBonus = tokenize(source.title).filter((token) => questionTokens.has(token)).length * 0.5;
    return { source, score: topicScore + titleBonus };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    const general = getInfoSource(GENERAL_SOURCE_ID) ?? INFO_SOURCES[0];
    return [toRecommended(general, 'Et godt sted å begynne når du lurer på noe om yrkesfag.')];
  }
  return ranked.slice(0, max).map(({ source }) => toRecommended(source, defaultWhy(source, topicScores)));
}

/**
 * Turns the model's picks into `RecommendedSource`s. Unknown ids and duplicates are
 * dropped, the list is capped at three, and the title and URL are taken from the curated
 * list. If nothing valid is left, the keyword fallback guarantees at least one source.
 */
export function resolveSources(picks: SourcePick[] | null | undefined, question: string): RecommendedSource[] {
  const seen = new Set<string>();
  const resolved: RecommendedSource[] = [];

  for (const pick of picks ?? []) {
    const source = typeof pick?.id === 'string' ? getInfoSource(pick.id.trim()) : undefined;
    if (!source || seen.has(source.id)) continue;
    seen.add(source.id);
    const why = typeof pick.why === 'string' ? pick.why.replace(/\s+/g, ' ').trim().slice(0, MAX_WHY_LENGTH) : '';
    resolved.push(toRecommended(source, why || defaultWhy(source, scoreTopics(question))));
    if (resolved.length === MAX_SOURCES) break;
  }

  return resolved.length > 0 ? resolved : fallbackSources(question);
}
