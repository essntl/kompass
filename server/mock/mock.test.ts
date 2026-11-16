import { describe, expect, it } from 'vitest';
import { getInfoSource } from '../../shared/infoSources';
import { buildMockApplicationText } from './application';
import { buildMockInfoAnswer, CANNED_ANSWERS, pickCannedAnswer, UNKNOWN_ANSWER_TEXT } from './info';
import { buildMockCompetence, detectSkills } from './portfolio';
import { chunkText } from './stream';
import { asFirstPerson, joinList, lowerFirst, skillPhrase } from './text';

describe('mock info answers', () => {
  it('has at least eight canned answers, each with 1–3 real sources', () => {
    expect(CANNED_ANSWERS.length).toBeGreaterThanOrEqual(8);
    for (const answer of CANNED_ANSWERS) {
      expect(answer.sources.length, answer.id).toBeGreaterThanOrEqual(1);
      expect(answer.sources.length, answer.id).toBeLessThanOrEqual(3);
      for (const pick of answer.sources) expect(getInfoSource(pick.id), `${answer.id}: ${pick.id}`).toBeDefined();
      // Sources are shown as cards; the text itself never contains a link.
      expect(answer.text, answer.id).not.toMatch(/https?:\/\//);
    }
  });

  it('picks the answer that fits the question', () => {
    const cases: Array<[string, string]> = [
      ['Hvordan søker jeg læreplass?', 'soke-laereplass'],
      ['Hva er et opplæringskontor?', 'opplaeringskontor'],
      ['Hva er fagprøven?', 'fagbrev'],
      ['Kan jeg ta påbygg etter Vg2?', 'veier'],
      ['Hvor mye fravær kan jeg ha?', 'fravaer'],
      ['Hva tjener en lærling?', 'lonn'],
      ['Kan jeg få stipend fra Lånekassen?', 'okonomi'],
      ['Må jeg ha en lærekontrakt?', 'kontrakt'],
      ['Har lærlinger rett på ferie?', 'rettigheter'],
      ['Hvordan forbereder jeg meg til intervju?', 'intervju'],
      ['Hva gjør en lærling?', 'laerling'],
      ['Hva skjer hvis jeg ikke får læreplass?', 'ikke-laereplass'],
      ['Hva om jeg fikk ikke læreplass i år?', 'ikke-laereplass'],
      ['Hva er Y-veien?', 'y-veien'],
      ['Kan jeg bli ingeniør uten påbygging?', 'y-veien'],
    ];
    for (const [question, id] of cases) expect(pickCannedAnswer(question)?.id, question).toBe(id);
  });

  it('admits it does not know, and still recommends a source', () => {
    for (const question of ['Hva er meningen med livet?', 'Når er neste prøve i matte?']) {
      const answer = buildMockInfoAnswer(question);
      expect(answer.text).toBe(UNKNOWN_ANSWER_TEXT);
      expect(answer.text).toContain('Det vet jeg ikke helt');
      expect(answer.sources.length).toBeGreaterThanOrEqual(1);
      expect(getInfoSource(answer.sources[0].sourceId)?.url).toBe(answer.sources[0].url);
    }
  });
});

describe('mock competence description', () => {
  const request = {
    title: 'Sveiset T-skjøt i stål',
    note: 'Vi fikk en arbeidstegning og skulle sveise to plater med MAG. Jeg målte opp og heftet først. Brukte verneutstyr hele tiden.',
    programme: 'Teknologi- og industrifag',
    year: 'Vg1',
  };

  it('joins the skills in the summary without a double "og"', () => {
    expect(buildMockCompetence(request).summary).toMatch(/med vekt på sveising og tegningslesing\.$/);
    const withHms = buildMockCompetence({ ...request, title: 'Sveising', note: 'Brukte verneutstyr.' });
    expect(withHms.summary).toMatch(/med vekt på sveising, HMS og verneutstyr\.$/);
    // A note without a subject gets one.
    expect(withHms.whatWasDone).toContain('Jeg brukte verneutstyr.');
  });

  it('builds a description from the title, note and programme', () => {
    const competence = buildMockCompetence(request);
    expect(competence.mock).toBe(true);
    expect(competence.summary).toContain('Sveiset T-skjøt i stål');
    expect(competence.whatWasDone).toContain('Jeg målte opp og heftet først.');
    expect(competence.skills).toEqual(['Sveising', 'Tegningslesing', 'Måling og oppmerking', 'HMS og verneutstyr']);
    expect(competence.suggestedGoals.length).toBeGreaterThanOrEqual(1);
    expect(competence.suggestedGoals.length).toBeLessThanOrEqual(3);
    // Goals are cautious suggestions, never presented as curriculum quotes.
    for (const goal of competence.suggestedGoals) {
      expect(goal.text).toMatch(/^Kan handle om/);
      expect(goal.why).toMatch(/kan/);
    }
  });

  it('always returns 3–6 skills, also for a thin entry', () => {
    expect(detectSkills('Oppgave 3').length).toBeGreaterThanOrEqual(3);
    const many = detectSkills('sveiset, målte, kappet, boret, slipte, monterte, koblet, malte, dokumenterte og planla');
    expect(many.length).toBeLessThanOrEqual(6);
  });

  it('does not see skills in unrelated words', () => {
    // "tilbake" is not baking, "elektrode" is not electrical work, "bruker" is not a care receiver.
    const skills = detectSkills('Jeg gikk tilbake og byttet elektrode. Jeg bruker alltid hansker.');
    expect(skills).not.toContain('Tilberedning av mat');
    expect(skills).not.toContain('Kobling av kretser');
    expect(skills).not.toContain('Omsorg og kommunikasjon');
  });
});

describe('mock application text', () => {
  const student = { name: 'Sara Nilsen', year: 'Vg1', programme: 'Teknologi- og industrifag' };

  it('uses the listing and the chosen entries, and nothing else', () => {
    const text = buildMockApplicationText({
      student,
      listing: {
        company: 'Fjordmek AS',
        trade: 'Industrimekaniker',
        title: 'Lærling søkes',
        summary: 'Vi søker lærling.',
        requirements: ['Interesse for mekanisk arbeid.'],
      },
      entries: [
        { title: 'Sveiset T-skjøt', note: 'Jeg sveiset to plater.', date: '2026-10-12', skills: ['Sveising', 'HMS og verneutstyr'] },
      ],
    });
    expect(text.startsWith('Hei,\n\n')).toBe(true);
    expect(text).toContain('læreplass som industrimekaniker hos Fjordmek AS');
    expect(text).toContain('«Sveiset T-skjøt». Jeg sveiset to plater. Der øvde jeg på sveising, HMS og verneutstyr.');
    // Requirements are not quoted back at the company.
    expect(text).not.toContain('nteresse for mekanisk arbeid');
    expect(text).not.toContain('ser etter');
    expect(text.endsWith('Vennlig hilsen\nSara Nilsen')).toBe(true);
  });

  it('writes first-person sentences for notes without a subject and verb-phrase skills', () => {
    const text = buildMockApplicationText({
      student,
      listing: {
        company: 'Kjemi AS',
        trade: 'Kjemiprosess',
        title: 'Lærling',
        summary: '',
        requirements: ['Fullført Vg2 elenergi og ekom.'],
      },
      entries: [
        {
          title: 'Start/stopp-styring med kontaktor',
          note: 'Koblet en start/stopp-styring med kontaktor. Lampa lyste ikke.',
          date: '2026-10-12',
          skills: ['Lese koblingsskjema', 'Koble styrestrømskrets', 'Feilsøking med multimeter'],
        },
        // Nothing usable in the note: no detail sentence at all rather than a broken one.
        { title: 'Boks', note: 'Boks i tynnplate', date: '2026-10-13', skills: [] },
      ],
    });
    expect(text).toContain('læreplass i kjemiprosess hos Kjemi AS.');
    expect(text).toContain('Jeg koblet en start/stopp-styring med kontaktor.');
    expect(text).toContain(
      'Der øvde jeg på å lese koblingsskjema, å koble styrestrømskrets og feilsøking med multimeter.',
    );
    expect(text).toContain('Jeg har også jobbet med «Boks».');
    expect(text).not.toContain('Boks i tynnplate.');
    expect(text).not.toMatch(/øvd på (?!å )\p{L}+e /u);
    expect(text).not.toContain('Fullført');
  });

  it('writes a general text without a listing or entries', () => {
    const text = buildMockApplicationText({ student, entries: [] });
    expect(text).toContain('Jeg heter Sara Nilsen og går Vg1 teknologi- og industrifag.');
    expect(text).not.toContain('hos ');
    expect(text).not.toContain('undefined');
  });
});

describe('helpers', () => {
  it('chunkText keeps the text intact', () => {
    const text = 'Linje én.\n\n- punkt to\n- punkt tre med flere ord';
    expect(chunkText(text).join('')).toBe(text);
    expect(chunkText(text).length).toBeGreaterThan(2);
  });

  it('lowerFirst leaves acronyms alone', () => {
    expect(lowerFirst('Sveising')).toBe('sveising');
    expect(lowerFirst('HMS og verneutstyr')).toBe('HMS og verneutstyr');
  });

  it('joinList uses commas and a final "og", and never doubles "og"', () => {
    expect(joinList(['a'])).toBe('a');
    expect(joinList(['a', 'b', 'c'])).toBe('a, b og c');
    expect(joinList(['sveising', 'HMS og verneutstyr'])).toBe('sveising, HMS og verneutstyr');
    expect(joinList(['HMS og verneutstyr', 'sveising'])).toBe('sveising, HMS og verneutstyr');
  });

  it('skillPhrase and asFirstPerson', () => {
    expect(skillPhrase('Lese koblingsskjema')).toBe('å lese koblingsskjema');
    expect(skillPhrase('Kontrollere mål')).toBe('å kontrollere mål');
    expect(skillPhrase('MAG-sveising')).toBe('MAG-sveising');
    expect(skillPhrase('Hygiene og renhold')).toBe('hygiene og renhold');
    expect(asFirstPerson('Sveiset to plater')).toBe('Jeg sveiset to plater.');
    expect(asFirstPerson('Vi fikk en tegning.')).toBe('Vi fikk en tegning.');
    expect(asFirstPerson('Det gikk bra.')).toBe('');
  });
});
