import { describe, expect, it } from 'vitest';
import { vocabulary } from '../src/domain/kana';
import { buildKanaStage, buildSummaryStage, choiceCountFor, updateMastery } from '../src/domain/questions';

describe('adventure questions', () => {
  it('has four distinguishable words for every implemented kana', () => {
    ['あ', 'い', 'う', 'え', 'お', 'か', 'き', 'く', 'け', 'こ'].forEach((kana) => {
      expect(vocabulary.filter((word) => word.kana === kana)).toHaveLength(4);
    });
  });

  it('builds the three required modes with one answer in each question', () => {
    const questions = buildKanaStage('あ', {}, [], () => .37);
    expect(questions.map((question) => question.type)).toEqual(['kana-to-picture', 'picture-to-kana', 'kana-to-picture', 'picture-to-kana', 'find-kana']);
    questions.forEach((question) => {
      if (typeof question.choices[0] === 'string') {
        expect((question.choices as readonly string[]).filter((choice) => choice === question.targetKana)).toHaveLength(1);
      } else {
        expect((question.choices as readonly { id: string }[]).filter((choice) => choice.id === question.word?.id)).toHaveLength(1);
      }
    });
  });

  it('prioritises weak kana and adapts choice count and mastery', () => {
    const mastery = { あ: { score: 5, correct: 2, wrong: 0 }, い: { score: 0, correct: 0, wrong: 1 } };
    expect(choiceCountFor(mastery, 'い')).toBe(2);
    expect(choiceCountFor(mastery, 'あ')).toBe(4);
    expect(updateMastery({}, 'あ', 'correct').あ).toMatchObject({ score: 2, correct: 1 });
    expect(updateMastery({ あ: { score: 2, correct: 1, wrong: 0 } }, 'あ', 'wrong').あ).toMatchObject({ score: 1, wrong: 1 });
    expect(buildSummaryStage(['あ', 'い', 'う', 'え', 'お'], mastery)).toHaveLength(5);
  });
});
