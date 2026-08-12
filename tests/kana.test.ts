import { describe, expect, it } from 'vitest';
import { choicesFor, kanaOrder, learningRows, pictures } from '../src/domain/kana';
import { newSession } from '../src/domain/session';

describe('kana content', () => {
  it('contains every basic kana exactly once', () => {
    expect(pictures).toHaveLength(46);
    expect(new Set(kanaOrder).size).toBe(46);
    expect(kanaOrder).toContain('を');
    expect(kanaOrder).toContain('ん');
  });
  it('always includes the requested answer and two different choices', () => {
    kanaOrder.forEach((kana) => {
      const choices = choicesFor(kana);
      expect(choices).toHaveLength(3);
      expect(choices.map((item) => item.kana)).toContain(kana);
      expect(new Set(choices.map((item) => item.kana)).size).toBe(3);
    });
  });
  it('starts in the あ行 and moves through rows in order', () => {
    expect(newSession([]).queue).toEqual(learningRows[0]);
    expect(newSession(learningRows[0]).queue).toEqual(learningRows[1]);
    expect(newSession(kanaOrder.filter((kana) => !learningRows[9].includes(kana))).queue).toEqual(learningRows[9]);
  });
});
