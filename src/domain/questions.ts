import { adventureKana, kanaOrder, type Picture, vocabulary, wordsForKana } from './kana';

export type QuestionType = 'kana-to-picture' | 'picture-to-kana' | 'find-kana';

export interface QuestionDefinition {
  id: string;
  type: QuestionType;
  targetKana: string;
  /** Word is present for picture and find questions, and identifies the collected illustration. */
  word?: Picture;
  promptKana?: string;
  choices: readonly Picture[] | readonly string[];
}

export type KanaMastery = Record<string, { score: number; correct: number; wrong: number }>;
export type Random = () => number;

export const QUESTIONS_PER_STAGE = 5;
const shuffle = <T>(items: readonly T[], random: Random): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const pick = Math.floor(random() * (index + 1));
    [result[index], result[pick]] = [result[pick], result[index]];
  }
  return result;
};

export function masteryScore(mastery: KanaMastery, kana: string) { return mastery[kana]?.score ?? 0; }
export function choiceCountFor(mastery: KanaMastery, kana: string) {
  const score = masteryScore(mastery, kana);
  return score <= 1 ? 2 : score <= 3 ? 3 : 4;
}

export function updateMastery(mastery: KanaMastery, kana: string, result: 'correct' | 'wrong', hinted = false): KanaMastery {
  const current = mastery[kana] ?? { score: 0, correct: 0, wrong: 0 };
  const delta = result === 'wrong' ? -1 : hinted ? 1 : 2;
  return { ...mastery, [kana]: {
    score: Math.max(0, Math.min(5, current.score + delta)),
    correct: current.correct + (result === 'correct' ? 1 : 0),
    wrong: current.wrong + (result === 'wrong' ? 1 : 0)
  } };
}

function kanaChoices(targetKana: string, count: number, random: Random): string[] {
  return shuffle([targetKana, ...shuffle(kanaOrder.filter((kana) => kana !== targetKana), random).slice(0, count - 1)], random);
}

function pictureChoices(target: Picture, count: number, random: Random): Picture[] {
  return shuffle([target, ...shuffle(vocabulary.filter((word) => word.id !== target.id), random).slice(0, count - 1)], random);
}

function makeQuestion(type: QuestionType, kana: string, word: Picture, mastery: KanaMastery, random: Random, serial: number): QuestionDefinition {
  const count = choiceCountFor(mastery, kana);
  if (type === 'kana-to-picture') return { id: `${type}:${kana}:${word.id}:${serial}`, type, targetKana: kana, promptKana: kana, word, choices: pictureChoices(word, count, random) };
  return { id: `${type}:${kana}:${word.id}:${serial}`, type, targetKana: kana, word, choices: kanaChoices(kana, count, random) };
}

/** Five-question character stage: two picture picks, two kana picks and one in-word kana search. */
export function buildKanaStage(kana: string, mastery: KanaMastery = {}, history: readonly string[] = [], random: Random = Math.random): QuestionDefinition[] {
  const words = shuffle(wordsForKana(kana).filter((word) => !history.includes(word.id)), random);
  const candidates = words.length >= 4 ? words : shuffle(wordsForKana(kana), random);
  const pattern: QuestionType[] = ['kana-to-picture', 'picture-to-kana', 'kana-to-picture', 'picture-to-kana', 'find-kana'];
  return pattern.map((type, index) => makeQuestion(type, kana, candidates[index % candidates.length], mastery, random, index));
}

/** Row finale mixes all three modes and prioritises lower-mastery characters. */
export function buildSummaryStage(kanaRow: readonly string[], mastery: KanaMastery = {}, history: readonly string[] = [], random: Random = Math.random): QuestionDefinition[] {
  const ranked = shuffle(kanaRow, random).sort((left, right) => masteryScore(mastery, left) - masteryScore(mastery, right));
  const pattern: QuestionType[] = ['kana-to-picture', 'picture-to-kana', 'find-kana', 'kana-to-picture', 'picture-to-kana'];
  return pattern.map((type, index) => {
    const kana = ranked[index % ranked.length];
    const available = wordsForKana(kana).filter((word) => !history.includes(word.id));
    const word = (available.length ? available : wordsForKana(kana))[Math.floor(random() * (available.length || wordsForKana(kana).length))];
    return makeQuestion(type, kana, word, mastery, random, index);
  });
}

export const firstAdventureKana = adventureKana;
