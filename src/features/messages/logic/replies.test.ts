import { describe, expect, it } from 'vitest';
import {
  REPLY_DELAY_MAX_MS,
  REPLY_DELAY_MIN_MS,
  classifyMessage,
  firstName,
  pickAbsenceAcknowledgement,
  pickReply,
  replyDelayMs,
} from './replies';

const first = () => 0;
const last = () => 0.999;

describe('classifyMessage', () => {
  it.each([
    ['Jeg er syk i morgen og kommer ikke på norsktimen', 'absence'],
    ['Har feber, blir hjemme i dag.', 'absence'],
    ['Jeg har legetime på fredag', 'absence'],
    ['Takk, men jeg kommer ikke i morgen', 'absence'],
    ['Når er fristen for innleveringen?', 'question'],
    ['Kan jeg levere på mandag', 'question'],
    ['Takk, men når er prøven?', 'question'],
    ['Tusen takk', 'thanks'],
    ['Supert, takk for hjelpen', 'thanks'],
    ['Hei', 'greeting'],
    ['God morgen!', 'greeting'],
    ['Hei. Jeg har levert oppgaven i Teams nå.', 'default'],
    ['Jeg har levert oppgaven.', 'default'],
    ['   ', 'default'],
  ] as const)('%s → %s', (text, category) => {
    expect(classifyMessage(text)).toBe(category);
  });

  it('does not read "boka mi er borte" or "syklubb" as an absence', () => {
    expect(classifyMessage('Boka mi er borte')).not.toBe('absence');
    expect(classifyMessage('Jeg begynner i syklubb')).not.toBe('absence');
  });
});

describe('pickReply', () => {
  it('answers sickness with get-well wishes', () => {
    expect(pickReply('Jeg er syk i dag', { random: first })).toBe(
      'Takk for at du sier fra. God bedring.',
    );
  });

  it('acknowledges other absences', () => {
    expect(pickReply('Jeg har tannlegetime i morgen', { random: first })).toBe(
      'Takk for beskjed. Jeg noterer det.',
    );
  });

  it('uses the first name when greeting', () => {
    expect(pickReply('Hei', { random: first, studentName: 'Sara Nilsen' })).toBe(
      'Hei Sara. Hva kan jeg hjelpe deg med?',
    );
    expect(pickReply('Hei', { random: first })).toBe('Hei. Hva kan jeg hjelpe deg med?');
  });

  it('has several variants per category and stays in range for any random value', () => {
    const variants = new Set(
      [0, 0.4, 0.8, 0.999, 1, -1].map((r) =>
        pickReply('Hva skal vi ha i dag?', { random: () => r }),
      ),
    );
    expect(variants.size).toBeGreaterThanOrEqual(3);
    for (const reply of variants) expect(reply).toMatch(/\S/);
  });

  it('never uses exclamation marks or emoji', () => {
    const texts = ['Hei', 'Takk', 'Når?', 'Syk i dag', 'Kommer ikke', 'Levert'];
    for (const text of texts) {
      for (const random of [first, () => 0.5, last]) {
        const reply = pickReply(text, { random, studentName: 'Sara' });
        expect(reply).not.toMatch(/!|\p{Extended_Pictographic}/u);
      }
    }
  });
});

describe('pickAbsenceAcknowledgement', () => {
  it('fits the reason', () => {
    expect(pickAbsenceAcknowledgement('sykdom', { random: first })).toContain('God bedring');
    expect(pickAbsenceAcknowledgement('transport', { random: first })).toBe(
      'Takk for beskjed. Kom når du kan.',
    );
  });
});

describe('firstName', () => {
  it('takes the first word', () => {
    expect(firstName(' Sara  Nilsen ')).toBe('Sara');
    expect(firstName('')).toBeUndefined();
    expect(firstName(undefined)).toBeUndefined();
  });
});

describe('replyDelayMs', () => {
  it('stays between 1.5 and 4 seconds', () => {
    expect(replyDelayMs(() => 0)).toBe(REPLY_DELAY_MIN_MS);
    expect(replyDelayMs(() => 1)).toBe(REPLY_DELAY_MAX_MS);
    expect(replyDelayMs(() => 5)).toBe(REPLY_DELAY_MAX_MS);
    expect(replyDelayMs(() => 0.5)).toBe(2750);
  });
});
