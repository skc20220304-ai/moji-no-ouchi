import { kanaOrder, learningRows } from './kana';

export interface Session {
  queue: string[];
  questionIndex: number;
  mistakes: number;
  collectedThisRound: string[];
}

export const QUESTIONS_PER_ROUND = 5;

export function newSession(completed: readonly string[]): Session {
  const nextRow = learningRows.find((row) => row.some((kana) => !completed.includes(kana)));
  const queue = [...(nextRow ?? kanaOrder.slice(0, QUESTIONS_PER_ROUND))];
  return { queue, questionIndex: 0, mistakes: 0, collectedThisRound: [] };
}

export function currentKana(session: Session) { return session.queue[session.questionIndex]; }
export function isComplete(session: Session) { return session.questionIndex >= session.queue.length; }
